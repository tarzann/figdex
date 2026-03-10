# מודל תמחור פשוט - Simplified Pricing Model

**תאריך:** 11 בדצמבר 2025  
**מודל:** Soft Limits + Credits System

---

## 💡 הרעיון

**Pro Plan — $29/month:**

### Base Quotas (Soft Limits):
- **10 files** (quota)
- **5,000 frames** (quota)
- **1,000 credits / month**

### הגיון:
- **מה שמגיע ללימיט ראשון** - זה מה שקובע
- **Credits מאפשרים** לרכוש files, frames או indexes
- **עלות אינדקס:** 100 credits
- **Credits מתאפסים** ל-1,000 כל חודש אם נמוכים מ-1,000

---

## 📊 ניתוח המודל

### תרחיש 1: משתמש בסיסי

**שימוש:**
- 5 files indexed
- 2,000 frames total
- 5 indexes/חודש

**חישוב:**
- Files: 5/10 ✅ (לא הגעה ללימיט)
- Frames: 2,000/5,000 ✅ (לא הגעה ללימיט)
- Indexes: 5 × 100 = 500 credits
- **Credits נשארים:** 500/1,000
- **מתאפס ל-1,000** בחודש הבא ✅

**עלות:**
- GB-hours: 5 × 50 chunks × 15s × 2GB = 2.08 GB-hours = $0.035
- **סה"כ:** $45.035/חודש (תשתית + משתנה)
- **הכנסה:** $29/חודש
- **הפסד:** -$16/חודש

**אבל:** זה משתמש אחד. עם 2+ משתמשים זה רווחי.

---

### תרחיש 2: משתמש מגיע ללימיט Files

**שימוש:**
- 10 files indexed (הגעה ללימיט)
- 3,000 frames total
- רוצה לעשות עוד index

**מה קורה?**
- Files: 10/10 ⚠️ (הגעה ללימיט)
- Frames: 3,000/5,000 ✅ (עדיין יש מקום)
- **אבל:** רוצה לעשות index ל-file חדש

**פתרון עם Credits:**
- **+1 file quota:** 200 credits (לדוגמה)
- **1 index:** 100 credits
- **סה"כ:** 300 credits

**Credits נשארים:** 700/1,000 ✅

---

### תרחיש 3: משתמש מגיע ללימיט Frames

**שימוש:**
- 8 files indexed
- 5,000 frames total (הגעה ללימיט)
- רוצה לעשות עוד index

**מה קורה?**
- Files: 8/10 ✅ (עדיין יש מקום)
- Frames: 5,000/5,000 ⚠️ (הגעה ללימיט)
- **אבל:** רוצה לעשות index עם עוד frames

**פתרון עם Credits:**
- **+1,000 frames quota:** 150 credits (לדוגמה)
- **1 index:** 100 credits
- **סה"כ:** 250 credits

**Credits נשארים:** 750/1,000 ✅

---

### תרחיש 4: משתמש מגיע לשני הלימיטים

**שימוש:**
- 10 files indexed (הגעה ללימיט)
- 5,000 frames total (הגעה ללימיט)
- רוצה לעשות עוד index

**פתרון עם Credits:**
- **+1 file quota:** 200 credits
- **+1,000 frames quota:** 150 credits
- **1 index:** 100 credits
- **סה"כ:** 450 credits

**Credits נשארים:** 550/1,000 ✅

---

## 💰 Credit Costs (מוצע)

### Indexing:
- **1 file index** = 100 credits
- **1 file re-index** = 100 credits

### Quota Increases (monthly):
- **+1 file quota** = 200 credits / month
- **+2 files quota** = 350 credits / month
- **+5 files quota** = 800 credits / month
- **+1,000 frames quota** = 150 credits / month
- **+2,000 frames quota** = 280 credits / month
- **+5,000 frames quota** = 600 credits / month

### Purchase Additional Credits:
- **500 credits** = $10
- **1,000 credits** = $18
- **2,000 credits** = $35

---

## 📊 דוגמאות שימוש

### משתמש בסיסי (70% מהמשתמשים):

**שימוש:**
- 5 files
- 2,000 frames
- 5 indexes/חודש

**Credits:**
- 5 indexes × 100 = 500 credits
- **נשארים:** 500/1,000
- **מתאפס ל-1,000** בחודש הבא ✅

**עלות:** $45/חודש
**הכנסה:** $29/חודש
**הפסד:** -$16/חודש (אבל עם 2+ משתמשים זה רווחי)

---

### משתמש בינוני (20% מהמשתמשים):

**שימוש:**
- 8 files
- 4,000 frames
- 8 indexes/חודש

**Credits:**
- 8 indexes × 100 = 800 credits
- **נשארים:** 200/1,000
- **מתאפס ל-1,000** בחודש הבא ✅

**עלות:** $45/חודש
**הכנסה:** $29/חודש
**הפסד:** -$16/חודש

---

### משתמש כבד (10% מהמשתמשים):

**שימוש:**
- 10 files (הגעה ללימיט)
- 5,000 frames (הגעה ללימיט)
- 12 indexes/חודש

**Credits:**
- 10 indexes (base quota) = 0 credits (כלול)
- 2 indexes נוספים = 200 credits
- **נשארים:** 800/1,000 ✅

