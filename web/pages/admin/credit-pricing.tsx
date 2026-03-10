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
  Divider
} from '@mui/material';
import { Edit, Delete, Add, ArrowBack, Close, Check } from '@mui/icons-material';

// Version tracking
const PAGE_VERSION = 'v1.29.4';
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' ');

interface CreditPricing {
  id: string;
  action_key: string;
  action_name: string;
  credits: number;
  description?: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AdminCreditPricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pricing, setPricing] = useState<CreditPricing[]>([]);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState<CreditPricing | null>(null);
  const [formData, setFormData] = useState({
    action_key: '',
    action_name: '',
    credits: '',
    description: '',
    enabled: true,
    sort_order: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdminAndLoadPricing();
  }, []);

  const checkAdminAndLoadPricing = async () => {
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
        await loadPricing(user.api_key);
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

  const loadPricing = async (apiKey: string) => {
    try {
      const res = await fetch('/api/admin/credit-pricing?all=true');
      const json = await res.json();
      if (json.success && json.pricingList) {
        setPricing(json.pricingList);
      } else {
        setError(json.error || 'Failed to load pricing');
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
      setError('Failed to load pricing');
    }
  };

  const handleEdit = (item: CreditPricing) => {
    setSelectedPricing(item);
    setFormData({
      action_key: item.action_key,
      action_name: item.action_name,
      credits: item.credits.toString(),
      description: item.description || '',
      enabled: item.enabled,
      sort_order: item.sort_order
    });
    setEditDialog(true);
  };

  const handleCreate = () => {
    setSelectedPricing(null);
    setFormData({
      action_key: '',
      action_name: '',
      credits: '',
      description: '',
      enabled: true,
      sort_order: pricing.length
    });
    setCreateDialog(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) return;
      const user = JSON.parse(userData);

      const payload = {
        ...formData,
        credits: parseInt(formData.credits),
        sort_order: parseInt(formData.sort_order.toString()) || 0
      };

      const url = '/api/admin/credit-pricing';
      const method = selectedPricing ? 'PUT' : 'POST';

      const requestBody = selectedPricing 
        ? { id: selectedPricing.id, ...payload }
        : payload;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.api_key}`
        },
        body: JSON.stringify(requestBody)
      });

      const json = await res.json();
      if (json.success) {
        await loadPricing(user.api_key);
        setEditDialog(false);
        setCreateDialog(false);
        setSelectedPricing(null);
        setError('');
      } else {
        setError(json.error || 'Failed to save pricing');
      }
    } catch (error: any) {
      console.error('Error saving pricing:', error);
      setError(error.message || 'Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CreditPricing) => {
    if (!confirm(`Are you sure you want to delete pricing for "${item.action_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) return;
      const user = JSON.parse(userData);

      const res = await fetch(`/api/admin/credit-pricing?id=${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.api_key}`
        }
      });

      const json = await res.json();
      if (json.success) {
        await loadPricing(user.api_key);
      } else {
        setError(json.error || 'Failed to delete pricing');
      }
    } catch (error: any) {
      console.error('Error deleting pricing:', error);
      setError(error.message || 'Failed to delete pricing');
    }
  };

  // Group pricing by category
  const groupedPricing = pricing.reduce((acc, item) => {
    let category = 'Other';
    if (item.action_key.includes('FILE_')) {
      category = 'Indexing';
    } else if (item.action_key.includes('QUOTA')) {
      category = item.action_key.startsWith('TEAM_') ? 'Team Quota' : 'Quota Increases';
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, CreditPricing[]>);

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
              Credit Pricing Management
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreate}
        >
          Create Pricing
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {Object.entries(groupedPricing).map(([category, items]) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {category}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Action Key</TableCell>
                  <TableCell>Action Name</TableCell>
                  <TableCell>Credits</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sort Order</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                        {item.action_key}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.action_name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.credits.toLocaleString()} 
                        color="primary" 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {item.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.enabled ? 'Enabled' : 'Disabled'}
                        color={item.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{item.sort_order}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(item)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(item)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}

      {pricing.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No pricing entries found. Create your first pricing entry to get started.
          </Typography>
        </Paper>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog || createDialog} onClose={() => { setEditDialog(false); setCreateDialog(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedPricing ? 'Edit Pricing' : 'Create Pricing'}
            </Typography>
            <IconButton onClick={() => { setEditDialog(false); setCreateDialog(false); }} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Action Key"
              fullWidth
              value={formData.action_key}
              onChange={(e) => setFormData({ ...formData, action_key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              required
              disabled={!!selectedPricing}
              helperText="Unique identifier (e.g., FILE_INDEX, FILE_REINDEX)"
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
            <TextField
              label="Action Name"
              fullWidth
              value={formData.action_name}
              onChange={(e) => setFormData({ ...formData, action_name: e.target.value })}
              required
              helperText="Human-readable name"
            />
            <TextField
              label="Credits"
              type="number"
              fullWidth
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
              required
              inputProps={{ min: 1 }}
              helperText="Number of credits required for this action"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              helperText="Optional description"
            />
            <TextField
              label="Sort Order"
              type="number"
              fullWidth
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              helperText="Display order (lower numbers appear first)"
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
          <Button onClick={() => { setEditDialog(false); setCreateDialog(false); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.action_key || !formData.action_name || !formData.credits}
            startIcon={saving ? <CircularProgress size={16} /> : <Check />}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

