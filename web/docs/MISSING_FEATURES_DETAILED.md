# FigDex - פירוט תכונות חסרות

**גרסה:** 1.28.0  
**תאריך עדכון:** 22 בדצמבר 2025

---

## 📊 מקרא

### רמת חשיבות
- 🔴 **קריטי** - הכרחי לפעילות העסקית/מוצר
- 🟠 **גבוהה** - חשוב מאוד למשתמשים/מוצר
- 🟡 **בינונית** - שימושי אבל לא דחוף
- 🟢 **נמוכה** - נחמד אבל לא הכרחי

### זמן הטמעה
- **1-2 ימים** - פיתוח מהיר, תכונה פשוטה
- **3-5 ימים** - פיתוח בינוני, דורש עבודה משמעותית
- **1-2 שבועות** - פיתוח מורכב, דורש תכנון קפדני
- **2-4 שבועות** - פיתוח מורכב מאוד, דורש תכנון מעמיק ותשתית
- **1-2 חודשים+** - פרויקט גדול, דורש צוות ותכנון מקיף

---

## 🔐 אימות וניהול משתמשים

### Apple Sign In
- **סטטוס:** ❌ חסר (הוסר בעבר)
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** התחברות דרך Apple ID
- **סיבה לחסר:** דורש Apple Developer Program ($99/שנה)
- **דרישות:**
  - רישום Apple Developer Program
  - הגדרת App ID ב-Apple
  - הגדרת Redirect URLs
  - אינטגרציה עם Supabase Auth
- **עלות:** $99/שנה (Apple Developer Program)
- **תועלת:** שיפור UX למשתמשי Apple

---

### GitHub OAuth
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 2-3 ימים
- **תיאור:** התחברות דרך GitHub
- **דרישות:**
  - רישום OAuth App ב-GitHub
  - הגדרת Client ID/Secret
  - אינטגרציה עם Supabase Auth
- **עלות:** חינם
- **תועלת:** נוח למפתחים

---

### Two-Factor Authentication (2FA)
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי (אבטחה)
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** אימות דו-שלבי (TOTP, SMS, Email)
- **דרישות:**
  - שירות TOTP (Google Authenticator, Authy)
  - שירות SMS (Twilio) או Email
  - DB: שדה `two_factor_enabled`, `two_factor_secret`
  - UI: הגדרות 2FA, QR code generation
  - Backend: אימות קוד 2FA ב-login
- **עלות:** ~$0.01-0.05/SMS (אם משתמשים ב-SMS)
- **תועלת:** אבטחה משמעותית למשתמשים

---

### SSO Integration
- **סטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה (Enterprise)
- **זמן הטמעה:** 1-2 חודשים
- **תיאור:** Single Sign-On עם SAML/OAuth Enterprise
- **דרישות:**
  - תמיכה ב-SAML 2.0
  - תמיכה ב-OAuth Enterprise (Okta, Azure AD, etc.)
  - Certificate management
  - User provisioning/deprovisioning
  - אינטגרציה עם IdP
- **עלות:** תלוי ב-IdP
- **תועלת:** קריטי ללקוחות Enterprise

---

### Avatar Upload
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 3-5 ימים
- **תיאור:** העלאת תמונת פרופיל
- **דרישות:**
  - Image upload endpoint
  - Image resizing/optimization
  - Storage: Supabase Storage
  - DB: שדה `avatar_url` ב-`users`
  - UI: Upload component, preview
- **עלות:** מינימלית (Supabase Storage)
- **תועלת:** שיפור UX, אישיות הפרופיל

---

### User Preferences
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** הגדרות משתמש מתקדמות
- **דרישות:**
  - DB: טבלה `user_preferences` (JSONB)
  - UI: דף הגדרות
  - Backend: API לעדכון העדפות
- **דוגמאות העדפות:**
  - Email notifications preferences
  - Default image quality
  - Language preference
  - Theme preference
- **תועלת:** שיפור UX אישי

---

## 📦 ניהול אינדקסים

### Scheduled Indexing
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** אינדקס אוטומטי על לוח זמנים (cron)
- **דרישות:**
  - DB: טבלה `scheduled_jobs` (cron expression, file_key, pages)
  - Cron job manager (Vercel Cron או external service)
  - UI: הגדרת לוח זמנים
  - Backend: API לניהול scheduled jobs
