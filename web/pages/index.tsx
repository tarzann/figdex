import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
  Chip,
  Dialog,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Extension as PluginIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  Dashboard as DashboardIcon,
  AutoAwesome as AutoIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  FilterList as FilterIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  Tag as TagIcon,
  Image as ImageIcon,
  Groups as GroupsIcon,
  Business as BusinessIcon,
  Engineering as EngineeringIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import LoginDialog from '../components/LoginDialog';
import RegisterDialog from '../components/RegisterDialog';
import PublicSiteLayout from '../components/PublicSiteLayout';
import { FIGDEX_PLUGIN_VERSION } from '../lib/plugin-release';
import {
  FIGDEX_PRIMARY_HERO_MESSAGE,
  FIGDEX_PRIMARY_SUPPORT_MESSAGE
} from '../lib/marketing-messaging';

const HomePageV2 = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [betaDialogOpen, setBetaDialogOpen] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('figma_web_user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setIsLoggedIn(true);
            const adminEmails = ['ranmor01@gmail.com'];
            setIsAdmin(adminEmails.includes(user.email));
          } catch {
            setIsLoggedIn(false);
          }
        }
      }
    };
    checkLogin();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem('figdex_beta_popup_dismissed_v1');
    if (dismissed === 'true') return;

    const timeoutId = window.setTimeout(() => {
      setBetaDialogOpen(true);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('figma_web_user');
    setIsLoggedIn(false);
    setIsAdmin(false);
    router.push('/');
  };

  const dismissBetaDialog = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('figdex_beta_popup_dismissed_v1', 'true');
    }
    setBetaDialogOpen(false);
  };

  return (
    <PublicSiteLayout
      isLoggedIn={isLoggedIn}
      onLoginClick={() => setLoginDialogOpen(true)}
      onRegisterClick={() => setRegisterDialogOpen(true)}
    >
      {/* SECTION 1 — HERO */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(420px, 0.95fr)' },
            gap: { xs: 4, md: 6 },
            alignItems: 'center'
          }}
        >
          <Box>
            <Chip
              icon={<PluginIcon />}
              label="Figma plugin + searchable design library"
              sx={{
                mb: 2.5,
                bgcolor: '#eef4ff',
                color: '#3538cd',
                fontWeight: 600,
                borderRadius: 999
              }}
            />
            <Typography 
              variant="h1" 
              sx={{ 
                fontWeight: 700, 
                color: '#1a1a1a', 
                mb: 2.5,
                fontSize: { xs: '2.45rem', md: '4.1rem' },
                letterSpacing: '-0.04em',
                lineHeight: 1.06,
                maxWidth: 760
              }}
            >
              {FIGDEX_PRIMARY_HERO_MESSAGE}
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#475467', 
                mb: 3, 
                lineHeight: 1.55,
                fontSize: { xs: '1.05rem', md: '1.32rem' },
                fontWeight: 400,
                maxWidth: 560
              }}
            >
              {FIGDEX_PRIMARY_SUPPORT_MESSAGE}
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mb: 2.5, flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <Button
                variant="contained"
                size="large"
                sx={{ 
                  bgcolor: '#111827',
                  color: '#fff',
                  py: 1.35,
                  px: 4,
                  fontSize: '0.98rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 999,
                  '&:hover': { 
                    bgcolor: '#1f2937'
                  }
                }}
                onClick={() => router.push('/register')}
              >
                Start Free
              </Button>
              <Button
                onClick={() => router.push('/download-plugin')}
                variant="outlined"
                size="large"
                startIcon={<PluginIcon />}
                sx={{
                  color: '#1a1a1a',
                  borderColor: '#cbd5e1',
                  py: 1.35,
                  px: 3.5,
                  fontSize: '0.98rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 999,
                  '&:hover': {
                    borderColor: '#111827',
                    bgcolor: '#fff'
                  }
                }}
              >
                Download Plugin
              </Button>
            </Stack>
            <Typography
              variant="body1"
              sx={{
                color: '#667085',
                maxWidth: 560,
                lineHeight: 1.7,
                fontWeight: 500,
              }}
            >
              Use the plugin to capture pages from Figma. Use FigDex Web to search, review, and share them.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5, flexWrap: 'wrap', maxWidth: 620 }}>
              {['No credit card required', 'Works with large multi-page files'].map((item) => (
                <Stack key={item} direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#027a48' }} />
                  <Typography variant="body2" sx={{ color: '#667085', fontWeight: 500 }}>
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" sx={{ color: '#98a2b3', display: 'block', mt: 1.25 }}>
              Public plugin package available now: {FIGDEX_PLUGIN_VERSION}
            </Typography>
          </Box>
          <Box>
            <Box 
              sx={{ 
                bgcolor: '#fff',
                borderRadius: 6,
                p: 3,
                border: '1px solid #e4e7ec',
                boxShadow: '0 20px 50px rgba(15,23,42,0.08)'
              }}
            >
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: 4, bgcolor: '#f8fafc', border: '1px solid #eaecf0' }}>
                  <Stack spacing={0.5}>
                    <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em' }}>
                      Plugin
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Select pages and index
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#667085' }}>
                      8 pages loaded, 2 selected
                    </Typography>
                  </Stack>
                  <Chip label="Ready to index" sx={{ bgcolor: '#ecfdf3', color: '#027a48', fontWeight: 700 }} />
                </Box>

                <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
                  <Box sx={{ width: 54, height: 54, borderRadius: '50%', bgcolor: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(17,24,39,0.16)' }}>
                    <UploadIcon />
                  </Box>
                  <Divider flexItem sx={{ alignSelf: 'center', borderColor: '#c7d7fe' }} />
                  <Box sx={{ width: 54, height: 54, borderRadius: '50%', bgcolor: '#667eea', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(102,126,234,0.24)' }}>
                    <SearchIcon />
                  </Box>
                  <Divider flexItem sx={{ alignSelf: 'center', borderColor: '#c7d7fe' }} />
                  <Box sx={{ width: 54, height: 54, borderRadius: '50%', bgcolor: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(15,118,110,0.22)' }}>
                    <ShareIcon />
                  </Box>
                </Stack>

                <Box sx={{ p: 2.5, borderRadius: 4, bgcolor: '#111827', color: '#fff' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="overline" sx={{ color: '#98a2b3', letterSpacing: '0.08em' }}>
                        Gallery
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Search across indexed screens
                      </Typography>
                    </Box>
                    <Chip label="Live filters" sx={{ bgcolor: '#1d2939', color: '#d1e9ff' }} />
                  </Stack>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                    {[
                      { label: 'Indexed files', value: '12' },
                      { label: 'Screens', value: '4,860' },
                      { label: 'Search time', value: '<1s' },
                      { label: 'Share links', value: 'Ready' },
                    ].map((metric) => (
                      <Box key={metric.label} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#1f2937', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Typography variant="caption" sx={{ color: '#98a2b3', display: 'block', mb: 0.25 }}>
                          {metric.label}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {metric.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Container>

      {/* SECTION 2 — TRUST / SOCIAL PROOF */}
      <Box sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
              gap: 2
            }}
          >
            {[
              { icon: <StorageIcon />, value: 'Large files', label: 'Index long, multi-page Figma projects without manual cleanup' },
              { icon: <SearchIcon />, value: 'Fast search', label: 'Search by file, text, tags, size and filtered results' },
              { icon: <ShareIcon />, value: 'Clean sharing', label: 'Share the full gallery or only the exact result set you want' },
              { icon: <SpeedIcon />, value: 'Team-ready', label: 'Built for review, audits, handoff and ongoing design operations', soon: true },
            ].map((item) => (
              <Box
                key={item.value}
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  bgcolor: '#fff',
                  border: '1px solid #e4e7ec',
                  boxShadow: '0 1px 2px rgba(16,24,40,0.04)'
                }}
              >
                <Box sx={{ color: '#667eea', mb: 1.5 }}>{item.icon}</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {item.value}
                  </Typography>
                  {item.soon ? (
                    <Chip
                      label="Soon"
                      size="small"
                      sx={{
                        height: 22,
                        bgcolor: '#eef2ff',
                        color: '#4f46e5',
                        fontWeight: 700,
                        border: '1px solid #c7d2fe'
                      }}
                    />
                  ) : null}
                </Box>
                <Typography variant="body2" sx={{ color: '#667085', lineHeight: 1.65 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 3 — VALUE PROPOSITIONS (Three Pillars) */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 6 }}>
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <StorageIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
            </Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 400, 
                mb: 2,
                color: '#1a1a1a',
                fontSize: '1.5rem',
                textAlign: 'center'
              }}
            >
              Organize at scale
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.7,
                fontWeight: 300,
                textAlign: 'center'
              }}
            >
              Automatically index entire Figma files — no manual work, no maintenance. Perfect for large, multi-page projects.
            </Typography>
          </Box>
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <SearchIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
            </Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 400, 
                mb: 2,
                color: '#1a1a1a',
                fontSize: '1.5rem',
                textAlign: 'center'
              }}
            >
              Search anything instantly
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.7,
                fontWeight: 300,
                textAlign: 'center'
              }}
            >
              Find screens, flows, and components in seconds using advanced filters and auto-generated tags.
            </Typography>
          </Box>
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <ShareIcon sx={{ fontSize: 48, color: '#667eea', mb: 2 }} />
            </Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 400, 
                mb: 2,
                color: '#1a1a1a',
                fontSize: '1.5rem',
                textAlign: 'center'
              }}
            >
              Share clean visual libraries
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.7,
                fontWeight: 300,
                textAlign: 'center'
              }}
            >
              Create public or team-only galleries with a single click for reviews, handoffs, and audits.
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* SECTION 4 — FEATURES GRID (6–8 Cards) */}
      <Box sx={{ bgcolor: '#FAFAFA', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 300, 
                mb: 2, 
                color: '#1a1a1a', 
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              Powerful features for professional design teams
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 4 }}>
            {[
              { icon: <ApiIcon />, title: 'Dual Indexing', desc: 'Plugin + Figma API for full automation.' },
              { icon: <TagIcon />, title: 'Smart Auto-Tagging', desc: 'Detects device type, aspect ratio, frame types, and colors.' },
              { icon: <FilterIcon />, title: 'Advanced Filtering', desc: 'Combine dozens of filters to refine your search instantly.' },
              { icon: <SpeedIcon />, title: 'Background Processing', desc: 'Handles thousands of frames with job splitting & retries.' },
              { icon: <HistoryIcon />, title: 'Version Archives', desc: 'Restore any version with one click.' },
              { icon: <ShareIcon />, title: 'Public Share Links', desc: 'Share visual libraries without exposing your Figma files.' },
              { icon: <TagIcon />, title: 'Custom Tag Library (Pro)', desc: 'Create and manage tag sets for your workflow.' },
              { icon: <ImageIcon />, title: 'Fast Thumbnails', desc: 'Optimized image encoding for large files.' },
            ].map((feature, idx) => (
              <Box key={idx}>
                <Card 
                  elevation={0}
                  sx={{ 
                    bgcolor: 'transparent',
                    border: 'none',
                    height: '100%',
                    '&:hover': {
                      '& .feature-icon': {
                        transform: 'translateY(-4px)',
                      }
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box 
                      className="feature-icon"
                      sx={{ 
                        mb: 2,
                        transition: 'transform 0.3s ease',
                        display: 'inline-block',
                        color: '#667eea'
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 400, 
                        mb: 1,
                        color: '#1a1a1a',
                        fontSize: '1.1rem'
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#666', 
                        lineHeight: 1.6,
                        fontWeight: 300
                      }}
                    >
                      {feature.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 5 — DEMO VIDEO SECTION */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 960, mx: 'auto' }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 300, 
              mb: 2, 
              color: '#1a1a1a', 
              fontSize: { xs: '2rem', md: '3rem' }
            }}
          >
            See FigDex in action
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#666', 
              mb: 6,
              fontWeight: 300,
              fontSize: '1.1rem'
            }}
          >
            A 30-second look at how effortless indexing can be.
          </Typography>
          <Box 
            sx={{ 
              bgcolor: '#FAFAFA',
              borderRadius: 2,
              p: 8,
              mb: 4,
              border: '1px solid #eee',
              minHeight: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              [Video Player Placeholder]
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="large"
            sx={{ 
              color: '#1a1a1a', 
              borderColor: '#ddd',
              py: 1.5,
              px: 5,
              fontSize: '1rem',
              fontWeight: 400,
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': { 
                borderColor: '#1a1a1a',
                bgcolor: '#fafafa'
              }
            }}
          >
            View Full Demo
          </Button>
        </Box>
      </Container>

      {/* SECTION 6 — USE CASES (Persona Targeting) */}
      <Box sx={{ bgcolor: '#FAFAFA', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 4 }}>
            {[
              { 
                icon: <PersonIcon />, 
                title: 'For Designers', 
                desc: 'Find screens instantly and eliminate scroll fatigue.' 
              },
              { 
                icon: <BusinessIcon />, 
                title: 'For Heads of Design', 
                desc: 'Improve team velocity, visibility, and consistency.' 
              },
              { 
                icon: <EngineeringIcon />, 
                title: 'For Design Ops', 
                desc: 'Gain operational clarity across large design ecosystems.' 
              },
              { 
                icon: <GroupsIcon />, 
                title: 'For Product Teams', 
                desc: 'Review and share design assets without entering Figma.' 
              },
            ].map((useCase, idx) => (
              <Box key={idx}>
                <Card 
                  elevation={0}
                  sx={{ 
                    bgcolor: '#FFFFFF',
                    border: '1px solid #eee',
                    height: '100%',
                    '&:hover': {
                      boxShadow: 2,
                      '& .use-case-icon': {
                        transform: 'scale(1.1)',
                      }
                    }
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box 
                      className="use-case-icon"
                      sx={{ 
                        mb: 2,
                        transition: 'transform 0.3s ease',
                        display: 'inline-block',
                        color: '#667eea'
                      }}
                    >
                      {useCase.icon}
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 400, 
                        mb: 2,
                        color: '#1a1a1a',
                        fontSize: '1.1rem'
                      }}
                    >
                      {useCase.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#666', 
                        lineHeight: 1.6,
                        fontWeight: 300
                      }}
                    >
                      {useCase.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 7 — PRICING PREVIEW */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 300, 
              mb: 2, 
              color: '#1a1a1a', 
              fontSize: { xs: '2rem', md: '3rem' }
            }}
          >
            Simple pricing that scales with your workflow
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
          {[
            { 
              name: 'Free', 
              price: '$0', 
              desc: 'For exploring FigDex and indexing your first real file',
              features: ['Start with a small file limit', 'Basic search', 'Private gallery', 'No credit card required']
            },
            { 
              name: 'Pro', 
              price: '$29', 
              desc: 'For designers working on active product workflows',
              features: ['More room for files and frames', 'Advanced search & filters', 'Reliable re-indexing', 'Better day-to-day throughput'],
              highlight: true
            },
            { 
              name: 'Team', 
              price: '$49', 
              desc: 'For teams that review, share, and scale together',
              features: ['Larger shared capacity', 'Public and team sharing', 'Priority processing', 'Built for collaborative review']
            },
          ].map((plan, idx) => (
            <Box key={idx}>
              <Card 
                elevation={0}
                sx={{ 
                  bgcolor: plan.highlight ? '#FAFAFA' : '#FFFFFF',
                  border: plan.highlight ? '2px solid #667eea' : '1px solid #eee',
                  height: '100%',
                  position: 'relative'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 400, 
                      mb: 1,
                      color: '#1a1a1a'
                    }}
                  >
                    {plan.name}
                  </Typography>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      fontWeight: 700, 
                      mb: 2,
                      color: '#1a1a1a'
                    }}
                  >
                    {plan.price}
                    {plan.price !== 'Custom' && (
                      <Typography component="span" variant="body2" color="text.secondary">
                        {' '}/mo
                      </Typography>
                    )}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666', 
                      mb: 3,
                      fontWeight: 300
                    }}
                  >
                    {plan.desc}
                  </Typography>
                  <Stack spacing={1} sx={{ mb: 3 }}>
                    {plan.features.map((feature, fIdx) => (
                      <Box key={fIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 16, color: '#667eea' }} />
                        <Typography variant="body2" sx={{ color: '#666', fontWeight: 300 }}>
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button
            variant="outlined"
            size="large"
            sx={{ 
              color: '#1a1a1a', 
              borderColor: '#ddd',
              py: 1.5,
              px: 5,
              fontSize: '1rem',
              fontWeight: 400,
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': { 
                borderColor: '#1a1a1a',
                bgcolor: '#fafafa'
              }
            }}
            onClick={() => router.push('/pricing')}
          >
            View Full Pricing
          </Button>
        </Box>
      </Container>

      {/* SECTION 8 — TESTIMONIALS / SOCIAL PROOF */}
      <Box sx={{ bgcolor: '#FAFAFA', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
            {[
              { 
                quote: 'We indexed 12,000 frames in minutes. Absolute game changer.',
                author: 'Lead Designer',
                company: 'SaaS Company'
              },
              { 
                quote: 'Finally a search layer for Figma that actually works.',
                author: 'Director of Product Design',
                company: 'FinTech'
              },
              { 
                quote: 'Our review cycles shrank by 40%. Designers love it.',
                author: 'Head of UX',
                company: 'Enterprise HealthTech'
              },
            ].map((testimonial, idx) => (
              <Box key={idx}>
                <Card 
                  elevation={0}
                  sx={{ 
                    bgcolor: '#FFFFFF',
                    border: '1px solid #eee',
                    height: '100%'
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#1a1a1a', 
                        mb: 3,
                        fontStyle: 'italic',
                        lineHeight: 1.7,
                        fontWeight: 300
                      }}
                    >
                      &ldquo;{testimonial.quote}&rdquo;
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#666',
                        fontWeight: 400
                      }}
                    >
                      {testimonial.author}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#999',
                        fontWeight: 300
                      }}
                    >
                      {testimonial.company}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 9 — FINAL CTA / BOTTOM BANNER */}
      <Box sx={{ bgcolor: '#1a1a1a', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto' }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 300, 
                color: '#fff', 
                mb: 3,
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              Stop searching. Start indexing.
            </Typography>
            <Button
              variant="contained"
              size="large"
              sx={{ 
                bgcolor: '#fff',
                color: '#1a1a1a',
                py: 1.5,
                px: 5,
                fontSize: '1rem',
                fontWeight: 400,
                textTransform: 'none',
                borderRadius: 0,
                mb: 2,
                '&:hover': { 
                  bgcolor: '#f5f5f5'
                }
              }}
              onClick={() => router.push('/register')}
            >
              Start Free
            </Button>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#999',
                fontWeight: 300
              }}
            >
              Takes less than 30 seconds to create your first index.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Login Dialog */}
      <Dialog
        open={betaDialogOpen}
        onClose={dismissBetaDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 5,
            border: '1px solid #dbe3f0',
            boxShadow: '0 30px 80px rgba(15,23,42,0.18)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 3, md: 4 } }}>
          <Chip
            label="Early beta"
            sx={{
              mb: 2,
              bgcolor: '#eef2ff',
              color: '#4f46e5',
              fontWeight: 700,
              borderRadius: 999,
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#111827',
              mb: 1.5,
            }}
          >
            Want early access to FigDex?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#667085',
              lineHeight: 1.75,
              mb: 3,
            }}
          >
            We&apos;re inviting a small group of teams to help shape the beta. Leave your details and tell us a bit about your Figma workflow.
          </Typography>
          <Box
            sx={{
              p: 2.25,
              borderRadius: 3,
              bgcolor: '#f8fafc',
              border: '1px solid #e4e7ec',
            }}
          >
            <Typography variant="body2" sx={{ color: '#475467', lineHeight: 1.8 }}>
              Best fit right now: teams working with large multi-page files, repeated review cycles, design ops, and stakeholder sharing.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 3, md: 4 }, pb: { xs: 3, md: 4 }, pt: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%' }}>
            <Button
              variant="contained"
              onClick={() => {
                dismissBetaDialog();
                router.push('/beta');
              }}
              sx={{
                bgcolor: '#111827',
                color: '#fff',
                textTransform: 'none',
                borderRadius: 999,
                px: 3,
                py: 1.35,
                fontWeight: 700,
                '&:hover': { bgcolor: '#1f2937' },
              }}
            >
              Join the beta
            </Button>
            <Button
              variant="outlined"
              onClick={dismissBetaDialog}
              sx={{
                color: '#111827',
                borderColor: '#cbd5e1',
                textTransform: 'none',
                borderRadius: 999,
                px: 3,
                py: 1.35,
                fontWeight: 600,
              }}
            >
              Maybe later
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onSwitchToRegister={() => {
          setLoginDialogOpen(false);
          setRegisterDialogOpen(true);
        }}
        onLoginSuccess={() => {
          setIsLoggedIn(true);
          const userData = localStorage.getItem('figma_web_user');
          if (userData) {
            try {
              const user = JSON.parse(userData);
              const adminEmails = ['ranmor01@gmail.com'];
              setIsAdmin(adminEmails.includes(user.email));
            } catch {
              setIsLoggedIn(false);
            }
          }
        }}
      />

      {/* Register Dialog */}
      <RegisterDialog
        open={registerDialogOpen}
        onClose={() => setRegisterDialogOpen(false)}
        onSwitchToLogin={() => {
          setRegisterDialogOpen(false);
          setLoginDialogOpen(true);
        }}
        onRegisterSuccess={() => {
          setIsLoggedIn(true);
          const userData = localStorage.getItem('figma_web_user');
          if (userData) {
            try {
              const user = JSON.parse(userData);
              const adminEmails = ['ranmor01@gmail.com'];
              setIsAdmin(adminEmails.includes(user.email));
            } catch {
              setIsLoggedIn(false);
            }
          }
        }}
      />
    </PublicSiteLayout>
  );
};

export default HomePageV2;
