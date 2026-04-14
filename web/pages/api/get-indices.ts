import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { logIndexActivity } from '../../lib/index-activity-log';

const QUERY_TIMEOUT_MS = 3000;

const withTimeout = async <T,>(promise: PromiseLike<T>, fallback: T): Promise<T> => {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), QUERY_TIMEOUT_MS)),
    ]);
  } catch {
    return fallback;
  }
};

const signStorageLikeUrl = async (svc: any, value: string | null | undefined): Promise<string | null> => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (!trimmed.includes(':')) return trimmed;

  const firstColon = trimmed.indexOf(':');
  const bucket = trimmed.slice(0, firstColon).trim();
  const objectPath = trimmed.slice(firstColon + 1).trim();
  if (!bucket || !objectPath) return null;

  try {
    const { data, error } = await svc.storage.from(bucket).createSignedUrl(objectPath, 60 * 60 * 6);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
};

const getStableLogicalFileId = (file: any): string => {
  const fileKey = typeof file?.figma_file_key === 'string' ? file.figma_file_key.trim() : '';
  const projectId = typeof file?.project_id === 'string' ? file.project_id.trim() : '';
  return fileKey || (projectId && projectId !== '0:0' ? projectId : '') || String(file?.id || '');
};

const mergeIndexLists = (preferred: any[], fallback: any[]) => {
  const merged = new Map<string, any>();

  fallback.forEach((item: any) => {
    merged.set(getStableLogicalFileId(item), { ...item, legacy_index_id: item.id || null });
  });

  preferred.forEach((item: any) => {
    const key = getStableLogicalFileId(item);
    const existing = merged.get(key);
    merged.set(key, {
      ...(existing || {}),
      ...item,
      id: existing?.id || item.id,
      normalized_index_id: item.id || existing?.normalized_index_id || null,
      legacy_index_id: existing?.legacy_index_id || null,
      file_thumbnail_url: item.file_thumbnail_url || existing?.file_thumbnail_url || null,
      frame_count: typeof item.frame_count === 'number' ? item.frame_count : (existing?.frame_count ?? null),
      file_size: typeof item.file_size === 'number' ? item.file_size : (existing?.file_size ?? 0),
      uploaded_at: item.uploaded_at || existing?.uploaded_at || null,
    });
  });

  return Array.from(merged.values()).sort(
    (a: any, b: any) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['GET']
    });
  }

  try {
    // Use service role to avoid RLS issues
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    const svc = serviceUrl && serviceKey ? createClient(serviceUrl, serviceKey) : supabase;
    const { userEmail, anonId: queryAnonId } = req.query;
    const anonId = typeof queryAnonId === 'string' ? queryAnonId.trim().slice(0, 200) : '';

    // Guest path: fetch by owner_anon_id (user_id IS NULL)
    if (anonId) {
      const normalizedGuestResult = await withTimeout(
        svc
          .from('indexed_files')
          .select('id, user_id, project_id, figma_file_key, file_name, last_indexed_at, total_frames, cover_image_url')
          .is('user_id', null)
          .eq('owner_anon_id', anonId)
          .order('last_indexed_at', { ascending: false })
          .limit(500),
        { data: null, error: { message: 'Normalized guest query timed out' } } as any
      );

      const normalizedGuestIndices = normalizedGuestResult?.data;
      const normalizedGuestError = normalizedGuestResult?.error;

      const normalizedGuestList = !normalizedGuestError && Array.isArray(normalizedGuestIndices)
        ? await Promise.all(normalizedGuestIndices.map(async (idx: any) => ({
            id: idx.id,
            user_id: null,
            project_id: idx.project_id,
            figma_file_key: idx.figma_file_key,
            file_name: idx.file_name,
            uploaded_at: idx.last_indexed_at,
            file_size: 0,
            frame_count: typeof idx.total_frames === 'number' ? idx.total_frames : 0,
            source: 'plugin',
            file_thumbnail_url: await signStorageLikeUrl(svc, idx.cover_image_url) || idx.cover_image_url || null,
          })))
        : [];

      let legacyGuestList: any[] = [];
      if (normalizedGuestList.length === 0) {
        const selectWithMeta = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at, file_size, frame_count';
        const selectBasic = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at';
        let guestQuery = svc
          .from('index_files')
          .select(selectWithMeta)
          .is('user_id', null)
          .eq('owner_anon_id', anonId)
          .order('uploaded_at', { ascending: false })
          .limit(500);
        let { data: guestIndices, error: guestErr }: { data: any[] | null; error: any } = await guestQuery;
        if (guestErr && /(file_size|frame_count)/i.test(guestErr.message || '')) {
          const fallbackGuest = await svc
            .from('index_files')
            .select(selectBasic)
            .is('user_id', null)
            .eq('owner_anon_id', anonId)
            .order('uploaded_at', { ascending: false })
            .limit(500);
          guestIndices = fallbackGuest.data;
          guestErr = fallbackGuest.error;
        }
        if (guestErr) {
          return res.status(500).json({ success: false, error: guestErr.message });
        }
        legacyGuestList = (guestIndices || []).map((idx: any) => ({
          ...idx,
          source: 'plugin',
          frame_count: typeof idx.frame_count === 'number' ? idx.frame_count : null,
          file_size: typeof idx.file_size === 'number' ? idx.file_size : 0,
        }));
      }
      const guestData = mergeIndexLists(normalizedGuestList, legacyGuestList);
      await logIndexActivity(svc, {
        requestId: `gallery_guest_${anonId}_${Date.now()}`,
        source: 'web',
        eventType: 'gallery_loaded',
        status: 'completed',
        ownerAnonId: anonId,
        message: 'Guest gallery loaded',
        metadata: {
          resultCount: guestData.length,
          mode: normalizedGuestList.length > 0 ? 'normalized' : 'legacy',
          userType: 'guest',
        },
      });

      return res.status(200).json({
        success: true,
        data: guestData,
        user: null,
        isGuest: true,
        plan: 'guest',
      });
    }

    const userEmailStr = typeof userEmail === 'string' ? userEmail : '';
    if (!userEmailStr) {
      return res.status(400).json({ success: false, error: 'userEmail or anonId is required' });
    }

    // Find user by email first
    console.log(`🔍 Looking for user with email: ${userEmailStr}`);
    const { data: user, error: userError } = await svc
      .from('users')
      .select('id, email, full_name, api_key')
      .eq('email', userEmailStr)
      .single();

    if (userError) {
      console.error('❌ Error finding user:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      });
      if (userError.code !== 'PGRST116') {
        return res.status(500).json({ success: false, error: 'Error finding user', details: userError.message });
      }
      // User not found
      console.log('⚠️ User not found in database');
      return res.status(200).json({
        success: true,
        data: [],
        user: null,
        warning: 'User not found in database'
      });
    }

    if (!user) {
      console.log('⚠️ User query returned null');
      return res.status(200).json({
        success: true,
        data: [],
        user: null,
        warning: 'User not found in database'
      });
    }

    console.log(`✅ User found: ${user.email} (id: ${user.id}, type: ${typeof user.id})`);

    const normalizedResult = await withTimeout(
      svc
        .from('indexed_files')
        .select('id, user_id, project_id, figma_file_key, file_name, last_indexed_at, total_frames, cover_image_url')
        .eq('user_id', user.id)
        .order('last_indexed_at', { ascending: false })
        .limit(500),
      { data: null, error: { message: 'Normalized user query timed out' } } as any
    );

    const normalizedIndices = normalizedResult?.data;
    const normalizedIndicesError = normalizedResult?.error;
    const normalizedTimedOut = Boolean(
      normalizedIndicesError && /timed out|timeout/i.test(String(normalizedIndicesError.message || normalizedIndicesError))
    );

    const normalizedList = !normalizedIndicesError && Array.isArray(normalizedIndices)
      ? await Promise.all(normalizedIndices.map(async (idx: any) => ({
          id: idx.id,
          user_id: idx.user_id,
          project_id: idx.project_id,
          figma_file_key: idx.figma_file_key,
          file_name: idx.file_name,
          uploaded_at: idx.last_indexed_at,
          file_size: 0,
          frame_count: typeof idx.total_frames === 'number' ? idx.total_frames : 0,
          source: 'Plugin',
          file_thumbnail_url: await signStorageLikeUrl(svc, idx.cover_image_url) || idx.cover_image_url || null,
        })))
      : [];

    let indices: any[] = [];
    let indicesQueryError: string | null = null;
    if (normalizedList.length === 0) {
      // Get indices by user_id with size limit
      // Important: DO NOT fetch heavy JSON (index_data) here – it causes timeouts.
      // The gallery fetches full data per index via /api/get-index-data when needed.
      console.log(`🔍 Fetching legacy indices for user_id: ${user.id} (type: ${typeof user.id})`);
      const selectWithMeta = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at, file_size, frame_count';
      const selectBasic = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at';

      let legacyResult = await withTimeout(
        svc
          .from('index_files')
          .select(selectWithMeta)
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false })
          .limit(500),
        { data: null, error: { message: 'Legacy indices query timed out' } } as any
      );
      let indicesByUserId = legacyResult.data as any[] | null;
      let indicesByUserIdError = legacyResult.error as any;

      if (indicesByUserIdError && /(file_size|frame_count)/i.test(indicesByUserIdError.message || '')) {
        const fallbackIndices = await withTimeout(
          svc
            .from('index_files')
            .select(selectBasic)
            .eq('user_id', user.id)
            .order('uploaded_at', { ascending: false })
            .limit(500),
          { data: null, error: { message: 'Legacy fallback query timed out' } } as any
        );
        indicesByUserId = fallbackIndices.data;
        indicesByUserIdError = fallbackIndices.error;
      }

      if (indicesByUserIdError) {
        console.error('❌ Error fetching indices by user_id:', {
          error: indicesByUserIdError,
          user_id: user.id,
          user_id_type: typeof user.id,
          user_email: user.email
        });
        indicesQueryError = indicesByUserIdError.message || 'Unknown indices query error';
        indices = [];
      }
      indices = indicesByUserId || [];
    }

    // Check which indices were created via API (have index_jobs entry)
    const apiIndexIds = new Set<string>();
    if (!normalizedTimedOut) {
      const indexIds = indices.map((idx: any) => idx.id).filter(Boolean);
      if (indexIds.length > 0) {
        try {
          const jobsResult = await withTimeout(
            svc
              .from('index_jobs')
              .select('index_file_id')
              .in('index_file_id', indexIds)
              .not('index_file_id', 'is', null),
            { data: null, error: { message: 'index_jobs query timed out' } } as any
          );
          
          if (!jobsResult.error && Array.isArray(jobsResult.data)) {
            jobsResult.data.forEach((job: any) => {
              if (job.index_file_id) {
                apiIndexIds.add(job.index_file_id);
              }
            });
            console.log(`📊 Found ${apiIndexIds.size} indices created via API out of ${indexIds.length} total`);
          }
        } catch (e) {
          console.warn('⚠️ Could not check index_jobs for source detection:', e);
        }
      }
    }

    // Fetch file_thumbnail_url from saved_connections for each index
    const fileKeyToThumbnail = new Map<string, string | null>();
    if (!normalizedTimedOut && indices.length > 0 && user.id) {
      try {
        const fileKeys = indices.map((idx: any) => idx.figma_file_key).filter(Boolean);
        if (fileKeys.length > 0) {
          const connectionsResult = await withTimeout(
            svc
              .from('saved_connections')
              .select('file_key, file_thumbnail_url')
              .eq('user_id', user.id)
              .in('file_key', fileKeys),
            { data: null, error: { message: 'saved_connections query timed out' } } as any
          );
          const connections = connectionsResult.data;
          const connectionsError = connectionsResult.error;
          
          if (!connectionsError && Array.isArray(connections)) {
            connections.forEach((conn: any) => {
              if (conn.file_key && conn.file_thumbnail_url) {
                fileKeyToThumbnail.set(conn.file_key, conn.file_thumbnail_url);
              }
            });
            console.log(`📸 Found ${fileKeyToThumbnail.size} file thumbnails from saved_connections`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch file thumbnails from saved_connections:', e);
      }
    }

    // Final normalized list with computed fields when available
    const legacyList = indices.map((idx: any) => ({
      id: idx.id,
      user_id: idx.user_id,
      project_id: idx.project_id,
      figma_file_key: idx.figma_file_key,
      file_name: idx.file_name,
      uploaded_at: idx.uploaded_at,
      file_size: typeof idx.file_size === 'number' ? idx.file_size : 0,
      frame_count: typeof idx.frame_count === 'number' ? idx.frame_count : null,
      source: apiIndexIds.has(idx.id) ? 'API' : 'Plugin', // Indicate if created via API or Plugin
      file_thumbnail_url: fileKeyToThumbnail.get(idx.figma_file_key) || null
    }));
    indices = mergeIndexLists(normalizedList, legacyList);

    // Debug logging
    console.log(`📊 Found ${indices.length} total indices for user ${user.email} (${user.id})`);
    if (indices.length > 0) {
    console.log(`📋 Sample indices:`, indices.slice(0, 3).map((idx: any) => ({
      id: idx.id,
      user_id: idx.user_id,
      user_id_type: typeof idx.user_id,
      file_name: idx.file_name,
      figma_file_key: idx.figma_file_key,
      project_id: idx.project_id,
      uploaded_at: idx.uploaded_at,
      file_size: idx.file_size || 'not set',
      frame_count: idx.frame_count
    })));
    }

    // If no indices found, check if there are indices with null user_id that might belong to this user
    if (!normalizedTimedOut && indices.length === 0) {
      console.log('⚠️ No indices found by user_id, checking for null user_id indices...');
      const { data: nullUserIdIndices, error: nullUserIdError } = await svc
        .from('index_files')
        .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at')
        .is('user_id', null)
        .order('uploaded_at', { ascending: false })
        .limit(50);

      if (nullUserIdError) {
        console.error('❌ Error checking for null user_id indices:', nullUserIdError);
      } else if (nullUserIdIndices && nullUserIdIndices.length > 0) {
        console.log(`⚠️ Found ${nullUserIdIndices.length} indices with null user_id`);
        // Return empty but with hint
        return res.status(200).json({
          success: true,
          data: [],
          user: user,
          warning: `Found ${nullUserIdIndices.length} indices with no user assignment. Use "Fix My Indices" to assign them.`
        });
      } else {
        console.log('ℹ️ No indices found in database (neither with user_id nor with null user_id)');
      }
    }

    // Do NOT filter out chunk parts here. The frontend groups parts into a single file.
    // Returning all entries ensures users still see their uploads even before merging completes.
    // If needed, grouping/merging UI logic will consolidate parts by base name and file key.

    // No error handling needed here since we're handling errors above

    // If indices query failed earlier, return success with a warning instead of 500
    if (indicesQueryError) {
      return res.status(200).json({
        success: true,
        data: indices || [],
        user: user || null,
        warning: `Could not fetch indices by user_id: ${indicesQueryError}`
      });
    }

    void logIndexActivity(svc, {
      requestId: `gallery_${user.id}_${Date.now()}`,
      source: 'web',
      eventType: 'gallery_loaded',
      status: 'completed',
      userId: user.id,
      userEmail: user.email || null,
      message: 'User gallery loaded',
      metadata: {
        resultCount: (indices || []).length,
        mode: normalizedList.length > 0 ? 'normalized' : 'legacy',
        warning: indicesQueryError || null,
      },
    }).catch(() => {});

    res.status(200).json({ success: true, data: indices || [], user: user || null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
