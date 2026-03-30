import { useEffect, useState } from 'react';
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
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import PersonIcon from '@mui/icons-material/Person';
import ApiIcon from '@mui/icons-material/Api';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

type PublicSiteHeaderProps = {
  activeNav?: 'pricing' | 'plugin' | null;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userMenuAnchor?: HTMLElement | null;
  onUserMenuOpen?: (event: React.MouseEvent<HTMLElement>) => void;
  onUserMenuClose?: () => void;
  onLogout?: () => void;
  onCopyApiKey?: () => void;
  copied?: boolean;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
};

export default function PublicSiteHeader({
  activeNav = null,
  isLoggedIn: isLoggedInProp,
  isAdmin = false,
  userMenuAnchor = null,
  onUserMenuOpen,
  onUserMenuClose,
  onLogout,
  onCopyApiKey,
  copied = false,
  onLoginClick,
  onRegisterClick,
}: PublicSiteHeaderProps) {
  const router = useRouter();
  const [derivedLoggedIn, setDerivedLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof isLoggedInProp === 'boolean') return;
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('figma_web_user');
    setDerivedLoggedIn(Boolean(userData));
  }, [isLoggedInProp]);

  const isLoggedIn = typeof isLoggedInProp === 'boolean' ? isLoggedInProp : derivedLoggedIn;

  const navButtonSx = (active: boolean) => ({
    color: '#1a1a1a',
    fontWeight: active ? 700 : 500,
    textTransform: 'none',
    fontSize: '0.95rem',
    borderRadius: 999,
    px: 1.75,
    bgcolor: active ? 'rgba(17,24,39,0.06)' : 'transparent',
    '&:hover': {
      bgcolor: 'rgba(17,24,39,0.06)',
    },
  });

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          py: 3.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box sx={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              letterSpacing: 1.5,
              color: '#1a1a1a',
              fontSize: '1.25rem',
            }}
          >
            FIGDEX
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="text"
            sx={navButtonSx(activeNav === 'pricing')}
            onClick={() => router.push('/pricing')}
          >
            Pricing
          </Button>
          <Button
            variant="text"
            sx={navButtonSx(activeNav === 'plugin')}
            onClick={() => router.push('/download-plugin')}
          >
            Plugin
          </Button>

          {isLoggedIn ? (
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
                sx={{
                  bgcolor: '#111827',
                  color: '#fff',
                  textTransform: 'none',
                  borderRadius: 999,
                  px: 2.35,
                  py: 0.8,
                  minHeight: 48,
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 12px 30px rgba(15,23,42,0.18)',
                  '& .MuiButton-startIcon': {
                    marginRight: '10px',
                  },
                  '&:hover': { bgcolor: '#1f2937' },
                }}
                onClick={() => router.push('/gallery')}
              >
                My FigDex
              </Button>
              {onUserMenuOpen ? (
                <>
                  <IconButton
                    onClick={onUserMenuOpen}
                    sx={{
                      bgcolor: 'transparent',
                      '&:hover': { bgcolor: '#f5f5f5' },
                    }}
                  >
                    <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32 }}>
                      <AccountCircleIcon />
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={onUserMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    sx={{ mt: 1 }}
                  >
                    {isAdmin ? (
                      <MenuItem onClick={() => { router.push('/admin'); onUserMenuClose?.(); }}>
                        <ListItemIcon>
                          <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Admin Panel</ListItemText>
                      </MenuItem>
                    ) : null}
                    <MenuItem onClick={() => { router.push('/gallery'); onUserMenuClose?.(); }}>
                      <ListItemIcon>
                        <SearchIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>My FigDex</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => { router.push('/index-management'); onUserMenuClose?.(); }}>
                      <ListItemIcon>
                        <StorageIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Index Management</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => { router.push('/projects-management'); onUserMenuClose?.(); }}>
                      <ListItemIcon>
                        <FolderOpenIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Projects Management</ListItemText>
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={() => { router.push('/account'); onUserMenuClose?.(); }}>
                      <ListItemIcon>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Account Settings</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => { router.push('/api-index'); onUserMenuClose?.(); }}>
                      <ListItemIcon>
                        <ApiIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Figma API Integration</ListItemText>
                    </MenuItem>
                    {onCopyApiKey ? (
                      <MenuItem onClick={() => { onCopyApiKey(); onUserMenuClose?.(); }}>
                        <ListItemIcon>
                          <ContentCopyIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{copied ? 'API Key Copied!' : 'Copy API Key'}</ListItemText>
                      </MenuItem>
                    ) : null}
                    {onLogout ? (
                      <>
                        <Divider />
                        <MenuItem onClick={onLogout}>
                          <ListItemIcon>
                            <LogoutIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText>Logout</ListItemText>
                        </MenuItem>
                      </>
                    ) : null}
                  </Menu>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Button
                variant="text"
                sx={{
                  color: '#1a1a1a',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': { bgcolor: '#eef2ff' },
                }}
                onClick={() => {
                  if (onLoginClick) {
                    onLoginClick();
                    return;
                  }
                  router.push('/login');
                }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#111827',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 999,
                  px: 2.5,
                  '&:hover': { bgcolor: '#1f2937' },
                }}
                onClick={() => {
                  if (onRegisterClick) {
                    onRegisterClick();
                    return;
                  }
                  router.push('/register');
                }}
              >
                Start Free
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
