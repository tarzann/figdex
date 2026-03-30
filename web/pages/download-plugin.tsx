import Head from 'next/head';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PublicSiteHeader from '../components/PublicSiteHeader';
import { FIGDEX_PLUGIN_DOWNLOAD_PATH, FIGDEX_PLUGIN_VERSION } from '../lib/plugin-release';
import {
  FIGDEX_CATEGORY_STATEMENT,
  FIGDEX_PLUGIN_WEB_RELATIONSHIP
} from '../lib/marketing-messaging';

export default function DownloadPluginPage() {
  return (
    <>
      <Head>
        <title>Download FigDex Plugin</title>
      </Head>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#f7f8fc',
          backgroundImage:
            'radial-gradient(circle at top left, rgba(17,24,39,0.08), transparent 30%), radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 34%)',
          py: { xs: 3.5, md: 4 },
        }}
      >
        <PublicSiteHeader activeNav="plugin" />
        <Container maxWidth="lg">

          <Stack spacing={4} sx={{ maxWidth: 960, mx: 'auto', pb: { xs: 3, md: 6 } }}>
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                icon={<ExtensionOutlinedIcon />}
                label={`Public plugin download • ${FIGDEX_PLUGIN_VERSION}`}
                sx={{ mb: 2, bgcolor: '#eef4ff', color: '#1d4ed8', fontWeight: 700 }}
              />
              <Typography variant="h2" sx={{ fontWeight: 800, color: '#111827', fontSize: { xs: '2.2rem', md: '3.4rem' }, mb: 2 }}>
                Install the FigDex plugin and create your first searchable design library
              </Typography>
              <Typography variant="h6" sx={{ color: '#4b5563', fontWeight: 400, maxWidth: 760, mx: 'auto', lineHeight: 1.6 }}>
                {FIGDEX_CATEGORY_STATEMENT} Download the plugin without signing up, install it in Figma, then connect your account or continue as guest.
              </Typography>
              <Typography variant="body1" sx={{ color: '#667085', maxWidth: 760, mx: 'auto', lineHeight: 1.7, mt: 2 }}>
                {FIGDEX_PLUGIN_WEB_RELATIONSHIP}
              </Typography>
            </Box>

            <Card sx={{ borderRadius: 5, border: '1px solid #dbe3f0', boxShadow: '0 20px 60px rgba(15,23,42,0.08)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mb: 0.5 }}>
                        Start in Figma. Continue in FigDex Web.
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#6b7280' }}>
                        The plugin captures and updates designs from Figma. FigDex Web gives you the searchable, review-ready library your team will use.
                      </Typography>
                    </Box>
                    <Button
                      component="a"
                      href={FIGDEX_PLUGIN_DOWNLOAD_PATH}
                      variant="contained"
                      size="large"
                      startIcon={<DownloadRoundedIcon />}
                      sx={{
                        bgcolor: '#111827',
                        borderRadius: 999,
                        px: 3.5,
                        py: 1.3,
                        textTransform: 'none',
                        fontWeight: 700,
                        '&:hover': { bgcolor: '#1f2937' },
                      }}
                    >
                      Download ZIP
                    </Button>
                  </Stack>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    {[
                      ['1', 'Download and install', 'Save the plugin package locally, extract it, and import it into Figma from `manifest.json`.'],
                      ['2', 'Connect or continue as guest', 'Open the plugin and choose whether to connect your FigDex account or start with the guest flow.'],
                      ['3', 'Create your first index', 'Link a Figma file, index the pages you want, and open the result in FigDex Web.'],
                    ].map(([step, title, text]) => (
                      <Box key={step} sx={{ p: 2.5, borderRadius: 4, bgcolor: '#fff', border: '1px solid #e5e7eb' }}>
                        <Chip label={step} size="small" sx={{ mb: 1.5, bgcolor: '#111827', color: '#fff', fontWeight: 700 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                          {title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.6 }}>
                          {text}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      Current public plugin package: <strong>{FIGDEX_PLUGIN_VERSION}</strong>
                    </Typography>
                    <Button
                      component={Link}
                      href="/register"
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Create a free account
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
