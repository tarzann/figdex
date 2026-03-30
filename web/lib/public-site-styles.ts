import type { SxProps, Theme } from '@mui/material/styles';

export const PUBLIC_SITE_BACKGROUND_SX: SxProps<Theme> = {
  minHeight: '100vh',
  bgcolor: '#f5f7fb',
  backgroundImage:
    'radial-gradient(circle at top left, rgba(102,126,234,0.14), transparent 36%), radial-gradient(circle at top right, rgba(17,24,39,0.08), transparent 28%)',
};

export const PUBLIC_SITE_SURFACE_SX: SxProps<Theme> = {
  bgcolor: '#ffffff',
  border: '1px solid #dbe3f0',
  borderRadius: 4,
  boxShadow: '0 18px 50px rgba(15,23,42,0.08)',
};

export const PUBLIC_SITE_SECONDARY_BUTTON_SX: SxProps<Theme> = {
  color: '#111827',
  borderColor: '#cbd5e1',
  textTransform: 'none',
  borderRadius: 999,
  fontWeight: 600,
  '&:hover': {
    borderColor: '#111827',
    bgcolor: 'rgba(17,24,39,0.04)',
  },
};

export const PUBLIC_SITE_PRIMARY_BUTTON_SX: SxProps<Theme> = {
  bgcolor: '#111827',
  color: '#fff',
  textTransform: 'none',
  borderRadius: 999,
  fontWeight: 700,
  '&:hover': {
    bgcolor: '#1f2937',
  },
};
