// src/app/api/auth/google/callback/route.ts
// Step 2 of Google OAuth: receive the code, exchange it for tokens, store them in Prisma

import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode, getGoogleUserEmail } from '@/lib/googleOAuth';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // 'gdrive' or 'gmail'
  const error = searchParams.get('error');

  // User denied the permission request
  if (error) {
    return NextResponse.redirect(`${origin}/settings/integrations?error=${encodeURIComponent('Permission denied: ' + error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings/integrations?error=${encodeURIComponent('Missing code or state from Google')}`);
  }

  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.redirect(`${origin}/settings/integrations?error=${encodeURIComponent('Unauthorized')}`);
    }

    // Ensure User exists in Prisma
    let dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { clerkId: userId, email: 'unknown@' + userId + '.com' }
      });
    }

    // Exchange authorization code
    const tokens = await exchangeGoogleCode(code);

    if (!tokens.access_token) {
      throw new Error('No access_token returned from Google');
    }

    const email = await getGoogleUserEmail(tokens.access_token);

    // Persist token to Prisma Integration table
    await prisma.integration.upsert({
      where: {
        userId_platform: {
          userId: dbUser.id,
          platform: state // 'gdrive' or 'gmail'
        }
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      },
      create: {
        userId: dbUser.id,
        platform: state,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    });

    return NextResponse.redirect(`${origin}/settings/integrations?connected=${state}&email=${encodeURIComponent(email)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Google OAuth Callback] Error:`, message);
    return NextResponse.redirect(`${origin}/settings/integrations?error=${encodeURIComponent(message)}`);
  }
}
