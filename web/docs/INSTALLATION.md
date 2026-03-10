# FigDex - Installation Instructions

**Version:** v1.30.6  
**Last Updated:** December 24, 2025

Complete installation guide for FigDex platform.

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

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd FigDex/web
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Environment Variables

Create `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Resend) - Optional
RESEND_API_KEY=re_your_api_key
SUPPORT_EMAIL=support@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
```

See `docs/setup/ENVIRONMENT_VARIABLES.md` for complete list.

---

## 🗄️ Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for project creation

### Step 2: Get Supabase Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL
   - service_role key (keep secret!)

### Step 3: Run Database Migrations

Execute SQL scripts in `sql/` directory in this order:

1. `sql/create_users_table.sql` - User accounts
2. `sql/create_saved_connections_table.sql` - Saved Figma connections
3. `sql/create_saved_indices_table.sql` - Index history
4. `sql/add_index_jobs_table.sql` - Background jobs
5. `sql/add_index_archives_table.sql` - Version archives
6. `sql/create_projects_table.sql` - Projects management
7. `sql/create_shared_views_table.sql` - Sharing functionality
8. `sql/add_share_name_to_shared_views.sql` - Share names
9. `sql/add_version_tracking_to_index_files.sql` - Version tracking
10. `sql/add_version_tracking_to_index_jobs.sql` - Job version tracking
11. `sql/add_page_meta_to_saved_connections.sql` - Page metadata
12. `sql/add_frame_node_refs_to_index_jobs.sql` - Frame node refs
13. `sql/add_image_quality_to_index_jobs.sql` - Image quality
14. `sql/add_job_splitting_columns.sql` - Job splitting
15. `sql/create_user_addons_table.sql` - User add-ons
16. `sql/create_daily_index_count_table.sql` - Daily index count
17. `sql/create_addon_packages_table.sql` - Add-on packages
18. `sql/insert_default_addon_packages.sql` - Default packages (optional)

### Step 4: Create Database Functions

In Supabase SQL Editor, run:

```sql
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment daily index count
CREATE OR REPLACE FUNCTION increment_daily_index_count(p_user_id UUID, p_today DATE)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO daily_index_count (user_id, count, last_reset_date)
  VALUES (p_user_id, 1, p_today)
  ON CONFLICT (user_id) DO UPDATE
  SET
    count = CASE
      WHEN daily_index_count.last_reset_date = p_today THEN daily_index_count.count + 1
      ELSE 1
    END,
    last_reset_date = p_today,
    updated_at = NOW()
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 📦 Storage Setup

In Supabase Dashboard → Storage:

1. **Create `index-data` bucket**:
   - Name: `index-data`
   - Public: No (private)
   - File size limit: 500 MB

2. **Create `thumbs` bucket**:
   - Name: `thumbs`
   - Public: No (private)
   - File size limit: 50 MB
   - Allowed MIME types: `image/webp,image/png,image/jpeg`

---

## 🔐 Authentication Setup

In Supabase Dashboard → Authentication → Providers:

1. **Enable Email Provider**
2. **Enable Google OAuth** (optional):
   - Add Client ID and Client Secret from Google Cloud Console
   - Set redirect URL: `https://your-domain.com/oauth-success`

---

## 🚀 Local Development

```bash
npm run dev
```

Access at `http://localhost:3000`

---

## 🌐 Deploy to Vercel

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
vercel --prod
```

### Step 4: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (optional)
- `SUPPORT_EMAIL` (optional)
- `FROM_EMAIL` (optional)
- `NEXT_PUBLIC_SUPPORT_EMAIL` (optional)

### Step 5: Set Up Cron Jobs

In Vercel Dashboard → Settings → Cron Jobs, add:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-pending-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## ✅ Verification Checklist

After installation, verify:

- [ ] All database tables created
- [ ] Storage buckets created
- [ ] Environment variables configured
- [ ] Authentication providers enabled
- [ ] Local development server runs
- [ ] Deployment successful
- [ ] Cron jobs configured
- [ ] Test user registration works
- [ ] Test index creation works

---

## 📚 Additional Resources

- **Complete Setup Guide**: `docs/setup/SETUP.md`
- **Restore Guide**: `docs/setup/RESTORE.md`
- **Environment Variables**: `docs/setup/ENVIRONMENT_VARIABLES.md`
- **System Specification**: `docs/SPECIFICATION.md`
- **Features List**: `docs/FEATURES.md`

---

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - Verify Supabase project is active

2. **Storage Upload Fails**
   - Check storage bucket names match (`index-data`, `thumbs`)
   - Verify bucket policies allow service role access

3. **Authentication Not Working**
   - Check OAuth redirect URLs
   - Verify email provider is enabled
   - Check environment variables

4. **Jobs Not Processing**
   - Verify cron job is configured in Vercel
   - Check job status in database
   - Review error logs

For more help, see `docs/setup/SETUP.md` or contact support.

---

**Last Updated:** December 24, 2025  
**Version:** v1.30.6

