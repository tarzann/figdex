# בדיקת לוגים של אימיילים

## דרכים לבדוק אם אימיילים נשלחים:

### 1. בדיקה ב-Vercel Dashboard (מומלץ)

1. **פתח את Vercel Dashboard:**
   - לך ל: https://vercel.com/dashboard
   - בחר את הפרויקט שלך

2. **פתח את ה-Logs:**
   - בחר את ה-Deployment האחרון
   - לחץ על הכרטיסייה **"Functions"** או **"Logs"**
   - או לחץ על **"View Function Logs"**

3. **חפש את הלוגים הבאים:**
   ```
   📧 Starting email notification process
   📧 sendJobNotificationEmail called
   📧 sendJobNotificationToAdmin called
   ✅ User email sent successfully
   ✅ Admin email sent successfully
   ❌ Failed to send...
   ```

4. **פילטר לפי job ID:**
   - חפש את ה-job ID של האינדקס שיצרת
   - לדוגמה: `req_1234567890_abc123`

### 2. בדיקה דרך Vercel CLI

```bash
# התקן Vercel CLI אם עוד לא עשית זאת
npm i -g vercel

# התחבר
vercel login

# צפה בלוגים בזמן אמת
vercel logs --follow

# או צפה בלוגים של function מסוים
vercel logs --follow --output=raw | grep "📧"
```

### 3. בדיקה דרך Supabase Dashboard

אם אתה משתמש ב-Supabase, תוכל לבדוק:
1. **פתח את Supabase Dashboard**
2. לך ל-**Logs** > **Postgres Logs** או **API Logs**
3. חפש שגיאות הקשורות לשליחת אימיילים

### 4. בדיקה מקומית (אם אתה מריץ locally)

אם אתה מריץ את השרת מקומית:
```bash
npm run dev
```

הלוגים יופיעו בטרמינל שבו רץ השרת.

### 5. מה לחפש בלוגים?

**אם הכל תקין, אתה אמור לראות:**
```
[req_xxx] 📧 Starting email notification process for completed job xxx (user_id: xxx)...
[req_xxx] ✅ User fetched for email notifications: user@example.com
[req_xxx] 📧 Preparing to send email notifications to user@example.com...
📧 sendJobNotificationEmail called for job xxx, status: completed, to: user@example.com
📧 sendJobNotificationToAdmin called for job xxx, status: completed, user: user@example.com
[req_xxx] ✅ User email sent successfully
[req_xxx] ✅ Admin email sent successfully
[req_xxx] 📧 Email notifications processed for completed job
```

**אם יש בעיה, אתה עלול לראות:**
```
📧 Job notification email (RESEND_API_KEY not configured): ...
```
← זה אומר ש-RESEND_API_KEY לא מוגדר ב-Vercel environment variables

או:
```
❌ Failed to send completion email to user: [error details]
```
← זה אומר שיש שגיאה בשליחת האימייל (שגיאת API, שגיאת רשת, וכו')

### 6. בדיקה מהירה - יצירת אינדקס קטן

1. **צור אינדקס קטן** (עם כמה frames בלבד)
2. **המתן עד שהאינדקס מסתיים**
3. **בדוק את הלוגים** מיד לאחר מכן

### 7. בדיקת Environment Variables ב-Vercel

1. לך ל-**Settings** > **Environment Variables**
2. וודא שיש את המשתנים הבאים:
   - `RESEND_API_KEY` - המפתח של Resend API
   - `FROM_EMAIL` - כתובת האימייל השולח (אופציונלי, ברירת מחדל: noreply@figdex.com)
   - `SUPPORT_EMAIL` - כתובת האימייל לתמיכה (אופציונלי, ברירת מחדל: support@figdex.com)

### 8. בדיקה ידנית - שליחת אימייל בדיקה

אפשר גם לבדוק ישירות אם Resend API עובד:

```typescript
// בדיקה ב-API endpoint חדש (או ב-console)
const resend = new Resend(process.env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: '<p>This is a test email</p>',
});

console.log('Resend result:', { data, error });
```

---

**טיפים:**
- השתמש ב-**Filter** בלוגים של Vercel כדי לחפש רק לוגים עם 📧 או 📧 emoji
- אם אתה לא רואה שום לוגים, ייתכן שה-job לא הגיע למצב "completed" או "failed"
- אם אתה רואה את הלוג "RESEND_API_KEY not configured", זה אומר שהמפתח לא מוגדר או לא נטען נכון

