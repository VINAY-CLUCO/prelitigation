// src/app/api/connections/mycase/upload/route.ts
// Handles file uploads specifically for MyCase, saving to local MyCase vault

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from '@/lib/tokenStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const matterId = formData.get('matterId') as string;

    if (!file || !matterId) {
      return NextResponse.json({ error: 'Missing file or matterId' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to local MyCase vault directory
    const MYCASE_VAULT = path.join(VAULT_DIR, 'vault', 'mycase');
    const matterDir = path.join(MYCASE_VAULT, matterId);
    if (!fs.existsSync(matterDir)) {
      fs.mkdirSync(matterDir, { recursive: true });
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const physicalFilePath = path.join(matterDir, cleanFileName);
    fs.writeFileSync(physicalFilePath, buffer);

    // Update documents index
    const docsFile = path.join(matterDir, 'documents.json');
    let documents = [];
    if (fs.existsSync(docsFile)) {
      try {
        documents = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
      } catch {}
    }

    // AI Classification Triage
    const name = file.name.toLowerCase();
    let aiTag = 'Uncategorized 📄';
    if (name.includes('medical') || name.includes('med') || name.includes('hospital') || name.includes('clinic')) {
      aiTag = 'Medical Record 🏥';
    } else if (name.includes('police') || name.includes('report') || name.includes('accident')) {
      aiTag = 'Police Report 🚓';
    } else if (name.includes('contract') || name.includes('agreement') || name.includes('nda')) {
      aiTag = 'Contract 📝';
    } else if (name.includes('invoice') || name.includes('bill') || name.includes('receipt')) {
      aiTag = 'Financial 💵';
    } else if (name.includes('demand') || name.includes('settlement')) {
      aiTag = 'Demand Letter ⚖️';
    }

    const newDoc = {
      id: `mc_doc_${Date.now()}`,
      name: file.name,
      size: file.size,
      ai_tag: aiTag,
      downloaded: true,
      downloaded_at: new Date().toISOString()
    };

    // Prepend to show at the top of the case documents list
    documents.unshift(newDoc);
    fs.writeFileSync(docsFile, JSON.stringify(documents, null, 2));

    return NextResponse.json({
      success: true,
      doc: newDoc
    });
  } catch (err: any) {
    console.error('[MyCase Upload Error]', err);
    return NextResponse.json({ error: err.message || 'Internal upload error' }, { status: 500 });
  }
}
