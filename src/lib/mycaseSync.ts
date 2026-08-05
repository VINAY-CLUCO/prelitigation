// src/lib/mycaseSync.ts
// Metadata & physical document sync engine for MyCase

import { isJobPaused } from './queueStore';
import fetch from 'node-fetch';

import { prisma } from '@/lib/prisma';

function isTargetDoc(filename: string): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return (
    lower.endsWith('.pdf') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.txt')
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkPause(jobId?: string) {
  if (!jobId) return;
  while (await isJobPaused(jobId)) {
    await delay(1000);
  }
}

async function mycaseFetch(url: string, token: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (2 ** i) * 1000;
      console.warn(`[MyCase Sync] Rate limited. Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
      continue;
    }

    if (!res.ok) {
      throw new Error(`MyCase API Error: ${res.status} - ${await res.text()}`);
    }

    return res.json();
  }
  throw new Error(`MyCase API Failed after ${retries} retries.`);
}

export async function syncMycaseData(userId: string, onProgress: (msg: string, count?: number) => void, jobId?: string) {
  const integration = await prisma.integration.findFirst({
    where: { userId, platform: 'mycase' }
  });
  
  if (!integration || !integration.accessToken) {
    throw new Error('MyCase is not connected or token is missing.');
  }

  const token = integration.accessToken;

  onProgress('Initializing MyCase API sync...', 0);
  await checkPause(jobId);

  const mattersUrl = 'https://api.mycase.com/v1/cases';
  
  try {
    const mattersData = await mycaseFetch(mattersUrl, token);
    const matters = mattersData.cases || [];

    onProgress(`Found ${matters.length} MyCase matters. Syncing metadata...`, 5);
    
    let docsIngested = 0;

    for (let i = 0; i < matters.length; i++) {
      await checkPause(jobId);
      const matter = matters[i];
      const matterIdStr = matter.id.toString();

      let dbMatter = await prisma.matter.findFirst({
        where: { userId, source: 'mycase', sourceId: matterIdStr }
      });
      
      if (!dbMatter) {
        dbMatter = await prisma.matter.create({
          data: {
            userId,
            name: matter.name || `Matter ${matter.id}`,
            description: 'Synced from MyCase',
            status: 'Open',
            source: 'mycase',
            sourceId: matterIdStr
          }
        });
      }

      onProgress(`Syncing documents for MyCase matter: ${matter.name || matter.id}...`, 5 + i);

      const docsUrl = `https://api.mycase.com/v1/documents?case_id=${matter.id}`;
      try {
        const docsData = await mycaseFetch(docsUrl, token);
        const documents = docsData.documents || [];
        
        for (const doc of documents) {
          if (!isTargetDoc(doc.name)) continue;

          let dbDoc = await prisma.document.findFirst({
             where: { userId, source: 'mycase', sourceId: doc.id.toString() }
          });
          
          if (!dbDoc) {
             dbDoc = await prisma.document.create({
               data: {
                 userId,
                 matterId: dbMatter.id,
                 name: doc.name || 'document.pdf',
                 size: doc.size ? parseInt(doc.size, 10) : null,
                 type: 'Document 📄',
                 source: 'mycase',
                 sourceId: doc.id.toString(),
                 downloaded: false
               }
             });
          }

          docsIngested++;
        }
      } catch (e) {
        console.warn(`Failed to fetch documents for MyCase matter ${matter.id}`, e);
      }
    }

    onProgress(`Sync complete! Ingested ${docsIngested} MyCase documents.`, 100);

  } catch (error: any) {
    console.error('[MyCase Sync Error]', error);
    throw error;
  }
}
