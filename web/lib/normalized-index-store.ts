import type { SupabaseClient } from '@supabase/supabase-js';

type Owner =
  | { type: 'user'; userId: string }
  | { type: 'guest'; anonId: string };

type SyncPage = {
  id?: string;
  pageId?: string;
  name?: string;
  pageName?: string;
  sortOrder?: number | null;
  frames?: any[];
};

type SyncChunkParams = {
  supabaseAdmin: SupabaseClient<any, any, any, any, any>;
  owner: Owner;
  fileKey: string;
  projectId?: string | null;
  fileName?: string | null;
  coverImageUrl?: string | null;
  pages: SyncPage[];
  syncId: string;
  finalizePageIds?: string[];
};

type OwnerUsage = {
  totalFiles: number;
  totalFrames: number;
};

type OwnerUsageDelta = {
  deltaFiles?: number;
  deltaFrames?: number;
};

const INDEXED_FRAME_UPSERT_BATCH_SIZE = 100;

function normalizeText(value?: string | null, fallback = ''): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || fallback;
}

export function normalizeLogicalFileId(projectId?: string | null, fileKey?: string | null): string {
  const normalizedFileKey = normalizeText(fileKey);
  const normalizedProjectId = normalizeText(projectId);
  const stableProjectId = normalizedProjectId && normalizedProjectId !== '0:0' ? normalizedProjectId : '';
  return normalizedFileKey || stableProjectId || 'unknown';
}

function buildFrameSearchText(frame: any): string {
  const parts: string[] = [];
  const push = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed) parts.push(trimmed);
  };

  push(frame?.name);
  push(frame?.text);
  push(frame?.pageName);

  if (Array.isArray(frame?.texts)) {
    frame.texts.forEach(push);
  }
  if (Array.isArray(frame?.searchTokens)) {
    frame.searchTokens.forEach(push);
  }
  if (Array.isArray(frame?.frameTags)) {
    frame.frameTags.forEach(push);
  }
  if (Array.isArray(frame?.customTags)) {
    frame.customTags.forEach(push);
  }

  return Array.from(new Set(parts)).join(' ');
}

function normalizePageId(page: SyncPage, pageIndex: number): string {
  return normalizeText(page.pageId || page.id, `page-${pageIndex}`);
}

function normalizePageDisplayName(page: SyncPage): string {
  return normalizeText(page.pageName || page.name, 'Untitled Page');
}

function normalizePageSortOrder(page: SyncPage, fallback: number): number {
  return typeof page.sortOrder === 'number' && Number.isFinite(page.sortOrder)
    ? page.sortOrder
    : fallback;
}

function uniquePageIds(pages: SyncPage[]): string[] {
  return Array.from(new Set(pages.map((page, index) => normalizePageId(page, index)).filter(Boolean)));
}

async function computeOwnerUsage(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  owner: Owner
) : Promise<OwnerUsage> {
  let query = supabaseAdmin
    .from('indexed_files')
    .select('total_frames');

  if (owner.type === 'user') {
    query = query.eq('user_id', owner.userId);
  } else {
    query = query.is('user_id', null).eq('owner_anon_id', owner.anonId);
  }

  const { data: files, error } = await query;
  if (error || !Array.isArray(files)) {
    return { totalFiles: 0, totalFrames: 0 };
  }

  const totalFiles = files.length;
  const totalFrames = files.reduce((sum: number, row: any) => sum + (typeof row?.total_frames === 'number' ? row.total_frames : 0), 0);

  return { totalFiles, totalFrames };
}

