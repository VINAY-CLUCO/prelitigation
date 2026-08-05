// src/lib/queueWorker.ts
// Background task worker running as a singleton interval loop inside Next.js Node process
// Implements real-time background sync pipelines for Clio Manage, Google Drive, Gmail, Dropbox, OneDrive, and Outlook

import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { 
  getNextJob, 
  updateJobProgress, 
  completeJob, 
  failJob,
  isJobPaused
} from './queueStore';
import { syncClioData, downloadPhysicalFile } from './clioSync';
import { syncMycaseData } from './mycaseSync';
import { syncFilevineData } from './filevineSync';
import { uploadFile } from './storage';
import { prisma } from './prisma';


let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

// Simple AI triage rule
function triageDocument(filename: string): string {
  const name = filename.toLowerCase();
  if (name.includes('medical') || name.includes('med') || name.includes('hospital') || name.includes('clinic')) return 'Medical Record 🏥';
  if (name.includes('police') || name.includes('report') || name.includes('accident')) return 'Police Report 🚓';
  if (name.includes('contract') || name.includes('agreement') || name.includes('nda')) return 'Contract 📝';
  if (name.includes('invoice') || name.includes('bill') || name.includes('receipt') || name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'Financial & Data 📊';
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'Evidence / Image 🖼️';
  if (name.includes('demand') || name.includes('settlement')) return 'Demand Letter ⚖️';
  return 'Uncategorized Document 📄';
}

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

async function checkPause(jobId: string) {
  while (await isJobPaused(jobId)) {
    await delay(1000);
  }
}
async function fetchWithRetry(url: string, options: any, jobId: string, maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    await checkPause(jobId);
    const res = await fetch(url, options);
    if (res.status === 429) {
      attempt++;
      const retryAfter = res.headers.get('Retry-After');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
      await updateJobProgress(jobId, { percent: 10, completed: 0, total: 0, msg: `Rate limit hit. Pausing for ${Math.round(waitMs / 1000)}s...` });
      await delay(waitMs);
      continue;
    }
    return res;
  }
  throw new Error(`Failed after ${maxRetries} retries due to rate limiting.`);
}

