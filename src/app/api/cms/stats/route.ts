import { auth } from '@clerk/nextjs/server';
// src/app/api/cms/stats/route.ts
// Computes live pipeline analytics, recent documents, and event logs from local folders and task queue state

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from '@/lib/tokenStore';
import { readQueue } from '@/lib/queueStore';

export const dynamic = 'force-dynamic';


let cachedStats: { timestamp: number; payload: any } | null = null;
const CACHE_TTL_MS = 2000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const now = Date.now();
  if (cachedStats && (now - cachedStats.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cachedStats.payload);
  }

  const queue = await readQueue();
  
  let totalDocs = 0;
  let processedDocs = 0;
  let flaggedDocs = 0;
  
  const documentsList: any[] = [];
  
  // Helper to scan a nested vault provider directory (matters)
  const scanVault = (vaultPath: string, source: string) => {
    if (!fs.existsSync(vaultPath)) return;
    const folders = fs.readdirSync(vaultPath);
    for (const folder of folders) {
      const docsFile = path.join(vaultPath, folder, 'documents.json');
      if (fs.existsSync(docsFile)) {
        try {
          const rawData = fs.readFileSync(docsFile, 'utf-8');
          if (!rawData.trim()) continue;
          const docs = JSON.parse(rawData);
          if (!Array.isArray(docs)) continue;

          for (const d of docs) {
            totalDocs++;
            const isFlagged = !d.ai_tag || d.ai_tag.includes('Uncategorized') || d.ai_tag.includes('⚠');
            if (isFlagged) {
              flaggedDocs++;
            } else {
              processedDocs++;
            }
            
            documentsList.push({
              id: d.id ? String(d.id) : `doc_${Date.now()}_${Math.random()}`,
              name: typeof d.name === 'string' ? d.name : 'Untitled Document',
              type: typeof d.ai_tag === 'string' ? d.ai_tag : 'Document 📄',
              source: source,
              date: d.downloaded_at ? new Date(d.downloaded_at).toLocaleString() : 'Just now',
              downloadedAtRaw: typeof d.downloaded_at === 'string' ? d.downloaded_at : '',
              status: isFlagged ? 'flagged' : 'complete',
              size: typeof d.size === 'number' ? `${(d.size / 1024).toFixed(0)} KB` : (typeof d.size === 'string' ? d.size : '120 KB'),
              emailSender: typeof d.emailSender === 'string' ? d.emailSender : null,
              emailSubject: typeof d.emailSubject === 'string' ? d.emailSubject : null,
              matterId: folder // Only applicable for nested vaults like Clio
            });
          }
        } catch (e) {
          console.error(`[CMS Stats] Failed to parse ${docsFile}:`, e);
        }
      }
    }
  };

  // Helper to scan a direct vault provider directory (files stored directly in documents.json)
  const scanDirectVault = (vaultPath: string, source: string) => {
    if (!fs.existsSync(vaultPath)) return;
    const docsFile = path.join(vaultPath, 'documents.json');
    if (fs.existsSync(docsFile)) {
      try {
        const rawData = fs.readFileSync(docsFile, 'utf-8');
        if (!rawData.trim()) return;
        const docs = JSON.parse(rawData);
        if (!Array.isArray(docs)) return;

        for (const d of docs) {
          totalDocs++;
          const isFlagged = !d.ai_tag || d.ai_tag.includes('Uncategorized') || d.ai_tag.includes('⚠');
          if (isFlagged) {
            flaggedDocs++;
          } else {
            processedDocs++;
          }
          
          documentsList.push({
            id: d.id ? String(d.id) : `doc_${Date.now()}_${Math.random()}`,
            name: typeof d.name === 'string' ? d.name : 'Untitled Document',
            type: typeof d.type === 'string' ? d.type : (typeof d.ai_tag === 'string' ? d.ai_tag : 'Document 📄'),
            ai_tag: typeof d.ai_tag === 'string' ? d.ai_tag : 'Document 📄',
            source: source,
            date: d.downloaded_at ? new Date(d.downloaded_at).toLocaleString() : 'Just now',
            downloadedAtRaw: typeof d.downloaded_at === 'string' ? d.downloaded_at : '',
            status: isFlagged ? 'flagged' : 'complete',
            size: typeof d.size === 'number' ? `${(d.size / 1024).toFixed(0)} KB` : (typeof d.size === 'string' ? d.size : '120 KB'),
            emailSender: typeof d.emailSender === 'string' ? d.emailSender : null,
            emailSubject: typeof d.emailSubject === 'string' ? d.emailSubject : null,
            snippet: typeof d.snippet === 'string' ? d.snippet : null,
            attachments: Array.isArray(d.attachments) ? d.attachments : []
          });
        }
      } catch (e) {
        console.error(`[CMS Stats] Failed to parse ${docsFile}:`, e);
      }
    }
  };

  // Scan case managers
  scanVault(path.join(VAULT_DIR, 'vault', userId, 'clio'), 'Clio Manage');
  scanVault(path.join(VAULT_DIR, 'vault', userId, 'mycase'), 'MyCase');
  scanVault(path.join(VAULT_DIR, 'vault', userId, 'filevine'), 'Filevine');

  // Scan cloud drives and mail archives
  scanDirectVault(path.join(VAULT_DIR, 'vault', userId, 'gdrive'), 'Google Drive');
  scanDirectVault(path.join(VAULT_DIR, 'vault', userId, 'gmail'), 'Gmail');
  scanDirectVault(path.join(VAULT_DIR, 'vault', userId, 'onedrive'), 'OneDrive');
  scanDirectVault(path.join(VAULT_DIR, 'vault', userId, 'outlook'), 'Outlook');
  scanDirectVault(path.join(VAULT_DIR, 'vault', userId, 'dropbox'), 'Dropbox');
  
  // Read queue states
  const pendingJobsCount = queue.filter(j => j.status === 'pending' || j.status === 'processing').length;
  
  // Convert queue history to event logs
  const eventLogs = queue.map((job, idx) => {
    const dateObj = new Date(job.updatedAt);
    const ts = isNaN(dateObj.getTime()) ? 'Just now' : dateObj.toLocaleTimeString();
    const providerName = job.type.split('-')[0].toUpperCase();
    
    // Choose appropriate colors
    const colors: Record<string, string> = {
      CLIO: '#4F46E5',
      MYCASE: '#2563EB',
      FILEVINE: '#059669',
      GDRIVE: '#16A34A',
      DROPBOX: '#0061FF',
      ONEDRIVE: '#0078D4',
      GMAIL: '#DC2626',
      OUTLOOK: '#0078D4'
    };
    const sourceColor = colors[providerName] || '#10B981';

    return {
      id: idx + 1,
      ts,
      source: providerName,
      sourceColor,
      event: job.type,
      fileName: job.data?.name || (job.status === 'completed' ? 'All files synced successfully' : 'Sync Operations Running...'),
      size: job.data?.size ? `${(job.data.size / 1024).toFixed(0)} KB` : 'N/A',
      outcome: job.status === 'completed' ? 'complete' : job.status === 'failed' ? 'error' : 'queued'
    };
  });

  // Sort logs by time desc (latest first)
  eventLogs.reverse();

  // Sort documents by downloadedAtRaw descending (most recently synced at the very top)
  documentsList.sort((a, b) => {
    const timeA = a.downloadedAtRaw ? new Date(a.downloadedAtRaw).getTime() : 0;
    const timeB = b.downloadedAtRaw ? new Date(b.downloadedAtRaw).getTime() : 0;
    return timeB - timeA;
  });

  const responsePayload = {
    totalDocs,
    processedDocs,
    flaggedDocs,
    pendingJobsCount,
    recentDocs: documentsList.slice(0, 50),
    eventLogs: eventLogs.slice(0, 15)
  };

  cachedStats = { timestamp: now, payload: responsePayload };
  return NextResponse.json(responsePayload);
}
