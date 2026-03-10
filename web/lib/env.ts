/**
 * Environment detection and URL helpers
 * Ensures redirects stay within the same environment (dev/production)
 */

/**
 * Get the current environment (dev or production)
 */
export function getEnvironment(): 'dev' | 'production' {
  if (typeof window === 'undefined') {
    // Server-side: check Vercel environment
    return process.env.VERCEL_ENV === 'production' ? 'production' : 'dev';
  }
  
  // Client-side: check hostname
  const hostname = window.location.hostname;
  
  if (hostname === 'www.figdex.com' || hostname === 'figdex.com') {
    return 'production';
  }
  
  // Dev environment: dev.figdex.com, figdex-dev.vercel.app, localhost, etc.
  if (hostname === 'dev.figdex.com' || hostname.includes('figdex-dev') || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'dev';
  }
  
  // Default to dev for any other hostname (safer for development)
  return 'dev';
}

/**
 * Get the base URL for the current environment
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin (this ensures we stay in the same environment)
    return window.location.origin;
  }
  
  // Server-side: use environment variable or default
  const env = getEnvironment();
  
  if (env === 'production') {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://www.figdex.com';
  }
  
  // Dev environment - prefer dev.figdex.com if available, fallback to vercel URL
  return process.env.NEXT_PUBLIC_DEV_URL || 'https://dev.figdex.com';
}

/**
 * Get the redirect URL for OAuth callbacks
 * Always uses current origin to ensure we stay in the same environment
 */
export function getOAuthRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: always use current origin
    return `${window.location.origin}/auth/callback`;
  }
  
  // Server-side: use base URL
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/callback`;
}

/**
 * Check if we're in development environment
 */
export function isDev(): boolean {
  return getEnvironment() === 'dev';
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

