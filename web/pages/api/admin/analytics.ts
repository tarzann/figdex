import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET']
      });
    }

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get active users count
    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total indices count
    const { count: totalIndices, error: indicesError } = await supabase
      .from('index_files')
      .select('*', { count: 'exact', head: true });

    // Get indices uploaded in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentIndices, error: recentError } = await supabase
      .from('index_files')
      .select('*', { count: 'exact', head: true })
      .gte('uploaded_at', thirtyDaysAgo.toISOString());

    // Get users created in last 30 days
    const { count: recentUsers, error: recentUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get inactive users count
    const { count: inactiveUsers, error: inactiveError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    // Get admin count
    const { count: adminCount, error: adminError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);

    // Get total storage used
    const { data: storageData, error: storageError } = await supabase
      .from('index_files')
      .select('file_size');

    let totalStorageUsed = 0;
    if (storageData && Array.isArray(storageData)) {
      totalStorageUsed = storageData.reduce((sum, file) => sum + (file.file_size || 0), 0);
    }

    // Calculate average indices per user
    const averageIndicesPerUser = totalUsers && totalUsers > 0 
      ? (totalIndices || 0) / totalUsers 
      : 0;

    // Get today's date and this week's start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // Get new users today
    const { count: newUsersToday, error: newUsersTodayError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get new users this week
    const { count: newUsersThisWeek, error: newUsersWeekError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString());

    // Get new indices today
    const { count: newIndicesToday, error: newIndicesTodayError } = await supabase
      .from('index_files')
      .select('*', { count: 'exact', head: true })
      .gte('uploaded_at', today.toISOString());

    // Get new indices this week
    const { count: newIndicesThisWeek, error: newIndicesWeekError } = await supabase
      .from('index_files')
      .select('*', { count: 'exact', head: true })
      .gte('uploaded_at', weekStart.toISOString());

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        inactiveUsers: inactiveUsers || 0,
        adminUsers: adminCount || 0,
        totalIndices: totalIndices || 0,
        totalStorageUsed: totalStorageUsed,
        averageIndicesPerUser: averageIndicesPerUser,
        recentActivity: {
          newUsersToday: newUsersToday || 0,
          newUsersThisWeek: newUsersThisWeek || 0,
          newIndicesToday: newIndicesToday || 0,
          newIndicesThisWeek: newIndicesThisWeek || 0
        }
      }
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default handler;

