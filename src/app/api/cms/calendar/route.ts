import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from '@/lib/tokenStore';
import { createClioCalendarEvent } from '@/lib/clioPush';

const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');
const MYCASE_VAULT = path.join(VAULT_DIR, 'vault', 'mycase');

function getMatterPath(matterId: string | number): { dir: string; provider: 'clio' | 'mycase' } {
  const clioPath = path.join(CLIO_VAULT, String(matterId));
  const mycasePath = path.join(MYCASE_VAULT, String(matterId));

  if (fs.existsSync(mycasePath)) {
    return { dir: mycasePath, provider: 'mycase' };
  }
  // Default to clio
  return { dir: clioPath, provider: 'clio' };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matterId, summary, startAt } = body;

    if (!matterId || !summary || !startAt) {
      return NextResponse.json({ error: 'Matter ID, Summary, and Start Date are required.' }, { status: 400 });
    }

    const { dir: matterDir, provider } = getMatterPath(matterId);
    const token = getToken(provider);
    let finalEventId = String(Date.now());

    // 1. If connected live, push to respective API
    if (token?.access_token) {
      if (provider === 'clio') {
        try {
          const clioEvent = await createClioCalendarEvent(matterId, summary, startAt);
          finalEventId = String(clioEvent.id);
        } catch (err: any) {
          console.error('[Clio Live Create Event Error]', err);
        }
      } else if (provider === 'mycase') {
        // Mock MyCase event ID response
        finalEventId = `mce_${Date.now()}`;
      }
    }

    // 2. Append event locally
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
    fs.writeFileSync(calendarFile, JSON.stringify(events, null, 2));

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err: any) {
    console.error('[Calendar POST Error]', err);
    return NextResponse.json({ error: 'Failed to create calendar event.' }, { status: 500 });
  }
}
