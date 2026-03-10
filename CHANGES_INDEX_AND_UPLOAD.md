# סיכום שינויים – אינדוקס פריימים והעלאה

## 1. פלאגין – `plugin/code.js`

### לוגיקת אינדוקס (לפי OLD_INDEX_LOGIC_FINDINGS.md)
- **פריימים ברמת העמוד:** ילדים ישירים של Page (FRAME) – מאונדקסים.
- **פריימים בתוך Section:** רק **ילדים ישירים** של Section (FRAME ברמה אחת) – מאונדקסים.
- **שם פריים:** אם הפריים בתוך Section – שם לתצוגה: `"שם Section / שם הפריים"`. אחרת – שם הפריים בלבד.
- **פונקציות:** `getTopLevelFrameIds`, `getTopLevelFrameNodes` – רק ילדים ישירים של Section. `getSectionNameForFrame(frame)` – מחזירה את שם ה-Section שמכיל את הפריים.

### העלאה במנות (Chunked upload)
- **איסוף:** כל הפריימים (ללא מגבלת כמות) נאספים ל־`allPageFrames`.
- **חלוקה:** מנות של **18 פריימים** למנה (`FRAMES_PER_CHUNK = 18`).
- **שליחה:** כל מנה נשלחת בבקשה נפרדת ל־`/api/create-index-from-figma`.
- **שם מנה:** כשהמנות יותר מאחת – `"שם קובץ (Part 1/N)"`, `"שם קובץ (Part 2/N)"` וכו'.
- **גוף הבקשה:** בכל מנה נשלחים `chunkIndex` (0-based) ו־`totalChunks`.
- **Cover:** נשלח רק במנה הראשונה (`coverImageDataUrl`).

### תמונות ואיכות
- **פורמט:** JPG (לא PNG) להקטנת נפח.
- **רזולוציה:** `SCALE = 0.75`.
- **imageQuality:** `0.75`.

### טיפול בתגובה
- אחרי כל המנות – בדיקת הצלחה/כישלון, הודעות שגיאה (401/403, טקסט שגיאה), `viewToken` מהמנה האחרונה, הודעת הצלחה עם מספר הפריימים.

---

## 2. API – `web/pages/api/create-index-from-figma.ts`

### זיהוי מנה (chunk)
- `fileName` מכיל `(Part N/M)` → `isChunkUpload = true`.
- קריאת `chunkIndex` ו־`totalChunks` מהגוף.
- מנה אחרונה: `chunkIndex + 1 === totalChunks` → `isLastChunk`.

### מפתח ייחודי למנות (עקיפת UNIQUE)
- ב־DB: `UNIQUE(user_id, figma_file_key)`.
- **מנה:** נשמרת עם `figma_file_key = fileKeyTrim + '::part' + (chunkIndex + 1)` (למשל `abc123::part1` … `abc123::part8`).
- **אינדוקס רגיל (לא מנה):** נשמר עם `figma_file_key = fileKeyTrim` כרגיל.

### מיזוג אוטומטי אחרי המנה האחרונה
- כשמתקבלת **מנה אחרונה** (`isLastChunk`):
  1. שליפה: כל השורות עם `user_id` ו־`figma_file_key LIKE fileKeyTrim + '::part%'`.
  2. מיון לפי מספר חלק (`::partN`).
  3. אימות: מספר החלקים = `totalChunks`.
  4. מיזוג: איסוף כל ה־`pages` מכל המנות ל־`mergedPages`.
  5. **Cover:** תמיד מה־**מנה הראשונה** בלבד (`coverImageUrl` מתוך `index_data` של Part 1).
  6. הוספת שורה ממוזגת: `figma_file_key = fileKeyTrim`, `file_name` ללא " (Part N/M)", `index_data = { coverImageUrl?, pages: mergedPages }`.
  7. מחיקת כל שורות המנות (`::part1` … `::partN`).

### Cover
- במנה הראשונה: `coverImageDataUrl` מהפלאגין → שמירה ל־Storage → `coverImageUrl` ב־`index_data`.
- במיזוג: `coverImageUrl` נלקח רק מהמנה הראשונה ומועבר לאינדקס הממוזג.

---

## 3. מיזוג מנות ידני – `web/pages/api/merge-chunks.ts`

### תמיכה במבנה index_data מהפלאגין
- **מערך:** `index_data`רך → דפים ישירות.
- **אובייקט:** `index_data` כ־`{ coverImageUrl?, pages: [...] }` → דפים מ־`pages`, ושמירת `coverImageUrl` מהחלק הראשון.
- **אינדקס ממוזג:** `index_data: coverImageUrl ? { coverImageUrl, pages: mergedPages } : mergedPages`.

---

## 4. קבצים ששונו

| קובץ | שינויים עיקריים |
|------|------------------|
| `plugin/code.js` | לוגיקת Section (ילדים ישירים), שם Section+Frame, איסוף כל הפריימים, chunked upload (18 למנה), JPG 0.75, chunkIndex/totalChunks, cover רק במנה ראשונה |
| `web/pages/api/create-index-from-figma.ts` | figma_file_key ייחודי למנות (::partN), מיזוג אוטומטי במנה אחרונה, cover ממנה ראשונה בלבד |
| `web/pages/api/merge-chunks.ts` | תמיכה ב־index_data כ־{ coverImageUrl, pages }, שמירת cover באינדקס הממוזג |

---

## 5. זרימה מלאה (משתמש)

1. פלאגין: "Create gallery" → אוסף את כל הפריימים (Page + Section ישירים), מייצא JPG 0.75, שולח במנות של 18 עם Part 1/N … Part N/N, cover רק ב־Part 1.
2. API: כל מנה נשמרת עם `fileKey::partK`. במנה האחרונה – מיזוג אוטומטי: שורה אחת עם כל הפריימים ו־cover מהמנה הראשונה, מחיקת שורות המנות.
3. ווב: רשימת אינדקסים מציגה קובץ אחד (שם בסיסי, בלי Part). תצוגת קובץ – כל הפריימים; Cover – מה־coverImageUrl (ה־cover מהפלאגין).
