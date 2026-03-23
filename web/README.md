# FigDex - Figma Indexing Platform

**Version:** v1.32.02  
**Last Updated:** March 23, 2026

A comprehensive platform for creating, managing, and sharing searchable indexes of Figma files.

---

## 🚀 Quick Start

### New Installation
See **[docs/INSTALLATION.md](./docs/INSTALLATION.md)** for complete installation instructions.

### Documentation
All documentation is organized in the `docs/` directory:

- **[docs/VERSION.md](./docs/VERSION.md)** - Version information and history
- **[docs/SPECIFICATION.md](./docs/SPECIFICATION.md)** - Complete system specification
- **[docs/FEATURES.md](./docs/FEATURES.md)** - Complete features list
- **[docs/INSTALLATION.md](./docs/INSTALLATION.md)** - Installation instructions
- **[docs/setup/](./docs/setup/)** - Setup guides and configuration
- **[docs/specifications/](./docs/specifications/)** - Technical specifications
- **[docs/releases/](./docs/releases/)** - Release notes and changelogs

---

## 📚 Main Documentation

### Core Documentation Files

- **[docs/SPECIFICATION.md](./docs/SPECIFICATION.md)** - Complete system specification
  - System overview and architecture
  - Database schema
  - API specification
  - Configuration guide

- **[docs/FEATURES.md](./docs/FEATURES.md)** - Complete features list
  - All features with status
  - Missing features
  - Recent updates

- **[docs/INSTALLATION.md](./docs/INSTALLATION.md)** - Installation instructions
  - Step-by-step installation
  - Database setup
  - Environment configuration
  - Deployment instructions

- **[docs/VERSION.md](./docs/VERSION.md)** - Version information
  - Current version: v1.32.02
  - Version history
  - Release notes

- **[COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)** - Complete system documentation
  - Detailed architecture
  - Full API documentation
  - UI features
  - Troubleshooting

### Setup & Configuration

- **[docs/setup/SETUP.md](./docs/setup/SETUP.md)** - Detailed setup guide
- **[docs/setup/RESTORE.md](./docs/setup/RESTORE.md)** - Restoration guide
- **[docs/setup/ENVIRONMENT_VARIABLES.md](./docs/setup/ENVIRONMENT_VARIABLES.md)** - Environment variables
- **[docs/setup/VERCEL_SETUP.md](./docs/setup/VERCEL_SETUP.md)** - Vercel deployment
- **[docs/setup/EMAIL_SETUP.md](./docs/setup/EMAIL_SETUP.md)** - Email configuration

### Specifications

- **[docs/specifications/](./docs/specifications/)** - Technical specifications
  - System specifications
  - Subscription model
  - Sharing system
  - Monthly limits

---

## 🎯 Key Features

- **Figma File Indexing**: Create searchable indexes via Figma API
- **Gallery Interface**: Browse and search with advanced filtering
- **Project Management**: Organize projects with metadata and status tracking
- **Sharing System**: User-level and search results sharing with shortened links
- **Version Tracking**: Track changes for efficient re-indexing
- **Thumbnail Generation**: Automatic thumbnails for faster loading
- **Subscription System**: Monthly subscription with add-ons (files, frames, daily indexes)
- **Admin Dashboard**: Complete user and system management
- **Email Notifications**: Notifications on job completion/failure

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.5.9, React 19.1.0, Material-UI 7.2.0
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **Authentication**: Supabase Auth (OAuth + Email/Password)
- **Email**: Resend

---

## 📦 Quick Installation

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel account
- Figma Personal Access Token

### Quick Install

```bash
# Clone repository
git clone <repository-url>
cd FigDex/web

# Install dependencies
npm install

# Set up environment variables
# Create .env.local with your credentials (see docs/INSTALLATION.md)

# Set up database (see docs/INSTALLATION.md for details)
# Run SQL scripts in sql/ directory

# Start development server
npm run dev
```

For detailed instructions, see **[docs/INSTALLATION.md](./docs/INSTALLATION.md)**.

---

## 🔧 Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## 🗄️ Database

Database schema is managed via SQL scripts in the `sql/` directory. Run scripts in order as documented in **[docs/INSTALLATION.md](./docs/INSTALLATION.md)**.

Key tables:
- `users` - User accounts
- `index_files` - Stored indexes
- `index_jobs` - Background jobs
- `saved_connections` - Figma connections
- `projects` - Project management
- `index_archives` - Version history
- `user_addons` - User subscription add-ons
- `addon_packages` - Predefined add-on packages
- `shared_views` - Share link configurations

---

## 🔌 API

Main API endpoints:

- `/api/auth/*` - Authentication
- `/api/create-index-from-figma` - Create index
- `/api/get-indices` - List indices
- `/api/get-index-data` - Get index data
- `/api/saved-connections` - Manage connections
- `/api/projects` - Project management
- `/api/user/share` - Sharing management
- `/api/user/addons` - User add-ons
- `/api/admin/*` - Admin functions

See **[COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)** for full API documentation.

---

## 🌐 Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel Dashboard → Settings → Environment Variables.

See **[docs/setup/VERCEL_SETUP.md](./docs/setup/VERCEL_SETUP.md)** for detailed deployment instructions.

---

## 📊 System Status

**Current Version:** v1.32.02

### Recent Updates (v1.32.02)
- ✅ Guest and free user flows stabilized end-to-end
- ✅ Gallery lobby grouping fixed for multiple pages from the same Figma file
- ✅ File-level cover preservation fixed for page updates and chunked uploads
- ✅ Connected-user indexing state fixed across reconnect and reopen
- ✅ Free plan limits enforced at 2 files and 500 total frames with early blocking

---

## 🆘 Support

For issues or questions:

1. Check documentation in `docs/` directory
2. Review error logs
3. Contact: support@figdex.com

---

## 📝 License

[Your License Here]

---

## 🔗 Quick Links

- **Version Info**: [docs/VERSION.md](./docs/VERSION.md)
- **Complete Spec**: [docs/SPECIFICATION.md](./docs/SPECIFICATION.md)
- **Features List**: [docs/FEATURES.md](./docs/FEATURES.md)
- **Installation**: [docs/INSTALLATION.md](./docs/INSTALLATION.md)
- **Complete Docs**: [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)

---

**Last Updated:** December 24, 2025  
**Version:** v1.32.02
