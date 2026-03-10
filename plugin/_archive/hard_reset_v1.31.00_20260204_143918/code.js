figma.showUI(__html__, { width: 386, height: 800 });
// Plugin version for runtime identification
const PLUGIN_VERSION = '1.31.00';
console.log('FigDex v' + PLUGIN_VERSION);
// Send version immediately
try {
  figma.ui.postMessage({ type: 'plugin-version', version: PLUGIN_VERSION });
} catch (e) {
  console.error(`❌ [code.js] Error sending plugin version:`, e);
}
// Also send version after a short delay to ensure UI is ready
setTimeout(() => {
  try {
    figma.ui.postMessage({ type: 'plugin-version', version: PLUGIN_VERSION });
  } catch (e) {
    console.error(`❌ [code.js] Error sending plugin version (retry):`, e);
  }
}, 500);

// Listen for selection changes
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  const hasSelection = selection.length > 0;
  const hasFrameSelection = selection.some(n => n.type === "FRAME");
  const selectedFrames = selection.filter(n => n.type === "FRAME").map(n => n.id);
  figma.ui.postMessage({ type: 'selection-status', hasSelection, hasFrameSelection, selectedFrames });
});

// Initialize Supabase client
const supabaseUrl = 'https://txbraavvjiriwfdlmcvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YnJhYXZ2amlyaXdmZGxtY3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTM2NDgsImV4cCI6MjA2OTk2OTY0OH0.bQMmj9D4KyXFvwJEVuT0cR4QuOaNobiX4yDj0hqQ5Lw';

// No local FigDex page: metadata stored in clientStorage only (see STORAGE_KEYS below).

// Simple Supabase client for auth (reads from clientStorage)
const supabase = {
  auth: {
    getSession: async () => {
      const tokens = await loadSupabaseTokensFromStorage();
      const accessToken = tokens.accessToken;
      const refreshToken = tokens.refreshToken;
      
      if (accessToken) {
      return {
          data: {
            session: {
              access_token: accessToken,
              refresh_token: refreshToken
            }
          },
          error: null
        };
      }
      
      return {
        data: { session: null },
        error: new Error('No session found')
      };
    }
  }
};

// Global variables
let globalFileKey = '';
// Send document ID to UI
const rootId = figma.root.id || '0:0';
figma.ui.postMessage({ type: 'set-document-id', documentId: rootId });

figma.on('currentpagechange', () => {
  const newRootId = figma.root.id || '0:0';
  figma.ui.postMessage({ type: 'set-document-id', documentId: newRootId });
});

let imageQuality;