- **עלות:** תלוי בשירות cron (Vercel Cron בחינם עד גבול מסוים)
- **תועלת:** חיסכון זמן, אינדקס אוטומטי

---

### Webhook Notifications
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** התראות דרך Webhooks (לא רק Email)
- **דרישות:**
  - DB: טבלה `webhooks` (URL, events, secret)
  - Backend: Webhook dispatcher
  - Signature verification (HMAC)
  - Retry logic
  - UI: ניהול webhooks
- **עלות:** מינימלית
- **תועלת:** אינטגרציות עם מערכות חיצוניות (Slack, Discord, Zapier)

---

### Grid/List View Toggle
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 2-3 ימים
- **תיאור:** החלפה בין תצוגת Grid ל-List
- **דרישות:**
  - UI: Toggle button
  - State management (localStorage)
  - CSS: List view layout
- **תועלת:** שיפור UX, התאמה להעדפות משתמש

---

### Fullscreen Mode
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 1-2 ימים
- **תיאור:** מצב מסך מלא בתצוגת גלריה
- **דרישות:**
  - UI: Fullscreen button
  - Fullscreen API integration
  - CSS: Fullscreen styling
- **תועלת:** חוויית צפייה טובה יותר

---

### Zoom Controls
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 3-5 ימים
- **תיאור:** בקרות זום בתמונות
- **דרישות:**
  - Image zoom library (react-zoom-pan-pinch או דומה)
  - UI: Zoom in/out controls
  - Touch gestures support
- **תועלת:** צפייה בפרטים קטנים

---

### Export Index (CSV, JSON, PDF)
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** ייצוא אינדקס לפורמטים שונים
- **דרישות:**
  - CSV export: CSV generation library
  - JSON export: JSON serialization
  - PDF export: PDF library (jsPDF, PDFKit)
  - UI: Export button עם format selection
  - Backend: Export endpoints
- **עלות:** מינימלית (libraries חינמיות)
- **תועלת:** קריטי למשתמשים, עבודה עם נתונים חיצוניים

---

### Duplicate Index
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 3-5 ימים
- **תיאור:** שכפול אינדקס קיים
- **דרישות:**
  - Backend: Duplicate logic (copy index_data, new record)
  - UI: Duplicate button
  - Storage: Copy files (או reference)
- **תועלת:** חיסכון זמן, יצירת variants

---

### Rename Index
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 ימים
- **תיאור:** שינוי שם אינדקס
- **דרישות:**
  - DB: Update `file_name` ב-`index_files`
  - UI: Edit inline או dialog
  - Backend: Update endpoint
- **תועלת:** ניהול טוב יותר של אינדקסים

---

### Move Index (בין פרויקטים)
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 3-5 ימים
- **תיאור:** העברת אינדקס בין פרויקטים
- **דרישות:**
  - DB: שדה `project_id` ב-`index_files` (אם נדרש)
  - UI: Move dialog עם project selection
  - Backend: Update endpoint
- **תועלת:** ארגון טוב יותר

---

## 🔍 חיפוש וסינון

### Search History
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 2-3 ימים
- **תיאור:** היסטוריית חיפושים
- **דרישות:**
  - LocalStorage או DB: שמירת חיפושים
  - UI: Dropdown עם היסטוריה
  - Clear history functionality
- **תועלת:** חיסכון זמן, UX טוב יותר

---

### Saved Searches
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** שמירת חיפושים לחזרה מהירה
- **דרישות:**
  - DB: טבלה `saved_searches` (user_id, name, filters)
  - UI: Save search button, saved searches list
  - Backend: CRUD API
- **תועלת:** חיסכון זמן משמעותי, עבודה יעילה

---

### Regex Search
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 3-5 ימים
- **תיאור:** חיפוש עם Regular Expressions
- **דרישות:**
  - Backend: Regex parsing ו-validation
  - UI: Regex mode toggle
  - Documentation: Regex syntax guide
- **תועלת:** חיפוש מתקדם למפתחים/משתמשים מתקדמים

---

### Fuzzy Search
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** חיפוש מטושטש (tolerates typos)
- **דרישות:**
  - Library: Fuse.js או דומה
  - Backend: Fuzzy search algorithm
  - UI: Toggle fuzzy mode
