const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 56, bottom: 56, left: 60, right: 60 },
  info: {
    Title: 'Legal Research Platforms — API Access, Pricing & Integration Guide',
    Author: 'Cluco Legal Intelligence',
    Subject: 'CourtListener, GovInfo, LexisNexis, Westlaw, Google Scholar',
  },
});

const outputPath = path.join(__dirname, 'Legal_Research_Platforms_Guide.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  navy:    '#1E3A5F',
  black:   '#111111',
  body:    '#3B3B3B',
  muted:   '#6B6B6B',
  faint:   '#9B9B9B',
  border:  '#E5E4E0',
  white:   '#FFFFFF',
  bg:      '#F7F7F5',
  purple:  '#6D28D9',
  purpleL: '#F5F3FF',
  purpleB: '#DDD6FE',
  green:   '#047857',
  greenL:  '#ECFDF5',
  greenB:  '#6EE7B7',
  red:     '#B91C1C',
  redL:    '#FEF2F2',
  redB:    '#FECACA',
  blue:    '#1E40AF',
  blueL:   '#EFF6FF',
  blueB:   '#BFDBFE',
  orange:  '#C2410C',
  orangeL: '#FFF7ED',
  orangeB: '#FED7AA',
  gold:    '#B45309',
  goldL:   '#FEFCE8',
  goldB:   '#FDE68A',
  success: '#16A34A',
  warning: '#D97706',
  danger:  '#DC2626',
};

const W   = 595 - 120;
const L   = 60;
const PW  = 595;

// ─── Helpers ──────────────────────────────────────────────────────────────────

let totalPages = 7;

function hdr(pageNum, subtitle) {
  // Navy top bar
  doc.rect(0, 0, PW, 40).fill(C.navy);
  doc.fontSize(8.5).fillColor(C.white).font('Helvetica-Bold')
     .text('CLUCO', L, 14, { continued: true })
     .font('Helvetica').fillColor('#A0B4CC')
     .text('  ·  Legal Research Platforms — API Access, Pricing & Integration Guide');
  doc.fontSize(8).fillColor('#A0B4CC')
     .text(`Page ${pageNum} of ${totalPages}`, 0, 15, { align: 'right', width: PW - 28 });
  // Subtitle strip
  doc.rect(0, 40, PW, 24).fill('#F0F4F9');
  doc.fontSize(8).fillColor(C.muted).font('Helvetica').text(subtitle, L, 50);
  doc.fillColor(C.black);
}

function ftr(pageNum) {
  const fy = 842 - 38;
  doc.rect(L, fy, W, 0.5).fill(C.border);
  doc.fontSize(7).fillColor(C.faint).font('Helvetica')
     .text('Cluco Legal Intelligence  ·  Confidential  ·  For Internal Use Only', L, fy + 7, { width: W / 2 });
  doc.text(`Page ${pageNum} of ${totalPages}`, L + W / 2, fy + 7, { width: W / 2, align: 'right' });
}

function secTitle(text, y, color, bg) {
  const c  = color || C.navy;
  const b  = bg    || '#EEF2FF';
  doc.rect(L, y, W, 22).fill(b);
  doc.roundedRect(L, y, 4, 22, 1).fill(c);
  doc.fontSize(10.5).fillColor(c).font('Helvetica-Bold').text(text, L + 12, y + 6);
  doc.fillColor(C.black);
  return y + 30;
}

function subH(text, y, color) {
  doc.fontSize(9.5).fillColor(color || C.navy).font('Helvetica-Bold').text(text, L, y);
  doc.rect(L, y + 13, W, 0.5).fill(color || C.navy);
  return y + 22;
}

function body(text, y, opts) {
  doc.fontSize(8.8).fillColor(C.body).font('Helvetica')
     .text(text, L + (opts && opts.indent || 0), y, {
       width: W - (opts && opts.indent || 0),
       lineGap: 2.5,
       ...(opts || {}),
     });
  return doc.y + 4;
}

function bullet(label, val, y, lw) {
  const lWidth = lw || 140;
  doc.rect(L + 4, y + 4, 4, 4).fill(C.navy);
  doc.fontSize(8.8).fillColor(C.black).font('Helvetica-Bold')
     .text(label, L + 14, y, { width: lWidth, lineGap: 2 });
  const afterLabel = doc.y;
  if (val) {
    doc.fontSize(8.8).fillColor(C.body).font('Helvetica')
       .text(val, L + 14 + lWidth, y - (afterLabel - y) + (afterLabel - y), { width: W - 14 - lWidth, lineGap: 2 });
  }
  return Math.max(doc.y, afterLabel) + 4;
}

function badge(text, x, y, color, bg) {
  const tw = doc.fontSize(7).widthOfString(text) + 10;
  doc.roundedRect(x, y, tw, 13, 3).fill(bg);
  doc.fontSize(7).fillColor(color).font('Helvetica-Bold').text(text, x + 5, y + 3);
  return x + tw + 5;
}

function infoBox(text, y, borderC, bgC, h) {
  const boxH = h || 30;
  doc.roundedRect(L, y, W, boxH, 4).fill(bgC);
  doc.roundedRect(L, y, 3, boxH, 2).fill(borderC);
  doc.fontSize(8.5).fillColor(C.body).font('Helvetica')
     .text(text, L + 10, y + 8, { width: W - 20, lineGap: 2.5 });
  return y + boxH + 8;
}

function divider(y) {
  doc.rect(L, y, W, 0.5).fill(C.border);
  return y + 10;
}

