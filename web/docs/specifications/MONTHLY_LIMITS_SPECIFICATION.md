# אפיון הגבלות חודשיות - Monthly Limits Specification

**תאריך:** 11 בדצמבר 2025  
**גרסה:** 1.0  
**מטרה:** מניעת הפסדים כלכליים על ידי הגבלת שימוש חודשי לפי תוכנית

---

## 🎯 מטרת ההגבלה

למנוע הפסדים כלכליים על ידי הגבלת השימוש החודשי של כל משתמש בהתאם לתוכנית שלו, כך שהעלות לא תחרוג מההכנסה הצפויה.

### בעיה נוכחית:
- **Free Plan:** עלות $25/חודש, הכנסה $0 → הפסד של $25/חודש
- **Pro Plan (שימוש ממוצע):** עלות $50.20/חודש, הכנסה $15 → הפסד של $35.20/חודש
- **Pro Plan (שימוש גבוה):** עלות $681.50/חודש, הכנסה $15 → הפסד של $666.50/חודש

### פתרון:
הגבלות חודשיות שמבטיחות שהעלות לא תחרוג מההכנסה הצפויה.

---

## 📊 חישוב הגבלות מבוססות עלויות

### Free Plan
**מטרה:** עלות $0 (נשאר ב-Vercel Hobby + Supabase Free)

**חישוב:**
- Vercel Hobby: 100GB bandwidth/חודש (חינם)
- Supabase Free: 1GB storage, 2GB bandwidth/חודש
- **הגבלה מומלצת:**
  - 30 אינדקסים/חודש (1 אינדקס/יום)
  - 3,000 פריימים/חודש (~100 פריימים/אינדקס)
  - **הגיון:** 3,000 פריימים × 200KB = 600MB storage + 600MB bandwidth = 1.2GB < 2GB ✅

**הגבלות נוכחיות:**
- `maxUploadsPerDay: 2` → **יש לשנות ל-1**
- `maxFramesTotal: 500` → נשאר
- **חדש:** `maxUploadsPerMonth: 30`
- **חדש:** `maxFramesPerMonth: 3,000`

---

### Pro Plan
**מטרה:** עלות מקסימלית $15/חודש (שווה להכנסה)

**חישוב:**
- Vercel Pro: $20/חודש + GB-hours
- Supabase Pro: $25/חודש
- **עלות כוללת:** $45/חודש (תשתית) + GB-hours

**חישוב GB-hours:**
- עלות GB-hour: $0.0000166667
- תקציב GB-hours: $15 (הכנסה) - $0 (אם נניח שהתשתית כבר משולמת) = $15
- GB-hours אפשריים: $15 ÷ $0.0000166667 = 900,000 GB-seconds = 250 GB-hours/חודש

**חישוב אינדקסים:**
- כל אינדקס: ~50 chunks × 15 שניות × 2GB = 1,500 GB-seconds = 0.42 GB-hours
- אינדקסים אפשריים: 250 GB-hours ÷ 0.42 = ~600 אינדקסים/חודש

**אבל:** צריך לקחת בחשבון גם Supabase storage ו-bandwidth:
- 600 אינדקסים × 200 פריימים = 120,000 פריימים/חודש
- Storage: 120,000 × 200KB = 24GB (בתוך 100GB של Supabase Pro) ✅
- Bandwidth: 24GB (בתוך 250GB של Supabase Pro) ✅

**הגבלות מומלצות:**
- `maxUploadsPerMonth: 300` (10 אינדקסים/יום)
- `maxFramesPerMonth: 30,000` (~100 פריימים/אינדקס בממוצע)

**הגבלות נוכחיות:**
- `maxUploadsPerDay: 20` → נשאר
- `maxFramesTotal: 50,000` → נשאר
- **חדש:** `maxUploadsPerMonth: 300`
- **חדש:** `maxFramesPerMonth: 30,000`

---

### Unlimited Plan
**מטרה:** אין הגבלה (תמחור מותאם מכסה עלויות)

