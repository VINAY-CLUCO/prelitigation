// src/app/api/auth/microsoft/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeMicrosoftCode, getMicrosoftUserEmail } from '@/lib/microsoftOAuth';
import { writeToken } from '@/lib/tokenStore';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent(errorDesc || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent('Missing code or state from Microsoft')}`
    );
  }

  try {
    const tokens = await exchangeMicrosoftCode(code, state) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    if (!tokens.access_token) throw new Error('No access_token returned from Microsoft');

    const email = await getMicrosoftUserEmail(tokens.access_token);

    writeToken(state, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      connected_at: new Date().toISOString(),
      email,
      scope: tokens.scope,
    });

    return NextResponse.redirect(
      `http://localhost:3000/settings?connected=${state}&email=${encodeURIComponent(email)}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Microsoft OAuth Callback]', message);
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
