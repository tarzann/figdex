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

  if (!fileKey) {
    return res.status(400).json({ success: false, error: 'fileKey is required' });
  }
  if (!pageMeta.length) {
    return res.status(400).json({ success: false, error: 'pageMeta is required' });
  }

  const svc = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: savedConnection, error: savedConnectionError } = await svc
      .from('saved_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('file_key', fileKey)
      .maybeSingle();

    if (savedConnectionError) {
      return res.status(500).json({ success: false, error: 'Failed to load saved connection' });
    }
    if (!savedConnection?.id) {
      return res.status(404).json({ success: false, error: 'Saved connection not found for this file' });
    }

    const { error: updateConnectionError } = await svc
      .from('saved_connections')
      .update({ page_meta: pageMeta })
      .eq('id', savedConnection.id)
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

    const { data: indexedFiles, error: indexedFilesError } = await svc
      .from('indexed_files')
      .select('id')
      .eq('user_id', userId)
      .eq('figma_file_key', fileKey);

    if (indexedFilesError) {
      return res.status(500).json({ success: false, error: 'Failed to load indexed files' });
    }

    let updatedPagesCount = 0;
    for (const file of indexedFiles || []) {
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
      indexedFileCount: (indexedFiles || []).length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
