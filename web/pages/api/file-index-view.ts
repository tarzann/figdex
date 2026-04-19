import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logIndexActivity } from '../../lib/index-activity-log';
import { getUserIdFromApiKey } from '../../lib/api-auth';
import { fetchFigmaFile } from '../../lib/figma-api';

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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenizeQuery = (query: string) =>
  query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const matchesLooseQuery = (values: unknown[], query: string) => {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return false;

  const haystack = values
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value: any) => String(value).toLowerCase())
    .join(' ');

  if (!haystack) return false;

  if (tokens.length === 1) {
    return haystack.includes(tokens[0]);
  }

  const regex = new RegExp(tokens.map(escapeRegExp).join('.*'), 'i');
  return regex.test(haystack);
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

const getPagesFromConnectionMeta = (raw: any): any[] => {
  const parsed = parseIndexPayload(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).pages)) return (parsed as any).pages;
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
  url: overrides.url || payload?.url || '',
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

const resolveFramePreview = (frameRow: any, payload: any) => {
  const existingThumb = typeof frameRow?.thumb_url === 'string' && frameRow.thumb_url
    ? frameRow.thumb_url
    : (typeof payload?.thumb_url === 'string' && payload.thumb_url ? payload.thumb_url : null);
  const existingImage = typeof frameRow?.image_url === 'string' && frameRow.image_url
    ? frameRow.image_url
    : (typeof payload?.image === 'string' && payload.image ? payload.image : null);

  if (existingThumb) {
    return { thumbUrl: existingThumb, listImage: existingThumb };
  }

  return {
    thumbUrl: null,
    listImage: existingImage,
  };
};

