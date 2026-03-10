import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!supabase) {
      setError('Configuration error. Please try again later.');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.figdex.com';
      
      // Use Supabase client-side resetPasswordForEmail to send reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${baseUrl}/reset-password`
      });

      if (resetError) {
        // Don't reveal if email exists (security best practice)
        // Supabase will return error even if email doesn't exist, so we always show success
        console.error('Password reset error:', resetError);
      }

      // Always show success message (security best practice - don't reveal if email exists)
      setSuccess(true);
    } catch (e: any) {
      console.error('Forgot password error:', e);
      // Still show success to user (security best practice)
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', p: { xs: 3, md: 4 } }}>
          <Box sx={{ mb: 3 }}>
            <Button
              startIcon={<BackIcon />}
              onClick={() => router.push('/login')}
              sx={{ mb: 2, color: '#666' }}
            >
              Back to Login
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#111' }}>
              Reset Password
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                If an account with this email exists, you will receive a password reset link.
                Please check your email and click the link to reset your password.
              </Alert>
              <Button
                fullWidth
                variant="contained"
                onClick={() => router.push('/login')}
                sx={{ mt: 2 }}
              >
                Back to Login
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                autoFocus
                sx={{ mb: 3 }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ mb: 2, py: 1.5 }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link
              component="button"
              type="button"
              onClick={() => router.push('/login')}
              sx={{ color: '#4c5fd7', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Remember your password? Sign in
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