// Table helper
function table(headers, rows, y, colWidths, opts) {
  const rowH  = opts && opts.rowH  || 17;
  const hColor = opts && opts.hColor || C.navy;
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  // Header
  doc.rect(L, y, totalW, rowH).fill(hColor);
  let cx = L;
  headers.forEach((h, i) => {
    doc.fontSize(7.5).fillColor(C.white).font('Helvetica-Bold')
       .text(h, cx + 5, y + 5, { width: colWidths[i] - 8 });
    if (i < headers.length - 1) doc.moveTo(cx + colWidths[i], y).lineTo(cx + colWidths[i], y + rowH).stroke('#FFFFFF30');
    cx += colWidths[i];
  });
  y += rowH;

  // Rows
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? C.white : '#F8F9FC';
    doc.rect(L, y, totalW, rowH).fill(bg).stroke(C.border);
    let rx = L;
    row.forEach((cell, ci) => {
      const textColor = cell && cell.color ? cell.color : C.body;
      const font      = cell && cell.bold  ? 'Helvetica-Bold' : 'Helvetica';
      const cellText  = typeof cell === 'object' ? cell.text : cell;
      doc.fontSize(7.5).fillColor(textColor).font(font)
         .text(cellText || '', rx + 5, y + 5, { width: colWidths[ci] - 8 });
      if (ci < row.length - 1) doc.moveTo(rx + colWidths[ci], y).lineTo(rx + colWidths[ci], y + rowH).stroke(C.border);
      rx += colWidths[ci];
    });
    y += rowH;
  });
  return y + 6;
}

// Platform header banner
function platBanner(name, tagline, accessType, costType, color, bg, y) {
  doc.roundedRect(L, y, W, 46, 6).fill(bg);
  doc.roundedRect(L, y, 4, 46, 3).fill(color);
  doc.fontSize(14).fillColor(color).font('Helvetica-Bold').text(name, L + 14, y + 7);
  doc.fontSize(8.5).fillColor(C.muted).font('Helvetica').text(tagline, L + 14, y + 26);
  let bx = L + 14;
  let by = y + 26;
  // Place badges to the right
  by = y + 9;
  bx = L + W - 180;
  bx = badge(accessType, bx, by, color, color + '20');
  badge(costType, bx + 4, by, C.body, '#F3F4F6');
  return y + 54;
}


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — Cover + Executive Summary
// ═══════════════════════════════════════════════════════════════════════════════

hdr(1, 'Cover  ·  Executive Summary  ·  Platform Comparison Overview');

// Hero
doc.rect(L, 76, W, 72).fill(C.navy);
doc.roundedRect(L, 76, 4, 72, 2).fill('#4A90D9');
doc.fontSize(20).fillColor(C.white).font('Helvetica-Bold')
   .text('Legal Research Platforms', L + 16, 86, { width: W - 20 });
doc.fontSize(11).fillColor('#7FB3D3').font('Helvetica')
   .text('API Access · Pricing Tiers · Rate Limits · Integration Strategy', L + 16, 112);
doc.fontSize(8).fillColor('#A0B4CC')
   .text('CourtListener  ·  GovInfo  ·  LexisNexis  ·  Westlaw  ·  Google Scholar  ·  Prepared by Cluco Legal Intelligence', L + 16, 130);

let y = 162;

y = secTitle('Executive Summary', y);
y = body('This document provides a comprehensive technical and commercial analysis of the five primary legal research platforms integrated or evaluated for Cluco — the pre-litigation onboarding intelligence platform. For each platform we document: (1) what data is available, (2) exactly how API access works, (3) every pricing tier including rate limits and overages, and (4) the precise technical integration strategy used in our production codebase.', y);
y += 6;

y = secTitle('Platform Quick-Reference Matrix', y);
y = table(
  ['Platform', 'Access Model', 'API Key', 'Cost', 'Rate Limit', 'Coverage', 'Status in Cluco'],
  [
    [
      { text: 'CourtListener', bold: true, color: C.purple },
      'Token Auth',
      { text: 'Free token', color: C.green },
      { text: '$0 (non-profit)', color: C.green },
      '5,000 req/hr',
      '50M+ US opinions',
      { text: 'LIVE ✓', color: C.success, bold: true },
    ],
    [
      { text: 'GovInfo', bold: true, color: C.green },
      'API Key (data.gov)',
      { text: 'Free key', color: C.green },
      { text: '$0 (US Gov)', color: C.green },
      '36,000 req/hr',
      'Full US federal law',
      { text: 'LIVE ✓', color: C.success, bold: true },
    ],
    [
      { text: 'LexisNexis', bold: true, color: C.red },
      'Enterprise OAuth',
      { text: 'Enterprise only', color: C.red },
      { text: '$114–$500+/mo', color: C.warning },
      'Custom SLA',
      '15B+ documents',
      { text: 'Deep-link', color: C.warning },
    ],
    [
      { text: 'Westlaw', bold: true, color: C.blue },
      'Enterprise OAuth',
      { text: 'Enterprise only', color: C.red },
      { text: '$107–$400+/seat', color: C.warning },
      'Custom SLA',
      'Premium case law',
      { text: 'Deep-link', color: C.warning },
    ],
    [
      { text: 'Google Scholar', bold: true, color: C.orange },
      'SerpApi Proxy',
      { text: 'SerpApi key', color: C.warning },
      { text: '$0–$275/mo', color: C.warning },
      '50–6,000 req/hr',
      'Academic + legal',
      { text: 'Configured', color: C.blue },
    ],
  ],
  y,
  [90, 80, 68, 80, 75, 82, 60],
  { rowH: 18, hColor: C.navy }
);

y += 4;
y = infoBox(
  '★  Key Insight: CourtListener + GovInfo deliver enterprise-grade US legal coverage at $0 cost. Together they cover 50M+ court opinions + the entire US Code, CFR, and Federal Register — replacing the core research function of a $400/seat Westlaw subscription for primary law.',
  y, C.navy, '#EEF2FF', 34
);

ftr(1);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — CourtListener Deep Dive
// ═══════════════════════════════════════════════════════════════════════════════

doc.addPage();
hdr(2, 'Platform 1 of 5  ·  CourtListener  ·  Free Law Project');

y = 76;

y = platBanner('CourtListener', 'Free Law Project  ·  Non-Profit  ·  courtlistener.com', 'Token Auth', 'FREE', C.purple, C.purpleL, y);

