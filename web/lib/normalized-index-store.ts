import type { SupabaseClient } from '@supabase/supabase-js';

type Owner =
  | { type: 'user'; userId: string }
  | { type: 'guest'; anonId: string };

type SyncPage = {
  id?: string;
  pageId?: string;
  name?: string;
  pageName?: string;
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

  let fileQuery = supabaseAdmin
    .from('indexed_files')
    .select('id, cover_image_url')
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
  if (fileId) {
    const { error } = await supabaseAdmin.from('indexed_files').update(filePayload).eq('id', fileId);
    if (error) throw error;
  } else {
    const { data, error } = await supabaseAdmin
      .from('indexed_files')
      .insert({ ...filePayload, created_at: nowIso })
      .select('id')
      .single();
    if (error) throw error;
    fileId = data.id;
  }

  const finalizeSet = new Set(finalizePageIds.filter(Boolean));
  const normalizedPages = pages.map((page) => ({
    ...page,
    frames: Array.isArray(page.frames) ? page.frames : [],
  }));
  const normalizedPageIds = uniquePageIds(normalizedPages);

  const { data: existingPagesRows, error: existingPagesError } = await supabaseAdmin
    .from('indexed_pages')
    .select('id, figma_page_id')
    .eq('file_id', fileId);
  if (existingPagesError) throw existingPagesError;

  const existingPageIdByFigmaPageId = new Map<string, string>(
    (existingPagesRows || []).map((row: any) => [String(row.figma_page_id), String(row.id)])
  );

  const pageUpsertRows = normalizedPages.map((page, pageIndex) => ({
    file_id: fileId,
    figma_page_id: normalizePageId(page, pageIndex),
    page_name: normalizePageDisplayName(page),
    normalized_page_name: normalizePageDisplayName(page).toLowerCase(),
    sort_order: pageIndex,
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

  const { data: currentPagesRows, error: currentPagesError } = await supabaseAdmin
    .from('indexed_pages')
    .select('id, figma_page_id')
    .eq('file_id', fileId);
  if (currentPagesError) throw currentPagesError;

  const currentPageIdByFigmaPageId = new Map<string, string>(
    (currentPagesRows || []).map((row: any) => [String(row.figma_page_id), String(row.id)])
  );

  const finalizedCounts = new Map<string, number>();

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

      const { error: frameError } = await supabaseAdmin
        .from('indexed_frames')
        .upsert(frameRows, { onConflict: 'page_id,figma_frame_id' });
      if (frameError) throw frameError;
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
      finalizedCounts.set(pageId, pageFrameCount || 0);
    } else {
      finalizedCounts.set(pageId, frames.length);
    }
  }

  for (const [pageId, frameCount] of finalizedCounts.entries()) {
    const { error: pageCountError } = await supabaseAdmin
      .from('indexed_pages')
      .update({ frame_count: frameCount, updated_at: nowIso })
      .eq('id', pageId);
    if (pageCountError) throw pageCountError;
  }

  if (finalizeSet.size > 0 && normalizedPageIds.length > 0 && normalizedPageIds.every((pageId) => finalizeSet.has(pageId))) {
    const stalePages = (currentPagesRows || [])
      .filter((row: any) => !normalizedPageIds.includes(String(row.figma_page_id)))
      .map((row: any) => String(row.id));

    if (stalePages.length > 0) {
      const { error: stalePagesDeleteError } = await supabaseAdmin
        .from('indexed_pages')
        .delete()
        .in('id', stalePages);
      if (stalePagesDeleteError) throw stalePagesDeleteError;
    }
  }

  const { data: filePages, error: filePagesError } = await supabaseAdmin
    .from('indexed_pages')
    .select('frame_count')
    .eq('file_id', fileId);
  if (filePagesError) throw filePagesError;

  const indexedPagesCount = Array.isArray(filePages) ? filePages.length : 0;
  const totalFrames = Array.isArray(filePages)
    ? filePages.reduce((sum: number, row: any) => sum + (typeof row?.frame_count === 'number' ? row.frame_count : 0), 0)
    : 0;

  const { error: fileStatsError } = await supabaseAdmin
    .from('indexed_files')
    .update({
      total_frames: totalFrames,
      indexed_pages_count: indexedPagesCount,
      updated_at: nowIso,
      last_indexed_at: nowIso,
      last_sync_id: syncId,
    })
    .eq('id', fileId);
  if (fileStatsError) throw fileStatsError;

  await refreshNormalizedOwnerUsage(supabaseAdmin, owner);
}
