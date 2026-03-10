import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { addon_type } = req.query;

    let query = supabaseAdmin
      .from('addon_packages')
      .select('*')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (addon_type && typeof addon_type === 'string') {
      query = query.eq('addon_type', addon_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching addon packages:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, packages: data || [] });
  } catch (error: any) {
    console.error('Addon Packages API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

