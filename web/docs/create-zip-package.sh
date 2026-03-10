#!/bin/bash

# FigDex Complete System Package Creator
# Creates a ZIP file with all code, documentation, SQL scripts, and setup files

set -e

VERSION="1.28.0"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="figdex-v${VERSION}-${TIMESTAMP}"
PACKAGE_DIR="${PACKAGE_NAME}"
ZIP_FILE="${PACKAGE_NAME}.zip"

echo "📦 Creating FigDex Complete System Package"
echo "Version: ${VERSION}"
echo "Package: ${ZIP_FILE}"
echo ""

# Create package directory
mkdir -p "${PACKAGE_DIR}"
cd "${PACKAGE_DIR}"

# 1. Copy source code (excluding unnecessary files)
echo "📁 Copying source code..."
mkdir -p code
rsync -av --exclude 'node_modules' \
          --exclude '.next' \
          --exclude '.git' \
          --exclude '.vercel' \
          --exclude '*.log' \
          --exclude '.env.local' \
          --exclude '.env*.local' \
          --exclude '*.tar.gz' \
          --exclude '*.zip' \
          --exclude 'releases/' \
          --exclude 'data/' \
          ../ code/

# 2. Copy documentation
echo "📚 Copying documentation..."
mkdir -p documentation
cp ../COMPLETE_DOCUMENTATION.md documentation/ 2>/dev/null || echo "⚠️  COMPLETE_DOCUMENTATION.md not found"
cp ../SETUP.md documentation/ 2>/dev/null || echo "⚠️  SETUP.md not found"
cp ../RESTORE.md documentation/ 2>/dev/null || echo "⚠️  RESTORE.md not found"
cp ../README.md documentation/ 2>/dev/null || echo "⚠️  README.md not found"
cp ../SYSTEM_SPECIFICATION.md documentation/ 2>/dev/null || echo "⚠️  SYSTEM_SPECIFICATION.md not found"
cp ../FEATURES_STATUS.md documentation/ 2>/dev/null || echo "⚠️  FEATURES_STATUS.md not found"
cp ../VERSION_SUMMARY_v${VERSION}.md documentation/ 2>/dev/null || echo "⚠️  VERSION_SUMMARY not found"
cp ../EMAIL_SETUP.md documentation/ 2>/dev/null || echo "⚠️  EMAIL_SETUP.md not found"
cp ../ENV_SETUP.md documentation/ 2>/dev/null || echo "⚠️  ENV_SETUP.md not found"
cp ../VERCEL_SETUP.md documentation/ 2>/dev/null || echo "⚠️  VERCEL_SETUP.md not found"

