import { useEffect, useState, useCallback } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, Stack, TextField, Alert, CircularProgress, Chip, IconButton, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useRouter } from 'next/router';
import {
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
  Person as PersonIcon,
  Api as ApiIcon,
  ContentCopy as ContentCopyIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  FolderOpen as FolderOpenIcon,
  ShoppingCart as ShoppingCartIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Version tracking - Update this number for each fix/change
const PAGE_VERSION = 'v1.30.6'; // Updated Add-ons to use packages from database instead of hardcoded values
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' '); // Auto-generated build timestamp

type AccountData = {
  user: { id: string; email: string; name?: string | null; plan?: string | null; apiKeyMasked?: string | null; };
  usage: { projects: number; indices: number; storageBytes: number; lastUploadedAt: number | null; };
};

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Add-ons state
  const [addons, setAddons] = useState<any[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsDialogOpen, setAddonsDialogOpen] = useState(false);
  const [addonPackages, setAddonPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('[account] boot sequence start');

        // Get user from localStorage
        const stored = localStorage.getItem('figma_web_user');
        const anonId = localStorage.getItem('figdex_anon_id');
        if (!stored) {
          console.warn('[account] no localStorage entry found');
          setIsGuest(!!anonId);
          setError(anonId
            ? "You're browsing as a guest. Connect your account to save your data and access settings."
            : 'Not signed in. Please login.');
          return;
        }

        const user = JSON.parse(stored);
        const email = user.email ? user.email.trim().toLowerCase() : '';
        let key = user.api_key;

        // If no API key, get it from server using the same login endpoint
        if (!key || !key.startsWith('figdex_')) {
          console.log('[account] missing api key, requesting new one for', email);
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password: 'oauth' })
          });
          const json = await res.json();
          if (!json.success || !json.user?.api_key) {
            console.error('[account] failed to get key', json);
            setError(json.error || 'Failed to get API key');
            return;
          }
          key = json.user.api_key;
          // Save to localStorage
          localStorage.setItem('figma_web_user', JSON.stringify({
            email,
            api_key: key,
            full_name: json.user.name,
            plan: json.user.plan || 'free'
          }));
        }

        setApiKey(key);

        // Load account data
        console.log('[account] fetching account data with key');
        const accountRes = await fetch('/api/account', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        const accountJson = await accountRes.json();
        if (!accountJson.success) {
          console.error('[account] /api/account error', accountJson);
          setError(accountJson.error || 'Failed to load account');
          return;
        }

        console.log('[account] account data loaded');
        setData({
          user: accountJson.user,
          usage: accountJson.usage
        });
        setIsLoggedIn(true);
        const adminEmails = ['ranmor01@gmail.com'];
        setIsAdmin(adminEmails.includes(accountJson.user.email));
        
        // Load add-ons
        loadAddons(key);
        // Load addon packages
        loadAddonPackages();
      } catch (e: any) {
        console.error('[account] unexpected error', e);
        setError(e.message || 'Failed to load account');
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('figma_web_user');
    setIsLoggedIn(false);
    setIsAdmin(false);
    handleUserMenuClose();
    router.push('/');
  };

  const handleCopyApiKey = async () => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('figma_web_user');
    if (!userData) {
      alert('No user found');
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (user && user.api_key) {
        try {
          await navigator.clipboard.writeText(user.api_key);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          alert('API Key copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy API key:', err);
          const textArea = document.createElement('textarea');
          textArea.value = user.api_key;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            alert('API Key copied to clipboard!');
          } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
            alert('Failed to copy API key');
          }
          document.body.removeChild(textArea);
        }
      } else {
        alert('No API key found for this user');
      }
    } catch (err) {
      console.error('Failed to parse user data:', err);
      alert('Failed to copy API key');
    }
  };

  const regenerateKey = async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      console.log('[account] regenerating api key');
      const res = await fetch('/api/account/regenerate-api-key', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const newKey = json.apiKey;
      setApiKey(newKey);
      // Update localStorage
      const stored = localStorage.getItem('figma_web_user');
      if (stored) {
        const user = JSON.parse(stored);
        user.api_key = newKey;
        localStorage.setItem('figma_web_user', JSON.stringify(user));
      }
      // Reload account data
      const accountRes = await fetch('/api/account', {
        headers: { 'Authorization': `Bearer ${newKey}` }
      });
      const accountJson = await accountRes.json();
      if (accountJson.success) {
        setData({
          user: accountJson.user,
          usage: accountJson.usage
        });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to regenerate key');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    console.log('[account] api key copied');
    alert('Copied!');
  };

  const getPlanColor = (plan?: string | null) => {
    if (!plan) return 'default';
    const normalized = plan.toLowerCase();
    if (normalized === 'unlimited') return 'secondary';
    if (normalized === 'pro') return 'primary';
    return 'default';
  };

  const loadAddons = async (apiKey: string) => {
    try {
      setAddonsLoading(true);
      const res = await fetch('/api/user/addons', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const json = await res.json();
      if (json.success && json.addons) {
        setAddons(json.addons);
      }
    } catch (error) {
      console.error('Error loading add-ons:', error);
    } finally {
      setAddonsLoading(false);
    }
  };

  const loadAddonPackages = async () => {
    try {
      setPackagesLoading(true);
      const res = await fetch('/api/addon-packages');
      const json = await res.json();
      if (json.success && json.packages) {
        setAddonPackages(json.packages);
      }
    } catch (error) {
      console.error('Error loading addon packages:', error);
    } finally {
      setPackagesLoading(false);
    }
  };

  const getCurrentUser = () => {
    try {
      const stored = localStorage.getItem('figma_web_user');
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const handlePurchaseAddon = async (addonType: string, addonValue: number, price: number) => {
    try {
      const user = getCurrentUser();
      if (!user || !user.api_key) {
        alert('User not authenticated');
        return;
      }

      const res = await fetch('/api/user/addons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.api_key}`
        },
        body: JSON.stringify({
          addon_type: addonType,
          addon_value: addonValue,
          price_usd: price
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(`Add-on added to your subscription. It will be included in your next monthly billing cycle. Payment integration coming soon.`);
        await loadAddons(user.api_key);
        setAddonsDialogOpen(false);
      } else {
        alert(`Failed to add add-on: ${json.error}`);
      }
    } catch (error: any) {
      console.error('Error purchasing add-on:', error);
      alert(`Error: ${error.message || 'Failed to purchase add-on'}`);
    }
  };

  const handleCancelAddon = async (addonId: string) => {
    if (!confirm('Are you sure you want to cancel this add-on? It will remain active until the end of the current billing cycle, and you will not be charged for it in the next cycle.')) {
      return;
    }

    try {
      const user = getCurrentUser();
      if (!user || !user.api_key) {
        alert('User not authenticated');
        return;
      }

      const res = await fetch(`/api/user/addons?id=${addonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.api_key}`
        }
      });

      const json = await res.json();
      if (json.success) {
        await loadAddons(user.api_key);
      } else {
        alert(`Failed to cancel add-on: ${json.error}`);
      }
    } catch (error: any) {
      console.error('Error cancelling add-on:', error);
      alert(`Error: ${error.message || 'Failed to cancel add-on'}`);
    }
  };


  return (
    <Box sx={{ bgcolor: '#FFFFFF', minHeight: '100vh' }}>
      {/* Header */}
      <Container maxWidth="lg">
        <Box sx={{ py: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 300,
              letterSpacing: 3,
              color: '#1a1a1a',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
            onClick={() => router.push('/')}
          >
            FIGDEX
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 300,
              color: '#1a1a1a',
              fontSize: '1.25rem',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            Account Settings
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              sx={{ 
                color: '#1a1a1a',
                fontWeight: 400,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': { 
                  bgcolor: '#f5f5f5'
                }
              }}
              onClick={() => router.back()}
            >
              Back
            </Button>
            {isLoggedIn && (
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{ 
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32 }}>
                  <AccountCircleIcon />
                </Avatar>
              </IconButton>
            )}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              sx={{ mt: 1 }}
            >
              {isAdmin && (
                <MenuItem onClick={() => { router.push('/admin'); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Admin Panel</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => { router.push('/gallery'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <SearchIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>My FigDex</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { router.push('/index-management'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <StorageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Index Management</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { router.push('/projects-management'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <FolderOpenIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Projects Management</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { router.push('/account'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Account Settings</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { router.push('/api-index'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <ApiIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Figma API Integration</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleCopyApiKey(); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <ContentCopyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{copied ? 'API Key Copied!' : 'Copy API Key'}</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Box>
      </Container>

      {/* Content */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, pb: 12 }}>
        {error && (
          <Alert severity={isGuest ? 'info' : 'error'} sx={{ mb: 2 }}>
            {error}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" size="small" onClick={() => router.push('/login')}>
                Login / Register
              </Button>
              <Button variant="outlined" size="small" onClick={() => {
                const aid = typeof window !== 'undefined' ? localStorage.getItem('figdex_anon_id') : null;
                router.push(aid ? `/gallery?anonId=${encodeURIComponent(aid)}` : '/gallery');
              }}>
                Back to Gallery
              </Button>
            </Stack>
          </Alert>
        )}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
        {!loading && data && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600}>Profile</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Email: {data.user.email}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Plan:{' '}
                  <Chip
                    size="small"
                    label={(data.user.plan || 'free').toUpperCase()}
                    color={getPlanColor(data.user.plan)}
                  />
                </Typography>
              </CardContent>
            </Card>

            {/* Add-ons Card */}
            <Card>
              <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FolderOpenIcon color="primary" />
                    <Box>
                      <Typography variant="h6" fontWeight={600}>Monthly Add-ons</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Add-ons are billed monthly as part of your subscription
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => setAddonsDialogOpen(true)}
                  >
                    Add Monthly Add-on
                  </Button>
                </Stack>
                
                {addonsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : addons.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No active add-ons. Purchase add-ons to increase your limits.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {addons.map((addon: any) => (
                      <Box
                        key={addon.id}
                        sx={{
                          p: 2,
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {addon.addon_type === 'files' && `+${addon.addon_value} Files`}
                            {addon.addon_type === 'frames' && `+${addon.addon_value.toLocaleString()} Frames`}
                            {addon.addon_type === 'rate_limit' && `+${addon.addon_value} Indexes/Day`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ${parseFloat(addon.price_usd).toFixed(2)}/month
                            {addon.end_date && ` • Expires: ${new Date(addon.end_date).toLocaleDateString()}`}
                            {!addon.end_date && ' • Recurring monthly charge'}
                          </Typography>
                        </Box>
                        <Chip
                          label={addon.status}
                          color={addon.status === 'active' ? 'success' : addon.status === 'pending' ? 'warning' : 'default'}
                          size="small"
                        />
                        {addon.status === 'active' && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleCancelAddon(addon.id)}
                            sx={{ ml: 1 }}
                          >
                            Cancel (Ends Next Month)
                          </Button>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600}>API Key</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    value={showKey ? apiKey : (data.user.apiKeyMasked || apiKey.slice(0, 8) + '••••••')}
                    InputProps={{ readOnly: true }}
                  />
                  <Button variant="outlined" onClick={copyKey}>Copy</Button>
                  <Button variant="outlined" onClick={() => setShowKey(!showKey)}>
                    {showKey ? 'Hide' : 'Show'}
                  </Button>
                  <Button variant="contained" color="error" onClick={regenerateKey}>Regenerate</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Regenerating will invalidate the old key (update your plugin settings).
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600}>Usage</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Projects: {data.usage.projects}</Typography>
                <Typography variant="body2">Indices: {data.usage.indices}</Typography>
                <Typography variant="body2">Storage: {((data.usage.storageBytes || 0) / (1024*1024)).toFixed(2)} MB</Typography>
                {data.usage.lastUploadedAt && (
                  <Typography variant="body2">Last upload: {new Date(data.usage.lastUploadedAt).toLocaleString()}</Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Figma API Integration</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create indices directly from Figma files using the Figma REST API. This feature is available for Pro and Unlimited plans.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => router.push('/api-index')}
                  disabled={data.user.plan === 'free'}
                >
                  Create Index from Figma API
                </Button>
                {data.user.plan === 'free' && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Upgrade to Pro or Unlimited to use this feature.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        )}
      </Container>

      {/* Purchase Add-ons Dialog */}
      <Dialog open={addonsDialogOpen} onClose={() => setAddonsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Add Monthly Add-on</Typography>
            <IconButton onClick={() => setAddonsDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Add-ons are monthly subscription additions
            </Typography>
            <Typography variant="body2">
              Add-ons are charged monthly as part of your subscription. They will be added to your monthly bill and can be cancelled at any time (effective next billing cycle).
            </Typography>
          </Alert>
          
          {packagesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              {/* Files Add-on */}
              {addonPackages.filter(pkg => pkg.addon_type === 'files').length > 0 && (
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    Additional Files
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Increase your file limit. Billed monthly.
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    {addonPackages
                      .filter(pkg => pkg.addon_type === 'files')
                      .map((pkg) => (
                        <Button
                          key={pkg.id}
                          variant="outlined"
                          size="small"
                          onClick={() => handlePurchaseAddon(pkg.addon_type, pkg.addon_value, parseFloat(pkg.price_usd))}
                        >
                          {pkg.display_name || `+${pkg.addon_value} File${pkg.addon_value > 1 ? 's' : ''}`}
                          <Typography component="span" sx={{ ml: 0.5, fontWeight: 600, fontSize: '0.75rem' }}>
                            +${parseFloat(pkg.price_usd).toFixed(2)}/mo
                          </Typography>
                        </Button>
                      ))}
                  </Stack>
                </Card>
              )}

              {/* Frames Add-on */}
              {addonPackages.filter(pkg => pkg.addon_type === 'frames').length > 0 && (
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    Additional Frames
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Increase your frame limit. Billed monthly.
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    {addonPackages
                      .filter(pkg => pkg.addon_type === 'frames')
                      .map((pkg) => (
                        <Button
                          key={pkg.id}
                          variant="outlined"
                          size="small"
                          onClick={() => handlePurchaseAddon(pkg.addon_type, pkg.addon_value, parseFloat(pkg.price_usd))}
                        >
                          {pkg.display_name || `+${pkg.addon_value.toLocaleString()} Frames`}
                          <Typography component="span" sx={{ ml: 0.5, fontWeight: 600, fontSize: '0.75rem' }}>
                            +${parseFloat(pkg.price_usd).toFixed(2)}/mo
                          </Typography>
                        </Button>
                      ))}
                  </Stack>
                </Card>
              )}

              {/* Rate Limit Add-on */}
              {addonPackages.filter(pkg => pkg.addon_type === 'rate_limit').length > 0 && (
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    Additional Daily Indexes
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Increase your daily index limit. Billed monthly.
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    {addonPackages
                      .filter(pkg => pkg.addon_type === 'rate_limit')
                      .map((pkg) => (
                        <Button
                          key={pkg.id}
                          variant="outlined"
                          size="small"
                          onClick={() => handlePurchaseAddon(pkg.addon_type, pkg.addon_value, parseFloat(pkg.price_usd))}
                        >
                          {pkg.display_name || `+${pkg.addon_value}/Day`}
                          <Typography component="span" sx={{ ml: 0.5, fontWeight: 600, fontSize: '0.75rem' }}>
                            +${parseFloat(pkg.price_usd).toFixed(2)}/mo
                          </Typography>
                        </Button>
                      ))}
                  </Stack>
                </Card>
              )}

              {addonPackages.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No add-on packages available at this time.
                </Typography>
              )}
            </Stack>
          )}

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Payment integration coming soon
            </Typography>
            <Typography variant="body2">
              Add-ons will be activated after payment confirmation and will be included in your monthly subscription billing.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddonsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
