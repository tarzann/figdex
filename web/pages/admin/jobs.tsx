import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Home,
  Refresh,
  Search,
  CheckCircle,
  Error,
  Schedule,
  HourglassEmpty,
  Info,
} from '@mui/icons-material';

interface Job {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  fileKey: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  nextFrameIndex: number;
  totalFrames: number;
  progress: number;
  indexFileId: number | null;
  error: string | null;
  parentJobId: string | null;
  jobIndex: number;
  totalJobs: number;
  figmaVersion: string | null;
  figmaLastModified: string | null;
  createdAt: string;
  updatedAt: string;
  processingTimeMs: number;
  processingTimeSeconds: number;
  processingTimeMinutes: number;
  selectedPages: string[];
  selectedPageIds: string[];
}

export default function AdminJobs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, statusFilter]);

  const checkAdminStatus = async () => {
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
        loadJobs();
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

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/jobs');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobs(data.jobs || []);
        }
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.userEmail.toLowerCase().includes(term) ||
        job.fileName.toLowerCase().includes(term) ||
        job.fileKey.toLowerCase().includes(term) ||
        job.id.toLowerCase().includes(term)
      );
    }

    setFilteredJobs(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'failed':
        return <Error fontSize="small" />;
      case 'processing':
        return <CircularProgress size={16} />;
      case 'pending':
        return <HourglassEmpty fontSize="small" />;
      default:
        return <Schedule fontSize="small" />;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && jobs.length === 0) {
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

  const statusCounts = {
    all: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Index Jobs Log
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View all indexing jobs with detailed metrics
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadJobs}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={() => router.push('/admin')}
          >
            Admin Dashboard
          </Button>
        </Stack>
      </Box>

      {/* Filters and Stats */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search by email, file name, file key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`All (${statusCounts.all})`}
              onClick={() => setStatusFilter('all')}
              color={statusFilter === 'all' ? 'primary' : 'default'}
              variant={statusFilter === 'all' ? 'filled' : 'outlined'}
            />
            <Chip
              label={`Pending (${statusCounts.pending})`}
              onClick={() => setStatusFilter('pending')}
              color={statusFilter === 'pending' ? 'primary' : 'default'}
              variant={statusFilter === 'pending' ? 'filled' : 'outlined'}
            />
            <Chip
              label={`Processing (${statusCounts.processing})`}
              onClick={() => setStatusFilter('processing')}
              color={statusFilter === 'processing' ? 'primary' : 'default'}
              variant={statusFilter === 'processing' ? 'filled' : 'outlined'}
            />
            <Chip
              label={`Completed (${statusCounts.completed})`}
              onClick={() => setStatusFilter('completed')}
              color={statusFilter === 'completed' ? 'primary' : 'default'}
              variant={statusFilter === 'completed' ? 'filled' : 'outlined'}
            />
            <Chip
              label={`Failed (${statusCounts.failed})`}
              onClick={() => setStatusFilter('failed')}
              color={statusFilter === 'failed' ? 'primary' : 'default'}
              variant={statusFilter === 'failed' ? 'filled' : 'outlined'}
            />
          </Box>
        </Stack>
      </Paper>

      {/* Jobs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>User</TableCell>
              <TableCell>File Name</TableCell>
              <TableCell>File Key</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Processing Time</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No jobs found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        icon={getStatusIcon(job.status)}
                        label={job.status.toUpperCase()}
                        color={getStatusColor(job.status) as any}
                        size="small"
                      />
                      <Tooltip title={`View detailed debug info for job ${job.id}`}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `/api/admin/debug-job?jobId=${job.id}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {job.parentJobId && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Split: {job.jobIndex + 1}/{job.totalJobs}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                      {job.id.substring(0, 12)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{job.userEmail}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.userName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.fileName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.fileKey}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ minWidth: 100 }}>
                      <Typography variant="body2">
                        {job.nextFrameIndex} / {job.totalFrames} ({job.progress}%)
                      </Typography>
                      <Box sx={{ width: '100%', height: 8, bgcolor: 'grey.200', borderRadius: 1, mt: 0.5, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${job.progress}%`,
                            height: '100%',
                            bgcolor: job.status === 'failed' ? 'error.main' : 'primary.main',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {job.status === 'completed' || job.status === 'failed' ? (
                      <Tooltip title={`${job.processingTimeMs}ms`}>
                        <Typography variant="body2">
                          {formatTime(job.processingTimeSeconds)}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        In progress...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {formatDate(job.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {formatDate(job.updatedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {job.error ? (
                      <Tooltip title={job.error}>
                        <Typography variant="body2" color="error" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.error.substring(0, 50)}...
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Container>
  );
}

