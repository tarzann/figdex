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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  InputAdornment
} from '@mui/material';
import { Edit, ArrowBack, Close, Check } from '@mui/icons-material';
import { formatBytes } from '../../lib/plans';
import { requireAdminClientAccess } from '../../lib/admin-client';

const PAGE_VERSION = 'v1.0.0';
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' ');

interface Plan {
  plan_id: string;
  label: string;
  max_projects: number | null;
  max_frames_total: number | null;
  max_index_size_bytes: number | null;
  retention_days: number | null;
  max_uploads_per_day: number | null;
  max_uploads_per_month: number | null;
  max_frames_per_month: number | null;
  max_indexes_per_day: number | null;
  is_subscribable: boolean;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = () => ({
  label: '',
  max_projects: '',
  max_frames_total: '',
  max_index_size_bytes: '',
  retention_days: '',
  max_uploads_per_day: '',
  max_uploads_per_month: '',
  max_frames_per_month: '',
  max_indexes_per_day: '',
  is_subscribable: false,
  enabled: true,
  sort_order: 0
});

function toForm(plan: Plan) {
  return {
    label: plan.label,
    max_projects: plan.max_projects == null ? '' : String(plan.max_projects),
    max_frames_total: plan.max_frames_total == null ? '' : String(plan.max_frames_total),
    max_index_size_bytes: plan.max_index_size_bytes == null ? '' : String(plan.max_index_size_bytes),
    retention_days: plan.retention_days == null ? '' : String(plan.retention_days),
    max_uploads_per_day: plan.max_uploads_per_day == null ? '' : String(plan.max_uploads_per_day),
    max_uploads_per_month: plan.max_uploads_per_month == null ? '' : String(plan.max_uploads_per_month),
    max_frames_per_month: plan.max_frames_per_month == null ? '' : String(plan.max_frames_per_month),
    max_indexes_per_day: plan.max_indexes_per_day == null ? '' : String(plan.max_indexes_per_day),
    is_subscribable: plan.is_subscribable,
    enabled: plan.enabled,
    sort_order: plan.sort_order
  };
}

export default function AdminPlans() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdminAndLoadPlans();
  }, []);

  const checkAdminAndLoadPlans = async () => {
    try {
      const access = await requireAdminClientAccess();
      if (!access.user) {
        router.push('/login');
        return;
      }
      if (access.ok && access.apiKey) {
        setIsAdmin(true);
        await loadPlans(access.apiKey);
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

  const loadPlans = async (apiKey: string) => {
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const json = await res.json();
      if (json.success && json.plans) {
        setPlans(json.plans);
      } else {
        setError(json.error || 'Failed to load plans');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    }
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData(toForm(plan));
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedPlan) return;
    try {
      setSaving(true);
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) return;
      const user = JSON.parse(userData);

      const payload: Record<string, unknown> = {
        plan_id: selectedPlan.plan_id,
        label: formData.label,
        is_subscribable: formData.is_subscribable,
        enabled: formData.enabled,
        sort_order: formData.sort_order
      };

      const numericFields = [
        'max_projects', 'max_frames_total', 'max_index_size_bytes', 'retention_days',
        'max_uploads_per_day', 'max_uploads_per_month', 'max_frames_per_month',
        'max_indexes_per_day'
      ] as const;
      for (const f of numericFields) {
        const v = formData[f];
        if (v === '') {
          payload[f] = null;
        } else {
          const n = f === 'max_index_size_bytes' ? parseInt(String(v), 10) : parseInt(String(v), 10);
          payload[f] = Number.isNaN(n) ? null : n;
        }
      }

      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.api_key}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        await loadPlans(user.api_key);
        setEditDialog(false);
        setSelectedPlan(null);
        setError('');
      } else {
        setError(json.error || 'Failed to save plan');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const fmtNum = (n: number | null) => (n == null ? '∞' : n.toLocaleString());
  const fmtBytes = (b: number | null) => (b == null ? '∞' : formatBytes(b));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) return null;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => router.push('/admin')}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1">
            Plans Management
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Chip
              label={PAGE_VERSION}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
              {PAGE_VERSION_BUILD_DATE}
            </Typography>
          </Stack>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Plan</TableCell>
              <TableCell align="right">Projects</TableCell>
              <TableCell align="right">Frames</TableCell>
              <TableCell align="right">Index Size</TableCell>
              <TableCell align="right">Retention</TableCell>
              <TableCell align="right">Indexes/Day</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.plan_id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {plan.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {plan.plan_id}
                  </Typography>
                  {plan.is_subscribable && (
                    <Chip label="Subscribable" size="small" color="primary" sx={{ ml: 0.5 }} />
                  )}
                </TableCell>
                <TableCell align="right">{fmtNum(plan.max_projects)}</TableCell>
                <TableCell align="right">{fmtNum(plan.max_frames_total)}</TableCell>
                <TableCell align="right">{fmtBytes(plan.max_index_size_bytes)}</TableCell>
                <TableCell align="right">{plan.retention_days == null ? '∞' : `${plan.retention_days}d`}</TableCell>
                <TableCell align="right">{fmtNum(plan.max_indexes_per_day)}</TableCell>
                <TableCell>
                  <Chip
                    label={plan.enabled ? 'Enabled' : 'Disabled'}
                    color={plan.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleEdit(plan)}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Edit Plan: {selectedPlan?.label}</Typography>
            <IconButton onClick={() => setEditDialog(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Label"
              fullWidth
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            />
            <TextField
              label="Max Projects"
              type="number"
              fullWidth
              value={formData.max_projects}
              onChange={(e) => setFormData({ ...formData, max_projects: e.target.value })}
              placeholder="Empty = unlimited"
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Max Frames Total"
              type="number"
              fullWidth
              value={formData.max_frames_total}
              onChange={(e) => setFormData({ ...formData, max_frames_total: e.target.value })}
              placeholder="Empty = unlimited"
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Max Index Size (bytes)"
              type="number"
              fullWidth
              value={formData.max_index_size_bytes}
              onChange={(e) => setFormData({ ...formData, max_index_size_bytes: e.target.value })}
              placeholder="Empty = unlimited"
              InputProps={{
                endAdornment: formData.max_index_size_bytes ? (
                  <InputAdornment position="end">{formatBytes(parseInt(formData.max_index_size_bytes, 10) || 0)}</InputAdornment>
                ) : null
              }}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Retention Days"
              type="number"
              fullWidth
              value={formData.retention_days}
              onChange={(e) => setFormData({ ...formData, retention_days: e.target.value })}
              placeholder="Empty = unlimited"
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Max Indexes Per Day"
              type="number"
              fullWidth
              value={formData.max_indexes_per_day}
              onChange={(e) => setFormData({ ...formData, max_indexes_per_day: e.target.value })}
              placeholder="Empty = no limit"
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Max Frames Per Month"
              type="number"
              fullWidth
              value={formData.max_frames_per_month}
              onChange={(e) => setFormData({ ...formData, max_frames_per_month: e.target.value })}
              placeholder="Empty = no limit"
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Sort Order"
              type="number"
              fullWidth
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_subscribable}
                  onChange={(e) => setFormData({ ...formData, is_subscribable: e.target.checked })}
                />
              }
              label="Subscribable (Pro/Team)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <Check />}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
