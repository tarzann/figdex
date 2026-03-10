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
  TableSortLabel,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, ArrowBack as ArrowBackIcon, Close as CloseIcon, Check as CheckIcon } from '@mui/icons-material';
// Helper to get admin API key from localStorage
const getAdminApiKey = (): string | null => {
  try {
    const stored = localStorage.getItem('figma_web_user');
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.api_key || null;
  } catch {
    return null;
  }
};

// Version tracking
const PAGE_VERSION = 'v1.30.2';
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' ');

interface Addon {
  id: string;
  user_id: string;
  addon_type: 'files' | 'frames' | 'rate_limit';
  addon_value: number;
  price_usd: number;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  users?: {
    email: string;
    full_name: string | null;
  };
}

interface AddonPackage {
  id: string;
  addon_type: 'files' | 'frames' | 'rate_limit';
  addon_value: number;
  price_usd: number;
  display_name: string | null;
  description: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AdminAddons() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0 = User Add-ons, 1 = Packages
  const [addons, setAddons] = useState<Addon[]>([]);
  const [packages, setPackages] = useState<AddonPackage[]>([]);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<AddonPackage | null>(null);
  const [addonSortField, setAddonSortField] = useState<keyof Addon | ''>('');
  const [addonSortDirection, setAddonSortDirection] = useState<'asc' | 'desc'>('asc');
  const [packageSortField, setPackageSortField] = useState<keyof AddonPackage | ''>('');
  const [packageSortDirection, setPackageSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editForm, setEditForm] = useState({
    userId: '',
    addon_type: 'files' as 'files' | 'frames' | 'rate_limit',
    addon_value: 1,
    price_usd: 0,
    status: 'active' as 'active' | 'cancelled' | 'expired' | 'pending',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  const [packageForm, setPackageForm] = useState({
    addon_type: 'files' as 'files' | 'frames' | 'rate_limit',
    addon_value: 1,
    price_usd: 0,
    display_name: '',
    description: '',
    enabled: true,
    sort_order: 0,
  });

  useEffect(() => {
    checkAdminAndLoadAddons();
  }, []);

  const checkAdminAndLoadAddons = async () => {
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
        await loadAddons();
        await loadPackages();
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

  const loadAddons = async () => {
    setError('');
    try {
      const apiKey = getAdminApiKey();
      if (!apiKey) {
        setError('Admin API key not found.');
        return;
      }
      const response = await fetch('/api/admin/addons', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAddons(data.addons || []);
      } else {
        setError(data.error || `Failed to load add-ons (${response.status})`);
      }
    } catch (error: any) {
      console.error('Failed to load add-ons:', error);
      setError(`Failed to load add-ons: ${error.message || 'Network error'}`);
    }
  };

  const loadPackages = async () => {
    setError('');
    try {
      const apiKey = getAdminApiKey();
      if (!apiKey) {
        setError('Admin API key not found.');
        return;
      }
      const response = await fetch('/api/admin/addon-packages', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPackages(data.packages || []);
      } else {
        console.error('Failed to load packages:', data.error);
      }
    } catch (error: any) {
      console.error('Failed to load packages:', error);
    }
  };

  const handleEdit = (addon: Addon) => {
    setSelectedAddon(addon);
    setEditForm({
      userId: addon.user_id,
      addon_type: addon.addon_type,
      addon_value: addon.addon_value,
      price_usd: parseFloat(addon.price_usd.toString()),
      status: addon.status,
      start_date: addon.start_date,
      end_date: addon.end_date || '',
    });
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedAddon(null);
    setEditForm({
      userId: '',
      addon_type: 'files',
      addon_value: 1,
      price_usd: 0,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      const apiKey = getAdminApiKey();
      if (!apiKey) {
        setError('Admin API key not found.');
        return;
      }

      const method = selectedAddon ? 'PUT' : 'POST';
      const url = '/api/admin/addons';

      const payload: any = {
        userId: editForm.userId,
        addon_type: editForm.addon_type,
        addon_value: editForm.addon_value,
        price_usd: editForm.price_usd,
        status: editForm.status,
        start_date: editForm.start_date,
      };

      if (editForm.end_date) {
        payload.end_date = editForm.end_date;
      }

      if (selectedAddon) {
        payload.id = selectedAddon.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setEditDialogOpen(false);
        await loadAddons();
      } else {
        setError(data.error || `Failed to save add-on (${response.status})`);
      }
    } catch (error: any) {
      console.error('Failed to save add-on:', error);
      setError(`Failed to save add-on: ${error.message || 'Network error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) {
      return;
    }
    setError('');
    try {
      const apiKey = getAdminApiKey();
      if (!apiKey) {
        setError('Admin API key not found.');
        return;
      }
      const response = await fetch(`/api/admin/addons?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (response.ok) {
        await loadAddons();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to delete add-on (${response.status})`);
      }
    } catch (error: any) {
      console.error('Failed to delete add-on:', error);
      setError(`Failed to delete add-on: ${error.message || 'Network error'}`);
    }
  };

  const handleCreatePackage = () => {
    setSelectedPackage(null);
    setPackageForm({
      addon_type: 'files',
      addon_value: 1,
      price_usd: 0,
      display_name: '',
      description: '',
      enabled: true,
      sort_order: 0,
    });
    setPackageDialogOpen(true);
  };

  const handleEditPackage = (pkg: AddonPackage) => {
    setSelectedPackage(pkg);
    setPackageForm({
      addon_type: pkg.addon_type,
      addon_value: pkg.addon_value,
      price_usd: parseFloat(pkg.price_usd.toString()),
      display_name: pkg.display_name || '',
      description: pkg.description || '',
      enabled: pkg.enabled,
      sort_order: pkg.sort_order,
    });
    setPackageDialogOpen(true);
  };

  const handleSavePackage = async () => {
    setError('');
    try {
      const apiKey = getAdminApiKey();
      if (!apiKey) {
        setError('Admin API key not found.');
        return;
      }

      const method = selectedPackage ? 'PUT' : 'POST';
      const url = '/api/admin/addon-packages';

      const payload: any = {
        addon_type: packageForm.addon_type,
        addon_value: packageForm.addon_value,
        price_usd: packageForm.price_usd,
        display_name: packageForm.display_name || null,
        description: packageForm.description || null,
        enabled: packageForm.enabled,
        sort_order: packageForm.sort_order,
      };

      if (selectedPackage) {
        payload.id = selectedPackage.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPackageDialogOpen(false);
        await loadPackages();
      } else {
        setError(data.error || `Failed to save package (${response.status})`);
      }
    } catch (error: any) {
      console.error('Failed to save package:', error);
      setError(`Failed to save package: ${error.message || 'Network error'}`);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) {
      return;
    }
    setError('');
    try {
      const apiKey = getAdminApiKey();
      if (!apiKey) {
        setError('Admin API key not found.');
        return;
      }
      const response = await fetch(`/api/admin/addon-packages?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (response.ok) {
        await loadPackages();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to delete package (${response.status})`);
      }
    } catch (error: any) {
      console.error('Failed to delete package:', error);
      setError(`Failed to delete package: ${error.message || 'Network error'}`);
    }
  };

  const handleAddonSort = (field: keyof Addon | 'users') => {
    // Map 'users' to 'user_id' for sorting logic
    const sortField = field === 'users' ? 'user_id' : field;
    const isAsc = addonSortField === sortField && addonSortDirection === 'asc';
    setAddonSortDirection(isAsc ? 'desc' : 'asc');
    setAddonSortField(sortField as keyof Addon);
  };

  const handlePackageSort = (field: keyof AddonPackage) => {
    const isAsc = packageSortField === field && packageSortDirection === 'asc';
    setPackageSortDirection(isAsc ? 'desc' : 'asc');
    setPackageSortField(field);
  };

  const sortedAddons = [...addons].sort((a, b) => {
    if (!addonSortField) return 0;
    
    let aValue: any = a[addonSortField];
    let bValue: any = b[addonSortField];
    
    // Handle nested objects (users)
    if (addonSortField === 'user_id') {
      aValue = a.users?.email || a.user_id;
      bValue = b.users?.email || b.user_id;
    }
    
    // Handle dates
    if (addonSortField === 'start_date' || addonSortField === 'end_date' || addonSortField === 'created_at' || addonSortField === 'updated_at') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }
    
    // Handle numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return addonSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return addonSortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Handle null/undefined
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    return 0;
  });

  const sortedPackages = [...packages].sort((a, b) => {
    if (!packageSortField) return 0;
    
    let aValue: any = a[packageSortField];
    let bValue: any = b[packageSortField];
    
    // Handle dates
    if (packageSortField === 'created_at' || packageSortField === 'updated_at') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }
    
    // Handle booleans
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return packageSortDirection === 'asc' 
        ? (aValue === bValue ? 0 : aValue ? 1 : -1)
        : (aValue === bValue ? 0 : aValue ? -1 : 1);
    }
    
    // Handle numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return packageSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return packageSortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Handle null/undefined
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    return 0;
  });

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
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              Add-ons Management
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={tabValue === 0 ? handleCreate : handleCreatePackage}>
          {tabValue === 0 ? 'Add New Add-on' : 'Add New Package'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="User Add-ons" />
          <Tab label="Add-on Packages" />
        </Tabs>
      </Paper>

      {/* User Add-ons Table */}
      {tabValue === 0 && (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={addonSortField === 'user_id'}
                  direction={addonSortField === 'user_id' ? addonSortDirection : 'asc'}
                  onClick={() => handleAddonSort('users')}
                >
                  User
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={addonSortField === 'addon_type'}
                  direction={addonSortField === 'addon_type' ? addonSortDirection : 'asc'}
                  onClick={() => handleAddonSort('addon_type')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={addonSortField === 'addon_value'}
                  direction={addonSortField === 'addon_value' ? addonSortDirection : 'asc'}
                  onClick={() => handleAddonSort('addon_value')}
                >
                  Value
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={addonSortField === 'price_usd'}
                  direction={addonSortField === 'price_usd' ? addonSortDirection : 'asc'}
                  onClick={() => handleAddonSort('price_usd')}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={addonSortField === 'status'}
                  direction={addonSortField === 'status' ? addonSortDirection : 'asc'}
                  onClick={() => handleAddonSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={addonSortField === 'start_date'}
                  direction={addonSortField === 'start_date' ? addonSortDirection : 'asc'}
                  onClick={() => handleAddonSort('start_date')}
                >
                  Start Date
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={addonSortField === 'end_date'}
                  direction={addonSortField === 'end_date' ? addonSortDirection : 'asc'}
                  onClick={() => handleAddonSort('end_date')}
                >
                  End Date
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAddons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No add-ons found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedAddons.map((addon) => (
                <TableRow key={addon.id}>
                  <TableCell>
                    {addon.users?.email || addon.user_id.slice(0, 8) + '...'}
                    {addon.users?.full_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {addon.users.full_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={addon.addon_type}
                      size="small"
                      color={addon.addon_type === 'files' ? 'primary' : addon.addon_type === 'frames' ? 'secondary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {addon.addon_type === 'files' && `+${addon.addon_value} Files`}
                    {addon.addon_type === 'frames' && `+${addon.addon_value.toLocaleString()} Frames`}
                    {addon.addon_type === 'rate_limit' && `+${addon.addon_value} Indexes/Day`}
                  </TableCell>
                  <TableCell>${parseFloat(addon.price_usd.toString()).toFixed(2)}/mo</TableCell>
                  <TableCell>
                    <Chip
                      label={addon.status}
                      color={addon.status === 'active' ? 'success' : addon.status === 'pending' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(addon.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{addon.end_date ? new Date(addon.end_date).toLocaleDateString() : 'Recurring'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(addon)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(addon.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Packages Table */}
      {tabValue === 1 && (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={packageSortField === 'addon_type'}
                  direction={packageSortField === 'addon_type' ? packageSortDirection : 'asc'}
                  onClick={() => handlePackageSort('addon_type')}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={packageSortField === 'display_name'}
                  direction={packageSortField === 'display_name' ? packageSortDirection : 'asc'}
                  onClick={() => handlePackageSort('display_name')}
                >
                  Display Name
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={packageSortField === 'addon_value'}
                  direction={packageSortField === 'addon_value' ? packageSortDirection : 'asc'}
                  onClick={() => handlePackageSort('addon_value')}
                >
                  Value
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={packageSortField === 'price_usd'}
                  direction={packageSortField === 'price_usd' ? packageSortDirection : 'asc'}
                  onClick={() => handlePackageSort('price_usd')}
                >
                  Price
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={packageSortField === 'enabled'}
                  direction={packageSortField === 'enabled' ? packageSortDirection : 'asc'}
                  onClick={() => handlePackageSort('enabled')}
                >
                  Enabled
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={packageSortField === 'sort_order'}
                  direction={packageSortField === 'sort_order' ? packageSortDirection : 'asc'}
                  onClick={() => handlePackageSort('sort_order')}
                >
                  Sort Order
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No packages found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <Chip
                      label={pkg.addon_type}
                      size="small"
                      color={pkg.addon_type === 'files' ? 'primary' : pkg.addon_type === 'frames' ? 'secondary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{pkg.display_name || '-'}</TableCell>
                  <TableCell>
                    {pkg.addon_type === 'files' && `+${pkg.addon_value} Files`}
                    {pkg.addon_type === 'frames' && `+${pkg.addon_value.toLocaleString()} Frames`}
                    {pkg.addon_type === 'rate_limit' && `+${pkg.addon_value} Indexes/Day`}
                  </TableCell>
                  <TableCell>${parseFloat(pkg.price_usd.toString()).toFixed(2)}/mo</TableCell>
                  <TableCell>
                    <Chip
                      label={pkg.enabled ? 'Yes' : 'No'}
                      color={pkg.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{pkg.sort_order}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEditPackage(pkg)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeletePackage(pkg.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* User Add-on Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedAddon ? 'Edit Add-on' : 'Add New Add-on'}</DialogTitle>
        <DialogContent>
          <TextField
            label="User ID"
            value={editForm.userId}
            onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
            fullWidth
            margin="normal"
            required
            disabled={!!selectedAddon}
            helperText={selectedAddon ? "User ID cannot be changed for existing add-ons." : "UUID of the user"}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Add-on Type</InputLabel>
            <Select
              value={editForm.addon_type}
              onChange={(e) => setEditForm({ ...editForm, addon_type: e.target.value as any })}
              label="Add-on Type"
              disabled={!!selectedAddon}
            >
              <MenuItem value="files">Files</MenuItem>
              <MenuItem value="frames">Frames</MenuItem>
              <MenuItem value="rate_limit">Rate Limit</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Value"
            type="number"
            value={editForm.addon_value}
            onChange={(e) => setEditForm({ ...editForm, addon_value: parseInt(e.target.value) || 0 })}
            fullWidth
            margin="normal"
            required
            helperText="Number of files/frames/indexes to add"
          />
          <TextField
            label="Price (USD)"
            type="number"
            value={editForm.price_usd}
            onChange={(e) => setEditForm({ ...editForm, price_usd: parseFloat(e.target.value) || 0 })}
            fullWidth
            margin="normal"
            required
            inputProps={{ step: 0.01 }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
              label="Status"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            value={editForm.start_date}
            onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date (optional)"
            type="date"
            value={editForm.end_date}
            onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Leave empty for recurring monthly subscription"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} startIcon={<CloseIcon />}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" startIcon={<CheckIcon />}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Package Edit Dialog */}
      <Dialog open={packageDialogOpen} onClose={() => setPackageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedPackage ? 'Edit Package' : 'Add New Package'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Add-on Type</InputLabel>
            <Select
              value={packageForm.addon_type}
              onChange={(e) => setPackageForm({ ...packageForm, addon_type: e.target.value as any })}
              label="Add-on Type"
              disabled={!!selectedPackage}
            >
              <MenuItem value="files">Files</MenuItem>
              <MenuItem value="frames">Frames</MenuItem>
              <MenuItem value="rate_limit">Rate Limit</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Value"
            type="number"
            value={packageForm.addon_value}
            onChange={(e) => setPackageForm({ ...packageForm, addon_value: parseInt(e.target.value) || 0 })}
            fullWidth
            margin="normal"
            required
            disabled={!!selectedPackage}
            helperText={selectedPackage ? "Value cannot be changed for existing packages" : "Number of files/frames/indexes"}
          />
          <TextField
            label="Price (USD)"
            type="number"
            value={packageForm.price_usd}
            onChange={(e) => setPackageForm({ ...packageForm, price_usd: parseFloat(e.target.value) || 0 })}
            fullWidth
            margin="normal"
            required
            inputProps={{ step: 0.01 }}
          />
          <TextField
            label="Display Name"
            value={packageForm.display_name}
            onChange={(e) => setPackageForm({ ...packageForm, display_name: e.target.value })}
            fullWidth
            margin="normal"
            helperText="e.g., '+1 File', '+1,000 Frames'"
          />
          <TextField
            label="Description"
            value={packageForm.description}
            onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
            fullWidth
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            label="Sort Order"
            type="number"
            value={packageForm.sort_order}
            onChange={(e) => setPackageForm({ ...packageForm, sort_order: parseInt(e.target.value) || 0 })}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Enabled</InputLabel>
            <Select
              value={packageForm.enabled ? 'enabled' : 'disabled'}
              onChange={(e) => setPackageForm({ ...packageForm, enabled: e.target.value === 'enabled' })}
              label="Enabled"
            >
              <MenuItem value="enabled">Enabled</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPackageDialogOpen(false)} startIcon={<CloseIcon />}>Cancel</Button>
          <Button onClick={handleSavePackage} variant="contained" startIcon={<CheckIcon />}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

