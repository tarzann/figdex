import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
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
    const { userId, resetDate } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    if (!resetDate || typeof resetDate !== 'string') {
      return res.status(400).json({ success: false, error: 'resetDate is required (YYYY-MM-DD format)' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(resetDate)) {
      return res.status(400).json({ success: false, error: 'resetDate must be in YYYY-MM-DD format' });
    }

    // Verify target user exists
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update reset date
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ credits_reset_date: resetDate })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating reset date:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      resetDate: resetDate,
    });
  } catch (error: any) {
    console.error('Error in /api/admin/credits/reset-date:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

