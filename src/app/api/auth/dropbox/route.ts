import { auth } from '@clerk/nextjs/server';
// src/app/api/auth/dropbox/route.ts
import { NextResponse } from 'next/server';
import { buildDropboxAuthUrl } from '@/lib/dropboxOAuth';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

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