// What is it
y = secTitle('What is CourtListener?', y, C.purple, C.purpleL);
y = body('CourtListener is operated by the Free Law Project, a 501(c)(3) non-profit organization. It is the largest open legal database in the United States, containing over 50 million court opinions sourced from all 94 US federal district courts, all 13 circuit courts, the US Supreme Court, and thousands of state courts. It also provides the RECAP archive — a citizen-sourced collection of federal PACER court documents that would otherwise cost $0.10/page to access.', y);
y += 4;

y = secTitle('Data Coverage', y, C.purple, C.purpleL);
let cols2 = (W - 8) / 2;
let leftX = L, rightX = L + cols2 + 8;
const covLeft = [
  'US Supreme Court opinions (all, since 1754)',
  'US Courts of Appeals (all 13 circuits)',
  'US District Courts (all 94 districts)',
  'Bankruptcy courts',
  'State court opinions (all 50 states + DC)',
];
const covRight = [
  'PACER/RECAP federal dockets & documents',
  'Oral argument audio recordings',
  'Judge biographical data',
  'Attorney data (bar admissions)',
  'Citation network (50M+ citation links)',
];
let leftY = y, rightY = y;
covLeft.forEach(item => {
  doc.rect(leftX + 4, leftY + 4, 4, 4).fill(C.purple);
  doc.fontSize(8.5).fillColor(C.body).font('Helvetica').text(item, leftX + 14, leftY, { width: cols2 - 14, lineGap: 2 });
  leftY = doc.y + 3;
});
covRight.forEach(item => {
  doc.rect(rightX + 4, rightY + 4, 4, 4).fill(C.purple);
  doc.fontSize(8.5).fillColor(C.body).font('Helvetica').text(item, rightX + 14, rightY, { width: cols2 - 14, lineGap: 2 });
  rightY = doc.y + 3;
});
y = Math.max(leftY, rightY) + 4;

y = secTitle('API Access — Step by Step', y, C.purple, C.purpleL);

const steps = [
  ['Step 1 — Create Account', 'Go to courtlistener.com → Click "Sign Up" → Enter email + password. Account creation is instant and free. No credit card required. No identity verification needed.'],
  ['Step 2 — Generate API Token', 'Log in → Go to Profile (top-right avatar) → Find "API Token" section → Click "Generate Token" → Copy the token string (looks like: abc123def456...).'],
  ['Step 3 — Add to .env.local', 'Open your .env.local file → Set: COURTLISTENER_API_KEY=your_token_here → Save the file → Restart your Next.js server (Ctrl+C → npm run dev).'],
  ['Step 4 — How the Token Works', 'Every API request includes an HTTP Authorization header: Authorization: Token your_token_here. The server validates this token, identifies your account, and applies your rate limit bucket.'],
];
steps.forEach(([label, desc]) => {
  y = bullet(label + ':', desc, y, 148);
});
y += 4;

y = secTitle('API Endpoints Used in Cluco', y, C.purple, C.purpleL);
y = table(
  ['Endpoint', 'Method', 'Purpose', 'Response Format'],
  [
    ['/api/rest/v3/search/', 'GET', 'Full-text search across all opinions', 'JSON — paginated results'],
    ['/api/rest/v4/search/', 'GET', 'v4 (current) — same search, improved fields', 'JSON — paginated results'],
    ['/api/rest/v3/dockets/', 'GET', 'Search federal court dockets (PACER)', 'JSON — docket metadata'],
    ['/api/rest/v3/recap-documents/', 'GET', 'Individual PACER documents (free)', 'JSON + PDF download link'],
    ['/api/rest/v3/citation-lookup/', 'POST', 'Validate & extract citations from text', 'JSON — citation objects'],
  ],
  y,
  [140, 50, 160, 125]
);

y = secTitle('Rate Limits & Pricing Tiers', y, C.purple, C.purpleL);
y = table(
  ['Tier', 'Cost', 'Auth Required', 'Requests/Hour', 'Requests/Day', 'Citation Lookup'],
  [
    [{ text: 'No Token (Public)', color: C.danger }, { text: 'FREE', color: C.green }, 'No', { text: 'Blocked', color: C.danger }, { text: 'Blocked', color: C.danger }, { text: 'Blocked', color: C.danger }],
    [{ text: 'Free Token', color: C.success, bold: true }, { text: '$0', color: C.success }, { text: 'Yes (token)', bold: true }, { text: '5,000', color: C.success, bold: true }, { text: '~30,000 est.', color: C.success }, '60/min'],
    [{ text: 'Membership (TBD)', color: C.warning }, 'TBD 2025', 'Yes', 'Higher TBD', 'Higher TBD', 'Higher TBD'],
    [{ text: 'Enterprise/Bulk', color: C.navy }, 'Custom', 'Yes + NDA', 'Unlimited', 'Unlimited', 'Custom'],
  ],
  y,
  [105, 65, 80, 80, 80, 65]
);
y = infoBox('Note: CourtListener is in transition to a new membership model in 2025. The free 5,000 req/hr token tier is confirmed active as of mid-2026. Monitor free.law/blog for updates on paid tiers. The citation-lookup endpoint has a separate throttle of 60 validated citations per minute.', y, C.purple, C.purpleL, 36);

y = secTitle('Integration Strategy in Cluco', y, C.purple, C.purpleL);
y = body('Our API route at /api/research?platform=courtlistener acts as a server-side proxy. This approach keeps the API token hidden from the browser (never exposed in client-side code). The Next.js server makes the authenticated request, transforms the response, and returns clean JSON to the React component.', y);
y = body('Request URL: GET https://www.courtlistener.com/api/rest/v3/search/?q={query}&type=o&order_by=score+desc', y);
y = body('Response transformation: Normalises both v3 (camelCase) and v4 (snake_case) field names — case_name/caseName, date_filed/dateFiled, court_exact/court_id — into a single unified schema for the frontend.', y);

ftr(2);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — GovInfo Deep Dive
// ═══════════════════════════════════════════════════════════════════════════════

