import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  IconButton,
  Paper,
  Avatar,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  Dashboard as DashboardIcon,
  Extension as PluginIcon,
  AutoAwesome as AutoIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon
} from '@mui/icons-material';

const HomePage = () => {
  const router = useRouter();

  const features = [
    {
      icon: <PluginIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      title: 'Figma Plugin Integration',
      description: 'Seamlessly integrate with Figma using our powerful plugin. Index your frames directly from your design workspace.',
      image: '/api/placeholder/400/200'
    },
    {
      icon: <SearchIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
      title: 'Smart Search',
      description: 'Find your designs instantly with intelligent text search across frame names, labels, and content.',
      image: '/api/placeholder/400/200'
    },
    {
      icon: <UploadIcon sx={{ fontSize: 40, color: '#ed6c02' }} />,
      title: 'Cloud Storage',
      description: 'Store your design indices securely in the cloud with automatic synchronization across devices.',
      image: '/api/placeholder/400/200'
    },
    {
      icon: <DashboardIcon sx={{ fontSize: 40, color: '#9c27b0' }} />,
      title: 'Beautiful Gallery',
      description: 'View your designs in a stunning masonry gallery layout with full-screen preview capabilities.',
      image: '/api/placeholder/400/200'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'Install Plugin',
      description: 'Install the Indexo plugin from the Figma Community or load it directly from our development build.',
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
      title: 'Access Web Gallery',
      description: 'View, search, and manage your indexed designs through our beautiful web interface.',
      icon: <SpeedIcon />
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <Container maxWidth="lg">
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
            Indexo
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
            <Button
              variant="contained"
              sx={{ 
                backgroundColor: 'white', 
                color: '#667eea',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
              }}
              onClick={() => router.push('/register')}
            >
              Sign Up
            </Button>
          </Stack>
        </Box>
      </Container>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 6, alignItems: 'center' }}>
          <Box>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                color: 'white', 
                mb: 3,
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              Your Figma Designs,
              <br />
              <span style={{ color: '#FFD700' }}>Indexed & Searchable</span>
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'rgba(255,255,255,0.9)', 
                mb: 4, 
                lineHeight: 1.6,
                fontSize: '1.2rem'
              }}
            >
              Transform your Figma workflow with intelligent frame indexing. 
              Create searchable galleries of your designs and never lose track 
              of your creative work again.
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<PlayIcon />}
                sx={{ 
                  backgroundColor: '#FFD700', 
                  color: '#333',
                  py: 1.5,
                  px: 4,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#FFC107' }
                }}
                onClick={() => router.push('/register')}
              >
                Get Started Free
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  py: 1.5,
                  px: 4,
                  fontSize: '1.1rem',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                }}
                onClick={() => router.push('/gallery')}
              >
                View Gallery
              </Button>
            </Stack>
            <Stack direction="row" spacing={4} alignItems="center">
              <Chip 
                label="🚀 Beta Version" 
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontWeight: 600
                }} 
              />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Free during beta period
              </Typography>
            </Stack>
          </Box>
          <Box>
            <Paper
              elevation={20}
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                p: 0.5
              }}
            >
              <Box
                sx={{
                  backgroundColor: 'white',
                  borderRadius: 3,
                  p: 4,
                  textAlign: 'center'
                }}
              >
                <Box
                  component="img"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='350' viewBox='0 0 500 350'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23764ba2;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='500' height='350' fill='url(%23grad1)' rx='10'/%3E%3Crect x='20' y='20' width='460' height='310' fill='white' rx='8'/%3E%3Crect x='40' y='40' width='420' height='40' fill='%23f5f5f5' rx='4'/%3E%3Ctext x='50' y='65' font-family='Arial, sans-serif' font-size='16' fill='%23333'%3EIndexo Plugin Interface%3C/text%3E%3Crect x='40' y='100' width='200' height='120' fill='%23e3f2fd' rx='4'/%3E%3Ctext x='50' y='125' font-family='Arial, sans-serif' font-size='14' fill='%23667eea'%3EFrame Selection%3C/text%3E%3Crect x='260' y='100' width='200' height='120' fill='%23f3e5f5' rx='4'/%3E%3Ctext x='270' y='125' font-family='Arial, sans-serif' font-size='14' fill='%23764ba2'%3EIndex Creation%3C/text%3E%3Crect x='40' y='240' width='420' height='40' fill='%23667eea' rx='4'/%3E%3Ctext x='230' y='265' font-family='Arial, sans-serif' font-size='14' fill='white' text-anchor='middle'%3ESave to Web Gallery%3C/text%3E%3Ccircle cx='70' cy='160' r='15' fill='%23667eea'/%3E%3Ctext x='70' y='165' font-family='Arial, sans-serif' font-size='12' fill='white' text-anchor='middle'%3E1%3C/text%3E%3Ccircle cx='290' cy='160' r='15' fill='%23764ba2'/%3E%3Ctext x='290' y='165' font-family='Arial, sans-serif' font-size='12' fill='white' text-anchor='middle'%3E2%3C/text%3E%3C/svg%3E"
                  alt="Indexo Plugin Interface Demo"
                  sx={{ width: '100%', height: 'auto', borderRadius: 2 }}
                />
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Features Section */}
      <Box sx={{ backgroundColor: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, color: '#333' }}>
              Powerful Features
            </Typography>
            <Typography variant="h6" sx={{ color: '#666', maxWidth: 600, mx: 'auto' }}>
              Everything you need to organize, search, and showcase your Figma designs
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4 }}>
          {features.map((feature, index) => (
            <Box key={index}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    border: '1px solid #e0e0e0',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Box sx={{ mb: 3 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#666', lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                  </Box>
                </Card>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Plugin Installation Section */}
      <Box sx={{ backgroundColor: '#f0f8ff', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, color: '#333' }}>
              Install the Figma Plugin
            </Typography>
            <Typography variant="h6" sx={{ color: '#666', maxWidth: 600, mx: 'auto', mb: 4 }}>
              Get the Indexo plugin running in your Figma workspace
            </Typography>
            <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto', textAlign: 'left' }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                📦 Installation Steps:
              </Typography>
              <Stack spacing={2}>
                <Typography variant="body1">
                  <strong>1.</strong> Open Figma and go to <strong>Plugins → Development → Import plugin from manifest</strong>
                </Typography>
                <Typography variant="body1">
                  <strong>2.</strong> Navigate to the plugin folder: <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>indexo-2/manifest.json</code>
                </Typography>
                <Typography variant="body1">
                  <strong>3.</strong> Click <strong>Save</strong> and the plugin will appear in your plugins list
                </Typography>
                <Typography variant="body1">
                  <strong>4.</strong> Run the plugin and connect it to your Indexo Web account
                </Typography>
              </Stack>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box sx={{ backgroundColor: '#f8f9fa', py: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, color: '#333' }}>
              How It Works
            </Typography>
            <Typography variant="h6" sx={{ color: '#666', maxWidth: 600, mx: 'auto' }}>
              Get started with Indexo in just a few simple steps
            </Typography>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 4 }}>
            {steps.map((step, index) => (
              <Box key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: '#667eea',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      color: 'white'
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: '#667eea', 
                      mb: 2,
                      fontSize: '2rem'
                    }}
                  >
                    {step.step}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666', lineHeight: 1.6 }}>
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ backgroundColor: '#667eea', py: 10 }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 3 }}>
              Ready to Transform Your Workflow?
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 6 }}>
              Join thousands of designers who have already improved their 
              design organization with Indexo.
            </Typography>
            <Stack direction="row" spacing={3} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                sx={{ 
                  backgroundColor: '#FFD700', 
                  color: '#333',
                  py: 2,
                  px: 6,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#FFC107' }
                }}
                onClick={() => router.push('/register')}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  py: 2,
                  px: 6,
                  fontSize: '1.2rem',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
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
      <Box sx={{ backgroundColor: '#333', py: 6 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white', mb: 2 }}>
                Indexo
              </Typography>
              <Typography variant="body1" sx={{ color: '#ccc', mb: 3, lineHeight: 1.6 }}>
                The smart way to organize and search your Figma designs. 
                Built for designers, by designers.
              </Typography>
              <Stack direction="row" spacing={2}>
                <IconButton sx={{ color: '#ccc' }}>
                  <GitHubIcon />
                </IconButton>
                <IconButton sx={{ color: '#ccc' }}>
                  <LinkedInIcon />
                </IconButton>
                <IconButton sx={{ color: '#ccc' }}>
                  <EmailIcon />
                </IconButton>
              </Stack>
            </Box>
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                    Product
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2" sx={{ color: '#ccc' }}>Features</Typography>
                    <Typography variant="body2" sx={{ color: '#ccc' }}>Pricing</Typography>
                    <Typography variant="body2" sx={{ color: '#ccc' }}>Documentation</Typography>
                  </Stack>
                </Box>
              </Box>
            </Box>
          </Box>
          <Divider sx={{ my: 4, borderColor: '#555' }} />
          <Typography variant="body2" sx={{ color: '#ccc', textAlign: 'center' }}>
            © 2024 Indexo. All rights reserved. Made with ❤️ for the design community.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
