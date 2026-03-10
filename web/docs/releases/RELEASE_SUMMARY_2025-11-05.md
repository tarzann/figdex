## FigDex Web - Release Summary (2025-11-05)

### Scope
- Fix gallery indexing visibility and stability after plugin and backend updates
- Ensure file names are correct on upload
- Avoid breaking when optional DB columns (file_size) are missing

### Key Changes
- Plugin UI now always requests `get-file-data` from plugin code to fetch the saved fileName from the hidden `FigDex` page node, ensuring human-readable file names are used on upload
- API `upload-index.ts`:
  - Calculates and stores `file_size` (bytes) when the column exists
  - Preserves `user_id` via service-role client on insert
  - Improved debug logs for `user_id`, `file_name`, `file_size`
  - Safer delete of previous versions only for the same file (no chunk deletion)
- API `get-indices.ts`:
  - No longer filters out chunk parts; frontend groups them
  - Retries query without `file_size` if the column doesn't exist (no 500)
  - Returns success with data even if initial query fails due to schema drift

### Issues Encountered & Resolutions
- Gallery error 500 on `/api/get-indices` due to selecting non-existent `file_size` column
  - Resolution: Added retry without `file_size`; gracefully degrade to avoid 500
- "No indices found for user" after chunked uploads
  - Cause: API filtered out `(Part X/Y)` entries when merge not completed
  - Resolution: Removed filtering in API; UI continues to group parts
- File name saved as `Untitled` or as file key
  - Resolution: Extract file name from pasted Figma URL in UI, store to hidden node in `FigDex` page, and always read it during `get-file-data`

### Operational Notes
- SQL helper added: `add_file_size_column.sql` to add `file_size` and backfill
- Deployment completed to Vercel (production)

### Verification Checklist
- Gallery loads without 500 even when `file_size` column is missing
- Indices appear for the user after upload; parts are visible and grouped in UI
- New uploads show correct, human-readable file name

### Files Touched (main)
- `pages/api/get-indices.ts` (resilience, no filtering, retry w/o file_size)
- `pages/api/upload-index.ts` (file size calc, logs, user_id preservation)
- Plugin: `figdex-plugin-web-latest/ui.html` (always request get-file-data)
- Plugin: `figdex-plugin-web-latest/code.js` (persist/read `__FILE_NAME__`)

### Next Steps
- Run `add_file_size_column.sql` on the database (once) to enable file size display
- Optional: add UI indicator when data shown is derived from parts pre-merge



