import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Box, CircularProgress, Typography, Container, Paper } from '@mui/material';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if we have the required env vars (will be set at runtime)
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting...');

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      setMessage('Supabase configuration error. Please check environment variables.');
      return;
    }

    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Auth callback started');
        
        const { data, error } = await supabase.auth.getSession();
        console.log('📋 Session data:', data);
        console.log('❌ Session error:', error);
        
        if (error) {
          throw error;
        }

        if (data.session?.user) {
          const user = data.session.user;
          console.log('👤 User found:', user);
          console.log('🔑 Access token:', data.session.access_token);
          console.log('🔄 Refresh token:', data.session.refresh_token);
          
          // Store user info in localStorage
          const userData = {
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            provider: user.app_metadata?.provider || 'oauth',
            providerId: user.id,
            api_key: null // Will be filled by login.tsx
          };
          
          localStorage.setItem('figma_web_user', JSON.stringify(userData));
          console.log('💾 User data stored in localStorage');
          
          setStatus('success');
          setMessage('Login successful! Redirecting to API Key generation...');
          
          // Redirect to login with tokens for API key generation
          setTimeout(() => {
            const accessToken = data.session.access_token;
            const refreshToken = data.session.refresh_token;
            let redirectUrl = `/login?access_token=${accessToken}&refresh_token=${refreshToken}`;
            const storedReturn = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('oauth_return_url') : null;
            if (storedReturn && storedReturn.startsWith('/')) {
              redirectUrl += '&returnUrl=' + encodeURIComponent(storedReturn);
            }
            console.log('🔄 Redirecting to:', redirectUrl);
            router.push(redirectUrl);
          }, 2000);
          
        } else {
          throw new Error('No session found');
        }
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Login error. Please try again.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        minHeight: '100vh',
        justifyContent: 'center'
      }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {message}
              </Typography>
            </>
          )}
          
          {status === 'success' && (
            <>
              <Typography variant="h6" color="success.main" gutterBottom>
                ✅ {message}
              </Typography>
            </>
          )}
          
          {status === 'error' && (
            <>
              <Typography variant="h6" color="error.main" gutterBottom>
                ❌ {message}
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
