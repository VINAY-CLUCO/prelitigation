// src/app/api/auth/google/callback/route.ts
// Step 2 of Google OAuth: receive the code, exchange it for tokens, store them

import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode, getGoogleUserEmail } from '@/lib/googleOAuth';
import { writeToken } from '@/lib/tokenStore';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // 'gdrive' or 'gmail'
  const error = searchParams.get('error');

  // User denied the permission request
  if (error) {
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent('Permission denied: ' + error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent('Missing code or state from Google')}`
    );
  }

  try {
    // Exchange authorization code → { access_token, refresh_token, expiry_date }
    const tokens = await exchangeGoogleCode(code);

    if (!tokens.access_token) {
      throw new Error('No access_token returned from Google');
    }

    // Fetch the user's email for display in the UI
    const email = await getGoogleUserEmail(tokens.access_token);

    // Persist token to ~/.cluco/tokens.json
    writeToken(state, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      connected_at: new Date().toISOString(),
      email,
      scope: tokens.scope ?? undefined,
    });

    // Redirect back to settings with success indicator
    return NextResponse.redirect(
      `http://localhost:3000/settings?connected=${state}&email=${encodeURIComponent(email)}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Google OAuth Callback] Error:`, message);
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
