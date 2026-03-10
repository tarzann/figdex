# משתני סביבה - ערכים מדויקים

## 📋 משתנים קיימים ב-Vercel (Production)

המשתנים הבאים כבר מוגדרים ב-Vercel:

### Supabase (קיימים)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - כבר מוגדר
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - כבר מוגדר  
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - כבר מוגדר
- ✅ `SUPABASE_URL` - כבר מוגדר
- ✅ `SUPABASE_ANON_KEY` - כבר מוגדר
- ✅ `SUPABASE_JWT_SECRET` - כבר מוגדר

### Postgres (קיימים - לא בשימוש כרגע)
- ✅ `POSTGRES_URL` - כבר מוגדר
- ✅ `POSTGRES_PRISMA_URL` - כבר מוגדר
- ✅ `POSTGRES_URL_NON_POOLING` - כבר מוגדר
- ✅ `POSTGRES_USER` - כבר מוגדר
- ✅ `POSTGRES_HOST` - כבר מוגדר
- ✅ `POSTGRES_PASSWORD` - כבר מוגדר
- ✅ `POSTGRES_DATABASE` - כבר מוגדר

### Site URL (קיים)
- ✅ `NEXT_PUBLIC_SITE_URL` - כבר מוגדר

---

## 🆕 משתנים חדשים שצריך להוסיף

### 1. Sentry (Error Tracking) - **אופציונלי - ראה WHY_SENTRY.md להסבר מפורט**

#### איך להשיג:
1. היכנס ל-https://sentry.io
2. צור פרויקט חדש (או השתמש בפרויקט קיים)
3. בחר "Next.js" כפלטפורמה
4. העתק את ה-DSN מההגדרות

#### משתנים להוספה:
```bash
# Client-side (public - יופיע בקוד הלקוח)
NEXT_PUBLIC_SENTRY_DSN=https://[PUBLIC_KEY]@[ORG_ID].ingest.sentry.io/[PROJECT_ID]

# Server-side (private) - יכול להיות אותו ערך
SENTRY_DSN=https://[PUBLIC_KEY]@[ORG_ID].ingest.sentry.io/[PROJECT_ID]
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

**דוגמה לערך DSN אמיתי:**
```
https://abc123def456789@o123456.ingest.sentry.io/7890123456
```

**פירוט:**
- `abc123def456789` = Public Key (32 תווים)
- `o123456` = Organization ID
- `7890123456` = Project ID

**דוגמה לערכי Org/Project:**
```
SENTRY_ORG=figdex
SENTRY_PROJECT=figdex-web
```

**⚠️ חשוב:** 
- הפורמט `https://xxx@xxx.ingest.sentry.io/xxx` הוא רק דוגמה
- צריך להחליף את כל ה-`xxx` בערכים האמיתיים מ-Sentry
- ראה `SENTRY_SETUP_GUIDE.md` להוראות מפורטות

---

### 2. Email Service (Resend) - **אופציונלי אבל מומלץ**

#### איך להשיג:
1. היכנס ל-https://resend.com
2. הירשם/התחבר
3. עבור ל-API Keys
4. צור API Key חדש
5. העתק את המפתח (מתחיל ב-`re_`)

#### משתנים להוספה:
```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# כתובות אימייל
SUPPORT_EMAIL=support@figdex.com
FROM_EMAIL=noreply@figdex.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@figdex.com

# אופציונלי - לשלוח אימייל אישור למשתמש
SEND_CONFIRMATION_EMAIL=true
```

**הערות:**
- `RESEND_API_KEY` - מתחיל תמיד ב-`re_`
- `SUPPORT_EMAIL` - הכתובת שמקבלת הודעות מהטופס
- `FROM_EMAIL` - הכתובת שממנה נשלחים האימיילים (חייב להיות מאומת ב-Resend)
- `NEXT_PUBLIC_SUPPORT_EMAIL` - הכתובת שמוצגת למשתמשים בעמוד Contact

---

## 📝 הוראות הגדרה ב-Vercel

### שלב 1: היכנס ל-Vercel Dashboard
1. לך ל-https://vercel.com
2. בחר את הפרויקט `figdex`
3. עבור ל-Settings → Environment Variables

### שלב 2: הוסף משתנים חדשים

#### Sentry:
1. לחץ על "Add New"
2. שם: `NEXT_PUBLIC_SENTRY_DSN`
3. ערך: הדסן מ-Sentry
4. בחר סביבות: Production, Preview, Development
5. לחץ "Save"
6. חזור על הפעולה עבור: `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`

#### Resend:
1. לחץ על "Add New"
2. שם: `RESEND_API_KEY`
3. ערך: המפתח מ-Resend
4. בחר סביבות: Production, Preview, Development
5. לחץ "Save"
6. חזור על הפעולה עבור: `SUPPORT_EMAIL`, `FROM_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `SEND_CONFIRMATION_EMAIL`

### שלב 3: Redeploy
לאחר הוספת המשתנים, יש לעשות Redeploy:
```bash
vercel --prod
```
או דרך ה-Dashboard: Deployments → ... → Redeploy

---

## 🔍 איך לבדוק שהכל עובד

### בדיקת Sentry:
1. גש ל-https://www.figdex.com
2. פתח את Console בדפדפן
3. אם Sentry מוגדר נכון, תראה: `Sentry Logger [Log]: ...`
4. נסה ליצור שגיאה (למשל, פתח עמוד שלא קיים)
5. בדוק ב-Sentry Dashboard אם השגיאה הגיעה

### בדיקת Email:
1. גש ל-https://www.figdex.com/contact
2. מלא את הטופס
3. שלח הודעה
4. בדוק ב-Resend Dashboard → Emails אם האימייל נשלח
5. בדוק את תיבת הדואר של `SUPPORT_EMAIL`

---

## ⚠️ הערות חשובות

### Sentry:
- **אופציונלי**: המערכת תעבוד גם בלי Sentry, אבל לא תהיה מעקב שגיאות
- אם לא מוגדר, תראה הודעות ב-console אבל לא תהיה בעיה

### Resend:
- **אופציונלי**: המערכת תעבוד גם בלי Resend, אבל אימיילים לא יישלחו
- אם לא מוגדר, הטופס יעבוד אבל רק יירשם לוג
- **חשוב**: `FROM_EMAIL` חייב להיות מאומת ב-Resend לפני שימוש

### כתובות אימייל:
- `support@figdex.com` - זה placeholder, עדכן לכתובת האמיתית שלך
- אם אין לך דומיין, אפשר להשתמש ב-Resend Domain (למשל: `onboarding@resend.dev`)

---

## 📋 סיכום - מה צריך להוסיף

### חובה (לפני השקה):
- ❌ אין - הכל כבר קיים או אופציונלי

### מומלץ מאוד:
- ✅ `RESEND_API_KEY` - לשליחת אימיילים
- ✅ `SUPPORT_EMAIL` - כתובת תמיכה
- ✅ `FROM_EMAIL` - כתובת שולח
- ✅ `NEXT_PUBLIC_SENTRY_DSN` - מעקב שגיאות
- ✅ `SENTRY_DSN` - מעקב שגיאות
- ✅ `SENTRY_ORG` - מעקב שגיאות
- ✅ `SENTRY_PROJECT` - מעקב שגיאות

### אופציונלי:
- `SEND_CONFIRMATION_EMAIL` - אימייל אישור למשתמשים

---

## 🔗 קישורים שימושיים

- **Sentry**: https://sentry.io/settings/figdex/projects/
- **Resend**: https://resend.com/api-keys
- **Vercel Environment Variables**: https://vercel.com/ran-mors-projects/figdex/settings/environment-variables

