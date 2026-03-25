import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resolvePlanId, getPlanLimits, getPlanLimitsFromDb } from '../../lib/plans';
import { getUserEffectiveLimits, canCreateIndex, incrementDailyIndexCount, getCurrentFileCount, getCurrentTotalFrames, getGuestIndexFileCount, getGuestTotalFrames, getGuestDistinctFileCount } from '../../lib/subscription-helpers';
import {
  fetchFigmaFile,
  collectFrameNodes,
  processFrameData,
  groupFramesIntoPages,
  validateFigmaToken,
  extractFileKeyFromUrl,
  type FrameData,
  type FigmaNode,
} from '../../lib/figma-api';

// Increase body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

const ALLOWED_FRAME_PARENTS = new Set(['PAGE', 'CANVAS', 'SECTION']);

function normalizePageName(name?: string): string {
  const trimmed = (name || '').trim();
  return trimmed.length > 0 ? trimmed : 'Untitled Page';
}

function isReservedPageName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return lower === 'cover' || lower === 'figdex';
}

function normalizeLogicalFileName(name?: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Untitled';
  return trimmed.replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim() || 'Untitled';
}

function getLogicalFileId(projectId: unknown, fileKey: unknown): string {
  const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : '';
  const normalizedFileKey = typeof fileKey === 'string' ? fileKey.trim() : '';
  const stableProjectId = normalizedProjectId && normalizedProjectId !== '0:0' ? normalizedProjectId : '';
  return normalizedFileKey || stableProjectId || '';
}

/** Upload cover image from data URL to storage. Returns bucket:path or null. */
async function uploadCoverFromDataUrl(
  supabaseAdmin: any,
  coverDataUrl: string,
  objectPath: string
): Promise<string | null> {
  if (!coverDataUrl || !coverDataUrl.startsWith('data:image/')) return null;
  try {
    const base64Match = coverDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    const base64 = base64Match ? base64Match[1] : null;
    if (!base64) return null;
    const buffer = Buffer.from(base64, 'base64');
    const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
    const { error } = await supabaseAdmin.storage.from(storageBucket).upload(objectPath, buffer, { contentType: 'image/png', upsert: true });
    return error ? null : `${storageBucket}:${objectPath}`;
  } catch (_) {
    return null;
  }
}

function getStoredCoverImageUrl(indexData: any): string | null {
  if (!indexData || typeof indexData !== 'object' || Array.isArray(indexData)) return null;
  return typeof indexData.coverImageUrl === 'string' && indexData.coverImageUrl.trim()
    ? indexData.coverImageUrl
    : null;
}

function countFramesInPages(pages: any[]): number {
  if (!Array.isArray(pages)) return 0;
  return pages.reduce((sum: number, page: any) => {
    const frames = Array.isArray(page?.frames) ? page.frames.length : 0;
    return sum + frames;
  }, 0);
}

