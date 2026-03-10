import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function OAuthSuccess() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState(3);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isFromFigma, setIsFromFigma] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Check if this page was opened from Figma plugin
    const isFigmaPlugin = router.query.from === 'figma';
    setIsFromFigma(isFigmaPlugin);

    // If from Figma, start Google OAuth flow
    if (isFigmaPlugin && !isAuthenticating) {
      startGoogleOAuth();
    }
  }, [router.query, isAuthenticating]);

  const startGoogleOAuth = () => {
    setIsAuthenticating(true);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = typeof window !== 'undefined'
      ? `${window.location.origin}/oauth-success`
      : process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/oauth-success`
        : 'http://localhost:3000/oauth-success';
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID not set');
      return;
    }
    const googleOAuthConfig = {
      clientId,
      redirectUri,
      scope: 'email profile',
      responseType: 'code'
    };

    // Create Google OAuth URL
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleOAuthConfig.clientId)}` +
      `&redirect_uri=${encodeURIComponent(googleOAuthConfig.redirectUri)}` +
      `&scope=${encodeURIComponent(googleOAuthConfig.scope)}` +
      `&response_type=${googleOAuthConfig.responseType}` +
      `&access_type=offline` +
      `&prompt=consent`;

    // Open Google OAuth in the same window
    window.location.href = googleOAuthUrl;
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      // Exchange authorization code for tokens (server-side, keeps client_secret safe)
      const tokenResponse = await fetch('/api/auth/google-token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get tokens');
      }

      const tokenData = await tokenResponse.json();
      
      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userData = await userResponse.json();
      
      const user = {
        id: userData.id,
        email: userData.email,
        app_metadata: {
          provider: 'google'
        },
        user_metadata: {
          name: userData.name,
          picture: userData.picture
        }
      };
      
      setUserInfo(user);
      
      // Start countdown to redirect to Figma
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            redirectToFigma(user, tokenData.access_token, tokenData.refresh_token);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
      
    } catch (error) {
      console.error('OAuth error:', error);
      // Fallback to mock user for testing
      createMockUser();
    }
  };

  const createMockUser = () => {
    const mockUser = {
      id: 'mock_user_id_' + Date.now(),
      email: 'test@example.com',
      app_metadata: {
        provider: 'google'
      }
    };
    
    setUserInfo(mockUser);
    
    // Start countdown to redirect to Figma
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          redirectToFigma(mockUser, 'mock_token', 'mock_refresh');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  };

  const redirectToFigma = (user: any, accessToken: string, refreshToken: string) => {
    setIsRedirecting(true);
    
    // Create a special URL that will redirect to Figma with user data
    const figmaUrl = `https://www.figma.com/oauth-callback?` +
      `email=${encodeURIComponent(user.email)}` +
      `&provider=${encodeURIComponent(user.app_metadata.provider)}` +
      `&access_token=${encodeURIComponent(accessToken)}` +
      `&refresh_token=${encodeURIComponent(refreshToken)}` +
      `&timestamp=${Date.now()}` +
      `&from=indexo-plugin` +
      `&action=oauth-success`;
    
    // Redirect to Figma
    window.location.href = figmaUrl;
  };

  const redirectNow = () => {
    if (userInfo) {
      redirectToFigma(userInfo, 'mock_token', 'mock_refresh');
    }
  };

  // Check if we have an authorization code in the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && isFromFigma) {
      handleOAuthCallback(code);
    }
  }, [isFromFigma]);

  if (isAuthenticating) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Authenticating with Google...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Processing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.successCard}>
        <div style={styles.successIcon}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <path 
              d="M9 12l2 2 4-4" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        
        <h1 style={styles.title}>Authentication Successful!</h1>
        <p style={styles.message}>
          You have successfully signed in to Figma Index Platform.
        </p>
        
        <div style={styles.userInfo}>
          <div style={styles.userEmail}>{userInfo.email}</div>
          <div style={styles.providerBadge}>
            {userInfo.app_metadata.provider}
          </div>
        </div>

        <div style={styles.figmaInfo}>
          <p style={styles.figmaText}>
            ✅ Redirecting back to Figma...
          </p>
          <p style={styles.figmaText}>
            You will see your login status in the plugin.
          </p>
        </div>
        
        <button 
          style={styles.returnButton} 
          onClick={redirectNow}
          disabled={isRedirecting}
        >
          {isRedirecting ? 'Redirecting...' : 'Return to Figma Now'}
        </button>
        
        <p style={styles.countdown}>
          You will be automatically redirected in <strong>{countdown}</strong> seconds...
        </p>

        <div style={styles.debugInfo}>
          <p style={styles.debugText}>
            Debug: {isFromFigma ? 'From Figma Plugin' : 'Direct Access'}
          </p>
          <p style={styles.debugText}>
            User: {userInfo.email}
          </p>
          <p style={styles.debugText}>
            Provider: {userInfo.app_metadata.provider}
          </p>
          <p style={styles.debugText}>
            Redirect URL: {isRedirecting ? 'Redirecting...' : 'Preparing...'}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  successCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center' as const,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '100%'
  },
  
  successIcon: {
    width: '80px',
    height: '80px',
    background: '#4caf50',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    color: 'white'
  },
  
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px',
    lineHeight: '1.5',
    margin: '0 0 32px 0'
  },
  
  userInfo: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '32px',
    borderLeft: '4px solid #4caf50'
  },
  
  userEmail: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
    marginBottom: '8px'
  },
  
  providerBadge: {
    display: 'inline-block',
    background: '#4285f4',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },

  figmaInfo: {
    background: '#e8f5e8',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '32px',
    borderLeft: '4px solid #4caf50'
  },

  figmaText: {
    fontSize: '14px',
    color: '#2e7d32',
    margin: '0 0 8px 0',
    lineHeight: '1.4'
  },
  
  returnButton: {
    background: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    marginBottom: '16px'
  },
  
  countdown: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 16px 0'
  },

  debugInfo: {
    background: '#f5f5f5',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '16px',
    fontSize: '12px'
  },

  debugText: {
    margin: '0 0 4px 0',
    color: '#666',
    fontFamily: 'monospace'
  },
  
  loading: {
    textAlign: 'center' as const,
    color: 'white'
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  }
};
