// src/lib/clioOAuth.ts
// Handles Clio OAuth 2.0 (Developer Mode)

const CLIO_AUTH_URL = 'https://app.clio.com/oauth/authorize';
const CLIO_TOKEN_URL = 'https://app.clio.com/oauth/token';

export function getClioConfig() {
  const clientId = process.env.CLIO_CLIENT_ID;
  const clientSecret = process.env.CLIO_CLIENT_SECRET;
  const redirectUri = process.env.CLIO_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/clio/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing CLIO_CLIENT_ID or CLIO_CLIENT_SECRET in .env.local');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Build the Clio OAuth URL to redirect the user to.
 */
export function buildClioAuthUrl(): string {
  const { clientId, redirectUri } = getClioConfig();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'contacts matters documents tasks calendar_entries notes users',
    state: 'clio' // pass state to prevent CSRF / track provider
  });

  return `${CLIO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code for access + refresh tokens.
 * Called from the /api/auth/clio/callback route.
 */
export async function exchangeClioCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getClioConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(CLIO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clio token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshClioToken(refreshToken: string) {
  const { clientId, clientSecret } = getClioConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(CLIO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clio token refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Deauthorize/Revoke a token at Clio's end (used on disconnect).
 */
export async function revokeClioToken(token: string): Promise<void> {
  const { clientId, clientSecret } = getClioConfig();
  
  const params = new URLSearchParams({
    token: token
  });
  
  // Basic Auth header containing client_id:client_secret base64 encoded
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://app.clio.com/oauth/deauthorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`
    },
    body: params.toString(),
  });

  if (!response.ok) {
    console.error('Failed to revoke Clio token', await response.text());
  }
}

/**
 * Get the authenticated user's information from Clio to verify token
 */
export async function getClioUserEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://app.clio.com/api/v4/users/who_am_i.json', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return 'unknown';
  }

  const data = await response.json();
  return data.data?.email || 'unknown';
}
