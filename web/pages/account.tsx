import { useEffect, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, Stack, TextField, Alert, CircularProgress, Chip, IconButton, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
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
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import UserAppLayout from '../components/UserAppLayout';

type AccountData = {
  user: { id: string; email: string; name?: string | null; plan?: string | null; apiKeyMasked?: string | null; };
  usage: {
    projects: number;
    indices: number;
    storageBytes: number;
    lastUploadedAt: number | null;
    framesApprox?: number;
    files?: number;
    frames?: number;
    maxFiles?: number | null;
    maxFrames?: number | null;
  };
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

  const formatLimitValue = (value?: number | null) => {
    if (value === null || value === undefined) return 'Unlimited';
    return value.toLocaleString();
  };

  const getUsageProgress = (current?: number, max?: number | null) => {
    if (max === null || max === undefined || max <= 0) return 0;
    return Math.min(100, Math.round(((current || 0) / max) * 100));
  };

  const getUsageColor = (progress: number) => {
    if (progress >= 90) return '#D92D20';
    if (progress >= 75) return '#F79009';
    return '#1570EF';
  };

  const renderUsageBar = (current?: number, max?: number | null) => {
    const progress = getUsageProgress(current, max);
    return (
      <Box
        sx={{
          height: 8,
          borderRadius: 999,
          bgcolor: '#EEF2F6',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${progress}%`,
            bgcolor: getUsageColor(progress),
            borderRadius: 999,
            transition: 'width 180ms ease',
          }}
        />
      </Box>
    );
  };

  return (
    <UserAppLayout title="Account Settings" contentMaxWidth="md" contentSx={{ py: { xs: 4, md: 6 } }}>
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={() => router.push('/pricing')}>
                    {data.user.plan === 'free' ? 'Upgrade to Pro' : 'Manage plan'}
                  </Button>
                  <Button variant="outlined" onClick={() => router.push('/gallery')}>
                    Open gallery
                  </Button>
                </Stack>
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
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <FolderOpenIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>Usage</Typography>
                </Stack>
                <Stack spacing={2.5}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>Files</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(data.usage.files || 0).toLocaleString()} / {formatLimitValue(data.usage.maxFiles)}
                      </Typography>
                    </Stack>
                    {renderUsageBar(data.usage.files, data.usage.maxFiles)}
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>Frames</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(data.usage.frames || data.usage.framesApprox || 0).toLocaleString()} / {formatLimitValue(data.usage.maxFrames)}
                      </Typography>
                    </Stack>
                    {renderUsageBar(data.usage.frames || data.usage.framesApprox, data.usage.maxFrames)}
                  </Box>
                </Stack>
                <Typography variant="body2" sx={{ mt: 2 }}>Indexed files: {data.usage.indices}</Typography>
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/api-index')}
                    disabled={data.user.plan === 'free'}
                  >
                    Create index from Figma API
                  </Button>
                  {data.user.plan === 'free' && (
                    <Button variant="outlined" onClick={() => router.push('/pricing')}>
                      Upgrade to unlock
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}
    </UserAppLayout>
  );
}
