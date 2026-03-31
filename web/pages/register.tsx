import Head from 'next/head';
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Google as GoogleIcon, Email as EmailIcon } from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import PublicSiteLayout from '../components/PublicSiteLayout';
import { getOAuthRedirectUrl } from '../lib/env';
import { PUBLIC_SITE_PRIMARY_BUTTON_SX, PUBLIC_SITE_SECONDARY_BUTTON_SX, PUBLIC_SITE_SURFACE_SX } from '../lib/public-site-styles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleGoogleSignUp = () => {
    try {
      setError('');
      setLoading(true);
      if (!supabase) throw new Error('Supabase configuration error. Please try again later.');
      supabase.auth
        .signInWithOAuth({
          provider: 'google',
          options: { redirectTo: getOAuthRedirectUrl() },
        })
        .catch((e) => {
          setError(e?.message || 'Failed to start Google sign up');
          setLoading(false);
        });
    } catch (e: any) {
      setError(e?.message || 'Failed to start Google sign up');
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      setError('');
      if (!email || !password || !fullName) {
        setError('Please fill in all required fields');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      setLoading(true);

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          email: email.trim().toLowerCase(),
          password,
          name: fullName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'ACCOUNT_EXISTS_GOOGLE') {
          setError('This email is already registered with Google. Please continue with Google or add a password with password reset.');
        } else if (result.code === 'ACCOUNT_EXISTS_EMAIL' || result.code === 'ACCOUNT_EXISTS') {
          setError('An account with this email already exists. Redirecting you to sign in.');
          setTimeout(() => {
            router.push('/login');
          }, 1600);
        } else {
          setError(result.error || 'Failed to create account');
        }
        return;
      }

      localStorage.setItem(
        'figma_web_user',
        JSON.stringify({
          email: email.trim().toLowerCase(),
          api_key: result.user?.api_key,
          full_name: fullName.trim(),
          plan: result.user?.plan || 'free',
        })
      );

      router.push('/gallery');
    } catch (e: any) {
      setError(e?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Start Free | FigDex</title>
      </Head>
      <PublicSiteLayout onLoginClick={() => router.push('/login')}>
        <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
          <Card sx={{ ...PUBLIC_SITE_SURFACE_SX, borderRadius: 5 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    label="Start free"
                    sx={{ mb: 2, bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>
                    Create your FigDex account
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#667085', lineHeight: 1.7 }}>
                    Create your account, connect the plugin, and turn your first large Figma file into a searchable library your team can use.
                  </Typography>
                </Box>

                {!showEmailForm ? (
                  <Stack spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<GoogleIcon />}
                      onClick={handleGoogleSignUp}
                      disabled={loading}
                      sx={{ ...PUBLIC_SITE_PRIMARY_BUTTON_SX, py: 1.35 }}
                    >
                      {loading ? 'Redirecting...' : 'Continue with Google'}
                    </Button>

                    <Divider>
                      <Typography variant="body2" color="text.secondary">
                        or
                      </Typography>
                    </Divider>

                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      startIcon={<EmailIcon />}
                      onClick={() => setShowEmailForm(true)}
                      disabled={loading}
                      sx={{ ...PUBLIC_SITE_SECONDARY_BUTTON_SX, py: 1.35 }}
                    >
                      Continue with email
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                      helperText="Use at least 8 characters."
                    />
                    <TextField
                      fullWidth
                      label="Confirm password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={handleEmailSignUp}
                      disabled={loading}
                      sx={{ ...PUBLIC_SITE_PRIMARY_BUTTON_SX, py: 1.35 }}
                    >
                      {loading ? 'Creating account...' : 'Create account'}
                    </Button>
                    <Button
                      variant="text"
                      fullWidth
                      onClick={() => {
                        setShowEmailForm(false);
                        setError('');
                        setEmail('');
                        setPassword('');
                        setConfirmPassword('');
                        setFullName('');
                      }}
                      disabled={loading}
                      sx={{ textTransform: 'none', color: '#667085' }}
                    >
                      Back to options
                    </Button>
                  </Stack>
                )}

                {error ? <Alert severity="error">{error}</Alert> : null}

                <Typography variant="body2" sx={{ textAlign: 'center', color: '#667085' }}>
                  Already have an account?{' '}
                  <Box component="span" sx={inlineLinkSx} onClick={() => router.push('/login')}>
                    Sign in
                  </Box>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </PublicSiteLayout>
    </>
  );
}

const inlineLinkSx = {
  color: '#3538cd',
  cursor: 'pointer',
  fontWeight: 700,
  '&:hover': { textDecoration: 'underline' },
};
