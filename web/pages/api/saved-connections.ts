import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromApiKey } from '../../lib/api-auth';
import { createClient } from '@supabase/supabase-js';
import { getFileThumbnailUrl } from '../../lib/figma-api';
import { getUserEffectiveLimits, getCurrentFileCount } from '../../lib/subscription-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Get user ID from API key
  const userId = await getUserIdFromApiKey(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please provide a valid API key.' });
  }

  try {
    // GET - Get all saved connections for user
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('saved_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved connections:', error);
        return res.status(500).json({ error: 'Failed to fetch saved connections' });
      }

      // Transform to match frontend interface
      const connections = (data || []).map((conn: any) => {
        const transformed = {
          id: conn.id,
          fileKey: conn.file_key,
          fileName: conn.file_name,
          figmaToken: conn.figma_token,
          pages: conn.pages || [],
          imageQuality: conn.image_quality,
          pageMeta: conn.page_meta || null, // Include page metadata if available
          fileThumbnailUrl: conn.file_thumbnail_url || null, // Include file thumbnail URL
        };
        // Debug logging
        if (transformed.fileThumbnailUrl) {
          console.log(`[saved-connections GET] Connection "${transformed.fileName}" has thumbnail:`, transformed.fileThumbnailUrl.substring(0, 60) + '...');
        } else {
          console.log(`[saved-connections GET] Connection "${transformed.fileName}" has NO thumbnail (DB value: ${conn.file_thumbnail_url})`);
        }
        return transformed;
      });

      return res.status(200).json({ success: true, connections });
    }

    // POST - Save a new connection
    if (req.method === 'POST') {
      const { fileKey, fileName, figmaToken, pages, imageQuality, pageMeta } = req.body;

      if (!fileKey || !fileName || !figmaToken) {
        return res.status(400).json({ error: 'fileKey, fileName, and figmaToken are required' });
      }

      // Check if connection already exists (update vs new)
      const { data: existingConnection } = await supabaseAdmin
        .from('saved_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('file_key', fileKey)
        .maybeSingle();

      const isUpdate = !!existingConnection;

      // Only check file limit for new connections (not updates)
      if (!isUpdate) {
        // Get user info to check plan
        let userQuery: any = await supabaseAdmin
          .from('users')
          .select('plan, is_admin, bypass_indexing_limits')
          .eq('id', userId)
          .single();
        if (userQuery.error && String(userQuery.error.message || '').includes('bypass_indexing_limits')) {
          userQuery = await supabaseAdmin
            .from('users')
            .select('plan, is_admin')
            .eq('id', userId)
            .single();
        }
        const { data: user } = userQuery;

        // Skip check for unlimited users/admins
        if (user && user.plan !== 'unlimited' && !user.is_admin && !(user as any).bypass_indexing_limits) {
          // Get effective limits (plan + addons)
          const limits = await getUserEffectiveLimits(
            supabaseAdmin,
            userId,
            user.plan,
            user.is_admin
          );

          // Get current file count
          const currentFiles = await getCurrentFileCount(supabaseAdmin, userId);

          // Check if limit reached
          if (limits.maxFiles !== null && currentFiles >= limits.maxFiles) {
            return res.status(400).json({
              error: `File limit reached (${limits.maxFiles} files). You have ${currentFiles} files. Please purchase an add-on to add more files or upgrade your plan.`,
              code: 'FILE_LIMIT_REACHED',
              current: currentFiles,
              max: limits.maxFiles,
              upgradeUrl: 'https://www.figdex.com/pricing'
            });
          }
        }
      }

      // Get file thumbnail URL (from first frame of first page)
      let fileThumbnailUrl: string | null = null;
      try {
        console.log(`[saved-connections] Fetching thumbnail for file ${fileKey}...`);
        fileThumbnailUrl = await getFileThumbnailUrl(fileKey, figmaToken, 0.5);
        if (fileThumbnailUrl) {
          console.log(`[saved-connections] ✅ Thumbnail fetched: ${fileThumbnailUrl.substring(0, 60)}...`);
        } else {
          console.log(`[saved-connections] ⚠️ No thumbnail found (no frames in file)`);
        }
      } catch (error: any) {
        console.error(`[saved-connections] Error fetching thumbnail:`, error.message);
        // Continue without thumbnail - not critical
      }

      const { data, error } = await supabase
        .from('saved_connections')
        .insert([
          {
            user_id: userId,
            file_key: fileKey,
            file_name: fileName,
            figma_token: figmaToken,
            pages: pages || [],
            image_quality: imageQuality || 'med',
            page_meta: pageMeta || null, // Store page metadata (JSONB)
            file_thumbnail_url: fileThumbnailUrl, // Store file thumbnail URL
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving connection:', error);
        // If page_meta or file_thumbnail_url column doesn't exist, try without them
        if (error.message && (error.message.includes('page_meta') || error.message.includes('file_thumbnail_url'))) {
          const { data: retryData, error: retryError } = await supabase
            .from('saved_connections')
            .insert([
              {
                user_id: userId,
                file_key: fileKey,
                file_name: fileName,
                figma_token: figmaToken,
                pages: pages || [],
                image_quality: imageQuality || 'med',
                // Try to include thumbnail if column exists
                ...(fileThumbnailUrl ? { file_thumbnail_url: fileThumbnailUrl } : {}),
              },
            ])
            .select()
            .single();
          
          if (retryError) {
            console.error('Error saving connection (retry):', retryError);
            // Last resort - try without thumbnail
            if (retryError.message && retryError.message.includes('file_thumbnail_url')) {
              const { data: finalData, error: finalError } = await supabase
                .from('saved_connections')
                .insert([
                  {
                    user_id: userId,
                    file_key: fileKey,
                    file_name: fileName,
                    figma_token: figmaToken,
                    pages: pages || [],
                    image_quality: imageQuality || 'med',
                  },
                ])
                .select()
                .single();
              
              if (finalError) {
                console.error('Error saving connection (final retry):', finalError);
                return res.status(500).json({ error: 'Failed to save connection' });
              }
              
              return res.status(200).json({
                success: true,
                connection: {
                  id: finalData.id,
                  fileKey: finalData.file_key,
                  fileName: finalData.file_name,
                  figmaToken: finalData.figma_token,
                  pages: finalData.pages || [],
                  imageQuality: finalData.image_quality,
                  pageMeta: null,
                  fileThumbnailUrl: null,
                },
              });
            }
            return res.status(500).json({ error: 'Failed to save connection' });
          }
          
          return res.status(200).json({
            success: true,
            connection: {
              id: retryData.id,
              fileKey: retryData.file_key,
              fileName: retryData.file_name,
              figmaToken: retryData.figma_token,
              pages: retryData.pages || [],
              imageQuality: retryData.image_quality,
              pageMeta: null,
              fileThumbnailUrl: retryData.file_thumbnail_url || null,
            },
          });
        }
        return res.status(500).json({ error: 'Failed to save connection' });
      }

      // Transform to match frontend interface
      const connection = {
        id: data.id,
        fileKey: data.file_key,
        fileName: data.file_name,
        figmaToken: data.figma_token,
        pages: data.pages || [],
        imageQuality: data.image_quality,
        pageMeta: data.page_meta || null,
        fileThumbnailUrl: data.file_thumbnail_url || null,
      };

      return res.status(200).json({ success: true, connection });
    }

    // PATCH - Update thumbnail for a connection (or all connections)
    if (req.method === 'PATCH') {
      const { id, updateThumbnails } = req.body;

      // If updateThumbnails is true, update thumbnails for all connections without thumbnails
      if (updateThumbnails === true) {
        // Get all connections without thumbnails
        const { data: connections, error: fetchError } = await supabase
          .from('saved_connections')
          .select('id, file_key, figma_token')
          .eq('user_id', userId)
          .is('file_thumbnail_url', null);

        if (fetchError) {
          console.error('Error fetching connections:', fetchError);
          return res.status(500).json({ error: 'Failed to fetch connections' });
        }

        const results = [];
        for (const conn of connections || []) {
          try {
            console.log(`[saved-connections PATCH] Fetching thumbnail for connection ${conn.id}, file_key: ${conn.file_key}`);
            const thumbnailUrl = await getFileThumbnailUrl(conn.file_key, conn.figma_token, 0.5);
            console.log(`[saved-connections PATCH] Thumbnail URL for ${conn.id}:`, thumbnailUrl ? `${thumbnailUrl.substring(0, 60)}...` : 'null');
            
            if (thumbnailUrl) {
              const { error: updateError } = await supabase
                .from('saved_connections')
                .update({ file_thumbnail_url: thumbnailUrl })
                .eq('id', conn.id)
                .eq('user_id', userId);
              
              if (!updateError) {
                console.log(`[saved-connections PATCH] ✅ Successfully updated thumbnail for connection ${conn.id}`);
                results.push({ id: conn.id, success: true });
              } else {
                console.error(`[saved-connections PATCH] ❌ Error updating thumbnail for ${conn.id}:`, updateError);
                results.push({ id: conn.id, success: false, error: updateError.message });
              }
            } else {
              console.log(`[saved-connections PATCH] ⚠️ No thumbnail URL returned for connection ${conn.id}`);
              results.push({ id: conn.id, success: false, error: 'No thumbnail found' });
            }
          } catch (error: any) {
            console.error(`[saved-connections PATCH] ❌ Exception updating thumbnail for ${conn.id}:`, error);
            results.push({ id: conn.id, success: false, error: error.message });
          }
        }

        console.log(`[saved-connections PATCH] Update complete. Results:`, results);
        return res.status(200).json({ success: true, results });
      }

      // Update thumbnail for specific connection
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Connection ID is required' });
      }

      // Verify the connection belongs to the user and get file_key and token
      const { data: existing, error: checkError } = await supabase
        .from('saved_connections')
        .select('id, file_key, figma_token')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Get thumbnail
      try {
        const thumbnailUrl = await getFileThumbnailUrl(existing.file_key, existing.figma_token, 0.5);
        if (thumbnailUrl) {
          const { error: updateError } = await supabase
            .from('saved_connections')
            .update({ file_thumbnail_url: thumbnailUrl })
            .eq('id', id)
            .eq('user_id', userId);

          if (updateError) {
            return res.status(500).json({ error: 'Failed to update thumbnail' });
          }

          return res.status(200).json({ success: true, thumbnailUrl });
        } else {
          return res.status(404).json({ error: 'No thumbnail found (no frames in file)' });
        }
      } catch (error: any) {
        return res.status(500).json({ error: `Failed to fetch thumbnail: ${error.message}` });
      }
    }

    // PUT - Update an existing connection
    if (req.method === 'PUT') {
      const { id, pages, pageMeta } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Connection ID is required' });
      }

      // Verify the connection belongs to the user
      const { data: existing, error: checkError } = await supabase
        .from('saved_connections')
        .select('id, pages')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Build update object - merge pages if provided
      const updateData: any = {};
      if (pages !== undefined) {
        // Merge new pages with existing ones (avoid duplicates)
        const existingPages = existing.pages || [];
        const newPages = Array.isArray(pages) ? pages : [];
        const mergedPages = Array.from(new Set([...existingPages, ...newPages]));
        updateData.pages = mergedPages;
      }
      if (pageMeta !== undefined) {
        updateData.page_meta = pageMeta;
      }

      const { data, error } = await supabase
        .from('saved_connections')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating connection:', error);
        return res.status(500).json({ error: 'Failed to update connection' });
      }

      // Transform to match frontend interface
      const connection = {
        id: data.id,
        fileKey: data.file_key,
        fileName: data.file_name,
        figmaToken: data.figma_token,
        pages: data.pages || [],
        imageQuality: data.image_quality,
        pageMeta: data.page_meta || null,
        fileThumbnailUrl: data.file_thumbnail_url || null,
      };

      return res.status(200).json({ success: true, connection });
    }

    // DELETE - Delete a connection
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Connection ID is required' });
      }

      // Verify the connection belongs to the user
      const { data: existing, error: checkError } = await supabase
        .from('saved_connections')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      const { error } = await supabase
        .from('saved_connections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting connection:', error);
        return res.status(500).json({ error: 'Failed to delete connection' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
