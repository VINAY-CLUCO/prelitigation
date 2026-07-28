// src/lib/filevineOAuth.ts
// Handles Filevine OAuth 2.0 (OIDC)

const FILEVINE_AUTH_URL = 'https://identity.filevine.com/connect/authorize';
const FILEVINE_TOKEN_URL = 'https://identity.filevine.com/connect/token';

export function getFilevineConfig() {
  const clientId = process.env.FILEVINE_CLIENT_ID;
  const clientSecret = process.env.FILEVINE_CLIENT_SECRET;
  const redirectUri = process.env.FILEVINE_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/filevine/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing FILEVINE_CLIENT_ID or FILEVINE_CLIENT_SECRET in .env.local');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Build the Filevine OAuth URL to redirect the user to.
 */
export function buildFilevineAuthUrl(): string {
  const { clientId, redirectUri } = getFilevineConfig();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access core.projects.read core.documents.read', 
    state: 'filevine' 
  });

  return `${FILEVINE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code for access + refresh tokens.
 */
export async function exchangeFilevineCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getFilevineConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(FILEVINE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Filevine token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get the authenticated user's information from Filevine
 */
export async function getFilevineUserEmail(accessToken: string): Promise<string> {
  // Use OIDC UserInfo endpoint
  const response = await fetch('https://identity.filevine.com/connect/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return 'unknown@filevine.com';
  }

  const data = await response.json();
  return data?.email || 'unknown@filevine.com';
}
