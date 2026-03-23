# FigDex Plugin

**Version:** v1.32.02  
**Last Updated:** March 23, 2026

---

## 📋 Description

The FigDex Plugin is a Figma plugin that allows users to:
- Index Figma frames from the "IndeXo" page
- Upload indices to the FigDex web system
- Tag frames for better organization
- Manage file connections and limits
- Exclude pages from indexing
- Secure storage of sensitive data (tokens, user info)

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

## ✨ Features

- **Frame Indexing**: Index frames from the "IndeXo" page
- **Web Upload**: Upload indices to FigDex Web system
- **Frame Tagging**: Add tags to frames for better organization
- **File Limits**: View and manage file limits based on subscription plan
- **Quality Control**: Adjust image quality for indexed frames

---

## 🔧 Requirements

- Figma Desktop App
- FigDex Web account (for uploading)
- API Key from FigDex Web system

---

## 📝 Usage

1. **Create IndeXo Page**: Create a page named "IndeXo" in your Figma file
2. **Add Frames**: Add frames to the IndeXo page that you want to index
3. **Connect to Web**: Log in to FigDex Web and save your API key
4. **Index Frames**: Use the plugin to index frames from the IndeXo page
5. **Upload to Web**: Upload the index to the FigDex web system

---

## 🔗 Related

- **Web Application**: https://www.figdex.com
- **API Documentation**: See web application documentation

---

## 📄 Files

- `manifest.json` - Plugin manifest file
- `code.js` - Plugin code (runs in Figma)
- `ui.html` - Plugin UI (runs in iframe)
- `README.md` - This file

---

**Version:** v1.32.02  
**Build Date:** March 23, 2026

---

## 🔄 Recent Updates

### v1.32.02 (March 23, 2026)
- ✅ Guest and free user flows stabilized end-to-end
- ✅ Correct per-file detection across reopen, reconnect, and multi-file switching
- ✅ Pre-check of limits before any export or upload begins
- ✅ Free plan aligned to 2 files and 500 total frames
- ✅ File-level cover preserved across page updates and chunked uploads

### v1.30.65 (January 2, 2026)
- ✅ Frame indexing improvements
- ✅ Tag management enhancements
