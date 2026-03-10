# מודל מנוי פשוט + Add-ons + Rate Limiting

**תאריך:** 23 בדצמבר 2025  
**סטטוס:** אפיון מלא

---

## 🎯 סקירה כללית

### המודל החדש:
1. **מנוי בסיסי** - unlimited re-indexes למה שכלול
2. **Add-ons** - אפשרות לקנות עוד קבצים/פריימים
3. **Rate Limiting** - cooldown כדי למנוע שימוש יתר

---

## 📋 מבנה התמחור

### Free Plan - $0/חודש
```
✅ Included:
   - 1 קובץ
   - 300 פריימים
   - אינדוקס ראשוני + re-indexes (unlimited)
   - Max: 3 אינדוקסים ליום (rate limit)
```

### Pro Plan - $29/חודש
```
✅ Included:
   - 10 קבצים
   - 5,000 פריימים
   - אינדוקס ראשוני + re-indexes (unlimited)
   - Max: 20 אינדוקסים ליום (rate limit)
```

### Team Plan - $49/חודש
```
✅ Included:
   - 20 קבצים
   - 15,000 פריימים
   - אינדוקס ראשוני + re-indexים (unlimited)
   - Max: 50 אינדוקסים ליום (rate limit)
```

---

## 💰 Add-ons (רכישה נוספת)

### Add-on: קבצים נוספים
```
+1 קובץ: $5/חודש
+2 קבצים: $9/חודש (10% הנחה)
+5 קבצים: $20/חודש (20% הנחה)
+10 קבצים: $35/חודש (30% הנחה)
```

### Add-on: פריימים נוספים
```
+1,000 פריימים: $3/חודש
+2,000 פריימים: $5/חודש (17% הנחה)
+5,000 פריימים: $10/חודש (33% הנחה)
+10,000 פריימים: $18/חודש (40% הנחה)
```

### Add-on: Rate Limit מוגבר
```
+10 אינדוקסים ליום: $2/חודש
+20 אינדוקסים ליום: $3/חודש
+50 אינדוקסים ליום: $5/חודש
```

---

## 🛡️ Rate Limiting / Cooldown

### העיקרון:
**מגבלה על מספר אינדוקסים ביום כדי למנוע שימוש יתר**

### מנגנון:

#### 1. Tracking
- מעקב אחר מספר אינדוקסים ביום (מ-00:00 UTC)
- כולל אינדוקס ראשוני + re-indexes

#### 2. בדיקה לפני אינדוקס:
```typescript
// בדוק כמה אינדוקסים המשתמש עשה היום
const todayIndexes = await getTodayIndexCount(userId);

// בדוק את המגבלה שלו (base + add-ons)
const maxPerDay = getUserMaxIndexesPerDay(user);

if (todayIndexes >= maxPerDay) {
  // חשב זמן עד לאיפוס (00:00 UTC הבא)
  const timeUntilReset = getTimeUntilMidnightUTC();
  
  return error: "Daily limit reached. Try again in X hours."
}
```

#### 3. איפוס יומי:
- כל יום ב-00:00 UTC
- Counter מתאפס אוטומטית

#### 4. Cooldown נוסף (אופציונלי):
אם רוצים cooldown בין אינדוקסים:
```typescript
// Cooldown של 5 דקות בין אינדוקסים לאותו קובץ
const lastIndexTime = await getLastIndexTime(fileKey, userId);
const cooldownMinutes = 5;

if (lastIndexTime && (Date.now() - lastIndexTime) < cooldownMinutes * 60 * 1000) {
  return error: "Please wait X minutes before re-indexing this file."
}
```

---

## 🗄️ מבנה Database

### טבלה חדשה: `user_addons`
```sql
CREATE TABLE IF NOT EXISTS user_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addon_type VARCHAR NOT NULL, -- 'files', 'frames', 'rate_limit'
  addon_value INTEGER NOT NULL, -- מספר (קבצים, פריימים, אינדוקסים)
  price_usd DECIMAL(10, 2) NOT NULL,
  status VARCHAR DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  start_date DATE NOT NULL,
  end_date DATE, -- null = recurring
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, addon_type, start_date)
);

CREATE INDEX IF NOT EXISTS idx_user_addons_user_id ON user_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addons_status ON user_addons(status);
```

