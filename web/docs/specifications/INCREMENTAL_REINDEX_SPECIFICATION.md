# Incremental Re-Indexing Specification

## Overview
ייעול תהליך יצירת אינדקס חוזר על ידי זיהוי פריימים שעודכנו או נוספו, והצעת re-index רק לפריימים הרלוונטיים.

## Current State Analysis

### Existing Metadata
1. **File-level version**: Figma API מחזיר `version` ו-`lastModified` ברמת הקובץ
2. **Frame IDs**: כל frame יש לו `id` ייחודי (Figma node ID) שנשמר ב-`index_data`
3. **No frame-level versioning**: Figma API לא מספק lastModified ברמת frame

### Database Schema
- `index_files` table מכיל `index_data` (JSONB) עם כל ה-frames
- אין שדה לשמירת `figma_version` או `lastModified` של הקובץ

## Proposed Solution

### Phase 1: Track File Version

#### 1.1 Add Version Tracking to `index_files`
```sql
ALTER TABLE index_files 
ADD COLUMN IF NOT EXISTS figma_version TEXT,
ADD COLUMN IF NOT EXISTS figma_last_modified TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS frame_ids TEXT[] DEFAULT '[]'::text[];
```

**Rationale**: 
- `figma_version`: מזהה את גרסת הקובץ ב-Figma
- `figma_last_modified`: timestamp של שינוי אחרון
- `frame_ids`: רשימה של כל frame IDs לאינדקס מהיר של שינויים

#### 1.2 Update Index Creation
מתבצע index חדש, לשמור:
- `figma_version` מהתגובה של Figma API
- `figma_last_modified` מהתגובה
- `frame_ids` - רשימה של כל ה-frame IDs מהאינדקס

### Phase 2: Incremental Re-Index Detection

#### 2.1 Check for Changes Before Re-Index
כשיש בקשה ל-re-index:

1. **Fetch current file version** מהפיגמה API (קל - `lightweight=true`)
2. **Compare with stored version**:
   - אם `figma_version` זהה → אין שינויים, return early
   - אם `figma_version` שונה → יש שינויים, continue to step 3

3. **Compare frame lists**:
   - Fetch current frame IDs מהפיגמה (quick operation)
   - השווה עם `frame_ids` השמורים
   - זהה:
     - **New frames**: IDs שלא היו קודם
     - **Removed frames**: IDs שהיו קודם אבל עכשיו לא קיימים
     - **Existing frames**: IDs שקיימים בשני

4. **Decision Logic**:
   ```
   If (new_frames > 0 || removed_frames > 0):
     Offer incremental re-index:
       - Re-index only new frames
       - Remove deleted frames from index
       - Keep existing unchanged frames
   
   Else if (version changed but frame list identical):
     Offer full re-index (content changed but structure same):
       - All frames may have changed
       - User can choose: full re-index or skip
   ```

#### 2.2 API Endpoint: Check for Changes
```typescript
POST /api/check-index-changes
{
  fileKey: string,
  userId: string
}

Response:
{
  hasChanges: boolean,
  changeType: 'none' | 'new_frames' | 'removed_frames' | 'content_changed' | 'full',
  newFrameCount: number,
  removedFrameCount: number,
  existingFrameCount: number,
  currentVersion: string,
  storedVersion: string,
  recommendation: 'skip' | 'incremental' | 'full'
}
```

### Phase 3: Incremental Re-Index Implementation

#### 3.1 Modify `create-index-from-figma.ts`
- Before creating job, check for existing index
- If exists, compare versions and frame lists
- If only new/removed frames:
  - Create job with `incremental: true` flag
  - Pass `existingIndexId` and `newFrameIds` array
  - Job will merge with existing index instead of replacing

#### 3.2 Modify `process-index-job.ts`
- Support incremental mode:
  - Load existing index
  - Process only new frames
  - Remove deleted frames
  - Merge new frames with existing
  - Update `figma_version` and `frame_ids`

#### 3.3 Frame Merging Logic
```typescript
// Pseudo-code
if (incremental) {
  const existingIndex = await loadExistingIndex(existingIndexId);
  const existingFrames = extractFrames(existingIndex.index_data);
  const existingFrameIds = new Set(existingFrames.map(f => f.id));
  
  // Process only new frames
  const newFrames = await processFrames(newFrameIds);
  
  // Remove deleted frames
  const updatedFrames = existingFrames.filter(f => 
    !removedFrameIds.includes(f.id)
  );
  
  // Add new frames
  updatedFrames.push(...newFrames);
  
  // Re-sort if needed (by page, by index)
  // Update manifest structure
  // Save merged index
}
```

## Implementation Steps

### Step 1: Database Migration
1. Add columns to `index_files`
2. Backfill existing indices (extract frame IDs from `index_data`)
3. Update index creation to save version info

### Step 2: Change Detection API
1. Create `/api/check-index-changes` endpoint
2. Implement version comparison
3. Implement frame list comparison
4. Return recommendation

### Step 3: UI Integration
1. Add "Check for updates" button in index management
2. Show change detection results
3. Offer incremental vs full re-index options

### Step 4: Incremental Processing
1. Modify job creation to support incremental mode
2. Modify job processing to merge instead of replace
3. Test with various change scenarios

## Benefits

1. **Performance**: 
   - רק פריימים חדשים/משתנים מעובדים
   - חיסכון בזמן עיבוד (images, storage)
   - חיסכון בעלויות (Vercel, Supabase)

2. **User Experience**:
   - מהיר יותר
   - ברור למשתמש מה השתנה
   - בחירה בין incremental vs full

3. **Resource Efficiency**:
   - פחות API calls ל-Figma
   - פחות storage writes
   - פחות processing time

## Edge Cases

1. **File structure changed** (pages renamed, sections moved):
   - Full re-index recommended
   
2. **Massive changes** (>50% frames changed):
   - Full re-index might be faster
   
3. **First index**:
   - No existing version → full index
   
4. **Version info missing** (old indices):
   - Default to full re-index with warning

## Future Enhancements

1. **Content hash comparison**: 
   - Calculate hash of frame content (text, dimensions)
   - Detect if frame content changed even if ID same
   
2. **Smart merging**:
   - Detect if frame moved between pages
   - Update page references automatically
   
3. **Background sync**:
   - Periodic check for changes
   - Notify user when updates available

