# Changelog - Version 1.14.0
**Release Date:** 2025-12-11

## 🎉 סיכום גרסה

גרסה זו כוללת שיפורים משמעותיים ביציבות, ביצועים, וטיפול בשגיאות של מערכת האינדקס של Figma.

---

## ✨ תכונות חדשות

### 1. סינון פריימים מוסתרים
- **תיאור:** המערכת כעת מתעלמת מפריימים מוסתרים (`visible === false`)
- **מיקום:** 
  - `api-index.tsx` - ספירת פריימים
  - `process-index-job.ts` - עיבוד פריימים
- **יתרון:** אינדקס נקי יותר, ללא פריימים לא רלוונטיים

---

## 🚀 שיפורי ביצועים

### 1. הפחתת פניות לשרתים ב-~50%
- **Polling Intervals:**
  - `checkJobStatuses`: 15s → **30s** (2 פניות/דקה במקום 4)
  - `processIndexJob`: 10s → **20s** (3 פניות/דקה במקום 6)
  - Retry on error: 30s → **60s**
- **תוצאה:** חיסכון של ~50% בפניות ל-Vercel, ~70% בפניות ל-Supabase

### 2. הפחתת עדכוני Database ב-~70%
- **לוגיקה:** עדכון רק על שינויים משמעותיים:
  - שינוי status
  - שינוי progress > 5%
  - שינוי error
  - שינוי indexId
- **תוצאה:** פחות עומס על Supabase, פחות עלויות

---

## 🐛 תיקוני באגים

### 1. תיקון שגיאת React #418
- **בעיה:** `useEffect` השתמש בפונקציות שלא היו ב-dependencies array
- **פתרון:** 
  - הוספת `useCallback` ל-`checkJobStatuses` ו-`updateIndexInAPI`
  - תיקון dependencies arrays
- **תוצאה:** אין יותר שגיאות React hooks

### 2. תיקון עצירת Job אוטומטית על שגיאות קריטיות
- **תיאור:** Job עוצר אוטומטית במקרה של שגיאות קריטיות
- **שגיאות קריטיות:**
  - שגיאות אימות (401, 403, Invalid token)
  - שגיאות בעיבוד דף
  - שגיאות קריטיות ב-upload (network errors)
  - שגיאות קריטיות ב-Figma API
- **יתרון:** אין יותר jobs תקועים, טיפול טוב יותר בשגיאות

### 3. תיקון בעיית ERR_INSUFFICIENT_RESOURCES
- **בעיה:** יותר מדי קריאות מקבילות לשרת
- **פתרון:**
  - מניעת קריאות מקבילות עם `useRef` flags
  - הגדלת מרווחי polling
  - הסרת כפילות ב-polling
- **תוצאה:** מערכת יציבה יותר, פחות שגיאות network

### 4. תיקון בעיית Job Completion המוקדמת
- **בעיה:** Jobs הושלמו לפני שכל הפריימים עובדו
- **פתרון:**
  - מעקב מפורט אחרי frames per page ב-`processing_state`
  - בדיקה מדויקת של השלמת כל הפריימים בכל דף
  - שמירת `processing_state` ל-DB
- **תוצאה:** כל הפריימים מעובדים כעת

---

## ⚙️ שיפורים טכניים

### 1. הגדרת Timeout ב-Vercel
- **שינוי:** הוספת `maxDuration: 300` ל-`process-index-job.ts`
- **יתרון:** Jobs גדולים (608 פריימים) יכולים להסתיים בהצלחה

### 2. שיפור לוגיקת Page Advancement
- **תיאור:** המערכת עוברת לדף הבא רק אחרי שכל הפריימים בדף הנוכחי עובדו
- **יתרון:** עיבוד מדויק יותר, פחות שגיאות

### 3. שיפור Error Handling
- **תיאור:** טיפול טוב יותר בשגיאות עם retry logic ו-backoff
- **יתרון:** מערכת עמידה יותר לשגיאות זמניות

---

## 📊 סטטיסטיקות

### לפני האופטימיזציה (עבור job אחד פעיל):
- **Vercel:** ~10-14 פניות/דקה
- **Supabase:** ~16-26 פניות/דקה
- **Figma API:** ~6 פניות/דקה

### אחרי האופטימיזציה:
- **Vercel:** ~5-7 פניות/דקה (**חיסכון של ~50%**)
- **Supabase:** ~5-8 פניות/דקה (**חיסכון של ~70%**)
- **Figma API:** ~3 פניות/דקה (**חיסכון של ~50%**)

---

## 📝 קבצים שעודכנו

### קבצים עיקריים:
1. `pages/api-index.tsx` - UI improvements, polling optimization, hidden frames filter
2. `pages/api/process-index-job.ts` - Error handling, hidden frames filter, job completion logic
3. `vercel.json` - Timeout configuration
4. `OPTIMIZATION_ANALYSIS.md` - ניתוח אופטימיזציה מפורט

### קבצים נוספים:
- `pages/api/create-index-from-figma.ts` - כבר היה סינון hidden frames
- `pages/api/get-page-frame-counts.ts` - כבר היה סינון hidden frames
- `lib/figma-api.ts` - כבר היה סינון hidden frames

---

## 🎯 יתרונות עיקריים

1. **עלויות נמוכות יותר:**
   - ~50% פחות קריאות ל-Vercel
   - ~70% פחות עדכונים ל-Supabase
   - ~50% פחות קריאות ל-Figma API

2. **ביצועים טובים יותר:**
   - פחות עומס על השרתים
   - פחות שגיאות timeout
   - פחות rate limiting

3. **יציבות:**
   - אין יותר שגיאות React hooks
   - אין יותר jobs תקועים
   - טיפול טוב יותר בשגיאות

4. **איכות:**
   - אינדקס נקי יותר (ללא פריימים מוסתרים)
   - כל הפריימים מעובדים
   - מעקב מדויק אחרי progress

---

## 🔄 שינויים בגרסאות

- **v1.14.0** - סינון פריימים מוסתרים
- **v1.13.0** - אופטימיזציה של פניות לשרתים
- **v1.12.2** - תיקון React error #418
- **v1.12.1** - תיקון dependencies
- **v1.12.0** - עצירת Job אוטומטית על שגיאות קריטיות
- **v1.11.0** - מניעת קריאות מקבילות + הגדלת מרווחים

---

## 📦 דרישות

- Node.js 18+
- Next.js 15.4.8
- Vercel deployment
- Supabase database
- Figma API access

---

## 🚀 Deployment

הגרסה מוכנה ל-production ומומלצת לשימוש.

**Deployment URL:** https://www.figdex.com

---

## 📞 תמיכה

לשאלות או בעיות, אנא צור issue או פנה לתמיכה.

---

**נבנה ב:** 2025-12-11  
**גרסה:** 1.14.0  
**סטטוס:** ✅ Production Ready

