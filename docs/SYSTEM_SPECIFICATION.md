# FigDex System Specification

**Last updated:** April 20, 2026  
**Status:** current specification of the active FigDex product and platform

## 1. Product Definition

FigDex is a system for indexing Figma screens, browsing them in a web gallery, searching them, and sharing subsets of them.

The product currently consists of:
- a Figma plugin
- a web application
- a Supabase-backed storage and metadata layer

Core user value:
- index Figma files
- browse indexed screens quickly
- search by names, text, and tags
- share full galleries or current search results
- move from plugin capture to web review in a single understandable journey

## 2. Primary User Types

### 2.1 Guest

Can:
- use the plugin
- create initial index flows
- preview the system value

Should be limited by:
- file/frame plan limits
- fair-use controls

### 2.2 Free User

Can:
- connect account
- index a small amount of data
- use the gallery
- use sharing in the supported scope

### 2.3 Pro User

Can:
- use larger quotas
- perform heavier indexing
- use the gallery and search as a real working tool

### 2.4 Team / Internal / Admin

Can:
- manage plans
- inspect users
- reset indices
- override operational protections when needed

## 3. System Components

## 3.1 Figma Plugin

Main files:
- [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js)
- [plugin/ui.html](/Users/ranmor/Documents/FigDex%20Codex/plugin/ui.html)
- [plugin/manifest.json](/Users/ranmor/Documents/FigDex%20Codex/plugin/manifest.json)

Primary responsibilities:
- identify current user / plugin session
- link current Figma file
- load pages
- select indexable pages
- export frames and metadata
- upload assets and index payloads
- display indexing progress and state

Plugin UX structure:
- `Account`
- `Current File`
- `Pages`
- `Action`

Plugin output includes:
- frame images
- thumbnail references
- search text / search tokens
- tags
- page structure
- file metadata
- sync identifiers used by normalized storage

Important current plugin behavior:
- `storage-first` is the default indexing path
- the plugin always includes the `cover` page in indexing runs
- hidden frames are excluded from indexing
- heavy runs warn but do not block
- progress UI shows elapsed / total / remaining time
- a temporary `Repair gallery` action exists for older indexed files

## 3.2 Web App

Main entry areas:
- [web/pages/index.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/index.tsx)
- [web/pages/download-plugin.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/download-plugin.tsx)
- [web/pages/login.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/login.tsx)
- [web/pages/register.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/register.tsx)
- [web/pages/plugin-connect.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/plugin-connect.tsx)
- [web/pages/pricing.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/pricing.tsx)
- [web/pages/account.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/account.tsx)
- [web/pages/gallery.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/gallery.tsx)
- [web/pages/index-management.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/index-management.tsx)
- [web/pages/admin/index.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/admin/index.tsx)

Primary responsibilities:
- public product messaging
- plugin installation and first-session guidance
- authentication and user state
- gallery browsing
- file view
- search
- sharing
- pricing / plan presentation
- account usage presentation
- admin controls

## 3.3 Backend API

Important APIs include:
- plugin connect/auth support
- index creation/upload routes
- gallery read APIs
- sharing APIs
- account/admin APIs

Key current hot paths:
- [web/pages/api/get-indices.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/get-indices.ts)
- [web/pages/api/get-index-data.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/get-index-data.ts)
- [web/pages/api/file-index-view.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/file-index-view.ts)
- [web/pages/api/user/share.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/user/share.ts)
- [web/pages/api/uploads/index.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/uploads/index.ts)
- [web/pages/api/uploads/[id]/append.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/uploads/%5Bid%5D/append.ts)
- [web/pages/api/uploads/[id]/commit.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/uploads/%5Bid%5D/commit.ts)
- [web/pages/api/repair-file-pages.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/repair-file-pages.ts)

## 3.4 Supabase

Supabase is currently responsible for:
- relational data
- auth/session support
- storage
- share state
- usage state

## 4. Data Model

## 4.1 Normalized Model

Primary operational tables:

### `indexed_files`
- one logical indexed file per owner
- stores file-level metadata
- stores `total_frames`
- stores cover and sharing metadata

### `indexed_pages`
- one row per indexed page
- stores page-level metadata and `frame_count`

### `indexed_frames`
- one row per frame
- stores search text
- stores tags
- stores thumbnail/image references
- may also store a compatibility payload

### `indexed_owner_usage`
- one row per owner summary
- stores `total_files`
- stores `total_frames`

Reference:
- [docs/NORMALIZED_INDEX_ARCHITECTURE.md](/Users/ranmor/Documents/FigDex%20Codex/docs/NORMALIZED_INDEX_ARCHITECTURE.md)

## 4.2 Legacy Compatibility Model

Legacy table:
- `index_files`

Current role:
- compatibility / fallback / shadow-write in some paths
- not intended as long-term operational source of truth

## 5. Core Product Flows

## 5.0 Intended Activation Flow

The intended founder-led activation path is:

1. user lands on homepage
2. user downloads plugin
3. user signs in or continues as guest
4. user links a file in the plugin
5. user creates a first index
6. user opens the result in the gallery
7. user understands search and share

The system was recently updated to support this path more explicitly across:
- landing
- plugin download
- auth
- plugin connect
- gallery first-use and first-success states

## 5.1 Plugin Indexing Flow

1. plugin opens
2. user identity is restored or revalidated
3. current Figma file is linked
4. pages are loaded
5. indexable pages are selected
6. plugin exports frames/images/metadata
7. plugin creates upload session
8. plugin appends chunks
9. commit route finalizes upload and syncs normalized rows
10. gallery reflects the result

