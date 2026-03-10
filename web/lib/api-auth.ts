import { NextApiRequest } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Get user ID from API key in Authorization header
 */
export async function getUserIdFromApiKey(req: NextApiRequest): Promise<string | null> {
  if (!supabase) return null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const apiKey = authHeader.substring(7).trim();
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) return null;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('api_key', apiKey)
      .single();

    if (error || !user) return null;
    if (user.is_active === false) return null;
    return user.id;
  } catch {
    return null;
  }
}
