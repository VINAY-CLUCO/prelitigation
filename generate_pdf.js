const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 56, bottom: 56, left: 60, right: 60 },
  info: {
    Title: 'Cluco Pre-Litigation Pipeline — Prototype Documentation',
    Author: 'Cluco',
  },
});

const outputPath = path.join(__dirname, 'Cluco_Prototype_Documentation.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// ─── Design Tokens ───────────────────────────────────────────────────
const C = {
  navy: '#1E3A5F',
  navyLight: '#EEF2FF',
  black: '#111111',
  body: '#3B3B3B',
  muted: '#6B6B6B',
  faint: '#9B9B9B',
  border: '#E5E4E0',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  blue: '#2563EB',
  purple: '#7C3AED',
  accent: '#1E3A5F',
  white: '#FFFFFF',
  bg: '#F7F7F5',
};

const W = 595 - 120; // usable width (A4 - margins)
const LEFT = 60;
const TOP_MARGIN = 56;

// ─── Helper Functions ────────────────────────────────────────────────

function drawPageHeader(doc, pageNum, title) {
  // Top navy bar
  doc.rect(0, 0, 595, 38).fill(C.navy);
  doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
    .text('CLUCO', LEFT, 13, { continued: true })
    .font('Helvetica').fillColor('#A0B4CC')
    .text('  ·  Pre-Litigation Onboarding Pipeline Prototype');

  // Page number top right
  doc.fontSize(8).fillColor('#A0B4CC')
    .text(`Page ${pageNum} of 3`, 0, 14, { align: 'right', width: 595 - 30 });

  // Page title stripe
  doc.rect(0, 38, 595, 28).fill('#F0F4F9');
  doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
    .text(title, LEFT, 47);

  doc.fillColor(C.black);
}

function drawPageFooter(doc, pageNum) {
  const y = 842 - 40;
  doc.rect(LEFT, y, W, 0.5).fill(C.border);
  doc.fontSize(7.5).fillColor(C.faint).font('Helvetica')
    .text('Cluco v0.1.0  ·  Prototype Documentation  ·  Confidential', LEFT, y + 8, { width: W / 2 });
  doc.text(`Page ${pageNum}`, LEFT + W / 2, y + 8, { width: W / 2, align: 'right' });
}

function sectionTitle(doc, text, y) {
  doc.rect(LEFT, y, W, 22).fill('#EEF2FF');
  doc.roundedRect(LEFT, y, 3, 22, 1).fill(C.navy);
  doc.fontSize(10).fillColor(C.navy).font('Helvetica-Bold')
    .text(text, LEFT + 10, y + 6);
  doc.fillColor(C.black);
  return y + 30;
}

function subHeading(doc, text, y) {
  doc.fontSize(9.5).fillColor(C.navy).font('Helvetica-Bold')
    .text(text, LEFT, y);
  doc.rect(LEFT, y + 13, W, 0.5).fill('#DBEAFE');
  return y + 20;
}

function bodyText(doc, text, y, opts = {}) {
  doc.fontSize(9).fillColor(C.body).font('Helvetica')
    .text(text, LEFT + (opts.indent || 0), y, {
      width: W - (opts.indent || 0),
      lineGap: 2.5,
      ...opts,
    });
  return doc.y + 4;
}

function bullet(doc, label, value, y, labelW = 160) {
  doc.rect(LEFT + 2, y + 3, 4, 4).fill(C.navy);
  doc.fontSize(9).fillColor(C.black).font('Helvetica-Bold')
    .text(label, LEFT + 12, y, { continued: false, width: labelW });
  if (value) {
    const textY = doc.y - 11;
    doc.fontSize(9).fillColor(C.body).font('Helvetica')
      .text(value, LEFT + 12 + labelW, textY, { width: W - 12 - labelW });
  }
  return doc.y + 3;
}

function smallBadge(doc, text, x, y, color, bg) {
  const tw = doc.fontSize(7).widthOfString(text) + 10;
  doc.roundedRect(x, y, tw, 13, 3).fill(bg);
  doc.fontSize(7).fillColor(color).font('Helvetica-Bold').text(text, x + 5, y + 3);
  return x + tw + 6;
}

function infoBox(doc, text, y, borderColor, bgColor) {
  const boxH = 32;
  doc.roundedRect(LEFT, y, W, boxH, 4).fill(bgColor);
  doc.roundedRect(LEFT, y, 3, boxH, 2).fill(borderColor);
  doc.fontSize(8.5).fillColor(C.body).font('Helvetica')
    .text(text, LEFT + 10, y + 9, { width: W - 20, lineGap: 2 });
  return y + boxH + 8;
}

function twoCol(doc, items, y) {
  const colW = (W - 12) / 2;
  let maxY = y;
  items.forEach((item, i) => {
    const x = i % 2 === 0 ? LEFT : LEFT + colW + 12;
    const rowY = y + Math.floor(i / 2) * 56;

    doc.roundedRect(x, rowY, colW, 50, 4).fill('#F8F9FC').stroke(C.border);
    doc.fontSize(8).fillColor(C.navy).font('Helvetica-Bold')
      .text(item.title, x + 10, rowY + 8, { width: colW - 20 });
    doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
      .text(item.sub, x + 10, rowY + 22, { width: colW - 20, lineGap: 2 });
    doc.fontSize(7).fillColor(item.badgeColor || C.navy).font('Helvetica-Bold')
      .text(item.badge, x + 10, rowY + 38);
    maxY = Math.max(maxY, rowY + 56);
  });
  return maxY + 8;
}

function platformRow(doc, name, auth, method, scopes, status, y) {
  const rowH = 52;
  doc.roundedRect(LEFT, y, W, rowH, 4).fill('#FAFAFA').stroke(C.border);

  // Status dot
  const dotColor = status === 'DEMO ONLY' ? C.warning : status === 'Connected' ? C.success : C.faint;
  doc.circle(LEFT + 10, y + 11, 3).fill(dotColor);

  // Name
  doc.fontSize(9).fillColor(C.black).font('Helvetica-Bold')
    .text(name, LEFT + 18, y + 6, { width: 100 });

  // Auth badge
  let bx = LEFT + 18;
  let by = y + 20;
  bx = smallBadge(doc, auth, bx, by, C.purple, '#F5F3FF');
  bx = smallBadge(doc, method, bx, by, C.blue, '#EEF2FF');
  if (status === 'DEMO ONLY') smallBadge(doc, '⚠ DEMO DATA', bx, by, C.warning, '#FFFBEB');

  // Scopes
  doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
    .text('Scopes: ' + scopes, LEFT + 18, y + 37, { width: W - 28 });

  return y + rowH + 6;
}

function flowStep(doc, num, text, y, color) {
  doc.circle(LEFT + 9, y + 8, 8).fill(color);
  doc.fontSize(8).fillColor(C.white).font('Helvetica-Bold')
    .text(num.toString(), LEFT + 5.5, y + 4);
  doc.fontSize(9).fillColor(C.body).font('Helvetica')
    .text(text, LEFT + 24, y + 3, { width: W - 24 });
  const lineY = y + 18;
  if (num < 6) {
    doc.moveTo(LEFT + 9, lineY).lineTo(LEFT + 9, lineY + 6).stroke('#DBEAFE');
  }
  return lineY + 8;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE 1 — Overview & Tech Stack
// ═══════════════════════════════════════════════════════════════════
drawPageHeader(doc, 1, 'Overview  ·  Problem Statement  ·  Tech Stack');

// Hero title block
doc.rect(LEFT, 76, W, 62).fill(C.navy);
doc.roundedRect(LEFT, 76, 4, 62, 2).fill('#4A90D9');
doc.fontSize(18).fillColor(C.white).font('Helvetica-Bold')
  .text('Cluco Pre-Litigation Onboarding Pipeline', LEFT + 16, 84, { width: W - 20 });
doc.fontSize(9).fillColor('#A0C4E0').font('Helvetica')
  .text('Prototype Documentation  ·  Phase 1 — Connect & Collect  ·  v0.1.0', LEFT + 16, 110);

let y = 152;

// What is Cluco
y = sectionTitle(doc, '1. What is Cluco?', y);
y = bodyText(doc, 'Cluco is an intelligent document onboarding platform purpose-built for pre-litigation legal workflows. Before a legal case begins, paralegals and attorneys must collect hundreds of documents — police reports, medical records, witness statements, court filings, insurance claims — from scattered sources including email, cloud drives, and case management systems. This process is manual, slow, error-prone, and expensive.', y);
y += 4;
y = bodyText(doc, 'Cluco solves this by creating an automated, event-driven pipeline that connects to all document sources, ingests files in real-time, detects duplicates, flags incomplete records, and packages everything into a clean, searchable case dossier — ready for attorney review.', y);
y += 8;

// Problem Statement
y = sectionTitle(doc, '2. Problem Statement', y);

const problems = [
  ['Manual Collection', 'Paralegals spend 4–6 hours per case collecting documents from email, drives, and portals.'],
  ['Fragmented Sources', 'Documents live across Gmail, OneDrive, Clio, Dropbox — no single view.'],
  ['Duplicate Records', 'The same PDF arrives from email AND Google Drive, creating confusion.'],
  ['Incomplete Documents', 'Scanned files with blurry text or missing dates enter the case file undetected.'],
];
problems.forEach(([label, desc]) => {
  y = bullet(doc, label + ':', desc, y, 110);
  y += 1;
});
y += 6;

// Tech Stack
y = sectionTitle(doc, '3. Tech Stack Used in This Prototype', y);

y = twoCol(doc, [
  { title: 'Next.js 16.2.9 (App Router)', sub: 'Full-stack React framework. Handles UI + API routes in one codebase.', badge: 'Framework', badgeColor: C.navy },
  { title: 'TypeScript', sub: 'Strict typing ensures correctness across the pipeline logic and UI.', badge: 'Language', badgeColor: C.navy },
  { title: 'Tailwind CSS v4 + CSS Variables', sub: 'Utility-first styling with a custom design token system for consistency.', badge: 'Styling', badgeColor: C.purple },
  { title: 'Google Gemini (gemini-flash-latest)', sub: 'AI model for document classification, entity extraction, and legal analysis.', badge: 'AI Model', badgeColor: C.success },
  { title: 'Inter (Google Fonts)', sub: 'Professional sans-serif used by GitHub, Stripe, Vercel. Best readability.', badge: 'Typography', badgeColor: C.blue },
  { title: 'Local Filesystem + SQLite', sub: 'Documents stored in ~/.cluco/vault/. SQLite powers the persistent job queue.', badge: 'Storage', badgeColor: C.warning },
], y);

y += 4;
y = infoBox(doc, 'Why Gemini Flash? It is fast (sub-second for most docs), cost-effective, and supports structured JSON output — essential for extracting parties, dates, and categories reliably from legal text.', y, C.navy, '#EEF2FF');

drawPageFooter(doc, 1);

// ═══════════════════════════════════════════════════════════════════
// PAGE 2 — MCP Connections
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader(doc, 2, 'MCP Connections  ·  Authentication Architecture  ·  Platform-by-Platform Breakdown');

y = 76;
y = sectionTitle(doc, '4. What Are MCP Connections?', y);
y = bodyText(doc, 'MCP (Model Context Protocol) Connections are the integration bridges between Cluco and the external platforms where legal documents live. Each connected platform grants Cluco read-only access to specific folders, labels, or matters. Documents flow from these sources into the local vault automatically — no manual download needed.', y);
y += 8;

y = sectionTitle(doc, '5. Why OAuth 2.0 — Not API Keys — For SaaS Platforms', y);

const oauthReasons = [
  ['No password sharing', 'Users authenticate on the platform\'s own screen (Google, Microsoft). Cluco never sees credentials.'],
  ['Scoped permissions', 'We request only drive.readonly — not full account access. Principle of least privilege.'],
  ['Revocable tokens', 'Users can disconnect Cluco from their Google Account settings at any time, instantly.'],
  ['Auto-expiring tokens', 'Access tokens expire in 1 hour. Even if intercepted, they go stale. Refresh tokens stored encrypted.'],
  ['Compliance', 'OAuth 2.0 is the standard for GDPR, HIPAA, and SOC2 compliance in SaaS integrations.'],
];
oauthReasons.forEach(([label, desc]) => {
  y = bullet(doc, label + ':', desc, y, 130);
  y += 1;
});
y += 10;

y = sectionTitle(doc, '6. Platform-by-Platform Connection Breakdown', y);

y += 4;
y = subHeading(doc, 'Connected Sources (OAuth 2.0)', y);

// ⚠ Important disclaimer box
y = infoBox(doc, '⚠  Important: In the current prototype, Google Drive and Gmail display as "Connected" as DEMO DATA ONLY. No real OAuth credentials have been configured. Real connections require Google Cloud Console app registration, CLIENT_ID/SECRET in .env, and OAuth callback routes in the Next.js API.', y, C.warning, '#FFFBEB');

y = platformRow(doc,
  'Google Drive',
  'OAuth 2.0',
  'Delta + Webhook',
  'drive.readonly, drive.metadata.readonly',
  'DEMO ONLY',
  y
);
y = platformRow(doc,
  'Gmail',
  'OAuth 2.0',
  'Cloud Pub/Sub',
  'gmail.readonly, gmail.labels',
  'DEMO ONLY',
  y
);
y = platformRow(doc,
  'Microsoft OneDrive',
  'OAuth 2.0 (Graph)',
  'Graph Subscriptions',
  'Files.Read, Files.Read.All',
  'Disconnected',
  y
);
y = platformRow(doc,
  'Microsoft Outlook',
  'OAuth 2.0 (Graph)',
  'Graph Webhooks',
  'Mail.Read, Mail.ReadBasic',
  'Disconnected',
  y
);
y = platformRow(doc,
  'Dropbox',
  'OAuth 2.0 + PKCE',
  'Dropbox Webhook + Cursor',
  'files.content.read, files.metadata.read',
  'Disconnected',
  y
);
y = platformRow(doc,
  'Clio Manage',
  'OAuth 2.0 + Webhooks',
  'Real-time (matter.document.created)',
  'matters.read, documents.read, contacts.read',
  'Disconnected',
  y
);
y += 4;

y = subHeading(doc, 'Why Each Sync Method Was Chosen', y);
const syncReasons = [
  ['Google Drive — Delta + Webhook:', 'Google Watch API fires a webhook on any change. We then call the Delta API with a pageToken (cursor) to fetch only what changed. This avoids re-scanning all 10,000 files on every event.'],
  ['Gmail — Cloud Pub/Sub:', 'Gmail push notifications require Google Cloud Pub/Sub — direct webhooks are not supported for Gmail. Pub/Sub buffers message backlogs reliably, ensuring no email attachment is missed even if Cluco is briefly offline.'],
  ['Clio — OAuth + Webhooks:', 'Real-time matter.document.created events. A law firm adds a file to a case at 2pm — it appears in Cluco within seconds, not on the next hourly scan.'],
  ['OneDrive / Outlook — Microsoft Graph:', 'Microsoft Graph provides a unified API for all Microsoft 365 services. Graph Subscriptions (webhooks) notify us of changes with a deltaLink for efficient syncing.'],
];
syncReasons.forEach(([label, desc]) => {
  y = bullet(doc, label, desc, y, 160);
  y += 2;
});

drawPageFooter(doc, 2);

// ═══════════════════════════════════════════════════════════════════
// PAGE 3 — Collection Flow & What's Next
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
drawPageHeader(doc, 3, 'Collection & Sync Architecture  ·  Local Vault  ·  Deduplication  ·  Roadmap');

y = 76;
y = sectionTitle(doc, '7. Why Event-Driven Collection — Not Polling', y);

y = infoBox(doc,
  'Polling asks "did anything change?" every hour — burning 2,500+ API calls/hour across 500 firms, most returning nothing. Event-driven means platforms call US the instant a document is added. Zero wasted calls. Sub-second latency.',
  y, C.navy, '#EEF2FF'
);

const comparison = [
  ['Approach', 'Polling', 'Event-Driven (Chosen)'],
  ['Latency', 'Up to 1 hour', 'Under 1 second'],
  ['API calls', 'Thousands/hour', 'Only on real changes'],
  ['Scalability', 'Fails at 1,000+ firms', 'Scales to millions'],
  ['Data freshness', 'Stale', 'Real-time'],
];

// Simple table
const colWidths = [120, 120, W - 240];
const tableX = LEFT;
let tableY = y;

comparison.forEach((row, ri) => {
  const rowH = 18;
  const bg = ri === 0 ? C.navy : ri % 2 === 0 ? '#F8F9FC' : C.white;
  doc.rect(tableX, tableY, W, rowH).fill(bg).stroke(C.border);
  row.forEach((cell, ci) => {
    const cx = tableX + colWidths.slice(0, ci).reduce((a, b) => a + b, 0);
    const textColor = ri === 0 ? C.white : ci === 2 ? C.success : C.body;
    const font = ri === 0 || ci === 0 ? 'Helvetica-Bold' : 'Helvetica';
    doc.fontSize(8).fillColor(textColor).font(font)
      .text(cell, cx + 6, tableY + 5, { width: colWidths[ci] - 8 });
    if (ci < row.length - 1) {
      doc.moveTo(cx + colWidths[ci], tableY).lineTo(cx + colWidths[ci], tableY + rowH).stroke(C.border);
    }
  });
  tableY += rowH;
});

y = tableY + 12;

y = sectionTitle(doc, '8. The 6-Step Collection Pipeline', y);
y += 4;
y = flowStep(doc, 1, 'Platform fires webhook → Cluco server receives event → responds 200 OK in under 50ms', y, C.purple);
y = flowStep(doc, 2, 'SHA-256 fingerprint computed from file metadata → checked against local hash store → if seen, skip (deduplication)', y, C.warning);
y = flowStep(doc, 3, 'File downloaded from source API → written raw to local vault: C:\\Users\\vinay\\.cluco\\vault\\raw\\', y, C.blue);
y = flowStep(doc, 4, 'Job record inserted into SQLite queue — survives server restarts, unlike in-memory queues', y, C.success);
y = flowStep(doc, 5, 'Background worker picks up job → runs OCR (Tesseract / Gemini Vision) → entity extraction via Gemini', y, C.navy);
y = flowStep(doc, 6, 'On failure: exponential backoff retry ×3 (1min, 2min, 4min) → dead queue → user alert in dashboard', y, C.danger);

y += 4;
y = sectionTitle(doc, '9. Local Document Vault — Why Not Cloud Storage', y);

const vaultReasons = [
  ['Privacy-first', 'Legal documents contain sensitive PII. Storing locally means they never leave your machine.'],
  ['Zero cost', 'No S3 storage fees ($0.023/GB/month), no data transfer costs, no egress fees.'],
  ['Speed', 'Local disk writes are 10–100× faster than network uploads to S3.'],
  ['Simplicity', 'No IAM policies, no bucket configuration, no CORS setup needed for the prototype.'],
];
vaultReasons.forEach(([label, desc]) => {
  y = bullet(doc, label + ':', desc, y, 100);
  y += 1;
});

// Vault structure display
y += 6;
doc.roundedRect(LEFT, y, W, 38, 4).fill('#F8F9FC').stroke(C.border);
doc.fontSize(8).fillColor(C.navy).font('Helvetica-Bold').text('Vault Structure', LEFT + 10, y + 6);
doc.fontSize(8).fillColor(C.muted).font('Courier')
  .text('C:\\Users\\vinay\\.cluco\\vault\\raw\\     ← Original files (never modified)', LEFT + 10, y + 19, { width: W - 20 });
y += 46;

y = sectionTitle(doc, '10. What Comes Next — Phase 2 Onwards', y);

const nextPhases = [
  ['Phase 2 — Extract & Normalize', 'OCR on all ingested files (Gemini Vision + Tesseract fallback). Clean text extraction. Metadata structuring.'],
  ['Phase 3 — Quality Management', 'Incomplete document detection: missing parties, missing dates, low OCR confidence → human review queue.'],
  ['Phase 4 — Case Attribution', 'AI matches documents to cases based on extracted entity names, dates, and case numbers. Confidence scoring.'],
  ['Phase 5 — Package & Deliver', 'Generate structured case dossier. Export to Clio/MyCase. Attorney review dashboard with flagged items.'],
];
nextPhases.forEach(([phase, desc]) => {
  y = bullet(doc, phase + ':', desc, y, 175);
  y += 2;
});

y += 8;
// Closing note
doc.roundedRect(LEFT, y, W, 28, 4).fill(C.navy);
doc.fontSize(8.5).fillColor(C.white).font('Helvetica-Bold')
  .text('Current Prototype Status:', LEFT + 12, y + 7, { continued: true })
  .font('Helvetica').fillColor('#A0C4E0')
  .text('  Phase 1 frontend complete. MCP connection UI built. Real OAuth wiring is the next engineering milestone.');

drawPageFooter(doc, 3);

doc.end();
console.log('✓ PDF generated:', outputPath);
