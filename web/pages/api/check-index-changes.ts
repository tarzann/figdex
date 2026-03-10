import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchFigmaFile, collectFrameNodes } from '../../lib/figma-api';
import { validateFigmaToken } from '../../lib/figma-api';

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
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const requestId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n🔍 [${requestId}] ===== check-index-changes START =====`);

  try {
    // Get Supabase client
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceUrl || !serviceKey) {
      console.error(`[${requestId}] ❌ Missing Supabase configuration`);
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }

    const apiKey = authHeader.substring(7).trim();
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'Missing API key' });
    }

    // Get user from API key
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, is_admin')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (userError || !user) {
      console.error(`[${requestId}] ❌ User lookup error:`, userError);
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    console.log(`[${requestId}] ✅ User authorized:`, { id: user.id, email: user.email });

    // Get request body
    const { fileKey, figmaToken } = req.body;

    if (!fileKey || !figmaToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileKey and figmaToken',
      });
    }

    // Validate Figma token
    console.log(`[${requestId}] 🔐 Validating Figma token...`);
    const isValidToken = await validateFigmaToken(figmaToken);
    if (!isValidToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Figma Personal Access Token',
      });
    }

    // Fetch current file info from Figma (lightweight)
    console.log(`[${requestId}] 📥 Fetching current file info from Figma...`);
    let currentFile;
    try {
      currentFile = await fetchFigmaFile(fileKey, figmaToken, true); // lightweight mode
      console.log(`[${requestId}] ✅ File fetched: ${currentFile.name}`);
    } catch (error: any) {
      console.error(`[${requestId}] ❌ Error fetching file:`, error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch file from Figma API',
      });
    }

    // Get existing index and related job (to get selected pages)
    const { data: existingIndex, error: indexError } = await supabaseAdmin
      .from('index_files')
      .select('id, figma_version, figma_last_modified, frame_ids, file_name')
      .eq('user_id', user.id)
      .eq('figma_file_key', fileKey)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get the job that created this index to find selected pages
    // Try to find job by index_file_id first, then fall back to file_key + user_id
    let selectedPageIds: string[] | null = null;
    let selectedPageNames: string[] | null = null;
    if (existingIndex) {
      // First try: find job that directly references this index
      let { data: relatedJob } = await supabaseAdmin
        .from('index_jobs')
        .select('selected_page_ids, selected_pages')
        .eq('index_file_id', existingIndex.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Second try: find latest job for this file_key + user_id (may not have index_file_id set yet)
      if (!relatedJob) {
        const { data: latestJob } = await supabaseAdmin
          .from('index_jobs')
          .select('selected_page_ids, selected_pages, created_at')
          .eq('file_key', fileKey)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        relatedJob = latestJob;
      }
      
      if (relatedJob) {
        selectedPageIds = relatedJob.selected_page_ids || null;
        selectedPageNames = relatedJob.selected_pages || null;
        console.log(`[${requestId}] 📄 Found selected pages from job:`, {
          pageIds: selectedPageIds,
          pageNames: selectedPageNames,
        });
      } else {
        console.log(`[${requestId}] ⚠️ No job found for this index - will check all pages (fallback)`);
      }
    }

    if (indexError) {
      console.error(`[${requestId}] ❌ Error fetching existing index:`, indexError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch existing index',
      });
    }

    // If no existing index, return early
    if (!existingIndex) {
      console.log(`[${requestId}] ℹ️ No existing index found`);
      return res.status(200).json({
        success: true,
        hasChanges: false,
        changeType: 'none',
        recommendation: 'skip',
        message: 'No existing index found for this file',
      });
    }

    const storedVersion = existingIndex.figma_version;
    const currentVersion = currentFile.version;
    const storedFrameIds = existingIndex.frame_ids || [];
    const storedFrameIdsSet = new Set(storedFrameIds);

    console.log(`[${requestId}] 📊 Comparison:`, {
      storedVersion,
      currentVersion,
      storedFrameCount: storedFrameIds.length,
    });

    // If stored version is missing (old index before migration), recommend full re-index
    if (!storedVersion || storedFrameIds.length === 0) {
      console.log(`[${requestId}] ⚠️ Index missing version info (old index), recommending full re-index`);
      return res.status(200).json({
        success: true,
        hasChanges: true,
        changeType: 'full',
        recommendation: 'full',
        newFrameCount: 0,
        removedFrameCount: 0,
        existingFrameCount: 0,
        storedVersion: storedVersion || 'N/A (old index)',
        currentVersion: currentVersion,
        storedFrameCount: storedFrameIds.length,
        currentFrameCount: 0,
        message: 'This index was created before version tracking was added. A full re-index is recommended to enable incremental updates.',
      });
    }

    // Compare versions
    if (storedVersion === currentVersion) {
      console.log(`[${requestId}] ✅ Versions match - no changes detected`);
      return res.status(200).json({
        success: true,
        hasChanges: false,
        changeType: 'none',
        recommendation: 'skip',
        storedVersion,
        currentVersion,
        message: 'File version unchanged - no re-indexing needed',
      });
    }

    // Version changed - compare frame lists
    console.log(`[${requestId}] 🔄 Version changed, comparing frame lists...`);
    
    // Collect current frames (lightweight - just IDs)
    // IMPORTANT: Only collect frames from selected pages if available (to match what was indexed)
    let currentFrameNodes: Array<{ node: any; pageName?: string; pageId?: string }> = [];
    
    if (selectedPageIds && selectedPageIds.length > 0) {
      // Filter frames by selected page IDs
      console.log(`[${requestId}] 📄 Filtering by selected page IDs:`, selectedPageIds);
      const allFrameNodes = collectFrameNodes(
        currentFile.document,
        'Unknown Page',
        [],
        undefined,
        'DOCUMENT'
      );
      currentFrameNodes = allFrameNodes.filter(node => 
        node.pageId && selectedPageIds!.includes(node.pageId)
      );
      console.log(`[${requestId}] 📊 Filtered frames from ${allFrameNodes.length} total to ${currentFrameNodes.length} frames in selected pages`);
    } else if (selectedPageNames && selectedPageNames.length > 0) {
      // Filter frames by selected page names
      console.log(`[${requestId}] 📄 Filtering by selected page names:`, selectedPageNames);
      const allFrameNodes = collectFrameNodes(
        currentFile.document,
        'Unknown Page',
        [],
        undefined,
        'DOCUMENT'
      );
      currentFrameNodes = allFrameNodes.filter(node => 
        node.pageName && selectedPageNames!.includes(node.pageName)
      );
      console.log(`[${requestId}] 📊 Filtered frames from ${allFrameNodes.length} total to ${currentFrameNodes.length} frames in selected pages`);
    } else {
      // No page selection info - collect all frames (fallback for old indices or plugin uploads)
      console.log(`[${requestId}] ⚠️ No selected pages info found, collecting all frames (fallback mode)`);
      currentFrameNodes = collectFrameNodes(
        currentFile.document,
        'Unknown Page',
        [],
        undefined,
        'DOCUMENT'
      );
    }
    
    const currentFrameIds = currentFrameNodes.map(node => node.node.id);
    const currentFrameIdsSet = new Set(currentFrameIds);

    // Find differences
    const newFrameIds = currentFrameIds.filter((id: string) => !storedFrameIdsSet.has(id));
    const removedFrameIds = storedFrameIds.filter((id: string) => !currentFrameIdsSet.has(id));
    const existingFrameIds = currentFrameIds.filter((id: string) => storedFrameIdsSet.has(id));

    const newFrameCount = newFrameIds.length;
    const removedFrameCount = removedFrameIds.length;
    const existingFrameCount = existingFrameIds.length;

    console.log(`[${requestId}] 📊 Frame comparison:`, {
      newFrames: newFrameCount,
      removedFrames: removedFrameCount,
      existingFrames: existingFrameCount,
      totalCurrent: currentFrameIds.length,
      totalStored: storedFrameIds.length,
    });

    // Determine change type and recommendation
    // IMPORTANT: Check new frames BEFORE removed frames, because adding a frame is more common
    let changeType: 'new_frames' | 'removed_frames' | 'content_changed' | 'full';
    let recommendation: 'skip' | 'incremental' | 'full';

    console.log(`[${requestId}] 🔍 Determining change type:`, {
      newFrameCount,
      removedFrameCount,
      existingFrameCount,
      totalCurrent: currentFrameIds.length,
      totalStored: storedFrameIds.length,
    });

    // If version changed but frame list is identical, content changed (frames modified without ID change)
    if (newFrameCount === 0 && removedFrameCount === 0 && existingFrameCount === storedFrameIds.length && existingFrameCount === currentFrameIds.length) {
      // Version changed but frame IDs are identical - content changed (frames modified)
      changeType = 'content_changed';
      recommendation = 'full';
      console.log(`[${requestId}] 📝 Detected: content_changed (version changed, IDs identical)`);
    } else if (newFrameCount > 0 && removedFrameCount === 0) {
      // Only new frames added - MOST COMMON CASE when user adds a frame
      changeType = 'new_frames';
      recommendation = 'incremental';
      console.log(`[${requestId}] ➕ Detected: new_frames (${newFrameCount} new, 0 removed)`);
    } else if (removedFrameCount > 0 && newFrameCount === 0) {
      // Only frames removed (no new ones)
      changeType = 'removed_frames';
      recommendation = 'incremental';
      console.log(`[${requestId}] ➖ Detected: removed_frames (${removedFrameCount} removed, 0 new)`);
    } else if (removedFrameCount > 0 && newFrameCount === removedFrameCount && storedFrameIds.length === currentFrameIds.length) {
      // Equal number of removed and added frames, same total count - likely frames were renamed/recreated (content changed)
      // This happens when you modify a frame and Figma creates a new ID
      changeType = 'content_changed';
      recommendation = 'full';
      console.log(`[${requestId}] 🔄 Detected: content_changed (equal removed/new, same total - frames recreated)`);
    } else if (newFrameCount > 0 || removedFrameCount > 0) {
      // Mixed changes (both added and removed, but not equal)
      changeType = 'full';
      // If changes are substantial (>50% of frames), recommend full re-index
      const changeRatio = (newFrameCount + removedFrameCount) / Math.max(storedFrameIds.length, 1);
      recommendation = changeRatio > 0.5 ? 'full' : 'incremental';
      console.log(`[${requestId}] 🔀 Detected: full (mixed changes: ${newFrameCount} new, ${removedFrameCount} removed, ratio: ${changeRatio.toFixed(2)})`);
    } else {
      // Fallback: if we got here, something changed but we're not sure what
      changeType = 'content_changed';
      recommendation = 'full';
      console.log(`[${requestId}] ❓ Detected: content_changed (fallback - unexpected state)`);
    }

    console.log(`[${requestId}] ✅ Change detection complete:`, {
      changeType,
      recommendation,
      newFrameCount,
      removedFrameCount,
      existingFrameCount,
    });

    return res.status(200).json({
      success: true,
      hasChanges: true,
      changeType,
      recommendation,
      newFrameCount,
      removedFrameCount,
      existingFrameCount,
      newFrameIds: newFrameIds.slice(0, 100), // Limit to first 100 for response size
      removedFrameIds: removedFrameIds.slice(0, 100),
      storedVersion,
      currentVersion,
      storedFrameCount: storedFrameIds.length,
      currentFrameCount: currentFrameIds.length,
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

