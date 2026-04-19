import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromApiKey } from '../../lib/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

type RepairPageMeta = {
  id: string;
  pageId: string;
  name: string;
  pageName: string;
  sortOrder: number;
  frameCount: number;
  hasFrames: boolean;
};

function sanitizeStorageSegment(value: string, fallback: string) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  return normalized || fallback;
}

function normalizePageMeta(raw: unknown): RepairPageMeta[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      const page = entry && typeof entry === 'object' ? (entry as Record<string, any>) : null;
      const id = String(page?.id || page?.pageId || '').trim();
      if (!id) return null;
      const name = String(page?.name || page?.pageName || `Page ${index + 1}`).trim() || `Page ${index + 1}`;
      return {
        id,
        pageId: id,
        name,
        pageName: name,
        sortOrder: typeof page?.sortOrder === 'number' && Number.isFinite(page.sortOrder) ? page.sortOrder : index,
        frameCount: typeof page?.frameCount === 'number' && Number.isFinite(page.frameCount) ? page.frameCount : 0,
        hasFrames: page?.hasFrames !== false,
      };
    })
    .filter((page): page is RepairPageMeta => !!page)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function uploadCoverFromDataUrl(params: {
  svc: any;
  userId: string;
  fileKey: string;
  coverImageDataUrl?: string | null;
}) {
  const { svc, userId, fileKey, coverImageDataUrl } = params;
  if (!coverImageDataUrl || !coverImageDataUrl.startsWith('data:image/')) return null;
  const base64Match = coverImageDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  const base64 = base64Match ? base64Match[1] : null;
  if (!base64) return null;

  const buffer = Buffer.from(base64, 'base64');
  const objectPath = `user/${sanitizeStorageSegment(userId, 'user')}/covers/${sanitizeStorageSegment(fileKey, 'file')}_cover.png`;
  const bucket = 'figdex-uploads';
  const upload = await svc.storage.from(bucket).upload(objectPath, buffer, {
    contentType: 'image/png',
    upsert: true,
  });
  if (upload?.error) {
    throw new Error(upload.error.message || 'Failed to upload cover image');
  }
  return `${bucket}:${objectPath}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ success: false, error: 'Supabase is not configured' });
  }

  const userId = await getUserIdFromApiKey(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const fileKey = typeof req.body?.fileKey === 'string' ? req.body.fileKey.trim() : '';
  const pageMeta = normalizePageMeta(req.body?.pageMeta);
  const coverImageDataUrl = typeof req.body?.coverImageDataUrl === 'string' ? req.body.coverImageDataUrl : null;

  if (!fileKey) {
    return res.status(400).json({ success: false, error: 'fileKey is required' });
  }
  if (!pageMeta.length) {
    return res.status(400).json({ success: false, error: 'pageMeta is required' });
  }

  const svc = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const uploadedCoverImageUrl = await uploadCoverFromDataUrl({
      svc,
      userId,
      fileKey,
      coverImageDataUrl,
    });

    const { data: indexedFiles, error: indexedFilesError } = await svc
      .from('indexed_files')
      .select('id, file_name')
      .eq('user_id', userId)
      .eq('figma_file_key', fileKey);

    if (indexedFilesError) {
      return res.status(500).json({ success: false, error: 'Failed to load indexed files' });
    }

    const { data: savedConnection, error: savedConnectionError } = await svc
      .from('saved_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('file_key', fileKey)
      .maybeSingle();

    if (savedConnectionError) {
      return res.status(500).json({ success: false, error: 'Failed to load saved connection' });
    }

    let savedConnectionId = savedConnection?.id || null;
    if (!savedConnectionId) {
      const fallbackFileName =
        String(req.body?.fileName || '').trim() ||
        String(indexedFiles?.[0]?.file_name || '').trim() ||
        fileKey;

      const { data: createdConnection, error: createConnectionError } = await svc
        .from('saved_connections')
        .insert({
          user_id: userId,
          file_key: fileKey,
          file_name: fallbackFileName,
          figma_token: '__plugin_repair_placeholder__',
          pages: [],
          image_quality: 'med',
          page_meta: pageMeta,
        })
        .select('id')
        .single();

      if (createConnectionError) {
        return res.status(500).json({ success: false, error: 'Failed to create saved connection for this file' });
      }
      savedConnectionId = createdConnection?.id || null;
    }

    if (!savedConnectionId) {
      return res.status(500).json({ success: false, error: 'Saved connection repair failed for this file' });
    }

    const { error: updateConnectionError } = await svc
      .from('saved_connections')
      .update({
        page_meta: pageMeta,
        ...(uploadedCoverImageUrl ? { file_thumbnail_url: uploadedCoverImageUrl } : {})
      })
      .eq('id', savedConnectionId)
      .eq('user_id', userId);

    if (updateConnectionError) {
      return res.status(500).json({ success: false, error: 'Failed to update saved connection metadata' });
    }

    const sortOrderByPageId = new Map<string, number>();
    const pageNameByPageId = new Map<string, string>();
    pageMeta.forEach((page, index) => {
      sortOrderByPageId.set(page.pageId, typeof page.sortOrder === 'number' ? page.sortOrder : index);
      pageNameByPageId.set(page.pageId, page.pageName || page.name || `Page ${index + 1}`);
    });

    let updatedPagesCount = 0;
    let updatedFilesCount = 0;
    for (const file of indexedFiles || []) {
      if (uploadedCoverImageUrl) {
        const { error: updateIndexedFileError } = await svc
          .from('indexed_files')
          .update({ cover_image_url: uploadedCoverImageUrl })
          .eq('id', file.id);
        if (updateIndexedFileError) {
          return res.status(500).json({ success: false, error: 'Failed to repair indexed file cover' });
        }
        updatedFilesCount += 1;
      }

      const { data: indexedPages, error: indexedPagesError } = await svc
        .from('indexed_pages')
        .select('id, figma_page_id, page_name, sort_order')
        .eq('file_id', file.id);

      if (indexedPagesError) {
        return res.status(500).json({ success: false, error: 'Failed to load indexed pages' });
      }

      for (const page of indexedPages || []) {
        const pageId = String(page?.figma_page_id || '').trim();
        if (!pageId || !sortOrderByPageId.has(pageId)) continue;

        const desiredSortOrder = sortOrderByPageId.get(pageId);
        const desiredPageName = pageNameByPageId.get(pageId) || page.page_name || '';
        const needsSortUpdate = typeof desiredSortOrder === 'number' && page.sort_order !== desiredSortOrder;
        const needsNameUpdate = !!desiredPageName && page.page_name !== desiredPageName;
        if (!needsSortUpdate && !needsNameUpdate) continue;

        const updateData: Record<string, any> = {};
        if (needsSortUpdate) updateData.sort_order = desiredSortOrder;
        if (needsNameUpdate) updateData.page_name = desiredPageName;

        const { error: updateIndexedPageError } = await svc
          .from('indexed_pages')
          .update(updateData)
          .eq('id', page.id);

        if (updateIndexedPageError) {
          return res.status(500).json({ success: false, error: 'Failed to repair indexed page order' });
        }
        updatedPagesCount += 1;
      }
    }

    return res.status(200).json({
      success: true,
      fileKey,
      pageMetaCount: pageMeta.length,
      updatedPagesCount,
      updatedFilesCount,
      indexedFileCount: (indexedFiles || []).length,
      updatedCover: !!uploadedCoverImageUrl,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
