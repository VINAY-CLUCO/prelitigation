import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const token = getToken('clio');
  if (!token?.access_token) {
    return NextResponse.json({ error: 'Clio is not connected' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const matterId = formData.get('matterId') as string;

    if (!file || !matterId) {
      return NextResponse.json({ error: 'Missing file or matterId' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── STEP 1: Create document record in Clio ──────────────────────────────
    const createRes = await fetch(
      'https://app.clio.com/api/v4/documents.json?fields=id,name,latest_document_version{id,uuid,put_url,put_headers}',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            name: file.name,
            parent: { id: parseInt(matterId), type: 'Matter' },
          },
        }),
      }
    );

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[Upload] Step1 FAILED:', err);
      return NextResponse.json({ error: `Clio Error: ${err}` }, { status: createRes.status });
    }

    const createData = await createRes.json();
    const docId       = createData.data.id;
    const version     = createData.data.latest_document_version;
    const putUrl      = version?.put_url;
    const putHeaders  = version?.put_headers || [];
    const versionUuid = version?.uuid;

    console.log('[Upload] Step1 OK — docId:', docId, 'versionUuid:', versionUuid, 'putUrl:', !!putUrl);

    if (!putUrl) {
      return NextResponse.json({ error: 'Clio did not return a put_url' }, { status: 500 });
    }

    // ── STEP 2: PUT binary to S3 ────────────────────────────────────────────
    // CRITICAL: Use ONLY the headers Clio specifies. The URL is pre-signed
    // against EXACTLY those headers. Any extra header (e.g. Content-Length)
    // will cause a SignatureDoesNotMatch and the file body is discarded.
    const s3Headers: Record<string, string> = {};
    for (const h of putHeaders) {
      s3Headers[h.name] = h.value;
    }

    console.log('[Upload] Step2 S3 headers:', s3Headers, '| size:', buffer.length);

    const s3Res = await fetch(putUrl, {
      method: 'PUT',
      headers: s3Headers,
      body: buffer,
    });

    const s3Body = await s3Res.text();
    console.log('[Upload] Step2 S3 status:', s3Res.status, s3Body || '(empty=ok)');

    if (!s3Res.ok) {
      return NextResponse.json({ error: `S3 upload failed (${s3Res.status}): ${s3Body}` }, { status: 500 });
    }

    // ── STEP 3: Mark document version as fully uploaded ─────────────────────
    // CONFIRMED working format (tested live): uuid at top-level of data
    const patchRes = await fetch(
      `https://app.clio.com/api/v4/documents/${docId}.json?fields=id,latest_document_version{id,uuid,fully_uploaded}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            fully_uploaded: true,
            uuid: versionUuid,
          },
        }),
      }
    );

    const patchBody = await patchRes.text();
    console.log('[Upload] Step3 PATCH status:', patchRes.status, patchBody);

    if (!patchRes.ok) {
      return NextResponse.json({
        error: `Finalize failed: ${patchBody}`,
      }, { status: 500 });
    }

    const patchData = JSON.parse(patchBody);
    const isFullyUploaded = patchData?.data?.latest_document_version?.fully_uploaded;
    console.log('[Upload] fully_uploaded confirmed:', isFullyUploaded);

    // ── STEP 4: Write to local Vault documents.json & save physical binary ────
    try {
      const { VAULT_DIR } = require('@/lib/tokenStore');
      const fs = require('fs');
      const path = require('path');

      const CLIO_VAULT = path.join(VAULT_DIR, 'vault', 'clio');
      const matterDir = path.join(CLIO_VAULT, String(matterId));
      const docsFile = path.join(matterDir, 'documents.json');

      if (!fs.existsSync(matterDir)) {
        fs.mkdirSync(matterDir, { recursive: true });
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const localFilePath = path.join(matterDir, `${docId}_${safeName}`);
      const directFilePath = path.join(matterDir, safeName);
      
      fs.writeFileSync(localFilePath, buffer);
      fs.writeFileSync(directFilePath, buffer);

      let documents = [];
      if (fs.existsSync(docsFile)) {
        documents = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
      }

      const exists = documents.some((d: any) => String(d.id) === String(docId));
      if (!exists) {
        documents.unshift({
          id: docId,
          name: file.name,
          size: file.size,
          ai_tag: 'Ingested File',
          downloaded: true,
          downloaded_at: new Date().toISOString()
        });
        fs.writeFileSync(docsFile, JSON.stringify(documents, null, 2));
      }
    } catch (writeErr) {
      console.error('[Upload API] Failed to write document metadata to vault:', writeErr);
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded to Clio',
      doc: {
        id: docId,
        name: file.name,
        size: file.size
      },
      versionUuid,
    });

  } catch (err: any) {
    console.error('[Upload] Exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
