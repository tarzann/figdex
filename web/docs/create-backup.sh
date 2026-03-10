#!/bin/bash

# FigDex Backup Script
# Creates a complete backup of the system for restoration

set -e

BACKUP_DIR="figdex-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "备份 FigDex System Backup"
echo "Creating backup in: $BACKUP_DIR"
echo ""

# 1. Backup Code
echo "📁 Backing up code..."
mkdir -p "$BACKUP_DIR/code"
rsync -av --exclude 'node_modules' \
          --exclude '.next' \
          --exclude '.git' \
          --exclude '.vercel' \
          --exclude '*.log' \
          --exclude '.env.local' \
          --exclude '.env*.local' \
          . "$BACKUP_DIR/code/my-figma-gallery"

# 2. Create documentation package
echo "📚 Creating documentation package..."
mkdir -p "$BACKUP_DIR/documentation"
cp COMPLETE_DOCUMENTATION.md "$BACKUP_DIR/documentation/" 2>/dev/null || echo "COMPLETE_DOCUMENTATION.md not found"
cp SETUP.md "$BACKUP_DIR/documentation/" 2>/dev/null || echo "SETUP.md not found"
cp RESTORE.md "$BACKUP_DIR/documentation/" 2>/dev/null || echo "RESTORE.md not found"
cp SYSTEM_SPECIFICATION.md "$BACKUP_DIR/documentation/" 2>/dev/null || echo "SYSTEM_SPECIFICATION.md not found"
cp README.md "$BACKUP_DIR/documentation/" 2>/dev/null || echo "README.md not found"

# 3. Backup SQL scripts
echo "🗄️  Backing up SQL scripts..."
mkdir -p "$BACKUP_DIR/database/sql"
cp -r sql/*.sql "$BACKUP_DIR/database/sql/" 2>/dev/null || echo "SQL directory not found"
cp *.sql "$BACKUP_DIR/database/" 2>/dev/null || true

# 4. Create environment variables template
echo "🔐 Creating environment variables template..."
mkdir -p "$BACKUP_DIR/config"
cat > "$BACKUP_DIR/config/env.template" << 'EOF'
# FigDex Environment Variables Template
# Fill in your values and save as .env.local

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Email Service (Optional)
RESEND_API_KEY=your_resend_api_key
SUPPORT_EMAIL=support@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com

# Site Configuration (Optional)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_DEV_URL=https://dev.your-domain.com

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
EOF

# 5. Backup configuration files
echo "⚙️  Backing up configuration files..."
mkdir -p "$BACKUP_DIR/config"
cp vercel.json "$BACKUP_DIR/config/" 2>/dev/null || echo "vercel.json not found"
cp next.config.ts "$BACKUP_DIR/config/" 2>/dev/null || echo "next.config.ts not found"
cp next.config.js "$BACKUP_DIR/config/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/config/" 2>/dev/null || echo "package.json not found"
cp tsconfig.json "$BACKUP_DIR/config/" 2>/dev/null || echo "tsconfig.json not found"

# 6. Create backup manifest
echo "📋 Creating backup manifest..."
cat > "$BACKUP_DIR/BACKUP_MANIFEST.md" << EOF
# FigDex Backup Manifest

**Backup Date:** $(date)
**Version:** 1.28.0
**Backup Type:** Complete System Backup

## Contents

### Code
- Full codebase (excluding node_modules, .next, .git)
- All source files
- Configuration files

### Documentation
- Complete Documentation
- Setup Guide
- Restoration Guide
- System Specification

### Database Scripts
- All SQL migration scripts
- Table creation scripts
- Schema updates

### Configuration
- Environment variables template
- Vercel configuration
- Next.js configuration

## Restoration Instructions

See \`documentation/RESTORE.md\` for detailed restoration instructions.

## Important Notes

1. **Environment Variables**: Fill in \`config/env.template\` with your actual values
2. **Database**: Restore using SQL scripts in \`database/\` directory
3. **Storage**: Storage files are NOT included in this backup. Restore separately from Supabase.
4. **Secrets**: Never commit environment variables with real values to version control.

## Next Steps

1. Review documentation in \`documentation/\` folder
2. Follow setup instructions in \`SETUP.md\`
3. Restore database using SQL scripts
4. Configure environment variables
5. Deploy to Vercel

---

**Backup Created:** $(date)
**System Version:** 1.28.0
EOF

# 7. Create file list
echo "📝 Creating file list..."
find "$BACKUP_DIR" -type f > "$BACKUP_DIR/FILES.txt"

# 8. Create archive
echo "📦 Creating archive..."
tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"
echo ""
echo "✅ Backup complete!"
echo "📦 Archive created: ${BACKUP_DIR}.tar.gz"
echo "📁 Backup directory: $BACKUP_DIR"
echo ""
echo "⚠️  Important:"
echo "   - Environment variables are NOT included (security)"
echo "   - Storage files are NOT included (backup separately)"
echo "   - Review BACKUP_MANIFEST.md for details"
echo ""
echo "💾 To restore, extract the archive and follow RESTORE.md"

