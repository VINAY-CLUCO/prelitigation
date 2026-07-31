// src/app/api/auth/dropbox/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeDropboxCode, getDropboxUserEmail } from '@/lib/dropboxOAuth';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?error=${encodeURIComponent('Dropbox denied access: ' + error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?error=${encodeURIComponent('No code received from Dropbox')}`);
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

    const tokens = await exchangeDropboxCode(code) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) throw new Error('No access_token returned from Dropbox');

    const email = await getDropboxUserEmail(tokens.access_token);

    await prisma.integration.upsert({
      where: {
        userId_platform: {
          userId: dbUser.id,
          platform: 'dropbox'
        }
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : null
      },
      create: {
        userId: dbUser.id,
        platform: 'dropbox',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : null
      }
    });

    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?connected=dropbox&email=${encodeURIComponent(email)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Dropbox OAuth Callback]', message);
    return NextResponse.redirect(`https://cluco.vinayk.in/settings/integrations?error=${encodeURIComponent(message)}`);
  }
}
