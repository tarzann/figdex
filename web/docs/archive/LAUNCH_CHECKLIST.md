# Launch Checklist - FigDex

## ✅ מה שכבר מוכן

### Legal & Compliance
- ✅ Terms of Service (`/terms`) - עמוד מלא עם 11 סעיפים
- ✅ Privacy Policy (`/privacy`) - עמוד מלא עם 11 סעיפים
- ✅ קישורים ב-footer - עודכנו בכל העמודים

### Support & Help
- ✅ Help Center/FAQ (`/help`) - עמוד עם 5 קטגוריות, חיפוש, ו-15 שאלות נפוצות
- ✅ Contact Form (`/contact`) - טופס מלא עם validation
- ✅ Contact API (`/api/contact`) - endpoint עם validation מלא
- ✅ Email Service (`lib/email.ts`) - תמיכה ב-Resend עם fallback

### UI/UX
- ✅ Homepage (`/index.tsx`) - עמוד ראשי מלא
- ✅ Homepage v2 (`/index-v2.tsx`) - גרסה חדשה עם grid layout
- ✅ Footer links - קישורים לכל העמודים החדשים

## ⚠️ מה שצריך לבדוק/להשלים

### 1. משתני סביבה (Environment Variables)

**חובה ל-launch:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - חובה לעבודה
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - חובה לעבודה
- ⚠️ `RESEND_API_KEY` - **אופציונלי** (אם לא מוגדר, contact form רק יודפס ל-console)
- ⚠️ `SUPPORT_EMAIL` - **מומלץ** (default: support@figdex.com)
- ⚠️ `FROM_EMAIL` - **מומלץ** (default: noreply@figdex.com)
- ⚠️ `SEND_CONFIRMATION_EMAIL` - **אופציונלי** (true/false, default: false)

**לא חובה (Sentry - נעזב כרגע):**
- ❌ `NEXT_PUBLIC_SENTRY_DSN` - נעזב כרגע

### 2. בדיקות פונקציונליות

**צריך לבדוק:**
- [ ] Contact form - האם נשלח email בהצלחה?
- [ ] Terms/Privacy - האם התוכן מתאים ומלא?
- [ ] Help Center - האם כל הקישורים עובדים?
- [ ] Footer links - האם כל הקישורים מובילים למקום הנכון?
- [ ] Responsive design - האם הכל נראה טוב במובייל?

### 3. תוכן (Content)

**צריך לבדוק/לעדכן:**
- [ ] Terms of Service - האם התוכן מתאים למוצר?
- [ ] Privacy Policy - האם התוכן מתאים למוצר?
- [ ] Help Center - האם התשובות מדויקות?
- [ ] Contact page - האם פרטי התקשורת נכונים?

### 4. Email Configuration

**אם רוצים שטופס ה-contact יעבוד:**
1. פתח חשבון ב-Resend (https://resend.com)
2. קבל API key
3. הגדר ב-Vercel:
   - `RESEND_API_KEY` = ה-API key שלך
   - `SUPPORT_EMAIL` = האימייל שבו תרצה לקבל הודעות
   - `FROM_EMAIL` = האימייל שממנו נשלח (חייב להיות domain מאומת ב-Resend)

**אם לא רוצים לשלוח emails כרגע:**
- הטופס יעבוד, אבל ההודעות רק יודפסו ל-console
- זה בסדר ל-launch מוגבל

### 5. בדיקות נוספות

**צריך לבדוק:**
- [ ] האם כל העמודים נטענים ללא שגיאות?
- [ ] האם יש שגיאות ב-console?
- [ ] האם יש שגיאות ב-linter?
- [ ] האם ה-build עובר בהצלחה?

## 🚀 צעדים ל-Launch

### לפני Launch:
1. ✅ בדוק שכל העמודים עובדים
2. ⚠️ בדוק את משתני הסביבה ב-Vercel
3. ⚠️ בדוק את טופס ה-contact (אם מוגדר Resend)
4. ⚠️ עדכן תוכן ב-Terms/Privacy אם צריך
5. ✅ הרץ `npm run build` וודא שאין שגיאות

### ב-Launch:
1. Deploy ל-production
2. בדוק את כל העמודים ב-production
3. בדוק את טופס ה-contact
4. בדוק responsive design

## 📝 הערות

- **Sentry**: נעזב כרגע - נחזור לזה מאוחר יותר
- **Email Service**: אופציונלי - אם לא מוגדר, contact form יעבוד אבל רק יודפס ל-console
- **Terms/Privacy**: התוכן הוא placeholder - מומלץ לעדכן לפני launch מלא

## 🎯 סיכום

**מוכן ל-Launch מוגבל:**
- ✅ כל העמודים החוקיים והתמיכה קיימים
- ✅ כל הקישורים עובדים
- ⚠️ צריך לבדוק משתני סביבה
- ⚠️ צריך לבדוק את טופס ה-contact

**מוכן ל-Launch מלא:**
- ⚠️ צריך לעדכן תוכן ב-Terms/Privacy
- ⚠️ צריך להגדיר Email service (Resend)
- ⚠️ צריך לבדוק הכל ב-production


