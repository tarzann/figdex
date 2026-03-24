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
  let connectedUser: { id: string; email?: string | null; full_name?: string | null; plan?: string | null; is_admin?: boolean } | null = null;

  if (bearer.startsWith('figdex_') && bearer.length >= 20) {
    let uid = await getUserIdFromApiKey(req);
    if (!uid) {
      const { data: userByKey, error: keyErr } = await supabase
        .from('users')
        .select('id, email, full_name, plan, is_admin, is_active')
        .eq('api_key', bearer)
        .maybeSingle();
      if (!keyErr && userByKey && userByKey.is_active !== false) {
        uid = userByKey.id;
        connectedUser = {
          id: userByKey.id,
          email: userByKey.email,
          full_name: userByKey.full_name,
          plan: userByKey.is_admin ? 'unlimited' : (userByKey.plan || 'free'),
          is_admin: !!userByKey.is_admin,
        };
      }
    }
    if (!uid) return res.status(401).json({ error: 'Invalid API key' });
    if (!connectedUser) {
      const { data: userRow } = await supabase
        .from('users')
        .select('id, email, full_name, plan, is_admin')
        .eq('id', uid)
        .single();
      connectedUser = {
        id: uid,
        email: userRow?.email || null,
        full_name: userRow?.full_name || null,
        plan: userRow?.is_admin ? 'unlimited' : (userRow?.plan || 'free'),
        is_admin: !!userRow?.is_admin,
      };
    }
    token = bearer;
  } else {
    const { data: { user }, error } = await supabase.auth.getUser(bearer);
    if (error || !user) return res.status(401).json({ error: 'Invalid session' });
    const { data: row } = await supabase.from('users').select('api_key, email, full_name, plan, is_admin').eq('id', user.id).single();
    if (!row?.api_key) return res.status(400).json({ error: 'No API key for user' });
    connectedUser = {
      id: user.id,
      email: row.email || user.email || null,
      full_name: row.full_name || user.user_metadata?.full_name || user.user_metadata?.name || null,
      plan: row.is_admin ? 'unlimited' : (row.plan || 'free'),
      is_admin: !!row.is_admin,
    };
    token = row.api_key;
  }

  setPluginConnect(nonce, token, connectedUser!);
  return res.status(200).json({ ok: true });
}
