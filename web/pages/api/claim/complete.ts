import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { clearNormalizedOwnerUsage, refreshNormalizedOwnerUsage } from '../../../lib/normalized-index-store';

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
    const claimToken = typeof body.claimToken === 'string' ? body.claimToken.trim() : '';
    if (!claimToken) {
      return res.status(400).json({ success: false, error: 'claimToken is required' });
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

    try {
      const { data: tokenRow } = await supabase
        .from('claim_tokens')
        .select('id, anon_id, expires_at, consumed_at')
        .eq('claim_token', claimToken)
        .maybeSingle();

      if (tokenRow && !tokenRow.consumed_at && new Date(tokenRow.expires_at).getTime() > Date.now()) {
        const anonId = tokenRow.anon_id;
        if (anonId) {
          const { data: guestRows } = await supabase
            .from('index_files')
            .select('id, figma_file_key')
            .is('user_id', null)
            .eq('owner_anon_id', anonId);

          let claimed = 0;
          if (guestRows) {
            for (const row of guestRows) {
              const { error: updateErr } = await supabase
                .from('index_files')
                .update({ user_id: userId, owner_anon_id: null })
                .eq('id', row.id);
              if (!updateErr) claimed++;
            }
          }

          await supabase
            .from('indexed_files')
            .update({ user_id: userId, owner_anon_id: null, updated_at: new Date().toISOString() })
            .is('user_id', null)
            .eq('owner_anon_id', anonId);

          await clearNormalizedOwnerUsage(supabase, { type: 'guest', anonId });
          await refreshNormalizedOwnerUsage(supabase, { type: 'user', userId });

          await supabase
            .from('claim_tokens')
            .update({ consumed_at: new Date().toISOString(), consumed_by_user_id: userId })
            .eq('id', tokenRow.id);

          return res.status(200).json({
            ok: true,
            claimed,
            mergedConflicts: 0,
            figdexKeyMoved: false,
          });
        }
      }
    } catch (_) {}

    return res.status(200).json({ ok: true, claimed: 0, mergedConflicts: 0, figdexKeyMoved: false });
  } catch (e) {
    console.error('[claim/complete] error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
