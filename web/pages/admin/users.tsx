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
  Stack
} from '@mui/material';
import { Edit, Delete, Add, ArrowBack, DeleteForever } from '@mui/icons-material';
import type { PlanLimits } from '../../lib/plans';

// Version tracking - Update this number for each fix/change
const PAGE_VERSION = 'v1.32.03'; // Faster admin users load by removing heavy computed stats
const PROTECTED_ADMIN_EMAILS = ['ranmor01@gmail.com', 'ranmor@gmail.com'];
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' '); // Auto-generated build timestamp

interface User {
  id: string;
  email: string;
  full_name: string;
  api_key: string;
  plan?: string;
  is_active: boolean;
  is_admin: boolean;
  is_guest?: boolean;
  created_at: string;
  credits_remaining?: number;
  credits_reset_date?: string | null;
}

type PlanMap = Record<string, PlanLimits>;

export default function AdminUsers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [planMap, setPlanMap] = useState<PlanMap>({});
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    is_active: true,
    is_admin: false,
    plan: 'free'
  });
  
  // Credits management state
  const [grantCreditsAmount, setGrantCreditsAmount] = useState<string>('');
  const [grantCreditsReason, setGrantCreditsReason] = useState<string>('');
  const [resetDate, setResetDate] = useState<string>('');
  const [grantingCredits, setGrantingCredits] = useState(false);
  const [updatingResetDate, setUpdatingResetDate] = useState(false);
  const [currentUserCredits, setCurrentUserCredits] = useState<{current: number; base: number | null} | null>(null);

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

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
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
      const userData = localStorage.getItem('figma_web_user');
      const apiKey = userData ? JSON.parse(userData).api_key : null;
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
        const nextPlanMap: PlanMap = {};
        (data.plans || []).forEach((plan: PlanLimits) => {
          if (plan?.id) nextPlanMap[plan.id] = plan;
        });
        setPlanMap(nextPlanMap);
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
      plan: user.is_admin ? (user.plan || 'unlimited') : (user.plan || 'free')
    });
    
    // Reset credits form
    setGrantCreditsAmount('');
    setGrantCreditsReason('');
    setResetDate(user.credits_reset_date || '');
    
    // Set current user credits
    const normalizedPlanId = user.is_admin ? 'unlimited' : ((user.plan || 'free').toLowerCase());
    const planLimits = planMap[normalizedPlanId];
    setCurrentUserCredits({
      current: user.credits_remaining || 0,
      base: planLimits ? planLimits.creditsPerMonth : null
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

  const handleGrantCredits = async () => {
    if (!selectedUser || !grantCreditsAmount || !grantCreditsReason.trim()) return;
    
    const amount = parseInt(grantCreditsAmount);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid non-zero number (positive to grant, negative to deduct)');
      return;
    }
    
    try {
      setGrantingCredits(true);
      const userData = localStorage.getItem('figma_web_user');
      const apiKey = userData ? JSON.parse(userData).api_key : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      
      const response = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: selectedUser.id,
          amount,
          reason: grantCreditsReason.trim()
        })
      });
      
      const data = await response.json();
      if (data.success) {
        const isGrant = amount > 0;
        const absoluteAmount = Math.abs(amount);
        alert(
          `Successfully ${isGrant ? 'granted' : 'deducted'} ${absoluteAmount} credits. ` +
          `New balance: ${data.newBalance}. Email notifications sent to user and admin.`
        );
        setGrantCreditsAmount('');
        setGrantCreditsReason('');
        // Update current user credits
        if (currentUserCredits) {
          setCurrentUserCredits({
            ...currentUserCredits,
            current: data.newBalance
          });
        }
        // Reload users to update the table
        await loadUsers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error granting credits:', error);
      alert(`Error granting credits: ${error.message}`);
    } finally {
      setGrantingCredits(false);
    }
  };

  const handleUpdateResetDate = async () => {
    if (!selectedUser || !resetDate) return;
    
    try {
      setUpdatingResetDate(true);
      const userData = localStorage.getItem('figma_web_user');
      const apiKey = userData ? JSON.parse(userData).api_key : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      
      const response = await fetch('/api/admin/credits/reset-date', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          userId: selectedUser.id,
          resetDate
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Reset date updated successfully');
        await loadUsers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error updating reset date:', error);
      alert(`Error updating reset date: ${error.message}`);
    } finally {
      setUpdatingResetDate(false);
    }
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
              <TableCell>Credits</TableCell>
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
                  <Chip
                    label={derivePlanValue(user.plan, user.is_admin).toUpperCase()}
                    color={getPlanChipColor(user.plan, user.is_admin)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.is_guest ? (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  ) : user.is_admin ? (
                    <Typography variant="body2" color="text.secondary">Unlimited</Typography>
                  ) : (
                    <Typography variant="body2">
                      {user.credits_remaining?.toLocaleString() || 0}
                      {(() => {
                        const base = user.plan === 'pro' ? 1000 : user.plan === 'team' ? 2000 : 100;
                        return `/${base}`;
                      })()}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  {user.is_guest ? (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handlePurge(user.id, user.email, true)}
                      title="Delete guest permanently"
                    >
                      <DeleteForever />
                    </IconButton>
                  ) : PROTECTED_ADMIN_EMAILS.includes(user.email) ? (
                    <Typography variant="caption" color="text.secondary">Protected</Typography>
                  ) : (
                    <>
                      <IconButton size="small" onClick={() => handleEdit(user)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(user.id)}>
                        <Delete />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handlePurge(user.id, user.email)} title="Delete permanently">
                        <DeleteForever />
                      </IconButton>
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

            {/* Credits Management Section */}
            {!editForm.is_admin && (
              <>
                <Box sx={{ borderTop: '1px solid #e0e0e0', pt: 2, mt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Credits Management</Typography>
                  
                  {currentUserCredits && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Current Balance:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {currentUserCredits.current.toLocaleString()}
                        </Typography>
                      </Box>
                      {currentUserCredits.base !== null && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Base Credits:
                          </Typography>
                          <Typography variant="body2">
                            {currentUserCredits.base.toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  <TextField
                    label="Add/Deduct Credits"
                    type="number"
                    value={grantCreditsAmount}
                    onChange={(e) => setGrantCreditsAmount(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    helperText="Enter positive number to grant credits, negative number to deduct (e.g., -100 to deduct 100 credits)"
                  />
                  
                  <TextField
                    label="Reason"
                    value={grantCreditsReason}
                    onChange={(e) => setGrantCreditsReason(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                    helperText="Reason for granting credits (required)"
                    placeholder="e.g., Customer support - account issue"
                  />
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGrantCredits}
                    disabled={grantingCredits || !grantCreditsAmount || !grantCreditsReason.trim()}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    {grantingCredits ? 'Processing...' : (parseInt(grantCreditsAmount) < 0 ? 'Deduct Credits' : 'Grant Credits')}
                  </Button>

                  <TextField
                    label="Reset Date"
                    type="date"
                    value={resetDate}
                    onChange={(e) => setResetDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                    helperText="Date when credits will reset to base amount"
                  />
                  
                  <Button
                    variant="outlined"
                    onClick={handleUpdateResetDate}
                    disabled={updatingResetDate || !resetDate}
                    fullWidth
                  >
                    {updatingResetDate ? 'Updating...' : 'Update Reset Date'}
                  </Button>
                </Box>
              </>
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
