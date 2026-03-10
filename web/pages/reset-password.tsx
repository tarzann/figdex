import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import { ArrowBack as BackIcon, Visibility, VisibilityOff } from '@mui/icons-material';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    // Extract token from URL hash (Supabase sends it in the hash)
    if (typeof window !== 'undefined') {
      // Check if token is in query params (for direct link access)
      let extractedToken: string | null = null;
      
      if (token && typeof token === 'string') {
        extractedToken = token;
      } else {
        // Try to extract from URL hash (Supabase password reset links use hash)
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const type = params.get('type');
          
          if (accessToken && type === 'recovery') {
            extractedToken = accessToken;
          }
        }
      }
      
      if (extractedToken) {
        setResetToken(extractedToken);
        setTokenValid(true);
      } else {
        setTokenValid(false);
        setError('Invalid or missing reset token. Please request a new password reset link.');
      }
    }
  }, [router.isReady, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please enter both password fields');
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

    // Use the token we extracted in useEffect
    if (!resetToken) {
      setError('Invalid reset token. Please request a new password reset link.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password,
          token: resetToken
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (e: any) {
      console.error('Reset password error:', e);
      setError(e.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', py: 6 }}>
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', p: { xs: 3, md: 4 } }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              Invalid or missing reset token. Please request a new password reset link.
            </Alert>
            <Button
              fullWidth
              variant="contained"
              onClick={() => router.push('/forgot-password')}
            >
              Request New Reset Link
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

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
              Reset Your Password
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Enter your new password below.
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
                Password has been reset successfully! Redirecting to login page...
              </Alert>
              <Button
                fullWidth
                variant="contained"
                onClick={() => router.push('/login')}
                sx={{ mt: 2 }}
              >
                Go to Login
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                autoFocus
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Must be at least 8 characters long"
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                sx={{ mb: 3 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSubmit(e as any);
                  }
                }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ mb: 2, py: 1.5 }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
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
              Back to Login
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

