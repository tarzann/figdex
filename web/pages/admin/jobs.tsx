import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
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
  FormControlLabel,
  Switch,
  MenuItem,
} from '@mui/material';
import {
  Home,
  Refresh,
  Search,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  HourglassEmpty,
  Info,
} from '@mui/icons-material';
import { requireAdminClientAccess } from '../../lib/admin-client';

interface Job {
  id: string;
  requestId: string | null;
  source?: string;
  eventType?: string;
  userId: string | null;
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
  message?: string | null;
  canDebug?: boolean;
  debugUrl?: string | null;
}

export default function AdminJobs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [supportsFailStuckJobs, setSupportsFailStuckJobs] = useState(false);
  const [dataMode, setDataMode] = useState<'activity' | 'legacy'>('activity');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, statusFilter, categoryFilter]);

  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    const timer = setInterval(() => {
      loadJobs(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [isAdmin, autoRefresh]);

  const checkAdminStatus = async () => {
    try {
      const access = await requireAdminClientAccess();
      if (!access.user) {
        router.push('/login');
        return;
      }
      if (access.ok) {
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

  const loadJobs = async (showLoader: boolean = true) => {
    try {
      if (showLoader) setLoading(true);
      const response = await fetch('/api/admin/jobs');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobs(data.jobs || []);
          setSupportsFailStuckJobs(Boolean(data.supportsFailStuckJobs));
          setDataMode(data.mode === 'legacy' ? 'legacy' : 'activity');
        }
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const failStuckJobs = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/jobs/fail-stuck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ minutes: 30 }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to mark stuck jobs');
      }
      await loadJobs(false);
    } catch (error) {
      console.error('Failed to mark stuck jobs:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    const getCategoryForJob = (job: Job) => {
      const eventType = job.eventType || '';
      if (eventType.startsWith('share_')) return 'share';
      if (eventType.startsWith('claim_')) return 'claim';
      if (eventType.startsWith('gallery_') || eventType.startsWith('file_') || eventType.startsWith('plugin_') || eventType.startsWith('telemetry_')) return 'usage';
      if (eventType === 'reset_indices' || eventType === 'index_deleted') return 'admin';
      if (eventType === 'index_rate_limited') return 'limits';
      if (eventType.startsWith('index_') || eventType.startsWith('job_') || job.source === 'plugin' || job.source === 'job' || job.source === 'api') return 'indexing';
      return 'other';
    };

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((job) => getCategoryForJob(job) === categoryFilter);
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
        return <ErrorIcon fontSize="small" />;
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
  const categoryCounts = {
    all: jobs.length,
    indexing: jobs.filter((job) => {
      const eventType = job.eventType || '';
      return eventType.startsWith('index_') || eventType.startsWith('job_') || job.source === 'plugin' || job.source === 'job' || job.source === 'api';
    }).length,
    share: jobs.filter((job) => (job.eventType || '').startsWith('share_')).length,
    claim: jobs.filter((job) => (job.eventType || '').startsWith('claim_')).length,
    usage: jobs.filter((job) => {
      const eventType = job.eventType || '';
      return eventType.startsWith('gallery_') || eventType.startsWith('file_') || eventType.startsWith('plugin_') || eventType.startsWith('telemetry_');
    }).length,
    admin: jobs.filter((job) => ['reset_indices', 'index_deleted'].includes(job.eventType || '')).length,
    limits: jobs.filter((job) => (job.eventType || '') === 'index_rate_limited').length,
  };

  const now = Date.now();
  const completedJobs = jobs.filter((job) => job.status === 'completed' && job.processingTimeSeconds > 0);
  const avgProcessingSeconds = completedJobs.length
    ? Math.round(completedJobs.reduce((sum, job) => sum + job.processingTimeSeconds, 0) / completedJobs.length)
    : 0;
  const failedLast24h = jobs.filter((job) => {
    if (job.status !== 'failed') return false;
    return now - new Date(job.updatedAt).getTime() <= 24 * 60 * 60 * 1000;
  }).length;
  const stuckJobs = jobs.filter((job) => {
    if (!['pending', 'processing'].includes(job.status)) return false;
    return now - new Date(job.updatedAt).getTime() > 30 * 60 * 1000;
  }).length;
  const activeJobs = jobs.filter((job) => ['pending', 'processing'].includes(job.status)).length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Index Activity Log
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {dataMode === 'activity'
              ? 'Live activity from active indexing flows'
              : 'Legacy background jobs with detailed metrics'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="warning"
            onClick={failStuckJobs}
            disabled={loading || actionLoading || stuckJobs === 0 || !supportsFailStuckJobs}
          >
            Fail stuck jobs
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadJobs()}
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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">Active jobs</Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>{activeJobs}</Typography>
            <Typography variant="body2" color="text.secondary">
              {dataMode === 'activity' ? 'Recent active indexing activity' : 'Pending + processing right now'}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">Failed in last 24h</Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>{failedLast24h}</Typography>
            <Typography variant="body2" color="text.secondary">
              Useful for spotting recent instability
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">Avg completed runtime</Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>{avgProcessingSeconds ? formatTime(avgProcessingSeconds) : '—'}</Typography>
            <Typography variant="body2" color="text.secondary">
              Based on completed jobs in the current list
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, border: stuckJobs > 0 ? '1px solid #f59e0b' : '1px solid transparent' }}>
            <Typography variant="caption" color="text.secondary">Stuck over 30m</Typography>
            <Typography variant="h4" sx={{ mt: 0.5, color: stuckJobs > 0 ? '#b45309' : 'inherit' }}>{stuckJobs}</Typography>
            <Typography variant="body2" color="text.secondary">
              Jobs eligible for operational failover
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters and Stats */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flex: 1 }}>
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
                sx={{ minWidth: { xs: '100%', sm: 320 }, flex: 1 }}
              />
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All ({statusCounts.all})</MenuItem>
                <MenuItem value="pending">Pending ({statusCounts.pending})</MenuItem>
                <MenuItem value="processing">Processing ({statusCounts.processing})</MenuItem>
                <MenuItem value="completed">Completed ({statusCounts.completed})</MenuItem>
                <MenuItem value="failed">Failed ({statusCounts.failed})</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="all">Everything ({categoryCounts.all})</MenuItem>
                <MenuItem value="indexing">Indexing ({categoryCounts.indexing})</MenuItem>
                <MenuItem value="share">Share ({categoryCounts.share})</MenuItem>
                <MenuItem value="claim">Claim ({categoryCounts.claim})</MenuItem>
                <MenuItem value="usage">Usage ({categoryCounts.usage})</MenuItem>
                <MenuItem value="admin">Admin ({categoryCounts.admin})</MenuItem>
                <MenuItem value="limits">Limits ({categoryCounts.limits})</MenuItem>
              </TextField>
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Auto-refresh every 15s"
              sx={{ ml: { md: 1 } }}
            />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${filteredJobs.length} shown`} color="primary" variant="outlined" />
            {statusFilter !== 'all' && (
              <Chip size="small" label={`Status: ${statusFilter}`} onDelete={() => setStatusFilter('all')} />
            )}
            {categoryFilter !== 'all' && (
              <Chip size="small" label={`Category: ${categoryFilter}`} onDelete={() => setCategoryFilter('all')} />
            )}
            {searchTerm && (
              <Chip size="small" label={`Search: ${searchTerm}`} onDelete={() => setSearchTerm('')} />
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Jobs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Source</TableCell>
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
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {dataMode === 'activity' ? 'No index activity found yet' : 'No jobs found'}
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
                      {job.canDebug && job.debugUrl ? (
                        <Tooltip title={`View detailed debug info for job ${job.id}`}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(job.debugUrl as string, '_blank');
                            }}
                          >
                            <Info fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
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
                    <Stack spacing={0.5}>
                      <Chip
                        label={job.source || 'system'}
                        size="small"
                        variant="outlined"
                      />
                      {job.eventType ? (
                        <Typography variant="caption" color="text.secondary">
                          {job.eventType}
                        </Typography>
                      ) : null}
                    </Stack>
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
                    ) : job.message ? (
                      <Tooltip title={job.message}>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.message}
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
