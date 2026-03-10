# אפיון תמחור קרדיטים - Credits Pricing Specification

**Version:** 1.0  
**Last Updated:** December 23, 2025  
**Status:** Specification & Implementation Guide

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [טבלת תמחור קרדיטים](#טבלת-תמחור-קרדיטים)
3. [איך זה עובד](#איך-זה-עובד)
4. [יישום במערכת](#יישום-במערכת)
5. [דוגמאות שימוש](#דוגמאות-שימוש)

---

## 🎯 סקירה כללית

מערכת הקרדיטים מאפשרת למשתמשים לבצע פעולות במערכת תמורת קרדיטים. כל פעולה עולה מספר קרדיטים מוגדר מראש.

### עקרונות:
- **שקיפות**: כל עלות פעולה ברורה ומוגדרת
- **גמישות**: אפשרות לקנות קרדיטים נוספים
- **הוגנות**: תמחור שונה לפי סוג פעולה (index vs re-index)

---

## 💰 טבלת תמחור קרדיטים

### פעולות אינדוקס (Indexing)

| פעולה | קרדיטים | תיאור |
|-------|----------|-------|
| **FILE_INDEX** | 100 | יצירת אינדקס חדש לקובץ Figma |
| **FILE_REINDEX** | 50 | אינדוקס מחדש של קובץ קיים (זול יותר) |

**הערות:**
- `FILE_INDEX` - כאשר יוצרים אינדקס חדש לקובץ שלא היה קיים במערכת
- `FILE_REINDEX` - כאשר מעדכנים אינדקס קיים (50% הנחה)

### הגדלת מכסות (Quota Increases) - חודשי

#### הגדלת מכסת קבצים (Files Quota)

| פעולה | קרדיטים/חודש | תיאור |
|-------|---------------|-------|
| **ADD_FILE_QUOTA** | 200 | +1 קובץ למכסה החודשית |
| **ADD_2_FILES_QUOTA** | 350 | +2 קבצים למכסה החודשית (הנחה) |
| **ADD_5_FILES_QUOTA** | 800 | +5 קבצים למכסה החודשית (הנחה גדולה) |

**הנחות:**
- 1 קובץ: 200 קרדיטים
- 2 קבצים: 175 קרדיטים לקובץ (350 סה"כ)
- 5 קבצים: 160 קרדיטים לקובץ (800 סה"כ)

#### הגדלת מכסת פריימים (Frames Quota)

| פעולה | קרדיטים/חודש | תיאור |
|-------|---------------|-------|
| **ADD_1000_FRAMES_QUOTA** | 150 | +1,000 פריימים למכסה החודשית |
| **ADD_2000_FRAMES_QUOTA** | 280 | +2,000 פריימים למכסה החודשית (הנחה) |
| **ADD_5000_FRAMES_QUOTA** | 600 | +5,000 פריימים למכסה החודשית (הנחה גדולה) |

**הנחות:**
- 1,000 פריימים: 150 קרדיטים
- 2,000 פריימים: 140 קרדיטים ל-1,000 (280 סה"כ)
- 5,000 פריימים: 120 קרדיטים ל-1,000 (600 סה"כ)

### הנחות לתכנית Team

| פעולה | קרדיטים רגילים | קרדיטים Team | הנחה |
|-------|-----------------|---------------|------|
| **ADD_FILE_QUOTA** | 200 | 150 | 25% |
| **ADD_2_FILES_QUOTA** | 350 | 300 | 14% |
| **ADD_1000_FRAMES_QUOTA** | 150 | 120 | 20% |

---

## 🔄 איך זה עובד

### תהליך הפחתת קרדיטים

```
1. משתמש מבצע פעולה (למשל: יצירת אינדקס)
   ↓
2. המערכת בודקת:
   - האם יש מספיק קרדיטים?
   - מה העלות של הפעולה?
   ↓
3. אם יש מספיק קרדיטים:
   - מפחיתים את הקרדיטים
   - יוצרים transaction record
   - מעדכנים את credits_remaining
   - ממשיכים עם הפעולה
   ↓
4. אם אין מספיק קרדיטים:
   - מחזירים שגיאה
   - הפעולה לא מתבצעת
```

### סוגי Transactions

| סוג | תיאור | דוגמה |
|-----|-------|-------|
| **usage** | שימוש בקרדיטים לפעולה | יצירת אינדקס (-100) |
| **purchase** | רכישת קרדיטים | קניית חבילה (+1000) |
| **admin_grant** | אדמין נתן קרדיטים | אדמין הוסיף 500 קרדיטים |
| **reset** | איפוס חודשי | איפוס ל-1000 קרדיטים |

---

## 💻 יישום במערכת

### 1. הגדרת עלויות (קיים)

העלויות מוגדרות ב-`lib/plans.ts`:

```typescript
export const CREDIT_COSTS = {
  // Indexing
  FILE_INDEX: 100,
  FILE_REINDEX: 50,
  
  // Quota increases (monthly)
  ADD_FILE_QUOTA: 200,
  ADD_2_FILES_QUOTA: 350,
  ADD_5_FILES_QUOTA: 800,
  
  ADD_1000_FRAMES_QUOTA: 150,
  ADD_2000_FRAMES_QUOTA: 280,
  ADD_5000_FRAMES_QUOTA: 600,
  
  // Team discounts
  TEAM_ADD_FILE_QUOTA: 150,
  TEAM_ADD_2_FILES_QUOTA: 300,
  TEAM_ADD_1000_FRAMES_QUOTA: 120,
} as const;
```

### 2. חישוב עלות לפי תכנית

```typescript
export function getCreditCost(action: keyof typeof CREDIT_COSTS, planId: PlanId): number {
  // Team gets discounts on quota increases
  if (planId === 'team' && action.startsWith('TEAM_')) {
    return CREDIT_COSTS[action as keyof typeof CREDIT_COSTS];
  }
  // Remove TEAM_ prefix for team plans
  if (planId === 'team' && action.startsWith('ADD_')) {
    const teamAction = `TEAM_${action}` as keyof typeof CREDIT_COSTS;
    if (teamAction in CREDIT_COSTS) {
      return CREDIT_COSTS[teamAction];
    }
  }
  return CREDIT_COSTS[action];
}
```

### 3. הפחתת קרדיטים (צריך ליישם)

#### שלב 1: בדיקת יתרה לפני פעולה

```typescript
import { CREDIT_COSTS } from '../../lib/plans';
import { createCreditTransaction } from '../../lib/credits';

// בדוק יתרה
const { data: user } = await supabaseAdmin
  .from('users')
  .select('credits_remaining, plan, is_admin')
  .eq('id', userId)
  .single();

const requiredCredits = CREDIT_COSTS.FILE_INDEX; // או FILE_REINDEX
const currentCredits = user.credits_remaining || 0;

// בדוק אם יש מספיק קרדיטים (או unlimited)
if (user.plan !== 'unlimited' && !user.is_admin && currentCredits < requiredCredits) {
  return res.status(400).json({
    success: false,
    error: `Insufficient credits. Required: ${requiredCredits}, Available: ${currentCredits}`
  });
}
```

#### שלב 2: הפחתת קרדיטים

```typescript
// הפחת קרדיטים
const result = await createCreditTransaction(supabaseAdmin, {
  userId: user.id,
  transactionType: 'usage',
  amount: -requiredCredits, // שלילי = הפחתה
  description: `Index creation: ${fileName}`,
  referenceId: jobId,
  referenceType: 'job',
  metadata: {
    fileName: fileName,
    fileKey: fileKey,
    action: 'FILE_INDEX' // או 'FILE_REINDEX'
  }
});

if (!result.success) {
  return res.status(500).json({
    success: false,
    error: result.error || 'Failed to deduct credits'
  });
}

// המשך עם יצירת ה-job...
```

### 4. איפה צריך ליישם

#### ✅ כבר מיושם:
- ✅ `lib/plans.ts` - הגדרת CREDIT_COSTS
- ✅ `lib/credits.ts` - פונקציית createCreditTransaction
- ✅ `pages/api/admin/credits/grant.ts` - מתן קרדיטים על ידי אדמין

#### ❌ צריך ליישם:
- ❌ `pages/api/create-index-from-figma.ts` - הפחתת קרדיטים בעת יצירת אינדקס
- ❌ `pages/api/cron/process-pending-jobs.ts` - בדיקה אם צריך להפחית קרדיטים (אם לא הופחתו לפני)
- ❌ API endpoints להגדלת מכסות (quota increases) - עדיין לא קיימים

---

## 📝 דוגמאות שימוש

### דוגמה 1: יצירת אינדקס חדש

```typescript
// 1. בדוק יתרה
const user = await getUser(userId);
const cost = CREDIT_COSTS.FILE_INDEX; // 100 credits

if (user.credits_remaining < cost) {
  throw new Error(`Insufficient credits. Need ${cost}, have ${user.credits_remaining}`);
}

// 2. הפחת קרדיטים
await createCreditTransaction(supabaseAdmin, {
  userId: user.id,
  transactionType: 'usage',
  amount: -cost,
  description: `Index creation: ${fileName}`,
  referenceId: jobId,
  referenceType: 'job'
});

// 3. המשך עם יצירת ה-job
// ...
```

### דוגמה 2: אינדוקס מחדש (re-index)

```typescript
// בדוק אם זה אינדקס חדש או re-index
const isReindex = await checkIfIndexExists(fileKey, userId);
const cost = isReindex ? CREDIT_COSTS.FILE_REINDEX : CREDIT_COSTS.FILE_INDEX;

// הפחת קרדיטים
await createCreditTransaction(supabaseAdmin, {
  userId: user.id,
  transactionType: 'usage',
  amount: -cost,
  description: isReindex 
    ? `Re-index: ${fileName}` 
    : `Index creation: ${fileName}`,
  referenceId: jobId,
  referenceType: 'job'
});
```

### דוגמה 3: הגדלת מכסה (עתידי)

```typescript
// משתמש רוצה להוסיף 1 קובץ למכסה
const planId = resolvePlanId(user.plan, user.is_admin);
const cost = getCreditCost('ADD_FILE_QUOTA', planId); // 200 או 150 ל-Team

// הפחת קרדיטים
await createCreditTransaction(supabaseAdmin, {
  userId: user.id,
  transactionType: 'usage',
  amount: -cost,
  description: `Add file quota: +1 file`,
  referenceType: 'quota',
  metadata: {
    quotaType: 'files',
    amount: 1
  }
});

// עדכן את המכסה במערכת
// ...
```

---

## 🔍 בדיקות ו-Validation

### בדיקות לפני הפחתה:

1. **בדיקת יתרה:**
   ```typescript
   if (user.credits_remaining < requiredCredits) {
     return error;
   }
   ```

2. **בדיקת תכנית:**
   ```typescript
   if (user.plan === 'unlimited' || user.is_admin) {
     // לא מפחיתים קרדיטים
     return;
   }
   ```

3. **בדיקת תקינות סכום:**
   ```typescript
   if (requiredCredits <= 0) {
     return error;
   }
   ```

### בדיקות אחרי הפחתה:

1. **וידוא שה-transaction נוצר:**
   ```typescript
   const transaction = await getTransaction(transactionId);
   if (!transaction) {
     // Rollback - החזר קרדיטים
   }
   ```

2. **וידוא שהיתרה עודכנה:**
   ```typescript
   const updatedUser = await getUser(userId);
   if (updatedUser.credits_remaining !== expectedBalance) {
     // Rollback
   }
   ```

---

## 📊 דוגמאות תמחור

### משתמש Free Plan:
- **יתרה חודשית:** 100 קרדיטים
- **יצירת אינדקס:** 100 קרדיטים (1 אינדקס/חודש)
- **Re-index:** 50 קרדיטים (2 re-index/חודש)

### משתמש Pro Plan:
- **יתרה חודשית:** 1,000 קרדיטים
- **יצירת אינדקס:** 100 קרדיטים (10 אינדקסים/חודש)
- **Re-index:** 50 קרדיטים (20 re-index/חודש)
- **או שילוב:** 5 אינדקסים חדשים + 10 re-index = 1,000 קרדיטים

### משתמש Team Plan:
- **יתרה חודשית:** 2,000 קרדיטים
- **יצירת אינדקס:** 100 קרדיטים (20 אינדקסים/חודש)
- **Re-index:** 50 קרדיטים (40 re-index/חודש)
- **הגדלת מכסה:** הנחות (150 במקום 200)

---

## 🚀 שלבי יישום

### Phase 1: יישום בסיסי (חובה)
- [ ] הפחתת קרדיטים ב-`create-index-from-figma.ts`
- [ ] בדיקת יתרה לפני יצירת job
- [ ] יצירת transaction record
- [ ] הודעת שגיאה אם אין מספיק קרדיטים

### Phase 2: שיפורים
- [ ] זיהוי אוטומטי של re-index (50% הנחה)
- [ ] הודעות למשתמש על קרדיטים נמוכים
- [ ] הצגת עלות לפני ביצוע פעולה

### Phase 3: תכונות מתקדמות
- [ ] הגדלת מכסות (quota increases)
- [ ] היסטוריית שימוש מפורטת
- [ ] תחזיות שימוש (usage predictions)

---

## 📝 הערות חשובות

1. **Unlimited Plan:** משתמשים עם `unlimited` plan או `is_admin = true` לא משלמים קרדיטים
2. **Re-index Detection:** צריך לבדוק אם קובץ כבר קיים במערכת כדי להחליט בין FILE_INDEX ל-FILE_REINDEX
3. **Transaction Records:** כל הפחתת קרדיטים חייבת להיות מתועדת ב-`credits_transactions`
4. **Error Handling:** אם הפחתת הקרדיטים נכשלה, הפעולה לא צריכה להתבצע

---

**Specification Version:** 1.0  
**Last Updated:** December 23, 2025  
**Status:** Ready for Implementation

