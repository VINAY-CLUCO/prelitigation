// src/app/api/auth/clio/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeClioCode, getClioUserEmail } from '@/lib/clioOAuth';
import { writeToken } from '@/lib/tokenStore';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`http://127.0.0.1:3000/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`http://127.0.0.1:3000/settings?error=Missing authorization code from Clio`);
  }

  try {
    // 1. Exchange the code for access/refresh tokens
    const tokenData = await exchangeClioCode(code);
    
    // 2. Fetch the user's email to associate with the token
    const email = await getClioUserEmail(tokenData.access_token);

    // 3. Save to local token store
    writeToken('clio', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: Date.now() + (tokenData.expires_in * 1000),
      connected_at: new Date().toISOString(),
      email: email,
    });

    // 4. Redirect back to settings with success message
    return NextResponse.redirect('http://127.0.0.1:3000/settings?success=Clio connected successfully');
  } catch (err: unknown) {
    console.error('Clio OAuth error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `http://127.0.0.1:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
