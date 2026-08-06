import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSignedDownloadUrl } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from '@/lib/tokenStore';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });

  const url = new URL(request.url);
  const docId = url.searchParams.get('id');

  if (!docId) {
    return NextResponse.json({ error: 'Missing document ID parameter' }, { status: 400 });
  }

  try {
    // 1. Fetch document from database
    const doc = await prisma.document.findUnique({
      where: { id: docId }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.userId !== dbUser.id) {
      return NextResponse.json({ error: 'Unauthorized to access this document' }, { status: 403 });
    }

    // 2. If we have a Supabase storage path, generate a signed URL and redirect
    if (doc.storagePath) {
      try {
        const signedUrl = await getSignedDownloadUrl(doc.storagePath, 60); // 60s expiry
        return NextResponse.redirect(signedUrl);
      } catch (err) {
        console.error(`[Download API] Failed to generate Supabase URL for doc ${doc.id}:`, err);
        // Fall through to try local vault just in case
      }
    }

    // 3. Fallback: Search local vault directories for matching physical file
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
          // If the file starts with the DB sourceId or docId
          if (doc!.sourceId && (entry.startsWith(`${doc.sourceId}_`) || entry === doc!.sourceId)) return fullPath;
          if (entry.startsWith(`${doc!.id}_`) || entry === doc!.id) return fullPath;
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

    return NextResponse.json({ error: 'Document file could not be located in Storage or Local Vault.' }, { status: 404 });

  } catch (error) {
    console.error('[Download API] Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
