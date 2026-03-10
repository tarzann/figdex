import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resolvePlanId } from '../../../lib/plans';
import { getFrameImageUrls } from '../../../lib/figma-api';

function resolveImageScale(quality?: string): number {
  const normalized = (quality || '').toLowerCase();
  if (normalized === 'lo' || normalized === 'low') return 0.4;
  if (normalized === 'med' || normalized === 'medium') return 0.65;
  return 1;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST'],
    });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
    });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
      });
    }
    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format',
      });
    }

    const { data: userRows, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, plan, is_admin')
      .eq('api_key', apiKey)
      .limit(1);

    const user = Array.isArray(userRows) ? userRows[0] : null;
    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    const planId = resolvePlanId(user.plan, user.is_admin);
    if (planId === 'free') {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available for Pro and Unlimited plans',
      });
    }

    const {
      fileKey,
      figmaToken,
      nodeIds,
      imageQuality,
      imageFormat,
    } = req.body || {};

    if (!fileKey || typeof fileKey !== 'string') {
      return res.status(400).json({ success: false, error: 'fileKey is required' });
    }
    if (!figmaToken || typeof figmaToken !== 'string') {
      return res.status(400).json({ success: false, error: 'figmaToken is required' });
    }
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      return res.status(400).json({ success: false, error: 'nodeIds must be a non-empty array' });
    }

    const MAX_NODES = 200;
    if (nodeIds.length > MAX_NODES) {
      return res.status(400).json({
        success: false,
        error: `nodeIds exceeds maximum chunk size (${MAX_NODES})`,
      });
    }

    const scale = resolveImageScale(imageQuality);
    const format = typeof imageFormat === 'string' && imageFormat.toLowerCase() === 'jpg'
      ? 'jpg'
      : 'png';

    const imagesResponse = await getFrameImageUrls(fileKey, nodeIds, figmaToken, scale, format);

    return res.status(200).json({
      success: true,
      images: imagesResponse.images || {},
    });
  } catch (error: any) {
    console.error('❌ Error getting image URLs:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch image URLs',
    });
  }
}



