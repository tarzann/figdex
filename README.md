# FigDex - Complete System Documentation

**System Version:** v1.32.02  
**Last Updated:** March 23, 2026  
**Status:** ✅ Production Ready

---

## 📁 מיקום הפרויקט / Project Location

**הפרויקט המלא ממוקם בתיקיית FigDex**  
The entire project is located in the `FigDex` folder:

- **`FigDex/`** – Root (plugin + web)
- **`FigDex/plugin/`** – Figma Plugin
- **`FigDex/web/`** – Web Application (Next.js)

**Git Repository:** https://github.com/tarzann/figdex

---

## 📋 System Overview

FigDex is a comprehensive platform for creating, managing, and sharing searchable indexes of Figma files. The system consists of two main components:

1. **Figma Plugin** - Allows users to index frames from Figma files and upload them to the web system
2. **Web Application** - Provides cloud storage, team sharing, advanced search, and gallery management

---

## 🏗️ System Architecture

```
FigDex/
├── plugin/          # Figma Plugin (Figma Desktop App)
│   ├── manifest.json
│   ├── code.js      # Plugin runtime code
│   ├── ui.html      # Plugin UI
│   └── README.md
│
└── web/             # Web Application (Next.js)
    ├── pages/       # Next.js pages and API routes
    ├── lib/         # Shared libraries and utilities
    ├── components/  # React components
    ├── docs/        # Documentation
    └── package.json
```

---

## 📦 Component Versions

### Plugin Version: v1.32.02
- **Location:** `plugin/`
- **Main Files:**
  - `code.js` - Plugin runtime (v1.32.02)
  - `ui.html` - Plugin UI (v1.32.02)
  - `manifest.json` - Plugin manifest
- **Key Features:**
  - Reads __FRAME_TEXTS__ from thumbnail frames
  - Complete text extraction and search token generation
  - Cover image upload support
  - **Data encryption for sensitive tokens and user info**
  - **Page exclusion from indexing**

### Web Application Version: v1.32.02
- **Location:** `FigDex/web/` (production source for www.figdex.com)
- **Main Components:**
  - API Routes: v1.32.02
  - Gallery Pages: v1.32.02
  - Core Libraries: Latest
- **Key Features:**
  - Advanced search with textContent and searchTokens
  - Cover image display and management
  - Frame count tracking

---

## 🚀 Quick Start

### For AI Assistants

This README provides complete system context. When working on FigDex:

1. **Plugin Development**: Work in `FigDex/plugin/` directory
   - Main code: `FigDex/plugin/code.js`
   - UI: `FigDex/plugin/ui.html`
   - Manifest: `FigDex/plugin/manifest.json`

2. **Web Development**: Work in `FigDex/web/` directory
   - Pages: `FigDex/web/pages/`
   - API Routes: `FigDex/web/pages/api/`
   - Libraries: `FigDex/web/lib/`

3. **Version Tracking**: Always update version numbers in:
   - Plugin: `FigDex/plugin/code.js` (PLUGIN_VERSION)
   - Plugin UI: `FigDex/plugin/ui.html` (menuVersionText)
   - API: `FigDex/web/pages/api/upload-index-v2.ts` (API_VERSION)
   - Pages: `FigDex/web/pages/gallery.tsx` (PAGE_VERSION)

---

## 📁 Directory Structure

### Plugin Directory (`plugin/`)

```
plugin/
├── manifest.json          # Plugin manifest (required by Figma)
├── code.js                # Plugin runtime code (Figma Plugin API)
├── ui.html                # Plugin UI (HTML/CSS/JavaScript)
├── README.md              # Plugin-specific documentation
├── CHANGELOG.md           # Plugin changelog
└── VERSIONS.md            # Version history
```

**Key Features:**
- Frame indexing from FigDex page
- Text extraction from frames (via __FRAME_TEXTS__)
- Image export and upload
- Tag management
- Web system integration

### Web Directory (`web/`)

```
web/
├── pages/                 # Next.js pages and API routes
│   ├── api/               # API endpoints
│   │   ├── upload-index-v2.ts    # Main upload endpoint
│   │   ├── get-index-data.ts     # Index data retrieval
│   │   ├── get-indices.ts        # List indices
│   │   └── storage/               # Storage utilities
│   ├── gallery.tsx        # Main gallery page
│   ├── index-management.tsx      # Index management
│   └── share/[token].tsx  # Shared gallery view
│
├── lib/                   # Shared libraries
│   ├── supabase.ts       # Supabase client
│   ├── plans.ts          # Subscription plans
│   ├── figma-api.ts      # Figma API integration
│   └── ...
│
├── components/           # React components
├── docs/                 # Documentation
│   ├── INSTALLATION.md   # Installation guide
│   ├── SPECIFICATION.md  # System specification
│   └── setup/            # Setup guides
│
├── package.json          # Dependencies
└── vercel.json          # Vercel configuration
```

---

## 🔧 Installation & Setup

### Plugin Installation

1. Open Figma Desktop App
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select `plugin/manifest.json`
4. The plugin will appear in your plugins list

### Web Application Setup

See `web/docs/INSTALLATION.md` for complete setup instructions.

