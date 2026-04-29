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

type SavedPageMeta = {
  id: string;
  pageId: string;
  name: string;
  pageName: string;
  sortOrder: number;
  frameCount: number;
  hasFrames: boolean;
};

function isOversizedObjectPersistError(errorMessage: string | null | undefined): boolean {
  const message = String(errorMessage || '').toLowerCase();
  if (!message) return false;
  return (
    message.includes('maximum allowed size') ||
    message.includes('object exceeded') ||
    message.includes('entity too large') ||
    message.includes('payload too large')
  );
}

function sanitizeStorageSegment(value: string, fallback: string) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  return normalized || fallback;
}

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

function normalizeSavedPageMeta(raw: unknown): SavedPageMeta[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      const page = entry && typeof entry === 'object' ? (entry as Record<string, any>) : null;
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
    .filter((page): page is SavedPageMeta => !!page)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function buildIndexedPageMeta(pages: any[]): SavedPageMeta[] {
  return pages.map((page: any, pageIndex: number) => {
    const pageId = getChunkPageId(page, pageIndex);
    const pageName = String(page?.pageName || page?.name || `Page ${pageIndex + 1}`).trim() || `Page ${pageIndex + 1}`;
    const frameCount = Array.isArray(page?.frames) ? page.frames.length : 0;
    return {
      id: pageId,
      pageId,
      name: pageName,
      pageName,
      sortOrder: typeof page?.sortOrder === 'number' && Number.isFinite(page.sortOrder) ? page.sortOrder : pageIndex,
      frameCount,
      hasFrames: frameCount > 0,
    };
  });
}

function mergeSavedPageMeta(existingPages: SavedPageMeta[], nextPages: SavedPageMeta[]): SavedPageMeta[] {
  const merged = new Map<string, SavedPageMeta>();
  for (const page of existingPages) {
    merged.set(page.pageId, { ...page });
  }
  for (const page of nextPages) {
    const existing = merged.get(page.pageId);
    if (!existing) {
      merged.set(page.pageId, { ...page });
      continue;
    }
    merged.set(page.pageId, {
      ...existing,
      ...page,
      sortOrder: typeof page.sortOrder === 'number' ? page.sortOrder : existing.sortOrder,
      frameCount: typeof page.frameCount === 'number' ? page.frameCount : existing.frameCount,
      hasFrames: page.hasFrames !== false,
    });
  }
  return Array.from(merged.values()).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.pageName.localeCompare(b.pageName);
  });
}

