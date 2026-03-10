# FigDex - System Specification & Feature Documentation

**Version:** 1.3.0  
**Last Updated:** December 2024  
**Status:** Production

---

## 📋 Executive Summary

FigDex is a comprehensive design index management platform that enables designers and teams to organize, search, and share Figma design frames. The system consists of three main components:

1. **Figma Plugin** - Direct integration within Figma for creating indices
2. **Web Application** - Cloud-based gallery and management interface
3. **REST API** - Programmatic access for automation and integrations

The platform supports both manual uploads via the plugin and automated indexing via the Figma REST API, making it suitable for individual designers and large design teams.

---

## 🏗️ System Architecture

### Core Components

1. **Figma Plugin** (`FigDex/plugin/`)
   - Extracts frames, images, and metadata from Figma files
   - Uploads data to web system via REST API
   - Supports tagging, quality control, and selective indexing

2. **Web Application** (`FigDex/web/`)
   - Next.js 15.4.4 React application
   - Supabase backend (PostgreSQL + Storage)
   - Vercel serverless deployment

3. **REST API**
   - Figma API integration for automated indexing
   - Background job processing system
   - Chunked upload support for large files

---

## ✨ Core Features & Capabilities

### 1. Index Creation & Management

#### 1.1 Figma Plugin Indexing
- **Frame Extraction**
  - Automatic detection of frames within pages
  - Support for frames within sections
  - Exclusion of hidden frames
  - Recursive frame discovery
  - Frame count per page display

- **Image Generation**
  - Configurable quality (30%, 70%, 100%)
  - PNG format with base64 encoding
  - Automatic thumbnail generation
  - Quality slider with real-time preview

- **Page Selection**
  - Multi-page support
  - Selective page indexing
  - Frame count per page
  - Visual page selection interface

- **Selective Frame Exclusion**
  - Mark frames to exclude from index
  - Visual feedback for excluded frames
  - Persistent exclusion settings

#### 1.2 Figma API Integration (Pro/Unlimited)
- **Automated Index Creation**
  - Direct connection to Figma REST API
  - Token-based authentication
  - File key extraction from Figma URLs
  - Automatic page and frame detection

- **Background Processing**
  - Asynchronous job queue system
  - Real-time progress tracking
  - Automatic retry on failures
  - Chunked processing for large files

- **Job Management**
  - Job splitting for indices >500 frames
  - Dynamic chunk sizing
  - Status tracking (pending, processing, completed, failed)
  - Progress percentage display
  - Error handling and recovery

- **Saved Connections**
  - Store Figma file connections
  - Reuse tokens and file keys
  - Quick connection application
  - Connection history management

- **Index History**
  - Track all created indices
  - Status monitoring
  - Link to gallery view
  - Delete from history
  - Progress tracking for active jobs

#### 1.3 Image Quality Control
- **Quality Options**
  - Low (30%) - Smaller file size
  - Medium (70%) - Balanced quality/size
  - High (100%) - Maximum quality
  - Per-index quality selection

- **Storage Optimization**
  - Automatic compression
  - Efficient image encoding
  - Storage size tracking

### 2. Tagging System

#### 2.1 Automatic Tags
- **Frame Type Detection**
  - Button, Icon, Card, Form, Modal, Navigation
  - Auto-detection from frame names
  - Dynamic categorization

- **Device Type Tags**
  - iOS (Apple devices)
  - Android
  - Mobile WebApp
  - Tablet
  - Desktop
  - Auto-detection from dimensions and names

- **Aspect Ratio Tags**
  - Square (1:1)
  - Ultra Wide (16:9+)
  - Wide (16:10)
  - Landscape (4:3)
  - Standard (3:2)
  - Portrait (2:3)
  - Tall (9:16)
  - Ultra Tall (9:21)

- **Color Tags**
  - Primary colors (Red, Blue, Green, Yellow, Purple, Orange)
  - Neutral colors (Black, White, Gray)
  - Brand colors (auto-detected)

- **Size Tags**
  - Automatic size categorization
  - Dimension-based tagging

