// src/app/api/connections/status/route.ts
// Returns the real connection state for all providers by reading ~/.cluco/tokens.json and directory file counts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readTokens, isTokenExpired, VAULT_DIR } from '@/lib/tokenStore';
import { startQueueWorker } from '@/lib/queueWorker';

export async function GET() {
  // Start the background worker daemon upon app status load
  startQueueWorker();

  const tokens = readTokens();

  const status: Record<string, {
    connected: boolean;
    email?: string;
    connected_at?: string;
    expired?: boolean;
    docsIngested?: number;
  }> = {};

  for (const [provider, token] of Object.entries(tokens)) {
    let docsIngested = 0;
    
    try {
      const vaultPath = path.join(VAULT_DIR, 'vault', provider);
      if (provider === 'clio') {
        // Clio documents are catalogued under matter folders
        if (fs.existsSync(vaultPath)) {
          const matters = fs.readdirSync(vaultPath);
          for (const m of matters) {
            const docFile = path.join(vaultPath, m, 'documents.json');
            if (fs.existsSync(docFile)) {
              const list = JSON.parse(fs.readFileSync(docFile, 'utf-8'));
              docsIngested += Array.isArray(list) ? list.length : 0;
            }
          }
        }
      } else {
        // Cloud and mail documents are in provider-specific root vault folder
        const docFile = path.join(vaultPath, 'documents.json');
        if (fs.existsSync(docFile)) {
          const list = JSON.parse(fs.readFileSync(docFile, 'utf-8'));
          docsIngested += Array.isArray(list) ? list.length : 0;
        }
      }
    } catch (e) {
      console.error(`[Status API] Error counting docs for ${provider}:`, e);
    }

    status[provider] = {
      connected: true,
      email: token.email,
      connected_at: token.connected_at,
      expired: isTokenExpired(token),
      docsIngested,
    };
  }

  return NextResponse.json(status);
}
