# FigDex Normalized Index Architecture

## Goal

Move FigDex away from the legacy `index_files.index_data` monolith and toward a normalized model that separates:

- logical files
- pages
- frames
- owner usage summaries

This reduces database IO, removes repeated JSON parsing, and makes file/page/frame limits explicit.

## New Tables

### `indexed_files`

One logical Figma file per owner.

Stores:
- owner (`user_id` or `owner_anon_id`)
- `logical_file_id`
- `project_id`
- `figma_file_key`
- file name
- cover
- total frames
- indexed pages count

### `indexed_pages`

One row per indexed Figma page.

Stores:
- `file_id`
- `figma_page_id`
- page name
- frame count
- sort order

### `indexed_frames`

One row per indexed frame.

Stores:
- `page_id`
- `figma_frame_id`
- frame name
- search text
- tags
- image / thumbnail
- full frame payload

### `indexed_owner_usage`

Fast summary per owner.

Stores:
- total files
- total frames

## Write Strategy

Current transition mode:

1. legacy writes still go to `index_files`
2. plugin gallery uploads also dual-write into normalized tables
3. plugin sends a per-run `syncId`
4. plugin marks `finalizePageIds` when a page received its last chunk
5. normalized storage prunes stale frames only when that page is finalized

This lets long pages upload in parts without losing correct page sync behavior.

## Read Strategy

Current transition mode:

- `get-indices` prefers `indexed_files` when rows exist
- `get-index-data` prefers `indexed_files` + `indexed_pages` + `indexed_frames`
- old `index_files` remains as fallback

## Remaining Migration Work

1. move more gallery and share flows to normalized reads only
2. backfill historical `index_files` into normalized tables
3. switch plan usage fully to `indexed_owner_usage`
4. retire legacy `index_files.index_data` as source of truth
5. later keep `index_files` only as archive or compatibility layer
