import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb'
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }
  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'API key required' });
  }
  const apiKey = authHeader.replace('Bearer ', '');
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('api_key', apiKey)
    .single();
  if (userError || !user) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  const uploadId = req.query.id as string;
  if (!uploadId) {
    return res.status(400).json({ success: false, error: 'uploadId is required' });
  }

  const { pages, fileKey, fileName, uploadedAt, file_size } = (req.body || {}) as any;
  if (!Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ success: false, error: 'pages array required' });
  }

  // Write a chunk file under session folder
  const bucket = 'figdex-uploads';
  const chunkName = `sessions/${uploadId}/chunks/${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const payload = { pages, fileKey, fileName, uploadedAt, file_size };
  const put = await (supabaseAdmin as any).storage.from(bucket).upload(
    chunkName,
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    { upsert: false, contentType: 'application/json' }
  );
  if (put?.error) {
    return res.status(500).json({ success: false, error: 'Failed to persist chunk' });
  }

  // Return simple stats
  const frames = pages.reduce((sum: number, p: any) => sum + (Array.isArray(p?.frames) ? p.frames.length : 0), 0);
  const bytes = JSON.stringify(pages).length;
  return res.status(200).json({ success: true, stored: true, frames, size: +(bytes / 1024 / 1024).toFixed(2) });
}