async function executeGoogleWithRetry<T>(operation: () => Promise<T>, jobId: string, maxRetries = 5): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    await checkPause(jobId);
    try {
      return await operation();
    } catch (err: any) {
      if (err.code === 429 || (err.response && err.response.status === 429)) {
        attempt++;
        const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await updateJobProgress(jobId, { percent: 10, completed: 0, total: 0, msg: `Google Rate limit hit. Pausing for ${Math.round(waitMs / 1000)}s...` });
        await delay(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${maxRetries} retries due to rate limiting.`);
}

export function startQueueWorker() {
  if (workerInterval) return; // Already running

  console.log('[Queue Worker] Starting background task worker daemon...');

  workerInterval = setInterval(async () => {
    if (isProcessing) return; // Prevent overlapping runs
    
    try {
      const job = await getNextJob();
      if (!job) return; // No jobs to process

      isProcessing = true;
      console.log(`[Queue Worker] Processing Job ID: ${job.id} (Type: ${job.type})`);
      
      try {
        const userId = job.data?.userId;
        if (!userId) {
          throw new Error('Job missing userId');
        }

        const providerName = job.type.split('-')[0];
        let integration = await prisma.integration.findUnique({
          where: { userId_platform: { userId, platform: providerName } }
        });
        
        let accessToken = integration?.accessToken;

        // Auto-refresh Google tokens if expired (add 5-minute buffer)
        if (integration && (providerName === 'gdrive' || providerName === 'gmail') && integration.expiresAt && integration.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
            if (integration.refreshToken) {
                try {
                    const { refreshGoogleToken } = await import('./googleOAuth');
                    const creds = await refreshGoogleToken(integration.refreshToken);
                    if (creds.access_token) {
                        accessToken = creds.access_token;
                        integration = await prisma.integration.update({
                            where: { id: integration.id },
                            data: {
                                accessToken,
                                expiresAt: creds.expiry_date ? new Date(creds.expiry_date) : null
                            }
                        });
                        console.log(`[Queue Worker] Refreshed expired Google token for user ${userId} (${providerName})`);
                    }
                } catch (err) {
                    console.error(`[Queue Worker] Failed to refresh Google token for user ${userId}:`, err);
                }
            }
        }

        if (job.type === 'clio-matter-sync') {
          await syncClioData(userId, accessToken || '', (msg, count) => {
            updateJobProgress(job.id, {
              percent: count ? Math.min(100, Math.round((count / 15) * 100)) : 10,
              completed: count ?? 0,
              total: 15,
              msg
            });
          }, job.id);
          await completeJob(job.id);

        } else if (job.type === 'mycase-sync') {
          await syncMycaseData(userId, (msg, count) => {
            updateJobProgress(job.id, {
              percent: count ? Math.min(100, Math.round((count / 15) * 100)) : 10,
              completed: count ?? 0,
              total: 15,
              msg
            });
          }, job.id);
          await completeJob(job.id);

        } else if (job.type === 'filevine-sync') {
          await syncFilevineData(userId, (msg, count) => {
            updateJobProgress(job.id, {
              percent: count ? Math.min(100, Math.round((count / 15) * 100)) : 10,
              completed: count ?? 0,
              total: 15,
              msg
            });
          }, job.id);
          await completeJob(job.id);

        } else if (job.type === 'clio-document-ingest') {
          const { documentId, name, matterId, token: docToken, size, content_type } = job.data;
          await updateJobProgress(job.id, { percent: 10, completed: 0, total: 1, msg: `Downloading ${name} from Clio...` });

          const cleanFileName = (name || 'document').replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const storagePath = `${userId}/clio/${documentId}_${cleanFileName}`;
          
          await downloadPhysicalFile(documentId.toString(), docToken || '', storagePath, name || 'document.pdf');
          await updateJobProgress(job.id, { percent: 60, completed: 0, total: 1, msg: `Parsing metadata & indexing ${name}...` });
          
          const aiTag = triageDocument(name || '');

          let dbMatter = await prisma.matter.findFirst({
            where: { userId, source: 'clio', sourceId: matterId.toString() }
          });

          let dbDoc = await prisma.document.findFirst({
            where: { userId, source: 'clio', sourceId: documentId.toString() }
          });

          if (!dbDoc) {
            await prisma.document.create({
              data: {
                userId,
                matterId: dbMatter?.id,
                name: name || 'document.pdf',
                size: size ? parseInt(size, 10) : null,
                type: content_type || 'Document 📄',
                source: 'clio',
                sourceId: documentId.toString(),
                storagePath,
                downloaded: true,
                downloadedAt: new Date()
              }
            });
          } else {
            await prisma.document.update({
              where: { id: dbDoc.id },
              data: {
                storagePath,
                downloaded: true,
                downloadedAt: new Date(),
                size: size ? parseInt(size, 10) : dbDoc.size
              }
            });
          }
          await completeJob(job.id);

        } else if (job.type === 'gdrive-sync') {
          await syncGoogleDrive(job.id, userId, accessToken || '');
          await completeJob(job.id);

        } else if (job.type === 'gmail-sync') {
          await syncGmail(job.id, userId, accessToken || '');
          await completeJob(job.id);

        } else if (job.type === 'dropbox-sync') {
          await syncDropbox(job.id, userId, accessToken || '');
          await completeJob(job.id);

        } else if (job.type === 'onedrive-sync') {
          await syncOneDrive(job.id, userId, accessToken || '');
          await completeJob(job.id);

        } else if (job.type === 'outlook-sync') {
          await syncOutlook(job.id, userId, accessToken || '');
          await completeJob(job.id);


        } else {
          throw new Error(`Unknown job type: ${job.type}`);
        }
        
        console.log(`[Queue Worker] Successfully completed Job ID: ${job.id}`);
      } catch (err: any) {
        console.error(`[Queue Worker] Job failed: ${job.id}`, err);
        await failJob(job.id, err?.message || 'Unknown processing error');
      } finally {
        isProcessing = false;
      }
    } catch (err) {
      console.error('[Queue Worker] Error in task fetching loop:', err);
      isProcessing = false;
    }
  }, 1000);
}

export function stopQueueWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[Queue Worker] Background task worker daemon stopped.');
  }
}

// ─── Real Ingestion Helper Processes ─────────────────────────────────

async function syncGoogleDrive(jobId: string, userId: string, accessToken: string) {
  if (!accessToken) {
    await updateJobProgress(jobId, { percent: 100, completed: 0, total: 0, msg: 'Missing access token for Google Drive.' });
    return;
  }

  // Real Google Drive logic
  await updateJobProgress(jobId, { percent: 10, completed: 0, total: 10, msg: 'Scanning all Google Drive folders recursively...' });
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth });

  const files: any[] = [];
  let pageToken: string | undefined = undefined;

  try {
    do {
      const res: any = await executeGoogleWithRetry(() => drive.files.list({
        pageSize: 100,
        pageToken: pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
        q: "trashed = false and (mimeType = 'application/pdf' or mimeType = 'application/msword' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'image/png' or mimeType = 'image/jpeg' or mimeType = 'text/csv' or mimeType = 'application/vnd.ms-excel' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'text/plain')",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      }), jobId);
      if (res.data.files) files.push(...res.data.files);
      pageToken = res.data.nextPageToken || undefined;
      
      await updateJobProgress(jobId, { 
        percent: 10, 
        completed: files.length, 
        total: 0, 
        msg: `Scanning Google Drive... Found ${files.length} documents to sync.` 
      });
    } while (pageToken);
  } catch (err) {
    console.error('[Google Drive Sync] Folder scan error:', err);
  }
  let count = 0;
  for (const file of files) {
    await checkPause(jobId);
    count++;
    const fileId = file.id || `g_${Date.now()}_${count}`;
    let fileName = file.name || 'untitled_drive_file';
    const isGoogleDoc = file.mimeType?.startsWith('application/vnd.google-apps.');

    if (isGoogleDoc && !fileName.endsWith('.pdf')) {
      fileName += '.pdf';
    }

    await updateJobProgress(jobId, {
      percent: Math.round((count / files.length) * 100),
      completed: count,
      total: files.length,
      msg: `Downloading ${fileName}...`
    });

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storagePath = `${userId}/gdrive/${fileId}_${safeName}`;
    
    let dbDoc = await prisma.document.findFirst({
      where: { userId, source: 'gdrive', sourceId: fileId }
    });

    if (dbDoc?.downloaded) {
      console.log(`[Google Drive Sync] Skipping ${fileName} — already downloaded.`);
      continue;
    }

    try {
      let buffer: Buffer;
      if (isGoogleDoc) {
        const exportRes = await executeGoogleWithRetry(() => drive.files.export({ fileId: fileId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' }), jobId);
        buffer = Buffer.from(exportRes.data as ArrayBuffer);
      } else {
        const fileRes = await executeGoogleWithRetry(() => drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'arraybuffer' }), jobId);
        buffer = Buffer.from(fileRes.data as ArrayBuffer);
      }

      await uploadFile(storagePath, buffer);

      if (!dbDoc) {
        await prisma.document.create({
          data: {
            userId,
            name: fileName,
            size: buffer.length,
            type: 'Document',
            source: 'gdrive',
            sourceId: fileId,
            storagePath,
            downloaded: true,
            downloadedAt: new Date()
          }
        });
      } else {
        await prisma.document.update({
          where: { id: dbDoc.id },
          data: {
            size: buffer.length,
            storagePath,
            downloaded: true,
            downloadedAt: new Date()
          }
        });
      }
    } catch (err) {
      console.error(`[Google Drive Sync] Failed to download ${fileName}:`, err);
    }
  }
}

async function syncGmail(jobId: string, userId: string, accessToken: string) {
  if (!accessToken) {
    await updateJobProgress(jobId, { percent: 100, completed: 0, total: 0, msg: 'Missing access token for Gmail.' });
    return;
  }

  await updateJobProgress(jobId, { percent: 10, completed: 0, total: 10, msg: 'Reading all Gmail messages & folders...' });
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth });

  const messages: any[] = [];
  let pageToken: string | undefined = undefined;

  try {
    do {
      const res: any = await executeGoogleWithRetry(() => gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,
        pageToken: pageToken,
        q: 'has:attachment (filename:pdf OR filename:doc OR filename:docx OR filename:png OR filename:jpg OR filename:jpeg OR filename:csv OR filename:xlsx OR filename:txt)'
      }), jobId);
      if (res.data.messages) {
        messages.push(...res.data.messages);
      }
      pageToken = res.data.nextPageToken || undefined;

      await updateJobProgress(jobId, { 
        percent: 10, 
        completed: messages.length, 
        total: 0, 
        msg: `Scanning Gmail... Found ${messages.length} matching emails.` 
      });
    } while (pageToken && messages.length < 10000);
  } catch (err) {
    console.error('[Gmail Sync] Failed to list messages:', err);
  }

  // Helper function to extract all attachment metadata recursively from MIME payload
  function extractAttachmentParts(payload: any): Array<{ filename: string; attachmentId?: string; data?: string; mimeType?: string }> {
    const attachments: Array<{ filename: string; attachmentId?: string; data?: string; mimeType?: string }> = [];
    function traverse(part: any) {
      if (!part) return;
      if (part.filename && part.filename.trim().length > 0 && isTargetDoc(part.filename)) {
        if (part.body && (part.body.attachmentId || part.body.data)) {
          attachments.push({
            filename: part.filename,
            attachmentId: part.body.attachmentId,
            data: part.body.data,
            mimeType: part.mimeType
          });
        }
      }
      if (part.parts && Array.isArray(part.parts)) {
        for (const child of part.parts) {
          traverse(child);
        }
      }
    }
    traverse(payload);
    return attachments;
  }

  let count = 0;
  for (const msg of messages) {
    await checkPause(jobId);
    count++;
    await updateJobProgress(jobId, {
      percent: Math.round((count / messages.length) * 100),
      completed: count,
      total: messages.length,
      msg: `Scanning email message ${count} of ${messages.length}...`
    });

    try {
      const msgDetails = await executeGoogleWithRetry(() => gmail.users.messages.get({ userId: 'me', id: msg.id! }), jobId);
      const attachments = extractAttachmentParts(msgDetails.data.payload);

      const headers = msgDetails.data.payload?.headers || [];
      const emailSubject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';

      // Download and Index Attachments
      for (const att of attachments) {
        try {
          const rawDocId = att.attachmentId || `${msg.id}_${att.filename}`;
          const safeName = att.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const storagePath = `${userId}/gmail/${rawDocId}_${safeName}`;

          let dbDoc = await prisma.document.findFirst({
            where: { userId, source: 'gmail', sourceId: rawDocId }
          });

          if (dbDoc?.downloaded) {
            console.log(`[Gmail Sync] Skipping ${att.filename} — already downloaded.`);
            continue;
          }

          let base64Data = att.data || '';

          if (!base64Data && att.attachmentId) {
            const attach = await executeGoogleWithRetry(() => gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: msg.id!,
              id: att.attachmentId!
            }), jobId);
            base64Data = attach.data.data || '';
          }

          if (!base64Data) continue;

          const buffer = Buffer.from(base64Data, 'base64url');
          await uploadFile(storagePath, buffer);

          if (!dbDoc) {
            await prisma.document.create({
              data: {
                userId,
                name: att.filename,
                size: buffer.length,
                type: 'Email Attachment',
                source: 'gmail',
                sourceId: rawDocId,
                storagePath,
                downloaded: true,
                downloadedAt: new Date()
              }
            });
          } else {
            await prisma.document.update({
              where: { id: dbDoc.id },
              data: { storagePath, size: buffer.length, downloaded: true, downloadedAt: new Date() }
            });
          }

        } catch (attErr) {
          console.error(`[Gmail Sync] Failed to download attachment ${att.filename}:`, attErr);
        }
      }
    } catch (msgErr) {
      console.error(`[Gmail Sync] Failed to inspect message ${msg.id}:`, msgErr);
    }
  }
}

async function syncDropbox(jobId: string, userId: string, accessToken: string) {
  if (!accessToken) {
    await updateJobProgress(jobId, { percent: 100, completed: 0, total: 0, msg: 'Missing access token for Dropbox.' });
    return;
  }

  await updateJobProgress(jobId, { percent: 10, completed: 0, total: 10, msg: 'Scanning all Dropbox folders recursively...' });
  const entries: any[] = [];
  try {
    let listRes = await fetchWithRetry('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: '', recursive: true })
    }, jobId);

    let listData = await listRes.json();
    if (listData.entries) {
      entries.push(...listData.entries.filter((e: any) => e['.tag'] === 'file' && isTargetDoc(e.name)));
    }
    
    await updateJobProgress(jobId, { percent: 10, completed: entries.length, total: 0, msg: `Scanning Dropbox... Found ${entries.length} documents to sync.` });

    while (listData.has_more && listData.cursor) {
      const contRes = await fetchWithRetry('https://api.dropboxapi.com/2/files/list_folder/continue', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cursor: listData.cursor })
      }, jobId);
      listData = await contRes.json();
      if (listData.entries) {
        entries.push(...listData.entries.filter((e: any) => e['.tag'] === 'file' && isTargetDoc(e.name)));
      }
      await updateJobProgress(jobId, { percent: 10, completed: entries.length, total: 0, msg: `Scanning Dropbox... Found ${entries.length} documents to sync.` });
    }
  } catch (err) {
    console.error('[Dropbox Sync] Recursive folder scan error:', err);
  }

  let count = 0;
  for (const file of entries) {
    await checkPause(jobId);
    count++;
    await updateJobProgress(jobId, {
      percent: Math.round((count / entries.length) * 100),
      completed: count,
      total: entries.length,
      msg: `Downloading ${file.name}...`
    });

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storagePath = `${userId}/dropbox/${file.id}_${safeName}`;

      let dbDoc = await prisma.document.findFirst({
        where: { userId, source: 'dropbox', sourceId: file.id }
      });

      if (dbDoc?.downloaded) continue;

      const downRes = await fetchWithRetry('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: file.path_lower })
        }
      }, jobId);

      if (downRes.ok) {
        const buffer = Buffer.from(await downRes.arrayBuffer());
        await uploadFile(storagePath, buffer);

        if (!dbDoc) {
          await prisma.document.create({
            data: {
              userId,
              name: file.name,
              size: file.size,
              type: 'Document',
              source: 'dropbox',
              sourceId: file.id,
              storagePath,
              downloaded: true,
              downloadedAt: new Date()
            }
          });
        } else {
          await prisma.document.update({
            where: { id: dbDoc.id },
            data: { storagePath, downloaded: true, downloadedAt: new Date() }
          });
        }
      }
    } catch {}
  }
}

async function syncOneDrive(jobId: string, userId: string, accessToken: string) {
  if (!accessToken) {
    await updateJobProgress(jobId, { percent: 100, completed: 0, total: 0, msg: 'Missing access token for OneDrive.' });
    return;
  }

  await updateJobProgress(jobId, { percent: 10, completed: 0, total: 10, msg: 'Searching all OneDrive folders recursively...' });
  
  async function fetchFolderChildren(folderId: string): Promise<any[]> {
    const items: any[] = [];
    let nextUrl: string | undefined = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$top=100`;

    while (nextUrl) {
      try {
        const res: any = await fetchWithRetry(nextUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }, jobId);
        const data: any = await res.json();
        if (data.value && Array.isArray(data.value)) {
          for (const item of data.value) {
            if (item.file && isTargetDoc(item.name)) {
              items.push(item);
              await updateJobProgress(jobId, { percent: 10, completed: items.length, total: 0, msg: `Searching OneDrive... Found ${item.name}` });
            } else if (item.folder) {
              const subItems = await fetchFolderChildren(item.id);
              items.push(...subItems);
            }
          }
        }
        nextUrl = data['@odata.nextLink'] || undefined;
      } catch {
        nextUrl = undefined;
      }
    }
    return items;
  }

  const files = await fetchFolderChildren('root');

  let count = 0;
  for (const file of files) {
    await checkPause(jobId);
    count++;
    await updateJobProgress(jobId, {
      percent: Math.round((count / files.length) * 100),
      completed: count,
      total: files.length,
      msg: `Downloading ${file.name}...`
    });

    try {
      const downUrl = file['@microsoft.graph.downloadUrl'];
      if (downUrl) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const storagePath = `${userId}/onedrive/${file.id}_${safeName}`;

        let dbDoc = await prisma.document.findFirst({
          where: { userId, source: 'onedrive', sourceId: file.id }
        });

        if (dbDoc?.downloaded) continue;

        const fileRes = await fetchWithRetry(downUrl, {}, jobId);
        const buffer = Buffer.from(await fileRes.arrayBuffer());
        await uploadFile(storagePath, buffer);

        if (!dbDoc) {
          await prisma.document.create({
            data: {
              userId,
              name: file.name,
              size: file.size,
              type: 'Document',
              source: 'onedrive',
              sourceId: file.id,
              storagePath,
              downloaded: true,
              downloadedAt: new Date()
            }
          });
        } else {
          await prisma.document.update({
            where: { id: dbDoc.id },
            data: { storagePath, downloaded: true, downloadedAt: new Date() }
          });
        }
      }
    } catch {}
  }
}

