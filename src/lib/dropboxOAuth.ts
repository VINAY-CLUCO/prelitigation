// src/lib/dropboxOAuth.ts
// Handles Dropbox OAuth 2.0 with PKCE for enhanced security

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PKCE_FILE = path.join(os.homedir(), '.cluco', '.pkce_verifier');

// Generate a PKCE code verifier and challenge
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

export function savePKCEVerifier(verifier: string): void {
  const dir = path.dirname(PKCE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PKCE_FILE, verifier, 'utf-8');
}

export function readPKCEVerifier(): string | null {
  try {
    return fs.existsSync(PKCE_FILE) ? fs.readFileSync(PKCE_FILE, 'utf-8') : null;
  } catch {
    return null;
  }
}

export function buildDropboxAuthUrl(): string {
  const clientId = process.env.DROPBOX_APP_KEY;
  const redirectUri =
    process.env.DROPBOX_REDIRECT_URI ||
    'http://localhost:3000/api/auth/dropbox/callback';

  if (!clientId) throw new Error('Missing DROPBOX_APP_KEY in .env.local');

  const { verifier, challenge } = generatePKCE();
  savePKCEVerifier(verifier); // Save verifier for use in callback

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline', // get refresh token
  });

  return `https://www.dropbox.com/oauth2/authorize?${params}`;
}

export async function exchangeDropboxCode(code: string): Promise<Record<string, unknown>> {
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;
  const redirectUri =
    process.env.DROPBOX_REDIRECT_URI ||
    'http://localhost:3000/api/auth/dropbox/callback';
  const verifier = readPKCEVerifier();

  if (!clientId || !clientSecret) throw new Error('Missing Dropbox credentials in .env.local');
  if (!verifier) throw new Error('PKCE verifier not found — restart the OAuth flow');

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dropbox token exchange failed: ${err}`);
  }

  return res.json();
}

export async function getDropboxUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: 'null',
  });
  const data = await res.json() as Record<string, unknown>;
  const email = data.email as string | undefined;
  return email ?? 'unknown';
}
