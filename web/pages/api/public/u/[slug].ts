import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing slug' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find user by slug and ensure public enabled
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, public_enabled, public_slug, full_name, email')
      .ilike('public_slug', slug)
      .single();
    if (userErr || !user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.public_enabled) return res.status(403).json({ success: false, error: 'Public profile disabled' });

    // Get this user's public indices (respect per-index is_public)
    const { data: indices, error: idxErr } = await supabase
      .from('index_files')
      .select('id, file_name, index_data, uploaded_at, is_public')
      .eq('user_id', user.id)
      .eq('is_public', true)
      .order('uploaded_at', { ascending: false });
    if (idxErr) return res.status(500).json({ success: false, error: idxErr.message });

    // Flatten frames from all indices
    const frames: any[] = [];
    const pages: any[] = [];

    (indices || []).forEach((idx) => {
      const data = idx.index_data;
      let extractedFrames: any[] = [];
      if (Array.isArray(data)) {
        extractedFrames = data.flatMap((item: any) => Array.isArray(item.frames) ? item.frames : []);
      } else if (data?.data?.pages) {
        extractedFrames = data.data.pages.flatMap((p: any) => Array.isArray(p.frames) ? p.frames : []);
      } else if (data?.data?.frames) {
        extractedFrames = Array.isArray(data.data.frames) ? data.data.frames : [];
      } else if (data?.pages) {
        extractedFrames = data.pages.flatMap((p: any) => Array.isArray(p.frames) ? p.frames : []);
      }

      // Tag with origin file and uploaded time
      extractedFrames.forEach((f) => {
        frames.push({
          ...f,
          originFile: idx.file_name,
          uploadedAt: idx.uploaded_at
        });
      });
    });

    return res.status(200).json({
      success: true,
      user: { full_name: user.full_name, email: user.email, slug: user.public_slug },
      frames,
      indices: indices || []
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
}