export async function refreshNormalizedOwnerUsage(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  owner: Owner
): Promise<OwnerUsage> {
  const usage = await computeOwnerUsage(supabaseAdmin, owner);

  const payload = owner.type === 'user'
    ? { user_id: owner.userId, owner_anon_id: null, total_files: usage.totalFiles, total_frames: usage.totalFrames, updated_at: new Date().toISOString() }
    : { user_id: null, owner_anon_id: owner.anonId, total_files: usage.totalFiles, total_frames: usage.totalFrames, updated_at: new Date().toISOString() };

  let existingQuery = supabaseAdmin
    .from('indexed_owner_usage')
    .select('id')
    .limit(1);

  if (owner.type === 'user') {
    existingQuery = existingQuery.eq('user_id', owner.userId);
  } else {
    existingQuery = existingQuery.eq('owner_anon_id', owner.anonId);
  }

  const { data: existingRow, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw existingError;

  if (existingRow?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('indexed_owner_usage')
      .update(payload)
      .eq('id', existingRow.id);
    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('indexed_owner_usage')
      .insert(payload);
    if (insertError) throw insertError;
  }

  return usage;
}

export async function applyNormalizedOwnerUsageDelta(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  owner: Owner,
  delta: OwnerUsageDelta
): Promise<OwnerUsage> {
  const deltaFiles = Number.isFinite(delta.deltaFiles) ? Number(delta.deltaFiles) : 0;
  const deltaFrames = Number.isFinite(delta.deltaFrames) ? Number(delta.deltaFrames) : 0;

  let existingQuery = supabaseAdmin
    .from('indexed_owner_usage')
    .select('id, total_files, total_frames')
    .limit(1);

  if (owner.type === 'user') {
    existingQuery = existingQuery.eq('user_id', owner.userId);
  } else {
    existingQuery = existingQuery.eq('owner_anon_id', owner.anonId);
  }

  const { data: existingRow, error: existingError } = await existingQuery.maybeSingle();
  if (existingError) throw existingError;

  const nextUsage = {
    totalFiles: Math.max(0, Number(existingRow?.total_files || 0) + deltaFiles),
    totalFrames: Math.max(0, Number(existingRow?.total_frames || 0) + deltaFrames),
  };
  const nowIso = new Date().toISOString();
  const payload = owner.type === 'user'
    ? {
        user_id: owner.userId,
        owner_anon_id: null,
        total_files: nextUsage.totalFiles,
        total_frames: nextUsage.totalFrames,
        updated_at: nowIso,
      }
    : {
        user_id: null,
        owner_anon_id: owner.anonId,
        total_files: nextUsage.totalFiles,
        total_frames: nextUsage.totalFrames,
        updated_at: nowIso,
      };

  if (existingRow?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('indexed_owner_usage')
      .update(payload)
      .eq('id', existingRow.id);
    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('indexed_owner_usage')
      .insert(payload);
    if (insertError) throw insertError;
  }

  return nextUsage;
}

export async function clearNormalizedOwnerUsage(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  owner: Owner
): Promise<void> {
  let query = supabaseAdmin.from('indexed_owner_usage').delete();
  if (owner.type === 'user') {
    query = query.eq('user_id', owner.userId);
  } else {
    query = query.eq('owner_anon_id', owner.anonId);
  }
  await query;
}

export async function removeNormalizedIndexedPages(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  params: {
    owner: Owner;
    fileKey: string;
    pageIds: string[];
  }
): Promise<{
  removedPageIds: string[];
  removedPagesCount: number;
  removedFramesCount: number;
  fileDeleted: boolean;
}> {
  const { owner, fileKey } = params;
  const pageIds = Array.from(new Set((params.pageIds || []).map((pageId) => normalizeText(pageId)).filter(Boolean)));

  if (!fileKey || pageIds.length === 0) {
    return {
      removedPageIds: [],
      removedPagesCount: 0,
      removedFramesCount: 0,
      fileDeleted: false,
    };
  }

  let fileQuery = supabaseAdmin
    .from('indexed_files')
    .select('id')
    .eq('figma_file_key', fileKey)
    .limit(1);

  if (owner.type === 'user') {
    fileQuery = fileQuery.eq('user_id', owner.userId);
  } else {
    fileQuery = fileQuery.is('user_id', null).eq('owner_anon_id', owner.anonId);
  }

  const { data: fileRow, error: fileError } = await fileQuery.maybeSingle();
  if (fileError) throw fileError;
  if (!fileRow?.id) {
    return {
      removedPageIds: [],
      removedPagesCount: 0,
      removedFramesCount: 0,
      fileDeleted: false,
    };
  }

  const fileId = String(fileRow.id);
  const { data: removablePages, error: removablePagesError } = await supabaseAdmin
    .from('indexed_pages')
    .select('id, figma_page_id, frame_count')
    .eq('file_id', fileId)
    .in('figma_page_id', pageIds);
  if (removablePagesError) throw removablePagesError;

  const removablePageRows = Array.isArray(removablePages) ? removablePages : [];
  if (removablePageRows.length === 0) {
    return {
      removedPageIds: [],
      removedPagesCount: 0,
      removedFramesCount: 0,
      fileDeleted: false,
    };
  }

  const removedPageIds = removablePageRows.map((row: any) => String(row.figma_page_id)).filter(Boolean);
  const removedPageRowIds = removablePageRows.map((row: any) => String(row.id)).filter(Boolean);

  let removedFramesCount = removablePageRows.reduce((sum: number, row: any) => {
    return sum + (typeof row?.frame_count === 'number' ? row.frame_count : 0);
  }, 0);

  if (removedPageRowIds.length > 0) {
    const { count: actualFrameCount, error: actualFrameCountError } = await supabaseAdmin
      .from('indexed_frames')
      .select('id', { count: 'exact', head: true })
      .in('page_id', removedPageRowIds);
    if (!actualFrameCountError && typeof actualFrameCount === 'number') {
      removedFramesCount = actualFrameCount;
    }
  }

  const { error: deletePagesError } = await supabaseAdmin
    .from('indexed_pages')
    .delete()
    .eq('file_id', fileId)
    .in('figma_page_id', removedPageIds);
  if (deletePagesError) throw deletePagesError;

  const nowIso = new Date().toISOString();
  const { data: filePages, error: filePagesError } = await supabaseAdmin
    .from('indexed_pages')
    .select('frame_count')
    .eq('file_id', fileId);
  if (filePagesError) throw filePagesError;

  const indexedPagesCount = Array.isArray(filePages) ? filePages.length : 0;
  const totalFrames = Array.isArray(filePages)
    ? filePages.reduce((sum: number, row: any) => sum + (typeof row?.frame_count === 'number' ? row.frame_count : 0), 0)
    : 0;

  let fileDeleted = false;
  if (indexedPagesCount === 0) {
    const { error: deleteFileError } = await supabaseAdmin
      .from('indexed_files')
      .delete()
      .eq('id', fileId);
    if (deleteFileError) throw deleteFileError;
    fileDeleted = true;
  } else {
    const { error: updateFileError } = await supabaseAdmin
      .from('indexed_files')
      .update({
        total_frames: totalFrames,
        indexed_pages_count: indexedPagesCount,
        updated_at: nowIso,
        last_indexed_at: nowIso,
      })
      .eq('id', fileId);
    if (updateFileError) throw updateFileError;
  }

  await applyNormalizedOwnerUsageDelta(supabaseAdmin, owner, {
    deltaFiles: fileDeleted ? -1 : 0,
    deltaFrames: -removedFramesCount,
  });

  return {
    removedPageIds,
    removedPagesCount: removedPageIds.length,
    removedFramesCount,
    fileDeleted,
  };
}

export async function syncNormalizedIndexChunk(params: SyncChunkParams): Promise<void> {
  const {
    supabaseAdmin,
    owner,
    fileKey,
    projectId,
    fileName,
    coverImageUrl,
    pages,
    syncId,
    finalizePageIds = [],
  } = params;

  const logicalFileId = normalizeLogicalFileId(projectId, fileKey);
  const nowIso = new Date().toISOString();
  const normalizedFileName = normalizeText(fileName, 'Untitled');
  const normalizedPages = pages.map((page) => ({
    ...page,
    frames: Array.isArray(page.frames) ? page.frames : [],
  }));
  const normalizedPageIds = uniquePageIds(normalizedPages);

  let fileQuery = supabaseAdmin
    .from('indexed_files')
    .select('id, cover_image_url, total_frames, indexed_pages_count')
    .eq('logical_file_id', logicalFileId)
    .limit(1);

  if (owner.type === 'user') {
    fileQuery = fileQuery.eq('user_id', owner.userId);
  } else {
    fileQuery = fileQuery.is('user_id', null).eq('owner_anon_id', owner.anonId);
  }

  const { data: existingFileRow } = await fileQuery.maybeSingle();

  const filePayload = {
    user_id: owner.type === 'user' ? owner.userId : null,
    owner_anon_id: owner.type === 'guest' ? owner.anonId : null,
    logical_file_id: logicalFileId,
    project_id: projectId || null,
    figma_file_key: fileKey || null,
    file_name: normalizedFileName,
    normalized_file_name: normalizedFileName.toLowerCase(),
    cover_image_url: coverImageUrl || existingFileRow?.cover_image_url || null,
    source: 'plugin',
    last_sync_id: syncId,
    updated_at: nowIso,
    last_indexed_at: nowIso,
  };

  let fileId = existingFileRow?.id as string | undefined;
  const fileCreated = !fileId;
  let currentFileTotalFrames = typeof existingFileRow?.total_frames === 'number' ? existingFileRow.total_frames : 0;
  let currentIndexedPagesCount = typeof existingFileRow?.indexed_pages_count === 'number' ? existingFileRow.indexed_pages_count : 0;

  if (fileId) {
    // Existing files are updated once at the end of the sync to avoid extra IO.
  } else {
    const { data, error } = await supabaseAdmin
      .from('indexed_files')
      .insert({
        ...filePayload,
        total_frames: 0,
        indexed_pages_count: 0,
        created_at: nowIso,
      })
      .select('id')
      .single();
    if (error) throw error;
    fileId = data.id;
    currentFileTotalFrames = 0;
    currentIndexedPagesCount = 0;
  }

  const finalizeSet = new Set(finalizePageIds.filter(Boolean));
  const existingPagesRows = normalizedPageIds.length > 0
    ? await supabaseAdmin
        .from('indexed_pages')
        .select('id, figma_page_id, frame_count')
        .eq('file_id', fileId)
        .in('figma_page_id', normalizedPageIds)
    : { data: [], error: null };
  if (existingPagesRows.error) throw existingPagesRows.error;

  const existingPageIdByFigmaPageId = new Map<string, string>();
  const existingPageFrameCountByFigmaPageId = new Map<string, number>();
  for (const row of existingPagesRows.data || []) {
    const figmaPageId = String((row as any).figma_page_id);
    existingPageIdByFigmaPageId.set(figmaPageId, String((row as any).id));
    existingPageFrameCountByFigmaPageId.set(
      figmaPageId,
      typeof (row as any).frame_count === 'number' ? (row as any).frame_count : 0
    );
  }

  const pageUpsertRows = normalizedPages.map((page, pageIndex) => ({
    file_id: fileId,
    figma_page_id: normalizePageId(page, pageIndex),
    page_name: normalizePageDisplayName(page),
    normalized_page_name: normalizePageDisplayName(page).toLowerCase(),
    sort_order: normalizePageSortOrder(page, pageIndex),
    last_sync_id: syncId,
    updated_at: nowIso,
    created_at: nowIso,
  }));

  if (pageUpsertRows.length > 0) {
    const { error: pageUpsertError } = await supabaseAdmin
      .from('indexed_pages')
      .upsert(pageUpsertRows, { onConflict: 'file_id,figma_page_id' });
    if (pageUpsertError) throw pageUpsertError;
  }

  const currentPagesRows = normalizedPageIds.length > 0
    ? await supabaseAdmin
        .from('indexed_pages')
        .select('id, figma_page_id')
        .eq('file_id', fileId)
        .in('figma_page_id', normalizedPageIds)
    : { data: [], error: null };
  if (currentPagesRows.error) throw currentPagesRows.error;

  const currentPageIdByFigmaPageId = new Map<string, string>(
    (currentPagesRows.data || []).map((row: any) => [String(row.figma_page_id), String(row.id)])
  );

  const finalizedCounts = new Map<string, number>();
  const newPageCount = normalizedPageIds.reduce((sum, pageId) => {
    return sum + (existingPageIdByFigmaPageId.has(pageId) ? 0 : 1);
  }, 0);
  let deltaFrames = 0;

  for (let pageIndex = 0; pageIndex < normalizedPages.length; pageIndex++) {
    const page = normalizedPages[pageIndex];
    const figmaPageId = normalizePageId(page, pageIndex);
    const pageId = currentPageIdByFigmaPageId.get(figmaPageId) || existingPageIdByFigmaPageId.get(figmaPageId);
    if (!pageId) continue;

    const frames = page.frames;
    if (frames.length > 0) {
      const frameRows = frames.map((frame: any, frameIndex: number) => ({
        page_id: pageId,
        figma_frame_id: normalizeText(frame?.id, `frame-${frameIndex}`),
        frame_name: normalizeText(frame?.name, 'Untitled Frame'),
        search_text: buildFrameSearchText(frame),
        frame_tags: Array.isArray(frame?.frameTags) ? frame.frameTags : [],
        custom_tags: Array.isArray(frame?.customTags) ? frame.customTags : [],
        image_url: typeof frame?.image === 'string' ? frame.image : null,
        thumb_url: typeof frame?.thumb_url === 'string' ? frame.thumb_url : null,
        frame_payload: frame || {},
        sort_order: frameIndex,
        last_sync_id: syncId,
        updated_at: nowIso,
        created_at: nowIso,
      }));

      for (let batchStart = 0; batchStart < frameRows.length; batchStart += INDEXED_FRAME_UPSERT_BATCH_SIZE) {
        const frameBatch = frameRows.slice(batchStart, batchStart + INDEXED_FRAME_UPSERT_BATCH_SIZE);
        const { error: frameError } = await supabaseAdmin
          .from('indexed_frames')
          .upsert(frameBatch, { onConflict: 'page_id,figma_frame_id' });
        if (frameError) throw frameError;
      }
    }

    if (finalizeSet.has(figmaPageId)) {
      const staleDelete = await supabaseAdmin
        .from('indexed_frames')
        .delete()
        .eq('page_id', pageId)
        .or(`last_sync_id.is.null,last_sync_id.neq.${syncId}`);
      if (staleDelete.error) throw staleDelete.error;

      const { count: pageFrameCount, error: pageFrameCountError } = await supabaseAdmin
        .from('indexed_frames')
        .select('id', { count: 'exact', head: true })
        .eq('page_id', pageId);
      if (pageFrameCountError) throw pageFrameCountError;
      const nextFrameCount = pageFrameCount || 0;
      const previousFrameCount = existingPageFrameCountByFigmaPageId.get(figmaPageId) || 0;
      deltaFrames += nextFrameCount - previousFrameCount;
      finalizedCounts.set(pageId, nextFrameCount);
    }
  }

  for (const [pageId, frameCount] of finalizedCounts.entries()) {
    const { error: pageCountError } = await supabaseAdmin
      .from('indexed_pages')
      .update({ frame_count: frameCount, updated_at: nowIso })
      .eq('id', pageId);
    if (pageCountError) throw pageCountError;
  }

  // Important: do not delete pages that are not present in the current chunk.
  // Partial plugin updates can finalize one page at a time, and pruning "stale"
  // pages here causes unrelated pages from the same file to disappear mid-sync.
  // Page removal should only happen in an explicit full-file replacement flow.
  const indexedPagesCount = currentIndexedPagesCount + newPageCount;
  const totalFrames = Math.max(0, currentFileTotalFrames + deltaFrames);

  const { error: fileStatsError } = await supabaseAdmin
    .from('indexed_files')
    .update({
      ...filePayload,
      total_frames: totalFrames,
      indexed_pages_count: indexedPagesCount,
    })
    .eq('id', fileId);
  if (fileStatsError) throw fileStatsError;

  await applyNormalizedOwnerUsageDelta(supabaseAdmin, owner, {
    deltaFiles: fileCreated ? 1 : 0,
    deltaFrames,
  });
}