async function persistSavedConnectionPageMeta(params: {
  supabaseAdmin: any;
  userId: string;
  fileKey: string;
  fileName: string;
  pageMeta: SavedPageMeta[];
  fileThumbnailUrl?: string | null;
}) {
  const { supabaseAdmin, userId, fileKey, fileName, pageMeta, fileThumbnailUrl } = params;
  if (!fileKey || !pageMeta.length) return;

  const { data: existingConnection, error: existingConnectionError } = await supabaseAdmin
    .from('saved_connections')
    .select('id, page_meta, figma_token')
    .eq('user_id', userId)
    .eq('file_key', fileKey)
    .maybeSingle();
  if (existingConnectionError) throw existingConnectionError;

  const mergedPageMeta = mergeSavedPageMeta(
    normalizeSavedPageMeta(existingConnection?.page_meta),
    pageMeta
  );

  if (existingConnection?.id) {
    const updatePayload: Record<string, any> = {
      file_name: fileName,
      page_meta: mergedPageMeta,
    };
    if (fileThumbnailUrl) {
      updatePayload.file_thumbnail_url = fileThumbnailUrl;
    }
    if (!existingConnection.figma_token) {
      updatePayload.figma_token = '__storage_first_placeholder__';
    }
    const { error: updateError } = await supabaseAdmin
      .from('saved_connections')
      .update(updatePayload)
      .eq('id', existingConnection.id)
      .eq('user_id', userId);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from('saved_connections')
    .insert({
      user_id: userId,
      file_key: fileKey,
      file_name: fileName,
      figma_token: '__storage_first_placeholder__',
      pages: [],
      image_quality: 'med',
      page_meta: mergedPageMeta,
      file_thumbnail_url: fileThumbnailUrl || null,
    });
  if (insertError) throw insertError;
}

async function uploadCoverFromDataUrl(params: {
  supabaseAdmin: any;
  userId: string;
  fileKey: string;
  coverImageDataUrl?: string | null;
}) {
  const { supabaseAdmin, userId, fileKey, coverImageDataUrl } = params;
  if (!coverImageDataUrl || !coverImageDataUrl.startsWith('data:image/')) return null;
  const base64Match = coverImageDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  const base64 = base64Match ? base64Match[1] : null;
  if (!base64) return null;

  const buffer = Buffer.from(base64, 'base64');
  const safeFileKey = sanitizeStorageSegment(fileKey, 'file');
  const objectPath = `user/${sanitizeStorageSegment(userId, 'user')}/covers/${safeFileKey}_cover.png`;
  const bucket = 'figdex-uploads';
  const upload = await supabaseAdmin.storage.from(bucket).upload(objectPath, buffer, {
    contentType: 'image/png',
    upsert: true,
  });
  if (upload?.error) {
    throw new Error(upload.error.message || 'Failed to upload cover image');
  }
  return `${bucket}:${objectPath}`;
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
  let stage = 'boot';
  let normalizedSyncComplete = false;
  const compatibilityWarnings: Array<{ code: string; message: string }> = [];

  try {
    // Auth
    stage = 'auth';
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
    stage = 'load_manifest';
    const manifestPath = `sessions/${uploadId}/session.json`;
    const manResp = await (supabaseAdmin as any).storage.from(bucket).download(manifestPath);
    if (manResp?.error) {
      return res.status(400).json({ success: false, error: 'Session not found' });
    }
    const manifestText = await manResp.data.text();
    const manifest = JSON.parse(manifestText || '{}');

    // List chunks. Direct-to-storage uploads can take a brief moment before they
    // become visible to list/download operations, so retry a few times first.
    stage = 'discover_chunks';
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
    stage = 'merge_chunks';
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
    const manifestPageMeta = normalizeSavedPageMeta(manifest?.pageMeta);
    const indexedPageMeta = buildIndexedPageMeta(allPages);
    let uploadedCoverImageUrl: string | null = null;
    try {
      stage = 'upload_cover';
      uploadedCoverImageUrl = await uploadCoverFromDataUrl({
        supabaseAdmin,
        userId: user.id,
        fileKey: finalFileKey,
        coverImageDataUrl: typeof manifest?.coverImageDataUrl === 'string' ? manifest.coverImageDataUrl : null,
      });
    } catch (coverError: any) {
      compatibilityWarnings.push({
        code: 'cover_upload_failed',
        message: coverError?.message || 'Failed to upload cover image'
      });
    }
    const framesCount = allPages.reduce((sum, p: any) => sum + (Array.isArray(p?.frames) ? p.frames.length : 0), 0);
    const finalizePageIds = allPages
      .map((page: any, pageIndex: number) => getChunkPageId(page, pageIndex))
      .filter(Boolean);

    stage = 'sync_normalized';
    await syncNormalizedIndexChunk({
      supabaseAdmin,
      owner: { type: 'user', userId: user.id },
      fileKey: finalFileKey,
      projectId: documentId,
      fileName: finalFileName,
      coverImageUrl: uploadedCoverImageUrl,
      pages: allPages,
      syncId: uploadId,
      finalizePageIds,
    });
    normalizedSyncComplete = true;

    try {
      stage = 'persist_saved_connection';
      await persistSavedConnectionPageMeta({
        supabaseAdmin,
        userId: user.id,
        fileKey: finalFileKey,
        fileName: finalFileName,
        pageMeta: mergeSavedPageMeta(manifestPageMeta, indexedPageMeta),
        fileThumbnailUrl: uploadedCoverImageUrl,
      });
    } catch (savedConnectionError: any) {
      compatibilityWarnings.push({
        code: 'saved_connection_sync_failed',
        message: savedConnectionError?.message || 'Failed to persist saved connection metadata'
      });
    }

    // Do NOT process images here (to keep commit fast). We'll post-process asynchronously.
    stage = 'prepare_legacy_payload';
    const jsonBytes = Buffer.byteLength(JSON.stringify(allPages), 'utf8');
    const fileSizeBytes = jsonBytes;

    // Persist merged JSON to storage (to avoid huge DB rows/timeouts)
    stage = 'persist_legacy_json';
    const mergedJson = JSON.stringify(allPages);
    const blob = new Blob([mergedJson], { type: 'application/json' });
    const storagePath = `indices/${uploadId}.json`;
    const up = await (supabaseAdmin as any).storage.from(bucket).upload(storagePath, blob, { upsert: true, contentType: 'application/json' });
    const mergedJsonPersistWarning =
      up?.error && isOversizedObjectPersistError(up.error.message)
        ? String(up.error.message || 'Merged JSON exceeded maximum allowed object size')
        : null;
    if (up?.error && !mergedJsonPersistWarning) {
      compatibilityWarnings.push({
        code: 'legacy_json_persist_failed',
        message: up.error.message || 'Failed to persist merged JSON'
      });
    }
    if (mergedJsonPersistWarning) {
      compatibilityWarnings.push({
        code: 'merged_json_too_large',
        message: mergedJsonPersistWarning
      });
    }

    const insertData: any = {
      user_id: user.id,
      project_id: documentId,
      figma_file_key: finalFileKey,
      file_name: finalFileName,
      // Store a lightweight pointer in DB; actual JSON is in storage when available.
      // If the merged JSON is too large to persist as a single legacy object, the
      // normalized model remains the operational source of truth.
      index_data: mergedJsonPersistWarning || (up && up.error)
        ? {
            normalizedOnly: true,
            compatibilityWarning: mergedJsonPersistWarning ? 'merged_json_too_large' : 'legacy_json_persist_failed',
            syncId: uploadId,
          }
        : { storageRef: `${bucket}:${storagePath}` },
      uploaded_at: new Date().toISOString(),
      file_size: fileSizeBytes,
      frame_count: framesCount
    };

    // Insert with fallback if file_size column is missing
    stage = 'persist_legacy_index';
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
      compatibilityWarnings.push({
        code: 'legacy_index_save_failed',
        message: resp.error.message || 'Failed to save legacy index'
      });
    }

    // After successful insert: delete older indices for same user + fileKey (keep newest)
    try {
      stage = 'cleanup_legacy_indices';
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
    } catch (cleanupError: any) {
      compatibilityWarnings.push({
        code: 'legacy_cleanup_failed',
        message: cleanupError?.message || 'Failed to clean up older legacy indices'
      });
    }

    // Fire-and-forget: trigger post-processing (compress images and move to storage)
    try {
      stage = 'postprocess_legacy_index';
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
      stage = 'cleanup_session';
      await (supabaseAdmin as any).storage.from(bucket).remove([
        `sessions/${uploadId}/session.json`,
        ...chunkPaths
      ]);
    } catch {}

    // Return stats
    return res.status(200).json({
      success: true,
      indexId: resp.data?.id || null,
      frames: framesCount,
      size: +(fileSizeBytes / 1024 / 1024).toFixed(2),
      compatibilityWarning: compatibilityWarnings.length > 0 ? compatibilityWarnings[0] : null,
      compatibilityWarnings: compatibilityWarnings.length > 0 ? compatibilityWarnings : null,
    });
  } catch (error: any) {
    const message = error?.message || 'Commit failed';
    if (normalizedSyncComplete) {
      compatibilityWarnings.push({
        code: 'post_sync_commit_failed',
        message: `Commit hit a non-fatal error after normalized sync: ${message}`
      });
      return res.status(200).json({
        success: true,
        indexId: null,
        compatibilityWarning: compatibilityWarnings[0],
        compatibilityWarnings,
      });
    }
    return res.status(500).json({
      success: false,
      error: message,
      details: error?.stack ? String(error.stack).slice(0, 4000) : null,
      stage,
    });
  }
}
