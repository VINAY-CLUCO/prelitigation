// src/app/api/connections/status/route.ts
// Returns the real connection state for all providers by reading ~/.cluco/tokens.json

import { NextResponse } from 'next/server';
import { readTokens, isTokenExpired } from '@/lib/tokenStore';

export async function GET() {
  const tokens = readTokens();

  // Build a safe status object — never expose tokens to the frontend
  const status: Record<string, {
    connected: boolean;
    email?: string;
    connected_at?: string;
    expired?: boolean;
  }> = {};

  for (const [provider, token] of Object.entries(tokens)) {
    status[provider] = {
      connected: true,
      email: token.email,
      connected_at: token.connected_at,
      expired: isTokenExpired(token),
    };
  }

  return NextResponse.json(status);
}
