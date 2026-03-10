# FigDex - Complete System Specification

**Version:** v1.30.6  
**Last Updated:** December 24, 2025  
**Documentation Version:** 2.0

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture](#architecture)
4. [Core Features](#core-features)
5. [Database Schema](#database-schema)
6. [API Specification](#api-specification)
7. [User Interface](#user-interface)
8. [Authentication & Security](#authentication--security)
9. [Subscription & Pricing Model](#subscription--pricing-model)
10. [Deployment Architecture](#deployment-architecture)
11. [Configuration](#configuration)

---

## 🎯 Executive Summary

**FigDex** is a comprehensive Figma indexing platform that allows users to create searchable indexes of their Figma files, manage projects, and share indexed content with teams. The system provides a seamless workflow for organizing, discovering, and collaborating on design assets at scale.

### Problem Statement

Design teams working in Figma face challenges finding and managing design elements as files grow to hundreds or thousands of frames across multiple pages. FigDex solves this by automatically indexing all design frames, extracting searchable metadata, and providing instant discovery across entire design libraries.

### Key Value Propositions

- **Instant Design Discovery**: Full-text search across all indexed frames
- **Centralized Design Library**: Web gallery with organized, taggable views
- **Team Collaboration**: Public sharing links for stakeholders without Figma accounts
- **Version Tracking**: Automatic change detection for efficient re-indexing
- **Project Management**: Organize designs with metadata, status tracking, and team collaboration

---

## 🏗️ System Overview

### Technology Stack

- **Frontend**: Next.js 15.5.9, React 19.1.0, Material-UI 7.2.0
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **Authentication**: Supabase Auth (OAuth + Email/Password)
- **Email**: Resend

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  (React/Next.js Frontend - Material-UI Components)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│              Vercel (Edge Network)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js Serverless Functions (API Routes)       │  │
│  │  - Authentication                                │  │
│  │  - Index Management                              │  │
│  │  - Figma API Integration                         │  │
│  │  - Background Job Processing                     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
             │                          │
    ┌────────▼────────┐      ┌─────────▼─────────┐
    │   Supabase      │      │   Figma API       │
    │   PostgreSQL    │      │   (External)      │
    │   + Storage     │      │                   │
    └─────────────────┘      └───────────────────┘
```

---

## 🎨 Core Features

### 1. Figma API Integration

- **Saved Connections**: Store Figma Personal Access Tokens and file keys
- **Page Selection**: Choose specific pages to index
- **Frame Counting**: Automatic frame counting per page
- **Version Tracking**: Track changes in Figma files
- **Change Detection**: Identify changed pages for re-indexing
- **Background Processing**: Asynchronous job processing with progress tracking

### 2. Index Management

- **Index Creation**: Create indexes from Figma files via API
- **Background Jobs**: Queue-based processing for large indexes
- **Job Splitting**: Automatic splitting of large jobs into chunks
- **Progress Monitoring**: Real-time progress tracking
- **Email Notifications**: Notifications on job completion/failure
- **Thumbnail Generation**: Automatic thumbnail creation for faster loading
- **Archive System**: Version history and restoration capabilities

### 3. Gallery Interface

- **Masonry Layout**: Responsive grid layout for frames
- **Full-Text Search**: Search across all frame content
- **Advanced Filtering**: Filter by file, tags, favorites
- **Tag System**: Naming tags, size tags, custom tags
- **Image Modal**: Full-screen image viewer
- **Lazy Loading**: Progressive image loading
- **Responsive Design**: Mobile, tablet, desktop support

### 4. Project Management

- **Project CRUD**: Create, read, update, delete projects
- **Metadata**: Figma links, Jira links, descriptions
- **Status Tracking**: To Do, In Progress, Waiting, Completed, Canceled, Archived
- **People Management**: Assign people to projects
- **Search & Filter**: Find projects quickly

### 5. Sharing System

- **User-Level Sharing**: Share all indices with a single link
- **Search Results Sharing**: Share specific search results
- **Share Links**: Shortened, URL-safe tokens (16 characters)
- **Custom Names**: Name share links for easy identification
- **Read-Only Access**: View-only access for shared content
- **Toggle Links**: Enable/disable share links

### 6. Subscription & Add-ons

- **Plan System**: Free, Pro, Team plans with different limits
- **Monthly Limits**: Files, frames, daily indexes
- **Add-on Packages**: Purchase additional files, frames, or daily indexes
- **Rate Limiting**: Daily index creation limits
- **Admin Management**: Manage user subscriptions and add-ons

### 7. Admin Dashboard

- **User Management**: View, edit, delete users
- **Index Management**: View and manage all indices
- **Job Management**: View job logs, debug jobs, track metrics
- **Analytics**: System statistics and usage metrics
- **Add-ons Management**: Manage add-on packages and user subscriptions

---

## 🗄️ Database Schema

### Core Tables

#### `users`
User accounts and authentication

```sql
- id (UUID, Primary Key)
- email (VARCHAR, Unique, Not Null)
- full_name (VARCHAR)
- api_key (VARCHAR, Unique)
- plan (VARCHAR, Default: 'free')
- provider (VARCHAR) -- 'google', 'email'
- is_admin (BOOLEAN, Default: false)
- is_active (BOOLEAN, Default: true)
- public_enabled (BOOLEAN, Default: false)
- public_slug (VARCHAR, Unique)
- created_at, updated_at (TIMESTAMPTZ)
```

#### `index_files`
Stored indexes with metadata

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- project_id (VARCHAR)
- figma_file_key (VARCHAR)
- file_name (VARCHAR)
- index_data (JSONB)
- frame_tags, custom_tags, naming_tags, size_tags (TEXT[])
- is_public (BOOLEAN, Default: false)
- share_token (UUID)
- figma_version, figma_last_modified
- frame_ids (TEXT[])
- uploaded_at, created_at (TIMESTAMPTZ)
```

#### `index_jobs`
Background job tracking

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- file_key, file_name (VARCHAR)
- project_id (VARCHAR)
- manifest, frame_node_refs, document_data, page_meta (JSONB)
- selected_pages, selected_page_ids (TEXT[])
- status (VARCHAR) -- pending, processing, completed, failed
- next_frame_index (INTEGER, Default: 0)
- total_frames (INTEGER)
- processing_state (JSONB)
- figma_version, figma_last_modified
- image_quality (NUMERIC, Default: 0.7)
- error (TEXT)
- created_at, updated_at (TIMESTAMPTZ)
```

#### `saved_connections`
Saved Figma API connections

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- file_key (VARCHAR, Not Null)
- file_name (VARCHAR, Not Null)
- figma_token (VARCHAR, Not Null)
- pages (TEXT[])
- page_meta (JSONB)
- image_quality (VARCHAR, Default: '0.7')
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE(user_id, file_key)
```

#### `projects`
Project management

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- serial_number (SERIAL)
- figma_link, jira_link (TEXT)
- description (TEXT, Not Null)
- date (DATE, Default: CURRENT_DATE)
- people (TEXT[])
- status (TEXT, Default: 'To Do')
- created_at, updated_at (TIMESTAMPTZ)
```

#### `user_addons`
User subscription add-ons

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- addon_type (VARCHAR) -- 'files', 'frames', 'rate_limit'
- addon_value (INTEGER)
- price_usd (DECIMAL)
- status (VARCHAR) -- 'active', 'cancelled', 'expired', 'pending'
- start_date, end_date (DATE)
- stripe_subscription_item_id (VARCHAR)
- created_at, updated_at (TIMESTAMPTZ)
```

#### `addon_packages`
Predefined add-on packages

```sql
- id (UUID, Primary Key)
- addon_type (VARCHAR) -- 'files', 'frames', 'rate_limit'
- addon_value (INTEGER)
- price_usd (DECIMAL)
- display_name (VARCHAR)
- description (TEXT)
- enabled (BOOLEAN, Default: true)
- sort_order (INTEGER, Default: 0)
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE(addon_type, addon_value)
```

#### `shared_views`
Share link configurations

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users)
- share_type (VARCHAR) -- 'all_indices', 'search_results'
- token (VARCHAR, Unique, Not Null)
- enabled (BOOLEAN, Default: true)
- search_params (JSONB)
- share_name (VARCHAR)
- created_at, updated_at (TIMESTAMPTZ)
```

See `sql/` directory for complete SQL scripts.

---

## 🔌 API Specification

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/session` - Get current session

### Index Management Endpoints

- `POST /api/create-index-from-figma` - Create index from Figma
- `GET /api/get-indices` - List user indices
- `GET /api/get-index-data` - Get index data
- `DELETE /api/delete-index` - Delete index

### Connection Management

- `GET /api/saved-connections` - List saved connections
- `POST /api/saved-connections` - Create connection
- `PUT /api/saved-connections` - Update connection
- `DELETE /api/saved-connections` - Delete connection

### Job Management

- `GET /api/get-job-status` - Get job status
- `GET /api/admin/jobs` - List all jobs (admin)

### Sharing

- `GET /api/user/share` - List user share links
- `POST /api/user/share` - Create share link
- `PUT /api/user/share` - Update share link
- `DELETE /api/user/share` - Delete share link
- `GET /api/public/shared-view/[token]` - Get shared view
- `GET /api/public/index/[token]` - Get shared index

### Subscription & Add-ons

- `GET /api/user/addons` - Get user add-ons
- `POST /api/user/addons` - Purchase add-on
- `DELETE /api/user/addons` - Cancel add-on
- `GET /api/addon-packages` - Get available packages
- `GET /api/admin/addons` - List all user add-ons (admin)
- `GET /api/admin/addon-packages` - Manage packages (admin)

See `COMPLETE_DOCUMENTATION.md` for detailed API documentation.

---

## 🎨 User Interface

### Main Pages

1. **Gallery** (`/gallery`)
   - Browse indexed frames
   - Search and filter
   - View frame details
   - Manage favorites

2. **Figma API Integration** (`/api-index`)
   - Manage Figma connections
   - Create indexes
   - Track job progress
   - View connection history

3. **Index Management** (`/index-management`)
   - List all indices
   - Delete indices
   - View index details
   - Share indices

4. **Projects** (`/projects`)
   - Manage projects
   - Track status
   - Assign people
   - Link to Figma/Jira

5. **Account** (`/account`)
   - User profile
   - API key management
   - Subscription details
   - Add-on purchases

6. **Admin Dashboard** (`/admin`)
   - User management
   - Index management
   - Job logs
   - Analytics
   - Add-ons management

### Design System

- **Framework**: Material-UI (MUI) v7.2.0
- **Layout**: Responsive grid system
- **Components**: Consistent MUI components
- **Theming**: Material Design principles
- **Icons**: Material Icons

---

## 🔒 Authentication & Security

### Authentication Methods

- **Google OAuth**: OAuth 2.0 authentication
- **Email/Password**: Traditional email/password authentication
- **Password Reset**: Email-based password reset

### Security Features

- **API Key Authentication**: Unique API keys per user
- **Row Level Security (RLS)**: Database-level access control
- **HTTPS Enforcement**: All traffic encrypted
- **CORS Protection**: Cross-origin request protection
- **Input Validation**: Server-side validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content sanitization

---

## 💳 Subscription & Pricing Model

### Plans

#### Free Plan
- 1 file
- 300 frames total
- 5 indexes per day

#### Pro Plan
- 10 files
- 5,000 frames total
- 20 indexes per day

#### Team Plan
- 20 files
- 15,000 frames total
- 50 indexes per day

### Add-ons

Users can purchase monthly add-ons:

- **Additional Files**: +1, +2, +5 files
- **Additional Frames**: +1,000, +2,000, +5,000 frames
- **Additional Daily Indexes**: +10, +20, +50 per day

Add-ons are recurring monthly subscriptions.

---

## 🚀 Deployment Architecture

### Hosting

- **Frontend & API**: Vercel (Serverless Functions)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Email**: Resend

### Background Jobs

- **Cron Jobs**: Vercel Cron Jobs
- **Processing**: Serverless functions
- **Queue**: Database-based queue (`index_jobs` table)

### Scaling

- **Horizontal Scaling**: Serverless functions auto-scale
- **Database**: Supabase managed PostgreSQL
- **Storage**: Supabase Storage with CDN
- **Caching**: Browser caching, CDN caching

---

## ⚙️ Configuration

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Resend)
RESEND_API_KEY=re_your_api_key
SUPPORT_EMAIL=support@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com

# Optional: Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

See `docs/setup/ENVIRONMENT_VARIABLES.md` for complete list.

---

## 📚 Additional Documentation

- **Installation Guide**: `docs/INSTALLATION.md`
- **Features List**: `docs/FEATURES.md`
- **Version History**: `docs/VERSION.md`
- **Complete API Documentation**: `COMPLETE_DOCUMENTATION.md`
- **Setup Guide**: `docs/setup/SETUP.md`
- **Restore Guide**: `docs/setup/RESTORE.md`

---

**Last Updated:** December 24, 2025  
**Version:** v1.30.6  
**Documentation Version:** 2.0

