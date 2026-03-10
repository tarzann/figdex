# Testing Incremental Re-Indexing

## מה לבדוק עכשיו:

### 1. בדיקת שמירת Version Info ב-Database

בדוק ב-Supabase Dashboard שהאינדקס החדש כולל:

```sql
SELECT 
  id,
  file_name,
  figma_file_key,
  figma_version,
  figma_last_modified,
  frame_ids,
  uploaded_at
FROM index_files
ORDER BY uploaded_at DESC
LIMIT 5;
```

**מה לחפש:**
- ✅ `figma_version` - צריך להכיל string (למשל: "1234567890")
- ✅ `figma_last_modified` - צריך להכיל timestamp
- ✅ `frame_ids` - צריך להכיל array של frame IDs (למשל: ["1:23", "2:45", ...])

**אם NULL:**
- זה בסדר אם ה-migration לא רץ עדיין
- אבל צריך להריץ את ה-migration כדי שהפיצ'ר יעבוד

---

### 2. בדיקת API Endpoint - Check for Changes

#### דרך 1: Postman/curl

```bash
curl -X POST https://www.figdex.com/api/check-index-changes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "fileKey": "YOUR_FIGMA_FILE_KEY",
    "figmaToken": "YOUR_FIGMA_TOKEN"
  }'
```

**תגובה צפויה אם אין שינויים:**
```json
{
  "success": true,
  "hasChanges": false,
  "changeType": "none",
  "recommendation": "skip",
  "storedVersion": "1234567890",
  "currentVersion": "1234567890",
  "message": "File version unchanged - no re-indexing needed"
}
```

**תגובה צפויה אם יש שינויים:**
```json
{
  "success": true,
  "hasChanges": true,
  "changeType": "new_frames",
  "recommendation": "incremental",
  "newFrameCount": 5,
  "removedFrameCount": 0,
  "existingFrameCount": 230,
  "storedVersion": "1234567890",
  "currentVersion": "1234567891"
}
```

#### דרך 2: דרך ה-UI (קל יותר!)

1. עבור ל-**Index Management** (`/index-management`)
2. לחץ על כפתור **"Check for updates"** (אייקון Update) ליד אינדקס
3. הכנס את ה-Figma Personal Access Token שלך
4. בדוק את התוצאות

**מה לחפש:**
- ✅ אם אין שינויים - תראה "No changes detected" עם גרסה זהה
- ✅ אם יש שינויים - תראה סיכום של frames חדשים/נמחקים והמלצה

---

### 3. בדיקת Scenarios שונים

#### Scenario A: אין שינויים (Same Version)
1. בדוק אינדקס שכבר קיים
2. צריך להחזיר `hasChanges: false`

#### Scenario B: יש שינויים (Different Version, Same Frames)
1. עדכן משהו בקובץ Figma (גם אם רק טקסט קטן)
2. בדוק שוב
3. צריך להחזיר `hasChanges: true`, `changeType: "content_changed"`, `recommendation: "full"`

#### Scenario C: Frames חדשים נוספו
1. הוסף frames חדשים לקובץ Figma
2. בדוק שוב
3. צריך להחזיר `hasChanges: true`, `newFrameCount > 0`, `recommendation: "incremental"`

#### Scenario D: Frames נמחקו
1. מחק frames מהקובץ Figma
2. בדוק שוב
3. צריך להחזיר `hasChanges: true`, `removedFrameCount > 0`, `recommendation: "incremental"`

---

### 4. בדיקת Console Logs

בדוק את הלוגים ב-Vercel Dashboard:
- חפש "check-index-changes"
- בדוק שהלוגיקה של השוואת גרסאות ו-frame IDs עובדת

---

### 5. Edge Cases לבדוק

- ❓ מה קורה עם אינדקס ישן (ללא version info)?
  - צריך להחזיר שגיאה או להציע full re-index
  
- ❓ מה קורה אם ה-file key לא תואם?
  - צריך להחזיר שגיאה ברורה

- ❓ מה קורה אם ה-Figma token לא תקין?
  - צריך להחזיר שגיאת authentication

---

## תיקונים נדרשים (אם נדרש):

אם משהו לא עובד, בדוק:

1. **SQL Migrations רץ?**
   - `sql/add_version_tracking_to_index_jobs.sql`
   - `sql/add_version_tracking_to_index_files.sql`

2. **Version info נשמר ב-jobs?**
   - בדוק ב-`index_jobs` table

3. **Version info נשמר ב-indices?**
   - בדוק ב-`index_files` table

4. **API endpoint זמין?**
   - בדוק ש-`/api/check-index-changes` עובד

5. **UI עובד?**
   - בדוק ש-כפתור "Check for updates" מופיע ועובד

