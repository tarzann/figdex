import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
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

const TermsOfService = () => {
  const router = useRouter();
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
            Terms of Service
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
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#999', 
            mb: 6,
            fontWeight: 300
          }}
        >
          Last updated: December 3, 2024
        </Typography>

        <Divider sx={{ mb: 6 }} />

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
            1. Acceptance of Terms
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            By accessing and using FigDex (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Typography>
        </Box>

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
            2. Description of Service
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            FigDex is a design index management platform that enables users to organize, search, and share Figma design frames. The Service includes web-based gallery interfaces, Figma plugin integration, and REST API access.
          </Typography>
        </Box>

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
            3. User Accounts
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.
          </Typography>
        </Box>

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
            4. Acceptable Use
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            You agree not to use the Service to:
          </Typography>
          <Box component="ul" sx={{ pl: 4, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Upload, store, or share any content that is illegal, harmful, or violates intellectual property rights
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Attempt to gain unauthorized access to the Service or its related systems
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Use the Service in any way that could damage, disable, or impair the Service
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Automate access to the Service in a manner that exceeds reasonable usage limits
            </Typography>
          </Box>
        </Box>

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
            5. Subscription Plans and Billing
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            FigDex offers free and paid subscription plans. Paid subscriptions are billed monthly or annually as selected. You may cancel your subscription at any time. Refunds are provided at our discretion and in accordance with applicable law.
          </Typography>
        </Box>

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
            6. Intellectual Property
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            You retain all rights to the content you upload to FigDex. By using the Service, you grant FigDex a limited license to store, process, and display your content solely for the purpose of providing the Service. FigDex and its original content, features, and functionality are owned by FigDex and are protected by international copyright, trademark, and other intellectual property laws.
          </Typography>
        </Box>

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
            7. Data Storage and Retention
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            We store your data securely and in accordance with our Privacy Policy. You may delete your account and associated data at any time. We reserve the right to delete inactive accounts and data after a reasonable period of inactivity.
          </Typography>
        </Box>

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
            8. Service Availability
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or unforeseen circumstances. We are not liable for any loss or damage resulting from Service unavailability.
          </Typography>
        </Box>

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
            9. Limitation of Liability
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            To the maximum extent permitted by law, FigDex shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
          </Typography>
        </Box>

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
            10. Changes to Terms
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            We reserve the right to modify these terms at any time. We will notify users of material changes via email or through the Service. Continued use of the Service after such modifications constitutes acceptance of the updated terms.
          </Typography>
        </Box>

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
            11. Contact Information
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            If you have any questions about these Terms of Service, please contact us at{' '}
            <Box component="a" href="/contact" sx={{ color: '#667eea', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              our contact page
            </Box>
            {' '}or via email.
          </Typography>
        </Box>

        <Divider sx={{ my: 6 }} />

        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
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
            onClick={() => router.push('/privacy')}
          >
            Privacy Policy
          </Button>
          <Button
            variant="contained"
            sx={{ 
              bgcolor: '#1a1a1a',
              color: '#fff',
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': { 
                bgcolor: '#333'
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

export default TermsOfService;