doc.addPage();
hdr(3, 'Platform 2 of 5  ·  GovInfo  ·  US Government Publishing Office');

y = 76;
y = platBanner('GovInfo', 'US Government Publishing Office (GPO)  ·  govinfo.gov  ·  api.govinfo.gov', 'api.data.gov Key', 'FREE (US Gov)', C.green, C.greenL, y);

y = secTitle('What is GovInfo?', y, C.green, C.greenL);
y = body('GovInfo is the official, authoritative digital repository of the US Government Publishing Office (GPO). It provides programmatic API access to the complete corpus of US primary law: the United States Code (all 54 titles), the Code of Federal Regulations (all titles), the Federal Register (daily), Congressional Bills, Congressional Records, Statutes at Large, and more. All data is government-authoritative — the same source used by federal courts and regulatory agencies.', y);
y += 4;

y = secTitle('Data Collections Available via API', y, C.green, C.greenL);
y = table(
  ['Collection Code', 'Full Name', 'Coverage', 'Update Frequency'],
  [
    ['USCODE',   'United States Code',              'All 54 titles, current + historical', 'Annual (January)'],
    ['CFR',      'Code of Federal Regulations',     'All titles, all parts & sections',    'Quarterly'],
    ['FR',       'Federal Register',                'Daily issues since 1994',             'Daily (business days)'],
    ['BILLS',    'Congressional Bills',             'House + Senate, 103rd Congress+',     'Real-time'],
    ['STATUTE',  'Statutes at Large',               'Vol. 1 (1789) to present',            'Per session'],
    ['CREC',     'Congressional Record',            'Daily proceedings since 1994',        'Daily'],
    ['GAOREPORTS','GAO Reports',                   'All GAO reports since 1971',           'As published'],
    ['PLAW',     'Public and Private Laws',         'All enacted laws by Congress',        'Per session'],
  ],
  y,
  [75, 150, 155, 95]
);

y = secTitle('API Key System — DEMO_KEY vs Personal Key', y, C.green, C.greenL);

y = table(
  ['Key Type', 'How to Get', 'Rate Limit / Hour', 'Rate Limit / Day', 'Identified By', 'Blocked If'],
  [
    [{ text: 'DEMO_KEY', bold: true, color: C.warning }, 'Built-in, no signup', { text: '1,000', color: C.warning }, { text: '10,000', color: C.warning }, 'Your IP Address', 'IP hits limit'],
    [{ text: 'Personal Key (Free)', bold: true, color: C.success }, 'api.data.gov/signup/', { text: '36,000', color: C.success }, { text: '~864,000', color: C.success }, 'Your Email/Account', 'Key hits limit'],
    [{ text: 'Agency/Enterprise', color: C.navy }, 'Contact GPO directly', 'Custom SLA', 'Custom SLA', 'Org Account', 'Custom threshold'],
  ],
  y,
  [90, 95, 80, 80, 90, 80]
);

y = infoBox(
  '⚠  Critical Difference: DEMO_KEY identifies you by IP address. In a law firm office with shared internet, ALL 50 attorneys share that 1,000 req/hr quota. One heavy user blocks everyone. A personal free key gives YOU your own 36,000 req/hr — 36× more capacity — still at $0 cost.',
  y, C.warning, '#FFFBEB', 40
);

y = secTitle('Detailed Rate Limit Rules', y, C.green, C.greenL);
const rlRules = [
  ['Primary limit:', '36,000 requests per hour per personal API key'],
  ['Per-minute limit:', '1,200 requests per minute (= 20 per second burst capacity)'],
  ['Per-second limit:', '40 requests per second (absolute maximum burst)'],
  ['Overage behavior:', 'HTTP 429 Too Many Requests returned. Your key is temporarily blocked. Block auto-lifts after 60 minutes.'],
  ['Contact for more:', 'Contact GPO at api@gpo.gov to request enterprise-level custom rate limits.'],
  ['No cost for higher:', 'There is no paid tier — higher limits are granted by GPO at their discretion for legitimate use cases.'],
];
rlRules.forEach(([l, v]) => { y = bullet(l, v, y, 140); });
y += 4;

y = secTitle('How the API Works — Technical Flow', y, C.green, C.greenL);
y = body('Search Request: GET https://api.govinfo.gov/search?query={q}&pageSize=10&offsetMark=*&collection=USCODE,CFR,FR&api_key={key}', y);
y += 2;
y = body('Key Parameters: query (full text search), collection (comma-separated collection codes), pageSize (max 100), offsetMark (* for first page, use nextPage value for pagination), api_key (your personal key or DEMO_KEY).', y);
y += 2;
y = body('Response Structure: { count: N, results: [{ packageId, title, collectionCode, collectionName, dateIssued, detailsLink }] }. The detailsLink points to the API summary endpoint. Cluco transforms this to the public govinfo.gov URL: https://www.govinfo.gov/app/details/{packageId}.', y);
y += 4;

y = secTitle('Integration Strategy in Cluco', y, C.green, C.greenL);
y = body('Cluco routes /api/research?platform=govinfo to a server-side Next.js API handler. The personal API key (GOVINFO_API_KEY env variable) is injected server-side — never exposed to the browser. The collection parameter is passed through, defaulting to USCODE,CFR,FR for broad federal law coverage. Results are transformed: raw API detailsLink is replaced with a clean public govinfo.gov URL for better user experience.', y);

ftr(3);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — LexisNexis Deep Dive
// ═══════════════════════════════════════════════════════════════════════════════

doc.addPage();
hdr(4, 'Platform 3 of 5  ·  LexisNexis  ·  RELX Group');

y = 76;
y = platBanner('LexisNexis', 'RELX Group  ·  LexisNexis Advance  ·  advance.lexis.com  ·  developer.lexisnexis.com', 'Enterprise OAuth 2.0', 'PAID — Subscription', C.red, C.redL, y);

