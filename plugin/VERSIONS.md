## 2026-03-23 - v1.32.02 - Guest and Free Flow Stabilization

Status: guest and free flows are now stable end-to-end across plugin and web.

What was closed
- Guest: one file limit, frame limit, admin visibility, and deletion support.
- Free: two file limit, 500 total frames limit, and connected-user flow after signup.
- Gallery: same Figma file pages are grouped correctly as one logical file.
- Cover: file cover stays stable and is not replaced by later chunk uploads.
- Plugin state: file link and indexed-state detection stay tied to the current file.
- Preflight: plugin stops before export/upload when a limit would be exceeded.

## 2025-12-07 – Figma API Integration (working)

Status: Figma API Integration end-to-end is working (validation, frame counting, job creation, processing, and history entry).

What’s working
- Validate connection pulls pages and counts frames correctly (client-side batching via `/files/{fileKey}/nodes?ids=...`).
- Create Index now pre-collects actual frame references on the server (same logic as client/plugin: direct FRAMEs and FRAMEs inside SECTIONs, excluding `[NO_INDEX]`), so `total_frames` reflects real frames, not page count.
- Background job (`process-index-job`) processes those frames and uploads, with status/progress updates reflected in the UI progress bar.
- UI polls job status and retriggers job processing until completion; progress bar shows current/total frames.

Technical flow (for future reference)
- Client validation & frame counting: `api-index.tsx` uses Figma REST `/files/{fileKey}/nodes?ids={pageIds}` in batches (10/page) to count direct FRAME children and FRAMEs inside SECTIONs (skip names containing `[NO_INDEX]`).
- Index creation request: `create-index-from-figma.ts` fetches the selected pages in batches (same endpoint) and builds `frame_node_refs` with actual frame IDs (and section context) before enqueuing the job; `total_frames` is set to the real frame count.
- Job processing: `process-index-job.ts` detects page/frame refs, fetches page via Figma API, collects frames with the same logic (FRAMEs + SECTION FRAMEs, excluding `[NO_INDEX]`), builds the manifest, uploads chunks, and updates `total_frames`/progress as it goes.
- UI progress: `api-index.tsx` polls `/api/get-job-status` and also calls `/api/process-index-job`; after each response, it updates `jobStatus` and `jobProgress` and auto-retries while status is `processing/pending`, so the bar advances until completion.

Key files
- `pages/api-index.tsx` – client UI, validation, frame counting, job polling/progress updates.
- `pages/api/create-index-from-figma.ts` – server job creation; collects frames up front to set correct `total_frames`.
- `pages/api/process-index-job.ts` – background processing of frames, manifest construction, uploads, status updates.

Notes
- Counting/collection rules match the plugin: FRAME direct children and FRAMEs within SECTIONs, excluding names containing `[NO_INDEX]`.
- If future issues arise where only 1 frame appears, ensure the frame collection uses `/files/{fileKey}/nodes?ids=...` (or `/files?...depth`) and that `frame_node_refs` hold frame IDs (not just page IDs).
