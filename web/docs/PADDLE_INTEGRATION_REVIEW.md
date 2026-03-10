# Paddle Integration - סקירה וייעול

**תאריך:** 25 בדצמבר, 2025

## 📋 סקירה כללית

המערכת כוללת הטמעה בסיסית של Paddle עבור תשלומי מנויים (Pro/Team), אך יש מספר תחומים שדורשים שיפור ואופטימיזציה.

---

## ✅ מה כבר עובד

### 1. **Core Infrastructure**
- ✅ **PaddleCheckout Component** (`components/PaddleCheckout.tsx`)
  - Hook `usePaddleCheckout()` לעבודה נוחה
  - Initialization אוטומטי עם singleton pattern
  - Error handling בסיסי

- ✅ **Backend Utilities** (`lib/paddle.ts`)
  - Helper functions לניהול credentials
  - Webhook signature verification
  - API request wrapper

- ✅ **Webhook Handler** (`pages/api/webhooks/paddle.ts`)
  - טיפול באירועי subscription
  - טיפול באירועי transaction
  - Integration עם database

- ✅ **Config API** (`pages/api/payment/get-paddle-config.ts`)
  - Endpoint לקבלת configuration ל-frontend
  - Public key ו-price IDs

### 2. **Frontend Integration**
- ✅ **Pricing Page** (`pages/pricing.tsx`)
  - Integration עם Paddle checkout
  - Loading states
  - Error handling

### 3. **Database Schema**
- ✅ **Payment Tables** (`sql/create_payment_system_tables.sql`)
  - `subscriptions` table תומך Paddle
  - `invoices` table תומך Paddle (אחרי migration)
  - `payment_customers` table

---

## ⚠️ בעיות וחסרים

### 1. **Add-ons לא מחוברים ל-Paddle** 🔴 **קריטי**

**הבעיה:**
- Add-ons (`pages/api/user/addons.ts`) לא משתמשים ב-Paddle checkout
- רק יוצרים `pending` status ללא תשלום אמיתי
- TODO comments מעידים שזה לא הושלם

**מיקום:** `pages/api/user/addons.ts` שורות 72, 92, 138

```typescript
// שורה 72: TODO: Integrate with Stripe for payment processing
// שורה 92: TODO: Create Stripe subscription here
// שורה 138: TODO: Cancel Stripe subscription here
```

**השפעה:**
- משתמשים לא יכולים לקנות add-ons
- אין תשלום על add-ons
- אין webhook handling עבור add-ons

### 2. **Add-ons Purchase Flow** 🔴 **קריטי**

**הבעיה:**
- `handlePurchaseAddon` ב-`pages/account.tsx` רק שולח API request
- לא פותח Paddle checkout dialog
- לא משתמש ב-`usePaddleCheckout` hook

**מיקום:** `pages/account.tsx` שורה 279

**מה צריך:**
- להוסיף Paddle checkout עבור add-ons
- ליצור Price IDs ב-Paddle Dashboard עבור add-ons
- להוסיף webhook handling עבור add-on subscriptions

### 3. **Environment Variables לא מתועדים** ⚠️

**הבעיה:**
- אין `.env.example` עם Paddle variables
- לא ברור אילו variables נדרשים

**מה צריך:**
```bash
# Paddle Configuration
PADDLE_VENDOR_ID=your_vendor_id
PADDLE_API_KEY=your_api_key
PADDLE_ENVIRONMENT=sandbox  # or 'production'
NEXT_PUBLIC_PADDLE_PUBLIC_KEY=your_public_key
PADDLE_WEBHOOK_SECRET=your_webhook_secret

# Paddle Price IDs
PADDLE_PRICE_ID_PRO=pri_...
PADDLE_PRICE_ID_TEAM=pri_...
```

### 4. **Webhook Signature Verification** ⚠️

**הבעיה:**
- Webhook handler משתמש ב-`paddle-signature` header
- Paddle משתמש ב-`paddle-signature` עם format שונה (לא רק hex)

**מיקום:** `pages/api/webhooks/paddle.ts` שורה 22-35

**מה צריך לבדוק:**
- האם הפורמט של signature נכון?
- האם יש טיפול נכון ב-raw body?
- האם יש logging מספיק?

### 5. **Error Handling** ⚠️

**בעיות:**
- אין retry logic ל-webhooks
- אין error notifications למשתמש
- אין logging מפורט מספיק

### 6. **Add-on Packages ב-Paddle** ⚠️

**הבעיה:**
- Add-ons לא מוגדרים ב-Paddle Dashboard
- אין Price IDs עבור add-ons

**מה צריך:**
- ליצור Products ב-Paddle עבור כל סוג add-on:
  - Extra Files (monthly recurring)
  - Extra Frames (monthly recurring)
  - Extra Daily Indexes (monthly recurring)