y = secTitle('What is LexisNexis?', y, C.red, C.redL);
y = body('LexisNexis is one of the two dominant legal research platforms globally (alongside Westlaw). Owned by RELX Group, it provides access to 15+ billion searchable documents including case law, statutes, secondary sources, legal news (Law360), public records, and analytics. Its signature feature is Shepard\'s Citation Service — the industry standard for verifying whether a case is still good law. In 2023, it launched Lexis+ AI for AI-powered legal research.', y);
y += 4;

y = secTitle('Subscription Tiers (Research Platform — Public Pricing)', y, C.red, C.redL);
y = table(
  ['Plan', 'Attorneys', 'Monthly Cost', 'Annual Cost', 'Key Features'],
  [
    [{ text: 'Lexis+ Essentials', bold: true }, '1–3', '$114/mo/user', '~$1,368/user/yr', 'Basic case law, statutes, basic Shepard\'s'],
    [{ text: 'Lexis+ Pro', bold: true }, '1–5', '$171/mo/user', '~$2,052/user/yr', 'Full case law, secondary sources, analytics'],
    [{ text: 'Lexis+ AI', bold: true }, '1–10', '$220–280/mo/user', '~$3,000/user/yr', 'AI research, all sources, Shepard\'s full'],
    [{ text: 'Mid-Market', bold: true }, '11–50', 'Custom quote', 'Custom', 'Bundled, annual escalation clauses'],
    [{ text: 'Enterprise', bold: true }, '50+', 'Custom quote', 'Custom', 'API access, custom SLA, NDA required'],
  ],
  y,
  [115, 55, 80, 90, 135]
);

y = infoBox(
  '⚠  Important: Tiers above ($114–$280/user) are the consumer web platform (advance.lexis.com). API integration access — the kind needed to pull data programmatically into Cluco — is only available under Enterprise contracts. Enterprise pricing is custom-quoted and typically $50,000–$500,000+/year for law firms, depending on usage volume and content modules.',
  y, C.red, C.redL, 44
);

y = secTitle('API Access — Enterprise Only', y, C.red, C.redL);
const lnApiItems = [
  ['Developer Portal:', 'developer.lexisnexis.com — Browse documentation. Registration gives access to API specs, schemas, and sandbox documentation (read-only). No live API access without enterprise contract.'],
  ['Authentication:', 'OAuth 2.0 Client Credentials flow. LexisNexis issues client_id and client_secret after contract execution and NDA signing. Token endpoint: https://auth.lexisnexis.com/oauth/token.'],
  ['Access Process:', '(1) Contact sales at lexisnexis.com/contact → (2) Sales qualification call → (3) NDA execution → (4) Technical discovery → (5) Commercial proposal → (6) Contract → (7) Credentials issued. Timeline: 4–12 weeks.'],
  ['Rate Limits:', 'Custom SLA negotiated in contract. Typically defined as transactions/year (e.g., 500,000 API calls/year) rather than per-hour. Overages billed at per-call rate defined in contract.'],
  ['Data Modules:', 'Each content module is licensed separately: Case Law, Statutes, Shepard\'s, Secondary Sources, News (Law360), Public Records, Analytics (CourtLink), International Law.'],
];
lnApiItems.forEach(([l, v]) => { y = bullet(l, v, y, 118); });
y += 4;

y = secTitle('Integration Strategy in Cluco', y, C.red, C.redL);
y = body('Current Cluco Status: Deep-Link Integration. Because LexisNexis requires an enterprise contract to obtain API credentials, Cluco implements a premium gateway card with: (1) Full feature showcase, (2) A passthrough search input that constructs a deep link URL and opens LexisNexis Advance in the user\'s browser with the query pre-populated.', y);
y = body('Deep-link URL pattern: https://advance.lexis.com/search/#/page/1?q={encoded_query}. This allows users to seamlessly move from Cluco to LexisNexis for premium research. When enterprise credentials are obtained, the integration can be upgraded to a full API proxy following the same server-side pattern as CourtListener.', y);
y += 4;

y = secTitle('Cost Analysis — When to Upgrade', y, C.red, C.redL);
y = table(
  ['Firm Size', 'Annual LexisNexis Cost (Est.)', 'CourtListener Cost', 'GovInfo Cost', 'Coverage Gap'],
  [
    ['Solo (1 atty)', '$1,368/yr', '$0', '$0', 'Secondary sources, Shepard\'s'],
    ['Small (5 attys)', '$10,260/yr', '$0', '$0', 'Full citation validation'],
    ['Mid (25 attys)', '$60,000–120,000/yr', '$0', '$0', 'News, analytics, international'],
    ['Large (100+ attys)', '$200,000–500,000/yr', '$0', '$0', 'Custom SLA, dedicated support'],
  ],
  y,
  [85, 130, 80, 70, 110]
);

ftr(4);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — Westlaw Deep Dive
// ═══════════════════════════════════════════════════════════════════════════════

doc.addPage();
hdr(5, 'Platform 4 of 5  ·  Westlaw  ·  Thomson Reuters');

y = 76;
y = platBanner('Westlaw', 'Thomson Reuters  ·  Westlaw Precision  ·  next.westlaw.com  ·  developer.tr.com', 'Enterprise Contract', 'PAID — Subscription', C.blue, C.blueL, y);

y = secTitle('What is Westlaw?', y, C.blue, C.blueL);
y = body('Westlaw, published by Thomson Reuters, is the other dominant legal research platform alongside LexisNexis and is considered by many practitioners as the gold standard for US legal research. Its signature feature is KeyCite — a comprehensive citation service that flags negative treatment, history, and citing references. In 2023-24, Thomson Reuters launched Westlaw Precision and CoCounsel (powered by GPT-4) for AI-assisted research. Westlaw provides access to an unmatched depth of primary law, secondary sources (treatises, law reviews, practice guides), expert witness databases, and jury verdicts.', y);
y += 4;

