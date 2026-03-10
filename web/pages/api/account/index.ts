import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-figdex-email');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
    }
    const supabaseAdmin = createClient(serviceUrl, serviceKey);
    const authHeader = req.headers.authorization;
    const fallbackEmail = String(req.headers['x-figdex-email'] || '').trim().toLowerCase();
    let apiKey: string | null = null;
    let user: any = null;
    let shouldReturnApiKey = false; // Flag to return full API key if we created/updated it
    
    // Primary: Bearer API key
    if (authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.replace('Bearer ', '');
      // Try lookup by api_key regardless of prefix/length
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, plan, is_admin, api_key, created_at')
      .eq('api_key', apiKey)
      .maybeSingle();
      user = u || null;
    }
    
    // Fallback: email header to self-heal existing users without keys OR create new user
    // Check email header if no user found via API key, OR if no API key was provided at all
    if (!user && fallbackEmail) {
        const { data: byEmail } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, plan, is_admin, api_key, created_at')
          .eq('email', fallbackEmail)
          .maybeSingle();
        if (byEmail) {
          // User exists - ensure they have an API key
          if (!byEmail.api_key || !String(byEmail.api_key).startsWith('figdex_')) {
            const newKey = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
            try {
              await supabaseAdmin.from('users').update({ api_key: newKey } as any).eq('id', byEmail.id);
              byEmail.api_key = newKey;
              shouldReturnApiKey = true; // Return full key since we just created it
            } catch (updateErr: any) {
              console.error('Failed to update user key:', updateErr);
            }
          } else {
            // User has API key - return it since we accessed via email (not API key)
            shouldReturnApiKey = true;
          }
          user = byEmail;
          apiKey = byEmail.api_key;
        } else {
          // User doesn't exist - create them with API key
          const newKey = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
          let created: any = null;
          
          // Try full insert first (with optional fields)
          const { data: createdFull, error: errFull } = await supabaseAdmin
            .from('users')
            .insert({
              email: fallbackEmail,
              api_key: newKey,
              full_name: fallbackEmail.split('@')[0],
              plan: 'free',
              provider: 'email',
              provider_id: `email_${Date.now()}`
            } as any)
            .select('id, email, api_key, full_name, plan, is_admin')
            .single();
          
          if (errFull) {
            console.error('Full insert failed:', errFull);
            // Check if error is due to unique constraint (user already exists)
            if (errFull.code === '23505' || errFull.message?.includes('duplicate') || errFull.message?.includes('unique')) {
              // User already exists - try to find them again
              const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('id, email, full_name, plan, is_admin, api_key, created_at')
                .eq('email', fallbackEmail)
                .maybeSingle();
              if (existingUser) {
                user = existingUser;
                apiKey = existingUser.api_key;
                // Ensure they have an API key
                if (!apiKey || !String(apiKey).startsWith('figdex_')) {
                  const newKeyRestart = `figdex_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 36);
                  try {
                    await supabaseAdmin.from('users').update({ api_key: newKeyRestart } as any).eq('id', existingUser.id);
                    user.api_key = newKeyRestart;
                    apiKey = newKeyRestart;
                    shouldReturnApiKey = true;
                  } catch (updateErr: any) {
                    console.error('Failed to update user key:', updateErr);
                  }
                }
                // Skip to usage aggregation
                created = null; // Signal that we found existing user
              } else {
                // Fallback: minimal insert (only required fields)
                const { data: createdMin, error: errMin } = await supabaseAdmin
                  .from('users')
                  .insert({ email: fallbackEmail, api_key: newKey, plan: 'free' })
                  .select('id, email, plan, is_admin, api_key')
                  .single();
                
                if (errMin) {
                  console.error('Minimal insert also failed:', errMin);
                  return res.status(500).json({
                    success: false,
                    error: 'Failed to create user account',
                    details: errMin.message || errFull.message,
                    code: errMin.code || errFull.code
                  });
                }
                created = createdMin;
              }
            } else {
              // Other error - try minimal insert
              const { data: createdMin, error: errMin } = await supabaseAdmin
                .from('users')
                .insert({ email: fallbackEmail, api_key: newKey, plan: 'free' })
                .select('id, email, plan, is_admin, api_key')
                .single();
              
              if (errMin) {
                console.error('Minimal insert also failed:', errMin);
                return res.status(500).json({
                  success: false,
                  error: 'Failed to create user account',
                  details: errMin.message || errFull.message,
                  code: errMin.code || errFull.code
                });
              }
              created = createdMin;
            }
          } else {
            created = createdFull;
          }
          
          // Only set user if we actually created one (not if we found existing)
          if (created && !user) {
            user = { ...created, full_name: created.full_name || null, plan: created.plan || 'free', is_admin: false, created_at: null };
            apiKey = newKey;
            shouldReturnApiKey = true; // Return full key since we just created it
          }
        }
    }
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    if (user.is_admin && user.plan !== 'unlimited') {
      try {
        await supabaseAdmin.from('users').update({ plan: 'unlimited' }).eq('id', user.id);
      } catch (planErr) {
        console.error('Failed to set unlimited plan for admin:', planErr);
      } finally {
        user.plan = 'unlimited';
      }
    }

    const effectivePlan = user.is_admin ? 'unlimited' : (user.plan || 'free');

    // Usage aggregation
    const { data: files, error: filesErr } = await supabaseAdmin
      .from('index_files')
      .select('project_id, uploaded_at')
      .eq('user_id', user.id);
    if (filesErr) {
      console.error('Account usage fetch error:', filesErr);
      return res.status(500).json({ success: false, error: 'Failed to fetch usage' });
    }
    const totalFramesApprox = 0; // optional placeholder (we can compute from index_data if needed)
    const totalFiles = files?.length || 0;
    // No dedicated storage column in schema; report 0 for now
    const totalSize = 0;
    const projects = new Set((files || []).map((f: any) => f.project_id).filter(Boolean));
    const lastUploadedAt = (files || [])
      .map((f: any) => new Date(f.uploaded_at || 0).getTime())
      .reduce((a: number, b: number) => Math.max(a, b), 0);
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name || null,
        plan: effectivePlan,
        apiKeyMasked: user.api_key ? user.api_key.slice(0, 8) + '••••••••' : null,
        apiKey: shouldReturnApiKey ? (user.api_key || null) : undefined, // Return full key only if we created/updated it
        createdAt: user.created_at || null,
      },
      usage: {
        projects: projects.size,
        indices: totalFiles,
        storageBytes: totalSize,
        lastUploadedAt: lastUploadedAt || null,
        framesApprox: totalFramesApprox,
      },
    });
  } catch (e: any) {
    console.error('Account API error:', e);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: e?.message || String(e),
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    });
  }
}


