// src/app/api/auth/dropbox/route.ts
import { NextResponse } from 'next/server';
import { buildDropboxAuthUrl } from '@/lib/dropboxOAuth';

export async function GET() {
  try {
    const authUrl = buildDropboxAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
