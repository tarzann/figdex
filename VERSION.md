# FigDex Version Information

**Last Updated:** January 31, 2026

---

## Milestone: משתמש חדש – כל הפלואו מוכן ✅

**תאריך:** 31 בינואר 2026  
**תיעוד:** `docs/NEW_USER_FULL_FLOW_READY.md`

- פלואו משתמש חדש מוכן מקצה לקצה (התחברות, קישור קובץ, אינדוקס, גלריה).
- טלמטריה מקצה־לקצה: טבלת `telemetry_events`, API `/api/telemetry`, שליחת אירועים מהפלאגין (`track`), עמוד אדמין `/admin/telemetry`.

---

## Milestone: שלב א – משתמש חדש ✅

**תאריך:** 8 בפברואר 2026  
**תיעוד:** `docs/STAGE1_NEW_USER_VERIFIED.md`

שלב א (משתמש חדש) אומת בהצלחה: התחברות, קישור קובץ, אינדוקס מהפלאגין, cover תואם לפלאגין בלובי הגלריה, לחיצה על קובץ בתפריט מציגה את הפריימים.

---

## Current System Version: v1.30.40

### Component Versions

| Component | Version | Location | Last Updated |
|-----------|---------|----------|--------------|
| **Plugin Runtime** | v1.30.36 | `plugin/code.js` | Jan 3, 2026 |
| **Plugin UI** | v1.30.36 | `plugin/ui.html` | Jan 3, 2026 |
| **API (upload-index-v2)** | v1.30.40 | `web/pages/api/upload-index-v2.ts` | Jan 3, 2026 |
| **Gallery Page** | v1.30.24 | `web/pages/gallery.tsx` | Jan 2, 2026 |
| **Index Management** | v1.30.28 | `web/pages/index-management.tsx` | Jan 1, 2026 |

---

## Version History

### v1.31.00 – משתמש חדש כל הפלואו מוכן (January 31, 2026)
**Plugin + Web**
- ✅ טלמטריה מקצה־לקצה: טבלת `telemetry_events`, API POST `/api/telemetry`, שליחת אירועים מהפלאגין (plugin_boot, filekey_saved, index_click, needs_connect, connect_success, connect_timeout, auth_expired, indexing_start, indexing_done, open_gallery)
- ✅ עמוד אדמין `/admin/telemetry` – תצוגת אירועים, חיפוש וסינון
- 📄 תיעוד: `docs/NEW_USER_FULL_FLOW_READY.md`

### v1.30.40 (January 3, 2026)
**Web Application**
- ✅ Added comprehensive logging for textContent and searchTokens
- ✅ Fixed text extraction from __FRAME_TEXTS__ in plugin
- ✅ Improved search functionality with complete text indexing
- ✅ Added verification logging after database saves

### Stage 1 – New User verified (February 8, 2026)
**Plugin + Web**
- ✅ Cover from plugin (getCoverImageDataUrl) sent as coverImageDataUrl and stored; gallery lobby shows same cover as plugin
- ✅ Gallery lobby when landing with fileKey; clicking a file in sidebar shows frames (no reset to lobby)
- 📄 See `docs/STAGE1_NEW_USER_VERIFIED.md` for full checklist

### v1.30.36 (January 3, 2026)
**Plugin**
- ✅ Reads __FRAME_TEXTS__ from thumbnail frames for complete text extraction
- ✅ Improved text collection and search token generation
- ✅ Added comprehensive logging for debugging
- ✅ Fixed version display in UI

### v1.30.28 (January 1, 2026)
**Web Application**
- ✅ Added cover image display in index management
- ✅ Fixed frame count calculation
- ✅ Improved cover image loading logic

### v1.30.24 (January 2, 2026)
**Web Application**
- ✅ Fixed cover image signing and display
- ✅ Improved search with word boundaries
- ✅ Fixed frame count in lobby view

---

## Version Update Guidelines

When updating versions:

1. **Plugin Updates:**
   - Update `PLUGIN_VERSION` in `plugin/code.js`
   - Update version display in `plugin/ui.html` (menuVersionText)
   - Update `plugin/README.md` if needed

2. **Web Application Updates:**
   - Update `API_VERSION` in `web/pages/api/upload-index-v2.ts`
   - Update `PAGE_VERSION` in relevant page files
   - Update this file (VERSION.md)
   - Update main README.md

3. **Version Format:**
   - Use semantic versioning: `v1.30.XX`
   - Increment last number for bug fixes
   - Increment middle number for features
   - Increment first number for major changes

---

## Deployment Status

- **Plugin**: ✅ Ready (v1.30.36)
- **Web Application**: ✅ Deployed to Vercel (v1.30.40)
- **Database**: ✅ Supabase (Production)
- **Storage**: ✅ Supabase Storage (Production)

---

**Note:** Always verify version numbers match across all components before deployment.


