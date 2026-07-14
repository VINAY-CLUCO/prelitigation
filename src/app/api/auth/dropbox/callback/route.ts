// src/app/api/auth/dropbox/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeDropboxCode, getDropboxUserEmail } from '@/lib/dropboxOAuth';
import { writeToken } from '@/lib/tokenStore';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent('Dropbox denied access: ' + error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent('No code received from Dropbox')}`
    );
  }

  try {
    const tokens = await exchangeDropboxCode(code) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) throw new Error('No access_token returned from Dropbox');

    const email = await getDropboxUserEmail(tokens.access_token);

    writeToken('dropbox', {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      connected_at: new Date().toISOString(),
      email,
    });

    return NextResponse.redirect(
      `http://localhost:3000/settings?connected=dropbox&email=${encodeURIComponent(email)}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Dropbox OAuth Callback]', message);
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