#### 2.2 Custom Tags (Pro/Unlimited)
- **User-Defined Tags**
  - Create custom tag library
  - Tag multiple frames at once
  - Tag persistence across sessions
  - Tag management interface

- **Tag Application**
  - Multi-selection tagging
  - Bulk tag operations
  - Tag removal and editing

### 3. Search & Discovery

#### 3.1 Text Search
- **Full-Text Search**
  - Search in frame names
  - Search in text content
  - Combined search across all fields
  - Real-time search results
  - Search token extraction

#### 3.2 Advanced Filtering
- **Multi-Criteria Filtering**
  - Device type filters
  - Aspect ratio filters
  - Frame type filters
  - Color filters
  - Section/group filters
  - File filters

- **Filter UI**
  - Sidebar filter panel
  - Collapsible filter sections
  - Checkbox-based selection
  - Filter count indicators
  - Clear all filters option
  - AND logic between filters

- **Filter Combinations**
  - Multiple simultaneous filters
  - Real-time result updates
  - Filter state persistence

#### 3.3 Gallery View
- **Display Options**
  - Masonry grid layout
  - Responsive design
  - Thumbnail preview
  - Hover effects
  - Full-screen modal view

- **Navigation**
  - Image navigation (prev/next)
  - Keyboard shortcuts
  - Pagination support
  - Frame count display

### 4. Sharing & Collaboration

#### 4.1 Public Sharing
- **Share Links**
  - Generate public share URLs
  - Token-based access
  - Share specific indices
  - Copy to clipboard

- **Public Gallery**
  - View-only access
  - No authentication required
  - Shareable via URL

#### 4.2 User Profiles
- **Public User Pages**
  - Custom slug URLs (`/u/[slug]`)
  - Public index showcase
  - Profile customization

### 5. Version Management

#### 5.1 Archive System
- **Automatic Archiving**
  - Archive old versions when updating
  - Keep last 2 versions (configurable)
  - Automatic cleanup of older versions

- **Version Restoration**
  - View archived versions
  - Restore previous versions
  - Archive metadata (date, size)
  - Available in admin and user views

#### 5.2 Index History
- **Creation Tracking**
  - Track all index creation attempts
  - Job status history
  - Success/failure tracking
  - Timestamp recording

### 6. User Management

#### 6.1 Authentication
- **OAuth Integration**
  - Google OAuth login
  - Secure token management
  - Session persistence
  - Auto-login support

- **Account Management**
  - User profile pages
  - Email management
  - Plan assignment
  - API key generation

#### 6.2 API Keys
- **Key Management**
  - Automatic key generation
  - Key regeneration
  - Masked key display
  - Copy to clipboard
  - Show/hide functionality

#### 6.3 Usage Tracking
- **Account Dashboard**
  - Project count
  - Total indices
  - Storage usage (MB)
  - Last upload timestamp
  - Plan limits display

### 7. Admin Features

#### 7.1 User Management
- **User Administration**
  - View all users
  - User search
  - Plan assignment
  - User deletion
  - User statistics

#### 7.2 Index Management
- **Index Administration**
  - View all indices
  - Index search
  - Index deletion
  - Source tracking (Plugin vs API)
  - Archive management
  - Bulk operations

#### 7.3 Analytics
- **System Analytics**
  - User statistics
  - Index statistics
  - Usage metrics
  - Growth tracking

#### 7.4 Maintenance Tools
- **System Tools**
  - Fix user indices
  - Merge chunks
  - Clear all indices
  - Database debugging

### 8. Technical Features

#### 8.1 Large File Support
- **Chunked Processing**
  - Automatic file splitting
  - Chunk size optimization
  - Parallel processing
  - Chunk merging

- **Job Splitting**
  - Split large indices into sub-jobs
  - Process up to 200 frames per job
  - Automatic job merging
  - Progress aggregation

#### 8.2 Performance Optimization
- **Efficient Processing**
  - Background job queue
  - Asynchronous processing
  - Dynamic chunk sizing
  - Timeout handling
  - Retry mechanisms

- **Storage Optimization**
  - Supabase Storage integration
  - Image compression
  - Efficient data structures
  - Lazy loading

