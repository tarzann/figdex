# API Index Page Version History

## v1.3.2 (Current)
**Date:** 2025-01-08
**Changes:**
- **Critical Fix**: Fixed infinite loop bug - "No frames processed" issue
- **Fixed**: Removed time budget check during frame collection (was causing empty chunks)
- **Fixed**: Ensure at least one frame is processed even if time budget is tight
- **Improved**: Increased time budget from 15s to 18s per invocation
- **Improved**: Better logic to prevent infinite retry loops

## v1.3.1
**Date:** 2025-01-08
**Changes:**
- **Fixed**: Removed `fast_mode` column reference (column doesn't exist in production)
- **Fixed**: Increased upload timeouts (10s minimum, 20s for small files, 15s for large)
- **Fixed**: Increased download timeouts (18s for parallel, 20s for single)
- **Improved**: Increased parallel concurrency from 4 to 6 operations
- **Improved**: Optimized chunk sizes for ~100 frame files (15 frames per chunk)
- **Improved**: Better timeout error handling with aggressive retry logic
- **Improved**: Better error messages and logging

## v1.3.0
**Date:** 2025-01-08
**Changes:**
- **Performance Optimization**: Implemented parallel image processing (4 concurrent downloads/uploads)
- **Increased Chunk Sizes**: With parallel processing, can now process 2-3x more frames per chunk
- **Faster Index Creation**: Significantly reduced time for large files (from ~12s per 6 frames to ~4-6s per 8-12 frames)
- **Better Resource Utilization**: Better use of time budget with concurrent operations
- **Improved Error Handling**: Individual frame failures don't stop entire batch processing

## v1.2.0
**Date:** 2025-01-08
**Changes:**
- Fixed: Delete jobs functionality - now works even if job doesn't exist in index_jobs table
- Added: Cleanup endpoint `/api/jobs/cleanup` to remove all non-completed jobs
- Added: "Cleanup Non-Completed Jobs" button in History tab
- Improved: ID display (Job ID and Index ID) with better styling
- Improved: Delete button now works even without jobId (uses indexId)
- Added: CORS headers to delete and cleanup endpoints
- Added: Detailed logging for debugging ID display issues

## v1.1.0
**Date:** 2025-01-07
**Changes:**
- Initial rebuild of API Index page with new layout
- Left sidebar for Saved Connections
- Main content area with two tabs (Connections and History)
- Automatic frame counting after page list validation
- Create Index functionality with background job processing

## v1.0.0
**Date:** 2025-01-06
**Changes:**
- Initial version
- Basic Figma API integration
- Connection validation
- Frame counting
- Index creation

---

## Version Numbering Scheme
- **Major version (v1.x.x)**: Major feature changes or page rebuilds
- **Minor version (vx.1.x)**: New features or significant improvements
- **Patch version (vx.x.0)**: Bug fixes and minor improvements

## How to Update Version
1. Update `PAGE_VERSION` constant in `pages/api-index.tsx`
2. Add entry to this file with date and changes
3. Deploy and verify