- **תועלת:** חיפוש טוב יותר, סובלנות לשגיאות הקלדה

---

### Favorites Folders
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תיקיות למועדפים
- **דרישות:**
  - DB: טבלה `favorite_folders` (user_id, name)
  - DB: שדה `folder_id` ב-favorites
  - UI: Folder management, move to folder
- **תועלת:** ארגון טוב יותר של מועדפים

---

### Favorites Sharing
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** שיתוף רשימת מועדפים
- **דרישות:**
  - DB: Share token system (כמו index sharing)
  - UI: Share favorites button
  - Public page: `/favorites/[token]`
- **תועלת:** שיתוף עם צוות

---

## 📁 ניהול פרויקטים

### Project Templates
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תבניות פרויקטים מוכנות מראש
- **דרישות:**
  - DB: טבלה `project_templates`
  - UI: Template selection בעת יצירה
  - Admin: ניהול templates
- **תועלת:** חיסכון זמן, סטנדרטיזציה

---

### Project Tags
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 3-5 ימים
- **תיאור:** תגיות לפרויקטים
- **דרישות:**
  - DB: שדה `tags` (TEXT[]) ב-`projects`
  - UI: Tag input, tag display
  - Filtering: Filter by tags
- **תועלת:** ארגון וסינון טוב יותר

---

### Project Timeline
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** טיימליין ויזואלי לפרויקט
- **דרישות:**
  - Library: Timeline component (react-chrono או דומה)
  - DB: טבלה `project_timeline_events`
  - UI: Timeline view
- **תועלת:** תצוגה ויזואלית של התקדמות

---

### Project Archiving
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 2-3 ימים
- **תיאור:** ארכוב פרויקטים (לא מחיקה)
- **דרישות:**
  - DB: שדה `archived` (BOOLEAN) ב-`projects`
  - UI: Archive button, filter archived
  - Backend: Archive/unarchive endpoints
- **תועלת:** שמירת היסטוריה ללא מחיקה

---

## 💳 תמחור וקרדיטים

### Credits Purchase
- **סטטוס:** ❌ חסר (UI מוכן, לוגיקה חסרה)
- **חשיבות:** 🔴 קריטי (Monetization)
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** אפשרות לקנות קרדיטים
- **דרישות:**
  - Payment Integration: Stripe/PayPal
  - DB: טבלה `credit_packages`
  - Backend: Payment processing
  - Webhook: Payment confirmation
  - UI: Purchase dialog (כבר קיים, צריך להוסיף לוגיקה)
- **עלות:** 2.9% + $0.30 לכל עסקה (Stripe)
- **תועלת:** הכנסות, הגדלת engagement

---

### Credits Packages
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה (תלויה ב-Credits Purchase)
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** חבילות קרדיטים מוגדרות מראש
- **דרישות:**
  - DB: טבלה `credit_packages` (name, credits, price, discount)
  - Admin: ניהול packages
  - UI: Packages display
- **תועלת:** הגדלת המכירות, UX טוב יותר

---

### Usage Dashboard (משופר)
- **סטטוס:** ⚠️ חלקי (קיים בסיסי)
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** דאשבורד מפורט לשימוש
- **דרישות:**
  - Charts library: Chart.js, Recharts
  - Backend: Aggregation queries
  - UI: Charts, graphs, statistics
- **תועלת:** תובנות למשתמש, ניהול טוב יותר

---

### Payment Integration (Stripe/PayPal)
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי
- **זמן הטמעה:** 3-4 שבועות
- **תיאור:** אינטגרציה מלאה עם Stripe/PayPal
- **דרישות:**
  - Stripe SDK/PayPal SDK
  - Payment methods: Cards, PayPal
  - Subscription management
  - Webhook handling
  - Invoice generation
- **עלות:** 2.9% + $0.30 לכל עסקה
- **תועלת:** הכנסות, monetization

---

### Subscription Management
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי (תלויה ב-Payment)
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** ניהול מנויים (upgrade/downgrade/cancel)
- **דרישות:**
  - Stripe Subscriptions API
  - DB: שדות subscription ב-`users`
  - Backend: Subscription management
  - UI: Subscription settings
- **תועלת:** ניהול לקוחות, retention

---

