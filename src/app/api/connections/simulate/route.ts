// src/app/api/connections/simulate/route.ts
// Creates a simulated connection token locally to enable demo and offline testing of all sync pipelines

import { NextResponse } from 'next/server';
import { writeToken } from '@/lib/tokenStore';

export async function POST(request: Request) {
  try {
    const { provider } = await request.json();
    if (!provider) {
      return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
    }

    // Write a simulated token entry in tokens.json
    writeToken(provider, {
      access_token: `simulated_${provider}_token_${Date.now()}`,
      connected_at: new Date().toISOString(),
      email: `simulator-${provider}@cluco.com`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
