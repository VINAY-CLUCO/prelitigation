// src/app/api/connections/sync/route.ts
// Initiates a background sync task in the queue for any connected provider and streams progress using SSE

import { NextResponse } from 'next/server';
import { addJob, readQueue } from '@/lib/queueStore';
import { startQueueWorker } from '@/lib/queueWorker';
import { auth } from '@clerk/nextjs/server';


import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'clio';

  // Find User
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
  }

  // Ensure they have the integration
  const integration = await prisma.integration.findUnique({
    where: { userId_platform: { userId: dbUser.id, platform: provider } }
  });

  if (!integration || !integration.accessToken) {
    return NextResponse.json({ error: `${provider} is not connected.` }, { status: 401 });
  }

  // Ensure background worker daemon is active
  startQueueWorker();

  const encoder = new TextEncoder();

  // Create a ReadableStream to pipe Server-Sent Events back to settings page
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (msg: string, docsIngested?: number, done = false, paused = false) => {
        const payload = JSON.stringify({ msg, docsIngested, done, paused });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        // Queue the sync job with the dbUser's id
        const jobType = provider === 'clio' ? 'clio-matter-sync' : `${provider}-sync`;
        const job = await addJob(jobType as any, { userId: dbUser.id });
        sendEvent(`Sync request for ${provider} initialized. Queued background task...`, 0);

        // Poll queue store for updates
        while (true) {
          if (request.signal.aborted) {
            console.log(`[${provider} Sync] Client disconnected. Stream aborted.`);
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
              activeJob.isPaused ? `Paused...` : (activeJob.progress.msg || `Syncing files...`),
              activeJob.progress.completed,
              false,
              activeJob.isPaused
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
