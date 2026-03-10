import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromApiKey } from '../../../lib/api-auth';
import { set as setPluginConnect } from '../../../lib/plugin-connect-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const nonce = typeof req.body?.nonce === 'string' ? req.body.nonce : null;
  if (!nonce || nonce.length < 8) {
    return res.status(400).json({ error: 'nonce required' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const bearer = authHeader.substring(7).trim();
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const supabase = createClient(serviceUrl, serviceKey);

  let token: string;
  let userId: string;

  if (bearer.startsWith('figdex_') && bearer.length >= 20) {
    let uid = await getUserIdFromApiKey(req);
    if (!uid) {
      const { data: userByKey, error: keyErr } = await supabase
        .from('users')
        .select('id, is_active')
        .eq('api_key', bearer)
        .maybeSingle();
      if (!keyErr && userByKey && userByKey.is_active !== false) uid = userByKey.id;
    }
    if (!uid) return res.status(401).json({ error: 'Invalid API key' });
    userId = uid;
    token = bearer;
  } else {
    const { data: { user }, error } = await supabase.auth.getUser(bearer);
    if (error || !user) return res.status(401).json({ error: 'Invalid session' });
    userId = user.id;
    const { data: row } = await supabase.from('users').select('api_key').eq('id', user.id).single();
    if (!row?.api_key) return res.status(400).json({ error: 'No API key for user' });
    token = row.api_key;
  }

  setPluginConnect(nonce, token, userId);
  return res.status(200).json({ ok: true });
}
