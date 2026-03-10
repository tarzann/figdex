import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseAdminClient = SupabaseClient<any, any, any, any, any>;

export type ArchiveableIndexRow = {
  id: number;
  user_id: string;
  project_id: string | null;
  figma_file_key: string | null;
  file_name: string | null;
  index_file_id?: number | null;
  index_data: any;
  frame_tags: string[] | null;
  custom_tags: string[] | null;
  naming_tags: string[] | null;
  size_tags: string[] | null;
  file_size: number | null;
  uploaded_at: string | null;
};

export async function archiveExistingIndex(params: {
  supabaseAdmin: SupabaseAdminClient;
  existingIndex: ArchiveableIndexRow;
  storageBucket: string;
}) {
  const { supabaseAdmin, existingIndex, storageBucket } = params;
  if (!existingIndex || !existingIndex.id || !existingIndex.user_id) {
    return;
  }

  console.log('🗂️ archiveExistingIndex called', {
    indexFileId: existingIndex.id,
    projectId: existingIndex.project_id,
    figmaFileKey: existingIndex.figma_file_key,
    userId: existingIndex.user_id,
  });

  const normalizedPages = normalizeIndexPages(existingIndex.index_data);
  const storagePaths = collectStoragePathsFromPages(normalizedPages);

  const payload: any = {
    index_file_id: existingIndex.id,
    user_id: existingIndex.user_id,
    project_id: existingIndex.project_id,
    figma_file_key: existingIndex.figma_file_key,
    file_name: existingIndex.file_name,
    index_data: normalizedPages,
    frame_tags: Array.isArray(existingIndex.frame_tags) && existingIndex.frame_tags.length
      ? existingIndex.frame_tags
      : null,
    custom_tags: Array.isArray(existingIndex.custom_tags) && existingIndex.custom_tags.length
      ? existingIndex.custom_tags
      : null,
    naming_tags: Array.isArray(existingIndex.naming_tags) && existingIndex.naming_tags.length
      ? existingIndex.naming_tags
      : null,
    size_tags: Array.isArray(existingIndex.size_tags) && existingIndex.size_tags.length
      ? existingIndex.size_tags
      : null,
    file_size: existingIndex.file_size,
    uploaded_at: existingIndex.uploaded_at,
    storage_paths: storagePaths.length ? storagePaths : null,
  };

  const { error } = await supabaseAdmin.from('index_archives').insert(payload);
  if (error) {
    console.warn('⚠️ Failed to archive index:', error.message);
  } else {
    console.log('✅ Archived index saved', { indexFileId: existingIndex.id, userId: existingIndex.user_id });
  }

  await enforceArchiveRetention({
    supabaseAdmin,
    userId: existingIndex.user_id,
    projectId: existingIndex.project_id,
    figmaFileKey: existingIndex.figma_file_key,
    storageBucket,
  });
}

function normalizeIndexPages(raw: any): any[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [];
    }
  }
  return [];
}

function collectStoragePathsFromPages(pages: any[]): string[] {
  const paths = new Set<string>();
  if (!Array.isArray(pages)) {
    return [];
  }
  pages.forEach((page) => {
    if (!page || !Array.isArray(page.frames)) {
      return;
    }
    page.frames.forEach((frame: any) => {
      if (!frame) return;
      if (typeof frame.storage_path === 'string' && frame.storage_path.trim().length > 0) {
        paths.add(frame.storage_path.trim());
      }
    });
  });
  return Array.from(paths);
}

function parseStoragePath(raw: string, fallbackBucket: string): { bucket: string; path: string } | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx > 0) {
    const bucket = trimmed.slice(0, colonIdx);
    const path = trimmed.slice(colonIdx + 1);
    if (bucket && path) {
      return { bucket, path };
    }
  }
  if (fallbackBucket) {
    return { bucket: fallbackBucket, path: trimmed };
  }
  return null;
}

async function removeArchivedStoragePaths(params: {
  supabaseAdmin: SupabaseAdminClient;
  storageBucket: string;
  paths?: string[] | null;
}) {
  const { supabaseAdmin, storageBucket, paths } = params;
  if (!Array.isArray(paths) || paths.length === 0) {
    return;
  }
  const bucketMap = new Map<string, string[]>();
  paths.forEach((raw) => {
    const parsed = parseStoragePath(raw, storageBucket);
    if (!parsed) return;
    const current = bucketMap.get(parsed.bucket) || [];
    current.push(parsed.path);
    bucketMap.set(parsed.bucket, current);
  });

  for (const [bucket, list] of bucketMap) {
    const CHUNK = 500;
    for (let i = 0; i < list.length; i += CHUNK) {
      const segment = list.slice(i, i + CHUNK);
      try {
        await (supabaseAdmin as any).storage.from(bucket).remove(segment);
      } catch (error) {
        console.warn('⚠️ Failed to remove archived storage objects:', { bucket, error });
      }
    }
  }
}

async function enforceArchiveRetention(params: {
  supabaseAdmin: SupabaseAdminClient;
  userId: string;
  projectId: string | null;
  figmaFileKey: string | null;
  storageBucket: string;
}) {
  const { supabaseAdmin, userId, projectId, figmaFileKey, storageBucket } = params;
  if (!userId) {
    return;
  }
  let query = supabaseAdmin
    .from('index_archives')
    .select('id, storage_paths')
    .eq('user_id', userId)
    .order('archived_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  } else {
    query = query.is('project_id', null);
  }
  if (figmaFileKey) {
    query = query.eq('figma_file_key', figmaFileKey);
  } else {
    query = query.is('figma_file_key', null);
  }

  const { data: archives, error } = await query;
  if (error || !Array.isArray(archives)) {
    if (error) {
      console.warn('⚠️ Archive retention query failed:', error.message);
    }
    return;
  }

  const normalizedArchives = archives as Array<{ id: string; storage_paths?: string[] | null }>;
  const excess = normalizedArchives.slice(2);
  for (const archive of excess) {
    console.log('🧹 Removing old archive', { archiveId: archive.id, userId, projectId, figmaFileKey });
    await removeArchivedStoragePaths({
      supabaseAdmin,
      storageBucket,
      paths: Array.isArray(archive.storage_paths) ? archive.storage_paths : [],
    });
    await supabaseAdmin.from('index_archives').delete().eq('id', archive.id);
  }
}

