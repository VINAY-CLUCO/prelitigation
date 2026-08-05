// src/lib/clioSync.ts
// Highly optimized metadata & physical document sync engine for Clio Manage

import fetch from 'node-fetch';
import { isJobPaused } from './queueStore';
import { uploadFile } from './storage';

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

async function clioFetch(url: string, token: string, retries = 3): Promise<any> {
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
      console.warn(`[Clio Sync] Rate limited. Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
      continue;
    }

    if (!res.ok) {
      throw new Error(`Clio API Error: ${res.status} - ${await res.text()}`);
    }

    return res.json();
  }
  throw new Error(`Clio API Failed after ${retries} retries.`);
}

async function* fetchAllPages(endpoint: string, token: string, fields: string = '') {
  const sep = endpoint.includes('?') ? '&' : '?';
  let url = `https://app.clio.com/api/v4/${endpoint}${sep}limit=200`;
  if (fields) url += `&fields=${fields}`;

  while (url) {
    const data = await clioFetch(url, token);
    yield data.data ?? [];
    url = data.meta?.paging?.next || '';
  }
}

export async function downloadPhysicalFile(docId: string, token: string, destinationPath: string, fileName = 'document.pdf') {
  const clioUrl = `https://app.clio.com/api/v4/documents/${docId}/download`;
  let urlToFetch = clioUrl;
  let headers: any = { Authorization: `Bearer ${token}` };

  try {
    const initialRes = await fetch(clioUrl, { headers, redirect: 'manual' });
    
    if (initialRes.status === 302 || initialRes.status === 303 || initialRes.status === 307) {
      urlToFetch = initialRes.headers.get('location') || urlToFetch;
      headers = {}; 
    } else if (initialRes.ok && initialRes.headers.get('content-type')?.includes('application/json')) {
      const data: any = await initialRes.json();
      if (data?.data?.url) {
        urlToFetch = data.data.url;
        headers = {};
      }
    }

    const fileRes = await fetch(urlToFetch, { headers });
    if (!fileRes.ok || !fileRes.body) {
       console.warn(`[Clio Sync] Failed to download physical file for doc ${docId}.`);
       return;
    }

    const buffer = await fileRes.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    
    await uploadFile(destinationPath, nodeBuffer);
  } catch (error) {
    console.warn(`[Clio Sync] Error downloading physical file ${docId}:`, error);
  }
}

export async function syncClioData(userId: string, accessToken: string, onProgress?: (msg: string, count?: number) => void, jobId?: string) {
  if (!accessToken) throw new Error('Clio is not connected.');
  const token = accessToken;

  let mattersCount = 0;
  let documentsCount = 0;

  onProgress?.('Fetching ALL Matters (open + closed)...');
  const matterFields = 'id,display_number,description,status,client{id,name},open_date,close_date';
  
  const clioMatterIds = new Set<string>();

  for (const statusFilter of ['open', 'closed', 'pending']) {
    try {
      for await (const mattersPage of fetchAllPages(`matters.json?status=${statusFilter}`, token, matterFields)) {
        await checkPause(jobId);
        if (!Array.isArray(mattersPage)) continue;
        for (const matter of mattersPage) {
          if (!matter?.id) continue;
          const matterStrId = matter.id.toString();
          clioMatterIds.add(matterStrId);
          
          let existingMatter = await prisma.matter.findFirst({
            where: { userId, source: 'clio', sourceId: matterStrId }
          });

          if (!existingMatter) {
            existingMatter = await prisma.matter.create({
              data: {
                userId,
                name: matter.display_number || `Matter ${matter.id}`,
                description: matter.description || 'Synced from Clio',
                status: matter.status || 'Open',
                source: 'clio',
                sourceId: matterStrId,
              }
            });
          }
          mattersCount++;
        }
        onProgress?.(`Synced ${mattersCount} matters (${statusFilter})...`);
      }
    } catch (err) {
      console.warn(`[Clio Sync] Error fetching ${statusFilter} matters:`, err);
    }
  }

  onProgress?.('Fetching ALL Documents & downloading physical files...');
  const docFields = 'id,name,content_type,size,matter{id},created_at,updated_at';
  const allDocsMap = new Map<string, any>();

  try {
    for await (const docsPage of fetchAllPages('documents.json', token, docFields)) {
      await checkPause(jobId);
      if (Array.isArray(docsPage)) {
        for (const doc of docsPage) {
          if (doc && doc.id && isTargetDoc(doc.name)) allDocsMap.set(doc.id.toString(), doc);
        }
      }
    }
  } catch (err) {}

  for (const matterId of Array.from(clioMatterIds)) {
    try {
      for await (const docsPage of fetchAllPages(`documents.json?matter_id=${matterId}`, token, docFields)) {
        await checkPause(jobId);
        if (Array.isArray(docsPage)) {
          for (const doc of docsPage) {
            if (doc && doc.id && isTargetDoc(doc.name)) allDocsMap.set(doc.id.toString(), doc);
          }
        }
      }
    } catch (err) {}
  }

  onProgress?.(`Total unique documents found: ${allDocsMap.size}. Starting physical file downloads...`);

  const allDocs = Array.from(allDocsMap.values());
  let downloadedCount = 0;

  for (const doc of allDocs) {
    await checkPause(jobId);
    
    const matterIdStr = doc.matter?.id ? doc.matter.id.toString() : null;
    let localMatterId = null;

    if (matterIdStr) {
      const dbMatter = await prisma.matter.findFirst({
        where: { userId, source: 'clio', sourceId: matterIdStr }
      });
      if (dbMatter) localMatterId = dbMatter.id;
    }

    const cleanFileName = (doc.name || 'document').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storagePath = `${userId}/clio/${doc.id}_${cleanFileName}`;

    let dbDoc = await prisma.document.findFirst({
      where: { userId, source: 'clio', sourceId: doc.id.toString() }
    });

    if (!dbDoc) {
      dbDoc = await prisma.document.create({
        data: {
          userId,
          matterId: localMatterId,
          name: doc.name || 'document.pdf',
          size: doc.size ? parseInt(doc.size, 10) : null,
          type: 'Document 📄',
          source: 'clio',
          sourceId: doc.id.toString(),
          storagePath,
          downloaded: true,
          downloadedAt: new Date()
        }
      });
    }

    documentsCount++;
    downloadedCount++;

    onProgress?.(`Downloading ${doc.name || 'document'} (${downloadedCount}/${allDocs.length})...`, downloadedCount);
    await downloadPhysicalFile(doc.id.toString(), token, storagePath, doc.name);

    if (downloadedCount % 5 === 0) await delay(200);
  }

  onProgress?.(`✅ Clio sync complete! ${mattersCount} matters, ${documentsCount} documents downloaded.`, documentsCount);
  return { mattersCount, documentsCount };
}