**הגבלות:**
- `maxUploadsPerMonth: null` (ללא הגבלה)
- `maxFramesPerMonth: null` (ללא הגבלה)

---

## 🔧 יישום טכני

### 1. עדכון `lib/plans.ts`

#### שינוי בממשק `PlanLimits`:
```typescript
export interface PlanLimits {
  id: PlanId;
  label: string;
  maxProjects: number | null;
  maxFramesTotal: number | null;
  maxUploadsPerDay: number | null;
  maxUploadsPerMonth: number | null; // חדש
  maxFramesPerMonth: number | null; // חדש
  maxIndexSizeBytes: number | null;
  retentionDays: number | null;
}
```

#### עדכון `PLAN_LIMITS`:
```typescript
const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    label: 'Free',
    maxProjects: 1,
    maxFramesTotal: 500,
    maxUploadsPerDay: 1, // שונה מ-2 ל-1
    maxUploadsPerMonth: 30, // חדש
    maxFramesPerMonth: 3000, // חדש
    maxIndexSizeBytes: 50 * MB,
    retentionDays: 30
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxProjects: 5,
    maxFramesTotal: 50_000,
    maxUploadsPerDay: 20,
    maxUploadsPerMonth: 300, // חדש
    maxFramesPerMonth: 30000, // חדש
    maxIndexSizeBytes: 500 * MB,
    retentionDays: 180
  },
  unlimited: {
    id: 'unlimited',
    label: 'Unlimited',
    maxProjects: null,
    maxFramesTotal: null,
    maxUploadsPerDay: null,
    maxUploadsPerMonth: null, // חדש
    maxFramesPerMonth: null, // חדש
    maxIndexSizeBytes: null,
    retentionDays: null
  }
};
```

---

### 2. עדכון `pages/api/upload-index-v2.ts`

#### עדכון `computeUsageStats`:
```typescript
function computeUsageStats(
  rows: Array<{ id: string; project_id: string | null; figma_file_key: string | null; index_data: any; uploaded_at: string | null }>,
  currentIndexId: string | null,
  startOfDayUtc: Date
) {
  const projectIds = new Set<string>();
  let totalFramesExcludingCurrent = 0;
  let uploadsTodayExcludingCurrent = 0;
  let uploadsThisMonthExcludingCurrent = 0; // חדש
  let framesThisMonthExcludingCurrent = 0; // חדש

  // Calculate start of current month (UTC)
  const now = new Date();
  const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (const row of rows) {
    if (!row) continue;
    if (row.project_id) {
      projectIds.add(row.project_id);
    }
    const frameCount = countFramesFromIndexData(row.index_data);
    const uploadedAtDate = row.uploaded_at ? new Date(row.uploaded_at) : null;
    if (currentIndexId && row.id === currentIndexId) {
      continue;
    }
    totalFramesExcludingCurrent += frameCount;
    if (uploadedAtDate && uploadedAtDate >= startOfDayUtc) {
      uploadsTodayExcludingCurrent += 1;
    }
    // Monthly stats
    if (uploadedAtDate && uploadedAtDate >= startOfMonthUtc) {
      uploadsThisMonthExcludingCurrent += 1;
      framesThisMonthExcludingCurrent += frameCount;
    }
  }

  return {
    projectIds,
    totalFramesExcludingCurrent,
    uploadsTodayExcludingCurrent,
    uploadsThisMonthExcludingCurrent, // חדש
    framesThisMonthExcludingCurrent // חדש
  };
}
```

