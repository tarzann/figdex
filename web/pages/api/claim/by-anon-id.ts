import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const MAX_ANON_ID_LEN = 200;

/**
 * Allows authenticated user to claim their guest data by anonId.
 * Used as fallback when the web claim flow (claimToken) doesn't complete.
 * The plugin calls this after a successful connect from the upgrade flow.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'object' ? req.body : {};
    const anonId = typeof body.anonId === 'string' ? body.anonId.trim().slice(0, MAX_ANON_ID_LEN) : '';
    if (!anonId) {
      return res.status(400).json({ success: false, error: 'anonId is required' });
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const supabase = createClient(serviceUrl, serviceKey);
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token || !token.startsWith('figdex_')) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    const { data: u } = await supabase
      .from('users')
      .select('id')
      .eq('api_key', token)
      .maybeSingle();

    if (!u?.id) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    const userId = u.id;

    const { data: guestRows } = await supabase
      .from('index_files')
      .select('id, figma_file_key')
      .is('user_id', null)
      .eq('owner_anon_id', anonId);

    let claimed = 0;
    if (guestRows && guestRows.length > 0) {
      for (const row of guestRows) {
        const { error: updateErr } = await supabase
          .from('index_files')
          .update({ user_id: userId, owner_anon_id: null })
          .eq('id', row.id);
        if (!updateErr) claimed++;
      }
    }

    return res.status(200).json({
      ok: true,
      claimed,
    });
  } catch (e) {
    console.error('[claim/by-anon-id] error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
