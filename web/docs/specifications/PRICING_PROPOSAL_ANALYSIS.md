# ניתוח תמחור מוצע - Pricing Proposal Analysis

**תאריך:** 11 בדצמבר 2025  
**מטרה:** ניתוח התמחור המוצע מול הניתוח הכלכלי הקיים

---

## 📊 התמחור המוצע

### 🆓 Free
- **1 Figma file**
- **Up to 300 frames**
- **One-time index** (לא חודשי)
- **Basic search**
- **Private access only**
- **Price:** $0

### 💼 Pro — $15 / month
- **Up to 10 files**
- **Up to 5,000 frames total**
- **Re-index: 1× per month / file**
- **Advanced search & filters**
- **Private galleries**
- **Standard processing priority**

### 👥 Team — $39 / month
- **Up to 30 files**
- **Up to 15,000 frames total**
- **Re-index: weekly**
- **Team sharing**
- **Public galleries**
- **Faster job queue**
- **Team-level visibility**

### 🏢 Enterprise — Custom
- **Custom file limits**
- **Custom frame limits**
- **On-demand re-index**
- **Dedicated processing capacity**
- **SLA & priority support**
- **Permissions & audit logs**
- **Assisted onboarding**

### ➕ Add-ons
- **+5 files → $7 / month**
- **+10 files → $12 / month**

---

## 💰 ניתוח כלכלי

### 🆓 Free Plan - ניתוח

**הגבלות מוצעות:**
- 1 file
- 300 frames
- One-time index (לא חודשי)
- Basic search

**השוואה למצב הנוכחי:**
- **נוכחי:** 1 project, 500 frames, 30 indexes/חודש, 3,000 frames/חודש
- **מוצע:** 1 file, 300 frames, one-time index

**עלות צפויה:**
- **Storage:** 300 frames × 200KB = 60MB ✅ (בתוך Supabase Free 1GB)
- **Bandwidth:** 60MB upload ✅ (בתוך Supabase Free 2GB)
- **Database:** 300 × 5KB = 1.5MB ✅ (בתוך Supabase Free 500MB)
- **API requests:** מינימלי (one-time) ✅

**✅ הערכה:** **כלכלי** - עלות $0, נשאר בתוך Supabase Free

**⚠️ בעיה פוטנציאלית:**
- "One-time index" יכול להיות מבלבל - האם זה אומר שאין אפשרות לעדכן?
- האם צריך להסביר "או עדכון חד-פעמי אחרי X זמן"?

---

### 💼 Pro Plan - ניתוח

**הגבלות מוצעות:**
- 10 files
- 5,000 frames total
- Re-index: 1× per month / file
- $15/month

**השוואה למצב הנוכחי:**
- **נוכחי:** 5 projects, 50,000 frames, 20 indexes/יום, 300/חודש, 30,000 frames/חודש
- **מוצע:** 10 files, 5,000 frames total, 10 re-indexes/חודש

**חישוב שימוש:**
- **Re-indexes:** 10 files × 1×/חודש = 10 indexes/חודש
- **Storage:** 5,000 frames × 200KB = 1GB ✅ (בתוך Supabase Pro 100GB)
- **Bandwidth:** ~1GB/חודש ✅ (בתוך Supabase Pro 250GB)
- **Database:** 5,000 × 5KB = 25MB ✅ (בתוך Supabase Pro 8GB)

**עלות GB-hours:**
- 10 indexes × 50 chunks × 15s × 2GB = 15,000 GB-seconds = 4.17 GB-hours/חודש
- **עלות:** 4.17 × $0.0000166667 = **~$0.07/חודש** ✅

**עלות כוללת:**
- **Vercel:** $20 (בסיס) + $0.07 GB-hours = $20.07
- **Supabase:** $25 (בסיס)
- **סה"כ:** $45.07/חודש
- **הכנסה:** $15/חודש
- **הפסד:** **-$30.07/חודש** ❌

**❌ בעיה:** **לא כלכלי!**

**פתרון אפשרי:**
1. **הגבל frames:** 5,000 frames זה הרבה - רוב המשתמשים ישתמשו בפחות
2. **הגבל re-indexes:** 10 files × 1× = 10 indexes/חודש זה מעט מאוד
3. **העלה מחיר:** Pro → $29/חודש

---

### 👥 Team Plan - ניתוח

**הגבלות מוצעות:**
- 30 files
- 15,000 frames total
- Re-index: weekly
- $39/month

**חישוב שימוש:**
- **Re-indexes:** 30 files × 4×/חודש (weekly) = 120 indexes/חודש
- **Storage:** 15,000 frames × 200KB = 3GB ✅ (בתוך Supabase Pro 100GB)
- **Bandwidth:** ~3GB/חודש ✅ (בתוך Supabase Pro 250GB)
- **Database:** 15,000 × 5KB = 75MB ✅ (בתוך Supabase Pro 8GB)

