// src/app/api/auth/google/route.ts
// Step 1 of Google OAuth: redirect the user to Google's consent screen

import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthUrl } from '@/lib/googleOAuth';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider') as 'gdrive' | 'gmail' | null;

  if (!provider || !['gdrive', 'gmail'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider. Use ?provider=gdrive or ?provider=gmail' }, { status: 400 });
  }

  try {
    const authUrl = buildGoogleAuthUrl(provider);
    // Redirect the browser to Google's OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Redirect back to settings with a clear error message
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