y = secTitle('Subscription Tiers (Public + Estimated Enterprise)', y, C.blue, C.blueL);
y = table(
  ['Plan', 'Target', 'Monthly/User', 'Annual/User', 'Key Features'],
  [
    [{ text: 'Westlaw Essentials', bold: true }, 'Solo/Small', '$107–$160/mo', '~$1,284–1,920/yr', 'Core case law, statutes, basic KeyCite'],
    [{ text: 'Westlaw Pro', bold: true }, '2–10 attys', '$200–280/mo', '~$2,400–3,360/yr', 'Full case law, secondary sources, KeyCite'],
    [{ text: 'Westlaw Precision', bold: true }, '10+ attys', '$300–400/mo', '~$3,600–4,800/yr', 'AI research, CoCounsel integration, full'],
    [{ text: 'Mid-Market', bold: true }, '11–50', 'Custom quote', 'Custom', 'Bundled products, volume discounts'],
    [{ text: 'Enterprise', bold: true }, '50+', 'Custom quote', 'Custom', 'API access, Practical Law bundle, SLA'],
    [{ text: 'API Access Only', bold: true, color: C.red }, 'Developers', { text: 'Enterprise only', color: C.red }, { text: 'NDA required', color: C.red }, 'HighQ, Legal Tracker integration'],
  ],
  y,
  [110, 65, 80, 90, 130]
);

y = infoBox(
  'Thomson Reuters has a hard policy of no self-serve API access. Even existing Westlaw subscribers cannot simply "turn on" API access — it requires a separate enterprise API agreement, additional NDA, technical discovery process, and in most cases a larger commercial commitment than the research subscription alone.',
  y, C.blue, C.blueL, 40
);

y = secTitle('API Architecture — Technical Details', y, C.blue, C.blueL);
const wlApiItems = [
  ['Developer Portal:', 'developer.tr.com — Browse the API catalog. Provides technical documentation, schemas, and sandbox examples. Commercial access terms are separate from portal registration.'],
  ['Authentication:', 'OAuth 2.0 (client_credentials grant). After enterprise contract execution, Thomson Reuters provides client_id, client_secret, and authorized scopes. Token endpoint: https://auth.thomsonreuters.com/oauth/token.'],
  ['Available APIs:', 'Westlaw Edge Search API, KeyCite API, HighQ APIs, Legal Tracker APIs, Practical Law APIs. Each has separate licensing. Not all are available to all enterprise customers.'],
  ['Access Process:', '(1) Contact TR sales or your Account Manager → (2) NDA execution → (3) Technical assessment → (4) API entitlement agreement → (5) Credentials provisioned → (6) Integration. Timeline: 6–16 weeks.'],
  ['Rate Limits:', 'Not publicly disclosed. Defined per contract as annual transaction budgets. Overage fees apply. Typical enterprise: 1M–10M API calls/year included, overage at $X per thousand calls.'],
  ['KeyCite API:', 'Separate entitlement from search. Validates whether a case remains good law, lists negative treatment, direct history, and citing references. Critical for pre-litigation due diligence.'],
];
wlApiItems.forEach(([l, v]) => { y = bullet(l, v, y, 118); });
y += 4;

y = secTitle('Integration Strategy in Cluco', y, C.blue, C.blueL);
y = body('Current Cluco Status: Premium Deep-Link Integration. Westlaw does not offer public or self-serve API access. Cluco implements a feature showcase card with full product description, feature checklist, and a passthrough deep-link search: https://1.next.westlaw.com/Search/Results.html?query={encoded_query}. This opens Westlaw Precision in the user\'s browser with the query pre-populated — allowing seamless hand-off from Cluco\'s research hub.', y);
y += 2;
y = body('Upgrade path: When the firm obtains an enterprise Westlaw API contract, the integration can be upgraded to a full server-side proxy (same architecture as CourtListener) using the TR OAuth client credentials flow, with the client_id and client_secret stored in .env.local as WESTLAW_CLIENT_ID and WESTLAW_CLIENT_SECRET.', y);
y += 4;

y = secTitle('Westlaw vs LexisNexis — Side-by-Side for US Law Firms', y, C.blue, C.blueL);
y = table(
  ['Criterion', 'Westlaw', 'LexisNexis'],
  [
    ['Citation Service', { text: 'KeyCite (industry gold standard)', color: C.blue }, "Shepard's (equally trusted)"],
    ['AI Research', 'Westlaw Precision + CoCounsel (GPT-4)', 'Lexis+ AI (proprietary)'],
    ['Secondary Sources', 'Strongest (Am Jur, C.J.S., treatises)', 'Strong (Matthew Bender)'],
    ['Public Records', 'Limited', 'Very strong (CLEAR platform)'],
    ['Legal News', 'Reuters Legal', 'Law360 (very strong)'],
    ['International', 'Strong (multi-jurisdiction)', 'Strong (multi-jurisdiction)'],
    ['API Accessibility', 'Enterprise only, 6–16 wks', 'Enterprise only, 4–12 wks'],
    ['Small Firm Pricing', '~$107–400/mo', '~$114–280/mo'],
  ],
  y,
  [130, 185, 160]
);

ftr(5);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — Google Scholar Deep Dive
// ═══════════════════════════════════════════════════════════════════════════════

doc.addPage();
hdr(6, 'Platform 5 of 5  ·  Google Scholar via SerpApi  ·  Google LLC');

y = 76;
y = platBanner('Google Scholar', 'Google LLC  ·  scholar.google.com  ·  Access via SerpApi Proxy  ·  serpapi.com', 'SerpApi Key', 'FREE — $275/mo', C.orange, C.orangeL, y);

y = secTitle('What is Google Scholar (Legal)?', y, C.orange, C.orangeL);
y = body('Google Scholar is a freely accessible academic search engine from Google that also indexes millions of US state and federal court opinions. Unlike CourtListener (which focuses on US courts) or GovInfo (which focuses on statutes), Google Scholar provides broader academic and interdisciplinary coverage — including law review articles, treatises, and international legal sources — alongside case law. However, Google does NOT provide an official public API for Scholar.', y);
y += 4;

