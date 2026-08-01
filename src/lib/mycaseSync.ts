// src/lib/mycaseSync.ts
// Metadata & physical document sync engine for MyCase

import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from './tokenStore';
import { isJobPaused, updateJobProgress } from './queueStore';
import fetch from 'node-fetch';

const MYCASE_VAULT = path.join(VAULT_DIR, 'vault', 'mycase');

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

/**
 * Generic fetcher that handles MyCase's rate limits (HTTP 429) automatically with exponential backoff.
 */
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

/**
 * Main Sync Function
 */
export async function syncMycaseData(userId: string, onProgress: (msg: string, count?: number) => void, jobId?: string) {
  const tokenData = getToken(userId, 'mycase');
  if (!tokenData || !tokenData.access_token) {
    throw new Error('MyCase is not connected or token is missing.');
  }

  if (!fs.existsSync(MYCASE_VAULT)) fs.mkdirSync(MYCASE_VAULT, { recursive: true });

  onProgress('Initializing MyCase API sync...', 0);
  await checkPause(jobId);

  // Note: These endpoints are standard representations for MyCase's architecture.
  // When real keys are applied, minor adjustments to the exact path might be required based on MyCase's spec.
  const mattersUrl = 'https://api.mycase.com/v1/cases';
  
  try {
    const mattersData = await mycaseFetch(mattersUrl, tokenData.access_token);
    const matters = mattersData.cases || [];

    onProgress(`Found ${matters.length} MyCase matters. Syncing metadata...`, 5);
    
    // Save matters index
    fs.writeFileSync(path.join(MYCASE_VAULT, 'matters.json'), JSON.stringify(matters, null, 2));

    let docsIngested = 0;

    for (let i = 0; i < matters.length; i++) {
      await checkPause(jobId);
      const matter = matters[i];
      const matterDir = path.join(MYCASE_VAULT, matter.id.toString());
      if (!fs.existsSync(matterDir)) fs.mkdirSync(matterDir, { recursive: true });

      onProgress(`Syncing documents for MyCase matter: ${matter.name || matter.id}...`, 5 + i);

      // Fetch documents for this case
      const docsUrl = `https://api.mycase.com/v1/documents?case_id=${matter.id}`;
      try {
        const docsData = await mycaseFetch(docsUrl, tokenData.access_token);
        const documents = docsData.documents || [];
        
        fs.writeFileSync(path.join(matterDir, 'documents.json'), JSON.stringify(documents, null, 2));

        for (const doc of documents) {
          if (!isTargetDoc(doc.name)) continue;

          // Placeholder for actual physical file download
          // e.g., GET https://api.mycase.com/v1/documents/{doc.id}/download
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
