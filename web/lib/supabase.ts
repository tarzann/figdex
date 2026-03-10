import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // In development, fail fast with a clear message if env vars are missing
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Missing Supabase env vars. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
  }
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string);