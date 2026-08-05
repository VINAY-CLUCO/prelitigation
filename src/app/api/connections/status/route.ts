import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readTokens, isTokenExpired, VAULT_DIR } from '@/lib/tokenStore';
import { startQueueWorker } from '@/lib/queueWorker';
import { prisma } from '@/lib/prisma';

let cachedStatus: { timestamp: number; payload: any } | null = null;
const CACHE_TTL_MS = 2000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const now = Date.now();
  if (cachedStatus && (now - cachedStatus.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cachedStatus.payload);
  }

  // Start the background worker daemon upon app status load
  startQueueWorker();

  const status: Record<string, {
    connected: boolean;
    email?: string;
    connected_at?: string;
    expired?: boolean;
    docsIngested?: number;
  }> = {};

  // 1. Read from local token store (legacy)
  const tokens = readTokens(userId);
  for (const [provider, token] of Object.entries(tokens)) {
    status[provider] = {
      connected: true,
      email: token.email,
      connected_at: token.connected_at,
      expired: isTokenExpired(token),
      docsIngested: 0,
    };
  }

  // 2. Read from Prisma (new)
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { integrations: true }
  });

  if (dbUser && dbUser.integrations) {
    for (const integration of dbUser.integrations) {
      status[integration.platform] = {
        connected: true,
        email: 'Connected User',
        connected_at: integration.updatedAt.toISOString(),
        expired: integration.expiresAt ? (new Date(integration.expiresAt).getTime() < Date.now()) : false,
        docsIngested: 0,
      };
    }
  }

  // 3. Count documents for all connected providers
  for (const provider of Object.keys(status)) {
    let docsIngested = 0;
    try {
      const vaultPath = path.join(VAULT_DIR, 'vault', userId, provider);
      if (provider === 'clio') {
        if (fs.existsSync(vaultPath)) {
          const matters = fs.readdirSync(vaultPath);
          for (const m of matters) {
            const mPath = path.join(vaultPath, m);
            if (fs.statSync(mPath).isDirectory()) {
              const docFile = path.join(mPath, 'documents.json');
              if (fs.existsSync(docFile)) {
                try {
                  const list = JSON.parse(fs.readFileSync(docFile, 'utf-8'));
                  docsIngested += Array.isArray(list) ? list.length : 0;
                } catch {}
              } else {
                const binFiles = fs.readdirSync(mPath).filter(f => f !== 'matter.json' && f !== 'calendar.json' && f !== 'tasks.json');
                docsIngested += binFiles.length;
              }
            }
          }
        }
      } else {
        const docFile = path.join(vaultPath, 'documents.json');
        if (fs.existsSync(docFile)) {
          try {
            const list = JSON.parse(fs.readFileSync(docFile, 'utf-8'));
            docsIngested += Array.isArray(list) ? list.length : 0;
          } catch {}
        } else if (fs.existsSync(vaultPath)) {
          const binFiles = fs.readdirSync(vaultPath);
          docsIngested += binFiles.length;
        }
      }
    } catch (e) {
      console.error(`[Status API] Error counting docs for ${provider}:`, e);
    }
    status[provider].docsIngested = docsIngested;
  }

  cachedStatus = { timestamp: now, payload: status };
  return NextResponse.json(status);
}
