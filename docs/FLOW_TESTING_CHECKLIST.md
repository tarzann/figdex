# FigDex Flow Testing Checklist

**Last updated:** March 30, 2026  
**Plugin version:** `v1.32.35`  
**Scope:** founder-led manual smoke tests across plugin, gallery, sharing, reset, and usage

## 1. Primary Smoke Flow

The current core smoke flow for FigDex is:

1. plugin opens
2. user is identified correctly
3. file is linked correctly
4. pages are loaded correctly
5. index is created or updated successfully
6. gallery reflects the new state
7. file view and search work
8. sharing works
9. reset works
10. usage counters stay correct

## 2. Current Manual Smoke Status

These checks were completed successfully in the latest stabilization cycle:

| # | Flow | Expected result | Status |
|---|------|-----------------|--------|
| 1 | New index from plugin | index completes without `500/504` | ✅ |
| 2 | Heavy index | large page / large frame set completes successfully | ✅ |
| 3 | Gallery lobby | file cards render, covers appear, no duplicate logical files | ✅ |
| 4 | File view | file opens, pages load, navigation works, search works | ✅ |
| 5 | Share – full gallery | share link opens and renders correctly | ✅ |
| 6 | Share – search results | search-result share link opens and renders correctly | ✅ |
| 7 | Reset user indices | indices clear without deleting user plan | ✅ |
| 8 | Usage stats | `Files / Frames` stay accurate after indexing and reset | ✅ |

## 3. Plugin Checklist

### 3.1 Bootstrap

- [ ] plugin opens without syntax/runtime failure
- [ ] user identity state is correct
- [ ] deleted user is not shown as connected
- [ ] stale plugin state does not incorrectly show `Update index`

### 3.2 File Linking

- [ ] Figma file link saves correctly
- [ ] pages load correctly
- [ ] only indexable pages are selectable
- [ ] `Current File` status is correct

### 3.3 Page Selection

- [ ] page counts are correct
- [ ] `Select all` works
- [ ] `Clear` works
- [ ] reloading the plugin preserves the intended state

### 3.4 Indexing

- [ ] create index works
- [ ] update index works
- [ ] heavy index works
- [ ] progress/status messages are clear
- [ ] retry behavior handles transient server pressure

### 3.5 Limits / Upgrade UX

- [ ] guest sees guest-specific limit messaging
- [ ] connected free user sees `Upgrade to Pro`
- [ ] plan messages do not reference credits
- [ ] cooldown / fair-use behavior is sane

## 4. Gallery Checklist

### 4.1 Lobby

- [ ] file cards show correct cover
- [ ] file cards show logical files, not duplicate update rows
- [ ] updated time looks correct
- [ ] lobby load feels fast

### 4.2 File View

- [ ] file opens quickly
- [ ] page switch loads only the requested page
- [ ] thumbnails appear correctly
- [ ] no fullscreen skeleton blocks the search flow

### 4.3 Search

- [ ] exact name search works
- [ ] partial name search works
- [ ] multi-term loose search works
- [ ] text-content search works
- [ ] tag/page-name search works

Examples to verify:
- [ ] `nova` matches compound terms like `novaPay`
- [ ] `month 1 stro` matches `month 1 starting strong`

### 4.4 Sharing

- [ ] `Full gallery` share works
- [ ] `Current results` share works
- [ ] share naming is descriptive
- [ ] shared page loads without broken data

## 5. Account / Admin Checklist

### 5.1 Account

- [ ] plan is shown correctly
- [ ] usage bars fill left-to-right
- [ ] files / frames usage matches real data
- [ ] API key flows still work

### 5.2 Admin

- [ ] admin dashboard logical index count is correct
- [ ] admin users shows plan + usage
- [ ] reset indices works immediately in UI
- [ ] bypass indexing limits toggle behaves correctly
- [ ] admin indices collapses duplicate update rows

## 6. Data Integrity Checklist

- [ ] `indexed_files` row exists for new logical file
- [ ] `indexed_pages` rows match indexed pages
- [ ] `indexed_frames` rows match indexed frames
- [ ] `indexed_owner_usage` updates correctly
- [ ] reset clears normalized rows for the target user
- [ ] share rows remain valid after recent changes

## 7. Performance Checklist

### 7.1 Manual

- [ ] lobby feels fast
- [ ] file open feels fast
- [ ] file page search feels fast
- [ ] share open feels fast

### 7.2 Controlled Load

Use:
- [web/scripts/prod-load-smoke.js](/Users/ranmor/Documents/FigDex%20Codex/web/scripts/prod-load-smoke.js)

Expected healthy outcome:
- no `504 FUNCTION_INVOCATION_TIMEOUT`
- `file-page` and `file-search` remain sub-second to low-second under smoke load
- Supabase probe timings do not degrade catastrophically under read load

## 8. Notes

- The current business model should be tested primarily around plans, file limits, frame limits, and upgrade flow.
- Credits are intentionally not part of the current primary product UX.
- Fair-use controls exist operationally, with per-user bypass support when needed for internal users.
