import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/admin-middleware';
import { dbPlanRowToPlanLimits, resolvePlanId, type DbPlanRow } from '../../../../lib/plans';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
  }
  const supabaseAdmin = createClient(serviceUrl, serviceKey);
  let userQuery: any = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, api_key, plan, is_active, is_admin, created_at, bypass_indexing_limits')
    .order('created_at', { ascending: false });
  if (userQuery.error && String(userQuery.error.message || '').includes('bypass_indexing_limits')) {
    userQuery = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, api_key, plan, is_active, is_admin, created_at')
      .order('created_at', { ascending: false });
  }
  const { data, error } = userQuery;
  if (error) return res.status(500).json({ success: false, error: error.message });

  const { data: usageRows, error: usageError } = await supabaseAdmin
    .from('indexed_owner_usage')
    .select('user_id, owner_anon_id, total_files, total_frames');
  if (usageError) return res.status(500).json({ success: false, error: usageError.message });

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
      bypass_indexing_limits: Boolean((u as any).bypass_indexing_limits),
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
        bypass_indexing_limits: false,
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

  const { data: planRows } = await supabaseAdmin
    .from('plans')
    .select('plan_id,label,max_projects,max_frames_total,credits_per_month,max_uploads_per_day,max_uploads_per_month,max_frames_per_month,max_index_size_bytes,retention_days,max_indexes_per_day,enabled');

  const plans = Array.isArray(planRows)
    ? planRows.map((row: any) => dbPlanRowToPlanLimits(row as DbPlanRow))
    : [];

  const planMap = new Map(plans.map((plan) => [plan.id, plan]));
  const usageByUserId = new Map<string, { usage_files: number; usage_frames: number }>();
  const usageByAnonId = new Map<string, { usage_files: number; usage_frames: number }>();

  for (const row of usageRows || []) {
    const usage = {
      usage_files: typeof (row as any)?.total_files === 'number' ? (row as any).total_files : 0,
      usage_frames: typeof (row as any)?.total_frames === 'number' ? (row as any).total_frames : 0
    };
    if ((row as any)?.user_id) usageByUserId.set((row as any).user_id, usage);
    if ((row as any)?.owner_anon_id) usageByAnonId.set((row as any).owner_anon_id, usage);
  }

  const hydratedUsers = users.map((user: any) => {
    const planId = resolvePlanId(user.plan, user.is_admin);
    const plan = planMap.get(planId);
    const usage = usageByUserId.get(user.id) || { usage_files: 0, usage_frames: 0 };
    return {
      ...user,
      plan_label: plan?.label || planId,
      usage_files: usage.usage_files,
      usage_frames: usage.usage_frames,
      max_projects: plan?.maxProjects ?? null,
      max_frames_total: plan?.maxFramesTotal ?? null
    };
  });

  const hydratedGuests = guests.map((guest: any) => {
    const anonId = String(guest.id).replace(/^guest:/, '');
    const plan = planMap.get('guest');
    const usage = usageByAnonId.get(anonId) || {
      usage_files: guest.projects || 0,
      usage_frames: 0
    };
    return {
      ...guest,
      plan_label: plan?.label || 'Guest',
      usage_files: usage.usage_files,
      usage_frames: usage.usage_frames,
      max_projects: plan?.maxProjects ?? null,
      max_frames_total: plan?.maxFramesTotal ?? null
    };
  });
  
  return res.status(200).json({
    success: true,
    users: [...hydratedUsers, ...hydratedGuests].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    plans
  });
}

export default requireAdmin(handler);
