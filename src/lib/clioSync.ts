// src/lib/clioSync.ts
// Highly optimized metadata sync engine for Clio
// Follows Lazy Loading architecture: only syncs metadata (JSON) to save storage and bandwidth.
// Documents are downloaded Just-In-Time (JIT) by the pipeline later.

import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from './tokenStore';

const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

// Utility to sleep (useful for rate limiting backoff)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generic fetcher that handles Clio's rate limits (HTTP 429) automatically with exponential backoff.
 */
async function clioFetch(url: string, token: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 429) {
      // Rate limited. Clio usually provides a Retry-After header.
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

/**
 * Fetches all pages of a specific Clio endpoint and yields them to prevent memory bloat.
 */
async function* fetchAllPages(endpoint: string, token: string, fields: string = '') {
  let url = `https://app.clio.com/api/v4/${endpoint}?limit=200`;
  if (fields) url += `&fields=${fields}`;

  while (url) {
    const data = await clioFetch(url, token);
    yield data.data; // yield the array of records for this page

    // Clio v4 pagination uses meta.paging.next
    const nextUrl = data.meta?.paging?.next;
    url = nextUrl || '';
  }
}

/**
 * Downloads the actual physical file from Clio and streams it directly to the local disk.
 */
async function downloadPhysicalFile(docId: string, token: string, destinationPath: string) {
  if (fs.existsSync(destinationPath)) return; // Skip if already downloaded

  const clioUrl = `https://app.clio.com/api/v4/documents/${docId}/download`;
  let urlToFetch = clioUrl;
  let headers: any = { Authorization: `Bearer ${token}` };

  try {
    // Clio sometimes redirects or provides a JSON with the URL
    const initialRes = await fetch(clioUrl, { headers, redirect: 'manual' });
    
    if (initialRes.status === 302 || initialRes.status === 303 || initialRes.status === 307) {
      urlToFetch = initialRes.headers.get('location') || urlToFetch;
      headers = {}; // AWS S3 redirects usually reject the Bearer token
    } else if (initialRes.ok && initialRes.headers.get('content-type')?.includes('application/json')) {
      const data = await initialRes.json();
      if (data?.data?.url) {
        urlToFetch = data.data.url;
        headers = {};
      }
    }

    const fileRes = await fetch(urlToFetch, { headers });
    if (!fileRes.ok || !fileRes.body) {
       console.warn(`[Clio Sync] Failed to download physical file for doc ${docId}`);
       return;
    }

    // @ts-ignore (Node 18 fetch body is a Web stream, compatible with pipeline in newer node, or we can use ArrayBuffer)
    const buffer = await fileRes.arrayBuffer();
    fs.writeFileSync(destinationPath, Buffer.from(buffer));
  } catch (error) {
    console.warn(`[Clio Sync] Error downloading physical file ${docId}:`, error);
  }
}

/**
 * The core Sync Engine.
 * Designed to be highly scalable. Pulls all matters, then pulls all documents, 
 * grouping them into the local file system.
 */
export async function syncClioData(onProgress?: (msg: string, count?: number) => void) {
  const tokenRecord = getToken('clio');
  if (!tokenRecord?.access_token) {
    throw new Error('Clio is not connected.');
  }
  const token = tokenRecord.access_token;

  // Ensure vault directory exists
  if (!fs.existsSync(CLIO_VAULT)) {
    fs.mkdirSync(CLIO_VAULT, { recursive: true });
  }

  let mattersCount = 0;
  let documentsCount = 0;

  // 1. Sync Matters
  onProgress?.('Fetching Matters metadata...');
  
  // We request specific fields to ensure we get exactly what the AI needs, keeping the payload small.
  const matterFields = 'id,display_number,description,status,client{id,name},open_date,close_date';
  
  for await (const mattersPage of fetchAllPages('matters.json', token, matterFields)) {
    for (const matter of mattersPage) {
      const matterDir = path.join(CLIO_VAULT, matter.id.toString());
      if (!fs.existsSync(matterDir)) fs.mkdirSync(matterDir, { recursive: true });

      // Save matter metadata
      fs.writeFileSync(
        path.join(matterDir, 'matter.json'),
        JSON.stringify(matter, null, 2)
      );
      mattersCount++;
    }
    onProgress?.(`Synced ${mattersCount} matters...`);
  }

  // 2. Sync Documents (Metadata only)
  onProgress?.('Fetching Documents metadata...');
  
  // Requesting document metadata. We crucially need the matter {id} to know where to put it.
  const docFields = 'id,name,content_type,size,matter{id},created_at,updated_at';

  for await (const docsPage of fetchAllPages('documents.json', token, docFields)) {
    for (const doc of docsPage) {
      // If the document belongs to a matter, store it in that matter's folder.
      // Otherwise, store it in a 'general' folder.
      const matterId = doc.matter?.id || 'general';
      const matterDir = path.join(CLIO_VAULT, matterId.toString());
      
      if (!fs.existsSync(matterDir)) fs.mkdirSync(matterDir, { recursive: true });

      // Append this document to a localized documents index for that matter
      const docIndexFile = path.join(matterDir, 'documents.json');
      let docIndex = [];
      if (fs.existsSync(docIndexFile)) {
        docIndex = JSON.parse(fs.readFileSync(docIndexFile, 'utf-8'));
      }
      
      // Update or push
      const existingIdx = docIndex.findIndex((d: any) => d.id === doc.id);
      if (existingIdx >= 0) docIndex[existingIdx] = doc;
      else docIndex.push(doc);

      fs.writeFileSync(docIndexFile, JSON.stringify(docIndex, null, 2));
      documentsCount++;

      // === NEW: Download the actual physical file ===
      const cleanFileName = (doc.name || 'document').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const physicalFilePath = path.join(matterDir, `${doc.id}_${cleanFileName}`);
      await downloadPhysicalFile(doc.id.toString(), token, physicalFilePath);

    }
    onProgress?.(`Synced metadata and downloaded files for ${documentsCount} documents...`);
  }

  onProgress?.('Sync complete!', documentsCount);
  return { mattersCount, documentsCount };
}
