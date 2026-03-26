/**
 * FigDex plugin — code.js (hard reset).
 * Single postMessage pipeline: UI -> code -> UI.
 * No legacy handlers. mockConnectedIdentity for dev only (no UI flag).
 */
const PLUGIN_VERSION = '1.32.17';
const DEBUG_LOGS = false;
figma.showUI(__html__, { width: 386, height: 800 });

function debugLog() {
  if (!DEBUG_LOGS) return;
  try { console.log.apply(console, arguments); } catch (e) {}
}

try { figma.ui.postMessage({ type: 'plugin-version', version: PLUGIN_VERSION }); } catch (e) {}
setTimeout(() => { try { figma.ui.postMessage({ type: 'plugin-version', version: PLUGIN_VERSION }); } catch (e) {} }, 500);

const rootId = figma.root.id || '0:0';
function normalizeDocumentToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[|:]/g, '-');
}
function simpleHash(value) {
  var input = String(value || '');
  var hash = 5381;
  for (var i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36);
}
function getCurrentDocumentFallbackScope() {
  var docName = normalizeDocumentToken(figma.root.name || 'untitled');
  var pages = Array.isArray(figma.root.children) ? figma.root.children : [];
  var pageNames = [];
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    if (page && page.type === 'PAGE') pageNames.push(normalizeDocumentToken(page.name || 'page'));
  }
  var signature = docName + '|' + pageNames.length + '|' + pageNames.join('|');
  return 'doc:' + simpleHash(signature);
}
function getLegacyDocumentScopeIds() {
  var scopes = [];
  var currentFallbackScope = getCurrentDocumentFallbackScope();
  if (currentFallbackScope) scopes.push(currentFallbackScope);
  var docName = (typeof figma.root.name === 'string' && figma.root.name.trim()) ? figma.root.name.trim().toLowerCase() : '';
  if (docName) scopes.push('docname:' + docName);
  if (rootId) scopes.push(rootId);
  return Array.from(new Set(scopes.filter(Boolean)));
}
function getCurrentDocumentId() {
  var liveFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  if (liveFileKey) return 'file:' + liveFileKey;
  return getCurrentDocumentFallbackScope();
}
figma.ui.postMessage({ type: 'set-document-id', documentId: getCurrentDocumentId() });
figma.on('currentpagechange', () => {
  figma.ui.postMessage({ type: 'set-document-id', documentId: getCurrentDocumentId() });
});

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  const hasSelection = selection.length > 0;
  const hasFrameSelection = selection.some(n => n.type === 'FRAME');
  const selectedFrames = selection.filter(n => n.type === 'FRAME').map(n => n.id);
  figma.ui.postMessage({ type: 'selection-status', hasSelection, hasFrameSelection, selectedFrames });
});

// --- Dev: simulate connected identity (no UI flag) ---
const mockConnectedIdentity = false;

// --- Storage ---
const STORAGE_KEYS = {
  FILE_KEY: 'fileKey',
  FILE_NAME: 'fileName',
  SELECTED_PAGES: 'selectedPages',
  INDEXED_PAGES: 'indexedPages',
  WEB_TOKEN: 'webToken',
  WEB_USER: 'webUser',
  CONNECT_NONCE_DATA: 'connectNonceData',
  ANON_ID: 'anonId',
  HAS_EVER_INDEXED: 'hasEverIndexed'
};

const GLOBAL_STORAGE_KEYS = [STORAGE_KEYS.WEB_TOKEN, STORAGE_KEYS.WEB_USER, STORAGE_KEYS.ANON_ID, STORAGE_KEYS.HAS_EVER_INDEXED];
const DOCUMENT_SCOPED_STORAGE_KEYS = [STORAGE_KEYS.FILE_KEY, STORAGE_KEYS.FILE_NAME, STORAGE_KEYS.SELECTED_PAGES, STORAGE_KEYS.INDEXED_PAGES, STORAGE_KEYS.CONNECT_NONCE_DATA];

function getDocumentScopeId() {
  var liveFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  if (liveFileKey) return liveFileKey;
  var fallbackScope = getCurrentDocumentFallbackScope();
  if (fallbackScope) return fallbackScope;
  return figma.root.id || rootId || '0:0';
}

function hasReliableCurrentFileKey() {
  return typeof figma.fileKey === 'string' && !!figma.fileKey.trim();
}

function cryptoRandomString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
function storageKey(key) {
  return GLOBAL_STORAGE_KEYS.indexOf(key) >= 0 ? 'figdex_' + key : 'figdex_' + getDocumentScopeId() + '_' + key;
}
function storageKeyForScope(scopeId, key) {
  return GLOBAL_STORAGE_KEYS.indexOf(key) >= 0 ? 'figdex_' + key : 'figdex_' + scopeId + '_' + key;
}
async function getStored(key, def) {
  try {
    const v = await figma.clientStorage.getAsync(storageKey(key));
    return v !== undefined ? v : def;
  } catch (e) { return def; }
}
async function getStoredForScope(scopeId, key, def) {
  try {
    const v = await figma.clientStorage.getAsync(storageKeyForScope(scopeId, key));
    return v !== undefined ? v : def;
  } catch (e) { return def; }
}
async function setStored(key, value) {
  try { await figma.clientStorage.setAsync(storageKey(key), value); } catch (e) { console.error(e); }
}
async function setStoredForScope(scopeId, key, value) {
  try { await figma.clientStorage.setAsync(storageKeyForScope(scopeId, key), value); } catch (e) { console.error(e); }
}
async function deleteStoredForScope(scopeId, key) {
  try { await figma.clientStorage.deleteAsync(storageKeyForScope(scopeId, key)); } catch (e) { console.warn('deleteStoredForScope:', scopeId, key, e); }
}

async function migrateDocumentScopedStateToReliableFileKey() {
  var reliableFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  if (!reliableFileKey) return;
  var legacyScopes = getLegacyDocumentScopeIds().filter(function (scopeId) { return scopeId && scopeId !== reliableFileKey; });
  if (!legacyScopes.length) return;
  for (var li = 0; li < legacyScopes.length; li++) {
    var legacyScope = legacyScopes[li];
    for (var ki = 0; ki < DOCUMENT_SCOPED_STORAGE_KEYS.length; ki++) {
      var scopedKey = DOCUMENT_SCOPED_STORAGE_KEYS[ki];
      var currentValue = await getStoredForScope(reliableFileKey, scopedKey, undefined);
      if (currentValue !== undefined && currentValue !== null) continue;
      var legacyValue = await getStoredForScope(legacyScope, scopedKey, undefined);
      if (legacyValue === undefined || legacyValue === null) continue;
      await setStoredForScope(reliableFileKey, scopedKey, legacyValue);
    }
  }
}

async function deleteCurrentDocumentLegacyState() {
  var reliableFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  var scopes = getLegacyDocumentScopeIds();
  if (reliableFileKey) scopes.push(reliableFileKey);
  var uniqueScopes = Array.from(new Set(scopes.filter(Boolean)));
  for (var si = 0; si < uniqueScopes.length; si++) {
    for (var ki = 0; ki < DOCUMENT_SCOPED_STORAGE_KEYS.length; ki++) {
      await deleteStoredForScope(uniqueScopes[si], DOCUMENT_SCOPED_STORAGE_KEYS[ki]);
    }
    await deleteStoredForScope(uniqueScopes[si], STORAGE_KEYS.WEB_TOKEN);
    await deleteStoredForScope(uniqueScopes[si], STORAGE_KEYS.WEB_USER);
  }
}

