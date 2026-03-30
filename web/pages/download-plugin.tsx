import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Avatar, Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { FIGDEX_PLUGIN_DOWNLOAD_PATH, FIGDEX_PLUGIN_VERSION } from '../lib/plugin-release';

export default function DownloadPluginPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('figma_web_user');
    setIsLoggedIn(Boolean(userData));
  }, []);

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
        <Container maxWidth="lg">
          <Box
            sx={{
              pb: { xs: 4, md: 5 },
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
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                Plugin download
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="text"
                sx={{
                  color: '#1a1a1a',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': { bgcolor: '#eef2ff' },
                }}
                onClick={() => router.push('/pricing')}
              >
                Pricing
              </Button>
              <Button
                variant="text"
                sx={{
                  color: '#1a1a1a',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': { bgcolor: '#eef2ff' },
                }}
                onClick={() => router.push('/download-plugin')}
              >
                Plugin
              </Button>
              {isLoggedIn ? (
                <Button
                  variant="contained"
                  startIcon={
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)', width: 22, height: 22 }}>
                      <AccountCircleIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                  }
                  sx={{
                    bgcolor: '#111827',
                    color: '#fff',
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2.25,
                    '&:hover': { bgcolor: '#1f2937' },
                  }}
                  onClick={() => router.push('/gallery')}
                >
                  My FigDex
                </Button>
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
                    onClick={() => router.push('/login')}
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
                    onClick={() => router.push('/register')}
                  >
                    Start Free
                  </Button>
                </>
              )}
            </Stack>
          </Box>

          <Stack spacing={4} sx={{ maxWidth: 960, mx: 'auto', pb: { xs: 3, md: 6 } }}>
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                icon={<ExtensionOutlinedIcon />}
                label={`Public plugin download • ${FIGDEX_PLUGIN_VERSION}`}
                sx={{ mb: 2, bgcolor: '#eef4ff', color: '#1d4ed8', fontWeight: 700 }}
              />
              <Typography variant="h2" sx={{ fontWeight: 800, color: '#111827', fontSize: { xs: '2.2rem', md: '3.4rem' }, mb: 2 }}>
                Download the FigDex Figma plugin
              </Typography>
              <Typography variant="h6" sx={{ color: '#4b5563', fontWeight: 400, maxWidth: 760, mx: 'auto', lineHeight: 1.6 }}>
                No signup is required to download the plugin package. Install it in Figma, then connect it to your FigDex account or start with the guest flow.
              </Typography>
            </Box>

            <Card sx={{ borderRadius: 5, border: '1px solid #dbe3f0', boxShadow: '0 20px 60px rgba(15,23,42,0.08)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mb: 0.5 }}>
                        FigDex Plugin Package
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#6b7280' }}>
                        Includes `manifest.json`, runtime files, and the latest plugin UI bundle.
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
                      ['1', 'Download the zip', 'Save the plugin package locally and extract it to a folder you can keep synced.'],
                      ['2', 'Import from manifest', 'In Figma open Plugins → Development → Import plugin from manifest and choose `manifest.json`.'],
                      ['3', 'Connect and index', 'Open the plugin, connect your account or continue as guest, then create your first index.'],
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
