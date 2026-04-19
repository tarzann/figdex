import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};

type CreateSessionBody = {
  fileKey: string;
  fileName?: string;
  documentId?: string;
  pageMeta?: Array<{
    id?: string;
    pageId?: string;
    name?: string;
    pageName?: string;
    sortOrder?: number;
    frameCount?: number;
    hasFrames?: boolean;
  }>;
};

function normalizePageMeta(raw: CreateSessionBody['pageMeta']) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((page, index) => {
      const pageId = String(page?.pageId || page?.id || '').trim();
      if (!pageId) return null;
      const pageName = String(page?.pageName || page?.name || `Page ${index + 1}`).trim() || `Page ${index + 1}`;
      return {
        id: pageId,
        pageId,
        name: pageName,
        pageName,
        sortOrder: typeof page?.sortOrder === 'number' && Number.isFinite(page.sortOrder) ? page.sortOrder : index,
        frameCount: typeof page?.frameCount === 'number' && Number.isFinite(page.frameCount) ? page.frameCount : 0,
        hasFrames: page?.hasFrames !== false,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
}

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

  // Auth by API key (same model as existing upload-index)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'API key required' });
  }
  const apiKey = authHeader.replace('Bearer ', '');
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('api_key', apiKey)
    .single();
  if (userError || !user) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  const body = req.body as CreateSessionBody;
  if (!body || !body.fileKey || typeof body.fileKey !== 'string') {
    return res.status(400).json({ success: false, error: 'fileKey is required' });
  }
  const pageMeta = normalizePageMeta(body.pageMeta);

  const uploadId = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  const bucket = 'figdex-uploads';

  // Ensure bucket exists (idempotent)
  try {
    await (supabaseAdmin as any).storage.createBucket(bucket, { public: false });
  } catch (e: any) {
    // Ignore if exists
  }

  // Create minimal session manifest
  const manifest = {
    uploadId,
    userId: user.id,
    fileKey: body.fileKey,
    fileName: body.fileName || 'Figma Index',
    documentId: body.documentId || null,
    pageMeta,
    createdAt: new Date().toISOString(),
    status: 'created'
  };

  const manifestPath = `sessions/${uploadId}/session.json`;
  const put = await (supabaseAdmin as any).storage.from(bucket).upload(
    manifestPath,
    new Blob([JSON.stringify(manifest)], { type: 'application/json' }),
    { upsert: true, contentType: 'application/json' }
  );
  if (put?.error) {
    return res.status(500).json({ success: false, error: 'Failed to create session' });
  }

  // Return endpoints for append + commit (client will call our API; we handle storage)
  return res.status(200).json({
    success: true,
    uploadId,
    appendUrl: `/api/uploads/${uploadId}/append`,
    commitUrl: `/api/uploads/${uploadId}/commit`,
    limits: { maxChunkMB: 2 }
  });
}

