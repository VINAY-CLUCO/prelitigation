import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from '@/lib/tokenStore';

export const dynamic = 'force-dynamic';

// Simulated AI Triage Heuristics (In production, this would call an LLM API)
function triageDocument(filename: string): string {
  const name = filename.toLowerCase();
  if (name.includes('medical') || name.includes('med') || name.includes('hospital') || name.includes('clinic')) return 'Medical Record 🏥';
  if (name.includes('police') || name.includes('report') || name.includes('accident')) return 'Police Report 🚓';
  if (name.includes('contract') || name.includes('agreement') || name.includes('nda')) return 'Contract 📝';
  if (name.includes('invoice') || name.includes('bill') || name.includes('receipt')) return 'Financial 💵';
  if (name.includes('demand') || name.includes('settlement')) return 'Demand Letter ⚖️';
  return 'Uncategorized 📄';
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Clio sends an array of events
    if (payload && payload.events && Array.isArray(payload.events)) {
      for (const event of payload.events) {
        if (event.event_type === 'DocumentCreated' || event.event_type === 'DocumentUpdated') {
          const docData = event.data;
          const matterId = docData?.matter?.id;
          
          if (matterId) {
            const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');
            const matterFolder = path.join(CLIO_VAULT, matterId.toString());
            
            // Only update if we are already syncing this matter
            if (fs.existsSync(matterFolder)) {
              const docsFile = path.join(matterFolder, 'documents.json');
              let documents = [];
              if (fs.existsSync(docsFile)) {
                documents = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
              }
              
              // Run AI Triage
              const aiTag = triageDocument(docData.name || '');
              
              const newDoc = {
                id: docData.id,
                name: docData.name,
                content_type: docData.content_type,
                size: docData.size,
                ai_tag: aiTag // Injecting our smart tag
              };

              // Update or append
              const existingIndex = documents.findIndex((d: any) => d.id === newDoc.id);
              if (existingIndex >= 0) {
                documents[existingIndex] = { ...documents[existingIndex], ...newDoc };
              } else {
                documents.push(newDoc);
              }

              fs.writeFileSync(docsFile, JSON.stringify(documents, null, 2));
              console.log(`[Webhook] Processed & Tagged Document: ${docData.name} -> ${aiTag}`);
            }
          }
        }
      }
    }

    // Always respond with 200 OK so Clio knows we received it
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[Clio Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