const FETCH_TIMEOUT_MS = 90000; // 90s — server allows 60s, extra buffer for large uploads
const CHUNK_RETRYABLE_STATUSES = { 429: true, 502: true, 503: true, 504: true };
const MAX_CHUNK_UPLOAD_ATTEMPTS = 4;

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function getRetryAfterMs(res, attempt) {
  try {
    if (res && res.headers && typeof res.headers.get === 'function') {
      var retryAfter = res.headers.get('Retry-After');
      if (retryAfter) {
        var seconds = Number(retryAfter);
        if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
      }
    }
  } catch (e) {}
  return Math.min(12000, 1500 * Math.pow(2, Math.max(0, attempt - 1)));
}
function fetchWithTimeout(url, opts) {
  var controller = null;
  try { controller = new AbortController(); } catch (e) { controller = null; }
  var timeoutId = null;
  var timeoutPromise = new Promise(function (_, reject) {
    timeoutId = setTimeout(function () {
      if (controller) controller.abort();
      reject(new Error('Request timed out. The server may be slow or unreachable. Try again.'));
    }, FETCH_TIMEOUT_MS);
  });
  var opts2 = opts || {};
  if (controller) opts2.signal = controller.signal;
  return Promise.race([
    fetch(url, opts2).then(function (res) {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

async function postChunkWithRetry(url, requestOptions, meta) {
  var lastError = null;
  var lastResponse = null;
  for (var attempt = 1; attempt <= MAX_CHUNK_UPLOAD_ATTEMPTS; attempt++) {
    try {
      var response = await fetchWithTimeout(url, requestOptions);
      if (response.ok) {
        return { ok: true, response: response, attempts: attempt };
      }
      lastResponse = response;
      var isRetryable = !!CHUNK_RETRYABLE_STATUSES[response.status];
      if (!isRetryable || attempt === MAX_CHUNK_UPLOAD_ATTEMPTS) {
        return { ok: false, response: response, attempts: attempt };
      }
      var waitMs = getRetryAfterMs(response, attempt);
      var retryStep = 'Retrying part ' + meta.chunkNumber + '/' + meta.totalChunks + ' in ' + Math.ceil(waitMs / 1000) + 's...';
      figma.notify(retryStep, { timeout: 1500 });
      figma.ui.postMessage({ type: 'upload-progress', step: retryStep, framesDone: meta.framesDone });
      await sleep(waitMs);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_CHUNK_UPLOAD_ATTEMPTS) break;
      var networkWaitMs = Math.min(10000, 1200 * Math.pow(2, Math.max(0, attempt - 1)));
      var networkRetryStep = 'Connection issue on part ' + meta.chunkNumber + '/' + meta.totalChunks + '. Retrying...';
      figma.notify(networkRetryStep, { timeout: 1500 });
      figma.ui.postMessage({ type: 'upload-progress', step: networkRetryStep, framesDone: meta.framesDone });
      await sleep(networkWaitMs);
    }
  }
  return { ok: false, response: lastResponse, error: lastError, attempts: MAX_CHUNK_UPLOAD_ATTEMPTS };
}

function estimateJsonBytes(value) {
  try {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    }
  } catch (e) {}
  try {
    return JSON.stringify(value).length;
  } catch (e) {
    return 0;
  }
}

function countFramesInChunkPages(chunkPages) {
  if (!Array.isArray(chunkPages)) return 0;
  var total = 0;
  for (var i = 0; i < chunkPages.length; i++) {
    var page = chunkPages[i];
    total += Array.isArray(page && page.frames) ? page.frames.length : 0;
  }
  return total;
}

function splitChunkPagesInHalf(chunkPages) {
  if (!Array.isArray(chunkPages) || chunkPages.length === 0) return null;
  var flattened = [];
  for (var i = 0; i < chunkPages.length; i++) {
    var page = chunkPages[i];
    var frames = Array.isArray(page && page.frames) ? page.frames : [];
    for (var j = 0; j < frames.length; j++) {
      flattened.push({
        id: page.id || page.pageId,
        name: page.name || page.pageName || 'Page',
        frame: frames[j]
      });
    }
  }
  if (flattened.length <= 1) return null;
  var midpoint = Math.ceil(flattened.length / 2);
  function buildChunk(entries) {
    var pageMap = {};
    for (var k = 0; k < entries.length; k++) {
      var entry = entries[k];
      if (!pageMap[entry.id]) pageMap[entry.id] = { id: entry.id, name: entry.name, frames: [] };
      pageMap[entry.id].frames.push(entry.frame);
    }
    var pages = [];
    for (var pageId in pageMap) pages.push(pageMap[pageId]);
    return pages;
  }
  return [buildChunk(flattened.slice(0, midpoint)), buildChunk(flattened.slice(midpoint))];
}

function normalizeChunkSpecsForRequestSize(chunkSpecs, options) {
  var specs = Array.isArray(chunkSpecs) ? chunkSpecs.slice() : [];
  var normalized = [];
  var maxBytes = options && options.maxBytes ? options.maxBytes : 7 * 1024 * 1024;
  while (specs.length > 0) {
    var chunkPages = specs.shift();
    var chunkBody = {
      fileKey: options.fileKey,
      docId: options.docId,
      fileName: options.fileName,
      chunkIndex: 0,
      totalChunks: 1,
      selectedPages: options.selectedPages,
      source: 'figma-plugin',
      version: options.version,
      galleryOnly: true,
      imageQuality: 0.75,
      indexPayload: { pages: chunkPages },
      coverImageDataUrl: options.includeCover ? (options.coverImageDataUrl || undefined) : undefined
    };
    if (options.mergePages && options.replacePageIds && options.replacePageIds.length > 0) {
      chunkBody.mergePages = true;
      chunkBody.replacePageIds = options.replacePageIds;
    }
    if (options.anonId) chunkBody.anonId = options.anonId;
    var estimatedBytes = estimateJsonBytes(chunkBody);
    if (estimatedBytes <= maxBytes || countFramesInChunkPages(chunkPages) <= 1) {
      normalized.push(chunkPages);
      continue;
    }
    var splitChunks = splitChunkPagesInHalf(chunkPages);
    if (!splitChunks) {
      normalized.push(chunkPages);
      continue;
    }
    specs.unshift(splitChunks[1]);
    specs.unshift(splitChunks[0]);
  }
  return normalized;
}

function getAdaptiveExportScale(width, height) {
  var w = Math.max(1, Number(width) || 1);
  var h = Math.max(1, Number(height) || 1);
  var longestSide = Math.max(w, h);
  var pixelArea = w * h;
  var scale = 0.75;
  if (longestSide > 20000 || pixelArea > 40000000) scale = Math.min(scale, 0.12);
  else if (longestSide > 14000 || pixelArea > 24000000) scale = Math.min(scale, 0.18);
  else if (longestSide > 10000 || pixelArea > 16000000) scale = Math.min(scale, 0.24);
  else if (longestSide > 7000 || pixelArea > 9000000) scale = Math.min(scale, 0.33);
  else if (longestSide > 4500 || pixelArea > 5000000) scale = Math.min(scale, 0.5);
  return Math.max(0.08, scale);
}

async function exportFrameImageData(frame, width, height) {
  var attempts = [getAdaptiveExportScale(width, height), 0.5, 0.33, 0.24, 0.18, 0.12, 0.08];
  var tried = {};
  for (var i = 0; i < attempts.length; i++) {
    var scale = Math.max(0.08, Math.min(1, attempts[i]));
    var key = scale.toFixed(3);
    if (tried[key]) continue;
    tried[key] = true;
    try {
      var bytes = await frame.exportAsync({ format: 'JPG', constraint: { type: 'SCALE', value: scale } });
      if (bytes && bytes.length > 0) {
        return { bytes: bytes, scale: scale };
      }
    } catch (e) {}
  }
  throw new Error('FRAME_EXPORT_FAILED');
}

let globalFileKey = '';
let sessionFileKey = '';

// --- Helpers for gallery index payload (per plugin/docs/OLD_INDEX_LOGIC_FINDINGS.md) ---
// Top-level frames: (1) direct FRAME children of Page; (2) direct FRAME children of each Section (one level only). Excludes [NO_INDEX].
function getTopLevelFrameIds(page) {
  var ids = [];
  var children = page.children || [];
  for (var i = 0; i < children.length; i++) {
    var node = children[i];
    if (node.type === 'FRAME') {
      if ((node.name || '').indexOf('[NO_INDEX]') >= 0) continue;
      ids.push(node.id);
    }
    if (node.type === 'SECTION' && node.children) {
      for (var j = 0; j < node.children.length; j++) {
        var child = node.children[j];
        if (child.type === 'FRAME' && (child.name || '').indexOf('[NO_INDEX]') < 0) ids.push(child.id);
      }
    }
  }
  return ids;
}
// Same set as getTopLevelFrameIds but returns frame nodes (for cover selection).
function getTopLevelFrameNodes(page) {
  var nodes = [];
  var children = page.children || [];
  for (var i = 0; i < children.length; i++) {
    var node = children[i];
    if (node.type === 'FRAME') {
      if ((node.name || '').indexOf('[NO_INDEX]') >= 0) continue;
      nodes.push(node);
    }
    if (node.type === 'SECTION' && node.children) {
      for (var j = 0; j < node.children.length; j++) {
        var child = node.children[j];
        if (child.type === 'FRAME' && (child.name || '').indexOf('[NO_INDEX]') < 0) nodes.push(child);
      }
    }
  }
  return nodes;
}
// Returns the name of the Section that contains this frame (or null if not inside a Section).
function getSectionNameForFrame(frame) {
  try {
    var cur = frame.parent;
    var guard = 0;
    while (cur && guard++ < 50) {
      if (cur.type === 'SECTION' && cur.name) return cur.name;
      cur = cur.parent;
    }
  } catch (e) {}
  return null;
}
function isNodeVisible(node) {
  try {
    var cur = node;
    while (cur) {
      if (cur.visible === false) return false;
      cur = cur.parent;
    }
    return true;
  } catch (e) { return true; }
}
function collectVisibleTextsFromFrame(frame) {
  try {
    var textNodes = frame.findAll(function (n) { return n.type === 'TEXT'; });
    var texts = [];
    for (var i = 0; i < textNodes.length; i++) {
      var t = textNodes[i];
      if (isNodeVisible(t) && t.characters) texts.push(t.characters);
    }
    return texts;
  } catch (e) { return []; }
}
function collectAncestorNames(frame) {
  var names = [];
  try {
    var cur = frame.parent;
    var guard = 0;
    while (cur && guard++ < 50) {
      if (cur.name && typeof cur.name === 'string') names.push(cur.name);
      cur = cur.parent;
    }
  } catch (e) {}
  return names;
}
function buildSearchTokens(rawTexts) {
  try {
    var joined = Array.isArray(rawTexts) ? rawTexts.join(' ') : String(rawTexts || '');
    var normalized = joined.toLowerCase().replace(/\n+/g, ' ').replace(/[^A-Za-z0-9_\-\s\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    var tokens = normalized.split(' ');
    var filtered = tokens.filter(function (t) { return t && t.length >= 2; });
    return Array.from(new Set(filtered)).slice(0, 500);
  } catch (e) { return []; }
}

// Content hint for change detection: shallow structure (child type + child count per child)
function getContentHint(node) {
  try {
    if (!node || !('children' in node)) return '0';
    var c = node.children;
    if (!c || c.length === 0) return '0';
    return c.map(function (ch) {
      var count = ('children' in ch && ch.children) ? ch.children.length : 0;
      return ch.type + ':' + count;
    }).join(',');
  } catch (e) { return '0'; }
}

// Text content signature: collect text from all TEXT descendants (for change detection)
async function getTextHintAsync(node, depth, acc) {
  if (!node || depth > 5 || (acc && acc.length > 600)) return acc;
  acc = acc || [];
  if (node.type === 'TEXT') {
    try {
      var fontName = node.fontName;
      if (fontName && fontName !== figma.mixed) {
        await figma.loadFontAsync(fontName);
      } else if (node.getRangeAllFontNames) {
        try {
          var len = node.characters ? node.characters.length : 0;
          if (len > 0) {
            var fonts = node.getRangeAllFontNames(0, len);
            for (var fi = 0; fi < fonts.length; fi++) {
              await figma.loadFontAsync(fonts[fi]);
            }
          }
        } catch (e2) { /* mixed font: chars may throw before load */ }
      }
      var chars = node.characters;
      if (typeof chars === 'string') acc.push(chars.slice(0, 150));
    } catch (e) { /* skip on font/read error */ }
  }
  if ('children' in node && node.children) {
    for (var i = 0; i < node.children.length; i++) {
      await getTextHintAsync(node.children[i], depth + 1, acc);
    }
  }
  return acc;
}

// Build a signature for a frame to detect changes (name, size, structure, text). Same order as getTopLevelFrameIds.
async function getFrameSignaturesForPage(page) {
  var frameIds = getTopLevelFrameIds(page);
  var sigs = [];
  for (var i = 0; i < frameIds.length; i++) {
    try {
      var frame = await figma.getNodeByIdAsync(frameIds[i]);
      if (!frame || frame.type !== 'FRAME') continue;
      if (typeof frame.loadAsync === 'function') await frame.loadAsync();
      var textParts = await getTextHintAsync(frame, 0, []);
      var textHint = textParts.join('|').slice(0, 500);
      sigs.push({
        id: frame.id,
        name: (frame.name || '').trim(),
        width: Math.round(frame.width),
        height: Math.round(frame.height),
        contentHint: getContentHint(frame),
        textHint: textHint
      });
    } catch (e) { /* skip */ }
  }
  return sigs;
}
function frameSignaturesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    var x = a[i];
    var y = b[i];
    if (!x || !y || x.id !== y.id || (x.name || '') !== (y.name || '') || x.width !== y.width || x.height !== y.height) return false;
    if (x.contentHint && y.contentHint && x.contentHint !== y.contentHint) return false;
    if (x.textHint && y.textHint && x.textHint !== y.textHint) return false;
  }
  return true;
}

// Same cover as plugin UI (Cover page/frame or current page, largest frame). Used for get-file-thumbnail and create-index cover.
async function getCoverImageDataUrl() {
  await figma.loadAllPagesAsync();
  var pages = figma.root.children.filter(function (p) { return p.type === 'PAGE' && p.name !== 'FigDex'; });
  var coverPage = pages.find(function (p) { return (p.name || '').trim().toLowerCase() === 'cover'; }) || null;
  var pagesToTry = [];
  if (coverPage) pagesToTry.push(coverPage);
  if (figma.currentPage) pagesToTry.push(figma.currentPage);
  pages.forEach(function (p) { if (!pagesToTry.some(function (t) { return t.id === p.id; })) pagesToTry.push(p); });
  if (pagesToTry.length === 0) return null;
  var framesToTry = [];
  for (var i = 0; i < pagesToTry.length; i++) {
    var page = pagesToTry[i];
    try { if (typeof page.loadAsync === 'function') await page.loadAsync(); } catch (e) {}
    // Use same top-level frames as index (direct FRAME children of Page or Section). Auto-layout frames count the same as regular frames.
    var pageFrames = getTopLevelFrameNodes(page);
    if (pageFrames.length > 0) { framesToTry = pageFrames; break; }
  }
  if (framesToTry.length === 0) return null;
  framesToTry = framesToTry.filter(function (f) { return (f.width || 0) >= 10 && (f.height || 0) >= 10 && f.visible !== false; });
  var frameToExport = framesToTry.find(function (f) { return (f.name || '').trim().toLowerCase() === 'cover'; });
  if (!frameToExport) {
    framesToTry.sort(function (a, b) { return (b.width * b.height) - (a.width * a.height); });
    frameToExport = framesToTry[0];
  }
  try { if (typeof frameToExport.loadAsync === 'function') await frameToExport.loadAsync(); } catch (e) {}
  // Export at 0.75 scale to keep payload size reasonable (cover + frames in first chunk)
  var bytes = await frameToExport.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 0.75 } });
  var dataUrl = 'data:image/png;base64,' + figma.base64Encode(bytes);
  if (dataUrl.length < 2000) {
    try {
      var pageNode = coverPage || figma.currentPage;
      if (pageNode) {
        var pageBytes = await pageNode.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 0.5 } });
        var pageDataUrl = 'data:image/png;base64,' + figma.base64Encode(pageBytes);
        if (pageDataUrl.length > dataUrl.length) dataUrl = pageDataUrl;
      }
    } catch (e) {}
  }
  return dataUrl;
}

