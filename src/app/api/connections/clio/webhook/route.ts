import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from '@/lib/tokenStore';
import { addJob } from '@/lib/queueStore';
import { startQueueWorker } from '@/lib/queueWorker';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Lazily start background worker loop inside Next.js process
  startQueueWorker();

  try {
    const payload = await request.json();
    const tokenRecord = getToken('clio');
    
    if (!tokenRecord?.access_token) {
      console.warn('[Webhook] Rejected: Clio access token not found locally.');
      return NextResponse.json({ error: 'OAuth credentials not setup.' }, { status: 401 });
    }
    
    // Clio sends an array of events
    if (payload && payload.events && Array.isArray(payload.events)) {
      for (const event of payload.events) {
        if (event.event_type === 'DocumentCreated' || event.event_type === 'DocumentUpdated') {
          const docData = event.data;
          const matterId = docData?.matter?.id;
          
          if (matterId) {
            const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');
            const matterFolder = path.join(CLIO_VAULT, matterId.toString());
            
            // Queue document ingestion job
            console.log(`[Webhook] Queueing ingest task for document: ${docData.name}`);
            await addJob('clio-document-ingest', {
              documentId: docData.id,
              name: docData.name,
              matterId: matterId,
              token: tokenRecord.access_token,
              size: docData.size,
              content_type: docData.content_type
            });
          }
        }
      }
    }

    // Always respond immediately with 200 OK so Clio knows we received it
    return NextResponse.json({ status: 'success', message: 'Events queued successfully.' });
  } catch (error) {
    console.error('[Clio Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
