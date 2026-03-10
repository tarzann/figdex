import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

function generateKey() {
  const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `figdex_${rand.slice(0, 28)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }
    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({ success: false, error: 'Invalid API key' });
    }
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('api_key', apiKey)
      .single();
    if (userErr || !user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    const newKey = generateKey();
    const { error: updErr } = await supabaseAdmin
      .from('users')
      .update({ api_key: newKey })
      .eq('id', user.id);
    if (updErr) {
      return res.status(500).json({ success: false, error: 'Failed to regenerate key' });
    }
    return res.status(200).json({ success: true, apiKey: newKey });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: e?.message });
  }
}


