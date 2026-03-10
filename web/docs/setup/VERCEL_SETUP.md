# Vercel Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key

## 2. Create Database Table

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE index_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT,
  figma_file_key TEXT,
  file_name TEXT,
  index_data JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Environment Variables

Create `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 4. Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. From project root: `cd FigDex/web` then run `vercel` (or `npx vercel --prod`)
3. Add environment variables in Vercel dashboard

## 5. Update Plugin

Update the plugin URLs to use your Vercel domain instead of ngrok. 