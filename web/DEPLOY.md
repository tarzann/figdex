# FigDex – פריסה ל‑Vercel

## הגדרה ראשונית (פעם אחת)

### 1. התחברות ל‑Vercel
```bash
npx vercel login
```

### 2. קישור הפרויקט (אם עדיין לא קושר)
```bash
cd /Users/ranmor/Documents/FigDex/web
npx vercel link
```
- בחר את ה‑Team (אם יש)
- בחר "Link to existing project" או "Create new project"
- שם הפרויקט מומלץ: `figdex` או `figdex-web`

### 3. בדיקת חיבור
```bash
npx vercel whoami
```
אם מוצג האימייל – ההתחברות עובדת.

---

## פריסה ל‑Production

```bash
cd /Users/ranmor/Documents/FigDex/web
npx vercel --prod
```

או:
```bash
cd /Users/ranmor/Documents/FigDex/web
npm run deploy
```

---

## פתרון בעיות

### "Not authenticated"
```bash
npx vercel login
```

### "No project linked"
```bash
cd /Users/ranmor/Documents/FigDex/web
npx vercel link
```

### Build נכשל
בדיקה מקומית:
```bash
cd /Users/ranmor/Documents/FigDex/web
npm run build
```

### שגיאות סביבה (env)
ודא שהוגדרו ב‑Vercel Dashboard → Project → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- ועוד משתנים שהאפליקציה צריכה

---

## הגדרות Vercel Dashboard

- **Root Directory:** `web` (אם מפריסים מהשורש של ה‑repo)
- **Framework Preset:** Next.js
- **Build Command:** `next build` (ברירת מחדל)
- **Output Directory:** `.next` (ברירת מחדל)
