// src/lib/googleOAuth.ts
// Handles Google OAuth 2.0 for Drive and Gmail

import { google } from 'googleapis';

// Each provider requests only the minimum scopes it needs
export const GOOGLE_SCOPES: Record<string, string[]> = {
  gdrive: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
};

export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Build the Google OAuth URL to redirect the user to.
 * The `state` param carries the provider name so the callback
 * knows which service is being connected (gdrive vs gmail).
 */
export function buildGoogleAuthUrl(provider: 'gdrive' | 'gmail'): string {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // request refresh_token
    prompt: 'consent',       // force consent so we always get refresh_token
    scope: GOOGLE_SCOPES[provider],
    state: provider,
  });
}

/**
 * Exchange the authorization code for access + refresh tokens.
 * Called from the /api/auth/google/callback route.
 */
export async function exchangeGoogleCode(code: string) {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Get the authenticated user's email address using their token.
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const client = createGoogleOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  return data.email ?? 'unknown';
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshGoogleToken(refreshToken: string) {
  const client = createGoogleOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

/**
 * Revoke a token at Google's end (used on disconnect).
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  const client = createGoogleOAuthClient();
  await client.revokeToken(token);
}