async function syncOutlook(jobId: string, userId: string, accessToken: string) {
  if (!accessToken) {
    await updateJobProgress(jobId, { percent: 100, completed: 0, total: 0, msg: 'Missing access token for Outlook.' });
    return;
  }

  await updateJobProgress(jobId, { percent: 20, completed: 0, total: 1, msg: 'Querying Microsoft Outlook mail...' });
  const messages: any[] = [];
  let nextLink: string | undefined = 'https://graph.microsoft.com/v1.0/me/messages?$filter=hasAttachments eq true&$expand=attachments&$top=100';

  try {
    while (nextLink && messages.length < 10000) {
      const mailRes = await fetchWithRetry(nextLink, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }, jobId);
      const mailData = await mailRes.json();
      if (mailData.value) {
        messages.push(...mailData.value);
      }
      nextLink = mailData['@odata.nextLink'];
      
      await updateJobProgress(jobId, { percent: 20, completed: messages.length, total: 0, msg: `Querying Microsoft Outlook... Found ${messages.length} matching emails.` });
    }
  } catch (err) {
    console.error('[Outlook Sync] Failed to list messages:', err);
  }

  let count = 0;
  for (const msg of messages) {
    await checkPause(jobId);
    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        if (att['@odata.type'] === '#microsoft.graph.fileAttachment' && isTargetDoc(att.name)) {
          count++;
          const safeName = att.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const storagePath = `${userId}/outlook/${att.id}_${safeName}`;
          
          let dbDoc = await prisma.document.findFirst({
            where: { userId, source: 'outlook', sourceId: att.id }
          });

          if (dbDoc?.downloaded) continue;

          const buffer = Buffer.from(att.contentBytes || '', 'base64');
          await uploadFile(storagePath, buffer);

          if (!dbDoc) {
            await prisma.document.create({
              data: {
                userId,
                name: att.name,
                size: att.size,
                type: 'Email Attachment',
                source: 'outlook',
                sourceId: att.id,
                storagePath,
                downloaded: true,
                downloadedAt: new Date()
              }
            });
          } else {
            await prisma.document.update({
              where: { id: dbDoc.id },
              data: { storagePath, downloaded: true, downloadedAt: new Date() }
            });
          }
        }
      }
    }
  }
}
