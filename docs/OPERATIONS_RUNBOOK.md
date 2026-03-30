# FigDex Operations Runbook

**Last updated:** March 30, 2026

This runbook is intended for practical founder/operator use while FigDex is in active product validation.

## 1. Environment

Production web:
- [https://www.figdex.com](https://www.figdex.com)

Primary backend:
- Supabase project used by the production web and plugin

Main local references:
- [web/.env.local](/Users/ranmor/Documents/FigDex%20Codex/web/.env.local)
- [web/scripts/prod-load-smoke.js](/Users/ranmor/Documents/FigDex%20Codex/web/scripts/prod-load-smoke.js)

## 2. Common Operational Tasks

### 2.1 Reset a User's Indices Without Deleting the User

Preferred path:
- use the admin UI reset action in:
  [web/pages/admin/users.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/admin/users.tsx)

Expected result:
- user's indices are cleared
- plan remains unchanged
- user account remains intact
- usage resets accordingly

### 2.2 Bypass Fair-Use / Cooldown Limits for Specific Users

Use the admin user controls to enable:
- `bypass_indexing_limits`

Expected use cases:
- founder account
- internal testing account
- heavy QA / migration validation

### 2.3 Verify Normalized Usage

Primary source:
- `indexed_owner_usage`

Cross-check against:
- `indexed_files.total_frames`

Expected:
- `total_files` matches logical files
- `total_frames` matches normalized frame count

## 3. Production Validation

### 3.1 Manual Smoke Validation

Use:
- [docs/FLOW_TESTING_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/FLOW_TESTING_CHECKLIST.md)

Priority smoke sequence:
1. plugin open and user recognition
2. file link and page selection
3. create/update index
4. gallery lobby
5. file open
6. search
7. share
8. reset
9. usage validation

### 3.2 Controlled Production Load Smoke

Use:
- [web/scripts/prod-load-smoke.js](/Users/ranmor/Documents/FigDex%20Codex/web/scripts/prod-load-smoke.js)

Purpose:
- read-heavy smoke load against production
- compare response times after performance changes
- monitor Supabase responsiveness during pressure

Default behavior:
- reads env from `web/.env.local`
- targets the production site
- probes:
  - `get-indices`
  - `file-summary`
  - `file-page`
  - `file-search`
  - `user-limits`
  - `public-share`
- also runs lightweight Supabase timing probes in parallel

Typical success criteria:
- no `504 FUNCTION_INVOCATION_TIMEOUT`
- `file-page` and `file-search` remain in a healthy latency range
- Supabase probe timings do not collapse under moderate smoke load

## 4. Migration / Data Tasks

### 4.1 Create Normalized Tables

Use:
- [web/sql/create_normalized_index_tables.sql](/Users/ranmor/Documents/FigDex%20Codex/web/sql/create_normalized_index_tables.sql)

### 4.2 Backfill Normalized Data From Legacy

Use:
- [web/sql/backfill_normalized_index_from_index_files.sql](/Users/ranmor/Documents/FigDex%20Codex/web/sql/backfill_normalized_index_from_index_files.sql)

### 4.3 Important Schema Reminder

In `indexed_files`, the correct summary field is:
- `total_frames`

Not:
- `frame_count`

## 5. Known Operational Realities

### 5.1 Legacy Compatibility Still Exists

Even though normalized storage is the intended operational model:
- `index_files` still exists
- some compatibility paths still depend on it

Treat the system as:
- normalized-first
- legacy-compatible

### 5.2 Thumbnail Backfills May Be Needed

If old indexed frames exist without `thumb_url`, gallery performance or preview behavior can degrade.

Operational symptom:
- file view feels slow
- search/file-page payloads become too heavy

Operational fix:
- backfill `thumb_url` values for old `indexed_frames` rows

### 5.3 Deploy Drift

If production still shows old behavior after a code fix:
- verify the latest deployment
- verify browser cache
- verify the intended commit actually reached production

## 6. Recommended Ongoing Checks

Run these periodically during active testing:

### Weekly
- manual smoke flow
- check admin usage totals
- verify new shares still render correctly

### After backend/indexing changes
- run `npm run build`
- run controlled production smoke load
- validate one real heavy index flow manually

### After plugin changes
- validate plugin load
- validate connection state
- validate create/update index
- validate one post-index gallery open

## 7. When to Escalate Investigation

Investigate immediately if you see:
- repeated `504 FUNCTION_INVOCATION_TIMEOUT`
- file open/search falling back into multi-second or tens-of-seconds latency
- usage counts diverging from actual indexed data
- reset removing plan data or leaving stale gallery state
- share pages rendering blank or without image data

## 8. Related Documents

- [docs/STATUS_REPORT.md](/Users/ranmor/Documents/FigDex%20Codex/docs/STATUS_REPORT.md)
- [docs/SYSTEM_SPECIFICATION.md](/Users/ranmor/Documents/FigDex%20Codex/docs/SYSTEM_SPECIFICATION.md)
- [docs/NORMALIZED_INDEX_ARCHITECTURE.md](/Users/ranmor/Documents/FigDex%20Codex/docs/NORMALIZED_INDEX_ARCHITECTURE.md)
- [docs/FLOW_TESTING_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/FLOW_TESTING_CHECKLIST.md)