// --- Bootstrap: load storage and send to UI ---
function sendStoredIdentityToUI(webToken, webUser) {
  if (mockConnectedIdentity) {
    figma.ui.postMessage({
      type: 'WEB_ACCOUNT_DATA_LOADED',
      token: 'mock_token_' + Date.now(),
      user: { email: 'mock@figdex.local', name: 'Mock User' }
    });
  } else if (webToken && typeof webToken === 'string' && webToken.length >= 10) {
    // Token alone is enough for indexing; UI needs minimal user for "Connected" display
    var user = webUser && typeof webUser === 'object' ? webUser : { id: 'connected', email: 'Account connected' };
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_DATA_LOADED', token: webToken, user: user });
  } else {
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_DATA_LOADED', token: null, user: null });
  }
}

async function clearStoredWebIdentity() {
  await setStored(STORAGE_KEYS.WEB_TOKEN, null);
  await setStored(STORAGE_KEYS.WEB_USER, null);
  figma.ui.postMessage({ type: 'WEB_ACCOUNT_DATA_LOADED', token: null, user: null });
  figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: null });
}

async function refreshStoredWebUser(webToken) {
  if (!webToken || typeof webToken !== 'string' || webToken.length < 10) return null;
  try {
    var validateRes = await fetchWithTimeout('https://www.figdex.com/api/validate-api-key', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + webToken }
    });
    if (!validateRes.ok) {
      if (validateRes.status === 401 || validateRes.status === 404) {
        await clearStoredWebIdentity();
      }
      return null;
    }
    var validateData = await validateRes.json();
    if (!validateData || !validateData.user || typeof validateData.user !== 'object') return null;
    await setStored(STORAGE_KEYS.WEB_USER, validateData.user);
    return validateData.user;
  } catch (e) {
    return null;
  }
}

