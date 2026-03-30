# FigDex Documentation Index

**Last updated:** March 30, 2026

This file is the recommended entry point for understanding the current FigDex project documentation.

## Core Current-State Docs

### Product / System Status
- [docs/STATUS_REPORT.md](/Users/ranmor/Documents/FigDex%20Codex/docs/STATUS_REPORT.md)
  Current high-level system status, architecture state, performance state, product decisions, and next priorities.

### Full System Specification
- [docs/SYSTEM_SPECIFICATION.md](/Users/ranmor/Documents/FigDex%20Codex/docs/SYSTEM_SPECIFICATION.md)
  Comprehensive specification of the current FigDex system: plugin, web app, backend, data model, flows, admin, and operational behavior.

### Normalized Storage Architecture
- [docs/NORMALIZED_INDEX_ARCHITECTURE.md](/Users/ranmor/Documents/FigDex%20Codex/docs/NORMALIZED_INDEX_ARCHITECTURE.md)
  Focused architecture document for the normalized index model (`indexed_files`, `indexed_pages`, `indexed_frames`, `indexed_owner_usage`).

### Manual Testing
- [docs/FLOW_TESTING_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/FLOW_TESTING_CHECKLIST.md)
  Current manual smoke-test checklist and validation areas.

### Launch Readiness
- [docs/LAUNCH_READINESS_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/LAUNCH_READINESS_CHECKLIST.md)
  Structured pre-launch checklist covering blockers, operational readiness, onboarding, payments, and release sequencing.

### Go-To-Market UX Priorities
- [docs/GO_TO_MARKET_UX_PRIORITIES.md](/Users/ranmor/Documents/FigDex%20Codex/docs/GO_TO_MARKET_UX_PRIORITIES.md)
  Consolidated UX, marketing, and product-friction priorities for making FigDex market-ready.

### Activation Plan
- [docs/ACTIVATION_PLAN.md](/Users/ranmor/Documents/FigDex%20Codex/docs/ACTIVATION_PLAN.md)
  Practical execution plan for improving first-time user activation from landing to first successful indexed result.

### Operations / Runbook
- [docs/OPERATIONS_RUNBOOK.md](/Users/ranmor/Documents/FigDex%20Codex/docs/OPERATIONS_RUNBOOK.md)
  Practical operational guidance for resets, backfills, load checks, and production verification.

### Plugin Release
- [docs/PLUGIN_RELEASE_PROCESS.md](/Users/ranmor/Documents/FigDex%20Codex/docs/PLUGIN_RELEASE_PROCESS.md)
  Release checklist for plugin version sync, ZIP packaging, and public download updates.

## Supporting Docs

### Supabase Performance Context
- [docs/SUPABASE_DISK_IO.md](/Users/ranmor/Documents/FigDex%20Codex/docs/SUPABASE_DISK_IO.md)

### Supabase Security Setup
- [docs/SUPABASE_SECURITY_SETUP.md](/Users/ranmor/Documents/FigDex%20Codex/docs/SUPABASE_SECURITY_SETUP.md)

### Historical Validation Notes
- [docs/STAGE1_NEW_USER_VERIFIED.md](/Users/ranmor/Documents/FigDex%20Codex/docs/STAGE1_NEW_USER_VERIFIED.md)
- [docs/NEW_USER_FULL_FLOW_READY.md](/Users/ranmor/Documents/FigDex%20Codex/docs/NEW_USER_FULL_FLOW_READY.md)

## Tools / Internal Scripts

### Production Load Smoke Test
- [web/scripts/prod-load-smoke.js](/Users/ranmor/Documents/FigDex%20Codex/web/scripts/prod-load-smoke.js)
  Controlled founder-level production read-load test harness with parallel Supabase probes.

## Legacy / Historical Docs

There are many older documents under:
- [web/docs](/Users/ranmor/Documents/FigDex%20Codex/web/docs)

Important note:
- these contain useful historical context
- but many of them predate the recent product simplification, normalized index migration, and credits removal from primary UX
- they should not be treated as the default source of truth

When in doubt, prefer the root-level `docs/` files listed above.
