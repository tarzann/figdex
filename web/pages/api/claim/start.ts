import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const CLAIM_TOKEN_TTL_MIN = 15;
const MAX_ANON_ID_LEN = 200;
const SOURCES = ['web_gallery', 'plugin_connect'] as const;
type Source = (typeof SOURCES)[number];

function baseUrl(_req: NextApiRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://www.figdex.com'
  ).replace(/\/$/, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'object' ? req.body : {};
    const anonId = typeof body.anonId === 'string' ? body.anonId.trim().slice(0, MAX_ANON_ID_LEN) : '';
    const sourceRaw = typeof body.source === 'string' ? body.source.trim() : 'web_gallery';
    const source: Source = SOURCES.includes(sourceRaw as Source) ? (sourceRaw as Source) : 'web_gallery';

    if (!anonId) {
      return res.status(400).json({ success: false, error: 'anonId is required' });
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const supabase = createClient(serviceUrl, serviceKey);
    const expiresAt = new Date(Date.now() + CLAIM_TOKEN_TTL_MIN * 60 * 1000).toISOString();
    const claimToken = randomUUID();

    const { data: row, error: insertErr } = await supabase
      .from('claim_tokens')
      .insert({
        anon_id: anonId,
        expires_at: expiresAt,
        claim_token: claimToken,
        source,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[claim/start] insert error:', insertErr);
      return res.status(500).json({ success: false, error: 'Failed to create claim token' });
    }

    try {
      await supabase.from('telemetry_events').insert({
        session_id: row?.id ?? '',
        anon_id: anonId,
        event_name: 'guest_upgrade_started',
        event_ts: new Date().toISOString(),
        plugin_version: '0.0.0',
        user_type: 'NEW',
        has_file_key: false,
        selected_pages_count: 0,
        source: 'web',
        meta: { claim_source: source },
      });
    } catch (_) {}

    const root = baseUrl(req);
    const redirectUrl = `${root}/plugin-connect?claimToken=${encodeURIComponent(claimToken)}`;

    return res.status(200).json({
      success: true,
      claimToken,
      redirectUrl,
    });
  } catch (e) {
    console.error('[claim/start] error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