async function loadUserLimitsToUI(webToken) {
  if (!webToken || typeof webToken !== 'string' || webToken.length < 10) {
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: null });
    return null;
  }
  try {
    var limitsRes = await fetchWithTimeout('https://www.figdex.com/api/user/limits', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + webToken }
    });
    if (!limitsRes.ok) {
      if (limitsRes.status === 401 || limitsRes.status === 404) {
        await clearStoredWebIdentity();
      }
      return null;
    }
    var limitsJson = await limitsRes.json();
    var limits = limitsJson && limitsJson.limits ? limitsJson.limits : null;
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: limits });
    return limits;
  } catch (e) {
    return null;
  }
}
(async function bootstrap() {
  await migrateDocumentScopedStateToReliableFileKey();
  var savedKey = await getStored(STORAGE_KEYS.FILE_KEY, null);
  // Fallback: figma.fileKey gives current file's key (when available, e.g. published plugins)
  if (!savedKey && typeof figma.fileKey === 'string' && figma.fileKey.trim()) {
    savedKey = figma.fileKey.trim();
    globalFileKey = savedKey;
    await setStored(STORAGE_KEYS.FILE_KEY, savedKey);
  }
  if (savedKey) {
    globalFileKey = savedKey;
    sessionFileKey = savedKey;
    figma.ui.postMessage({ type: 'set-file-key', fileKey: savedKey });
  }
  var webToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
  var webUser = await getStored(STORAGE_KEYS.WEB_USER, null);
  // One-time migration: token used to be stored per-document; move to global key if found
  if ((!webToken || !webUser) && (figma.root.id || '0:0')) {
    try {
      var docKey = 'figdex_' + getDocumentScopeId() + '_';
      var oldToken = await figma.clientStorage.getAsync(docKey + 'webToken');
      var oldUser = await figma.clientStorage.getAsync(docKey + 'webUser');
      if (oldToken && oldUser) {
        await setStored(STORAGE_KEYS.WEB_TOKEN, oldToken);
        await setStored(STORAGE_KEYS.WEB_USER, oldUser);
        webToken = oldToken;
        webUser = oldUser;
      }
    } catch (e) { /* ignore */ }
  }
  if (webToken) {
    var refreshedWebUser = await refreshStoredWebUser(webToken);
    if (refreshedWebUser) webUser = refreshedWebUser;
    webToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
    webUser = await getStored(STORAGE_KEYS.WEB_USER, null);
  }
  sendStoredIdentityToUI(webToken, webUser);
  await loadUserLimitsToUI(webToken);
  webToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
  webUser = await getStored(STORAGE_KEYS.WEB_USER, null);
  var anonId = await getOrCreateAnonId();
  figma.ui.postMessage({ type: 'TELEMETRY_ANON_ID', anonId: anonId });
  if (webToken && typeof webToken === 'string' && anonId) {
    try {
      var br = await fetch('https://www.figdex.com/api/claim/by-anon-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + webToken },
        body: JSON.stringify({ anonId: anonId })
      });
      var bd = br.ok ? await br.json() : {};
      if (bd.claimed > 0) {
        debugLog('[FigDex] bootstrap claim_by_anon_id claimed=' + bd.claimed);
      }
    } catch (_) {}
  }
  // Restore last selected pages for this document so page selection survives reload
  try {
    var savedSelectedPages = await getStored(STORAGE_KEYS.SELECTED_PAGES, null);
    if (Array.isArray(savedSelectedPages) && savedSelectedPages.length > 0) {
      figma.ui.postMessage({ type: 'set-selected-pages', pages: savedSelectedPages });
    }
  } catch (e) { /* ignore */ }
  // Resend after delay so UI gets identity if it missed the first message (race on load)
  setTimeout(function () { sendStoredIdentityToUI(webToken, webUser); }, 400);
  setTimeout(function () { sendStoredIdentityToUI(webToken, webUser); }, 1200);
  setTimeout(function () { loadUserLimitsToUI(webToken); }, 700);
  setTimeout(function () {
    getOrCreateAnonId().then(function (id) { figma.ui.postMessage({ type: 'TELEMETRY_ANON_ID', anonId: id }); });
  }, 500);
})();

async function getOrCreateAnonId() {
  var id = await getStored(STORAGE_KEYS.ANON_ID, null);
  if (!id || typeof id !== 'string') {
    id = cryptoRandomString() + cryptoRandomString();
    await setStored(STORAGE_KEYS.ANON_ID, id);
  }
  return id;
}

