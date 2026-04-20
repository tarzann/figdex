# FigDex

**Project status:** Active founder-led production testing  
**Plugin runtime version:** `v1.32.39`  
**Web app version:** `v1.32.02`  
**Last updated:** April 20, 2026

FigDex is a two-part system for indexing Figma files and browsing them on the web:

- `plugin/` – Figma plugin for file connection, page selection, indexing, repair, and upload
- `web/` – Next.js app for gallery browsing, file view, search, sharing, account, and admin

GitHub: [tarzann/figdex](https://github.com/tarzann/figdex)

## Current Product State

The current production system is built around these realities:

- `storage-first` indexing is the active plugin upload path
- plugin uploads use `session -> append -> commit`
- direct signed chunk upload is currently disabled in favor of the more stable append flow
- normalized gallery storage is the operational model:
  - `indexed_files`
  - `indexed_pages`
  - `indexed_frames`
  - `indexed_owner_usage`
- cover handling is file-level and is refreshed during indexing and repair
- hidden Figma frames are excluded from indexing
- the plugin always includes the `cover` page in indexing runs, even if the user did not select it
- large runs are warned, not blocked
- gallery sidebar now reflects Figma page order and can self-heal older files via repair

## What Is Stable Right Now

### Plugin

- account reconnect and auth recovery
- file linking
- page selection
- progress bar with elapsed / total / remaining time
- indexing summary log
- storage-first session creation and commit
- cover upload / refresh
- repair action for legacy gallery metadata

Main runtime file:
- [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js)

Plugin release source of truth:
- [web/lib/plugin-release.ts](/Users/ranmor/Documents/FigDex%20Codex/web/lib/plugin-release.ts)

### Web App

- gallery lobby
- file view
- all-frames view
- normalized reads
- file/page tree in Figma order
- disabled display of non-indexed pages
- folder-aware page grouping
- improved frame cards with normalized preview area
- stable public gallery/share/account/download/admin flows

Main web file for current gallery UX:
- [web/pages/gallery.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/gallery.tsx)

## Architecture Snapshot

### Plugin upload path

1. user links file
2. plugin loads pages and builds page metadata
3. plugin includes cover metadata and selected pages
4. plugin creates storage-first upload session
5. plugin appends chunks
6. plugin commits upload session
7. server syncs normalized gallery rows

Relevant routes:
- [web/pages/api/uploads/index.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/uploads/index.ts)
- [web/pages/api/uploads/[id]/append.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/uploads/%5Bid%5D/append.ts)
- [web/pages/api/uploads/[id]/commit.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/uploads/%5Bid%5D/commit.ts)

### Legacy repair path

Used for older files that need page metadata / order / cover repair:

- [web/pages/api/repair-file-pages.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/repair-file-pages.ts)

## Source Of Truth Docs

If you need current project context, start here:

- [docs/DOCUMENTATION_INDEX.md](/Users/ranmor/Documents/FigDex%20Codex/docs/DOCUMENTATION_INDEX.md)
- [docs/STATUS_REPORT.md](/Users/ranmor/Documents/FigDex%20Codex/docs/STATUS_REPORT.md)
- [docs/SYSTEM_SPECIFICATION.md](/Users/ranmor/Documents/FigDex%20Codex/docs/SYSTEM_SPECIFICATION.md)
- [docs/NORMALIZED_INDEX_ARCHITECTURE.md](/Users/ranmor/Documents/FigDex%20Codex/docs/NORMALIZED_INDEX_ARCHITECTURE.md)
- [plugin/README.md](/Users/ranmor/Documents/FigDex%20Codex/plugin/README.md)

## Quick Dev Notes

### Plugin

- runtime entry: [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js)
- local UI reference file exists at [plugin/ui.html](/Users/ranmor/Documents/FigDex%20Codex/plugin/ui.html), but the active shipped UI is bundled from `plugin/code.js`

### Web

- app root: [web](/Users/ranmor/Documents/FigDex%20Codex/web)
- gallery: [web/pages/gallery.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/gallery.tsx)
- install: [web/README.md](/Users/ranmor/Documents/FigDex%20Codex/web/README.md)

### Verification

Common verification command:

```bash
cd web && npm run build
```

## Current Caveats

- `All Frames` intentionally stays capped at `24` items per page for stability
- legacy docs under `web/docs/` still contain useful history, but many are not current source of truth
- `Repair gallery` exists as a temporary operational tool for older files and should eventually become unnecessary