#### 8.3 Error Handling
- **Robust Error Management**
  - Transient error detection
  - Automatic retries
  - Error logging
  - User-friendly error messages
  - Graceful degradation

#### 8.4 Network Resilience
- **Connection Handling**
  - Network error detection
  - Automatic retry on failures
  - Chunk size adjustment
  - Status persistence

---

## 💼 Subscription Plans

### Free Plan
- **Price:** $0/month
- **Limits:**
  - 1 project
  - Up to 500 frames total
  - 2 uploads per day
  - Index size up to 50MB
  - 30-day data retention
- **Features:**
  - Basic gallery & search
  - Automatic tags (name/size)
  - Public share link
- **Restrictions:**
  - No custom tags
  - No version archive
  - No team features
  - No API access
  - No Figma API integration

### Pro Plan
- **Price:** $15/month
- **14-day free trial**
- **Limits:**
  - Up to 5 projects
  - Up to 50,000 frames total
  - 20 uploads per day
  - Index size up to 500MB
  - 180-day data retention
- **Features:**
  - Fast thumbnails & advanced filters
  - Custom tags & tag library
  - Version archive (last 10)
  - API key access
  - **Figma API integration**
- **Additional Benefits:**
  - Priority support
  - Advanced search capabilities
  - Enhanced storage

### Unlimited Plan
- **Price:** Custom pricing
- **Limits:**
  - Unlimited projects
  - Unlimited frames
  - Unlimited uploads
  - Unlimited storage
  - Unlimited retention
- **Features:**
  - All Pro features
  - Team collaboration
  - Advanced analytics
  - Custom integrations
  - Dedicated support

---

## 🔌 API Capabilities

### REST API Endpoints

#### Authentication
- `POST /api/auth/signup` - User registration/login
- `POST /api/auth/oauth` - OAuth authentication
- `GET /api/validate-api-key` - API key validation

#### Index Management
- `POST /api/upload-index-v2` - Upload index from plugin
- `POST /api/create-index-from-figma` - Create index via Figma API
- `POST /api/process-index-job` - Process background job
- `GET /api/get-job-status` - Get job status
- `GET /api/get-indices` - List user indices
- `GET /api/get-index-data` - Get index data
- `DELETE /api/delete-index` - Delete index

#### Figma Integration
- `GET /api/get-page-frame-counts` - Get frame counts
- `GET /api/figma/image-urls` - Get image URLs
- `GET /api/figma/proxy-image` - Proxy image download

#### Archive Management
- `GET /api/index-archives` - List archives
- `POST /api/index-archives` - Restore archive
- `GET /api/admin/index-archives` - Admin archive access

#### Account Management
- `GET /api/account` - Get account info
- `GET /api/account/plan` - Get plan details
- `POST /api/account/regenerate-api-key` - Regenerate API key
- `POST /api/account/ensure-key` - Ensure API key exists

#### Sharing
- `POST /api/index/[id]/share` - Generate share link
- `GET /api/public/index/[token]` - Access shared index
- `GET /api/public/u/[slug]` - Public user page

#### Admin
- `GET /api/admin/users` - List users
- `GET /api/admin/indices` - List all indices
- `DELETE /api/admin/indices` - Delete indices
- `GET /api/admin/analytics` - System analytics

---

## 🎨 User Interface Features

### Web Application Pages

#### 1. Gallery (`/gallery`)
- Main index viewing interface
- Advanced filtering sidebar
- Search functionality
- Image modal viewer
- Favorites system
- File selection dropdown
- Index management dialog
- Share functionality

#### 2. Create Index from API (`/api-index`)
- Figma API token input
- File URL/key input
- Connection validation
- Page selection with frame counts
- Image quality selector
- Saved connections management
- Index history tracking
- Job status monitoring
- Progress tracking

#### 3. Projects (`/projects`)
- List all user projects
- Project cards with metadata
- Archive version viewing
- Archive restoration
- View index in gallery

#### 4. Account (`/account`)
- User profile information
- Plan display
- API key management
- Usage statistics
- Figma API integration access

#### 5. Pricing (`/pricing`)
- Plan comparison
- Feature lists
- Upgrade options
- Free trial information

