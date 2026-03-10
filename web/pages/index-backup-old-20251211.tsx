import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar
} from '@mui/material';
import {
  Extension as PluginIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  Dashboard as DashboardIcon,
  AutoAwesome as AutoIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  AccountCircle as AccountCircleIcon,
  Person as PersonIcon,
  Api as ApiIcon,
  FolderOpen as FolderOpenIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const HomePage = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const checkLogin = () => {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('figma_web_user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setIsLoggedIn(true);
            setUserEmail(user.email || '');
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

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('figma_web_user');
    setIsLoggedIn(false);
    setUserEmail('');
    setIsAdmin(false);
    handleUserMenuClose();
    router.push('/');
  };

  const features = [
    {
      icon: <PluginIcon sx={{ fontSize: 32, color: '#666' }} />,
      title: 'Figma Plugin',
      description: 'Seamlessly integrate with Figma using our powerful plugin. Index your frames directly from your design workspace.',
    },
    {
      icon: <SearchIcon sx={{ fontSize: 32, color: '#666' }} />,
      title: 'Smart Search',
      description: 'Find your designs instantly with intelligent text search across frame names, labels, and content.',
    },
    {
      icon: <UploadIcon sx={{ fontSize: 32, color: '#666' }} />,
      title: 'Cloud Storage',
      description: 'Store your design indices securely in the cloud with automatic synchronization across devices.',
    },
    {
      icon: <DashboardIcon sx={{ fontSize: 32, color: '#666' }} />,
      title: 'Beautiful Gallery',
      description: 'View your designs in a stunning masonry gallery layout with full-screen preview capabilities.',
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Install Plugin',
      description: 'Install the FigDex plugin from the Figma Community or load it directly from our development build.',
      icon: <PluginIcon />
    },
    {
      step: '02',
      title: 'Create Account',
      description: 'Sign up for a free account and get your personal API key for seamless integration.',
      icon: <SecurityIcon />
    },
    {
      step: '03',
      title: 'Index Frames',
      description: 'Select your frames in Figma and use the plugin to create searchable indices of your designs.',
      icon: <AutoIcon />
    },
    {
      step: '04',
      title: 'Access Gallery',
      description: 'View, search, and manage your indexed designs through our beautiful web interface.',
      icon: <SpeedIcon />
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      {/* Header */}
      <Container maxWidth="lg">
        <Box sx={{ py: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 300,
              letterSpacing: 3,
              color: '#1a1a1a',
              fontSize: '1.5rem'
            }}
          >
            FIGDEX
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            {isLoggedIn ? (
              <>
                <Button
                  variant="text"
                  sx={{ 
                    color: '#1a1a1a',
                    fontWeight: 400,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    '&:hover': { 
                      bgcolor: '#f5f5f5'
                    }
                  }}
                  onClick={() => router.push('/pricing')}
                >
                  Pricing
                </Button>
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
                  <MenuItem onClick={() => { router.push('/projects'); handleUserMenuClose(); }}>
                    <ListItemIcon>
                      <FolderOpenIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>All Projects</ListItemText>
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
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  variant="text"
                  sx={{ 
                    color: '#1a1a1a',
                    fontWeight: 400,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    '&:hover': { 
                      bgcolor: '#f5f5f5'
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
                    fontWeight: 400,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    '&:hover': { 
                      bgcolor: '#f5f5f5'
                    }
                  }}
                  onClick={() => router.push('/login')}
                >
                  Login
                </Button>
                <Button
                  variant="outlined"
                  sx={{ 
                    color: '#1a1a1a',
                    borderColor: '#1a1a1a',
                    fontWeight: 400,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    px: 3,
                    '&:hover': { 
                      borderColor: '#1a1a1a',
                      bgcolor: '#f5f5f5'
                    }
                  }}
                  onClick={() => router.push('/register')}
                >
                  Sign Up
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Container>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto', mb: 8 }}>
          <Typography 
            variant="h1" 
            sx={{ 
              fontWeight: 300, 
              color: '#1a1a1a', 
              mb: 3,
              fontSize: { xs: '2.5rem', md: '4rem' },
              letterSpacing: -1,
              lineHeight: 1.1
            }}
          >
            Your Figma Designs,
            <br />
            <Box component="span" sx={{ fontWeight: 400 }}>Indexed & Searchable</Box>
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#666', 
              mb: 6, 
              lineHeight: 1.7,
              fontSize: '1.1rem',
              fontWeight: 300
            }}
          >
            Transform your Figma workflow with intelligent frame indexing. 
            Create searchable galleries of your designs and never lose track 
            of your creative work again.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Button
              variant="contained"
              size="large"
              sx={{ 
                bgcolor: '#1a1a1a',
                color: '#fff',
                py: 1.5,
                px: 5,
                fontSize: '1rem',
                fontWeight: 400,
                textTransform: 'none',
                borderRadius: 0,
                '&:hover': { 
                  bgcolor: '#333'
                }
              }}
              onClick={() => router.push('/register')}
            >
              Get Started
            </Button>
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
              onClick={() => router.push('/gallery')}
            >
              View Gallery
            </Button>
          </Stack>
          <Typography variant="body2" sx={{ color: '#999', fontSize: '0.85rem' }}>
            Free during beta period
          </Typography>
        </Box>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: '#FAFAFA', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 300, 
                mb: 2, 
                color: '#1a1a1a', 
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              Features
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', maxWidth: 600, mx: 'auto', fontWeight: 300 }}>
              Everything you need to organize, search, and showcase your Figma designs
            </Typography>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4 }}>
            {features.map((feature, index) => (
              <Card 
                key={index}
                elevation={0}
                sx={{ 
                  bgcolor: 'transparent',
                  border: 'none',
                  '&:hover': {
                    '& .feature-icon': {
                      transform: 'translateY(-4px)',
                    }
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box 
                    className="feature-icon"
                    sx={{ 
                      mb: 3,
                      transition: 'transform 0.3s ease',
                      display: 'inline-block'
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 400, 
                      mb: 2,
                      color: '#1a1a1a',
                      fontSize: '1.5rem'
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#666', 
                      lineHeight: 1.7,
                      fontWeight: 300
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: '#FFFFFF', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 300, 
                mb: 2, 
                color: '#1a1a1a',
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              How It Works
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', maxWidth: 600, mx: 'auto', fontWeight: 300 }}>
              Get started with FigDex in just a few simple steps
            </Typography>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 6 }}>
            {steps.map((step, index) => (
              <Box key={index} sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 300, 
                    color: '#ccc', 
                    mb: 2,
                    fontSize: '3rem',
                    letterSpacing: -2
                  }}
                >
                  {step.step}
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 400, 
                    mb: 2,
                    color: '#1a1a1a',
                    fontSize: '1.25rem'
                  }}
                >
                  {step.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#666', 
                    lineHeight: 1.7,
                    fontWeight: 300
                  }}
                >
                  {step.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: '#1a1a1a', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 300, 
                color: '#fff', 
                mb: 3,
                fontSize: { xs: '2rem', md: '3rem' }
              }}
            >
              Ready to Transform Your Workflow?
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#999', 
                mb: 6,
                fontWeight: 300,
                lineHeight: 1.7
              }}
            >
              Join thousands of designers who have already improved their 
              design organization with FigDex.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
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
                  '&:hover': { 
                    bgcolor: '#f5f5f5'
                  }
                }}
                onClick={() => router.push('/register')}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{ 
                  color: '#fff', 
                  borderColor: '#666',
                  py: 1.5,
                  px: 5,
                  fontSize: '1rem',
                  fontWeight: 400,
                  textTransform: 'none',
                  borderRadius: 0,
                  '&:hover': { 
                    borderColor: '#fff',
                    bgcolor: 'rgba(255,255,255,0.05)'
                  }
                }}
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#FFFFFF', py: 8, borderTop: '1px solid #eee' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 8, mb: 6 }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 300, 
                  color: '#1a1a1a', 
                  mb: 3,
                  letterSpacing: 2
                }}
              >
                FIGDEX
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666', 
                  mb: 4, 
                  lineHeight: 1.7,
                  fontWeight: 300
                }}
              >
                The smart way to organize and search your Figma designs. 
                Built for designers, by designers.
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton 
                  sx={{ 
                    color: '#666',
                    '&:hover': { color: '#1a1a1a' }
                  }}
                >
                  <GitHubIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  sx={{ 
                    color: '#666',
                    '&:hover': { color: '#1a1a1a' }
                  }}
                >
                  <LinkedInIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  sx={{ 
                    color: '#666',
                    '&:hover': { color: '#1a1a1a' }
                  }}
                >
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#1a1a1a', 
                    mb: 2, 
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  Product
                </Typography>
                <Stack spacing={1.5}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                  >
                    Features
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                  >
                    Pricing
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                  >
                    Documentation
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#1a1a1a', 
                    mb: 2, 
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  Support
                </Typography>
                <Stack spacing={1.5}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                    onClick={() => router.push('/help')}
                  >
                    Help Center
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                    onClick={() => router.push('/contact')}
                  >
                    Contact Us
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                  >
                    Community
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#1a1a1a', 
                    mb: 2, 
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  Legal
                </Typography>
                <Stack spacing={1.5}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                    onClick={() => router.push('/terms')}
                  >
                    Terms of Service
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666',
                      cursor: 'pointer',
                      '&:hover': { color: '#1a1a1a' },
                      fontWeight: 300
                    }}
                    onClick={() => router.push('/privacy')}
                  >
                    Privacy Policy
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Box>
          <Divider sx={{ my: 4, borderColor: '#eee' }} />
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#999', 
              textAlign: 'center',
              fontWeight: 300,
              fontSize: '0.85rem'
            }}
          >
            © 2024 FigDex. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
