import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getOAuthRedirectUrl } from '../../../lib/env';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider } = req.body;

    if (!provider || provider !== 'google') {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Use "google"'
      });
    }

    // Get the origin from request headers to determine the correct redirect URL
    const origin = req.headers.origin || req.headers.host 
      ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || req.headers['x-forwarded-host']}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const redirectUrl = `${origin}/auth/callback`;
    
    // Get OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      console.error('OAuth error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to initiate OAuth'
      });
    }

    res.status(200).json({
      success: true,
      url: data.url
    });

  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
