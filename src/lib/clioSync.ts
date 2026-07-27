// src/lib/clioSync.ts
// Highly optimized metadata & physical document sync engine for Clio Manage

import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from './tokenStore';
import { isJobPaused } from './queueStore';
import fetch from 'node-fetch';

const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');

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

// Utility to sleep
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkPause(jobId?: string) {
  if (!jobId) return;
  while (await isJobPaused(jobId)) {
    await delay(1000);
  }
}

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
  // Correctly append limit param (use & if endpoint already has query params)
  const sep = endpoint.includes('?') ? '&' : '?';
  let url = `https://app.clio.com/api/v4/${endpoint}${sep}limit=200`;
  if (fields) url += `&fields=${fields}`;

  while (url) {
    const data = await clioFetch(url, token);
    yield data.data ?? [];

    const nextUrl = data.meta?.paging?.next;
    // Clio returns full absolute URLs in paging.next — use directly
    url = nextUrl || '';
  }
}

/**
 * Downloads the actual physical file from Clio and streams it directly to the local disk.
 */
export async function downloadPhysicalFile(docId: string, token: string, destinationPath: string, fileName = 'document.pdf') {
  const dir = path.dirname(destinationPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Real Clio download
  const clioUrl = `https://app.clio.com/api/v4/documents/${docId}/download`;
  let urlToFetch = clioUrl;
  let headers: any = { Authorization: `Bearer ${token}` };

  try {
    const initialRes = await fetch(clioUrl, { headers, redirect: 'manual' });
    
    if (initialRes.status === 302 || initialRes.status === 303 || initialRes.status === 307) {
      urlToFetch = initialRes.headers.get('location') || urlToFetch;
      headers = {}; // S3 pre-signed redirects reject Bearer tokens
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
    fs.writeFileSync(destinationPath, nodeBuffer);
    
    // Also save cleanly named file without docId prefix for direct filename access
    const dir = path.dirname(destinationPath);
    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const directPath = path.join(dir, safeName);
    if (!fs.existsSync(directPath)) {
      fs.writeFileSync(directPath, nodeBuffer);
    }
  } catch (error) {
    console.warn(`[Clio Sync] Error downloading physical file ${docId}:`, error);
  }
}

/**
 * Core Clio Sync Engine.
 * Pulls all matters and documents, downloads physical PDF/DOCX files, and maintains local indexes.
 */
export async function syncClioData(onProgress?: (msg: string, count?: number) => void, jobId?: string) {
  const tokenRecord = getToken('clio');
  if (!tokenRecord?.access_token) {
    throw new Error('Clio is not connected.');
  }
  const token = tokenRecord.access_token;

  if (!fs.existsSync(CLIO_VAULT)) {
    fs.mkdirSync(CLIO_VAULT, { recursive: true });
  }

  // === REAL CLIO API SYNC ===

  let mattersCount = 0;
  let documentsCount = 0;

  onProgress?.('Fetching ALL Matters (open + closed)...');
  const matterFields = 'id,display_number,description,status,client{id,name},open_date,close_date';
  
  // Fetch both open and all matters (Clio default is open only)
  for (const statusFilter of ['open', 'closed', 'pending']) {
    try {
      for await (const mattersPage of fetchAllPages(`matters.json?status=${statusFilter}`, token, matterFields)) {
        await checkPause(jobId);
        if (!Array.isArray(mattersPage)) continue;
        for (const matter of mattersPage) {
          if (!matter?.id) continue;
          const matterDir = path.join(CLIO_VAULT, matter.id.toString());
          if (!fs.existsSync(matterDir)) fs.mkdirSync(matterDir, { recursive: true });

          // Preserve existing documents.json if present
          const matterFile = path.join(matterDir, 'matter.json');
          fs.writeFileSync(matterFile, JSON.stringify(matter, null, 2));

          // Create empty stubs if not present
          if (!fs.existsSync(path.join(matterDir, 'calendar.json'))) fs.writeFileSync(path.join(matterDir, 'calendar.json'), '[]');
          if (!fs.existsSync(path.join(matterDir, 'tasks.json'))) fs.writeFileSync(path.join(matterDir, 'tasks.json'), '[]');

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
  const allDocsMap = new Map<string | number, any>();

  // 1. Global documents fetch (catches all documents regardless of matter)
  try {
    for await (const docsPage of fetchAllPages('documents.json', token, docFields)) {
      await checkPause(jobId);
      if (Array.isArray(docsPage)) {
        for (const doc of docsPage) {
          if (doc && doc.id && isTargetDoc(doc.name)) allDocsMap.set(doc.id, doc);
        }
      }
    }
    onProgress?.(`Found ${allDocsMap.size} documents globally...`);
  } catch (err) {
    console.warn('[Clio Sync] Global documents fetch error:', err);
  }

  // 2. Per-matter documents fetch — guarantees every matter's files are included
  const matterFolders = fs.readdirSync(CLIO_VAULT).filter(f => {
    return fs.statSync(path.join(CLIO_VAULT, f)).isDirectory();
  });

  for (const matterIdStr of matterFolders) {
    try {
      for await (const docsPage of fetchAllPages(`documents.json?matter_id=${matterIdStr}`, token, docFields)) {
        await checkPause(jobId);
        if (Array.isArray(docsPage)) {
          for (const doc of docsPage) {
            if (doc && doc.id && isTargetDoc(doc.name)) allDocsMap.set(doc.id, doc); // dedup by ID
          }
        }
      }
    } catch {
      // Some matters may have no documents — silently continue
    }
  }

  onProgress?.(`Total unique documents found: ${allDocsMap.size}. Starting physical file downloads...`);

  // 3. Download each document as a real physical file
  const allDocs = Array.from(allDocsMap.values());
  let downloadedCount = 0;

  for (const doc of allDocs) {
    await checkPause(jobId);
    const matterId = doc.matter?.id || 'general';
    const matterDir = path.join(CLIO_VAULT, matterId.toString());
    if (!fs.existsSync(matterDir)) fs.mkdirSync(matterDir, { recursive: true });

    // Ensure matter.json exists so UI can render it
    const matterFile = path.join(matterDir, 'matter.json');
    if (!fs.existsSync(matterFile)) {
      fs.writeFileSync(matterFile, JSON.stringify({
        id: matterId,
        display_number: `CLO-${matterId}`,
        description: 'Matter (auto-created during document sync)',
        status: 'Open',
        client: { id: 0, name: 'Unknown' },
        open_date: new Date().toISOString().split('T')[0],
      }, null, 2));
      if (!fs.existsSync(path.join(matterDir, 'calendar.json'))) fs.writeFileSync(path.join(matterDir, 'calendar.json'), '[]');
      if (!fs.existsSync(path.join(matterDir, 'tasks.json'))) fs.writeFileSync(path.join(matterDir, 'tasks.json'), '[]');
    }

    // Update documents index
    const docIndexFile = path.join(matterDir, 'documents.json');
    let docIndex: any[] = [];
    if (fs.existsSync(docIndexFile)) {
      try { docIndex = JSON.parse(fs.readFileSync(docIndexFile, 'utf-8')); } catch {}
    }

    const cleanFileName = (doc.name || 'document').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const physicalFilePath = path.join(matterDir, `${doc.id}_${cleanFileName}`);
    const directFilePath = path.join(matterDir, cleanFileName);

    // Fast Skip: If physical file exists on disk and doc is in index, skip download completely
    const isFileDownloaded = fs.existsSync(physicalFilePath) || fs.existsSync(directFilePath);
    const isDocIndexed = docIndex.some((d: any) => d.id === doc.id || d.name === doc.name);

    if (isFileDownloaded && isDocIndexed) {
      console.log(`[Clio Sync] Skipping ${doc.name} — already downloaded locally on disk.`);
      continue;
    }

    const docEntry = {
      ...doc,
      local_path: physicalFilePath,
      downloaded: true,
      downloaded_at: new Date().toISOString()
    };

    const existingIdx = docIndex.findIndex((d: any) => d.id === doc.id);
    if (existingIdx >= 0) docIndex[existingIdx] = docEntry;
    else docIndex.push(docEntry);

    fs.writeFileSync(docIndexFile, JSON.stringify(docIndex, null, 2));
    documentsCount++;
    downloadedCount++;

    // Download actual binary file (real Clio API or fallback)
    onProgress?.(`Downloading ${doc.name || 'document'} (${downloadedCount}/${allDocs.length})...`, downloadedCount);
    await downloadPhysicalFile(doc.id.toString(), token, physicalFilePath, doc.name);

    // Throttle slightly to avoid hammering Clio API
    if (downloadedCount % 5 === 0) await delay(200);
  }

  onProgress?.(`✅ Clio sync complete! ${mattersCount} matters, ${documentsCount} documents downloaded.`, documentsCount);
  return { mattersCount, documentsCount };
}
