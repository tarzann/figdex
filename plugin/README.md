# FigDex Plugin

**Runtime version:** `v1.32.39`  
**Last Updated:** April 20, 2026

---

## 📋 Description

The FigDex Plugin is the current production plugin used to:
- connect the active Figma file to FigDex Web
- select pages for indexing
- always include the `cover` page on indexing runs
- exclude hidden frames from indexing
- upload through the stable `storage-first` session flow
- repair older gallery metadata when needed
- show progress, ETA, and end-of-run summaries

---

## 🔒 Security & Data Protection

### Data Encryption

The plugin implements encryption for sensitive data stored in the FigDex page:

**Encrypted Data:**
- `__WEB_SYSTEM_TOKEN__` - Web system authentication token
- `__SUPABASE_ACCESS_TOKEN__` - Supabase access token
- `__SUPABASE_REFRESH_TOKEN__` - Supabase refresh token
- `__WEB_SYSTEM_USER__` - User information (email, name, etc.)

**Unencrypted Data (non-sensitive):**
- `__SELECTED_PAGES__` - Selected page IDs
- `__EXCLUDED_PAGES__` - Excluded page IDs
- `__IMAGE_QUALITY__` - Image quality setting
- `__FRAME_TAGS__` - Frame tags
- `__FILE_KEY__` - Figma file key (public identifier)

**Encryption Method:**
- Algorithm: AES-256-GCM (symmetric encryption)
- Key Derivation: Based on document ID for file-specific encryption
- Implementation: Web Crypto API (browser-native, secure)

**Security Benefits:**
- Protects authentication tokens from unauthorized access
- Prevents token misuse if file is accidentally shared
- Maintains security even if file is exported or backed up
- No performance impact on normal operations

---

## 🚀 Installation

1. Open Figma Desktop App
2. Go to Plugins → Development → Import plugin from manifest...
3. Select the `manifest.json` file from this directory

---

## ✨ Current Features

- **Storage-first indexing**: `session -> append -> commit`
- **Page selection**: Select which pages to include
- **Automatic cover refresh**: `cover` is always re-indexed
- **Hidden frame filtering**: hidden frames are skipped
- **Progress feedback**: progress bar, elapsed time, total estimate, time remaining
- **Run summary logging**: request load summary and verdict in console
- **Repair flow**: temporary `Repair gallery` support for older files
- **Secure storage**: encrypted sensitive identity/session data

---

## 🔧 Requirements

- Figma Desktop App
- FigDex Web account (for uploading)
- API Key from FigDex Web system

---

## 📝 Current Usage

1. Open the plugin in a Figma file
2. Connect your FigDex account if needed
3. Save / confirm the active file link
4. Select pages for indexing
5. Start indexing
6. Review the result in FigDex Web

Notes:
- the `cover` page is included automatically
- hidden frames are skipped automatically
- large runs may warn, but they are not blocked

---

## 🔗 Related

- **Web Application**: https://www.figdex.com
- **API Documentation**: See web application documentation

---

## 📄 Important Files

- [plugin/code.js](/Users/ranmor/Documents/FigDex%20Codex/plugin/code.js) - active plugin runtime and bundled UI source
- [plugin/manifest.json](/Users/ranmor/Documents/FigDex%20Codex/plugin/manifest.json) - plugin manifest
- [plugin/ui.html](/Users/ranmor/Documents/FigDex%20Codex/plugin/ui.html) - legacy/reference UI file only
- [web/lib/plugin-release.ts](/Users/ranmor/Documents/FigDex%20Codex/web/lib/plugin-release.ts) - release version source of truth
- [plugin/CHANGELOG.md](/Users/ranmor/Documents/FigDex%20Codex/plugin/CHANGELOG.md) - plugin history

---

**Runtime Version:** `v1.32.39`  
**Build Date:** April 20, 2026

---

## 🔄 Recent Updates

### v1.32.39 (April 2026)
- ✅ `storage-first` indexing stabilized as the active plugin path
- ✅ upload session flow now persists page metadata and cover metadata
- ✅ hidden frames no longer get indexed
- ✅ cover page is always included in indexing runs
- ✅ progress bar and ETA added to indexing flow
- ✅ end-of-run summary log added
- ✅ temporary `Repair gallery` action added for older files
- ✅ gallery/order repair flow hardened for existing files

### v1.30.65 (January 2, 2026)
- ✅ Frame indexing improvements
- ✅ Tag management enhancements