# 3. Copy SQL scripts
echo "🗄️  Copying SQL scripts..."
mkdir -p database/sql
cp -r ../sql/*.sql database/sql/ 2>/dev/null || echo "⚠️  SQL directory not found"
cp ../*.sql database/ 2>/dev/null || true

# 4. Copy configuration templates
echo "⚙️  Copying configuration templates..."
mkdir -p config
cp ../vercel.json config/ 2>/dev/null || echo "⚠️  vercel.json not found"
cp ../next.config.ts config/ 2>/dev/null || echo "⚠️  next.config.ts not found"
cp ../next.config.js config/ 2>/dev/null || true
cp ../package.json config/ 2>/dev/null || echo "⚠️  package.json not found"
cp ../tsconfig.json config/ 2>/dev/null || echo "⚠️  tsconfig.json not found"
cp ../tailwind.config.js config/ 2>/dev/null || echo "⚠️  tailwind.config.js not found"

# 5. Create environment variables template
echo "🔐 Creating environment variables template..."
cat > config/env.template << 'EOF'
# FigDex Environment Variables Template
# Fill in your values and save as .env.local

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Email Service (Required for email notifications)
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

# 6. Create installation guide
echo "📋 Creating installation guide..."
cat > INSTALLATION_GUIDE.md << EOF
# FigDex Installation Guide

**Version:** ${VERSION}  
**Package Date:** $(date)

---

## 📦 Package Contents

This package contains:

1. **code/**: Complete source code
2. **documentation/**: All documentation files
3. **database/sql/**: SQL migration scripts
4. **config/**: Configuration templates and files

---

## 🚀 Quick Start

### 1. Extract Package

\`\`\`bash
unzip ${ZIP_FILE}
cd ${PACKAGE_NAME}
\`\`\`

### 2. Install Dependencies

\`\`\`bash
cd code
npm install
\`\`\`

### 3. Set Up Environment Variables

\`\`\`bash
cp ../config/env.template .env.local
# Edit .env.local with your actual values
\`\`\`

### 4. Set Up Database

1. Create a Supabase project at https://supabase.com
2. Run SQL scripts in order from \`database/sql/\`:
   - Start with table creation scripts
   - Then run migration scripts in chronological order

### 5. Deploy

See \`documentation/SETUP.md\` for detailed deployment instructions.

---

## 📚 Documentation

- **Complete Documentation**: \`documentation/COMPLETE_DOCUMENTATION.md\`
- **Setup Guide**: \`documentation/SETUP.md\`
- **Restore Guide**: \`documentation/RESTORE.md\`
- **Version Summary**: \`documentation/VERSION_SUMMARY_v${VERSION}.md\`
- **Features Status**: \`documentation/FEATURES_STATUS.md\`

---

## ⚠️ Important Notes

1. **Environment Variables**: Never commit \`.env.local\` with real values to version control
2. **Database**: Back up your database before running migrations
3. **Storage**: Storage files are NOT included in this package
4. **Email**: Configure \`RESEND_API_KEY\` for email notifications (see \`documentation/EMAIL_SETUP.md\`)

---

## 🔗 Quick Links

- **Supabase**: https://supabase.com
- **Vercel**: https://vercel.com
- **Resend**: https://resend.com (for emails)
- **Figma API**: https://www.figma.com/developers/api

---

**Package Version:** ${VERSION}  
**Created:** $(date)
EOF

# 7. Create package manifest
echo "📋 Creating package manifest..."
cat > PACKAGE_MANIFEST.md << EOF
# FigDex Package Manifest

**Version:** ${VERSION}  
**Package Date:** $(date)  
**Package Name:** ${ZIP_FILE}

---

## 📦 Package Contents

### Source Code (\`code/\`)
- Complete Next.js application
- All pages, components, and API routes
- Library files and utilities
- Configuration files

### Documentation (\`documentation/\`)
- COMPLETE_DOCUMENTATION.md - Full system documentation
- SETUP.md - Installation and setup guide
- RESTORE.md - Backup and restoration guide
- README.md - Quick start guide
- SYSTEM_SPECIFICATION.md - Technical specification
- FEATURES_STATUS.md - Feature inventory
- VERSION_SUMMARY_v${VERSION}.md - Version summary
- EMAIL_SETUP.md - Email configuration guide
- ENV_SETUP.md - Environment variables guide
- VERCEL_SETUP.md - Vercel deployment guide

### Database Scripts (\`database/sql/\`)
- All SQL migration scripts
- Table creation scripts
- Schema update scripts
- Index creation scripts

### Configuration (\`config/\`)
- Environment variables template
- Vercel configuration
- Next.js configuration
- TypeScript configuration
- Tailwind configuration
- Package.json

---

## 🔧 System Requirements

- Node.js 18+ (Node.js 20+ recommended)
- npm or yarn
- Supabase account
- Vercel account (for deployment)
- Resend account (for email notifications)

---

## 📝 Installation Steps

1. Extract the ZIP file
2. Install dependencies: \`cd code && npm install\`
3. Configure environment variables (copy \`config/env.template\` to \`code/.env.local\`)
4. Set up Supabase database (run SQL scripts from \`database/sql/\`)
5. Deploy to Vercel (see \`documentation/SETUP.md\`)

---

## ⚠️ Important Security Notes

1. **Never commit environment variables** with real values
2. **Keep service role keys secure** - never expose in client-side code
3. **Use Row Level Security (RLS)** in Supabase
4. **Regularly update dependencies** for security patches

---

## 📞 Support

For detailed instructions, see the documentation files in the \`documentation/\` folder.

---

**Package Version:** ${VERSION}  
**Created:** $(date)
EOF

# 8. Create file list
echo "📝 Creating file list..."
find . -type f > FILES.txt 2>/dev/null || true

# 9. Go back to parent directory
cd ..

# 10. Create ZIP archive
echo "📦 Creating ZIP archive..."
zip -r "${ZIP_FILE}" "${PACKAGE_DIR}" -q

# 11. Calculate file size
FILE_SIZE=$(du -h "${ZIP_FILE}" | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 Package: ${ZIP_FILE}"
echo "📊 Size: ${FILE_SIZE}"
echo "📁 Directory: ${PACKAGE_DIR}"
echo ""
echo "📋 Contents:"
echo "   - Source code (code/)"
echo "   - Documentation (documentation/)"
echo "   - SQL scripts (database/sql/)"
echo "   - Configuration templates (config/)"
echo "   - Installation guide (INSTALLATION_GUIDE.md)"
echo ""
echo "🚀 Next Steps:"
echo "   1. Extract: unzip ${ZIP_FILE}"
echo "   2. Read: ${PACKAGE_DIR}/INSTALLATION_GUIDE.md"
echo "   3. Follow: ${PACKAGE_DIR}/documentation/SETUP.md"
echo ""
echo "⚠️  Important:"
echo "   - Environment variables are NOT included (security)"
echo "   - Storage files are NOT included (backup separately)"
echo "   - node_modules are NOT included (run 'npm install')"
echo ""

