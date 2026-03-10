# FigDex - Installation & Setup Guide

**Version:** 1.28.0  
**Last Updated:** December 22, 2025

This guide provides step-by-step instructions for setting up FigDex from scratch.

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ and npm installed
- **Git** installed
- **Supabase account** (free tier is sufficient for testing)
- **Vercel account** (free tier is sufficient)
- **Figma account** with Personal Access Token
- **Resend account** (optional, for emails)

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd FigDex/web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### 3.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `figdex` (or your preferred name)
   - Database Password: (generate strong password)
   - Region: Choose closest to your users
4. Wait for project to be created (takes 1-2 minutes)

#### 3.2 Get Supabase Credentials

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (public key)
   - **service_role key**: `eyJhbGc...` (secret key - keep safe!)

#### 3.3 Create Database Functions

In Supabase SQL Editor, run:

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. Run Database Migrations

Execute SQL scripts in **this exact order**:

1. **`create_users_table.sql`**
   ```sql
   -- Creates users table with authentication support
   ```

2. **`sql/create_saved_connections_table.sql`**
   ```sql
   -- Creates saved_connections table
   ```

3. **`sql/create_saved_indices_table.sql`**
   ```sql
   -- Creates saved_indices table for job history
   ```

4. **`sql/add_index_jobs_table.sql`**
   ```sql
   -- Creates index_jobs table for background processing
   ```

5. **`sql/add_index_archives_table.sql`**
   ```sql
   -- Creates index_archives table for version history
   ```

6. **`sql/create_projects_table.sql`**
   ```sql
   -- Creates projects table
   ```

7. **`add_share_support.sql`**
   ```sql
   -- Adds sharing columns to index_files
   ```

8. **`add_tags_columns.sql`**
   ```sql
   -- Adds tag columns to index_files
   ```

9. **`sql/add_version_tracking_to_index_files.sql`**
   ```sql
   -- Adds version tracking to index_files
   ```

10. **`sql/add_version_tracking_to_index_jobs.sql`**
    ```sql
    -- Adds version tracking to index_jobs
    ```

11. **`sql/add_page_meta_to_saved_connections.sql`**
    ```sql
    -- Adds page metadata to saved_connections
    ```

12. **`sql/add_frame_node_refs_to_index_jobs.sql`**
    ```sql
    -- Adds frame node refs for job processing
    ```

13. **`sql/add_image_quality_to_index_jobs.sql`**
    ```sql
    -- Adds image quality setting
    ```

14. **`sql/add_job_splitting_columns.sql`**
    ```sql
    -- Adds job splitting support
    ```

#### Verify Tables

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- `index_files`
- `index_jobs`
- `index_archives`
- `saved_connections`
- `saved_indices`
- `projects`
- `users`

### 5. Set Up Storage Buckets

In Supabase Dashboard → Storage:

1. **Create `index-data` bucket**:
   - Click "New bucket"
   - Name: `index-data`
   - Public: **No** (private)
   - File size limit: 500 MB
   - Allowed MIME types: (leave empty for now)

2. **Create `thumbs` bucket**:
   - Click "New bucket"
   - Name: `thumbs`
   - Public: **No** (private)
   - File size limit: 50 MB
   - Allowed MIME types: `image/webp,image/png,image/jpeg`

3. **Set up Storage Policies** (if needed):
   - Go to Storage → Policies
   - Create policies for service role access

### 6. Configure Authentication

In Supabase Dashboard → Authentication → Providers:

1. **Enable Email Provider**:
   - Enable "Email"
   - Configure email templates (optional)

2. **Enable OAuth Providers** (optional):
   - **Google**:
     - Enable Google provider
     - Add Client ID and Client Secret from Google Cloud Console
     - Add redirect URL: `https://your-domain.com/auth/callback`
   - **GitHub** (optional):
     - Enable GitHub provider
     - Add Client ID and Client Secret from GitHub
     - Add redirect URL: `https://your-domain.com/auth/callback`

3. **Configure URL Settings**:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: Add your domain

### 7. Environment Variables

Create `.env.local` file in project root:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# Email Service (Optional - Recommended)
RESEND_API_KEY=re_your_api_key_here
SUPPORT_EMAIL=support@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
SEND_CONFIRMATION_EMAIL=true

# Site Configuration (Optional)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_DEV_URL=https://dev.your-domain.com

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

**Important**: Never commit `.env.local` to git!

### 8. Set Up Resend (Email Service)

1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Create API key
4. Verify domain (for production)
5. Add API key to `.env.local`

### 9. Local Development

```bash
# Start development server
npm run dev
```

Access at: `http://localhost:3000`

### 10. Test Installation

1. **Create Test User**:
   - Go to `/register`
   - Create account with email/password

2. **Verify Database**:
   - Check `users` table in Supabase
   - Verify user was created

3. **Test API**:
   - Login and get API key from `/account`
   - Test API endpoint with key

---

## 🌐 Production Deployment

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Link Project**:
   ```bash
   vercel link
   ```

4. **Add Environment Variables**:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all variables from `.env.local`
   - Set for: Production, Preview, Development

5. **Deploy**:
   ```bash
   vercel --prod
   ```

### Configure Custom Domain

1. In Vercel Dashboard → Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Update environment variables with new domain
5. Update Supabase Auth redirect URLs

### Set Up Cron Job

The cron job for processing pending jobs is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-pending-jobs",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs daily at midnight UTC. Adjust schedule as needed.

---

## ✅ Verification Checklist

After setup, verify:

- [ ] All database tables created
- [ ] Storage buckets created and configured
- [ ] Environment variables set
- [ ] User can register/login
- [ ] API key generation works
- [ ] Can create index via API
- [ ] Storage uploads work
- [ ] Images display correctly
- [ ] Cron job is scheduled
- [ ] Email service works (if configured)
- [ ] Admin access works (set `is_admin=true` for test user)

---

## 🔧 Troubleshooting

### Database Connection Issues

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Supabase project is active
- Verify network connectivity

### Storage Issues

- Verify buckets exist
- Check bucket permissions
- Verify service role has access
- Check file size limits

### Authentication Issues

- Verify OAuth providers configured
- Check redirect URLs match
- Verify email templates (if using email auth)
- Check Supabase Auth settings

### Build Errors

- Verify Node.js version (18+)
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

---

## 📚 Next Steps

After successful setup:

1. Read `COMPLETE_DOCUMENTATION.md` for detailed system overview
2. Review `SYSTEM_SPECIFICATION.md` for technical details
3. Test all features thoroughly
4. Set up monitoring (Sentry, logs)
5. Configure backups
6. Set up admin user

---

## 🆘 Support

For issues:
1. Check error logs
2. Review documentation
3. Verify configuration
4. Contact support: support@figdex.com

---

**Setup Guide Version:** 1.0  
**Last Updated:** December 21, 2025

