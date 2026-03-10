import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userEmail, fileKey } = req.body;

    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'userEmail is required'
      });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can merge chunks'
      });
    }

    // Find all chunks grouped by fileKey
    let query = supabase
      .from('index_files')
      .select('id, user_id, file_name, index_data, project_id, uploaded_at, figma_file_key, frame_tags, custom_tags, naming_tags, size_tags')
      .ilike('file_name', '%(Part %/%)%');

    // If fileKey is provided, filter by it
    if (fileKey && typeof fileKey === 'string') {
      query = query.eq('figma_file_key', fileKey);
    }

    // Only merge chunks for this user
    query = query.eq('user_id', user.id);

    const { data: allChunks, error: chunksError } = await query;

    if (chunksError || !allChunks || allChunks.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No chunks found to merge',
        mergedCount: 0
      });
    }

    // Group chunks by fileKey
    const chunksByFileKey = new Map<string, any[]>();
    for (const chunk of allChunks) {
      const key = chunk.figma_file_key || 'unknown';
      if (!chunksByFileKey.has(key)) {
        chunksByFileKey.set(key, []);
      }
      chunksByFileKey.get(key)!.push(chunk);
    }

    let totalMerged = 0;
    const mergedResults: Array<{ fileKey: string; fileName: string; mergedCount: number }> = [];

    // Merge chunks for each fileKey
    for (const [fileKey, chunks] of chunksByFileKey.entries()) {
      // Parse chunk numbers
      const chunkInfo = chunks.map((chunk: any) => {
        const match = chunk.file_name.match(/\(Part (\d+)\/(\d+)\)/);
        if (match) {
          return {
            chunk: chunk,
            partNumber: parseInt(match[1]),
            totalParts: parseInt(match[2])
          };
        }
        return null;
      }).filter(Boolean) as Array<{ chunk: any; partNumber: number; totalParts: number }>;

      if (chunkInfo.length === 0) continue;

      // Sort by part number
      chunkInfo.sort((a, b) => a.partNumber - b.partNumber);

      // Get expected total
      const expectedTotal = Math.max(...chunkInfo.map(c => c.totalParts));
      const foundParts = new Set(chunkInfo.map(c => c.partNumber));
      const allPartsPresent = Array.from({ length: expectedTotal }, (_, i) => i + 1).every(part => foundParts.has(part));

      if (!allPartsPresent) {
        console.log(`⚠️ File ${fileKey}: Not all chunks present (${chunkInfo.length}/${expectedTotal}), skipping`);
        continue;
      }

      // Merge pages
      const mergedPages: any[] = [];
      for (const { chunk } of chunkInfo) {
        if (chunk.index_data && Array.isArray(chunk.index_data)) {
          mergedPages.push(...chunk.index_data);
        }
      }

      // Get base file name
      const baseFileName = chunkInfo[0].chunk.file_name.replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim();
      const baseDocumentId = chunkInfo[0].chunk.project_id?.replace(/-chunk\d+$/, '') || chunkInfo[0].chunk.project_id;

      // Get tags from first chunk
      const firstChunk = chunks.find((c: any) => c.file_name.includes('(Part 1/'));
      const frameTags = firstChunk?.frame_tags || [];
      const customTags = firstChunk?.custom_tags || [];
      const namingTags = firstChunk?.naming_tags || [];
      const sizeTags = firstChunk?.size_tags || [];

      // Create merged index
      const mergedIndex = {
        user_id: user.id,
        project_id: baseDocumentId,
        figma_file_key: fileKey,
        file_name: baseFileName,
        index_data: mergedPages,
        uploaded_at: new Date().toISOString(),
        frame_tags: frameTags,
        custom_tags: customTags,
        naming_tags: namingTags,
        size_tags: sizeTags
      };

      // Insert merged index
      const { data: mergedData, error: mergeError } = await supabase
        .from('index_files')
        .insert(mergedIndex)
        .select()
        .single();

      if (mergeError) {
        console.error(`❌ Error merging chunks for ${fileKey}:`, mergeError);
        continue;
      }

      // Delete all chunks
      const chunkIds = chunks.map((c: any) => c.id);
      const { error: deleteError } = await supabase
        .from('index_files')
        .delete()
        .in('id', chunkIds);

      if (deleteError) {
        console.error(`⚠️ Error deleting chunks for ${fileKey}:`, deleteError);
      }

      totalMerged += expectedTotal;
      mergedResults.push({
        fileKey: fileKey,
        fileName: baseFileName,
        mergedCount: expectedTotal
      });

      console.log(`✅ Merged ${expectedTotal} chunks for ${baseFileName}`);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully merged ${totalMerged} chunks into ${mergedResults.length} indices`,
      mergedCount: totalMerged,
      mergedFiles: mergedResults
    });

  } catch (error) {
    console.error('Merge chunks error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

