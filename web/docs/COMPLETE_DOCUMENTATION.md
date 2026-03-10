# FigDex - Complete System Documentation

**Version:** 1.28.0  
**Last Updated:** December 22, 2025  
**Documentation Version:** 1.1

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Installation Guide](#installation-guide)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [User Interface](#user-interface)
7. [Authentication & Security](#authentication--security)
8. [Deployment](#deployment)
9. [Configuration](#configuration)
10. [Maintenance & Troubleshooting](#maintenance--troubleshooting)

---

## 🎯 System Overview

FigDex is a comprehensive Figma indexing platform that allows users to create searchable indexes of their Figma files, manage projects, and share indexed content with teams.

### Key Features

- **Figma File Indexing**: Create searchable indexes from Figma files via API integration
- **Gallery Interface**: Browse and search indexed frames with advanced filtering
- **Project Management**: Organize projects with metadata, status tracking, and team collaboration
- **Sharing**: Public and private sharing options for indexes
- **User Management**: Role-based access control with admin capabilities
- **Credits System**: Flexible pricing model with monthly credits
- **Version Tracking**: Track changes in Figma files for efficient re-indexing
- **Thumbnail Generation**: Automatic thumbnail creation for faster loading

### Technology Stack

- **Frontend**: Next.js 15.5.9, React 19.1.0, Material-UI 7.2.0
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **Authentication**: Supabase Auth (OAuth + Email/Password)
- **Email**: Resend

---

## 🏗️ Architecture

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

### Data Flow

1. **User Authentication**: OAuth or Email/Password → Supabase Auth → API Key generation
2. **Index Creation**: Figma API → Background Job → Image Processing → Supabase Storage → Database
3. **Index Retrieval**: Database → Storage URLs → Signed URLs → Client Display
4. **Job Processing**: Cron Job → Pending Jobs → Process Chunks → Update Status

---

## 📦 Installation Guide

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Vercel account (for deployment)
- Figma Personal Access Token (for API integration)
- Resend account (for emails)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd FigDex/web
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Variables

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Email (Resend)
RESEND_API_KEY=re_your_api_key
SUPPORT_EMAIL=support@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com

# Optional: Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### Step 4: Database Setup

Run SQL scripts in order:

1. `create_users_table.sql` - User accounts
2. `sql/create_saved_connections_table.sql` - Saved Figma connections
3. `sql/create_saved_indices_table.sql` - Index history
4. `sql/add_index_jobs_table.sql` - Background jobs
5. `sql/add_index_archives_table.sql` - Version archives
6. `sql/create_projects_table.sql` - Projects management
7. `add_share_support.sql` - Sharing functionality
8. `add_tags_columns.sql` - Tag support
9. `sql/add_version_tracking_to_index_files.sql` - Version tracking
10. `sql/add_version_tracking_to_index_jobs.sql` - Job version tracking
11. `sql/add_page_meta_to_saved_connections.sql` - Page metadata

### Step 5: Storage Setup

In Supabase Dashboard:
1. Create storage bucket: `index-data`
2. Set bucket to private
3. Create storage bucket: `thumbs` (for thumbnails)
4. Set bucket to private

### Step 6: Local Development

```bash
npm run dev
```

Access at `http://localhost:3000`

### Step 7: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Add environment variables in Vercel Dashboard → Settings → Environment Variables

---

## 🗄️ Database Schema

### Core Tables

#### `users`
User accounts and authentication

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  api_key VARCHAR UNIQUE,
  plan VARCHAR DEFAULT 'free',
  provider VARCHAR, -- 'google', 'email'
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  public_enabled BOOLEAN DEFAULT false,
  public_slug VARCHAR UNIQUE,
  credits_remaining INTEGER DEFAULT 0,
  credits_reset_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `index_files`
Stored indexes with metadata

```sql
CREATE TABLE index_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR,
  figma_file_key VARCHAR,
  file_name VARCHAR,
  index_data JSONB, -- Or storage reference
  frame_tags TEXT[],
  custom_tags TEXT[],
  naming_tags TEXT[],
  size_tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  share_token UUID,
  figma_version TEXT,
  figma_last_modified TIMESTAMPTZ,
  frame_ids TEXT[],
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `index_jobs`
Background job tracking

```sql
CREATE TABLE index_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_key VARCHAR NOT NULL,
  file_name VARCHAR,
  project_id VARCHAR,
  manifest JSONB,
  frame_node_refs JSONB,
  document_data JSONB,
  page_meta JSONB,
  selected_pages TEXT[],
  selected_page_ids TEXT[],
  status VARCHAR DEFAULT 'pending', -- pending, processing, completed, failed
  next_frame_index INTEGER DEFAULT 0,
  total_frames INTEGER,
  processing_state JSONB,
  figma_version TEXT,
  figma_last_modified TIMESTAMPTZ,
  image_quality NUMERIC DEFAULT 0.7,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `saved_connections`
Saved Figma API connections

```sql
CREATE TABLE saved_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_key VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  figma_token VARCHAR NOT NULL,
  pages TEXT[],
  page_meta JSONB,
  image_quality VARCHAR DEFAULT '0.7',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, file_key)
);
```

#### `saved_indices`
Index creation history

```sql
CREATE TABLE saved_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES index_jobs(id) ON DELETE CASCADE,
  index_id UUID REFERENCES index_files(id) ON DELETE SET NULL,
  file_key VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  selected_pages TEXT[],
  status VARCHAR, -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_frames INTEGER,
  current_frame_index INTEGER
);
```

#### `projects`
Project management

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  serial_number SERIAL,
  figma_link TEXT,
  jira_link TEXT,
  description TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  people TEXT[],
  status TEXT DEFAULT 'To Do', -- To Do, In Progress, Waiting, Completed, Canceled, Archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `index_archives`
Version archives

```sql
CREATE TABLE index_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_file_id UUID REFERENCES index_files(id) ON DELETE CASCADE,
  version_number INTEGER,
  archive_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

All tables have indexes on foreign keys and frequently queried fields:
- `user_id` indexes on all user-related tables
- `file_key` indexes for Figma file lookups
- `status` indexes on jobs and indices
- `created_at` indexes for sorting

### Row Level Security (RLS)

RLS is enabled on all tables. Policies allow:
- Users to access only their own data
- Service role to access all data (for API operations)
- Public access to shared indexes via tokens

---

## 🔌 API Documentation

### Authentication Endpoints

#### `POST /api/auth/signup`
User registration/login

**Request:**
```json
{
  "action": "signup" | "login",
  "email": "user@example.com",
  "password": "password123",
  "fullName": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "user": { "id": "...", "email": "...", "api_key": "..." }
}
```

#### `GET /api/auth/oauth`
OAuth callback handler

**Query Parameters:**
- `code`: OAuth authorization code
- `provider`: `google`, `github`, etc.

#### `POST /api/auth/forgot-password`
Password reset request

**Request:**
```json
{
  "email": "user@example.com"
}
```

#### `POST /api/auth/reset-password`
Set new password

**Request:**
```json
{
  "access_token": "...",
  "password": "newpassword123"
}
```

### Index Management Endpoints

#### `POST /api/create-index-from-figma`
Create index from Figma file

**Headers:**
```
Authorization: Bearer <api_key>
```

**Request:**
```json
{
  "fileKey": "figma_file_key",
  "figmaToken": "figd_...",
  "selectedPageIds": ["page_id_1", "page_id_2"],
  "imageQuality": "med" // "low" | "med" | "hi"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "message": "Job scheduled"
}
```

#### `GET /api/get-indices`
Get user's indices

**Query Parameters:**
- `userEmail`: User email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "file_name": "Design System",
      "uploaded_at": "2025-12-21T...",
      "frame_count": 150
    }
  ]
}
```

#### `GET /api/get-index-data`
Get index data for display

**Query Parameters:**
- `indexId`: Index file ID

**Response:**
```json
{
  "success": true,
  "index": {
    "id": "uuid",
    "file_name": "...",
    "pages": [
      {
        "id": "page_0",
        "name": "Page 1",
        "frames": [
          {
            "id": "...",
            "name": "Frame 1",
            "url": "signed_storage_url",
            "thumb_url": "signed_thumbnail_url"
          }
        ]
      }
    ]
  }
}
```

#### `DELETE /api/delete-index`
Delete index

**Headers:**
```
Authorization: Bearer <api_key>
```

**Request:**
```json
{
  "indexId": "uuid"
}
```

### Figma Integration Endpoints

#### `GET /api/get-page-frame-counts`
Get frame counts for pages

**Query Parameters:**
- `fileKey`: Figma file key
- `pageIds`: Comma-separated page IDs
- `figmaToken`: Figma Personal Access Token

#### `POST /api/check-index-changes`
Check for changes in Figma file

**Request:**
```json
{
  "fileKey": "figma_file_key",
  "figmaToken": "figd_..."
}
```

**Response:**
```json
{
  "success": true,
  "hasChanges": true,
  "newFrameCount": 5,
  "removedFrameCount": 2,
  "existingFrameCount": 100,
  "recommendation": "incremental" | "full"
}
```

### Job Management Endpoints

#### `GET /api/get-job-status`
Get job status

**Request:**
```json
{
  "jobIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "success": true,
  "statuses": [
    {
      "jobId": "uuid",
      "status": "processing",
      "progress": 50,
      "totalFrames": 100,
      "currentFrame": 50
    }
  ]
}
```

#### `POST /api/process-index-job`
Process background job (internal)

**Request:**
```json
{
  "jobId": "uuid",
  "figmaToken": "figd_...",
  "chunkSize": 5
}
```

### Sharing Endpoints

#### `POST /api/index/[id]/share`
Generate share link

**Response:**
```json
{
  "success": true,
  "shareUrl": "https://figdex.com/share/token",
  "isPublic": true
}
```

#### `GET /api/public/index/[token]`
Access shared index

**Response:**
```json
{
  "success": true,
  "index": { /* index data */ }
}
```

### Saved Connections Endpoints

#### `GET /api/saved-connections`
Get user's saved connections

**Headers:**
```
Authorization: Bearer <api_key>
```

#### `POST /api/saved-connections`
Save new connection

**Request:**
```json
{
  "fileKey": "figma_file_key",
  "fileName": "Design System",
  "figmaToken": "figd_...",
  "pages": ["Page 1", "Page 2"],
  "pageMeta": [ /* page metadata */ ],
  "imageQuality": "0.7"
}
```

#### `PUT /api/saved-connections`
Update connection

**Request:**
```json
{
  "id": "uuid",
  "pages": ["Page 1", "Page 2", "Page 3"]
}
```

#### `DELETE /api/saved-connections`
Delete connection

**Query Parameters:**
- `id`: Connection ID

### Projects Endpoints

#### `GET /api/projects`
Get user's projects

**Headers:**
```
Authorization: Bearer <api_key>
```

#### `POST /api/projects`
Create project

**Request:**
```json
{
  "figmaLink": "https://figma.com/file/...",
  "jiraLink": "https://jira.com/...",
  "description": "Project description",
  "date": "2025-12-21",
  "people": ["Person 1", "Person 2"],
  "status": "To Do"
}
```

#### `PUT /api/projects`
Update project

**Request:**
```json
{
  "id": "uuid",
  "description": "Updated description",
  "status": "In Progress"
}
```

#### `DELETE /api/projects`
Delete project

**Query Parameters:**
- `id`: Project ID

### Account Endpoints

#### `GET /api/account`
Get account information

**Headers:**
```
Authorization: Bearer <api_key>
```

#### `POST /api/account/regenerate-api-key`
Regenerate API key

### Admin Endpoints

#### `GET /api/admin/users`
List all users (admin only)

#### `GET /api/admin/indices`
List all indices (admin only)

#### `GET /api/admin/jobs`
List all jobs with metrics (admin only)

#### `GET /api/admin/debug-job`
Debug job information (admin only)

**Query Parameters:**
- `jobId`: Job ID (optional)
- `indexId`: Index ID (optional)

---

## 🎨 User Interface

### Main Pages

#### `/` - Homepage
- Landing page with features
- Pricing overview
- Login/Register options
- Version display

#### `/gallery` - Gallery
- Main index viewing interface
- Masonry layout (responsive)
- Advanced filtering sidebar:
  - File selection
  - Text search
  - Tag filtering (naming tags, size tags)
  - Favorites filter
- Image modal viewer
- Favorites system
- Share functionality

#### `/api-index` - Figma API Integration
Tabs:
1. **Connections**: List of saved connections
2. **Connection Details**: Page selection, job creation
3. **Index Management**: Manage all indices (Cards layout)
4. **Jobs Log**: Job history and status

Features:
- Connection management
- Page selection with change detection
- Image quality selection
- Frame counting
- Job status monitoring
- Real-time progress tracking

#### `/index-management` - Index Management (Legacy)
- Table view of indices
- Share/Delete actions
- Check for updates
- Change detection dialog

#### `/projects-management` - Projects Management
- Project list with search
- Add/Edit/Delete projects
- Status management
- People management with autocomplete
- Date picker

#### `/account` - Account Settings
- User profile
- Plan information
- API key management
- Usage statistics

#### `/pricing` - Pricing Page
- Plan comparison
- Feature lists
- Upgrade options

#### `/admin/*` - Admin Dashboard
- User management
- Job monitoring
- System analytics
- Debug tools

### UI Components

#### Header Component
- Logo
- Page title
- Back button
- User menu:
  - My FigDex (Gallery)
  - Index Management
  - Projects Management
  - Account Settings
  - Figma API Integration
  - Copy API Key
  - Logout

#### Dialogs
- Login Dialog
- Register Dialog
- Forgot Password Dialog
- Share Dialog
- Changes Detection Dialog
- Token Dialog

---

## 🔒 Authentication & Security

### Authentication Methods

1. **OAuth**: Google, GitHub (via Supabase)
2. **Email/Password**: Traditional authentication

### API Key Authentication

All API endpoints require:
```
Authorization: Bearer <api_key>
```

API keys are:
- Generated on user creation
- Stored in `users.api_key`
- Can be regenerated via `/api/account/regenerate-api-key`
- Never exposed in client-side code

### Security Features

- **HTTPS Only**: All communications encrypted
- **Row Level Security**: Database-level access control
- **Token Validation**: All tokens validated server-side
- **Input Sanitization**: All inputs validated and sanitized
- **CORS Protection**: Configured in `vercel.json`
- **Rate Limiting**: Via Vercel and Supabase

### Environment Variables Security

- Never commit `.env.local` to git
- Use Vercel Environment Variables for production
- Rotate keys regularly
- Use service role key only server-side

---

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**
   - Link GitHub/GitLab repository to Vercel
   - Or use Vercel CLI: `vercel --prod`

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables
   - Set for Production, Preview, and Development

3. **Configure Functions**
   - Function timeouts in `vercel.json`
   - Memory allocation for heavy functions
   - Cron job schedule

4. **Deploy**
   - Push to main branch (auto-deploy)
   - Or deploy manually: `vercel --prod`

### Vercel Configuration

`vercel.json`:
```json
{
  "functions": {
    "pages/api/process-index-job.ts": {
      "maxDuration": 300,
      "memory": 2048
    },
    "pages/api/create-index-from-figma.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/process-pending-jobs",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Supabase Setup

1. **Create Project**
   - Go to supabase.com
   - Create new project
   - Note URL and keys

2. **Run SQL Scripts**
   - Execute all SQL files in order
   - Verify tables created
   - Set up RLS policies

3. **Storage Buckets**
   - Create `index-data` bucket (private)
   - Create `thumbs` bucket (private)
   - Configure CORS if needed

4. **Authentication**
   - Enable OAuth providers in Auth settings
   - Configure redirect URLs
   - Set up email templates

### Domain Configuration

1. **Add Domain to Vercel**
   - Settings → Domains
   - Add custom domain
   - Configure DNS

2. **Update Environment Variables**
   - Set `NEXT_PUBLIC_SITE_URL`
   - Update OAuth redirect URLs
   - Update email templates

---

## ⚙️ Configuration

### Plans & Pricing

Defined in `lib/plans.ts`:

```typescript
- Free: 1 file, 300 frames, 100 credits/month
- Pro: 10 files, 5000 frames, 1000 credits/month  
- Team: 20 files, 15000 frames, 2000 credits/month
- Unlimited: No limits (admin only)
```

### Credits System

- Credits reset monthly
- Cost per index: 100 credits
- Used for index creation/re-indexing
- Tracked in `users.credits_remaining`

### Monthly Limits

- `maxUploadsPerMonth`: Based on plan
- `maxFramesPerMonth`: Based on plan
- Reset on monthly cycle
- Tracked per user

### Image Quality Settings

- `low`: 30% scale
- `med`: 70% scale (default)
- `hi`: 100% scale

### Thumbnail Settings

- Size: 320px width
- Format: WebP
- Quality: 70%
- Stored in `thumbs/` bucket

---

## 🔧 Maintenance & Troubleshooting

### Common Issues

#### Job Stuck in Processing

1. Check `/api/admin/debug-job?jobId=...`
2. Verify Figma token is valid
3. Check error logs in `index_jobs.error`
4. Manually update status if needed

#### Images Not Loading

1. Check storage bucket permissions
2. Verify signed URL generation
3. Check CORS configuration
4. Verify image paths in storage

#### Database Connection Errors

1. Verify Supabase credentials
2. Check network connectivity
3. Verify service role key
4. Check Supabase status

### Monitoring

- **Vercel Logs**: Function execution logs
- **Supabase Logs**: Database and storage logs
- **Sentry**: Error tracking (if configured)

### Backup Strategy

1. **Database**: Supabase automatic backups
2. **Storage**: Supabase storage backups
3. **Code**: Git repository
4. **Environment Variables**: Documented in secure location

### Updates & Migrations

1. **Code Updates**: Deploy via Vercel
2. **Database Migrations**: Run SQL scripts in order
3. **Schema Changes**: Test in staging first
4. **Breaking Changes**: Document in CHANGELOG

---

## 📚 Additional Resources

### Documentation Files

- `SYSTEM_SPECIFICATION.md` - Detailed system specification
- `MONTHLY_LIMITS_SPECIFICATION.md` - Credits and limits system
- `ENV_SETUP.md` - Environment variables guide
- `VERCEL_SETUP.md` - Vercel deployment guide
- `CHANGELOG.md` - Version history

### SQL Scripts

All SQL scripts in `/sql` directory:
- Run in order as numbered
- Test in development first
- Backup database before migrations

### API Testing

Use tools like:
- Postman
- curl
- Vercel CLI: `vercel dev`

---

## 📞 Support

For issues or questions:
- Check documentation files
- Review error logs
- Contact: support@figdex.com

---

**Documentation Version:** 1.0  
**Last Updated:** December 21, 2025  
**System Version:** 1.25.0

