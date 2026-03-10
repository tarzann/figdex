# Index Processing Optimization - Changelog

## Version 1.2.0 - Optimized Index Processing (November 30, 2024)

### Problem
The system was experiencing 504 Gateway Timeout errors when creating indices with 60+ frames. The issue occurred because:
1. Processing frames on-the-fly required multiple API calls per frame (Figma API + image download + upload)
2. Each frame took 2-5 seconds to process
3. Chunks of 10-15 frames exceeded Vercel's 30-second timeout limit
4. Large manifests (1-2MB) took significant time to write to the database

### Solution

#### 1. Aggressive Chunk Size Reduction
- **Before**: 10-15 frames per chunk (default 40)
- **After**: 
  - Max 2 frames for indices >100 frames
  - Max 3 frames for indices >50 frames
  - Max 5 frames for smaller indices
- **Result**: Each chunk now takes 6-15 seconds instead of 40-135 seconds

#### 2. Dynamic Chunk Size Based on Data Size
- Maximum chunk size: 1MB when processing on-the-fly (reduced from 2MB)
- Maximum chunk size: 3MB when using existing manifest
- Chunk size is calculated based on estimated frame size to prevent payload size issues

#### 3. Comprehensive Logging
Added detailed logging throughout the process:
- Request ID tracking for each API call
- Timestamps and durations for each step:
  - Job loading from DB
  - Chunk preparation
  - Frame processing (on-the-fly)
  - Image URL fetching from Figma
  - Image downloading (size + time)
  - Image uploading to Supabase (time)
  - Job status updates
  - Index saving
- Manifest size tracking
- Progress tracking (frames processed / total frames)

#### 4. Fallback Mechanism
- If new columns (`frame_node_refs`, `document_data`) don't exist in DB, system falls back to old approach
- Processes frames immediately before creating job (backward compatibility)
- Allows system to work even if SQL migration hasn't been run

#### 5. Error Handling Improvements
- Better error messages for timeouts
- Job status correctly marked as 'failed' in database
- Informative error messages displayed to users

### Technical Details

#### Files Modified
1. `pages/api/create-index-from-figma.ts`
   - Changed to save only node references instead of processing all frames
   - Added fallback to old approach if columns don't exist
   - Fast job creation (no timeout)

2. `pages/api/process-index-job.ts`
   - Reduced chunk sizes aggressively
   - Added comprehensive logging
   - Optimized manifest updates
   - Better error handling

3. `sql/add_frame_node_refs_to_index_jobs.sql`
   - New SQL migration for storing frame node references
   - Allows background processing instead of immediate processing

### Performance Improvements

#### Before Optimization
- **Chunk size**: 10-15 frames
- **Time per chunk**: 40-135 seconds
- **Result**: 504 Gateway Timeout after ~30 seconds
- **Success rate**: Failed for indices >50 frames

#### After Optimization
- **Chunk size**: 2-3 frames
- **Time per chunk**: 6-15 seconds
- **Result**: Successfully processes indices with 77+ frames
- **Success rate**: Works for large indices

### Example: 77 Frames Index
- **Chunks required**: ~25-26 chunks (instead of 5-8)
- **Total API calls**: ~25-26 (instead of 5-8)
- **Time per chunk**: ~10-15 seconds
- **Total processing time**: ~4-6 minutes (distributed across multiple API calls)
- **Result**: ✅ Success

### Database Schema Changes

#### New Columns in `index_jobs` Table
```sql
ALTER TABLE index_jobs
ADD COLUMN IF NOT EXISTS frame_node_refs JSONB,
ADD COLUMN IF NOT EXISTS document_data JSONB;
```

These columns allow:
- Storing frame node references for later processing
- Processing frames in background instead of during job creation
- Faster job creation (no timeout)

### Monitoring

The new logging system provides:
- Request IDs for tracking each API call
- Manifest size tracking (helps identify if manifest size causes timeouts)
- Progress tracking (frames processed / total frames)
- Detailed timing for each step

### How to View Logs

1. Go to Vercel Dashboard → Project → Deployments
2. Select the latest deployment
3. Click "Functions" → `api/process-index-job`
4. Click "Logs"

Look for:
- `🚀 [req_...] ===== process-index-job START =====`
- `📦 [req_...] [chunk_...] ===== uploadChunkFrames START =====`
- `Frame X: Downloading image...`
- `Frame X: Uploaded in Xms`
- `📦 Manifest size: X.XX MB`

### Future Improvements

1. **Manifest Storage Optimization**
   - Consider storing manifest in Supabase Storage instead of DB
   - Update manifest only every 5 chunks (not every chunk)
   - Reconstruct manifest from `frame_node_refs` if needed

2. **Parallel Processing**
   - Process multiple frames in parallel (within chunk size limits)
   - Use Promise.all for image downloads/uploads

3. **Background Worker**
   - Consider using a dedicated background worker (not serverless function)
   - Remove 30-second timeout limitation

### Testing

Tested successfully with:
- ✅ Small indices (< 50 frames)
- ✅ Medium indices (50-100 frames)
- ✅ Large indices (77+ frames)

### Deployment

Deployed to production: https://www.figdex.com

### Related Issues Fixed
- Fixed 504 Gateway Timeout errors
- Fixed job status stuck on 'pending' instead of 'failed'
- Fixed duplicate indices when using both plugin and API token
- Fixed indexing of hidden frames
- Fixed indexing of non-frame nodes (images, etc.)