y = secTitle('Why SerpApi? — The Access Challenge', y, C.orange, C.orangeL);
y = body('Google Scholar has no official API. Direct web scraping of scholar.google.com violates Google\'s Terms of Service and is heavily rate-limited with CAPTCHAs and IP bans. SerpApi is a legitimate third-party proxy service that handles the scraping infrastructure, CAPTCHA solving, and IP rotation — and provides a clean JSON API for the results. SerpApi includes a "US Legal Shield" that covers users for the legal use of public search engine data.', y);
y += 4;

y = secTitle('SerpApi Pricing Tiers — All Tiers (2026)', y, C.orange, C.orangeL);
y = table(
  ['Plan', 'Monthly Cost', 'Searches/Month', 'Throughput/Hour', 'Features', 'Best For'],
  [
    [{ text: 'Free', bold: true, color: C.success }, { text: '$0', color: C.success }, { text: '250', color: C.success }, '50/hr', 'All engines, US Legal Shield', 'Prototyping, demos'],
    [{ text: 'Starter', bold: true }, '$25/mo', '1,000', '200/hr', 'All engines, priority support', 'Solo attorney'],
    [{ text: 'Developer', bold: true }, '$75/mo', '5,000', '1,000/hr', 'All engines, API batching', 'Small firm (5–15)'],
    [{ text: 'Production', bold: true }, '$150/mo', '15,000', '3,000/hr', 'All engines, SLA guarantee', 'Mid firm (15–50)'],
    [{ text: 'Big Data', bold: true }, '$275/mo', '30,000', '6,000/hr', 'All engines, dedicated support', 'Large firm (50+)'],
    [{ text: 'Enterprise', bold: true, color: C.navy }, 'Custom quote', 'Custom', 'Custom', 'Custom SLA, volume pricing', 'Enterprise (100+)'],
  ],
  y,
  [65, 65, 75, 65, 120, 85]
);

y = infoBox(
  'Cost Comparison: For a law firm doing ~500 Google Scholar searches/day, the Developer plan ($75/mo = $900/yr) provides adequate capacity. Compare this to $2,400–$4,800/yr per attorney for Westlaw or LexisNexis. For supplemental academic and secondary source research, SerpApi is extremely cost-effective.',
  y, C.orange, C.orangeL, 38
);

y = secTitle('How the SerpApi Google Scholar API Works', y, C.orange, C.orangeL);
y = body('Request URL: GET https://serpapi.com/search?engine=google_scholar_case_law&q={query}&api_key={key}', y);
y += 2;
const gsParams = [
  ['engine:', 'google_scholar_case_law — specifically targets the legal case law tab of Google Scholar'],
  ['q:', 'Your search query (same as typing in Google Scholar)'],
  ['api_key:', 'Your SerpApi key (from serpapi.com/manage-api-key)'],
  ['num:', 'Results per page (default 10, max 10)'],
  ['start:', 'Pagination offset (0, 10, 20, ...)'],
];
gsParams.forEach(([l, v]) => { y = bullet(l, v, y, 70); });
y += 2;
y = body('Response: JSON with an organic_results array. Each result contains: title (case name), link (Google Scholar URL), result_id, snippet, date, court, citation (when available). Cluco can display these alongside CourtListener results for comprehensive coverage.', y);
y += 4;

y = secTitle('Setup — Add SerpApi to Cluco', y, C.orange, C.orangeL);
const gsSetup = [
  ['Step 1:', 'Go to serpapi.com → Sign Up (email + password). Free plan is activated immediately.'],
  ['Step 2:', 'Go to serpapi.com/manage-api-key → Copy your API key.'],
  ['Step 3:', 'Add to .env.local → SERPAPI_KEY=your_serpapi_key_here'],
  ['Step 4:', 'The Google Scholar tab in Cluco\'s Research Hub will activate automatically.'],
];
gsSetup.forEach(([l, v]) => { y = bullet(l, v, y, 60); });
y += 4;

y = secTitle('Important Limitations', y, C.orange, C.orangeL);
const gsLimits = [
  ['Not official:', 'SerpApi is a third-party proxy. Google can change Scholar\'s structure at any time, which may temporarily break the API until SerpApi updates their parser.'],
  ['No full text:', 'SerpApi returns snippets and metadata, not full opinion text. For full opinions, users are directed to the Google Scholar page or CourtListener.'],
  ['US legal focus:', 'The google_scholar_case_law engine is optimized for US legal research. International case law coverage is limited.'],
  ['Searches expire:', 'SerpApi plans are monthly. Unused searches do NOT roll over to next month.'],
];
gsLimits.forEach(([l, v]) => { y = bullet(l, v, y, 95); });

ftr(6);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 7 — Integration Architecture + Cost Summary
// ═══════════════════════════════════════════════════════════════════════════════

doc.addPage();
hdr(7, 'Integration Architecture  ·  Total Cost Analysis  ·  Recommendations');

y = 76;

y = secTitle('Cluco Integration Architecture Overview', y);
y = body('All legal research platform integrations in Cluco follow the same security-first pattern: the Next.js API route (/api/research) acts as a server-side proxy. API keys and tokens are stored in .env.local (never in client code) and injected at request time. The browser only ever calls our own /api/research endpoint — it never touches external APIs directly.', y);
y += 4;

// Architecture diagram (text-based)
doc.roundedRect(L, y, W, 110, 6).fill('#F8F9FC').stroke(C.border);
doc.fontSize(8.5).fillColor(C.navy).font('Helvetica-Bold').text('Request Flow', L + 10, y + 8);

