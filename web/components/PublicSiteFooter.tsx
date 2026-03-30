import Link from 'next/link';
import { Box, Container, Divider, Stack, Typography } from '@mui/material';

export default function PublicSiteFooter() {
  return (
    <Box sx={{ bgcolor: '#ffffff', mt: { xs: 8, md: 10 }, borderTop: '1px solid #e5e7eb' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) repeat(3, minmax(0, 0.6fr))' },
            gap: { xs: 4, md: 5 },
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#111827',
                mb: 1.5,
                letterSpacing: 1.5,
              }}
            >
              FIGDEX
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085', lineHeight: 1.75, maxWidth: 340 }}>
              Turn large Figma files into a browsable, searchable design library your team can review and share.
            </Typography>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em', fontWeight: 700 }}>
              Product
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Typography component={Link} href="/" variant="body2" sx={footerLinkSx}>
                Home
              </Typography>
              <Typography component={Link} href="/pricing" variant="body2" sx={footerLinkSx}>
                Pricing
              </Typography>
              <Typography component={Link} href="/download-plugin" variant="body2" sx={footerLinkSx}>
                Plugin
              </Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em', fontWeight: 700 }}>
              Support
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Typography component={Link} href="/help" variant="body2" sx={footerLinkSx}>
                Help Center
              </Typography>
              <Typography component={Link} href="/contact" variant="body2" sx={footerLinkSx}>
                Contact
              </Typography>
            </Stack>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em', fontWeight: 700 }}>
              Legal
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Typography component={Link} href="/terms" variant="body2" sx={footerLinkSx}>
                Terms
              </Typography>
              <Typography component={Link} href="/privacy" variant="body2" sx={footerLinkSx}>
                Privacy
              </Typography>
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ my: 4, borderColor: '#e5e7eb' }} />

        <Typography variant="body2" sx={{ color: '#98a2b3', textAlign: 'center' }}>
          © 2026 FigDex. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

const footerLinkSx = {
  color: '#111827',
  textDecoration: 'none',
  fontWeight: 500,
  '&:hover': {
    color: '#3538cd',
  },
};
