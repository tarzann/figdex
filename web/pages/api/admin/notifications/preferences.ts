import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdmin, getAdminUser } from '../../../../lib/admin-middleware';
import {
  getAdminNotificationPreferences,
  setNotificationPreference,
  initializeDefaultPreferences,
  getAllNotificationTypes,
  getNotificationTypeInfo,
  NotificationType,
} from '../../../../lib/admin-notifications';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/admin/notifications/preferences
 * Get all notification preferences for the current admin user
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check admin status
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Get admin user ID
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    let adminUserId: string | null = null;

    if (token.startsWith('figdex_')) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('api_key', token)
        .eq('is_admin', true)
        .single();
      if (user) {
        adminUserId = user.id;
      }
    } else {
      const user = await getAdminUser(req);
      if (user) {
        adminUserId = user.id;
      }
    }

    if (!adminUserId) {
      return res.status(401).json({ success: false, error: 'Could not determine admin user ID' });
    }

    if (req.method === 'GET') {
      // Get all preferences for admin
      const preferences = await getAdminNotificationPreferences(adminUserId);

      // If no preferences exist, initialize defaults
      if (preferences.length === 0) {
        await initializeDefaultPreferences(adminUserId);
        const newPreferences = await getAdminNotificationPreferences(adminUserId);
        
        // Map to include type info
        const preferencesWithInfo = newPreferences.map((pref) => ({
          ...pref,
          ...getNotificationTypeInfo(pref.notification_type),
        }));

        return res.status(200).json({
          success: true,
          preferences: preferencesWithInfo,
        });
      }

      // Map to include type info
      const preferencesWithInfo = preferences.map((pref) => ({
        ...pref,
        ...getNotificationTypeInfo(pref.notification_type),
      }));

      return res.status(200).json({
        success: true,
        preferences: preferencesWithInfo,
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // Update notification preference
      const { notification_type, enabled, email_enabled, push_enabled } = req.body;

      if (!notification_type || typeof enabled !== 'boolean' || typeof email_enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: notification_type, enabled, email_enabled',
        });
      }

      // Validate notification type
      const allTypes = getAllNotificationTypes();
      if (!allTypes.includes(notification_type as NotificationType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid notification_type: ${notification_type}`,
        });
      }

      const result = await setNotificationPreference(
        adminUserId,
        notification_type as NotificationType,
        enabled,
        email_enabled,
        push_enabled || false
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to update notification preference',
        });
      }

      // Return updated preference
      const updatedPreferences = await getAdminNotificationPreferences(adminUserId);
      const updated = updatedPreferences.find((p) => p.notification_type === notification_type);

      if (updated) {
        return res.status(200).json({
          success: true,
          preference: {
            ...updated,
            ...getNotificationTypeInfo(updated.notification_type),
          },
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in notification preferences API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

export default handler;
