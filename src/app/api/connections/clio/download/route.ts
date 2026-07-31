import { auth } from '@clerk/nextjs/server';
// src/app/api/connections/clio/download/route.ts
// Universal Document Download Handler for Clio & Local Vault Files

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from '@/lib/tokenStore';


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const docId = url.searchParams.get('docId') || '';
  const docName = url.searchParams.get('name') || 'document.pdf';

  if (!docId && !docName) {
    return NextResponse.json({ error: 'Missing document parameters' }, { status: 400 });
  }

  // 1. Search local vault directories for matching physical file
  const searchDirs = [
    path.join(VAULT_DIR, 'vault', userId, 'clio'),
    path.join(VAULT_DIR, 'vault', userId, 'gdrive'),
    path.join(VAULT_DIR, 'vault', userId, 'gmail'),
    path.join(VAULT_DIR, 'vault', userId, 'dropbox'),
    path.join(VAULT_DIR, 'vault', userId, 'onedrive'),
    path.join(VAULT_DIR, 'vault', userId, 'outlook')
  ];

  function findPhysicalFileInVault(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const found = findPhysicalFileInVault(fullPath);
        if (found) return found;
      } else if (entry !== 'documents.json' && entry !== 'matter.json' && entry !== 'calendar.json' && entry !== 'tasks.json') {
        const cleanEntry = entry.toLowerCase();
        const cleanName = docName ? docName.toLowerCase() : '';
        if (docId && (entry.startsWith(`${docId}_`) || entry === docId)) return fullPath;
        if (cleanName && (cleanEntry === cleanName || cleanEntry.endsWith(`_${cleanName}`))) return fullPath;
        if (cleanName && cleanEntry.includes(cleanName)) return fullPath;
      }
    }
    return null;
  }

  for (const vaultDir of searchDirs) {
    const foundPath = findPhysicalFileInVault(vaultDir);
    if (foundPath && fs.existsSync(foundPath)) {
      const fileBuffer = fs.readFileSync(foundPath);
      const filename = path.basename(foundPath);
      const contentType = filename.endsWith('.pdf')
        ? 'application/pdf'
        : filename.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : filename.endsWith('.png')
        ? 'image/png'
        : filename.endsWith('.jpg') || filename.endsWith('.jpeg')
        ? 'image/jpeg'
        : filename.endsWith('.csv')
        ? 'text/csv'
        : filename.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : filename.endsWith('.xls')
        ? 'application/vnd.ms-excel'
        : filename.endsWith('.txt')
        ? 'text/plain'
        : 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }
  }

  // 2. Try real Clio API download
  const token = getToken(userId, 'clio');
  if (token?.access_token && docId) {
    try {
      const clioUrl = `https://app.clio.com/api/v4/documents/${docId}/download`;
      const response = await fetch(clioUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token.access_token}` },
        redirect: 'manual'
      });

      if (response.status === 302 || response.status === 303 || response.status === 307) {
        const location = response.headers.get('location');
        if (location) return NextResponse.redirect(location);
      } else if (response.ok) {
        const contentType = response.headers.get('content-type') || 'application/pdf';
        const buffer = await response.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${docName}"`
          }
        });
      }
    } catch (e) {
      console.error('Clio API download failed:', e);
    }
  }

  // 3. Fail if file not found locally and Clio API failed/missing
  return NextResponse.json({ error: 'File not found locally and Clio API download failed.' }, { status: 404 });
}

