import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { ArrowBack, People, Description, TrendingUp, Storage } from '@mui/icons-material';
import { requireAdminClientAccess } from '../../lib/admin-client';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  totalIndices: number;
  totalStorageUsed: number;
  averageIndicesPerUser: number;
  recentActivity: {
    newUsersToday: number;
    newUsersThisWeek: number;
    newIndicesToday: number;
    newIndicesThisWeek: number;
  };
}

export default function AdminAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAdminAndLoadAnalytics();
  }, []);

  const checkAdminAndLoadAnalytics = async () => {
    try {
      const access = await requireAdminClientAccess();
      if (!access.user) {
        router.push('/login');
        return;
      }
      if (access.ok) {
        setIsAdmin(true);
        await loadAnalytics();
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

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.stats);
        } else {
          setError(data.error || 'Failed to load analytics');
        }
      } else {
        setError('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load analytics');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin || !analytics) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/admin')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Analytics Dashboard
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Main Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <People color="primary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4">{analytics.totalUsers}</Typography>
            <Typography color="text.secondary">Total Users</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <TrendingUp color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4">{analytics.activeUsers}</Typography>
            <Typography color="text.secondary">Active Users</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Description color="secondary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4">{analytics.totalIndices}</Typography>
            <Typography color="text.secondary">Total Indices</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Storage color="info" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4">{formatFileSize(analytics.totalStorageUsed)}</Typography>
            <Typography color="text.secondary">Storage Used</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* User Stats */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          User Statistics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Active Users
            </Typography>
            <Typography variant="h5">{analytics.activeUsers}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Inactive Users
            </Typography>
            <Typography variant="h5">{analytics.inactiveUsers}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Admin Users
            </Typography>
            <Typography variant="h5">{analytics.adminUsers}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Index Stats */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Index Statistics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Indices
            </Typography>
            <Typography variant="h5">{analytics.totalIndices}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Average per User
            </Typography>
            <Typography variant="h5">{analytics.averageIndicesPerUser.toFixed(2)}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Recent Activity */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              New Users
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Today:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {analytics.recentActivity.newUsersToday}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">This Week:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {analytics.recentActivity.newUsersThisWeek}
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              New Indices
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Today:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {analytics.recentActivity.newIndicesToday}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">This Week:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {analytics.recentActivity.newIndicesThisWeek}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

