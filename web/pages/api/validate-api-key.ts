import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // GET: Plugin sends Authorization: Bearer <apiKey>. POST: body.apiKey
    let apiKey: string | undefined;
    if (req.method === 'GET') {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) apiKey = auth.slice(7).trim();
    } else {
      apiKey = req.body?.apiKey;
    }

    // Validate input
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Validate API key format
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }

    // Find user by API key
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, plan, is_admin, is_active')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Update last login (update updated_at field)
    await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // Return user info (without sensitive data)
    res.status(200).json({
      message: 'API key validated successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        plan: user.is_admin ? 'unlimited' : (user.plan || 'free'),
        is_admin: !!user.is_admin
      }
    });

  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
