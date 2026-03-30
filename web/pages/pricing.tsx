import { useState, useEffect } from 'react';
import { Box, Container, Card, CardContent, Typography, Button, List, ListItem, ListItemIcon, ListItemText, Chip, Divider, Stack, IconButton, Avatar, Menu, MenuItem, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { createClient } from '@supabase/supabase-js';
import { dbPlanRowToPlanLimits, type DbPlanRow, type PlanLimits } from '../lib/plans';
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

type PublicPlanConfig = {
  planId: 'free' | 'pro' | 'team';
  title: string;
  eyebrow: string;
  summary: string;
  price: string;
  suffix: string;
  emphasized: boolean;
  isSubscribable: boolean;
  enabled: boolean;
  limits: PlanLimits;
};

interface PricingProps {
  publicPlans: PublicPlanConfig[];
}

export default function Pricing({ publicPlans }: PricingProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [paddleConfig, setPaddleConfig] = useState<any>(null);
  const { openCheckout, isReady: paddleReady, isInitializing: paddleInitializing, initError: paddleInitError } = usePaddleCheckout();

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

  const planCards = publicPlans.map((plan) => {
    const currentPlanId = user?.plan ? String(user.plan).toLowerCase() : null;
    const isCurrentPlan =
      (currentPlanId === 'unlimited' && plan.planId === 'team') ||
      currentPlanId === plan.planId;
    const highlights = [
      plan.limits.maxProjects == null ? 'Unlimited files' : `${plan.limits.maxProjects.toLocaleString()} files`,
      plan.limits.maxFramesTotal == null ? 'Unlimited frames' : `${plan.limits.maxFramesTotal.toLocaleString()} frames`,
      plan.planId === 'free' ? 'Basic search' : 'Advanced search & filters',
      plan.planId === 'team' ? 'Public galleries and team sharing' : 'Private galleries',
      plan.planId === 'team' ? 'Priority processing and team review' : 'Priority-safe indexing and re-indexing',
    ];

    const checkoutUnavailable = !isCurrentPlan && !paddleReady && !paddleInitializing;

    return {
      ...plan,
      isCurrentPlan,
      checkoutUnavailable,
      highlights,
      cta:
        isCurrentPlan
          ? 'Current plan'
          : plan.planId === 'free'
          ? 'Index your first file'
          : isLoggedIn
            ? `Subscribe to ${plan.title}`
            : plan.planId === 'pro'
              ? 'Start Pro trial'
              : `Choose ${plan.title}`,
      variant: plan.emphasized ? ('contained' as const) : ('outlined' as const),
    };
  });
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f7fb',
        backgroundImage: 'radial-gradient(circle at top left, rgba(102,126,234,0.12), transparent 32%), radial-gradient(circle at top right, rgba(17,24,39,0.08), transparent 22%)'
      }}
    >
      {/* Header */}
      <Container maxWidth="lg">
        <Box sx={{ py: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
          <Box sx={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                letterSpacing: 1.5,
                color: '#1a1a1a',
                fontSize: '1.25rem'
              }}
            >
              FIGDEX
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="text"
              sx={{ 
                color: '#1a1a1a',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': { 
                  bgcolor: '#eef2ff'
                }
              }}
              onClick={() => router.push('/pricing')}
            >
              Pricing
            </Button>
            <Button
              variant="text"
              sx={{ 
                color: '#1a1a1a',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': { 
                  bgcolor: '#eef2ff'
                }
              }}
              onClick={() => router.push('/download-plugin')}
            >
              Plugin
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

      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6, py: { xs: 4, md: 7 } }}>
          <Chip
            label="Simple pricing for indexing, search, and sharing"
            sx={{ mb: 2, bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: '#111827',
              letterSpacing: -1.5,
              mb: 2,
              fontSize: { xs: '2.3rem', md: '3.75rem' }
            }}
          >
            Pick the plan that matches how your team reviews design.
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#667085', 
              mb: 3,
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.15rem' },
              maxWidth: 760,
              mx: 'auto',
              lineHeight: 1.7
            }}
          >
            Start free, move to Pro when you need room to work, and use Team when gallery sharing becomes part of the workflow.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ flexWrap: 'wrap' }}>
            {['Start free with no credit card', 'Upgrade only when file and frame limits matter', 'Built-in fair use protection keeps indexing reliable'].map((item) => (
              <Chip key={item} label={item} variant="outlined" sx={{ bgcolor: '#fff' }} />
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4, mb: 6 }}>
          {planCards.map((plan) => (
            <Box key={plan.planId}>
              <Card
                sx={{
                  borderRadius: 4,
                  border: plan.emphasized ? '2px solid #667eea' : '1px solid #d0d5dd',
                  boxShadow: plan.emphasized ? '0 18px 40px rgba(102,126,234,0.18)' : '0 8px 24px rgba(16,24,40,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%'
                }}
              >
                {plan.emphasized && (
                  <Chip
                    label="Most popular"
                    color="primary"
                    size="small"
                    sx={{ position: 'absolute', top: 16, right: 16 }}
                  />
                )}
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em' }}>
                    {plan.eyebrow}
                  </Typography>
                    <Typography variant="h5" fontWeight={700}>{plan.title}</Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
                    {plan.price} <Typography component="span" variant="subtitle2" color="text.secondary">{plan.suffix}</Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, mb: 2.5, minHeight: 48, lineHeight: 1.65 }}>
                    {plan.summary}
                  </Typography>
                  <List dense sx={{ mt: 1 }}>
                    {plan.highlights.map((f) => (
                      <ListItem key={f} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f} />
                      </ListItem>
                    ))}
                  </List>
                  {plan.planId === 'free' ? (
                    <Link href="/register" passHref>
                      <Button
                        variant="outlined"
                        fullWidth
                        disabled={plan.isCurrentPlan}
                        sx={{ mt: 2.5, borderRadius: 999, fontWeight: 600 }}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : isLoggedIn ? (
                    <Button
                      variant={plan.variant}
                      color="primary"
                      fullWidth
                      sx={{ mt: 2.5, borderRadius: 999, fontWeight: 600 }}
                      onClick={() => handleSubscribe(plan.planId as 'pro' | 'team')}
                      disabled={plan.isCurrentPlan || paddleInitializing || plan.checkoutUnavailable}
                    >
                      {plan.isCurrentPlan ? (
                        plan.cta
                      ) : paddleInitializing ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          Initializing...
                        </>
                      ) : paddleReady ? (
                        plan.cta
                      ) : (
                        'Checkout unavailable'
                      )}
                    </Button>
                  ) : (
                    <Link href="/register" passHref>
                      <Button variant={plan.variant} color="primary" fullWidth sx={{ mt: 2.5, borderRadius: 999, fontWeight: 600 }}>
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                  {plan.planId === 'pro' && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                      14-day free trial included
                    </Typography>
                  )}
                  {plan.checkoutUnavailable && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                      {paddleInitError ? 'Payment setup is temporarily unavailable.' : 'Checkout is not ready right now.'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

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

export const getServerSideProps: GetServerSideProps<PricingProps> = async () => {
  const fallbackPlans: PublicPlanConfig[] = [
    {
      planId: 'free',
      title: 'Free',
      eyebrow: 'Best for exploring the product',
      summary: 'Start indexing your first file and get a clean feel for the workflow.',
      price: '$0',
      suffix: '/mo',
      emphasized: false,
      isSubscribable: false,
      enabled: true,
      limits: dbPlanRowToPlanLimits({
        plan_id: 'free',
        label: 'Free',
        max_projects: 2,
        max_frames_total: 500,
        credits_per_month: null,
        max_uploads_per_day: null,
        max_uploads_per_month: null,
        max_frames_per_month: 500,
        max_index_size_bytes: null,
        retention_days: 30,
        max_indexes_per_day: null
      } as DbPlanRow, 'free')
    },
    {
      planId: 'pro',
      title: 'Pro',
      eyebrow: 'Best for individual product designers',
      summary: 'Use FigDex on real projects with enough quota, stronger search, and better day-to-day workflow.',
      price: '$29',
      suffix: '/mo',
      emphasized: true,
      isSubscribable: true,
      enabled: true,
      limits: dbPlanRowToPlanLimits({
        plan_id: 'pro',
        label: 'Pro',
        max_projects: 10,
        max_frames_total: 5000,
        credits_per_month: null,
        max_uploads_per_day: null,
        max_uploads_per_month: null,
        max_frames_per_month: null,
        max_index_size_bytes: null,
        retention_days: 180,
        max_indexes_per_day: 20
      } as DbPlanRow, 'pro')
    },
    {
      planId: 'team',
      title: 'Team',
      eyebrow: 'Best for shared review and handoff',
      summary: 'Give teams a shared gallery, larger quotas, and faster processing for collaborative work.',
      price: '$49',
      suffix: '/mo',
      emphasized: false,
      isSubscribable: true,
      enabled: true,
      limits: dbPlanRowToPlanLimits({
        plan_id: 'team',
        label: 'Team',
        max_projects: 20,
        max_frames_total: 15000,
        credits_per_month: null,
        max_uploads_per_day: null,
        max_uploads_per_month: null,
        max_frames_per_month: null,
        max_index_size_bytes: null,
        retention_days: 365,
        max_indexes_per_day: 50
      } as DbPlanRow, 'team')
    }
  ];

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceUrl || !serviceKey) {
    return { props: { publicPlans: fallbackPlans } };
  }

  try {
    const supabaseAdmin = createClient(serviceUrl, serviceKey);
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('plan_id,label,max_projects,max_frames_total,credits_per_month,max_uploads_per_day,max_uploads_per_month,max_frames_per_month,max_index_size_bytes,retention_days,max_indexes_per_day,is_subscribable,enabled,sort_order')
      .in('plan_id', ['free', 'pro', 'team'])
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return { props: { publicPlans: fallbackPlans } };
    }

    const marketingMeta: Record<'free' | 'pro' | 'team', Pick<PublicPlanConfig, 'price' | 'suffix' | 'eyebrow' | 'summary' | 'emphasized'>> = {
      free: {
        price: '$0',
        suffix: '/mo',
        eyebrow: 'Best for exploring the product',
        summary: 'Start indexing your first file and get a clean feel for the workflow.',
        emphasized: false,
      },
      pro: {
        price: '$29',
        suffix: '/mo',
        eyebrow: 'Best for individual product designers',
        summary: 'Use FigDex on real projects with enough quota, stronger search, and better day-to-day workflow.',
        emphasized: true,
      },
      team: {
        price: '$49',
        suffix: '/mo',
        eyebrow: 'Best for shared review and handoff',
        summary: 'Give teams a shared gallery, larger quotas, and faster processing for collaborative work.',
        emphasized: false,
      }
    };

    const publicPlans = (data as Array<DbPlanRow & { is_subscribable?: boolean | null; enabled?: boolean | null; sort_order?: number | null }>)
      .map((row) => row.plan_id)
      .filter((planId): planId is 'free' | 'pro' | 'team' => planId === 'free' || planId === 'pro' || planId === 'team')
      .map((planId) => {
        const row = data.find((item: any) => item.plan_id === planId) as any;
        return {
          planId,
          title: row.label || planId.charAt(0).toUpperCase() + planId.slice(1),
          eyebrow: marketingMeta[planId].eyebrow,
          summary: marketingMeta[planId].summary,
          price: marketingMeta[planId].price,
          suffix: marketingMeta[planId].suffix,
          emphasized: marketingMeta[planId].emphasized,
          isSubscribable: !!row.is_subscribable,
          enabled: !!row.enabled,
          limits: dbPlanRowToPlanLimits(row as DbPlanRow, planId)
        };
      });

    return {
      props: {
        publicPlans: publicPlans.length > 0 ? publicPlans : fallbackPlans
      }
    };
  } catch {
    return { props: { publicPlans: fallbackPlans } };
  }
};
