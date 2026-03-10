# FigDex Documentation Index

**Version:** 1.25.0  
**Last Updated:** December 21, 2025

This is the master index for all FigDex documentation files.

---

## 📚 Core Documentation

### 1. [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)
**Complete System Documentation**
- System overview and architecture
- Database schema
- API documentation
- UI features
- Authentication & security
- Configuration
- Maintenance & troubleshooting

**Start here for:** Complete understanding of the system

---

### 2. [SETUP.md](./SETUP.md)
**Installation & Setup Guide**
- Prerequisites
- Step-by-step installation
- Database setup (SQL scripts in order)
- Storage configuration
- Authentication setup
- Environment variables
- Local development
- Production deployment
- Verification checklist

**Start here for:** New installations

---

### 3. [RESTORE.md](./RESTORE.md)
**Restoration & Re-installation Guide**
- Backup and restore procedures
- Database migration
- Storage restoration
- Environment variable restoration
- Fresh installation instructions
- Data migration guide
- Emergency restoration
- Verification procedures

**Start here for:** Restoring from backup or migrating

---

### 4. [SYSTEM_SPECIFICATION.md](./SYSTEM_SPECIFICATION.md)
**Technical Specification**
- Detailed system architecture
- Feature specifications
- Technical requirements
- Data models
- API capabilities
- Security features

**Start here for:** Technical details and specifications

---

### 5. [README.md](./README.md)
**Quick Start & Overview**
- Quick introduction
- Key features
- Technology stack
- Links to all documentation
- Quick install guide

**Start here for:** First-time visitors

---

## 🔧 Setup & Configuration

- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment variables guide
- **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** - Vercel deployment guide
- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - Detailed environment variables documentation

---

## 📊 Features & Specifications

- **[MONTHLY_LIMITS_SPECIFICATION.md](./MONTHLY_LIMITS_SPECIFICATION.md)** - Credits and limits system
- **[MONTHLY_LIMITS_IMPLEMENTATION.md](./MONTHLY_LIMITS_IMPLEMENTATION.md)** - Implementation details
- **[INCREMENTAL_REINDEX_SPECIFICATION.md](./INCREMENTAL_REINDEX_SPECIFICATION.md)** - Re-indexing system
- **[ADVANCED_FILTERS_DOCUMENTATION.md](./ADVANCED_FILTERS_DOCUMENTATION.md)** - Filtering system

---

## 💰 Pricing & Business

- **[PRICING_STRUCTURE_FINAL.md](./PRICING_STRUCTURE_FINAL.md)** - Final pricing structure
- **[PRICING_MODEL_SIMPLIFIED.md](./PRICING_MODEL_SIMPLIFIED.md)** - Simplified pricing model
- **[PRICING_MODELS_ANALYSIS.md](./PRICING_MODELS_ANALYSIS.md)** - Pricing analysis
- **[MULTI_USER_ECONOMICS.md](./MULTI_USER_ECONOMICS.md)** - Multi-user economics
- **[COST_ESTIMATION.md](./COST_ESTIMATION.md)** - Cost estimation

---

## 🚀 Deployment & Infrastructure

- **[DEPLOYMENT_ALTERNATIVES.md](./DEPLOYMENT_ALTERNATIVES.md)** - Deployment options
- **[SELF_HOSTED_COST_ANALYSIS.md](./SELF_HOSTED_COST_ANALYSIS.md)** - Self-hosting costs
- **[CAPACITY_ANALYSIS.md](./CAPACITY_ANALYSIS.md)** - Capacity analysis
- **[OPTIMIZATION_ANALYSIS.md](./OPTIMIZATION_ANALYSIS.md)** - Optimization analysis

---

## 🔨 Development & Implementation

- **[INDEX_CREATION_APPROACHES.md](./INDEX_CREATION_APPROACHES.md)** - Index creation approaches
- **[INDEX_CREATION_APPROACHES_V2.md](./INDEX_CREATION_APPROACHES_V2.md)** - Version 2 approaches
- **[DYNAMIC_BATCH_PROCESSING.md](./DYNAMIC_BATCH_PROCESSING.md)** - Batch processing
- **[DEBUGGING_SUMMARY.md](./DEBUGGING_SUMMARY.md)** - Debugging guide

