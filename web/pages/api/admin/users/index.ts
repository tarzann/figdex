import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/admin-middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase credentials' });
  }
  const supabaseAdmin = createClient(serviceUrl, serviceKey);
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, api_key, plan, is_active, is_admin, created_at, credits_remaining, credits_reset_date')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message });
  
  // Get all index files to calculate usage stats
  const { data: allIndexFiles, error: indexError } = await supabaseAdmin
    .from('index_files')
    .select('user_id, project_id, uploaded_at')
    .order('uploaded_at', { ascending: false });
  
  if (indexError) {
    console.error('Error fetching index files:', indexError);
  }
  
  // Group index files by user_id
  const userStats = new Map<string, {
    projects: Set<string>;
    indices: number;
    lastUpload: number | null;
  }>();
  
  if (allIndexFiles) {
    for (const file of allIndexFiles) {
      const userId = file.user_id;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          projects: new Set(),
          indices: 0,
          lastUpload: null
        });
      }
      const stats = userStats.get(userId)!;
      if (file.project_id) stats.projects.add(file.project_id);
      stats.indices++;
      const uploadTime = file.uploaded_at ? new Date(file.uploaded_at).getTime() : 0;
      if (uploadTime > 0 && (!stats.lastUpload || uploadTime > stats.lastUpload)) {
        stats.lastUpload = uploadTime;
      }
    }
  }
  
  // Calculate storage sizes for each user
  const storageBucket = (process.env.STORAGE_BUCKET as string | undefined) || 'figdex-uploads';
  const storageSizes = new Map<string, number>();
  
  // Helper to calculate storage size for a user
  const calculateUserStorage = async (userId: string): Promise<number> => {
    const listAllFiles = async (path: string): Promise<number> => {
      let totalBytes = 0;
      try {
        const { data: items, error: listError } = await (supabaseAdmin as any).storage
          .from(storageBucket)
          .list(path, {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });
        
        if (listError || !items || items.length === 0) {
          return 0;
        }
        
        for (const item of items) {
          if (item.id) {
            // This is a file
            const fileSize = (item as any).size || (item as any).metadata?.size || item.metadata?.size || 0;
            totalBytes += fileSize;
          } else {
            // This is a folder - recurse
            const subPath = path ? `${path}/${item.name}` : item.name;
            totalBytes += await listAllFiles(subPath);
          }
        }
      } catch (e) {
        console.error(`Error listing storage for ${path}:`, e);
      }
      return totalBytes;
    };
    
    return await listAllFiles(userId);
  };
  
  // Calculate storage only for users who have indices (to save time)
  const usersWithIndices = new Set((allIndexFiles || []).map((f: any) => f.user_id));
  const storagePromises = Array.from(usersWithIndices).map(async (userId: string) => {
    try {
      const size = await calculateUserStorage(userId);
      storageSizes.set(userId, size);
    } catch (e) {
      console.error(`Error calculating storage for user ${userId}:`, e);
      storageSizes.set(userId, 0);
    }
  });
  
  // Wait for all storage calculations (with timeout protection)
  await Promise.allSettled(storagePromises);
  
  const users = (data || []).map((u: any) => {
    const stats = userStats.get(u.id) || { projects: new Set(), indices: 0, lastUpload: null };
    const storageBytes = storageSizes.get(u.id) || 0;
    const lastUploadTime = stats.lastUpload;
    const daysSinceUpload = lastUploadTime 
      ? Math.floor((Date.now() - lastUploadTime) / (1000 * 60 * 60 * 24))
      : null;
    
    return {
      ...u,
      api_key: u.api_key ? (u.api_key as string).slice(0, 8) + '••••••••' : null,
      plan: u.is_admin ? 'unlimited' : (u.plan || 'free'),
      projects: stats.projects.size,
      indices: stats.indices,
      storageBytes,
      lastUploadDays: daysSinceUpload
    };
  });
  
  return res.status(200).json({ success: true, users });
}

export default requireAdmin(handler);


