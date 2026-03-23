# FigDex Release v1.32.02

**Date:** March 23, 2026

## Summary

This release stabilizes the guest and free user flows across the plugin and web app after full end-to-end testing.

## Highlights

- Guest users are now visible in admin and can be deleted.
- Guest limits behave correctly by logical Figma file, not by internal page.
- Free users are limited to 2 files and 500 total frames.
- Plugin checks limits before export/upload begins.
- File detection stays bound to the current Figma file across reconnect and reopen.
- Gallery lobby groups multiple indexed pages from the same Figma file under one logical file.
- File cover remains stable and is not overwritten by later chunked page uploads.

## Validation

- Guest flow verified.
- Free connected-user flow verified.
- Reopen and reconnect behavior verified.
- Early blocking on plan-limit overflow verified.
