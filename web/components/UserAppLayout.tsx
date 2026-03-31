import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Api as ApiIcon,
  ArrowBack as ArrowBackIcon,
  ContentCopy as ContentCopyIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  PUBLIC_SITE_BACKGROUND_SX,
  PUBLIC_SITE_PRIMARY_BUTTON_SX,
} from '../lib/public-site-styles';

type UserAppLayoutProps = {
  title: string;
  children: ReactNode;
  contentMaxWidth?: 'md' | 'lg' | 'xl';
  contentSx?: Record<string, any>;
};

export default function UserAppLayout({
  title,
  children,
  contentMaxWidth = 'lg',
  contentSx,
}: UserAppLayoutProps) {
  const router = useRouter();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('figma_web_user');
    if (!userData) {
      setIsLoggedIn(false);
      setIsAdmin(false);
      return;
    }
    try {
      const user = JSON.parse(userData);
      setIsLoggedIn(true);
      setIsAdmin(['ranmor01@gmail.com'].includes(user.email));
    } catch {
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  }, []);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('figma_web_user');
    }
    setIsLoggedIn(false);
    setIsAdmin(false);
    handleUserMenuClose();
    router.push('/');
  };

  const handleCopyApiKey = async () => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('figma_web_user');
    if (!userData) return;
    try {
      const user = JSON.parse(userData);
      if (!user?.api_key) return;
      await navigator.clipboard.writeText(user.api_key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
    handleUserMenuClose();
  };

  return (
    <Box sx={{ minHeight: '100vh', ...PUBLIC_SITE_BACKGROUND_SX }}>
      <Container maxWidth="lg" sx={{ pt: 3.5, pb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 3,
            pb: 2.25,
            borderBottom: '1px solid rgba(17,24,39,0.08)',
          }}
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: 1.5,
                color: '#1a1a1a',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
              onClick={() => router.push('/')}
            >
              FIGDEX
            </Typography>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
              sx={{
                color: '#475467',
                textTransform: 'none',
                fontWeight: 600,
                minWidth: 'auto',
                '&:hover': { bgcolor: 'rgba(17,24,39,0.04)' },
              }}
            >
              Back
            </Button>
          </Stack>

          {isLoggedIn && (
            <>
              <Button
                variant="contained"
                startIcon={
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.12)',
                      width: 24,
                      height: 24,
                      border: '1px solid rgba(255,255,255,0.14)',
                    }}
                  >
                    <AccountCircleIcon sx={{ fontSize: 16, color: '#f8fafc' }} />
                  </Avatar>
                }
                onClick={handleUserMenuOpen}
                sx={{
                  ...PUBLIC_SITE_PRIMARY_BUTTON_SX,
                  px: 2.35,
                  py: 0.8,
                  minHeight: 48,
                  fontSize: '1rem',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 12px 30px rgba(15,23,42,0.18)',
                  '& .MuiButton-startIcon': {
                    marginRight: '10px',
                  },
                }}
              >
                My FigDex
              </Button>
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
                    <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Admin Panel</ListItemText>
                  </MenuItem>
                )}
                <MenuItem onClick={() => { router.push('/gallery'); handleUserMenuClose(); }}>
                  <ListItemIcon><SearchIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>My FigDex</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { router.push('/index-management'); handleUserMenuClose(); }}>
                  <ListItemIcon><StorageIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Index Management</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { router.push('/account'); handleUserMenuClose(); }}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Account Settings</ListItemText>
                </MenuItem>
                <MenuItem
                  disabled
                  sx={{
                    opacity: 1,
                    '&.Mui-disabled': {
                      opacity: 1,
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: '#98A2B3' }}>
                    <ApiIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Figma API Integration"
                    primaryTypographyProps={{ sx: { color: '#667085' } }}
                  />
                  <Chip
                    label="Soon"
                    size="small"
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      bgcolor: 'rgba(59,130,246,0.1)',
                      color: '#2563eb',
                    }}
                  />
                </MenuItem>
                <MenuItem onClick={handleCopyApiKey}>
                  <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>{copied ? 'API Key Copied!' : 'Copy API Key'}</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        <Box
          sx={{
            pt: 2.25,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em', fontWeight: 700 }}>
              Workspace
            </Typography>
            <Typography variant="h4" sx={{ color: '#111827', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em' }}>
              {title}
            </Typography>
          </Box>
        </Box>
      </Container>

      <Container maxWidth={contentMaxWidth} sx={{ pb: 12, ...contentSx }}>
        {children}
      </Container>
    </Box>
  );
}