### טבלה חדשה: `daily_index_count`
```sql
CREATE TABLE IF NOT EXISTS daily_index_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- YYYY-MM-DD (UTC)
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_index_count_user_date ON daily_index_count(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_index_count_date ON daily_index_count(date);
```

### עדכון טבלת `users`:
```sql
-- לא צריך credits_remaining יותר (או נשאיר רק למורשת)
-- במקום זה נשתמש ב:
-- - plan limits (קבצים, פריימים)
-- - user_addons (תוספות)
-- - daily_index_count (rate limiting)
```

---

## 🔄 תזרימי עבודה

### Workflow 1: אינדוקס רגיל (בתוך המכסה)

```
1. משתמש מבקש אינדוקס
   ↓
2. בדיקות:
   - האם יש מספיק "מקום" בקבצים? (base + addons)
   - האם יש מספיק "מקום" בפריימים? (base + addons)
   - האם הגיע למגבלה היומית?
   - האם יש cooldown פעיל?
   ↓
3. אם הכל בסדר:
   - יוצר job
   - מעדכן daily_index_count
   - ממשיך עם האינדוקס
   ↓
4. אם נכשל:
   - מחזיר שגיאה ברורה
```

### Workflow 2: רכישת Add-on

```
1. משתמש רוצה עוד קבצים/פריימים
   ↓
2. בוחר Add-on:
   - +1 קובץ: $5/חודש
   ↓
3. תשלום (עתידי - Stripe)
   ↓
4. יוצר record ב-user_addons
   ↓
5. המכסה מתעדכנת אוטומטית
```

---

## 💻 Implementation

### 1. Helper Functions

```typescript
// lib/subscription-helpers.ts

/**
 * Get user's effective limits (base plan + addons)
 */
export async function getUserEffectiveLimits(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<{
  maxFiles: number;
  maxFrames: number;
  maxIndexesPerDay: number;
}> {
  // Get user plan
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();
  
  const planLimits = getPlanLimits(user.plan);
  let maxFiles = planLimits.maxProjects || 0;
  let maxFrames = planLimits.maxFramesTotal || 0;
  let maxIndexesPerDay = getPlanRateLimit(user.plan); // New function
  
  // Get active addons
  const { data: addons } = await supabaseAdmin
    .from('user_addons')
    .select('addon_type, addon_value')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('end_date', new Date().toISOString().split('T')[0])
    .or('end_date.is.null');
  
  if (addons) {
    for (const addon of addons) {
      if (addon.addon_type === 'files') {
        maxFiles += addon.addon_value;
      } else if (addon.addon_type === 'frames') {
        maxFrames += addon.addon_value;
      } else if (addon.addon_type === 'rate_limit') {
        maxIndexesPerDay += addon.addon_value;
      }
    }
  }
  
  return { maxFiles, maxFrames, maxIndexesPerDay };
}

/**
 * Check if user can create index (rate limiting)
 */
export async function canCreateIndex(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: string; waitUntil?: Date }> {
  const limits = await getUserEffectiveLimits(supabaseAdmin, userId);
  
  // Get today's count (UTC)
  const today = new Date().toISOString().split('T')[0];
  const { data: todayCount } = await supabaseAdmin
    .from('daily_index_count')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  
  const currentCount = todayCount?.count || 0;
  
  if (currentCount >= limits.maxIndexesPerDay) {
    // Calculate time until reset (midnight UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    return {
      allowed: false,
      reason: `Daily limit reached (${limits.maxIndexesPerDay} indexes/day). Reset at midnight UTC.`,
      waitUntil: tomorrow
    };
  }
  
  return { allowed: true };
}

/**
 * Increment daily index count
 */
export async function incrementDailyIndexCount(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  // Upsert: increment or create
  const { error } = await supabaseAdmin.rpc('increment_daily_index_count', {
    p_user_id: userId,
    p_date: today
  });
  
  // If RPC doesn't exist, do it manually
  if (error) {
    const { data: existing } = await supabaseAdmin
      .from('daily_index_count')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (existing) {
      await supabaseAdmin
        .from('daily_index_count')
        .update({ count: existing.count + 1 })
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabaseAdmin
        .from('daily_index_count')
        .insert({
          user_id: userId,
          date: today,
          count: 1
        });
    }
  }
}
```

### 2. SQL Functions

```sql
-- Function to increment daily index count
CREATE OR REPLACE FUNCTION increment_daily_index_count(
  p_user_id UUID,
  p_date DATE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_index_count (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = daily_index_count.count + 1;
END;
$$ LANGUAGE plpgsql;
```