---

## 🔧 המלצות לייעול

### 1. **השלמת Add-ons Integration** 🔴 **עדיפות גבוהה**

#### שלב 1: יצירת Price IDs ב-Paddle
1. ליצור Products ב-Paddle Dashboard עבור כל add-on type
2. לקבל Price IDs
3. להוסיף ל-environment variables:
   ```bash
   PADDLE_PRICE_ID_ADDON_FILES_1=pri_...
   PADDLE_PRICE_ID_ADDON_FILES_2=pri_...
   PADDLE_PRICE_ID_ADDON_FRAMES_1K=pri_...
   PADDLE_PRICE_ID_ADDON_FRAMES_2K=pri_...
   PADDLE_PRICE_ID_ADDON_RATE_LIMIT_10=pri_...
   ```

#### שלב 2: עדכון Add-ons API
- להוסיף Paddle checkout לפני יצירת pending add-on
- לקבל Price ID מהמחיר הנבחר
- לפתוח Paddle checkout עם custom_data (addon_type, addon_value)

#### שלב 3: עדכון Frontend
- לעדכן `handlePurchaseAddon` ב-`pages/account.tsx`
- להוסיף `usePaddleCheckout` hook
- לפתוח checkout dialog לפני API call

#### שלב 4: Webhook Handling
- להוסיף טיפול ב-`subscription.created` עבור add-ons
- לעדכן status מ-`pending` ל-`active` אחרי תשלום

### 2. **שיפור Error Handling**

#### שלב 1: Retry Logic
```typescript
// Add exponential backoff for webhook processing
async function handleWebhookWithRetry(event, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await handleWebhook(event);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

#### שלב 2: Error Notifications
- לשלוח email למשתמש על שגיאות תשלום
- לשלוח email לאדמין על שגיאות webhook

### 3. **שיפור Logging**

#### להוסיף structured logging:
```typescript
console.log('[PADDLE]', {
  event: 'checkout_opened',
  userId,
  priceId,
  timestamp: new Date().toISOString()
});
```

### 4. **שיפור Webhook Verification**

#### לבדוק את הפורמט הנכון של Paddle signature:
```typescript
// Paddle uses: ts;hash format
function verifyPaddleWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const parts = signature.split(';');
  if (parts.length !== 2) return false;
  
  const [timestamp, hash] = parts;
  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(timestamp + ':' + rawBody)
    .digest('hex');
  
  return computedHash === hash;
}
```

### 5. **Testing & Monitoring**

#### להוסיף:
- Unit tests ל-webhook handlers
- Integration tests ל-checkout flow
- Monitoring dashboard (Paddle Dashboard + application logs)
- Alerts על webhook failures

---

## 📝 Action Items

### מידיות (עדיפות גבוהה):
1. ✅ השלמת Add-ons integration עם Paddle
2. ✅ יצירת Price IDs עבור add-ons ב-Paddle Dashboard
3. ✅ עדכון `handlePurchaseAddon` להשתמש ב-Paddle checkout
4. ✅ הוספת webhook handling עבור add-ons

### חשובות (עדיפות בינונית):
5. ⚠️ שיפור error handling ו-retry logic
6. ⚠️ הוספת `.env.example` עם Paddle variables
7. ⚠️ שיפור logging ו-monitoring

### רצויות (עדיפות נמוכה):
8. 🔵 Unit tests
9. 🔵 Integration tests
10. 🔵 Performance optimization

---

## 🔍 בדיקות נדרשות

### 1. Checkout Flow
- [ ] Pro plan subscription עובד
- [ ] Team plan subscription עובד
- [ ] Add-ons checkout עובד (לאחר השלמה)
- [ ] Error handling עובד (כרטיס לא תקין)
- [ ] Success redirect עובד

### 2. Webhooks
- [ ] `subscription.created` - subscription נוצר ב-DB
- [ ] `subscription.updated` - subscription מתעדכן
- [ ] `subscription.canceled` - subscription מתבטל
- [ ] `transaction.completed` - invoice נוצר
- [ ] `transaction.payment_failed` - status מתעדכן ל-past_due

### 3. Database
- [ ] Subscriptions table מתעדכן נכון
- [ ] Invoices table מתעדכן נכון
- [ ] Users table מתעדכן עם plan
- [ ] Add-ons מתעדכנים אחרי תשלום

---

## 📚 משאבים

- [Paddle Documentation](https://developer.paddle.com)
- [Paddle Dashboard](https://vendors.paddle.com)
- [Paddle Webhooks Guide](https://developer.paddle.com/webhooks/overview)
- [Setup Guide](./setup/PADDLE_SETUP.md)

---

**עודכן אחרון:** 25 בדצמבר, 2025

