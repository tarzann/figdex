import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const getLogicalFileKey = (file: any) => {
  const figmaFileKey = typeof file?.figma_file_key === 'string' ? file.figma_file_key.trim() : '';
  const projectId = typeof file?.project_id === 'string' ? file.project_id.trim() : '';
  return figmaFileKey || (projectId && projectId !== '0:0' ? projectId : '') || String(file?.id || '');
};

const getFrameKey = (frame: any, fallbackPrefix = '') => (
  String(frame?.url || frame?.id || frame?.figma_frame_id || `${fallbackPrefix}${frame?.name || 'frame'}`)
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing slug' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const extractFrames = (data: any): any[] => {
    let parsed = data;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return [];
      }
    }
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item: any) => Array.isArray(item?.frames) ? item.frames : []);
    }
    if (parsed?.data?.pages) {
      return parsed.data.pages.flatMap((p: any) => Array.isArray(p?.frames) ? p.frames : []);
    }
    if (parsed?.data?.frames) {
      return Array.isArray(parsed.data.frames) ? parsed.data.frames : [];
    }
    if (parsed?.pages) {
      return parsed.pages.flatMap((p: any) => Array.isArray(p?.frames) ? p.frames : []);
    }
    return [];
  };

  try {
    // Find user by slug and ensure public enabled
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, public_enabled, public_slug, full_name, email')
      .ilike('public_slug', slug)
      .single();
    if (userErr || !user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.public_enabled) return res.status(403).json({ success: false, error: 'Public profile disabled' });

    const frames: any[] = [];
    const frameKeys = new Set<string>();
    const indexSummaries: any[] = [];
    const logicalFiles = new Set<string>();

    const appendFrames = (items: any[], fileName: string, uploadedAt: string, fallbackPrefix: string) => {
      items.forEach((frame: any) => {
        const key = getFrameKey(frame, fallbackPrefix);
        if (frameKeys.has(key)) return;
        frameKeys.add(key);
        frames.push({
          ...frame,
          originFile: fileName,
          uploadedAt,
        });
      });
    };

    const { data: normalizedIndices, error: normalizedErr } = await supabase
      .from('indexed_files')
      .select('id, file_name, last_indexed_at, project_id, figma_file_key')
      .eq('user_id', user.id)
      .eq('is_public', true)
      .order('last_indexed_at', { ascending: false });
    if (normalizedErr) return res.status(500).json({ success: false, error: normalizedErr.message });

    if (Array.isArray(normalizedIndices) && normalizedIndices.length > 0) {
      const fileIds = normalizedIndices.map((idx: any) => idx.id);
      const { data: pages, error: pagesErr } = await supabase
        .from('indexed_pages')
        .select('id, file_id, figma_page_id, page_name, sort_order')
        .in('file_id', fileIds)
        .order('sort_order', { ascending: true });
      if (pagesErr) return res.status(500).json({ success: false, error: pagesErr.message });

      const pageIds = (pages || []).map((page: any) => page.id);
      const { data: normalizedFrames, error: framesErr } = pageIds.length > 0
        ? await supabase
            .from('indexed_frames')
            .select('page_id, figma_frame_id, frame_name, search_text, frame_tags, custom_tags, image_url, thumb_url, frame_payload, sort_order')
            .in('page_id', pageIds)
            .order('sort_order', { ascending: true })
        : { data: [], error: null };
      if (framesErr) return res.status(500).json({ success: false, error: framesErr.message });

      const pagesByFileId = new Map<string, any[]>();
      (pages || []).forEach((page: any) => {
        if (!pagesByFileId.has(page.file_id)) pagesByFileId.set(page.file_id, []);
        pagesByFileId.get(page.file_id)!.push(page);
      });

      const framesByPageId = new Map<string, any[]>();
      (normalizedFrames || []).forEach((frame: any) => {
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
        if (!framesByPageId.has(frame.page_id)) framesByPageId.set(frame.page_id, []);
        framesByPageId.get(frame.page_id)!.push(hydrated);
      });

      normalizedIndices.forEach((idx: any) => {
        const logicalKey = getLogicalFileKey(idx);
        logicalFiles.add(logicalKey);
        indexSummaries.push({
          id: idx.id,
          file_name: idx.file_name,
          uploaded_at: idx.last_indexed_at
        });
        const pagesForIndex = pagesByFileId.get(idx.id) || [];
        pagesForIndex.forEach((page: any, pageIndex: number) => {
          appendFrames(
            framesByPageId.get(page.id) || [],
            idx.file_name,
            idx.last_indexed_at,
            `${logicalKey}:${page.figma_page_id || pageIndex}:`
          );
        });
      });
    }

    // Fallback for files not migrated to the normalized model yet
    const { data: legacyIndices, error: idxErr } = await supabase
      .from('index_files')
      .select('id, file_name, index_data, uploaded_at, is_public, project_id, figma_file_key')
      .eq('user_id', user.id)
      .eq('is_public', true)
      .order('uploaded_at', { ascending: false });
    if (idxErr) return res.status(500).json({ success: false, error: idxErr.message });

    (legacyIndices || []).forEach((idx: any) => {
      const logicalKey = getLogicalFileKey(idx);
      if (logicalFiles.has(logicalKey)) return;
      logicalFiles.add(logicalKey);
      indexSummaries.push({
        id: idx.id,
        file_name: idx.file_name,
        uploaded_at: idx.uploaded_at
      });
      appendFrames(extractFrames(idx.index_data), idx.file_name, idx.uploaded_at, `${logicalKey}:legacy:`);
    });

    return res.status(200).json({
      success: true,
      user: { full_name: user.full_name, email: user.email, slug: user.public_slug },
      frames,
      indices: indexSummaries
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
}