**Quick Setup:**
1. Install dependencies: `cd FigDex/web && npm install`
2. Configure environment variables (see `FigDex/web/docs/setup/ENV_SETUP.md`)
3. Set up Supabase database (see `FigDex/web/docs/setup/SETUP.md`)
4. Deploy to Vercel (see `FigDex/web/docs/setup/VERCEL_SETUP.md`)

---

## 🔑 Key Features

### Plugin Features
- ✅ Frame indexing from FigDex page
- ✅ Complete text extraction (via __FRAME_TEXTS__)
- ✅ Image export with quality control
- ✅ Tag management (predefined + custom tags)
- ✅ Web system integration
- ✅ Cover image upload
- ✅ Progress tracking

### Web Application Features
- ✅ Cloud storage (Supabase Storage)
- ✅ Advanced search (by text content, tags, names)
- ✅ Gallery view with filtering
- ✅ Index management
- ✅ Team sharing (shareable links)
- ✅ User authentication
- ✅ Subscription management (Paddle integration)

---

## 🔄 Data Flow

1. **User creates FigDex page** in Figma with frames
2. **Plugin indexes frames**:
   - Extracts text content (saves to __FRAME_TEXTS__)
   - Exports images
   - Collects tags
3. **Plugin uploads to web**:
   - Images → Supabase Storage
   - Index data → Supabase Database
4. **Web system processes**:
   - Stores index data
   - Generates signed URLs for images
   - Enables search and gallery features

---

## 📊 Database Schema

### Main Tables (Supabase)

- `index_files` - Stores index metadata and data
- `users` - User accounts
- `saved_connections` - Figma file connections
- `subscriptions` - User subscriptions (Paddle)

See `web/docs/SPECIFICATION.md` for complete schema.

---

## 🔍 Search Functionality

The search system indexes:
- **Frame names**
- **Text content** (from __FRAME_TEXTS__)
- **Search tokens** (tokenized text)
- **Tags** (predefined + custom)

Search is performed client-side in `web/pages/gallery.tsx` using:
- Word boundary matching
- Token matching
- Case-insensitive search

---

## 🚢 Deployment

### Plugin
- No deployment needed (runs locally in Figma)
- Users install via manifest.json

### Web Application
- **Production**: Deployed on Vercel
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network

---

## 📝 Version History

### v1.32.02 (Current - March 23, 2026)
- ✅ Guest and free flows stabilized end-to-end
- ✅ Logical file grouping fixed in gallery lobby
- ✅ File-level cover preserved during chunked updates
- ✅ Reconnect and reopen behavior fixed for connected users
- ✅ Free plan limits enforced early: 2 files, 500 total frames

### v1.30.40 (January 3, 2026)
- ✅ Fixed text extraction from __FRAME_TEXTS__
- ✅ Improved search functionality
- ✅ Added comprehensive logging
- ✅ Fixed cover image upload
- ✅ Fixed frame count display

### Previous Versions
See `plugin/VERSIONS.md` and `web/docs/VERSION.md` for detailed history.

---

## 🛠️ Development

### Plugin Development
- Edit `plugin/code.js` for plugin logic
- Edit `plugin/ui.html` for UI
- Test in Figma Desktop App
- Reload plugin after changes

### Web Development
- Edit `FigDex/web/pages/` for pages
- Edit `FigDex/web/pages/api/` for API routes
- Run `npm run dev` from `FigDex/web` for local development
- Deploy with `cd FigDex/web && npx vercel --prod`

---

## 📚 Documentation

### Plugin Documentation
- `plugin/README.md` - Plugin overview
- `plugin/CHANGELOG.md` - Plugin changelog

### Web Documentation
- `web/docs/INSTALLATION.md` - Installation guide
- `web/docs/SPECIFICATION.md` - System specification
- `web/docs/FEATURES.md` - Features list
- `web/docs/setup/` - Setup guides

---

## 🔗 External Services

- **Figma API** - Frame data and images
- **Supabase** - Database and storage
- **Vercel** - Hosting and deployment
- **Paddle** - Payment processing
- **Resend** - Email service

---

## ⚙️ Environment Variables

### Web Application Required Variables

See `web/docs/setup/ENVIRONMENT_VARIABLES.md` for complete list.

**Key Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `PADDLE_API_KEY` - Paddle API key (for payments)
- `RESEND_API_KEY` - Resend API key (for emails)

---

## 🐛 Troubleshooting

### Plugin Issues
- **Plugin not loading**: Check manifest.json path
- **Text not extracted**: Verify __FRAME_TEXTS__ exists in FigDex page
- **Upload fails**: Check API key and network connection

### Web Issues
- **Search not working**: Verify textContent and searchTokens in database
- **Images not loading**: Check Supabase Storage configuration
- **API errors**: Check Vercel logs and environment variables

---

## 📞 Support

For issues or questions:
1. Check documentation in `web/docs/`
2. Review changelogs in `plugin/CHANGELOG.md`
3. Check Vercel logs for API errors
4. Review browser console for client-side errors

---

## 📄 License

[Add license information if applicable]

---

## 🎯 Next Steps

When continuing development:

1. **Always update version numbers** in all relevant files
2. **Test plugin in Figma** before committing changes
3. **Test web locally** with `npm run dev`
4. **Deploy to Vercel** for production testing
5. **Update this README** with significant changes

---

**Last Updated:** March 23, 2026  
**System Version:** v1.32.02  
**Status:** ✅ Production Ready
