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
  Stack
} from '@mui/material';
import { Edit, Delete, Add, ArrowBack, Close, Check } from '@mui/icons-material';

// Version tracking
const PAGE_VERSION = 'v1.29.0';
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' ');

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  stripe_price_id?: string | null;
  description?: string | null;
  featured: boolean;
  popular: boolean;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AdminCreditPackages() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    credits: '',
    price_usd: '',
    stripe_price_id: '',
    description: '',
    featured: false,
    popular: false,
    enabled: true,
    sort_order: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdminAndLoadPackages();
  }, []);

  const checkAdminAndLoadPackages = async () => {
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
        await loadPackages(user.api_key);
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

  const loadPackages = async (apiKey: string) => {
    try {
      const res = await fetch('/api/credits/packages?all=true');
      const json = await res.json();
      if (json.success && json.packages) {
        setPackages(json.packages);
      } else {
        setError(json.error || 'Failed to load packages');
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      setError('Failed to load packages');
    }
  };

  const handleEdit = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      credits: pkg.credits.toString(),
      price_usd: pkg.price_usd.toString(),
      stripe_price_id: pkg.stripe_price_id || '',
      description: pkg.description || '',
      featured: pkg.featured,
      popular: pkg.popular,
      enabled: pkg.enabled,
      sort_order: pkg.sort_order
    });
    setEditDialog(true);
  };

  const handleCreate = () => {
    setSelectedPackage(null);
    setFormData({
      name: '',
      credits: '',
      price_usd: '',
      stripe_price_id: '',
      description: '',
      featured: false,
      popular: false,
      enabled: true,
      sort_order: packages.length
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
        price_usd: parseFloat(formData.price_usd),
        sort_order: parseInt(formData.sort_order.toString()) || 0
      };

      const url = selectedPackage 
        ? `/api/credits/packages` 
        : `/api/credits/packages`;
      const method = selectedPackage ? 'PUT' : 'POST';

      const requestBody = selectedPackage 
        ? { id: selectedPackage.id, ...payload }
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
        await loadPackages(user.api_key);
        setEditDialog(false);
        setCreateDialog(false);
        setSelectedPackage(null);
        setError('');
      } else {
        setError(json.error || 'Failed to save package');
      }
    } catch (error: any) {
      console.error('Error saving package:', error);
      setError(error.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: CreditPackage) => {
    if (!confirm(`Are you sure you want to delete package "${pkg.name}"?`)) {
      return;
    }

    try {
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) return;
      const user = JSON.parse(userData);

      const res = await fetch(`/api/credits/packages?id=${pkg.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.api_key}`
        }
      });

      const json = await res.json();
      if (json.success) {
        await loadPackages(user.api_key);
      } else {
        setError(json.error || 'Failed to delete package');
      }
    } catch (error: any) {
      console.error('Error deleting package:', error);
      setError(error.message || 'Failed to delete package');
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
              Credit Packages Management
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
          Create Package
        </Button>
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
              <TableCell>Name</TableCell>
              <TableCell>Credits</TableCell>
              <TableCell>Price (USD)</TableCell>
              <TableCell>Price per 100</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Badges</TableCell>
              <TableCell>Sort Order</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {pkg.name}
                  </Typography>
                  {pkg.description && (
                    <Typography variant="caption" color="text.secondary">
                      {pkg.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{pkg.credits.toLocaleString()}</TableCell>
                <TableCell>${pkg.price_usd.toFixed(2)}</TableCell>
                <TableCell>
                  ${((pkg.price_usd / pkg.credits) * 100).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={pkg.enabled ? 'Enabled' : 'Disabled'}
                    color={pkg.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {pkg.popular && (
                      <Chip label="Popular" color="primary" size="small" />
                    )}
                    {pkg.featured && (
                      <Chip label="Featured" color="secondary" size="small" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>{pkg.sort_order}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(pkg)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(pkg)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog || createDialog} onClose={() => { setEditDialog(false); setCreateDialog(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedPackage ? 'Edit Package' : 'Create Package'}
            </Typography>
            <IconButton onClick={() => { setEditDialog(false); setCreateDialog(false); }} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Package Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Credits"
              type="number"
              fullWidth
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
              required
            />
            <TextField
              label="Price (USD)"
              type="number"
              fullWidth
              value={formData.price_usd}
              onChange={(e) => setFormData({ ...formData, price_usd: e.target.value })}
              required
              inputProps={{ step: 0.01, min: 0 }}
            />
            <TextField
              label="Stripe Price ID (optional)"
              fullWidth
              value={formData.stripe_price_id}
              onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
              helperText="For payment integration"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="Sort Order"
              type="number"
              fullWidth
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
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
            <FormControlLabel
              control={
                <Switch
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                />
              }
              label="Featured"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.popular}
                  onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                />
              }
              label="Popular (Best Value)"
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
            disabled={saving || !formData.name || !formData.credits || !formData.price_usd}
            startIcon={saving ? <CircularProgress size={16} /> : <Check />}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

