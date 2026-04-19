import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { syncNormalizedIndexChunk } from '../../../../lib/normalized-index-store';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};

type CommitBody = {
  chunkPaths?: string[];
};

function getChunkPageId(page: any, pageIndex: number): string {
  const rawId = typeof page?.pageId === 'string'
    ? page.pageId
    : typeof page?.id === 'string'
      ? page.id
      : '';
  return rawId.trim() || `page-${pageIndex}`;
}

function mergeChunkPages(pages: any[]): any[] {
  const merged = new Map<string, any>();

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const pageId = getChunkPageId(page, pageIndex);
    const existing = merged.get(pageId);
    const nextFrames = Array.isArray(page?.frames) ? page.frames : [];

    if (!existing) {
      merged.set(pageId, {
        ...page,
        id: pageId,
        pageId,
        name: page?.name || page?.pageName || 'Page',
        pageName: page?.pageName || page?.name || 'Page',
        sortOrder: typeof page?.sortOrder === 'number' ? page.sortOrder : pageIndex,
        frames: nextFrames.slice(),
      });
      continue;
    }

    existing.frames = existing.frames.concat(nextFrames);
    if (typeof page?.sortOrder === 'number') {
      existing.sortOrder = typeof existing.sortOrder === 'number'
        ? Math.min(existing.sortOrder, page.sortOrder)
        : page.sortOrder;
    }
    if (!existing.name && page?.name) existing.name = page.name;
    if (!existing.pageName && (page?.pageName || page?.name)) {
      existing.pageName = page.pageName || page.name;
    }
  }

  return Array.from(merged.values());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listSessionChunkFiles(storage: any, bucket: string, uploadId: string) {
  const list = await storage.from(bucket).list(`sessions/${uploadId}/chunks`, { limit: 1000 });
  return {
    error: list?.error || null,
    files: (list?.data || []).filter((f: any) => f.name.endsWith('.json'))
  };
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

  // Auth
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

  const uploadId = req.query.id as string;
  const bucket = 'figdex-uploads';
  if (!uploadId) {
    return res.status(400).json({ success: false, error: 'uploadId is required' });
  }
  const body = (req.body || {}) as CommitBody;
  const directChunkPaths = Array.isArray(body.chunkPaths)
    ? body.chunkPaths.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  // Load manifest
  const manifestPath = `sessions/${uploadId}/session.json`;
  const manResp = await (supabaseAdmin as any).storage.from(bucket).download(manifestPath);
  if (manResp?.error) {
    return res.status(400).json({ success: false, error: 'Session not found' });
  }
  const manifestText = await manResp.data.text();
  const manifest = JSON.parse(manifestText || '{}');

  // List chunks. Direct-to-storage uploads can take a brief moment before they
  // become visible to list/download operations, so retry a few times first.
  let files: any[] = [];
  let listError: any = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const listed = await listSessionChunkFiles((supabaseAdmin as any).storage, bucket, uploadId);
    files = listed.files;
    listError = listed.error;
    if (files.length > 0 || directChunkPaths.length > 0) break;
    if (attempt < 5) {
      await sleep(attempt * 700);
    }
  }
  const listedChunkPaths = files.map((f: any) => `sessions/${uploadId}/chunks/${f.name}`);
  const chunkPaths = Array.from(new Set([...directChunkPaths, ...listedChunkPaths]));
  if (!chunkPaths.length) {
    return res.status(400).json({
      success: false,
      error: 'No chunks uploaded',
      details: listError?.message || null,
      uploadId,
      checkedPrefix: `sessions/${uploadId}/chunks`,
      providedChunkPaths: directChunkPaths.length
    });
  }

  // Merge pages from chunks
  const collectedPages: any[] = [];
  const failedChunkDownloads: Array<{ path: string; error: string }> = [];
  for (const chunkPath of chunkPaths) {
    const p = await (supabaseAdmin as any).storage.from(bucket).download(chunkPath);
    if (p?.error) {
      failedChunkDownloads.push({ path: chunkPath, error: String(p.error.message || 'Download failed') });
      continue;
    }
    const txt = await p.data.text();
    const json = JSON.parse(txt || '{}');
    if (Array.isArray(json?.pages)) {
      collectedPages.push(...json.pages);
    }
  }

  const allPages = mergeChunkPages(collectedPages);

  if (!allPages.length) {
    return res.status(400).json({
      success: false,
      error: 'Merged pages are empty',
      uploadId,
      chunkPathsCount: chunkPaths.length,
      failedChunkDownloads: failedChunkDownloads.slice(0, 10)
    });
  }

  // Prepare index_files insert (reuse current table)
  const finalFileName = manifest.fileName || 'Figma Index';
  const finalFileKey = manifest.fileKey || 'unknown';
  const documentId = manifest.documentId || finalFileKey;
  const framesCount = allPages.reduce((sum, p: any) => sum + (Array.isArray(p?.frames) ? p.frames.length : 0), 0);
  const finalizePageIds = allPages
    .map((page: any, pageIndex: number) => getChunkPageId(page, pageIndex))
    .filter(Boolean);

  await syncNormalizedIndexChunk({
    supabaseAdmin,
    owner: { type: 'user', userId: user.id },
    fileKey: finalFileKey,
    projectId: documentId,
    fileName: finalFileName,
    pages: allPages,
    syncId: uploadId,
    finalizePageIds,
  });

  // Do NOT process images here (to keep commit fast). We'll post-process asynchronously.
  const jsonBytes = Buffer.byteLength(JSON.stringify(allPages), 'utf8');
  const fileSizeBytes = jsonBytes;

  // Persist merged JSON to storage (to avoid huge DB rows/timeouts)
  const mergedJson = JSON.stringify(allPages);
  const blob = new Blob([mergedJson], { type: 'application/json' });
  const storagePath = `indices/${uploadId}.json`;
  const up = await (supabaseAdmin as any).storage.from(bucket).upload(storagePath, blob, { upsert: true, contentType: 'application/json' });
  if (up?.error) {
    return res.status(500).json({ success: false, error: 'Failed to persist merged JSON', details: up.error.message });
  }

  const insertData: any = {
    user_id: user.id,
    project_id: documentId,
    figma_file_key: finalFileKey,
    file_name: finalFileName,
    // Store a lightweight pointer in DB; actual JSON is in storage
    index_data: { storageRef: `${bucket}:${storagePath}` },
    uploaded_at: new Date().toISOString(),
    file_size: fileSizeBytes,
    frame_count: framesCount
  };

  // Insert with fallback if file_size column is missing
  const selectWithSize = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at, file_size';
  const selectNoSize   = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at';

  let resp = await supabaseAdmin
    .from('index_files')
    .insert(insertData)
    .select(selectWithSize)
    .single();
  if (resp.error && /(file_size|frame_count)/.test(resp.error.message || '')) {
    const fallback = { ...insertData } as any;
    delete fallback.file_size;
    delete fallback.frame_count;
    resp = await supabaseAdmin
      .from('index_files')
      .insert(fallback)
      .select(selectNoSize)
      .single();
  }
  if (resp.error) {
    return res.status(500).json({ success: false, error: 'Failed to save index', details: resp.error.message });
  }

  // After successful insert: delete older indices for same user + fileKey (keep newest)
  try {
    const newId = (resp as any).data?.id;
    const keyValid = finalFileKey && typeof finalFileKey === 'string' && finalFileKey.trim() !== '' && finalFileKey !== 'unknown';
    if (newId && keyValid) {
      await supabaseAdmin
        .from('index_files')
        .delete()
        .eq('user_id', user.id)
        .eq('figma_file_key', finalFileKey)
        .neq('id', newId)
        .not('file_name', 'like', '%(Part %/%)%'); // don't touch chunks
    }
  } catch (e) {
    // best-effort, do not fail
  }

  // Fire-and-forget: trigger post-processing (compress images and move to storage)
  try {
    const host = req.headers.host || 'www.figdex.com';
    const url = `https://${host}/api/postprocess-index?id=${encodeURIComponent(String(resp.data?.id || ''))}`;
    // Intentionally not awaited
    fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      keepalive: true
    }).catch(() => {});
  } catch {}

  // Best-effort: delete session temp files
  try {
    const delChunks = await (supabaseAdmin as any).storage.from(bucket).remove([
      `sessions/${uploadId}/session.json`,
      ...chunkPaths
    ]);
  } catch {}

  // Return stats
  return res.status(200).json({
    success: true,
    indexId: resp.data?.id,
    frames: framesCount,
    size: +(fileSizeBytes / 1024 / 1024).toFixed(2)
  });
}
