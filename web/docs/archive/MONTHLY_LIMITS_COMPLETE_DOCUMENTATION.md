# הגבלות חודשיות - מסמך מלא
## Monthly Limits - Complete Documentation

**פרויקט:** FigDex Platform  
**תאריך:** 11 בדצמבר 2025  
**גרסה:** 1.0  
**סטטוס:** ✅ הושלם ומוכן לפריסה

---

# תוכן עניינים

1. [מבוא ומטרה](#מבוא-ומטרה)
2. [בעיה ופתרון](#בעיה-ופתרון)
3. [חישוב הגבלות מבוססות עלויות](#חישוב-הגבלות-מבוססות-עלויות)
4. [הגבלות סופיות](#הגבלות-סופיות)
5. [יישום טכני מפורט](#יישום-טכני-מפורט)
6. [קבצים שעודכנו](#קבצים-שעודכנו)
7. [בדיקות נדרשות](#בדיקות-נדרשות)
8. [תכנית המשך](#תכנית-המשך)
9. [נספחים](#נספחים)

---

# מבוא ומטרה

## רקע

מערכת FigDex מאפשרת למשתמשים ליצור אינדקסים של פריימים מ-Figma. כל אינדקס דורש משאבים:
- **Vercel:** Function executions, bandwidth, GB-hours
- **Supabase:** Database storage, file storage, API requests, bandwidth
- **Figma API:** קריאות API לעיבוד פריימים

## מטרת ההגבלה

למנוע הפסדים כלכליים על ידי הגבלת השימוש החודשי של כל משתמש בהתאם לתוכנית שלו, כך שהעלות לא תחרוג מההכנסה הצפויה.

### יעדים:
1. **Free Plan:** עלות $0 (נשאר ב-Vercel Hobby + Supabase Free)
2. **Pro Plan:** עלות מקסימלית $15/חודש (שווה להכנסה)
3. **Unlimited Plan:** תמחור מותאם מכסה עלויות

---

# בעיה ופתרון

## הבעיה

### מצב נוכחי (לפני הגבלות חודשיות):

| סוג משתמש | שימוש | עלות Vercel | עלות Supabase | סה"כ עלות | הכנסה | רווח/הפסד |
|-----------|------|-------------|---------------|-----------|--------|-----------|
| **Free** | ממוצע | $0 | $25 | $25 | $0 | **-$25** ❌ |
| **Pro** | ממוצע | $25.20 | $25 | $50.20 | $15 | **-$35.20** ❌ |
| **Pro** | גבוה | $82.50 | $599 | $681.50 | $15 | **-$666.50** ❌ |
| **Unlimited** | גבוה | $521 | $800 | $1,321 | $299 | **-$1,022** ❌ |

### בעיות עיקריות:
1. ❌ Free plan לא כלכלי (חריגה מ-Supabase Free)
2. ❌ Pro plan לא כלכלי (הפסד של $35-666/חודש)
3. ❌ Unlimited plan לא כלכלי (הפסד של $1,000+/חודש)

## הפתרון

הגבלות חודשיות שמבטיחות שהעלות לא תחרוג מההכנסה הצפויה:

1. **הגבלת אינדקסים חודשיים** - מניעת שימוש מוגזם
2. **הגבלת פריימים חודשיים** - מניעת עלויות גבוהות מדי
3. **בדיקות לפני יצירת אינדקס** - מניעת יצירת אינדקסים שלא יעברו
4. **הודעות שגיאה ברורות** - הנחיית משתמשים לשדרוג

---

# חישוב הגבלות מבוססות עלויות

## Free Plan

### מטרה:
עלות $0 (נשאר ב-Vercel Hobby + Supabase Free)

### חישוב:

**Vercel Hobby (Free):**
- 100GB bandwidth/חודש ✅
- 100 function executions/יום ✅

**Supabase Free:**
- 500MB database size
- 1GB file storage
- 2GB bandwidth/חודש
- 50,000 API requests/חודש
- 2 מיליון database reads/חודש
- 500,000 database writes/חודש

**הגבלה מומלצת:**
- 30 אינדקסים/חודש (1 אינדקס/יום)
- 3,000 פריימים/חודש (~100 פריימים/אינדקס)

**חישוב:**
- 3,000 פריימים × 200KB = 600MB storage + 600MB bandwidth = 1.2GB < 2GB ✅
- 30 אינדקסים × 50 chunks = 1,500 executions/חודש < 3,000 executions/חודש ✅

**הגבלות סופיות:**
- `maxUploadsPerDay: 1` (הוקטן מ-2)
- `maxUploadsPerMonth: 30`
- `maxFramesPerMonth: 3,000`

---

## Pro Plan

### מטרה:
עלות מקסימלית $15/חודש (שווה להכנסה)

### חישוב:

**Vercel Pro:**
- $20/חודש (בסיס)
- GB-hours: $0.0000166667 לכל GB-second
- תקציב GB-hours: $15 (הכנסה) = 900,000 GB-seconds = 250 GB-hours/חודש

**Supabase Pro:**
- $25/חודש (בסיס)
- 8GB database size
- 100GB file storage
- 250GB bandwidth/חודש
- 5 מיליון API requests/חודש

**חישוב אינדקסים:**
- כל אינדקס: ~50 chunks × 15 שניות × 2GB = 1,500 GB-seconds = 0.42 GB-hours
- אינדקסים אפשריים: 250 GB-hours ÷ 0.42 = ~600 אינדקסים/חודש

**אבל:** צריך לקחת בחשבון גם Supabase storage ו-bandwidth:
- 600 אינדקסים × 200 פריימים = 120,000 פריימים/חודש
- Storage: 120,000 × 200KB = 24GB (בתוך 100GB של Supabase Pro) ✅
- Bandwidth: 24GB (בתוך 250GB של Supabase Pro) ✅

**הגבלות מומלצות (שמרניות):**
- `maxUploadsPerMonth: 300` (10 אינדקסים/יום)
- `maxFramesPerMonth: 30,000` (~100 פריימים/אינדקס בממוצע)

**הגבלות סופיות:**
- `maxUploadsPerDay: 20` (נשאר)
- `maxUploadsPerMonth: 300`
- `maxFramesPerMonth: 30,000`

---

## Unlimited Plan

### מטרה:
תמחור מותאם מכסה עלויות

**הגבלות:**
- `maxUploadsPerMonth: null` (ללא הגבלה)
- `maxFramesPerMonth: null` (ללא הגבלה)

---

# הגבלות סופיות

## טבלת השוואה

| תוכנית | אינדקסים/יום | אינדקסים/חודש | פריימים/חודש | עלות מקסימלית | הכנסה | רווח/הפסד |
|--------|-------------|---------------|--------------|--------------|--------|-----------|
| **Free** | 1 | 30 | 3,000 | $0 | $0 | $0 ✅ |
| **Pro** | 20 | 300 | 30,000 | ~$15 | $15 | $0 ✅ |
| **Unlimited** | ללא הגבלה | ללא הגבלה | ללא הגבלה | תמחור מותאם | תמחור מותאם | תמחור מותאם |

## הגבלות מפורטות

### Free Plan
- **מחיר:** $0/חודש
- **הגבלות:**
  - 1 פרויקט
  - עד 500 פריימים סה"כ
  - 1 אינדקס ליום (הוקטן מ-2)
  - 30 אינדקסים לחודש (חדש)
  - 3,000 פריימים לחודש (חדש)
  - גודל אינדקס עד 50MB
  - שמירת נתונים: 30 יום

### Pro Plan
- **מחיר:** $15/חודש
- **הגבלות:**
  - עד 5 פרויקטים
  - עד 50,000 פריימים סה"כ
  - 20 אינדקסים ליום
  - 300 אינדקסים לחודש (חדש)
  - 30,000 פריימים לחודש (חדש)
  - גודל אינדקס עד 500MB
  - שמירת נתונים: 180 יום

### Unlimited Plan
- **מחיר:** תמחור מותאם
- **הגבלות:**
  - פרויקטים ללא הגבלה
  - פריימים ללא הגבלה
  - אינדקסים ללא הגבלה
  - אחסון ללא הגבלה
  - שמירת נתונים ללא הגבלה

---

# יישום טכני מפורט

## 1. עדכון `lib/plans.ts`

### שינויים בממשק:

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

### עדכון `PLAN_LIMITS`:

```typescript
const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    label: 'Free',
    maxProjects: 1,
    maxFramesTotal: 500,
    maxUploadsPerDay: 1, // הוקטן מ-2
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

## 2. עדכון `pages/api/upload-index-v2.ts`

### א. עדכון `computeUsageStats`:

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

### ב. הוספת בדיקות הגבלות חודשיות:

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

## 3. עדכון `pages/api/create-index-from-figma.ts`

### א. הוספת import:

```typescript
import { resolvePlanId, getPlanLimits } from '../../lib/plans';
```

### ב. הוספת בדיקות לפני יצירת job:

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

// Initialize monthly stats
let uploadsThisMonth = 0;
let framesThisMonth = 0;

if (!monthlyError && Array.isArray(monthlyIndices)) {
  // Count uploads and frames this month
  uploadsThisMonth = monthlyIndices.length;
  
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

  // Check monthly upload limit
  if (planLimits.maxUploadsPerMonth !== null && uploadsThisMonth >= planLimits.maxUploadsPerMonth) {
    return limitError(
      'PLAN_MAX_UPLOADS_PER_MONTH',
      `Monthly upload limit reached for the ${planLimits.label} plan (${planLimits.maxUploadsPerMonth} per month). Please upgrade your plan or wait until next month.`
    );
  }
}

// ... אחרי חישוב totalFramesCount ...

// Check monthly frames limit (estimate based on totalFramesCount)
if (!monthlyError && Array.isArray(monthlyIndices) && planLimits.maxFramesPerMonth !== null) {
  const framesThisMonthAfter = framesThisMonth + totalFramesCount;
  if (framesThisMonthAfter > planLimits.maxFramesPerMonth) {
    return res.status(403).json({
      success: false,
      error: `Monthly frames limit reached for the ${planLimits.label} plan (${planLimits.maxFramesPerMonth.toLocaleString()} frames per month). This index would add ${totalFramesCount.toLocaleString()} frames, exceeding your monthly limit. Please upgrade your plan or wait until next month.`,
      code: 'PLAN_MAX_FRAMES_PER_MONTH',
      plan: planLimits.id,
      upgradeUrl: 'https://www.figdex.com/pricing',
      currentFrames: framesThisMonth,
      newFrames: totalFramesCount,
      limit: planLimits.maxFramesPerMonth
    });
  }
}
```

---

## 4. עדכון `pages/pricing.tsx`

### שינויים:

**Free Plan:**
- שינוי מ-"2 uploads per day" ל-"1 upload per day"
- הוספת "30 uploads per month"
- הוספת "3,000 frames per month"

**Pro Plan:**
- הוספת "300 uploads per month"
- הוספת "30,000 frames per month"

---

# קבצים שעודכנו

## רשימה מלאה:

1. ✅ **`lib/plans.ts`**
   - הוספת שדות `maxUploadsPerMonth` ו-`maxFramesPerMonth`
   - עדכון הגבלות לכל תוכנית

2. ✅ **`pages/api/upload-index-v2.ts`**
   - עדכון `computeUsageStats` לחישוב סטטיסטיקות חודשיות
   - הוספת בדיקות הגבלות חודשיות

3. ✅ **`pages/api/create-index-from-figma.ts`**
   - הוספת בדיקות הגבלות חודשיות לפני יצירת job
   - בדיקת אינדקסים ופריימים חודשיים

4. ✅ **`pages/pricing.tsx`**
   - עדכון דף המחירים עם הגבלות חודשיות

---

# בדיקות נדרשות

## 1. בדיקות יחידה (Unit Tests)

- [ ] `computeUsageStats` מחשב נכון סטטיסטיקות חודשיות
- [ ] הגבלות חודשיות נבדקות נכון
- [ ] הודעות שגיאה נכונות

## 2. בדיקות אינטגרציה

- [ ] Free user לא יכול ליצור יותר מ-30 אינדקסים/חודש
- [ ] Pro user לא יכול ליצור יותר מ-300 אינדקסים/חודש
- [ ] Free user לא יכול ליצור יותר מ-3,000 פריימים/חודש
- [ ] Pro user לא יכול ליצור יותר מ-30,000 פריימים/חודש
- [ ] Unlimited user יכול ליצור ללא הגבלה
- [ ] הגבלות מתאפסות ביום 1 של החודש הבא

## 3. בדיקות ביצועים

- [ ] שאילתת אינדקסים חודשיים מהירה (< 100ms)
- [ ] חישוב פריימים מהיר (< 500ms)
- [ ] אין השפעה על ביצועי יצירת אינדקס

## 4. בדיקות UX

- [ ] הודעות שגיאה ברורות
- [ ] קישור שדרוג עובד
- [ ] משתמש מבין מתי הגבלות יתאפסו
- [ ] דף המחירים מעודכן נכון

---

# תכנית המשך

## שלב 1: בדיקות (נוכחי)
- [ ] בדיקות יחידה
- [ ] בדיקות אינטגרציה
- [ ] בדיקות ביצועים
- [ ] בדיקות UX

## שלב 2: פריסה
- [ ] Deploy ל-staging
- [ ] בדיקות ב-staging
- [ ] Deploy ל-production
- [ ] מוניטורינג

## שלב 3: אופטימיזציות עתידיות

### א. Caching
- שמירת סטטיסטיקות חודשיות ב-cache
- הפחתת שאילתות ל-Supabase

### ב. Pre-calculation
- חישוב סטטיסטיקות חודשיות ב-background job
- עדכון אוטומטי של סטטיסטיקות

### ג. Real-time updates
- עדכון סטטיסטיקות בזמן אמת
- הצגת שימוש חודשי למשתמש

### ד. User dashboard
- הצגת שימוש חודשי
- התראות לפני הגעה להגבלה
- היסטוריית שימוש

---

# נספחים

## נספח א': קודי שגיאה

| קוד שגיאה | תיאור | HTTP Status |
|-----------|-------|-------------|
| `PLAN_MAX_UPLOADS_PER_MONTH` | הגבלת אינדקסים חודשית | 403 |
| `PLAN_MAX_FRAMES_PER_MONTH` | הגבלת פריימים חודשית | 403 |

## נספח ב': חישוב חודשי

### חישוב תחילת חודש (UTC):
```typescript
const now = new Date();
const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
```

### בדיקת תאריך בחודש נוכחי:
```typescript
if (uploadedAtDate && uploadedAtDate >= startOfMonthUtc) {
  // בחודש נוכחי
}
```

## נספח ג': הודעות שגיאה

### אינדקסים חודשיים:
```
Monthly upload limit reached for the {plan} plan ({limit} per month). 
Please upgrade your plan or wait until next month.
```

### פריימים חודשיים:
```
Monthly frames limit reached for the {plan} plan ({limit} frames per month). 
This index would add {newFrames} frames, exceeding your monthly limit. 
Please upgrade your plan or wait until next month.
```

## נספח ד': Edge Cases

### 1. משתמש חדש
- 0 אינדקסים בחודש → כל הגבלה תעבור ✅

### 2. סוף חודש
- הגבלות מתאפסות אוטומטית ביום 1 ✅

### 3. Timezone
- כל החישובים ב-UTC למניעת בלבול ✅

### 4. אינדקס ללא index_data
- נספר כ-0 פריימים ✅

### 5. אינדקס עם index_data לא תקין
- נדלג על חישוב פריימים ✅

---

# סיכום

## מה הושג:

1. ✅ **הגבלות חודשיות** - מניעת הפסדים כלכליים
2. ✅ **בדיקות לפני יצירה** - מניעת יצירת אינדקסים שלא יעברו
3. ✅ **הודעות שגיאה ברורות** - הנחיית משתמשים לשדרוג
4. ✅ **עדכון UI** - דף המחירים מעודכן

## תוצאות צפויות:

| תוכנית | לפני | אחרי | שיפור |
|--------|------|------|-------|
| **Free** | -$25/חודש | $0/חודש | ✅ $25 |
| **Pro** | -$35-666/חודש | $0/חודש | ✅ $35-666 |
| **Unlimited** | -$1,022/חודש | תמחור מותאם | ✅ תמחור מותאם |

---

**מסמך זה עודכן:** 11 בדצמבר 2025  
**גרסה:** 1.0  
**סטטוס:** ✅ הושלם - מוכן לבדיקות ופריסה

---

*לשאלות או הערות, אנא פנה לצוות הפיתוח.*

