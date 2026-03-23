# FigDex - Version Information

**Current Version:** v1.32.02  
**Release Date:** March 23, 2026  
**Build Timestamp:** 2026-03-23 19:37:53 IST

---

## Version History

### v1.32.02 (March 23, 2026)
- Guest users now appear in admin and can be deleted.
- Gallery lobby groups multiple pages from the same Figma file into one logical file.
- File cover is preserved at file level and no longer replaced by later chunk uploads.
- Connected-user file detection and reopen flow were stabilized.
- Free plan limits now enforce 2 files and 500 total frames.
- Plugin indexing now performs a pre-check before export/upload and stops immediately on limit overflow.

### v1.30.18 (December 25, 2025)
- **Gallery Lobby View**: New unified navigation menu with file thumbnails
- **All Frames View**: New view mode to display all frames from all files
- **Enhanced Search**: Search in lobby mode searches across all frames
- **Smart View Switching**: Lobby shows file thumbs by default, switches to frames when searching
- **File Thumbnail Support**: Uses thumbnails from saved_connections for consistency
- **5:3 Aspect Ratio**: Applied to all thumbnails for consistent display
- **Bug Fixes**: Fixed file click navigation, thumbnail display, and search functionality

### v1.30.6 (December 24, 2025)
- **Add-ons Management Enhancement**: Updated Add-ons to use packages from database instead of hardcoded values
- **Admin UI**: Added sorting functionality to all columns in Add-ons Management tables
- **Add-on Packages**: Complete management system for predefined add-on packages

### v1.30.2 (December 24, 2025)
- **Add-ons Management**: Initial implementation of Add-ons Management page
- **User Add-ons Tab**: View and manage user subscriptions
- **Add-on Packages Tab**: Manage predefined add-on packages

### v1.29.0 (December 23, 2025)
- **New Sharing System**: User-level sharing for all indices and search results
- **Share Links**: Shortened URL-safe tokens (16 characters)
- **Share Name**: Custom naming for share links
- **Gallery Sharing**: Share entire gallery or specific search results

### v1.28.0 (December 22, 2025)
- **Email Notifications**: Complete email notification system for job completion/failure
- **Credits System UI**: Full credits display and management in user account
- **Admin Credit Management**: Admin can grant/deduct credits and manage reset dates
- **Credits Transaction History**: Complete transaction log with filtering
- **Enhanced Error Handling**: Better error recovery and logging
- **Indexed Page Status Fix**: Fixed display of indexed pages after deletion

### v1.14.0 (November 6, 2025)
- **Major Release**: Significant improvements and bug fixes
- See `docs/releases/CHANGELOG_v1.14.0.md` for details

---

## Version Numbering Scheme

- **Major version (v1.x.x)**: Major feature changes or page rebuilds
- **Minor version (vx.30.x)**: New features or significant improvements
- **Patch version (vx.x.6)**: Bug fixes and minor improvements

---

## Current System Status

✅ **Production Ready**

All core features are operational:
- Figma API Integration
- Index Management
- Gallery Interface
- Project Management
- User Authentication
- Admin Dashboard
- Subscription System with Add-ons
- Sharing System
- Email Notifications

---

## Technology Stack

- **Frontend**: Next.js 15.5.9, React 19.1.0, Material-UI 7.2.0
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **Authentication**: Supabase Auth (OAuth + Email/Password)
- **Email**: Resend

---

**Last Updated:** March 23, 2026  
**Version:** v1.32.02
