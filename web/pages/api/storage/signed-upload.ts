import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// API config: small body, simple POST
export const config = {
  api: {
    bodyParser: true
  }
};

/**
 * POST /api/storage/signed-upload
 * Auth: Bearer figdex_* API key (same as /api/upload-index)
 * Body: { filename: string, contentType?: string, projectId?: string }
 * Returns: { success, path, token, signedUrl, publicUrl? }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  try {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';

    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Supabase URL or Service Key missing'
      });
    }

    // Auth via plugin API key (same scheme as upload-index)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }
    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey.startsWith('figdex_') || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    const supabaseAdmin = createClient(serviceUrl, serviceKey);

    // Resolve user by API key
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('api_key', apiKey)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    const { filename, contentType, projectId } = req.body || {};
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid filename'
      });
    }

    // Build a deterministic storage path: userId/projectId/yyyy/mm/dd/filename
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    // Normalize projectId for path safety (remove ':' to avoid signing issues)
    const safeProject = (projectId && typeof projectId === 'string' && projectId.trim().length > 0)
      ? projectId.replace(/[^a-zA-Z0-9-_]/g, '_')
      : 'unknown';
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_.]/g, '_');
    const objectPath = `${user.id}/${safeProject}/${yyyy}/${mm}/${dd}/${safeFilename}`;

    // Helper to create a signed upload URL for a given path
    const createSignedForPath = async (path: string) => {
      return (supabaseAdmin as any).storage.from(storageBucket).createSignedUploadUrl(path);
    };

    // Create signed upload URL (short-lived) with overwrite-safe semantics:
    // 1) Try to create directly
    // 2) If "resource exists", delete existing object (service role) and retry
    // 3) If still failing, fall back to a unique path (suffix) to avoid blocking uploads
    let signedData: any | null = null;
    let signedErr: any | null = null;
    let finalObjectPath = objectPath;

    // Attempt #1
    {
      const { data, error } = await createSignedForPath(finalObjectPath);
      signedData = data;
      signedErr = error;
    }

    // If the object already exists, try to remove and retry once
    if ((signedErr?.message || '').toLowerCase().includes('already exists')) {
      // Best-effort delete; ignore errors (object may not be public or may have been concurrently removed)
      await (supabaseAdmin as any).storage.from(storageBucket).remove([finalObjectPath]);
      const { data, error } = await createSignedForPath(finalObjectPath);
      signedData = data;
      signedErr = error;
    }

    // If it still fails, fall back to unique path (append timestamp before extension)
    if (signedErr || !signedData) {
      const dotIdx = safeFilename.lastIndexOf('.');
      const base = dotIdx >= 0 ? safeFilename.slice(0, dotIdx) : safeFilename;
      const ext = dotIdx >= 0 ? safeFilename.slice(dotIdx) : '';
      const uniqueName = `${base}__${Date.now()}${ext}`;
      finalObjectPath = `${user.id}/${safeProject}/${yyyy}/${mm}/${dd}/${uniqueName}`;
      const { data, error } = await createSignedForPath(finalObjectPath);
      signedData = data;
      signedErr = error;
    }

    if (signedErr || !signedData) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create signed upload URL',
        details: signedErr?.message
      });
    }

    // Get public URL structure (works even if bucket is not public - URL structure is still valid)
    const { data: pub } = (supabaseAdmin as any).storage.from(storageBucket).getPublicUrl(finalObjectPath);
    const publicUrl = pub?.publicUrl || null;

    // Also create a signed download URL (so the plugin can send a ready-to-use URL)
    let downloadSignedUrl: string | null = null;
    try {
      const signedDownload = await (supabaseAdmin as any).storage.from(storageBucket).createSignedUrl(finalObjectPath, 60 * 60 * 24 * 30); // 30d
      downloadSignedUrl = signedDownload?.data?.signedUrl || null;
    } catch (err: any) {
      console.warn('[signed-upload] Failed to create download signed URL:', err?.message || err);
    }
    
    // Log for cover images
    const isCoverImage = safeFilename.includes('_cover.');
    if (isCoverImage) {
      console.log(`📸 [signed-upload] Cover image upload - bucket: ${storageBucket}, path: ${finalObjectPath}`);
      console.log(`📸 [signed-upload] Cover image publicUrl: ${publicUrl ? publicUrl.substring(0, 80) + '...' : 'null'}`);
      console.log(`📸 [signed-upload] Cover image downloadSignedUrl: ${downloadSignedUrl ? downloadSignedUrl.substring(0, 80) + '...' : 'null'}`);
      console.log(`📸 [signed-upload] Full publicUrl: ${publicUrl || 'null'}`);
      console.log(`📸 [signed-upload] Note: downloadSignedUrl can be used directly without further signing`);
      
      // Verify bucket exists
      try {
        const { data: buckets, error: bucketsError } = await (supabaseAdmin as any).storage.listBuckets();
        if (bucketsError) {
          console.error(`❌ [signed-upload] Error listing buckets:`, bucketsError);
        } else {
          const bucketExists = buckets?.some((b: any) => b.name === storageBucket);
          console.log(`📸 [signed-upload] Bucket "${storageBucket}" exists: ${bucketExists}`);
          if (!bucketExists) {
            console.error(`❌ [signed-upload] Bucket "${storageBucket}" does not exist! Available buckets:`, buckets?.map((b: any) => b.name));
          }
        }
      } catch (bucketCheckError) {
        console.error(`❌ [signed-upload] Error checking bucket:`, bucketCheckError);
      }
    }

    return res.status(200).json({
      success: true,
      bucket: storageBucket,
      path: finalObjectPath,
      token: signedData.token,
      signedUrl: signedData.signedUrl,
      contentType: contentType || null,
      publicUrl,
      downloadSignedUrl,
      // Provide anon key so the client can authorize the signed upload request.
      // This is safe to expose (public key) and avoids hard-coding it in the plugin.
      anonKey: anonKey || null,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message
    });
  }
}



