# מערכת הקרדיטים - אפיון מלא
**Credits System - Complete Specification**

**Version:** 1.0  
**Last Updated:** December 21, 2025  
**Status:** Specification / Planning

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [מבנה נתונים](#מבנה-נתונים)
3. [מסך חשבון משתמש](#מסך-חשבון-משתמש)
4. [מסך אדמין](#מסך-אדמין)
5. [API Endpoints](#api-endpoints)
6. [UI/UX Design](#uiux-design)
7. [תזרימי עבודה](#תזרימי-עבודה)
8. [Business Logic](#business-logic)

---

## 🎯 סקירה כללית

### מטרת המערכת
מערכת קרדיטים שמאפשרת למשתמשים:
- לראות את יתרת הקרדיטים הנוכחית
- לראות את ההיסטוריה של שימוש בקרדיטים
- לרכוש קרדיטים (כרגע UI בלבד, ללא יישום תשלום)
- לאדמין: לתת קרדיטים למשתמשים, לראות ניצול קרדיטים

### עקרונות עיצוב
- **שקיפות**: המשתמש רואה תמיד כמה קרדיטים יש לו ומה הוא ניצל
- **פשטות**: ממשק ברור ופשוט
- **גמישות**: אפשרות רכישה גמישה (כרגע UI בלבד)

---

## 🗄️ מבנה נתונים

### Database Schema

#### טבלת `users` (קיימת, צריך לוודא שיש את השדות הבאים):
```sql
-- שדות קיימים (צריך לוודא):
credits_remaining INTEGER DEFAULT 0
credits_reset_date DATE

-- שדות שצריך להוסיף:
credits_base INTEGER DEFAULT NULL  -- קרדיטים בסיסיים לפי תכנית
credits_purchased INTEGER DEFAULT 0  -- קרדיטים שנרכשו (כרגע לא בשימוש)
credits_lifetime INTEGER DEFAULT 0  -- קרדיטים לכל החיים (כרגע לא בשימוש)
```

#### טבלת חדשה: `credits_transactions` (להוסיף)
```sql
CREATE TABLE IF NOT EXISTS credits_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR NOT NULL, -- 'purchase', 'usage', 'admin_grant', 'reset'
  amount INTEGER NOT NULL, -- חיובי להוספה, שלילי לשימוש
  balance_before INTEGER NOT NULL, -- יתרה לפני
  balance_after INTEGER NOT NULL, -- יתרה אחרי
  description TEXT, -- תיאור (למשל: "Index creation", "Admin grant", "Monthly reset")
  reference_id UUID, -- ID של job/index/וכו' שקשור לפעולה
  reference_type VARCHAR, -- 'job', 'index', 'admin', 'reset', 'purchase'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB -- מידע נוסף (למשל: job details, package details)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_id ON credits_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_created_at ON credits_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_type ON credits_transactions(transaction_type);
```

---

## 👤 מסך חשבון משתמש (`/account`)

### סקשן: Credits Overview

#### מיקום
במסך Account, לאחר מידע המשתמש ו-plan, לפני API Key.

#### תוכן

**1. Credits Balance Card**
```
┌─────────────────────────────────────────┐
│ 💰 Credits                              │
│                                         │
│ Current Balance                         │
│ [מספר גדול ומובלט]                     │
│                                         │
│ Base Credits: [מספר]                   │
│ Purchased: [מספר] (כרגע 0)            │
│                                         │
│ Next Reset: [תאריך]                    │
└─────────────────────────────────────────┘
```

**פירוט:**
- **Current Balance**: `credits_remaining` - היתרה הנוכחית (מספר גדול, בולט)
- **Base Credits**: קרדיטים לפי תכנית (מ-`credits_base` או מ-`PLAN_LIMITS`)
- **Purchased Credits**: קרדיטים שנרכשו (כרגע תמיד 0, אבל מוצג)
- **Next Reset**: `credits_reset_date` - מת הקרדיטים יתאפסו

**2. Quick Actions**
```
┌─────────────────────────────────────────┐
│ [Purchase Credits] [View History]       │
└─────────────────────────────────────────┘
```

- **Purchase Credits**: כפתור שפותח דיאלוג רכישה
- **View History**: כפתור שמראה היסטוריית שימוש

**3. Usage Summary (אופציונלי)**
```
┌─────────────────────────────────────────┐
│ This Month Usage                        │
│                                         │
│ Used: [מספר] credits                    │
│ Remaining: [מספר] credits               │
│                                         │
│ Top Actions:                            │
│ • Index Creation: [מספר] credits        │
│ • Re-indexing: [מספר] credits           │
└─────────────────────────────────────────┘
```

---

### דיאלוג: Purchase Credits

#### Trigger
לחיצה על כפתור "Purchase Credits" במסך Account.

#### תוכן

**Header:**
```
Purchase Credits
```

**Body:**
```
Choose a credit package:

┌─────────────────────────────────────┐
│ Package 1: 500 Credits              │
│ Price: $10                          │
│ [Select]                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Package 2: 1,000 Credits            │
│ Price: $18                          │
│ [Select]                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Package 3: 2,000 Credits            │
│ Price: $35                          │
│ [Select]                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Package 4: 5,000 Credits            │
│ Price: $80                          │
│ [Select]                            │
└─────────────────────────────────────┘
```

**Footer:**
```
[Cancel] [Proceed to Payment]
```

**הערה חשובה:**
- כרגע, כפתור "Proceed to Payment" לא מבצע תשלום אמיתי
- יכול להציג הודעה: "Payment integration coming soon"
- או לפתוח דיאלוג עם הודעה: "To purchase credits, please contact support"

---

### דיאלוג: Credits History

#### Trigger
לחיצה על כפתור "View History" במסך Account.

#### תוכן

**Header:**
```
Credits History
```

**Body - Table:**
```
┌──────────┬──────────────┬──────────┬────────────┬──────────────┐
│ Date     │ Type         │ Amount   │ Balance    │ Description  │
├──────────┼──────────────┼──────────┼────────────┼──────────────┤
│ Dec 21   │ Usage        │ -100     │ 900        │ Index: File1 │
│ Dec 20   │ Usage        │ -50      │ 1000       │ Re-index     │
│ Dec 1    │ Reset        │ +1000    │ 1050       │ Monthly reset│
└──────────┴──────────────┴──────────┴────────────┴──────────────┘
```

**Columns:**
- **Date**: תאריך הפעולה
- **Type**: סוג (Usage / Purchase / Admin Grant / Reset)
- **Amount**: סכום (+ להוספה, - לשימוש)
- **Balance**: יתרה אחרי הפעולה
- **Description**: תיאור (למשל: "Index: File Name", "Monthly reset")

**Features:**
- Pagination (אם יש הרבה רשומות)
- Filter by type (Usage / Purchase / Reset / All)
- Sort by date (newest first)

---

## 🔐 מסך אדמין (`/admin/users`)

### Enhancement ל-User Management

#### בחר משתמש → Edit Dialog

**הוספה למועדק Edit User:**

**Credits Management Section:**
```
┌─────────────────────────────────────────┐
│ Credits Management                      │
│                                         │
│ Current Balance: [מספר]                │
│ Base Credits: [מספר]                   │
│                                         │
│ Add Credits:                            │
│ [Input field: מספר קרדיטים]           │
│ Reason: [Text field]                    │
│                                         │
│ [Grant Credits]                         │
│                                         │
│ Reset Date: [Date picker]               │
│ [Update Reset Date]                     │
└─────────────────────────────────────────┘
```

**פירוט:**
- **Current Balance**: היתרה הנוכחית של המשתמש
- **Base Credits**: קרדיטים בסיסיים לפי תכנית
- **Add Credits**: input field + reason field
- **Grant Credits**: כפתור שמוסיף קרדיטים
- **Reset Date**: date picker לעדכון תאריך איפוס

#### Credits Column בטבלה

**הוספת עמודה לטבלת משתמשים:**
```
┌──────────┬─────────────┬──────────┬───────────┐
│ Email    │ Name        │ Plan     │ Credits   │
├──────────┼─────────────┼──────────┼───────────┤
│ user@... │ John Doe    │ Pro      │ 850/1000  │
└──────────┴─────────────┴──────────┴───────────┘
```

- **Credits**: `credits_remaining / credits_base` (למשל: 850/1000)

---

### דף חדש: `/admin/credits` (אופציונלי)

**Overview של כל הקרדיטים במערכת:**
```
┌─────────────────────────────────────────┐
│ Credits System Overview                 │
│                                         │
│ Total Credits in System: [מספר]        │
│ Active Users: [מספר]                   │
│ Average Credits/User: [מספר]           │
│                                         │
│ Recent Transactions:                    │
│ [Table with all transactions]           │
└─────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### 1. GET `/api/account/credits`
**תיאור:** קבלת מידע על קרדיטים של המשתמש

**Headers:**
```
Authorization: Bearer <api_key>
```

**Response:**
```json
{
  "success": true,
  "credits": {
    "current": 850,
    "base": 1000,
    "purchased": 0,
    "resetDate": "2026-01-01",
    "plan": "pro"
  },
  "usage": {
    "thisMonth": 150,
    "lastMonth": 200
  }
}
```

---

### 2. GET `/api/account/credits/history`
**תיאור:** קבלת היסטוריית קרדיטים

**Headers:**
```
Authorization: Bearer <api_key>
```

**Query Parameters:**
- `page` (optional): מספר עמוד (default: 1)
- `limit` (optional): מספר רשומות (default: 50)
- `type` (optional): סינון לפי סוג (usage/purchase/admin_grant/reset/all)

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "type": "usage",
      "amount": -100,
      "balanceBefore": 950,
      "balanceAfter": 850,
      "description": "Index creation: File Name",
      "referenceId": "job-uuid",
      "referenceType": "job",
      "createdAt": "2025-12-21T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

---

### 3. POST `/api/account/credits/purchase`
**תיאור:** התחלת תהליך רכישת קרדיטים (כרגע לא מיושם)

**Headers:**
```
Authorization: Bearer <api_key>
```

**Request:**
```json
{
  "packageId": "credits_1000",
  "credits": 1000,
  "price": 18
}
```

**Response (כרגע):**
```json
{
  "success": false,
  "error": "Payment integration not yet implemented. Please contact support."
}
```

**Response (עתידי, כשייושם):**
```json
{
  "success": true,
  "paymentIntent": "pi_...",
  "clientSecret": "..."
}
```

---

### 4. POST `/api/admin/credits/grant`
**תיאור:** אדמין נותן קרדיטים למשתמש

**Headers:**
```
Authorization: Bearer <api_key>
x-admin-token: <admin_token> (או בדיקה אחרת)
```

**Request:**
```json
{
  "userId": "user-uuid",
  "amount": 500,
  "reason": "Customer support - account issue"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "userId": "user-uuid",
    "type": "admin_grant",
    "amount": 500,
    "balanceBefore": 850,
    "balanceAfter": 1350,
    "description": "Admin grant: Customer support - account issue",
    "createdAt": "2025-12-21T10:30:00Z"
  },
  "newBalance": 1350
}
```

---

### 5. PUT `/api/admin/credits/reset-date`
**תיאור:** עדכון תאריך איפוס קרדיטים

**Headers:**
```
Authorization: Bearer <api_key>
x-admin-token: <admin_token>
```

**Request:**
```json
{
  "userId": "user-uuid",
  "resetDate": "2026-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "resetDate": "2026-01-15"
}
```

---

### 6. GET `/api/admin/credits/overview`
**תיאור:** סקירה כללית של מערכת הקרדיטים (אופציונלי)

**Headers:**
```
Authorization: Bearer <api_key>
x-admin-token: <admin_token>
```

**Response:**
```json
{
  "success": true,
  "overview": {
    "totalCredits": 50000,
    "activeUsers": 25,
    "averageCredits": 2000,
    "totalTransactions": 1500,
    "thisMonthUsage": 5000
  },
  "recentTransactions": [
    // Array of recent transactions
  ]
}
```

---

## 🎨 UI/UX Design

### Design Principles
1. **Visual Hierarchy**: היתרה הנוכחית בולטת מאוד
2. **Color Coding**: 
   - ירוק: קרדיטים תקינים
   - צהוב/כתום: קרדיטים נמוכים (< 20%)
   - אדום: קרדיטים נמוכים מאוד (< 10%)
3. **Progress Indicators**: Progress bar להצגת ניצול
4. **Clear Actions**: כפתורים ברורים ונראים

### Components Needed

#### 1. CreditsBalanceCard
```typescript
interface CreditsBalanceCardProps {
  current: number;
  base: number;
  purchased: number;
  resetDate: string;
  plan: string;
}
```

#### 2. CreditsHistoryTable
```typescript
interface CreditsHistoryTableProps {
  transactions: Transaction[];
  loading?: boolean;
  onLoadMore?: () => void;
}
```

#### 3. PurchaseCreditsDialog
```typescript
interface PurchaseCreditsDialogProps {
  open: boolean;
  onClose: () => void;
  onPurchase?: (packageId: string) => void;
}
```

#### 4. AdminGrantCreditsForm
```typescript
interface AdminGrantCreditsFormProps {
  userId: string;
  currentBalance: number;
  onGrant: (amount: number, reason: string) => Promise<void>;
}
```

---

## 🔄 תזרימי עבודה

### Workflow 1: משתמש רואה יתרת קרדיטים
```
1. משתמש נכנס ל-/account
2. רואה Credits Balance Card עם:
   - יתרה נוכחית
   - קרדיטים בסיסיים
   - תאריך איפוס
3. אם יתרה נמוכה, מוצגת אזהרה
4. משתמש יכול ללחוץ על "View History" לראות היסטוריה
```

### Workflow 2: משתמש מנסה לרכוש קרדיטים
```
1. משתמש לוחץ על "Purchase Credits"
2. נפתח דיאלוג עם חבילות
3. משתמש בוחר חבילה
4. לוחץ על "Proceed to Payment"
5. כרגע: מוצגת הודעה "Payment integration coming soon"
6. עתידי: מעבר לעמוד תשלום
```

### Workflow 3: אדמין נותן קרדיטים
```
1. אדמין נכנס ל-/admin/users
2. בוחר משתמש ולוחץ Edit
3. רואה Credits Management section
4. מזין מספר קרדיטים ו-reason
5. לוחץ "Grant Credits"
6. API מוסיף קרדיטים
7. נוצר transaction record
8. יתרת המשתמש מתעדכנת
9. אדמין רואה אישור
```

### Workflow 4: רישום שימוש בקרדיטים
```
1. משתמש יוצר אינדקס
2. לפני יצירת Job, בודקים שיש מספיק קרדיטים
3. אם יש, מפחיתים קרדיטים
4. יוצרים transaction record:
   - type: 'usage'
   - amount: -100 (למשל)
   - referenceId: job_id
   - referenceType: 'job'
   - description: "Index creation: File Name"
5. מעדכנים credits_remaining ב-users
```

---

## 💼 Business Logic

### Credit Calculation

#### Base Credits לפי Plan
```typescript
const PLAN_BASE_CREDITS = {
  free: 100,
  pro: 1000,
  team: 2000,
  unlimited: null // אין הגבלה
};
```

#### Credit Costs
```typescript
const CREDIT_COSTS = {
  FILE_INDEX: 100,
  FILE_REINDEX: 50,
  // ... (כבר קיים ב-lib/plans.ts)
};
```

### Credit Reset Logic

#### Monthly Reset
```typescript
// כל חודש, אם credits_remaining < credits_base:
if (shouldResetCredits(currentCredits, baseCredits)) {
  credits_remaining = credits_base;
  credits_reset_date = next_month_date;
  // יוצר transaction record מסוג 'reset'
}
```

### Validation Logic

#### לפני יצירת Index Job
```typescript
// 1. בדוק יתרה
if (user.credits_remaining < CREDIT_COSTS.FILE_INDEX) {
  throw new Error("Insufficient credits");
}

// 2. הפחת קרדיטים
user.credits_remaining -= CREDIT_COSTS.FILE_INDEX;

// 3. צור transaction record
await createTransaction({
  userId: user.id,
  type: 'usage',
  amount: -CREDIT_COSTS.FILE_INDEX,
  balanceBefore: oldBalance,
  balanceAfter: user.credits_remaining,
  description: `Index creation: ${fileName}`,
  referenceId: jobId,
  referenceType: 'job'
});
```

---

## 📝 Implementation Checklist

### Phase 1: Database & Backend
- [ ] יצירת טבלת `credits_transactions`
- [ ] הוספת שדות ל-`users` (אם חסרים)
- [ ] יצירת API endpoint: `GET /api/account/credits`
- [ ] יצירת API endpoint: `GET /api/account/credits/history`
- [ ] יצירת API endpoint: `POST /api/admin/credits/grant`
- [ ] יצירת API endpoint: `PUT /api/admin/credits/reset-date`
- [ ] עדכון לוגיקת שימוש בקרדיטים ליצור transaction records

### Phase 2: User Account Page
- [ ] הוספת CreditsBalanceCard ל-`/account`
- [ ] הוספת CreditsHistoryDialog
- [ ] הוספת PurchaseCreditsDialog (UI בלבד)
- [ ] הוספת Usage Summary (אופציונלי)

### Phase 3: Admin Interface
- [ ] הוספת Credits column לטבלת users
- [ ] הוספת Credits Management section ל-Edit User dialog
- [ ] יצירת דף `/admin/credits` (אופציונלי)

### Phase 4: Integration
- [ ] עדכון `create-index-from-figma.ts` ליצור transaction records
- [ ] עדכון `process-index-job.ts` ליצור transaction records (אם נדרש)
- [ ] בדיקות end-to-end

---

## 🎯 Priorities

### Must Have (MVP)
1. ✅ הצגת יתרת קרדיטים ב-Account page
2. ✅ היסטוריית קרדיטים
3. ✅ Admin יכול לתת קרדיטים
4. ✅ רישום שימוש בקרדיטים ב-transactions

### Should Have
5. Purchase Credits UI (ללא תשלום)
6. Credits column ב-admin users table
7. Usage Summary ב-Account page

### Nice to Have
8. Admin Credits Overview page
9. Email notifications על קרדיטים נמוכים
10. Analytics על שימוש בקרדיטים

---

## 📊 UI Mockups (Text-based)

### Account Page - Credits Section
```
╔══════════════════════════════════════════╗
║ Account Settings                         ║
╠══════════════════════════════════════════╣
║                                          ║
║ User Information                         ║
║ [Existing content...]                    ║
║                                          ║
╠══════════════════════════════════════════╣
║ 💰 Credits                               ║
║                                          ║
║         Current Balance                  ║
║           850                            ║
║                                          ║
║ Base Credits: 1,000                      ║
║ Purchased: 0                             ║
║ Next Reset: January 1, 2026              ║
║                                          ║
║ [Purchase Credits]  [View History]       ║
║                                          ║
╚══════════════════════════════════════════╝
```

### Admin Edit User - Credits Section
```
╔══════════════════════════════════════════╗
║ Edit User: user@example.com              ║
╠══════════════════════════════════════════╣
║                                          ║
║ [Existing fields...]                     ║
║                                          ║
╠══════════════════════════════════════════╣
║ Credits Management                       ║
║                                          ║
║ Current Balance: 850                     ║
║ Base Credits: 1,000                      ║
║                                          ║
║ Add Credits:                             ║
║ [____] (input field)                     ║
║                                          ║
║ Reason:                                  ║
║ [_____________________________]          ║
║                                          ║
║ [Grant Credits]                          ║
║                                          ║
║ Reset Date: [📅 Date Picker]            ║
║ [Update Reset Date]                      ║
║                                          ║
╚══════════════════════════════════════════╝
```

---

## 🔒 Security Considerations

1. **Authorization**: רק המשתמש עצמו יכול לראות את הקרדיטים שלו
2. **Admin Verification**: רק אדמינים יכולים לתת קרדיטים
3. **Transaction Integrity**: כל transaction צריך להיות immutable
4. **Balance Validation**: לוודא שהיתרה תמיד תקינה (לא שלילית חוץ מ-unlimited)
5. **Audit Trail**: כל שינוי בקרדיטים צריך להיות מתועד

---

## 📝 Notes

- **Payment Integration**: כרגע לא מיושם. UI מוכן, אבל כפתור "Purchase" יציג הודעה
- **Future Enhancement**: בעתיד אפשר להוסיף:
  - Email notifications על קרדיטים נמוכים
  - Auto-purchase כאשר קרדיטים נגמרים
  - Credits packages מותאמים אישית
  - Referral credits

---

**Specification Version:** 1.0  
**Last Updated:** December 21, 2025  
**Status:** Ready for Implementation