// --- clientStorage (minimal metadata only; no images/frame content) ---
const STORAGE_KEYS = {
  FILE_KEY: 'fileKey',
  FILE_NAME: 'fileName',
  IMAGE_QUALITY: 'imageQuality',
  SELECTED_PAGES: 'selectedPages',
  EXCLUDED_PAGES: 'excludedPages',
  INDEXED_PAGES: 'indexedPages',
  FRAME_TAGS: 'frameTags',
  ALL_TAGS: 'allTags',
  WEB_TOKEN: 'webToken',
  WEB_USER: 'webUser',
  SUPABASE_TOKENS: 'supabaseTokens'
};
function storageKey(key) { return 'figdex_' + (figma.root.id || '0:0') + '_' + key; }
// File key and file name use a fixed key (no root.id) so they persist when document is saved and root.id changes from 0:0
function storageKeyForFileKey(key) {
  if (key === STORAGE_KEYS.FILE_KEY || key === STORAGE_KEYS.FILE_NAME) return 'figdex_' + key;
  return storageKey(key);
}
async function getStored(key, def) {
  var k = (key === STORAGE_KEYS.FILE_KEY || key === STORAGE_KEYS.FILE_NAME) ? storageKeyForFileKey(key) : storageKey(key);
  try { var v = await figma.clientStorage.getAsync(k); return v !== undefined ? v : def; } catch (e) { return def; }
}
async function setStored(key, value) {
  var k = (key === STORAGE_KEYS.FILE_KEY || key === STORAGE_KEYS.FILE_NAME) ? storageKeyForFileKey(key) : storageKey(key);
  try { await figma.clientStorage.setAsync(k, value); } catch (e) { console.error(e); }
}
// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-index-data-for-upload') {
    try {
      // Prefer streaming to UI in chunks to avoid large single postMessage payloads
      await buildFramesIndexJsonStream();
    } catch (error) {
      console.error('❌ [code.js message handler] Error building index data:', error);
      figma.ui.postMessage({ 
        type: 'index-data-error',
        error: error.message 
      });
    }
  }

  if (msg.type === 'debug-clear-data') {
    try {
      globalFileKey = '';
      await setStored(STORAGE_KEYS.FILE_KEY, '');
      await setStored(STORAGE_KEYS.FILE_NAME, '');
      await setStored(STORAGE_KEYS.IMAGE_QUALITY, null);
      await setStored(STORAGE_KEYS.SELECTED_PAGES, []);
      await setStored(STORAGE_KEYS.EXCLUDED_PAGES, []);
      await setStored(STORAGE_KEYS.INDEXED_PAGES, []);
      await setStored(STORAGE_KEYS.FRAME_TAGS, {});
      await setStored(STORAGE_KEYS.ALL_TAGS, []);
      await setStored(STORAGE_KEYS.WEB_TOKEN, '');
      await setStored(STORAGE_KEYS.WEB_USER, null);
      await setStored(STORAGE_KEYS.SUPABASE_TOKENS, null);
      figma.ui.postMessage({ type: 'debug-data-cleared' });
    } catch (e) {
      figma.ui.postMessage({ type: 'debug-data-cleared', error: e.message });
    }
    return;
  }

  if (msg.type === 'check-FigDex-page') {
    try {
      const indexedPages = await getStored(STORAGE_KEYS.INDEXED_PAGES, []);
      if (!indexedPages || indexedPages.length === 0) {
        figma.ui.postMessage({
          type: 'FigDex-page-status',
          exists: false,
          hasFrames: false,
          frameCount: 0,
          error: 'No index yet. Create index from selected pages first.'
        });
        return;
      }
      await figma.loadAllPagesAsync();
      let frameCount = 0;
      for (let i = 0; i < indexedPages.length; i++) {
        const pageId = indexedPages[i].pageId;
        const page = await figma.getNodeByIdAsync(pageId);
        if (page && page.type === 'PAGE') {
          frameCount += findAllFrames(page).length;
        }
      }
      figma.ui.postMessage({
        type: 'FigDex-page-status',
        exists: true,
        hasFrames: frameCount > 0,
        frameCount: frameCount,
        error: frameCount === 0 ? 'No frames in indexed pages' : null
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'FigDex-page-status',
        exists: false,
        hasFrames: false,
        error: error.message
      });
    }
  }

  if (msg.type === 'get-file-data') {
    try {
      // Use globalFileKey if available (set by user), otherwise fall back to figma.fileKey (current file's key)
      // globalFileKey is the file key from the URL the user entered (could be for a different file)
      // figma.fileKey is the current file's key (only available for private plugins)
      const fileKey = globalFileKey || figma.fileKey || '';
      
      // documentId should always be figma.root.id (the current file's document ID)
      // This identifies the current Figma file, even if it's unsaved ('0:0')
      const documentId = figma.root.id || '0:0';
      
      let fileName = await getStored(STORAGE_KEYS.FILE_NAME, null);
      if (!fileName || fileName.trim() === '' || fileName === 'Untitled' || (fileKey && fileName === fileKey)) {
        fileName = figma.root.name || 'Untitled';
        if (fileName === 'Untitled' || (fileKey && fileName === fileKey)) {
          await figma.loadAllPagesAsync();
          const firstPage = figma.root.children.find(p => p.type === 'PAGE' && p.name !== 'FigDex');
          if (firstPage && firstPage.name && firstPage.name.trim() !== '' && firstPage.name !== 'Untitled') {
            fileName = firstPage.name;
          } else {
            fileName = 'Untitled';
          }
        }
      }
      
      // Validate fileKey - must be set (either from user input or current file)
      if (!fileKey || fileKey.trim() === '') {
        figma.ui.postMessage({ 
          type: 'file-data-error',
          error: 'File key is required. Please set the file key in the plugin UI (paste Figma file URL) before uploading.'
        });
        return;
      }
      
      // Send real file data to UI
      // Note: documentId can be '0:0' for unsaved files - the API will handle this
      figma.ui.postMessage({ 
        type: 'file-data-ready', 
        documentId: documentId,
        fileKey: fileKey,
        fileName: fileName
      });
    } catch (error) {
      console.error('Error getting file data:', error);
      figma.ui.postMessage({ 
        type: 'file-data-error',
        error: error.message || 'Unknown error while getting file data'
      });
    }
  }

  if (msg.type === 'upload-index') {
    try {
      // Use the token from the UI message instead of session
      const token = msg.token;
      if (!token) {
        return;
      }
      
      // Send the data back to UI to handle the upload there
      figma.ui.postMessage({ 
        type: 'upload-data-ready', 
        indexData: msg.indexData,
        token: token,
        userEmail: msg.userEmail,
        userName: msg.userName,
        userProvider: msg.userProvider,
        userProviderId: msg.userProviderId
      });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'upload-result', 
        success: false, 
        error: error.message 
      });
    }
  }

    if (msg.type === 'check-selection') {
        const selection = figma.currentPage.selection;
        const hasSelection = selection.length > 0;
        const hasFrameSelection = selection.some(n => n.type === "FRAME");
        const selectedFrames = selection.filter(n => n.type === "FRAME").map(n => n.id);
        figma.ui.postMessage({ type: 'selection-status', hasSelection, hasFrameSelection, selectedFrames });
    }
    
    if (msg.type === 'mark-no-index') {
        const mode = msg.mode || 'selected';
        let frames = [];
        if (mode === 'page') {
          frames = figma.currentPage.findAll(n => n.type === "FRAME");
        } else {
          frames = figma.currentPage.selection.filter(n => n.type === "FRAME");
        }
        frames.forEach(f => {
        if (!f.name.includes("[NO_INDEX]")) {
            f.name = f.name + " [NO_INDEX]";
        }
        });
        figma.notify(`Selected frames marked as NO-INDEX!`);
    }
    
    if (msg.type === 'mark-all-index') {
        const frames = figma.currentPage.findAll(n => n.type === "FRAME");
        frames.forEach(f => {
        if (f.name.includes("[NO_INDEX]")) {
            f.name = f.name.replace(/\s*\[NO_INDEX\]/g, "");
        }
        });
        figma.notify("All frames marked as INDEX!");
    }

    if (msg.type === 'unmark-no-index') {
      const mode = msg.mode || 'selected';
      let frames = [];
      if (mode === 'page') {
        frames = figma.currentPage.findAll(n => n.type === "FRAME");
      } else {
        frames = figma.currentPage.selection.filter(n => n.type === "FRAME");
      }
      frames.forEach(f => {
        if (f.name.includes("[NO_INDEX]")) {
          f.name = f.name.replace(/\s*\[NO_INDEX\]/g, "");
        }
      });
      figma.notify(`[NO_INDEX] removed from ${mode === 'page' ? 'all frames in page' : 'selected frames'}!`);
      return;
    }

    if (msg.type === 'get-pages' || msg.type === 'refresh-pages') {
        await figma.loadAllPagesAsync();
        
        const allPages = figma.root.children
    .filter(p =>
        p.type === "PAGE" &&
        p.name !== "FigDex" &&
        !/^[-\s]+$/.test(p.name.trim()) // סנן מפרידים
    )
    .map(p => ({
        id: p.id,
        name: p.name,
        hasFrames: p.children && p.children.some(node =>
        node.type === "FRAME" ||
        (node.type === "SECTION" && node.children && node.children.some(child => child.type === "FRAME"))
        ),
        isIndexPage: p.name === "Frame-Index"
    }));

    
    // אם זה רענון, רק נטען את רשימת העמודים (לא נעדכן hash)
    // ה-hash יתעדכן רק כשמתבצע אינדקס חדש

    // מיון: עמוד אינדקס בראש, אחר כך שאר העמודים
    const sortedPages = allPages.sort((a, b) => {
      if (a.isIndexPage && !b.isIndexPage) return -1;
      if (!a.isIndexPage && b.isIndexPage) return 1;
      return 0;
    });

    let lastFolder = null;
    const pages = [];
    
    // בדוק סטטוס עמודים בצורה פשוטה
    for (const page of sortedPages) {
      if (page.isIndexPage) {
        pages.push({
          id: page.id,
          name: page.name,
          hasFrames: false, // מוגדר כ-disabled
          displayName: page.name,
          isFolder: false,
          isIndexPage: true,
          status: 'index_page',
          icon: '📋'
        });
      } else if (!page.hasFrames) {
        lastFolder = page.name;
        pages.push({
          id: page.id,
          name: page.name,
          hasFrames: page.hasFrames,
          displayName: page.name,
          isFolder: true,
          status: 'folder',
          icon: '📁'
        });
      } else {
      let displayName = page.name;
      const trimmedName = page.name.trim();
      if (trimmedName.startsWith("↪") && lastFolder) {
        const cleanName = trimmedName.replace(/^↪\s*/, "");
        displayName = `${lastFolder} -> ${cleanName}`;
      } else if (page.hasFrames) {
        lastFolder = null;
      }
        
        // בדוק סטטוס עמוד בצורה פשוטה
        let pageStatus = { status: 'not_indexed', icon: '➕' };
        try {
          pageStatus = await checkPageStatus(page.id);
        } catch (error) {
          console.error('Error checking page status for', page.id, error);
          pageStatus = { status: 'not_indexed', icon: '➕' };
        }
        
        pages.push({
        id: page.id,
        name: page.name,
        displayName,
        hasFrames: page.hasFrames,
          isFolder: false,
          status: pageStatus.status,
          icon: pageStatus.icon
    });
      }
    }

    figma.ui.postMessage({ type: 'pages', pages });
  }


  if (msg.type === 'set-file-key') {
    globalFileKey = msg.fileKey || '';
    await setStored(STORAGE_KEYS.FILE_KEY, globalFileKey);
    if (msg.fileName != null) await setStored(STORAGE_KEYS.FILE_NAME, msg.fileName);
    return;
  }

  if (msg.type === 'get-file-thumbnail') {
    try {
      await figma.loadAllPagesAsync();
      const pages = figma.root.children.filter(p => p.type === "PAGE" && p.name !== "FigDex");
      const coverPage = pages.find(p => (p.name || '').trim().toLowerCase() === 'cover') || null;
      const pagesToTry = [];
      if (coverPage) {
        pagesToTry.push(coverPage);
      } else if (figma.currentPage) {
        pagesToTry.push(figma.currentPage);
      }
      pages.forEach(p => { if (!pagesToTry.some(t => t.id === p.id)) pagesToTry.push(p); });
      if (pagesToTry.length === 0) {
        figma.ui.postMessage({ type: 'file-thumbnail-error', error: 'No pages found' });
        return;
      }
      
      let framesToTry = [];
      for (let i = 0; i < pagesToTry.length; i++) {
        const page = pagesToTry[i];
        try { if (typeof page.loadAsync === 'function') await page.loadAsync(); } catch (e) {}
        const pageFrames = page.findAll(n => n.type === "FRAME");
        if (pageFrames.length > 0) {
          framesToTry = pageFrames;
          break;
        }
      }
      if (framesToTry.length === 0) {
        figma.ui.postMessage({ type: 'file-thumbnail-error', error: 'No frames found' });
        return;
      }

      // Prefer frame named "cover" (case-insensitive), else largest visible frame
      framesToTry = framesToTry.filter(f => (f.width || 0) >= 10 && (f.height || 0) >= 10 && f.visible !== false);
      let frameToExport = framesToTry.find(f => (f.name || '').trim().toLowerCase() === 'cover');
      if (!frameToExport) {
        framesToTry.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        frameToExport = framesToTry[0];
      }
      try { if (typeof frameToExport.loadAsync === 'function') await frameToExport.loadAsync(); } catch (e) {}
      // Prefer exporting a visible child with fills (more likely to have pixels)
      let nodeToExport = frameToExport;
      try {
        const candidates = frameToExport.findAll(n => {
          if (n.visible === false) return false;
          if (n.type === 'TEXT') return false;
          const w = n.width || 0;
          const h = n.height || 0;
          if (w < 10 || h < 10) return false;
          if (n.fills && Array.isArray(n.fills) && n.fills.some(f => f && f.type === 'IMAGE')) return true;
          if (n.fills && Array.isArray(n.fills) && n.fills.some(f => f && f.type === 'SOLID')) return true;
          return false;
        });
        if (candidates.length > 0) {
          candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
          nodeToExport = candidates[0];
        }
      } catch (e) {}
      const bytes = await nodeToExport.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1.0 } });
      let dataUrl = 'data:image/png;base64,' + figma.base64Encode(bytes);
      const pageName = coverPage ? coverPage.name : (figma.currentPage ? figma.currentPage.name : 'unknown');
      console.log('[code.js] Thumbnail exported from page:', pageName, 'node:', nodeToExport.name, 'type:', nodeToExport.type, 'dataUrl length:', dataUrl.length);

      // Fallback: if export is tiny, try exporting the frame itself, then the page
      if (dataUrl.length < 2000) {
        try {
          const frameBytes = await frameToExport.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1.0 } });
          const frameDataUrl = 'data:image/png;base64,' + figma.base64Encode(frameBytes);
          if (frameDataUrl.length > dataUrl.length) {
            dataUrl = frameDataUrl;
            console.log('[code.js] Fallback export frame, dataUrl length:', dataUrl.length);
          }
        } catch (e) {}
      }
      if (dataUrl.length < 2000) {
        try {
          const pageNode = coverPage || figma.currentPage;
          if (pageNode) {
            const pageBytes = await pageNode.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 0.5 } });
            const pageDataUrl = 'data:image/png;base64,' + figma.base64Encode(pageBytes);
            if (pageDataUrl.length > dataUrl.length) {
              dataUrl = pageDataUrl;
              console.log('[code.js] Fallback export page, dataUrl length:', dataUrl.length);
            }
          }
        } catch (e) {}
      }

      figma.ui.postMessage({ type: 'file-thumbnail', thumbnailDataUrl: dataUrl });
    } catch (error) {
      console.error('❌ [code.js] Error getting file thumbnail:', error);
      figma.ui.postMessage({ type: 'file-thumbnail-error', error: error.message });
    }
    return;
  }

  if (msg.type === 'set-image-quality') {
    // UI now sends quality as percentage (40, 60, or 100) directly
    // But also handle legacy 0.0-1.0 format for backward compatibility
    const qualityValue = Number(msg.quality);
    if (qualityValue <= 1.0) {
      // Legacy format: 0.0-1.0, convert to 40/70/100
      if (qualityValue <= 0.4) {
        imageQuality = 40; // low
      } else if (qualityValue <= 0.7) {
        imageQuality = 70; // med
      } else {
        imageQuality = 100; // hi
      }
    } else {
      // New format: 40, 60, or 100 directly
      imageQuality = qualityValue;
    }
    await setStored(STORAGE_KEYS.IMAGE_QUALITY, imageQuality);
    return;
  }

  if (msg.type === 'start-advanced') {
    if (!globalFileKey) {
      figma.ui.postMessage({ type: 'error', message: 'No file key set. Please provide a Figma file link.' });
      return;
    }
    await setStored(STORAGE_KEYS.SELECTED_PAGES, msg.selectedPages || []);
    try {
      await saveIndexedPagesMetadataOnly(msg.selectedPages);
      figma.ui.postMessage({ type: 'done' });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: e.message || "Unknown error" });
    }
  }

  if (msg.type === 'save-selected-pages') {
    await setStored(STORAGE_KEYS.SELECTED_PAGES, msg.pages || []);
    return;
  }

  if (msg.type === 'save-excluded-pages') {
    await setStored(STORAGE_KEYS.EXCLUDED_PAGES, msg.pages || []);
    return;
  }

  if (msg.type === 'save-web-system-token') {
    await setStored(STORAGE_KEYS.WEB_TOKEN, msg.token);
    return;
  }

  if (msg.type === 'save-web-system-user') {
    await setStored(STORAGE_KEYS.WEB_USER, msg.user);
    return;
  }

  if (msg.type === 'save-supabase-tokens') {
    await setStored(STORAGE_KEYS.SUPABASE_TOKENS, { accessToken: msg.accessToken, refreshToken: msg.refreshToken });
    return;
  }

  if (msg.type === 'upload-to-web') {
    try {
      
      // Send progress update
      figma.ui.postMessage({ type: 'upload-progress', progress: 5, step: 'Starting' });
      
      // Build the index data
      figma.ui.postMessage({ type: 'upload-progress', progress: 20, step: 'Building index' });
      const indexData = await buildFramesIndexJson();
      
      // Send progress update
      figma.ui.postMessage({ type: 'upload-progress', progress: 40, step: 'Index built' });
      
      // Send data to UI for upload (since plugin can't make HTTPS requests)
      figma.ui.postMessage({ type: 'upload-progress', progress: 60, step: 'Sending to UI' });
        figma.ui.postMessage({
        type: 'upload-data-ready', 
        indexData: indexData,
        token: msg.token,
        fileKey: globalFileKey,
        fileName: figma.root.name,
        userEmail: msg.userEmail || null,
        userName: msg.userName || null,
        userProvider: msg.userProvider || null,
        userProviderId: msg.userProviderId || null
      });
      
    } catch (error) {
      console.error('Upload process failed:', error);
      figma.ui.postMessage({ type: 'upload-error', message: error.message });
    }
    return;
  }

  if (msg.type === 'upload-to-server') {
    try {
      
      // Send progress update
      figma.ui.postMessage({ type: 'upload-progress', progress: 70, step: 'Uploading to server' });
      
      // Prepare upload data
      const uploadData = {
        documentId: msg.fileKey,
        fileKey: msg.fileKey,
        fileName: msg.fileName,
        pages: (msg.indexData.data && msg.indexData.data.frames) || [],
        uploadedAt: new Date().toISOString(),
        userEmail: msg.userEmail,
        userName: msg.userName,
        userProvider: msg.userProvider,
        userProviderId: msg.userProviderId
      };
      
      
      // Make HTTP request to server (production)
      const response = await fetch('https://www.figdex.com/api/upload-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${msg.token}`
        },
        body: JSON.stringify(uploadData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Send success message to UI
        figma.ui.postMessage({ type: 'upload-progress', progress: 100, step: 'Upload completed' });
        figma.ui.postMessage({
          type: 'upload-success', 
          projectId: result.projectId || msg.fileKey + '-' + Date.now()
        });
        
        figma.notify('Index uploaded successfully!');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      figma.ui.postMessage({ type: 'upload-error', message: error.message });
      figma.notify('Upload failed: ' + error.message);
    }
    return;
  }
  
  if (msg.type === 'build-index-json') {
    try {
      // Build the index data
      const indexData = await buildFramesIndexJson();
      
      // Send to UI for iframe upload
        figma.ui.postMessage({ 
        type: 'index-json-ready', 
        indexData: indexData,
        token: 'demo_token_' + Date.now()
        });
    } catch (error) {
      figma.ui.postMessage({ type: 'upload-error', message: error.message });
    }
    return;
  }

  if (msg.type === 'get-file-key') {
    var key = await getStored(STORAGE_KEYS.FILE_KEY, null);
    if (key) globalFileKey = key;
    figma.ui.postMessage({ type: 'set-file-key', fileKey: globalFileKey || '' });
    return;
  }

  if (msg.type === 'check-page-status') {
    const pageId = msg.pageId;
    if (pageId) {
      const status = await checkPageStatus(pageId);
      figma.ui.postMessage({ 
        type: 'page-status-result', 
        pageId: pageId,
        status: status.status,
        icon: status.icon
      });
    }
    return;
  }
  


  if (msg.type === 'update-page-statuses') {
    await updateAllPageStatuses();
    return;
  }

  if (msg.type === 'save-frame-tags') {
    if (msg.tags) await setStored(STORAGE_KEYS.FRAME_TAGS, msg.tags);
    if (msg.allTags) await setStored(STORAGE_KEYS.ALL_TAGS, msg.allTags);
    return;
  }

  if (msg.type === 'load-frame-tags') {
    const tags = await getStored(STORAGE_KEYS.FRAME_TAGS, {});
    const allTags = await getStored(STORAGE_KEYS.ALL_TAGS, []);
    figma.ui.postMessage({ type: 'frame-tags-loaded', tags: tags || {}, allTags: allTags || [] });
    return;
  }

  if (msg.type === 'get-frames-from-pages') {
    // Get all frame IDs from selected pages (use getNodeByIdAsync for documentAccess: dynamic-page)
    const frameIds = [];
    if (msg.pageIds && Array.isArray(msg.pageIds)) {
      for (const pageId of msg.pageIds) {
        const page = await figma.getNodeByIdAsync(pageId);
        if (page && page.type === 'PAGE') {
          const frames = findAllFrames(page);
          frameIds.push(...frames);
        }
      }
    }
    figma.ui.postMessage({ type: 'frames-from-pages', frameIds: frameIds });
    return;
  }

  if (msg.type === 'reset-all-data') {
    try {
      const docId = figma.root.id || '0:0';
      const prefix = 'figdex_' + docId + '_';
      const keys = Object.values(STORAGE_KEYS);
      for (let i = 0; i < keys.length; i++) {
        await figma.clientStorage.deleteAsync(prefix + keys[i]);
      }
      await figma.clientStorage.deleteAsync('figdex_fileKey');
      await figma.clientStorage.deleteAsync('figdex_fileName');
      globalFileKey = '';
      imageQuality = 70;
      await setStored(STORAGE_KEYS.IMAGE_QUALITY, 70);
      figma.ui.postMessage({ type: 'set-file-key', fileKey: '' });
      figma.ui.postMessage({ type: 'set-image-quality', quality: 70 });
      figma.ui.postMessage({ type: 'set-selected-pages', pages: [] });
      figma.ui.postMessage({ type: 'reset-all-data-complete' });
    } catch (error) {
      console.error('Error resetting plugin data:', error);
      figma.ui.postMessage({ type: 'error', message: 'Failed to reset plugin data: ' + error.message });
    }
    return;
  }
};

