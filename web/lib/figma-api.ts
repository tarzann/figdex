/**
 * Figma REST API Helper Functions
 * 
 * Functions to interact with Figma REST API to fetch file data,
 * extract frames, text, and images for index creation.
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFileResponse {
  document: FigmaNode;
  name: string;
  lastModified: string;
  version: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  characters?: string; // For TEXT nodes
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FigmaNodesResponse {
  nodes: Record<string, { document: FigmaNode }>;
}

export interface FigmaImagesResponse {
  images: Record<string, string | null>; // node_id -> image_url
  error?: boolean;
  status?: number;
}

export interface FrameData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  textContent: string;
  searchTokens: string[];
  tags: string[];
  url: string;
  pageName: string;
  figmaImageUrl?: string | null;
  storage_path?: string | null;
  image_url?: string | null;
  sectionName?: string;
}

/**
 * Fetch file structure from Figma API
 * @param fileKey - Figma file key
 * @param token - Figma Personal Access Token
 * @param lightweight - If true, only fetch minimal data (page names, no geometry) for faster response
 */
export async function fetchFigmaFile(
  fileKey: string,
  token: string,
  lightweight: boolean = false
): Promise<FigmaFileResponse> {
  // For lightweight mode (validate only), use query params to reduce response size
  // geometry=false: Don't include geometry data
  // depth=1: Only get top-level nodes (pages)
  const queryParams = lightweight 
    ? '?geometry=false&depth=1'
    : '';
  const url = `${FIGMA_API_BASE}/files/${fileKey}${queryParams}`;
  
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'X-Figma-Token': token,
      },
      // Add timeout signal for very large files
      // Use 28 seconds to allow maximum time while staying under Vercel's 30s limit
      signal: AbortSignal.timeout(45000), // 28 seconds timeout
    });
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('Request to Figma API timed out. The file may be too large. Please try with a smaller file.');
    }
    throw new Error(`Failed to fetch file from Figma API: ${error.message}`);
  }

  if (!response.ok) {
    let errorText: string;
    try {
      errorText = await response.text();
    } catch {
      errorText = `HTTP ${response.status}`;
    }
    
    if (response.status === 404) {
      throw new Error('File not found. Please check the file key.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. Please check your Personal Access Token and file permissions.');
    }
    if (response.status === 504 || response.status === 408) {
      throw new Error('Request to Figma API timed out. The file may be too large. Please try with a smaller file.');
    }
    throw new Error(`Figma API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  let jsonData: FigmaFileResponse;
  try {
    jsonData = await response.json();
  } catch (error: any) {
    const text = await response.text().catch(() => 'Unable to read response');
    throw new Error(`Failed to parse response from Figma API: ${error.message}. Response: ${text.substring(0, 200)}`);
  }

  return jsonData;
}

/**
 * Recursively find all FRAME nodes (excluding SECTIONS)
 * Similar to plugin's findAllFrames function
 */
export interface FrameNodeInfo {
  node: FigmaNode;
  pageName: string;
  pageId?: string;
  sectionId?: string;
  sectionName?: string;
}

// Simple recursive function to find all FRAME nodes, similar to plugin's findAllFrames
export function collectFrameNodes(
  node: FigmaNode,
  currentPageName = 'Unknown Page',
  nodes: FrameNodeInfo[] = [],
  currentPageId?: string,
  parentType: string = 'DOCUMENT',
  currentSectionId?: string,
  currentSectionName?: string,
  debugLog?: (msg: string) => void,
): FrameNodeInfo[] {
  // Simple check: if it's a FRAME type, add it (like the plugin does)
  // Skip sections by name check
  const isFrame = node.type === 'FRAME';
  const isNotSection = (node.name || '').trim().toLowerCase() !== 'section';
  const isVisible = node.visible !== false;
  
  if (isFrame && isNotSection && isVisible) {
    debugLog?.(`  ✅ Found FRAME: ${node.name || 'Unnamed'} (${node.id}) - section: ${currentSectionName || 'none'}`);
    nodes.push({
      node,
      pageName: currentPageName,
      pageId: currentPageId,
      sectionId: currentSectionId,
      sectionName: currentSectionName,
    });
  }

  // Recursively process all children (like the plugin does)
  if (node.children) {
    debugLog?.(`  🔍 Recurse into ${node.type} "${node.name || 'Unnamed'}" - ${node.children.length} children`);
    for (const child of node.children) {
      // Update section info if child is a SECTION
      let nextSectionId = currentSectionId;
      let nextSectionName = currentSectionName;
      
      if (child.type === 'SECTION') {
        nextSectionId = child.id;
        nextSectionName = child.name || undefined;
        debugLog?.(`  📦 Found SECTION: ${nextSectionName} (${nextSectionId})`);
      }
      
      // Recursively process child
      collectFrameNodes(
        child,
        currentPageName,
        nodes,
        currentPageId,
        node.type,
        nextSectionId,
        nextSectionName,
        debugLog,
      );
    }
  } else {
    debugLog?.(`  📭 No children for ${node.type} "${node.name || 'Unnamed'}"`);
  }

  return nodes;
}

/**
 * Recursively extract text content from a node
 * Similar to plugin's findAllTexts function
 */
export function extractTextFromNode(node: FigmaNode): string[] {
  const texts: string[] = [];

  // If this is a TEXT node with characters, add it
  if (node.type === 'TEXT' && node.characters) {
    texts.push(node.characters);
  }

  // Recursively process children
  if (node.children) {
    for (const child of node.children) {
      texts.push(...extractTextFromNode(child));
    }
  }

  return texts;
}

/**
 * Get ancestor names (parent nodes) for search enhancement
 * Simplified version - returns empty array for now
 */
export function collectAncestorNames(
  node: FigmaNode,
  document: FigmaNode,
  maxDepth: number = 50
): string[] {
  // For now, return empty array since we'd need to traverse the full tree
  // This can be enhanced later if needed
  return [];
}

/**
 * Get image URLs for multiple nodes
 */
export async function getFrameImageUrls(
  fileKey: string,
  nodeIds: string[],
  token: string,
  scale: number = 0.3,
  format: 'png' | 'jpg' = 'png'
): Promise<FigmaImagesResponse> {
  if (nodeIds.length === 0) {
    return { images: {} };
  }

  // Figma API allows up to 200 node IDs per request
  const MAX_NODES_PER_REQUEST = 200;
  const allImages: Record<string, string | null> = {};

  // Process in batches
  for (let i = 0; i < nodeIds.length; i += MAX_NODES_PER_REQUEST) {
    const batch = nodeIds.slice(i, i + MAX_NODES_PER_REQUEST);
    const idsParam = batch.join(',');

    const url = `${FIGMA_API_BASE}/images/${fileKey}?ids=${idsParam}&format=${format}&scale=${scale}`;

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': token,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching images for batch: ${response.status} - ${errorText}`);
      // Continue with other batches, mark these as null
      batch.forEach(id => {
        allImages[id] = null;
      });
      continue;
    }

    const data: FigmaImagesResponse = await response.json();
    Object.assign(allImages, data.images);

    // Rate limiting: wait a bit between batches
    if (i + MAX_NODES_PER_REQUEST < nodeIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { images: allImages };
}

