// src/lib/microsoftOAuth.ts
// Handles Microsoft OAuth 2.0 for OneDrive and Outlook via Microsoft Graph

const MICROSOFT_TENANT = 'common'; // 'common' allows any Microsoft account

// Scopes per provider — minimum required
export const MICROSOFT_SCOPES: Record<string, string[]> = {
  onedrive: [
    'https://graph.microsoft.com/Files.Read',
    'https://graph.microsoft.com/Files.Read.All',
    'https://graph.microsoft.com/User.Read',
    'offline_access', // required for refresh token
  ],
  outlook: [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Mail.ReadBasic',
    'https://graph.microsoft.com/User.Read',
    'offline_access',
  ],
};

export function buildMicrosoftAuthUrl(provider: 'onedrive' | 'outlook'): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI ||
    'http://localhost:3000/api/auth/microsoft/callback';

  if (!clientId) {
    throw new Error('Missing MICROSOFT_CLIENT_ID in .env.local');
  }

  const scopes = MICROSOFT_SCOPES[provider].join(' ');
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    response_mode: 'query',
    state: provider,
    prompt: 'consent',
  });

  return `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftCode(
  code: string,
  provider: string
): Promise<Record<string, unknown>> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI ||
    'http://localhost:3000/api/auth/microsoft/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing Microsoft credentials in .env.local');
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: MICROSOFT_SCOPES[provider]?.join(' ') ?? '',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }

  return res.json();
}

export async function getMicrosoftUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as Record<string, unknown>;
  return (data.userPrincipalName as string) ?? (data.mail as string) ?? 'unknown';
}

export async function revokeMicrosoftToken(_token: string): Promise<void> {
  // Microsoft doesn't have a simple token revoke endpoint like Google.
  // Revoking is done by deleting the token from our store — the token
  // will expire naturally. For proper revoke, users can go to
  // https://account.microsoft.com/permissions and remove the app.
  // We just delete locally.
}
