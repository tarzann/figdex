# File Limits Implementation Specification

**Version:** v1.0.0  
**Last Updated:** December 26, 2025  
**Document Type:** Implementation Specification

---

## 📋 Overview

This document specifies the implementation of file limits based on user subscription plans, including indicators in both the Plugin and Web interfaces.

---

## 📊 Current Limits

### Plan Limits (from `lib/plans.ts`)

| Plan | maxProjects (Files) | Notes |
|------|---------------------|-------|
| **Free** | 1 | Hard limit - cannot exceed |
| **Pro** | 10 | Soft limit - includes addons |
| **Team** | 20 | Soft limit - includes addons |
| **Unlimited** | null | No limit |

### Addons Support

Users can purchase addons to increase file limits:
- `addon_type: 'files'`
- `addon_value: number` (additional files)

**Effective Limit = Base Plan Limit + Addons**

---

## ✅ Current Implementation Status

### Backend Checks

**✅ Already Implemented:**
- `lib/subscription-helpers.ts`:
  - `getUserEffectiveLimits()` - Calculates effective limits (plan + addons)
  - `getCurrentFileCount()` - Counts current files from `saved_connections`
- `pages/api/create-index-from-figma.ts`:
  - Checks file limit before creating job (lines 310-332)
  - Returns error if limit reached
  - Handles re-indexing (existing file doesn't count as new)

**❌ Missing:**
- File limit check in `pages/api/saved-connections.ts` (POST endpoint)
- API endpoint to get limits for UI display
- UI indicators in API Integration page
- Plugin API endpoint and UI indicators

---

## 🎯 Implementation Plan

### Phase 1: API Endpoint for Limits

**File:** `pages/api/user/limits.ts` ✅ CREATED

**Purpose:** Provide current file limits and usage to UI

**Response:**
```typescript
{
  success: true,
  limits: {
    maxFiles: number | null,
    currentFiles: number,
    remainingFiles: number | null,
    maxFrames: number,
    maxIndexesPerDay: number,
    planId: 'free' | 'pro' | 'team' | 'unlimited',
    planLabel: string,
    isUnlimited: boolean
  }
}
```

### Phase 2: Check Limit in Saved Connections API

**File:** `pages/api/saved-connections.ts`

**Location:** POST endpoint (line ~73)

**Logic:**
1. Before inserting new connection, check if user has reached file limit
2. If limit reached, return error:
   ```json
   {
     "error": "File limit reached (X files). You have Y files. Please purchase an add-on or upgrade your plan.",
     "code": "FILE_LIMIT_REACHED",
     "current": Y,
     "max": X,
     "upgradeUrl": "https://www.figdex.com/pricing"
   }
   ```
3. For unlimited users/admins, skip check

### Phase 3: UI Indicators in API Integration Page

**File:** `pages/api-index.tsx`

**Components to Add:**
1. **File Limit Indicator** (near top of page or in connections list header)
   - Display: "Files: X / Y" (or "Unlimited" for unlimited users)
   - Color coding:
     - Green: >20% remaining
     - Yellow: 10-20% remaining
     - Red: <10% remaining
   - Link to pricing/upgrade when limit reached

2. **Warning When Limit Approaching**
   - Show alert when remaining files ≤ 2
   - Suggest purchasing addon or upgrading

3. **Disable Save Button** when limit reached (optional - backend already blocks)

**API Call:**
- Call `/api/user/limits` on page load
- Refresh when connection is saved/deleted

### Phase 4: Plugin API Endpoint

**File:** `pages/api/user/limits.ts` (same as Phase 1)

**Access:** Via Bearer token (API key)

**Usage:** Plugin calls this endpoint to get limits

### Phase 5: Plugin UI Indicators

**File:** `ui.html` (in plugin directory)

**Components to Add:**
1. **File Limit Display** (in upload section)
   - Show current file count and limit
   - Disable upload button if limit reached
   - Show warning message if limit reached

2. **Error Handling**
   - Catch `FILE_LIMIT_REACHED` error from upload API
   - Display user-friendly message with upgrade link

---

## 🔍 Key Implementation Details

### File Counting Logic

**Current Implementation (`getCurrentFileCount`):**
```typescript
// Counts distinct files from saved_connections table
const { count } = await supabaseAdmin
  .from('saved_connections')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);
```

**Note:** This counts all connections, even if they were never indexed. This is intentional - we want to limit saved connections, not just indexed files.

### Re-indexing Logic

**Important:** When creating an index for an existing file (re-index), it should NOT count against the file limit.

**Current Implementation:**
```typescript
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
    error: `File limit reached...`,
    code: 'FILE_LIMIT_REACHED'
  });
}
```

**For saved_connections.ts:**
- We should check if connection already exists (same file_key for same user)
- If exists, it's an update, not a new file
- Only check limit for new connections

### Error Codes

**Standard Error Response:**
```typescript
{
  success: false,
  error: string, // Human-readable message
  code: 'FILE_LIMIT_REACHED', // Machine-readable code
  current: number, // Current file count
  max: number, // Maximum file limit
  upgradeUrl?: string // Link to upgrade/pricing
}
```

---

## 📝 Files to Modify

### Backend

1. ✅ `pages/api/user/limits.ts` - **CREATED** - API endpoint for limits
2. `pages/api/saved-connections.ts` - Add file limit check in POST endpoint
3. `lib/subscription-helpers.ts` - Already has required functions

### Frontend (Web)

4. `pages/api-index.tsx` - Add file limit indicator component
5. `pages/api-index.tsx` - Call `/api/user/limits` and display

### Plugin

6. `ui.html` - Add file limit display in upload section
7. `ui.html` - Handle FILE_LIMIT_REACHED error from upload API
8. Plugin code - Call `/api/user/limits` endpoint

---

## 🎨 UI/UX Guidelines

### Web Interface

**Indicator Placement:**
- Option 1: Top of page (near header)
- Option 2: Above connections list
- Option 3: In connections list header

**Visual Design:**
```
Files: 8 / 10
Progress bar: [████████░░] 80%
```

**Color Scheme:**
- Green (safe): >80% remaining
- Yellow (warning): 50-80% remaining
- Orange (caution): 20-50% remaining
- Red (critical): <20% remaining

**When Limit Reached:**
- Disable "Save Connection" button
- Show alert: "You've reached your file limit (X files). Purchase an add-on or upgrade to add more files."
- Link to pricing page

### Plugin Interface

**Indicator Placement:**
- In upload section, above "Upload to Web" button

**Visual Design:**
```
Files: 8 / 10
[Upload to Web] (disabled if limit reached)
```

**When Limit Reached:**
- Disable upload button
- Show message: "File limit reached. Please upgrade your plan or purchase an add-on to upload more files."

---

## ✅ Testing Checklist

### Backend Tests

- [ ] `/api/user/limits` returns correct limits for each plan
- [ ] `/api/user/limits` includes addons in calculation
- [ ] `/api/user/limits` handles unlimited users correctly
- [ ] `saved-connections` POST blocks when limit reached
- [ ] `saved-connections` POST allows updates to existing connections
- [ ] `create-index-from-figma` still blocks correctly (existing check)

### Frontend Tests (Web)

- [ ] File limit indicator displays correctly
- [ ] Indicator updates when connection is saved/deleted
- [ ] Color coding works correctly
- [ ] Warning appears when limit approaching
- [ ] Upgrade link works

### Plugin Tests

- [ ] Plugin displays file limit
- [ ] Upload button disabled when limit reached
- [ ] Error message displays correctly
- [ ] Upgrade link works

---

## 📚 Related Files

- `lib/plans.ts` - Plan definitions and limits
- `lib/subscription-helpers.ts` - Limit calculation functions
- `pages/api/create-index-from-figma.ts` - Existing file limit check
- `pages/api/upload-index.ts` - Plugin upload endpoint (may need update)

---

**Document Version:** 1.0.0  
**Last Updated:** December 26, 2025  
**Status:** Implementation In Progress

