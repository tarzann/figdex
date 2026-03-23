# דוח מצב קיים – FigDex (פלאגין + מערכת ווב)

**As-Is Snapshot רשמי (Founder Decision #2)** — מסמך זה הוא Baseline מחייב להחלטות מוצר ופיתוח.

**תאריך:** 31 בינואר 2026 (עדכון: 23 במרץ 2026)  
**גרסה:** v1.32.02 (פלאגין) / v1.32.02 (ווב)  
**סטטוס כללי:** ✅ Production Ready  
**שלב א – משתמש חדש:** ✅ אומת בהצלחה (8 בפברואר 2026) — ראה `docs/STAGE1_NEW_USER_VERIFIED.md`

---

## 1. סקירה כללית

FigDex היא פלטפורמה ליצירה, ניהול ושיתוף של אינדקסים חיפושיים לקבצי Figma. המערכת מורכבת משני רכיבים עיקריים:

| רכיב | תיאור | מיקום |
|------|--------|--------|
| **פלאגין Figma** | אינדוקס פריימים מתוך קובץ Figma והעלאה למערכת | `FigDex/plugin/` |
| **אפליקציית ווב** | אחסון, גלריה, חיפוש, ניהול משתמשים ופרויקטים | `FigDex/web/` או `my-figma-gallery/` |

**כתובת פרודקשן:** https://www.figdex.com

---

## 2. פלאגין Figma

### 2.1 גרסאות וקבצים

| קובץ | גרסה נוכחית | הערות |
|------|-------------|--------|
| `plugin/code.js` | **1.32.02** | קוד ריצה (sandbox), בניית אינדקס, העלאה |
| `plugin/ui.html` | 1.32.02 | ממשק משתמש, לוגין, העלאה |
| `plugin/manifest.json` | - | API 1.0.0, דומיינים: Supabase, figdex.com |

### 2.2 יכולות עיקריות (פעילות)

- **אינדוקס פריימים:** איסוף FRAME (כולל בתוך SECTION), סינון `[NO_INDEX]`
- **טקסט לחיפוש:** קריאת `__FRAME_TEXTS__` מפריימי תמונה, יצירת searchTokens
- **העלאה:** תמונות ל-Supabase Storage (signed URLs), מניפסט ל-`/api/upload-index-v2`
- **אימות:** Supabase Auth (session), שמירת tokens בעמוד FigDex עם **הצפנה AES-256-GCM**
- **התחברות ווב:** לוגין דרך iframe ל־www.figdex.com, API Key validation
- **הגדרות:** שמירת איכות תמונה ובחירת עמודים ב-pluginData (עמוד FigDex)
- **הדרת עמודים:** "Exclude from index" בתפריט הקשר, סימון ויזואלי, הוצאה באינדוקס הבא

### 2.3 דומיינים (manifest)

- `https://txbraavvjiriwfdlmcvc.supabase.co` – Supabase
- `https://www.figdex.com`, `https://figdex.com` – שרת FigDex
- Dev: `http://localhost:3003`, `http://localhost:3004`

### 2.4 זרימת עבודה (תמצית)

1. משתמש בוחר עמודים (ובהגדרות – איכות תמונה).
2. פלאגין בונה JSON אינדקס (פריימים, מטא-דאטה, טקסטים).
3. תמונות מועלות ל-Supabase דרך `/api/storage/signed-upload`.
4. מניפסט נשלח ל־`/api/upload-index-v2` (או fallback ל־`/api/upload-index`).

---

## 3. מערכת הווב

### 3.1 מקורות קוד

יש שני מקורות אפשריים לאפליקציית הווב:

| מיקום | הערות |
|--------|--------|
| **FigDex/web/** | גרסה מסונכרנת עם פלאגין FigDex, כולל releases |
| **my-figma-gallery/** | פרויקט Next.js נפרד (frames-index-platform-GPT), תיעוד FEATURES_STATUS מפורט |

הפלאגין מתחבר ל־**www.figdex.com** – יש להניח שפרודקשן מועלה מ-FigDex/web או מ־my-figma-gallery (לפי הגדרות ה-deploy).

### 3.2 סטק טכנולוגי

- **Frontend:** Next.js 15.5.9, React 19.1.0, Material-UI 7.2.0, Tailwind 4
- **Backend:** Next.js API Routes (Serverless)
- **DB:** Supabase (PostgreSQL), RLS
- **Storage:** Supabase Storage
- **Hosting:** Vercel (לפי תיעוד)
- **Auth:** Supabase Auth (OAuth + Email/Password)
- **Email:** Resend
- **תשלומים:** Paddle JS + Stripe בפרויקט (לפי package.json) – סטטוס באינטגרציה בפועל ראה FEATURES_STATUS

### 3.3 גרסאות API ו־Pages (מתוך FigDex)

| רכיב | גרסה | קובץ/עמוד |
|------|--------|-----------|
| API Upload | v1.30.40 | `pages/api/upload-index-v2.ts` |
| Gallery | v1.30.24 | `pages/gallery.tsx` |
| Index Management | v1.30.28 | `pages/index-management.tsx` |

### 3.4 עמודים ו־API עיקריים

**עמודים:**  
`index`, `home`, `login`, `register`, `account`, `gallery`, `index-management`, `projects`, `projects-management`, `api-index` (Figma API), `pricing`, `help`, `contact`, `settings`, `share/[token]`, `u/[slug]`, `admin/*` (משתמשים, אינדקסים, jobs, analytics, addons, וכו').

**API (דוגמאות):**  
`upload-index`, `upload-index-v2`, `storage/signed-upload`, `validate-api-key`, `account`, `get-indices`, `user/custom-tags`, `process-index-job`, `get-job-status`, ועוד כ־84 routes ב־`pages/api/`.

### 3.5 תכונות ווב – סיכום (לפי FEATURES_STATUS)

- **אימות:** Google OAuth, Email/Password, שחזור סיסמה ✅  
- **אינדקסים:** העלאה מפלאגין, Figma API (create-index-from-figma, process-index-job), Jobs ברקע, התקדמות, Saved connections ✅  
- **גלריה:** Masonry, מודל תמונה, lazy loading, שיתוף (share links), עמודים ציבוריים ✅  
- **חיפוש:** טקסט, סינון לפי קובץ/תגיות/מועדפים ✅  
- **פרויקטים:** CRUD, אנשים, סטטוס, לינקים ל-Figma/Jira ✅  
- **תכניות וקרדיטים:** Free/Pro/Team/Unlimited, קרדיטים חודשיים, היסטוריית עסקאות, אדמין ✅  
- **אדמין:** משתמשים, אינדקסים, Jobs, אנליטיקה, Add-ons ✅  
- **חסר/חלקי:** תשלומים מלאים, ייצוא אינדקס, Team sharing, 2FA, Webhooks, PWA, i18n – רשימה מפורטת ב־FEATURES_STATUS.md

---

## 4. חיבור פלאגין ↔ ווב

| פעולה | endpoint / יעד |
|--------|-----------------|
| לוגין | iframe → https://www.figdex.com/login |
| אימות API Key | GET/POST https://www.figdex.com/api/validate-api-key |
| פרטי חשבון | https://www.figdex.com/api/account |
| רשימת אינדקסים | https://www.figdex.com/api/get-indices |
| העלאת תמונות | https://www.figdex.com/api/storage/signed-upload |
| העלאת אינדקס (מניפסט) | https://www.figdex.com/api/upload-index-v2 (מועדף), /api/upload-index (fallback) |
| תגיות מותאמות | https://www.figdex.com/api/user/custom-tags |

הפלאגין שומר Supabase tokens (מוצפנים) ב-pluginData של עמוד FigDex ומשתמש בהם לסשן.

---

## 5. מסד נתונים ואחסון

- **Supabase Project:** `txbraavvjiriwfdlmcvc.supabase.co`
- **טבלאות (דוגמאות):** users, saved_connections, saved_indices, index_files, index_jobs, index_archives, projects, shared_views, credits, addon_packages, וכו' – רשימה מלאה ב־`sql/` ו־docs
- **Migrations:** קבצי SQL ב־`web/sql/` (או `my-figma-gallery/sql/`)

---

## 6. סיכום סטטוס

| תחום | סטטוס | הערות |
|------|--------|--------|
| פלאגין | ✅ פעיל | v1.30.77, הצפנה, הדרת עמודים, העלאה v2 |
| ווב – ליבה | ✅ פעיל | Auth, גלריה, אינדקסים, פרויקטים, אדמין |
| חיבור פלאגין–ווב | ✅ פעיל | figdex.com, upload-index-v2, signed-upload |
| DB ו-Storage | ✅ Supabase | Production |
| תשלומים / Monetization | ⚠️ חלקי | Paddle/Stripe בפרויקט, אינטגרציה מלאה חסרה (לפי FEATURES_STATUS) |
| תיעוד | ✅ קיים | VERSION.md, CHANGELOG, FEATURES_STATUS, SPECIFICATION, INSTALLATION |

---

## 7. מסמכים רלוונטיים

- **FigDex:** `README.md`, `VERSION.md`, `plugin/CHANGELOG.md`, `plugin/VERSIONS.md`
- **ווב:** `docs/FEATURES_STATUS.md`, `docs/VERSION.md`, `docs/SPECIFICATION.md`, `docs/INSTALLATION.md`
- **מפרט תכונות מפורט:** `docs/FEATURES_STATUS.md` (בתוך my-figma-gallery או FigDex/web)

---

*דוח זה מתאר את המצב הקיים בתאריך 31.01.2026. גרסאות בפועל עשויות להשתנות – מומלץ לבדוק `plugin/code.js` (PLUGIN_VERSION) ו־`web/pages/api/upload-index-v2.ts` (API_VERSION).*
