import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createThumbnailDataUrl, isDataImageUrl } from '../../lib/image-thumbnails';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

const dedupeFrames = (frames: any[]) => {
  const seen = new Set<string>();
  return frames.filter((frame: any, index: number) => {
    const key = String(frame?.url || frame?.id || frame?.figma_frame_id || `${frame?.name || 'frame'}::${index}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseIndexPayload = (raw: any) => {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getPagesFromIndexPayload = (raw: any): any[] => {
  const parsed = parseIndexPayload(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.pages)) return parsed.pages;
  return [];
};

const normalizeFrame = (frame: any, page: any) => ({
  ...frame,
  pageId: page?.pageId || page?.id || '',
  pageName: page?.pageName || page?.name || '',
  frameTags: Array.isArray(frame?.frameTags) ? frame.frameTags : (Array.isArray(frame?.tags) ? frame.tags : []),
  customTags: Array.isArray(frame?.customTags) ? frame.customTags : [],
});

const buildClientFrame = (payload: any, overrides: Record<string, any>) => ({
  id: overrides.id || payload?.id || '',
  name: overrides.name || payload?.name || 'Untitled Frame',
  url: payload?.url || '',
  pageId: overrides.pageId || payload?.pageId || '',
  pageName: overrides.pageName || payload?.pageName || '',
  width: typeof payload?.width === 'number' ? payload.width : null,
  height: typeof payload?.height === 'number' ? payload.height : null,
  texts: overrides.texts ?? payload?.texts ?? null,
  textContent: overrides.textContent ?? payload?.textContent ?? null,
  searchTokens: Array.isArray(payload?.searchTokens) ? payload.searchTokens : [],
  frameTags: Array.isArray(overrides.frameTags) ? overrides.frameTags : (Array.isArray(payload?.frameTags) ? payload.frameTags : []),
  customTags: Array.isArray(overrides.customTags) ? overrides.customTags : (Array.isArray(payload?.customTags) ? payload.customTags : []),
  image: overrides.image ?? payload?.image ?? null,
  thumb_url: overrides.thumb_url ?? payload?.thumb_url ?? null,
});

const resolveFramePreview = async (
  svc: any,
  frameRow: any,
  payload: any
) => {
  const existingThumb = typeof frameRow?.thumb_url === 'string' && frameRow.thumb_url
    ? frameRow.thumb_url
    : (typeof payload?.thumb_url === 'string' && payload.thumb_url ? payload.thumb_url : null);
  const sourceImage = typeof frameRow?.image_url === 'string' && frameRow.image_url
    ? frameRow.image_url
    : (typeof payload?.image === 'string' ? payload.image : null);

  if (existingThumb) {
    return { thumbUrl: existingThumb, listImage: existingThumb };
  }

  if (!isDataImageUrl(sourceImage)) {
    return { thumbUrl: null, listImage: sourceImage };
  }

  const generatedThumb = await createThumbnailDataUrl(sourceImage);
  if (generatedThumb && frameRow?.page_id && frameRow?.figma_frame_id) {
    void svc
      .from('indexed_frames')
      .update({ thumb_url: generatedThumb })
      .eq('page_id', frameRow.page_id)
      .eq('figma_frame_id', frameRow.figma_frame_id);
  }

  return {
    thumbUrl: generatedThumb,
    listImage: generatedThumb || null,
  };
};

const filterLegacyFrames = (pages: any[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return dedupeFrames(
    pages.flatMap((page: any) => {
      if (!Array.isArray(page?.frames)) return [];
      return page.frames
        .map((frame: any) => normalizeFrame(frame, page))
        .filter((frame: any) => {
          const haystacks = [
            frame?.name,
            frame?.pageName,
            frame?.textContent,
            frame?.texts,
            ...(Array.isArray(frame?.searchTokens) ? frame.searchTokens : []),
            ...(Array.isArray(frame?.frameTags) ? frame.frameTags : []),
            ...(Array.isArray(frame?.customTags) ? frame.customTags : []),
          ]
            .filter((value) => typeof value === 'string' && value.trim())
            .map((value: string) => value.toLowerCase());
          return haystacks.some((value: string) => value.includes(q));
        });
    })
  );
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ success: false, error: 'Supabase is not configured' });
  }

  const mode = typeof req.query.mode === 'string' ? req.query.mode : 'summary';
  const pageId = typeof req.query.pageId === 'string' ? req.query.pageId : '';
  const query = typeof req.query.q === 'string' ? req.query.q : '';
  const parsedOffset = Number.parseInt(typeof req.query.offset === 'string' ? req.query.offset : '0', 10);
  const parsedLimit = Number.parseInt(typeof req.query.limit === 'string' ? req.query.limit : '24', 10);
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 24;
  const rawIndexIds = typeof req.query.indexIds === 'string'
    ? req.query.indexIds
    : typeof req.query.indexId === 'string'
      ? req.query.indexId
      : '';

  const indexIds = rawIndexIds
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (indexIds.length === 0) {
    return res.status(400).json({ success: false, error: 'indexId or indexIds is required' });
  }

  const svc = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const normalizedFiles = [];
    const legacyFiles = [];

    for (const indexId of indexIds) {
      const { data: normalized } = await svc
        .from('indexed_files')
        .select('id, file_name, total_frames')
        .eq('id', indexId)
        .maybeSingle();

      if (normalized) {
        normalizedFiles.push(normalized);
        continue;
      }

      const { data: legacy } = await svc
        .from('index_files')
        .select('id, file_name, index_data, frame_count')
        .eq('id', indexId)
        .maybeSingle();

      if (legacy) legacyFiles.push(legacy);
    }

    if (normalizedFiles.length === 0 && legacyFiles.length === 0) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    if (mode === 'summary') {
      const pagesMap = new Map<string, { id: string; name: string; frameCount: number }>();

      for (const file of normalizedFiles) {
        const { data: pages } = await svc
          .from('indexed_pages')
          .select('figma_page_id, page_name, frame_count, sort_order')
          .eq('file_id', file.id)
          .order('sort_order', { ascending: true });
        (pages || []).forEach((page: any) => {
          const key = String(page.figma_page_id || page.page_name || '');
          if (!key) return;
          const existing = pagesMap.get(key);
          if (existing) {
            existing.frameCount += typeof page.frame_count === 'number' ? page.frame_count : 0;
          } else {
            pagesMap.set(key, {
              id: String(page.figma_page_id),
              name: page.page_name || 'Untitled Page',
              frameCount: typeof page.frame_count === 'number' ? page.frame_count : 0,
            });
          }
        });
      }

      for (const file of legacyFiles) {
        const pages = getPagesFromIndexPayload(file.index_data);
        pages.forEach((page: any, pageIndex: number) => {
          const key = String(page?.pageId || page?.id || page?.name || `page-${pageIndex}`);
          const frameCount = Array.isArray(page?.frames) ? page.frames.length : 0;
          const existing = pagesMap.get(key);
          if (existing) {
            existing.frameCount += frameCount;
          } else {
            pagesMap.set(key, {
              id: key,
              name: page?.pageName || page?.name || `Page ${pageIndex + 1}`,
              frameCount,
            });
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          pages: Array.from(pagesMap.values()),
        },
      });
    }

    if (mode === 'page') {
      if (!pageId) {
        return res.status(400).json({ success: false, error: 'pageId is required' });
      }

      const frames: any[] = [];
      let totalFrames = 0;

      for (const file of normalizedFiles) {
        const { data: normalizedPage } = await svc
          .from('indexed_pages')
          .select('id, figma_page_id, page_name')
          .eq('file_id', file.id)
          .eq('figma_page_id', pageId)
          .maybeSingle();

        if (!normalizedPage) continue;

        const { count } = await svc
          .from('indexed_frames')
          .select('id', { count: 'exact', head: true })
          .eq('page_id', normalizedPage.id);

        totalFrames += typeof count === 'number' ? count : 0;

        const { data: normalizedFrames } = await svc
          .from('indexed_frames')
          .select('figma_frame_id, frame_name, search_text, frame_tags, custom_tags, image_url, thumb_url, frame_payload, sort_order')
          .eq('page_id', normalizedPage.id)
          .range(offset, offset + limit - 1)
          .order('sort_order', { ascending: true });

        for (const frame of normalizedFrames || []) {
          const payload = frame.frame_payload && typeof frame.frame_payload === 'object' ? frame.frame_payload : {};
          const preview = await resolveFramePreview(svc, { ...frame, page_id: normalizedPage.id }, payload);
          frames.push(buildClientFrame(payload, {
            id: frame.figma_frame_id,
            name: frame.frame_name,
            pageId,
            pageName: normalizedPage.page_name,
            texts: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.texts,
            textContent: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.textContent,
            frameTags: Array.isArray(frame.frame_tags) ? frame.frame_tags : [],
            customTags: Array.isArray(frame.custom_tags) ? frame.custom_tags : [],
            image: preview.listImage,
            thumb_url: preview.thumbUrl,
          }));
        }
      }

      for (const file of legacyFiles) {
        const pages = getPagesFromIndexPayload(file.index_data);
        pages.forEach((page: any, pageIndex: number) => {
          const candidatePageId = String(page?.pageId || page?.id || page?.name || `page-${pageIndex}`);
          if (candidatePageId !== pageId || !Array.isArray(page?.frames)) return;
          const normalizedPageFrames = page.frames.map((frame: any) => normalizeFrame(frame, page));
          totalFrames += normalizedPageFrames.length;
          normalizedPageFrames
            .slice(offset, offset + limit)
            .forEach((frame: any) => frames.push(frame));
        });
      }

      const dedupedFrames = dedupeFrames(frames);
      const hasSingleNormalizedSource = normalizedFiles.length === 1 && legacyFiles.length === 0;
      const pageFrames = hasSingleNormalizedSource ? dedupedFrames : dedupedFrames.slice(0, limit);
      const safeTotalFrames = hasSingleNormalizedSource ? totalFrames : Math.max(totalFrames, dedupedFrames.length);

      return res.status(200).json({
        success: true,
        data: {
          frames: pageFrames,
          totalFrames: safeTotalFrames,
        },
      });
    }

    if (mode === 'search') {
      if (!query.trim()) {
        return res.status(200).json({ success: true, data: { frames: [] } });
      }

      const frames: any[] = [];
      const seenPageNames = new Map<string, string>();

      for (const file of normalizedFiles) {
        const { data: pages } = await svc
          .from('indexed_pages')
          .select('id, figma_page_id, page_name')
          .eq('file_id', file.id);

        const pageIds = (pages || []).map((page: any) => page.id);
        (pages || []).forEach((page: any) => {
          seenPageNames.set(String(page.id), page.page_name || 'Untitled Page');
        });

        if (pageIds.length === 0) continue;

        const pattern = `%${query.trim()}%`;
        const { data: searchFrames } = await svc
          .from('indexed_frames')
          .select('page_id, figma_frame_id, frame_name, search_text, frame_tags, custom_tags, image_url, thumb_url, frame_payload, sort_order')
          .in('page_id', pageIds)
          .or(`frame_name.ilike.${pattern},search_text.ilike.${pattern}`)
          .order('sort_order', { ascending: true })
          .limit(500);

        for (const frame of searchFrames || []) {
          const payload = frame.frame_payload && typeof frame.frame_payload === 'object' ? frame.frame_payload : {};
          const preview = await resolveFramePreview(svc, frame, payload);
          frames.push(buildClientFrame(payload, {
            id: frame.figma_frame_id,
            name: frame.frame_name,
            pageName: seenPageNames.get(String(frame.page_id)) || payload.pageName || '',
            texts: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.texts,
            textContent: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.textContent,
            frameTags: Array.isArray(frame.frame_tags) ? frame.frame_tags : [],
            customTags: Array.isArray(frame.custom_tags) ? frame.custom_tags : [],
            image: preview.listImage,
            thumb_url: preview.thumbUrl,
          }));
        }
      }

      for (const file of legacyFiles) {
        frames.push(...filterLegacyFrames(getPagesFromIndexPayload(file.index_data), query));
      }

      return res.status(200).json({
        success: true,
        data: {
          frames: dedupeFrames(frames),
        },
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid mode' });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    });
  }
}
