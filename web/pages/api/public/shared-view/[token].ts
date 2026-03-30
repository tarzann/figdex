import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logIndexActivity } from '../../../../lib/index-activity-log';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const getLogicalFileKey = (file: any) => {
  const figmaFileKey = typeof file?.figma_file_key === 'string' ? file.figma_file_key.trim() : '';
  const projectId = typeof file?.project_id === 'string' ? file.project_id.trim() : '';
  return figmaFileKey || (projectId && projectId !== '0:0' ? projectId : '') || String(file?.id || '');
};

// Helper function to normalize frame images (copied from public/index/[token].ts)
const normalizeFrameImagesBatch = async (
  framesArr: any[],
  svc: SupabaseClient<any>
): Promise<void> => {
  if (!Array.isArray(framesArr) || framesArr.length === 0) return;
  
  const fullByBucket = new Map<string, string[]>();
  const thumbByBucket = new Map<string, string[]>();
  const keySet = new Set<string>();
  const add = (map: Map<string, string[]>, bucket: string, path: string) => {
    const key = `${bucket}:${path}`;
    if (keySet.has(key)) return;
    keySet.add(key);
    if (!map.has(bucket)) map.set(bucket, []);
    map.get(bucket)!.push(path);
  };
  const defaultBucket = process.env.STORAGE_BUCKET || 'figdex-uploads';
  const candidates: Array<{ frame: any; bucket: string; path: string }> = [];
  
  for (const frame of framesArr) {
    // Try storageRef object
    if (frame && frame.image && typeof frame.image === 'object' && frame.image.storageRef) {
      const [bkt, ...p2] = String(frame.image.storageRef).split(':');
      const pth = p2.join(':');
      if (bkt && pth) {
        candidates.push({ frame, bucket: bkt, path: pth });
        add(fullByBucket, bkt, pth);
        add(thumbByBucket, bkt, pth);
        continue;
      }
    }
    // Try storage_path
    if (frame && typeof frame.storage_path === 'string' && frame.storage_path.length > 0) {
      const raw = String(frame.storage_path);
      let bkt = defaultBucket;
      let pth = raw;
      if (raw.includes(':')) {
        const [b, ...rest] = raw.split(':');
        bkt = b || defaultBucket;
        pth = rest.join(':');
      }
      if (bkt && pth) {
        candidates.push({ frame, bucket: bkt, path: pth });
        add(fullByBucket, bkt, pth);
        add(thumbByBucket, bkt, pth);
        continue;
      }
    }
    // Try image_url parse
    if (frame && typeof frame.image_url === 'string' && frame.image_url.length > 0) {
      const parsed = parseImageUrl(frame.image_url);
      if (parsed) {
        candidates.push({ frame, bucket: parsed.bucket, path: parsed.path });
        add(fullByBucket, parsed.bucket, parsed.path);
        add(thumbByBucket, parsed.bucket, parsed.path);
      } else {
        frame.image = frame.image_url;
      }
    }
  }
  
  // Batch sign per bucket
  const fullMap = new Map<string, string>();
  const thumbMap = new Map<string, string>();
  for (const [bucket, paths] of fullByBucket.entries()) {
    try {
      const result = await (svc as any).storage.from(bucket).createSignedUrls(paths, 60 * 60 * 6);
      if (result?.data && Array.isArray(result.data)) {
        for (let i = 0; i < result.data.length; i++) {
          const signed = result.data[i]?.signedUrl;
          const p = paths[i];
          if (signed && p) fullMap.set(`${bucket}:${p}`, signed);
        }
      }
    } catch {}
  }
  for (const [bucket, paths] of thumbByBucket.entries()) {
    try {
      const result = await (svc as any).storage.from(bucket).createSignedUrls(paths, 60 * 60 * 6, {
        transform: {
          width: 320,
          quality: 70,
          resize: 'contain',
          format: 'webp'
        }
      });
      if (result?.data && Array.isArray(result.data)) {
        for (let i = 0; i < result.data.length; i++) {
          const signed = result.data[i]?.signedUrl;
          const p = paths[i];
          if (signed && p) thumbMap.set(`${bucket}:${p}`, signed);
        }
      }
    } catch {}
  }
  
  // Populate frames
  for (const { frame, bucket, path } of candidates) {
    const key = `${bucket}:${path}`;
    const full = fullMap.get(key);
    const thumb = thumbMap.get(key);
    if (full) frame.image = full;
    if (thumb) (frame as any).thumb_url = thumb;
  }
};

