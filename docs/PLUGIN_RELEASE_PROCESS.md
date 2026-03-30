# FigDex Plugin Release Process

**Last updated:** March 30, 2026

This document defines the release procedure for the public FigDex Figma plugin package.

## 1. Source of Truth

Whenever the plugin version changes, update it in all of these places:

- [plugin/ui.html](/Users/ranmor/Documents/FigDex%20Codex/plugin/ui.html)
- [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js)
- [web/lib/plugin-release.ts](/Users/ranmor/Documents/FigDex%20Codex/web/lib/plugin-release.ts)

These must stay aligned.

## 2. Public Download Package

The public ZIP is published from:
- [web/public/downloads](/Users/ranmor/Documents/FigDex%20Codex/web/public/downloads)

The current download metadata is managed in:
- [web/lib/plugin-release.ts](/Users/ranmor/Documents/FigDex%20Codex/web/lib/plugin-release.ts)

## 3. Files Included in the ZIP

The public package should include:

- `manifest.json`
- `code.js`
- `ui.html`
- `flowController.js`
- `identityStore.js`
- `indexEngine.js`
- `telemetry.js`
- `README.md`

## 4. Release Steps

1. Update plugin version in runtime/UI files.
2. Update [web/lib/plugin-release.ts](/Users/ranmor/Documents/FigDex%20Codex/web/lib/plugin-release.ts).
3. Regenerate the ZIP under [web/public/downloads](/Users/ranmor/Documents/FigDex%20Codex/web/public/downloads).
4. Run:
   - `node -c plugin/code.js`
   - `npm run build` in [web](/Users/ranmor/Documents/FigDex%20Codex/web)
5. Verify:
   - [https://www.figdex.com/download-plugin](https://www.figdex.com/download-plugin)
   - homepage CTA to the download page
   - direct ZIP download URL
6. Push and deploy.

## 5. Common Failure Modes

### 5.1 Version Drift

Symptom:
- plugin shows one version
- website advertises another

Fix:
- align [plugin/ui.html](/Users/ranmor/Documents/FigDex%20Codex/plugin/ui.html), [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js), and [web/lib/plugin-release.ts](/Users/ranmor/Documents/FigDex%20Codex/web/lib/plugin-release.ts)

### 5.2 Wrong Download Path

Symptom:
- `/download-plugin` opens
- download button returns `404`

Fix:
- verify `FIGDEX_PLUGIN_ZIP_FILE` and `FIGDEX_PLUGIN_DOWNLOAD_PATH` in [web/lib/plugin-release.ts](/Users/ranmor/Documents/FigDex%20Codex/web/lib/plugin-release.ts)
