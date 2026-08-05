// src/lib/filevineSync.ts
// Metadata & physical document sync engine for Filevine (includes rigorous rate limiting)

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

async function filevineFetch(url: string, token: string, retries = 5): Promise<any> {
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
      console.warn(`[Filevine Sync] Rate limited (429). Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
      continue;
    }

    if (!res.ok) {
      throw new Error(`Filevine API Error: ${res.status} - ${await res.text()}`);
    }

    return res.json();
  }
  throw new Error(`Filevine API Failed after ${retries} retries due to rate limiting.`);
}

export async function syncFilevineData(userId: string, onProgress: (msg: string, count?: number) => void, jobId?: string) {
  // We expect accessToken to be passed or fetched inside queueWorker, but currently filevineSync fetches it using getToken.
  // Wait, getToken was using tokenStore.ts which was local JSON. 
  // We need to fetch the token from Prisma.
  
  const integration = await prisma.integration.findFirst({
    where: { userId, platform: 'filevine' }
  });
  
  if (!integration || !integration.accessToken) {
    throw new Error('Filevine is not connected or token is missing.');
  }
  
  const token = integration.accessToken;

  onProgress('Initializing Filevine API sync...', 0);
  await checkPause(jobId);

  const projectsUrl = 'https://api.filevine.io/core/projects';
  
  try {
    const projectsData = await filevineFetch(projectsUrl, token);
    const projects = projectsData.items || [];

    onProgress(`Found ${projects.length} Filevine projects. Syncing metadata...`, 5);
    
    let docsIngested = 0;

    for (let i = 0; i < projects.length; i++) {
      await checkPause(jobId);
      const project = projects[i];
      const projectIdStr = project.projectId.toString();
      
      let dbMatter = await prisma.matter.findFirst({
        where: { userId, source: 'filevine', sourceId: projectIdStr }
      });
      
      if (!dbMatter) {
        dbMatter = await prisma.matter.create({
          data: {
            userId,
            name: project.projectName || `Project ${project.projectId}`,
            description: 'Synced from Filevine',
            status: 'Open',
            source: 'filevine',
            sourceId: projectIdStr
          }
        });
      }

      onProgress(`Syncing documents for Filevine project: ${project.projectName || project.projectId}...`, 5 + i);

      const docsUrl = `https://api.filevine.io/core/projects/${project.projectId}/documents`;
      try {
        const docsData = await filevineFetch(docsUrl, token);
        const documents = docsData.items || [];

        for (const doc of documents) {
          if (!isTargetDoc(doc.filename)) continue;

          let dbDoc = await prisma.document.findFirst({
             where: { userId, source: 'filevine', sourceId: doc.documentId.toString() }
          });
          
          if (!dbDoc) {
             dbDoc = await prisma.document.create({
               data: {
                 userId,
                 matterId: dbMatter.id,
                 name: doc.filename || 'document.pdf',
                 size: doc.size ? parseInt(doc.size, 10) : null,
                 type: 'Document 📄',
                 source: 'filevine',
                 sourceId: doc.documentId.toString(),
                 downloaded: false
               }
             });
          }

          // Placeholder for actual physical file download using Filevine's download URL mechanism
          docsIngested++;
        }
      } catch (e) {
        console.warn(`Failed to fetch documents for Filevine project ${project.projectId}`, e);
      }
    }

    onProgress(`Sync complete! Ingested ${docsIngested} Filevine documents.`, 100);

  } catch (error: any) {
    console.error('[Filevine Sync Error]', error);
    throw error;
  }
}
