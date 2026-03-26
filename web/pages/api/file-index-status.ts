import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resolveUserFromBearerToken(token: string) {
  if (!token) return null;

  if (token.startsWith('figdex_') && token.length >= 20) {
    const { data } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('api_key', token)
      .maybeSingle();
    return data && data.is_active ? data : null;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) return null;

  const { data } = await supabase
    .from('users')
    .select('id, email, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  return data && data.is_active ? data : null;
}

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
    const fileKey = typeof req.query.fileKey === 'string' ? req.query.fileKey.trim() : '';
    const anonId = typeof req.query.anonId === 'string' ? req.query.anonId.trim() : '';
    if (!fileKey) {
      return res.status(400).json({ success: false, error: 'fileKey is required' });
    }

    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (bearerToken) {
      const user = await resolveUserFromBearerToken(bearerToken);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid account token' });
      }

      const normalized = await supabase
        .from('indexed_files')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', user.id)
        .eq('figma_file_key', fileKey)
        .limit(1);
      if ((normalized.count || 0) > 0) {
        return res.status(200).json({ success: true, exists: true, owner: 'user' });
      }

      const legacy = await supabase
        .from('index_files')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', user.id)
        .eq('figma_file_key', fileKey)
        .limit(1);

      return res.status(200).json({ success: true, exists: (legacy.count || 0) > 0, owner: 'user' });
    }

    if (!anonId) {
      return res.status(400).json({ success: false, error: 'Authorization or anonId is required' });
    }

    const normalizedGuest = await supabase
      .from('indexed_files')
      .select('id', { head: true, count: 'exact' })
      .is('user_id', null)
      .eq('owner_anon_id', anonId)
      .eq('figma_file_key', fileKey)
      .limit(1);
    if ((normalizedGuest.count || 0) > 0) {
      return res.status(200).json({ success: true, exists: true, owner: 'guest' });
    }

    const legacyGuest = await supabase
      .from('index_files')
      .select('id', { head: true, count: 'exact' })
      .is('user_id', null)
      .eq('owner_anon_id', anonId)
      .eq('figma_file_key', fileKey)
      .limit(1);

    return res.status(200).json({ success: true, exists: (legacyGuest.count || 0) > 0, owner: 'guest' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error', details: error?.message });
  }
}
