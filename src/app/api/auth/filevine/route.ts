import { auth } from '@clerk/nextjs/server';
// src/app/api/auth/filevine/route.ts
import { NextResponse } from 'next/server';
import { buildFilevineAuthUrl } from '@/lib/filevineOAuth';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const authUrl = buildFilevineAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `http://127.0.0.1:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
