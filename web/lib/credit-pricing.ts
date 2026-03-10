/**
 * Credit pricing utilities
 * Fetches pricing from database or falls back to constants
 */

import { createClient } from '@supabase/supabase-js';
import { CREDIT_COSTS as FALLBACK_CREDIT_COSTS } from './plans';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

/**
 * Get credit cost for an action from database, with fallback to constants
 */
export async function getCreditCost(actionKey: string): Promise<number> {
  // Try to get from database first
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabaseAdmin
        .from('credit_pricing')
        .select('credits, enabled')
        .eq('action_key', actionKey)
        .eq('enabled', true)
        .single();

      if (!error && data) {
        return data.credits;
      }
    } catch (error) {
      console.warn(`Failed to fetch credit pricing from database for ${actionKey}, using fallback:`, error);
    }
  }

  // Fallback to constants
  const fallbackCost = (FALLBACK_CREDIT_COSTS as any)[actionKey];
  if (fallbackCost !== undefined) {
    return fallbackCost;
  }

  // If not found, throw error
  throw new Error(`Credit cost not found for action: ${actionKey}`);
}

/**
 * Get all credit costs as an object (for compatibility with existing code)
 */
export async function getAllCreditCosts(): Promise<Record<string, number>> {
  const costs: Record<string, number> = {};

  // Try to get from database first
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabaseAdmin
        .from('credit_pricing')
        .select('action_key, credits')
        .eq('enabled', true);

      if (!error && data) {
        for (const item of data) {
          costs[item.action_key] = item.credits;
        }
        return costs;
      }
    } catch (error) {
      console.warn('Failed to fetch credit pricing from database, using fallback:', error);
    }
  }

  // Fallback to constants
  return { ...FALLBACK_CREDIT_COSTS } as Record<string, number>;
}

