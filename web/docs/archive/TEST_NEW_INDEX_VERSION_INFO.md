# בדיקת Version Info באינדקס חדש

## שלב 1: בדוק את ה-Job ב-Database

הרץ את השאילתה הזו ב-Supabase Dashboard → SQL Editor:

```sql
-- בדוק את ה-job האחרון שנוצר
SELECT 
  id,
  file_key,
  file_name,
  figma_version,
  figma_last_modified,
  status,
  created_at
FROM index_jobs
ORDER BY created_at DESC
LIMIT 1;
```

**מה לחפש:**
- ✅ `figma_version` - צריך להכיל string (לא NULL)
- ✅ `figma_last_modified` - צריך להכיל timestamp (לא NULL)

**אם NULL:**
- זה אומר שה-job לא כולל version info
- בדוק את הלוגים ב-Vercel לראות אם הייתה שגיאה

---

## שלב 2: בדוק את האינדקס ב-Database

הרץ את השאילתה הזו:

```sql
-- בדוק את האינדקס האחרון שנוצר
SELECT 
  id,
  figma_file_key,
  file_name,
  figma_version,
  figma_last_modified,
  array_length(frame_ids, 1) as frame_ids_count,
  uploaded_at
FROM index_files
ORDER BY uploaded_at DESC
LIMIT 1;
```

**מה לחפש:**
- ✅ `figma_version` - צריך להכיל string (לא NULL)
- ✅ `figma_last_modified` - צריך להכיל timestamp (לא NULL)
- ✅ `frame_ids_count` - צריך להיות מספר חיובי (מספר ה-frames)

**אם NULL:**
- זה אומר שה-job לא כלל version info
- או שה-job עדיין בעיבוד

---

## שלב 3: בדוק דרך ה-UI (הכי קל!)

1. עבור ל-**Index Management** (`/index-management`)
2. לחץ על כפתור **"Check for updates"** (אייקון Update - 🔄) ליד האינדקס החדש
3. הכנס את ה-Figma Personal Access Token שלך
4. בדוק את התוצאות:

**אם הכל תקין:**
- תראה "No changes detected" (כי זה אותו קובץ)
- תראה את ה-version number
- תראה את מספר ה-frames

**אם יש בעיה:**
- תראה שגיאה או שהגרסה לא מוצגת

---

## מה אמור לקרות:

### אם האינדקס כולל version info:
```
✅ Version: 1234567890
✅ No changes detected
✅ File version unchanged - no re-indexing needed
```

### אם האינדקס לא כולל version info:
```
⚠️ Index missing version info (old index)
⚠️ This index was created before version tracking was added
⚠️ A full re-index is recommended to enable incremental updates
```

---

## בדיקת שינויים (Optional):

1. עדכן משהו בקובץ Figma (הוסף frame, שנה טקסט, וכו')
2. לחץ שוב על "Check for updates"
3. אמור לזהות שינויים ולהציע re-index

---

## אם משהו לא עובד:

בדוק את הלוגים ב-Vercel Dashboard:
- חפש "create-index-from-figma" - לראות אם ה-job נשמר עם version info
- חפש "process-index-job" - לראות אם ה-version info נשמר באינדקס
- חפש "check-index-changes" - לראות אם הבדיקה עובדת

