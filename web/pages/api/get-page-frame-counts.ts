import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchFigmaFile, type FigmaNode } from '../../lib/figma-api';

const ALLOWED_FRAME_PARENTS = new Set(['PAGE', 'CANVAS', 'SECTION']);

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
      (current.visible === undefined || current.visible !== false);

    if (isEligibleFrame) {
      count += 1;
    }

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
  console.log(`[get-page-frame-counts] ${req.method} request received`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log(`[get-page-frame-counts] OPTIONS request - returning 200`);
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.error(`[get-page-frame-counts] Method not allowed: ${req.method}`);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST'],
      receivedMethod: req.method,
    });
  }
  
  console.log(`[get-page-frame-counts] Processing POST request`);

  try {
    const { fileKey, figmaToken, pageIds } = req.body;

    console.log(`[get-page-frame-counts] Received:`, {
      fileKey: fileKey ? `${fileKey.substring(0, 10)}...` : 'missing',
      figmaToken: figmaToken ? `${figmaToken.substring(0, 10)}...` : 'missing',
      pageIdsCount: Array.isArray(pageIds) ? pageIds.length : 'not an array',
    });

    if (!fileKey || !figmaToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileKey and figmaToken',
      });
    }

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'pageIds must be a non-empty array',
      });
    }

    console.log(`[get-page-frame-counts] Fetching file from Figma API...`);
    // Fetch full file structure
    const figmaFile = await fetchFigmaFile(fileKey, figmaToken, false);
    console.log(`[get-page-frame-counts] File fetched successfully: ${figmaFile.name}`);

    // Get all pages
    const allPages = (figmaFile.document.children || [])
      .filter((child) => child.type === 'PAGE' || child.type === 'CANVAS');

    // Filter to requested pages
    const requestedPages = allPages.filter((page) => pageIds.includes(page.id));

    if (requestedPages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching pages found for the provided pageIds',
      });
    }

    // Count frames for each requested page
    const pageCounts = requestedPages.map((page) => ({
      pageId: page.id,
      frameCount: countEligibleFrames(page, 'PAGE'),
    }));

    // Add missing pages with 0 count
    const foundPageIds = new Set(requestedPages.map((p) => p.id));
    const missingPages = pageIds
      .filter((id) => !foundPageIds.has(id))
      .map((pageId) => ({ pageId, frameCount: 0 }));

    return res.status(200).json({
      success: true,
      pageCounts: [...pageCounts, ...missingPages],
    });
  } catch (error: any) {
    console.error('Error in get-page-frame-counts:', error);
    
    // If timeout, return 0 for all pages (user can still proceed)
    if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      const { pageIds } = req.body;
      if (Array.isArray(pageIds)) {
        return res.status(200).json({
          success: true,
          pageCounts: pageIds.map((pageId: string) => ({ pageId, frameCount: 0 })),
          warning: 'File is too large to count frames quickly. Frame counts will be calculated during index creation.',
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

