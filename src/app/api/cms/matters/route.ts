import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR, getToken } from '@/lib/tokenStore';
import { createClioContact, createClioMatter, updateClioMatterStatus } from '@/lib/clioPush';

export const dynamic = 'force-dynamic';

function getClioVault(userId: string) {
  return path.join(VAULT_DIR, 'vault', userId, 'clio');
}

// Ensure vault directory exists
function ensureVaultDir(userId: string) {
  const vaultDir = getClioVault(userId);
  if (!fs.existsSync(vaultDir)) {
    fs.mkdirSync(vaultDir, { recursive: true });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  ensureVaultDir(userId);
  
  const clioToken = getToken(userId, 'clio');
  const clioMatters = getLocalMatters(getClioVault(userId), 'clio');

  // Sort by open date descending
  clioMatters.sort((a, b) => new Date(b.open_date).getTime() - new Date(a.open_date).getTime());

  return NextResponse.json({
    matters: clioMatters,
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
    let finalMatterId = String(Date.now());
    let displayNum = `CLO-${Math.floor(100000 + Math.random() * 900000)}`;
    let clientData = { id: Date.now(), name: clientName };

    // If connected live, call Clio API
    if (token?.access_token) {
      try {
        const contact = await createClioContact(clientName, clientEmail, clientPhone);
        const matter = await createClioMatter(matterDescription, contact.id);
        
        finalMatterId = String(matter.id);
        displayNum = matter.display_number || displayNum;
        clientData = { id: contact.id, name: contact.name };
      } catch (err: any) {
        console.error('[Clio Live Create Error]', err);
        return NextResponse.json({ error: `Clio API Error: ${err.message}` }, { status: 502 });
      }
    }

    // Write locally
    ensureVaultDir(userId);
    const newMatterDir = path.join(getClioVault(userId), finalMatterId);
    
    if (!fs.existsSync(newMatterDir)) {
      fs.mkdirSync(newMatterDir, { recursive: true });
    }

    const matterMetadata = {
      id: finalMatterId,
      display_number: displayNum,
      description: matterDescription,
      status: 'Open',
      client: clientData,
      open_date: new Date().toISOString().split('T')[0],
      close_date: null
    };

    fs.writeFileSync(path.join(newMatterDir, 'matter.json'), JSON.stringify(matterMetadata, null, 2));
    fs.writeFileSync(path.join(newMatterDir, 'documents.json'), JSON.stringify([], null, 2));
    fs.writeFileSync(path.join(newMatterDir, 'tasks.json'), JSON.stringify([], null, 2));
    fs.writeFileSync(path.join(newMatterDir, 'calendar.json'), JSON.stringify([], null, 2));

    return NextResponse.json({
      success: true,
      matter: {
        ...matterMetadata,
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

    ensureVaultDir(userId);
    const matterDir = path.join(getClioVault(userId), matterId);
    const matterFile = path.join(matterDir, 'matter.json');

    if (!fs.existsSync(matterFile)) {
      return NextResponse.json({ error: 'Matter not found.' }, { status: 404 });
    }

    const matterMetadata = JSON.parse(fs.readFileSync(matterFile, 'utf-8'));
    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    
    matterMetadata.status = normalizedStatus;
    if (normalizedStatus === 'Closed') {
      matterMetadata.close_date = new Date().toISOString().split('T')[0];
    } else {
      matterMetadata.close_date = null;
    }

    // Update via Clio API if live
    const token = getToken(userId, 'clio');
    if (token?.access_token) {
      try {
        await updateClioMatterStatus(matterId, normalizedStatus);
      } catch (err: any) {
        console.error('[Clio Live Update Status Error]', err);
        return NextResponse.json({ error: `Clio API Error: ${err.message}` }, { status: 502 });
      }
    }

    fs.writeFileSync(matterFile, JSON.stringify(matterMetadata, null, 2));

    return NextResponse.json({
      success: true,
      matter: matterMetadata
    });
  } catch (err: any) {
    console.error('[Update Matter API Error]', err);
    return NextResponse.json({ error: 'Failed to update matter.' }, { status: 500 });
  }
}

// Scans the Clio vault directory and returns all parsed matters
function getLocalMatters(vaultPath: string, provider: 'clio') {
  const matters = [];
  if (fs.existsSync(vaultPath)) {
    const folders = fs.readdirSync(vaultPath);
    for (const folder of folders) {
      const folderPath = path.join(vaultPath, folder);
      const matterFile = path.join(folderPath, 'matter.json');
      const docsFile = path.join(folderPath, 'documents.json');
      const tasksFile = path.join(folderPath, 'tasks.json');
      const calendarFile = path.join(folderPath, 'calendar.json');

      if (fs.existsSync(matterFile)) {
        try {
          const matter = JSON.parse(fs.readFileSync(matterFile, 'utf-8'));
          const docs = fs.existsSync(docsFile) ? JSON.parse(fs.readFileSync(docsFile, 'utf-8')) : [];
          const tasks = fs.existsSync(tasksFile) ? JSON.parse(fs.readFileSync(tasksFile, 'utf-8')) : [];
          const calendar = fs.existsSync(calendarFile) ? JSON.parse(fs.readFileSync(calendarFile, 'utf-8')) : [];
          
          matters.push({ 
            ...matter,
            provider,
            documents: docs,
            tasks: tasks,
            calendar: calendar
          });
        } catch (e) {
          console.error(`Failed to parse local matter file under ${provider}:`, e);
        }
      }
    }
  }



  return matters;
}
