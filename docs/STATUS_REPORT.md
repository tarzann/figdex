# FigDex Status Report

**Date:** April 20, 2026  
**Plugin runtime version:** `v1.32.39`  
**Web status:** current `main` after storage-first stabilization, gallery tree unification, page-order repair, cover refresh hardening, and frame-card redesign  
**Production URL:** [https://www.figdex.com](https://www.figdex.com)

## 1. Executive Summary

FigDex is now in a stable enough state for real founder-led product testing, including multi-page indexing, gallery browsing, page deletion, and repeated file updates.

The most important change in this cycle was the shift from a heavy per-request indexing path to a stable `storage-first` upload flow with normalized writes and gallery-side self-healing for older files.

At this point:
- The plugin is stable enough for regular iterative indexing work.
- The gallery file tree is much closer to the real Figma structure and order.
- The main timeout and request-load regressions were materially reduced.
- The system still contains some legacy repair and compatibility behavior, but it is now an exception path rather than the main product path.

## 2. Current Product Scope

FigDex currently consists of three connected layers:

| Layer | Purpose | Status |
|------|---------|--------|
| **Figma Plugin** | Connect file, select pages, export frames, upload and index | Stable for active testing |
| **Web App** | Gallery, file browsing, search, sharing, account, pricing, admin | Stable for active testing |
| **Supabase Backend** | Normalized index storage, auth, storage, metadata, sharing, usage | Stable after migration and backfill |

## 3. What Was Stabilized

### 3.1 Plugin

The plugin was stabilized across:
- auth recovery
- file linking
- page selection
- storage-first upload session flow
- commit handling
- cover refresh
- stale local state after resets
- upload progress visibility

Recent plugin behavior now includes:
- `storage-first` indexing by default
- append-based chunk upload
- commit-based finalize
- cover page auto-inclusion on every indexing run
- hidden frame exclusion
- progress bar with elapsed / total / remaining time
- run summary log with load verdict
- warning-only admission control for heavy runs
- temporary `Repair gallery` action for older files

Plugin code:
- [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js)
- [plugin/ui.html](/Users/ranmor/Documents/FigDex%20Codex/plugin/ui.html)

### 3.2 Web App

The web app received major improvements in:
- gallery hierarchy
- file view structure
- all-frames consistency
- page ordering by Figma order
- older file self-healing
- share flow UX
- account usage UX
- public-site shell consistency
- first-use and first-success onboarding states
- index management polish

Key files:
- [web/pages/gallery.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/gallery.tsx)
- [web/pages/index.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/index.tsx)
- [web/pages/pricing.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/pricing.tsx)
- [web/pages/account.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/account.tsx)
- [web/pages/download-plugin.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/download-plugin.tsx)
- [web/pages/login.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/login.tsx)
- [web/pages/register.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/register.tsx)
- [web/pages/plugin-connect.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/plugin-connect.tsx)
- [web/pages/index-management.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/index-management.tsx)

### 3.3 Backend / DB

The most important architectural changes were:

1. the move to normalized index storage
2. the storage-first upload session flow

Normalized model:

- `indexed_files`
- `indexed_pages`
- `indexed_frames`
- `indexed_owner_usage`

This replaced the previous over-reliance on `index_files.index_data` as the operational source of truth.

Current indexing write path:
- create upload session
- append chunks
- commit upload
- sync normalized rows
- refresh cover metadata

Reference docs and SQL:
- [docs/NORMALIZED_INDEX_ARCHITECTURE.md](/Users/ranmor/Documents/FigDex%20Codex/docs/NORMALIZED_INDEX_ARCHITECTURE.md)
- [web/sql/create_normalized_index_tables.sql](/Users/ranmor/Documents/FigDex%20Codex/web/sql/create_normalized_index_tables.sql)
- [web/sql/backfill_normalized_index_from_index_files.sql](/Users/ranmor/Documents/FigDex%20Codex/web/sql/backfill_normalized_index_from_index_files.sql)

## 4. System Architecture Status

### 4.1 New Source of Truth

Operationally, the system should now be thought of as:

- `indexed_files` = logical file
- `indexed_pages` = indexed page summary
- `indexed_frames` = searchable/displayable frame rows
- `indexed_owner_usage` = precomputed usage summary

### 4.2 Legacy Compatibility

`index_files` still exists and is still used in some compatibility paths, but it should no longer be treated as the primary product model.

Current reality:
- normalized write paths are active
- normalized read paths are active in major flows
- legacy fallback still exists in some routes
- `Repair gallery` exists for older files with missing page metadata / ordering
- the platform is in late migration, not full deletion

### 4.3 Route Cleanup Status

The product surface was reduced materially:

- legacy `gallery-*`, `index-*`, and old dashboard routes now redirect to canonical pages
- `Projects Management` and related `/api/projects` routes were removed from the product
- `Figma API Integration` is currently positioned as `Soon`, not as an active flow
- `Copy API Key` now lives only in `Account`, not in menus

### 4.4 Important Schema Note

`indexed_files` uses `total_frames`, not `frame_count`.

Any future work that assumes `indexed_files.frame_count` is incorrect and should use:
- `indexed_files.total_frames`

## 5. Performance Status

### 5.1 Problem We Had

The major production bottleneck moved into:
- [web/pages/api/file-index-view.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/file-index-view.ts)

Specifically:
- `mode=page`
- `mode=search`

The problem was caused by:
- heavy payloads
- on-request thumbnail generation
- returning large `data:image/...` blobs in hot request paths

### 5.2 What Was Fixed

We fixed this by:
- removing thumbnail generation from live request handling
- removing `frame_payload` from the hot path
- removing heavy `image_url` blobs from the hot path
- backfilling missing `thumb_url` values in `indexed_frames`

### 5.3 Production Load Test Result

Production smoke-load test after the fixes, `12` concurrent users for `30s`:

| Endpoint | p50 | p95 | Result |
|---------|-----|-----|--------|
| `get-indices` | ~359ms | ~1625ms | Stable |
| `file-summary` | ~292ms | ~1108ms | Stable |
| `file-page` | ~397ms | ~1119ms | Stable |
| `file-search` | ~351ms | ~509ms | Stable |
| `user-limits` | ~554ms | ~1405ms | Stable |
| `public-share` | ~83ms | ~148ms | Stable |

This is a major improvement over the earlier state where:
- `file-page` was around `20s+`
- `file-search` was around `12s+` and timing out
- Supabase probes degraded dramatically under load

### 5.4 Thumbnail Backfill Status

We verified live data in Supabase:
- `indexed_frames`: `174`
- missing `thumb_url` before backfill: `174`
- missing `thumb_url` after backfill: `0`

## 6. Search Status

Search behavior was upgraded in multiple stages:

### 6.1 Partial Matches

Search now supports partial matching instead of effectively behaving like exact matching only.

Examples:
- `nova` can match `novaPay`
- partial name/tag/page matches now work

### 6.2 Loose Multi-Term Matching

Search now supports a looser multi-term pattern rather than requiring exact contiguous text.

Example:
- query: `month 1 stro`
- can match: `month 1 starting strong`

This was implemented both:
- in the server path
- and in the local gallery-side filtering layer

Relevant files:
- [web/pages/api/file-index-view.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/file-index-view.ts)
- [web/pages/gallery.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/gallery.tsx)

## 7. UX / Product Decisions Made

### 7.1 Credits Removed from Primary UX

Credits were intentionally removed from the main user-facing pricing model for now.

Reason:
- they made the pricing and upgrade story harder to explain
- they were not central to the current product value
- files / frames / plans are a clearer commercial model at this stage

### 7.2 Current Commercial UX Model

The product now emphasizes:
- plan
- file quota
- frame quota
- fair-use protection

### 7.3 Fair Use / Abuse Protection

We introduced operational protection instead of user-facing credits:
- cooldown only after repeated rapid re-indexing
- override flag for specific users

User override field:
- `bypass_indexing_limits`

This allows specific internal/test users to bypass:
- cooldown
- indexing fair-use limits

### 7.4 Activation / First-Time UX

The activation path was simplified across:
- homepage CTA hierarchy
- plugin download page
- login / register
- plugin connection
- empty gallery first-use state
- first-index success state

Current intended path:
- landing
- download plugin
- connect or continue as guest
- link file
- first index
- open first result in the gallery

This path is still not fully "done", but it is now substantially clearer than earlier in the cycle.

## 8. Admin / Operations Status

### 8.1 Admin Dashboard

Admin surfaces were corrected to use logical index counts rather than raw legacy row counts.

This includes:
- dashboard index totals
- index management grouping
- user usage visibility

### 8.2 User Management

The admin user view now shows:
- plan
- file usage
- frame usage
- reset indices action
- bypass indexing limits toggle

### 8.3 Reset Behavior

User reset now:
- clears indices without deleting the user
- preserves plan
- refreshes admin state more correctly

### 8.4 Activity / Flow Visibility

Admin now includes:
- live activity log
- user flow dashboard
- richer event logging for indexing, share, claim, limits, and usage activity

## 9. Manual Smoke-Test Status

The following manual smoke tests were reported as passing:

1. new indexing
2. heavy indexing
3. gallery lobby
4. file open and search
5. sharing
6. reset indices
7. usage counters

Additional progress since the original smoke pass:
- index management was polished and aligned visually with the rest of the product
- download/auth/plugin-connect onboarding copy was tightened
- activation CTAs were improved for first-time users and guests

## 10. Current Highest-Priority Open Work

The current recommended order is:

1. finish remaining plugin UI changes and publish them
2. continue small activation/onboarding polish where needed
3. keep `Figma API Integration` as `Soon` until the real flow is ready
4. defer billing / Paddle validation until business setup is ready

## 11. Overall Assessment

FigDex now feels much closer to a coherent early product than to a stitched set of tools.

The biggest remaining gap is no longer system stability; it is final product packaging:
- plugin polish
- activation polish
- commercial flow validation later

For founder-led testing and controlled early usage, the system is in a strong state.
6. user reset
7. user usage (`Files / Frames`)

This is important because the system is not only passing builds and DB checks; it was also validated in actual product flow testing.

Related checklist:
- [docs/FLOW_TESTING_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/FLOW_TESTING_CHECKLIST.md)

## 10. Known Remaining Technical Reality

The system is strong, but not “finished”.

Known remaining reality:
- some legacy fallback routes still exist
- `index_files` is still present and still used in compatibility paths
- some older admin/debug/payment surfaces may still need cleanup
- there is still room for more backend hardening and observability
- indexed pages that were later deleted from the Figma file are not yet pruned automatically during normal partial indexing; this still needs a deliberate full-file reconciliation path

This is not a blocker for founder-led testing, but it is still worth tracking.

## 11. Recommended Next Priorities

### 11.1 Short-Term

Recommended near-term work:
- continue reducing any remaining dependency on `index_files`
- strengthen observability around indexing and file-view routes
- formalize load-test tooling
- continue UX polish only where it has clear product value

### 11.2 Product / Go-To-Market

The most useful product-facing next steps are likely:
- onboarding clarity
- upgrade flow clarity
- trial / plan behavior
- better founder-facing monitoring of usage and failures

## 12. Operational Notes

There is currently an uncommitted local load-test harness directory:
- [web/scripts](/Users/ranmor/Documents/FigDex%20Codex/web/scripts)

This was used for production smoke-load testing during stabilization.

A decision is still needed:
- keep it as an official internal tool
- or remove / ignore it

## 13. Bottom Line

FigDex is now in a materially better place:
- faster
- cleaner
- more coherent
- more testable
- and much less fragile than before

It is now reasonable to treat the system as:
- stable enough for continued founder-led product validation
- not yet final in architecture cleanup
- but clearly past the earlier “core instability” phase
