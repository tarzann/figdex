# New Approach: Process Frames in Small Batches Within Pages

## הבעיה הנוכחית:
- הקוד מנסה לעבד את כל ה-frames מדף אחד בבת אחת
- Time budget נגמר לפני שהוא מצליח לעבד הכל
- `chunk.length === 0` כל הזמן → infinite loop

## הפתרון:
1. **שמור frame IDs ב-job state**: במקום page index, נשמור איזה frames כבר עובדו
2. **עבד frames ב-batches קטנים**: גם בתוך page אחד, נעבד רק batch קטן בכל invocation
3. **Track progress per page**: נשמור כמה frames עובדו מכל page

## מבנה חדש:
```typescript
// Job state structure:
{
  current_page_index: 0,  // איזה page אנחנו מעבדים
  processed_frames_in_page: 0,  // כמה frames עובדו מהדף הנוכחי
  all_page_frames: {  // שמור את כל ה-frame IDs מכל page
    [pageId]: [frameId1, frameId2, ...]
  }
}
```

## לוגיקה חדשה:
1. **בתחילת invocation**: בדוק איזה page אנחנו מעבדים
2. **אם אין page נוכחי**: התחל עם page הראשון
3. **אסוף frames מהדף** (אם עדיין לא נאספו)
4. **עבד batch קטן** של frames (dynamic batch size)
5. **עדכן progress**: כמה frames עובדו מהדף הנוכחי
6. **אם סיימנו את הדף**: עבור לדף הבא
7. **אם סיימנו את כל ה-pages**: complete

## יתרונות:
- ✅ עובד גם לקבצים גדולים (1000+ frames)
- ✅ לא תקוע ב-infinite loops
- ✅ Dynamic batch sizing
- ✅ Progress tracking מדויק

