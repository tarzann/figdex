import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * Debug endpoint - returns your indices with pages/frames stats.
 * No admin required. Use your API key.
 * GET /api/debug-my-indices?apiKey=figdex_xxx
 * Or: Authorization: Bearer figdex_xxx
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey =
    (typeof req.query.apiKey === 'string' ? req.query.apiKey.trim() : '') ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '');

  if (!apiKey || !apiKey.startsWith('figdex_')) {
    return res.status(400).json({
      success: false,
      error: 'apiKey required (query ?apiKey=figdex_xxx or Authorization: Bearer figdex_xxx)',
    });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Server config error' });
  }

  const supabase = createClient(serviceUrl, serviceKey);

  const { data: user } = await supabase
    .from('users')
    .select('id, email, full_name, plan')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  const { data: rows } = await supabase
    .from('index_files')
    .select('id, file_name, figma_file_key, uploaded_at, index_data')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })
    .limit(50);

  const indicesWithStats = (rows ?? []).map((idx: any) => {
    const out: any = {
      id: idx.id,
      file_name: idx.file_name,
      figma_file_key: idx.figma_file_key,
      uploaded_at: idx.uploaded_at,
    };
    let json = idx.index_data;
    if (typeof json === 'string') {
      try { json = JSON.parse(json); } catch { json = null; }
    }
    if (json) {
      let pages: any[] = [];
      if (Array.isArray(json)) pages = json;
      else if (json && typeof json === 'object' && Array.isArray((json as any).pages)) pages = (json as any).pages;
      out.pages_count = pages.length;
      out.total_frames = pages.reduce((s: number, p: any) => s + (Array.isArray(p?.frames) ? p.frames.length : 0), 0);
      out.page_names = pages.map((p: any) => (p && typeof p.name === 'string' ? p.name : '') || '(unnamed)');
    }
    return out;
  });

  return res.status(200).json({
    success: true,
    user: { id: user.id, email: user.email, plan: user.plan },
    indices_count: indicesWithStats.length,
    indices: indicesWithStats,
  });
}
