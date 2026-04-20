# Indexo Plugin - Changelog

## Version 1.32.39 - Storage-First Stabilization and Gallery Repair
**Date:** April 2026

### ✅ Added / Changed
- `storage-first` indexing is now the active plugin upload path
- upload session flow sends page metadata and cover metadata
- cover page is always included in indexing runs
- hidden frames are skipped during indexing
- plugin progress UI now shows elapsed / total / remaining time
- run summary log added for indexing load analysis
- temporary `Repair gallery` action added for legacy files

### ✅ Gallery / Web Alignment
- repaired page order and page metadata can now be pushed from plugin repair flow
- cover refresh is included in repair and indexing paths
- plugin no longer marks pages as indexed before commit really succeeds

## Version 1.32.02 - Guest and Free Flow Stabilization
**Date:** March 23, 2026

### ✅ Fixed
- Guest users now surface correctly in admin and can be managed from the web.
- File detection now stays scoped to the current Figma file and no longer leaks across other files.
- Reopening the plugin restores the current file link without falsely reusing another file state.
- Connected users no longer see false "already indexed" state on a new file.
- Plan limit errors no longer disconnect the user or show expired-session behavior.
- Limit checks run before export/upload begins, so blocked actions stop immediately.
- Free plan flow now consistently enforces 2 files and 500 total frames.
- Cover handling stays at file level and remains stable during chunked page uploads.

## Early 2026 Historical Milestones
**Date:** January-February 2026

### Archived summary
- New-user onboarding flow was stabilized and validated end-to-end during the early 2026 guest/free-flow work.
- Telemetry events were added for plugin boot, connect flow, indexing start/done, and gallery open.
- Cover handling was aligned between plugin and gallery lobby.
- Gallery lobby file click behavior was stabilized so file selection opens frames correctly.

---

## Version 1.31.00 (Current)
**Date:** January 31, 2026

### Notes
- Unregistered User (First time open): Flow 1 - step 1 - complete
- Telemetry: full flow events sent to web API and stored in DB; admin page at /admin/telemetry

---

## Version 9.0 - Security & Page Exclusion
**Date:** January 7, 2026

### ✅ Added
- **Data Encryption**: Implemented AES-256-GCM encryption for sensitive data
  - Web system tokens encrypted
  - Supabase tokens encrypted
  - User information encrypted
- **Page Exclusion**: Added ability to exclude pages from indexing
  - Context menu with "Exclude from index" option
  - Visual indicators for excluded pages (🚫 icon, dimmed appearance)
  - Warning message for pages already in index
  - Excluded pages automatically removed on next re-index
- **Enhanced Success Notifications**: Improved UX for connected users
  - Header notification for index creation
  - Success banner at top of content
  - Content remains visible after indexing

### 🔧 Technical Changes
- Added encryption/decryption functions using Web Crypto API
- Implemented key derivation based on document ID
- Added `excludedPages` array and persistence
- Updated `createAdvancedFramesIndexPage` to remove excluded pages
- Enhanced context menu with proper positioning
- Added success banner component with auto-hide

### 🔒 Security Improvements
- Sensitive tokens now encrypted before storage
- Document-specific encryption keys
- No plaintext storage of authentication data
- Backward compatible (auto-decrypts existing data)

---

## Version 8.0 - Page Selection Persistence
**Date:** December 2024

### ✅ Fixed
- **Page Selection Persistence**: Fixed page selection not saving between sessions
- **Removed localStorage conflicts**: Eliminated conflicts between localStorage and pluginData
- **Immediate save triggers**: Added automatic saving when page selection changes
- **Proper loading**: Fixed loading of saved page selection on plugin startup
- **UI synchronization**: Ensured UI reflects saved state correctly

### 🔧 Technical Changes
- Moved page selection persistence from localStorage to pluginData
- Added `savePagesSelection()` calls in checkbox change handlers
- Fixed `toggleSelectCheckbox` to save selection immediately
- Removed duplicate event handlers that caused conflicts
- Added proper error handling for JSON parsing

---

## Version 7.0 - Image Quality Persistence
**Date:** December 2024

### ✅ Added
- **Image Quality Persistence**: Image quality selection now saves between sessions
- **PluginData Integration**: Image quality stored in Indexo page pluginData
- **UI Synchronization**: Button highlighting syncs with saved quality setting

### 🔧 Technical Changes
- Added `set-image-quality` message handler in code.js
- Implemented `loadImageQualityFromIndexPage()` function
- Fixed button highlighting logic with proper type conversion
- Removed localStorage dependency for image quality

---

## Version 6.0 - Frame Indexing Tools Enhancement
**Date:** December 2024

### ✅ Added
- **Enhanced Frame Marking Tools**: Improved UI for marking frames as "No-Index"
- **Scope Selection**: Added radio buttons for "Selected Frames" vs "Page" mode
- **Unmark No-Index Button**: Added ability to remove No-Index marking
- **Dynamic Button States**: Buttons enable/disable based on selection and mode

### 🔧 Technical Changes
- Added radio buttons for selection scope
- Implemented `updateIndexButtonsState()` function
- Added `unmark-no-index` message handler
- Enhanced selection status checking