#### הוספת בדיקות הגבלות חודשיות:
```typescript
// Monthly upload limit check (prevents cost overruns)
const uploadsThisMonthAfter = usageStats.uploadsThisMonthExcludingCurrent + 1;
if (planLimits.maxUploadsPerMonth !== null && uploadsThisMonthAfter > planLimits.maxUploadsPerMonth) {
  return limitError(
    'PLAN_MAX_UPLOADS_PER_MONTH',
    `Monthly upload limit reached for the ${planLimits.label} plan (${planLimits.maxUploadsPerMonth} per month). Please upgrade your plan or wait until next month.`
  );
}

// Monthly frames limit check (prevents cost overruns)
const framesThisMonthAfter = usageStats.framesThisMonthExcludingCurrent + newFrameCount;
if (planLimits.maxFramesPerMonth !== null && framesThisMonthAfter > planLimits.maxFramesPerMonth) {
  return limitError(
    'PLAN_MAX_FRAMES_PER_MONTH',
    `Monthly frames limit reached for the ${planLimits.label} plan (${planLimits.maxFramesPerMonth.toLocaleString()} frames per month). Please upgrade your plan or wait until next month.`
  );
}
```

---

### 3. עדכון `pages/api/create-index-from-figma.ts`

#### הוספת import:
```typescript
import { resolvePlanId, getPlanLimits } from '../../lib/plans';
```

#### הוספת בדיקות לפני יצירת job:
```typescript
const planLimits = getPlanLimits(user.plan, user.is_admin);

// Check monthly limits before creating job
const now = new Date();
const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

// Get user's indices from this month to check monthly limits
const { data: monthlyIndices, error: monthlyError } = await supabaseAdmin
  .from('index_files')
  .select('id, index_data, uploaded_at')
  .eq('user_id', user.id)
  .gte('uploaded_at', startOfMonthUtc.toISOString());

if (!monthlyError && Array.isArray(monthlyIndices)) {
  // Count uploads and frames this month
  const uploadsThisMonth = monthlyIndices.length;
  let framesThisMonth = 0;
  
  // Count frames from index_data
  for (const index of monthlyIndices) {
    if (index.index_data) {
      try {
        let indexData = index.index_data;
        if (typeof indexData === 'string') {
          indexData = JSON.parse(indexData);
        }
        if (Array.isArray(indexData)) {
          framesThisMonth += indexData.reduce((sum: number, page: any) => {
            return sum + (Array.isArray(page?.frames) ? page.frames.length : 0);
          }, 0);
        }
      } catch (e) {
        // Skip if can't parse
      }
    }
  }

  const limitError = (code: string, message: string) => res.status(403).json({
    success: false,
    error: message,
    code,
    plan: planLimits.id,
    upgradeUrl: 'https://www.figdex.com/pricing',
  });

  // Check monthly upload limit
  if (planLimits.maxUploadsPerMonth !== null && uploadsThisMonth >= planLimits.maxUploadsPerMonth) {
    return limitError(
      'PLAN_MAX_UPLOADS_PER_MONTH',
      `Monthly upload limit reached for the ${planLimits.label} plan (${planLimits.maxUploadsPerMonth} per month). Please upgrade your plan or wait until next month.`
    );
  }

  // Check monthly frames limit (estimate based on total_frames from job if available)
  // Note: This is an estimate - actual frames will be counted after processing
  // We'll check again in upload-index-v2.ts after processing
}
```

---

## 📋 טבלת הגבלות סופית

| תוכנית | אינדקסים/יום | אינדקסים/חודש | פריימים/חודש | עלות מקסימלית | הכנסה | רווח/הפסד |
|--------|-------------|---------------|--------------|--------------|--------|-----------|
| **Free** | 1 | 30 | 3,000 | $0 | $0 | $0 ✅ |
| **Pro** | 10 | 300 | 30,000 | ~$15 | $15 | $0 ✅ |
| **Unlimited** | ללא הגבלה | ללא הגבלה | ללא הגבלה | תמחור מותאם | תמחור מותאם | תמחור מותאם |

---

## 🔍 נקודות חשובות

### 1. חישוב חודשי
- החודש מחושב לפי UTC
- התחלה: יום 1 בחודש, 00:00:00 UTC
- סיום: יום 1 בחודש הבא, 00:00:00 UTC