### 3. Update create-index-from-figma.ts

```typescript
// לפני יצירת job:

// 1. בדוק מכסות (קבצים, פריימים)
const limits = await getUserEffectiveLimits(supabaseAdmin, user.id);
const currentFiles = await getCurrentFileCount(user.id);
const currentFrames = await getCurrentFrameCount(user.id);

if (currentFiles >= limits.maxFiles) {
  return error: "File limit reached. Purchase add-on or upgrade plan.";
}

if (currentFrames + estimatedFrames > limits.maxFrames) {
  return error: "Frame limit would be exceeded. Purchase add-on or upgrade plan.";
}

// 2. בדוק rate limiting
const canIndex = await canCreateIndex(supabaseAdmin, user.id);
if (!canIndex.allowed) {
  return error: canIndex.reason;
}

// 3. יוצר job
// ... existing code ...

// 4. אחרי ש-job נוצר בהצלחה:
await incrementDailyIndexCount(supabaseAdmin, user.id);
```

---

## 📊 דוגמאות שימוש

### משתמש Pro טיפוסי:
```
Pro Plan - $29/חודש:
- 10 קבצים ✅
- 5,000 פריימים ✅
- 20 אינדוקסים ליום ✅

שימוש:
- אינדוקס ראשוני של 10 קבצים = OK (לא נחשב ל-20)
- עדכון 5 קבצים = OK (5 אינדוקסים מתוך 20)
- עדכון 20 קבצים ביום = OK (20 אינדוקסים)
- עדכון 21 קבצים ביום = ❌ "Daily limit reached"
```

### משתמש עם Add-on:
```
Pro Plan - $29/חודש:
- 10 קבצים
- +5 קבצים Add-on ($20/חודש) = 15 קבצים סה"כ
- 20 אינדוקסים ליום
- +10 אינדוקסים Add-on ($2/חודש) = 30 אינדוקסים ליום

שימוש:
- יכול לעדכן 15 קבצים
- עד 30 אינדוקסים ליום
```

---

## 🔄 Migration Plan

### שלב 1: יצירת טבלאות חדשות
- ✅ `user_addons`
- ✅ `daily_index_count`
- ✅ SQL functions

### שלב 2: עדכון קוד
- ✅ Helper functions
- ✅ עדכון `create-index-from-figma.ts`
- ✅ הסרת בדיקת קרדיטים (או שמירה רק ל-Free)

### שלב 3: ממשק Add-ons
- ✅ דף לניהול Add-ons
- ✅ תצוגה בממשק המשתמש
- ✅ ממשק אדמין לניהול Add-ons

### שלב 4: הסרת מערכת קרדיטים (אופציונלי)
- ⚠️ רק אם רוצים להסיר לחלוטין
- או: שמירה רק ל-Free plan

---

## 🎯 Cooldown נוסף (אופציונלי)

### Cooldown בין אינדוקסים לאותו קובץ:

```typescript
// בדוק מתי היה האינדוקס האחרון לקובץ זה
const lastIndex = await getLastIndexTime(fileKey, userId);
const cooldownMinutes = 5; // או לפי plan

if (lastIndex) {
  const minutesSinceLastIndex = (Date.now() - lastIndex) / (1000 * 60);
  if (minutesSinceLastIndex < cooldownMinutes) {
    const waitMinutes = Math.ceil(cooldownMinutes - minutesSinceLastIndex);
    return error: `Please wait ${waitMinutes} minutes before re-indexing this file.`;
  }
}
```

### Cooldown לפי Plan:
```
Free: 30 דקות בין אינדוקסים לאותו קובץ
Pro: 5 דקות
Team: 1 דקה
```

---

## 📝 סיכום

### המודל החדש:
1. ✅ **פשוט** - אין קרדיטים, רק מכסות
2. ✅ **גמיש** - אפשר לקנות עוד (add-ons)
3. ✅ **מוגן** - rate limiting מונע שימוש יתר
4. ✅ **צפוי** - משתמש יודע בדיוק מה יש לו

### מה צריך לעשות:
1. יצירת טבלאות DB
2. Helper functions
3. עדכון create-index-from-figma.ts
4. ממשק Add-ons
5. הסרת קרדיטים (אופציונלי)

---

**Specification Version:** 1.0  
**Last Updated:** December 23, 2025  
**Status:** Ready for Implementation

