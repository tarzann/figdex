import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Divider,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Send as SendIcon,
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

const ContactPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError('Failed to send message. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

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
            Contact Us
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
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <EmailIcon sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              mb: 4,
              fontWeight: 300
            }}
          >
            Have a question or need help? We&apos;re here to assist you.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 6, mb: 6 }}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 400, 
                color: '#1a1a1a', 
                mb: 3,
                fontSize: '1.5rem'
              }}
            >
              Get in Touch
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.8,
                fontWeight: 300,
                mb: 4
              }}
            >
              Whether you have a question about features, need technical support, or want to provide feedback, we&apos;d love to hear from you.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 400, 
                  color: '#1a1a1a', 
                  mb: 1
                }}
              >
                Email
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontWeight: 300
                }}
              >
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@figdex.com'}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 400, 
                  color: '#1a1a1a', 
                  mb: 1
                }}
              >
                Response Time
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontWeight: 300
                }}
              >
                We typically respond within 24-48 hours
              </Typography>
            </Box>
          </Box>

          <Box>
            <form onSubmit={handleSubmit}>
              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Thank you for your message! We&apos;ll get back to you soon.
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                multiline
                rows={6}
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                disabled={loading}
                sx={{ 
                  bgcolor: '#1a1a1a',
                  color: '#fff',
                  textTransform: 'none',
                  borderRadius: 0,
                  py: 1.5,
                  '&:hover': { 
                    bgcolor: '#333'
                  }
                }}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </Box>
        </Box>

        <Divider sx={{ my: 6 }} />

        <Box sx={{ mb: 6 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 400, 
              color: '#1a1a1a', 
              mb: 3,
              fontSize: '1.5rem'
            }}
          >
            Frequently Asked Questions
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 3
            }}
          >
            Before contacting us, you might find the answer in our{' '}
            <Box 
              component="span" 
              onClick={() => router.push('/help')}
              sx={{ 
                color: '#667eea', 
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Help Center
            </Box>
            .
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            sx={{ 
              color: '#1a1a1a', 
              borderColor: '#ddd',
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': { 
                borderColor: '#1a1a1a',
                bgcolor: '#fafafa'
              }
            }}
            onClick={() => router.push('/help')}
          >
            Visit Help Center
          </Button>
          <Button
            variant="outlined"
            sx={{ 
              color: '#1a1a1a', 
              borderColor: '#ddd',
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': { 
                borderColor: '#1a1a1a',
                bgcolor: '#fafafa'
              }
            }}
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default ContactPage;

