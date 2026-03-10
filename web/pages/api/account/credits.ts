import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserCredits, getCreditTransactions } from '../../../lib/credits';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Find user by API key
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, plan')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    // Check if requesting history
    const isHistory = req.query.history === 'true';
    
    if (isHistory) {
      // Return transaction history
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string | undefined;

      const result = await getCreditTransactions(supabaseAdmin, user.id, {
        page,
        limit,
        type,
      });

      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }

      return res.status(200).json({
        success: true,
        transactions: result.transactions,
        pagination: result.pagination,
      });
    } else {
      // Return credits overview
      const result = await getUserCredits(supabaseAdmin, user.id);

      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }

      // Calculate usage stats (optional - can be enhanced later)
      const { data: thisMonthTransactions } = await supabaseAdmin
        .from('credits_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('transaction_type', 'usage')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const thisMonthUsage = thisMonthTransactions?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;

      return res.status(200).json({
        success: true,
        credits: result.credits,
        usage: {
          thisMonth: thisMonthUsage,
        },
      });
    }
  } catch (error: any) {
    console.error('Error in /api/account/credits:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

