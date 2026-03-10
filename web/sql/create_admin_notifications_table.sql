-- Admin Notification Preferences Table
-- Stores admin notification settings for various events

CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false, -- For future push notifications
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(admin_user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_admin_notification_preferences_user_id ON admin_notification_preferences(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_preferences_type ON admin_notification_preferences(notification_type);

COMMENT ON TABLE admin_notification_preferences IS 'Stores admin notification preferences for various system events';
COMMENT ON COLUMN admin_notification_preferences.notification_type IS 'Type of notification: index_completed, index_failed, user_registered, subscription_created, subscription_canceled, payment_failed, etc.';
COMMENT ON COLUMN admin_notification_preferences.email_enabled IS 'Whether to send email notification for this type';
COMMENT ON COLUMN admin_notification_preferences.push_enabled IS 'Whether to send push notification for this type (future feature)';

-- Insert default notification preferences for admin users
-- This will be done when admin accesses notification settings for the first time

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_notification_preferences_updated_at
BEFORE UPDATE ON admin_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_admin_notification_preferences_updated_at();

-- Notification Types Constants (for reference in code):
-- 'index_completed' - When an indexing job completes successfully
-- 'index_failed' - When an indexing job fails
-- 'user_registered' - When a new user registers
-- 'subscription_created' - When a user subscribes to a plan
-- 'subscription_canceled' - When a user cancels subscription
-- 'payment_failed' - When a payment fails
-- 'payment_succeeded' - When a payment succeeds
-- 'quota_exceeded' - When a user exceeds their quota
-- 'error_reported' - When an error is reported by the system

