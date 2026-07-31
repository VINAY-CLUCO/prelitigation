// src/app/api/auth/microsoft/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeMicrosoftCode, getMicrosoftUserEmail } from '@/lib/microsoftOAuth';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?error=${encodeURIComponent(errorDesc || error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?error=${encodeURIComponent('Missing code or state from Microsoft')}`);
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?error=${encodeURIComponent('Unauthorized')}`);
    }

    let dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { clerkId: userId, email: 'unknown@' + userId + '.com' }
      });
    }

    const tokens = await exchangeMicrosoftCode(code, state) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    if (!tokens.access_token) throw new Error('No access_token returned from Microsoft');

    const email = await getMicrosoftUserEmail(tokens.access_token);

    await prisma.integration.upsert({
      where: {
        userId_platform: {
          userId: dbUser.id,
          platform: state // 'outlook' or 'onedrive'
        }
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : null
      },
      create: {
        userId: dbUser.id,
        platform: state,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : null
      }
    });

    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?connected=${state}&email=${encodeURIComponent(email)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Microsoft OAuth Callback]', message);
    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?error=${encodeURIComponent(message)}`);
  }
}
