// src/app/api/connections/sync/route.ts
// Initiates a background sync task in the queue for any connected provider and streams progress using SSE

import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';
import { addJob, readQueue } from '@/lib/queueStore';
import { startQueueWorker } from '@/lib/queueWorker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'clio';

  const token = getToken(provider);
  
  // We require active connection tokens for real OAuth systems
  if (!token && provider !== 'mycase') {
    return NextResponse.json({ error: `${provider} is not connected.` }, { status: 401 });
  }

  // Ensure background worker daemon is active
  startQueueWorker();

  const encoder = new TextEncoder();

  // Create a ReadableStream to pipe Server-Sent Events back to settings page
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (msg: string, docsIngested?: number, done = false) => {
        const payload = JSON.stringify({ msg, docsIngested, done });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        // Queue the sync job for this specific provider
        const jobType = provider === 'clio' ? 'clio-matter-sync' : `${provider}-sync`;
        const job = await addJob(jobType as any, {});
        sendEvent(`Sync request for ${provider} initialized. Queued background task...`, 0);

        // Poll queue store for updates
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 800));

          const queue = await readQueue();
          const activeJob = queue.find((j) => j.id === job.id);

          if (!activeJob) {
            sendEvent('Task lost in queue manager.', 0, true);
            break;
          }

          if (activeJob.status === 'completed') {
            sendEvent(`Sync complete!`, activeJob.progress?.completed ?? 0, true);
            break;
          }

          if (activeJob.status === 'failed') {
            sendEvent(`Sync failed: ${activeJob.error || 'Internal worker crash'}`, 0, true);
            break;
          }

          // Emit progress events
          if (activeJob.progress) {
            sendEvent(
              activeJob.progress.msg || `Syncing files...`,
              activeJob.progress.completed
            );
          } else {
            sendEvent('Task pending in queue...', 0);
          }
        }

        controller.close();
      } catch (err: unknown) {
        console.error(`[${provider} Sync Queue Error]`, err);
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