// Flow boxes
const flowItems = [
  { label: 'Browser', sub: 'React Component', x: L + 10, color: C.purple },
  { label: 'API Route', sub: '/api/research', x: L + 110, color: C.navy },
  { label: 'Platform API', sub: 'External Server', x: L + 210, color: C.green },
  { label: 'Response', sub: 'JSON → UI', x: L + 310, color: C.blue },
];
const boxY = y + 24;
flowItems.forEach((item, i) => {
  doc.roundedRect(item.x, boxY, 80, 36, 4).fill(item.color);
  doc.fontSize(8).fillColor(C.white).font('Helvetica-Bold').text(item.label, item.x + 5, boxY + 8, { width: 70 });
  doc.fontSize(7).fillColor('#FFFFFFAA').font('Helvetica').text(item.sub, item.x + 5, boxY + 22, { width: 70 });
  if (i < flowItems.length - 1) {
    const arrowX = item.x + 80;
    doc.moveTo(arrowX + 2, boxY + 18).lineTo(arrowX + 18, boxY + 18).stroke(C.border);
    doc.moveTo(arrowX + 14, boxY + 14).lineTo(arrowX + 18, boxY + 18).lineTo(arrowX + 14, boxY + 22).stroke(C.border);
  }
});

const noteY = boxY + 50;
const authNote = [
  { label: 'CourtListener:', val: 'Authorization: Token {COURTLISTENER_API_KEY}', color: C.purple },
  { label: 'GovInfo:', val: '?api_key={GOVINFO_API_KEY} (query param)', color: C.green },
  { label: 'SerpApi:', val: '?api_key={SERPAPI_KEY} (query param)', color: C.orange },
  { label: 'LexisNexis/Westlaw:', val: 'Deep-link redirect (no server auth yet)', color: C.red },
];
authNote.forEach((note, i) => {
  doc.fontSize(7.5).fillColor(note.color).font('Helvetica-Bold').text(note.label, L + 10 + i % 2 * 220, noteY + Math.floor(i / 2) * 14);
  doc.fontSize(7.5).fillColor(C.body).font('Helvetica').text(note.val, L + 10 + i % 2 * 220 + 80, noteY + Math.floor(i / 2) * 14, { width: 130 });
});
y = y + 118;

y = secTitle('Environment Variables — Complete Reference', y);
doc.roundedRect(L, y, W, 78, 4).fill('#1A1A2E');
const envLines = [
  '# CourtListener — Free token from courtlistener.com/profile/',
  'COURTLISTENER_API_KEY=your_token_here',
  '',
  '# GovInfo — Free key from api.data.gov/signup/ (DEMO_KEY works but use personal key)',
  'GOVINFO_API_KEY=2aRYrvtea7geRD5XNkhOEf8IV2wTOF3YeL1kMO2j',
  '',
  '# SerpApi — Google Scholar proxy. Free: 250/mo. serpapi.com/manage-api-key',
  'SERPAPI_KEY=your_serpapi_key_here',
];
envLines.forEach((line, i) => {
  const isComment = line.startsWith('#');
  const isEmpty   = line === '';
  doc.fontSize(7.5)
     .fillColor(isComment ? '#6EE7B7' : isEmpty ? C.white : '#93C5FD')
     .font(isComment ? 'Helvetica' : 'Courier')
     .text(line || ' ', L + 10, y + 8 + i * 8.5);
});
y = y + 86;

y = secTitle('Total Annual Cost Analysis — US Law Firm Scenarios', y);
y = table(
  ['Scenario', 'CourtListener', 'GovInfo', 'SerpApi', 'LexisNexis', 'Westlaw', 'TOTAL/YEAR'],
  [
    [{ text: 'Cluco (Current)', bold: true, color: C.success }, { text: '$0', color: C.success }, { text: '$0', color: C.success }, { text: '$0', color: C.success }, 'Deep-link', 'Deep-link', { text: '$0 / year', bold: true, color: C.success }],
    [{ text: 'Cluco + Scholar', bold: true }, { text: '$0', color: C.success }, { text: '$0', color: C.success }, { text: '$900', color: C.warning }, 'Deep-link', 'Deep-link', { text: '$900 / year', bold: true, color: C.warning }],
    ['Solo Attorney', '$0', '$0', '$0', '$1,368', '$1,284', { text: '$2,652 / year', bold: true }],
    ['Small Firm (5)', '$0', '$0', '$900', '$10,260', '$12,000', { text: '$23,160 / year', bold: true }],
    ['Mid Firm (25)', '$0', '$0', '$1,800', '$60,000', '$72,000', { text: '$133,800 / year', bold: true }],
    ['Enterprise (100)', '$0', '$0', '$3,300', '$200,000', '$240,000', { text: '$443,300 / year', bold: true }],
  ],
  y,
  [95, 65, 55, 60, 65, 65, 70]
);

y = infoBox(
  '★  Cluco\'s Strategic Value: By leveraging CourtListener + GovInfo (both $0), Cluco delivers enterprise-grade primary law research — all US case opinions + complete federal statutes and regulations — at zero licensing cost. For firms that need secondary sources and citation validation, LexisNexis and Westlaw remain necessary, but Cluco minimizes dependency on them by covering all primary law programmatically.',
  y, C.navy, '#EEF2FF', 46
);

y = secTitle('Final Recommendation Matrix', y);
y = table(
  ['Need', 'Recommended Platform', 'Cost', 'Timeline'],
  [
    ['US case law (opinions)', { text: 'CourtListener ✓ Already integrated', color: C.success }, '$0', 'Live now'],
    ['Federal statutes & CFR', { text: 'GovInfo ✓ Already integrated', color: C.success }, '$0', 'Live now'],
    ['Academic + law reviews', 'SerpApi/Google Scholar — add SERPAPI_KEY', '$0–$900/yr', '1 day'],
    ['Citation validation', 'LexisNexis Shepard\'s or Westlaw KeyCite', '$1,368+/yr', '4–16 weeks'],
    ['Secondary sources', 'LexisNexis or Westlaw subscription', '$1,368+/yr', '4–16 weeks'],
    ['Full API integration (LN)', 'Enterprise contract + NDA + integration', '$50,000+/yr', '2–6 months'],
    ['Full API integration (WL)', 'Enterprise contract + NDA + integration', '$50,000+/yr', '3–8 months'],
  ],
  y,
  [135, 160, 80, 100]
);

ftr(7);

doc.end();
console.log('✓ PDF generated:', outputPath);
