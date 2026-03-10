# File Limits Implementation - Summary

**Version:** v1.0.0  
**Date:** December 26, 2025

---

## ✅ מה יושם

### Backend

1. **API Endpoint למגבלות** (`/api/user/limits`)
   - מחזיר: `maxFiles`, `currentFiles`, `remainingFiles`, `isUnlimited`
   - כולל addons בחישוב
   - נגיש דרך Bearer token (API key)

2. **בדיקת מגבלה ב-`saved-connections.ts`**
   - בודק מגבלה לפני שמירת קשר חדש
   - מאפשר עדכון קשרים קיימים (לא סופר כקובץ חדש)
   - מחזיר שגיאה עם קוד `FILE_LIMIT_REACHED` אם המגבלה הושגה

3. **בדיקה קיימת ב-`create-index-from-figma.ts`**
   - כבר הייתה קיימת - לא שונה

### Frontend (Web)

4. **אינדיקציה ב-API Integration Page**
   - Alert עם מידע על מספר קבצים (X / Y)
   - Progress bar עם צבעים:
     - ירוק: >80% נותר
     - צהוב: 50-80% נותר
     - כתום: 20-50% נותר
     - אדום: <20% נותר
   - כפתור "Upgrade Plan" כשהמגבלה קרובה/הושגה
   - כפתור "New Connection" מושבת כשהמגבלה הושגה
   - עדכון אוטומטי אחרי שמירה/מחיקה של קשר

---

## ❌ מה עדיין צריך (פלאגין)

### Plugin

1. **API Endpoint**
   - אותו endpoint (`/api/user/limits`) - כבר קיים
   - נדרש רק שימוש בו מהפלאגין

2. **UI בפלאגין**
   - הצגת מגבלת קבצים בחלק ה-Upload
   - השבתת כפתור Upload כשהמגבלה הושגה
   - הודעת שגיאה כשמעלים והמגבלה הושגה

---

## 📊 המגבלות

### לפי חבילה

| Plan | maxFiles | Addons |
|------|----------|--------|
| Free | 1 | לא נתמך |
| Pro | 10 | כן (files addon) |
| Team | 20 | כן (files addon) |
| Unlimited | null | לא רלוונטי |

### חישוב המגבלה

```
Effective Limit = Base Plan Limit + Sum of File Addons
```

לדוגמה:
- Pro (10) + Addon 5 files = 15 files
- Team (20) + Addon 10 files = 30 files

---

## 🔍 איפה נבדקים המגבלות

1. **שמירת קשר חדש** (`/api/saved-connections` POST)
   - ✅ בודק אם `currentFiles >= maxFiles`
   - ✅ מחזיר שגיאה עם קוד `FILE_LIMIT_REACHED`

2. **יצירת אינדקס חדש** (`/api/create-index-from-figma`)
   - ✅ בודק אם `currentFiles >= maxFiles` (רק לקובץ חדש)
   - ✅ מאפשר re-index לקובץ קיים (לא סופר כקובץ חדש)

3. **Upload מהפלאגין** (`/api/upload-index`)
   - ⚠️ לא נבדק כאן - נדרש להוסיף בדיקה

---

## 📝 קבצים שנוצרו/שונו

### חדשים
- ✅ `pages/api/user/limits.ts` - API endpoint למגבלות
- ✅ `docs/specifications/FILE_LIMITS_IMPLEMENTATION.md` - אפיון מפורט
- ✅ `docs/specifications/FILE_LIMITS_SUMMARY.md` - סיכום (קובץ זה)

### שונו
- ✅ `pages/api/saved-connections.ts` - הוספת בדיקת מגבלה
- ✅ `pages/api-index.tsx` - הוספת אינדיקציה ב-UI

---

## 🎯 הצעדים הבאים (לפלאגין)

1. **הוספת קריאה ל-`/api/user/limits` בפלאגין**
   - בקוד `ui.html` או `code.js`
   - להציג מגבלות לפני Upload

2. **UI בפלאגין**
   - הוספת אינדיקטור "Files: X / Y"
   - השבתת כפתור Upload כשהמגבלה הושגה

3. **טיפול בשגיאות**
   - לתפוס שגיאת `FILE_LIMIT_REACHED` מ-`/api/upload-index`
   - להציג הודעה ידידותית למשתמש

---

## ⚠️ הערות חשובות

1. **ספירת קבצים**: נספרים מ-`saved_connections` (לא מ-`index_files`)
   - זה אומר שכל קשר נשמר = קובץ אחד
   - גם אם הקשר לא אונדקס עדיין

2. **Re-indexing**: לא נספר כקובץ חדש
   - אם יש כבר קשר עם אותו `file_key`, זה נחשב עדכון
   - עדכון לא נספר נגד המגבלה

3. **Unlimited users**: לא בודקים מגבלה
   - Admins ו-Unlimited plan
   - `isUnlimited: true` ב-response

---

**סטטוס:** ✅ Web UI - מוכן | ❌ Plugin - צריך להוסיף

