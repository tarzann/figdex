# FigDex - Plugin vs API Integration Specification

**Version:** v1.0.0  
**Last Updated:** December 25, 2025  
**Document Type:** Technical Specification

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Plugin Workflow](#plugin-workflow)
4. [API Integration Workflow](#api-integration-workflow)
5. [Detailed Comparison](#detailed-comparison)
6. [Data Structures](#data-structures)
7. [Feature Gap Analysis](#feature-gap-analysis)
8. [Recommendations](#recommendations)

---

## 🎯 Executive Summary

FigDex supports two methods for creating indexes:

1. **Figma Plugin** - Interactive plugin that runs inside Figma, extracts frames from an "IndeXo" page, and uploads the data directly
2. **API Integration** - Web-based interface that uses Figma API to fetch file data, processes frames in background jobs, and stores the index

Both methods produce similar index structures but have different capabilities, user experiences, and limitations.

---

## 🏗️ System Overview

### Plugin Method

**Location:** `/Users/ranmor/Documents/Figma-Plugins/indexo-2/`

**Technology:**
- Figma Plugin API (JavaScript ES6+)
- Runs inside Figma desktop/web application
- Communicates with web backend via HTTPS

**Key Characteristics:**
- ✅ Requires user to manually create "IndeXo" page with frames
- ✅ Direct access to Figma node data (no API rate limits during extraction)
- ✅ Can export images directly from Figma (base64 encoded)
- ✅ Supports custom frame tagging in UI
- ✅ Limited to 50 frames per upload (hardcoded limit)
- ✅ Processes frames synchronously in plugin

### API Integration Method

**Location:** `pages/api-index.tsx`, `pages/api/create-index-from-figma.ts`, `pages/api/process-index-job.ts`

**Technology:**
- Next.js API Routes
- Figma REST API
- Background job processing (Vercel Cron Jobs)
- Supabase Database

**Key Characteristics:**
- ✅ Automatic frame discovery from all pages
- ✅ Background processing (no timeout issues)
- ✅ Supports unlimited frames (processed in chunks)
- ✅ Automatic change detection for re-indexing
- ✅ Automatic tag generation (naming tags, size tags)
- ❌ Subject to Figma API rate limits
- ❌ Requires Figma Personal Access Token

---

## 🔄 Plugin Workflow

### Step 1: User Setup

1. User installs plugin in Figma
2. User creates an "IndeXo" page (or uses existing)
3. User manually adds frames to the IndeXo page (typically via "Advanced" indexing feature)
4. User optionally tags frames using the plugin UI

### Step 2: Frame Extraction (`buildFramesIndexJson`)

**Location:** `code.js:1544-1615`

The plugin:
1. Finds the "IndeXo" page
2. Recursively searches for all FRAME nodes (skips sections)
3. Processes each frame (limited to first 50 frames):
   - Extracts frame metadata (id, name, x, y, width, height)
   - Extracts text content (recursive `findAllTexts`)
   - Exports thumbnail (PNG at 50% scale, base64 encoded)
   - Loads frame tags from saved data (`__FRAME_TAGS__` node)
4. Groups frames into "pages" (20 frames per page)
5. Returns structured JSON:

```javascript
{
  name: "Frames Index",
  data: {
    pages: [
      {
        id: "page_0",
        name: "Page 1",
        frames: [
          {
            id: "frame-id",
            name: "Frame Name",
            x: 100,
            y: 200,
            width: 375,
            height: 812,
            index: 0,
            textContent: "all text content...",
            image: "data:image/png;base64,...", // Base64 encoded PNG
            tags: ["tag1", "tag2"] // Custom tags
          }
        ]
      }
    ],
    frames: [...], // Flat array of all frames
    tags: [] // Empty array
  }
}
```

### Step 3: Upload (`uploadToWebSystemFromUI`)

**Location:** `ui.html:1387-1431`

The UI:
1. Receives index data from plugin (`upload-data-ready` message)
2. Gets file metadata (documentId, fileKey, fileName) via `get-file-data` message
3. Loads tag statistics and unique tags
4. Builds payload:

```javascript
{
  documentId: "file-id",
  fileKey: "figma-file-key",
  fileName: "File Name",
  pages: [...], // Index data pages
  uploadedAt: "2025-12-25T...",
  tags: [...], // Unique tags array
  tagStatistics: {...} // Tag usage stats
}
```

5. POSTs to `/api/upload-index` with Bearer token

### Step 4: Backend Processing (`/api/upload-index`)

**Location:** `pages/api/upload-index.ts`

The API:
1. Validates authentication (Bearer token)
2. Extracts `pages` array from payload
3. Flattens frames from all pages
4. Processes tags (frame_tags, custom_tags, naming_tags, size_tags)
5. Calculates file size
6. Inserts into `index_files` table
7. Returns success response

---

## 🔄 API Integration Workflow

### Step 1: User Setup

1. User navigates to "Figma API Integration" page (`/api-index`)
2. User enters Figma Personal Access Token
3. User enters Figma file URL or file key
4. User clicks "Validate" to verify connection

### Step 2: Validation (`validateConnection`)

**Location:** `pages/api-index.tsx:1069-1200`

The UI:
1. Calls `/api/saved-connections` (POST) with `validate: true`
2. Backend (`pages/api/saved-connections.ts`) validates token and fetches file metadata
3. Returns page list and metadata
4. UI displays pages with frame counts and status indicators

### Step 3: Create Index (`createIndexFromFigma`)

**Location:** `pages/api-index.tsx:1200-1400`

The UI:
1. User selects pages to index (or selects all)
2. User optionally sets image quality (0.3, 0.5, 0.7, 1.0)
3. User clicks "Create Index"
4. Calls `/api/create-index-from-figma` with:
   - `fileKey`
   - `selectedPages` or `selectedPageIds`
   - `imageQuality`
   - `figmaToken`

### Step 4: Job Creation (`/api/create-index-from-figma`)

**Location:** `pages/api/create-index-from-figma.ts`

The API:
1. Validates API key and user limits
2. Fetches Figma file structure (lightweight mode)
3. Builds `frame_node_refs` array (frame IDs and metadata)
4. Creates job in `index_jobs` table with status `pending`
5. Returns job ID

**Job Structure:**
```typescript
{
  id: "job-id",
  user_id: "user-id",
  file_key: "figma-file-key",
  file_name: "File Name",
  status: "pending",
  total_frames: 150,
  next_frame_index: 0,
  frame_node_refs: [
    {
      id: "frame-id",
      type: "FRAME",
      pageId: "page-id",
      pageName: "Page Name",
      sectionId: "section-id", // optional
      sectionName: "Section Name", // optional
      index: 0
    }
  ],
  document_data: {...}, // File structure
  image_quality: 0.7,
  figma_version: "...",
  figma_last_modified: "..."
}
```

### Step 5: Background Processing (`/api/process-index-job`)

**Location:** `pages/api/process-index-job.ts`

Triggered by:
- Vercel Cron Job (`/api/cron/process-pending-jobs`) - runs every 5 minutes
- Manual API call (for testing)

The processor:
1. Loads job from database
2. Processes frames in chunks (based on size limits):
   - Fetches frame data from Figma API (`/files/{fileKey}/nodes?ids={nodeIds}`)
   - Extracts text content
   - Downloads images from Figma (`/images/{fileKey}`)
   - Processes frames into `FrameData` structure
   - Generates automatic tags (naming tags, size tags)
3. Accumulates processed frames in `manifest` array
4. Updates job progress (`next_frame_index`, `manifest`)
5. When complete:
   - Groups frames into pages (20 frames per page)
   - Calculates tags
   - Saves to `index_files` table
   - Updates job status to `completed`
   - Sends email notifications

**Frame Processing:**
- Processes frames on-the-fly from `frame_node_refs`
- No pre-built manifest required
- Handles large files by chunking (2-4MB per chunk)
- Respects time budget (18s per invocation)

---

## 📊 Detailed Comparison

### Frame Discovery

| Feature | Plugin | API Integration |
|---------|--------|----------------|
| **Source** | IndeXo page (manual) | All pages (automatic) |
| **Frame Selection** | User manually adds frames to IndeXo page | Automatic - all frames from selected pages |
| **Limit** | 50 frames (hardcoded) | Unlimited (chunked processing) |
| **Change Detection** | Manual (user re-indexes) | Automatic (compares frame counts) |

### Image Extraction

| Feature | Plugin | API Integration |
|---------|--------|----------------|
| **Method** | `frame.exportAsync()` (direct Figma API) | Figma REST API `/images/{fileKey}` |
| **Format** | PNG, base64 encoded | PNG/JPEG URLs (downloaded and converted) |
| **Quality** | 50% scale (configurable 30-100%) | Configurable (0.3, 0.5, 0.7, 1.0) |
| **Storage** | Embedded in JSON payload | Downloaded to Supabase Storage |
| **Size** | Included in upload payload | Stored separately, referenced in index |

### Tagging

| Feature | Plugin | API Integration |
|---------|--------|----------------|
| **Custom Tags** | ✅ User can add tags in plugin UI | ❌ Not supported (only automatic tags) |
| **Tag Storage** | Saved in `__FRAME_TAGS__` node on IndeXo page | Generated automatically, stored in database |
| **Tag Types** | Custom tags only | Naming tags, size tags, custom tags (if added via plugin) |
| **Tag Statistics** | ✅ Displayed in plugin UI | ❌ Not displayed in API integration |

### Metadata Extraction

| Feature | Plugin | API Integration |
|---------|--------|----------------|
| **Frame Properties** | id, name, x, y, width, height, index | id, name, x, y, width, height, index |
| **Text Content** | ✅ Recursive text extraction | ✅ Recursive text extraction |
| **Figma URL** | ❌ Not included | ✅ Included (`https://www.figma.com/file/{fileKey}?node-id={frameId}`) |
| **Page/Section Info** | ❌ Not tracked | ✅ pageName, sectionName tracked |
| **Ancestor Names** | ❌ Not extracted | ❌ Not extracted (function exists but returns empty) |

### Processing Model

| Feature | Plugin | API Integration |
|---------|--------|----------------|
| **Execution** | Synchronous (blocks UI) | Asynchronous (background jobs) |
| **Timeout Risk** | ❌ Yes (plugin timeout ~30s) | ✅ No (chunked, can resume) |
| **Progress Tracking** | ✅ Real-time (progress messages) | ✅ Job status polling |
| **Error Recovery** | ❌ Must restart | ✅ Can resume from last processed frame |
| **Rate Limiting** | ❌ Not applicable (direct API) | ✅ Yes (Figma API rate limits) |

### User Experience

| Feature | Plugin | API Integration |
|---------|--------|----------------|
| **Setup Complexity** | Medium (must create IndeXo page) | Low (just enter token and file key) |
| **Manual Work** | ✅ Required (add frames to IndeXo) | ❌ Fully automatic |
| **Real-time Feedback** | ✅ Immediate (progress in plugin) | ⚠️ Delayed (polling) |
| **Batch Processing** | ❌ One file at a time | ✅ Can queue multiple jobs |
| **Re-indexing** | Manual (user re-runs) | ✅ Automatic (change detection) |

### Data Structure Differences

#### Plugin Output (`buildFramesIndexJson`)

```javascript
{
  name: "Frames Index",
  data: {
    pages: [
      {
        id: "page_0",
        name: "Page 1",
        frames: [
          {
            id: "frame-id",
            name: "Frame Name",
            x: 100,
            y: 200,
            width: 375,
            height: 812,
            index: 0,
            textContent: "all text...",
            image: "data:image/png;base64,...", // Base64
            tags: ["tag1", "tag2"]
          }
        ]
      }
    ],
    frames: [...], // Flat array
    tags: [] // Empty
  }
}
```

#### API Integration Output (`process-index-job.ts`)

```typescript
{
  pages: [
    {
      id: "page-id",
      name: "Page Name",
      frames: [
        {
          id: "frame-id",
          name: "Frame Name",
          x: 100,
          y: 200,
          width: 375,
          height: 812,
          index: 0,
          textContent: "all text...",
          textSnippet: "normalized text bundle",
          image: "https://figma.com/image-url", // URL, later downloaded
          url: "https://www.figma.com/file/{fileKey}?node-id={frameId}",
          pageName: "Page Name",
          sectionName: "Section Name", // optional
          namingTags: ["tag1", "tag2"], // Auto-generated
          sizeTags: ["375x812"], // Auto-generated
          customTags: [], // From plugin if available
          frameTags: [] // Legacy
        }
      ],
      sections: [ // Optional
        {
          id: "section-id",
          name: "Section Name",
          frames: [...]
        }
      ]
    }
  ]
}
```

**Key Differences:**
1. **Image Format**: Plugin uses base64, API uses URLs (downloaded separately)
2. **Tag Structure**: Plugin has flat `tags` array, API has `namingTags`, `sizeTags`, `customTags`
3. **Page Structure**: Plugin groups by arbitrary "pages" (20 frames), API preserves original page structure
4. **Section Support**: Plugin doesn't track sections, API does (optional)
5. **Figma URL**: Only API includes direct Figma links

---

## 📦 Data Structures

### Plugin Frame Object

```typescript
interface PluginFrame {
  id: string; // Figma node ID
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  textContent: string; // All text joined with spaces
  image: string | null; // Base64 encoded PNG: "data:image/png;base64,..."
  tags: string[]; // Custom tags only
}
```

### API Integration Frame Object

```typescript
interface APIFrame {
  id: string; // Figma node ID
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  textContent: string; // All text joined with spaces
  textSnippet?: string; // Normalized text bundle for search
  searchTokens?: string[]; // Tokenized text for search
  image: string; // Figma image URL or Supabase Storage URL
  url: string; // Direct Figma link
  pageName: string;
  sectionName?: string;
  namingTags: string[]; // Auto-generated from frame name
  sizeTags: string[]; // Auto-generated (e.g., "375x812")
  customTags: string[]; // Custom tags (if available)
  frameTags?: string[]; // Legacy tags
}
```

### Stored Index Structure (`index_files.index_data`)

```typescript
interface StoredIndex {
  pages: Array<{
    id: string; // Page ID or generated "page_0"
    name: string; // Page name
    frames: Array<APIFrame>; // Processed frames
    sections?: Array<{ // Optional
      id: string;
      name: string;
      frames: Array<APIFrame>;
    }>;
  }>;
}
```

---

## 🔍 Feature Gap Analysis

### What Plugin Has That API Integration Lacks

1. **Custom Frame Tagging**
   - Plugin: User can add custom tags to frames via UI
   - API: Only automatic tags (naming, size)
   - **Impact:** Users cannot manually organize frames with custom tags via API

2. **Tag Statistics**
   - Plugin: Shows tag usage statistics in UI
   - API: No tag statistics display
   - **Impact:** Users cannot see tag distribution

3. **Direct Image Export**
   - Plugin: Exports images directly from Figma (no API rate limits)
   - API: Downloads from Figma API (subject to rate limits)
   - **Impact:** Plugin can be faster for small indexes

4. **Real-time Progress**
   - Plugin: Shows progress updates in real-time
   - API: Requires polling (30s intervals)
   - **Impact:** Less responsive user experience

### What API Integration Has That Plugin Lacks

1. **Automatic Frame Discovery**
   - API: Automatically discovers all frames from selected pages
   - Plugin: Requires manual frame addition to IndeXo page
   - **Impact:** API is much faster for initial indexing

2. **Unlimited Frame Support**
   - API: Supports unlimited frames (chunked processing)
   - Plugin: Limited to 50 frames
   - **Impact:** Plugin cannot handle large files

3. **Automatic Change Detection**
   - API: Compares frame counts to detect changes
   - Plugin: User must manually re-index
   - **Impact:** API makes re-indexing easier

4. **Background Processing**
   - API: Processes in background (no timeout)
   - Plugin: Blocks UI during processing
   - **Impact:** API can handle large files without timeout

5. **Section Tracking**
   - API: Tracks sections and groups frames by section
   - Plugin: Flattens all frames
   - **Impact:** API preserves more structure

6. **Figma URLs**
   - API: Includes direct Figma links for each frame
   - Plugin: Does not include URLs
   - **Impact:** Better navigation to original frames

7. **Page Structure Preservation**
   - API: Preserves original page structure
   - Plugin: Groups frames into arbitrary "pages" (20 frames each)
   - **Impact:** API maintains more accurate organization

8. **Automatic Tag Generation**
   - API: Generates naming tags and size tags automatically
   - Plugin: Only custom tags (user must add manually)
   - **Impact:** API provides better searchability out of the box

---

## 💡 Recommendations

### To Achieve Feature Parity

#### 1. Add Custom Tagging to API Integration

**Priority:** High  
**Effort:** Medium

**Implementation:**
- Add tag editing UI to API Integration page
- Store tags in database (new table `frame_tags` or add to `index_files`)
- Allow users to add/edit tags after index creation
- Sync tags between plugin and API (if same file indexed via both methods)

**Files to Modify:**
- `pages/api-index.tsx` - Add tag editing UI
- `pages/api/frames/tags.ts` - New API endpoint for tag management
- `sql/add_frame_tags_table.sql` - Database schema

#### 2. Remove 50-Frame Limit from Plugin

**Priority:** Medium  
**Effort:** Low

**Implementation:**
- Remove hardcoded limit in `buildFramesIndexJson` (line 1568)
- Process all frames found in IndeXo page
- Add pagination/chunking for upload (if payload too large)

**Files to Modify:**
- `code.js:1568` - Remove `Math.min(frames.length, 50)` limit

#### 3. Add Figma URLs to Plugin Output

**Priority:** Low  
**Effort:** Low

**Implementation:**
- Include `url` field in `processFrame` function
- Format: `https://www.figma.com/file/${fileKey}?node-id=${frameId}`

**Files to Modify:**
- `code.js:1643-1683` - Add `url` to `frameData`

#### 4. Add Tag Statistics to API Integration

**Priority:** Medium  
**Effort:** Low

**Implementation:**
- Calculate tag statistics from index data
- Display in API Integration page (similar to plugin UI)

**Files to Modify:**
- `pages/api-index.tsx` - Add tag statistics display
- `pages/api/index/tags/stats.ts` - New API endpoint

#### 5. Unify Tag Structure

**Priority:** High  
**Effort:** Medium

**Implementation:**
- Standardize on `namingTags`, `sizeTags`, `customTags` structure
- Convert plugin output to match API structure
- Update gallery/search to use unified structure

**Files to Modify:**
- `pages/api/upload-index.ts` - Convert plugin tags to unified structure
- `pages/gallery.tsx` - Use unified tag structure

### To Improve User Experience

#### 6. Add Real-time Progress to API Integration

**Priority:** Medium  
**Effort:** High

**Implementation:**
- Use WebSockets or Server-Sent Events (SSE) for real-time updates
- Push progress updates from job processor to client
- Show frame-by-frame progress (similar to plugin)

**Files to Modify:**
- `pages/api/process-index-job.ts` - Emit progress events
- `pages/api/ws.ts` - WebSocket endpoint (already exists, may need enhancement)
- `pages/api-index.tsx` - Connect to WebSocket for real-time updates

#### 7. Support Section Tracking in Plugin

**Priority:** Low  
**Effort:** Medium

**Implementation:**
- Track section hierarchy when processing frames
- Include section info in output structure
- Match API Integration's section support

**Files to Modify:**
- `code.js:1643-1683` - Add section tracking to `processFrame`
- `code.js:1544-1615` - Include sections in output structure

---

## 📝 Summary

### Current State

**Plugin Advantages:**
- ✅ Direct Figma API access (no rate limits during extraction)
- ✅ Custom frame tagging
- ✅ Real-time progress
- ✅ No external token required (uses plugin authentication)

**API Integration Advantages:**
- ✅ Automatic frame discovery
- ✅ Unlimited frames (chunked processing)
- ✅ Automatic change detection
- ✅ Background processing (no timeout)
- ✅ Better structure preservation (pages, sections)
- ✅ Automatic tag generation
- ✅ Figma URLs included

### Ideal Unified Experience

To achieve feature parity and optimal user experience:

1. **Use API Integration as primary method** (automatic, scalable)
2. **Add custom tagging to API Integration** (match plugin capability)
3. **Add real-time progress** (match plugin UX)
4. **Keep plugin as alternative** for users who prefer manual control
5. **Unify data structures** for consistency

### Migration Path

1. **Phase 1:** Add custom tagging to API Integration
2. **Phase 2:** Remove 50-frame limit from plugin
3. **Phase 3:** Add real-time progress to API Integration
4. **Phase 4:** Unify tag structures
5. **Phase 5:** Add tag statistics to API Integration

---

**Document Version:** 1.0.0  
**Last Updated:** December 25, 2025  
**Author:** FigDex Development Team

