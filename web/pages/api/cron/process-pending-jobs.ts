import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getFrameImageUrls, processFrameData, fetchFigmaFile, type FigmaNode } from '../../../lib/figma-api';
import { deriveNamingTags, getSizeTag } from '../../../lib/tag-utils';
import { archiveExistingIndex, type ArchiveableIndexRow } from '../../../lib/index-archive';

// This endpoint is called by Vercel Cron Jobs to process pending index jobs in the background
// It runs every minute and processes one pending job at a time

const CHUNK_SIZE_DEFAULT = 10;

interface PageFrame {
  pageIndex: number;
  frameIndex: number;
  frame: any;
}

function sanitizePathSegment(value: string): string {
  return (value || '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 80) || 'frame';
}

async function downloadBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'image/png';
  return { buffer, contentType };
}

function flattenFrames(manifest: any[]): PageFrame[] {
  const flat: PageFrame[] = [];
  manifest.forEach((page, pageIndex) => {
    if (!Array.isArray(page.frames)) return;
    page.frames.forEach((frame: any, frameIndex: number) => {
      flat.push({ pageIndex, frameIndex, frame });
    });
  });
  return flat;
}

async function uploadChunkFrames(params: {
  supabaseAdmin: any;
  bucket: string;
  userId: string;
  documentId: string;
  chunk: PageFrame[];
  fileKey: string;
  jobManifest: any[];
  figmaToken: string;
  requestId?: string;
}) {
  const { supabaseAdmin, bucket, userId, documentId, chunk, fileKey, jobManifest, figmaToken, requestId = 'cron' } = params;
  const chunkStartTime = Date.now();
  const chunkId = `chunk_${Date.now()}`;
  
  console.log(`\n📦 [${requestId}] [${chunkId}] ===== uploadChunkFrames START =====`);
  console.log(`[${requestId}] [${chunkId}] Chunk size: ${chunk.length} frames`);
  
  const nodeIds = chunk.map((entry) => entry.frame.id).filter(Boolean);
  if (!nodeIds.length) {
    console.log(`[${requestId}] [${chunkId}] ⚠️ No node IDs found, returning empty`);
    return [];
  }

  console.log(`[${requestId}] [${chunkId}] Step 1: Fetching image URLs from Figma API for ${nodeIds.length} frames...`);
  const imageUrlsStartTime = Date.now();
  const imagesResponse = await getFrameImageUrls(fileKey, nodeIds, figmaToken, 1, 'png');
  const imageUrlsTime = Date.now() - imageUrlsStartTime;
  
  if (!imagesResponse || imagesResponse.error) {
    console.error(`[${requestId}] [${chunkId}] ❌ Failed to fetch image URLs:`, imagesResponse?.error);
    throw new Error(`Failed to fetch frame images: ${imagesResponse?.error || 'unknown'}`);
  }
  const images = imagesResponse.images || {};
  console.log(`[${requestId}] [${chunkId}] ✅ Got ${Object.keys(images).length} image URLs in ${imageUrlsTime}ms`);

  const processed: PageFrame[] = [];
  for (let i = 0; i < chunk.length; i++) {
    const entry = chunk[i];
    const frameStartTime = Date.now();
    const frameId = entry.frame.id || 'unknown';
    
    console.log(`[${requestId}] [${chunkId}] Processing frame ${i + 1}/${chunk.length}: ${frameId}`);
    
    const imageUrl = images?.[entry.frame.id];
    if (!imageUrl) {
      console.warn(`[${requestId}] [${chunkId}] ⚠️ No image URL for frame ${frameId}, skipping`);
      continue;
    }
    
    console.log(`[${requestId}] [${chunkId}] Frame ${i + 1}: Downloading image...`);
    const downloadStartTime = Date.now();
    const { buffer, contentType } = await downloadBuffer(imageUrl);
    const downloadTime = Date.now() - downloadStartTime;
    const imageSizeKB = Math.round(buffer.length / 1024);
    console.log(`[${requestId}] [${chunkId}] Frame ${i + 1}: Downloaded ${imageSizeKB}KB in ${downloadTime}ms`);

    const sanitizedFrameName = sanitizePathSegment(entry.frame.name || 'frame');
    const storagePath = `${userId}/${documentId}/${sanitizedFrameName}_${frameId}.${contentType.split('/')[1] || 'png'}`;
    
    console.log(`[${requestId}] [${chunkId}] Frame ${i + 1}: Uploading to Supabase Storage: ${storagePath}`);
    const uploadStartTime = Date.now();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });
    const uploadTime = Date.now() - uploadStartTime;
    
    if (uploadError) {
      console.error(`[${requestId}] [${chunkId}] ❌ Upload error for frame ${frameId}:`, uploadError);
      throw uploadError;
    }
    
    console.log(`[${requestId}] [${chunkId}] Frame ${i + 1}: Uploaded in ${uploadTime}ms`);

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl || '';

    const processedFrame = {
      ...entry.frame,
      image: publicUrl,
      storagePath,
    };

    processed.push({
      ...entry,
      frame: processedFrame,
    });

    const frameTime = Date.now() - frameStartTime;
    console.log(`[${requestId}] [${chunkId}] Frame ${i + 1}: Total processing time: ${frameTime}ms`);
  }

  const chunkTime = Date.now() - chunkStartTime;
  console.log(`[${requestId}] [${chunkId}] ✅ uploadChunkFrames completed in ${chunkTime}ms`);
  
  return processed;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is a cron job request
  // Vercel Cron sends Authorization header with CRON_SECRET, or we can check for Vercel's cron header
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const vercelCronHeader = req.headers['x-vercel-cron'] || req.headers['x-cron-secret'];
  
  // Allow if: (1) Vercel cron header present, (2) CRON_SECRET matches, or (3) no CRON_SECRET set (dev mode)
  const isAuthorized = 
    vercelCronHeader || 
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (!cronSecret && process.env.NODE_ENV === 'development');
  
  if (!isAuthorized) {
    console.error('Unauthorized cron job request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const requestId = `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n🚀 [${requestId}] ===== CRON: process-pending-jobs START =====`);

  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

    if (!serviceUrl || !serviceKey) {
      console.error(`[${requestId}] ❌ Missing Supabase configuration`);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Find active jobs (pending or processing) that need processing
    // Process up to 3 jobs per cron run to avoid timeout
    const { data: activeJobs, error: fetchError } = await supabaseAdmin
      .from('index_jobs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(3);

    if (fetchError) {
      console.error(`[${requestId}] ❌ Error fetching active jobs:`, fetchError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!activeJobs || activeJobs.length === 0) {
      console.log(`[${requestId}] ✅ No active jobs found`);
      return res.status(200).json({ message: 'No active jobs', processed: 0 });
    }

    console.log(`[${requestId}] 📋 Found ${activeJobs.length} active job(s) to process`);

    // Determine base URL for internal API calls
    let baseUrl = 'http://localhost:3000';
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }

    let processedCount = 0;
    const results = [];

    for (const job of activeJobs) {
      const jobId = job.id;
      console.log(`[${requestId}] 🔄 Processing job: ${jobId}`);

      // Get figmaToken from saved_connections table (figma_token column doesn't exist in index_jobs)
      let figmaToken: string | null = null;
      try {
        const { data: connection } = await supabaseAdmin
          .from('saved_connections')
          .select('figma_token')
          .eq('user_id', job.user_id)
          .eq('file_key', job.file_key)
          .maybeSingle();
        
        figmaToken = connection?.figma_token || null;
      } catch (error: any) {
        console.error(`[${requestId}] ❌ Error fetching figma_token from saved_connections:`, error.message);
      }
      
      if (!figmaToken) {
        console.error(`[${requestId}] ❌ Job ${jobId} missing figma_token (not found in saved_connections), skipping`);
        results.push({ jobId, status: 'skipped', reason: 'missing_figma_token' });
        continue;
      }

      try {
        // Call process-index-job endpoint internally
        const processUrl = `${baseUrl}/api/process-index-job`;
        console.log(`[${requestId}] 📤 Calling ${processUrl} for job ${jobId}`);
        
        const processResponse = await fetch(processUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET || 'cron-secret'}`,
          },
          body: JSON.stringify({
            jobId,
            figmaToken,
          }),
        });

        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          console.error(`[${requestId}] ❌ process-index-job failed for ${jobId}:`, processResponse.status, errorText);
          results.push({ jobId, status: 'error', error: errorText });
          continue;
        }

        const processData = await processResponse.json();
        console.log(`[${requestId}] ✅ Job ${jobId} processed:`, processData.status);
        results.push({ jobId, status: processData.status, data: processData });
        processedCount++;

      } catch (error: any) {
        console.error(`[${requestId}] ❌ Error processing job ${jobId}:`, error);
        results.push({ jobId, status: 'error', error: error.message });
      }
    }

    return res.status(200).json({ 
      message: `Processed ${processedCount} job(s)`, 
      processed: processedCount,
      total: activeJobs.length,
      results,
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Error in cron job:`, error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}