const filterLegacyFrames = (pages: any[], query: string) => {
  if (!query.trim()) return [];
  return dedupeFrames(
    pages.flatMap((page: any) => {
      if (!Array.isArray(page?.frames)) return [];
      return page.frames
        .map((frame: any) => normalizeFrame(frame, page))
        .filter((frame: any) => {
          return matchesLooseQuery([
            frame?.name,
            frame?.pageName,
            frame?.textContent,
            frame?.texts,
            ...(Array.isArray(frame?.searchTokens) ? frame.searchTokens : []),
            ...(Array.isArray(frame?.frameTags) ? frame.frameTags : []),
            ...(Array.isArray(frame?.customTags) ? frame.customTags : []),
          ], query);
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
  const pageIds = typeof req.query.pageIds === 'string'
    ? req.query.pageIds.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
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
        .select('id, user_id, file_name, total_frames')
        .eq('id', indexId)
        .maybeSingle();

      if (normalized) {
        normalizedFiles.push(normalized);
        continue;
      }

      const { data: legacy } = await svc
        .from('index_files')
        .select('id, user_id, file_name, index_data, frame_count')
        .eq('id', indexId)
        .maybeSingle();

      if (legacy) legacyFiles.push(legacy);
    }

    if (normalizedFiles.length === 0 && legacyFiles.length === 0) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    if (mode === 'summary') {
      const pagesMap = new Map<string, { id: string; name: string; frameCount: number; sortOrder: number; isIndexed: boolean }>();
      const fileKey = typeof req.query.fileKey === 'string' ? req.query.fileKey.trim() : '';
      const userId = fileKey ? await getUserIdFromApiKey(req) : null;
      let connectionPages: any[] = [];
      let savedConnectionId: string | null = null;
      let fetchedConnectionPagesFromFigma = false;

      if (fileKey && userId) {
        const { data: savedConnection } = await svc
          .from('saved_connections')
          .select('id, page_meta, figma_token')
          .eq('user_id', userId)
          .eq('file_key', fileKey)
          .maybeSingle();
        savedConnectionId = savedConnection?.id ? String(savedConnection.id) : null;

        connectionPages = getPagesFromConnectionMeta(savedConnection?.page_meta);
        if (connectionPages.length === 0 && typeof savedConnection?.figma_token === 'string' && savedConnection.figma_token.trim()) {
          try {
            const figmaFile = await fetchFigmaFile(fileKey, savedConnection.figma_token.trim(), true);
            connectionPages = (figmaFile?.document?.children || [])
              .filter((child: any) => child?.type === 'PAGE' || child?.type === 'CANVAS')
              .map((child: any, pageIndex: number) => ({
                id: child.id,
                pageId: child.id,
                name: child.name || `Page ${pageIndex + 1}`,
                pageName: child.name || `Page ${pageIndex + 1}`,
                sortOrder: pageIndex,
              }));
            fetchedConnectionPagesFromFigma = connectionPages.length > 0;
          } catch {
            connectionPages = [];
          }
        }

        connectionPages.forEach((page: any, pageIndex: number) => {
          const key = String(page?.id || page?.pageId || page?.name || `page-${pageIndex}`);
          if (!key) return;
          const pageSortOrder = typeof page?.sortOrder === 'number' ? page.sortOrder : pageIndex;
          pagesMap.set(key, {
            id: key,
            name: page?.name || page?.pageName || `Page ${pageIndex + 1}`,
            frameCount: 0,
            sortOrder: pageSortOrder,
            isIndexed: false,
          });
        });
      }

      for (const file of normalizedFiles) {
        const { data: pages } = await svc
          .from('indexed_pages')
          .select('figma_page_id, page_name, frame_count, sort_order')
          .eq('file_id', file.id)
          .order('sort_order', { ascending: true });
        (pages || []).forEach((page: any) => {
          const key = String(page.figma_page_id || page.page_name || '');
          if (!key) return;
          const pageSortOrder = typeof page.sort_order === 'number' ? page.sort_order : Number.MAX_SAFE_INTEGER;
          const existing = pagesMap.get(key);
          if (existing) {
            existing.frameCount += typeof page.frame_count === 'number' ? page.frame_count : 0;
            existing.isIndexed = true;
          } else {
            pagesMap.set(key, {
              id: String(page.figma_page_id),
              name: page.page_name || 'Untitled Page',
              frameCount: typeof page.frame_count === 'number' ? page.frame_count : 0,
              sortOrder: pageSortOrder,
              isIndexed: true,
            });
          }
        });
      }

      for (const file of legacyFiles) {
        const pages = getPagesFromIndexPayload(file.index_data);
        pages.forEach((page: any, pageIndex: number) => {
          const key = String(page?.pageId || page?.id || page?.name || `page-${pageIndex}`);
          const frameCount = Array.isArray(page?.frames) ? page.frames.length : 0;
          const pageSortOrder = pageIndex;
          const existing = pagesMap.get(key);
          if (existing) {
            existing.frameCount += frameCount;
            existing.isIndexed = true;
          } else {
            pagesMap.set(key, {
              id: key,
              name: page?.pageName || page?.name || `Page ${pageIndex + 1}`,
              frameCount,
              sortOrder: pageSortOrder,
              isIndexed: true,
            });
          }
        });
      }

      const sortedPages = Array.from(pagesMap.values()).sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      });

      if (fileKey && connectionPages.length > 0) {
        const sortOrderByPageId = new Map<string, number>();
        connectionPages.forEach((page: any, pageIndex: number) => {
          const pageIdValue = String(page?.id || page?.pageId || '').trim();
          if (!pageIdValue) return;
          const pageSortOrder = typeof page?.sortOrder === 'number' ? page.sortOrder : pageIndex;
          sortOrderByPageId.set(pageIdValue, pageSortOrder);
        });

        if (fetchedConnectionPagesFromFigma && savedConnectionId) {
          await svc
            .from('saved_connections')
            .update({ page_meta: connectionPages })
            .eq('id', savedConnectionId);
        }

        if (sortOrderByPageId.size > 0) {
          for (const file of normalizedFiles) {
            const { data: storedPages } = await svc
              .from('indexed_pages')
              .select('id, figma_page_id, sort_order')
              .eq('file_id', file.id);

            for (const page of storedPages || []) {
              const figmaPageId = String(page?.figma_page_id || '').trim();
              if (!figmaPageId || !sortOrderByPageId.has(figmaPageId)) continue;
              const desiredSortOrder = sortOrderByPageId.get(figmaPageId);
              if (typeof desiredSortOrder !== 'number' || page?.sort_order === desiredSortOrder) continue;
              await svc
                .from('indexed_pages')
                .update({ sort_order: desiredSortOrder })
                .eq('id', page.id);
            }
          }
        }
      }

      await logIndexActivity(svc, {
        requestId: `file_summary_${indexIds.join(',')}_${Date.now()}`,
        source: 'web',
        eventType: 'file_opened',
        status: 'completed',
        userId: normalizedFiles[0]?.user_id || legacyFiles[0]?.user_id || null,
        fileName: normalizedFiles[0]?.file_name || legacyFiles[0]?.file_name || 'Untitled',
        message: 'File summary loaded',
        metadata: {
          pageCount: pagesMap.size,
          fileCount: indexIds.length,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          pages: sortedPages,
        },
      });
    }

    if (mode === 'page') {
      const requestedPageIds = pageIds.length > 0 ? pageIds : (pageId ? [pageId] : []);
      if (requestedPageIds.length === 0) {
        return res.status(400).json({ success: false, error: 'pageId or pageIds is required' });
      }

      const frames: any[] = [];
      let totalFrames = 0;

      for (const file of normalizedFiles) {
        const { data: normalizedPages } = await svc
          .from('indexed_pages')
          .select('id, figma_page_id, page_name, sort_order')
          .eq('file_id', file.id)
          .in('figma_page_id', requestedPageIds)
          .order('sort_order', { ascending: true });

        if (!normalizedPages || normalizedPages.length === 0) continue;

        const normalizedPageIds = normalizedPages.map((page: any) => page.id);
        const pageNameByPageId = new Map<string, string>();
        const pageSortByPageId = new Map<string, number>();
        normalizedPages.forEach((page: any, pageIndex: number) => {
          const key = String(page.id);
          pageNameByPageId.set(key, page.page_name || 'Untitled Page');
          pageSortByPageId.set(key, typeof page.sort_order === 'number' ? page.sort_order : pageIndex);
        });

        const { count } = await svc
          .from('indexed_frames')
          .select('id', { count: 'exact', head: true })
          .in('page_id', normalizedPageIds);

        totalFrames += typeof count === 'number' ? count : 0;

        const { data: normalizedFrames } = await svc
          .from('indexed_frames')
          .select('page_id, figma_frame_id, frame_name, search_text, frame_tags, custom_tags, image_url, thumb_url, sort_order, frame_url:frame_payload->>url')
          .in('page_id', normalizedPageIds)
          .order('sort_order', { ascending: true });

        const orderedNormalizedFrames = (normalizedFrames || [])
          .slice()
          .sort((a: any, b: any) => {
            const pageSortA = pageSortByPageId.get(String(a.page_id)) ?? Number.MAX_SAFE_INTEGER;
            const pageSortB = pageSortByPageId.get(String(b.page_id)) ?? Number.MAX_SAFE_INTEGER;
            if (pageSortA !== pageSortB) return pageSortA - pageSortB;
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          })
          .slice(offset, offset + limit);

        for (const frame of orderedNormalizedFrames) {
          const payload: any = {};
          const pageKey = String(frame.page_id);
          const preview = resolveFramePreview(frame, payload);
          frames.push(buildClientFrame(payload, {
            id: frame.figma_frame_id,
            name: frame.frame_name,
            pageId: requestedPageIds.length === 1 ? requestedPageIds[0] : pageKey,
            pageName: pageNameByPageId.get(pageKey) || payload.pageName || '',
            texts: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.texts,
            textContent: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.textContent,
            frameTags: Array.isArray(frame.frame_tags) ? frame.frame_tags : [],
            customTags: Array.isArray(frame.custom_tags) ? frame.custom_tags : [],
            url: typeof (frame as any).frame_url === 'string' ? (frame as any).frame_url : '',
            image: preview.listImage,
            thumb_url: preview.thumbUrl,
          }));
        }
      }

      for (const file of legacyFiles) {
        const pages = getPagesFromIndexPayload(file.index_data);
        pages.forEach((page: any, pageIndex: number) => {
          const candidatePageId = String(page?.pageId || page?.id || page?.name || `page-${pageIndex}`);
          if (requestedPageIds.indexOf(candidatePageId) === -1 || !Array.isArray(page?.frames)) return;
          const normalizedPageFrames = page.frames.map((frame: any) => normalizeFrame(frame, page));
          totalFrames += normalizedPageFrames.length;
          normalizedPageFrames.forEach((frame: any) => frames.push(frame));
        });
      }

      const dedupedFrames = dedupeFrames(frames);
      const hasSingleNormalizedSource = normalizedFiles.length === 1 && legacyFiles.length === 0;
      const pageFrames = hasSingleNormalizedSource
        ? dedupedFrames
        : dedupedFrames.slice(offset, offset + limit);
      const safeTotalFrames = hasSingleNormalizedSource ? totalFrames : Math.max(totalFrames, dedupedFrames.length);

      await logIndexActivity(svc, {
        requestId: `file_page_${indexIds.join(',')}_${requestedPageIds.join('|')}_${Date.now()}`,
        source: 'web',
        eventType: 'file_page_viewed',
        status: 'completed',
        userId: normalizedFiles[0]?.user_id || legacyFiles[0]?.user_id || null,
        fileName: normalizedFiles[0]?.file_name || legacyFiles[0]?.file_name || 'Untitled',
        frameCount: safeTotalFrames,
        message: 'File page loaded',
        metadata: {
          pageId: requestedPageIds.join(','),
          offset,
          limit,
          returnedFrames: pageFrames.length,
        },
      });

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
      const queryTokens = tokenizeQuery(query);
      const searchSeed = queryTokens[0] || query.trim();

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

        const pattern = `%${searchSeed}%`;
        const { data: searchFrames } = await svc
          .from('indexed_frames')
          .select('page_id, figma_frame_id, frame_name, search_text, frame_tags, custom_tags, image_url, thumb_url, sort_order, frame_url:frame_payload->>url')
          .in('page_id', pageIds)
          .or(`frame_name.ilike.${pattern},search_text.ilike.${pattern}`)
          .order('sort_order', { ascending: true })
          .limit(1000);

        for (const frame of searchFrames || []) {
          const payload: any = {};
          if (!matchesLooseQuery([
            frame.frame_name,
            frame.search_text,
            ...(Array.isArray(frame.frame_tags) ? frame.frame_tags : []),
            ...(Array.isArray(frame.custom_tags) ? frame.custom_tags : []),
            seenPageNames.get(String(frame.page_id)) || '',
          ], query)) {
            continue;
          }
          const preview = resolveFramePreview(frame, payload);
          frames.push(buildClientFrame(payload, {
            id: frame.figma_frame_id,
            name: frame.frame_name,
            pageName: seenPageNames.get(String(frame.page_id)) || payload.pageName || '',
            texts: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.texts,
            textContent: typeof frame.search_text === 'string' && frame.search_text ? frame.search_text : payload.textContent,
            frameTags: Array.isArray(frame.frame_tags) ? frame.frame_tags : [],
            customTags: Array.isArray(frame.custom_tags) ? frame.custom_tags : [],
            url: typeof (frame as any).frame_url === 'string' ? (frame as any).frame_url : '',
            image: preview.listImage,
            thumb_url: preview.thumbUrl,
          }));
        }
      }

      for (const file of legacyFiles) {
        frames.push(...filterLegacyFrames(getPagesFromIndexPayload(file.index_data), query));
      }

      const dedupedFrames = dedupeFrames(frames);
      await logIndexActivity(svc, {
        requestId: `file_search_${indexIds.join(',')}_${Date.now()}`,
        source: 'web',
        eventType: 'file_search',
        status: 'completed',
        userId: normalizedFiles[0]?.user_id || legacyFiles[0]?.user_id || null,
        fileName: normalizedFiles[0]?.file_name || legacyFiles[0]?.file_name || 'Untitled',
        message: 'File search executed',
        metadata: {
          query,
          resultCount: dedupedFrames.length,
          fileCount: indexIds.length,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          frames: dedupedFrames,
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
