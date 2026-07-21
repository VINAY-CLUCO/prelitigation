// src/app/api/connections/disconnect/[provider]/route.ts
// Revokes the token at the provider's end and removes it from the local store

import { NextRequest, NextResponse } from 'next/server';
import { getToken, deleteToken } from '@/lib/tokenStore';
import { revokeGoogleToken } from '@/lib/googleOAuth';
import { revokeClioToken } from '@/lib/clioOAuth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const token = getToken(provider);

  if (!token) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  try {
    // Attempt to revoke at the provider's end first (only if it is a real live token)
    const isSimulated = token.access_token.startsWith('simulated_');

    if (!isSimulated && (provider === 'gdrive' || provider === 'gmail')) {
      // Revoke the access_token at Google — also invalidates the refresh_token
      await revokeGoogleToken(token.access_token).catch(() => {
        console.warn(`[Disconnect] Could not revoke ${provider} token at Google, deleting locally anyway`);
      });
    } else if (!isSimulated && provider === 'clio') {
      await revokeClioToken(token.access_token).catch(() => {
        console.warn(`[Disconnect] Could not revoke Clio token, deleting locally anyway`);
      });
    }
    // Microsoft and Dropbox: just delete locally
    // (user can revoke from their account settings if needed)

    deleteToken(provider);

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected successfully`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Disconnect ${provider}]`, message);
    // Even if revoke fails, delete locally so the user can reconnect
    deleteToken(provider);
    return NextResponse.json({ success: true, message: 'Disconnected (token deleted locally)' });
  }
}
