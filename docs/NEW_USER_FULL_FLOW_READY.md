# גרסה: משתמש חדש – כל הפלואו מוכן

**תאריך:** 31 בינואר 2026  
**סטטוס:** ✅ תיעוד גרסה

---

## סיכום

גרסה זו מסמנת **משתמש חדש – כל הפלואו מוכן**: פלואו משתמש חדש (התחברות, קישור קובץ, אינדוקס, גלריה) עובד מקצה לקצה, ונוספה **טלמטריה מקצה־לקצה** לשמירת אירועים ב-DB ולתצוגה באדמין.

---

## מה כלול בגרסה זו

### 1. טלמטריה מקצה־לקצה
- **DB:** טבלה `telemetry_events` (מיגרציה: `web/sql/create_telemetry_events_table.sql`) – שדות: id, created_at, user_id, session_id, anon_id, event_name, event_ts, plugin_version, user_type, has_file_key, selected_pages_count, file_key_hash, source, meta.
- **API:** `POST /api/telemetry` – קבלת אירועים מהפלאגין, ולידציה, rate limit (60/דקה ל-anonId+IP), שמירה ב-DB. לא נשלח `fileKey` גולמי – רק `fileKeyHash`.
- **Plugin:** פונקציה `track(eventName, context)` – שליחה ל-`https://www.figdex.com/api/telemetry` ב-fire-and-forget. אירועים: plugin_boot, filekey_saved, index_click, needs_connect, connect_success, connect_timeout, auth_expired, indexing_start, indexing_done, open_gallery. `anonId` נשמר ב-`code.js` (clientStorage), `sessionId` נוצר פעם אחת ב-UI.
- **אדמין:** עמוד `/admin/telemetry` – טבלה עם כל אירועי הטלמטריה, חיפוש וסינון לפי סוג אירוע. קישור מדשבורד האדמין ("Telemetry Events").

### 2. פלואו משתמש חדש (אומת קודם)
- התחברות, קישור קובץ, אינדוקס מהפלאגין, cover תואם, לובי גלריה, לחיצה על קובץ מציגה פריימים.  
- תיעוד: `docs/STAGE1_NEW_USER_VERIFIED.md`.

---

## קבצים רלוונטיים

| רכיב | קובץ/נתיב |
|------|-----------|
| מיגרציה טלמטריה | `web/sql/create_telemetry_events_table.sql` |
| API טלמטריה | `web/pages/api/telemetry.ts` |
| API אדמין טלמטריה | `web/pages/api/admin/telemetry.ts` |
| עמוד אדמין טלמטריה | `web/pages/admin/telemetry.tsx` |
| דשבורד אדמין (קישור) | `web/pages/admin/index.tsx` |
| Plugin – anonId, get_anon_id | `plugin/code.js` |
| Plugin – track(), חיווט אירועים | `plugin/ui.html` |

---

## גרסאות רכיבים

| רכיב | גרסה |
|------|--------|
| Plugin | v1.31.00 (`plugin/code.js` – PLUGIN_VERSION) |

---

## הערות

- הטלמטריה אינה חוסמת את ה-UI (fire-and-forget).
- אין שליחת `fileKey` גולמי – רק hash (FNV-1a) בשדה `file_key_hash`.
- תיעוד גרסה כללי: `VERSION.md`, `plugin/CHANGELOG.md`.
