import { auth } from '@clerk/nextjs/server';
// src/app/api/auth/filevine/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeFilevineCode, getFilevineUserEmail } from '@/lib/filevineOAuth';
import { writeToken } from '@/lib/tokenStore';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=Missing authorization code from Filevine`);
  }

  try {
    const tokenData = await exchangeFilevineCode(code);
    const email = await getFilevineUserEmail(tokenData.access_token);

    writeToken(userId, 'filevine', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: Date.now() + ((tokenData.expires_in || 3600) * 1000),
      connected_at: new Date().toISOString(),
      email: email,
    });

    return NextResponse.redirect(`${request.nextUrl.origin}/settings?connected=filevine&email=${encodeURIComponent(email)}`);
  } catch (err: unknown) {
    console.error('Filevine OAuth error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?error=${encodeURIComponent(message)}`
    );
  }
}
