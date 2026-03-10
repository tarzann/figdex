# Supabase Disk IO – איך לבדוק ולטפל

## איפה לבדוק צריכת Disk IO

**פרויקט FigDex (ref: `txbraavvjiriwfdlmcvc`):**

1. **Database Health (צריכת Disk IO יומית/שעתית)**  
   https://supabase.com/dashboard/project/txbraavvjiriwfdlmcvc/observability/database  
   כאן רואים את צריכת ה-Disk IO Budget ואם אתה מתקרב למגבלה.

2. **Compute and Disk (הגדרות ו-upgrade)**  
   https://supabase.com/dashboard/project/txbraavvjiriwfdlmcvc/settings/compute-and-disk  
   כאן רואים את ה-compute add-on הנוכחי ואפשר לשדרג.

3. **מסמכי Supabase:**
   - [High Disk I/O Guide](https://supabase.com/docs/guides/platform/exhaust-disk-io)
   - [Manage Disk IOPS](https://supabase.com/docs/guides/platform/manage-your-usage/disk-iops)

## מה זה Disk IO Budget

- **Disk IO** = קריאות/כתיבות לדיסק (IOPS) וכמות נתונים (throughput).
- **Disk IO Budget** = "מנה" יומית של burst ל-instances קטנים. כשנגמרת, הביצועים יורדים ל-baseline (עלול להיות איטי).
- כשהתקציב נגמר: תגובות איטיות, CPU גבוה (IO wait), גיבויים ו-autovacuum עלולים להיפגע.

## סיבות נפוצות לצריכה גבוהה (בכלל וב-FigDex)

1. **זיכרון גבוה** – swap לדיסק.
2. **Cache hit rate נמוך** – הרבה קריאות יוצאות לדיסק במקום cache.
3. **שאילתות כבדות** – שאילתות שלוקחות זמן (למשל גישה ל-`index_data` JSONB גדול).
4. **עומס רב** – הרבה קריאות/כתיבות לדאטאבייס.

ב-FigDex, מועמדים בולטים:

- **`get-indices`** – טוען רשימת אינדקסים ואז עבור חלק מהם גם `index_data` (JSON גדול) לחישוב frame count וכו'. קריאות חוזרות ל-`index_data` = הרבה IO.
- **`get-index-data`** – מחזיר את כל ה-`index_data` (כולל pages/frames) – payload גדול ו-IO גבוה.
- **`create-index-from-figma`** – כתיבת chunks עם `index_data` גדול.

## מה לעשות

### 1. לבדוק ב-Dashboard (עכשיו)

- היכנס ל:  
  **Observability → Database**  
  קישור ישיר: https://supabase.com/dashboard/project/txbraavvjiriwfdlmcvc/observability/database  
- בדוק גרפים של **Disk IO** (יומי/שעתי) ו-**Disk IO Budget** – האם יש עלייה חדה או שימוש קבוע גבוה.

### 2. לשדרג Compute (הקלה מהירה)

- ב-**Settings → Compute and Disk**:  
  https://supabase.com/dashboard/project/txbraavvjiriwfdlmcvc/settings/compute-and-disk  
- Compute גדול יותר (במיוחד 4XL ומעלה) נותן ביצועי דיסק יציבים יותר ומגבלת IO גבוהה יותר.

### 3. אופטימיזציה בקוד (לטווח ארוך)

- **ב-`get-indices`:** לא לשלוף `index_data` לכל הרשומות רק כדי לחשב frame count – אם אפשר, לשמור `frame_count` בעמודה נפרדת או לחשב רק עבור מה שמוצג.
- **Cache:** לוודא ששאילתות חוזרות (למשל רשימת אינדקסים) מנוצלות מטען/cache בצד האפליקציה או CDN, כדי להפחית קריאות לדאטאבייס.
- **Query performance:** ב-Supabase: **Reports** או **Database → Query performance** – לזהות שאילתות איטיות (>1s) ולשפר (אינדקסים, צמצום שדות, פחות JSONB גדול).

## סיכום

1. **בדיקה:** Observability → Database (הקישור למעלה) – לראות צריכת Disk IO ו-Budget.
2. **שדרוג:** Settings → Compute and Disk – אם התקציב נגמר רוב הימים, לשקול compute גדול יותר.
3. **אופטימיזציה:** להפחית גישות ל-`index_data` בשאילתות רשימה, לשמור מטאדאטה (למשל frame count) בעמודה, ולשפר שאילתות איטיות.
