import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  NotificationsActive as NotificationsActiveIcon,
  ArrowBack,
} from '@mui/icons-material';

interface NotificationPreference {
  id: string;
  admin_user_id: string;
  notification_type: string;
  enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  name: string;
  description: string;
}

export default function AdminNotifications() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoadPreferences();
  }, []);

  const checkAdminAndLoadPreferences = async () => {
    try {
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userData);
      const adminEmails = ['ranmor01@gmail.com'];
      
      if (adminEmails.includes(user.email)) {
        setIsAdmin(true);
        await loadPreferences();
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Admin check error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get API key from user data
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) {
        router.push('/');
        return;
      }

      const user = JSON.parse(userData);
      const apiKey = user.api_key;
      if (!apiKey) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/admin/notifications/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load notification preferences');
      }

      setPreferences(data.preferences || []);
    } catch (err: any) {
      console.error('Error loading preferences:', err);
      setError(err.message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (
    notificationType: string,
    field: 'enabled' | 'email_enabled' | 'push_enabled',
    value: boolean
  ) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const preference = preferences.find((p) => p.notification_type === notificationType);
      if (!preference) return;

      const updatedPreference = {
        ...preference,
        [field]: value,
        // If disabling main toggle, also disable email and push
        enabled: field === 'enabled' ? value : preference.enabled,
        email_enabled:
          field === 'enabled' && !value
            ? false
            : field === 'email_enabled'
            ? value
            : preference.email_enabled,
        push_enabled:
          field === 'enabled' && !value
            ? false
            : field === 'push_enabled'
            ? value
            : preference.push_enabled,
      };

      // Get API key from user data
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) {
        router.push('/');
        return;
      }

      const user = JSON.parse(userData);
      const apiKey = user.api_key;
      if (!apiKey) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/admin/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          notification_type: notificationType,
          enabled: updatedPreference.enabled,
          email_enabled: updatedPreference.email_enabled,
          push_enabled: updatedPreference.push_enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update preference');
      }

      // Update local state
      setPreferences((prev) =>
        prev.map((p) =>
          p.notification_type === notificationType
            ? { ...updatedPreference, ...data.preference }
            : p
        )
      );

      setSuccess('Notification preference updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating preference:', err);
      setError(err.message || 'Failed to update preference');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.push('/admin')}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Notification Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage which email notifications you receive as an administrator
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Notification Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="center">Enabled</TableCell>
                  <TableCell align="center">Email</TableCell>
                  <TableCell align="center">Push</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preferences.map((preference) => (
                  <TableRow key={preference.notification_type}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <NotificationsIcon color="action" />
                        <Typography variant="body1" fontWeight={500}>
                          {preference.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {preference.description}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preference.enabled}
                            onChange={(e) =>
                              updatePreference(
                                preference.notification_type,
                                'enabled',
                                e.target.checked
                              )
                            }
                            disabled={saving}
                            color="primary"
                          />
                        }
                        label=""
                      />
                    </TableCell>
                    <TableCell align="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preference.email_enabled && preference.enabled}
                            onChange={(e) =>
                              updatePreference(
                                preference.notification_type,
                                'email_enabled',
                                e.target.checked
                              )
                            }
                            disabled={saving || !preference.enabled}
                            color="primary"
                          />
                        }
                        label=""
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label="Coming Soon"
                        size="small"
                        color="default"
                        variant="outlined"
                        disabled
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon />
          Email Notifications
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Email notifications are sent to your registered email address when enabled. You can
          control each notification type individually.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Note:</strong> Push notifications will be available in a future update.
        </Typography>
      </Box>
    </Container>
  );
}

