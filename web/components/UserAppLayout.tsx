import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Avatar,
  Box,
  Button,
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
  FolderOpen as FolderOpenIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  PUBLIC_SITE_BACKGROUND_SX,
  PUBLIC_SITE_PRIMARY_BUTTON_SX,
  PUBLIC_SITE_SURFACE_SX,
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
      <Container maxWidth="lg" sx={{ pt: 4, pb: 2 }}>
        <Box
          sx={{
            ...PUBLIC_SITE_SURFACE_SX,
            px: { xs: 2, sm: 2.5 },
            py: 1.75,
            borderRadius: 999,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
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
            <Box>
              <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em', fontWeight: 700 }}>
                FigDex
              </Typography>
              <Typography variant="h6" sx={{ color: '#111827', fontWeight: 800, lineHeight: 1.1 }}>
                {title}
              </Typography>
            </Box>
          </Stack>

          {isLoggedIn && (
            <>
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{
                  ...PUBLIC_SITE_PRIMARY_BUTTON_SX,
                  width: 46,
                  height: 46,
                  boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
                }}
              >
                <Avatar sx={{ bgcolor: 'transparent', color: '#fff', width: 32, height: 32 }}>
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
                <MenuItem onClick={() => { router.push('/projects-management'); handleUserMenuClose(); }}>
                  <ListItemIcon><FolderOpenIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Projects Management</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { router.push('/account'); handleUserMenuClose(); }}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Account Settings</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { router.push('/api-index'); handleUserMenuClose(); }}>
                  <ListItemIcon><ApiIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Figma API Integration</ListItemText>
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
      </Container>

      <Container maxWidth={contentMaxWidth} sx={{ pb: 12, ...contentSx }}>
        {children}
      </Container>
    </Box>
  );
}
