// src/app/api/cms/stats/route.ts
// Computes live pipeline analytics, recent documents, and event logs from local folders and task queue state

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from '@/lib/tokenStore';
import { readQueue } from '@/lib/queueStore';

export const dynamic = 'force-dynamic';

const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');
const MYCASE_VAULT = path.join(VAULT_DIR, 'vault', 'mycase');

export async function GET() {
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
          const docs = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
          for (const d of docs) {
            totalDocs++;
            const isFlagged = !d.ai_tag || d.ai_tag.includes('Uncategorized') || d.ai_tag.includes('⚠');
            if (isFlagged) {
              flaggedDocs++;
            } else {
              processedDocs++;
            }
            
            documentsList.push({
              name: d.name,
              type: d.ai_tag || 'Document 📄',
              source: source,
              date: d.downloaded_at ? new Date(d.downloaded_at).toLocaleString() : 'Just now',
              downloadedAtRaw: d.downloaded_at || '',
              status: isFlagged ? 'flagged' : 'complete',
              size: d.size ? `${(d.size / 1024).toFixed(0)} KB` : '120 KB'
            });
          }
        } catch {}
      }
    }
  };

  // Helper to scan a direct vault provider directory (files stored directly in documents.json)
  const scanDirectVault = (vaultPath: string, source: string) => {
    if (!fs.existsSync(vaultPath)) return;
    const docsFile = path.join(vaultPath, 'documents.json');
    if (fs.existsSync(docsFile)) {
      try {
        const docs = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
        for (const d of docs) {
          totalDocs++;
          const isFlagged = !d.ai_tag || d.ai_tag.includes('Uncategorized') || d.ai_tag.includes('⚠');
          if (isFlagged) {
            flaggedDocs++;
          } else {
            processedDocs++;
          }
          
          documentsList.push({
            name: d.name,
            type: d.ai_tag || 'Document 📄',
            source: source,
            date: d.downloaded_at ? new Date(d.downloaded_at).toLocaleString() : 'Just now',
            downloadedAtRaw: d.downloaded_at || '',
            status: isFlagged ? 'flagged' : 'complete',
            size: d.size ? `${(d.size / 1024).toFixed(0)} KB` : '120 KB'
          });
        }
      } catch {}
    }
  };

  // Scan case managers
  scanVault(CLIO_VAULT, 'Clio Manage');
  scanVault(MYCASE_VAULT, 'MyCase');

  // Scan cloud drives and mail archives
  scanDirectVault(path.join(VAULT_DIR, 'vault', 'gdrive'), 'Google Drive');
  scanDirectVault(path.join(VAULT_DIR, 'vault', 'gmail'), 'Gmail');
  scanDirectVault(path.join(VAULT_DIR, 'vault', 'onedrive'), 'OneDrive');
  scanDirectVault(path.join(VAULT_DIR, 'vault', 'outlook'), 'Outlook');
  scanDirectVault(path.join(VAULT_DIR, 'vault', 'dropbox'), 'Dropbox');
  
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
      MYCASE: '#0EA5E9',
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

  return NextResponse.json({
    totalDocs,
    processedDocs,
    flaggedDocs,
    pendingJobsCount,
    recentDocs: documentsList.slice(0, 50), // Show up to 50 items so no file is lost in long lists
    eventLogs: eventLogs.slice(0, 15)
  });
}
