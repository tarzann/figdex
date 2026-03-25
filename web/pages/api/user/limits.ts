import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromApiKey } from '../../../lib/api-auth';
import { getUserEffectiveLimits, getCurrentFileCount } from '../../../lib/subscription-helpers';
import { getPlanLimitsFromDb } from '../../../lib/plans';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user ID from API key
  const userId = await getUserIdFromApiKey(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please provide a valid API key.' });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, plan, is_admin')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get effective limits (plan + addons)
    const limits = await getUserEffectiveLimits(
      supabaseAdmin,
      userId,
      user.plan,
      user.is_admin
    );

    // Get current file count
    const currentFiles = await getCurrentFileCount(supabaseAdmin, userId);

    // Get plan info
    const planLimits = await getPlanLimitsFromDb(supabaseAdmin, user.plan, user.is_admin);

    return res.status(200).json({
      success: true,
      limits: {
        maxFiles: limits.maxFiles,
        currentFiles,
        remainingFiles: limits.maxFiles === null ? null : Math.max(0, limits.maxFiles - currentFiles),
        maxFrames: limits.maxFrames,
        maxIndexesPerDay: limits.maxIndexesPerDay,
        planId: planLimits.id,
        planLabel: planLimits.label,
        isUnlimited: user.is_admin || user.plan === 'unlimited',
      },
    });
  } catch (error: any) {
    console.error('Error getting user limits:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