/**
 * Download image from URL and convert to base64
 */
export async function downloadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Determine MIME type from URL or default to PNG
    const mimeType = url.includes('.jpg') || url.includes('.jpeg') ? 'image/jpeg' : 'image/png';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

/**
 * Get file thumbnail URL by fetching the first frame from the first page
 * @param fileKey - Figma file key
 * @param token - Figma Personal Access Token
 * @param scale - Image scale (0.1 to 4, default 0.5 for thumbnail)
 * @returns Thumbnail URL or null if no frames found
 */
export async function getFileThumbnailUrl(
  fileKey: string,
  token: string,
  scale: number = 0.5
): Promise<string | null> {
  try {
    console.log(`[getFileThumbnailUrl] Starting thumbnail fetch for file ${fileKey}`);
    
    // First, fetch file structure in lightweight mode to get page IDs
    const figmaFile = await fetchFigmaFile(fileKey, token, true);
    console.log(`[getFileThumbnailUrl] File fetched: ${figmaFile.name}, pages: ${figmaFile.document.children?.length || 0}`);
    
    // Find first page
    const pages = figmaFile.document.children || [];
    if (pages.length === 0) {
      console.log(`[getFileThumbnailUrl] ❌ No pages found in file ${fileKey}`);
      return null;
    }
    
    const firstPage = pages[0];
    const pageId = firstPage.id;
    console.log(`[getFileThumbnailUrl] Using first page: ${firstPage.name || 'Unknown'} (${pageId})`);
    
    // Fetch full page structure using nodes endpoint to get frames
    const nodesUrl = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${pageId}`;
    const nodesResponse = await fetch(nodesUrl, {
      headers: {
        'X-Figma-Token': token,
      },
    });
    
    if (!nodesResponse.ok) {
      console.error(`[getFileThumbnailUrl] ❌ Failed to fetch nodes: ${nodesResponse.status}`);
      return null;
    }
    
    const nodesData: FigmaNodesResponse = await nodesResponse.json();
    const pageNode = nodesData.nodes[pageId]?.document;
    
    if (!pageNode || !pageNode.children) {
      console.log(`[getFileThumbnailUrl] ⚠️ Page node has no children`);
      return null;
    }
    
    // Collect frames from the page
    const frameNodes = collectFrameNodes(pageNode, firstPage.name || 'Unknown Page', [], pageId);
    console.log(`[getFileThumbnailUrl] Found ${frameNodes.length} frames in page "${firstPage.name || 'Unknown'}"`);
    
    if (frameNodes.length > 0) {
      // Get thumbnail of first frame
      const firstFrame = frameNodes[0];
      console.log(`[getFileThumbnailUrl] Getting image for first frame: ${firstFrame.node.id}`);
      
      const imageResponse = await getFrameImageUrls(
        fileKey,
        [firstFrame.node.id],
        token,
        scale,
        'png'
      );
      
      const thumbnailUrl = imageResponse.images[firstFrame.node.id];
      if (thumbnailUrl) {
        console.log(`[getFileThumbnailUrl] ✅ Thumbnail URL obtained: ${thumbnailUrl.substring(0, 60)}...`);
        return thumbnailUrl;
      } else {
        console.log(`[getFileThumbnailUrl] ⚠️ No thumbnail URL in response for frame ${firstFrame.node.id}`);
      }
    } else {
      console.log(`[getFileThumbnailUrl] ❌ No frames found in first page`);
    }
    
    // No frames found
    console.log(`[getFileThumbnailUrl] ❌ No frames found in file ${fileKey}`);
    return null;
  } catch (error: any) {
    console.error(`[getFileThumbnailUrl] ❌ Error getting file thumbnail:`, error.message);
    return null;
  }
}

/**
 * Normalize and tokenize text for search
 * Similar to plugin's buildSearchTokens function
 */
export function buildSearchTokens(rawTexts: string[]): string[] {
  try {
    const joined = Array.isArray(rawTexts) ? rawTexts.join(' ') : String(rawTexts || '');
    
    // Normalize whitespace and punctuation, lowercase
    const normalized = joined
      .toLowerCase()
      .replace(/\n+/g, ' ')
      // Remove characters that are not letters/numbers/underscore/hyphen/space
      .replace(/[^A-Za-z0-9_\-\s\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF]/g, ' ')
      .replace(/\s+/g, ' ') // collapse spaces
      .trim();

    if (!normalized) return [];

    const tokens = normalized.split(' ');
    // Remove very short tokens and duplicates
    const filtered = tokens.filter(t => t && t.length >= 2);
    return Array.from(new Set(filtered)).slice(0, 500); // cap to 500 tokens per frame
  } catch (e) {
    return [];
  }
}

/**
 * Process a single frame node into FrameData
 */
export async function processFrameData(
  frameNode: FigmaNode,
  frameIndex: number,
  fileKey: string,
  document: FigmaNode,
  imageUrl: string | null,
  existingTags: string[] = [],
  pageName: string = 'Unknown Page',
  sectionName?: string
): Promise<FrameData> {
  const bbox = frameNode.absoluteBoundingBox;
  const width = bbox ? Math.round(bbox.width) : 0;
  const height = bbox ? Math.round(bbox.height) : 0;
  const x = bbox ? Math.round(bbox.x) : 0;
  const y = bbox ? Math.round(bbox.y) : 0;

  // Extract text content
  const visibleTexts = extractTextFromNode(frameNode);
  const ancestorNames = collectAncestorNames(frameNode, document);
  const namesBundle = [frameNode.name || '', sectionName || '', ...ancestorNames];
  const allTexts = [...visibleTexts, ...namesBundle];
  const textContent = allTexts.join(' ');
  const searchTokens = buildSearchTokens(allTexts);

  // Build URL
  const url = `https://www.figma.com/file/${fileKey}?node-id=${frameNode.id.replace(/:/g, '%3A')}`;

  // Add automatic size tag
  const sizeTag = `${width}x${height}`;
  const tags = [...existingTags, sizeTag];
  const uniqueTags = Array.from(new Set(tags));

  return {
    id: frameNode.id,
    name: frameNode.name || 'Untitled',
    x,
    y,
    width,
    height,
    index: frameIndex,
    textContent,
    searchTokens,
    figmaImageUrl: imageUrl,
    tags: uniqueTags,
    url,
    pageName,
  };
}

/**
 * Group frames into pages (20 frames per page)
 * Similar to plugin's grouping logic
 */
export function groupFramesIntoPages(frames: FrameData[]): Array<{
  id: string;
  name: string;
  frames: FrameData[];
}> {
  const pages: Array<{ id: string; name: string; frames: FrameData[] }> = [];
  const framesPerPage = 20;

  for (let i = 0; i < frames.length; i += framesPerPage) {
    const pageFrames = frames.slice(i, i + framesPerPage);
    pages.push({
      id: `page_${Math.floor(i / framesPerPage)}`,
      name: `Page ${Math.floor(i / framesPerPage) + 1}`,
      frames: pageFrames,
    });
  }

  return pages;
}

/**
 * Validate Figma Personal Access Token by making a test API call
 */
export async function validateFigmaToken(token: string): Promise<boolean> {
  try {
    // Try to fetch user info (lightweight endpoint)
    const response = await fetch(`${FIGMA_API_BASE}/me`, {
      headers: {
        'X-Figma-Token': token,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}

/**
 * Extract file key from Figma URL
 * Supports both old format: /file/{key} and new format: /design/{key}
 */
export function extractFileKeyFromUrl(url: string): string | null {
  // Pattern: https://www.figma.com/file/{file_key}/... or /design/{file_key}/...
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

