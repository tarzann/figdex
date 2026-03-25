import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Version tracking - Update this number for each fix/change
const API_VERSION = 'v1.30.23'; // Cover image: robust signing (alt paths) + logging

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

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
    const { indexId } = req.query;
    if (!indexId || typeof indexId !== 'string') {
      return res.status(400).json({ success: false, error: 'indexId is required' });
    }

    // Use service role to avoid RLS issues
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    const svc = serviceUrl && serviceKey ? createClient(serviceUrl, serviceKey) : supabase;

    // Get specific index data
    const { data: indexData, error: indexError } = await svc
      .from('index_files')
      .select('id, user_id, file_name, index_data, uploaded_at, project_id, figma_file_key, share_token, frame_tags, custom_tags, naming_tags, size_tags, file_size, frame_count')
      .eq('id', indexId)
      .single();

    if (indexError) {
      console.error(`[get-index-data] Error fetching index ${indexId}:`, {
        message: indexError.message,
        code: indexError.code,
        details: indexError.details,
        hint: indexError.hint
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Error fetching index data', 
        details: indexError.message,
        code: indexError.code 
      });
    }

    if (!indexData) {
      console.log(`[get-index-data] Index ${indexId} not found`);
      return res.status(404).json({ success: false, error: 'Index not found' });
    }

    // Helper: from a Supabase storage URL, derive bucket+path and return a fresh signed URL
    const parseImageUrl = (imageUrl: string): { bucket: string; path: string } | null => {
      try {
        if (!imageUrl || typeof imageUrl !== 'string') return null;
        // Only handle URLs from our Supabase project
        const supaBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
        if (!supaBase) {
          console.log(`[get-index-data] parseImageUrl: No NEXT_PUBLIC_SUPABASE_URL env var`);
          return null;
        }
        const base = new URL(supaBase).host;
        const host = new URL(imageUrl).host;
        if (host !== base) {
          console.log(`[get-index-data] parseImageUrl: Host mismatch: ${host} !== ${base}`);
          return null;
        }
        // Expect formats like:
        // - /storage/v1/object/public/<bucket>/<path>
        // - /storage/v1/object/<bucket>/<path>
        // - /storage/v1/object/sign/<bucket>/<path>?token=...
        const pathname = new URL(imageUrl).pathname;
        const parts = pathname.split('/').filter(Boolean); // e.g., ['storage','v1','object','public', '<bucket>', ...path]
        const idxObject = parts.findIndex(p => p === 'object');
        if (idxObject === -1 || idxObject + 1 >= parts.length) {
          console.log(`[get-index-data] parseImageUrl: No 'object' found in pathname: ${pathname}`);
          return null;
        }
        let next = parts[idxObject + 1]; // could be 'public' or a bucket name
        let bucket = '';
        let pathParts: string[] = [];
        if (next === 'public' || next === 'download' || next === 'sign') {
          // next segment is a mode; bucket follows
          if (idxObject + 2 >= parts.length) {
            console.log(`[get-index-data] parseImageUrl: Missing bucket after mode '${next}' in pathname: ${pathname}`);
            return null;
          }
          bucket = parts[idxObject + 2];
          pathParts = parts.slice(idxObject + 3);
        } else {
          // directly /object/<bucket>/...
          bucket = next;
          pathParts = parts.slice(idxObject + 2);
        }
        const objectPath = pathParts.join('/');
        if (!bucket || !objectPath) {
          console.log(`[get-index-data] parseImageUrl: Missing bucket or path: bucket=${bucket}, path=${objectPath}, pathname=${pathname}`);
          return null;
        }
        return { bucket, path: objectPath };
      } catch (error) {
        console.error(`[get-index-data] parseImageUrl error:`, error, `for URL: ${imageUrl?.substring(0, 100)}`);
        return null;
      }
    };
    const signFromImageUrl = async (svc: any, imageUrl: string): Promise<string | null> => {
      try {
        if (!imageUrl || typeof imageUrl !== 'string') {
          console.log(`⚠️ [get-index-data] signFromImageUrl: invalid imageUrl:`, imageUrl);
          return null;
        }
        console.log(`📸 [get-index-data] signFromImageUrl: Input URL: ${imageUrl}`);
        
        // If it already contains a token, keep it
        if (/[?&]token=/.test(imageUrl)) {
          console.log(`✅ [get-index-data] signFromImageUrl: URL already has token, using as-is: ${imageUrl.substring(0, 60)}...`);
          return imageUrl;
        }
        const parsed = parseImageUrl(imageUrl);
        if (!parsed) {
          console.warn(`⚠️ [get-index-data] signFromImageUrl: failed to parse URL: ${imageUrl}`);
          return null;
        }
        const { bucket, path: objectPath } = parsed;
        console.log(`📸 [get-index-data] signFromImageUrl: Parsed - bucket=${bucket}, path=${objectPath}`);
        console.log(`📸 [get-index-data] signFromImageUrl: Creating signed URL (6 hours)...`);
        const signed = await (svc as any).storage.from(bucket).createSignedUrl(objectPath, 60 * 60 * 6);
        console.log(`📸 [get-index-data] signFromImageUrl: Signed response:`, signed ? { hasData: !!signed.data, hasSignedUrl: !!signed.data?.signedUrl } : 'null');
        if (signed?.data?.signedUrl) {
          console.log(`✅ [get-index-data] signFromImageUrl: Created signed URL: ${signed.data.signedUrl.substring(0, 60)}...`);
          return signed.data.signedUrl;
        } else {
          console.warn(`⚠️ [get-index-data] signFromImageUrl: No signedUrl in response. Full response:`, JSON.stringify(signed, null, 2));
          return null;
        }
      } catch (error: any) {
        console.error(`❌ [get-index-data] signFromImageUrl error:`, error?.message || error);
        console.error(`❌ [get-index-data] signFromImageUrl error stack:`, error?.stack);
        return null;
      }
    };
    const signTransformed = async (svc: any, bucket: string, objectPath: string): Promise<string | null> => {
      try {
        const signed = await (svc as any).storage
          .from(bucket)
          .createSignedUrl(objectPath, 60 * 60 * 6, {
            transform: {
              width: 320,
              quality: 70,
              resize: 'contain',
              format: 'webp'
            }
          });
        return signed?.data?.signedUrl || null;
      } catch {
        return null;
      }
    };
    const normalizeFrameImagesBatch = async (framesArr: any[], svc: any) => {
      if (!Array.isArray(framesArr) || framesArr.length === 0) return;
      // Collect paths to sign per bucket
      const fullByBucket = new Map<string, string[]>();
      const thumbByBucket = new Map<string, string[]>();
      const keySet = new Set<string>(); // track unique bucket:path
      const add = (map: Map<string, string[]>, bucket: string, path: string) => {
        const key = `${bucket}:${path}`;
        if (keySet.has(key)) return;
        keySet.add(key);
        if (!map.has(bucket)) map.set(bucket, []);
        map.get(bucket)!.push(path);
      };
      const defaultBucket = process.env.STORAGE_BUCKET || 'figdex-uploads';
      const candidates: Array<{ frame: any; bucket: string; path: string }> = [];
      for (const frame of framesArr) {
        // If thumb_url already exists and is valid, skip thumbnail generation
        const existingThumbUrl = (frame as any).thumb_url;
        if (existingThumbUrl && typeof existingThumbUrl === 'string' && existingThumbUrl.length > 0) {
          // Check if it's a valid URL (not the broken /object/p path)
          if (existingThumbUrl.includes('supabase.co/storage') && !existingThumbUrl.includes('/object/p')) {
            console.log(`[get-index-data] Frame "${frame.name || 'unknown'}" already has valid thumb_url, skipping generation`);
            // Still process the full image, but skip thumbnail
          }
        }
        
        // Try storageRef object
        if (frame && frame.image && typeof frame.image === 'object' && frame.image.storageRef) {
          const [bkt, ...p2] = String(frame.image.storageRef).split(':');
          const pth = p2.join(':');
          if (bkt && pth) {
            candidates.push({ frame, bucket: bkt, path: pth });
            add(fullByBucket, bkt, pth);
            // Only add to thumbByBucket if thumb_url doesn't exist or is invalid
            if (!existingThumbUrl || existingThumbUrl.includes('/object/p')) {
              // Try to find thumbnail in thumbs/ subdirectory
              const pathParts = pth.split('/');
              const filename = pathParts[pathParts.length - 1];
              const dirPath = pathParts.slice(0, -1).join('/');
              const thumbFilename = filename.replace(/\.[^.]+$/, '.webp');
              const thumbPath = `${dirPath}/thumbs/${thumbFilename}`;
              add(thumbByBucket, bkt, thumbPath);
            }
            continue;
          }
        }
        // Try storage_path
        if (frame && typeof frame.storage_path === 'string' && frame.storage_path.length > 0) {
          const raw = String(frame.storage_path);
          let bkt = defaultBucket;
          let pth = raw;
          if (raw.includes(':')) {
            const [b, ...rest] = raw.split(':');
            bkt = b || defaultBucket;
            pth = rest.join(':');
          }
          if (bkt && pth) {
            candidates.push({ frame, bucket: bkt, path: pth });
            add(fullByBucket, bkt, pth);
            // Only add to thumbByBucket if thumb_url doesn't exist or is invalid
            if (!existingThumbUrl || existingThumbUrl.includes('/object/p')) {
              // Try to find thumbnail in thumbs/ subdirectory
              const pathParts = pth.split('/');
              const filename = pathParts[pathParts.length - 1];
              const dirPath = pathParts.slice(0, -1).join('/');
              const thumbFilename = filename.replace(/\.[^.]+$/, '.webp');
              const thumbPath = `${dirPath}/thumbs/${thumbFilename}`;
              add(thumbByBucket, bkt, thumbPath);
            }
            continue;
          }
        }
        // Try image_url parse (Supabase public/object URL)
        if (frame && typeof frame.image_url === 'string' && frame.image_url.length > 0) {
          const parsed = parseImageUrl(frame.image_url);
          if (parsed) {
            candidates.push({ frame, bucket: parsed.bucket, path: parsed.path });
            add(fullByBucket, parsed.bucket, parsed.path);
            // Only add to thumbByBucket if thumb_url doesn't exist or is invalid
            if (!existingThumbUrl || existingThumbUrl.includes('/object/p')) {
              // Try to find thumbnail in thumbs/ subdirectory
              const thumbPath = parsed.path.replace(/\/([^/]+)$/, '/thumbs/$1').replace(/\.[^.]+$/, '.webp');
              add(thumbByBucket, parsed.bucket, thumbPath);
            }
            continue;
          } else {
            // Fallback: keep raw URL
            frame.image = frame.image_url;
          }
        }
        // Try frame.image as string URL (Supabase storage URL)
        if (frame && frame.image && typeof frame.image === 'string' && frame.image.length > 0 && frame.image.includes('supabase.co/storage')) {
          const parsed = parseImageUrl(frame.image);
          if (parsed) {
            console.log(`[get-index-data] Parsed frame.image URL: bucket=${parsed.bucket}, path=${parsed.path.substring(0, 50)}...`);
            candidates.push({ frame, bucket: parsed.bucket, path: parsed.path });
            add(fullByBucket, parsed.bucket, parsed.path);
            // Only add to thumbByBucket if thumb_url doesn't exist or is invalid
            if (!existingThumbUrl || existingThumbUrl.includes('/object/p')) {
              // Try to find thumbnail in thumbs/ subdirectory
              const thumbPath = parsed.path.replace(/\/([^/]+)$/, '/thumbs/$1').replace(/\.[^.]+$/, '.webp');
              add(thumbByBucket, parsed.bucket, thumbPath);
            }
          } else {
            console.log(`[get-index-data] Failed to parse frame.image URL: ${frame.image.substring(0, 80)}...`);
          }
        }
      }
      // Batch sign per bucket
      const fullMap = new Map<string, string>(); // key bucket:path -> signed
      const thumbMap = new Map<string, string>();
      for (const [bucket, paths] of fullByBucket.entries()) {
        try {
          const result = await (svc as any).storage.from(bucket).createSignedUrls(paths, 60 * 60 * 6);
          if (result?.data && Array.isArray(result.data)) {
            for (let i = 0; i < result.data.length; i++) {
              const signed = result.data[i]?.signedUrl;
              const p = paths[i];
              if (signed && p) fullMap.set(`${bucket}:${p}`, signed);
            }
          }
        } catch {}
      }
      for (const [bucket, paths] of thumbByBucket.entries()) {
        try {
          console.log(`[get-index-data] Fetching thumbnails for bucket=${bucket}, paths=${paths.length}`);
          // Try to get signed URLs for existing thumbnail files (not transformations)
          const result = await (svc as any).storage.from(bucket).createSignedUrls(paths, 60 * 60 * 6);
          if (result?.data && Array.isArray(result.data)) {
            let successCount = 0;
            for (let i = 0; i < result.data.length; i++) {
              const signed = result.data[i]?.signedUrl;
              const p = paths[i];
              if (signed && p) {
                thumbMap.set(`${bucket}:${p}`, signed);
                successCount++;
              }
            }
            console.log(`[get-index-data] Fetched ${successCount}/${paths.length} thumbnails for bucket=${bucket}`);
          } else {
            console.log(`[get-index-data] No thumbnail data returned for bucket=${bucket}`);
          }
        } catch (error) {
          console.error(`[get-index-data] Error fetching thumbnails for bucket=${bucket}:`, error);
        }
      }
      // Populate frames
      let thumbCount = 0;
      for (const { frame, bucket, path } of candidates) {
        const key = `${bucket}:${path}`;
        const full = fullMap.get(key);
        if (full) frame.image = full;
        
        // Check if thumb_url already exists and is valid
        const existingThumbUrl = (frame as any).thumb_url;
        if (existingThumbUrl && typeof existingThumbUrl === 'string' && existingThumbUrl.length > 0) {
          if (existingThumbUrl.includes('supabase.co/storage') && !existingThumbUrl.includes('/object/p')) {
            // Keep existing valid thumb_url
            thumbCount++;
            continue;
          }
        }
        
        // Try to find thumbnail in thumbs/ subdirectory
        // Extract filename from path and create thumbnail path
        const pathParts = path.split('/');
        const filename = pathParts[pathParts.length - 1];
        const dirPath = pathParts.slice(0, -1).join('/');
        const thumbFilename = filename.replace(/\.[^.]+$/, '.webp');
        const thumbPath = `${dirPath}/thumbs/${thumbFilename}`;
        const thumbKey = `${bucket}:${thumbPath}`;
        const thumb = thumbMap.get(thumbKey);
        if (thumb) {
          (frame as any).thumb_url = thumb;
          thumbCount++;
        } else {
          console.log(`[get-index-data] No thumbnail found for ${frame.name || 'unknown'}: bucket=${bucket}, thumbPath=${thumbPath.substring(0, 50)}...`);
        }
      }
      // For frames with data URL in frame.image (e.g. guest base64), ensure thumb_url is set for display
      for (const frame of framesArr) {
        if (frame && frame.image && typeof frame.image === 'string' && frame.image.startsWith('data:image/') && !(frame as any).thumb_url) {
          (frame as any).thumb_url = frame.image;
        }
      }
      console.log(`[get-index-data] Populated ${thumbCount}/${candidates.length} frames with thumbnails`);
    };

    // If index_data is a storage pointer, load from Supabase Storage
    if (!indexData.index_data || (typeof indexData.index_data === 'object' && indexData.index_data.storageRef)) {
      try {
        const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
        if (!serviceUrl || !serviceKey) {
          throw new Error('Missing Supabase credentials');
        }
        const svc = createClient(serviceUrl, serviceKey);
        const ref = typeof indexData.index_data === 'object' ? indexData.index_data.storageRef : null;
        if (!ref) {
          throw new Error('Missing storageRef in index_data');
        }
        const [bucket, ...pathParts] = ref.split(':');
        const path = pathParts.join(':');
        const dl = await (svc as any).storage.from(bucket).download(path);
        if (dl?.error) {
          throw new Error(dl.error.message || 'Download failed');
        }
        const txt = await dl.data.text();
        const json = JSON.parse(txt || '[]');
        indexData.index_data = json;
        // Resolve any image storageRef/image_url/storage_path into usable URLs for client usage
        if (Array.isArray(indexData.index_data)) {
          for (const page of indexData.index_data) {
            if (!Array.isArray(page?.frames)) continue;
            await normalizeFrameImagesBatch(page.frames, svc);
            
            // Frames should already have tags from plugin (frame.frameTags and frame.customTags)
            // DO NOT use index-level tags as fallback - frames without tags should remain without tags
            page.frames.forEach((frame: any) => {
              // Only initialize if tags don't exist at all (not if they're empty arrays)
              if (!('frameTags' in frame)) {
                frame.frameTags = [];
              } else if (!Array.isArray(frame.frameTags)) {
                frame.frameTags = [];
              }
              if (!('customTags' in frame)) {
                frame.customTags = [];
              } else if (!Array.isArray(frame.customTags)) {
                frame.customTags = [];
              }
            });
          }
        }
      } catch (e: any) {
        console.error(`❌ Failed to load index_data from storage for indexId ${indexId}:`, e?.message || e);
        console.error('Error stack:', e?.stack);
        console.error('Storage ref:', typeof indexData.index_data === 'object' ? indexData.index_data.storageRef : 'N/A');
        
        // Return error but don't fail completely - return what we have
        // This allows partial recovery if the index exists but storage fails
        if (indexData) {
          console.warn(`⚠️ Returning partial index data despite storage error for indexId ${indexId}`);
          return res.status(200).json({
            success: true,
            data: {
              ...indexData,
              index_data: null, // Clear corrupted data
              _error: 'Failed to load index data from storage',
              _errorDetails: process.env.NODE_ENV === 'development' ? e?.message : undefined
            }
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to load index data from storage',
          details: process.env.NODE_ENV === 'development' ? e?.message : undefined
        });
      }
    } else {
      // Validate index_data structure if present in DB
      if (typeof indexData.index_data === 'string') {
        try {
          JSON.parse(indexData.index_data);
        } catch (e) {
          console.error(`❌ Index ${indexId} has invalid JSON in index_data:`, e);
          return res.status(500).json({ 
            success: false, 
            error: 'Index data is corrupted (invalid JSON)',
            corrupted: true
          });
        }
      }
      // Handle both array format (pages) and object format (with coverImageUrl)
      let pagesArray: any[] = [];
      let coverImageUrlFromIndex: string | null = null;
      if (Array.isArray(indexData.index_data)) {
        pagesArray = indexData.index_data;
      } else if (indexData.index_data && typeof indexData.index_data === 'object' && indexData.index_data.pages) {
        // Object format with coverImageUrl
        pagesArray = Array.isArray(indexData.index_data.pages) ? indexData.index_data.pages : [];
        // Get coverImageUrl from index_data
        coverImageUrlFromIndex = indexData.index_data.coverImageUrl || null;
      }
      
      // If index_data is array or has pages, normalize image fields and resolve storage refs
      if (pagesArray.length > 0 || coverImageUrlFromIndex) {
        try {
          const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
          if (serviceUrl && serviceKey) {
            const svc = createClient(serviceUrl, serviceKey);
            
            // Convert coverImageUrl to signed URL if it exists
            if (coverImageUrlFromIndex) {
              console.log(`📸 [get-index-data] Processing coverImageUrl: ${coverImageUrlFromIndex.substring(0, 80)}...`);
              console.log(`📸 [get-index-data] Full coverImageUrl: ${coverImageUrlFromIndex}`);
              
              // Check if it's a storage path format (bucket:path)
              if (coverImageUrlFromIndex.includes(':') && !coverImageUrlFromIndex.startsWith('http')) {
                // Storage path format: bucket:path
                const [bucket, ...pathParts] = coverImageUrlFromIndex.split(':');
                const path = pathParts.join(':');
                console.log(`📸 [get-index-data] Detected storage path format - bucket: ${bucket}, path: ${path}`);
                console.log(`📸 [get-index-data] Full storage path: ${coverImageUrlFromIndex}`);
                
                const altPaths = [path];
                const sanitizedPath = path.replace(/:/g, '_');
                if (sanitizedPath !== path) altPaths.push(sanitizedPath);
                
                let finalSignedUrl: string | null = null;
                
                for (const candidatePath of altPaths) {
                  if (finalSignedUrl) break;
                  try {
                    console.log(`📸 [get-index-data] Attempt signing for path: ${candidatePath}`);
                    const signedSingle = await (svc as any).storage.from(bucket).createSignedUrl(candidatePath, 60 * 60 * 6);
                    console.log(`📸 [get-index-data] Signed (single) response:`, signedSingle ? { hasData: !!signedSingle.data, hasSignedUrl: !!signedSingle.data?.signedUrl, error: signedSingle.error } : 'null');
                    
                    let signedBatchUrl: string | null = null;
                    try {
                      const batch = await (svc as any).storage.from(bucket).createSignedUrls([candidatePath], 60 * 60 * 6);
                      if (batch?.data && Array.isArray(batch.data) && batch.data[0]?.signedUrl) {
                        signedBatchUrl = batch.data[0].signedUrl || null;
                        if (signedBatchUrl) console.log(`📸 [get-index-data] Batch signed URL: ${signedBatchUrl.substring(0, 80)}...`);
                      } else if (batch?.error) {
                        console.error(`❌ [get-index-data] Batch signed error:`, JSON.stringify(batch.error, null, 2));
                      }
                    } catch (batchErr: any) {
                      console.error(`❌ [get-index-data] Exception in batch signed URLs:`, batchErr?.message || batchErr);
                    }
                    
                    finalSignedUrl = signedSingle?.data?.signedUrl || signedBatchUrl || null;
                    
                    if (!finalSignedUrl && signedSingle?.error) {
                      console.error(`❌ [get-index-data] Supabase error creating signed URL (single):`, JSON.stringify(signedSingle.error, null, 2));
                    }
                    
                  } catch (signError: any) {
                    console.error(`❌ [get-index-data] Exception signing path ${candidatePath}:`, signError?.message || signError);
                  }
                }
                
                if (finalSignedUrl) {
                  (indexData as any).coverImageUrl = finalSignedUrl;
                  console.log(`✅ [get-index-data] Created signed URL from storage path: ${finalSignedUrl.substring(0, 80)}...`);
                  console.log(`📸 [get-index-data] Full signed URL: ${finalSignedUrl}`);
                } else {
                  console.warn(`⚠️ [get-index-data] Failed to create signed URL from storage path (all attempts). Keeping original for debugging.`);
                  (indexData as any).coverImageUrl = coverImageUrlFromIndex;
                }
              } else {
                // URL format - check if it's already a signed URL (has token)
                const hasToken = /[?&]token=/.test(coverImageUrlFromIndex);
                if (hasToken) {
                  console.log(`✅ [get-index-data] coverImageUrl already has token, using as-is`);
                  (indexData as any).coverImageUrl = coverImageUrlFromIndex;
                } else {
                  // Try to convert to signed URL
                  const signedCoverUrl = await signFromImageUrl(svc, coverImageUrlFromIndex);
                  if (signedCoverUrl) {
                    (indexData as any).coverImageUrl = signedCoverUrl;
                    console.log(`✅ [get-index-data] Got signed URL for coverImageUrl: ${signedCoverUrl.substring(0, 80)}...`);
                    console.log(`📸 [get-index-data] Full signed URL: ${signedCoverUrl}`);
                  } else {
                    // If signing fails, keep original URL but log warning
                    (indexData as any).coverImageUrl = coverImageUrlFromIndex;
                    console.warn(`⚠️ [get-index-data] Failed to sign coverImageUrl, using original URL: ${coverImageUrlFromIndex.substring(0, 80)}...`);
                    console.warn(`⚠️ [get-index-data] This may cause 400 errors if bucket is not public`);
                  }
                }
              }
            } else {
              (indexData as any).coverImageUrl = null;
              console.log(`⚠️ [get-index-data] No coverImageUrl found in index_data`);
            }
            
            for (const page of pagesArray) {
              if (!Array.isArray(page?.frames)) continue;
              await normalizeFrameImagesBatch(page.frames, svc);
              
              // Frames should already have tags from plugin (frame.frameTags and frame.customTags)
              // DO NOT use index-level tags as fallback - frames without tags should remain without tags
              page.frames.forEach((frame: any) => {
                // Only initialize if tags don't exist at all (not if they're empty arrays)
                if (!('frameTags' in frame)) {
                  frame.frameTags = [];
                } else if (!Array.isArray(frame.frameTags)) {
                  frame.frameTags = [];
                }
                if (!('customTags' in frame)) {
                  frame.customTags = [];
                } else if (!Array.isArray(frame.customTags)) {
                  frame.customTags = [];
                }
              });
            }
            // Update index_data with normalized pages
            if (Array.isArray(indexData.index_data)) {
              indexData.index_data = pagesArray;
            } else if (indexData.index_data && typeof indexData.index_data === 'object') {
              indexData.index_data.pages = pagesArray;
            }
          }
        } catch (normalizeError: any) {
          console.error(`❌ Error normalizing frame images for indexId ${indexId}:`, normalizeError?.message || normalizeError);
          // Continue despite normalization errors - return data without normalized images
          console.warn(`⚠️ Continuing with unnormalized image data for indexId ${indexId}`);
        }
      }
    }

    // Frames should already have tags from plugin (frame.frameTags and frame.customTags)
    // DO NOT use index-level tags as fallback - frames without tags should remain without tags
    // This prevents frames without tags from inheriting all tags from other frames
    // Only initialize empty arrays if tags don't exist at all (for backward compatibility with old indices)
    if (Array.isArray(indexData.index_data)) {
      for (const page of indexData.index_data) {
        if (!Array.isArray(page?.frames)) continue;
        page.frames.forEach((frame: any) => {
          // Only initialize if tags don't exist at all (not if they're empty arrays)
          // This ensures frames without tags stay without tags
          if (!('frameTags' in frame)) {
            frame.frameTags = [];
          } else if (!Array.isArray(frame.frameTags)) {
            frame.frameTags = [];
          }
          if (!('customTags' in frame)) {
            frame.customTags = [];
          } else if (!Array.isArray(frame.customTags)) {
            frame.customTags = [];
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: indexData
    });

  } catch (error: any) {
    console.error(`❌ Error in get-index-data for indexId ${req.query.indexId}:`, error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}

