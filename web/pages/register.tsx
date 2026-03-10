import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Link,
  TextField,
  Divider,
  Alert
} from '@mui/material';
import { Google as GoogleIcon, ArrowBack as BackIcon, Email as EmailIcon } from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import { getOAuthRedirectUrl } from '../lib/env';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const RegisterPage = () => {
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
      if (!supabase) {
        throw new Error('Supabase configuration error. Please try again later.');
      }
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl()
        }
      }).catch((e) => {
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
      
      // Validation
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

      // Create user profile via API (which will handle both Auth and users table)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          email: email.trim().toLowerCase(),
          password: password,
          name: fullName.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (result.code === 'ACCOUNT_EXISTS_GOOGLE') {
          setError('This email is already registered with Google. Please sign in with Google or use password reset to add a password.');
        } else if (result.code === 'ACCOUNT_EXISTS_EMAIL' || result.code === 'ACCOUNT_EXISTS') {
          setError('An account with this email already exists. Please sign in instead.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          setError(result.error || 'Failed to create user profile');
        }
        return;
      }

      // Save user data to localStorage
      const userData = {
        email: email.trim().toLowerCase(),
        api_key: result.user?.api_key,
        full_name: fullName.trim(),
        plan: result.user?.plan || 'free'
      };

      localStorage.setItem('figma_web_user', JSON.stringify(userData));

      // Redirect to gallery
      router.push('/gallery');

    } catch (e: any) {
      console.error('Email sign up error:', e);
      setError(e?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box sx={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', p: { xs: 3, md: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: '#111' }}>
              Join FigDex
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Create your account and start organizing your Figma designs
            </Typography>
          </Box>
          <Box sx={{ pt: 1 }}>
            {!showEmailForm ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  sx={{
                    py: 1.25,
                    fontSize: '1rem',
                    fontWeight: 600,
                    backgroundColor: '#4c5fd7',
                    mb: 2,
                    '&:hover': { backgroundColor: '#4255c9' }
                  }}
                >
                  {loading ? 'Redirecting…' : 'Sign up with Google'}
                </Button>
                
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    OR
                  </Typography>
                </Divider>

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<EmailIcon />}
                  onClick={() => setShowEmailForm(true)}
                  disabled={loading}
                  sx={{
                    py: 1.25,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderColor: '#4c5fd7',
                    color: '#4c5fd7',
                    '&:hover': { 
                      borderColor: '#4255c9',
                      backgroundColor: 'rgba(76, 95, 215, 0.04)'
                    }
                  }}
                >
                  Sign up with Email
                </Button>
              </>
            ) : (
              <Box component="form" onSubmit={(e) => { e.preventDefault(); handleEmailSignUp(); }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  helperText="Must be at least 8 characters"
                />
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    mt: 2,
                    py: 1.25,
                    fontSize: '1rem',
                    fontWeight: 600,
                    backgroundColor: '#4c5fd7',
                    '&:hover': { backgroundColor: '#4255c9' }
                  }}
                >
                  {loading ? 'Creating Account…' : 'Create Account'}
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
                  sx={{ mt: 1 }}
                >
                  Back to options
                </Button>
              </Box>
            )}

            {!!error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => router.push('/login')}
                  sx={{ 
                    color: '#4c5fd7', 
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterPage;