import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getFrameImageUrls, processFrameData, fetchFigmaFile, collectFrameNodes, type FigmaNode } from '../../lib/figma-api';
import { deriveNamingTags, getSizeTag } from '../../lib/tag-utils';
import { archiveExistingIndex, type ArchiveableIndexRow } from '../../lib/index-archive';
import { sendJobNotificationEmail, sendJobNotificationToAdmin } from '../../lib/email';

/**
 * Merge multiple job manifests into a single index
 * Called when all jobs in a split group have completed
 */
async function mergeSplitJobs(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  parentJobId: string,
  requestId: string
): Promise<void> {
  console.log(`[${requestId}] 🔗 Checking if all split jobs are completed for parent ${parentJobId}...`);
  
  // Get all jobs in the split group
  const { data: allJobs, error: fetchError } = await supabaseAdmin
    .from('index_jobs')
    .select('id, status, manifest, total_frames, job_index, total_jobs')
    .eq('parent_job_id', parentJobId)
    .order('job_index', { ascending: true });
  
  if (fetchError || !allJobs || allJobs.length === 0) {
    console.error(`[${requestId}] ❌ Failed to fetch split jobs:`, fetchError);
    return;
  }
  
  const totalJobs = allJobs[0]?.total_jobs || allJobs.length;
  const completedJobs = allJobs.filter((j: any) => j.status === 'completed');
  
  console.log(`[${requestId}] 📊 Split jobs status: ${completedJobs.length}/${totalJobs} completed`);
  
  // Check if all jobs are completed
  if (completedJobs.length < totalJobs) {
    console.log(`[${requestId}] ⏳ Waiting for ${totalJobs - completedJobs.length} more jobs to complete...`);
    return; // Not all jobs completed yet
  }
  
  console.log(`[${requestId}] 🎉 All split jobs completed! Merging manifests...`);
  
  // Merge all manifests
  const mergedManifest: any[] = [];
  const pageMap = new Map<string, any>(); // page name -> page object
  
  for (const job of allJobs) {
    const manifest = job.manifest || [];
    if (!Array.isArray(manifest)) continue;
    
    for (const page of manifest) {
      if (!page || !page.name) continue;
      
      const existingPage = pageMap.get(page.name);
      if (existingPage) {
        // Merge frames from this page
        if (Array.isArray(page.frames)) {
          existingPage.frames = [...(existingPage.frames || []), ...page.frames];
        }
      } else {
        // New page
        pageMap.set(page.name, {
          ...page,
          frames: Array.isArray(page.frames) ? [...page.frames] : [],
        });
      }
    }
  }
  
  // Convert map to array
  mergedManifest.push(...Array.from(pageMap.values()));
  
  console.log(`[${requestId}] ✅ Merged manifest: ${mergedManifest.length} pages`);
  
  // Get job details from first job
  const firstJob = allJobs[0];
  const { data: parentJob } = await supabaseAdmin
    .from('index_jobs')
    .select('user_id, file_key, file_name, project_id')
    .eq('id', parentJobId)
    .single();
  
  if (!parentJob) {
    console.error(`[${requestId}] ❌ Parent job not found: ${parentJobId}`);
    return;
  }
  
  // Calculate tags from merged manifest
  const allFrameTags = new Set<string>();
  const allCustomTags = new Set<string>();
  const allNamingTags = new Set<string>();
  const allSizeTags = new Set<string>();
  
  mergedManifest.forEach((page: any) => {
    if (!Array.isArray(page.frames)) return;
    page.frames.forEach((frame: any) => {
      const ft: string[] = Array.isArray(frame.tags) ? frame.tags : [];
      const nameParts = deriveNamingTags(frame.name || '');
      const sizeTag = getSizeTag(frame.width, frame.height);
      
      nameParts.forEach((t) => allNamingTags.add(t));
      if (sizeTag) allSizeTags.add(sizeTag);
      
      ft.forEach((t) => {
        if (t && typeof t === 'string') {
          const isSize = /^\d+x\d+$/i.test(t);
          if (!isSize && !nameParts.includes(t)) {
            allCustomTags.add(t);
          }
        }
      });
      
      ft.forEach((t) => t && allFrameTags.add(t));
    });
  });
  
  const fileSizeBytes = Buffer.byteLength(JSON.stringify(mergedManifest), 'utf8');
  
  const indexData: any = {
    user_id: parentJob.user_id,
    project_id: parentJob.project_id,
    figma_file_key: parentJob.file_key,
    file_name: parentJob.file_name,
    index_data: mergedManifest,
    frame_count: Array.isArray(mergedManifest)
      ? mergedManifest.reduce((sum: number, page: any) => sum + (Array.isArray(page?.frames) ? page.frames.length : 0), 0)
      : 0,
    uploaded_at: new Date().toISOString(),
    frame_tags: Array.from(allFrameTags),
    custom_tags: Array.from(allCustomTags),
    naming_tags: Array.from(allNamingTags),
    size_tags: Array.from(allSizeTags),
    file_size: fileSizeBytes,
  };
  
  // Check for existing index
  const { data: existingIndexRow } = await supabaseAdmin
    .from('index_files')
    .select('id, user_id, project_id, figma_file_key, file_name, index_data, frame_tags, custom_tags, naming_tags, size_tags, file_size, uploaded_at')
    .eq('user_id', parentJob.user_id)
    .eq('figma_file_key', parentJob.file_key)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
  if (existingIndexRow) {
    console.log(`[${requestId}] 🗂️ Archiving existing index before merge...`);
    await archiveExistingIndex({
      supabaseAdmin,
      existingIndex: existingIndexRow as unknown as ArchiveableIndexRow,
      storageBucket,
    });
  }
  
  // Insert merged index
  console.log(`[${requestId}] 💾 Inserting merged index...`);
  let insertion = await supabaseAdmin.from('index_files').insert(indexData).select('id').single();
  if (insertion.error && /(file_size|frame_count)/i.test(insertion.error.message || '')) {
    console.log(`[${requestId}] ⚠️ file_size/frame_count column error, retrying without optional metadata...`);
    const { file_size, frame_count, ...indexWithoutSize } = indexData;
    insertion = await supabaseAdmin.from('index_files').insert(indexWithoutSize).select('id').single();
  }
  
  if (insertion.error) {
    console.error(`[${requestId}] ❌ Failed to save merged index:`, insertion.error);
    return;
  }
  
  console.log(`[${requestId}] ✅ Merged index saved with ID: ${insertion.data?.id}`);
  
  // Update all jobs with the merged index ID and mark them as completed
  await supabaseAdmin
    .from('index_jobs')
    .update({ 
      index_file_id: insertion.data?.id,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('parent_job_id', parentJobId);
  
  // Also update the parent job itself if it exists
  await supabaseAdmin
    .from('index_jobs')
    .update({ 
      index_file_id: insertion.data?.id,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', parentJobId);
  
  console.log(`[${requestId}] ✅ All jobs in split group marked as completed`);
  
  // Send email notifications for completed merged job
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', parentJob.user_id)
      .single();

    if (user && user.email) {
      // Calculate total frames from merged manifest
      const totalFramesInMerged = mergedManifest.reduce((sum: number, page: any) => {
        return sum + (Array.isArray(page.frames) ? page.frames.length : 0);
      }, 0);

      // Send email to user
      const userEmailResult = await sendJobNotificationEmail({
        jobId: parentJobId,
        fileName: parentJob.file_name || 'Untitled',
        fileKey: parentJob.file_key,
        status: 'completed',
        totalFrames: totalFramesInMerged,
        indexId: insertion.data?.id || undefined,
        userEmail: user.email,
        userName: user.full_name || undefined,
      });
      
      if (userEmailResult.success) {
        console.log(`[${requestId}] ✅ User email sent successfully for merged job`);
      } else {
        console.error(`[${requestId}] ❌ Failed to send completion email to user for merged job:`, userEmailResult.error);
      }

      // Send email to admin
      const adminEmailResult = await sendJobNotificationToAdmin({
        jobId: parentJobId,
        fileName: parentJob.file_name || 'Untitled',
        fileKey: parentJob.file_key,
        status: 'completed',
        totalFrames: totalFramesInMerged,
        indexId: insertion.data?.id || undefined,
        userEmail: user.email,
        userName: user.full_name || undefined,
      });
      
      if (adminEmailResult.success) {
        console.log(`[${requestId}] ✅ Admin email sent successfully for merged job`);
      } else {
        console.error(`[${requestId}] ❌ Failed to send completion email to admin for merged job:`, adminEmailResult.error);
      }

      console.log(`[${requestId}] 📧 Email notifications processed for completed merged job`);
    } else {
      console.warn(`[${requestId}] ⚠️ User not found for merged job ${parentJobId}, skipping email notifications`);
    }
  } catch (emailError) {
    // Don't fail the merge if email sending fails
    console.error(`[${requestId}] ❌ Error sending email notifications for merged job:`, emailError);
  }
  
  // Clean up duplicate indices
  const deleteResult = await supabaseAdmin
    .from('index_files')
    .delete()
    .eq('user_id', parentJob.user_id)
    .eq('figma_file_key', parentJob.file_key)
    .neq('id', insertion.data?.id);
  
  console.log(`[${requestId}] 🗑️ Cleanup result:`, deleteResult.error ? `Error: ${deleteResult.error.message}` : 'Success');
}

const CHUNK_SIZE_DEFAULT = 10; // Increased due to parallel processing optimization (6 concurrent * ~1.5-2 batches)

/**
 * Calculate dynamic batch size based on total frames
 * Optimized for faster processing with frame references from client
 * - Small files (<50): 2 frames per batch
 * - Medium-small (50-100): 4 frames per batch
 * - Medium (100-300): 6 frames per batch
 * - Medium-large (300-500): 8 frames per batch
 * - Large (500-1000): 12 frames per batch
 * - Very large (1000-2000): 16 frames per batch
 * - Huge (>2000): 20 frames per batch
 */
function calculateDynamicBatchSize(totalFrames: number): number {
  if (totalFrames < 50) return 2;          // Small: 2 frames
  if (totalFrames < 100) return 4;        // Medium-small: 4 frames
  if (totalFrames < 300) return 6;        // Medium: 6 frames
  if (totalFrames < 500) return 8;        // Medium-large: 8 frames
  if (totalFrames < 1000) return 12;      // Large: 12 frames
  if (totalFrames < 2000) return 16;     // Very large: 16 frames
  return 20;                              // Huge: 20 frames
}

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

async function downloadBuffer(url: string, timeoutMs: number = 15000): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to download image (${response.status}): ${errorText.substring(0, 100)}`);
    }
    
    // Check content-type to ensure we're getting an image, not HTML/JSON error
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) {
      // If we get HTML or JSON, it's likely an error page - try to read it for better error message
      const text = await response.text().catch(() => 'Unknown error');
      const errorPreview = text.substring(0, 200);
      throw new Error(`Expected image but got ${contentType}. Response preview: ${errorPreview}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Validate buffer is not empty and looks like an image (basic check - PNG/JPEG magic bytes)
    if (buffer.length === 0) {
      throw new Error('Downloaded image buffer is empty');
    }
    
    // Basic validation: check for common image magic bytes
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWEBP = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    
    // If content-type says image but magic bytes don't match, it might be HTML/JSON
    if (!isPNG && !isJPEG && !isGIF && !isWEBP && contentType.startsWith('image/')) {
      const textPreview = buffer.toString('utf-8', 0, Math.min(200, buffer.length));
      if (textPreview.includes('<!DOCTYPE') || textPreview.includes('<html') || textPreview.includes('{')) {
        throw new Error(`Image URL returned ${contentType} but content appears to be HTML/JSON: ${textPreview.substring(0, 100)}`);
      }
    }
    
    return { buffer, contentType: contentType || 'image/png' };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Image download timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
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
  supabaseAdmin: SupabaseClient<any, any, any, any, any>;
  bucket: string;
  userId: string;
  documentId: string;
  chunk: PageFrame[];
  fileKey: string;
  jobManifest: any[];
  figmaToken: string;
  imageQuality?: number; // Image quality scale (0.3, 0.7, or 1.0)
  requestId?: string;
}) {
  const { supabaseAdmin, bucket, userId, documentId, chunk, fileKey, jobManifest, figmaToken, imageQuality = 0.7, requestId = 'unknown' } = params;
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
  // Use image quality from params (default 0.7 if not set)
  const imageScale = imageQuality || 0.7;
  const imagesResponse = await getFrameImageUrls(fileKey, nodeIds, figmaToken, imageScale, 'png');
  const imageUrlsTime = Date.now() - imageUrlsStartTime;
  
  if (!imagesResponse || imagesResponse.error) {
    console.error(`[${requestId}] [${chunkId}] ❌ Failed to fetch image URLs:`, imagesResponse?.error);
    throw new Error(`Failed to fetch frame images: ${imagesResponse?.error || 'unknown'}`);
  }
  const images = imagesResponse.images || {};
  console.log(`[${requestId}] [${chunkId}] ✅ Got ${Object.keys(images).length} image URLs in ${imageUrlsTime}ms`);

  // Process frames in parallel for better performance
  // Increased concurrency for better throughput (up to 10 concurrent operations)
  // This is safe because downloads/uploads are I/O bound, not CPU bound
  const MAX_CONCURRENT = Math.min(10, chunk.length);
  const processed: PageFrame[] = [];
  
  // Prepare date path once (reused for all frames)
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  
  // Process frames in batches with controlled concurrency
  for (let batchStart = 0; batchStart < chunk.length; batchStart += MAX_CONCURRENT) {
    const batchEnd = Math.min(batchStart + MAX_CONCURRENT, chunk.length);
    const batch = chunk.slice(batchStart, batchEnd);
    
    console.log(`[${requestId}] [${chunkId}] Processing batch ${batchStart + 1}-${batchEnd} of ${chunk.length} frames in parallel...`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (entry, batchIndex) => {
      const globalIndex = batchStart + batchIndex;
      const frameStartTime = Date.now();
      const frameId = entry.frame.id || 'unknown';
      
      try {
        const imageUrl = images?.[entry.frame.id];
        if (!imageUrl) {
          console.warn(`[${requestId}] [${chunkId}] ⚠️ No image URL for frame ${frameId}, skipping`);
          return null;
        }
        
        // Download image with longer timeout for large images
        const downloadStartTime = Date.now();
        // Increased timeout: 20s for single frame, 18s for parallel (allows for larger images)
        const downloadTimeout = chunk.length === 1 ? 20000 : 18000;
        const { buffer, contentType } = await downloadBuffer(imageUrl, downloadTimeout);
        const downloadTime = Date.now() - downloadStartTime;
        const imageSizeKB = Math.round(buffer.length / 1024);
        console.log(`[${requestId}] [${chunkId}] Frame ${globalIndex + 1}: Downloaded ${imageSizeKB}KB in ${downloadTime}ms`);
        
        // Prepare upload path
        const extension = contentType.toLowerCase().includes('jpeg') ? 'jpg' : 'png';
        const safeName = sanitizePathSegment(`${entry.frame.name || entry.frame.id}`);
        const filename = `${safeName}.${extension}`;
        const objectPath = `${userId}/${documentId}/${yyyy}/${mm}/${dd}/${filename}`;

        // Upload to storage
        const uploadStartTime = Date.now();
        const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(objectPath, buffer, {
          upsert: true,
          contentType,
        });
        const uploadTime = Date.now() - uploadStartTime;
        
        if (uploadError) {
          console.error(`[${requestId}] [${chunkId}] ❌ Upload failed for frame ${globalIndex + 1}:`, uploadError);
          throw uploadError;
        }
        console.log(`[${requestId}] [${chunkId}] Frame ${globalIndex + 1}: Uploaded in ${uploadTime}ms`);

        // Create and upload thumbnail
        let thumbnailUrl: string | null = null;
        try {
          const sharp = (await import('sharp')).default;
          const thumbnailBuffer = await sharp(buffer)
            .resize(320, null, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: 70 })
            .toBuffer();
          
          // Create thumbnail path: same directory structure but with 'thumbs/' subdirectory
          const thumbnailFilename = filename.replace(/\.[^.]+$/, '.webp');
          const thumbnailPath = `${userId}/${documentId}/${yyyy}/${mm}/${dd}/thumbs/${thumbnailFilename}`;
          const thumbnailUploadStart = Date.now();
          const { error: thumbUploadError } = await supabaseAdmin.storage
            .from(bucket)
            .upload(thumbnailPath, thumbnailBuffer, {
              upsert: true,
              contentType: 'image/webp',
            });
          const thumbnailUploadTime = Date.now() - thumbnailUploadStart;
          
          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(thumbnailPath);
            thumbnailUrl = thumbUrlData?.publicUrl || null;
            console.log(`[${requestId}] [${chunkId}] Frame ${globalIndex + 1}: Thumbnail uploaded in ${thumbnailUploadTime}ms (${Math.round(thumbnailBuffer.length / 1024)}KB)`);
          } else {
            console.warn(`[${requestId}] [${chunkId}] Frame ${globalIndex + 1}: Thumbnail upload failed:`, thumbUploadError);
          }
        } catch (thumbError) {
          console.warn(`[${requestId}] [${chunkId}] Frame ${globalIndex + 1}: Error creating thumbnail:`, thumbError);
        }

        // Update manifest
        const frame = jobManifest[entry.pageIndex]?.frames?.[entry.frameIndex];
        if (frame) {
          frame.storage_path = `${bucket}:${objectPath}`;
          const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
          frame.image_url = publicUrlData?.publicUrl || null;
          frame.image = null;
          if (thumbnailUrl) {
            (frame as any).thumb_url = thumbnailUrl;
          }
        }

        const frameTotalTime = Date.now() - frameStartTime;
        console.log(`[${requestId}] [${chunkId}] Frame ${globalIndex + 1}: ✅ Completed in ${frameTotalTime}ms (download: ${downloadTime}ms, upload: ${uploadTime}ms)`);
        
        return entry;
      } catch (error: any) {
        console.error(`[${requestId}] [${chunkId}] ❌ Error processing frame ${globalIndex + 1} (${frameId}):`, error.message);
        // Don't throw - continue with other frames in batch
        return null;
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    const successful = batchResults.filter((r): r is PageFrame => r !== null);
    processed.push(...successful);
    
    if (successful.length < batch.length) {
      console.warn(`[${requestId}] [${chunkId}] ⚠️ Batch completed with ${successful.length}/${batch.length} successful frames`);
    }
  }

  const chunkTotalTime = Date.now() - chunkStartTime;
  console.log(`[${requestId}] [${chunkId}] ✅ uploadChunkFrames COMPLETE: ${processed.length}/${chunk.length} frames in ${chunkTotalTime}ms`);
  console.log(`[${requestId}] [${chunkId}] ===== uploadChunkFrames END =====\n`);

  return processed;
}

/**
 * Helper function to mark job as failed and stop processing
 */
async function markJobAsFailed(
  supabaseAdmin: SupabaseClient<any, any, any, any, any>,
  jobId: string,
  errorMessage: string,
  requestId: string
): Promise<void> {
  console.error(`[${requestId}] 🛑 CRITICAL ERROR: Stopping job ${jobId}: ${errorMessage}`);
  await supabaseAdmin
    .from('index_jobs')
    .update({
      status: 'failed',
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  console.log(`[${requestId}] ✅ Job ${jobId} marked as failed`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestStartTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`\n🚀 [${requestId}] ===== process-index-job START =====`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'API key or cron secret required' });
    }
    const token = authHeader.replace('Bearer ', '');
    
    // Allow cron job authentication (for background processing)
    const cronSecret = process.env.CRON_SECRET;
    let authUser: { id: string } | null = null;
    
    if (cronSecret && token === cronSecret) {
      // Cron job authentication - we'll get user_id from the job itself
      console.log(`[${requestId}] ✅ Cron job authentication passed`);
    } else {
      // Regular API key authentication
      if (!token.startsWith('figdex_') || token.length < 20) {
        return res.status(400).json({ success: false, error: 'Invalid API key format' });
      }
      
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('api_key', token)
        .single();
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid API key' });
      }
      
      authUser = user;
      console.log(`[${requestId}] ✅ API key authentication passed`);
    }

    const { jobId, chunkSize: requestedChunkSize, figmaToken: bodyFigmaToken } = req.body || {};
    // Time budget to stay well under Vercel 30s limit
    // Time budget to stay well under Vercel 30s limit
    // Increased slightly to allow for frame collection and at least one frame processing
    const INVOCATION_BUDGET_MS = 18000; // target ~18s per invocation (was 15s - too tight)
    const startTime = Date.now();
    const elapsedMs = () => Date.now() - startTime;
    const hasTimeBudget = () => elapsedMs() < INVOCATION_BUDGET_MS;
    const remainingBudgetMs = () => Math.max(0, INVOCATION_BUDGET_MS - elapsedMs());

    console.log(`[${requestId}] 📥 Request body: jobId=${jobId}, chunkSize=${requestedChunkSize || 'default'}`);
    
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }

    console.log(`[${requestId}] 📥 Loading job ${jobId} from database...`);
    const loadJobStartTime = Date.now();
    const jobResp = await supabaseAdmin.from('index_jobs').select('*').eq('id', jobId).single();
    const loadJobTime = Date.now() - loadJobStartTime;
    
    const job = jobResp.data;
    if (!job) {
      console.error(`[${requestId}] ❌ Job ${jobId} not found`);
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    // Get figmaToken from body (required - column doesn't exist in index_jobs table)
    const figmaToken = bodyFigmaToken;
    if (!figmaToken) {
      return res.status(400).json({ success: false, error: 'figmaToken is required in request body' });
    }
    
    console.log(`[${requestId}] ✅ Job loaded in ${loadJobTime}ms:`, {
      status: job.status,
      totalFrames: job.total_frames,
      nextFrameIndex: job.next_frame_index,
      hasManifest: Array.isArray(job.manifest) && job.manifest.length > 0,
      hasFrameNodeRefs: !!(job as any).frame_node_refs && Array.isArray((job as any).frame_node_refs),
      hasFigmaToken: !!bodyFigmaToken, // figma_token column doesn't exist - token comes from request body
      figmaVersion: (job as any).figma_version || 'NOT SET',
      figmaLastModified: (job as any).figma_last_modified || 'NOT SET',
    });

    // For cron jobs, skip user validation (job already belongs to a user)
    // For regular API calls, verify user owns the job
    if (authUser && job.user_id !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (job.status === 'completed') {
      // Job already completed - send email notifications (they should have been sent, but send again to be safe)
      console.log(`[${requestId}] ⚠️ Job already completed, sending email notifications anyway...`);
      
      // Send email notifications even if job is already completed (in case they weren't sent before)
      try {
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', job.user_id)
          .single();
          
        if (userError) {
          console.error(`[${requestId}] ❌ Error fetching user for email notifications:`, userError);
        } else {
          console.log(`[${requestId}] ✅ User fetched for email notifications:`, user?.email || 'no email');
        }

        if (user && user.email) {
          console.log(`[${requestId}] 📧 Preparing to send email notifications to ${user.email} for already-completed job...`);
          
          // Send email to user
          const userEmailResult = await sendJobNotificationEmail({
            jobId: jobId,
            fileName: job.file_name || 'Untitled',
            fileKey: job.file_key,
            status: 'completed',
            totalFrames: job.total_frames || 0,
            indexId: job.index_file_id || undefined,
            userEmail: user.email,
            userName: user.full_name || undefined,
          });
          
          if (userEmailResult.success) {
            console.log(`[${requestId}] ✅ User email sent successfully for already-completed job`);
          } else {
            console.error(`[${requestId}] ❌ Failed to send completion email to user:`, userEmailResult.error);
          }

          // Send email to admin
          const adminEmailResult = await sendJobNotificationToAdmin({
            jobId: jobId,
            fileName: job.file_name || 'Untitled',
            fileKey: job.file_key,
            status: 'completed',
            totalFrames: job.total_frames || 0,
            indexId: job.index_file_id || undefined,
            userEmail: user.email,
            userName: user.full_name || undefined,
          });
          
          if (adminEmailResult.success) {
            console.log(`[${requestId}] ✅ Admin email sent successfully for already-completed job`);
          } else {
            console.error(`[${requestId}] ❌ Failed to send completion email to admin:`, adminEmailResult.error);
          }

          console.log(`[${requestId}] 📧 Email notifications processed for already-completed job`);
        } else {
          console.warn(`[${requestId}] ⚠️ User not found for already-completed job ${jobId} (user_id: ${job.user_id}), skipping email notifications`);
        }
      } catch (emailError) {
        console.error(`[${requestId}] ❌ Error sending email notifications for already-completed job:`, emailError);
      }
      
      return res.status(200).json({ success: true, status: 'completed', indexId: job.index_file_id });
    }

    // Get frame node references - if not available, use existing manifest (backward compatibility)
    const frameNodeRefs = (job as any).frame_node_refs || [];
    const documentData = (job as any).document_data || null;
    const manifest = Array.isArray(job.manifest) ? job.manifest : [];
    const totalFrames = job.total_frames || 0;
    const nextFrameIndex = job.next_frame_index || 0;
    const imageQuality = (job as any).image_quality || 0.7; // Default to medium (70%) if not set
    const fastMode = Boolean((job as any).fast_mode);

    if (nextFrameIndex >= totalFrames) {
      return res.status(200).json({ success: true, status: 'completed', indexId: job.index_file_id });
    }

    // Check if job has no data to process (created without frame_node_refs due to missing columns)
    if (frameNodeRefs.length === 0 && manifest.length === 0 && totalFrames > 0) {
      console.error(`[${requestId}] ❌ Job has no frame data to process (frame_node_refs and manifest are both empty)`);
      await supabaseAdmin
        .from('index_jobs')
        .update({
          status: 'failed',
          error: 'Job created without frame data. Please run SQL migrations to add required columns (frame_node_refs, document_data) and try again.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return res.status(500).json({
        success: false,
        error: 'Job has no frame data to process. This job was created before SQL migrations were run. Please delete this job and create a new one after running the migrations.',
      });
    }

    // If we have frame_node_refs, always process frames on-the-fly
    // Otherwise, use existing manifest (backward compatibility)
    const hasFrameNodeRefs = Array.isArray(frameNodeRefs) && frameNodeRefs.length > 0;
    const hasManifest = Array.isArray(manifest) && manifest.length > 0;
    
    let flatFrames: PageFrame[] = [];
    let needsProcessing = hasFrameNodeRefs;
    
    if (!hasFrameNodeRefs && hasManifest) {
      // Legacy jobs created before frame_node_refs existed
      flatFrames = flattenFrames(manifest);
    } else if (!hasFrameNodeRefs && !hasManifest) {
      console.warn(`[${requestId}] ⚠️ No manifest or frame_node_refs available. Nothing to process.`);
    } else if (hasFrameNodeRefs && nextFrameIndex === 0) {
      console.log('🔄 Processing frames on-the-fly from node references (initial chunk)...');
    }
    
    // Increased chunk size limits for faster processing
    // Processing frames on-the-fly takes more time (API calls, downloads, uploads)
    // But with frame references from client, we can process more efficiently
    let MAX_CHUNK_SIZE_BYTES: number;
    if (needsProcessing) {
      if (totalFrames > 500) {
        MAX_CHUNK_SIZE_BYTES = 2 * 1024 * 1024; // 2MB for very large files (>500 frames)
      } else if (totalFrames > 200) {
        MAX_CHUNK_SIZE_BYTES = 3 * 1024 * 1024; // 3MB for large files (>200 frames)
      } else {
        MAX_CHUNK_SIZE_BYTES = 4 * 1024 * 1024; // 4MB for smaller files
      }
    } else {
      MAX_CHUNK_SIZE_BYTES = 5 * 1024 * 1024; // 5MB when using existing manifest
    }
    
    // Calculate chunk size based on data size, not just frame count
    // Estimate average frame size from existing manifest if available
    let estimatedFrameSizeBytes = 50000; // Default estimate: ~50KB per frame (conservative)
    
    if (nextFrameIndex > 0 && manifest.length > 0) {
      // Calculate average frame size from already processed frames
      const processedFrames = flatFrames.slice(0, nextFrameIndex);
      if (processedFrames.length > 0) {
        // Estimate size by checking a sample of processed frames
        const sampleSize = Math.min(10, processedFrames.length);
        const sample = processedFrames.slice(0, sampleSize);
        let totalSampleSize = 0;
        for (const entry of sample) {
          const frameJson = JSON.stringify(entry.frame);
          totalSampleSize += Buffer.byteLength(frameJson, 'utf8');
        }
        estimatedFrameSizeBytes = Math.max(50000, totalSampleSize / sampleSize);
      }
    }
    
    // Calculate how many frames can fit in 3MB
    const maxFramesBySize = Math.floor(MAX_CHUNK_SIZE_BYTES / estimatedFrameSizeBytes);
    
    // Apply frame count limits tuned for speed but respecting time budget
    // Use dynamic batch size based on total_frames for better scalability
    const dynamicBatchSize = calculateDynamicBatchSize(totalFrames);
    console.log(`[${requestId}] 📊 Dynamic batch size calculated: ${dynamicBatchSize} (total_frames: ${totalFrames})`);
    
    // If fastMode (metadata only), allow larger chunks
    let effectiveChunkSize = requestedChunkSize || dynamicBatchSize;
    
    if (needsProcessing) {
      const requested = requestedChunkSize || dynamicBatchSize;
      effectiveChunkSize = Math.min(effectiveChunkSize, requested);
      
      if (fastMode) {
        if (totalFrames > 800) {
          effectiveChunkSize = Math.min(effectiveChunkSize, 6);
        } else if (totalFrames > 500) {
          effectiveChunkSize = Math.min(effectiveChunkSize, 8);
        } else if (totalFrames > 300) {
          effectiveChunkSize = Math.min(effectiveChunkSize, 10);
        } else if (totalFrames > 150) {
          effectiveChunkSize = Math.min(effectiveChunkSize, 12);
        } else if (totalFrames > 80) {
          effectiveChunkSize = Math.min(effectiveChunkSize, 14);
        } else if (totalFrames > 40) {
          effectiveChunkSize = Math.min(effectiveChunkSize, 16);
        } else {
          effectiveChunkSize = Math.min(effectiveChunkSize, 20);
        }
      } else {
        // Use dynamic batch size (already calculated above)
        // This ensures optimal batch size for files of all sizes
        effectiveChunkSize = Math.min(effectiveChunkSize, dynamicBatchSize);
      }
    } else {
      // When using existing manifest (already processed), use dynamic batch size
      effectiveChunkSize = Math.min(effectiveChunkSize, dynamicBatchSize);
    }
    
    // Use the smaller of: size-based limit or frame count limit
    effectiveChunkSize = Math.min(effectiveChunkSize, maxFramesBySize);
    
    // Ensure minimum of 1 frame per chunk
    effectiveChunkSize = Math.max(1, effectiveChunkSize);
    
    console.log(`📦 Chunk size calculation:`, {
      totalFrames,
      nextFrameIndex,
      dynamicBatchSize,
      estimatedFrameSizeBytes: Math.round(estimatedFrameSizeBytes / 1024) + 'KB',
      maxFramesBySize,
      effectiveChunkSize,
      note: `Using dynamic batch sizing for scalability (${totalFrames < 100 ? 'small' : totalFrames < 1000 ? 'medium-large' : 'very large'} file)`,
    });

    // Build chunk dynamically, checking size as we go
    let chunk: PageFrame[] = [];
    let chunkSizeBytes = 0;
    const chunkManifestEntries: { pageIndex: number; frameIndex: number }[] = [];
    const pagesAddedThisChunk: number[] = [];

    const revertManifestUpdates = () => {
      if (!chunkManifestEntries.length && !pagesAddedThisChunk.length) {
        return;
      }
      // Remove frames that were appended during this chunk
      for (let idx = chunkManifestEntries.length - 1; idx >= 0; idx--) {
        const { pageIndex, frameIndex } = chunkManifestEntries[idx];
        const page = manifest[pageIndex];
        if (!page || !Array.isArray(page.frames)) continue;
        if (frameIndex >= 0 && frameIndex < page.frames.length) {
          page.frames.splice(frameIndex, 1);
        }
      }
      // Remove pages that were created specially for this chunk and are now empty
      for (let idx = pagesAddedThisChunk.length - 1; idx >= 0; idx--) {
        const pageIndex = pagesAddedThisChunk[idx];
        const page = manifest[pageIndex];
        if (page && (!Array.isArray(page.frames) || page.frames.length === 0)) {
          manifest.splice(pageIndex, 1);
        }
      }
      chunkManifestEntries.length = 0;
      pagesAddedThisChunk.length = 0;
    };
    
    if (needsProcessing && frameNodeRefs.length > 0) {
      // Process frames on-the-fly from node references
      // Fetch document structure if needed
      let document: FigmaNode | null = null;
      if (documentData) {
        // Use cached document data
        document = documentData as FigmaNode;
      } else {
        // Fetch from Figma API (shouldn't happen often, but needed for text extraction)
        console.log('📥 Fetching document structure from Figma API...');
        try {
          const figmaFile = await fetchFigmaFile(job.file_key, figmaToken);
          document = figmaFile.document;
        } catch (error) {
          console.error('❌ Failed to fetch document:', error);
          // Continue without document - text extraction will be limited
          document = { id: '0:0', name: 'Unknown', type: 'DOCUMENT' } as FigmaNode;
        }
      }
      
      // Check if frame_node_refs contain page references (type: 'PAGE') or actual frame references
      // If they're pages, we need to fetch each page and collect frames from it
      const firstRef = frameNodeRefs[0];
      const isPageReference = firstRef?.nodeData?.type === 'PAGE' || firstRef?.type === 'PAGE';
      
      console.log(`[${requestId}] 🔍 Checking frame_node_refs type:`, {
        firstRefExists: !!firstRef,
        nodeDataType: firstRef?.nodeData?.type,
        refType: firstRef?.type,
        isPageReference,
        frameNodeRefsLength: frameNodeRefs.length,
        sampleRef: firstRef ? {
          id: firstRef.id,
          name: firstRef.name,
          pageName: firstRef.pageName,
          nodeData: firstRef.nodeData,
        } : null,
      });
      
      if (isPageReference) {
        // frame_node_refs contain page references, not frame references
        // We need to process pages and collect frames from each page
        console.log(`[${requestId}] 📄 Detected page references (not frame references). Will collect frames from pages...`);
        
        // Process pages in chunks (one page at a time to avoid timeouts)
        const pageIndex = nextFrameIndex; // nextFrameIndex now refers to page index
        if (pageIndex >= frameNodeRefs.length) {
          return res.status(200).json({ success: true, status: 'completed', indexId: job.index_file_id });
        }
        
        const pageRef = frameNodeRefs[pageIndex];
        if (!pageRef) {
          console.log(`[${requestId}] ⚠️ Page ref not found at index ${pageIndex}`);
          return res.status(200).json({ success: true, status: 'completed', indexId: job.index_file_id });
        }
        
        console.log(`[${requestId}] 📄 Processing page ${pageIndex + 1}/${frameNodeRefs.length}: ${pageRef.name || pageRef.id}`);
        console.log(`[${requestId}] ⏱️ Time budget at start: ${hasTimeBudget() ? 'OK' : 'LOW'} (${remainingBudgetMs()}ms remaining)`);
        
        try {
          // Use EXACT same method as frame counting (which works!)
          // Frame counting in api-index.tsx uses: /nodes?ids={pageId} and it WORKS!
          console.log(`[${requestId}] 📥 Fetching page ${pageRef.id} using EXACT same method as frame counting...`);
          const FIGMA_API_BASE = 'https://api.figma.com/v1';
          const nodesUrl = `${FIGMA_API_BASE}/files/${job.file_key}/nodes?ids=${pageRef.id}`;
          
          const nodesResponse = await fetch(nodesUrl, {
            headers: {
              'X-Figma-Token': figmaToken,
            },
            signal: AbortSignal.timeout(Math.max(5000, Math.min(12000, remainingBudgetMs()))),
          });
          
          if (!nodesResponse.ok) {
            throw new Error(`Failed to fetch page from Figma API: ${nodesResponse.status}`);
          }
          
          const nodesData = await nodesResponse.json() as { nodes: Record<string, { document: FigmaNode }> };
          const pageNodeData = nodesData.nodes?.[pageRef.id];
          
          if (!pageNodeData || !pageNodeData.document) {
            throw new Error(`Page node ${pageRef.id} not found in API response`);
          }
          
          const pageNode = pageNodeData.document;
          
          console.log(`[${requestId}] 📄 Page node from API (EXACT same as frame counting):`, {
            id: pageNode.id,
            name: pageNode.name,
            type: pageNode.type,
            hasChildren: !!pageNode.children,
            childrenCount: pageNode.children?.length || 0,
            childrenTypes: pageNode.children?.map((c: any) => c.type) || [],
          });
          
          if (!pageNode.children || pageNode.children.length === 0) {
            console.error(`[${requestId}] ❌❌❌ Page has NO children! But frame counting works with same endpoint...`);
            console.error(`[${requestId}] This is strange. Let's check the API response structure.`);
            console.error(`[${requestId}] Full API response:`, JSON.stringify(nodesData, null, 2));
            throw new Error(`Page ${pageRef.id} has no children - cannot collect frames`);
          }
          
          console.log(`[${requestId}] ✅ Page node: ${pageNode.name} (${pageNode.id}), children: ${pageNode.children.length}`);
          
          // Collect all frames from this page
          // Use the SAME approach as frame counting (which works!)
          const pageName = pageRef.pageName || pageRef.name || 'Unknown Page';
          const frameNodes: Array<{ node: FigmaNode; pageName: string; pageId?: string; sectionId?: string; sectionName?: string }> = [];
          
          console.log(`[${requestId}] ========== COLLECTING FRAMES FROM PAGE ==========`);
          console.log(`[${requestId}] 📄 Page: ${pageNode.name} (${pageNode.id})`);
          console.log(`[${requestId}] 📄 Children count: ${pageNode.children?.length || 0}`);
          
          if (pageNode.children && pageNode.children.length > 0) {
            // Use the EXACT same logic as the plugin (which works!)
            // Plugin logic from code.js line 1248-1265:
            // 1. Direct FRAME children: if (node.type === "FRAME" && !node.name.includes("[NO_INDEX]"))
            // 2. FRAMES in SECTIONS: if (node.type === "SECTION" && node.children) -> for each child: if (child.type === "FRAME" && !child.name.includes("[NO_INDEX]"))
            
          const childrenCount = pageNode.children.length;
          console.log(`[${requestId}] 🔍 Processing ${childrenCount} direct children of page (EXACT plugin logic)...`);
          
          let directFrameCount = 0;
          let sectionFrameCount = 0;
          
          // Collect ALL frames first (fast operation, no need to check time budget during collection)
          // Time budget will be checked before processing/uploading
          for (let index = 0; index < childrenCount; index++) {
            const child = pageNode.children[index];
            console.log(`[${requestId}]   [${index + 1}/${childrenCount}] Child: ${child.type} - "${child.name || 'unnamed'}" (${child.id})`);
            
            // Direct FRAME children (EXACT plugin logic: node.type === "FRAME" && !node.name.includes("[NO_INDEX]") + exclude hidden frames)
            if (child.type === 'FRAME' && !(child.name || '').includes('[NO_INDEX]') && (child.visible === undefined || child.visible !== false)) {
              directFrameCount++;
              console.log(`[${requestId}]     ✅ Found direct FRAME: ${child.name || 'unnamed'}`);
              frameNodes.push({
                node: child,
                pageName,
                pageId: pageNode.id,
                sectionId: undefined,
                sectionName: undefined,
              });
            }
            
            // FRAMES inside SECTIONS (EXACT same logic as frame counting + exclude hidden frames)
            // Frame counting uses: child.children.filter((c: any) => c.type === 'FRAME' && !(c.name || '').includes('[NO_INDEX]') && visible check)
            else if (child.type === 'SECTION' && child.children) {
              console.log(`[${requestId}]     📦 Found SECTION: ${child.name || 'unnamed'} with ${child.children.length} children`);
              // Use EXACT same logic as frame counting: filter frames from section children (exclude hidden)
              const framesInSection = child.children.filter((c: any) => 
                c.type === 'FRAME' && !(c.name || '').includes('[NO_INDEX]') && (c.visible === undefined || c.visible !== false)
              );
              sectionFrameCount += framesInSection.length;
              console.log(`[${requestId}]       Found ${framesInSection.length} FRAME(s) in section (out of ${child.children.length} children)`);
              
              // Add each frame from section
              for (const sectionChild of framesInSection) {
                console.log(`[${requestId}]         ✅ Adding FRAME from section: ${sectionChild.name || 'unnamed'}`);
                frameNodes.push({
                  node: sectionChild,
                  pageName,
                  pageId: pageNode.id,
                  sectionId: child.id,
                  sectionName: child.name || undefined,
                });
              }
            } else {
              console.log(`[${requestId}]     ⏭️ Skipping ${child.type} (not FRAME or SECTION with children)`);
            }
          }
            
            console.log(`[${requestId}] 📊 Frame collection summary: ${directFrameCount} direct frames + ${sectionFrameCount} frames in sections = ${frameNodes.length} total`);
          } else {
            console.warn(`[${requestId}] ⚠️⚠️⚠️ CRITICAL: Page has NO children after fallback!`);
            console.warn(`[${requestId}] This means the API is not returning children structure.`);
            console.warn(`[${requestId}] This is why only 1 frame is being processed instead of 8.`);
          }
          
          console.log(`[${requestId}] ✅ Collected ${frameNodes.length} frames from page "${pageName}"`);
          if (frameNodes.length > 0) {
            console.log(`[${requestId}] 📋 Frame summary:`, {
              directFrames: frameNodes.filter(f => !f.sectionName).length,
              framesInSections: frameNodes.filter(f => f.sectionName).length,
              sections: Array.from(new Set(frameNodes.filter(f => f.sectionName).map(f => f.sectionName))),
            });
          } else {
            console.error(`[${requestId}] ❌ NO FRAMES COLLECTED! Page has ${pageNode.children?.length || 0} direct children.`);
          }
          console.log(`[${requestId}] ==========================================`);
          
          // Store total frames count for this page in processing_state
          // IMPORTANT: Save this to DB immediately so it persists even if processing fails
          const jobStateForPage = (job as any).processing_state || {};
          if (!jobStateForPage[`page_${pageIndex}_total_frames`]) {
            jobStateForPage[`page_${pageIndex}_total_frames`] = frameNodes.length;
            // Save to job for persistence immediately (critical for recovery)
            console.log(`[${requestId}] 💾 Saving page ${pageIndex} total_frames (${frameNodes.length}) to DB immediately...`);
            try {
              await supabaseAdmin
                .from('index_jobs')
                .update({
                  processing_state: {
                    ...jobStateForPage,
                    [`page_${pageIndex}_total_frames`]: frameNodes.length,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq('id', jobId);
              console.log(`[${requestId}] ✅ Saved page ${pageIndex} total_frames to DB`);
            } catch (error) {
              console.error(`[${requestId}] ❌ Failed to save total_frames to DB:`, error);
              // Continue anyway - will try again next invocation
            }
            // Also save to global for later use in this invocation
            (global as any).__pageTotalFrames = { pageIndex, totalFrames: frameNodes.length };
          }
          
          if (frameNodes.length === 0) {
            console.warn(`[${requestId}] ⚠️ No frames found in page "${pageName}", skipping...`);
            // Update job to move to next page
            const updatedNext = pageIndex + 1;
            const newStatus = updatedNext >= frameNodeRefs.length ? 'completed' : 'processing';
            await supabaseAdmin
              .from('index_jobs')
              .update({
                next_frame_index: updatedNext,
                status: newStatus,
                manifest,
                updated_at: new Date().toISOString(),
              })
              .eq('id', jobId);
            
            return res.status(200).json({
              success: true,
              status: newStatus,
              nextFrameIndex: updatedNext,
              totalFrames: frameNodeRefs.length,
            });
          }
          
          // Process frames from this page
          // Organize frames by sections (like the old plugin)
          const framePageName = frameNodes[0]?.pageName || pageName || 'Unknown Page';
          console.log(`[${requestId}] 🎯 Starting to process ${frameNodes.length} frames from page "${framePageName}"...`);
          console.log(`[${requestId}] ⏱️ Time budget before processing: ${hasTimeBudget() ? 'OK' : 'LOW'} (${remainingBudgetMs()}ms remaining)`);
          let manifestPageIndex = manifest.findIndex((p: any) => p.name === framePageName);
          if (manifestPageIndex === -1) {
            // Create page structure with frames and sections
            manifest.push({ 
              id: `page_${manifest.length}`, 
              name: framePageName, 
              frames: [], // Direct frames (no section)
              sections: [] // Sections with frames
            });
            manifestPageIndex = manifest.length - 1;
            pagesAddedThisChunk.push(manifestPageIndex);
          }
          
          const pageManifest = manifest[manifestPageIndex];
          if (!pageManifest.sections) {
            pageManifest.sections = [];
          }
          
          // Group frames by section
          const framesBySection = new Map<string, any[]>();
          const directFrames: any[] = [];
          
          // Process multiple frames per invocation for faster processing
          // Calculate how many frames we can process based on time budget and chunk size
          // Get total frames for this page (stored when we first collected frames)
          const jobState = (job as any).processing_state || {};
          const totalFramesInPage = jobState[`page_${pageIndex}_total_frames`] || frameNodes.length;
          const currentPageFramesProcessed = jobState[`page_${pageIndex}_frames_processed`] || 0;
          
          // Calculate batch size for this page (similar to frame references)
          const pageBatchSize = Math.min(
            calculateDynamicBatchSize(frameNodes.length),
            frameNodes.length - currentPageFramesProcessed,
            effectiveChunkSize - chunk.length
          );
          
          console.log(`[${requestId}] 🔄 Processing up to ${pageBatchSize} frames from page (${currentPageFramesProcessed}/${frameNodes.length} already processed)`);
          console.log(`[${requestId}] ⏱️ Time budget: ${hasTimeBudget() ? 'OK' : 'LOW'} (${remainingBudgetMs()}ms remaining)`);
          
          // Process multiple frames (up to pageBatchSize)
          let framesProcessedThisRound = 0;
          for (let i = 0; i < pageBatchSize && (currentPageFramesProcessed + i) < frameNodes.length; i++) {
            if (!hasTimeBudget()) {
              console.log(`[${requestId}] ⏳ Time budget reached, stopping frame processing`);
              break;
            }
            
            const frameIndex = currentPageFramesProcessed + i;
            const frameInfo = frameNodes[frameIndex];
            console.log(`[${requestId}] 🎯 Processing frame ${frameIndex + 1}/${frameNodes.length}: ${frameInfo.node.name || frameInfo.node.id}...`);
            
            try {
              const frameStartTime = Date.now();
              const frameData = await processFrameData(
                frameInfo.node,
                frameIndex,
                job.file_key,
                document || { id: '0:0', name: 'Unknown', type: 'DOCUMENT' } as FigmaNode,
                null,
                [],
                frameInfo.pageName,
                frameInfo.sectionName
              );
              const frameProcessTime = Date.now() - frameStartTime;
              
              console.log(`[${requestId}] ✅ Frame processed in ${frameProcessTime}ms`);
              
              // Organize by section
              if (frameInfo.sectionName) {
                if (!framesBySection.has(frameInfo.sectionName)) {
                  framesBySection.set(frameInfo.sectionName, []);
                }
                framesBySection.get(frameInfo.sectionName)!.push(frameData);
              } else {
                directFrames.push(frameData);
              }
              
              // Check chunk size before adding
              const frameSizeBytes = Buffer.byteLength(JSON.stringify(frameData), 'utf8');
              if (chunkSizeBytes + frameSizeBytes > MAX_CHUNK_SIZE_BYTES && chunk.length > 0) {
                console.log(`[${requestId}] ⏳ Chunk size limit reached, stopping frame processing`);
                break;
              }
              
              // Add to chunk for upload
              const manifestFrameIndex = directFrames.length + Array.from(framesBySection.values()).reduce((sum, arr) => sum + arr.length, 0) - 1;
              chunkManifestEntries.push({ pageIndex: manifestPageIndex, frameIndex: manifestFrameIndex });
              chunk.push({ pageIndex: manifestPageIndex, frameIndex: manifestFrameIndex, frame: frameData });
              chunkSizeBytes += frameSizeBytes;
              framesProcessedThisRound++;
              
              console.log(`[${requestId}] ✅ Frame added to chunk. Chunk size: ${chunk.length}, Progress: ${frameIndex + 1}/${frameNodes.length}`);
            } catch (error: any) {
              console.error(`[${requestId}] ❌ Error processing frame ${frameInfo.node.id}:`, error);
              // For frame-level errors, we can continue, but log the error
              // If it's a critical error (e.g., authentication, API failure), stop the job
              const errorMessage = error?.message || String(error);
              if (errorMessage.includes('401') || errorMessage.includes('403') || 
                  errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ||
                  errorMessage.includes('Invalid token') || errorMessage.includes('Token expired')) {
                // Critical authentication error - stop the job
                await markJobAsFailed(
                  supabaseAdmin, 
                  jobId, 
                  `Authentication error processing frame: ${errorMessage}`,
                  requestId
                );
                return res.status(200).json({
                  success: false,
                  status: 'failed',
                  error: `Authentication error: ${errorMessage}`,
                  nextFrameIndex: currentPageFramesProcessed + i,
                  totalFrames: frameNodes.length,
                });
              }
              // For other frame errors, continue with next frame
              console.warn(`[${requestId}] ⚠️ Non-critical frame error, continuing...`);
            }
          }
          
          if (framesProcessedThisRound === 0 && currentPageFramesProcessed >= frameNodes.length) {
            console.log(`[${requestId}] ✅ All frames from this page have been processed (${currentPageFramesProcessed}/${frameNodes.length})`);
          }
          
          // Update manifest with organized frames
          // Add direct frames (frames without sections)
          pageManifest.frames.push(...directFrames);
          
          // Add sections with their frames
          for (const [sectionName, sectionFrames] of framesBySection.entries()) {
            let sectionIndex = pageManifest.sections.findIndex((s: any) => s.name === sectionName);
            if (sectionIndex === -1) {
              pageManifest.sections.push({ name: sectionName, frames: [] });
              sectionIndex = pageManifest.sections.length - 1;
            }
            pageManifest.sections[sectionIndex].frames.push(...sectionFrames);
          }
          
          console.log(`[${requestId}] 📋 Organized frames: ${directFrames.length} direct frames, ${framesBySection.size} sections`);
          console.log(`[${requestId}] ✅ Processed ${framesProcessedThisRound} frames from page in this invocation`);
          
          // For page references, we've processed frames from the current page
          // We'll update next_frame_index after upload (stay on same page if more frames remain, move to next if done)
          
        } catch (error: any) {
          console.error(`[${requestId}] ❌ CRITICAL ERROR processing page ${pageRef.id}:`, error.message);
          // Stop job on critical page processing error
          const errorMessage = `Critical error processing page "${pageRef.pageName || pageRef.name || pageRef.id}": ${error.message}`;
          await markJobAsFailed(supabaseAdmin, jobId, errorMessage, requestId);
          
          return res.status(200).json({
            success: false,
            status: 'failed',
            error: errorMessage,
            nextFrameIndex: pageIndex,
            totalFrames: frameNodeRefs.length,
          });
        }
      } else {
        // Original logic: frame_node_refs contain actual frame references
        // Fetch full node data from Figma API for frames in this chunk
        const nodeIdsToFetch = frameNodeRefs
          .slice(nextFrameIndex, nextFrameIndex + effectiveChunkSize)
          .map((ref: any) => ref.id)
          .filter(Boolean);
        
        let nodesMap: Record<string, FigmaNode> = {};
        if (nodeIdsToFetch.length > 0) {
          try {
            console.log(`[${requestId}] 📥 Fetching ${nodeIdsToFetch.length} node(s) from Figma API...`);
            const FIGMA_API_BASE = 'https://api.figma.com/v1';
            const idsParam = nodeIdsToFetch.join(',');
            const nodesUrl = `${FIGMA_API_BASE}/files/${job.file_key}/nodes?ids=${idsParam}`;
            
            const nodesResponse = await fetch(nodesUrl, {
              headers: {
                'X-Figma-Token': figmaToken,
              },
              signal: AbortSignal.timeout(15000), // 15s timeout for node fetch
            });
            
            if (nodesResponse.ok) {
              const nodesData = await nodesResponse.json() as { nodes: Record<string, { document: FigmaNode }> };
              for (const [nodeId, nodeData] of Object.entries(nodesData.nodes || {})) {
                if (nodeData?.document) {
                  nodesMap[nodeId] = nodeData.document;
                }
              }
              console.log(`[${requestId}] ✅ Fetched ${Object.keys(nodesMap).length} node(s) from Figma API`);
            } else {
              const errorText = await nodesResponse.text().catch(() => 'Unknown error');
              console.warn(`[${requestId}] ⚠️ Failed to fetch nodes from Figma API: ${nodesResponse.status} - ${errorText}`);
              
              // Check if this is a critical authentication error
              if (nodesResponse.status === 401 || nodesResponse.status === 403) {
                const errorMessage = `Figma API authentication failed (${nodesResponse.status}): ${errorText}`;
                await markJobAsFailed(supabaseAdmin, job.id, errorMessage, requestId);
                return res.status(200).json({
                  success: false,
                  status: 'failed',
                  error: errorMessage,
                  nextFrameIndex,
                  totalFrames,
                });
              }
            }
          } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error(`[${requestId}] ❌ Error fetching nodes from Figma API:`, errorMessage);
            
            // Check if this is a critical error
            if (errorMessage.includes('401') || errorMessage.includes('403') ||
                errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ||
                errorMessage.includes('Invalid token') || errorMessage.includes('Token expired')) {
              const criticalErrorMessage = `Critical Figma API error: ${errorMessage}`;
              await markJobAsFailed(supabaseAdmin, job.id, criticalErrorMessage, requestId);
              return res.status(200).json({
                success: false,
                status: 'failed',
                error: criticalErrorMessage,
                nextFrameIndex,
                totalFrames,
              });
            }
            // For non-critical errors, continue with minimal node data
            console.warn(`[${requestId}] ⚠️ Non-critical API error, continuing with minimal data...`);
          }
        }
        
        // Process frames in chunks
        for (let i = nextFrameIndex; i < frameNodeRefs.length && chunk.length < effectiveChunkSize; i++) {
          if (!hasTimeBudget()) {
            console.log(`[${requestId}] ⏳ Time budget reached while processing frame references; stopping chunk.`);
            break;
          }
          const nodeRef = frameNodeRefs[i];
          if (!nodeRef) continue;
          
          try {
            // Try to get full node data from API fetch, fallback to minimal nodeData from frame_node_refs
            let frameNode: FigmaNode | null = nodesMap[nodeRef.id] || null;
            
            if (!frameNode && nodeRef.nodeData) {
              // Use minimal node data as fallback (but this won't have children for text extraction)
              frameNode = nodeRef.nodeData as FigmaNode;
            }
            
            if (!frameNode) {
              console.warn(`[${requestId}] ⚠️ No node data available for frame ${nodeRef.id}, skipping...`);
              continue;
            }
            
            // Skip hidden frames
            if (frameNode.visible === false) {
              console.log(`[${requestId}] ⏭️ Skipping hidden frame: ${frameNode.name || nodeRef.id}`);
              continue;
            }
            
            // Process frame data
              const frameData = await processFrameData(
              frameNode,
              i,
              job.file_key,
              document || { id: '0:0', name: 'Unknown', type: 'DOCUMENT' } as FigmaNode,
              null,
              [],
              nodeRef.pageName || 'Unknown Page',
              nodeRef.sectionName
            );
            
            // Estimate size
            const frameJson = JSON.stringify(frameData);
            const frameSizeBytes = Buffer.byteLength(frameJson, 'utf8');
            
            // Check if adding this frame would exceed max chunk size
            if (chunkSizeBytes + frameSizeBytes > MAX_CHUNK_SIZE_BYTES && chunk.length > 0) {
              break; // Stop before adding this frame
            }
            
            // Group frames by page for manifest structure
            const pageName = nodeRef.pageName || 'Unknown Page';
            let pageIndex = manifest.findIndex((p: any) => p.name === pageName);
            if (pageIndex === -1) {
              manifest.push({ id: `page_${manifest.length}`, name: pageName, frames: [] });
              pageIndex = manifest.length - 1;
              pagesAddedThisChunk.push(pageIndex);
            }
            
            const frameIndex = manifest[pageIndex].frames.length;
            manifest[pageIndex].frames.push(frameData);
            chunkManifestEntries.push({ pageIndex, frameIndex });
            
            chunk.push({ pageIndex, frameIndex, frame: frameData });
            chunkSizeBytes += frameSizeBytes;
          } catch (error) {
            console.error(`❌ Error processing frame ${nodeRef.id}:`, error);
            // Continue with next frame
          }
        }
      }
    } else {
      // Use existing flatFrames (backward compatibility)
      for (let i = nextFrameIndex; i < flatFrames.length && chunk.length < effectiveChunkSize; i++) {
        const frame = flatFrames[i];
        const frameJson = JSON.stringify(frame.frame);
        const frameSizeBytes = Buffer.byteLength(frameJson, 'utf8');
        
        // Check if adding this frame would exceed max chunk size
        if (chunkSizeBytes + frameSizeBytes > MAX_CHUNK_SIZE_BYTES && chunk.length > 0) {
          break; // Stop before adding this frame
        }
        
        chunk.push(frame);
        chunkSizeBytes += frameSizeBytes;
      }
    }
    
    if (chunk.length === 0) {
      // If nothing processed this round, check if we're done
      // For page references: check if we've processed all pages
      // For frame references: check if we've processed all frames
      const isPageReference = frameNodeRefs.length > 0 && (frameNodeRefs[0]?.nodeData?.type === 'PAGE' || frameNodeRefs[0]?.type === 'PAGE');
      
      console.log(`[${requestId}] ⚠️ WARNING: chunk.length === 0! Debug info:`, {
        isPageReference,
        nextFrameIndex,
        totalFrames,
        frameNodeRefsLength: frameNodeRefs.length,
        hasTimeBudget: hasTimeBudget(),
        remainingBudget: remainingBudgetMs(),
      });
      
      if (isPageReference) {
        // For page references, nextFrameIndex is the page index
        const pageIndex = nextFrameIndex;
        if (pageIndex >= frameNodeRefs.length) {
          console.log(`[${requestId}] ✅ All pages processed. Job completed.`);
          return res.status(200).json({ success: true, status: 'completed', indexId: job.index_file_id });
        }
        // Still have pages to process, but no frames were processed this round
        // This could be a time budget issue - retry
        console.log(`[${requestId}] ⏳ No frames processed from page ${pageIndex + 1}/${frameNodeRefs.length} (time budget or size). Will retry.`);
        return res.status(200).json({ success: true, status: 'processing', nextFrameIndex, totalFrames });
      } else {
        // For frame references, check if we've processed all frames
        if (nextFrameIndex >= totalFrames) {
          console.log(`[${requestId}] ✅ All frames processed. Job completed.`);
          return res.status(200).json({ success: true, status: 'completed', indexId: job.index_file_id });
        }
        // Still have frames to process, but none were processed this round
        console.log(`[${requestId}] ⏳ No frames processed this invocation (time budget or size). Will retry.`);
        return res.status(200).json({ success: true, status: 'processing', nextFrameIndex, totalFrames });
      }
    }

    // If we're out of time before upload, bail out and retry without losing state
    if (!hasTimeBudget()) {
      console.log(`[${requestId}] ⏳ Time budget reached before upload. Returning to retry with current progress.`);
      revertManifestUpdates();
      return res.status(200).json({ success: true, status: 'processing', nextFrameIndex, totalFrames });
    }
    
    const actualChunkSizeMB = (chunkSizeBytes / 1024 / 1024).toFixed(2);
    console.log(`[${requestId}] 📦 Chunk prepared: ${chunk.length} frames, ~${actualChunkSizeMB}MB`);
    console.log(`[${requestId}] 📦 Chunk frame indices: ${nextFrameIndex} to ${nextFrameIndex + chunk.length - 1}`);

    // Fast mode: skip image upload, just persist manifest/progress
    if (fastMode) {
      console.log(`[${requestId}] ⚡ Fast mode: skipping image uploads for this chunk.`);
    } else {
      const bucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
      const documentId = String(job.project_id || '0:0');
      
      console.log(`[${requestId}] 🚀 Starting uploadChunkFrames...`);
      const uploadStartTime = Date.now();
      
      // Increased upload timeout - parallel processing allows more time per batch
      // For 100 frames: use 20s timeout (allows 6 frames * 3-4s each)
      // For larger files: use 15s (more conservative)
      const baseTimeout = totalFrames > 500 ? 15000 : 20000;
      const uploadTimeout = Math.max(
        10000, // Minimum 10s (was 5s - too short)
        Math.min(baseTimeout, remainingBudgetMs() - 2000) // Leave 2s buffer (was 500ms)
      );
      console.log(`[${requestId}] ⏱️ Upload timeout set to ${uploadTimeout}ms (remaining budget: ${remainingBudgetMs()}ms)`);
      const uploadPromise = uploadChunkFrames({
        supabaseAdmin,
        bucket,
        userId: job.user_id,
        documentId,
        chunk,
        fileKey: job.file_key,
        jobManifest: manifest,
        figmaToken,
        imageQuality, // Pass image quality to upload function
        requestId,
      });
      
      // Race against timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Upload timeout after ${uploadTimeout}ms`)), uploadTimeout);
      });
      
      let processedFrames: PageFrame[] = [];
      try {
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        processedFrames = result as PageFrame[];
      } catch (error: any) {
        const uploadTime = Date.now() - uploadStartTime;
        console.error(`[${requestId}] ❌ uploadChunkFrames failed after ${uploadTime}ms:`, error.message);
        
        // Check if this is a critical error that should stop the job
        const errorMessage = error?.message || String(error);
        const isCriticalError = 
          errorMessage.includes('401') || errorMessage.includes('403') ||
          errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ||
          errorMessage.includes('Invalid token') || errorMessage.includes('Token expired') ||
          errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('Network error') || errorMessage.includes('Connection failed') ||
          errorMessage.includes('Failed to fetch frame images'); // Critical if we can't get image URLs at all

        if (isCriticalError) {
          // Critical error - stop the job
          const criticalErrorMessage = `Critical upload error: ${errorMessage}`;
          await markJobAsFailed(supabaseAdmin, job.id, criticalErrorMessage, requestId);
          
          return res.status(200).json({
            success: false,
            status: 'failed',
            error: criticalErrorMessage,
            nextFrameIndex,
            totalFrames,
          });
        }

        // For non-critical errors (like individual frame failures), try to continue with processed frames
        // If we got at least some frames processed, continue with those
        if (processedFrames.length > 0) {
          console.log(`[${requestId}] ⚠️ Some frames failed, but continuing with ${processedFrames.length}/${chunk.length} successful frames`);
          // Update chunk to only include successfully processed frames for manifest update
          chunk = processedFrames;
        } else {
          // No frames succeeded - revert and retry with smaller chunk
          revertManifestUpdates();
          
          // For timeout errors, suggest smaller chunk but don't fail completely
          const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
          const retryMessage = isTimeout 
            ? `Chunk processing paused: Upload timeout after ${uploadTimeout}ms. Will retry with smaller batch.`
            : `Chunk processing paused: ${errorMessage}. Will retry with smaller batch.`;
          
          // Reduce chunk size more aggressively for timeouts
          const reductionFactor = isTimeout ? 0.4 : 0.5; // Reduce by 60% for timeouts, 50% for other errors
          const recommendedChunkSize = Math.max(1, Math.floor((requestedChunkSize || effectiveChunkSize || 1) * reductionFactor)) || 1;
          
          // Update job with retry message
          // Keep error message for debugging but limit length
          const errorToStore = retryMessage.substring(0, 500);
          
          await supabaseAdmin
            .from('index_jobs')
            .update({
              status: 'processing',
              error: errorToStore,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          
          return res.status(200).json({
            success: true,
            status: 'processing',
            retryable: true,
            error: retryMessage,
            nextFrameIndex,
            totalFrames,
            recommendedChunkSize,
          });
        }
      }
      
      const uploadTime = Date.now() - uploadStartTime;
      const successfulCount = processedFrames.length || chunk.length;
      console.log(`[${requestId}] ✅ uploadChunkFrames completed in ${uploadTime}ms: ${successfulCount}/${chunk.length} frames processed`);
      
      // Update chunk to only include successfully processed frames
      if (processedFrames.length > 0 && processedFrames.length < chunk.length) {
        chunk = processedFrames;
        console.log(`[${requestId}] ⚠️ Updated chunk to ${chunk.length} successfully processed frames`);
      }
    }

    // Check if we're processing page references or frame references
    const firstRef = frameNodeRefs[0];
    const isPageReference = firstRef?.nodeData?.type === 'PAGE' || firstRef?.type === 'PAGE';
    
    // Get updatedProcessingState if it was set (for page references)
    let updatedProcessingState: any = (global as any).__updatedProcessingState;
    if (updatedProcessingState) {
      delete (global as any).__updatedProcessingState; // Clean up
    }
    
    let updatedNext: number;
    let actualTotalFrames = totalFrames;
    
    if (isPageReference) {
      // For page references, nextFrameIndex is the page index
      const currentPageIndex = nextFrameIndex;
      const jobState = (job as any).processing_state || {};
      const currentPageFramesProcessed = jobState[`page_${currentPageIndex}_frames_processed`] || 0;
      const framesProcessedThisRound = chunk.length;
      const totalFramesProcessedFromPage = currentPageFramesProcessed + framesProcessedThisRound;
      
      // Get total frames for this page (should be stored when we first collected frames)
      // If not found, try to get it from the global variable (set during frame collection)
      const pageTotalFramesGlobal = (global as any).__pageTotalFrames;
      let totalFramesInPage = jobState[`page_${currentPageIndex}_total_frames`] || 0;
      if (totalFramesInPage === 0 && pageTotalFramesGlobal && pageTotalFramesGlobal.pageIndex === currentPageIndex) {
        totalFramesInPage = pageTotalFramesGlobal.totalFrames;
        console.log(`[${requestId}] 📊 Using total_frames from current invocation: ${totalFramesInPage}`);
      }
      
      // Update processing state
      updatedProcessingState = {
        ...jobState,
        [`page_${currentPageIndex}_frames_processed`]: totalFramesProcessedFromPage,
        current_page_index: currentPageIndex,
      };
      
      // Ensure total_frames is included in processing state
      if (totalFramesInPage > 0 && !updatedProcessingState[`page_${currentPageIndex}_total_frames`]) {
        updatedProcessingState[`page_${currentPageIndex}_total_frames`] = totalFramesInPage;
      }
      
      // Check if we've finished this page
      // Only move to next page if we've processed ALL frames from current page
      if (totalFramesInPage > 0 && totalFramesProcessedFromPage >= totalFramesInPage) {
        // All frames from this page have been processed - move to next page
        updatedNext = currentPageIndex + 1;
        console.log(`[${requestId}] ✅ Completed page ${currentPageIndex + 1}: ${totalFramesProcessedFromPage}/${totalFramesInPage} frames. Moving to next page.`);
      } else if (framesProcessedThisRound > 0) {
        // We processed frames this round - stay on same page (more frames to process)
        updatedNext = currentPageIndex;
        console.log(`[${requestId}] 📊 Processed ${framesProcessedThisRound} frame(s) from page ${currentPageIndex + 1}. Progress: ${totalFramesProcessedFromPage}/${totalFramesInPage || 'unknown'} frames. Staying on same page.`);
      } else {
        // No frames processed this round - could be time budget or error
        // If we have no info about total frames, stay on same page to retry
        if (totalFramesInPage === 0) {
          updatedNext = currentPageIndex;
          console.log(`[${requestId}] ⚠️ No frames processed this round and no total frames info (totalFramesInPage=${totalFramesInPage}). This might indicate a problem with frame collection. Staying on same page to retry.`);
        } else if (totalFramesProcessedFromPage >= totalFramesInPage) {
          // Actually done with this page
          updatedNext = currentPageIndex + 1;
          console.log(`[${requestId}] ✅ Page ${currentPageIndex + 1} completed: ${totalFramesProcessedFromPage}/${totalFramesInPage} frames. Moving to next page.`);
        } else {
          // Not done yet, but no frames processed - stay on same page to retry
          updatedNext = currentPageIndex;
          console.log(`[${requestId}] ⏳ No frames processed this round, but page not complete (${totalFramesProcessedFromPage}/${totalFramesInPage}). Staying on same page to retry.`);
        }
      }
      
      // Get updated total_frames from job (may have been updated during processing)
      const updatedJobResp = await supabaseAdmin
        .from('index_jobs')
        .select('total_frames')
        .eq('id', jobId)
        .single();
      
      actualTotalFrames = updatedJobResp.data?.total_frames || totalFrames;
    } else {
      // For frame references, nextFrameIndex refers to frame index
      updatedNext = nextFrameIndex + chunk.length;
      actualTotalFrames = totalFrames;
    }
    
    // For page references, check if we've processed all pages AND all frames in each page
    // For frame references, check if we've processed all frames
    let newStatus: string;
    if (isPageReference) {
      // Check if we've processed all pages
      if (updatedNext >= frameNodeRefs.length) {
        // All pages processed - but verify all frames in last page are done
        const lastPageIndex = frameNodeRefs.length - 1;
        const jobState = updatedProcessingState || (job as any).processing_state || {};
        const lastPageFramesProcessed = jobState[`page_${lastPageIndex}_frames_processed`] || 0;
        const lastPageTotalFrames = jobState[`page_${lastPageIndex}_total_frames`] || 0;
        
        if (lastPageTotalFrames > 0 && lastPageFramesProcessed < lastPageTotalFrames) {
          // Last page not fully processed yet
          newStatus = 'processing';
          console.log(`[${requestId}] ⚠️ All pages reached but last page not complete: ${lastPageFramesProcessed}/${lastPageTotalFrames} frames`);
        } else {
          newStatus = 'completed';
        }
      } else {
        newStatus = 'processing';
      }
    } else {
      newStatus = updatedNext >= actualTotalFrames ? 'completed' : 'processing';
    }
    
    if (isPageReference) {
      console.log(`[${requestId}] 📊 Progress: ${updatedNext}/${frameNodeRefs.length} pages (${Math.round(updatedNext / frameNodeRefs.length * 100)}%)`);
    } else {
      console.log(`[${requestId}] 📊 Progress: ${updatedNext}/${actualTotalFrames} frames (${Math.round(updatedNext / actualTotalFrames * 100)}%)`);
    }
    console.log(`[${requestId}] 📊 New status: ${newStatus}`);

    // Calculate manifest size
    const manifestSizeBytes = Buffer.byteLength(JSON.stringify(manifest), 'utf8');
    const manifestSizeMB = manifestSizeBytes / 1024 / 1024;
    const chunksProcessed = Math.floor(updatedNext / Math.max(1, effectiveChunkSize));
    
    // Strategy: Update manifest:
    // 1. Every 3 chunks (to reduce DB write time for large manifests)
    // 2. If manifest is small (< 500KB, update every chunk is fine)
    // 3. Always update on completion (critical!)
    const shouldUpdateManifest = 
      newStatus === 'completed' || 
      manifestSizeMB < 0.5 || 
      chunksProcessed % 3 === 0;
    
    console.log(`[${requestId}] 📦 Manifest size: ${manifestSizeMB.toFixed(2)}MB, Chunks processed: ${chunksProcessed}, Update manifest: ${shouldUpdateManifest}`);

    // Build update payload
    const updatePayload: any = {
      next_frame_index: updatedNext,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    
    // Clear error field if processing is successful (not retrying)
    // Only keep errors for critical failures, not temporary retries
    const existingError = job.error || '';
    const isNonCriticalError = existingError && (
      existingError.includes('timeout') ||
      existingError.includes('Timeout') ||
      existingError.includes('Will retry') ||
      existingError.includes('paused') ||
      existingError.includes('smaller batch')
    );
    
    // If we successfully processed frames and error is non-critical, clear it
    if (chunk.length > 0 && isNonCriticalError && newStatus === 'processing') {
      updatePayload.error = null; // Clear non-critical errors when making progress
      console.log(`[${requestId}] 🧹 Clearing non-critical error: "${existingError.substring(0, 100)}..."`);
    } else if (newStatus === 'completed') {
      // Always clear errors on completion
      updatePayload.error = null;
      console.log(`[${requestId}] ✅ Job completed - clearing all errors`);
    }
    
    // Include processing_state if we have it (for page references tracking)
    if (updatedProcessingState && Object.keys(updatedProcessingState).length > 0) {
      // Also include page total frames if we stored it
      const pageTotalFrames = (global as any).__pageTotalFrames;
      if (pageTotalFrames) {
        updatedProcessingState[`page_${pageTotalFrames.pageIndex}_total_frames`] = pageTotalFrames.totalFrames;
        delete (global as any).__pageTotalFrames;
      }
      updatePayload.processing_state = updatedProcessingState;
    }
    
    // Always include manifest - we need it for recovery if job fails
    // But log the size so we can monitor performance
    updatePayload.manifest = manifest;
    if (shouldUpdateManifest) {
      console.log(`[${requestId}] 💾 Updating job with manifest (${manifestSizeMB.toFixed(2)}MB)...`);
    } else {
      console.log(`[${requestId}] 💾 Updating job with manifest (${manifestSizeMB.toFixed(2)}MB) - skipping this time to save DB write time`);
      // Actually, we need to update it - remove the conditional
      console.log(`[${requestId}] 💾 Actually updating manifest anyway (needed for recovery)...`);
    }
    
    const updateStartTime = Date.now();

    if (newStatus === 'completed') {
      console.log(`[${requestId}] 🎉 Job completed! Saving index to database...`);
      const saveIndexStartTime = Date.now();
      
      const fileSizeBytes = Buffer.byteLength(JSON.stringify(manifest), 'utf8');
      console.log(`[${requestId}] 📊 Final manifest size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);
      const allFrameTags = new Set<string>();
      const allCustomTags = new Set<string>();
      const allNamingTags = new Set<string>();
      const allSizeTags = new Set<string>();

      manifest.forEach((page: any) => {
        // Process direct frames
        if (Array.isArray(page.frames)) {
          page.frames.forEach((frame: any) => {
            const ft: string[] = Array.isArray(frame.tags) ? frame.tags : [];
            const nameParts = deriveNamingTags(frame.name || '');
            const sizeTag = getSizeTag(frame.width, frame.height);

            nameParts.forEach((t) => allNamingTags.add(t));
            if (sizeTag) allSizeTags.add(sizeTag);

            ft.forEach((t) => {
              if (t && typeof t === 'string') {
                const isSize = /^\d+x\d+$/i.test(t);
                if (!isSize && !nameParts.includes(t)) {
                  allCustomTags.add(t);
                }
              }
            });

            ft.forEach((t) => t && allFrameTags.add(t));
          });
        }
        // Process frames in sections
        if (Array.isArray(page.sections)) {
          page.sections.forEach((section: any) => {
            if (Array.isArray(section.frames)) {
              section.frames.forEach((frame: any) => {
                const ft: string[] = Array.isArray(frame.tags) ? frame.tags : [];
                const nameParts = deriveNamingTags(frame.name || '');
                const sizeTag = getSizeTag(frame.width, frame.height);

                nameParts.forEach((t) => allNamingTags.add(t));
                if (sizeTag) allSizeTags.add(sizeTag);

                ft.forEach((t) => {
                  if (t && typeof t === 'string') {
                    const isSize = /^\d+x\d+$/i.test(t);
                    if (!isSize && !nameParts.includes(t)) {
                      allCustomTags.add(t);
                    }
                  }
                });

                ft.forEach((t) => t && allFrameTags.add(t));
              });
            }
          });
        }
      });

      const documentId = String(job.project_id || '0:0');
      
      // Extract all frame IDs from manifest for quick change detection
      const frameIds: string[] = [];
      manifest.forEach((page: any) => {
        if (Array.isArray(page.frames)) {
          page.frames.forEach((frame: any) => {
            if (frame.id && typeof frame.id === 'string') {
              frameIds.push(frame.id);
            }
          });
        }
        // Also check sections
        if (Array.isArray(page.sections)) {
          page.sections.forEach((section: any) => {
            if (Array.isArray(section.frames)) {
              section.frames.forEach((frame: any) => {
                if (frame.id && typeof frame.id === 'string') {
                  frameIds.push(frame.id);
                }
              });
            }
          });
        }
      });
      
      // Get version info from job
      // Note: If version info is missing from job (e.g., job created before migration),
      // it will be NULL in the index. The user should re-index to get version info.
      const figmaVersion = (job as any).figma_version || null;
      const figmaLastModified = (job as any).figma_last_modified || null;
      
      if (!figmaVersion || !figmaLastModified) {
        console.warn(`[${requestId}] ⚠️ Version info missing from job (job created before migration?). Version info will be NULL in index.`);
      }
      
      const indexData: any = {
        user_id: job.user_id,
        project_id: documentId,
        figma_file_key: job.file_key,
        file_name: job.file_name,
        index_data: manifest,
        frame_count: frameIds.length,
        uploaded_at: new Date().toISOString(),
        frame_tags: Array.from(allFrameTags),
        custom_tags: Array.from(allCustomTags),
        naming_tags: Array.from(allNamingTags),
        size_tags: Array.from(allSizeTags),
        file_size: fileSizeBytes,
        // Store version info for incremental re-indexing
        figma_version: figmaVersion,
        figma_last_modified: figmaLastModified,
        frame_ids: frameIds, // Store all frame IDs for quick comparison
      };
      
      console.log(`[${requestId}] 📊 Saving index with version info:`, {
        figma_version: figmaVersion,
        figma_last_modified: figmaLastModified,
        frame_ids_count: frameIds.length,
      });

      // Check for existing index by figma_file_key + user_id (not project_id)
      // This prevents duplicates when the same file is indexed via plugin and API token
      const { data: existingIndexRow } = await supabaseAdmin
        .from('index_files')
        .select(
          'id, user_id, project_id, figma_file_key, file_name, index_data, frame_tags, custom_tags, naming_tags, size_tags, file_size, uploaded_at'
        )
        .eq('user_id', job.user_id)
        .eq('figma_file_key', job.file_key)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
      if (existingIndexRow) {
        console.log('🗂️ process-index-job found existing index to archive', {
          indexId: existingIndexRow.id,
          projectId: existingIndexRow.project_id,
          newProjectId: documentId,
          figmaFileKey: existingIndexRow.figma_file_key,
          userId: existingIndexRow.user_id,
          note: 'Detected duplicate index for same file_key + user_id (may be from plugin or API token)',
        });
        await archiveExistingIndex({
          supabaseAdmin,
          existingIndex: existingIndexRow as unknown as ArchiveableIndexRow,
          storageBucket,
        });
      }

      console.log(`[${requestId}] 💾 Inserting index into index_files table...`);
      let insertion = await supabaseAdmin.from('index_files').insert(indexData).select('id').single();
      if (insertion.error && /(file_size|frame_count)/i.test(insertion.error.message || '')) {
        console.log(`[${requestId}] ⚠️ file_size/frame_count column error, retrying without optional metadata...`);
        const { file_size, frame_count, ...indexWithoutSize } = indexData;
        insertion = await supabaseAdmin.from('index_files').insert(indexWithoutSize).select('id').single();
      }

      if (!insertion.error) {
        console.log(`[${requestId}] ✅ Index saved with ID: ${insertion.data?.id}`);
        // Delete any other indices for the same file_key + user_id (regardless of project_id)
        // This ensures only one active index exists per file per user
        console.log(`[${requestId}] 🗑️ Cleaning up duplicate indices...`);
        const deleteResult = await supabaseAdmin
          .from('index_files')
          .delete()
          .eq('user_id', job.user_id)
          .eq('figma_file_key', job.file_key)
          .neq('id', insertion.data?.id);
        console.log(`[${requestId}] 🗑️ Delete result:`, deleteResult.error ? `Error: ${deleteResult.error.message}` : 'Success');
      }

      if (insertion.error) {
        console.error(`[${requestId}] ❌ Failed to save index:`, insertion.error);
        updatePayload.status = 'failed';
        updatePayload.error = insertion.error.message;
        await supabaseAdmin.from('index_jobs').update(updatePayload).eq('id', jobId);
        return res.status(500).json({ success: false, error: 'Failed to save index', details: insertion.error.message });
      }

      updatePayload.index_file_id = insertion.data?.id || null;
      const saveIndexTime = Date.now() - saveIndexStartTime;
      console.log(`[${requestId}] ✅ Index saved in ${saveIndexTime}ms`);
      
      // If this is part of a split job, check if all jobs are completed and merge them
      if (job.parent_job_id) {
        console.log(`[${requestId}] 🔗 This job is part of a split group (parent: ${job.parent_job_id})`);
        // Use parent_job_id as the group identifier
        await mergeSplitJobs(supabaseAdmin, job.parent_job_id, requestId);
      } else if (job.total_jobs && job.total_jobs > 1) {
        // This is the parent job itself, check if all child jobs are completed
        console.log(`[${requestId}] 🔗 This is a parent job with ${job.total_jobs} child jobs`);
        await mergeSplitJobs(supabaseAdmin, jobId, requestId);
      }
    }

    console.log(`[${requestId}] 💾 Updating job status in database...`);
    const updateResult = await supabaseAdmin.from('index_jobs').update(updatePayload).eq('id', jobId);
    const updateTime = Date.now() - updateStartTime;
    
    if (updateResult.error) {
      console.error(`[${requestId}] ❌ Failed to update job:`, updateResult.error);
    } else {
      console.log(`[${requestId}] ✅ Job updated in ${updateTime}ms`);
    }

    const progress = Math.round((updatedNext / actualTotalFrames) * 100);
    const responsePayload: any = {
      success: true,
      status: newStatus,
      progress,
      nextFrameIndex: updatedNext,
      totalFrames: actualTotalFrames,
    };

    if (newStatus === 'completed') {
      responsePayload.indexId = updatePayload.index_file_id;
      responsePayload.stats = {
        totalFrames: actualTotalFrames,
        totalPages: manifest.length,
        fileSize: Buffer.byteLength(JSON.stringify(manifest), 'utf8'),
      };

      // Send email notifications for completed job
      console.log(`[${requestId}] 📧 ===== STARTING EMAIL NOTIFICATION PROCESS =====`);
      console.log(`[${requestId}] 📧 Job ID: ${jobId}, User ID: ${job.user_id}, Status: completed`);
      try {
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', job.user_id)
          .single();
          
        if (userError) {
          console.error(`[${requestId}] 📧 ❌ Error fetching user for email notifications:`, {
            message: userError.message,
            code: userError.code,
            details: userError.details
          });
        } else {
          console.log(`[${requestId}] 📧 ✅ User fetched for email notifications:`, {
            email: user?.email || 'NO EMAIL',
            fullName: user?.full_name || 'NO NAME',
            userId: job.user_id
          });
        }

        if (user && user.email) {
          console.log(`[${requestId}] 📧 Preparing to send email notifications to ${user.email}...`);
          
          // Send email to user
          const userEmailResult = await sendJobNotificationEmail({
            jobId: jobId,
            fileName: job.file_name || 'Untitled',
            fileKey: job.file_key,
            status: 'completed',
            totalFrames: actualTotalFrames,
            indexId: updatePayload.index_file_id || undefined,
            userEmail: user.email,
            userName: user.full_name || undefined,
          });
          
          if (userEmailResult.success) {
            console.log(`[${requestId}] ✅ User email sent successfully`);
          } else {
            console.error(`[${requestId}] ❌ Failed to send completion email to user:`, userEmailResult.error);
          }

          // Send email to admin
          const adminEmailResult = await sendJobNotificationToAdmin({
            jobId: jobId,
            fileName: job.file_name || 'Untitled',
            fileKey: job.file_key,
            status: 'completed',
            totalFrames: actualTotalFrames,
            indexId: updatePayload.index_file_id || undefined,
            userEmail: user.email,
            userName: user.full_name || undefined,
          });
          
          if (adminEmailResult.success) {
            console.log(`[${requestId}] ✅ Admin email sent successfully`);
          } else {
            console.error(`[${requestId}] ❌ Failed to send completion email to admin:`, adminEmailResult.error);
          }

          console.log(`[${requestId}] 📧 Email notifications processed for completed job`);
        } else {
          console.warn(`[${requestId}] ⚠️ User not found for job ${jobId} (user_id: ${job.user_id}), skipping email notifications`);
          console.log(`[${requestId}] 📧 Email notifications processed for completed job (no user found)`);
        }
      } catch (emailError: any) {
        // Don't fail the request if email sending fails
        console.error(`[${requestId}] ❌ Error sending email notifications:`, emailError);
        console.error(`[${requestId}] ❌ Email error details:`, {
          message: emailError?.message || 'Unknown error',
          stack: emailError?.stack || 'No stack trace',
          name: emailError?.name || 'Unknown'
        });
        console.log(`[${requestId}] 📧 Email notifications processed for completed job (with error)`);
      }
    } else {
      console.log(`[${requestId}] ⚠️ Job status is not 'completed' (status: ${newStatus}), skipping email notifications`);
    }

    const totalTime = Date.now() - requestStartTime;
    console.log(`[${requestId}] ✅ Request completed successfully in ${totalTime}ms`);
    console.log(`[${requestId}] ===== process-index-job END (SUCCESS) =====\n`);

    return res.status(200).json(responsePayload);
  } catch (error: any) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[${requestId}] ❌ Error processing index job after ${totalTime}ms:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    
    // Update job status to failed in database
    try {
      const { jobId: errorJobId } = req.body || {};
      if (errorJobId) {
        console.log(`[${requestId}] 💾 Updating job ${errorJobId} status to 'failed'...`);
        const updateErrorResult = await supabaseAdmin
          .from('index_jobs')
          .update({
            status: 'failed',
            error: error.message || 'Internal server error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', errorJobId);
        
        if (updateErrorResult.error) {
          console.error(`[${requestId}] ❌ Failed to update job status:`, updateErrorResult.error);
        } else {
          console.log(`[${requestId}] ✅ Job status updated to 'failed'`);
          
          // Send email notifications for failed job
          try {
            // Get job details
            const { data: failedJob } = await supabaseAdmin
              .from('index_jobs')
              .select('user_id, file_name, file_key')
              .eq('id', errorJobId)
              .single();

            if (failedJob && failedJob.user_id) {
              console.log(`[${requestId}] 📧 Starting email notification process for failed job ${errorJobId} (user_id: ${failedJob.user_id})...`);
              
              // Get user details
              const { data: user, error: userError } = await supabaseAdmin
                .from('users')
                .select('email, full_name')
                .eq('id', failedJob.user_id)
                .single();
                
              if (userError) {
                console.error(`[${requestId}] ❌ Error fetching user for failure email notifications:`, userError);
              } else {
                console.log(`[${requestId}] ✅ User fetched for failure email notifications:`, user?.email || 'no email');
              }

              if (user && user.email) {
                console.log(`[${requestId}] 📧 Preparing to send failure email notifications to ${user.email}...`);
                
                // Send email to user
                const userEmailResult = await sendJobNotificationEmail({
                  jobId: errorJobId,
                  fileName: failedJob.file_name || 'Untitled',
                  fileKey: failedJob.file_key || '',
                  status: 'failed',
                  error: error.message || 'Internal server error',
                  userEmail: user.email,
                  userName: user.full_name || undefined,
                });
                
                if (userEmailResult.success) {
                  console.log(`[${requestId}] ✅ Failure email sent to user successfully`);
                } else {
                  console.error(`[${requestId}] ❌ Failed to send failure email to user:`, userEmailResult.error);
                }

                // Send email to admin
                const adminEmailResult = await sendJobNotificationToAdmin({
                  jobId: errorJobId,
                  fileName: failedJob.file_name || 'Untitled',
                  fileKey: failedJob.file_key || '',
                  status: 'failed',
                  error: error.message || 'Internal server error',
                  userEmail: user.email,
                  userName: user.full_name || undefined,
                });
                
                if (adminEmailResult.success) {
                  console.log(`[${requestId}] ✅ Failure email sent to admin successfully`);
                } else {
                  console.error(`[${requestId}] ❌ Failed to send failure email to admin:`, adminEmailResult.error);
                }

                console.log(`[${requestId}] 📧 Email notifications processed for failed job`);
              } else {
                console.warn(`[${requestId}] ⚠️ User not found for failed job ${errorJobId} (user_id: ${failedJob.user_id}), skipping email notifications`);
              }
            } else {
              console.warn(`[${requestId}] ⚠️ Job not found for failed job ${errorJobId}, skipping email notifications`);
            }
          } catch (emailError) {
            // Don't fail the request if email sending fails
            console.error(`[${requestId}] ❌ Error sending failure email notifications:`, emailError);
          }
        }
      }
    } catch (updateError) {
      console.error(`[${requestId}] ❌ Failed to update job status to failed:`, updateError);
    }
    
    console.log(`[${requestId}] ===== process-index-job END (ERROR) =====\n`);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