### Invoice Generation
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** יצירת חשבוניות
- **דרישות:**
  - PDF generation library
  - Template system
  - DB: טבלה `invoices`
  - Backend: Invoice generation
  - UI: Invoice download
- **תועלת:** דרישה לעסק, accounting

---

### Usage Billing
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** חיוב לפי שימוש (pay-as-you-go)
- **דרישות:**
  - Usage tracking system
  - Billing calculation
  - Payment processing
  - Invoice generation
- **תועלת:** מודל תמחור גמיש

---

### Trial Periods
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תקופות ניסיון
- **דרישות:**
  - DB: שדות `trial_start`, `trial_end` ב-`users`
  - Backend: Trial validation logic
  - UI: Trial countdown, upgrade prompts
- **תועלת:** הגדלת conversion rate

---

## 👥 שיתוף ושיתוף פעולה

### Team Sharing
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי (עבור Team Plan)
- **זמן הטמעה:** 1-2 חודשים
- **תיאור:** שיתוף עם צוותים
- **דרישות:**
  - DB: טבלה `teams` ו-`team_members`
  - DB: שדה `team_id` ב-`index_files`
  - Backend: Team management API
  - UI: Team management, invite members
- **תועלת:** קריטי ל-Team Plan, collaboration

---

### Permission Levels
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי (תלויה ב-Team Sharing)
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** רמות הרשאות (Owner, Admin, Editor, Viewer)
- **דרישות:**
  - DB: שדה `role` ב-`team_members`
  - Backend: Permission checks
  - UI: Role management
- **תועלת:** בקרת גישה, אבטחה

---

### Collaborative Editing
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** עריכה משותפת בזמן אמת
- **דרישות:**
  - WebSocket או Server-Sent Events
  - Real-time sync
  - Conflict resolution
  - UI: Live editing indicators
- **תועלת:** שיתוף פעולה טוב יותר

---

### Shared Collections
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** אוספים משותפים (collections)
- **דרישות:**
  - DB: טבלה `collections` ו-`collection_items`
  - Backend: Collection management
  - UI: Create/manage collections
- **תועלת:** ארגון טוב יותר, שיתוף

---

### Frame Comments
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** הערות על פריימים
- **דרישות:**
  - DB: טבלה `frame_comments` (frame_id, user_id, comment, created_at)
  - Backend: Comments API
  - UI: Comments section, add/edit/delete
- **תועלת:** שיתוף פעולה, feedback

---

### Project Comments
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** הערות על פרויקטים
- **דרישות:**
  - DB: טבלה `project_comments`
  - Backend: Comments API
  - UI: Comments section
- **תועלת:** שיתוף פעולה על פרויקטים

---

### Annotations
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** הערות/הערות על תמונות (overlay)
- **דרישות:**
  - Annotation library (react-image-annotate או דומה)
  - DB: טבלה `annotations` (coordinates, text, type)
  - Storage: Annotation data
  - UI: Annotation tools
- **תועלת:** feedback ויזואלי, collaboration

---

### Mentions
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** אזכורים למשתמשים (@username)
- **דרישות:**
  - Mention parsing library
  - Notification system
  - UI: @ autocomplete
- **תועלת:** engagement, collaboration

---

### In-App Notifications
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** התראות באפליקציה
- **דרישות:**
  - DB: טבלה `notifications`
  - Real-time: WebSocket או polling
  - UI: Notification bell, dropdown
  - Backend: Notification API
- **תועלת:** engagement, awareness

---

### Notification Preferences
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** העדפות התראות
- **דרישות:**
  - DB: טבלה `notification_preferences`
  - UI: Preferences settings
  - Backend: Update preferences API
- **תועלת:** UX טוב יותר, control למשתמש

---

### Real-time Updates
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** עדכונים בזמן אמת
- **דרישות:**
  - WebSocket או Server-Sent Events
  - Real-time sync infrastructure
  - UI: Live updates
- **תועלת:** חוויית שימוש טובה יותר

---

## 📊 Admin Dashboard

### Job Cancellation
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 3-5 ימים
- **תיאור:** ביטול Jobs
- **דרישות:**
  - Backend: Cancel job logic
  - Status: `cancelled` status
  - Cleanup: Cleanup resources
  - UI: Cancel button
- **תועלת:** שליטה טובה יותר, חיסכון resources

---

