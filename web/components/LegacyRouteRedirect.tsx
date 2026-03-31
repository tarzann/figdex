import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';

type LegacyRouteRedirectProps = {
  to: string;
  label: string;
};

export default function LegacyRouteRedirect({ to, label }: LegacyRouteRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 3,
      }}
    >
      <CircularProgress size={28} />
      <Typography variant="body2" sx={{ color: '#667085' }}>
        Redirecting from {label}...
      </Typography>
    </Box>
  );
}
