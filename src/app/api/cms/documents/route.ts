import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';


export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';


export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const docs = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const documents = docs.map(item => {
      const isFlagged = !item.aiTag || item.aiTag.includes('Uncategorized') || item.aiTag.includes('⚠');
      return {
        id: item.id,
        name: item.name,
        type: item.aiTag || 'Document 📄',
        size: item.size ? `${(item.size / 1024).toFixed(0)} KB` : '120 KB',
        sizeBytes: item.size || 0,
        source: item.source || 'Clio Manage',
        date: item.downloadedAt ? new Date(item.downloadedAt).toLocaleDateString() : 'Recently',
        downloadedAtRaw: item.downloadedAt ? item.downloadedAt.toISOString() : item.createdAt.toISOString(),
        status: isFlagged ? 'flagged' : 'complete',
        phase: isFlagged ? 'Phase 3 — Quality Check' : 'Phase 4 — Case Attribution',
        flags: isFlagged ? ['Uncategorized File Type'] : [],
        downloadUrl: `/api/documents/download?id=${item.id || ''}`
      };
    });

    return NextResponse.json({ documents, count: documents.length });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

