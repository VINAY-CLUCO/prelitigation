import { auth } from '@clerk/nextjs/server';
// src/app/api/connections/disconnect/[provider]/route.ts
// Revokes the token at the provider's end, removes it from the local store,
// AND wipes all locally downloaded vault files for that provider.

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getToken, deleteToken, VAULT_DIR } from '@/lib/tokenStore';
import { revokeGoogleToken } from '@/lib/googleOAuth';
import { revokeClioToken } from '@/lib/clioOAuth';
import { cancelJobsByProvider } from '@/lib/queueStore';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { provider } = await params;
  const token = getToken(userId, provider);

  if (!token) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  try {
    // 0. Cancel all queued / processing jobs for this provider immediately.
    //    This makes the sidebar stop showing "Syncing" right away.
    await cancelJobsByProvider(provider);

    // 1. Attempt to revoke at the provider's end (Fire and forget, don't block the UI)
    if (provider === 'gdrive' || provider === 'gmail') {
      revokeGoogleToken(token.access_token).catch(() => {
        console.warn(`[Disconnect] Could not revoke ${provider} token at Google, deleting locally anyway`);
      });
    } else if (provider === 'clio') {
      revokeClioToken(token.access_token).catch(() => {
        console.warn(`[Disconnect] Could not revoke Clio token, deleting locally anyway`);
      });
    }
    // Microsoft and Dropbox: just delete locally

    // 2. Delete the token from the store
    deleteToken(userId, provider);

    // 3. Wipe all locally downloaded vault files for this provider
    const vaultPath = path.join(VAULT_DIR, 'vault', userId, provider);
    if (fs.existsSync(vaultPath)) {
      try {
        fs.rmSync(vaultPath, { recursive: true, force: true });
        console.log(`[Disconnect] Erased vault files for ${provider} at: ${vaultPath}`);
      } catch (err) {
        console.warn(`[Disconnect] Could not erase vault files for ${provider}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected and all local files erased.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Disconnect ${provider}]`, message);
    // Even if revoke fails, always delete locally so user can reconnect
    deleteToken(userId, provider);
    const vaultPath = path.join(VAULT_DIR, 'vault', userId, provider);
    if (fs.existsSync(vaultPath)) {
      try { fs.rmSync(vaultPath, { recursive: true, force: true }); } catch {}
    }
    return NextResponse.json({ success: true, message: 'Disconnected and local files erased.' });
  }
}
