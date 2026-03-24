import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['GET']
    });
  }

  try {
    // Use service role to avoid RLS issues
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    const svc = serviceUrl && serviceKey ? createClient(serviceUrl, serviceKey) : supabase;
    const { userEmail, anonId: queryAnonId } = req.query;
    const anonId = typeof queryAnonId === 'string' ? queryAnonId.trim().slice(0, 200) : '';

    // Guest path: fetch by owner_anon_id (user_id IS NULL)
    if (anonId) {
      const selectNoSize = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at';
      const { data: guestIndices, error: guestErr } = await svc
        .from('index_files')
        .select(selectNoSize)
        .is('user_id', null)
        .eq('owner_anon_id', anonId)
        .order('uploaded_at', { ascending: false })
        .limit(500);
      if (guestErr) {
        return res.status(500).json({ success: false, error: guestErr.message });
      }
      const indices = (guestIndices || []).map((idx: any) => ({
        ...idx,
        source: 'plugin',
        frame_count: null,
      }));
      return res.status(200).json({
        success: true,
        data: indices,
        user: null,
        isGuest: true,
        plan: 'guest',
      });
    }

    const userEmailStr = typeof userEmail === 'string' ? userEmail : '';
    if (!userEmailStr) {
      return res.status(400).json({ success: false, error: 'userEmail or anonId is required' });
    }

    // Find user by email first
    console.log(`🔍 Looking for user with email: ${userEmailStr}`);
    const { data: user, error: userError } = await svc
      .from('users')
      .select('id, email, full_name, api_key')
      .eq('email', userEmailStr)
      .single();

    if (userError) {
      console.error('❌ Error finding user:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      });
      if (userError.code !== 'PGRST116') {
        return res.status(500).json({ success: false, error: 'Error finding user', details: userError.message });
      }
      // User not found
      console.log('⚠️ User not found in database');
      return res.status(200).json({
        success: true,
        data: [],
        user: null,
        warning: 'User not found in database'
      });
    }

    if (!user) {
      console.log('⚠️ User query returned null');
      return res.status(200).json({
        success: true,
        data: [],
        user: null,
        warning: 'User not found in database'
      });
    }

    console.log(`✅ User found: ${user.email} (id: ${user.id}, type: ${typeof user.id})`);

    let indices: any[] = [];
    let indicesQueryError: string | null = null;
    // Get indices by user_id with size limit
    // Important: DO NOT fetch heavy JSON (index_data) here – it causes timeouts.
    // The gallery fetches full data per index via /api/get-index-data when needed.
    console.log(`🔍 Fetching indices for user_id: ${user.id} (type: ${typeof user.id})`);
    // Start without file_size since it may not exist in the table
    const selectNoSize = 'id, user_id, project_id, figma_file_key, file_name, uploaded_at';

    let { data: indicesByUserId, error: indicesByUserIdError } = await svc
      .from('index_files')
      .select(selectNoSize)
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(500); // Increased to support chunked uploads

    if (indicesByUserIdError) {
      console.error('❌ Error fetching indices by user_id:', {
        error: indicesByUserIdError,
        user_id: user.id,
        user_id_type: typeof user.id,
        user_email: user.email
      });
      // Do NOT fail the request. Continue with fallback checks and return a warning.
      indicesQueryError = indicesByUserIdError.message || 'Unknown indices query error';
      indices = [];
    }
    indices = (indicesByUserId || []);

    // Check which indices were created via API (have index_jobs entry)
    const indexIds = indices.map((idx: any) => idx.id).filter(Boolean);
    const apiIndexIds = new Set<string>();
    if (indexIds.length > 0) {
      try {
        const { data: jobs, error: jobsError } = await svc
          .from('index_jobs')
          .select('index_file_id')
          .in('index_file_id', indexIds)
          .not('index_file_id', 'is', null);
        
        if (!jobsError && Array.isArray(jobs)) {
          jobs.forEach((job: any) => {
            if (job.index_file_id) {
              apiIndexIds.add(job.index_file_id);
            }
          });
          console.log(`📊 Found ${apiIndexIds.size} indices created via API out of ${indexIds.length} total`);
        }
      } catch (e) {
        console.warn('⚠️ Could not check index_jobs for source detection:', e);
      }
    }

    // Fetch file_thumbnail_url from saved_connections for each index
    const fileKeyToThumbnail = new Map<string, string | null>();
    if (indices.length > 0 && user.id) {
      try {
        const fileKeys = indices.map((idx: any) => idx.figma_file_key).filter(Boolean);
        if (fileKeys.length > 0) {
          const { data: connections, error: connectionsError } = await svc
            .from('saved_connections')
            .select('file_key, file_thumbnail_url')
            .eq('user_id', user.id)
            .in('file_key', fileKeys);
          
          if (!connectionsError && Array.isArray(connections)) {
            connections.forEach((conn: any) => {
              if (conn.file_key && conn.file_thumbnail_url) {
                fileKeyToThumbnail.set(conn.file_key, conn.file_thumbnail_url);
              }
            });
            console.log(`📸 Found ${fileKeyToThumbnail.size} file thumbnails from saved_connections`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch file thumbnails from saved_connections:', e);
      }
    }

    // Final normalized list with computed fields when available
    indices = indices.map((idx: any) => ({
      id: idx.id,
      user_id: idx.user_id,
      project_id: idx.project_id,
      figma_file_key: idx.figma_file_key,
      file_name: idx.file_name,
      uploaded_at: idx.uploaded_at,
      file_size: typeof idx.file_size === 'number' ? idx.file_size : 0,
      frame_count: typeof idx.frame_count === 'number' ? idx.frame_count : null,
      source: apiIndexIds.has(idx.id) ? 'API' : 'Plugin', // Indicate if created via API or Plugin
      file_thumbnail_url: fileKeyToThumbnail.get(idx.figma_file_key) || null
    }));

    // Debug logging
    console.log(`📊 Found ${indices.length} total indices for user ${user.email} (${user.id})`);
    if (indices.length > 0) {
    console.log(`📋 Sample indices:`, indices.slice(0, 3).map((idx: any) => ({
      id: idx.id,
      user_id: idx.user_id,
      user_id_type: typeof idx.user_id,
      file_name: idx.file_name,
      figma_file_key: idx.figma_file_key,
      project_id: idx.project_id,
      uploaded_at: idx.uploaded_at,
      file_size: idx.file_size || 'not set',
      frame_count: idx.frame_count
    })));
    } else {
      // Check if there are any indices in the database at all
      const { data: allIndices, error: allIndicesError } = await svc
        .from('index_files')
        .select('id, user_id, file_name, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(5);
      
      if (!allIndicesError && allIndices && allIndices.length > 0) {
        console.log(`⚠️ Found ${allIndices.length} indices in database but none for this user. Sample indices:`, allIndices.map((idx: any) => ({
          id: idx.id,
          user_id: idx.user_id,
          user_id_type: typeof idx.user_id,
          file_name: idx.file_name
        })));
      }
    }

    // If no indices found, check if there are indices with null user_id that might belong to this user
    if (indices.length === 0) {
      console.log('⚠️ No indices found by user_id, checking for null user_id indices...');
      const { data: nullUserIdIndices, error: nullUserIdError } = await svc
        .from('index_files')
        .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at')
        .is('user_id', null)
        .order('uploaded_at', { ascending: false })
        .limit(50);

      if (nullUserIdError) {
        console.error('❌ Error checking for null user_id indices:', nullUserIdError);
      } else if (nullUserIdIndices && nullUserIdIndices.length > 0) {
        console.log(`⚠️ Found ${nullUserIdIndices.length} indices with null user_id`);
        // Return empty but with hint
        return res.status(200).json({
          success: true,
          data: [],
          user: user,
          warning: `Found ${nullUserIdIndices.length} indices with no user assignment. Use "Fix My Indices" to assign them.`
        });
      } else {
        console.log('ℹ️ No indices found in database (neither with user_id nor with null user_id)');
      }
    }

    // Do NOT filter out chunk parts here. The frontend groups parts into a single file.
    // Returning all entries ensures users still see their uploads even before merging completes.
    // If needed, grouping/merging UI logic will consolidate parts by base name and file key.

    // No error handling needed here since we're handling errors above

    // If indices query failed earlier, return success with a warning instead of 500
    if (indicesQueryError) {
      return res.status(200).json({
        success: true,
        data: indices || [],
        user: user || null,
        warning: `Could not fetch indices by user_id: ${indicesQueryError}`
      });
    }

    res.status(200).json({ success: true, data: indices || [], user: user || null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
