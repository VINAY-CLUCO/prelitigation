// src/app/api/cms/documents/route.ts
// Consolidated API to fetch all ingested documents from all connected services (Gmail, Clio, Google Drive, etc.)

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from '@/lib/tokenStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const documents: any[] = [];

  const providers = [
    { name: 'Gmail', path: path.join(VAULT_DIR, 'vault', 'gmail') },
    { name: 'Google Drive', path: path.join(VAULT_DIR, 'vault', 'gdrive') },
    { name: 'OneDrive', path: path.join(VAULT_DIR, 'vault', 'onedrive') },
    { name: 'Outlook', path: path.join(VAULT_DIR, 'vault', 'outlook') },
    { name: 'Dropbox', path: path.join(VAULT_DIR, 'vault', 'dropbox') },
  ];

  // 1. Direct vault providers (Gmail, Drive, etc.)
  for (const prov of providers) {
    if (fs.existsSync(prov.path)) {
      const docsFile = path.join(prov.path, 'documents.json');
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
  const matterProviders = [
    { name: 'Clio Manage', path: path.join(VAULT_DIR, 'vault', 'clio') }
  ];

  for (const mProv of matterProviders) {
    if (fs.existsSync(mProv.path)) {
      const folders = fs.readdirSync(mProv.path);
      for (const folder of folders) {
        const docsFile = path.join(mProv.path, folder, 'documents.json');
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
                source: mProv.name,
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
