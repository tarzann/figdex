import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Container, Typography, Card, Paper, CircularProgress, Alert, Button } from '@mui/material';
import { People, Description, TrendingUp, Settings, Home, History, AddBox, Notifications } from '@mui/icons-material';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalIndices: 0,
    activeUsers: 0
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      // Check if user is logged in
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userData);
      
      // For now, check if user email matches admin email
      // This is a temporary solution until we implement proper session handling
      const adminEmails = ['ranmor01@gmail.com'];
      
      if (adminEmails.includes(user.email)) {
        setIsAdmin(true);
        // Load stats from API
        loadStats();
      } else {
        console.log('User is not admin:', user.email);
        router.push('/');
      }
    } catch (error) {
      console.error('Admin check error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats({
            totalUsers: data.stats.totalUsers || 0,
            totalIndices: data.stats.totalIndices || 0,
            activeUsers: data.stats.activeUsers || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Alert severity="error">Access denied. Admin privileges required.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome to the Indexo Admin Panel
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<Home />}
          onClick={() => router.push('/')}
          sx={{ height: 'fit-content' }}
        >
          Back to Site
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <People color="primary" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" component="div">
            {stats.totalUsers}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Users
          </Typography>
        </Card>

        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Description color="secondary" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" component="div">
            {stats.totalIndices}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Indices
          </Typography>
        </Card>

        <Card sx={{ p: 3, textAlign: 'center' }}>
          <TrendingUp color="success" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" component="div">
            {stats.activeUsers}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Active Users
          </Typography>
        </Card>

        <Card sx={{ p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }} onClick={() => router.push('/')}>
          <Settings color="action" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" component="div">
            Go Home
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Back to Site
          </Typography>
        </Card>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Card 
            sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            onClick={() => router.push('/admin/users')}
          >
            <People sx={{ mb: 1 }} />
            <Typography variant="body1">Manage Users</Typography>
          </Card>

          <Card 
            sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            onClick={() => router.push('/admin/indices')}
          >
            <Description sx={{ mb: 1 }} />
            <Typography variant="body1">Manage Indices</Typography>
          </Card>

          <Card 
            sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            onClick={() => router.push('/admin/analytics')}
          >
            <TrendingUp sx={{ mb: 1 }} />
            <Typography variant="body1">View Analytics</Typography>
          </Card>

          <Card 
            sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            onClick={() => router.push('/admin/jobs')}
          >
            <History sx={{ mb: 1 }} />
            <Typography variant="body1">Index Jobs Log</Typography>
          </Card>

          <Card 
            sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            onClick={() => router.push('/admin/plans')}
          >
            <Settings sx={{ mb: 1 }} />
            <Typography variant="body1">Plans</Typography>
          </Card>

          <Card 
            sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            onClick={() => router.push('/admin/addons')}
          >
            <AddBox sx={{ mb: 1 }} />
            <Typography variant="body1">Add-ons</Typography>
          </Card>

          <Card 
            sx={{ p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            onClick={() => router.push('/admin/notifications')}
          >
            <Notifications sx={{ mb: 1 }} />
            <Typography variant="body1">Notifications</Typography>
          </Card>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Activity feed will be displayed here
        </Typography>
      </Paper>
    </Container>
  );
}
