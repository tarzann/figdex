/**
 * Admin Notification Management Utilities
 * Handles checking notification preferences and sending notifications to admins
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type NotificationType = 
  | 'index_completed'
  | 'index_failed'
  | 'user_registered'
  | 'subscription_created'
  | 'subscription_canceled'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'quota_exceeded'
  | 'error_reported';

export interface NotificationPreference {
  id: string;
  admin_user_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all admin users
 */
async function getAdminUsers(): Promise<Array<{ id: string; email: string }>> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('is_admin', true);

  if (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }

  return data || [];
}

/**
 * Get notification preference for a specific admin and notification type
 */
export async function getNotificationPreference(
  adminUserId: string,
  notificationType: NotificationType
): Promise<NotificationPreference | null> {
  const { data, error } = await supabaseAdmin
    .from('admin_notification_preferences')
    .select('*')
    .eq('admin_user_id', adminUserId)
    .eq('notification_type', notificationType)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preference found - return default (enabled)
      return null;
    }
    console.error('Error fetching notification preference:', error);
    return null;
  }

  return data;
}

/**
 * Get all notification preferences for an admin user
 */
export async function getAdminNotificationPreferences(
  adminUserId: string
): Promise<NotificationPreference[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_notification_preferences')
    .select('*')
    .eq('admin_user_id', adminUserId)
    .order('notification_type');

  if (error) {
    console.error('Error fetching admin notification preferences:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a notification should be sent for a specific admin and type
 */
export async function shouldSendNotification(
  adminUserId: string,
  notificationType: NotificationType,
  channel: 'email' | 'push' = 'email'
): Promise<boolean> {
  const preference = await getNotificationPreference(adminUserId, notificationType);

  // If no preference exists, default to enabled
  if (!preference) {
    return true;
  }

  // Check if notification type is enabled
  if (!preference.enabled) {
    return false;
  }

  // Check specific channel
  if (channel === 'email') {
    return preference.email_enabled;
  } else if (channel === 'push') {
    return preference.push_enabled;
  }

  return false;
}

/**
 * Get all admins who should receive a notification for a specific type
 */
export async function getAdminsToNotify(
  notificationType: NotificationType,
  channel: 'email' | 'push' = 'email'
): Promise<Array<{ id: string; email: string }>> {
  const adminUsers = await getAdminUsers();
  const adminsToNotify: Array<{ id: string; email: string }> = [];

  for (const admin of adminUsers) {
    const shouldNotify = await shouldSendNotification(admin.id, notificationType, channel);
    if (shouldNotify) {
      adminsToNotify.push(admin);
    }
  }

  return adminsToNotify;
}

/**
 * Create or update notification preference
 */
export async function setNotificationPreference(
  adminUserId: string,
  notificationType: NotificationType,
  enabled: boolean,
  emailEnabled: boolean,
  pushEnabled: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('admin_notification_preferences')
      .upsert({
        admin_user_id: adminUserId,
        notification_type: notificationType,
        enabled,
        email_enabled: emailEnabled,
        push_enabled: pushEnabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'admin_user_id,notification_type',
      });

    if (error) {
      console.error('Error setting notification preference:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Exception setting notification preference:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize default preferences for an admin user
 * Creates all notification types with default enabled=true, email_enabled=true
 */
export async function initializeDefaultPreferences(adminUserId: string): Promise<void> {
  const notificationTypes: NotificationType[] = [
    'index_completed',
    'index_failed',
    'user_registered',
    'subscription_created',
    'subscription_canceled',
    'payment_failed',
    'payment_succeeded',
    'quota_exceeded',
    'error_reported',
  ];

  for (const type of notificationTypes) {
    // Check if preference already exists
    const existing = await getNotificationPreference(adminUserId, type);
    if (!existing) {
      // Create default preference (enabled, email enabled, push disabled)
      await setNotificationPreference(adminUserId, type, true, true, false);
    }
  }
}

/**
 * Get notification type display name and description
 */
export function getNotificationTypeInfo(type: NotificationType): {
  name: string;
  description: string;
} {
  const info: Record<NotificationType, { name: string; description: string }> = {
    index_completed: {
      name: 'Index Completed',
      description: 'When an indexing job completes successfully',
    },
    index_failed: {
      name: 'Index Failed',
      description: 'When an indexing job fails or encounters an error',
    },
    user_registered: {
      name: 'User Registered',
      description: 'When a new user registers for an account',
    },
    subscription_created: {
      name: 'Subscription Created',
      description: 'When a user subscribes to a Pro or Team plan',
    },
    subscription_canceled: {
      name: 'Subscription Canceled',
      description: 'When a user cancels their subscription',
    },
    payment_failed: {
      name: 'Payment Failed',
      description: 'When a payment fails for a subscription',
    },
    payment_succeeded: {
      name: 'Payment Succeeded',
      description: 'When a payment is successfully processed',
    },
    quota_exceeded: {
      name: 'Quota Exceeded',
      description: 'When a user exceeds their plan limits',
    },
    error_reported: {
      name: 'Error Reported',
      description: 'When a system error is reported',
    },
  };

  return info[type];
}

/**
 * Get all available notification types
 */
export function getAllNotificationTypes(): NotificationType[] {
  return [
    'index_completed',
    'index_failed',
    'user_registered',
    'subscription_created',
    'subscription_canceled',
    'payment_failed',
    'payment_succeeded',
    'quota_exceeded',
    'error_reported',
  ];
}