### Job Manual Retry
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-3 ימים
- **תיאור:** Retry ידני ל-Jobs שנכשלו
- **דרישות:**
  - Backend: Retry logic
  - UI: Retry button
- **תועלת:** ניהול טוב יותר של שגיאות

---

### Custom Reports
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** דוחות מותאמים
- **דרישות:**
  - Report builder UI
  - Query builder
  - Export: PDF/CSV
- **תועלת:** תובנות עסקיות

---

### Export Analytics
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** ייצוא אנליטיקה
- **דרישות:**
  - Export: CSV/PDF
  - Data aggregation
  - UI: Export button
- **תועלת:** ניתוח חיצוני

---

## 🔧 תכונות טכניות

### Job Priority
- **סטטוס:** ⚠️ חלקי
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** עדיפות Jobs
- **דרישות:**
  - DB: שדה `priority` ב-`index_jobs`
  - Queue: Priority queue
  - UI: Priority selection
- **תועלת:** ניהול resources טוב יותר

---

### Job Scheduling (ידני)
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תזמון Jobs ידני (לא רק scheduled indexing)
- **דרישות:**
  - DB: שדה `scheduled_at` ב-`index_jobs`
  - Scheduler: Job scheduler
  - UI: Schedule picker
- **תועלת:** שליטה טובה יותר

---

### CDN Integration
- **סטטוס:** ⚠️ חלקי
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** אינטגרציה מלאה עם CDN
- **דרישות:**
  - CDN service (Cloudflare, CloudFront)
  - Image optimization
  - Cache invalidation
- **עלות:** תלוי ב-CDN (~$5-50/חודש)
- **תועלת:** ביצועים טובים יותר, עלויות נמוכות יותר

---

### Performance Monitoring
- **סטטוס:** ⚠️ חלקי
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** ניטור ביצועים מתקדם
- **דרישות:**
  - Monitoring service (Sentry, DataDog)
  - Performance metrics collection
  - Dashboard
- **עלות:** תלוי בשירות (~$0-100/חודש)
- **תועלת:** זיהוי בעיות, optimization

---

### Database Replication
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** Infrastructure (לא code)
- **תיאור:** Database replication
- **דרישות:**
  - Supabase replication setup
  - Read replicas
- **עלות:** תלוי ב-Supabase plan
- **תועלת:** Scalability, availability

---

### Automated Backups
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** גיבויים אוטומטיים
- **דרישות:**
  - Cron job: Backup script
  - Storage: Backup storage (S3, etc.)
  - Retention policy
- **עלות:** ~$5-20/חודש (storage)
- **תועלת:** Data safety, disaster recovery

---

### GraphQL API
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 1-2 חודשים
- **תיאור:** GraphQL API
- **דרישות:**
  - GraphQL server (Apollo, GraphQL.js)
  - Schema definition
  - Resolvers
  - Documentation
- **תועלת:** API גמיש יותר, developer experience

---

### WebSocket Support
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** תמיכה ב-WebSockets
- **דרישות:**
  - WebSocket server
  - Real-time infrastructure
  - Client integration
- **תועלת:** Real-time features

---

### API Rate Limiting (מתקדם)
- **סטטוס:** ❌ חסר (בסיסי קיים)
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** Rate limiting מתקדם
- **דרישות:**
  - Rate limiting library (express-rate-limit)
  - Per-user limits
  - Per-endpoint limits
  - UI: Rate limit display
- **תועלת:** Abuse prevention, cost control

---

### API Versioning
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** Versioning ל-API
- **דרישות:**
  - URL versioning (/api/v1/, /api/v2/)
  - Deprecation strategy
  - Documentation
- **תועלת:** Backward compatibility

---

## 📧 תקשורת

### Newsletter
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** Newsletter system
- **דרישות:**
  - Email service (Resend, Mailchimp)
  - Subscription management
  - Template system
  - UI: Newsletter signup
- **עלות:** ~$10-50/חודש
- **תועלת:** Marketing, engagement

---

### Email Templates (מתקדמות)
- **סטטוס:** ❌ חסר (בסיסי קיים)
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תבניות אימייל מתקדמות
- **דרישות:**
  - Template engine
  - Rich HTML templates
  - Variable substitution
  - Preview system
- **תועלת:** Branding, UX

---

