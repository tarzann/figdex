# FigDex Plugin - Connect UX Specification

**Version:** v1.32.03  
**Date:** March 24, 2026

## Goal

Make the plugin connection flow feel clear, stable, and product-driven.

The user should always understand:
- מי מחובר עכשיו
- מה מצב הקובץ הנוכחי
- האם אפשר לאנדקס עכשיו
- אם יש חסימה, למה היא קרתה ומה לעשות הלאה

---

## Core Principles

1. Keep one clear primary action on screen at every moment.
2. Separate account state from current file state.
3. Show limits and usage before indexing, not only after failure.
4. Turn upgrade moments into guided product moments, not error states.
5. Avoid mixed or stale states across different Figma files.

---

## Main Screen Structure

The plugin main screen should be organized into 4 blocks in a fixed order:

1. **Account Card**
2. **Current File Card**
3. **Pages and Readiness Card**
4. **Primary Action Card**

Optional:
5. **Advanced Tools**
6. **Tags**

---

## 1. Account Card

Purpose: always show who is currently using the plugin.

### Display

- User name or `Guest`
- Plan: `Guest / Free / Pro`
- Connection badge:
  - `Connected`
  - `Guest mode`
  - `Reconnect needed`

### Usage Summary

Show compact usage rows:

- Files: `1 / 2`
- Frames: `320 / 500`

For Pro:
- show `Pro plan`
- optionally still show current usage

### Actions

Depending on state:

- `Connect to FigDex`
- `Manage account`
- `Upgrade`
- `Reconnect`
- `Disconnect` inside settings only

---

## 2. Current File Card

Purpose: separate file identity from account identity.

### Display

- File name
- File linked status:
  - `Linked`
  - `Link required`
- File index status:
  - `Not indexed yet`
  - `Indexed`
  - `Needs update`

### Secondary Info

- Indexed pages count
- Dirty pages count
- Last index result if available

### Actions

- `Link file`
- `Change link`
- `Open in FigDex Web`

### Rule

This card must reflect only the current Figma file.
No status should leak from a previous file.

---

## 3. Pages and Readiness Card

Purpose: show whether indexing can start right now.

### Readiness Checklist

Show 4 rows:

- Account ready
- File linked
- Pages selected
- Limits available

Each row gets:
- `ready`
- `warning`
- `blocked`

### Selected Content

- Selected pages count
- Estimated frames to add

### Behavior

If blocked, explain exactly one reason:

- `This file is not linked yet`
- `Free plan allows up to 2 files`
- `Free plan allows up to 500 total frames`
- `Reconnect required`

---

## 4. Primary Action Card

Purpose: provide one obvious next step.

### Button Labels

- `Create Index`
- `Update Index`
- `Connect to Continue`
- `Upgrade to Pro`
- `Reconnect`

### Supporting Text

Short explanation under the button:

- `Create a searchable gallery for this file in FigDex Web`
- `Update your existing gallery with selected pages`
- `Upgrade to index more files and frames`

### Rule

Only one primary button should appear.
Avoid showing multiple competing actions in the same moment.

---

## User States

### State A - Guest, no indexed file yet

Show:
- Account card: `Guest`
- Usage: `0 / 1 files`, `0 / 50 frames`
- File card: linked or link required
- Primary action: `Create Index`

### State B - Guest reached limit

Show:
- Account card: `Guest`
- Limit reached panel
- Primary action: `Create free account`
- Secondary text: explain what the free plan adds

### State C - Free connected, under limits

Show:
- Account card: name + `Free`
- Usage: `files used`, `frames used`
- File card: indexed / not indexed / needs update
- Primary action: `Create Index` or `Update Index`

### State D - Free connected, reached file limit

Show:
- Clear limit card:
  - `You are using 2 of 2 files`
- Primary action: `Upgrade to Pro`
- Secondary action: `Manage files on web`

### State E - Free connected, reached frame limit

Show:
- Clear limit card:
  - `You are using 500 of 500 frames`
- Primary action: `Upgrade to Pro`

### State F - Pro connected

Show:
- Account card: name + `Pro`
- usage summary
- normal indexing flow

### State G - Reconnect required

Show:
- Account card with warning
- short explanation
- Primary action: `Reconnect`

Do not show misleading generic errors.

---

## Upgrade UX

Upgrade should be treated as a product state, not just an error.

### Upgrade Card Content

- Title:
  - `Free plan limit reached`
- Reason:
  - `You already indexed 2 files`
  - or `You already used 500 frames`
- Benefits:
  - `More files`
  - `More frames`
  - `Team and sharing features`
- Primary action:
  - `Upgrade to Pro`

### Rule

The plugin should carry the exact reason into the upgrade state.
No generic `try again` button when the real answer is upgrade.

---

## Messaging Rules

### Good messages

- `This file is already indexed and ready to update`
- `Free plan allows up to 2 files`
- `This action would exceed your 500 frame limit`
- `Reconnect to continue indexing`

### Avoid

- `Session expired` for normal plan-limit errors
- generic `Index failed`
- showing `already indexed` on a new file
- showing both guest and connected messaging together

---

## Suggested Visual Hierarchy

### Header

- plugin version
- compact account state
- settings

### Main body

- Account Card
- Current File Card
- Pages Card
- Primary Action Card

### Drawer / Settings

Move account management details here:

- Manage account
- View plan
- View limits
- Disconnect
- API key help

---

## Data Needed From Web

For the improved account card, plugin should be able to fetch:

- user name
- plan
- files used
- file limit
- frames used
- frame limit

Recommended endpoint response shape:

```json
{
  "connected": true,
  "user": {
    "email": "user@example.com",
    "fullName": "User Name",
    "plan": "free"
  },
  "usage": {
    "filesUsed": 1,
    "filesLimit": 2,
    "framesUsed": 320,
    "framesLimit": 500
  }
}
```

---

## Recommended Implementation Order

### Phase 1 - State clarity

- Separate account state from file state
- fix one-primary-action logic
- show clear blocked reason

### Phase 2 - Account card

- add plan + usage summary
- add upgrade entry points

### Phase 3 - Ready-to-index experience

- add readiness checklist
- improve create/update button logic

### Phase 4 - Upgrade experience

- dedicated upgrade card
- better limit and plan messaging

---

## Success Criteria

The redesign is successful if:

- a guest understands what they can do without reading help text
- a free user sees remaining limits before indexing
- a new file never appears as already indexed by mistake
- hitting a limit leads to a clear next step
- reconnect cases are rare and clearly explained
