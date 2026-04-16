import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import { getOAuthRedirectUrl } from '../lib/env';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const REQUEST_TIMEOUT_MS = 7000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLoginSuccess?: () => void;
}

export default function LoginDialog({ open, onClose, onSwitchToRegister, onLoginSuccess }: LoginDialogProps) {
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

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setEmail('');
      setPassword('');
      setError('');
      setShowEmailForm(false);
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
      setForgotPasswordError('');
      setForgotPasswordSuccess(false);
    }
  }, [open]);

  const handleGoogleSignIn = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase configuration error. Please try again later.');
      }
      setError('');
      setIsLoading(true);
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl()
        }
      }).catch((e) => {
        setError(e?.message || 'Failed to start Google sign in');
        setIsLoading(false);
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to start Google sign in');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase configuration missing');
      }

      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      setIsLoading(true);
      setError('');

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to sign in');
      }

      const normalizedEmail = (authData.user.email || '').trim().toLowerCase();

      const response = await fetchWithTimeout('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'login', 
          email: normalizedEmail, 
          password: password,
          userId: authData.user.id,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get user profile');
      }

      const { user: ensured } = await response.json();
      const apiKey = ensured?.api_key;

      if (!apiKey) {
        throw new Error('API key not returned from server');
      }

      const userData = {
        id: ensured.id || authData.user.id,
        email: normalizedEmail,
        api_key: apiKey,
        full_name: ensured.name || authData.user.user_metadata?.full_name || null,
        plan: ensured.plan || 'free'
      };

      localStorage.setItem('figma_web_user', JSON.stringify(userData));

      onClose();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      router.push('/gallery');

    } catch (error: any) {
      console.error('Email sign-in error:', error);
      setError(error.message || 'Failed to sign in. Please check your credentials.');
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
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${baseUrl}/reset-password`
      });

      if (resetError) {
        console.error('Password reset error:', resetError);
      }

      setForgotPasswordSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setForgotPasswordSuccess(false);
      }, 3000);
    } catch (e: any) {
      console.error('Forgot password error:', e);
      setForgotPasswordSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setForgotPasswordSuccess(false);
      }, 3000);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <>
      <Dialog 
        open={open && !showForgotPassword} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Sign In to FigDex
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!showEmailForm ? (
            <Box>
              <Button
                fullWidth
                variant="contained"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                sx={{
                  mb: 2,
                  py: 1.5,
                  bgcolor: '#4285f4',
                  '&:hover': { bgcolor: '#357ae8' }
                }}
                startIcon={
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                }
              >
                Sign in with Google
              </Button>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" sx={{ color: '#666', px: 2 }}>
                  OR
                </Typography>
              </Divider>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
                sx={{ py: 1.5 }}
              >
                Sign in with Email
              </Button>
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                sx={{ mb: 2 }}
                autoFocus
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                sx={{ mb: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleEmailSignIn();
                  }
                }}
              />
              <Box sx={{ textAlign: 'right', mb: 2 }}>
                <Button
                  size="small"
                  onClick={() => setShowForgotPassword(true)}
                  sx={{ textTransform: 'none', fontSize: '0.875rem' }}
                >
                  Forgot password?
                </Button>
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={handleEmailSignIn}
                disabled={isLoading}
                sx={{ mb: 1, py: 1.5 }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setShowEmailForm(false);
                  setError('');
                  setEmail('');
                  setPassword('');
                }}
                disabled={isLoading}
              >
                Back
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Don&apos;t have an account?{' '}
            <Button
              variant="text"
              size="small"
              onClick={onSwitchToRegister}
              sx={{ textTransform: 'none', minWidth: 'auto', p: 0 }}
            >
              Sign up
            </Button>
          </Typography>
        </DialogActions>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={showForgotPassword} 
        onClose={() => {
          setShowForgotPassword(false);
          setForgotPasswordEmail('');
          setForgotPasswordError('');
          setForgotPasswordSuccess(false);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Reset Password
          </Typography>
          <IconButton 
            onClick={() => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
              setForgotPasswordError('');
              setForgotPasswordSuccess(false);
            }} 
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </Typography>

          {forgotPasswordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {forgotPasswordError}
            </Alert>
          )}

          {forgotPasswordSuccess ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              If an account with this email exists, you will receive a password reset link. Please check your email.
            </Alert>
          ) : (
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              disabled={forgotPasswordLoading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !forgotPasswordLoading) {
                  handleForgotPassword();
                }
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          {forgotPasswordSuccess ? (
            <Button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
                setForgotPasswordSuccess(false);
              }}
              variant="contained"
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                  setForgotPasswordError('');
                  setForgotPasswordSuccess(false);
                }}
                disabled={forgotPasswordLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleForgotPassword}
                disabled={forgotPasswordLoading}
                variant="contained"
              >
                {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
