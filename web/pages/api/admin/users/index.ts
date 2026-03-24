import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/admin-middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
  }
  const supabaseAdmin = createClient(serviceUrl, serviceKey);
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, api_key, plan, is_active, is_admin, created_at, credits_remaining, credits_reset_date')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message });

  const { data: guestRows, error: guestError } = await supabaseAdmin
    .from('index_files')
    .select('owner_anon_id, uploaded_at, figma_file_key')
    .is('user_id', null)
    .not('owner_anon_id', 'is', null)
    .order('uploaded_at', { ascending: false });
  if (guestError) return res.status(500).json({ success: false, error: guestError.message });
  const users = (data || []).map((u: any) => {
    return {
      ...u,
      api_key: u.api_key ? (u.api_key as string).slice(0, 8) + '••••••••' : null,
      plan: u.is_admin ? 'unlimited' : (u.plan || 'free'),
      projects: 0,
      indices: 0,
      storageBytes: 0,
      lastUploadDays: null
    };
  });

  const guestMap = new Map<string, any>();
  for (const row of guestRows || []) {
    const anonId = typeof row.owner_anon_id === 'string' ? row.owner_anon_id.trim() : '';
    if (!anonId) continue;
    const uploadedAt = row.uploaded_at || new Date().toISOString();
    const existing = guestMap.get(anonId);
    if (!existing) {
      guestMap.set(anonId, {
        id: `guest:${anonId}`,
        email: `guest:${anonId.slice(0, 12)}`,
        full_name: `Guest (${anonId.slice(0, 8)})`,
        api_key: null,
        plan: 'guest',
        is_active: true,
        is_admin: false,
        is_guest: true,
        created_at: uploadedAt,
        credits_remaining: 0,
        credits_reset_date: null,
        projects: row.figma_file_key ? 1 : 0,
        indices: 1,
        storageBytes: 0,
        lastUploadDays: Math.floor((Date.now() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60 * 24))
      });
      continue;
    }
    existing.indices += 1;
    if (row.figma_file_key) existing.projects += 1;
    if (new Date(uploadedAt).getTime() < new Date(existing.created_at).getTime()) {
      existing.created_at = uploadedAt;
    }
    existing.lastUploadDays = Math.min(existing.lastUploadDays ?? Number.MAX_SAFE_INTEGER, Math.floor((Date.now() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60 * 24)));
  }

  const guests = Array.from(guestMap.values());
  
  return res.status(200).json({
    success: true,
    users: [...users, ...guests].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  });
}

export default requireAdmin(handler);
