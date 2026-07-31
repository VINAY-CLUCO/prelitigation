import { auth } from '@clerk/nextjs/server';
// src/app/api/auth/microsoft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildMicrosoftAuthUrl } from '@/lib/microsoftOAuth';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const provider = request.nextUrl.searchParams.get('provider') as 'onedrive' | 'outlook' | null;

  if (!provider || !['onedrive', 'outlook'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider. Use ?provider=onedrive or ?provider=outlook' }, { status: 400 });
  }

  try {
    const authUrl = buildMicrosoftAuthUrl(provider);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `http://localhost:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
