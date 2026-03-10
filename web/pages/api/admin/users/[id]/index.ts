import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../../lib/admin-middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
  }
  const supabaseAdmin = createClient(serviceUrl, serviceKey);
  const userId = String(req.query.id || '');
  if (!userId) return res.status(400).json({ success: false, error: 'Missing user id' });

  if (req.method === 'PUT') {
    const { full_name, is_active, is_admin, plan } = req.body || {};

    const { data: existingUser, error: existingError } = await supabaseAdmin
      .from('users')
      .select('plan, is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (existingError || !existingUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const nextIsAdmin = typeof is_admin === 'boolean' ? is_admin : existingUser.is_admin;
    const normalizedPlan = typeof plan === 'string' ? plan.trim().toLowerCase() : '';
    let planToSave: string | undefined;

    if (nextIsAdmin) {
      planToSave = 'unlimited';
    } else if (normalizedPlan) {
      if (!['free', 'pro', 'unlimited'].includes(normalizedPlan)) {
        return res.status(400).json({ success: false, error: 'Invalid plan value' });
      }
      if (normalizedPlan === 'unlimited') {
        return res.status(400).json({ success: false, error: 'Unlimited plan is reserved for admins' });
      }
      planToSave = normalizedPlan;
    } else if (!nextIsAdmin && existingUser.plan === 'unlimited') {
      planToSave = 'pro';
    }

    const updatePayload: Record<string, any> = {};
    if (typeof full_name === 'string') updatePayload.full_name = full_name;
    if (typeof is_active === 'boolean') updatePayload.is_active = is_active;
    if (typeof is_admin === 'boolean') updatePayload.is_admin = is_admin;
    if (planToSave) updatePayload.plan = planToSave;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(200).json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', userId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    // soft delete -> set inactive
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default requireAdmin(handler);


