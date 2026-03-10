import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createCreditTransaction } from '../../../../lib/credits';
import { sendCreditsGrantNotificationToUser, sendCreditsGrantNotificationToAdmin } from '../../../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Check admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Verify admin user
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, email, is_admin')
      .eq('api_key', apiKey)
      .single();

    if (adminError || !adminUser || !adminUser.is_admin) {
      // Fallback: check admin emails (temporary solution)
      const adminEmails = ['ranmor01@gmail.com'];
      if (!adminUser || !adminEmails.includes(adminUser.email)) {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
    }

    // Get request body
    const { userId, amount, reason } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    if (!amount || typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({ success: false, error: 'amount must be a non-zero number (positive to grant, negative to deduct)' });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'reason is required' });
    }

    // Verify target user exists
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user has enough credits if deducting
    if (amount < 0) {
      const { data: userCredits } = await supabaseAdmin
        .from('users')
        .select('credits_remaining')
        .eq('id', userId)
        .single();
      
      if (!userCredits || (userCredits.credits_remaining || 0) < Math.abs(amount)) {
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient credits. User has ${userCredits?.credits_remaining || 0} credits, cannot deduct ${Math.abs(amount)}.` 
        });
      }
    }

    // Create credit transaction
    const isGrant = amount > 0;
    const result = await createCreditTransaction(supabaseAdmin, {
      userId,
      transactionType: 'admin_grant',
      amount: amount,
      description: isGrant ? `Admin grant: ${reason}` : `Admin deduction: ${reason}`,
      referenceType: 'admin',
      metadata: {
        grantedBy: adminUser.email,
        reason: reason.trim(),
      },
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Get transaction details
    const { data: transaction } = await supabaseAdmin
      .from('credits_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Send email notifications (async, don't wait for them)
    Promise.all([
      sendCreditsGrantNotificationToUser({
        userEmail: targetUser.email,
        userName: targetUser.full_name || undefined,
        amount: amount,
        reason: reason.trim(),
        newBalance: result.newBalance || 0,
        grantedBy: adminUser.email,
      }),
      sendCreditsGrantNotificationToAdmin({
        userEmail: targetUser.email,
        userName: targetUser.full_name || undefined,
        amount: amount,
        reason: reason.trim(),
        newBalance: result.newBalance || 0,
        grantedBy: adminUser.email,
      }),
    ]).catch((error) => {
      console.error('Error sending credit grant notification emails:', error);
      // Don't fail the request if emails fail
    });

    return res.status(200).json({
      success: true,
      transaction: transaction ? {
        id: transaction.id,
        userId: transaction.user_id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        balanceBefore: transaction.balance_before,
        balanceAfter: transaction.balance_after,
        description: transaction.description,
        createdAt: transaction.created_at,
      } : null,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error('Error in /api/admin/credits/grant:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

