import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Find user by API key
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, custom_tags')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    if (req.method === 'GET') {
      // Return user's custom tags
      const customTags = Array.isArray(user.custom_tags) ? user.custom_tags : [];
      return res.status(200).json({ 
        success: true, 
        custom_tags: customTags 
      });
    }

    if (req.method === 'POST') {
      // Update user's custom tags
      const { custom_tags } = req.body || {};
      
      // Validate that custom_tags is an array of strings
      if (!Array.isArray(custom_tags)) {
        return res.status(400).json({ 
          success: false, 
          error: 'custom_tags must be an array of strings' 
        });
      }

      // Validate each tag is a string and not empty
      const validTags = custom_tags
        .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim())
        .filter((tag: string, index: number, arr: string[]) => arr.indexOf(tag) === index); // Remove duplicates

      // Update user's custom tags
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ custom_tags: validTags })
        .eq('id', user.id)
        .select('custom_tags')
        .single();

      if (updateError) {
        return res.status(500).json({ 
          success: false, 
          error: updateError.message 
        });
      }

      return res.status(200).json({ 
        success: true, 
        custom_tags: updatedUser.custom_tags || [] 
      });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    console.error('Error in custom-tags API:', e);
    return res.status(500).json({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Unknown error' 
    });
  }
}