function countEligibleFrames(node: FigmaNode, parentType: string = 'PAGE'): number {
  let count = 0;
  const stack: Array<{ node: FigmaNode; parentType: string }> = [{ node, parentType }];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    const { node: current, parentType: parent } = entry;
    const isEligibleFrame =
      current.type === 'FRAME' &&
      ALLOWED_FRAME_PARENTS.has(parent) &&
      (current.name || '').trim().toLowerCase() !== 'section' &&
      current.visible !== false; // Exclude hidden frames

    if (isEligibleFrame) {
      count += 1;
    }

    // Only recurse into children of container nodes (PAGE, CANVAS, SECTION, FRAME, DOCUMENT)
    // Skip children of other node types (IMAGE, TEXT, RECTANGLE, etc.) to avoid processing images
    if (current.children) {
      const shouldRecurse = current.type === 'PAGE' || 
                           current.type === 'CANVAS' || 
                           current.type === 'SECTION' || 
                           current.type === 'FRAME' ||
                           current.type === 'DOCUMENT' ||
                           parent === 'DOCUMENT';
      
      if (shouldRecurse) {
        for (const child of current.children) {
          let nextParent = current.type || parent;
          if (child.type === 'SECTION') {
            nextParent = 'SECTION';
          }
          stack.push({ node: child, parentType: nextParent });
        }
      }
    }
  }
  return count;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n🚀 [${requestId}] ===== create-index-from-figma START =====`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] Headers:`, {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'present' : 'missing',
  });
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] OPTIONS request, returning 200`);
    return res.status(200).end();
  }

  // Check method - handle both undefined and non-POST
  const method = req.method || (req as any).httpMethod || 'UNKNOWN';
  if (method !== 'POST') {
    console.error(`[${requestId}] ❌ Method not allowed:`, {
      method,
      reqMethod: req.method,
      httpMethod: (req as any).httpMethod,
      url: req.url,
      headers: Object.keys(req.headers),
    });
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST'],
      receivedMethod: method,
    });
  }
  
  console.log(`[${requestId}] ✅ POST method confirmed`);

  // Use service role for user lookup
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
    });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  // Parse body early for guest path (before auth)
  const bodyEarly = typeof req.body === 'object' ? req.body : {};
  const galleryOnly = bodyEarly.source === 'figma-plugin' && (bodyEarly.galleryOnly === true || bodyEarly.action === 'gallery_index');
  const fileKeyEarly = bodyEarly.fileKey ?? bodyEarly.file_key;
  const guestAnonId = typeof bodyEarly.anonId === 'string' ? bodyEarly.anonId.trim().slice(0, 200) : '';
  const authHeader = req.headers.authorization;
  const hasValidAuth = authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20;

  // Guest path: no auth, anonId + galleryOnly -> create/update with user_id NULL, owner_anon_id
  if (galleryOnly && fileKeyEarly && guestAnonId && !hasValidAuth) {
    const fileKeyTrim = (typeof fileKeyEarly === 'string' ? fileKeyEarly : '').trim();
    if (fileKeyTrim.length >= 10) {
      const docId = (bodyEarly.docId ?? bodyEarly.doc_id ?? '0:0');
      const currentLogicalFileId = getLogicalFileId(docId, fileKeyTrim);
      const fileName = normalizeLogicalFileName(
        typeof bodyEarly.fileName === 'string'
          ? bodyEarly.fileName
          : typeof bodyEarly.file_name === 'string'
            ? bodyEarly.file_name
            : ''
      );
      const indexPayload = bodyEarly.indexPayload && typeof bodyEarly.indexPayload === 'object' ? bodyEarly.indexPayload : null;
      const hasValidPayload = indexPayload && (Array.isArray((indexPayload as { pages?: unknown }).pages) || Array.isArray(indexPayload));
      let pagesArray = hasValidPayload && (indexPayload as { pages?: unknown[] }).pages ? (indexPayload as { pages: any[] }).pages : [];
      const framesInPayload = Array.isArray(pagesArray) ? pagesArray.reduce((s: number, p: any) => s + (Array.isArray(p?.frames) ? p.frames.length : 0), 0) : 0;
      const guestLimits = await getPlanLimitsFromDb(supabaseAdmin, 'guest', false);
      const maxFrames = guestLimits.maxFramesTotal ?? 50;
      const actionCheckLimit = bodyEarly.action === 'check_limit';
      const maxFilesGuest = guestLimits.maxProjects ?? 1;

      const guestDistinctFileCount = await getGuestDistinctFileCount(supabaseAdmin, guestAnonId);
      const guestTotalFrames = await getGuestTotalFrames(supabaseAdmin, guestAnonId);

      const { data: existingRows } = await supabaseAdmin
        .from('index_files')
        .select('id, index_data, project_id, figma_file_key, frame_count')
        .is('user_id', null)
        .eq('owner_anon_id', guestAnonId)
        .eq('figma_file_key', fileKeyTrim)
        .limit(500);
      const existingByPageId = new Map<string, { id: string; index_data: any; pageCount: number }>();
      let existingFileCoverUrl: string | null = null;
      if (Array.isArray(existingRows)) {
        for (const row of existingRows) {
          const d = row.index_data as any;
          if (!existingFileCoverUrl) existingFileCoverUrl = getStoredCoverImageUrl(d);
          const pages = Array.isArray(d) ? d : (d?.pages ?? []);
          for (const p of pages) {
            const pid = (p?.id ?? p?.pageId);
            if (pid) existingByPageId.set(pid, { id: row.id, index_data: d, pageCount: pages.length });
          }
        }
      }
      const hasExistingForFile = existingByPageId.size > 0 || (existingRows?.length ?? 0) > 0;
      const isAddingNewFile = !hasExistingForFile;
      const wouldExceedFileLimit = isAddingNewFile && guestDistinctFileCount >= maxFilesGuest;
      const estimatedFrameCount = typeof bodyEarly.estimatedFrameCount === 'number' ? bodyEarly.estimatedFrameCount : framesInPayload;

      if (actionCheckLimit) {
        if (wouldExceedFileLimit) {
          return res.status(403).json({
            success: false,
            error: 'Guest limit: 1 Figma file. Create a free account to index more files.',
            code: 'GUEST_FILE_LIMIT',
            upgradeUrl: 'https://www.figdex.com/plugin-connect',
          });
        }
        if (guestTotalFrames + estimatedFrameCount > maxFrames) {
          return res.status(403).json({
            success: false,
            error: `Guest limit: up to ${maxFrames} frames. Create a free account for more.`,
            code: 'GUEST_FRAME_LIMIT',
            upgradeUrl: 'https://www.figdex.com/plugin-connect',
          });
        }
        console.log(`[${requestId}] guest check_limit: allowed`);
        return res.status(200).json({ success: true, allowed: true });
      }

      const coverImageDataUrl = typeof bodyEarly.coverImageDataUrl === 'string' ? bodyEarly.coverImageDataUrl : null;
      console.log(`[${requestId}] guest: distinctFiles=${guestDistinctFileCount}, hasExistingForFile=${hasExistingForFile}, wouldExceedFileLimit=${wouldExceedFileLimit}, framesInPayload=${framesInPayload}`);

      if (wouldExceedFileLimit) {
        return res.status(403).json({
          success: false,
          error: 'Guest limit: 1 Figma file. Create a free account to index more files.',
          code: 'GUEST_FILE_LIMIT',
          upgradeUrl: 'https://www.figdex.com/plugin-connect',
        });
      }
      if (guestTotalFrames + framesInPayload > maxFrames) {
        return res.status(403).json({
          success: false,
          error: `Guest limit: up to ${maxFrames} frames. Create a free account for more.`,
          code: 'GUEST_FRAME_LIMIT',
          upgradeUrl: 'https://www.figdex.com/plugin-connect',
        });
      }

      const now = new Date();
      const yyyy = String(now.getUTCFullYear());
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(now.getUTCDate()).padStart(2, '0');
      const safeAnon = guestAnonId.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 64);
      const safeFileKey = fileKeyTrim.replace(/[^a-zA-Z0-9-_.]/g, '_');
      if (!existingFileCoverUrl && coverImageDataUrl) {
        const fileCoverObjectPath = `guest/${safeAnon}/${yyyy}/${mm}/${dd}/${safeFileKey}_cover.png`;
        const uploadedFileCover = await uploadCoverFromDataUrl(supabaseAdmin, coverImageDataUrl, fileCoverObjectPath);
        if (uploadedFileCover) existingFileCoverUrl = uploadedFileCover;
      }

      for (const page of pagesArray) {
        const pageId = (page as any).id || (page as any).pageId;
        const pageName = normalizePageName((page as any).name || (page as any).pageName);
        const singlePageData = [{ ...page, id: pageId, name: pageName, pageId }];
        const indexDataForPage: unknown = existingFileCoverUrl
          ? { coverImageUrl: existingFileCoverUrl, pages: singlePageData }
          : { pages: singlePageData };

        const existingForPage = pageId ? existingByPageId.get(pageId) : null;
        const pageFileName = fileName || 'Untitled';
        const nowIso = now.toISOString();

        // Only update if existing row has exactly one page (one-index-per-page). Else insert new to avoid overwriting other pages.
        if (existingForPage?.id && existingForPage.pageCount === 1) {
          const existingData = existingForPage.index_data as any;
          const existingPages = Array.isArray(existingData) ? existingData : (existingData?.pages ?? []);
          const existingPage = existingPages.find((p: any) => (p?.id || p?.pageId) === pageId);
          const existingFrames = Array.isArray(existingPage?.frames) ? existingPage.frames : [];
          const incomingFrames = Array.isArray(page.frames) ? page.frames : [];
          const frameIds = new Set(existingFrames.map((f: any) => f.id).filter(Boolean));
          for (const f of incomingFrames) {
            if (f.id && !frameIds.has(f.id)) { existingFrames.push(f); frameIds.add(f.id); } else if (!f.id) { existingFrames.push(f); }
          }
          const mergedPage = { ...page, id: pageId, name: pageName, pageId, frames: existingFrames };
          const keepCover = existingData && typeof existingData === 'object' && existingData.coverImageUrl;
          const mergedData = keepCover
            ? { coverImageUrl: existingData.coverImageUrl, pages: [mergedPage] }
            : (existingFileCoverUrl ? { coverImageUrl: existingFileCoverUrl, pages: [mergedPage] } : { pages: [mergedPage] });
          const { error: updateErr } = await supabaseAdmin.from('index_files').update({
            file_name: pageFileName,
            project_id: String(docId),
            figma_file_key: fileKeyTrim,
            frame_count: countFramesInPages([mergedPage]),
            uploaded_at: nowIso,
            index_data: mergedData,
          }).eq('id', existingForPage.id);
          if (updateErr) {
            console.error(`[${requestId}] guest update page error:`, updateErr);
            return res.status(500).json({ success: false, error: 'Failed to update gallery', details: updateErr?.message });
          }
        } else {
          const { error: insertErr } = await supabaseAdmin.from('index_files').insert({
            user_id: null,
            owner_anon_id: guestAnonId,
            figma_file_key: fileKeyTrim,
            file_name: pageFileName,
            project_id: String(docId),
            frame_count: countFramesInPages(singlePageData),
            index_data: indexDataForPage,
            uploaded_at: nowIso,
          });
          if (insertErr) {
            console.error(`[${requestId}] guest insert page error:`, insertErr);
            return res.status(500).json({ success: false, error: 'Failed to create gallery', details: insertErr?.message });
          }
        }
      }
      return res.status(200).json({ success: true, viewToken: null });
    }
  }

  let userIdForLog: string | null = null;
  try {
    // Get API key from Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Validate API key format
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format',
      });
    }

    // Find user by API key
    const { data: userRows, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, api_key, plan, is_admin, created_at, credits_remaining')
      .eq('api_key', apiKey)
      .order('created_at', { ascending: true, nullsFirst: false })
      .limit(1);

    const user = Array.isArray(userRows) ? userRows[0] : null;

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    const planId = resolvePlanId(user.plan, user.is_admin);
    const planLimits = await getPlanLimitsFromDb(supabaseAdmin, user.plan, user.is_admin);

    // Helper function to check if file already exists (for re-index detection)
    const checkIfFileExists = async (fileKey: string, userId: string): Promise<boolean> => {
      try {
        const { data: existingConnections } = await supabaseAdmin
          .from('saved_connections')
          .select('id')
          .eq('user_id', userId)
          .eq('file_key', fileKey)
          .limit(1);
        
        return !!(existingConnections && existingConnections.length > 0);
      } catch (error) {
        console.error(`[${requestId}] Error checking if file exists:`, error);
        return false; // On error, assume it's a new file
      }
    };

    // Check monthly limits before creating job
    const now = new Date();
    const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    
    // Get user's indices from this month to check monthly limits
    const { data: monthlyIndices, error: monthlyError } = await supabaseAdmin
      .from('index_files')
      .select('id, index_data, uploaded_at')
      .eq('user_id', user.id)
      .gte('uploaded_at', startOfMonthUtc.toISOString());

    // Initialize monthly stats
    let uploadsThisMonth = 0;
    let framesThisMonth = 0;

    if (!monthlyError && Array.isArray(monthlyIndices)) {
      // Count uploads and frames this month
      uploadsThisMonth = monthlyIndices.length;
      
      // Count frames from index_data (if available)
      for (const index of monthlyIndices) {
        if (index.index_data) {
          try {
            let indexData = index.index_data;
            if (typeof indexData === 'string') {
              indexData = JSON.parse(indexData);
            }
            if (Array.isArray(indexData)) {
              framesThisMonth += indexData.reduce((sum: number, page: any) => {
                return sum + (Array.isArray(page?.frames) ? page.frames.length : 0);
              }, 0);
            }
          } catch (e) {
            // Skip if can't parse
          }
        }
      }

      const limitError = (code: string, message: string) => res.status(403).json({
        success: false,
        error: message,
        code,
        plan: planLimits.id,
        upgradeUrl: 'https://www.figdex.com/pricing',
      });

      // Check monthly upload limit
      if (planLimits.maxUploadsPerMonth !== null && uploadsThisMonth >= planLimits.maxUploadsPerMonth) {
        return limitError(
          'PLAN_MAX_UPLOADS_PER_MONTH',
          `Monthly upload limit reached for the ${planLimits.label} plan (${planLimits.maxUploadsPerMonth} per month). Please upgrade your plan or wait until next month.`
        );
      }
    }

    console.log('✅ User authorized:', {
      id: user.id,
      email: user.email,
      plan: planId,
    });
    userIdForLog = user.id;

    // Get request body
    const {
      fileKey: fileKeyInput,
      figmaToken,
      fileName: fileNameInput,
      validateOnly,
      selectedPages,
      selectedPageIds,
      imageQuality,
      fastMode,
      indexPayload: indexPayloadBody,
      docId: docIdBody,
      coverImageDataUrl: coverImageDataUrlBody,
    } = req.body;
    const validateOnlyMode = Boolean(validateOnly);

    // Connected plugin pre-flight: check file/frame limits before exporting or uploading frames.
    if (galleryOnly && fileKeyInput && req.body?.action === 'check_limit') {
      const fileKeyTrim = (typeof fileKeyInput === 'string' ? fileKeyInput : '').trim();
      if (fileKeyTrim.length >= 10) {
        const docId = docIdBody ?? req.body.doc_id ?? '0:0';
        const estimatedFrameCount = typeof req.body?.estimatedFrameCount === 'number' ? req.body.estimatedFrameCount : 0;
        const limits = await getUserEffectiveLimits(supabaseAdmin, user.id, user.plan, user.is_admin);
        const currentFiles = await getCurrentFileCount(supabaseAdmin, user.id);
        const currentTotalFrames = await getCurrentTotalFrames(supabaseAdmin, user.id);
        const currentLogicalFileId = getLogicalFileId(docId, fileKeyTrim);
        const { data: authCandidateRows } = await supabaseAdmin
          .from('index_files')
          .select('project_id, figma_file_key')
          .eq('user_id', user.id)
          .limit(1000);
        const hasExistingForFile = (authCandidateRows || []).some((row: any) => {
          const rowLogicalFileId = getLogicalFileId(row.project_id, row.figma_file_key);
          return rowLogicalFileId === currentLogicalFileId;
        });

        if (!hasExistingForFile && limits.maxFiles !== null && currentFiles >= limits.maxFiles) {
          return res.status(403).json({
            success: false,
            error: `File limit reached (${limits.maxFiles} files). Please upgrade your plan.`,
            code: 'FILE_LIMIT_REACHED',
            upgradeUrl: 'https://www.figdex.com/pricing',
          });
        }

        if (limits.maxFrames !== null && currentTotalFrames + estimatedFrameCount > limits.maxFrames) {
          return res.status(403).json({
            success: false,
            error: `Frame limit reached (${limits.maxFrames} frames total). Please upgrade your plan.`,
            code: 'FRAME_LIMIT_REACHED',
            upgradeUrl: 'https://www.figdex.com/pricing',
          });
        }

        return res.status(200).json({ success: true, allowed: true });
      }
    }

    // Plugin gallery path: has indexPayload, no figmaToken (plugin exports frames locally)
    if (galleryOnly && fileKeyInput && indexPayloadBody) {
      const fileKeyTrim = (typeof fileKeyInput === 'string' ? fileKeyInput : '').trim();
      if (fileKeyTrim.length >= 10) {
        const docId = docIdBody ?? req.body.doc_id ?? '0:0';
        const fileName = normalizeLogicalFileName(
          typeof fileNameInput === 'string'
            ? fileNameInput
            : (req.body.fileName ?? req.body.file_name ?? '')
        );
        const indexPayload = indexPayloadBody && typeof indexPayloadBody === 'object' ? indexPayloadBody : null;
        const hasValidPayload = indexPayload && (Array.isArray((indexPayload as { pages?: unknown }).pages) || Array.isArray(indexPayload));
        let pagesArray = hasValidPayload && (indexPayload as { pages?: unknown[] }).pages ? (indexPayload as { pages: any[] }).pages : [];
        if (Array.isArray(indexPayload) && !pagesArray.length) pagesArray = indexPayload;
        const framesInPayload = Array.isArray(pagesArray) ? pagesArray.reduce((s: number, p: any) => s + (Array.isArray(p?.frames) ? p.frames.length : 0), 0) : 0;

        if (pagesArray.length > 0 || framesInPayload > 0) {
          const limits = await getUserEffectiveLimits(supabaseAdmin, user.id, user.plan, user.is_admin);
          const currentFiles = await getCurrentFileCount(supabaseAdmin, user.id);
          const currentTotalFrames = await getCurrentTotalFrames(supabaseAdmin, user.id);
          const { data: authExistingRows } = await supabaseAdmin
            .from('index_files')
            .select('id, index_data, project_id, figma_file_key, frame_count')
            .eq('user_id', user.id)
            .eq('figma_file_key', fileKeyTrim)
            .limit(500);
          const authExistingByPageId = new Map<string, { id: string; index_data: any; pageCount: number }>();
          let authExistingFileCoverUrl: string | null = null;
          if (Array.isArray(authExistingRows)) {
            for (const row of authExistingRows) {
              const d = row.index_data as any;
              if (!authExistingFileCoverUrl) authExistingFileCoverUrl = getStoredCoverImageUrl(d);
              const pages = Array.isArray(d) ? d : (d?.pages ?? []);
              for (const p of pages) {
                const pid = (p?.id ?? p?.pageId);
                if (pid) authExistingByPageId.set(pid, { id: row.id, index_data: d, pageCount: pages.length });
              }
            }
          }
          const hasAuthExistingForFile = authExistingByPageId.size > 0 || (authExistingRows && authExistingRows.length > 0);
          const isNewFile = !hasAuthExistingForFile;

          if (isNewFile && currentFiles >= limits.maxFiles) {
            return res.status(403).json({
              success: false,
              error: `File limit reached (${limits.maxFiles} files). Please upgrade your plan.`,
              code: 'FILE_LIMIT_REACHED',
              upgradeUrl: 'https://www.figdex.com/pricing',
            });
          }
          if (limits.maxFrames !== null && currentTotalFrames + framesInPayload > limits.maxFrames) {
            return res.status(403).json({
              success: false,
              error: `Frame limit reached (${limits.maxFrames} frames total). Please upgrade your plan.`,
              code: 'FRAME_LIMIT_REACHED',
              upgradeUrl: 'https://www.figdex.com/pricing',
            });
          }
          const canIndex = await canCreateIndex(supabaseAdmin, user.id, user.plan, user.is_admin);
          if (!canIndex.allowed) {
            return res.status(429).json({
              success: false,
              error: canIndex.reason || 'Daily index limit reached',
              code: 'RATE_LIMIT_EXCEEDED',
            });
          }
          await incrementDailyIndexCount(supabaseAdmin, user.id);

          const coverImageDataUrl = typeof coverImageDataUrlBody === 'string' ? coverImageDataUrlBody : null;
          const now = new Date();
          const yyyy = String(now.getUTCFullYear());
          const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(now.getUTCDate()).padStart(2, '0');
          if (!authExistingFileCoverUrl && coverImageDataUrl) {
            const fileCoverObjectPath = `user/${user.id}/${yyyy}/${mm}/${dd}/${fileKeyTrim}_cover.png`;
            const uploadedFileCover = await uploadCoverFromDataUrl(supabaseAdmin, coverImageDataUrl, fileCoverObjectPath);
            if (uploadedFileCover) authExistingFileCoverUrl = uploadedFileCover;
          }

          for (const page of pagesArray) {
            const pageId = (page as any).id || (page as any).pageId;
            const pageName = normalizePageName((page as any).name || (page as any).pageName);
            const singlePageData = [{ ...page, id: pageId, name: pageName, pageId }];
            const indexDataForPage: unknown = authExistingFileCoverUrl
              ? { coverImageUrl: authExistingFileCoverUrl, pages: singlePageData }
              : { pages: singlePageData };

            const existingForPage = pageId ? authExistingByPageId.get(pageId) : null;
            const pageFileName = fileName || 'Untitled';
            const nowIso = now.toISOString();

            if (existingForPage?.id && existingForPage.pageCount === 1) {
              const existingData = existingForPage.index_data as any;
              const existingPages = Array.isArray(existingData) ? existingData : (existingData?.pages ?? []);
              const existingPage = existingPages.find((p: any) => (p?.id || p?.pageId) === pageId);
              const existingFrames = Array.isArray(existingPage?.frames) ? existingPage.frames : [];
              const incomingFrames = Array.isArray(page.frames) ? page.frames : [];
              const frameIds = new Set(existingFrames.map((f: any) => f.id).filter(Boolean));
              for (const f of incomingFrames) {
                if (f.id && !frameIds.has(f.id)) { existingFrames.push(f); frameIds.add(f.id); } else if (!f.id) { existingFrames.push(f); }
              }
              const mergedPage = { ...page, id: pageId, name: pageName, pageId, frames: existingFrames };
              const keepCover = existingData && typeof existingData === 'object' && existingData.coverImageUrl;
              const mergedData = keepCover
                ? { coverImageUrl: existingData.coverImageUrl, pages: [mergedPage] }
                : (authExistingFileCoverUrl ? { coverImageUrl: authExistingFileCoverUrl, pages: [mergedPage] } : { pages: [mergedPage] });
              const { error: updateErr } = await supabaseAdmin.from('index_files').update({
                file_name: pageFileName,
                project_id: String(docId),
                figma_file_key: fileKeyTrim,
                frame_count: countFramesInPages([mergedPage]),
                uploaded_at: nowIso,
                index_data: mergedData,
              }).eq('id', existingForPage.id);
              if (updateErr) {
                console.error(`[${requestId}] auth update page error:`, updateErr);
                return res.status(500).json({ success: false, error: 'Failed to update gallery', details: updateErr?.message });
              }
            } else {
              const { error: insertErr } = await supabaseAdmin.from('index_files').insert({
                user_id: user.id,
                figma_file_key: fileKeyTrim,
                file_name: pageFileName,
                project_id: String(docId),
                frame_count: countFramesInPages(singlePageData),
                index_data: indexDataForPage,
                uploaded_at: nowIso,
              });
              if (insertErr) {
                console.error(`[${requestId}] auth insert page error:`, insertErr);
                return res.status(500).json({ success: false, error: 'Failed to create gallery', details: insertErr?.message });
              }
            }
          }
          return res.status(200).json({ success: true, viewToken: null });
        }
      }
    }

    if (!fileKeyInput || !figmaToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileKey and figmaToken',
      });
    }

    // Extract file key from URL if needed
    let fileKey = fileKeyInput;
    if (fileKeyInput.includes('figma.com')) {
      const extracted = extractFileKeyFromUrl(fileKeyInput);
      if (!extracted) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Figma URL. Could not extract file key.',
        });
      }
      fileKey = extracted;
    }

    // Validate file key format
    if (!/^[a-zA-Z0-9]{10,30}$/.test(fileKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file key format',
      });
    }

    // Check subscription limits (files, frames, rate limiting)
    // Skip for unlimited/admin
    if (user.plan !== 'unlimited' && !user.is_admin) {
      // Get effective limits (plan + addons)
      const limits = await getUserEffectiveLimits(supabaseAdmin, user.id, user.plan, user.is_admin);
      
      // Check file limit
      const currentFiles = await getCurrentFileCount(supabaseAdmin, user.id);
      
      // Check if this is a re-index (existing file) or new file
      const existingFile = await supabaseAdmin
        .from('index_files')
        .select('id')
        .eq('user_id', user.id)
        .eq('file_key', fileKey)
        .maybeSingle();
      
      const isReindex = !!existingFile?.data;
      
      // For new files, check if we're within limit
      if (!isReindex && currentFiles >= limits.maxFiles) {
        return res.status(400).json({
          success: false,
          error: `File limit reached (${limits.maxFiles} files). You have ${currentFiles} files. Please purchase an add-on to add more files or upgrade your plan.`,
          code: 'FILE_LIMIT_REACHED',
          current: currentFiles,
          max: limits.maxFiles,
          upgradeUrl: 'https://www.figdex.com/pricing'
        });
      }

      // Check rate limiting (daily index count)
      const canIndex = await canCreateIndex(supabaseAdmin, user.id, user.plan, user.is_admin);
      if (!canIndex.allowed) {
        return res.status(429).json({
          success: false,
          error: canIndex.reason || 'Daily index limit reached',
          code: 'RATE_LIMIT_EXCEEDED',
          currentCount: canIndex.currentCount,
          maxCount: canIndex.maxCount,
          waitUntil: canIndex.waitUntil?.toISOString()
        });
      }

      console.log(`[${requestId}] ✅ Subscription limits check passed:`, {
        fileKey,
        isReindex,
        currentFiles,
        maxFiles: limits.maxFiles,
        currentIndexesToday: canIndex.currentCount,
        maxIndexesPerDay: canIndex.maxCount,
        plan: user.plan
      });
    }

    // Validate Figma token
    console.log('🔐 Validating Figma token...');
    const isValidToken = await validateFigmaToken(figmaToken);
    if (!isValidToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Figma Personal Access Token. Please check your token in Figma Settings.',
      });
    }

    console.log('✅ Token validated');

    // Fetch file structure from Figma
    // Always use lightweight mode for index creation to avoid timeout
    // We'll collect frames in the background job using frame_node_refs
    console.log(`[${requestId}] 📥 Fetching file structure from Figma (always lightweight for index creation)...`);
    const fetchStartTime = Date.now();
    let figmaFile;
    try {
      // Always use lightweight mode to avoid timeout - we don't need full structure here
      // The background job will fetch individual frames as needed
      figmaFile = await fetchFigmaFile(fileKey, figmaToken, true); // Always lightweight
      const fetchTime = Date.now() - fetchStartTime;
      console.log(`[${requestId}] ✅ File fetched: ${figmaFile.name} (took ${fetchTime}ms)`);
    } catch (error: any) {
      console.error(`[${requestId}] ❌ Error fetching file from Figma:`, error);
      const fetchTime = Date.now() - fetchStartTime;
      if (fetchTime > 25000 || error.name === 'AbortError' || error.name === 'TimeoutError' || error.message?.includes('timed out')) {
        // Likely a timeout
        console.error(`[${requestId}] ⏱️ Timeout detected after ${fetchTime}ms`);
        return res.status(504).json({
          success: false,
          error: 'Request to Figma API timed out. The file may be too large. Please try with a smaller file or contact support.',
          details: error.message,
        });
      }
      console.error(`[${requestId}] ❌ Other error:`, error.message);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch file from Figma API',
        details: error.message,
      });
    }

    // Get file name
    const fileName = fileNameInput || figmaFile.name || 'Untitled';
    const rawPageNodes = (figmaFile.document.children || [])
      .filter((child) => child.type === 'PAGE' || child.type === 'CANVAS');

    // In validateOnly mode, skip frame counting to save time
    // Just return page names without frame counts
    if (validateOnlyMode) {
      const availablePages = rawPageNodes.map((page) => normalizePageName(page.name));
      const pageMeta = rawPageNodes.map((child) => {
        const normalizedName = normalizePageName(child.name);
        return {
          id: child.id,
          name: normalizedName,
          frameCount: 0, // Will be calculated when user creates index
          selectable: !isReservedPageName(normalizedName),
          depth: 0,
        };
      });

      console.log(`✅ Validate only mode: returning ${pageMeta.length} pages without frame counts`);
      
      return res.status(200).json({
        success: true,
        message: 'Token validated successfully and file key looks valid.',
        fileName,
        fileKey,
        documentId: figmaFile.document.id || '0:0',
        pages: availablePages,
        pageMeta,
      });
    }

    // For actual index creation, we don't count frames here to avoid timeout
    // Frame counting will be done in the background job
    console.log(`[${requestId}] 🔍 Creating pageMeta without frame counting (will be done in background job)...`);
    const pageMeta = rawPageNodes.map((child) => {
      const normalizedName = normalizePageName(child.name);
      // Don't count frames here - it will be done in the background job
      // This prevents timeout for large files
      return {
        id: child.id,
        name: normalizedName,
        frameCount: 0, // Will be calculated during background processing
        selectable: !isReservedPageName(normalizedName),
        depth: 0,
      };
    });
    console.log(`[${requestId}] ✅ PageMeta created: ${pageMeta.length} pages`);

    const availablePages = rawPageNodes.map((page) => normalizePageName(page.name));
    const pageIdSet = new Set(pageMeta.map((page) => page.id));
    const pageNameMap = new Map(pageMeta.map((page) => [page.id, page.name]));

    const normalizedSelection = Array.isArray(selectedPages)
      ? selectedPages
          .filter((page) => typeof page === 'string')
          .map((page) => page.trim())
          .filter((page) => page.length > 0)
      : [];
    const validSelection = normalizedSelection.filter((page) => availablePages.includes(page));
    const hasCustomSelection = validSelection.length > 0;
    const includedPages = new Set<string>(hasCustomSelection ? validSelection : availablePages);

    let normalizedIdSelection = Array.isArray(selectedPageIds)
      ? selectedPageIds
          .filter((id: any) => typeof id === 'string')
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0 && pageIdSet.has(id))
      : [];
    const hasIdSelection = normalizedIdSelection.length > 0;
    let includedPageIds = hasIdSelection ? new Set<string>(normalizedIdSelection) : null;

    console.log('🔍 Collecting frames from selected pages...');
    const getPageDisplayName = (page: FigmaNode) =>
      pageNameMap.get(page.id) || normalizePageName(page.name);
    const shouldIncludePage = (page: FigmaNode) => {
      if (includedPageIds) {
        return Boolean(page.id && includedPageIds.has(page.id));
      }
      const pageName = getPageDisplayName(page);
      return includedPages.has(pageName);
    };

    let pageNodes = rawPageNodes.filter((page) => shouldIncludePage(page));

    if (includedPageIds && pageNodes.length === 0 && includedPages.size > 0) {
      console.warn('⚠️ Selected page IDs not found, falling back to name-based filtering.');
      includedPageIds = null;
      pageNodes = rawPageNodes.filter((page) => {
        const pageName = getPageDisplayName(page);
        return includedPages.has(pageName);
      });
    }

    if ((includedPageIds || includedPages.size > 0) && pageNodes.length === 0) {
      console.error('⚠️ Page filter result empty', {
        selectedPageIds: Array.from(includedPageIds || []),
        selectedPageNames: Array.from(includedPages),
        availablePages,
      });
      return res.status(400).json({
        success: false,
        error: 'Selected pages were not found in the file. Please re-validate the connection.',
        details: {
          selectedPageIds: Array.from(includedPageIds || []),
          selectedPageNames: Array.from(includedPages),
          availablePages,
        },
      });
    }

    // Prefer using client-provided frame counts to avoid heavy server-side prefetch on huge files
    const clientPageFrameCounts = Array.isArray(req.body?.pageFrameCounts) ? req.body.pageFrameCounts : null;
    const pageFrameCountMap = clientPageFrameCounts
      ? new Map<string, number>(clientPageFrameCounts.map((p: any) => [p.pageId, Number(p.frameCount) || 0]))
      : null;

    console.log(`[${requestId}] 📋 Building frame_node_refs (page refs) and total_frames using client frame counts when available...`);

    if (pageNodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pages selected. Please select at least one page.',
      });
    }

    // Prefer client-provided frame references (actual frame IDs) to avoid server page fetch issues
    const clientFrameRefs = Array.isArray(req.body?.frameNodeRefs) ? req.body.frameNodeRefs : null;

    let totalFramesCount = 0;
    let frameNodeRefsForJob: any[] = [];

    if (clientFrameRefs && clientFrameRefs.length > 0) {
      frameNodeRefsForJob = clientFrameRefs.map((ref: any, idx: number) => ({
        id: ref.id,
        type: ref.type || 'FRAME',
        pageId: ref.pageId,
        pageName: ref.pageName,
        sectionId: ref.sectionId,
        sectionName: ref.sectionName,
        index: idx,
      }));
      totalFramesCount = frameNodeRefsForJob.length;
      console.log(`[${requestId}] ✅ Using client-provided frame_node_refs: ${totalFramesCount} frames`);
    } else {
      // Build page-based refs (lighter) and total from client counts
      frameNodeRefsForJob = pageNodes.map((pageNode, index) => {
        const pageName = getPageDisplayName(pageNode);
        const frameCount = pageFrameCountMap?.get(pageNode.id) ?? 0;
        totalFramesCount += frameCount;
        return {
          id: pageNode.id,
          type: 'PAGE',
          name: pageName,
          pageName,
          pageId: pageNode.id,
          sectionName: undefined,
          sectionId: undefined,
          index,
          // Store minimal node data; background job will fetch frames
          nodeData: {
            id: pageNode.id,
            name: pageNode.name,
            type: pageNode.type,
            visible: pageNode.visible !== false,
          },
        };
      });
    }

    // Fallback: if client counts missing/zero, keep at least page count (job will update during processing)
    if (totalFramesCount === 0) {
      totalFramesCount = frameNodeRefsForJob.length;
      console.log(`[${requestId}] ⚠️ Client frame counts missing; using page count (${totalFramesCount}) as placeholder.`);
    } else {
      console.log(`[${requestId}] ✅ Total frames from client counts: ${totalFramesCount}`);
    }

    // Check monthly frames limit (estimate based on totalFramesCount)
    if (!monthlyError && Array.isArray(monthlyIndices) && planLimits.maxFramesPerMonth !== null) {
      const framesThisMonthAfter = framesThisMonth + totalFramesCount;
      if (framesThisMonthAfter > planLimits.maxFramesPerMonth) {
        return res.status(403).json({
          success: false,
          error: `Monthly frames limit reached for the ${planLimits.label} plan (${planLimits.maxFramesPerMonth.toLocaleString()} frames per month). This index would add ${totalFramesCount.toLocaleString()} frames, exceeding your monthly limit. Please upgrade your plan or wait until next month.`,
          code: 'PLAN_MAX_FRAMES_PER_MONTH',
          plan: planLimits.id,
          upgradeUrl: 'https://www.figdex.com/pricing',
          currentFrames: framesThisMonth,
          newFrames: totalFramesCount,
          limit: planLimits.maxFramesPerMonth
        });
      }
    }

    const documentId = figmaFile.document.id || '0:0';
    
    // Create empty manifest structure - will be filled during processing
    const emptyManifest: any[] = [];
    
    const jobPayload: any = {
      user_id: user.id,
      file_key: fileKey,
      file_name: fileName,
      project_id: documentId,
      manifest: emptyManifest, // Empty initially, will be built during processing
      frame_node_refs: frameNodeRefsForJob, // Store actual frame references (already collected)
      document_data: {
        id: figmaFile.document.id,
        name: figmaFile.document.name,
        type: figmaFile.document.type,
      }, // Store basic document info (full structure will be fetched if needed)
      page_meta: pageMeta,
      selected_pages: Array.from(includedPages),
      selected_page_ids: includedPageIds ? Array.from(includedPageIds) : null,
      status: 'pending',
      next_frame_index: 0,
      total_frames: totalFramesCount,
      // figma_token column doesn't exist in index_jobs table - token is passed via request body
      image_quality: req.body.imageQuality || 0.7, // Store image quality for processing
      // Store version info for incremental re-indexing
      figma_version: figmaFile.version || null,
      figma_last_modified: figmaFile.lastModified || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Don't include fast_mode if it's false or undefined - column may not exist
      // Only include if explicitly true
    };

    // Add optional fields only if they exist in the schema
    // Add image_quality if provided (optional field)
    if (imageQuality !== undefined) {
      jobPayload.image_quality = imageQuality;
    }
    
    // Don't add fast_mode - column doesn't exist in production
    // if (fastMode) {
    //   jobPayload.fast_mode = true;
    // }

    // Try to insert with new columns first (optimized approach)
    let jobRow: any = null;
    let jobError: any = null;
    
    console.log(`[${requestId}] 💾 Attempting to insert job with payload:`, {
      user_id: jobPayload.user_id,
      file_key: jobPayload.file_key,
      file_name: jobPayload.file_name,
      total_frames: jobPayload.total_frames,
      frame_node_refs_count: Array.isArray(jobPayload.frame_node_refs) ? jobPayload.frame_node_refs.length : 0,
      has_image_quality: 'image_quality' in jobPayload,
      image_quality: jobPayload.image_quality,
      has_fast_mode: 'fast_mode' in jobPayload,
      fast_mode: jobPayload.fast_mode,
    });
    
    try {
      const result = await supabaseAdmin
        .from('index_jobs')
        .insert(jobPayload)
        .select('id')
        .single();
      jobRow = result.data;
      jobError = result.error;
      
      if (jobError) {
        console.error(`[${requestId}] ❌ Insert error:`, {
          message: jobError.message,
          code: jobError.code,
          details: jobError.details,
          hint: jobError.hint,
        });
      } else {
        console.log(`[${requestId}] ✅ Job inserted successfully:`, jobRow?.id);
        
        // Increment daily index count AFTER job is created successfully (skip for unlimited/admin)
        if (user.plan !== 'unlimited' && !user.is_admin && jobRow?.id) {
          try {
            const newCount = await incrementDailyIndexCount(supabaseAdmin, user.id);
            console.log(`[${requestId}] ✅ Daily index count incremented: ${newCount}`);
          } catch (error: any) {
            console.error(`[${requestId}] ❌ Failed to increment daily index count:`, error);
            // Non-critical error - log but don't fail the request
            // Job was created successfully, count will be tracked manually if needed
          }
        }
      }
    } catch (err: any) {
      jobError = err;
      console.error(`[${requestId}] ❌ Insert exception:`, {
        message: err.message,
        stack: err.stack,
      });
    }

    // If insert failed due to missing optional columns, try without them
    // BUT: Don't remove figma_version and figma_last_modified - these are important!
    // Only remove them if the error specifically mentions them
    // Note: figma_token is not in jobPayload (column doesn't exist in table)
    if (jobError && (jobError.message?.includes('image_quality') || jobError.message?.includes('fast_mode') || jobError.code === '42703' || jobError.code === 'PGRST204')) {
      console.warn(`[${requestId}] ⚠️ Some optional columns not available, retrying without them...`);
      // Only remove columns that are definitely optional and might not exist
      // Keep figma_version and figma_last_modified unless error specifically mentions them
      const { image_quality, fast_mode, ...jobPayloadMinimal } = jobPayload as any;
      
      // Only remove version fields if error specifically mentions them
      if (jobError.message?.includes('figma_version') || jobError.message?.includes('figma_last_modified')) {
        delete (jobPayloadMinimal as any).figma_version;
        delete (jobPayloadMinimal as any).figma_last_modified;
        console.warn(`[${requestId}] ⚠️ Also removing figma_version/figma_last_modified due to error`);
      }
      try {
        const result = await supabaseAdmin
          .from('index_jobs')
          .insert(jobPayloadMinimal)
          .select('id')
          .single();
        jobRow = result.data;
        jobError = result.error;
        
        if (!jobError) {
          console.log(`[${requestId}] ✅ Job inserted successfully without optional columns:`, jobRow?.id);
        }
      } catch (err: any) {
        jobError = err;
        console.error(`[${requestId}] ❌ Retry insert also failed:`, err.message);
      }
    }

    // If insert failed due to missing required columns, return error instead of processing frames
    // Processing frames synchronously would cause timeout for large files
    if (jobError && (jobError.message?.includes('frame_node_refs') || jobError.message?.includes('document_data') || jobError.code === '42703')) {
      console.error('❌ Required database columns (frame_node_refs, document_data) are missing. Cannot create index job.');
      return res.status(500).json({
        success: false,
        error: 'Database configuration error: Required columns (frame_node_refs, document_data) are missing. Please run SQL migrations and try again.',
        details: jobError.message,
      });
    }

    if (jobError) {
      console.error(`[${requestId}] ❌ Failed to enqueue job:`, {
        message: jobError.message,
        code: jobError.code,
        details: jobError.details,
        hint: jobError.hint,
        fullError: JSON.stringify(jobError, null, 2),
      });
      
      // Credits were not deducted because job creation failed first
      // (We moved credit deduction to after job creation)
      // So no rollback needed
      
      // Return more detailed error for debugging
      const errorDetails: any = {
        success: false,
        error: 'Failed to schedule background indexing job',
        details: jobError.message || 'Unknown error',
      };
      
      // Include error code and hint if available (helpful for debugging)
      if (jobError.code) {
        errorDetails.errorCode = jobError.code;
      }
      if (jobError.hint) {
        errorDetails.hint = jobError.hint;
      }
      if (jobError.details) {
        errorDetails.databaseDetails = jobError.details;
      }
      
      // In development, include full error
      if (process.env.NODE_ENV === 'development') {
        errorDetails.fullError = jobError;
      }
      
      return res.status(500).json(errorDetails);
    }

    return res.status(200).json({
      success: true,
      message: 'Job scheduled',
      jobId: jobRow?.id,
      stats: {
        totalFrames: totalFramesCount,
        totalPages: pageMeta.length,
        estimatedFileSize: 0, // Will be calculated during processing
      },
    });

    } catch (error: any) {
      console.error('❌ Error creating index from Figma API:', {
        message: error?.message,
        stack: error?.stack,
        requestBody: req.body,
        userId: userIdForLog,
      });
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : error?.message,
      });
    }
}