### 2. ספירת פריימים
- **ב-upload-index-v2.ts:** נספרים פריימים מ-`index_data` לאחר עיבוד
- **ב-create-index-from-figma.ts:** נשתמש ב-`total_frames` מהחישוב הראשוני (אומדן)

### 3. הודעות שגיאה
- **קוד שגיאה:** `PLAN_MAX_UPLOADS_PER_MONTH` / `PLAN_MAX_FRAMES_PER_MONTH`
- **הודעה:** ברורה עם מספר ההגבלה והצעת שדרוג
- **קישור שדרוג:** `https://www.figdex.com/pricing`

### 4. ביצועים
- שאילתה אחת נוספת ל-Supabase (לבדיקת אינדקסים חודשיים)
- חישוב פריימים מ-`index_data` (יכול להיות כבד - נשתמש ב-caching אם אפשר)

### 5. Edge Cases
- **משתמש חדש:** 0 אינדקסים בחודש → כל הגבלה תעבור
- **סוף חודש:** הגבלות מתאפסות אוטומטית ביום 1
- **Timezone:** כל החישובים ב-UTC למניעת בלבול

---

## ✅ בדיקות נדרשות

### 1. בדיקות יחידה (Unit Tests)
- [ ] `computeUsageStats` מחשב נכון סטטיסטיקות חודשיות
- [ ] הגבלות חודשיות נבדקות נכון
- [ ] הודעות שגיאה נכונות

### 2. בדיקות אינטגרציה
- [ ] Free user לא יכול ליצור יותר מ-30 אינדקסים/חודש
- [ ] Pro user לא יכול ליצור יותר מ-300 אינדקסים/חודש
- [ ] Free user לא יכול ליצור יותר מ-3,000 פריימים/חודש
- [ ] Pro user לא יכול ליצור יותר מ-30,000 פריימים/חודש
- [ ] Unlimited user יכול ליצור ללא הגבלה

### 3. בדיקות ביצועים
- [ ] שאילתת אינדקסים חודשיים מהירה (< 100ms)
- [ ] חישוב פריימים מהיר (< 500ms)

### 4. בדיקות UX
- [ ] הודעות שגיאה ברורות
- [ ] קישור שדרוג עובד
- [ ] משתמש מבין מתי הגבלות יתאפסו

---

## 📝 הערות נוספות

### 1. אופטימיזציות עתידיות
- **Caching:** שמירת סטטיסטיקות חודשיות ב-cache
- **Pre-calculation:** חישוב סטטיסטיקות חודשיות ב-background job
- **Real-time updates:** עדכון סטטיסטיקות בזמן אמת

### 2. מוניטורינג
- מעקב אחר משתמשים שמגיעים ל-80% מהגבלה
- התראות למשתמשים לפני הגעה להגבלה
- דשבורד למנהלים עם סטטיסטיקות שימוש

### 3. גמישות
- אפשרות להגדיל הגבלות חודשיות למשתמשים ספציפיים (admin)
- אפשרות להאריך תקופת ניסיון (trial extension)

---

## 🚀 תכנית יישום

### שלב 1: עדכון מבנה נתונים
1. עדכון `lib/plans.ts` עם הגבלות חודשיות
2. בדיקת TypeScript compilation

### שלב 2: עדכון לוגיקת בדיקות
1. עדכון `computeUsageStats` ב-`upload-index-v2.ts`
2. הוספת בדיקות הגבלות חודשיות ב-`upload-index-v2.ts`
3. הוספת בדיקות הגבלות חודשיות ב-`create-index-from-figma.ts`

### שלב 3: בדיקות
1. בדיקות יחידה
2. בדיקות אינטגרציה
3. בדיקות ביצועים

### שלב 4: פריסה
1. Deploy ל-staging
2. בדיקות ב-staging
3. Deploy ל-production
4. מוניטורינג

---

**מסמך זה עודכן:** 11 בדצמבר 2025  
**גרסה:** 1.0  
**סטטוס:** ⏳ ממתין לאישור לפני יישום

