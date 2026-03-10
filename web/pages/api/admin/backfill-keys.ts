import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const token = req.headers['x-admin-token'];
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }
    const supabaseAdmin = createClient(serviceUrl, serviceKey);
    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, api_key, plan, is_admin')
      .is('api_key', null);
    if (usersErr) return res.status(500).json({ success: false, error: usersErr.message });
    let updated = 0;
    if (Array.isArray(users) && users.length > 0) {
      for (const u of users) {
        const apiKey = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
        const newPlan = u.is_admin ? 'unlimited' : (u.plan || 'free');
        const { error: updErr } = await supabaseAdmin
          .from('users')
          .update({ api_key: apiKey, plan: newPlan })
          .eq('id', u.id);
        if (!updErr) updated++;
      }
    }
    return res.status(200).json({ success: true, updated });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: e?.message });
  }
}


