# FigDex - Restoration & Re-installation Guide

**Version:** 1.25.0  
**Last Updated:** December 21, 2025

This guide provides instructions for restoring or re-installing FigDex from a backup or fresh start.

---

## 📦 Prerequisites for Restoration

Before starting, ensure you have:

- **Backup files** (if restoring):
  - Database backup (SQL dump)
  - Storage backup (files)
  - Environment variables documentation
  - Configuration files

- **Access to**:
  - Supabase project (or ability to create new)
  - Vercel account
  - Domain (if custom domain was used)
  - Email service account

---

## 🔄 Restoration from Backup

### Scenario 1: Full System Restoration

#### Step 1: Create New Supabase Project (if needed)

If original project is lost:

1. Create new Supabase project
2. Note new URL and keys
3. Update environment variables accordingly

#### Step 2: Restore Database

**Option A: From SQL Dump**

1. Go to Supabase SQL Editor
2. If you have a full SQL dump:
   ```bash
   # Import via Supabase CLI (recommended)
   supabase db restore <dump_file.sql
   
   # Or paste SQL dump in SQL Editor
   ```
3. Verify tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   ```

**Option B: Recreate Schema (if no backup)**

If you don't have a backup, recreate all tables by running SQL scripts in order (see `SETUP.md` Step 4).

#### Step 3: Restore Storage

**Option A: From Backup Files**

1. Download backup files
2. Go to Supabase Storage
3. For each bucket (`index-data`, `thumbs`):
   - Upload files maintaining directory structure
   - Or use Supabase CLI:
     ```bash
     supabase storage cp <backup_path>/* supabase://<bucket_name>/
     ```

**Option B: Recreate Buckets (if no backup)**

1. Create buckets as described in `SETUP.md` Step 5
2. Files will be recreated as users re-index

#### Step 4: Restore Code

```bash
# Clone repository
git clone <repository-url>
cd FigDex/web

# Or if you have code backup
cd /path/to/backup
# Copy to new location
```

#### Step 5: Restore Environment Variables

1. Create `.env.local` with saved environment variables
2. Update Supabase URLs/keys if using new project
3. Update domain URLs if changed

#### Step 6: Verify Configuration

1. Check all environment variables are set
2. Verify database connection
3. Test authentication
4. Test API endpoints

---

### Scenario 2: Fresh Installation (No Backup)

If you're starting fresh, follow `SETUP.md` completely.

---

## 🔄 Re-installation on New Server

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd FigDex/web
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up New Supabase Project

1. Create new Supabase project
2. Run all SQL scripts (see `SETUP.md` Step 4)
3. Create storage buckets
4. Configure authentication

### Step 4: Configure Environment

1. Copy `.env.example` to `.env.local` (if exists)
2. Add all required variables
3. Update with new Supabase credentials

### Step 5: Deploy

1. Deploy to Vercel (see `SETUP.md` Step 10)
2. Add environment variables in Vercel
3. Configure domain (if needed)

### Step 6: Data Migration (if needed)

If migrating from old system:

1. **Export Users**:
   ```sql
   COPY (SELECT * FROM users) TO '/tmp/users_backup.csv' CSV HEADER;
   ```

2. **Export Indices**:
   ```sql
   COPY (SELECT id, user_id, file_name, figma_file_key, created_at 
         FROM index_files) 
   TO '/tmp/indices_backup.csv' CSV HEADER;
   ```

3. **Import to New Database**:
   ```sql
   COPY users FROM '/tmp/users_backup.csv' CSV HEADER;
   COPY index_files(id, user_id, file_name, figma_file_key, created_at) 
   FROM '/tmp/indices_backup.csv' CSV HEADER;
   ```

4. **Migrate Storage Files**:
   - Download from old storage
   - Upload to new storage buckets
   - Maintain same file paths

---

## 🗄️ Database Migration Checklist

When migrating/restoring database:

- [ ] All tables exist
- [ ] Foreign key constraints intact
- [ ] Indexes created
- [ ] RLS policies enabled
- [ ] Triggers created
- [ ] Functions exist (`update_updated_at_column`)
- [ ] Test user can be created
- [ ] Test data can be inserted
- [ ] Queries execute correctly

---

## 📁 File Structure for Backup

When creating backups, include:

```
figdex-backup/
├── database/
│   ├── schema.sql (all CREATE TABLE statements)
│   ├── data.sql (INSERT statements, optional)
│   └── functions.sql (all functions)
├── storage/
│   ├── index-data/ (all index files)
│   └── thumbs/ (all thumbnails)
├── code/
│   └── FigDex/ (full project: plugin + web)
├── config/
│   ├── .env.local.example (with placeholders)
│   ├── vercel.json
│   └── next.config.ts
└── documentation/
    ├── COMPLETE_DOCUMENTATION.md
    ├── SETUP.md
    └── RESTORE.md
```

---

## 🔐 Environment Variables Checklist

Document these before backup/restoration:

### Required

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Optional but Recommended

- [ ] `RESEND_API_KEY`
- [ ] `SUPPORT_EMAIL`
- [ ] `FROM_EMAIL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_DEV_URL`

### Optional

- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_DSN`
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`

---

## 🔧 Post-Restoration Verification

After restoration, test:

1. **Authentication**:
   - [ ] User registration works
   - [ ] Login works
   - [ ] OAuth works (if configured)
   - [ ] Password reset works

2. **API**:
   - [ ] API key generation works
   - [ ] API endpoints respond
   - [ ] Authentication required works

3. **Index Creation**:
   - [ ] Can create index via API
   - [ ] Images upload to storage
   - [ ] Thumbnails generate
   - [ ] Index displays in gallery

4. **Storage**:
   - [ ] Files upload successfully
   - [ ] Files can be retrieved
   - [ ] Signed URLs work
   - [ ] Images display correctly

5. **Database**:
   - [ ] Data persists correctly
   - [ ] Queries execute
   - [ ] Foreign keys work
   - [ ] RLS policies enforced

6. **Background Jobs**:
   - [ ] Jobs can be created
   - [ ] Cron job runs
   - [ ] Jobs process correctly
   - [ ] Status updates work

---

## 🚨 Emergency Restoration

If system is down and needs quick restoration:

1. **Quick Fix**: Restore from Vercel deployment history
   - Go to Vercel Dashboard → Deployments
   - Find last working deployment
   - Click "Promote to Production"

2. **Database Issues**: 
   - Check Supabase status page
   - Verify connection strings
   - Check service role key

3. **Storage Issues**:
   - Verify buckets exist
   - Check permissions
   - Verify service role access

4. **Environment Variables**:
   - Verify all variables set in Vercel
   - Check for typos
   - Verify Supabase keys are correct

---

## 📊 Backup Strategy Recommendations

### Automated Backups

1. **Supabase**: Automatic daily backups (available in paid plans)
2. **Storage**: Manual or scheduled backups
3. **Code**: Git repository (automatic)
4. **Environment Variables**: Document in secure location

### Backup Schedule

- **Daily**: Database (via Supabase)
- **Weekly**: Storage buckets
- **On Change**: Environment variables
- **On Release**: Full system backup

### Backup Storage

Store backups in:
- Separate Supabase project (for database)
- Cloud storage (S3, Google Cloud Storage) for files
- Secure vault for credentials
- Git repository for code

---

## 🔍 Verification Queries

Run these after restoration to verify:

```sql
-- Check table counts
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'index_files', COUNT(*) FROM index_files
UNION ALL
SELECT 'index_jobs', COUNT(*) FROM index_jobs
UNION ALL
SELECT 'saved_connections', COUNT(*) FROM saved_connections
UNION ALL
SELECT 'projects', COUNT(*) FROM projects;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_jobs
FROM index_jobs 
WHERE user_id NOT IN (SELECT id FROM users);

-- Check storage references
SELECT COUNT(*) as files_with_storage_ref
FROM index_files 
WHERE index_data::text LIKE '%storage/v1%';

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 📞 Support

If restoration fails:

1. Check error logs
2. Verify all prerequisites met
3. Review `SETUP.md` for initial setup steps
4. Contact support with:
   - Error messages
   - Restoration steps taken
   - System configuration

---

## 📝 Restoration Log Template

Document your restoration process:

```
Restoration Date: ___________
Restored From: [ ] Backup / [ ] Fresh Install
Supabase Project: ___________
Vercel Project: ___________
Domain: ___________

Issues Encountered:
1. ___________
2. ___________

Solutions Applied:
1. ___________
2. ___________

Verification Status:
[ ] Database restored
[ ] Storage restored
[ ] Code deployed
[ ] Environment configured
[ ] All tests passed

Notes:
___________
```

---

**Restoration Guide Version:** 1.0  
**Last Updated:** December 21, 2025

