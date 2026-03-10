import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resolvePlanId } from '../../../lib/plans';

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
    });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }
    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({ success: false, error: 'Invalid API key format' });
    }

    const { data: userRows, error: userError } = await supabaseAdmin
      .from('users')
      .select('plan, is_admin')
      .eq('api_key', apiKey)
      .limit(1);
    const user = Array.isArray(userRows) ? userRows[0] : null;
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    const planId = resolvePlanId(user.plan, user.is_admin);
    if (planId === 'free') {
      return res.status(403).json({ success: false, error: 'Plan not allowed' });
    }

    const { imageUrl, figmaToken } = req.body || {};
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'imageUrl is required' });
    }
    if (!figmaToken || typeof figmaToken !== 'string') {
      return res.status(400).json({ success: false, error: 'figmaToken is required' });
    }

    const response = await fetch(imageUrl, {
      headers: {
        'X-Figma-Token': figmaToken,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(response.status).json({
        success: false,
        error: `Figma proxy failed (${response.status})`,
        details: text,
      });
    }

    const mimeType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({
      success: true,
      mimeType,
      base64Data,
    });
  } catch (error: any) {
    console.error('❌ Proxy image error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to download image from Figma',
    });
  }
}



