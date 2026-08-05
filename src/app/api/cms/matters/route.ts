import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';
import { createClioContact, createClioMatter, updateClioMatterStatus } from '@/lib/clioPush';


export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';


export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const clioToken = getToken(userId, 'clio');
  
  // Fetch from Postgres via Prisma
  const matters = await prisma.matter.findMany({
    where: { userId },
    include: {
      documents: true,
      tasks: true,
      events: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    matters: matters.map(m => ({
      id: m.id,
      display_number: m.name, // Mapping db name to display_number for frontend compatibility
      description: m.description,
      status: m.status,
      client: { name: m.clientId || 'Unknown' },
      open_date: m.createdAt.toISOString().split('T')[0],
      provider: m.source || 'clio',
      documents: m.documents,
      tasks: m.tasks,
      calendar: m.events
    })),
    connections: {
      clio: !!clioToken?.access_token,
    }
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { clientName, clientEmail, clientPhone, matterDescription } = body;

    if (!clientName || !matterDescription) {
      return NextResponse.json({ error: 'Client Name and Matter Description are required.' }, { status: 400 });
    }

    const token = getToken(userId, 'clio');
    let displayNum = `CLO-${Math.floor(100000 + Math.random() * 900000)}`;
    let sourceId = '';

    // If connected live, call Clio API
    if (token?.access_token) {
      try {
        const contact = await createClioContact(clientName, clientEmail, clientPhone);
        const matter = await createClioMatter(matterDescription, contact.id);
        
        sourceId = String(matter.id);
        displayNum = matter.display_number || displayNum;
      } catch (err: any) {
        console.error('[Clio Live Create Error]', err);
        return NextResponse.json({ error: `Clio API Error: ${err.message}` }, { status: 502 });
      }
    }

    // Write to Postgres
    const newMatter = await prisma.matter.create({
      data: {
        userId,
        name: displayNum,
        description: matterDescription,
        status: 'Open',
        clientId: clientName,
        source: 'clio',
        sourceId: sourceId || null
      }
    });

    return NextResponse.json({
      success: true,
      matter: {
        id: newMatter.id,
        display_number: newMatter.name,
        description: newMatter.description,
        status: newMatter.status,
        client: { name: clientName },
        open_date: newMatter.createdAt.toISOString().split('T')[0],
        provider: 'clio',
        documents: [],
        tasks: [],
        calendar: []
      }
    });
  } catch (err: any) {
    console.error('[Create Matter API Error]', err);
    return NextResponse.json({ error: 'Failed to create matter.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { matterId, status } = body;

    if (!matterId || !status) {
      return NextResponse.json({ error: 'Matter ID and Status are required.' }, { status: 400 });
    }

    const matter = await prisma.matter.findUnique({ where: { id: matterId } });
    if (!matter || matter.userId !== userId) {
      return NextResponse.json({ error: 'Matter not found.' }, { status: 404 });
    }

    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    // Update via Clio API if live
    const token = getToken(userId, 'clio');
    if (token?.access_token && matter.sourceId) {
      try {
        await updateClioMatterStatus(matter.sourceId, normalizedStatus);
      } catch (err: any) {
        console.error('[Clio Live Update Status Error]', err);
        return NextResponse.json({ error: `Clio API Error: ${err.message}` }, { status: 502 });
      }
    }

    const updatedMatter = await prisma.matter.update({
      where: { id: matterId },
      data: { status: normalizedStatus }
    });

    return NextResponse.json({
      success: true,
      matter: updatedMatter
    });
  } catch (err: any) {
    console.error('[Update Matter API Error]', err);
    return NextResponse.json({ error: 'Failed to update matter.' }, { status: 500 });
  }
}
