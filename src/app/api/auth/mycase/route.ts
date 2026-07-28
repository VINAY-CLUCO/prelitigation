// src/app/api/auth/mycase/route.ts
import { NextResponse } from 'next/server';
import { buildMycaseAuthUrl } from '@/lib/mycaseOAuth';

export async function GET() {
  try {
    const authUrl = buildMycaseAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      `http://127.0.0.1:3000/settings?error=${encodeURIComponent(message)}`
    );
  }
}
