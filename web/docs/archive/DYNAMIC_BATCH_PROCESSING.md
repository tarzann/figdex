# Dynamic Batch Processing - Implementation Summary

## מה שונה?

### 1. Dynamic Batch Size Function
הוספנו פונקציה `calculateDynamicBatchSize()` שמתאימה את גודל ה-batch לפי `total_frames`:

```typescript
function calculateDynamicBatchSize(totalFrames: number): number {
  if (totalFrames < 100) return 1;        // Small: one at a time
  if (totalFrames < 300) return 2;        // Medium-small: 2 frames
  if (totalFrames < 500) return 3;        // Medium: 3 frames
  if (totalFrames < 1000) return 5;       // Large: 5 frames
  if (totalFrames < 2000) return 8;       // Very large: 8 frames
  return 12;                               // Huge: 12 frames
}
```

### 2. שימוש ב-Dynamic Batch Size
הקוד ב-`process-index-job.ts` משתמש ב-`calculateDynamicBatchSize()` במקום לוגיקה מורכבת.

### 3. לוגים משופרים
הלוגים מציגים את ה-dynamic batch size שנבחר.

## איך זה עובד?

1. **קבצים קטנים (<100 frames)**: batch size = 1 (אמין, לא מסוכן)
2. **קבצים בינוניים (100-500 frames)**: batch size = 2-3 (איזון)
3. **קבצים גדולים (500-1000 frames)**: batch size = 5 (מהיר יותר)
4. **קבצים מאוד גדולים (>1000 frames)**: batch size = 8-12 (מהיר)

## זמן משוער:

| גודל קובץ | Batch Size | זמן משוער |
|-----------|------------|------------|
| 100 frames | 1 | ~3-5 דקות |
| 500 frames | 3 | ~10-15 דקות |
| 1000 frames | 8 | ~10-13 דקות |
| 2000 frames | 12 | ~12-15 דקות |

## יתרונות:

✅ **Scalable** - עובד מ-10 frames עד 10,000 frames
✅ **מהיר** - batches גדולים לקבצים גדולים
✅ **אמין** - batches קטנים לקבצים קטנים
✅ **Predictable** - זמן משוער ידוע מראש

## בדיקה:

1. **קובץ קטן (<100 frames)**: בדוק ש-batch size = 1
2. **קובץ בינוני (100-500 frames)**: בדוק ש-batch size = 2-3
3. **קובץ גדול (>1000 frames)**: בדוק ש-batch size = 8-12

## Version:
- **Page Version**: v1.4.0
- **Build Date**: 2025-01-08 16:00

