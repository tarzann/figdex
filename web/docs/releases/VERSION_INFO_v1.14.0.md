# Version Information - v1.14.0

## 📦 Release Summary

**Version:** 1.14.0  
**Release Date:** 2025-12-11  
**Status:** ✅ Production Ready  
**Deployment:** https://www.figdex.com

---

## 🎯 Key Features

### 1. Hidden Frames Filter
- Automatically excludes hidden frames (`visible === false`) from indexing
- Applied in all frame collection and processing stages
- Results in cleaner, more relevant indexes

### 2. Performance Optimization
- **50% reduction** in API calls to Vercel
- **70% reduction** in database updates to Supabase
- **50% reduction** in Figma API calls
- Optimized polling intervals (30s/20s)

### 3. Error Handling
- Automatic job stop on critical errors
- Better error recovery with retry logic
- Improved job completion detection

### 4. Stability Fixes
- Fixed React error #418 (useEffect dependencies)
- Fixed ERR_INSUFFICIENT_RESOURCES
- Fixed premature job completion

---

## 📊 Performance Metrics

### API Calls per Minute (for 1 active job):

| Service | Before | After | Savings |
|---------|--------|-------|---------|
| Vercel | 10-14 | 5-7 | ~50% |
| Supabase | 16-26 | 5-8 | ~70% |
| Figma API | 6 | 3 | ~50% |

---

## 🔧 Technical Changes

### Files Modified:
1. `pages/api-index.tsx`
   - Added hidden frames filter
   - Optimized polling (30s intervals)
   - Fixed React hooks dependencies
   - Reduced DB updates

2. `pages/api/process-index-job.ts`
   - Added hidden frames filter
   - Added automatic job stop on critical errors
   - Improved job completion logic
   - Better error handling

3. `vercel.json`
   - Added `maxDuration: 300` for process-index-job

### New Files:
- `CHANGELOG_v1.14.0.md` - Detailed changelog
- `OPTIMIZATION_ANALYSIS.md` - Performance analysis
- `VERSION_INFO_v1.14.0.md` - This file

---

## 🚀 Deployment

**Production URL:** https://www.figdex.com  
**Version Display:** Shown in UI header (v1.14.0)

---

## 📝 Notes

- All changes are backward compatible
- No database migrations required
- Existing jobs will continue to work
- New jobs will benefit from all optimizations

---

**Build Date:** 2025-12-11  
**Next Version:** TBD

