import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  GroupAdd,
  Insights,
  PersonAdd,
  Search,
  Shield,
  TaskAlt,
} from '@mui/icons-material';
import { requireAdminClientAccess } from '../../lib/admin-client';

type FlowStep = {
  key: string;
  label: string;
  description: string;
  eventCount: number;
  actorCount: number;
  conversionFromPrevious: number | null;
};

type FlowMetric = {
  eventCount: number;
  actorCount: number;
};

type FlowResponse = {
  success: boolean;
  windowDays: number;
  generatedAt: string;
  funnel: {
    steps: FlowStep[];
    metrics: {
      pluginOpened: FlowMetric;
      guestFlow: FlowMetric;
      pluginConnected: FlowMetric;
      claimStarted: FlowMetric;
      claimCompleted: FlowMetric;
      freeSignups: FlowMetric;
      indexStarted: FlowMetric;
      indexCompleted: FlowMetric;
      indexFailed: FlowMetric;
      rateLimited: FlowMetric;
      searches: FlowMetric;
    };
  };
  recentFlowEvents: Array<{
    id: string;
    createdAt: string;
    eventType: string;
    status: string;
    source: string;
    userEmail: string | null;
    fileName: string | null;
    message: string;
  }>;
  topFailureRows: Array<{
    id: string;
    createdAt: string;
    eventType: string;
    status: string;
    userEmail: string | null;
    fileName: string | null;
    message: string;
  }>;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusColor(status: string) {
  if (status === 'failed') return 'error';
  if (status === 'completed') return 'success';
  if (status === 'processing') return 'warning';
  return 'default';
}

export default function AdminUserFlowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [data, setData] = useState<FlowResponse | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadFlow(false);
    }
  }, [days]);

  const checkAdminStatus = async () => {
    try {
      const access = await requireAdminClientAccess();
      if (!access.user) {
        router.push('/login');
        return;
      }
      if (!access.ok) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await loadFlow(true);
    } catch (err) {
      console.error('Admin check error:', err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadFlow = async (showLoader: boolean) => {
    try {
      if (showLoader) setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/user-flow?days=${days}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load user flow');
      }
      setData(payload);
    } catch (err: any) {
      console.error('Failed to load user flow:', err);
      setError(err?.message || 'Failed to load user flow');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: 'Plugin opens',
        value: data.funnel.metrics.pluginOpened.actorCount,
        detail: `${data.funnel.metrics.pluginOpened.eventCount} events`,
        icon: <Insights color="primary" sx={{ fontSize: 36 }} />,
      },
      {
        label: 'Guest users',
        value: data.funnel.metrics.guestFlow.actorCount,
        detail: `${data.funnel.metrics.guestFlow.eventCount} guest events`,
        icon: <Shield color="warning" sx={{ fontSize: 36 }} />,
      },
      {
        label: 'Free signups',
        value: data.funnel.metrics.freeSignups.actorCount,
        detail: `${data.funnel.metrics.claimCompleted.actorCount} completed claims`,
        icon: <PersonAdd color="success" sx={{ fontSize: 36 }} />,
      },
      {
        label: 'Successful indexers',
        value: data.funnel.metrics.indexCompleted.actorCount,
        detail: `${data.funnel.metrics.indexCompleted.eventCount} completed runs`,
        icon: <TaskAlt color="info" sx={{ fontSize: 36 }} />,
      },
    ];
  }, [data]);

  if (loading && !data) {
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/admin')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              User Flow
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor how users move from plugin usage to guest flow, signup, and successful indexing.
            </Typography>
          </Box>
        </Box>
        <TextField
          select
          size="small"
          label="Window"
          value={days}
          onChange={(event) => setDays(event.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="7">Last 7 days</MenuItem>
          <MenuItem value="30">Last 30 days</MenuItem>
          <MenuItem value="60">Last 60 days</MenuItem>
          <MenuItem value="90">Last 90 days</MenuItem>
        </TextField>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                {card.icon}
                <Chip label={`${days}d`} size="small" variant="outlined" />
              </Stack>
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                {card.value}
              </Typography>
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                {card.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.detail}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6">Flow Funnel</Typography>
            <Typography variant="body2" color="text.secondary">
              Each step shows total activity and unique actors in the selected time window.
            </Typography>
          </Box>
          <Chip
            icon={<GroupAdd />}
            label={`Generated ${data ? formatDate(data.generatedAt) : '—'}`}
            variant="outlined"
          />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          {data?.funnel.steps.map((step) => (
            <Paper
              key={step.key}
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 3 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {step.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
                {typeof step.conversionFromPrevious === 'number' ? (
                  <Chip label={`${step.conversionFromPrevious}%`} color="primary" size="small" />
                ) : (
                  <Chip label="Entry point" size="small" variant="outlined" />
                )}
              </Stack>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Unique actors
                  </Typography>
                  <Typography variant="h5">{step.actorCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Events
                  </Typography>
                  <Typography variant="h5">{step.eventCount}</Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.35fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Flow Events
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Context</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.recentFlowEvents.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>{formatDate(event.createdAt)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{event.eventType}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.source}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={event.status} size="small" color={statusColor(event.status) as any} />
                    </TableCell>
                    <TableCell>{event.userEmail || 'Guest / unknown'}</TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{event.fileName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.message || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Friction Points
          </Typography>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Indexing failures
              </Typography>
              <Typography variant="h4">
                {data?.funnel.metrics.indexFailed.eventCount || 0}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Rate-limited attempts
              </Typography>
              <Typography variant="h4">
                {data?.funnel.metrics.rateLimited.eventCount || 0}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Search actions
              </Typography>
              <Typography variant="h4">
                {data?.funnel.metrics.searches.eventCount || 0}
              </Typography>
            </Paper>
          </Stack>

          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1.5 }}>
            Recent failures
          </Typography>
          <Stack spacing={1.5}>
            {data?.topFailureRows.length ? data.topFailureRows.map((row) => (
              <Paper key={row.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5, gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.eventType}
                  </Typography>
                  <Chip label={row.status} size="small" color={statusColor(row.status) as any} />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatDate(row.createdAt)} • {row.userEmail || 'Guest / unknown'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {row.message || row.fileName || 'No details'}
                </Typography>
              </Paper>
            )) : (
              <Alert severity="success">No recent failures or rate limits in this window.</Alert>
            )}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
