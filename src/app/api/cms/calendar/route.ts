import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';
import { createClioCalendarEvent } from '@/lib/clioPush';


import { prisma } from '@/lib/prisma';


export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { matterId, summary, startAt } = body;

    if (!matterId || !summary || !startAt) {
      return NextResponse.json({ error: 'Matter ID, Summary, and Start Date are required.' }, { status: 400 });
    }

    const matter = await prisma.matter.findUnique({ where: { id: matterId } });
    if (!matter || matter.userId !== userId) {
      return NextResponse.json({ error: 'Matter not found.' }, { status: 404 });
    }

    const token = getToken(userId, 'clio');
    let sourceId = '';

    // Push to Clio API if live token present
    if (token?.access_token && matter.sourceId) {
      try {
        const clioEvent = await createClioCalendarEvent(matter.sourceId, summary, startAt);
        sourceId = String(clioEvent.id);
      } catch (err: any) {
        console.error('[Clio Live Create Event Error]', err);
      }
    }

    // Write to Postgres
    const newEvent = await prisma.event.create({
      data: {
        userId,
        matterId,
        summary,
        startAt: new Date(startAt),
        source: 'clio',
        sourceId: sourceId || null
      }
    });

    return NextResponse.json({ 
      success: true, 
      event: {
        id: newEvent.id,
        summary: newEvent.summary,
        start_at: newEvent.startAt
      }
    });
  } catch (err: any) {
    console.error('[Calendar POST Error]', err);
    return NextResponse.json({ error: 'Failed to create calendar event.' }, { status: 500 });
  }
}