### Bulk Emails
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** שליחת אימיילים מרובים
- **דרישות:**
  - Queue system
  - Batch processing
  - UI: Bulk email tool
- **תועלת:** Marketing, announcements

---

## 🎨 ממשק משתמש

### Accessibility (A11y) (שיפור)
- **סטטוס:** ⚠️ חלקי
- **חשיבות:** 🟠 גבוהה (Compliance)
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** שיפור Accessibility
- **דרישות:**
  - ARIA labels
  - Keyboard navigation
  - Screen reader support
  - Color contrast
  - Testing: a11y testing
- **תועלת:** Compliance, inclusivity

---

### Keyboard Shortcuts
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** קיצורי מקלדת
- **דרישות:**
  - Keyboard event handling
  - Shortcuts documentation
  - UI: Shortcuts display
- **תועלת:** Power user experience

---

### Customizable UI
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** התאמה אישית של UI
- **דרישות:**
  - Layout customization
  - Component preferences
  - Storage: User preferences
- **תועלת:** UX אישי

---

### Themes
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟢 נמוכה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תבניות עיצוב (Light/Dark/Custom)
- **דרישות:**
  - Theme system
  - CSS variables
  - Theme storage
  - UI: Theme switcher
- **תועלת:** UX אישי, accessibility

---

### Tutorial System
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** מערכת הדרכות
- **דרישות:**
  - Tutorial library (react-joyride)
  - Step definitions
  - Progress tracking
- **תועלת:** Onboarding טוב יותר

---

### Interactive Tours
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** סיורים אינטראקטיביים
- **דרישות:**
  - Tour library
  - Step definitions
  - Progress tracking
- **תועלת:** Onboarding

---

### Contextual Help
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** עזרה קונטקסטואלית
- **דרישות:**
  - Help content system
  - Tooltips with help
  - Help articles
- **תועלת:** UX טוב יותר, פחות support requests

---

## 🔒 אבטחה

### Password Strength Policy
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-3 ימים
- **תיאור:** מדיניות סיסמה חזקה
- **דרישות:**
  - Password validation
  - Strength meter
  - Requirements display
- **תועלת:** אבטחה טובה יותר

---

### Data Encryption (שיפור)
- **סטטוס:** ⚠️ חלקי
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** הצפנת נתונים רגישים
- **דרישות:**
  - Encryption library
  - Key management
  - Encrypt sensitive fields
- **תועלת:** אבטחה, compliance

---

### End-to-End Encryption
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 חודשים
- **תיאור:** הצפנה end-to-end
- **דרישות:**
  - Encryption protocol
  - Key exchange
  - Client-side encryption
- **תועלת:** Privacy מקסימלי

---

### Audit Logs
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי (Enterprise/Compliance)
- **זמן הטמעה:** 2-3 שבועות
- **תיאור:** לוגי audit מפורטים
- **דרישות:**
  - DB: טבלה `audit_logs`
  - Logging: כל פעולות משמעותיות
  - Retention policy
  - UI: Audit log viewer
- **תועלת:** Compliance, security, debugging

---

### GDPR Compliance (מלא)
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי (EU)
- **זמן הטמעה:** 1-2 חודשים
- **תיאור:** תאימות GDPR מלאה
- **דרישות:**
  - Privacy policy
  - Cookie consent
  - Data export (user data)
  - Right to be forgotten
  - Data processing agreement
- **תועלת:** Compliance, legal

---

### SOC 2
- **סטטוס:** ❌ חסר
- **חשיבות:** 🔴 קריטי (Enterprise)
- **זמן הטמעה:** 3-6 חודשים
- **תיאור:** תאימות SOC 2
- **דרישות:**
  - Security controls
  - Documentation
  - Audit
  - Third-party assessment
- **עלות:** $20,000-50,000+ (audit)
- **תועלת:** Enterprise sales, trust

---

### Data Retention Policies
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** מדיניות שמירת נתונים
- **דרישות:**
  - Retention rules
  - Automated cleanup
  - Configuration
- **תועלת:** Compliance, cost reduction

---

### Privacy Controls
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** בקרות פרטיות מתקדמות
- **דרישות:**
  - Privacy settings UI
  - Data sharing controls
  - Visibility controls
- **תועלת:** Privacy, compliance

---

## 📱 מובייל ופלטפורמות

