import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserEffectiveLimits, getCurrentFileCount, getCurrentFrameCount } from '../../../lib/subscription-helpers';
import { getPlanLimitsFromDb } from '../../../lib/plans';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAuthorizedUserId(
  req: NextApiRequest,
  supabaseAdmin: any
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  const bearer = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : '';

  if (!bearer) return null;

  if (bearer.startsWith('figdex_') && bearer.length >= 20) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, is_active')
      .eq('api_key', bearer)
      .maybeSingle();
    const typedUser = user as { id?: string; is_active?: boolean | null } | null;
    if (typedUser && typedUser.id && typedUser.is_active !== false) return typedUser.id;
    return null;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearer);
  if (authError || !authData?.user?.id) return null;
  return authData.user.id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Get user ID from API key or Supabase session token
  const userId = await getAuthorizedUserId(req, supabaseAdmin);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please provide a valid account token.' });
  }

  try {
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
    const currentFrames = await getCurrentFrameCount(supabaseAdmin, userId);

    // Get plan info
    const planLimits = await getPlanLimitsFromDb(supabaseAdmin, user.plan, user.is_admin);

    return res.status(200).json({
      success: true,
      limits: {
        maxFiles: limits.maxFiles,
        currentFiles,
        remainingFiles: limits.maxFiles === null ? null : Math.max(0, limits.maxFiles - currentFiles),
        maxFrames: limits.maxFrames,
        currentFrames,
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