**או אם רוצה עוד files:**
- +2 files quota = 350 credits
- 2 indexes נוספים = 200 credits
- **סה"כ:** 550 credits
- **נשארים:** 450/1,000 ✅

**אם צריך יותר:**
- קניית 1,000 credits = $18
- **סה"כ:** $47/חודש

**עלות:** $45/חודש
**הכנסה:** $47/חודש
**רווח:** $2/חודש ✅

---

## 🎯 יתרונות המודל

### ✅ פשוט להבנה:
- "יש לך 10 files ו-5,000 frames"
- "אם צריך יותר, השתמש ב-credits"
- "1 index = 100 credits"

### ✅ גמיש:
- משתמש יכול לבחור מה הוא צריך
- Files או Frames - מה שמגיע ראשון
- Credits לחריגות

### ✅ Fair:
- Base quota נדיב (10 files, 5,000 frames)
- רוב המשתמשים לא יגיעו ללימיט
- רק משתמשים כבדים יצטרכו credits

### ✅ כלכלי:
- עם 2+ משתמשים: רווחי
- משתמשים כבדים משלמים יותר (קניית credits)
- הכנסה ממוצעת: $29-35/משתמש

---

## ⚠️ נקודות לדיון

### 1. מה קורה כש-multiple indexes לאותו file?

**אופציה A:** כל index עולה 100 credits
- File 1: index ראשון = 0 credits (כלול ב-quota)
- File 1: re-index = 100 credits

**אופציה B:** Re-index עולה פחות
- File 1: index ראשון = 0 credits
- File 1: re-index = 50 credits

**המלצה:** אופציה A (100 credits לכל index) - פשוט יותר.

---

### 2. Credits מתאפסים - איך זה עובד?

**הצעה:**
- כל חודש ב-1 לחודש, 00:00 UTC
- אם credits < 1,000 → מתאפס ל-1,000
- אם credits ≥ 1,000 → נשאר כמו שהוא

**דוגמה:**
- חודש 1: 500 credits → מתאפס ל-1,000
- חודש 2: 1,200 credits → נשאר 1,200
- חודש 3: 800 credits → מתאפס ל-1,000

**למה זה טוב:**
- ✅ משתמשים לא "מפסידים" credits
- ✅ מעודד שימוש חודשי
- ✅ פשוט להסביר

---

### 3. מה עם Free Plan?

**הצעה:**
- **1 file**
- **300 frames**
- **0 credits** (או 100 credits one-time)
- **One-time index** (או עדכון אחרי 30 יום)

---

## 📋 מבנה סופי מוצע

### 🆓 Free — $0/month

- **1 file** (quota)
- **300 frames** (quota)
- **0 credits** (או 100 credits one-time)
- **One-time index** (או עדכון אחרי 30 יום)
- Basic search
- Private only

---

### 💼 Pro — $29/month

- **10 files** (quota)
- **5,000 frames** (quota)
- **1,000 credits / month** (מתאפס ל-1,000 אם נמוך)
- Advanced search & filters
- Private galleries
- Standard priority

**Credit Costs:**
- 1 index = 100 credits
- +1 file quota = 200 credits/month
- +1,000 frames quota = 150 credits/month

**Purchase Credits:**
- 500 credits = $10
- 1,000 credits = $18
- 2,000 credits = $35

---

### 👥 Team — $49/month

- **20 files** (quota)
- **15,000 frames** (quota)
- **2,000 credits / month** (מתאפס ל-2,000 אם נמוך)
- Team sharing
- Public galleries
- Faster queue

**Credit Costs (discounted):**
- 1 index = 100 credits
- +2 files quota = 300 credits/month
- +1,000 frames quota = 120 credits/month

**Purchase Credits:**
- 1,000 credits = $18
- 2,000 credits = $35
- 5,000 credits = $80

---

## 💰 ניתוח כלכלי

### Pro Plan ($29/month):

**תרחיש ממוצע (5 משתמשים):**

**משתמש 1-3 (בסיסי - 60%):**
- 5 files, 2,000 frames, 5 indexes
- Credits: 500/1,000
- **Cost:** $29/חודש

**משתמש 4 (בינוני - 20%):**
- 8 files, 4,000 frames, 8 indexes
- Credits: 800/1,000
- **Cost:** $29/חודש

**משתמש 5 (כבד - 20%):**
- 10 files, 5,000 frames, 12 indexes
- Credits: 200/1,000 + קניית 1,000 = $18
- **Cost:** $47/חודש

**חישוב:**
- **הכנסות:** (3 × $29) + $29 + $47 = $163/חודש
- **עלויות:** $45 (תשתית) + $10 (משתנה) = $55/חודש
- **רווח:** $108/חודש ✅
- **Margin:** 66% ✅

---

## ✅ המלצה

**המודל הזה מעולה!** ⭐⭐⭐

**למה:**
1. ✅ **פשוט** - "10 files, 5,000 frames, 1,000 credits"
2. ✅ **גמיש** - credits לחריגות
3. ✅ **הוגן** - base quota נדיב
4. ✅ **כלכלי** - רווחי מ-2 משתמשים
5. ✅ **Scalable** - קל להוסיף features

**שיפורים קטנים:**
- Re-index יכול לעלות פחות (50 credits במקום 100)
- Credits מתאפסים - מעולה!
- Base quota נדיב - מעולה!

---

**מסמך זה עודכן:** 11 בדצמבר 2025  
**גרסה:** 1.0

