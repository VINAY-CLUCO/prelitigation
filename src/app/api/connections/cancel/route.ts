// src/app/api/connections/cancel/route.ts
// Cancels all active queue jobs for a given provider.
// Called by the frontend when a user disconnects while a sync is in progress.

import { NextRequest, NextResponse } from 'next/server';
import { cancelJobsByProvider } from '@/lib/queueStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = body?.provider as string | undefined;

    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 });
    }

    const cancelled = await cancelJobsByProvider(provider);
    console.log(`[Cancel] Cancelled ${cancelled} job(s) for provider: ${provider}`);

    return NextResponse.json({ success: true, cancelled });
  } catch (err) {
    console.error('[Cancel] Error:', err);
    return NextResponse.json({ error: 'Failed to cancel jobs' }, { status: 500 });
  }
}