**עלות GB-hours:**
- 120 indexes × 50 chunks × 15s × 2GB = 180,000 GB-seconds = 50 GB-hours/חודש
- **עלות:** 50 × $0.0000166667 = **~$0.83/חודש** ✅

**עלות כוללת:**
- **Vercel:** $20 (בסיס) + $0.83 GB-hours = $20.83
- **Supabase:** $25 (בסיס)
- **סה"כ:** $45.83/חודש
- **הכנסה:** $39/חודש
- **הפסד:** **-$6.83/חודש** ❌

**❌ בעיה:** **כמעט לא כלכלי** - הפסד קטן אבל עדיין הפסד

---

## 🎯 המלצות לשיפור

### 1. Free Plan - ✅ מעולה

**הצעה:**
- ✅ שמור כמו שמוצע
- ✅ הוסף הבהרה: "One-time index, או עדכון חד-פעמי אחרי 30 יום"

---

### 2. Pro Plan - צריך שיפור

**בעיות:**
- ❌ לא כלכלי ($30 הפסד)
- ⚠️ 5,000 frames total - יכול להיות מבלבל (total כל הזמן או per index?)

**הצעות:**

#### אופציה A: הגבל frames
```
Pro — $15 / month
- Up to 10 files
- Up to 2,000 frames total (במקום 5,000)
- Re-index: 1× per month / file
```

**חישוב:**
- Storage: 2,000 × 200KB = 400MB ✅
- GB-hours: אותו דבר (~$0.07)
- **עלות:** $45/חודש
- **הכנסה:** $15/חודש
- **עדיין הפסד:** -$30/חודש ❌

#### אופציה B: העלה מחיר
```
Pro — $29 / month (במקום $15)
- Up to 10 files
- Up to 5,000 frames total
- Re-index: 1× per month / file
```

**חישוב:**
- **עלות:** $45/חודש
- **הכנסה:** $29/חודש
- **הפסד:** -$16/חודש ❌ (עדיין לא טוב)

#### אופציה C: הגבל re-indexes
```
Pro — $15 / month
- Up to 10 files
- Up to 5,000 frames total
- Re-index: 5 files × 1× / month (במקום 10)
- או: 10 total re-indexes / month (לא per file)
```

**חישוב:**
- Re-indexes: 5 indexes/חודש (במקום 10)
- GB-hours: 2.5 × $0.0000166667 = ~$0.04
- **עלות:** $45/חודש
- **הכנסה:** $15/חודש
- **עדיין הפסד:** -$30/חודש ❌

#### אופציה D: שילוב (מומלץ) ⭐
```
Pro — $24 / month
- Up to 10 files
- Up to 3,000 frames total
- Re-index: 1× per month / file (max 10/month)
- Advanced search & filters
```

**חישוב:**
- Storage: 3,000 × 200KB = 600MB ✅
- GB-hours: ~$0.07 ✅
- **עלות:** $45/חודש
- **הכנסה:** $24/חודש
- **הפסד:** -$21/חודש ❌ (עדיין לא טוב)

#### אופציה E: Realistic (הכי מומלץ) ⭐⭐
```
Pro — $29 / month
- Up to 10 files
- Up to 5,000 frames total
- Re-index: 1× per month / file (max 10/month)
- Advanced search & filters
- Private galleries
```

**חישוב:**
- **עלות:** $45/חודש
- **הכנסה:** $29/חודש
- **הפסד:** -$16/חודש

**אבל:** אם נניח שרוב המשתמשים ישתמשו ב-5-7 files בממוצע:
- 7 files × 1× = 7 indexes/חודש
- GB-hours: 3.5 × $0.0000166667 = ~$0.05
- **עלות:** $45.05/חודש
- **הכנסה:** $29/חודש
- **הפסד:** -$16/חודש

**⚠️ עדיין לא כלכלי**, אבל:
- רוב המשתמשים ישתמשו בפחות מהמקסימום
- זה יכול לעבוד אם רוב המשתמשים ישלמו אבל לא ישתמשו במקסימום

---

### 3. Team Plan - צריך שיפור

**בעיות:**
- ❌ הפסד של $6.83/חודש

**הצעות:**

#### אופציה A: העלה מחיר
```
Team — $49 / month (במקום $39)
```

**חישוב:**
- **עלות:** $45.83/חודש
- **הכנסה:** $49/חודש
- **רווח:** $3.17/חודש ✅

#### אופציה B: הגבל re-indexes
```
Team — $39 / month
- Re-index: 2× per month / file (במקום weekly)
```

**חישוב:**
- Re-indexes: 30 files × 2× = 60 indexes/חודש (במקום 120)
- GB-hours: 25 × $0.0000166667 = ~$0.42
- **עלות:** $45.42/חודש
- **הכנסה:** $39/חודש
- **הפסד:** -$6.42/חודש ❌

