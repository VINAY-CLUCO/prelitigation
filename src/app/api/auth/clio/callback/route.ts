// src/app/api/auth/clio/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeClioCode, getClioUserEmail } from '@/lib/clioOAuth';
import { auth } from '@clerk/nextjs/server';


import { prisma } from '@/lib/prisma';


export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=Missing authorization code from Clio`);
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=${encodeURIComponent('Unauthorized')}`);
    }

    let dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { clerkId: userId, email: 'unknown@' + userId + '.com' }
      });
    }

    // 1. Exchange the code for access/refresh tokens
    const tokenData = await exchangeClioCode(code);
    
    // 2. Fetch the user's email to associate with the token
    const email = await getClioUserEmail(tokenData.access_token);

    // 3. Save to Prisma
    await prisma.integration.upsert({
      where: {
        userId_platform: {
          userId: dbUser.id,
          platform: 'clio'
        }
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + (tokenData.expires_in * 1000)) : null
      },
      create: {
        userId: dbUser.id,
        platform: 'clio',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + (tokenData.expires_in * 1000)) : null
      }
    });

    // Also save to file system vault for backward compatibility with local dashboard routes
    const { writeToken } = require('@/lib/tokenStore');
    writeToken(userId, 'clio', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      connected_at: new Date().toISOString(),
      email: email
    });

    // 4. Redirect back to settings with success message
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?success=Clio connected successfully`);
  } catch (err: unknown) {
    console.error('Clio OAuth error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(`${request.nextUrl.origin}/settings?error=${encodeURIComponent(message)}`);
  }
}
