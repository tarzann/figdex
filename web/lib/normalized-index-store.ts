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

async function upsertOwnerUsage(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  owner: Owner
) {
  let query = supabaseAdmin
    .from('indexed_files')
    .select('total_frames');

  if (owner.type === 'user') {
    query = query.eq('user_id', owner.userId);
  } else {
    query = query.is('user_id', null).eq('owner_anon_id', owner.anonId);
  }

  const { data: files, error } = await query;
  if (error || !Array.isArray(files)) return;

  const totalFiles = files.length;
  const totalFrames = files.reduce((sum: number, row: any) => sum + (typeof row?.total_frames === 'number' ? row.total_frames : 0), 0);

  const payload = owner.type === 'user'
    ? { user_id: owner.userId, owner_anon_id: null, total_files: totalFiles, total_frames: totalFrames, updated_at: new Date().toISOString() }
    : { user_id: null, owner_anon_id: owner.anonId, total_files: totalFiles, total_frames: totalFrames, updated_at: new Date().toISOString() };

  const conflictColumn = owner.type === 'user' ? 'user_id' : 'owner_anon_id';
  await supabaseAdmin.from('indexed_owner_usage').upsert(payload, { onConflict: conflictColumn });
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

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const figmaPageId = normalizeText(page.pageId || page.id, `page-${pageIndex}`);
    const pageName = normalizeText(page.pageName || page.name, 'Untitled Page');

    const pageUpsertPayload = {
      file_id: fileId,
      figma_page_id: figmaPageId,
      page_name: pageName,
      normalized_page_name: pageName.toLowerCase(),
      sort_order: pageIndex,
      last_sync_id: syncId,
      updated_at: nowIso,
    };

    const { data: pageRow, error: pageError } = await supabaseAdmin
      .from('indexed_pages')
      .upsert({ ...pageUpsertPayload, created_at: nowIso }, { onConflict: 'file_id,figma_page_id' })
      .select('id')
      .single();
    if (pageError) throw pageError;

    const frames = Array.isArray(page.frames) ? page.frames : [];
    if (frames.length > 0) {
      const frameRows = frames.map((frame: any, frameIndex: number) => ({
        page_id: pageRow.id,
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
        .eq('page_id', pageRow.id)
        .or(`last_sync_id.is.null,last_sync_id.neq.${syncId}`);
      if (staleDelete.error) throw staleDelete.error;
    }

    const { count: pageFrameCount } = await supabaseAdmin
      .from('indexed_frames')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', pageRow.id);

    const { error: pageCountError } = await supabaseAdmin
      .from('indexed_pages')
      .update({ frame_count: pageFrameCount || 0, updated_at: nowIso })
      .eq('id', pageRow.id);
    if (pageCountError) throw pageCountError;
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

  await upsertOwnerUsage(supabaseAdmin, owner);
}