---

## Version 5.0 - File Key Persistence
**Date:** December 2024

### ✅ Added
- **File Key Persistence**: Figma file key now saves within the Figma file itself
- **Auto-Load**: File key automatically loads when plugin opens in the same file
- **UI Synchronization**: Button text updates correctly after auto-load

### 🔧 Technical Changes
- Implemented `loadFileKeyFromIndexPage()` function
- Added pluginData storage for file key on Indexo page
- Fixed UI message handling for `set-file-key`
- Added proper error handling for file key loading

---

## Version 4.0 - Index Section Reordering
**Date:** December 2024

### ✅ Added
- **Index Section Reordering**: Sections now order according to Figma page tree order
- **Page Index Tracking**: Each group frame stores its page index in pluginData
- **Automatic Sorting**: Index sections automatically sort by page order

### 🔧 Technical Changes
- Implemented `reorderIndexSectionsByFigmaOrder()` function
- Added `pageIndex` storage in group frame pluginData
- Enhanced `createAdvancedFramesIndexPage()` to save page indices
- Added reorder button and functionality

---

## Version 3.0 - Progress Drawer UX
**Date:** December 2024

### ✅ Added
- **Progress Drawer**: Redesigned progress bar as modal drawer from bottom
- **Dark Overlay**: Added darkening overlay during indexing process
- **Better UX**: Improved user experience during long operations

### 🔧 Technical Changes
- Added `#progressOverlay` and `#progressDrawer` HTML elements
- Implemented `showProgressDrawer()` and `hideProgressDrawer()` functions
- Moved progress elements into drawer structure
- Enhanced progress visualization

---

## Version 2.0 - Advanced Indexing Features
**Date:** December 2024

### ✅ Added
- **Advanced Frame Indexing**: Enhanced indexing with better organization
- **Page Selection**: Users can select specific pages for indexing
- **Frame Filtering**: Automatic filtering of frames with [NO_INDEX] tag
- **Section Support**: Support for frames within sections
- **JSON Export**: Export indexed data as JSON file for web system integration

### 🔧 Technical Changes
- Implemented `createAdvancedFramesIndexPage()` function
- Added page selection UI with checkboxes
- Enhanced frame detection and filtering logic
- Added JSON export functionality
- Improved error handling and progress tracking

---

## Version 1.0 - Basic Plugin Foundation
**Date:** December 2024

### ✅ Added
- **Basic Plugin Structure**: Initial plugin setup with manifest and UI
- **Figma API Integration**: Basic integration with Figma plugin API
- **Simple UI**: Basic user interface for plugin interaction
- **Frame Detection**: Basic frame detection and listing

### 🔧 Technical Changes
- Created plugin manifest.json
- Implemented basic UI.html interface
- Added code.js with Figma API integration
- Basic frame finding and display functionality

---

## Core Features Summary

### 🎯 Main Functionality
- **Automatic Index Creation**: Creates organized index pages from Figma frames
- **Page Selection**: Choose which pages to include in the index
- **Frame Marking**: Mark frames as "No-Index" to exclude them
- **File Key Management**: Store and auto-load Figma file keys
- **Image Quality Control**: Adjust export quality for different use cases
- **JSON Export for Web System**: Export structured JSON for web-based index display with search functionality

### 🔄 Persistence Features
- **File Key Persistence**: Saves within Figma file via pluginData
- **Image Quality Persistence**: Remembers quality setting between sessions
- **Page Selection Persistence**: Remembers selected pages between sessions
- **Cross-Session Compatibility**: Works across different Figma sessions

### 🎨 User Experience
- **Progress Visualization**: Real-time progress tracking with drawer UI
- **Error Handling**: Comprehensive error messages and recovery
- **Responsive Design**: Clean, modern interface design
- **Keyboard Shortcuts**: Efficient interaction patterns

### 🔧 Technical Architecture
- **PluginData Storage**: Persistent data storage within Figma files
- **Message Passing**: Robust communication between UI and main thread
- **Async Operations**: Proper handling of asynchronous Figma API calls
- **Error Recovery**: Graceful handling of errors and edge cases
- **Web System Integration**: JSON export designed for web-based index display with search capabilities

---

## File Structure
```
indexo-2/
├── manifest.json          # Plugin manifest and configuration
├── code.js               # Main plugin logic (Figma API integration)
├── ui.html               # User interface and interaction logic
├── readme.txt            # Basic documentation
└── CHANGELOG.md          # This changelog file
```

## Dependencies
- **Figma Plugin API**: Core functionality
- **No external libraries**: Pure JavaScript implementation
- **HTML/CSS**: Modern web standards for UI

## Web System Integration
The plugin exports JSON data that integrates with a web-based index display system featuring:
- **Search Functionality**: Full-text search across frame names and descriptions
- **Interactive Interface**: Web-based browsing of Figma frame index
- **Real-time Updates**: Dynamic updates when JSON is refreshed
- **Cross-platform Access**: Accessible from any web browser

---

*This changelog documents the complete evolution of the Indexo plugin from initial concept to current stable version.* 
