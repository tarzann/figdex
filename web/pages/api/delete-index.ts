import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logIndexActivity } from '../../lib/index-activity-log';

function getLogicalFileId(projectId?: string | null, fileKey?: string | null): string {
  const normalizedFileKey = typeof fileKey === 'string' ? fileKey.trim() : '';
  const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : '';
  const stableProjectId = normalizedProjectId && normalizedProjectId !== '0:0' ? normalizedProjectId : '';
  return normalizedFileKey || stableProjectId || '';
}

function getChunkGroup(projectId?: string | null, fileName?: string | null) {
  const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : '';
  const normalizedFileName = typeof fileName === 'string' ? fileName.trim() : '';
  const baseProjectId = normalizedProjectId.replace(/-chunk\d+$/i, '');
  const fileMatch = normalizedFileName.match(/^(.*)\s+\(Part\s+\d+\/\d+\)$/i);
  const baseFileName = fileMatch ? fileMatch[1].trim() : normalizedFileName;
  const isChunk = Boolean(
    normalizedProjectId &&
    baseProjectId &&
    baseProjectId !== normalizedProjectId &&
    /-chunk\d+$/i.test(normalizedProjectId)
  ) || Boolean(fileMatch);

  return {
    isChunk,
    baseProjectId: baseProjectId || normalizedProjectId,
    baseFileName,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['DELETE']
    });
  }

  try {
    const {
      indexId,
      figmaFileKey: providedFileKey,
      projectId: providedProjectId,
      fileName: providedFileName,
      legacyIndexId: providedLegacyIndexId,
      normalizedIndexId: providedNormalizedIndexId,
    } = req.body || {};
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization header missing or invalid' });
    }

    const apiKey = authHeader.substring(7);

    if (!indexId) {
      return res.status(400).json({ success: false, error: 'indexId is required' });
    }

    // Use service role to bypass RLS (anon client cannot read users table with RLS)
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Verify user by API key
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    // Try legacy row first
    const { data: legacyIndexFile, error: legacyIndexError } = await supabaseAdmin
      .from('index_files')
      .select('id, user_id, file_name, figma_file_key, project_id, frame_count')
      .in('id', [indexId, providedLegacyIndexId].filter(Boolean))
      .eq('user_id', user.id)
      .maybeSingle();

    // Then try normalized row
    const { data: normalizedIndexFile, error: normalizedIndexError } = await supabaseAdmin
      .from('indexed_files')
      .select('id, user_id, file_name, figma_file_key, project_id, total_frames')
      .in('id', [indexId, providedNormalizedIndexId].filter(Boolean))
      .eq('user_id', user.id)
      .maybeSingle();

    const legacyIndex = legacyIndexFile || null;
    const normalizedIndex = normalizedIndexFile || null;

    if ((legacyIndexError && !legacyIndex) || (normalizedIndexError && !normalizedIndex)) {
      console.warn('[delete-index] lookup warnings', {
        legacy: legacyIndexError?.message || null,
        normalized: normalizedIndexError?.message || null,
        indexId,
        userId: user.id,
      });
    }

    if (!legacyIndex && !normalizedIndex) {
      return res.status(404).json({
        success: false,
        error: 'Index not found or you do not have permission to delete it'
      });
    }

    const referenceIndex = normalizedIndex || legacyIndex;
    const figmaFileKey = referenceIndex?.figma_file_key || providedFileKey || null;
    const projectId = referenceIndex?.project_id || providedProjectId || null;
    const fileName = referenceIndex?.file_name || providedFileName || null;
    const logicalFileId = getLogicalFileId(projectId, figmaFileKey);
    const chunkGroup = getChunkGroup(projectId, fileName);
    const deletedIds = new Set<string>();
    let deletedNormalizedCount = 0;
    let deletedLegacyCount = 0;

    if (logicalFileId) {
      let legacyDeleteQuery = supabaseAdmin
        .from('index_files')
        .delete()
        .eq('user_id', user.id);

      if (chunkGroup.isChunk && chunkGroup.baseProjectId) {
        legacyDeleteQuery = legacyDeleteQuery.ilike('project_id', `${chunkGroup.baseProjectId}-chunk%`);
      } else if (figmaFileKey) {
        legacyDeleteQuery = legacyDeleteQuery.eq('figma_file_key', figmaFileKey);
      } else if (projectId) {
        legacyDeleteQuery = legacyDeleteQuery.eq('project_id', projectId);
      }

      const { data: deletedLegacyRows, error: deleteLegacyError } = await legacyDeleteQuery.select('id');
      if (deleteLegacyError) {
        console.error('Error deleting legacy index rows:', deleteLegacyError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete legacy index rows',
          details: deleteLegacyError.message
        });
      }
      (deletedLegacyRows || []).forEach((row: any) => {
        if (row?.id) deletedIds.add(String(row.id));
      });
      deletedLegacyCount += Array.isArray(deletedLegacyRows) ? deletedLegacyRows.length : 0;

      let normalizedDeleteQuery = supabaseAdmin
        .from('indexed_files')
        .delete()
        .eq('user_id', user.id);

      if (chunkGroup.isChunk && chunkGroup.baseProjectId) {
        normalizedDeleteQuery = normalizedDeleteQuery.ilike('project_id', `${chunkGroup.baseProjectId}-chunk%`);
      } else if (figmaFileKey) {
        normalizedDeleteQuery = normalizedDeleteQuery.eq('figma_file_key', figmaFileKey);
      } else if (projectId) {
        normalizedDeleteQuery = normalizedDeleteQuery.eq('project_id', projectId);
      }

      const { data: deletedNormalizedRows, error: deleteNormalizedError } = await normalizedDeleteQuery.select('id');
      if (deleteNormalizedError) {
        console.error('Error deleting normalized index rows:', deleteNormalizedError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete normalized index rows',
          details: deleteNormalizedError.message
        });
      }
      (deletedNormalizedRows || []).forEach((row: any) => {
        if (row?.id) deletedIds.add(String(row.id));
      });
      deletedNormalizedCount += Array.isArray(deletedNormalizedRows) ? deletedNormalizedRows.length : 0;

      let jobsDeleteQuery = supabaseAdmin
        .from('index_jobs')
        .delete()
        .eq('user_id', user.id);

      if (chunkGroup.isChunk && chunkGroup.baseProjectId) {
        jobsDeleteQuery = jobsDeleteQuery.ilike('project_id', `${chunkGroup.baseProjectId}-chunk%`);
      } else if (figmaFileKey) {
        jobsDeleteQuery = jobsDeleteQuery.eq('file_key', figmaFileKey);
      } else if (projectId) {
        jobsDeleteQuery = jobsDeleteQuery.eq('project_id', projectId);
      }

      const { error: deleteJobsError } = await jobsDeleteQuery;
      if (deleteJobsError) {
        console.warn('Warning deleting related index jobs:', deleteJobsError.message);
      }
    } else {
      if (legacyIndex?.id) {
        const { error: deleteLegacyError } = await supabaseAdmin
          .from('index_files')
          .delete()
          .eq('id', legacyIndex.id)
          .eq('user_id', user.id);
        if (deleteLegacyError) {
          console.error('Error deleting legacy index:', deleteLegacyError);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete legacy index',
            details: deleteLegacyError.message
          });
        }
        deletedIds.add(String(legacyIndex.id));
        deletedLegacyCount += 1;
      }

      if (normalizedIndex?.id) {
        const { error: deleteNormalizedError } = await supabaseAdmin
          .from('indexed_files')
          .delete()
          .eq('id', normalizedIndex.id)
          .eq('user_id', user.id);
        if (deleteNormalizedError) {
          console.error('Error deleting normalized index:', deleteNormalizedError);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete normalized index',
            details: deleteNormalizedError.message
          });
        }
        deletedIds.add(String(normalizedIndex.id));
        deletedNormalizedCount += 1;
      }
    }

    if ((deletedNormalizedCount > 0 || deletedLegacyCount > 0) && figmaFileKey) {
      const { error: resetSavedConnectionError } = await supabaseAdmin
        .from('saved_connections')
        .update({
          page_meta: [],
          file_thumbnail_url: null,
        })
        .eq('user_id', user.id)
        .eq('file_key', figmaFileKey);

      if (resetSavedConnectionError) {
        console.warn('[delete-index] failed to reset saved connection metadata', {
          userId: user.id,
          fileKey: figmaFileKey,
          message: resetSavedConnectionError.message,
        });
      }
    }

    await logIndexActivity(supabaseAdmin, {
      requestId: `delete_index_${indexId}`,
      source: 'system',
      eventType: 'index_deleted',
      status: 'completed',
      userId: user.id,
      userEmail: user.email || null,
      fileKey: figmaFileKey,
      fileName: referenceIndex?.file_name || null,
      logicalFileId: logicalFileId || null,
      frameCount:
        typeof legacyIndex?.frame_count === 'number'
          ? legacyIndex.frame_count
          : typeof normalizedIndex?.total_frames === 'number'
            ? normalizedIndex.total_frames
            : null,
      message: 'Index deleted by user',
      metadata: {
        deletedIndexId: indexId,
        deletedIds: Array.from(deletedIds),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Index deleted successfully',
      deletedIndex: {
        id: indexId,
        file_name: referenceIndex?.file_name || null
      }
    });

  } catch (error) {
    console.error('Error in delete-index:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
