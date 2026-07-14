// src/app/api/connections/clio/sync/route.ts
// Handles real-time streaming of sync progress via Server-Sent Events (SSE)

import { NextResponse } from 'next/server';
import { syncClioData } from '@/lib/clioSync';
import { getToken } from '@/lib/tokenStore';

// Prevent Next.js from aggressively caching this route
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = getToken('clio');
  if (!token) {
    return NextResponse.json({ error: 'Clio is not connected.' }, { status: 401 });
  }

  const encoder = new TextEncoder();

  // Create a ReadableStream to stream Server-Sent Events back to the client
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to push an event to the browser
      const sendEvent = (msg: string, docsIngested?: number, done = false) => {
        const payload = JSON.stringify({ msg, docsIngested, done });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        // Kick off the heavy sync process and pass a callback to receive real-time updates
        const result = await syncClioData((msg, docsIngested) => {
          sendEvent(msg, docsIngested);
        });
        
        // Final event when complete
        sendEvent('Sync complete!', result.documentsCount, true);
        controller.close();
      } catch (err: unknown) {
        console.error('[Clio Sync Error]', err);
        const message = err instanceof Error ? err.message : 'Unknown sync error';
        sendEvent(`Error: ${message}`, 0, true);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
