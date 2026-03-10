# לוגיקת האינדקס והמבנה לייצוא

## לוגיקה נוכחית (לפי VERSIONS.md + דרישת משתמש)

- **עמודים:** עוברים על העמודים הנבחרים (selectedPages).
- **פריימים לכל עמוד:** רק **פריימים ברמה הגבוהה ביותר**:
  1. **ילדים ישירים של העמוד (Page)** – צומת מסוג FRAME (לא Section בשם, לא עם ילדים FRAME).
  2. **ילדים ישירים של Section** – כל Section שהוא ילד ישיר של העמוד: לוקחים את הילדים הישירים שלו מסוג FRAME.
- **השמטה:** פריימים שהשם שלהם מכיל `[NO_INDEX]`.
- **מבנה שמירה:** לפי דפי Figma – `pages: [ { id: page.id, name: page.name, frames: [...] } ]`. כל פריים מיוצא לתמונה ונשמרים כל השדות (id, name, x, y, width, height, index, tags, url, textContent, searchTokens, image).

---

## 1. start-advanced (קוד ישן)

- **לא** בונה אינדקס ולא מעלה.
- רק: `saveIndexedPagesMetadataOnly(msg.selectedPages)` ואז `postMessage({ type: 'done' })`.
- `INDEXED_PAGES` נשמר כ־`[{ pageId, pageName, lastIndexedAt, pageChangeSignature }]`.

## 2. מקור הפריימים – buildFramesIndexJson

- קורא **indexedPages** מ־storage (מערך של `{ pageId, pageName, ... }`).
- **שלב א – איסוף מזהי פריימים (שטוח):**
  - לולאה על `indexedPages[i]`.
  - `page = await figma.getNodeByIdAsync(indexedPages[i].pageId)`.
  - `ids = findAllFrames(page)` → מערך **מזהים (strings)**.
  - `frameIds.push(...ids)` → מערך אחד שטוח של כל מזהי הפריימים מכל העמודים.
- **שלב ב – עיבוד כל פריים:**
  - לולאה על `frameIds[i]`.
  - `frame = await figma.getNodeByIdAsync(frameIds[i])`.
  - `frameData = await processFrameFromDocument(frame, i)`.
  - `processedFrames.push(frameData)` → מערך שטוח של אובייקטי פריים.
- **שלב ג – קיבוץ ל"דפים" וירטואליים:**
  - `framesPerPage = 20`.
  - לולאה: `i = 0, 20, 40, ...` → `pageFrames = processedFrames.slice(i, i + 20)`.
  - `pages.push({ id: 'page_' + floor(i/20), name: 'Page ' + (floor(i/20)+1), frames: pageFrames })`.
- **החזרה:**  
  `{ name: "Frames Index", data: { pages: pages, frames: processedFrames, tags: [] } }`.

## 3. findAllFrames(node) – קוד ישן

- רקורסיבי על `node.children`.
- מחזיר **מערך של מזהים (strings)** – `node.id`.
- מוסיף מזהים רק ל־`node.type === 'FRAME'` ו־`node.name !== 'Section'` ו־לא Section:
  - `isSection = name.toLowerCase().includes('section') || (node.children && node.children.some(child => child.type === 'FRAME'))`.
- תמיד יורד ל־`node.children`.

## 4. processFrameFromDocument(frame, index) – שדות לייצוא

- **לפני תמונה:**  
  `id, name, x, y, width, height, index, tags, url, textContent, searchTokens`.
- **tags:** מ־storage `FRAME_TAGS[frame.id]` או `[sizeTag]` (w+'x'+h).
- **תמונה:** JPG, `qualityScale = imageQuality/100`, `jpegQuality = 0.9`, `constraint: { type: 'SCALE', value: qualityScale }`. אם יש צומת עם IMAGE fill – מייצאים ממנו, אחרת מהפריים.
- **תוצאה:** אותו אובייקט + `image: 'data:image/jpeg;base64,' + ...`.

## 5. מבנה הייצוא (index_data / indexPayload)

- **data.pages:** מערך של "דפים" וירטואליים, **לא** לפי דפי Figma:
  - `id: 'page_0'`, `name: 'Page 1'`, `frames: [עד 20 פריימים]`
  - `id: 'page_1'`, `name: 'Page 2'`, `frames: [עד 20 פריימים]`
  - ...
- **data.frames:** מערך שטוח של **כל** הפריימים המעובדים.
- **data.tags:** `[]`.

כל פריים: `id, name, x, y, width, height, index, tags, url, textContent, searchTokens, image`.