#### 6. Admin Dashboard (`/admin`)
- User management
- Index management
- Analytics dashboard
- System tools

---

## 🔒 Security Features

### Authentication & Authorization
- OAuth 2.0 integration
- API key-based authentication
- Secure token storage
- Session management
- Role-based access control (Admin/User)

### Data Protection
- Encrypted API keys
- Secure token handling
- HTTPS enforcement
- CORS protection
- Input validation

### Privacy
- User data isolation
- Private indices by default
- Optional public sharing
- GDPR considerations

---

## 📊 Data Model

### Core Tables

#### `index_files`
- Index metadata
- User association
- File information
- Storage references
- Tags and metadata
- Timestamps

#### `index_jobs`
- Background job tracking
- Status management
- Progress tracking
- Error logging
- Job splitting support

#### `index_archives`
- Archived versions
- Version history
- Metadata preservation

#### `users`
- User accounts
- Plan assignment
- API keys
- Usage tracking

---

## 🚀 Deployment & Infrastructure

### Hosting
- **Frontend:** Vercel (Next.js)
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **CDN:** Vercel Edge Network

### Performance
- Serverless architecture
- Edge caching
- Image optimization
- Lazy loading
- Code splitting

### Monitoring
- Error tracking
- Performance monitoring
- Usage analytics
- Job status tracking

---

## 📈 Current Statistics

### System Capabilities
- **Max Index Size:** 500MB (Pro), 50MB (Free)
- **Max Frames per Index:** 50,000 (Pro), 500 (Free)
- **Max Projects:** 5 (Pro), 1 (Free)
- **Daily Uploads:** 20 (Pro), 2 (Free)
- **Data Retention:** 180 days (Pro), 30 days (Free)

### Technical Limits
- **Job Processing:** Up to 200 frames per chunk
- **Job Splitting:** Automatic for indices >500 frames
- **Image Quality:** 30%, 70%, 100%
- **Supported Formats:** PNG, Base64

---

## 🎯 Use Cases

### 1. Design System Management
- Organize design components
- Search and discover components
- Share design systems
- Version control for designs

### 2. Team Collaboration
- Centralized design library
- Component discovery
- Design documentation
- Design handoff support

### 3. Design Automation
- Automated indexing via API
- Scheduled updates (future)
- CI/CD integration (future)
- Design system sync

### 4. Design Research
- Component analysis
- Design pattern discovery
- Usage tracking
- Design audit

---

## 🔮 Future Roadmap (Planned)

### Short Term
- Scheduled index updates
- Enhanced search capabilities
- Team collaboration features
- Mobile app

### Medium Term
- Image-based search
- AI-powered suggestions
- Advanced analytics
- Design system integration

### Long Term
- Real-time collaboration
- Design version control
- Component relationships
- Design system compliance

---

## 📝 Technical Specifications

### Technology Stack
- **Frontend:** React, Next.js 15.4.4, Material-UI
- **Backend:** Node.js, TypeScript
- **Database:** PostgreSQL (Supabase)
- **Storage:** Supabase Storage
- **Authentication:** OAuth 2.0, API Keys
- **Deployment:** Vercel

### Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### API Compatibility
- Figma REST API v1
- RESTful API design
- JSON data format
- Bearer token authentication

---

## 📞 Support & Resources

### Documentation
- API documentation
- User guides
- Feature documentation
- Troubleshooting guides

### Support Channels
- Email support
- In-app help
- Documentation portal
- Community forum (future)

---

## 🏆 Key Differentiators

1. **Dual Indexing Methods**
   - Plugin for manual control
   - API for automation
   - Best of both worlds

2. **Advanced Filtering**
   - Multi-criteria search
   - Auto-detection
   - Smart categorization

3. **Background Processing**
   - Large file support
   - Job queue system
   - Progress tracking

4. **Version Management**
   - Automatic archiving
   - Version restoration
   - History tracking

5. **Flexible Plans**
   - Free tier available
   - Pro features for teams
   - Unlimited for enterprises

---

**Document Version:** 1.0  
**Last Updated:** December 2, 2024  
**Maintained By:** FigDex Development Team