---

## 📝 Testing & Validation

- **[TESTING_INCREMENTAL_REINDEX.md](./TESTING_INCREMENTAL_REINDEX.md)** - Re-index testing
- **[TESTING_DYNAMIC_BATCH.md](./TESTING_DYNAMIC_BATCH.md)** - Batch testing
- **[TEST_NEW_INDEX_VERSION_INFO.md](./TEST_NEW_INDEX_VERSION_INFO.md)** - Version info testing

---

## 📋 Checklists & Reports

- **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** - Launch checklist
- **[SYSTEM_STATUS_REPORT.md](./SYSTEM_STATUS_REPORT.md)** - System status
- **[CHANGELOG.md](./CHANGELOG.md)** - Version changelog
- **[CHANGELOG_v1.14.0.md](./CHANGELOG_v1.14.0.md)** - Version 1.14.0 changelog
- **[RELEASE_NOTES_v1.14.0.md](./RELEASE_NOTES_v1.14.0.md)** - Release notes
- **[RELEASE_SUMMARY_2025-11-05.md](./RELEASE_SUMMARY_2025-11-05.md)** - Release summary

---

## 📦 Backup & Restoration

### Creating Backups

Use the provided backup script:

```bash
./create-backup.sh
```

This creates:
- Complete codebase backup
- Documentation package
- SQL scripts
- Configuration templates
- Backup manifest

### Backup Contents

- **Code**: Full codebase (excluding node_modules, .next, .git)
- **Documentation**: All documentation files
- **Database Scripts**: All SQL migration scripts
- **Configuration**: Environment templates and config files

### Restoring

See **[RESTORE.md](./RESTORE.md)** for detailed restoration instructions.

---

## 🗄️ Database

### SQL Scripts Location

All SQL scripts are in the `sql/` directory:

1. `create_users_table.sql` - User accounts
2. `sql/create_saved_connections_table.sql` - Saved connections
3. `sql/create_saved_indices_table.sql` - Index history
4. `sql/add_index_jobs_table.sql` - Background jobs
5. `sql/add_index_archives_table.sql` - Version archives
6. `sql/create_projects_table.sql` - Projects
7. `add_share_support.sql` - Sharing support
8. `add_tags_columns.sql` - Tag support
9. `sql/add_version_tracking_to_index_files.sql` - Version tracking
10. `sql/add_version_tracking_to_index_jobs.sql` - Job version tracking
11. `sql/add_page_meta_to_saved_connections.sql` - Page metadata
12. `sql/add_frame_node_refs_to_index_jobs.sql` - Frame node refs
13. `sql/add_image_quality_to_index_jobs.sql` - Image quality
14. `sql/add_job_splitting_columns.sql` - Job splitting

**Important**: Run scripts in order as documented in **[SETUP.md](./SETUP.md)**.

---

## 📞 Getting Help

### For Installation Issues
1. Check **[SETUP.md](./SETUP.md)**
2. Review error logs
3. Verify prerequisites

### For Restoration Issues
1. Check **[RESTORE.md](./RESTORE.md)**
2. Verify backup integrity
3. Check database connection

### For Technical Questions
1. Check **[COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)**
2. Review **[SYSTEM_SPECIFICATION.md](./SYSTEM_SPECIFICATION.md)**
3. Check API documentation

### For Support
- Email: support@figdex.com
- Check error logs in Vercel/Supabase
- Review troubleshooting sections in documentation

---

## 🎯 Quick Navigation

### I want to...

- **Install the system** → [SETUP.md](./SETUP.md)
- **Restore from backup** → [RESTORE.md](./RESTORE.md)
- **Understand the system** → [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md)
- **Configure environment** → [ENV_SETUP.md](./ENV_SETUP.md)
- **Deploy to production** → [SETUP.md](./SETUP.md#production-deployment)
- **Understand API** → [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md#api-documentation)
- **Understand database** → [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md#database-schema)
- **Create backup** → Run `./create-backup.sh`

---

## 📌 Version Information

**Current Version:** 1.25.0  
**Documentation Version:** 1.0  
**Last Updated:** December 21, 2025

---

**Documentation Index Version:** 1.0  
**Last Updated:** December 21, 2025