// Page-level signature for change detection (no content hash; lightweight)
async function computePageSignature(pageId) {
  const page = await figma.getNodeByIdAsync(pageId);
  if (!page || page.type !== 'PAGE') return '';
  if (typeof page.loadAsync === 'function') await page.loadAsync();
  const childCount = page.children ? page.children.length : 0;
  const frameCount = findAllFrames(page).length;
  return (page.id || '') + '|' + (page.name || '') + '|' + childCount + '|' + frameCount;
}

// Save only metadata for indexed pages (no FigDex page, no images)
async function saveIndexedPagesMetadataOnly(selectedPageIds) {
  await figma.loadAllPagesAsync();
  const excludedPages = await getStored(STORAGE_KEYS.EXCLUDED_PAGES, []) || [];
  const now = new Date().toISOString();
  const indexedPages = [];
  for (let i = 0; i < selectedPageIds.length; i++) {
    const pageId = selectedPageIds[i];
    if (excludedPages.indexOf(pageId) >= 0) continue;
    const page = figma.root.children.find(p => p.id === pageId);
    if (!page || page.type !== 'PAGE') continue;
    const pageChangeSignature = await computePageSignature(pageId);
    indexedPages.push({
      pageId: pageId,
      pageName: page.name || '',
      lastIndexedAt: now,
      pageChangeSignature: pageChangeSignature
    });
  }
  await setStored(STORAGE_KEYS.INDEXED_PAGES, indexedPages);
  await setStored(STORAGE_KEYS.SELECTED_PAGES, selectedPageIds);
}