// --- Single message handler ---
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'UI_STATE_CHANGED') {
    figma.ui.postMessage({ type: 'UI_RENDER', payload: { state: msg.state, model: msg.model || {} } });
    return;
  }
  if (msg.type === 'set-file-key') {
    globalFileKey = msg.fileKey || '';
    sessionFileKey = globalFileKey;
    await setStored(STORAGE_KEYS.FILE_KEY, globalFileKey);
    await setStored(STORAGE_KEYS.FILE_NAME, msg.fileName != null ? msg.fileName : (figma.root.name || 'Untitled'));
    return;
  }
  if (msg.type === 'get-file-key') {
    figma.ui.postMessage({ type: 'set-file-key', fileKey: globalFileKey || '' });
    return;
  }
  if (msg.type === 'get_anon_id') {
    var anonId = await getOrCreateAnonId();
    figma.ui.postMessage({ type: 'TELEMETRY_ANON_ID', anonId: anonId });
    return;
  }
  if (msg.type === 'get-has-ever-indexed') {
    var hasEver = await getStored(STORAGE_KEYS.HAS_EVER_INDEXED, false);
    figma.ui.postMessage({ type: 'HAS_EVER_INDEXED', hasEverCompletedIndex: !!hasEver });
    return;
  }
  if (msg.type === 'refresh-pages' || msg.type === 'get-pages') {
    await figma.loadAllPagesAsync();
    const allPages = figma.root.children
      .filter(p => p.type === 'PAGE' && p.name !== 'FigDex')
      .map(p => ({
        id: p.id,
        name: p.name,
        hasFrames: p.children && p.children.some(n => n.type === 'FRAME' || (n.type === 'SECTION' && n.children && n.children.some(c => c.type === 'FRAME'))),
        isIndexPage: p.name === 'Frame-Index',
        isCoverPage: (p.name || '').trim().toLowerCase() === 'cover'
      }));
    // Use stored indexed pages metadata (per document) to mark pages that were already indexed
    let indexedMeta = [];
    try { indexedMeta = await getStored(STORAGE_KEYS.INDEXED_PAGES, []); } catch (e) { indexedMeta = []; }
    const metaByPage = Array.isArray(indexedMeta) ? Object.fromEntries(indexedMeta.map(m => [m.pageId, m])) : {};
    const pages = [];
    for (var pi = 0; pi < allPages.length; pi++) {
      var p = allPages[pi];
      var status = 'not_indexed';
      var icon = '➕';
      if (!p.hasFrames) {
        status = 'folder';
        icon = '📁';
      } else if (p.isIndexPage) {
        status = 'index_page';
        icon = '📄';
      } else if (metaByPage[p.id]) {
        var stored = metaByPage[p.id];
        try {
          var pageNode = await figma.getNodeByIdAsync(p.id);
          if (pageNode && pageNode.type === 'PAGE') {
            var currentSigs = await getFrameSignaturesForPage(pageNode);
            var storedSigs = stored && Array.isArray(stored.frameSignatures) ? stored.frameSignatures : null;
            if (storedSigs && frameSignaturesEqual(currentSigs, storedSigs)) {
              status = 'up_to_date';
              icon = '✅';
            } else {
              status = 'needs_update';
              icon = '🔄';
            }
          } else {
            status = 'up_to_date';
            icon = '✅';
          }
        } catch (e) {
          status = 'up_to_date';
          icon = '✅';
        }
      }
      pages.push({
        id: p.id,
        name: p.name,
        hasFrames: p.hasFrames,
        displayName: p.name,
        isFolder: !p.hasFrames,
        isIndexPage: p.isIndexPage,
        isCoverPage: p.isCoverPage,
        status: status,
        icon: icon
      });
    }
    var savedSelectedIds = [];
    try { savedSelectedIds = await getStored(STORAGE_KEYS.SELECTED_PAGES, []); } catch (e) { savedSelectedIds = []; }
    if (!Array.isArray(savedSelectedIds)) savedSelectedIds = [];
    figma.ui.postMessage({ type: 'pages', pages: pages, selectedPageIds: savedSelectedIds });
    return;
  }
  if (msg.type === 'save-web-system-token') {
    await setStored(STORAGE_KEYS.WEB_TOKEN, msg.token);
    if (msg.token && !(await getStored(STORAGE_KEYS.WEB_USER, null))) {
      await setStored(STORAGE_KEYS.WEB_USER, { id: 'connected', email: 'Account connected' });
    }
    sendStoredIdentityToUI(msg.token, await getStored(STORAGE_KEYS.WEB_USER, null));
    return;
  }
  if (msg.type === 'save-web-system-user') {
    await setStored(STORAGE_KEYS.WEB_USER, msg.user);
    return;
  }
  if (msg.type === 'save-selected-pages') {
    await setStored(STORAGE_KEYS.SELECTED_PAGES, msg.pages || []);
    return;
  }
  if (msg.type === 'clear-storage') {
    var keysToClear = Object.values(STORAGE_KEYS);
    for (const k of keysToClear) {
      try { await figma.clientStorage.deleteAsync(storageKey(k)); } catch (e) { console.warn('clear-storage:', k, e); }
    }
    await deleteCurrentDocumentLegacyState();
    globalFileKey = '';
    sessionFileKey = '';
    figma.ui.postMessage({ type: 'set-file-key', fileKey: '' });
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_DATA_LOADED', token: null, user: null });
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: null });
    return;
  }
  if (msg.type === 'clear-indexed-pages') {
    try { await figma.clientStorage.deleteAsync(storageKey(STORAGE_KEYS.INDEXED_PAGES)); } catch (e) { console.warn('clear-indexed-pages:', e); }
    figma.notify('Local index cleared — pages will show as not indexed');
    figma.ui.postMessage({ type: 'refresh-pages' });
    return;
  }
  if (msg.type === 'UI_OPEN_FIGDEX_WEB_UPGRADE') {
    const connectNonce = cryptoRandomString();
    const docId = figma.root.id || rootId || '0:0';
    const anonId = await getOrCreateAnonId();
    await setStored(STORAGE_KEYS.CONNECT_NONCE_DATA, { nonce: connectNonce, createdAt: Date.now() });
    let connectUrl = 'https://www.figdex.com/plugin-connect?nonce=' + encodeURIComponent(connectNonce) + '&docId=' + encodeURIComponent(docId) + '&mode=upgrade&anonId=' + encodeURIComponent(anonId);
    figma.ui.postMessage({ type: 'OPEN_FIGDEX_WEB', url: connectUrl });
    debugLog('[FigDex] poll_start upgrade');
    const POLL_INTERVAL_MS = 2000;
    const POLL_MAX_MS = 120000;
    const pollStart = Date.now();
    const doPoll = async () => {
      if (Date.now() - pollStart >= POLL_MAX_MS) {
        debugLog('[FigDex] poll_timeout');
        figma.ui.postMessage({ type: 'CONNECT_TIMEOUT' });
        return;
      }
      try {
        const res = await fetch('https://www.figdex.com/api/plugin-connect/status?nonce=' + encodeURIComponent(connectNonce));
        const data = res.ok ? await res.json() : {};
        if (data.ready === true && data.token && (data.user || data.userId)) {
          debugLog('[FigDex] poll_success');
          const connectedUser = typeof data.user === 'object' && data.user ? data.user : (typeof data.userId === 'object' ? data.userId : { id: data.userId });
          await setStored(STORAGE_KEYS.WEB_TOKEN, data.token);
          await setStored(STORAGE_KEYS.WEB_USER, connectedUser);
          try {
            var claimRes = await fetch('https://www.figdex.com/api/claim/by-anon-id', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + data.token },
              body: JSON.stringify({ anonId: anonId })
            });
            var claimData = claimRes.ok ? await claimRes.json() : {};
            if (claimData.claimed > 0) {
              debugLog('[FigDex] claim_by_anon_id claimed=' + claimData.claimed);
            }
          } catch (_) {}
          figma.ui.postMessage({ type: 'WEB_ACCOUNT_DATA_LOADED', token: data.token, user: connectedUser });
          await loadUserLimitsToUI(data.token);
          return;
        }
        debugLog('[FigDex] poll_tick');
      } catch (e) { debugLog('[FigDex] poll_tick'); }
      setTimeout(doPoll, POLL_INTERVAL_MS);
    };
    setTimeout(doPoll, POLL_INTERVAL_MS);
    return;
  }
  if (msg.type === 'UI_OPEN_FIGDEX_WEB') {
    const connectNonce = cryptoRandomString();
    const docId = figma.root.id || rootId || '0:0';
    await setStored(STORAGE_KEYS.CONNECT_NONCE_DATA, { nonce: connectNonce, createdAt: Date.now() });
    let connectUrl = 'https://www.figdex.com/plugin-connect?nonce=' + encodeURIComponent(connectNonce) + '&docId=' + encodeURIComponent(docId);
    const token = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
    if (token && typeof token === 'string') {
      try {
        const res = await fetch('https://www.figdex.com/api/plugin-connect/login-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
        });
        const data = res.ok ? await res.json() : {};
        if (data && data.loginToken) {
          connectUrl += '&loginToken=' + encodeURIComponent(data.loginToken);
        }
      } catch (e) { /* ignore; open without loginToken */ }
    }
    figma.ui.postMessage({ type: 'OPEN_FIGDEX_WEB', url: connectUrl });
    debugLog('[FigDex] poll_start');
    const POLL_INTERVAL_MS = 2000;
    const POLL_MAX_MS = 120000;
    const pollStart = Date.now();
    const doPoll = async () => {
      if (Date.now() - pollStart >= POLL_MAX_MS) {
        debugLog('[FigDex] poll_timeout');
        figma.ui.postMessage({ type: 'CONNECT_TIMEOUT' });
        return;
      }
      try {
        const res = await fetch('https://www.figdex.com/api/plugin-connect/status?nonce=' + encodeURIComponent(connectNonce));
        const data = res.ok ? await res.json() : {};
        if (data.ready === true && data.token && (data.user || data.userId)) {
          debugLog('[FigDex] poll_success');
          const connectedUser = typeof data.user === 'object' && data.user ? data.user : (typeof data.userId === 'object' ? data.userId : { id: data.userId });
          await setStored(STORAGE_KEYS.WEB_TOKEN, data.token);
          await setStored(STORAGE_KEYS.WEB_USER, connectedUser);
          figma.ui.postMessage({ type: 'WEB_ACCOUNT_DATA_LOADED', token: data.token, user: connectedUser });
          await loadUserLimitsToUI(data.token);
          return;
        }
        debugLog('[FigDex] poll_tick');
      } catch (e) { debugLog('[FigDex] poll_tick'); }
      setTimeout(doPoll, POLL_INTERVAL_MS);
    };
    setTimeout(doPoll, POLL_INTERVAL_MS);
    return;
  }
  if (msg.type === 'get-file-thumbnail') {
    try {
      var dataUrl = await getCoverImageDataUrl();
      if (dataUrl) {
        figma.ui.postMessage({ type: 'file-thumbnail', thumbnailDataUrl: dataUrl });
      } else {
        figma.ui.postMessage({ type: 'file-thumbnail-error', error: 'No pages or frames found' });
      }
    } catch (error) {
      console.error('[code.js] get-file-thumbnail error:', error);
      figma.ui.postMessage({ type: 'file-thumbnail-error', error: error.message });
    }
    return;
  }
  if (msg.type === 'start-advanced') {
    try {
      figma.notify('Preparing gallery...');
      var selectedIds = msg.selectedPages || [];
      await setStored(STORAGE_KEYS.SELECTED_PAGES, selectedIds);
      const token = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
      // Always resolve the key from the current document context.
      // Never fall back to a cross-document global value during indexing,
      // otherwise a new file can be uploaded under the previous file's key.
      var currentDocKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
      var storedDocKey = await getStored(STORAGE_KEYS.FILE_KEY, null);
      if (typeof storedDocKey !== 'string') storedDocKey = '';
      storedDocKey = storedDocKey ? storedDocKey.trim() : '';
      var fileKey = currentDocKey || sessionFileKey || (hasReliableCurrentFileKey() ? storedDocKey : '') || '';
      if (currentDocKey && currentDocKey !== storedDocKey) {
        await setStored(STORAGE_KEYS.FILE_KEY, currentDocKey);
      }
      if (fileKey && fileKey !== globalFileKey) {
        globalFileKey = fileKey;
      }
      const docId = figma.root.id || rootId || '0:0';
      const fileName = await getStored(STORAGE_KEYS.FILE_NAME, null) || figma.root.name || 'Untitled';
      if (!fileKey) {
        figma.notify('Link this file first', { error: true });
        figma.ui.postMessage({ type: 'error', message: 'Link this file first: paste the Figma file link in Step 1 and click Save.' });
        return;
      }
      var isGuestMode = !token || token.length < 10;
      if (!isGuestMode) {
        try {
          await loadUserLimitsToUI(token);
        } catch (_) {}
      }
      await figma.loadAllPagesAsync();
      const allPages = figma.root.children
        .filter(p => p.type === 'PAGE' && p.name !== 'FigDex')
        .map(p => ({ id: p.id, name: p.name || 'Untitled' }));
      const idToName = Object.fromEntries(allPages.map(p => [p.id, p.name]));
      if (selectedIds.length === 0) {
        selectedIds = allPages.map(p => p.id);
        figma.notify('No pages selected — using all pages');
      }
      const selectedPages = selectedIds.map(id => ({ id, name: idToName[id] || 'Page' }));

      var guestAnonId = isGuestMode ? await getOrCreateAnonId() : null;
      if (isGuestMode && !guestAnonId) {
        figma.notify('Guest mode requires anonymous ID. Please try again.', { error: true });
        figma.ui.postMessage({ type: 'error', message: 'Guest mode failed. Please try again or connect your account.' });
        return;
      }

      // Load last indexed metadata to skip unchanged pages
      var indexedMeta = [];
      try { indexedMeta = await getStored(STORAGE_KEYS.INDEXED_PAGES, []); } catch (e) { indexedMeta = []; }
      if (!Array.isArray(indexedMeta)) indexedMeta = [];

      // Determine which selected pages have changes (dirty) — skip unchanged
      var dirtyPageIds = [];
      for (var di = 0; di < selectedIds.length; di++) {
        var pageNode = await figma.getNodeByIdAsync(selectedIds[di]);
        if (!pageNode || pageNode.type !== 'PAGE') continue;
        var currentSigs = await getFrameSignaturesForPage(pageNode);
        var stored = indexedMeta.find(function (m) { return m.pageId === pageNode.id; });
        var storedSigs = stored && Array.isArray(stored.frameSignatures) ? stored.frameSignatures : null;
        if (storedSigs && frameSignaturesEqual(currentSigs, storedSigs)) continue; // unchanged — skip
        dirtyPageIds.push(pageNode.id);
      }

      // Pre-flight: check guest limits against the pages that will actually be uploaded.
      if (isGuestMode && guestAnonId) {
        var estimatedFrameCount = 0;
        for (var ei = 0; ei < dirtyPageIds.length; ei++) {
          var dirtyPageNode = await figma.getNodeByIdAsync(dirtyPageIds[ei]);
          if (dirtyPageNode && dirtyPageNode.type === 'PAGE') estimatedFrameCount += getTopLevelFrameIds(dirtyPageNode).length;
        }
        try {
          var checkRes = await fetchWithTimeout('https://www.figdex.com/api/create-index-from-figma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'figma-plugin',
              galleryOnly: true,
              action: 'check_limit',
              anonId: guestAnonId,
              fileKey: fileKey,
              docId: docId,
              fileName: fileName,
              estimatedFrameCount: estimatedFrameCount
            })
          });
          if (!checkRes.ok) {
            var errText = '';
            try { errText = await checkRes.text(); } catch (_) {}
            var errJson = null;
            try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
            var errMsg = (errJson && errJson.error) ? String(errJson.error) : 'Index failed';
            figma.notify(errMsg, { error: true });
            figma.ui.postMessage({ type: 'error', message: errMsg, code: errJson ? errJson.code : null, upgradeUrl: errJson ? errJson.upgradeUrl : null });
            return;
          }
        } catch (checkErr) {
          figma.notify('Could not verify limits. Please try again.', { error: true });
          figma.ui.postMessage({ type: 'error', message: 'Could not verify limits. Please try again.' });
          return;
        }
      }

      if (!isGuestMode && token) {
        var estimatedConnectedFrameCount = 0;
        for (var cei = 0; cei < dirtyPageIds.length; cei++) {
          var connectedDirtyPageNode = await figma.getNodeByIdAsync(dirtyPageIds[cei]);
          if (connectedDirtyPageNode && connectedDirtyPageNode.type === 'PAGE') estimatedConnectedFrameCount += getTopLevelFrameIds(connectedDirtyPageNode).length;
        }
        try {
          var connectedCheckRes = await fetchWithTimeout('https://www.figdex.com/api/create-index-from-figma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              source: 'figma-plugin',
              galleryOnly: true,
              action: 'check_limit',
              fileKey: fileKey,
              docId: docId,
              fileName: fileName,
              estimatedFrameCount: estimatedConnectedFrameCount
            })
          });
          if (!connectedCheckRes.ok) {
            var connectedErrText = '';
            try { connectedErrText = await connectedCheckRes.text(); } catch (_) {}
            var connectedErrJson = null;
            try { connectedErrJson = connectedErrText ? JSON.parse(connectedErrText) : null; } catch (_) {}
            var connectedErrMsg = (connectedErrJson && connectedErrJson.error) ? String(connectedErrJson.error) : 'Index failed';
            figma.notify(connectedErrMsg, { error: true });
            figma.ui.postMessage({ type: 'error', message: connectedErrMsg, code: connectedErrJson ? connectedErrJson.code : null, upgradeUrl: connectedErrJson ? connectedErrJson.upgradeUrl : null });
            return;
          }
        } catch (connectedCheckErr) {
          figma.notify('Could not verify limits. Please try again.', { error: true });
          figma.ui.postMessage({ type: 'error', message: 'Could not verify limits. Please try again.' });
          return;
        }
      }

      figma.ui.postMessage({ type: 'upload-started' });
      figma.ui.postMessage({ type: 'upload-progress', step: 'Preparing...', framesDone: 0 });

      figma.ui.postMessage({ type: 'upload-progress', step: 'Exporting ' + dirtyPageIds.length + ' page(s)...', framesDone: 0 });

      // Per dirty page: collect top-level frames (export). Unchanged pages are not re-indexed.
      const FRAMES_PER_CHUNK = 10;
      var allPageFrames = [];
      var newSignaturesByPage = {};
      try {
        for (var pi = 0; pi < dirtyPageIds.length; pi++) {
          var page = await figma.getNodeByIdAsync(dirtyPageIds[pi]);
          if (!page || page.type !== 'PAGE') continue;
          var frameIds = getTopLevelFrameIds(page);
          for (var fi = 0; fi < frameIds.length; fi++) {
            try {
              var frame = await figma.getNodeByIdAsync(frameIds[fi]);
              if (!frame || frame.type !== 'FRAME') continue;
              if (typeof frame.loadAsync === 'function') await frame.loadAsync();
              var w = Math.round(frame.width);
              var h = Math.round(frame.height);
              if (!newSignaturesByPage[page.id]) newSignaturesByPage[page.id] = [];
              newSignaturesByPage[page.id].push({ id: frame.id, name: (frame.name || '').trim(), width: w, height: h });
              var sizeTag = w + 'x' + h;
              var visibleTexts = collectVisibleTextsFromFrame(frame);
              var ancestorNames = collectAncestorNames(frame);
              var allTexts = [frame.name || ''].concat(ancestorNames, visibleTexts);
              var textContent = allTexts.join(' ');
              var searchTokens = buildSearchTokens(allTexts);
              var sectionName = getSectionNameForFrame(frame);
              var displayName = sectionName ? sectionName + ' / ' + (frame.name || 'Frame') : (frame.name || 'Frame');
              var exportResult = await exportFrameImageData(frame, w, h);
              var bytes = exportResult.bytes;
              var b64 = figma.base64Encode(bytes);
              var frameUrl = fileKey ? 'https://www.figma.com/file/' + fileKey + '?node-id=' + frame.id.replace(/:/g, '%3A') : '';
              var frameItem = {
                id: frame.id,
                name: displayName,
                x: Math.round(frame.x),
                y: Math.round(frame.y),
                width: w,
                height: h,
                index: allPageFrames.length,
                tags: [sizeTag],
                url: frameUrl,
                textContent: textContent,
                searchTokens: searchTokens,
                image: 'data:image/jpeg;base64,' + b64
              };
              allPageFrames.push({ pageId: page.id, pageName: page.name || 'Page', frameItem: frameItem });
              var totalEst = frameIds.length;
              figma.ui.postMessage({ type: 'upload-progress', step: 'Exported ' + allPageFrames.length + ' frame(s)...', framesDone: allPageFrames.length });
              if (allPageFrames.length % 5 === 0) await new Promise(function (r) { setTimeout(r, 0); });
            } catch (err) { /* skip frame on export error */ }
          }
        }
        if (allPageFrames.length === 0) {
          if (dirtyPageIds.length === 0) {
            figma.notify('No changes — nothing to re-index');
            figma.ui.postMessage({ type: 'pages-indexed', pageIds: selectedIds });
            await setStored(STORAGE_KEYS.HAS_EVER_INDEXED, true);
            figma.ui.postMessage({ type: 'done' });
            return;
          }
          figma.notify('No top-level frames (direct Page frames or direct Section frames)', { error: true });
          figma.ui.postMessage({ type: 'error', message: 'No top-level frames found' });
          return;
        }
      } catch (payloadErr) {
        console.warn('[code.js] indexPayload collect error:', payloadErr);
        figma.ui.postMessage({ type: 'error', message: 'Failed to collect frames' });
        return;
      }

      var mergePages = dirtyPageIds.length < selectedIds.length;

      // Same cover as plugin UI (only for first chunk). Fallback: first frame image if no Cover page/frame.
      var coverImageDataUrl = null;
      try {
        coverImageDataUrl = await getCoverImageDataUrl();
      } catch (e) {
        console.warn('[code.js] cover image error:', e);
      }
      if (!coverImageDataUrl && allPageFrames.length > 0 && allPageFrames[0].frameItem && allPageFrames[0].frameItem.image) {
        coverImageDataUrl = allPageFrames[0].frameItem.image;
      }
      if (coverImageDataUrl && allPageFrames.length > 0 && allPageFrames[0].frameItem && allPageFrames[0].frameItem.image) {
        var firstFrameImage = allPageFrames[0].frameItem.image;
        if (firstFrameImage && coverImageDataUrl.length > firstFrameImage.length * 1.5) {
          coverImageDataUrl = firstFrameImage;
        }
      }
      if (coverImageDataUrl && coverImageDataUrl.length > 4 * 1024 * 1024) {
        console.warn('[code.js] cover image too large, omitting cover upload for this run');
        coverImageDataUrl = null;
      }

      var baseFileName = (fileName || '').trim() || 'Untitled';
      // When merging by page, chunk by full pages so server can replace whole pages
      var chunkSpecs = [];
      if (mergePages) {
        var pageToFrames = {};
        for (var ci = 0; ci < allPageFrames.length; ci++) {
          var pf = allPageFrames[ci];
          if (!pageToFrames[pf.pageId]) pageToFrames[pf.pageId] = { pageId: pf.pageId, pageName: pf.pageName, items: [] };
          pageToFrames[pf.pageId].items.push(pf.frameItem);
        }
        var acc = [];
        var accFrames = 0;
        for (var dpi = 0; dpi < dirtyPageIds.length; dpi++) {
          var pid = dirtyPageIds[dpi];
          var info = pageToFrames[pid];
          if (!info || info.items.length === 0) continue;
          var items = info.items;
          for (var fi = 0; fi < items.length; fi += FRAMES_PER_CHUNK) {
            var slice = items.slice(fi, fi + FRAMES_PER_CHUNK);
            if (accFrames + slice.length > FRAMES_PER_CHUNK && acc.length > 0) {
              chunkSpecs.push(acc.slice());
              acc = [];
              accFrames = 0;
            }
            acc.push({ id: pid, name: info.pageName, frames: slice });
            accFrames += slice.length;
          }
        }
        if (acc.length > 0) chunkSpecs.push(acc);
      } else {
        var start = 0;
        while (start < allPageFrames.length) {
          var end = Math.min(start + FRAMES_PER_CHUNK, allPageFrames.length);
          var slice = allPageFrames.slice(start, end);
          var pageMap = {};
          for (var si = 0; si < slice.length; si++) {
            var s = slice[si];
            if (!pageMap[s.pageId]) pageMap[s.pageId] = { id: s.pageId, name: s.pageName, frames: [] };
            pageMap[s.pageId].frames.push(s.frameItem);
          }
          var chunkPagesList = [];
          for (var k in pageMap) chunkPagesList.push(pageMap[k]);
          chunkSpecs.push(chunkPagesList);
          start = end;
        }
      }

      chunkSpecs = normalizeChunkSpecsForRequestSize(chunkSpecs, {
        fileKey: fileKey,
        docId: docId,
        fileName: baseFileName,
        selectedPages: selectedPages,
        version: PLUGIN_VERSION,
        coverImageDataUrl: coverImageDataUrl,
        includeCover: !!coverImageDataUrl,
        mergePages: mergePages,
        replacePageIds: dirtyPageIds,
        anonId: isGuestMode && guestAnonId ? guestAnonId : null,
        maxBytes: 7 * 1024 * 1024
      });

      var totalChunks = chunkSpecs.length;
      var totalUploaded = 0;
      var lastViewToken = null;
      var res = null;
      var finalChunkError = null;
      figma.ui.postMessage({ type: 'upload-progress', step: 'Uploading to FigDex...', framesDone: totalUploaded });
      for (var chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        var chunkPages = mergePages ? chunkSpecs[chunkIndex] : chunkSpecs[chunkIndex];
        var chunkPayload = { pages: chunkPages };
        var replacePageIds = mergePages ? chunkPages.map(function (p) { return p.pageId || p.id; }) : undefined;
        var chunkFileName = totalChunks > 1 ? baseFileName + ' (Part ' + (chunkIndex + 1) + '/' + totalChunks + ')' : baseFileName;
        var body = {
          fileKey: fileKey,
          docId: docId,
          fileName: chunkFileName,
          chunkIndex: chunkIndex,
          totalChunks: totalChunks,
          selectedPages: selectedPages,
          source: 'figma-plugin',
          version: PLUGIN_VERSION,
          galleryOnly: true,
          imageQuality: 0.75,
          indexPayload: chunkPayload,
          coverImageDataUrl: chunkIndex === 0 ? coverImageDataUrl || undefined : undefined
        };
        if (mergePages && replacePageIds && replacePageIds.length > 0) {
          body.mergePages = true;
          body.replacePageIds = replacePageIds;
        }
        if (isGuestMode && guestAnonId) body.anonId = guestAnonId;
        var chunkFrameCount = chunkPages.reduce(function (s, p) { return s + (p.frames ? p.frames.length : 0); }, 0);
        figma.notify(totalChunks > 1 ? 'Uploading part ' + (chunkIndex + 1) + '/' + totalChunks + '...' : 'Uploading to FigDex...');
        figma.ui.postMessage({ type: 'upload-progress', step: totalChunks > 1 ? 'Uploading part ' + (chunkIndex + 1) + '/' + totalChunks : 'Uploading to FigDex...', framesDone: totalUploaded });
        var headers = { 'Content-Type': 'application/json' };
        if (!isGuestMode && token) headers['Authorization'] = 'Bearer ' + token;
        var chunkAttempt = await postChunkWithRetry('https://www.figdex.com/api/create-index-from-figma', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
        }, {
          chunkNumber: chunkIndex + 1,
          totalChunks: totalChunks,
          framesDone: totalUploaded
        });
        res = chunkAttempt.response || null;
        finalChunkError = chunkAttempt.error || null;
        if (!chunkAttempt.ok || !res || !res.ok) {
          totalChunks = -1;
          break;
        }
        totalUploaded += chunkFrameCount;
        figma.ui.postMessage({ type: 'upload-progress', step: totalChunks > 1 ? 'Uploaded part ' + (chunkIndex + 1) + '/' + totalChunks : 'Uploaded to FigDex...', framesDone: totalUploaded });
        try {
          var data = await res.json();
          if (data && data.viewToken) lastViewToken = data.viewToken;
        } catch (_) {}
        if (chunkIndex < totalChunks - 1) await sleep(250);
      }
      if (totalChunks <= 0 || !res || !res.ok) {
        var errText = '';
        try { if (res && typeof res.text === 'function') errText = await res.text(); } catch (_) {}
        var errJson = null;
        try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
        var errMsg = (errJson && errJson.error) ? String(errJson.error) : 'Index failed';
        if ((!errJson || !errJson.error) && finalChunkError && finalChunkError.message) errMsg = String(finalChunkError.message);
        if (errMsg !== 'Index failed' && errJson && errJson.details) errMsg += ' — ' + String(errJson.details);
        if (errMsg === 'Index failed') errMsg = 'Index failed (' + ((res && res.status) || '') + ')';
        var isGuestLimit = errJson && (errJson.code === 'GUEST_FILE_LIMIT' || errJson.code === 'GUEST_FRAME_LIMIT');
        if (res && res.status === 401 && !isGuestLimit) {
          await setStored(STORAGE_KEYS.WEB_TOKEN, null);
          await setStored(STORAGE_KEYS.WEB_USER, null);
          figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: null });
          figma.notify('Session expired. Please reconnect.', { error: true });
          figma.ui.postMessage({ type: 'AUTH_EXPIRED', selectedPages: selectedIds });
          return;
        }
        figma.notify(errMsg, { error: true });
        figma.ui.postMessage({ type: 'error', message: errMsg, code: errJson ? errJson.code : null, upgradeUrl: errJson ? errJson.upgradeUrl : null });
        return;
      }
      // Persist metadata: keep skipped pages, update dirty pages with new frameSignatures (full sigs with contentHint, textHint)
      try {
        var nextMeta = indexedMeta.filter(function (m) {
          return m.pageId && dirtyPageIds.indexOf(m.pageId) < 0;
        });
        for (var ni = 0; ni < dirtyPageIds.length; ni++) {
          var dpid = dirtyPageIds[ni];
          var pageNodeForMeta = await figma.getNodeByIdAsync(dpid);
          var sigsToStore = (pageNodeForMeta && pageNodeForMeta.type === 'PAGE') ? await getFrameSignaturesForPage(pageNodeForMeta) : (newSignaturesByPage[dpid] || []);
          nextMeta.push({
            pageId: dpid,
            pageName: idToName[dpid] || 'Page',
            lastIndexedAt: Date.now(),
            frameSignatures: sigsToStore
          });
        }
        await setStored(STORAGE_KEYS.INDEXED_PAGES, nextMeta);
      } catch (e) { /* non-fatal */ }
      // Also notify UI so icons can update immediately without manual refresh
      try {
        figma.ui.postMessage({ type: 'pages-indexed', pageIds: selectedIds });
      } catch (e) {}

      var resultUrl = 'https://www.figdex.com/gallery?fileKey=' + encodeURIComponent(fileKey) + '&_t=' + Date.now();
      if (lastViewToken) resultUrl += '&viewToken=' + encodeURIComponent(lastViewToken);
      if (isGuestMode && guestAnonId) resultUrl += '&anonId=' + encodeURIComponent(guestAnonId);
      else if (!isGuestMode && token) resultUrl += '&apiKey=' + encodeURIComponent(token);
      figma.notify(totalUploaded > 0 ? 'Uploaded — ' + totalUploaded + ' frames to FigDex' : 'Index saved — ' + selectedPages.length + ' pages');
      await setStored(STORAGE_KEYS.HAS_EVER_INDEXED, true);
      if (!isGuestMode && token) {
        await loadUserLimitsToUI(token);
        setTimeout(function () { loadUserLimitsToUI(token); }, 1500);
        setTimeout(function () { loadUserLimitsToUI(token); }, 4000);
      }
      figma.ui.postMessage({ type: 'WEB_INDEX_CREATED', resultUrl });
    } catch (e) {
      console.error('[code.js] start-advanced error:', e);
      figma.notify('Error: ' + (e.message || 'Unknown error'), { error: true });
      figma.ui.postMessage({ type: 'error', message: e.message || 'Unknown error' });
    }
    return;
  }
  if (msg.type === 'UI_OPEN_RESULT_WEB') {
    const url = msg.resultUrl || '';
    if (url) figma.ui.postMessage({ type: 'OPEN_RESULT_URL', url });
    return;
  }
};
