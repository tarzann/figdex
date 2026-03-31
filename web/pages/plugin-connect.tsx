import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import PublicSiteLayout from '../components/PublicSiteLayout';
import { PUBLIC_SITE_PRIMARY_BUTTON_SX, PUBLIC_SITE_SECONDARY_BUTTON_SX, PUBLIC_SITE_SURFACE_SX } from '../lib/public-site-styles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function PluginConnect() {
  const router = useRouter();
  const { nonce, docId, claimToken, mode, anonId: anonIdQuery } = router.query;
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'connecting' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const claimTokenStr = typeof claimToken === 'string' ? claimToken.trim() : '';
    const nonceStr = typeof nonce === 'string' ? nonce : '';
    const modeStr = typeof mode === 'string' ? mode : '';
    const anonIdStr = typeof anonIdQuery === 'string' ? anonIdQuery.trim() : '';

    const run = async () => {
      try {
        const buildReturnUrl = () => `/plugin-connect${claimTokenStr ? `?claimToken=${encodeURIComponent(claimTokenStr)}` : `?nonce=${encodeURIComponent(nonceStr)}`}${claimTokenStr && nonceStr ? `&nonce=${encodeURIComponent(nonceStr)}` : ''}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;

        if (modeStr === 'upgrade' && anonIdStr && !claimTokenStr) {
          setStatus('redirecting');
          try {
            const startRes = await fetch('/api/claim/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ anonId: anonIdStr, source: 'plugin_connect' }),
            });
            const startData = await startRes.json().catch(() => ({}));
            if (startRes.ok && startData.claimToken) {
              const returnUrl = `/plugin-connect?claimToken=${encodeURIComponent(startData.claimToken)}&nonce=${encodeURIComponent(nonceStr)}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;
              window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
              return;
            }
          } catch (_) {}
          const returnUrl = `/plugin-connect?nonce=${encodeURIComponent(nonceStr)}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;
          window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
          return;
        }

        let apiKey: string | null = null;
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('figma_web_user');
            if (raw) {
              const data = JSON.parse(raw);
              const key = data?.api_key || null;
              if (key && String(key).trim().startsWith('figdex_')) apiKey = String(key).trim();
            }
          } catch (_) {}
        }

        if (claimTokenStr && apiKey) {
          setStatus('connecting');
          try {
            const claimRes = await fetch('/api/claim/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ claimToken: claimTokenStr }),
            });
            const claimData = await claimRes.json().catch(() => ({}));
            if (claimRes.ok && claimData.ok && nonceStr) {
              const connectRes = await fetch('/api/plugin-connect/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({ nonce: nonceStr }),
              });
              if (connectRes.ok) {
                setStatus('success');
                setMessage('Connected! You can close this window and return to Figma.');
                return;
              }
            }
          } catch (_) {}
        }
        if (claimTokenStr && !apiKey) {
          setStatus('redirecting');
          const returnUrl = `/plugin-connect?claimToken=${encodeURIComponent(claimTokenStr)}${nonceStr ? `&nonce=${encodeURIComponent(nonceStr)}` : ''}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;
          window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
          return;
        }

        if (!nonceStr) {
          setStatus('error');
          setMessage('Missing nonce. Open this page from the FigDex plugin.');
          return;
        }

        if (!apiKey) {
          setStatus('redirecting');
          const returnUrl = buildReturnUrl();
          window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
          return;
        }

        setStatus('connecting');
        await new Promise((r) => setTimeout(r, 400));
        const res = await fetch('/api/plugin-connect/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ nonce: nonceStr }),
        });
        if (res.ok) {
          setStatus('success');
          setMessage('Connected! You can close this window and return to Figma.');
          return;
        }
        const err = await res.json().catch(() => ({}));
        if (res.status === 401 || /invalid api key/i.test(String(err?.error || ''))) {
          if (typeof window !== 'undefined') {
            try { localStorage.removeItem('figma_web_user'); } catch (_) {}
          }
          setStatus('redirecting');
          window.location.href = `/login?returnUrl=${encodeURIComponent(buildReturnUrl())}`;
          return;
        }
        throw new Error(err?.error || 'Failed to connect');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Something went wrong.');
      }
    };

    run();
  }, [router.isReady, nonce, docId, claimToken, mode, anonIdQuery]);

  return (
    <>
      <Head>
        <title>FigDex – Connect plugin</title>
      </Head>
      <PublicSiteLayout>
        <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
          <Card sx={{ ...PUBLIC_SITE_SURFACE_SX, borderRadius: 5 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
              <Chip
                label="Plugin connection"
                sx={{ mb: 2, bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
              />
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mb: 1.5 }}>
                Connect your plugin and return to Figma
              </Typography>
              <Typography variant="body1" sx={{ color: '#667085', lineHeight: 1.7, mb: 3 }}>
                We&apos;re verifying your session so the plugin can keep indexing into your FigDex library without asking you to sign in again.
              </Typography>

              {status === 'checking' ? <Typography>Checking your session...</Typography> : null}
              {status === 'redirecting' ? <Typography>Redirecting you to sign in...</Typography> : null}
              {status === 'connecting' ? <Typography>Connecting your account...</Typography> : null}
              {status === 'success' ? (
                <Box>
                  <Alert severity="success" sx={{ textAlign: 'left', mb: 2 }}>
                    {message}
                  </Alert>
                  <Stack spacing={1.5} alignItems="center">
                    <Typography variant="body2" sx={{ color: '#667085', maxWidth: 420 }}>
                      Your account is now connected. Go back to the plugin to finish your first index, or open your library in the web app.
                    </Typography>
                    <Button
                      component={Link}
                      href="/gallery"
                      variant="contained"
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{ ...PUBLIC_SITE_PRIMARY_BUTTON_SX, px: 2.5 }}
                    >
                      Open My FigDex
                    </Button>
                  </Stack>
                </Box>
              ) : null}
              {status === 'error' ? (
                <Stack spacing={2}>
                  <Alert severity="error" sx={{ textAlign: 'left' }}>
                    {message}
                  </Alert>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                    <Button
                      component={Link}
                      href="/download-plugin"
                      variant="outlined"
                      startIcon={<ExtensionOutlinedIcon />}
                      sx={{ ...PUBLIC_SITE_SECONDARY_BUTTON_SX }}
                    >
                      Open setup guide
                    </Button>
                    <Button
                      component={Link}
                      href="/login"
                      variant="contained"
                      sx={{ ...PUBLIC_SITE_PRIMARY_BUTTON_SX }}
                    >
                      Sign in again
                    </Button>
                  </Stack>
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        </Container>
      </PublicSiteLayout>
    </>
  );
}
