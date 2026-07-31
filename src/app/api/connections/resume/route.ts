import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { readQueue, resumeJob } from '@/lib/queueStore';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    let provider: string;
    try {
      const body = await req.json();
      provider = body.provider;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!provider) return NextResponse.json({ error: 'Provider is required' }, { status: 400 });

    const jobs = await readQueue();
    // Find the active or pending job for this provider (case-insensitive)
    const activeJob = jobs.find(j => 
      j.type.toLowerCase().startsWith(provider.toLowerCase()) && 
      (j.status === 'processing' || j.status === 'pending')
    );

    if (activeJob) {
      await resumeJob(activeJob.id);
      return NextResponse.json({ success: true, message: `Job ${activeJob.id} resumed.` });
    } else {
      return NextResponse.json({ success: false, message: 'No active job found to resume.' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
