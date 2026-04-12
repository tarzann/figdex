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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
  Tooltip
} from '@mui/material';
import { Edit, Delete, ArrowBack, DeleteForever, RestartAlt } from '@mui/icons-material';
import { requireAdminClientAccess } from '../../lib/admin-client';

// Version tracking - Update this number for each fix/change
const PAGE_VERSION = 'v1.32.05'; // Show plan usage in admin users table
const PROTECTED_ADMIN_EMAILS = ['ranmor01@gmail.com', 'ranmor@gmail.com'];
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' '); // Auto-generated build timestamp

interface User {
  id: string;
  email: string;
  full_name: string;
  api_key: string;
  plan?: string;
  plan_label?: string;
  is_active: boolean;
  is_admin: boolean;
  is_guest?: boolean;
  created_at: string;
  bypass_indexing_limits?: boolean;
  usage_files?: number;
  usage_frames?: number;
  max_projects?: number | null;
  max_frames_total?: number | null;
}

export default function AdminUsers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    is_active: true,
    is_admin: false,
    plan: 'free',
    bypass_indexing_limits: false
  });

  const derivePlanValue = (plan?: string, isAdmin?: boolean) => {
    if (plan === 'guest') return 'guest';
    if (isAdmin) return 'unlimited';
    return (plan || 'free').toLowerCase();
  };

  const getPlanChipColor = (plan?: string, isAdmin?: boolean) => {
    const normalized = derivePlanValue(plan, isAdmin);
    if (normalized === 'unlimited') return 'secondary';
    if (normalized === 'pro') return 'primary';
    if (normalized === 'guest') return 'warning';
    return 'default';
  };

  const formatLimit = (current?: number, max?: number | null) => {
    const currentValue = typeof current === 'number' ? current : 0;
    if (max === null || typeof max === 'undefined') return `${currentValue} / Unlimited`;
    return `${currentValue} / ${max}`;
  };

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      const access = await requireAdminClientAccess();
      if (!access.user) {
        router.push('/login');
        return;
      }
      if (access.ok) {
        setIsAdmin(true);
        await loadUsers();
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

  const loadUsers = async () => {
    try {
      const access = await requireAdminClientAccess();
      const apiKey = access.apiKey;
      if (!apiKey) {
        setError('No API key found. Please login again.');
        return;
      }
      const headers: Record<string, string> = {};
      headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await fetch('/api/admin/users', { headers });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(data.users || []);
        setError('');
      } else {
        setError(data.error || data.message || `Failed to load users (${response.status})`);
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      setError(`Failed to load users: ${error.message || 'Network error'}`);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      is_active: user.is_active,
      is_admin: user.is_admin || false,
      plan: user.is_admin ? (user.plan || 'unlimited') : (user.plan || 'free'),
      bypass_indexing_limits: Boolean(user.bypass_indexing_limits)
    });
    setEditDialog(true);
  };

  const handleAdminToggle = (nextIsAdmin: boolean) => {
    setEditForm((prev) => {
      const fallbackPlan = nextIsAdmin
        ? 'unlimited'
        : (prev.plan === 'unlimited' ? 'pro' : (prev.plan || 'free'));
      return {
        ...prev,
        is_admin: nextIsAdmin,
        plan: fallbackPlan
      };
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const userData = localStorage.getItem('figma_web_user');
      const apiKey = userData ? JSON.parse(userData).api_key : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.success) {
        setEditDialog(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      setError('Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const userData = localStorage.getItem('figma_web_user');
      const apiKey = userData ? JSON.parse(userData).api_key : null;
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      , headers });

      const data = await response.json();
      if (data.success) {
        await loadUsers();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      setError('Failed to delete user');
    }
  };

  const handlePurge = async (userId: string, email: string, isGuest = false) => {
    const entityLabel = isGuest ? `guest ${email}` : `user ${email}`;
    const impactLabel = isGuest
      ? 'This will remove all guest indices for this anon user.'
      : 'This will remove account, indices and storage.';
    const step1 = confirm(`Delete permanently the ${entityLabel}? ${impactLabel} This action cannot be undone.`);
    if (!step1) return;
    const step2 = prompt('Type DELETE to confirm permanent deletion');
    if (step2 !== 'DELETE') return;
    try {
      const userData = localStorage.getItem('figma_web_user');
      const apiKey = userData ? JSON.parse(userData).api_key : null;
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await fetch(`/api/admin/users/${userId}/purge`, { method: 'POST', headers });
      const data = await response.json();
      if (data.success) {
        await loadUsers();
        alert(isGuest ? 'Guest deleted permanently' : 'User deleted permanently');
      } else {
        setError(data.error || 'Failed to delete user permanently');
      }
    } catch (error) {
      console.error('Failed to purge user:', error);
      setError('Failed to delete user permanently');
    }
  };

  const handleResetIndices = async (userId: string, email: string, isGuest = false) => {
    const entityLabel = isGuest ? `guest ${email}` : `user ${email}`;
    const impactLabel = isGuest
      ? 'This will remove all guest indices and reset guest usage stats.'
      : 'This will remove all indices and usage stats, but keep the account and plan.';
    const confirmed = confirm(`Reset indices for ${entityLabel}? ${impactLabel}`);
    if (!confirmed) return;

    try {
      const access = await requireAdminClientAccess();
      const apiKey = access.apiKey;
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-indices`, { method: 'POST', headers });
      const data = await response.json();
      if (data.success) {
        setUsers((prev) => {
          if (isGuest) {
            return prev.filter((user) => user.id !== userId);
          }
          return prev.map((user) => {
            if (user.id !== userId) return user;
            return {
              ...user,
              usage_files: 0,
              usage_frames: 0,
            };
          });
        });
        if (selectedUser?.id === userId && !isGuest) {
          setSelectedUser({
            ...selectedUser,
            usage_files: 0,
            usage_frames: 0,
          });
        }
        await loadUsers();
        alert(isGuest ? 'Guest indices reset successfully' : 'User indices reset successfully');
      } else {
        setError(data.error || data.details || 'Failed to reset user indices');
      }
    } catch (error) {
      console.error('Failed to reset user indices:', error);
      setError(error instanceof Error ? error.message : 'Failed to reset user indices');
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/admin')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              User Management
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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.full_name || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.is_admin && (
                    <Chip label="Admin" color="primary" size="small" />
                  )}
                  {user.is_guest && (
                    <Chip label="Guest" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Stack spacing={0.5} alignItems="flex-start">
                    <Chip
                      label={(user.plan_label || derivePlanValue(user.plan, user.is_admin)).toUpperCase()}
                      color={getPlanChipColor(user.plan, user.is_admin)}
                      size="small"
                    />
                    {user.bypass_indexing_limits && (
                      <Chip label="Bypass limits" color="warning" variant="outlined" size="small" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2">
                      Files: {formatLimit(user.usage_files, user.max_projects)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Frames: {formatLimit(user.usage_frames, user.max_frames_total)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  {user.is_guest ? (
                    <>
                      <Tooltip title="Reset guest indices">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleResetIndices(user.id, user.email, true)}
                        >
                          <RestartAlt />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete guest permanently">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handlePurge(user.id, user.email, true)}
                        >
                          <DeleteForever />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : PROTECTED_ADMIN_EMAILS.includes(user.email) ? (
                    <Typography variant="caption" color="text.secondary">Protected</Typography>
                  ) : (
                    <>
                      <Tooltip title="Edit user">
                        <IconButton size="small" onClick={() => handleEdit(user)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset user indices">
                        <IconButton size="small" color="warning" onClick={() => handleResetIndices(user.id, user.email)}>
                          <RestartAlt />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate user">
                        <IconButton size="small" onClick={() => handleDelete(user.id)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete permanently">
                        <IconButton size="small" color="error" onClick={() => handlePurge(user.id, user.email)}>
                          <DeleteForever />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Full Name"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Plan"
              value={editForm.plan}
              onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
              disabled={editForm.is_admin}
              fullWidth
              helperText={editForm.is_admin ? 'Admins use the Unlimited plan automatically' : undefined}
            >
              <MenuItem value="free">Free</MenuItem>
              <MenuItem value="pro">Pro</MenuItem>
              <MenuItem value="unlimited" disabled={!editForm.is_admin}>Unlimited (admins only)</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_admin}
                  onChange={(e) => handleAdminToggle(e.target.checked)}
                />
              }
              label="Admin"
            />
            {!editForm.is_admin && (
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.bypass_indexing_limits}
                    onChange={(e) => setEditForm({ ...editForm, bypass_indexing_limits: e.target.checked })}
                  />
                }
                label="Bypass indexing cooldown & limits"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
