import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { getOAuthRedirectUrl } from '../lib/env';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if we have the required env vars (will be set at runtime)
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    async (accessToken: string, refreshToken: string) => {
      try {
        if (!supabase) {
          throw new Error('Supabase configuration missing');
        }

        console.log('🚀 handleOAuthSuccess called with tokens');
        setIsLoading(true);
        setError('');

        // Get user info from Supabase
        console.log('🔍 Getting user info from Supabase...');
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
        console.log('👤 User from Supabase:', user);
        console.log('❌ User error:', userError);

        if (userError || !user) {
          throw new Error('Failed to get user info');
        }

        const normalizedEmail = (user.email || '').trim().toLowerCase();
        if (!normalizedEmail) {
          throw new Error('OAuth user email missing');
        }

        // Ensure user profile exists + API key via internal auth endpoint (server uses service role)
        console.log('🔑 Ensuring user profile & API key...');
        console.log('🔑 [login] calling /api/auth/signup login action...', { email: normalizedEmail });
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', email: normalizedEmail, password: 'oauth' })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ [login] signup endpoint returned error', errorData);
          throw new Error(errorData.error || 'Failed to create user profile');
        }

        const { user: ensured } = await response.json();
        console.log('✅ [login] signup endpoint success', ensured);
        const apiKey = ensured?.api_key;

        if (!apiKey) {
          throw new Error('API key not returned from server');
        }

        console.log('✅ API key received from server, saving to localStorage');

        // Always save to localStorage - this is critical!
        const userData = {
          email: normalizedEmail,
          api_key: apiKey,
          full_name: ensured.name || user.user_metadata?.full_name || null,
          plan: ensured.plan || 'free'
        };

        try {
          localStorage.setItem('figma_web_user', JSON.stringify(userData));
          console.log('✅ Saved to localStorage:', { email: userData.email, api_key: apiKey.substring(0, 12) + '...', plan: userData.plan });
        } catch (e) {
          console.error('❌ Error saving to localStorage:', e);
          throw new Error('Failed to save user data to localStorage');
        }

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
        console.log('➡️ [login] redirecting to', target);
        router.push(target);

      } catch (error: any) {
        console.error('OAuth success handling error:', error);
        setError(error.message || 'Failed to process authentication');
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
    console.log('🔍 Login page loaded');
    console.log('📋 Router query:', router.query);
    
    // Check if we have an OAuth callback
    const { access_token, refresh_token, error: oauthError } = router.query;

    if (oauthError) {
      console.log('❌ OAuth error:', oauthError);
      setError('Authentication failed. Please try again.');
      return;
    }

    if (access_token && refresh_token) {
      console.log('✅ OAuth tokens found, calling handleOAuthSuccess');
      console.log('🔑 Access token:', access_token);
      console.log('🔄 Refresh token:', refresh_token);
      handleOAuthSuccess(access_token as string, refresh_token as string);
    } else {
      console.log('ℹ️ No OAuth tokens found in URL');
    }
  }, [router.query, supabaseConfigured, handleOAuthSuccess]);

  const handleGoogleSignIn = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase configuration missing');
      }
      const returnUrl = typeof router.query.returnUrl === 'string' ? router.query.returnUrl : '';
      if (returnUrl && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('oauth_return_url', returnUrl);
      }
      setIsLoading(true);
      setError('');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl()
        }
      });

      if (error) {
        throw error;
      }

    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google');
    } finally {
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

      // Sign in with Supabase Auth
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

      // Ensure user profile exists + API key via internal auth endpoint
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'login', 
          email: normalizedEmail, 
          password: password 
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

      // Save user data to localStorage
      const userData = {
        email: normalizedEmail,
        api_key: apiKey,
        full_name: ensured.name || authData.user.user_metadata?.full_name || null,
        plan: ensured.plan || 'free'
      };

      localStorage.setItem('figma_web_user', JSON.stringify(userData));

      const returnUrl = typeof router.query.returnUrl === 'string' ? router.query.returnUrl : '';
      const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/gallery';
      router.push(target);

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
      
      // Use Supabase client-side resetPasswordForEmail to send reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${baseUrl}/reset-password`
      });

      if (resetError) {
        // Don't reveal if email exists (security best practice)
        console.error('Password reset error:', resetError);
      }

      // Always show success message (security best practice - don't reveal if email exists)
      setForgotPasswordSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setForgotPasswordSuccess(false);
      }, 3000);
    } catch (e: any) {
      console.error('Forgot password error:', e);
      // Still show success to user (security best practice)
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
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome to FigDex</h1>
          <p style={styles.subtitle}>Sign in to get your API key for Figma Index Platform</p>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.apiKeyContainer}>
            <div style={styles.apiKeyHeader}>
              <h2 style={styles.apiKeyTitle}>🎉 Login Successful!</h2>
              <p style={styles.apiKeySubtitle}>Here is your API Key for use in the Figma plugin:</p>
            </div>
            
            <div style={styles.apiKeyDisplay}>
              <div style={styles.apiKeyLabel}>API Key:</div>
              <div style={styles.apiKeyValue}>
                {success.replace('Welcome back! Your API Key: ', '').replace('Welcome! Your API Key: ', '')}
              </div>
              <button 
                onClick={async (event) => {
                  try {
                    const apiKey = success.replace('Welcome back! Your API Key: ', '').replace('Welcome! Your API Key: ', '');
                    await navigator.clipboard.writeText(apiKey);
                    // Show temporary success message
                    const originalText = '📋 Copy';
                    const button = event.target as HTMLButtonElement;
                    if (button) {
                      button.textContent = '✅ Copied!';
                      button.style.background = '#2e7d32';
                      setTimeout(() => {
                        button.textContent = originalText;
                        button.style.background = '#4285f4';
                      }, 2000);
                    }
                  } catch (error) {
                    console.error('Failed to copy:', error);
                  }
                }}
                style={styles.copyButton}
              >
                📋 Copy
              </button>
            </div>
            
            <div style={styles.actionButtons}>
              <button 
                onClick={() => window.open('http://localhost:3002/dashboard', '_blank')}
                style={styles.dashboardButton}
              >
                🏠 Go to My Indices Page
              </button>
              
              <button 
                onClick={() => window.open('http://localhost:3002', '_blank')}
                style={styles.homeButton}
              >
                🌐 Open Indexo Web
              </button>
              
              <button 
                onClick={() => {
                  setSuccess('');
                  setError('');
                  setIsLoading(false);
                }}
                style={styles.logoutButton}
              >
                🔓 Logout
              </button>
            </div>
            
            <div style={styles.apiKeyInfo}>
              <p style={styles.apiKeyInfoText}>
                <strong>How to use the API Key:</strong>
              </p>
          <ol style={styles.apiKeyInstructions}>
            <li>Copy the API Key above</li>
            <li>Open the Indexo plugin in Figma</li>
            <li>Paste the API Key in the &ldquo;API Key&rdquo; field</li>
            <li>Click &ldquo;Validate Key&rdquo;</li>
            <li>Now you can save indices to the web system!</li>
          </ol>
            </div>
          </div>
        )}

        {!showEmailForm ? (
          <div style={styles.buttonGroup}>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              style={styles.googleButton}
            >
              {isLoading ? (
                <span style={styles.loading}>
                  <div style={styles.spinner}></div>
                  Signing in...
                </span>
              ) : (
                <>
                  <svg style={styles.googleIcon} viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
            <div style={{ textAlign: 'center', margin: '16px 0', color: '#666', fontSize: '14px' }}>
              OR
            </div>
            <button
              onClick={() => setShowEmailForm(true)}
              disabled={isLoading}
              style={styles.emailButton}
            >
              Sign in with Email
            </button>
          </div>
        ) : (
          <div style={styles.emailForm}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={isLoading}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              disabled={isLoading}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleEmailSignIn();
                }
              }}
            />
            <button
              onClick={handleEmailSignIn}
              disabled={isLoading}
              style={styles.emailSubmitButton}
            >
              {isLoading ? (
                <span style={styles.loading}>
                  <div style={styles.spinner}></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
            <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4c5fd7',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: 0
                }}
              >
                Forgot password?
              </button>
            </div>
            <button
              onClick={() => {
                setShowEmailForm(false);
                setError('');
                setEmail('');
                setPassword('');
              }}
              disabled={isLoading}
              style={styles.emailBackButton}
            >
              Back to options
            </button>
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Don&rsquo;t have an account?{' '}
            <button
              onClick={() => router.push('/register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#4c5fd7',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Sign up here
            </button>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            onClick={() => router.push('/')}
            style={styles.smallBackButton}
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      {showForgotPassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '8px', color: '#111', fontSize: '24px', fontWeight: 700 }}>
              Reset Password
            </h2>
            <p style={{ marginBottom: '24px', color: '#666', fontSize: '14px' }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            {forgotPasswordError && (
              <div style={{
                backgroundColor: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {forgotPasswordError}
              </div>
            )}

            {forgotPasswordSuccess ? (
              <div>
                <div style={{
                  backgroundColor: '#efe',
                  color: '#3c3',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  If an account with this email exists, you will receive a password reset link. Please check your email.
                </div>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordSuccess(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#4285f4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  disabled={forgotPasswordLoading}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px',
                    marginBottom: '16px',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !forgotPasswordLoading) {
                      handleForgotPassword();
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleForgotPassword}
                    disabled={forgotPasswordLoading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#4285f4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: forgotPasswordLoading ? 'not-allowed' : 'pointer',
                      opacity: forgotPasswordLoading ? 0.6 : 1
                    }}
                  >
                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordError('');
                      setForgotPasswordSuccess(false);
                    }}
                    disabled={forgotPasswordLoading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: 'white',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                      cursor: forgotPasswordLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const styles = {
  container: {
    minHeight: '100vh',
    background: '#fafafa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  loginCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
    maxWidth: '420px',
    width: '100%'
  },
  
  header: {
    textAlign: 'center' as const,
    marginBottom: '20px'
  },
  
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111',
    margin: '0 0 8px 0'
  },
  
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
    lineHeight: 1.5
  },
  
  error: {
    background: '#ffe9e9',
    color: '#b42318',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #ffd6d6'
  },
  
  success: {
    background: '#e8f5e8',
    color: '#2e7d32',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #c8e6c9'
  },
  
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'center'
  },

  backButton: {
    background: 'transparent',
    border: '1px solid #dcdcdc',
    color: '#333',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textDecoration: 'none'
  },
  
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#4c5fd7',
    color: 'white'
  },
  
  demoButton: {
    width: '100%',
    padding: '16px 24px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'white',
    color: '#333'
  },
  
  googleIcon: {
    width: '20px',
    height: '20px'
  },
  
  emailButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 20px',
    border: '1px solid #4c5fd7',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'white',
    color: '#4c5fd7'
  },
  
  emailForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '16px'
  },
  
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box' as const
  },
  
  emailSubmitButton: {
    width: '100%',
    padding: '14px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#4c5fd7',
    color: 'white'
  },
  
  emailBackButton: {
    width: '100%',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'transparent',
    color: '#666',
    textDecoration: 'underline'
  },
  
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  
  footer: {
    textAlign: 'center' as const,
    marginTop: '8px',
    paddingTop: '16px',
    borderTop: '1px solid #eee'
  },
  
  footerText: {
    fontSize: '12px',
    color: '#666',
    margin: '0',
    lineHeight: 1.4
  },
  
  // API Key Container Styles
  apiKeyContainer: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center' as const
  },
  
  apiKeyHeader: {
    marginBottom: '24px'
  },
  
  apiKeyTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2e7d32',
    margin: '0 0 12px 0'
  },
  
  apiKeySubtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
    lineHeight: '1.5'
  },
  
  apiKeyDisplay: {
    background: '#f5f5f5',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },
  
  apiKeyLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    minWidth: '80px'
  },
  
  apiKeyValue: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#2e7d32',
    fontWeight: '600',
    background: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    flex: '1',
    wordBreak: 'break-all' as const
  },
  
  copyButton: {
    background: '#4285f4',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    minWidth: '80px'
  },
  
  actionButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '24px'
  },
  
  dashboardButton: {
    background: '#2e7d32',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  
  homeButton: {
    background: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  
  apiKeyInfo: {
    textAlign: 'left' as const,
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '20px'
  },
  
  apiKeyInfoText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0'
  },
  
  apiKeyInstructions: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6'
  },
  
  logoutButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },

  smallBackButton: {
    background: 'transparent',
    border: '1px solid #e5e5e5',
    color: '#444',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#f7f7f7',
      borderColor: '#d9d9d9'
    }
  }
};

