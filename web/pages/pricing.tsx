import { useState, useEffect } from 'react';
import { Box, Container, Card, CardContent, Typography, Button, List, ListItem, ListItemIcon, ListItemText, Chip, Divider, Stack, IconButton, Avatar, Menu, MenuItem, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CREDIT_COSTS, CREDIT_PACKAGES } from '../lib/plans';
import { usePaddleCheckout } from '../components/PaddleCheckout';
import {
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

export default function Pricing() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [paddleConfig, setPaddleConfig] = useState<any>(null);
  const { openCheckout, isReady: paddleReady, isInitializing: paddleInitializing } = usePaddleCheckout();

  useEffect(() => {
    const checkLogin = () => {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('figma_web_user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setIsLoggedIn(true);
            const adminEmails = ['ranmor01@gmail.com'];
            setIsAdmin(adminEmails.includes(parsedUser.email));
          } catch {
            setIsLoggedIn(false);
          }
        }
      }
    };
    checkLogin();

    // Load Paddle config
    const loadPaddleConfig = async () => {
      try {
        const response = await fetch('/api/payment/get-paddle-config');
        const data = await response.json();
        if (data.success) {
          setPaddleConfig(data.config);
        }
      } catch (error) {
        console.error('Failed to load Paddle config:', error);
      }
    };
    loadPaddleConfig();
  }, []);

  const handleSubscribe = async (planId: 'pro' | 'team') => {
    if (!isLoggedIn) {
      router.push('/register');
      return;
    }

    if (!paddleReady) {
      alert('Payment system is initializing. Please wait a moment and try again.');
      return;
    }

    const priceId = planId === 'pro' ? paddleConfig?.priceIds?.pro : paddleConfig?.priceIds?.team;
    if (!priceId) {
      alert('Price ID not configured for this plan. Please contact support.');
      return;
    }

    openCheckout(priceId, {
      userId: user?.id,
      userEmail: user?.email,
      onSuccess: (data) => {
        console.log('Checkout completed:', data);
        router.push('/account?paddle_success=true');
      },
      onError: (error) => {
        console.error('Checkout error:', error);
        alert('Failed to open checkout. Please try again.');
      },
    });
  };

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
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
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
            Pricing
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
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6, py: { xs: 4, md: 6 } }}>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              mb: 4,
              fontWeight: 300
            }}
          >
            Start free. Upgrade to Pro when you need more. Pay only for what you use.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4, mb: 6 }}>
          {/* Free Plan */}
          <Box>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700}>Free</Typography>
                <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                  $0 <Typography component="span" variant="subtitle2" color="text.secondary">/mo</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  For exploring Figdex
                </Typography>
                <List dense sx={{ mt: 2 }}>
                  {[
                    '1 Figma file',
                    'Up to 300 frames',
                    '100 credits / month',
                    'Basic search',
                    'Private access only',
                  ].map((f) => (
                    <ListItem key={f} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f} />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Credit costs:
                  </Typography>
                  <Typography variant="caption" display="block">• 1 re-index = 50 credits</Typography>
                </Box>
                <Link href="/register" passHref>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Index your first file
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Box>

          {/* Pro Plan */}
          <Box>
            <Card sx={{ borderRadius: 3, border: '2px solid #667eea', boxShadow: 4, position: 'relative' }}>
              <Chip 
                label="Most Popular" 
                color="primary" 
                size="small" 
                sx={{ position: 'absolute', top: 16, right: 16 }}
              />
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700}>Pro</Typography>
                <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                  $29 <Typography component="span" variant="subtitle2" color="text.secondary">/mo</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  For designers working on real projects
                </Typography>
                <List dense sx={{ mt: 2 }}>
                  {[
                    '10 files (quota)',
                    '5,000 frames (quota)',
                    '1,000 credits / month',
                    'Advanced search & filters',
                    'Private galleries',
                    'Standard processing priority',
                  ].map((f) => (
                    <ListItem key={f} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f} />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Credit costs:
                  </Typography>
                  <Typography variant="caption" display="block">• 1 index = 100 credits</Typography>
                  <Typography variant="caption" display="block">• +1 file = 200 credits/month</Typography>
                  <Typography variant="caption" display="block">• +1,000 frames = 150 credits/month</Typography>
                </Box>
                {isLoggedIn ? (
                  <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    sx={{ mt: 2 }}
                    onClick={() => handleSubscribe('pro')}
                    disabled={!paddleReady || paddleInitializing}
                  >
                    {paddleInitializing ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Initializing...
                      </>
                    ) : paddleReady ? (
                      'Subscribe to Pro'
                    ) : (
                      'Loading...'
                    )}
                  </Button>
                ) : (
                  <Link href="/register" passHref>
                    <Button variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
                      Sign Up for Pro
                    </Button>
                  </Link>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                  14-day free trial included
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Team Plan */}
          <Box>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700}>Team</Typography>
                <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                  $49 <Typography component="span" variant="subtitle2" color="text.secondary">/mo</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  For teams that need shared clarity
                </Typography>
                <List dense sx={{ mt: 2 }}>
                  {[
                    '20 files (quota)',
                    '15,000 frames (quota)',
                    '2,000 credits / month',
                    'Team sharing',
                    'Public galleries',
                    'Faster job queue',
                    'Team-level visibility',
                  ].map((f) => (
                    <ListItem key={f} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f} />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                    Credit costs (discounted):
                  </Typography>
                  <Typography variant="caption" display="block">• 1 index = 100 credits</Typography>
                  <Typography variant="caption" display="block">• +1 file = 150 credits/month</Typography>
                  <Typography variant="caption" display="block">• +1,000 frames = 120 credits/month</Typography>
                </Box>
                {isLoggedIn ? (
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    sx={{ mt: 2 }}
                    onClick={() => handleSubscribe('team')}
                    disabled={!paddleReady || paddleInitializing}
                  >
                    {paddleInitializing ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Initializing...
                      </>
                    ) : paddleReady ? (
                      'Subscribe to Team'
                    ) : (
                      'Loading...'
                    )}
                  </Button>
                ) : (
                  <Link href="/register" passHref>
                    <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                      Sign Up for Team
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Credits Section */}
        <Box sx={{ mt: 6 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, bgcolor: 'white' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                Purchase Additional Credits
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Need more credits? Purchase them anytime. Credits never expire and can be used for files, frames, or indexes.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                {CREDIT_PACKAGES.map((pkg) => (
                  <Card key={pkg.priceId} variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>
                      {pkg.credits.toLocaleString()} Credits
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="primary" sx={{ mt: 1 }}>
                      ${pkg.price}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      ${(pkg.price / pkg.credits * 100).toFixed(2)} per 100 credits
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      fullWidth 
                      sx={{ mt: 2 }}
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Enterprise Section */}
        <Box sx={{ mt: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 3, bgcolor: 'white' }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                Enterprise
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                For organizations operating at scale
              </Typography>
              <List dense sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                {[
                  'Unlimited files & frames',
                  '5,000+ credits / month',
                  'On-demand re-index',
                  'Dedicated processing capacity',
                  'SLA & priority support',
                  'Permissions & audit logs',
                  'Assisted onboarding',
                ].map((f) => (
                  <ListItem key={f} sx={{ py: 0.5, justifyContent: 'center' }}>
                    <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f} />
                  </ListItem>
                ))}
              </List>
              <Button variant="outlined" size="large" sx={{ mt: 2 }}>
                Talk to sales
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}


