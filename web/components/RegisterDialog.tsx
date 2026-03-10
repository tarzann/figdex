import React, { useState, useEffect } from 'react';
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
import { Google as GoogleIcon, Email as EmailIcon, Close as CloseIcon } from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import { getOAuthRedirectUrl } from '../lib/env';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface RegisterDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onRegisterSuccess?: () => void;
}

export default function RegisterDialog({ open, onClose, onSwitchToLogin, onRegisterSuccess }: RegisterDialogProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setError('');
      setShowEmailForm(false);
    }
  }, [open]);

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

      // Create user profile via API
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
          setError('This email is already registered with Google. Please sign in with Google instead.');
        } else if (result.code === 'ACCOUNT_EXISTS_EMAIL' || result.code === 'ACCOUNT_EXISTS') {
          setError('An account with this email already exists. Please sign in instead.');
          setTimeout(() => {
            onClose();
            onSwitchToLogin();
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

      onClose();
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
      router.push('/gallery');

    } catch (e: any) {
      console.error('Email sign up error:', e);
      setError(e?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Join FigDex
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          Create your account and start organizing your Figma designs
        </Typography>

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
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignUp}
              disabled={loading}
              sx={{
                py: 1.5,
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
              <Typography variant="body2" sx={{ color: '#666', px: 2 }}>
                OR
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<EmailIcon />}
              onClick={() => setShowEmailForm(true)}
              disabled={loading}
              sx={{
                py: 1.5,
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
          </Box>
        ) : (
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleEmailSignUp(); }}>
            <TextField
              fullWidth
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              autoComplete="name"
              sx={{ mb: 2 }}
              autoFocus
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              sx={{ mb: 2 }}
              required
              helperText="Must be at least 8 characters"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              sx={{ mb: 2 }}
              required
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleEmailSignUp();
                }
              }}
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleEmailSignUp}
              disabled={loading}
              sx={{ mb: 1, py: 1.5 }}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => {
                setShowEmailForm(false);
                setError('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setFullName('');
              }}
              disabled={loading}
            >
              Back
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: '#666' }}>
          Already have an account?{' '}
          <Button
            variant="text"
            size="small"
            onClick={onSwitchToLogin}
            sx={{ textTransform: 'none', minWidth: 'auto', p: 0 }}
          >
            Sign in
          </Button>
        </Typography>
      </DialogActions>
    </Dialog>
  );
}

