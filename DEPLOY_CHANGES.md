# פריסת שינויים – FigDex

סיכום כל הקבצים שהשתנו (לפריסה / commit).

---

## 1) Guest → Free + Claim + FigDex key

| קובץ | שינוי |
|------|--------|
| `web/sql/claim_guest_upgrade_schema.sql` | **חדש** – meta/updated_at ב-index_files; claim_token, source, consumed ב-claim_tokens |
| `web/lib/claim-guest-data.ts` | Account wins, meta.claimed_from_guest, mergedConflicts, figdexKeyMoved |
| `web/pages/api/claim/start.ts` | source, claim_token, redirectUrl, טלמטריה guest_upgrade_started |
| `web/pages/api/claim/complete.ts` | consumed_at/consumed_by_user_id, figdexKeyMoved, טלמטריה guest_upgrade_* |
| `web/pages/gallery.tsx` | באנר "Save & sync your indexes", שני כפתורים, redirect ל-plugin-connect |
| `web/pages/plugin-connect.tsx` | טיפול ב-claimToken, mode=upgrade+anonId, claim/complete |
| `plugin/code.js` | UI_OPEN_FIGDEX_WEB_UPGRADE (nonce + anonId + polling) |
| `plugin/ui.html` | לינק "Save & sync (Free)" + שליחת UI_OPEN_FIGDEX_WEB_UPGRADE |

**לפני פריסה:** להריץ את המיגרציה `web/sql/claim_guest_upgrade_schema.sql` על ה-DB.

---

## 2) פרופילי חשבון (Guest / Free / Pro)

| קובץ | שינוי |
|------|--------|
| `web/lib/plans.ts` | תוכנית guest (1 קובץ, 50 פריימים), free (2, 200), pro (10, 1000) |
| `web/lib/subscription-helpers.ts` | getCurrentIndexFileCount, getGuestIndexFileCount, getCurrentTotalFrames, getGuestTotalFrames |
| `web/pages/api/create-index-from-figma.ts` | מגבלות אורח, אישור free, בדיקת קבצים/פריימים לפני אינדוקס |
| `web/pages/api/plugin-connect/guest.ts` | plan: 'guest' למשתמש חדש |
| `web/pages/api/register.ts` | plan: 'free' בהרשמה |
| `web/pages/api/claim/complete.ts` | שדרוג guest → free אחרי claim |

---

## 3) עמוד אירועים + Admin

| קובץ | שינוי |
|------|--------|
| `web/pages/admin/events.tsx` | **חדש** – עמוד "אירועים" (כל האירועים של המשתמשים), סינון לפי user/source |
| `web/pages/api/admin/telemetry.ts` | סינון לפי query `userId` |
| `web/pages/admin/index.tsx` | קישור "אירועים" → /admin/events |

---

## פקודות לפריסה (בתוך FigDex)

```bash
# 1. DB – הרצת מיגרציה (פעם אחת)
# ב-Supabase SQL Editor: להריץ את התוכן של:
# web/sql/claim_guest_upgrade_schema.sql

# 2. Web (אם משתמשים ב-Vercel/Railway וכו')
cd web
npm run build   # לוודא שהבנייה עוברת
# ואז deploy כרגיל (git push / Vercel CLI וכו')

# 3. Plugin – לא דורש פריסת שרת, רק עדכון קבצי plugin (code.js, ui.html)
```

---

## רשימת קבצים מלאה (לפי תיקייה)

```
web/sql/claim_guest_upgrade_schema.sql
web/lib/claim-guest-data.ts
web/lib/plans.ts
web/lib/subscription-helpers.ts
web/pages/api/claim/start.ts
web/pages/api/claim/complete.ts
web/pages/api/create-index-from-figma.ts
web/pages/api/plugin-connect/guest.ts
web/pages/api/register.ts
web/pages/api/admin/telemetry.ts
web/pages/gallery.tsx
web/pages/plugin-connect.tsx
web/pages/admin/index.tsx
web/pages/admin/events.tsx
plugin/code.js
plugin/ui.html
```
