import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getPlanLimits, formatBytes } from '../../lib/plans';
import { archiveExistingIndex } from '../../lib/index-archive';

// Version tracking - Update this number for each fix/change
const API_VERSION = 'v1.30.24'; // Cover image signing; omit frame_count column (missing in prod)

// Lighter body limit: manifest only (no base64 images)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

/**
 * POST /api/upload-index-v2
 * Auth: Bearer figdex_* API key
 * Body: {
 *   documentId: string,
 *   fileKey: string,
 *   fileName: string,
 *   pages: Array<{ id, name, frames: Array<{ id, name, width, height, image_url?: string, storage_path?: string, tags?: string[] }> }>,
 *   uploadedAt?: string,
 *   frameTags?: string[],
 *   customTags?: string[]
 * }
 * Stores a lightweight index where images are referenced by storage URLs/paths
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`🚀 [upload-index-v2] Handler called, method: ${req.method}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log(`✅ [upload-index-v2] OPTIONS request, returning 200`);
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    console.log(`❌ [upload-index-v2] Invalid method: ${req.method}`);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  console.log(`📥 [upload-index-v2] POST request received`);
  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Supabase URL or Service Key missing'
      });
    }
    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Auth via API key
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }
    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    // Resolve user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, plan, is_admin')
      .eq('api_key', apiKey)
      .single();
    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    const { documentId, fileKey, fileName, pages, uploadedAt, frameTags, customTags, coverImageUrl } = req.body || {};
    
    console.log(`📥 [upload-index-v2] Request body parsed:`, {
      hasDocumentId: !!documentId,
      hasFileKey: !!fileKey,
      hasFileName: !!fileName,
      hasPages: !!pages,
      pagesCount: Array.isArray(pages) ? pages.length : 0,
      firstPageFramesCount: Array.isArray(pages) && pages[0] ? (pages[0].frames?.length || 0) : 0
    });
    
    console.log(`📸 [upload-index-v2] Received coverImageUrl:`, coverImageUrl ? `${coverImageUrl.substring(0, 80)}...` : 'null/undefined');
    if (coverImageUrl) {
      console.log(`📸 [upload-index-v2] Full coverImageUrl:`, coverImageUrl);
      const isStoragePath = coverImageUrl.includes(':') && !coverImageUrl.startsWith('http');
      console.log(`📸 [upload-index-v2] Is storage path format:`, isStoragePath);
    }

    if (!documentId || typeof documentId !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid documentId' });
    }
    if (!fileKey || typeof fileKey !== 'string' || fileKey.trim().toLowerCase() === 'unknown') {
      return res.status(400).json({ success: false, error: 'Invalid fileKey' });
    }
    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid pages array' });
    }

    let finalFileName = (typeof fileName === 'string' && fileName.trim().length > 0) ? fileName : null;
    if (!finalFileName) {
      const timestamp = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '');
      finalFileName = `Figma_Index_${timestamp}_${timeStr}`;
    }

    const planLimits = getPlanLimits(user.plan, user.is_admin);

    // Debug: Log incoming data structure
    console.log(`📥 [upload-index-v2] Received request:`, {
      pagesCount: pages.length,
      firstPageFramesCount: pages[0]?.frames?.length || 0,
      firstFrameName: pages[0]?.frames?.[0]?.name || 'N/A',
      firstFrameHasTextContent: !!(pages[0]?.frames?.[0]?.textContent),
      firstFrameTextContentLength: pages[0]?.frames?.[0]?.textContent?.length || 0,
      firstFrameTextContentPreview: pages[0]?.frames?.[0]?.textContent?.substring(0, 100) || 'N/A'
    });

    // Ensure frames do not include base64 images (drop them if present)
    // But preserve textContent, searchTokens, image_url, storage_path, and other important fields
    const sanitizedPages = pages.map((p: any) => ({
      ...p,
      frames: Array.isArray(p.frames) ? p.frames.map((f: any) => {
        const { image, thumbnails, ...rest } = f || {};
        // Explicitly preserve important fields
        const preservedFrame: any = {
          ...rest,
          // Preserve image_url (from storage upload) - this is critical for displaying images
          image_url: f?.image_url || rest?.image_url || null,
          // Preserve storage_path if available
          storage_path: f?.storage_path || rest?.storage_path || null,
          // Ensure textContent is preserved (for search)
          textContent: f?.textContent || rest?.textContent || null,
          // Ensure searchTokens is preserved (for search)
          searchTokens: f?.searchTokens || rest?.searchTokens || null,
          // Preserve other text fields
          texts: f?.texts || rest?.texts || null,
          visibleTexts: f?.visibleTexts || rest?.visibleTexts || null,
        };
        return preservedFrame;
      }) : []
    }));

    // Debug: Log ALL frames to verify textContent and searchTokens are preserved
    console.log(`📝 [upload-index-v2] Processing ${sanitizedPages.length} pages with ${sanitizedPages.reduce((sum, p) => sum + (Array.isArray(p.frames) ? p.frames.length : 0), 0)} total frames`);
    for (let pageIdx = 0; pageIdx < sanitizedPages.length; pageIdx++) {
      const page = sanitizedPages[pageIdx];
      if (!Array.isArray(page.frames)) continue;
      for (let frameIdx = 0; frameIdx < page.frames.length; frameIdx++) {
        const frame = page.frames[frameIdx];
        console.log(`📝 [upload-index-v2] Frame ${pageIdx}:${frameIdx} "${frame?.name}":`, {
          hasTextContent: !!(frame?.textContent),
          textContentLength: frame?.textContent ? frame.textContent.length : 0,
          textContentFull: frame?.textContent || 'MISSING',
          textContentPreview: frame?.textContent ? frame.textContent.substring(0, 200) : null,
          hasSearchTokens: Array.isArray(frame?.searchTokens),
          searchTokensCount: Array.isArray(frame?.searchTokens) ? frame.searchTokens.length : 0,
          searchTokensFull: Array.isArray(frame?.searchTokens) ? frame.searchTokens : 'MISSING',
          searchTokensPreview: Array.isArray(frame?.searchTokens) ? frame.searchTokens.slice(0, 20) : null
        });
      }
    }
    
    const newFrameCount = countFramesFromPages(sanitizedPages);

    // Lightweight size (bytes)
    const fileSizeBytes = Buffer.byteLength(JSON.stringify(sanitizedPages), 'utf8');

    // Attempt to categorize tags if not provided explicitly
    const allFrameTags = new Set<string>(Array.isArray(frameTags) ? frameTags : []);
    const allCustomTags = new Set<string>(Array.isArray(customTags) ? customTags : []);

    // Helper: parse Supabase storage URL into bucket/path
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

    // Upsert behavior: if an index exists for (user_id, figma_file_key), replace it
    // This prevents duplicates when the same file is indexed via plugin and API token
    // Try to select with file_size first, fallback to without if column doesn't exist
    let existingIndex: any = null;
    let existingErr: any = null;
    
    // First attempt: try with file_size
    const { data: existingWithSize, error: errWithSize } = await supabaseAdmin
      .from('index_files')
      .select(
        'id, user_id, project_id, figma_file_key, file_name, index_data, frame_tags, custom_tags, naming_tags, size_tags, file_size, uploaded_at'
      )
      .eq('user_id', user.id)
      .eq('figma_file_key', fileKey)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errWithSize && /file_size/i.test(errWithSize.message || '')) {
      // If file_size column doesn't exist, try without it
      const { data: existingWithoutSize, error: errWithoutSize } = await supabaseAdmin
        .from('index_files')
        .select(
          'id, user_id, project_id, figma_file_key, file_name, index_data, frame_tags, custom_tags, naming_tags, size_tags, uploaded_at'
        )
        .eq('user_id', user.id)
        .eq('figma_file_key', fileKey)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      existingIndex = existingWithoutSize;
      existingErr = errWithoutSize;
    } else {
      existingIndex = existingWithSize;
      existingErr = errWithSize;
    }

    if (existingErr) {
      return res.status(500).json({
        success: false,
        error: 'Failed to check existing index',
        details: existingErr.message
      });
    }

    const now = new Date();
    const startOfDayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Fetch usage rows - need index_data only if frame limits are enforced
    // For now, fetch it but limit the query to avoid timeout (max 100 rows)
    const { data: usageRows, error: usageErr } = await supabaseAdmin
      .from('index_files')
      .select('id, project_id, figma_file_key, index_data, uploaded_at')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(100); // Limit to recent 100 to avoid timeout

    if (usageErr) {
      return res.status(500).json({
        success: false,
        error: 'Failed to evaluate plan usage',
        details: usageErr.message
      });
    }

    const usageStats = computeUsageStats(
      Array.isArray(usageRows) ? usageRows : [],
      existingIndex?.id || null,
      startOfDayUtc
    );

    // Plan enforcement
    const limitError = (code: string, message: string) => res.status(403).json({
      success: false,
      error: message,
      code,
      plan: planLimits.id
    });

    const projectCountAfter = usageStats.projectIds.has(documentId)
      ? usageStats.projectIds.size
      : usageStats.projectIds.size + 1;

    if (planLimits.maxProjects !== null && projectCountAfter > planLimits.maxProjects) {
      return limitError(
        'PLAN_MAX_PROJECTS',
        `Your ${planLimits.label} plan supports up to ${planLimits.maxProjects} project${planLimits.maxProjects === 1 ? '' : 's'}.`
      );
    }

    const framesAfter = usageStats.totalFramesExcludingCurrent + newFrameCount;
    if (planLimits.maxFramesTotal !== null && framesAfter > planLimits.maxFramesTotal) {
      return limitError(
        'PLAN_MAX_FRAMES',
        `Your ${planLimits.label} plan supports up to ${planLimits.maxFramesTotal.toLocaleString()} frames.`
      );
    }

    const uploadsTodayAfter = usageStats.uploadsTodayExcludingCurrent + 1;
    if (planLimits.maxUploadsPerDay !== null && uploadsTodayAfter > planLimits.maxUploadsPerDay) {
      return limitError(
        'PLAN_MAX_UPLOADS_PER_DAY',
        `Daily upload limit reached for the ${planLimits.label} plan (${planLimits.maxUploadsPerDay} per day).`
      );
    }

    // Monthly upload limit check (prevents cost overruns)
    const uploadsThisMonthAfter = usageStats.uploadsThisMonthExcludingCurrent + 1;
    if (planLimits.maxUploadsPerMonth !== null && uploadsThisMonthAfter > planLimits.maxUploadsPerMonth) {
      return limitError(
        'PLAN_MAX_UPLOADS_PER_MONTH',
        `Monthly upload limit reached for the ${planLimits.label} plan (${planLimits.maxUploadsPerMonth} per month). Please upgrade your plan or wait until next month.`
      );
    }

    // Monthly frames limit check (prevents cost overruns)
    const framesThisMonthAfter = usageStats.framesThisMonthExcludingCurrent + newFrameCount;
    if (planLimits.maxFramesPerMonth !== null && framesThisMonthAfter > planLimits.maxFramesPerMonth) {
      return limitError(
        'PLAN_MAX_FRAMES_PER_MONTH',
        `Monthly frames limit reached for the ${planLimits.label} plan (${planLimits.maxFramesPerMonth.toLocaleString()} frames per month). Please upgrade your plan or wait until next month.`
      );
    }

    if (planLimits.maxIndexSizeBytes !== null && fileSizeBytes > planLimits.maxIndexSizeBytes) {
      return limitError(
        'PLAN_MAX_INDEX_SIZE',
        `Index exceeds the ${planLimits.label} plan limit of ${formatBytes(planLimits.maxIndexSizeBytes)}.`
      );
    }

    const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
    if (existingIndex && existingIndex.id) {
      console.log('🗂️ upload-index-v2 archiving existing index', {
        indexId: existingIndex.id,
        oldProjectId: existingIndex.project_id,
        newProjectId: documentId,
        figmaFileKey: existingIndex.figma_file_key,
        userId: existingIndex.user_id,
        note: 'Detected duplicate index for same file_key + user_id (may be from plugin or API token)',
      });
      await archiveExistingIndex({
        supabaseAdmin,
        existingIndex,
        storageBucket,
      });
    }

    // If coverImageUrl is provided, wrap pages in an object with coverImageUrl
    const hasValidCoverImage = coverImageUrl && typeof coverImageUrl === 'string' && coverImageUrl.trim().length > 0;
    const indexDataToStore = hasValidCoverImage
      ? { coverImageUrl, pages: sanitizedPages }
      : sanitizedPages;
    
    if (hasValidCoverImage) {
      console.log(`📸 [upload-index-v2] Storing coverImageUrl in index_data: ${coverImageUrl.substring(0, 60)}...`);
      console.log(`📸 [upload-index-v2] indexDataToStore type:`, typeof indexDataToStore, Array.isArray(indexDataToStore) ? 'array' : (indexDataToStore && typeof indexDataToStore === 'object' ? 'object' : 'other'));
      if (indexDataToStore && typeof indexDataToStore === 'object' && !Array.isArray(indexDataToStore)) {
        console.log(`📸 [upload-index-v2] indexDataToStore keys:`, Object.keys(indexDataToStore));
        console.log(`📸 [upload-index-v2] indexDataToStore.coverImageUrl:`, (indexDataToStore as any).coverImageUrl ? `${(indexDataToStore as any).coverImageUrl.substring(0, 60)}...` : 'null');
      }
    } else {
      console.log(`⚠️ [upload-index-v2] No coverImageUrl provided or invalid. coverImageUrl value:`, coverImageUrl);
    }
    
    // Note: frame_count column not available in prod schema; omit to avoid 500
    const commonData: any = {
      user_id: user.id,
      project_id: documentId,
      figma_file_key: fileKey,
      file_name: finalFileName,
      index_data: indexDataToStore,
      uploaded_at: uploadedAt || new Date().toISOString(),
      file_size: fileSizeBytes
    };
    if (allFrameTags.size > 0) commonData.frame_tags = Array.from(allFrameTags);
    if (allCustomTags.size > 0) commonData.custom_tags = Array.from(allCustomTags);

    let data: any = null;
    if (existingIndex && existingIndex.id) {
      // Replace existing index row
      let updateResult = await supabaseAdmin
        .from('index_files')
        .update(commonData)
        .eq('id', existingIndex.id)
        .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at')
        .single();
      if (updateResult.error && /file_size/i.test(updateResult.error.message || '')) {
        const { file_size, ...withoutSize } = commonData;
        updateResult = await supabaseAdmin
          .from('index_files')
          .update(withoutSize)
          .eq('id', existingIndex.id)
          .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at')
          .single();
      }
      if (updateResult.error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to replace existing index',
          details: updateResult.error.message
        });
      }
      data = updateResult.data;
      // Remove any other historical indices for the same file_key + user_id (regardless of project_id)
      // This ensures only one active index exists per file per user
      await supabaseAdmin
        .from('index_files')
        .delete()
        .eq('user_id', user.id)
        .eq('figma_file_key', fileKey)
        .neq('id', existingIndex.id);
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('index_files')
        .insert(commonData)
        .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at')
        .single();

      if (insertError) {
        // Retry without optional columns in case of schema drift
        const basic: any = {
          user_id: user.id,
          project_id: documentId,
          figma_file_key: fileKey,
          file_name: finalFileName,
          index_data: sanitizedPages,
          uploaded_at: uploadedAt || new Date().toISOString()
        };
        if (!/file_size/i.test(insertError.message || '')) {
          basic.file_size = fileSizeBytes;
        }
        basic.frame_count = newFrameCount;
        const { data: retryData, error: retryErr } = await supabaseAdmin
          .from('index_files')
          .insert(basic)
          .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at')
          .single();
        if (retryErr) {
          return res.status(500).json({
            success: false,
            error: 'Failed to save index manifest',
            details: retryErr.message
          });
        }
        data = retryData;
        
        // Debug: Log saved data to verify textContent and searchTokens are stored
        console.log(`✅ [upload-index-v2] Created index ${data.id}, verifying saved data...`);
        const { data: savedDataInsert } = await supabaseAdmin
          .from('index_files')
          .select('index_data')
          .eq('id', data.id)
          .single();
        if (savedDataInsert && savedDataInsert.index_data) {
          const indexData = typeof savedDataInsert.index_data === 'string' ? JSON.parse(savedDataInsert.index_data) : savedDataInsert.index_data;
          const pages = Array.isArray(indexData) ? indexData : (indexData.pages || []);
          if (pages.length > 0 && pages[0]?.frames?.length > 0) {
            const firstFrame = pages[0].frames[0];
            console.log(`✅ [upload-index-v2] Verified saved frame "${firstFrame?.name}":`, {
              hasTextContent: !!(firstFrame?.textContent),
              textContentLength: firstFrame?.textContent?.length || 0,
              textContentPreview: firstFrame?.textContent?.substring(0, 200) || 'MISSING',
              hasSearchTokens: Array.isArray(firstFrame?.searchTokens),
              searchTokensCount: firstFrame?.searchTokens?.length || 0
            });
          }
        }
      } else {
        data = inserted;
        
        // Debug: Log saved data to verify textContent and searchTokens are stored
        console.log(`✅ [upload-index-v2] Created index ${data.id}, verifying saved data...`);
        const { data: savedDataInsert2 } = await supabaseAdmin
          .from('index_files')
          .select('index_data')
          .eq('id', data.id)
          .single();
        if (savedDataInsert2 && savedDataInsert2.index_data) {
          const indexData = typeof savedDataInsert2.index_data === 'string' ? JSON.parse(savedDataInsert2.index_data) : savedDataInsert2.index_data;
          const pages = Array.isArray(indexData) ? indexData : (indexData.pages || []);
          if (pages.length > 0 && pages[0]?.frames?.length > 0) {
            const firstFrame = pages[0].frames[0];
            console.log(`✅ [upload-index-v2] Verified saved frame "${firstFrame?.name}":`, {
              hasTextContent: !!(firstFrame?.textContent),
              textContentLength: firstFrame?.textContent?.length || 0,
              textContentPreview: firstFrame?.textContent?.substring(0, 200) || 'MISSING',
              hasSearchTokens: Array.isArray(firstFrame?.searchTokens),
              searchTokensCount: firstFrame?.searchTokens?.length || 0
            });
          }
        }
      }
    }

    // Build set of storage paths belonging to the NEW manifest, to keep
    const keepPaths = new Set<string>();
    try {
      for (const p of sanitizedPages) {
        if (!p || !Array.isArray(p.frames)) continue;
        for (const f of p.frames) {
          if (!f) continue;
          if (typeof f.storage_path === 'string' && f.storage_path.length > 0) {
            const raw = String(f.storage_path);
            if (raw.includes(':')) {
              const [b, ...rest] = raw.split(':');
              if (b === storageBucket) {
                keepPaths.add(rest.join(':'));
              }
            } else {
              keepPaths.add(raw);
            }
          } else if (typeof f.image_url === 'string' && f.image_url.length > 0) {
            const parsed = parseImageUrl(f.image_url);
            if (parsed && parsed.bucket === storageBucket) {
              keepPaths.add(parsed.path);
            }
          }
        }
      }
    } catch {}

    // Best-effort cleanup for this project: delete any objects under userId/projectId not in keepPaths
    try {
      const today = new Date();
      const yyyy = String(today.getUTCFullYear());
      const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(today.getUTCDate()).padStart(2, '0');
      const userPrefix = `${user.id}/${documentId}`;
      // Helper to list a path
      const list = async (p: string) => {
        const { data: entries } = await (supabaseAdmin as any).storage.from(storageBucket).list(p, { limit: 1000 });
        return entries || [];
      };
      // Collect all files under this project
      const toRemove: string[] = [];
      const years = await list(userPrefix);
      for (const y of years) {
        const months = await list(`${userPrefix}/${y.name}`);
        for (const m of months) {
          const days = await list(`${userPrefix}/${y.name}/${m.name}`);
          for (const d of days) {
            const files = await list(`${userPrefix}/${y.name}/${m.name}/${d.name}`);
            for (const f of files) {
              const fullPath = `${userPrefix}/${y.name}/${m.name}/${d.name}/${f.name}`;
              // Keep if in keepPaths; we compare by suffix (path after bucket prefix)
              const suffix = `${y.name}/${m.name}/${d.name}/${f.name}`;
              if (!keepPaths.has(`${user.id}/${documentId}/${suffix}`) && !keepPaths.has(suffix)) {
                toRemove.push(fullPath);
              }
            }
          }
        }
      }
      // Remove in chunks
      if (toRemove.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < toRemove.length; i += CHUNK) {
          const batch = toRemove.slice(i, i + CHUNK);
          await (supabaseAdmin as any).storage.from(storageBucket).remove(batch);
        }
      }
    } catch (e) {
      // ignore cleanup failures
    }

    // Save cover image URL to saved_connections if provided
    if (coverImageUrl && typeof coverImageUrl === 'string' && coverImageUrl.trim().length > 0) {
      try {
        // Check if connection exists
        const { data: existingConnection } = await supabaseAdmin
          .from('saved_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('file_key', fileKey)
          .maybeSingle();
        
        if (existingConnection) {
          // Update existing connection
          await supabaseAdmin
            .from('saved_connections')
            .update({ file_thumbnail_url: coverImageUrl })
            .eq('id', existingConnection.id)
            .eq('user_id', user.id);
          console.log(`✅ [upload-index-v2] Updated cover image for saved_connection ${existingConnection.id}: ${coverImageUrl.substring(0, 60)}...`);
        } else {
          // Create new connection with cover image
          await supabaseAdmin
            .from('saved_connections')
            .insert({
              user_id: user.id,
              file_key: fileKey,
              file_name: finalFileName,
              file_thumbnail_url: coverImageUrl,
              pages: [],
              image_quality: 'med'
            });
          console.log(`✅ [upload-index-v2] Created saved_connection with cover image for file ${fileKey}: ${coverImageUrl.substring(0, 60)}...`);
        }
      } catch (coverError: any) {
        // Don't fail the upload if cover save fails
        console.warn('⚠️ Failed to save cover image to saved_connections:', coverError.message);
      }
    }

    if (planLimits.retentionDays !== null) {
      const retentionCutoff = new Date(Date.now() - planLimits.retentionDays * 24 * 60 * 60 * 1000);
      try {
        await supabaseAdmin
          .from('index_files')
          .delete()
          .eq('user_id', user.id)
          .lt('uploaded_at', retentionCutoff.toISOString());
      } catch (cleanupErr) {
        console.warn('Retention cleanup failed:', cleanupErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Index manifest uploaded successfully',
      projectId: data.project_id,
      indexId: data.id,
      userId: data.user_id,
      fileName: data.file_name,
      fileSize: fileSizeBytes
    });
  } catch (error: any) {
    console.error(`❌ [upload-index-v2] Error in handler:`, {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message
    });
  }
}

function countFramesFromIndexData(indexData: any): number {
  if (!Array.isArray(indexData)) return 0;
  let count = 0;
  for (const page of indexData) {
    if (page && Array.isArray(page.frames)) {
      count += page.frames.length;
    }
  }
  return count;
}

function countFramesFromPages(pages: any[]): number {
  if (!Array.isArray(pages)) return 0;
  let total = 0;
  for (const page of pages) {
    if (page && Array.isArray(page.frames)) {
      total += page.frames.length;
    }
  }
  return total;
}

function computeUsageStats(
  rows: Array<{ id: string; project_id: string | null; figma_file_key: string | null; index_data: any; uploaded_at: string | null }>,
  currentIndexId: string | null,
  startOfDayUtc: Date
) {
  const projectIds = new Set<string>();
  let totalFramesExcludingCurrent = 0;
  let uploadsTodayExcludingCurrent = 0;
  let uploadsThisMonthExcludingCurrent = 0;
  let framesThisMonthExcludingCurrent = 0;

  // Calculate start of current month (UTC)
  const now = new Date();
  const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (const row of rows) {
    if (!row) continue;
    const projectId = typeof row.project_id === 'string' ? row.project_id.trim() : '';
    const fileKey = typeof row.figma_file_key === 'string' ? row.figma_file_key.trim() : '';
    const stableProjectId = projectId && projectId !== '0:0' ? projectId : '';
    const logicalFileId = fileKey || stableProjectId || '';
    if (logicalFileId) {
      projectIds.add(logicalFileId);
    }
    // Only count frames if index_data exists (avoid errors)
    const frameCount = row.index_data ? countFramesFromIndexData(row.index_data) : 0;
    const uploadedAtDate = row.uploaded_at ? new Date(row.uploaded_at) : null;
    if (currentIndexId && row.id === currentIndexId) {
      continue;
    }
    totalFramesExcludingCurrent += frameCount;
    if (uploadedAtDate && uploadedAtDate >= startOfDayUtc) {
      uploadsTodayExcludingCurrent += 1;
    }
    // Monthly stats
    if (uploadedAtDate && uploadedAtDate >= startOfMonthUtc) {
      uploadsThisMonthExcludingCurrent += 1;
      framesThisMonthExcludingCurrent += frameCount;
    }
  }

  return {
    projectIds,
    totalFramesExcludingCurrent,
    uploadsTodayExcludingCurrent,
    uploadsThisMonthExcludingCurrent,
    framesThisMonthExcludingCurrent
  };
}