#### אופציה C: שילוב (מומלץ) ⭐
```
Team — $49 / month
- Up to 30 files
- Up to 15,000 frames total
- Re-index: weekly (4× / month / file)
- Team sharing, public galleries, etc.
```

**רווח:** $3.17/חודש ✅

---

## 📊 השוואה מפורטת

| Plan | מחיר | עלות | רווח/הפסד | הערכה |
|------|------|------|-----------|-------|
| **Free (מוצע)** | $0 | $0 | $0 | ✅ מעולה |
| **Pro (מוצע)** | $15 | $45 | **-$30** | ❌ לא כלכלי |
| **Pro (מחיר $29)** | $29 | $45 | **-$16** | ⚠️ עדיין לא טוב |
| **Team (מוצע)** | $39 | $45.83 | **-$6.83** | ❌ כמעט לא כלכלי |
| **Team ($49)** | $49 | $45.83 | **$3.17** | ✅ בסדר |

---

## 🎯 המלצות סופיות

### Free Plan - ✅ שמור כמו שמוצע
מצוין! כלכלי ונותן Aha moment.

---

### Pro Plan - ⚠️ צריך שינוי

**אופציה מומלצת:**
```
Pro — $29 / month
- Up to 10 files
- Up to 5,000 frames total
- Re-index: 1× per month / file (max 10/month)
- Advanced search & filters
- Private galleries
```

**למה:**
- עדיין לא כלכלי לחלוטין (-$16/חודש)
- אבל רוב המשתמשים ישתמשו בפחות מהמקסימום
- $29 נשמע סביר יותר מ-$15
- עדיין נגיש

**או אלטרנטיבה:**
```
Pro — $24 / month
- Up to 10 files
- Up to 3,000 frames total (במקום 5,000)
- Re-index: 1× per month / file
```

---

### Team Plan - ⚠️ צריך שינוי

**אופציה מומלצת:**
```
Team — $49 / month (במקום $39)
- Up to 30 files
- Up to 15,000 frames total
- Re-index: weekly
- Team sharing, public galleries, etc.
```

**למה:**
- רווח קטן אבל חיובי ($3/חודש)
- $49 עדיין סביר ל-Team plan
- עדיין נמוך מ-$99 שהיה מקובל בעבר

---

### Add-ons - ✅ מעולה

**מצוין!** זה עובד טוב.

---

## 💡 תובנות פסיכולוגיות

### ✅ מה עובד טוב:

1. **Free Plan:**
   - "One-time index" - מבהיר שזה לא unlimited
   - "300 frames" - מספר "עגול"
   - Aha moment בלי שימוש קבוע חינמי

2. **Pro Plan:**
   - "10 files" - מספר "עגול" ונשמע נדיב
   - "5,000 frames total" - מספר גדול שמרגיש unlimited

3. **Team Plan:**
   - "weekly re-index" - ברור ומדיד
   - "Team sharing" - ערך ברור

4. **Add-ons:**
   - Gradual commitment - לא צריך לשדרג plan
   - Anchoring - החבילה הבסיסית גורמת לאד-און להרגיש קטן

### ⚠️ מה צריך שיפור:

1. **Pro Plan:**
   - $15 לא כלכלי
   - צריך $29 או להגביל יותר

2. **Team Plan:**
   - $39 לא כלכלי
   - צריך $49

3. **הבהרות:**
   - "frames total" - האם זה cumulative או per index?
   - "Re-index 1× per month / file" - האם זה stackable או max total?

---

## ✅ תמחור מומלץ (סופי)

### 🆓 Free — $0
- 1 Figma file
- Up to 300 frames
- One-time index (או עדכון אחרי 30 יום)
- Basic search
- Private access only

### 💼 Pro — $29 / month ⬆️
- Up to 10 files
- Up to 5,000 frames total
- Re-index: 1× per month / file (max 10/month)
- Advanced search & filters
- Private galleries
- Standard processing priority

### 👥 Team — $49 / month ⬆️
- Up to 30 files
- Up to 15,000 frames total
- Re-index: weekly (4× / month / file)
- Team sharing
- Public galleries
- Faster job queue
- Team-level visibility

### 🏢 Enterprise — Custom
- Custom limits
- On-demand re-index
- Dedicated capacity
- SLA & priority support
- etc.

### ➕ Add-ons
- +5 files → $7 / month
- +10 files → $12 / month

---

**מסקנה:** התמחור המוצע מעולה מבחינה פסיכולוגית, אבל צריך להעלות מחירים ל-Pro ($29) ו-Team ($49) כדי להיות כלכלי.

---

**מסמך זה עודכן:** 11 בדצמבר 2025  
**גרסה:** 1.0