### Mobile App
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-3 חודשים
- **תיאור:** אפליקציה למובייל (iOS/Android)
- **דרישות:**
  - React Native או Native
  - API integration
  - App stores: Apple App Store, Google Play
  - Testing
- **עלות:** $99/שנה (Apple), $25 (Google, חד פעמי)
- **תועלת:** הגעה ליותר משתמשים, engagement

---

### Progressive Web App (PWA)
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** Progressive Web App
- **דרישות:**
  - Service Worker
  - Manifest.json
  - Offline support (חלקי)
  - Install prompt
- **תועלת:** App-like experience, installation

---

### Offline Support
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** תמיכה offline
- **דרישות:**
  - Service Worker
  - Cache strategy
  - Sync when online
- **תועלת:** עבודה ללא אינטרנט

---

### Push Notifications
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** התראות push
- **דרישות:**
  - Push service (Firebase, OneSignal)
  - Service Worker
  - Permission handling
- **עלות:** תלוי בשירות (~$0-50/חודש)
- **תועלת:** Engagement

---

## 🌐 בינלאומיות

### Multi-language Support
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟠 גבוהה
- **זמן הטמעה:** 2-4 שבועות
- **תיאור:** תמיכה בכמה שפות
- **דרישות:**
  - i18n library (next-i18next)
  - Translation files
  - Language switcher
  - Content translation
- **תועלת:** הגעה ליותר משתמשים

---

### RTL Support
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תמיכה ב-RTL (עברית, ערבית)
- **דרישות:**
  - CSS: RTL styling
  - Direction detection
  - Layout adjustments
- **תועלת:** שווקים RTL

---

### Localization
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** לוקליזציה (תאריכים, מספרים, etc.)
- **דרישות:**
  - Locale detection
  - Date/number formatting
  - Currency formatting
- **תועלת:** UX טוב יותר בינלאומי

---

### Time Zone Support
- **סטטוס:** ❌ חסר
- **חשיבות:** 🟡 בינונית
- **זמן הטמעה:** 1-2 שבועות
- **תיאור:** תמיכה באזורי זמן
- **דרישות:**
  - Timezone detection
  - Timezone storage per user
  - Date/time conversion
- **תועלת:** UX טוב יותר, accuracy

---

## 📈 סיכום לפי חשיבות

### 🔴 קריטי (עדיפות ראשונה)
1. **Payment Integration** (Stripe/PayPal) - 3-4 שבועות
2. **Export Index** (CSV, JSON, PDF) - 2-3 שבועות
3. **Team Sharing** - 1-2 חודשים
4. **Credits Purchase** - 2-4 שבועות
5. **Two-Factor Authentication (2FA)** - 2-3 שבועות
6. **Automated Backups** - 1-2 שבועות
7. **Audit Logs** - 2-3 שבועות
8. **GDPR Compliance** - 1-2 חודשים (אם נדרש)

**סה"כ זמן:** ~5-8 חודשים עבודה

---

### 🟠 גבוהה (עדיפות שנייה)
1. **SSO Integration** - 1-2 חודשים
2. **Subscription Management** - 2-3 שבועות
3. **Invoice Generation** - 1-2 שבועות
4. **Usage Dashboard (משופר)** - 1-2 שבועות
5. **Fuzzy Search** - 1-2 שבועות
6. **In-App Notifications** - 2-3 שבועות
7. **CDN Integration** - 1-2 שבועות
8. **Performance Monitoring** - 2-3 שבועות
9. **Frame Comments** - 2-3 שבועות
10. **Job Cancellation** - 3-5 ימים
11. **Trial Periods** - 1-2 שבועות
12. **Password Strength Policy** - 2-3 ימים
13. **Multi-language Support** - 2-4 שבועות

**סה"כ זמן:** ~4-6 חודשים עבודה

---

