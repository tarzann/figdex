# מדריך בדיקה - Dynamic Batch Processing

## מה לבדוק:

### 1. **קובץ קטן (<100 frames)**
- **צפוי**: `dynamicBatchSize = 1`
- **בדוק ב-logs**:
  ```
  📊 Dynamic batch size calculated: 1 (total_frames: X)
  📦 Chunk size calculation: { dynamicBatchSize: 1, ... }
  ```
- **בדוק**: העיבוד עובד תקין, לא מהיר מדי אבל אמין

### 2. **קובץ בינוני (100-500 frames)**
- **צפוי**: `dynamicBatchSize = 2-3`
- **בדוק ב-logs**:
  ```
  📊 Dynamic batch size calculated: 2 (total_frames: 150)
  או
  📊 Dynamic batch size calculated: 3 (total_frames: 400)
  ```
- **בדוק**: העיבוד מהיר יותר מקובץ קטן

### 3. **קובץ גדול (500-1000 frames)**
- **צפוי**: `dynamicBatchSize = 5`
- **בדוק ב-logs**:
  ```
  📊 Dynamic batch size calculated: 5 (total_frames: 800)
  ```
- **בדוק**: העיבוד מהיר יותר מקובץ בינוני

### 4. **קובץ מאוד גדול (>1000 frames)**
- **צפוי**: `dynamicBatchSize = 8` או `12`
- **בדוק ב-logs**:
  ```
  📊 Dynamic batch size calculated: 8 (total_frames: 1500)
  או
  📊 Dynamic batch size calculated: 12 (total_frames: 3000)
  ```
- **בדוק**: העיבוד מהיר יותר מקובץ גדול

## איפה לבדוק:

### 1. **Vercel Logs**
- לך ל-Vercel Dashboard → Functions → `process-index-job`
- חפש: `📊 Dynamic batch size calculated`
- חפש: `📦 Chunk size calculation`

### 2. **Browser Console**
- פתח את Developer Tools (F12)
- לך ל-Console
- חפש: `📊 Dynamic batch size calculated` (אם יש לוגים מהשרת)

### 3. **Network Tab**
- פתח את Developer Tools → Network
- חפש requests ל-`/api/process-index-job`
- בדוק את ה-response - צריך להכיל `nextFrameIndex` ו-`totalFrames`

## מה לבדוק:

### ✅ **בדיקות חיוביות:**
1. **Dynamic batch size מחושב נכון** לפי `total_frames`
2. **העיבוד מתקדם** - `nextFrameIndex` גדל
3. **לא יש timeouts** - העיבוד ממשיך
4. **התוצאה נכונה** - כל ה-frames מעובדים

### ❌ **בדיקות שליליות:**
1. **לא תקוע** - העיבוד ממשיך
2. **לא יש infinite loops** - העיבוד מסתיים
3. **לא יש timeouts** - העיבוד ממשיך

## טבלת Batch Sizes:

| total_frames | dynamicBatchSize | זמן משוער (1000 frames) |
|--------------|-----------------|-------------------------|
| < 100 | 1 | N/A (קטן) |
| 100-300 | 2 | ~11 דקות |
| 300-500 | 3 | ~10 דקות |
| 500-1000 | 5 | ~10 דקות |
| 1000-2000 | 8 | ~8 דקות |
| > 2000 | 12 | ~7 דקות |

## דוגמאות ל-Logs:

### קובץ קטן (50 frames):
```
[req_xxx] 📊 Dynamic batch size calculated: 1 (total_frames: 50)
[req_xxx] 📦 Chunk size calculation: {
  totalFrames: 50,
  dynamicBatchSize: 1,
  effectiveChunkSize: 1,
  note: "Using dynamic batch sizing for scalability (small file)"
}
```

### קובץ גדול (1500 frames):
```
[req_xxx] 📊 Dynamic batch size calculated: 8 (total_frames: 1500)
[req_xxx] 📦 Chunk size calculation: {
  totalFrames: 1500,
  dynamicBatchSize: 8,
  effectiveChunkSize: 8,
  note: "Using dynamic batch sizing for scalability (very large file)"
}
```

## אם יש בעיות:

1. **Batch size לא נכון**: בדוק ש-`total_frames` נכון ב-job
2. **העיבוד איטי**: בדוק ש-`effectiveChunkSize` משתמש ב-`dynamicBatchSize`
3. **Timeouts**: בדוק ש-`effectiveChunkSize` לא גדול מדי

## Version:
- **v1.4.0** - Dynamic batch processing for large files

