import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Exchange Google OAuth code for tokens - server-side only.
 * Keeps client_secret out of the client bundle.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/oauth-success`
    : 'http://localhost:3000/oauth-success';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'OAuth not configured' });
  }

  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing code' });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Google token error:', err);
      return res.status(400).json({ error: 'Failed to exchange code' });
    }

    const tokenData = await tokenResponse.json();
    return res.status(200).json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
