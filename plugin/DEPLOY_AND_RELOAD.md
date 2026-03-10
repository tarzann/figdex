# עדכון הקוד – מה עודכן ומה צריך לעשות

## 1. קוד שעודכן (מקומית)

- **plugin/code.js** – לוגיקת האינדקס: איסוף מזהי פריימים מכל העמודים → עיבוד כל פריים → קיבוץ ל"דפים" וירטואליים של 20. `findAllFrames`, `getNodeByIdAsync`, מבנה `{ pages, frames, tags }`.
- **plugin/ui.html** – התקדמות העלאה (upload-started, upload-progress).
- **web/pages/api/create-index-from-figma.ts** – `image_quality` ברירת מחדל 0.75, שמירת `indexPayload` כ־`index_data` ב־galleryOnly.

## 2. פלאגין – חייב טעינה מחדש ב־Figma

שינויי הקוד ב־**code.js** ו־**ui.html** לא נטענים אוטומטית. כדי שהגרסה המעודכנת תרוץ:

1. **אם הפלאגין רץ מ־Development (Import plugin from manifest):**
   - סגור את חלון הפלאגין.
   - Plugins → Development → **FigDex** → **Reload**  
     או: Plugins → Development → **Import plugin from manifest** ובחר שוב את `FigDex/plugin/manifest.json`.
2. **אם הפלאגין מותקן מ־Figma Community / ארגון:**  
   הגרסה שפורסמה שם לא מתעדכנת מקובצי ה־Development. כדי להריץ את הקוד המעודכן צריך להריץ מ־Development (Import from manifest אל תיקיית ה־plugin המעודכנת).

## 3. Web (API) – פריסה ל־Vercel

- הפרויקט **web** כבר נפרס ל־Vercel (`vercel --prod`) במהלך העבודה.
- אם **www.figdex.com** מחובר לאותו פרויקט ב־Vercel – השינויים ב־API אמורים להיות כבר בלייב.
- אם יש תהליך פריסה אחר (למשל branch אחר, או סביבה נפרדת) – צריך להריץ את הפריסה מחדש מהענף/סביבה הרלוונטיים.

לפריסה ידנית:

```bash
cd /Users/ranmor/Documents/FigDex/web
npx vercel --prod --yes
```

## 4. סיכום

| רכיב        | עודכן? | מה לעשות כדי שיעבוד בלייב        |
|-------------|--------|-----------------------------------|
| **Plugin**  | כן     | **Reload** פלאגין ב־Figma (או Import from manifest מחדש) |
| **Web API** | כן     | אם figdex.com = Vercel project – כבר בלייב. אחרת – להריץ `vercel --prod` (או תהליך הפריסה שלך) |
