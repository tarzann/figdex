import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logIndexActivity } from '../../../../lib/index-activity-log';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const dedupeFrames = (frames: any[]) => {
  const seen = new Set<string>();
  return frames.filter((frame: any, index: number) => {
    const key = String(frame?.url || frame?.id || frame?.figma_frame_id || `${frame?.name || 'frame'}::${index}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const dedupePages = (pages: any[]) => {
  const merged = new Map<string, any>();
  pages.forEach((page: any, index: number) => {
    const key = String(page?.pageId || page?.id || page?.name || `page-${index}`);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...page,
        frames: dedupeFrames(Array.isArray(page?.frames) ? page.frames : []),
      });
      return;
    }
    existing.frames = dedupeFrames([...(existing.frames || []), ...(Array.isArray(page?.frames) ? page.frames : [])]);
  });
  return Array.from(merged.values());
};

// Parse image URL to extract bucket and path
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

// Normalize frame images - resolve storage refs to signed URLs (like get-index-data.ts)
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

    const { data: normalizedIndex, error: normalizedError } = await supabase
      .from('indexed_files')
      .select('id, user_id, file_name, last_indexed_at, share_token, project_id, figma_file_key, cover_image_url, total_frames')
      .eq('share_token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (!normalizedError && normalizedIndex) {
      const { data: normalizedPages, error: normalizedPagesError } = await supabase
        .from('indexed_pages')
        .select('id, figma_page_id, page_name, sort_order')
        .eq('file_id', normalizedIndex.id)
        .order('sort_order', { ascending: true });

      if (normalizedPagesError) {
        return res.status(500).json({ success: false, error: normalizedPagesError.message });
      }

      const pageIds = (normalizedPages || []).map((page: any) => page.id);
      let framesByPageId = new Map<string, any[]>();

      if (pageIds.length > 0) {
        const { data: normalizedFrames, error: normalizedFramesError } = await supabase
          .from('indexed_frames')
          .select('page_id, figma_frame_id, frame_name, search_text, frame_tags, custom_tags, image_url, thumb_url, frame_payload, sort_order')
          .in('page_id', pageIds)
          .order('sort_order', { ascending: true });

        if (normalizedFramesError) {
          return res.status(500).json({ success: false, error: normalizedFramesError.message });
        }

        framesByPageId = (normalizedFrames || []).reduce((map: Map<string, any[]>, frame: any) => {
          const payload = frame.frame_payload && typeof frame.frame_payload === 'object' ? frame.frame_payload : {};
          const hydrated = {
            ...payload,
            id: frame.figma_frame_id,
            name: frame.frame_name,
            texts: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.texts,
            textContent: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.textContent,
            frameTags: Array.isArray(frame.frame_tags) ? frame.frame_tags : [],
            customTags: Array.isArray(frame.custom_tags) ? frame.custom_tags : [],
          } as any;
          if (frame.image_url) hydrated.image = frame.image_url;
          if (frame.thumb_url) hydrated.thumb_url = frame.thumb_url;
          if (!map.has(frame.page_id)) map.set(frame.page_id, []);
          map.get(frame.page_id)!.push(hydrated);
          return map;
        }, new Map<string, any[]>());
      }

      const processedIndexData = {
        coverImageUrl: normalizedIndex.cover_image_url || null,
        pages: dedupePages((normalizedPages || []).map((page: any) => ({
          id: page.figma_page_id,
          pageId: page.figma_page_id,
          name: page.page_name,
          pageName: page.page_name,
          frames: framesByPageId.get(page.id) || [],
        }))),
      };

      if (processedIndexData.coverImageUrl || processedIndexData.pages.some((page: any) => page.frames.length > 0)) {
        if (Array.isArray(processedIndexData.pages)) {
          for (const page of processedIndexData.pages) {
            if (Array.isArray(page?.frames)) {
              await normalizeFrameImagesBatch(page.frames, supabase);
            }
          }
        }

        await logIndexActivity(supabase, {
          requestId: token,
          source: 'web',
          eventType: 'share_opened',
          status: 'completed',
          userId: normalizedIndex.user_id || null,
          fileName: normalizedIndex.file_name || null,
          message: 'Public index opened',
          metadata: {
            token,
            shareType: 'public_index',
            normalized: true,
          },
        });

        return res.status(200).json({
          success: true,
          data: {
            id: normalizedIndex.id,
            file_name: normalizedIndex.file_name,
            index_data: processedIndexData,
            uploaded_at: normalizedIndex.last_indexed_at,
            share_token: normalizedIndex.share_token,
            project_id: normalizedIndex.project_id,
            figma_file_key: normalizedIndex.figma_file_key,
            frame_count: normalizedIndex.total_frames,
            coverImageUrl: processedIndexData.coverImageUrl,
          }
        });
      }
    }

    // Get public index by share token from the legacy model
    const { data: indexData, error } = await supabase
      .from('index_files')
      .select('id, file_name, index_data, uploaded_at, share_token, project_id, figma_file_key')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (error || !indexData) {
      await logIndexActivity(supabase, {
        requestId: token,
        source: 'web',
        eventType: 'share_access_denied',
        status: 'failed',
        message: 'Public index token not found',
        metadata: {
          token,
          reason: 'not_found',
          shareType: 'public_index',
        },
      });
      return res.status(404).json({
        success: false,
        error: 'Index not found or not public'
      });
    }

    // Process index_data - handle storage pointers, JSON strings, and chunked files
    let processedIndexData = indexData.index_data;

    // Check if this is a chunked file (has project_id and figma_file_key)
    if (indexData.project_id && indexData.figma_file_key) {
      // Get all chunks for this project
      const { data: chunks, error: chunksError } = await supabase
        .from('index_files')
        .select('id, index_data, uploaded_at')
        .eq('project_id', indexData.project_id)
        .eq('figma_file_key', indexData.figma_file_key)
        .eq('is_public', true)
        .order('uploaded_at', { ascending: true });

      if (!chunksError && Array.isArray(chunks) && chunks.length > 0) {
        // Merge all chunks
        const mergedData: any[] = [];
        for (const chunk of chunks) {
          let chunkData = chunk.index_data;
          
          // Handle storage pointer
          if (chunkData && typeof chunkData === 'object' && chunkData.storageRef) {
            try {
              const [bucket, ...pathParts] = String(chunkData.storageRef).split(':');
              const path = pathParts.join(':');
              const dl = await (supabase as any).storage.from(bucket).download(path);
              if (!dl?.error) {
                const txt = await dl.data.text();
                chunkData = JSON.parse(txt || '[]');
              }
            } catch (e) {
              console.error('Error loading chunk from storage:', e);
              continue;
            }
          }
          
          // Handle JSON string
          if (typeof chunkData === 'string') {
            try {
              chunkData = JSON.parse(chunkData);
            } catch (e) {
              console.error('Error parsing chunk JSON:', e);
              continue;
            }
          }
          
          if (Array.isArray(chunkData)) {
            mergedData.push(...chunkData);
          }
        }
        processedIndexData = dedupePages(mergedData);
      }
    } else {
      // Single file - handle storage pointer or JSON string
      if (processedIndexData && typeof processedIndexData === 'object' && processedIndexData.storageRef) {
        try {
          const [bucket, ...pathParts] = String(processedIndexData.storageRef).split(':');
          const path = pathParts.join(':');
          const dl = await (supabase as any).storage.from(bucket).download(path);
          if (!dl?.error) {
            const txt = await dl.data.text();
            processedIndexData = JSON.parse(txt || '[]');
          }
        } catch (e) {
          console.error('Error loading index_data from storage:', e);
          return res.status(500).json({
            success: false,
            error: 'Failed to load index data from storage'
          });
        }
      } else if (typeof processedIndexData === 'string') {
        try {
          processedIndexData = JSON.parse(processedIndexData);
        } catch (e) {
          console.error('Error parsing index_data JSON:', e);
          return res.status(500).json({
            success: false,
            error: 'Failed to parse index data'
          });
        }
      }
    }

    // Normalize image URLs in frames (resolve storage refs to public URLs)
    const pageCollection = Array.isArray(processedIndexData)
      ? dedupePages(processedIndexData)
      : (processedIndexData && typeof processedIndexData === 'object' && Array.isArray((processedIndexData as any).pages)
          ? dedupePages((processedIndexData as any).pages)
          : []);

    if (Array.isArray(pageCollection)) {
      for (const page of pageCollection) {
        if (Array.isArray(page?.frames)) {
          await normalizeFrameImagesBatch(page.frames, supabase);
        }
      }
    }

    if (Array.isArray(processedIndexData)) {
      processedIndexData = pageCollection;
    } else if (processedIndexData && typeof processedIndexData === 'object' && Array.isArray((processedIndexData as any).pages)) {
      (processedIndexData as any).pages = pageCollection;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...indexData,
        index_data: processedIndexData
      }
    });

  } catch (error) {
    console.error('Public index API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
