# הגדרת שליחת אימיילים

## הבעיה

הלוגים מראים:
```
📧 Job notification email (RESEND_API_KEY not configured)
```

זה אומר ש-`RESEND_API_KEY` לא מוגדר ב-Vercel environment variables.

## פתרון - הוספת RESEND_API_KEY

### שלב 1: קבלת API Key מ-Resend

1. היכנס ל-https://resend.com
2. הירשם/התחבר
3. עבור ל-**API Keys** בתפריט
4. לחץ על **"Create API Key"**
5. תן שם (למשל: "FigDex Production")
6. העתק את המפתח (מתחיל ב-`re_`)

### שלב 2: הוספה ל-Vercel

1. לך ל-**Vercel Dashboard**: https://vercel.com/dashboard
2. בחר את הפרויקט שלך (`figdex`)
3. לך ל-**Settings** → **Environment Variables**
4. לחץ על **"Add New"**
5. מלא את הפרטים:
   - **Key**: `RESEND_API_KEY`
   - **Value**: המפתח שהעתקת (מתחיל ב-`re_`)
   - **Environments**: בחר את כל הסביבות (Production, Preview, Development)
6. לחץ **"Save"**

### שלב 3: אימות Domain (אופציונלי ל-production)

אם אתה רוצה לשלוח אימיילים מכתובת שלך (למשל `noreply@figdex.com`):

1. ב-Resend Dashboard, לך ל-**Domains**
2. לחץ **"Add Domain"**
3. הוסף את הדומיין שלך (למשל `figdex.com`)
4. עקוב אחר ההוראות לאימות DNS records

### שלב 4: הגדרת משתנים נוספים (אופציונלי)

אם יש לך domain מאומת, תוכל להוסיף:

- **`FROM_EMAIL`**: כתובת השולח (למשל: `noreply@figdex.com`)
  - אם לא מוגדר, משתמש ב-`noreply@figdex.com` (מוגבל ב-Resend)

- **`SUPPORT_EMAIL`**: כתובת לתמיכה (למשל: `support@figdex.com`)
  - אם לא מוגדר, משתמש ב-`support@figdex.com`

### שלב 5: Redeply

אחרי הוספת המשתנים:
1. לך ל-**Deployments** ב-Vercel
2. בחר את ה-deployment האחרון
3. לחץ על **"Redeploy"** (או פשוט צור אינדקס חדש - זה יגרום ל-deployment חדש)

## אימות שהכל עובד

אחרי הוספת `RESEND_API_KEY`:

1. צור אינדקס חדש
2. המתן עד שהוא מסתיים
3. בדוק את הלוגים ב-Vercel - אתה אמור לראות:
   ```
   📧 [EMAIL] ✅ Job notification email sent successfully to user@example.com
   ```
   במקום:
   ```
   📧 Job notification email (RESEND_API_KEY not configured)
   ```
4. בדוק את תיבת הדואר (גם spam)

## בעיות נפוצות

### האימיילים לא מגיעים
- בדוק את תיבת ה-spam
- וודא שה-domain מאומת ב-Resend (אם אתה משתמש בדומיין מותאם)
- בדוק את הלוגים ב-Vercel לראות אם יש שגיאות

### שגיאת authentication ב-Resend
- וודא שהמפתח מתחיל ב-`re_`
- וודא שהמפתח לא פג תוקף
- בדוק ששמרת את המשתנה בסביבה הנכונה (Production/Preview/Development)

### האימיילים נשלחים אבל לא מגיעים
- בדוק את תיבת ה-spam
- אם אתה משתמש ב-domain מותאם, ודא שהוא מאומת ב-Resend
- אם אתה משתמש ב-`onboarding@resend.dev`, זה רק לבדיקות והאימיילים עלולים לא להגיע

## קישורים שימושיים

- Resend Dashboard: https://resend.com/api-keys
- Vercel Environment Variables: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
- Resend Documentation: https://resend.com/docs

