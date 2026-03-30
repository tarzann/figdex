import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import PublicSiteHeader from './PublicSiteHeader';
import PublicSiteFooter from './PublicSiteFooter';
import { PUBLIC_SITE_BACKGROUND_SX } from '../lib/public-site-styles';

type PublicSiteLayoutProps = {
  children: ReactNode;
  activeNav?: 'pricing' | 'plugin' | null;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
};

export default function PublicSiteLayout({
  children,
  activeNav = null,
  isLoggedIn,
  onLoginClick,
  onRegisterClick,
}: PublicSiteLayoutProps) {
  return (
    <Box sx={PUBLIC_SITE_BACKGROUND_SX}>
      <PublicSiteHeader
        activeNav={activeNav}
        isLoggedIn={isLoggedIn}
        onLoginClick={onLoginClick}
        onRegisterClick={onRegisterClick}
      />
      {children}
      <PublicSiteFooter />
    </Box>
  );
}
