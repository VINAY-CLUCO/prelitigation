import { auth } from '@clerk/nextjs/server';
// src/app/api/connections/clio/sync/route.ts
// Initiates a background Clio sync job in the queue and streams status updates in real-time over SSE

import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';
import { addJob, readQueue } from '@/lib/queueStore';
import { startQueueWorker } from '@/lib/queueWorker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const token = getToken(userId, 'clio');
  if (!token) {
    return NextResponse.json({ error: 'Clio is not connected.' }, { status: 401 });
  }

  // Ensure background worker daemon is active
  startQueueWorker();

  const encoder = new TextEncoder();

  // Create a ReadableStream to stream Server-Sent Events back to the client
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (msg: string, docsIngested?: number, done = false) => {
        const payload = JSON.stringify({ msg, docsIngested, done });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        // 1. Queue a new matter-wide sync job
        const job = await addJob('clio-matter-sync', {});
        sendEvent('Sync request initialized. Queued background task...', 0);

        // 2. Poll queue store for job updates and stream them over the SSE connection
        while (true) {
          if (request.signal.aborted) {
            console.log('[Clio Sync] Client disconnected. Stream aborted.');
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 800));

          const queue = await readQueue();
          const activeJob = queue.find((j) => j.id === job.id);

          if (!activeJob) {
            sendEvent('Task lost in queue manager.', 0, true);
            break;
          }

          if (activeJob.status === 'completed') {
            sendEvent('Sync complete!', activeJob.progress?.completed ?? 0, true);
            break;
          }

          if (activeJob.status === 'failed') {
            sendEvent(`Sync failed: ${activeJob.error || 'Internal worker crash'}`, 0, true);
            break;
          }

          // Emit progress events
          if (activeJob.progress) {
            sendEvent(
              activeJob.progress.msg || 'Syncing matters & documents...',
              activeJob.progress.completed
            );
          } else {
            sendEvent('Task pending in queue...', 0);
          }
        }

        controller.close();
      } catch (err: unknown) {
        console.error('[Clio Sync Queue Error]', err);
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
