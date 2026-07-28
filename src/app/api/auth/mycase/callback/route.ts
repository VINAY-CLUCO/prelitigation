// src/app/api/auth/mycase/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeMycaseCode, getMycaseUserEmail } from '@/lib/mycaseOAuth';
import { writeToken } from '@/lib/tokenStore';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`http://127.0.0.1:3000/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`http://127.0.0.1:3000/settings?error=Missing authorization code from MyCase`);
  }

  try {
    const tokenData = await exchangeMycaseCode(code);
    const email = await getMycaseUserEmail(tokenData.access_token);

    writeToken('mycase', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: Date.now() + ((tokenData.expires_in || 3600) * 1000),
      connected_at: new Date().toISOString(),
      email: email,
    });

    return NextResponse.redirect('http://127.0.0.1:3000/settings?success=MyCase connected successfully');
  } catch (err: unknown) {
    console.error('MyCase OAuth error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `http://127.0.0.1:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
