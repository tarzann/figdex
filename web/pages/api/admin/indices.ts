import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Environment variables - will be checked at runtime

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check environment variables at runtime
  const runtimeSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const runtimeSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!runtimeSupabaseUrl || !runtimeSupabaseServiceKey) {
    console.error('❌ Missing Supabase credentials:', {
      hasUrl: !!runtimeSupabaseUrl,
      hasServiceKey: !!runtimeSupabaseServiceKey
    });
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Missing Supabase credentials',
      details: 'Please check environment variables in Vercel dashboard'
    });
  }

  const supabase = createClient(runtimeSupabaseUrl, runtimeSupabaseServiceKey);

  try {
    switch (req.method) {
      case 'GET':
        // List all indices with user info
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;
        const userId = req.query.userId as string;

        console.log('📊 Fetching indices:', { page, limit, offset, search, userId });

        // Fetch indices without index_data to avoid timeouts
        // Note: created_at might not exist, so we'll use uploaded_at as fallback
        let query = supabase
          .from('index_files')
          .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at, file_size, frame_count', { count: 'exact' });

        // Apply search filter
        if (search && search.trim()) {
          query = query.or(`file_name.ilike.%${search}%,project_id.ilike.%${search}%`);
        }

        // Filter by user
        if (userId && userId.trim()) {
          query = query.eq('user_id', userId);
        }

        // Apply pagination
        let { data: indices, error, count } = await query
          .order('uploaded_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // If optional metadata columns do not exist yet, retry without them
        if (error && error.message && /(file_size|frame_count)/i.test(error.message)) {
          console.warn('⚠️ file_size/frame_count column does not exist, retrying without optional metadata');
          query = supabase
            .from('index_files')
            .select('id, user_id, project_id, figma_file_key, file_name, uploaded_at', { count: 'exact' });
          
          if (search && search.trim()) {
            query = query.or(`file_name.ilike.%${search}%,project_id.ilike.%${search}%`);
          }
          
          if (userId && userId.trim()) {
            query = query.eq('user_id', userId);
          }
          
          const retryResult = await query
            .order('uploaded_at', { ascending: false })
            .range(offset, offset + limit - 1);
          
          indices = retryResult.data;
          error = retryResult.error;
          count = retryResult.count;
        }

        if (error) {
          console.error('❌ Error fetching indices from database:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch indices',
            details: error.message,
            code: error.code
          });
        }

        console.log(`✅ Found ${indices?.length || 0} indices (total: ${count || 0})`);

        // Fetch user emails separately to avoid relation query issues
        const userIds = [...new Set((indices || []).map((idx: any) => idx.user_id).filter(Boolean))];
        const userEmailMap = new Map<string, string>();
        
        if (userIds.length > 0) {
          try {
            console.log(`👥 Fetching ${userIds.length} user emails...`);
            const { data: users, error: usersError } = await supabase
              .from('users')
              .select('id, email, full_name')
              .in('id', userIds);
            
            if (usersError) {
              console.warn('⚠️ Error fetching user emails:', usersError);
            } else if (users) {
              users.forEach((user: any) => {
                if (user.id && user.email) {
                  userEmailMap.set(user.id, user.email);
                }
              });
              console.log(`✅ Mapped ${userEmailMap.size} user emails`);
            }
          } catch (usersErr) {
            console.warn('⚠️ Error in user email lookup:', usersErr);
          }
        }

        // Filter out any null/undefined indices
        const validIndices = (indices || []).filter((idx: any) => idx && idx.id);
        
        if (validIndices.length !== (indices || []).length) {
          console.warn(`⚠️ Filtered out ${(indices || []).length - validIndices.length} invalid indices`);
        }

        // Compute fallback sizes and frames for entries without accurate stats (limited to current page)
        const needStatsIds = (indices || [])
          .filter((idx: any) => {
            const hasFileSize = typeof idx.file_size === 'number' && idx.file_size > 1024;
            const hasFrameCount = typeof idx.frame_count === 'number';
            return !hasFileSize || !hasFrameCount;
          })
          .map((idx: any) => idx.id)
          .filter(Boolean);
        const idToSize = new Map<string, number>();
        const idToFrames = new Map<string, number>();
        if (needStatsIds.length > 0) {
          try {
            const { data: rows, error: rowsErr } = await supabase
              .from('index_files')
              .select('id, index_data')
              .in('id', needStatsIds);
            if (!rowsErr && Array.isArray(rows)) {
              const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
              const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
              const admin = (serviceUrl && serviceKey) ? createClient(serviceUrl, serviceKey) : null;
              for (const row of rows) {
                try {
                  let json: any = null;
                  if (row.index_data && typeof row.index_data === 'object' && row.index_data.storageRef && admin) {
                    const [bucket, ...pathParts] = String(row.index_data.storageRef).split(':');
                    const path = pathParts.join(':');
                    const dl = await (admin as any).storage.from(bucket).download(path);
                    if (dl?.error) continue;
                    const txt = await dl.data.text();
                    json = JSON.parse(txt || '[]');
                  } else if (Array.isArray(row.index_data)) {
                    json = row.index_data;
                  } else if (typeof row.index_data === 'string') {
                    try { json = JSON.parse(row.index_data); } catch { json = null; }
                  }
                  if (json) {
                    const bytes = Buffer.byteLength(JSON.stringify(json), 'utf8');
                    idToSize.set(row.id, bytes);
                    const frames = Array.isArray(json)
                      ? json.reduce((sum: number, item: any) => sum + (Array.isArray(item?.frames) ? item.frames.length : 0), 0)
                      : 0;
                    idToFrames.set(row.id, frames);
                  }
                } catch {}
              }
            }
          } catch (e) {
            console.warn('⚠️ Could not compute fallback stats for admin indices:', e);
          }
        }

        // Ensure frames_count is computed for all items (not only those with missing size)
        const idsMissingFrames = (indices || [])
          .map((idx: any) => idx.id)
          .filter(Boolean)
          .filter((id: string) => !idToFrames.has(id));
        if (idsMissingFrames.length > 0) {
          try {
            const { data: rows2, error: rowsErr2 } = await supabase
              .from('index_files')
              .select('id, index_data')
              .in('id', idsMissingFrames);
            if (!rowsErr2 && Array.isArray(rows2)) {
              const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
              const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
              const admin = (serviceUrl && serviceKey) ? createClient(serviceUrl, serviceKey) : null;
              for (const row of rows2) {
                try {
                  let json: any = null;
                  if (row.index_data && typeof row.index_data === 'object' && row.index_data.storageRef && admin) {
                    const [bucket, ...pathParts] = String(row.index_data.storageRef).split(':');
                    const path = pathParts.join(':');
                    const dl = await (admin as any).storage.from(bucket).download(path);
                    if (dl?.error) continue;
                    const txt = await dl.data.text();
                    json = JSON.parse(txt || '[]');
                  } else if (Array.isArray(row.index_data)) {
                    json = row.index_data;
                  } else if (typeof row.index_data === 'string') {
                    try { json = JSON.parse(row.index_data); } catch { json = null; }
                  }
                  if (json) {
                    const frames = Array.isArray(json)
                      ? json.reduce((sum: number, item: any) => sum + (Array.isArray(item?.frames) ? item.frames.length : 0), 0)
                      : 0;
                    idToFrames.set(row.id, frames);
                    if (!idToSize.has(row.id)) {
                      const bytes = Buffer.byteLength(JSON.stringify(json), 'utf8');
                      idToSize.set(row.id, bytes);
                    }
                  }
                } catch {}
              }
            }
          } catch {}
        }

        // Check which indices were created via API (have index_jobs entry)
        const indexIds = validIndices.map((idx: any) => idx.id).filter(Boolean);
        const apiIndexIds = new Set<string>();
        if (indexIds.length > 0) {
          try {
            const { data: jobs, error: jobsError } = await supabase
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

        // Transform indices to include calculated fields and user email
        const transformed = validIndices
          .filter((idx: any) => {
            if (!idx.id) {
              console.warn('⚠️ Filtering out index with missing id:', idx);
              return false;
            }
            return true;
          })
          .map((idx: any) => {
            // Get user email from the map we created
            const userEmail = idx.user_id ? (userEmailMap.get(idx.user_id) || null) : null;

            return {
              id: idx.id,
              user_id: idx.user_id,
              user_email: userEmail,
              file_name: idx.file_name || 'Untitled',
              file_size: (typeof idx.file_size === 'number' && idx.file_size > 0) ? idx.file_size : (idToSize.get(idx.id) || 0),
              frame_count: typeof idx.frame_count === 'number' ? idx.frame_count : (idToFrames.get(idx.id) || null),
              created_at: idx.uploaded_at || new Date().toISOString(), // Use uploaded_at as created_at
              uploaded_at: idx.uploaded_at,
              figma_file_key: idx.figma_file_key,
              project_id: idx.project_id,
              source: apiIndexIds.has(idx.id) ? 'API' : 'Plugin' // Indicate if created via API or Plugin
            };
          });

        // Group parts (Part X/Y) into single logical entry for admin view
        const groupedMap = new Map<string, any>();
        for (const item of transformed) {
          const match = item.file_name.match(/^(.*)\s+\(Part\s+\d+\/\d+\)$/i);
          const baseName = match ? match[1].trim() : null;
          if (!baseName) {
            const key = `single::${item.id}`;
            groupedMap.set(key, {
              id: item.id,
              grouped_ids: [item.id],
              user_id: item.user_id,
              user_email: item.user_email,
              file_name: item.file_name,
              file_size: item.file_size,
              frame_count: item.frame_count || 0,
              created_at: item.created_at,
              uploaded_at: item.uploaded_at,
              figma_file_key: item.figma_file_key,
              project_id: item.project_id,
              source: item.source || 'Plugin' // Preserve source info
            });
          } else {
            const key = `group::${item.user_id || 'u'}::${item.figma_file_key || 'k'}::${baseName}`;
            if (!groupedMap.has(key)) {
              groupedMap.set(key, {
                id: item.id,
                grouped_ids: [item.id],
                user_id: item.user_id,
                user_email: item.user_email,
                file_name: baseName,
                file_size: item.file_size,
                frame_count: item.frame_count || 0,
                created_at: item.created_at,
                uploaded_at: item.uploaded_at,
                figma_file_key: item.figma_file_key,
                project_id: item.project_id,
                source: item.source || 'Plugin' // Preserve source info
              });
            } else {
              const acc = groupedMap.get(key);
              acc.grouped_ids.push(item.id);
              // Keep most recent date
              acc.created_at = new Date(acc.created_at) > new Date(item.created_at) ? acc.created_at : item.created_at;
              acc.uploaded_at = new Date(acc.uploaded_at) > new Date(item.uploaded_at) ? acc.uploaded_at : item.uploaded_at;
              acc.frame_count = (acc.frame_count || 0) + (item.frame_count || 0);
              acc.file_size = Math.max(acc.file_size || 0, item.file_size || 0);
              // If any part is from API, mark the whole group as API
              if (item.source === 'API') {
                acc.source = 'API';
              }
            }
          }
        }
        const transformedIndices = Array.from(groupedMap.values());

        console.log(`✅ Returning ${transformedIndices.length} transformed indices`);

        return res.status(200).json({
          success: true,
          indices: transformedIndices,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
          }
        });

      case 'DELETE':
        // Delete index (for bulk delete, pass array of IDs in body)
        const { ids } = req.body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request body. Expected array of IDs'
          });
        }

        const { error: deleteError } = await supabase
          .from('index_files')
          .delete()
          .in('id', ids);
        
        if (deleteError) {
          return res.status(500).json({
            success: false,
            error: 'Failed to delete indices',
            details: deleteError.message
          });
        }

        return res.status(200).json({
          success: true,
          message: `Deleted ${ids.length} indices`,
          deletedCount: ids.length
        });

      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed',
          allowedMethods: ['GET', 'DELETE']
        });
    }
  } catch (error) {
    console.error('❌ Indices API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}

export default handler;
