import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-figdex-email');
  if (req.method === 'OPTIONS') return res.status(200).end();
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
    let bodyEmail = '';
    let headerEmail = '';
    try {
      if (req.body && typeof req.body === 'object') {
        bodyEmail = (req.body.email || '').toString().trim().toLowerCase();
      } else if (typeof req.body === 'string') {
        const parsed = JSON.parse(req.body);
        bodyEmail = (parsed.email || '').toString().trim().toLowerCase();
      }
    } catch {}
    headerEmail = (req.headers['x-figdex-email'] || '').toString().trim().toLowerCase();
    const email = bodyEmail || headerEmail;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required (body or x-figdex-email header)' });
    }
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, plan, is_admin, api_key')
      .eq('email', email)
      .maybeSingle();
    if (fetchErr) {
      console.error('ensure-key: fetch error:', fetchErr);
      return res.status(500).json({ success: false, error: 'Failed to query user', details: fetchErr.message });
    }
    let user = existing;
    if (!user) {
      const newKey = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
      const { data: created, error: createErr } = await supabaseAdmin
        .from('users')
        .insert({ email, api_key: newKey, plan: 'free' })
        .select('id, email, plan, is_admin, api_key')
        .single();
      if (createErr) {
        console.error('ensure-key: create error:', createErr);
        return res.status(500).json({ success: false, error: 'Failed to create user', details: createErr.message });
      }
      user = { ...created, full_name: null, plan: 'free', is_admin: false } as any;
    } else if (!user.api_key || !String(user.api_key).startsWith('figdex_')) {
      const newKey = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
      const { error: updErr } = await supabaseAdmin
        .from('users')
        .update({ api_key: newKey } as any)
        .eq('id', user.id);
      if (updErr) {
        console.error('ensure-key: update error:', updErr);
        return res.status(500).json({ success: false, error: 'Failed to update user key', details: updErr.message });
      }
      user.api_key = newKey;
    }

    if (user?.is_admin && user.plan !== 'unlimited') {
      try {
        await supabaseAdmin.from('users').update({ plan: 'unlimited' }).eq('id', user.id);
      } catch (planErr) {
        console.error('ensure-key: failed to set unlimited plan:', planErr);
      } finally {
        user.plan = 'unlimited';
      }
    }

    const effectivePlan = user?.is_admin ? 'unlimited' : (user?.plan || 'free');

    return res.status(200).json({
      success: true,
      user: {
        id: (user as any)?.id,
        email: (user as any)?.email,
        name: (user as any)?.full_name || null,
        plan: effectivePlan,
        api_key: (user as any)?.api_key
      }
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: e?.message });
  }
}


