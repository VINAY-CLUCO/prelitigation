import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { readQueue } from '@/lib/queueStore';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

let cachedStats: { timestamp: number; payload: any } | null = null;
const CACHE_TTL_MS = 2000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!dbUser) return new Response('User not found in DB', { status: 404 });

  const now = Date.now();
  if (cachedStats && (now - cachedStats.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cachedStats.payload);
  }

  const queue = await readQueue();
  
  // Query Prisma for documents
  const docs = await prisma.document.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' }
  });
  
  let totalDocs = docs.length;
  let flaggedDocs = 0;
  let processedDocs = 0;
  
  const formatSource = (src: string) => {
    switch (src.toLowerCase()) {
      case 'gdrive': return 'Google Drive';
      case 'clio': return 'Clio';
      case 'gmail': return 'Gmail';
      case 'dropbox': return 'Dropbox';
      case 'onedrive': return 'OneDrive';
      case 'outlook': return 'Outlook';
      case 'filevine': return 'Filevine';
      case 'mycase': return 'MyCase';
      default: return src;
    }
  };

  const documentsList = docs.map(d => {
    const isFlagged = !d.aiTag || d.aiTag.includes('Uncategorized') || d.aiTag.includes('⚠');
    if (isFlagged) {
      flaggedDocs++;
    } else {
      processedDocs++;
    }
    
    return {
      id: d.id,
      name: d.name,
      type: d.aiTag || 'Document 📄',
      source: formatSource(d.source || 'Unknown'),
      date: d.downloadedAt ? new Date(d.downloadedAt).toLocaleString() : 'Just now',
      downloadedAtRaw: d.downloadedAt ? d.downloadedAt.toISOString() : d.createdAt.toISOString(),
      status: isFlagged ? 'flagged' : 'complete',
      size: d.size ? `${(d.size / 1024).toFixed(0)} KB` : '120 KB',
      emailSender: d.emailSender,
      emailSubject: d.emailSubject,
      matterId: d.matterId
    };
  });
  
  // Read queue states
  const pendingJobsCount = queue.filter(j => j.status === 'pending' || j.status === 'processing').length;
  
  // Convert queue history to event logs
  let eventLogs: any[] = queue.map((job, idx) => {
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
      id: `job_${idx}`,
      timestampObj: dateObj,
      ts,
      source: providerName,
      sourceColor,
      event: job.type,
      fileName: job.data?.name || (job.status === 'completed' ? 'All files synced successfully' : 'Sync Operations Running...'),
      size: job.data?.size ? `${(job.data.size / 1024).toFixed(0)} KB` : 'N/A',
      outcome: job.status === 'completed' ? 'complete' : job.status === 'failed' ? 'error' : 'queued'
    };
  });

  // Also add individual document downloads to the audit log for neat metadata visibility
  const docLogs = docs.map((d) => {
    const dateObj = new Date(d.downloadedAt || d.createdAt);
    const ts = isNaN(dateObj.getTime()) ? 'Just now' : dateObj.toLocaleTimeString();
    const providerName = (d.source || 'SYSTEM').toUpperCase();
    
    const colors: Record<string, string> = {
      CLIO: '#4F46E5', MYCASE: '#2563EB', FILEVINE: '#059669',
      GDRIVE: '#16A34A', DROPBOX: '#0061FF', ONEDRIVE: '#0078D4',
      GMAIL: '#DC2626', OUTLOOK: '#0078D4'
    };
    const sourceColor = colors[providerName] || '#10B981';

    return {
      id: `doc_${d.id}`,
      timestampObj: dateObj,
      ts,
      source: providerName,
      sourceColor,
      event: 'document-sync',
      fileName: `Uploaded to Supabase: ${d.name}`,
      size: d.size ? `${(d.size / 1024).toFixed(0)} KB` : 'Unknown',
      outcome: 'complete'
    };
  });

  eventLogs = [...eventLogs, ...docLogs];
  // Sort logs by time desc (latest first)
  eventLogs.sort((a, b) => b.timestampObj.getTime() - a.timestampObj.getTime());

  const responsePayload = {
    totalDocs,
    processedDocs,
    flaggedDocs,
    pendingJobsCount,
    recentDocs: documentsList.slice(0, 50),
    eventLogs: eventLogs.slice(0, 50),
    documentsList
  };

  cachedStats = { timestamp: now, payload: responsePayload };
  return NextResponse.json(responsePayload);
}
