# FigDex Go-To-Market UX Priorities

**Last updated:** March 30, 2026

This document synthesizes recent UI/UX, marketing, and product-friction audits into one practical view of what matters most before taking FigDex to market.

## 1. Core Diagnosis

FigDex already has strong product capability:
- Figma plugin capture and indexing
- searchable web gallery
- sharing flows
- admin visibility

The main remaining problem is not capability. It is activation clarity.

Today the system can do a lot, but a first-time user still has to work too hard to understand:
- what FigDex is
- what the plugin does
- what the web app does
- what to do first
- what happens next

## 2. Main UX / GTM Problems

### 2.1 No Single First-Time Path

The product currently exposes too many valid paths:
- homepage
- pricing
- plugin download
- guest flow
- free signup
- login
- gallery
- account

This makes the system feel powerful, but less guided than it should be.

### 2.2 Inconsistent Product Language

The product still mixes internal and user-facing terms:
- plugin
- index
- gallery
- file
- project
- share
- FigDex Web

This increases cognitive load, especially early in the journey.

### 2.3 Gallery Is Strong but Heavy for New Users

The gallery is now much more capable and faster, but as a first meaningful screen it still asks users to process:
- navigation
- search
- filters
- share
- results modes
- file modes

This is too much before activation.

### 2.4 Plugin vs Web Relationship Is Not Repeated Clearly Enough

Users should hear one simple message repeatedly:
- Use the plugin to capture and update designs from Figma.
- Use FigDex Web to browse, search, review, and share them.

This relationship is present, but not yet treated as a core product rule.

### 2.5 Share Is Powerful but Conceptually Heavy

The current distinctions are sensible internally, but a user should think in scenarios, not system models.

For example:
- share the full library
- share only these results

That is clearer than explaining system entities.

## 3. Priority Themes Before Market

## 3.1 Activation Clarity

Goal:
- make the first successful outcome easy to reach and easy to understand

Definition of success:
- a user installs the plugin
- indexes a file
- opens the result in web
- understands what happened

## 3.2 Product Cohesion

Goal:
- make plugin, web, pricing, account, and share feel like one system

This includes:
- consistent terminology
- consistent headers / shells
- consistent CTA hierarchy
- consistent trust and guidance language

## 3.3 Progressive Disclosure

Goal:
- show only what is needed now
- reveal complexity after activation, not before it

Most relevant areas:
- gallery
- share
- account
- admin

## 3.4 Outcome-Led Messaging

Goal:
- explain what the user gets, not only what the system does

Preferred message direction:
- turn large Figma files into a browsable, searchable design library
- review and share without reopening giant files
- keep design work discoverable and current

## 4. Priority Order

### P1 — Must Improve First

1. Create a single first-time onboarding path.
2. Unify terminology across plugin, web, pricing, and share.
3. Clarify plugin vs web responsibilities everywhere.
4. Reduce first-session complexity in the gallery.

### P2 — Strong Next Layer

5. Simplify and humanize share choices.
6. Improve empty, loading, and error states.
7. Reduce engineering-first copy in public-facing screens.
8. Clean up trust / proof / CTA hierarchy in landing and pricing.

### P3 — Important but After Activation

9. Improve admin polish and safety language.
10. Continue design-system unification across app shells.

## 5. Design / Messaging Principles

Use these as guardrails for future work.

### 5.1 One Primary Next Step Per Screen

Most screens should make one action feel primary and obvious.

### 5.2 Explain State in Human Terms

Prefer:
- connected
- ready to index
- reviewing results
- sharing this library

Over:
- sync state
- payload
- API setup
- manifest-oriented language

### 5.3 Move Technical Concepts Down a Layer

Technical detail should exist, but not lead.

Examples:
- API key belongs in advanced account control, not central onboarding
- ZIP / manifest belongs in installation help, not acquisition messaging

### 5.4 Reward the User Early

The first meaningful win should happen fast:
- install
- index
- see something useful

### 5.5 Let Advanced Capability Reveal Itself Gradually

Power is a strength, but it should unfold progressively.

## 6. What Already Feels Strong

- The plugin + gallery + sharing model is compelling.
- The normalized architecture now supports a cleaner user experience.
- The download page is close to a strong onboarding step.
- Pricing and plan visibility are much clearer than before.
- Operational visibility in admin is strong enough to support launch-stage learning.

## 7. Practical Recommendation

The next major design/product effort should not be random UI polish.

It should be an activation program focused on:
1. first-time user path
2. terminology cleanup
3. gallery simplification for new users
4. share simplification
5. outcome-led messaging

That work is specified in:
- [docs/ACTIVATION_PLAN.md](/Users/ranmor/Documents/FigDex%20Codex/docs/ACTIVATION_PLAN.md)
