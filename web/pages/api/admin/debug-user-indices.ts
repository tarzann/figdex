import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../lib/admin-middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
  if (!email) {
    return res.status(400).json({ success: false, error: 'email query param required' });
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
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found', email });
  }

  const { data: userIndices } = await supabase
    .from('index_files')
    .select('id, file_name, figma_file_key, uploaded_at, index_data, owner_anon_id')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })
    .limit(50);

  const { count: userIndicesCount } = await supabase
    .from('index_files')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: guestIndicesCount } = await supabase
    .from('index_files')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null);

  // Parse index_data to get pages/frames stats per index (for debugging)
  const indicesWithStats = (userIndices ?? []).map((idx: any) => {
    const out: any = {
      id: idx.id,
      file_name: idx.file_name,
      figma_file_key: idx.figma_file_key,
      uploaded_at: idx.uploaded_at,
      owner_anon_id: idx.owner_anon_id ?? null,
    };
    let json = idx.index_data;
    if (typeof json === 'string') {
      try { json = JSON.parse(json); } catch { json = null; }
    }
    if (json) {
      let pages: any[] = [];
      if (Array.isArray(json)) {
        pages = json;
      } else if (json && typeof json === 'object' && Array.isArray((json as any).pages)) {
        pages = (json as any).pages;
      }
      const pageNames = pages.map((p: any) => (p && typeof p.name === 'string' ? p.name : '') || '(unnamed)');
      const totalFrames = pages.reduce((s: number, p: any) => s + (Array.isArray(p?.frames) ? p.frames.length : 0), 0);
      out.pages_count = pages.length;
      out.total_frames = totalFrames;
      out.page_names = pageNames;
    }
    return out;
  });

  return res.status(200).json({
    success: true,
    user: { id: user.id, email: user.email, full_name: user.full_name, plan: user.plan },
    user_indices_count: userIndicesCount ?? 0,
    user_indices: indicesWithStats,
    guest_indices_total_in_system: guestIndicesCount ?? 0,
    note: 'If user_indices_count is 0 and user expected claimed guest data, the claim may have failed. Guest data stays under owner_anon_id until claimed.',
  });
}

export default requireAdmin(handler);
