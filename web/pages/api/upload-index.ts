import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { syncNormalizedIndexChunk } from '../../lib/normalized-index-store';
// Local helpers mirroring plugin logic
function deriveNamingTags(rawName: string): string[] {
  try {
    if (!rawName) return [];
    const cleaned = rawName.replace(/^Thumbnail:\s*/i, '').trim();
    const parts = cleaned.split(/[\-_/\s]+/).filter(Boolean);
    const isAlphaNum = (s: string) => /^[a-z0-9]+$/i.test(s);
    const isSize = (s: string) => /^\d+x\d+$/i.test(s);
    const tokens = parts
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .filter(p => !(p.length === 1 && !isAlphaNum(p)))
      .filter(p => !isSize(p));
    return Array.from(new Set(tokens));
  } catch {
    return [];
  }
}
function getSizeTag(w?: number, h?: number): string | null {
  if (!w || !h) return null;
  const W = Math.round(w);
  const H = Math.round(h);
  if (W > 0 && H > 0) return `${W}x${H}`;
  return null;
}

// Increase body size limit for large index uploads (up to 100MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

// Helper function to merge chunks into a single index
async function mergeChunksIfComplete(userId: string, fileKey: string, validFileKey: string, currentDocumentId?: string) {
  try {
    // Use service role for merging to bypass RLS and guarantee user_id assignment
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    
    if (!serviceUrl || !serviceKey) {
      console.error('Service role credentials missing for mergeChunksIfComplete');
      return;
    }
    
    const svc = createClient(serviceUrl, serviceKey);
    
    // Check if fileKey is valid (not "unknown")
    const fileKeyIsValid = fileKey && typeof fileKey === 'string' && fileKey.trim().length > 0 && fileKey.trim().toLowerCase() !== 'unknown';
    
    let chunks: any[] = [];
    
    // Strategy 1: If fileKey is valid, search by fileKey + project_id pattern
    if (fileKeyIsValid && currentDocumentId) {
      const baseId = currentDocumentId.replace(/-chunk\d+$/, '');
      const selectWithSize = 'id, file_name, index_data, project_id, figma_file_key, uploaded_at, file_size, frame_tags, custom_tags, naming_tags, size_tags';
      const selectNoSize   = 'id, file_name, index_data, project_id, figma_file_key, uploaded_at, frame_tags, custom_tags, naming_tags, size_tags';
      let chunksErrorByKey: any | null = null;
      let chunksByKey: any[] | null = null;
      {
        const result = await svc
          .from('index_files')
          .select(selectWithSize)
          .eq('user_id', userId)
          .eq('figma_file_key', fileKey)
          .ilike('project_id', `${baseId}-chunk%`)
          .ilike('file_name', '%(Part %/%)%');
        chunksByKey = result.data as any[] | null;
        chunksErrorByKey = result.error;
      }
      if (chunksErrorByKey && /file_size/.test(chunksErrorByKey.message || '')) {
        const retry = await svc
          .from('index_files')
          .select(selectNoSize)
          .eq('user_id', userId)
          .eq('figma_file_key', fileKey)
          .ilike('project_id', `${baseId}-chunk%`)
          .ilike('file_name', '%(Part %/%)%');
        chunksByKey = retry.data as any[] | null;
        chunksErrorByKey = retry.error;
      }
      if (!chunksErrorByKey && chunksByKey) {
        chunks = chunksByKey;
      }
    }
    
    // Strategy 2: If no chunks found or fileKey is invalid, try by project_id pattern only
    if (chunks.length === 0 && currentDocumentId) {
      const baseId = currentDocumentId.replace(/-chunk\d+$/, '');
      const selectWithSize = 'id, file_name, index_data, project_id, figma_file_key, uploaded_at, file_size, frame_tags, custom_tags, naming_tags, size_tags';
      const selectNoSize   = 'id, file_name, index_data, project_id, figma_file_key, uploaded_at, frame_tags, custom_tags, naming_tags, size_tags';
      let chunksErrorByProject: any | null = null;
      let chunksByProject: any[] | null = null;
      {
        const result = await svc
          .from('index_files')
          .select(selectWithSize)
          .eq('user_id', userId)
          .ilike('project_id', `${baseId}-chunk%`)
          .ilike('file_name', '%(Part %/%)%');
        chunksByProject = result.data as any[] | null;
        chunksErrorByProject = result.error;
      }
      if (chunksErrorByProject && /file_size/.test(chunksErrorByProject.message || '')) {
        const retry = await svc
          .from('index_files')
          .select(selectNoSize)
          .eq('user_id', userId)
          .ilike('project_id', `${baseId}-chunk%`)
          .ilike('file_name', '%(Part %/%)%');
        chunksByProject = retry.data as any[] | null;
        chunksErrorByProject = retry.error;
      }
      if (!chunksErrorByProject && chunksByProject) {
        chunks = chunksByProject;
      }
    }

    if (!chunks || chunks.length === 0) {
      console.log('📦 No chunks found for merging');
      return;
    }

    // Parse chunk numbers from file names to determine expected total
    const chunkInfo = chunks.map((chunk: any) => {
      const match = chunk.file_name.match(/\(Part (\d+)\/(\d+)\)/);
      if (match) {
        return {
          chunk: chunk,
          partNumber: parseInt(match[1]),
          totalParts: parseInt(match[2])
        };
      }
      return null;
    }).filter(Boolean) as Array<{ chunk: any; partNumber: number; totalParts: number }>;

    if (chunkInfo.length === 0) {
      console.log('📦 Could not parse chunk numbers');
      return;
    }

    // Get expected total parts (from the highest part number)
    const expectedTotal = Math.max(...chunkInfo.map(c => c.totalParts));

    // Check if we have all chunks
    const foundParts = new Set(chunkInfo.map(c => c.partNumber));
    const allPartsPresent = Array.from({ length: expectedTotal }, (_, i) => i + 1).every(part => foundParts.has(part));

    if (!allPartsPresent) {
      console.log(`📦 Not all chunks uploaded yet. Found ${chunkInfo.length}/${expectedTotal} parts`);
      return;
    }

    console.log(`✅ All ${expectedTotal} chunks found! Merging into single index...`);

    // Sort chunks by part number
    chunkInfo.sort((a, b) => a.partNumber - b.partNumber);

    // Merge all index_data from chunks
    const mergedPages: any[] = [];
    for (const { chunk } of chunkInfo) {
      if (chunk.index_data && Array.isArray(chunk.index_data)) {
        mergedPages.push(...chunk.index_data);
      }
    }

    // Get base file name (remove "Part X/Y")
    const baseFileName = (chunkInfo[0].chunk.file_name || '').replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim() || 'Figma Index';

    // Get the original documentId (without -chunk suffix)
    const baseDocumentId = chunkInfo[0].chunk.project_id?.replace(/-chunk\d+$/, '') || chunkInfo[0].chunk.project_id;

    // Prefer non-unknown figma_file_key from any chunk
    const preferredKey = (chunks.find((c: any) => c.figma_file_key && c.figma_file_key !== 'unknown')?.figma_file_key)
      || validFileKey
      || baseDocumentId
      || 'unknown';

    // Get tags from first chunk (assuming they're similar)
    const firstChunk = chunks.find((c: any) => c.file_name.includes('(Part 1/'));
    const frameTags = firstChunk?.frame_tags || [];
    const customTags = firstChunk?.custom_tags || [];
    const namingTags = firstChunk?.naming_tags || [];
    const sizeTags = firstChunk?.size_tags || [];

    // Use most recent uploaded_at among chunks
    const latestUploadedAt = chunks
      .map((c: any) => new Date(c.uploaded_at).getTime())
      .reduce((a: number, b: number) => Math.max(a, b), 0);
    const mergedUploadedAt = latestUploadedAt ? new Date(latestUploadedAt).toISOString() : new Date().toISOString();

    // Calculate file size for merged index
    // Since all chunks have the same file_size (total size), use the first chunk's file_size
    // Otherwise calculate from merged data
    const firstChunkFileSize = chunks.find((c: any) => c.file_size && c.file_size > 0)?.file_size;
    const mergedFileSizeBytes = firstChunkFileSize && firstChunkFileSize > 0
      ? firstChunkFileSize  // Use total size from any chunk (they're all the same)
      : Buffer.byteLength(JSON.stringify(mergedPages), 'utf8');
    
    console.log('📏 Merged file size calculation:', {
      fromFirstChunk: firstChunkFileSize,
      calculated: Buffer.byteLength(JSON.stringify(mergedPages), 'utf8'),
      final: mergedFileSizeBytes
    });
    
    // Create merged index
    const mergedIndex = {
      user_id: userId,
      project_id: baseDocumentId,
      figma_file_key: preferredKey,
      file_name: baseFileName,
      index_data: mergedPages,
      uploaded_at: mergedUploadedAt,
      file_size: mergedFileSizeBytes, // Add file size in bytes
      frame_tags: frameTags,
      custom_tags: customTags,
      naming_tags: namingTags,
      size_tags: sizeTags
    };

    // Insert merged index
    let mergedDataResp = await svc
      .from('index_files')
      .insert(mergedIndex)
      .select()
      .single();
    if (mergedDataResp.error && /file_size/.test(mergedDataResp.error.message || '')) {
      // Retry without file_size column if it doesn't exist
      const fallbackMerged = { ...mergedIndex } as any;
      delete fallbackMerged.file_size;
      mergedDataResp = await svc
        .from('index_files')
        .insert(fallbackMerged)
        .select()
        .single();
    }
    if (mergedDataResp.error) {
      console.error('❌ Error creating merged index:', mergedDataResp.error);
      return;
    }
    const mergedData = mergedDataResp.data as any;

    // Delete all chunks
    const chunkIds = chunks.map((c: any) => c.id);
    const { error: deleteError } = await svc
      .from('index_files')
      .delete()
      .in('id', chunkIds);

    if (deleteError) {
      console.error('⚠️ Error deleting chunks after merge:', deleteError);
      // Continue anyway, the merged index is created
    }

    console.log(`✅ Successfully merged ${expectedTotal} chunks into single index: ${mergedData.id}`);
    console.log(`✅ Merged index contains ${mergedPages.length} pages`);

    try {
      const mergeSyncId = `upload-legacy-merge:${userId}:${preferredKey}:${Date.now()}`;
      await syncNormalizedIndexChunk({
        supabaseAdmin: svc,
        owner: { type: 'user', userId },
        fileKey: preferredKey,
        projectId: baseDocumentId,
        fileName: baseFileName,
        coverImageUrl: null,
        pages: mergedPages.map((page: any) => ({
          id: page?.id,
          pageId: page?.id,
          name: page?.name,
          pageName: page?.name,
          frames: Array.isArray(page?.frames)
            ? page.frames.map((frame: any) => ({
                ...frame,
                image: typeof frame?.image === 'string' ? frame.image : null,
                thumb_url: typeof frame?.thumb_url === 'string' ? frame.thumb_url : null,
                frameTags: Array.isArray(frame?.frameTags)
                  ? frame.frameTags
                  : Array.isArray(frame?.tags)
                    ? frame.tags
                    : [],
                customTags: Array.isArray(frame?.customTags) ? frame.customTags : [],
              }))
            : [],
        })),
        syncId: mergeSyncId,
        finalizePageIds: mergedPages.map((page: any) => String(page?.id || '')).filter(Boolean),
      });
    } catch (normalizedSyncError) {
      console.error('❌ Error syncing normalized merged upload-index state:', normalizedSyncError);
    }

  } catch (error) {
    console.error('❌ Error in mergeChunksIfComplete:', error);
    // Don't throw - this is not critical
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  // Use service role for all operations to ensure user_id is always set correctly
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Supabase URL or Service Key missing'
    });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  try {
    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Validate API key format
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    // Find user by API key - use admin client to bypass RLS
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, api_key')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      console.error('❌ User lookup failed:', {
        apiKeyPrefix: apiKey.substring(0, 15) + '...',
        error: userError?.message,
        code: userError?.code
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        details: userError?.message
      });
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      full_name: user.full_name
    });

    // Get the index data from request body
    const { documentId, fileKey, fileName, pages, uploadedAt, frameTags, customTags, file_size: fileSizeFromRequest } = req.body;

    // Validate required fields
    if (!documentId || !pages) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: documentId, pages',
        details: 'The plugin must provide a valid documentId and pages array'
      });
    }

    // Validate documentId - must be a string, but can be '0:0' for unsaved files
    // We'll use it as-is and let it be stored in the database
    if (typeof documentId !== 'string' || documentId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid documentId',
        details: `documentId must be a valid string. Received: "${documentId}". Please ensure the file is properly opened in Figma.`,
        receivedValue: documentId
      });
    }
    
    // Note: documentId can be '0:0' for unsaved files - we accept it

    // Validate fileKey - reject invalid values
    if (!fileKey || typeof fileKey !== 'string' || fileKey.trim() === '' || fileKey.toLowerCase() === 'unknown') {
      return res.status(400).json({
        success: false,
        error: 'Invalid fileKey',
        details: 'fileKey is required and must be a valid Figma file key. Please set the file key in the plugin before uploading.',
        receivedValue: fileKey || 'missing',
        help: 'In the plugin UI, click "Set File Key" and paste your Figma file URL, or enter the file key directly.'
      });
    }

    // Validate pages array
    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pages array',
        details: 'pages must be a non-empty array',
        receivedValue: Array.isArray(pages) ? 'empty array' : typeof pages
      });
    }

    // Validate and fix fileName - if it's 'Untitled', missing, or same as fileKey, use a better name
    let finalFileName = fileName;
    
    // Check if fileName is actually the fileKey (common issue when file is not saved)
    const isFileNameSameAsFileKey = fileKey && typeof fileKey === 'string' && 
                                     finalFileName && typeof finalFileName === 'string' &&
                                     finalFileName.trim() === fileKey.trim();
    
    // Also check if fileName looks like a fileKey (long alphanumeric string without spaces)
    const looksLikeFileKey = finalFileName && typeof finalFileName === 'string' &&
                             finalFileName.length > 20 && 
                             /^[a-zA-Z0-9]+$/.test(finalFileName.trim());
    
    if (!finalFileName || typeof finalFileName !== 'string' || finalFileName.trim() === '' || 
        finalFileName === 'Untitled' || isFileNameSameAsFileKey || looksLikeFileKey) {
      
      // If fileName is same as fileKey or looks like a fileKey, generate a better name
      if (isFileNameSameAsFileKey || looksLikeFileKey) {
        // Generate a name based on date/time since fileKey is not a good display name
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '');
        finalFileName = `Figma_Index_${timestamp}_${timeStr}`;
        console.log(`⚠️ fileName is same as fileKey or looks like fileKey (${fileName}), using generated name: ${finalFileName}`);
      } else if (!finalFileName || finalFileName.trim() === '' || finalFileName === 'Untitled') {
        // Generate a meaningful name if fileName is missing or 'Untitled'
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '');
        finalFileName = `Figma_Index_${timestamp}_${timeStr}`;
        console.log(`⚠️ fileName is missing or 'Untitled', using generated name: ${finalFileName}`);
      }
    }
    
    // Ensure fileName is not empty after processing
    if (!finalFileName || finalFileName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid fileName',
        details: 'Could not determine a valid file name',
        receivedValue: fileName || 'missing'
      });
    }

    // Extract categorized tags from frames
    const allFrameTags = new Set<string>(); // legacy/global
    const allCustomTags = new Set<string>();
    const allNamingTags = new Set<string>();
    const allSizeTags = new Set<string>();
    
    pages.forEach((page: any) => {
      if (page.frames && Array.isArray(page.frames)) {
        page.frames.forEach((frame: any) => {
          const ft: string[] = Array.isArray(frame.frameTags) ? frame.frameTags : (Array.isArray(frame.tags) ? frame.tags : []);
          const nameParts = deriveNamingTags(frame.name || '');
          const sizeTag = getSizeTag(frame.width, frame.height);
          // Categorize: naming from nameParts; sizeTag; the rest -> custom
          nameParts.forEach(t => allNamingTags.add(t));
          if (sizeTag) allSizeTags.add(sizeTag);
          // Custom tags: everything else from ft that is not a size tag and not inferred naming tag
          ft.forEach((t: string) => {
            if (t && typeof t === 'string') {
              const isSize = /^\d+x\d+$/i.test(t);
              if (!isSize && !nameParts.includes(t)) allCustomTags.add(t);
            }
          });
          // Keep legacy aggregation for compatibility
          ft.forEach((t: string) => t && allFrameTags.add(t));
        });
      }
    });
    
    // If no frame tags found, add default tags based on frame names
    if (allFrameTags.size === 0) {
      pages.forEach((page: any) => {
        if (page.frames && Array.isArray(page.frames)) {
          page.frames.forEach((frame: any) => {
            if (frame.name && (frame.name.includes('Web') || frame.name.includes('web'))) {
              allFrameTags.add('Web');
              // Also add the tag to the frame itself
              if (!frame.frameTags) {
                frame.frameTags = [];
              }
              frame.frameTags.push('Web');
            }
          });
        }
      });
    }
    
    // Always add Web tag to frames that contain "Web" in their name
    pages.forEach((page: any) => {
      if (page.frames && Array.isArray(page.frames)) {
        page.frames.forEach((frame: any) => {
          if (frame.name && (frame.name.includes('Web') || frame.name.includes('web'))) {
            allFrameTags.add('Web');
            // Also add the tag to the frame itself
            if (!frame.frameTags) {
              frame.frameTags = [];
            }
            if (!frame.frameTags.includes('Web')) {
              frame.frameTags.push('Web');
            }
          }
        });
      }
    });

    console.log('📤 Uploading index for user:', user.email);
    console.log('📋 Document ID:', documentId);
    console.log('🔑 File Key:', fileKey);
    console.log('📄 Pages count:', pages.length);
    console.log('🏷️ Naming tags:', Array.from(allNamingTags));
    console.log('🏷️ Size tags:', Array.from(allSizeTags));
    console.log('🏷️ Custom tags:', Array.from(allCustomTags));
    console.log('🏷️ Sample frame after processing:', pages[0]?.frames?.[0] ? {
      name: pages[0].frames[0].name,
      frameTags: pages[0].frames[0].frameTags,
      tags: pages[0].frames[0].tags
    } : 'No frames found');
    
    // Debug: Check all frames for tags
    console.log('🔍 Debugging all frames:');
    pages.forEach((page: any, pageIndex: number) => {
      if (page.frames && Array.isArray(page.frames)) {
        page.frames.forEach((frame: any, frameIndex: number) => {
          console.log(`Page ${pageIndex}, Frame ${frameIndex}:`, {
            name: frame.name,
            frameTags: frame.frameTags,
            tags: frame.tags,
            hasWebInName: frame.name && (frame.name.includes('Web') || frame.name.includes('web'))
          });
        });
      }
    });
    
    // Calculate total data size
    const totalFrames = pages.reduce((sum: number, page: any) => sum + (page.frames ? page.frames.length : 0), 0);
    const requestSize = JSON.stringify(req.body).length;
    const sizeInMB = (requestSize / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Upload stats: ${totalFrames} frames, ${sizeInMB}MB`);
    
    if (parseFloat(sizeInMB) > 10) {
      console.log(`⚠️ Large upload detected - this may take several minutes`);
    }
    
    const startTime = Date.now();
    
    // Debug: Log the structure of the first page
    if (pages.length > 0) {
      console.log('🔍 First page structure:', {
        id: pages[0].id,
        name: pages[0].name,
        frames_count: (pages[0].frames && pages[0].frames.length) || 0,
        first_frame: (pages[0].frames && pages[0].frames[0]) ? {
          id: pages[0].frames[0].id,
          name: pages[0].frames[0].name,
          has_image: !!pages[0].frames[0].image,
          has_texts: !!pages[0].frames[0].texts
        } : 'no frames'
      });
    }

    // Ensure fileKey is valid - use documentId as fallback if fileKey is missing/invalid
    const validFileKey = (fileKey && typeof fileKey === 'string' && fileKey.trim().length > 0 && fileKey.trim().toLowerCase() !== 'unknown') 
      ? fileKey.trim() 
      : `unknown_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; // Unique identifier for unknown files
    
    // Check if this is a chunked upload
    const isChunk = documentId && typeof documentId === 'string' && documentId.includes('-chunk');
    
    // Calculate file size from index_data (in bytes)
    // Use file_size from request if provided, otherwise calculate it
    const fileSizeBytes = (fileSizeFromRequest && typeof fileSizeFromRequest === 'number' && fileSizeFromRequest > 0)
      ? fileSizeFromRequest
      : Buffer.byteLength(JSON.stringify(pages), 'utf8');
    
    console.log('📏 File size calculation:', {
      fromRequest: fileSizeFromRequest,
      calculated: Buffer.byteLength(JSON.stringify(pages), 'utf8'),
      final: fileSizeBytes
    });
    
    // Use the processed fileName (already validated and fixed above)
    console.log('💾 Inserting index data:', {
      user_id: user.id,
      user_email: user.email,
      project_id: documentId,
      figma_file_key: validFileKey,
      original_fileKey: fileKey,
      file_name: finalFileName,
      file_size_bytes: fileSizeBytes,
      pages_count: pages.length,
      frame_tags: Array.from(allFrameTags),
      custom_tags: Array.from(allCustomTags),
      uploaded_at: uploadedAt || new Date().toISOString()
    });
    
    // Try to insert with tags first, fallback to basic insert if columns don't exist
    let insertData: any = {
      user_id: user.id,
      project_id: documentId,
      figma_file_key: validFileKey,
      file_name: finalFileName,
      index_data: pages,
      uploaded_at: uploadedAt || new Date().toISOString(),
      file_size: fileSizeBytes // Add file size in bytes
    };
    
    console.log('📋 Insert data prepared:', {
      user_id: insertData.user_id,
      user_id_type: typeof insertData.user_id,
      user_email: user.email,
      project_id: insertData.project_id,
      figma_file_key: insertData.figma_file_key,
      file_name: insertData.file_name,
      file_size: insertData.file_size,
      file_size_bytes: fileSizeBytes
    });
    
    // Try to add tags if columns exist
    try {
      insertData.frame_tags = Array.from(allFrameTags);
      insertData.custom_tags = Array.from(allCustomTags);
      insertData.naming_tags = Array.from(allNamingTags);
      insertData.size_tags = Array.from(allSizeTags);
    } catch (e) {
      console.log('⚠️ Tags columns not available, inserting without tags');
    }
    
    // Use admin client to ensure user_id is always set correctly (bypasses RLS)
    let data: any = null;
    const { data: indexData, error: insertError } = await supabaseAdmin
      .from('index_files')
      .insert(insertData)
      .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at, file_size, index_data')
      .single();
    
    if (!insertError && indexData) {
      data = indexData;
      console.log('✅ Index inserted successfully:', {
        id: data.id,
        user_id: data.user_id,
        user_id_type: typeof data.user_id,
        file_name: data.file_name,
        file_size: data.file_size || 'not set',
        project_id: data.project_id
      });
    }

    if (insertError) {
      console.error('❌ Error inserting index:', insertError);
      console.error('❌ Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // If the error is about missing columns, try without problematic columns
      const isMissingColumnError = insertError.message.includes('custom_tags') ||
        insertError.message.includes('frame_tags') ||
        insertError.message.includes('naming_tags') ||
        insertError.message.includes('size_tags') ||
        insertError.message.includes('file_size');
      
      if (isMissingColumnError) {
        console.log('🔄 Retrying insert without problematic columns...');
        
        // Try without tags and file_size
        const basicInsertData: any = {
          user_id: user.id,
          project_id: documentId,
          figma_file_key: validFileKey,
          file_name: finalFileName,
          index_data: pages,
          uploaded_at: uploadedAt || new Date().toISOString()
        };
        
        // Only add file_size if the error wasn't about file_size
        if (!insertError.message.includes('file_size')) {
          basicInsertData.file_size = fileSizeBytes;
        }
        
        // Choose select fields based on whether file_size column exists
        const retrySelectWithSize = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at, file_size, index_data';
        const retrySelectNoSize   = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at, index_data';
        const retrySelect = insertError.message.includes('file_size') ? retrySelectNoSize : retrySelectWithSize;
        const { data: retryData, error: retryError } = await (supabaseAdmin as any)
          .from('index_files')
          .insert(basicInsertData)
          .select(retrySelect as any)
          .single();
        
        if (retryError) {
          // If still failing and it's about file_size, try once more without it
          if (retryError.message.includes('file_size') && basicInsertData.file_size !== undefined) {
            console.log('🔄 Retrying insert without file_size column...');
            delete basicInsertData.file_size;
            
            const finalSelect = retryError.message.includes('file_size') ? retrySelectNoSize : retrySelectWithSize;
            const { data: finalRetryData, error: finalRetryError } = await (supabaseAdmin as any)
              .from('index_files')
              .insert(basicInsertData)
              .select(finalSelect as any)
              .single();

            if (finalRetryError) {
              console.error('❌ Error inserting index after final retry:', finalRetryError);
              return res.status(500).json({
                success: false,
                error: 'Failed to save index to database',
                details: finalRetryError.message
              });
            }
            console.log(`✅ Index uploaded successfully (after final retry without file_size): ${finalRetryData.id}`);
            console.log('✅ Index data after retry:', {
              id: finalRetryData.id,
              user_id: finalRetryData.user_id,
              file_name: finalRetryData.file_name,
              file_size: finalRetryData.file_size || 'not set'
            });
            data = finalRetryData;
          } else {
            console.error('❌ Retry insert also failed:', retryError);
            return res.status(500).json({
              success: false,
              error: 'Failed to save index to database',
              details: retryError.message
            });
          }
        } else {
          console.log('✅ Successfully inserted without problematic columns');
          console.log('✅ Inserted index data:', {
            id: retryData.id,
            user_id: retryData.user_id,
            user_id_type: typeof retryData.user_id,
            user_email: user.email,
            project_id: retryData.project_id,
            figma_file_key: retryData.figma_file_key,
            file_name: retryData.file_name,
            file_size: retryData.file_size || 'not set'
          });
          // Use the retry data
          data = retryData;
        }
      } else {
        // Original error was not about missing columns, re-throw
        return res.status(500).json({
          success: false,
          error: 'Failed to upload index',
          details: insertError.message
        });
      }
    }
    
    // Continue with success response
    if (!data) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload index',
        details: 'No data returned from database'
      });
    }
    
    console.log(`✅ Index uploaded successfully: ${data.id}`);
    console.log('📊 Final index data:', {
      id: data.id,
      user_id: data.user_id,
      user_id_type: typeof data.user_id,
      user_email: user.email,
      file_name: data.file_name,
      file_size: data.file_size || 'not set',
      project_id: data.project_id,
      figma_file_key: data.figma_file_key
    });
    
    // Verify user_id was saved correctly
    if (!data.user_id || data.user_id !== user.id) {
      console.error('⚠️ WARNING: user_id mismatch or missing!', {
        expected_user_id: user.id,
        saved_user_id: data.user_id,
        user_email: user.email
      });
    }
    
    // If file_size is missing, try to update it
    if (!data.file_size || data.file_size === null || data.file_size === 0) {
      console.log('⚠️ file_size is missing, attempting to update...');
      try {
        const { error: updateError } = await supabaseAdmin
          .from('index_files')
          .update({ file_size: fileSizeBytes })
          .eq('id', data.id);
        
        if (updateError) {
          console.error('❌ Error updating file_size:', updateError);
        } else {
          console.log(`✅ Updated file_size for index ${data.id}: ${fileSizeBytes} bytes`);
          // Update data object with new file_size
          data.file_size = fileSizeBytes;
        }
      } catch (updateErr) {
        console.error('❌ Exception updating file_size:', updateErr);
      }
    }
    
    // Delete old indices for this file AFTER successful upload (keep only latest version)
    // Strategy: Delete by user_id + fileKey (fileKey is the unique identifier for a Figma file)
    // IMPORTANT: Never delete chunks here (they are managed separately)
    // IMPORTANT: Don't delete the index we just inserted (exclude by id)
    if (!isChunk && data && data.id) {
      const originalFileKeyIsValid = fileKey && typeof fileKey === 'string' && fileKey.trim().length > 0 && fileKey.trim().toLowerCase() !== 'unknown';
      
      if (originalFileKeyIsValid) {
        // Delete old indices by user_id + fileKey, but exclude the one we just inserted
        console.log('🗑️ Deleting old indices by user_id + fileKey (excluding newly inserted):', { 
          fileKey, 
          excludeId: data.id 
        });
        const deleteResult = await supabaseAdmin
          .from('index_files')
          .delete()
          .eq('user_id', user.id)
          .eq('figma_file_key', fileKey)
          .neq('id', data.id) // Don't delete the index we just inserted
          .not('file_name', 'like', '%(Part %/%)%'); // Don't delete chunks
        
        if (deleteResult.error) {
          console.error('❌ Error deleting old indices:', deleteResult.error);
          // Don't fail the request - the new index was inserted successfully
        } else {
          console.log(`✅ Deleted old indices for fileKey: ${fileKey} (kept new index: ${data.id})`);
        }
      } else {
        console.warn('⚠️ Cannot delete old indices - fileKey is invalid/unknown', {
          fileKey: fileKey,
          fileKeyIsValid: originalFileKeyIsValid
        });
        console.warn('⚠️ Old indices will remain (fileKey must be valid to auto-replace)');
      }
    } else if (isChunk) {
      console.log('📦 Chunked upload detected, skipping delete (chunks will be merged after all parts are uploaded)');
      console.log('📦 Checking for merge...');
      await mergeChunksIfComplete(user.id, validFileKey, validFileKey, documentId);
    } else {
      try {
        const syncId = `upload-legacy:${user.id}:${validFileKey}:${Date.now()}`;
        await syncNormalizedIndexChunk({
          supabaseAdmin,
          owner: { type: 'user', userId: user.id },
          fileKey: validFileKey,
          projectId: documentId,
          fileName: finalFileName,
          coverImageUrl: null,
          pages: pages.map((page: any) => ({
            id: page?.id,
            pageId: page?.id,
            name: page?.name,
            pageName: page?.name,
            frames: Array.isArray(page?.frames)
              ? page.frames.map((frame: any) => ({
                  ...frame,
                  image: typeof frame?.image === 'string' ? frame.image : null,
                  thumb_url: typeof frame?.thumb_url === 'string' ? frame.thumb_url : null,
                  frameTags: Array.isArray(frame?.frameTags)
                    ? frame.frameTags
                    : Array.isArray(frame?.tags)
                      ? frame.tags
                      : [],
                  customTags: Array.isArray(frame?.customTags) ? frame.customTags : [],
                }))
              : [],
          })),
          syncId,
          finalizePageIds: pages.map((page: any) => String(page?.id || '')).filter(Boolean),
        });
      } catch (normalizedSyncError: any) {
        console.error('❌ Failed to sync normalized legacy upload state:', normalizedSyncError?.message || normalizedSyncError);
        return res.status(500).json({
          success: false,
          error: 'Failed to sync normalized index state',
          details: normalizedSyncError?.message || 'Unknown normalized sync error'
        });
      }
    }

    // Calculate total frames count from pages for response
    console.log('🔍 Calculating frames count from pages:', {
      pagesCount: pages.length,
      firstPageHasFrames: pages[0]?.frames ? 'yes' : 'no',
      firstPageFramesCount: pages[0]?.frames?.length || 0,
      firstPageStructure: pages[0] ? Object.keys(pages[0]) : 'no pages'
    });
    
    const responseFramesCount = pages.reduce((count: number, page: any) => {
      if (page && page.frames && Array.isArray(page.frames)) {
        return count + page.frames.length;
      }
      return count;
    }, 0);
    
    // Calculate size in MB for response
    const responseSizeMB = data.file_size ? parseFloat((data.file_size / 1024 / 1024).toFixed(2)) : 0;
    
    console.log('📤 Response data:', {
      frames: responseFramesCount,
      sizeMB: responseSizeMB,
      fileSizeBytes: data.file_size,
      pagesCount: pages.length,
      isChunk: isChunk
    });
    
    const responseData = {
      success: true,
      message: 'Index uploaded successfully',
      projectId: data.project_id,
      indexId: data.id,
      userId: data.user_id, // Include user_id in response for debugging
      fileName: data.file_name,
      fileSize: data.file_size || null,
      frames: responseFramesCount, // Add frames count
      size: responseSizeMB // Add size in MB (for compatibility with plugin)
    };
    
    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));
    
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('💥 Upload index error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
