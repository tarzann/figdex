import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Google as GoogleIcon, Email as EmailIcon } from '@mui/icons-material';
import PublicSiteLayout from '../components/PublicSiteLayout';
import { getOAuthRedirectUrl } from '../lib/env';
import { PUBLIC_SITE_PRIMARY_BUTTON_SX, PUBLIC_SITE_SECONDARY_BUTTON_SX, PUBLIC_SITE_SURFACE_SX } from '../lib/public-site-styles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const supabaseConfigured = Boolean(supabase);

  const handleOAuthSuccess = useCallback(
    async (accessToken: string) => {
      try {
        if (!supabase) throw new Error('Supabase configuration missing');

        setIsLoading(true);
        setError('');

        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
        if (userError || !user) {
          throw new Error('Failed to get user info');
        }

        const normalizedEmail = (user.email || '').trim().toLowerCase();
        if (!normalizedEmail) {
          throw new Error('OAuth user email missing');
        }

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email: normalizedEmail, password: 'oauth' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create user profile');
        }

        const { user: ensured } = await response.json();
        const apiKey = ensured?.api_key;
        if (!apiKey) throw new Error('API key not returned from server');

        localStorage.setItem(
          'figma_web_user',
          JSON.stringify({
            email: normalizedEmail,
            api_key: apiKey,
            full_name: ensured.name || user.user_metadata?.full_name || null,
            plan: ensured.plan || 'free',
          })
        );

        let target = '/gallery';
        if (typeof sessionStorage !== 'undefined') {
          const stored = sessionStorage.getItem('oauth_return_url');
          if (stored && stored.startsWith('/')) {
            target = stored;
            sessionStorage.removeItem('oauth_return_url');
          }
        }
        if (target === '/gallery' && typeof router.query.returnUrl === 'string' && router.query.returnUrl.startsWith('/')) {
          target = router.query.returnUrl;
        }
        router.push(target);
      } catch (err: any) {
        setError(err.message || 'Failed to process authentication');
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!supabaseConfigured) {
      setError('Supabase configuration error. Please check environment variables.');
      return;
    }

    const { access_token, refresh_token, error: oauthError } = router.query;

    if (oauthError) {
      setError('Authentication failed. Please try again.');
      return;
    }

    if (access_token && refresh_token) {
      handleOAuthSuccess(access_token as string);
    }
  }, [router.query, supabaseConfigured, handleOAuthSuccess]);

  const handleGoogleSignIn = async () => {
    try {
      if (!supabase) throw new Error('Supabase configuration missing');
      const returnUrl = typeof router.query.returnUrl === 'string' ? router.query.returnUrl : '';
      if (returnUrl && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('oauth_return_url', returnUrl);
      }
      setIsLoading(true);
      setError('');

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getOAuthRedirectUrl() },
      });

      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      if (!supabase) throw new Error('Supabase configuration missing');
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      setIsLoading(true);
      setError('');

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to sign in');

      const normalizedEmail = (authData.user.email || '').trim().toLowerCase();
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: normalizedEmail, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get user profile');
      }

      const { user: ensured } = await response.json();
      const apiKey = ensured?.api_key;
      if (!apiKey) throw new Error('API key not returned from server');

      localStorage.setItem(
        'figma_web_user',
        JSON.stringify({
          email: normalizedEmail,
          api_key: apiKey,
          full_name: ensured.name || authData.user.user_metadata?.full_name || null,
          plan: ensured.plan || 'free',
        })
      );

      const returnUrl = typeof router.query.returnUrl === 'string' ? router.query.returnUrl : '';
      const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/gallery';
      router.push(target);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);

    if (!forgotPasswordEmail) {
      setForgotPasswordError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setForgotPasswordError('Please enter a valid email address');
      return;
    }

    if (!supabase) {
      setForgotPasswordError('Configuration error. Please try again later.');
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const normalizedEmail = forgotPasswordEmail.trim().toLowerCase();
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.figdex.com';
      await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${baseUrl}/reset-password`,
      });
      setForgotPasswordSuccess(true);
    } catch {
      setForgotPasswordSuccess(true);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | FigDex</title>
      </Head>
      <PublicSiteLayout onRegisterClick={() => router.push('/register')}>
        <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
          <Card sx={{ ...PUBLIC_SITE_SURFACE_SX, borderRadius: 5 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label="Welcome back"
                    sx={{ mb: 2, bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>
                    Sign in to continue with FigDex
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#667085', lineHeight: 1.7 }}>
                    Open your library, reconnect the plugin, or finish setting up your first indexed Figma file.
                  </Typography>
                </Box>

                {error ? <Alert severity="error">{error}</Alert> : null}

                {!showEmailForm ? (
                  <Stack spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<GoogleIcon />}
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      sx={{ ...PUBLIC_SITE_PRIMARY_BUTTON_SX, py: 1.35 }}
                    >
                      {isLoading ? 'Redirecting...' : 'Continue with Google'}
                    </Button>

                    <Divider>
                      <Typography variant="body2" color="text.secondary">
                        or
                      </Typography>
                    </Divider>

                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<EmailIcon />}
                      onClick={() => setShowEmailForm(true)}
                      disabled={isLoading}
                      sx={{ ...PUBLIC_SITE_SECONDARY_BUTTON_SX, py: 1.35 }}
                    >
                      Continue with email
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoComplete="email"
                      fullWidth
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="current-password"
                      fullWidth
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoading) handleEmailSignIn();
                      }}
                    />
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleEmailSignIn}
                      disabled={isLoading}
                      sx={{ ...PUBLIC_SITE_PRIMARY_BUTTON_SX, py: 1.35 }}
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => setShowForgotPassword(true)}
                      sx={{ textTransform: 'none', fontWeight: 600, color: '#475467' }}
                    >
                      Forgot password?
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => {
                        setShowEmailForm(false);
                        setError('');
                        setEmail('');
                        setPassword('');
                      }}
                      disabled={isLoading}
                      sx={{ textTransform: 'none', color: '#667085' }}
                    >
                      Back to options
                    </Button>
                  </Stack>
                )}

                <Typography variant="body2" sx={{ color: '#667085', textAlign: 'center', lineHeight: 1.7 }}>
                  By signing in, you agree to our{' '}
                  <Box component="span" sx={inlineLinkSx} onClick={() => router.push('/terms')}>
                    Terms
                  </Box>{' '}
                  and{' '}
                  <Box component="span" sx={inlineLinkSx} onClick={() => router.push('/privacy')}>
                    Privacy Policy
                  </Box>
                  .
                </Typography>

                <Typography variant="body2" sx={{ textAlign: 'center', color: '#667085' }}>
                  Don&apos;t have an account?{' '}
                  <Box component="span" sx={inlineLinkSxStrong} onClick={() => router.push('/register')}>
                    Start free
                  </Box>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Container>

        <Dialog open={showForgotPassword} onClose={() => setShowForgotPassword(false)} fullWidth maxWidth="xs">
          <DialogTitle>Reset password</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#667085', mb: 2, mt: 0.5 }}>
              Enter your email address and we&apos;ll send you a password reset link if the account exists.
            </Typography>

            {forgotPasswordError ? <Alert severity="error" sx={{ mb: 2 }}>{forgotPasswordError}</Alert> : null}
            {forgotPasswordSuccess ? (
              <Alert severity="success">
                If an account with this email exists, you will receive a password reset link shortly.
              </Alert>
            ) : (
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                disabled={forgotPasswordLoading}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setShowForgotPassword(false)} sx={{ textTransform: 'none' }}>
              Close
            </Button>
            {!forgotPasswordSuccess ? (
              <Button
                onClick={handleForgotPassword}
                disabled={forgotPasswordLoading}
                variant="contained"
                sx={PUBLIC_SITE_PRIMARY_BUTTON_SX}
              >
                {forgotPasswordLoading ? 'Sending...' : 'Send reset link'}
              </Button>
            ) : null}
          </DialogActions>
        </Dialog>
      </PublicSiteLayout>
    </>
  );
}

const inlineLinkSx = {
  color: '#3538cd',
  cursor: 'pointer',
  '&:hover': { textDecoration: 'underline' },
};

const inlineLinkSxStrong = {
  ...inlineLinkSx,
  fontWeight: 700,
};
