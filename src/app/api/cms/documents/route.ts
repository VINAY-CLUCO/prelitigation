// src/app/api/cms/documents/route.ts
// Consolidated API to fetch all ingested documents from all connected services for the current user

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserProviderVaultDir } from '@/lib/vault';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const documents: any[] = [];

  const providers = [
    { name: 'Gmail', key: 'gmail' },
    { name: 'Google Drive', key: 'gdrive' },
    { name: 'OneDrive', key: 'onedrive' },
    { name: 'Outlook', key: 'outlook' },
    { name: 'Dropbox', key: 'dropbox' },
  ];

  // 1. Direct vault providers (Gmail, Drive, etc.)
  for (const prov of providers) {
    const provPath = getUserProviderVaultDir(userId, prov.key);
    if (fs.existsSync(provPath)) {
      const docsFile = path.join(provPath, 'documents.json');
      if (fs.existsSync(docsFile)) {
        try {
          const list = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
          for (const item of list) {
            const isFlagged = !item.ai_tag || item.ai_tag.includes('Uncategorized') || item.ai_tag.includes('⚠');
            documents.push({
              id: item.id,
              name: item.name,
              type: item.ai_tag || 'Document 📄',
              size: item.size ? `${(item.size / 1024).toFixed(0)} KB` : '120 KB',
              sizeBytes: item.size || 0,
              source: prov.name,
              date: item.downloaded_at ? new Date(item.downloaded_at).toLocaleDateString() : 'Recently',
              downloadedAtRaw: item.downloaded_at || '',
              status: isFlagged ? 'flagged' : 'complete',
              phase: isFlagged ? 'Phase 3 — Quality Check' : 'Phase 4 — Case Attribution',
              flags: isFlagged ? ['Uncategorized File Type'] : [],
              downloadUrl: `/api/connections/clio/download?docId=${item.id || ''}&name=${encodeURIComponent(item.name || '')}`
            });
          }
        } catch {}
      }
    }
  }

  // 2. Matter-based vault providers (Clio)
  const clioPath = getUserProviderVaultDir(userId, 'clio');
  if (fs.existsSync(clioPath)) {
    const folders = fs.readdirSync(clioPath);
    for (const folder of folders) {
      const folderPath = path.join(clioPath, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const docsFile = path.join(folderPath, 'documents.json');
        if (fs.existsSync(docsFile)) {
          try {
            const list = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
            for (const item of list) {
              const isFlagged = !item.ai_tag || item.ai_tag.includes('Uncategorized') || item.ai_tag.includes('⚠');
              documents.push({
                id: item.id,
                name: item.name,
                type: item.ai_tag || 'Document 📄',
                size: item.size ? `${(item.size / 1024).toFixed(0)} KB` : '120 KB',
                sizeBytes: item.size || 0,
                source: 'Clio Manage',
                date: item.downloaded_at ? new Date(item.downloaded_at).toLocaleDateString() : 'Recently',
                downloadedAtRaw: item.downloaded_at || '',
                status: isFlagged ? 'flagged' : 'complete',
                phase: isFlagged ? 'Phase 3 — Quality Check' : 'Phase 4 — Case Attribution',
                flags: isFlagged ? ['Uncategorized File Type'] : [],
                downloadUrl: `/api/connections/clio/download?docId=${item.id || ''}&name=${encodeURIComponent(item.name || '')}`
              });
            }
          } catch {}
        }
      }
    }
  }

  // Sort by date descending
  documents.sort((a, b) => {
    const timeA = a.downloadedAtRaw ? new Date(a.downloadedAtRaw).getTime() : 0;
    const timeB = b.downloadedAtRaw ? new Date(b.downloadedAtRaw).getTime() : 0;
    return timeB - timeA;
  });

  return NextResponse.json({ documents, count: documents.length });
}
