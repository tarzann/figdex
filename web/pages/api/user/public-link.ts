import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Auth: expect Bearer token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }

  const userId = userData.user.id;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select('public_enabled, public_slug')
        .eq('id', userId)
        .single();
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, settings: data || { public_enabled: false, public_slug: null } });
    }

    if (req.method === 'POST') {
      const { public_enabled, public_slug } = req.body || {};
      if (public_slug && !/^[a-zA-Z0-9_-]{3,32}$/.test(public_slug)) {
        return res.status(400).json({ success: false, error: 'Invalid slug format' });
      }

      // If slug provided, ensure uniqueness (case-insensitive)
      if (public_slug) {
        const { data: existing, error: existErr } = await supabase
          .from('users')
          .select('id')
          .ilike('public_slug', public_slug)
          .neq('id', userId)
          .maybeSingle();
        if (existErr) return res.status(500).json({ success: false, error: existErr.message });
        if (existing) return res.status(409).json({ success: false, error: 'Slug is already taken' });
      }

      const { data, error } = await supabase
        .from('users')
        .update({ public_enabled: !!public_enabled, public_slug: public_slug || null })
        .eq('id', userId)
        .select('public_enabled, public_slug')
        .single();
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(200).json({ success: true, settings: data });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
}


