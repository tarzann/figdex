import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/admin-middleware';

const VALID_PLAN_IDS = ['guest', 'free', 'pro', 'team', 'unlimited'] as const;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
  }
  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, plans: data || [] });
  }

  if (req.method === 'PUT') {
    const body = req.body || {};
    const planId = body.plan_id;
    if (!planId || !VALID_PLAN_IDS.includes(planId)) {
      return res.status(400).json({ success: false, error: 'Invalid plan_id' });
    }

    const updatePayload: Record<string, unknown> = {};
    const numericFields = [
      'max_projects', 'max_frames_total', 'max_index_size_bytes', 'retention_days',
      'max_uploads_per_day', 'max_uploads_per_month', 'max_frames_per_month', 'max_indexes_per_day',
      'credits_per_month', 'sort_order'
    ];
    for (const field of numericFields) {
      if (field in body) {
        const val = body[field];
        if (val === null || val === '' || val === undefined) {
          updatePayload[field] = null;
        } else {
          const num = typeof val === 'string' ? parseInt(val, 10) : Number(val);
          updatePayload[field] = Number.isNaN(num) ? null : num;
        }
      }
    }
    if ('label' in body && typeof body.label === 'string') updatePayload.label = body.label;
    if ('is_subscribable' in body) updatePayload.is_subscribable = !!body.is_subscribable;
    if ('enabled' in body) updatePayload.enabled = !!body.enabled;

    const { data, error } = await supabaseAdmin
      .from('plans')
      .update(updatePayload)
      .eq('plan_id', planId)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, plan: data });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default requireAdmin(handler);
