import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from '@/lib/tokenStore';
import { createClioCalendarEvent } from '@/lib/clioPush';

const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');

function getMatterDir(matterId: string | number): string {
  return path.join(CLIO_VAULT, String(matterId));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matterId, summary, startAt } = body;

    if (!matterId || !summary || !startAt) {
      return NextResponse.json({ error: 'Matter ID, Summary, and Start Date are required.' }, { status: 400 });
    }

    const matterDir = getMatterDir(matterId);
    const token = getToken('clio');
    let finalEventId = String(Date.now());

    // Push to Clio API if live token present
    if (token?.access_token) {
      try {
        const clioEvent = await createClioCalendarEvent(matterId, summary, startAt);
        finalEventId = String(clioEvent.id);
      } catch (err: any) {
        console.error('[Clio Live Create Event Error]', err);
      }
    }

    // Append event locally
    const calendarFile = path.join(matterDir, 'calendar.json');
    let events = [];

    if (fs.existsSync(calendarFile)) {
      events = JSON.parse(fs.readFileSync(calendarFile, 'utf-8'));
    }

    const newEvent = {
      id: finalEventId,
      summary,
      start_at: startAt
    };

    events.push(newEvent);
    if (!fs.existsSync(matterDir)) fs.mkdirSync(matterDir, { recursive: true });
    fs.writeFileSync(calendarFile, JSON.stringify(events, null, 2));

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err: any) {
    console.error('[Calendar POST Error]', err);
    return NextResponse.json({ error: 'Failed to create calendar event.' }, { status: 500 });
  }
}