### 🟡 בינונית (עדיפות שלישית)
- **Scheduled Indexing** - 2-3 שבועות
- **Webhook Notifications** - 1-2 שבועות
- **Rename Index** - 1-2 ימים
- **Saved Searches** - 1-2 שבועות
- **Regex Search** - 3-5 ימים
- **Project Templates** - 1-2 שבועות
- **Project Tags** - 3-5 ימים
- **Project Timeline** - 2-3 שבועות
- **Permission Levels** - 2-3 שבועות
- **Collaborative Editing** - 2-4 שבועות
- **Shared Collections** - 1-2 שבועות
- **Project Comments** - 1-2 שבועות
- **Annotations** - 2-4 שבועות
- **Notification Preferences** - 1-2 שבועות
- **Real-time Updates** - 2-4 שבועות
- **Job Manual Retry** - 2-3 ימים
- **Custom Reports** - 2-4 שבועות
- **Export Analytics** - 1-2 שבועות
- **Job Priority** - 1-2 שבועות
- **Job Scheduling** - 1-2 שבועות
- **API Rate Limiting** - 1-2 שבועות
- **API Versioning** - 1-2 שבועות
- **Email Templates** - 1-2 שבועות
- **Accessibility (A11y)** - 2-3 שבועות
- **Tutorial System** - 2-3 שבועות
- **Interactive Tours** - 1-2 שבועות
- **Contextual Help** - 1-2 שבועות
- **Data Retention Policies** - 1-2 שבועות
- **Privacy Controls** - 1-2 שבועות
- **Progressive Web App (PWA)** - 1-2 שבועות
- **Offline Support** - 2-4 שבועות
- **Push Notifications** - 1-2 שבועות
- **RTL Support** - 1-2 שבועות
- **Localization** - 1-2 שבועות
- **Time Zone Support** - 1-2 שבועות

**סה"כ זמן:** ~10-15 חודשים עבודה

---

### 🟢 נמוכה (עדיפות נמוכה)
- **Apple Sign In** - 1-2 שבועות
- **GitHub OAuth** - 2-3 ימים
- **Avatar Upload** - 3-5 ימים
- **User Preferences** - 1-2 שבועות
- **Grid/List View Toggle** - 2-3 ימים
- **Fullscreen Mode** - 1-2 ימים
- **Zoom Controls** - 3-5 ימים
- **Duplicate Index** - 3-5 ימים
- **Move Index** - 3-5 ימים
- **Search History** - 2-3 ימים
- **Favorites Folders** - 1-2 שבועות
- **Favorites Sharing** - 1-2 שבועות
- **Project Archiving** - 2-3 ימים
- **Mentions** - 1-2 שבועות
- **Keyboard Shortcuts** - 1-2 שבועות
- **Customizable UI** - 2-4 שבועות
- **Themes** - 1-2 שבועות
- **Newsletter** - 1-2 שבועות
- **Bulk Emails** - 1-2 שבועות
- **End-to-End Encryption** - 1-2 חודשים
- **GraphQL API** - 1-2 חודשים
- **WebSocket Support** - 2-3 שבועות
- **Database Replication** - Infrastructure
- **Mobile App** - 2-3 חודשים
- **SOC 2** - 3-6 חודשים (audit)

**סה"כ זמן:** ~8-12 חודשים עבודה

---

## 📊 סיכום כללי

### זמן הטמעה כולל (כל התכונות)
- **קריטי:** ~5-8 חודשים
- **גבוהה:** ~4-6 חודשים
- **בינונית:** ~10-15 חודשים
- **נמוכה:** ~8-12 חודשים

### הערכה לפי עדיפות
אם מתמקדים רק ב-קריטי + גבוהה: **~9-14 חודשים עבודה**

אם מתמקדים ב-קריטי + גבוהה + בינונית: **~19-29 חודשים עבודה**

---

## 💡 המלצות

### שלב 1 (3-4 חודשים) - Monetization & Core
1. Payment Integration (Stripe/PayPal)
2. Credits Purchase
3. Subscription Management
4. Invoice Generation
5. Export Index
6. Two-Factor Authentication (2FA)
7. Automated Backups

### שלב 2 (3-4 חודשים) - Enterprise & UX
1. Team Sharing
2. Permission Levels
3. SSO Integration
4. Usage Dashboard (משופר)
5. In-App Notifications
6. Fuzzy Search
7. Frame Comments

### שלב 3 (2-3 חודשים) - Polish & Scale
1. CDN Integration
2. Performance Monitoring
3. API Rate Limiting
4. Multi-language Support
5. GDPR Compliance (אם נדרש)
6. Audit Logs

---

**מסמך זה עודכן:** 22 בדצמבר 2025  
**גרסה:** 1.0

