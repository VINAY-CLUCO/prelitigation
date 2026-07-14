// src/app/api/auth/clio/route.ts
import { NextResponse } from 'next/server';
import { buildClioAuthUrl } from '@/lib/clioOAuth';

export async function GET() {
  try {
    const authUrl = buildClioAuthUrl();
    // Redirect the browser to Clio's OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Redirect back to settings with a clear error message
    return NextResponse.redirect(
      `http://127.0.0.1:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