// Function to update all page statuses
async function updateAllPageStatuses() {
  try {
    
      await figma.loadAllPagesAsync();
    
      const allPages = figma.root.children
      .filter(p =>
        p.type === "PAGE" &&
        p.name !== "FigDex" &&
        !/^[-\s]+$/.test(p.name.trim())
      )
        .map(p => ({
          id: p.id,
          name: p.name,
        hasFrames: p.children && p.children.some(node =>
          node.type === "FRAME" ||
          (node.type === "SECTION" && node.children && node.children.some(child => child.type === "FRAME"))
        ),
        isIndexPage: p.name === "Frame-Index"
      }));

    
    // Check status for each page
    for (const page of allPages) {
      if (page.hasFrames && !page.isIndexPage) {
        const status = await checkPageStatus(page.id);
      figma.ui.postMessage({
          type: 'page-status-updated', 
          pageId: page.id,
          status: status.status,
          icon: status.icon
        });
      } else {
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating page statuses:', error);
  }
}



// Function to check page status (uses metadata only; no FigDex page)
async function checkPageStatus(pageId) {
  try {
    const indexedPages = await getStored(STORAGE_KEYS.INDEXED_PAGES, []);
    const meta = indexedPages ? indexedPages.find(p => p.pageId === pageId) : null;
    if (!meta) {
      return { status: 'not_indexed', icon: '➕' };
    }
    const currentSignature = await computePageSignature(pageId);
    if (currentSignature === meta.pageChangeSignature) {
      return { status: 'up_to_date', icon: '✅' };
    }
    return { status: 'needs_update', icon: '🔄' };
  } catch (error) {
    console.error('Error in checkPageStatus:', error);
    return { status: 'unknown', icon: '❓' };
  }
}

// On plugin load: load metadata from clientStorage (no FigDex page)
(async function initializePlugin() {
  const savedKey = await getStored(STORAGE_KEYS.FILE_KEY, null);
  if (savedKey) {
    globalFileKey = savedKey;
    figma.ui.postMessage({ type: 'set-file-key', fileKey: savedKey });
  }
})();

(async function loadImageQualityFromStorage() {
  const savedQuality = await getStored(STORAGE_KEYS.IMAGE_QUALITY, null);
  if (savedQuality !== null && savedQuality !== undefined) {
    imageQuality = savedQuality;
    figma.ui.postMessage({ type: 'set-image-quality', quality: imageQuality });
  }
})();

(async function loadSelectedPagesFromStorage() {
  const savedPages = await getStored(STORAGE_KEYS.SELECTED_PAGES, null);
  if (savedPages) figma.ui.postMessage({ type: 'set-selected-pages', pages: savedPages });
  const savedExcluded = await getStored(STORAGE_KEYS.EXCLUDED_PAGES, null);
  if (savedExcluded) figma.ui.postMessage({ type: 'set-excluded-pages', pages: savedExcluded });
})();

(async function loadWebDataFromStorage() {
  const webToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
  const webUser = await getStored(STORAGE_KEYS.WEB_USER, null);
  if (webToken && webUser) {
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_DATA_LOADED', token: webToken, user: webUser });
  }
  const supabaseTokens = await getStored(STORAGE_KEYS.SUPABASE_TOKENS, { accessToken: null, refreshToken: null });
  if (supabaseTokens && supabaseTokens.accessToken && supabaseTokens.refreshToken) {
    figma.ui.postMessage({ type: 'SUPABASE_TOKENS_LOADED', accessToken: supabaseTokens.accessToken, refreshToken: supabaseTokens.refreshToken });
  }
})();

async function loadSupabaseTokensFromStorage() {
  const t = await getStored(STORAGE_KEYS.SUPABASE_TOKENS, { accessToken: null, refreshToken: null });
  return t || { accessToken: null, refreshToken: null };
}


async function uploadToWebSystem(indexData, token) {
  try {
    // Use the API key token directly
    if (!token) {
      throw new Error('No API key provided. Please enter your API key.');
    }

    // Build the payload in the format expected by the Next.js API
    const payload = {
      documentId: '0:0', // Default document ID
      fileKey: figma.fileKey,
      fileName: figma.root.name || 'Untitled',
      pages: indexData.data.frames || [],
      uploadedAt: new Date().toISOString()
    };

    // Use fetch API (XMLHttpRequest not available in Figma plugin environment)
    const response = await fetch('https://www.figdex.com/api/upload-index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    
    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  } catch (error) {
    throw error;
  }
}

async function buildFramesIndexJson() {
  if (imageQuality === undefined || imageQuality === null) {
    imageQuality = (await getStored(STORAGE_KEYS.IMAGE_QUALITY, 70)) || 70;
  }
  try {
    const indexedPages = await getStored(STORAGE_KEYS.INDEXED_PAGES, []);
    if (!indexedPages || indexedPages.length === 0) {
      return { name: "Frames Index", data: { pages: [], frames: [] }, error: "No index yet. Create index first." };
    }
    await figma.loadAllPagesAsync();
    const frameIds = [];
    for (let i = 0; i < indexedPages.length; i++) {
      const page = await figma.getNodeByIdAsync(indexedPages[i].pageId);
      if (page && page.type === 'PAGE') {
        const ids = findAllFrames(page);
        for (let j = 0; j < ids.length; j++) frameIds.push(ids[j]);
      }
    }
    if (frameIds.length === 0) {
      return { name: "Frames Index", data: { pages: [], frames: [] }, error: "No frames in indexed pages" };
    }
    const processedFrames = [];
    for (let i = 0; i < frameIds.length; i++) {
      try {
        const frame = await figma.getNodeByIdAsync(frameIds[i]);
        if (frame && frame.type === 'FRAME') {
          const frameData = await processFrameFromDocument(frame, i);
          if (frameData) processedFrames.push(frameData);
        }
      } catch (error) {}
    }
    const pages = [];
    const framesPerPage = 20;
    for (let i = 0; i < processedFrames.length; i += framesPerPage) {
      const pageFrames = processedFrames.slice(i, i + framesPerPage);
      pageFrames.forEach(function(f) { if (!f.tags) f.tags = []; });
      pages.push({ id: 'page_' + Math.floor(i / framesPerPage), name: 'Page ' + (Math.floor(i / framesPerPage) + 1), frames: pageFrames });
    }
    return { name: "Frames Index", data: { pages: pages, frames: processedFrames, tags: [] } };
  } catch (error) {
    console.error('Error building frames index:', error);
    return { name: "Frames Index", data: { pages: [], frames: [] }, error: error.message };
  }
}

// Build index and generate images only when uploading to Web (just-in-time; no local storage)
async function buildFramesIndexJsonStream() {
  if (imageQuality === undefined || imageQuality === null) {
    imageQuality = (await getStored(STORAGE_KEYS.IMAGE_QUALITY, 70)) || 70;
  }
  try {
    const indexedPages = await getStored(STORAGE_KEYS.INDEXED_PAGES, []);
    if (!indexedPages || indexedPages.length === 0) {
      figma.ui.postMessage({ type: 'index-data-error', error: 'No index yet. Create index from selected pages first.' });
      return;
    }
    await figma.loadAllPagesAsync();
    const frameIds = [];
    for (let i = 0; i < indexedPages.length; i++) {
      const page = await figma.getNodeByIdAsync(indexedPages[i].pageId);
      if (page && page.type === 'PAGE') {
        const ids = findAllFrames(page);
        for (let j = 0; j < ids.length; j++) {
          frameIds.push(ids[j]);
        }
      }
    }
    if (frameIds.length === 0) {
      figma.ui.postMessage({ type: 'index-data-error', error: 'No frames in indexed pages' });
      return;
    }
    figma.ui.postMessage({ type: 'upload-progress', progress: 5, step: 'Starting upload...' });
    const CHUNK_SIZE = 40;
    const processedBatch = [];
    const totalFrames = frameIds.length;
    for (let i = 0; i < frameIds.length; i++) {
      try {
        const frameProgress = 5 + Math.round((i / totalFrames) * 85);
        figma.ui.postMessage({ type: 'upload-progress', progress: frameProgress, step: 'Processing frames (' + (i + 1) + '/' + totalFrames + ')...' });
        const frame = await figma.getNodeByIdAsync(frameIds[i]);
        if (frame && frame.type === 'FRAME') {
          const frameData = await processFrameFromDocument(frame, i);
          if (frameData) processedBatch.push(frameData);
        }
      } catch (e) {
        console.error('Stream: error processing frame', frameIds[i], e.message);
      }
      if (processedBatch.length >= CHUNK_SIZE) {
        figma.ui.postMessage({ type: 'index-data-chunk', frames: processedBatch.slice() });
        processedBatch.length = 0;
      }
      if ((i + 1) % 20 === 0) await new Promise(r => setTimeout(r, 0));
    }
    figma.ui.postMessage({ type: 'upload-progress', progress: 90, step: 'Finalizing...' });
    if (processedBatch.length > 0) figma.ui.postMessage({ type: 'index-data-chunk', frames: processedBatch.slice() });
    figma.ui.postMessage({ type: 'upload-progress', progress: 95, step: 'Index ready!' });
    figma.ui.postMessage({ type: 'index-data-complete', total: frameIds.length, framesPerPage: 20 });
  } catch (error) {
    console.error('Streaming index build failed:', error);
    figma.ui.postMessage({ type: 'index-data-error', error: error.message || 'Unknown error' });
  }
}


// פונקציה למציאת כל ה-frames בכל עומק (לא sections)
function findAllFrames(node) {
  let ids = [];
  
  // Skip sections - only process actual frames
  if (node.type === "FRAME" && node.name !== "Section") {
    // Check if this is a real frame (not a section)
    // Sections usually have specific properties or children patterns
    const isSection = node.name.toLowerCase().includes('section') || 
                     (node.children && node.children.some(child => child.type === "FRAME"));
    
    if (!isSection) {
      ids.push(node.id);
    }
  }
  
  if (node.children) {
    for (const child of node.children) {
      ids = ids.concat(findAllFrames(child));
    }
  }
  return ids;
}

// בדיקת נראות של node כולל אבותיו
function isNodeVisible(node) {
  try {
    let cur = node;
    while (cur) {
      if (cur.visible === false) return false;
      cur = cur.parent;
    }
    return true;
  } catch (e) {
    return true;
  }
}

// איסוף טקסטים גלויים מתוך פריים, באמצעות findAll
function collectVisibleTextsFromFrame(frame) {
  try {
    const textNodes = frame.findAll(n => n.type === 'TEXT');
    const texts = [];
    for (const t of textNodes) {
      if (isNodeVisible(t) && t.characters) {
        texts.push(t.characters);
      }
    }
    return texts;
  } catch (e) {
    return [];
  }
}

// איסוף שמות אבות (Section / Group / Frame) לצורך חיפוש
function collectAncestorNames(frame) {
  const names = [];
  try {
    let cur = frame.parent;
    let guard = 0;
    while (cur && guard++ < 50) {
      if (cur.name && typeof cur.name === 'string') names.push(cur.name);
      cur = cur.parent;
    }
  } catch (e) {}
  return names;
}

// Process a document frame and export image just-in-time (for upload only; no local storage)
async function processFrameFromDocument(frame, index) {
  try {
    const frameTags = await getStored(STORAGE_KEYS.FRAME_TAGS, {});
    const frameSpecificTags = frameTags[frame.id] || [];
    const w = Math.round(frame.width);
    const h = Math.round(frame.height);
    const sizeTag = w + 'x' + h;
    const tags = frameSpecificTags.indexOf(sizeTag) >= 0 ? frameSpecificTags : frameSpecificTags.concat([sizeTag]);
    const visibleTexts = collectVisibleTextsFromFrame(frame);
    const ancestorNames = collectAncestorNames(frame);
    const allTexts = [frame.name || ''].concat(ancestorNames, visibleTexts);
    const textContent = allTexts.join(' ');
    const searchTokens = buildSearchTokens(allTexts);
    const frameData = {
      id: frame.id,
      name: frame.name,
      x: Math.round(frame.x),
      y: Math.round(frame.y),
      width: w,
      height: h,
      index: index,
      tags: tags,
      url: globalFileKey ? 'https://www.figma.com/file/' + globalFileKey + '?node-id=' + frame.id.replace(/:/g, '%3A') : '',
      textContent: textContent,
      searchTokens: searchTokens
    };
    let imageNode = null;
    try {
      const nodes = frame.findAll(function(n) {
        if (n.type === 'RECTANGLE' || n.type === 'ELLIPSE' || n.type === 'POLYGON' || n.type === 'STAR' || n.type === 'VECTOR') {
          if (n.fills && Array.isArray(n.fills)) return n.fills.some(function(f) { return f.type === 'IMAGE'; });
        }
        return false;
      });
      if (nodes.length > 0) imageNode = nodes[0];
    } catch (err) {}
    const rawQuality = (imageQuality !== undefined && imageQuality !== null && imageQuality !== 0) ? imageQuality : 70;
    const qualityScale = rawQuality / 100;
    const jpegQuality = 0.9;
    try {
      let thumbnail;
      if (imageNode) {
        thumbnail = await imageNode.exportAsync({ format: 'JPG', quality: jpegQuality, constraint: { type: 'SCALE', value: qualityScale } });
      } else {
        thumbnail = await frame.exportAsync({ format: 'JPG', quality: jpegQuality, constraint: { type: 'SCALE', value: qualityScale } });
      }
      frameData.image = 'data:image/jpeg;base64,' + figma.base64Encode(thumbnail);
    } catch (err) {
      frameData.image = null;
    }
    return frameData;
  } catch (error) {
    return null;
  }
}

// פונקציה רקורסיבית למציאת כל הטקסטים בכל עומק בתוך FRAME
function findAllTexts(node) {
  let texts = [];
  if (node.type === "TEXT" && node.characters) {
    texts.push(node.characters);
  }
  if (node.children) {
    for (const child of node.children) {
      texts = texts.concat(findAllTexts(child));
    }
  }
  return texts;
}

// Normalize and tokenize text for search
function buildSearchTokens(rawTexts) {
  try {
    const joined = Array.isArray(rawTexts) ? rawTexts.join(' ') : String(rawTexts || '');
    // Normalize whitespace and punctuation, lowercase
    const normalized = joined
      .toLowerCase()
      .replace(/\n+/g, ' ')
      // Remove characters that are not letters/numbers/underscore/hyphen/space across common scripts
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

async function createIndexForPage(__PAGE_ID__, pageName, __PAGE_INDEX__) {
  try {
    const page = await figma.getNodeByIdAsync(__PAGE_ID__);
    if (!page || page.type !== "PAGE") {
      throw new Error("Page not found");
    }

    // Find all frames in the page
    const frames = findAllFrames(page);
    
    if (frames.length === 0) {
      throw new Error("No frames found in this page");
    }

    // Create index data structure
    const indexData = {
      pageName: pageName,
      __PAGE_INDEX__: __PAGE_INDEX__,
      frames: []
    };

    // Process each frame
    // Process each frame (limit to first 5 for testing)
    const limitedFrames = frames;
    
    for (const frameId of limitedFrames) {
      const frame = await figma.getNodeByIdAsync(frameId);
      if (frame && frame.type === "FRAME") {
        const frameData = {
          id: frameId,
          name: frame.name,
          thumbnails: [],
          url: figma.fileKey ? `https://www.figma.com/file/${figma.fileKey}?node-id=${frameId.replace(/:/g, '%3A')}` : ''
        };

        // Generate thumbnail for the frame
        try {
          const thumbnail = await frame.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 0.5 }
          });

          // Convert to base64 using Figma's built-in function
          const base64 = figma.base64Encode(thumbnail);
          
          frameData.thumbnails.push({
            url: `https://www.figma.com/file/${figma.fileKey}?node-id=${frameId}`,
            image: base64,
            width: frame.width,
            height: frame.height
          });
        } catch (error) {
          console.error(`Error generating thumbnail for frame ${frameId}:`, error);
        }

        // Find all texts in the frame
        const texts = collectVisibleTextsFromFrame(frame);
        const ancestorNames = collectAncestorNames(frame);
        const namesBundle = [frame.name || '', ...ancestorNames];
        const allTextsForSearch = [...texts, ...namesBundle];
        frameData.texts = allTextsForSearch.join(' ');
        frameData.searchTokens = buildSearchTokens(allTextsForSearch);

        indexData.frames.push(frameData);
      }
    }

    return indexData;
  } catch (error) {
    console.error('Error creating index for page:', error);
    throw error;
  }
}

async function createIndexForAllPages() {
  try {
    const allPages = figma.root.children
      .filter(p => p.type === "PAGE" && p.name !== "FigDex" && !/^[-\s]+$/.test(p.name.trim()))
      .map((p, i) => ({ id: p.id, name: p.name, index: i }));

    const allIndexData = {
      data: {
        frames: []
      }
    };

    for (const page of allPages) {
      try {
        const __PAGE_INDEX__Data = await createIndexForPage(page.id, page.name, page.index);
        allIndexData.data.frames.push(...__PAGE_INDEX__Data.frames);
      } catch (error) {
        console.error(`Error processing page ${page.name}:`, error);
      }
    }

    return allIndexData;
  } catch (error) {
    console.error('Error creating index for all pages:', error);
    throw error;
  }
}

// Initialize pages
(async () => {
  await figma.loadAllPagesAsync();
  const allPages = figma.root.children
    .filter(p =>
    p.type === "PAGE" &&
    p.name !== "FigDex" &&
    !/^[-\s]+$/.test(p.name.trim()))
  .map(p => ({
    id: p.id,
    name: p.name,
    hasFrames: p.children && p.children.some(node =>
      node.type === "FRAME" ||
      (node.type === "SECTION" && node.children && node.children.some(child => child.type === "FRAME"))
    ),
    isIndexPage: p.name === "Frame-Index"
  }));

  // מיון: עמוד אינדקס בראש, אחר כך שאר העמודים
  const sortedPages = allPages.sort((a, b) => {
    if (a.isIndexPage && !b.isIndexPage) return -1;
    if (!a.isIndexPage && b.isIndexPage) return 1;
    return 0;
  });

  let lastFolder = null;
  const pages = sortedPages.map((page, i) => {
    if (page.isIndexPage) {
      return {
        id: page.id,
        name: page.name,
        hasFrames: false, // מוגדר כ-disabled
        displayName: page.name,
        isFolder: false,
        isIndexPage: true
      };
    }
    if (!page.hasFrames) {
      lastFolder = page.name;
      return {
        id: page.id,
        name: page.name,
        hasFrames: page.hasFrames,
        displayName: page.name,
        isFolder: true
      };
    }
    let displayName = page.name;
    const trimmedName = page.name.trim();
    if (trimmedName.startsWith("↪") && lastFolder) {
      const cleanName = trimmedName.replace(/^↪\s*/, "");
      displayName = `${lastFolder} -> ${cleanName}`;
    } else if (page.hasFrames) {
      lastFolder = null;
    }
    return {
      id: page.id,
      name: page.name,
      displayName,
      hasFrames: page.hasFrames,
      isFolder: false
    };
  });

  figma.ui.postMessage({ type: 'pages', pages });
})();

