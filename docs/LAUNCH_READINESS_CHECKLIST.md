# FigDex Launch Readiness Checklist

**Last updated:** March 30, 2026  
**Scope:** pre-launch readiness for founder-led market release  
**Goal:** define what must be true before FigDex is ready for external users

## 1. Release Readiness Summary

FigDex is now beyond the "unstable prototype" phase and is close to an early market-ready release.

The product is already strong in:
- plugin indexing flow
- gallery and file view
- sharing
- normalized storage model
- admin visibility
- performance under controlled read load

The remaining launch work is mostly about:
- commercial flow validation
- security / permission hardening
- onboarding polish
- final operational confidence

## 2. Must Fix Before Launch

These items should be treated as true blockers for external release.

### 2.1 Payments and Plan Changes

- [ ] verify full Paddle checkout flow in production or production-like conditions
- [ ] verify successful upgrade from `Free` to `Pro`
- [ ] verify plan change is reflected correctly in:
  - [web/pages/account.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/account.tsx)
  - [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js)
  - [web/pages/api/user/limits.ts](/Users/ranmor/Documents/FigDex%20Codex/web/pages/api/user/limits.ts)
  - admin user views
- [ ] verify checkout failure state is understandable and recoverable
- [ ] verify pricing CTA behavior for guest, free, and pro users

### 2.2 Auth and Permissions Hardening

- [ ] review all admin routes for authorization consistency
- [ ] verify admin access is not relying only on weak client assumptions where server validation should exist
- [ ] verify share permissions for:
  - valid enabled share
  - disabled share
  - deleted share
  - invalid share token
- [ ] verify plugin connection flow correctly rejects stale or invalid auth

### 2.3 End-to-End New User Onboarding

- [ ] validate a full first-time user journey:
  - landing
  - plugin install
  - guest use or login
  - file link
  - first index
  - gallery open
  - first search
  - first share
- [ ] confirm the user can understand the product without internal knowledge
- [ ] confirm the first-time flow works with a completely new user and clean browser state

### 2.4 Error and Empty States

- [ ] verify no broken states for:
  - no indices
  - no search results
  - no indexable pages
  - expired auth
  - plugin disconnected
  - failed share
  - rate limit hit
- [ ] ensure user-facing errors are product-quality and not raw technical strings

## 3. Should Fix Soon After Launch

These are not hard blockers, but they should be planned quickly after launch.

### 3.1 Admin and Monitoring

- [ ] add top-level admin KPI cards based on activity log:
  - active users today
  - plugin connects today
  - successful indexing today
  - failed indexing today
  - claims completed today
- [ ] add better severity emphasis in:
  - [web/pages/admin/jobs.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/admin/jobs.tsx)
  - [web/pages/admin/user-flow.tsx](/Users/ranmor/Documents/FigDex%20Codex/web/pages/admin/user-flow.tsx)
- [ ] verify operational logging covers enough real-world support scenarios

### 3.2 Plugin UX Polish

- [ ] continue refining status copy during indexing
- [ ] verify all limit states feel consistent and intentional
- [ ] check plugin UI on multiple real Figma files and window sizes

### 3.3 Gallery Product Polish

- [ ] improve empty states and no-result states
- [ ] consider future navigation refinement between file view and side navigation
- [ ] continue reducing visual and cognitive load in complex views

## 4. Nice to Have

These are useful, but should not delay an early market test.

- [ ] add richer trend charts in admin
- [ ] add daily/weekly user flow comparisons
- [ ] add exportable operational reports
- [ ] add more polished release notes / changelog UX
- [ ] continue legacy cleanup after confidence is high

## 5. Operational Verification Before Release

These checks should be repeated right before launch.

### 5.1 Manual Core Flow

- [ ] new index from plugin
- [ ] heavy index
- [ ] gallery lobby
- [ ] open file
- [ ] search within file
- [ ] full gallery share
- [ ] search results share
- [ ] reset indices
- [ ] usage counters
- [ ] plugin reconnect after reload

Reference:
- [docs/FLOW_TESTING_CHECKLIST.md](/Users/ranmor/Documents/FigDex%20Codex/docs/FLOW_TESTING_CHECKLIST.md)

### 5.2 Controlled Load

- [ ] run:
  - [web/scripts/prod-load-smoke.js](/Users/ranmor/Documents/FigDex%20Codex/web/scripts/prod-load-smoke.js)
- [ ] confirm no severe regression in:
  - `get-indices`
  - `file-page`
  - `file-search`
  - `public share`
- [ ] confirm Supabase probe timings remain healthy under read load

## 6. Current Launch Assessment

Current recommendation:

- **Not yet full public launch**
- **Yes for controlled early-market release after the must-fix items are closed**

Interpretation:
- the product is already strong enough for real-user validation
- but payment validation, onboarding validation, and permission hardening should be completed first

## 7. Suggested Launch Sequence

### Phase 1: Founder-Led Private Testing

- invite a very small number of design users
- observe onboarding and plugin usage directly
- collect support issues manually

### Phase 2: Controlled Beta

- allow a slightly larger set of users
- monitor:
  - user flow funnel
  - indexing failures
  - rate limits
  - gallery/search usage

### Phase 3: Public Launch

Proceed only after:
- payment flow is verified
- onboarding success is repeatable
- admin monitoring feels sufficient
- no critical auth / share / indexing regressions are open

## 8. Recommended Immediate Next Priorities

If we continue in launch mode, the next highest-value tasks are:

1. validate Paddle and plan transitions end to end
2. run a clean first-time onboarding test from zero state
3. harden auth / admin / share permissions
4. polish empty and failure states
5. add a small admin KPI summary based on the activity log
