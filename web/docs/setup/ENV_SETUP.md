# Environment Variables Setup

This document describes the environment variables needed for FigDex to function properly.

## Required Variables

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Sentry (Error Tracking)
```bash
# Client-side (public)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Server-side
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
```

## Optional Variables

### Email Service (Resend)
```bash
# Resend API Key (recommended email service)
RESEND_API_KEY=re_your_api_key_here

# Email addresses
SUPPORT_EMAIL=support@figdex.com
FROM_EMAIL=noreply@figdex.com

# Public support email (shown on contact page)
NEXT_PUBLIC_SUPPORT_EMAIL=support@figdex.com

# Send confirmation email to users after contact form submission
SEND_CONFIRMATION_EMAIL=true
```

### Alternative Email Services

If you prefer to use a different email service, you can modify `lib/email.ts` to support:
- SendGrid
- Mailgun
- AWS SES
- Postmark

## Setup Instructions

1. **Supabase**: Get your credentials from your Supabase project settings
2. **Sentry**: 
   - Create a project at https://sentry.io
   - Get your DSN from project settings
   - Set up your org and project names
3. **Resend**:
   - Sign up at https://resend.com
   - Create an API key
   - Verify your domain (for production)
   - Add the API key to your environment variables

## Vercel Setup

Add these variables in your Vercel project settings:
1. Go to your project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development environments
3. Redeploy after adding variables

## Local Development

Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

**Note**: Never commit `.env.local` to git. It's already in `.gitignore`.



