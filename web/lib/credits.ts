/**
 * Credits system utilities
 * Handles credit transactions, balance updates, and validation
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getPlanLimitsFromDb } from './plans';

export interface CreditTransaction {
  userId: string;
  transactionType: 'purchase' | 'usage' | 'admin_grant' | 'reset';
  amount: number; // positive for additions, negative for deductions
  description: string;
  referenceId?: string;
  referenceType?: 'job' | 'index' | 'admin' | 'reset' | 'purchase';
  metadata?: Record<string, any>;
}

/**
 * Create a credit transaction and update user balance
 */
export async function createCreditTransaction(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  transaction: CreditTransaction
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  try {
    // Get current user balance
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits_remaining')
      .eq('id', transaction.userId)
      .single();

    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }

    const balanceBefore = user.credits_remaining || 0;
    const balanceAfter = balanceBefore + transaction.amount;

    // Validate balance (should not go negative for non-unlimited users)
    // Note: We allow negative for unlimited users, but for now we'll validate all users
    if (balanceAfter < 0) {
      return { success: false, error: 'Insufficient credits' };
    }

    // Create transaction record
    const { error: transactionError } = await supabaseAdmin
      .from('credits_transactions')
      .insert({
        user_id: transaction.userId,
        transaction_type: transaction.transactionType,
        amount: transaction.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: transaction.description,
        reference_id: transaction.referenceId || null,
        reference_type: transaction.referenceType || null,
        metadata: transaction.metadata || {},
      });

    if (transactionError) {
      console.error('Error creating credit transaction:', transactionError);
      return { success: false, error: transactionError.message };
    }

    // Update user balance
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ credits_remaining: balanceAfter })
      .eq('id', transaction.userId);

    if (updateError) {
      console.error('Error updating user credits:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, newBalance: balanceAfter };
  } catch (error: any) {
    console.error('Error in createCreditTransaction:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get user credits information
 */
export async function getUserCredits(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string
): Promise<{
  success: boolean;
  credits?: {
    current: number;
    base: number | null;
    purchased: number;
    resetDate: string | null;
    plan: string;
  };
  error?: string;
}> {
  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits_remaining, credits_reset_date, plan')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }

    const planLimits = await getPlanLimitsFromDb(supabaseAdmin, user.plan, false);
    const baseCredits = planLimits.creditsPerMonth;

    return {
      success: true,
      credits: {
        current: user.credits_remaining || 0,
        base: baseCredits,
        purchased: 0, // For now, always 0
        resetDate: user.credits_reset_date || null,
        plan: user.plan || 'free',
      },
    };
  } catch (error: any) {
    console.error('Error getting user credits:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get credit transactions history
 */
export async function getCreditTransactions(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    type?: string;
  }
): Promise<{
  success: boolean;
  transactions?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('credits_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filter by type if provided
    if (options?.type && options.type !== 'all') {
      query = query.eq('transaction_type', options.type);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching credit transactions:', error);
      return { success: false, error: error.message };
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return {
      success: true,
      transactions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    };
  } catch (error: any) {
    console.error('Error getting credit transactions:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
