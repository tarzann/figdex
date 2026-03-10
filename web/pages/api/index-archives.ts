import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { archiveExistingIndex, type ArchiveableIndexRow } from '../../lib/index-archive';

type SupabaseAdminClient = ReturnType<typeof createClient<any, 'public', 'public'>>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Missing Supabase credentials',
    });
  }

  const adminClient: SupabaseAdminClient = createClient(serviceUrl, serviceKey);
  const userId = await resolveUserIdFromHeader(req.headers.authorization, adminClient);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  try {
    if (req.method === 'GET') {
      const rawProjectId = Array.isArray(req.query.projectId) ? req.query.projectId[0] : req.query.projectId;
      const rawFileKey = Array.isArray(req.query.fileKey) ? req.query.fileKey[0] : req.query.fileKey;
      const projectId = rawProjectId && rawProjectId !== 'null' ? rawProjectId : null;
      const figmaFileKey = rawFileKey && rawFileKey !== 'null' ? rawFileKey : null;

      let query = adminClient
        .from('index_archives')
        .select('id, file_name, file_size, uploaded_at, archived_at, project_id, figma_file_key')
        .eq('user_id', userId)
        .order('archived_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }

      if (figmaFileKey) {
        query = query.eq('figma_file_key', figmaFileKey);
      } else {
        query = query.is('figma_file_key', null);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Failed to fetch archives for user:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch archives' });
      }

      return res.status(200).json({
        success: true,
        archives: Array.isArray(data) ? data : [],
      });
    }

    if (req.method === 'POST') {
      const { archiveId } = req.body || {};
      if (!archiveId) {
        return res.status(400).json({ success: false, error: 'archiveId is required' });
      }

      const { data: archiveRow, error: archiveError } = await adminClient
        .from('index_archives')
        .select('*')
        .eq('id', archiveId)
        .maybeSingle();

      if (archiveError || !archiveRow) {
        return res.status(404).json({ success: false, error: 'Archive entry not found' });
      }

      if (archiveRow.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';

      const { data: currentRow } = await adminClient
        .from('index_files')
        .select('*')
        .eq('id', archiveRow.index_file_id)
        .maybeSingle();

      let currentIndex = currentRow;
      if (!currentIndex) {
        let fallback = adminClient.from('index_files').select('*').order('uploaded_at', { ascending: false });
        if (archiveRow.project_id) {
          fallback = fallback.eq('project_id', archiveRow.project_id);
        } else {
          fallback = fallback.is('project_id', null);
        }
        if (archiveRow.figma_file_key) {
          fallback = fallback.eq('figma_file_key', archiveRow.figma_file_key);
        } else {
          fallback = fallback.is('figma_file_key', null);
        }
        const { data: fallbackRows } = await fallback.limit(1);
        if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
          currentIndex = fallbackRows[0];
        }
      }

      if (currentIndex) {
        await archiveExistingIndex({
          supabaseAdmin: adminClient,
          existingIndex: currentIndex as ArchiveableIndexRow,
          storageBucket,
        });
      }

      const payload: any = {
        user_id: userId,
        project_id: archiveRow.project_id,
        figma_file_key: archiveRow.figma_file_key,
        file_name: archiveRow.file_name || currentIndex?.file_name,
        index_data: archiveRow.index_data || [],
        frame_tags: archiveRow.frame_tags,
        custom_tags: archiveRow.custom_tags,
        naming_tags: archiveRow.naming_tags,
        size_tags: archiveRow.size_tags,
        file_size: archiveRow.file_size,
        uploaded_at: new Date().toISOString(),
      };

      if (currentIndex && currentIndex.id) {
        const { error: updateError } = await adminClient
          .from('index_files')
          .update(payload)
          .eq('id', currentIndex.id);
        if (updateError) {
          throw updateError;
        }
        return res.status(200).json({ success: true, message: 'Index restored' });
      }

      const { data: inserted, error: insertError } = await adminClient
        .from('index_files')
        .insert(payload)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      await adminClient
        .from('index_files')
        .delete()
        .eq('project_id', archiveRow.project_id)
        .eq('figma_file_key', archiveRow.figma_file_key)
        .neq('id', inserted.id);

      return res.status(200).json({ success: true, message: 'Index restored' });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
    });
  } catch (error: any) {
    console.error('Index archives API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error?.message });
  }
}

async function resolveUserIdFromHeader(header: string | undefined, adminClient: SupabaseAdminClient) {
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.substring(7);
  if (token.startsWith('figdex_')) {
    const { data, error } = await adminClient.from('users').select('id').eq('api_key', token).maybeSingle();
    if (error || !data) return null;
    return data.id;
  }
  try {
    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