## 5.2 Gallery Lobby Flow

1. user opens gallery
2. logical indexed files are loaded
3. file cards display:
   - cover
   - file name
   - update time
   - frame count
4. user clicks a file
5. file view opens

Current lobby behavior:
- file cards remain cover-first and are intentionally visually different from frame cards
- sidebar reflects logical files
- older files may be repaired into current page metadata/order state

For a first-time user with no indices:
- the gallery should show guided onboarding, not a generic empty state

For a user arriving from a first successful index:
- the gallery should show a success-oriented entry state and direct them to open the file

## 5.3 File View Flow

1. file summary loads first
2. indexed pages are shown
3. selected page frames load lazily
4. search can operate across the file

Key design principle:
- do not load the full file payload eagerly if not needed

## 5.4 Search Flow

Current search behavior:
- partial matching supported
- multi-term loose matching supported
- server and client search logic are aligned more closely than before

Supported behavior examples:
- `nova` can match `novaPay`
- `month 1 stro` can match `month 1 starting strong`

## 5.5 Share Flow

Current supported share types:
- full gallery
- current search results

Expected share behavior:
- descriptive share naming
- stable share link rendering
- public read path works without breaking image previews
- user-facing share choices are phrased in human terms where possible

## 5.6 Reset Flow

Reset behavior is designed to:
- clear indices
- preserve user account
- preserve user plan
- refresh usage state

## 6. Plan / Monetization Model

Current primary user-facing model:
- plan-based
- file limits
- frame limits

The system intentionally does **not** currently center credits in the main UX.

Credits may still exist in older code or older docs, but the active product direction is:
- plan clarity
- capacity clarity
- fair-use protection

## 6.1 Fair-Use Controls

Operational protections include:
- cooldown behavior after repeated rapid re-indexing
- per-user bypass support

User-level override:
- `bypass_indexing_limits`

This should be used for:
- internal users
- founder testing
- exceptional operational needs

## 7. Admin System

Admin capabilities currently include:
- user visibility
- plan visibility
- usage visibility
- logical index visibility
- reset indices
- bypass toggle for indexing limits
- activity log
- user-flow monitoring

Admin should report logical product state, not raw legacy rows.

## 7.1 Product Surface Cleanup Status

The active user-facing product surface has been simplified:
- `Projects Management` and related project APIs were removed
- multiple legacy route variants now redirect to canonical pages
- `Figma API Integration` is positioned as `Soon`, not as an active user flow
- technical actions were moved deeper into account or hidden from main navigation where appropriate

## 8. Performance Principles

The current system is optimized around:
- normalized reads
- avoiding hot-path JSON payload parsing where possible
- avoiding live thumbnail generation in read requests
- returning only what the active view needs

### 8.1 Important File-View Rule

The `file-index-view` path must remain lightweight.

It should avoid:
- on-request thumbnail generation
- heavy `data:image` payload responses
- oversized frame payloads in page/search results

## 9. Reliability Principles

The system should behave predictably when:
- users are deleted
- tokens go stale
- indices are reset
- plans change
- load increases moderately

Important expected behavior:
- plugin should not show stale connected state for deleted users
- reset should not leave stale “Update index” local state
- usage should reflect actual normalized rows

## 10. Testing Strategy

### 10.1 Manual

Use:
- [docs/FLOW_TESTING_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/FLOW_TESTING_CHECKLIST.md)

### 10.2 Build / Static Validation

Primary technical checks:
- `npm run build`
- `node -c plugin/code.js`

### 10.3 Controlled Production Load

Use:
- [web/scripts/prod-load-smoke.js](/Users/ranmor/Documents/FigDex%20Codex/web/scripts/prod-load-smoke.js)

Purpose:
- validate major read paths under moderate controlled pressure
- compare before/after performance work
- observe Supabase responsiveness in parallel

## 11. Current Boundaries / Known Realities

The system is strong enough for continued testing and iteration, but:
- legacy compatibility paths still exist
- not every historical document is current
- some older admin/payment artifacts may still need cleanup
- one plugin UI polish pass is still intentionally pending local approval

The correct mental model is:
- normalized-first
- founder-tested
- production-backed
- still in active hardening

## 12. Recommended Near-Term Priorities

1. continue reducing remaining dependence on `index_files`
2. finish pending plugin UI polish and publish it
3. maintain a clean and simple plan/upgrade model
4. continue focused UX polish only where it improves clarity or conversion
5. keep performance regressions checked with controlled load smoke tests

## 13. Source-of-Truth Docs

Use these as the preferred current references:
- [docs/STATUS_REPORT.md](/Users/ranmor/Documents/FigDex%20Codex/docs/STATUS_REPORT.md)
- [docs/SYSTEM_SPECIFICATION.md](/Users/ranmor/Documents/FigDex%20Codex/docs/SYSTEM_SPECIFICATION.md)
- [docs/NORMALIZED_INDEX_ARCHITECTURE.md](/Users/ranmor/Documents/FigDex%20Codex/docs/NORMALIZED_INDEX_ARCHITECTURE.md)
- [docs/FLOW_TESTING_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/FLOW_TESTING_CHECKLIST.md)
- [docs/OPERATIONS_RUNBOOK.md](/Users/ranmor/Documents/FigDex%20Codex/docs/OPERATIONS_RUNBOOK.md)
- [docs/DOCUMENTATION_INDEX.md](/Users/ranmor/Documents/FigDex%20Codex/docs/DOCUMENTATION_INDEX.md)