const parseImageUrl = (imageUrl: string): { bucket: string; path: string } | null => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    const supaBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    if (!supaBase) return null;
    const base = new URL(supaBase).host;
    const host = new URL(imageUrl).host;
    if (host !== base) return null;
    const pathname = new URL(imageUrl).pathname;
    const parts = pathname.split('/').filter(Boolean);
    const idxObject = parts.findIndex(p => p === 'object');
    if (idxObject === -1 || idxObject + 1 >= parts.length) return null;
    let next = parts[idxObject + 1];
    let bucket = '';
    let pathParts: string[] = [];
    if (next === 'public' || next === 'download' || next === 'sign') {
      if (idxObject + 2 >= parts.length) return null;
      bucket = parts[idxObject + 2];
      pathParts = parts.slice(idxObject + 3);
    } else {
      bucket = next;
      pathParts = parts.slice(idxObject + 2);
    }
    const objectPath = pathParts.join('/');
    if (!bucket || !objectPath) return null;
    return { bucket, path: objectPath };
  } catch {
    return null;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Share token is required'
      });
    }

    // Get shared view by token
    const { data: sharedView, error: viewError } = await supabase
      .from('shared_views')
      .select('id, user_id, share_type, enabled, search_params')
      .eq('share_token', token)
      .single();

    if (viewError || !sharedView) {
      await logIndexActivity(supabase, {
        requestId: typeof token === 'string' ? token : null,
        source: 'web',
        eventType: 'share_access_denied',
        status: 'failed',
        message: 'Shared view token not found',
        metadata: {
          token,
          reason: 'not_found',
          shareType: 'shared_view',
        },
      });
      return res.status(404).json({
        success: false,
        error: 'Share link not found'
      });
    }

    // Check if enabled
    if (!sharedView.enabled) {
      await logIndexActivity(supabase, {
        requestId: typeof token === 'string' ? token : null,
        source: 'web',
        eventType: 'share_access_denied',
        status: 'failed',
        userId: sharedView.user_id || null,
        message: 'Shared view disabled',
        metadata: {
          token,
          reason: 'disabled',
          shareType: sharedView.share_type,
        },
      });
      return res.status(404).json({
        success: false,
        error: 'Share link not found'
      });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', sharedView.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await logIndexActivity(supabase, {
      requestId: typeof token === 'string' ? token : null,
      source: 'web',
      eventType: 'share_opened',
      status: 'completed',
      userId: sharedView.user_id || null,
      userEmail: user.email || null,
      message: 'Shared view opened',
      metadata: {
        token,
        shareType: sharedView.share_type,
      },
    });

    // Load indices based on share type
    if (sharedView.share_type === 'all_indices') {
      const { data: normalizedIndices, error: normalizedError } = await supabase
        .from('indexed_files')
        .select('id, file_name, last_indexed_at, figma_file_key, project_id, total_frames')
        .eq('user_id', sharedView.user_id)
        .eq('is_public', true)
        .order('last_indexed_at', { ascending: false });

      if (normalizedError) {
        console.error('Error fetching normalized shared indices:', normalizedError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch shared indices'
        });
      }

      const normalizedList = Array.isArray(normalizedIndices) ? normalizedIndices : [];
      const normalizedLogicalKeys = new Set<string>(
        normalizedList.map((item: any) => getLogicalFileKey(item)).filter(Boolean)
      );

      let legacyList: any[] = [];
      if (normalizedList.length === 0) {
        const { data: legacyIndices, error: legacyError } = await supabase
          .from('index_files')
          .select('id, file_name, uploaded_at, figma_file_key, project_id')
          .eq('user_id', sharedView.user_id)
          .eq('is_public', true)
          .order('uploaded_at', { ascending: false });

        if (legacyError) {
          console.error('Error fetching legacy shared indices:', legacyError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch shared indices'
          });
        }

        legacyList = Array.isArray(legacyIndices)
          ? legacyIndices.filter((item: any) => !normalizedLogicalKeys.has(getLogicalFileKey(item)))
          : [];
      }

      const indices = [
        ...normalizedList.map((item: any) => ({
          id: item.id,
          file_name: item.file_name,
          uploaded_at: item.last_indexed_at,
          frame_count: item.total_frames,
          figma_file_key: item.figma_file_key,
          project_id: item.project_id,
        })),
        ...legacyList.map((item: any) => ({
          id: item.id,
          file_name: item.file_name,
          uploaded_at: item.uploaded_at,
          figma_file_key: item.figma_file_key,
          project_id: item.project_id,
        })),
      ];

      return res.status(200).json({
        success: true,
        shareType: 'all_indices',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
        indices
      });

    } else if (sharedView.share_type === 'search_results') {
      // For search_results, we'll return the search params and let the client fetch the results
      // This is because we need to apply the search filters on the client side
      return res.status(200).json({
        success: true,
        shareType: 'search_results',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
        searchParams: sharedView.search_params || {}
      });

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid share type'
      });
    }

  } catch (error) {
    console.error('Shared view API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
