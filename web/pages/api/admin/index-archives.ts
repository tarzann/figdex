import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { archiveExistingIndex, type ArchiveableIndexRow } from '../../../lib/index-archive';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const runtimeSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const runtimeSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!runtimeSupabaseUrl || !runtimeSupabaseServiceKey) {
    console.error('❌ Missing Supabase credentials for archive endpoint');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: Missing Supabase credentials',
    });
  }

  const supabase = createClient(runtimeSupabaseUrl, runtimeSupabaseServiceKey);

  if (req.method === 'GET') {
    const rawProjectId = Array.isArray(req.query.projectId)
      ? req.query.projectId[0]
      : req.query.projectId;
    const rawFileKey = Array.isArray(req.query.fileKey) ? req.query.fileKey[0] : req.query.fileKey;
    const normalizedProjectId =
      rawProjectId && rawProjectId !== 'null' && rawProjectId !== 'undefined' ? rawProjectId : null;
    const normalizedFileKey =
      rawFileKey && rawFileKey !== 'null' && rawFileKey !== 'undefined' ? rawFileKey : null;

    if (!normalizedProjectId && !normalizedFileKey) {
      return res.status(400).json({
        success: false,
        error: 'projectId or fileKey is required',
      });
    }

    let query = supabase
      .from('index_archives')
      .select(
        'id, index_file_id, file_name, file_size, uploaded_at, archived_at, project_id, figma_file_key'
      )
      .order('archived_at', { ascending: false });

    if (normalizedProjectId) {
      query = query.eq('project_id', normalizedProjectId);
    } else {
      query = query.is('project_id', null);
    }

    if (normalizedFileKey) {
      query = query.eq('figma_file_key', normalizedFileKey);
    } else {
      query = query.is('figma_file_key', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Failed to fetch archives:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch archives',
        details: error.message,
      });
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

    const { data: archiveEntry, error: fetchError } = await supabase
      .from('index_archives')
      .select('*')
      .eq('id', archiveId)
      .maybeSingle();

    if (fetchError || !archiveEntry) {
      return res.status(404).json({
        success: false,
        error: 'Archive entry not found',
        details: fetchError?.message,
      });
    }

    const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';

    const archiveRow = archiveEntry as ArchiveableIndexRow;

    const { data: currentRow, error: currentError } = await supabase
      .from('index_files')
      .select('*')
      .eq('id', archiveRow.index_file_id)
      .maybeSingle();

    let currentIndex = currentRow;
    if (!currentIndex) {
      let fallbackQuery = supabase.from('index_files').select('*').order('uploaded_at', {
        ascending: false,
      });
      if (archiveRow.project_id) {
        fallbackQuery = fallbackQuery.eq('project_id', archiveRow.project_id);
      } else {
        fallbackQuery = fallbackQuery.is('project_id', null);
      }
      if (archiveRow.figma_file_key) {
        fallbackQuery = fallbackQuery.eq('figma_file_key', archiveRow.figma_file_key);
      } else {
        fallbackQuery = fallbackQuery.is('figma_file_key', null);
      }
      const { data: fallbackRows } = await fallbackQuery.limit(1);
      if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
        currentIndex = fallbackRows[0];
      }
    }

    if (currentIndex) {
      await archiveExistingIndex({
        supabaseAdmin: supabase,
        existingIndex: currentIndex as ArchiveableIndexRow,
        storageBucket,
      });
    }

    const payload: any = {
      file_name: archiveRow.file_name || currentIndex?.file_name,
      index_data: archiveRow.index_data || [],
      frame_tags: archiveRow.frame_tags,
      custom_tags: archiveRow.custom_tags,
      naming_tags: archiveRow.naming_tags,
      size_tags: archiveRow.size_tags,
      file_size: archiveRow.file_size,
      uploaded_at: new Date().toISOString(),
    };

    try {
      if (currentIndex && currentIndex.id) {
        await supabase.from('index_files').update(payload).eq('id', currentIndex.id);
        return res.status(200).json({ success: true, message: 'Index restored' });
      }
      const { error: insertError } = await supabase.from('index_files').insert({
        user_id: archiveRow.user_id,
        project_id: archiveRow.project_id,
        figma_file_key: archiveRow.figma_file_key,
        ...payload,
      });
      if (insertError) {
        throw insertError;
      }
      return res.status(200).json({ success: true, message: 'Index restored' });
    } catch (error: any) {
      console.error('❌ Failed to restore archive:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to restore archive',
        details: error?.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
  });
}

export default handler;

