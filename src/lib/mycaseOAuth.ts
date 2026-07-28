// src/lib/mycaseOAuth.ts
// Handles MyCase OAuth 2.0 

const MYCASE_AUTH_URL = 'https://auth.mycase.com/oauth/authorize';
const MYCASE_TOKEN_URL = 'https://auth.mycase.com/oauth/token';

export function getMycaseConfig() {
  const clientId = process.env.MYCASE_CLIENT_ID;
  const clientSecret = process.env.MYCASE_CLIENT_SECRET;
  const redirectUri = process.env.MYCASE_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/mycase/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing MYCASE_CLIENT_ID or MYCASE_CLIENT_SECRET in .env.local');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Build the MyCase OAuth URL to redirect the user to.
 */
export function buildMycaseAuthUrl(): string {
  // If keys aren't set, we can catch this before redirecting
  const { clientId, redirectUri } = getMycaseConfig();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'offline_access read:cases read:documents read:contacts', 
    state: 'mycase' 
  });

  return `${MYCASE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code for access + refresh tokens.
 */
export async function exchangeMycaseCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getMycaseConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(MYCASE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MyCase token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get the authenticated user's information from MyCase to verify token
 */
export async function getMycaseUserEmail(accessToken: string): Promise<string> {
  // Standard profile endpoint, will return 'unknown' if it fails (e.g. if scopes are missing)
  const response = await fetch('https://api.mycase.com/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return 'unknown@mycase.com';
  }

  const data = await response.json();
  return data?.email || 'unknown@mycase.com';
}
