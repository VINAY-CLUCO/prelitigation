'use client';

import { useState, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────
type SyncMethod = 'webhook' | 'pubsub' | 'delta+webhook' | 's3-events' | 'poll-fallback';
type SourceStatus = 'listening' | 'syncing' | 'idle' | 'error';

interface CollectionRule {
  path: string;
  fileTypes: string[];
  description: string;
}

interface Source {
  id: string;
  name: string;
  icon: React.ReactNode;
  iconColor: string;
  status: SourceStatus;
  syncMethod: SyncMethod;
  docsQueued: number;
  docsCollected: number;
  lastEvent: string;
  latencyMs: number;
  deltaToken?: string;
  rules: CollectionRule[];
}

interface EventLog {
  id: number;
  ts: string;
  source: string;
  sourceColor: string;
  event: string;
  fileName: string;
  size: string;
  outcome: 'queued' | 'duplicate' | 'skipped' | 'error';
}

// ─── Sync Method Config ──────────────────────────────────────────────
const syncMethodConfig: Record<SyncMethod, { label: string; color: string; bg: string; border: string; tooltip: string }> = {
  'webhook': {
    label: 'Webhook',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    tooltip: 'Platform pushes events to us in real-time. Zero polling waste.',
  },
  'pubsub': {
    label: 'Cloud Pub/Sub',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    tooltip: 'Google publishes to our Pub/Sub topic. Handles message backlog automatically.',
  },
  'delta+webhook': {
    label: 'Delta + Webhook',
    color: '#16A34A',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    tooltip: 'Webhook fires on change, delta token fetches exact diff. O(changes) not O(all files).',
  },
  's3-events': {
    label: 'S3 EventBridge → SQS',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    tooltip: 'S3 bucket events flow through EventBridge into SQS queue. Native AWS pattern.',
  },
  'poll-fallback': {
    label: 'Poll (fallback)',
    color: '#9B9B9B',
    bg: '#F7F7F5',
    border: '#E5E4E0',
    tooltip: 'Used only when webhooks are not supported. Polls every 15 min to minimize lag.',
  },
};

// ─── Source Data ─────────────────────────────────────────────────────
const initialSources: Source[] = [
  {
    id: 'gdrive',
    name: 'Google Drive',
    iconColor: '#16A34A',
    status: 'listening',
    syncMethod: 'delta+webhook',
    docsQueued: 3,
    docsCollected: 84,
    lastEvent: '2 min ago',
    latencyMs: 340,
    deltaToken: 'APA91bGk8x…mQ7T',
    rules: [
      { path: '/Cases/Active/', fileTypes: ['pdf', 'docx'], description: 'Active case documents' },
      { path: '/Client Intake/', fileTypes: ['pdf', 'jpg', 'png'], description: 'Client intake forms & photos' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'gmail',
    name: 'Gmail',
    iconColor: '#DC2626',
    status: 'listening',
    syncMethod: 'pubsub',
    docsQueued: 1,
    docsCollected: 31,
    lastEvent: '18 min ago',
    latencyMs: 820,
    rules: [
      { path: 'Label: Legal-Incoming', fileTypes: ['pdf', 'docx'], description: 'Emails tagged Legal-Incoming with attachments' },
      { path: 'Label: Court-Filings', fileTypes: ['pdf'], description: 'Court filing emails' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    id: 'clio',
    name: 'Clio Manage',
    iconColor: '#4F46E5',
    status: 'syncing',
    syncMethod: 'webhook',
    docsQueued: 7,
    docsCollected: 132,
    lastEvent: '8 sec ago',
    latencyMs: 120,
    rules: [
      { path: 'All Active Matters', fileTypes: ['pdf', 'docx', 'txt'], description: 'Documents on any active matter' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    ),
  },
];

// ─── Event Log Data ───────────────────────────────────────────────────
const baseEvents: EventLog[] = [
  { id: 1, ts: '10:53:41', source: 'Clio', sourceColor: '#4F46E5', event: 'matter.document.created', fileName: 'Deposition_Williams_Final.pdf', size: '3.2 MB', outcome: 'queued' },
  { id: 2, ts: '10:53:38', source: 'Clio', sourceColor: '#4F46E5', event: 'matter.document.created', fileName: 'PoliceReport_Scan_0629.pdf', size: '1.1 MB', outcome: 'queued' },
  { id: 3, ts: '10:51:22', source: 'Google Drive', sourceColor: '#16A34A', event: 'drive.file.created', fileName: 'InsuranceClaim_AXA_signed.pdf', size: '820 KB', outcome: 'queued' },
  { id: 4, ts: '10:48:05', source: 'Google Drive', sourceColor: '#16A34A', event: 'drive.file.created', fileName: 'Medical_Summary_DrChen.docx', size: '245 KB', outcome: 'duplicate' },
  { id: 5, ts: '10:45:12', source: 'Gmail', sourceColor: '#DC2626', event: 'message.attachment', fileName: 'Court_Filing_4421.pdf', size: '560 KB', outcome: 'queued' },
  { id: 6, ts: '10:44:58', source: 'Google Drive', sourceColor: '#16A34A', event: 'drive.file.modified', fileName: 'Witness_Statement_v2.docx', size: '180 KB', outcome: 'queued' },
  { id: 7, ts: '10:40:31', source: 'Clio', sourceColor: '#4F46E5', event: 'matter.document.created', fileName: 'ER_Records_Mercy.pdf', size: '5.1 MB', outcome: 'queued' },
  { id: 8, ts: '10:38:17', source: 'Gmail', sourceColor: '#DC2626', event: 'message.attachment', fileName: 'Invoice_Legal_Fees.pdf', size: '95 KB', outcome: 'skipped' },
  { id: 9, ts: '10:35:04', source: 'Google Drive', sourceColor: '#16A34A', event: 'drive.file.created', fileName: 'Accident_Photos.zip', size: '18.5 MB', outcome: 'error' },
  { id: 10, ts: '10:31:49', source: 'Clio', sourceColor: '#4F46E5', event: 'matter.document.created', fileName: 'ContractNDA_2026.pdf', size: '430 KB', outcome: 'queued' },
];

const outcomeConfig = {
  queued: { label: 'Queued', color: '#2563EB', bg: '#EEF2FF', border: '#BFDBFE' },
  duplicate: { label: 'Duplicate', color: '#9B9B9B', bg: '#F7F7F5', border: '#E5E4E0' },
  skipped: { label: 'Skipped', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  error: { label: 'Error', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const statusConfig: Record<SourceStatus, { label: string; color: string; dot: string; pulse: boolean }> = {
  listening: { label: 'Listening', color: '#16A34A', dot: '#16A34A', pulse: true },
  syncing: { label: 'Syncing…', color: '#2563EB', dot: '#2563EB', pulse: true },
  idle: { label: 'Idle', color: '#9B9B9B', dot: '#9B9B9B', pulse: false },
  error: { label: 'Error', color: '#DC2626', dot: '#DC2626', pulse: false },
};

// ─── Main Component ───────────────────────────────────────────────────
export default function CollectionPage() {
  const [sources] = useState<Source[]>(initialSources);
  const [events, setEvents] = useState<EventLog[]>(baseEvents);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [queueDepth, setQueueDepth] = useState(11);
  const [processedCount, setProcessedCount] = useState(247);
  const [tick, setTick] = useState(0);

  // Simulate live queue processing
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setQueueDepth((q) => (q > 0 ? q - 1 : Math.floor(Math.random() * 3)));
      setProcessedCount((c) => c + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Simulate new events arriving
  useEffect(() => {
    if (tick > 0 && tick % 5 === 0) {
      const newEvent: EventLog = {
        id: Date.now(),
        ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
        source: ['Clio', 'Google Drive', 'Gmail'][Math.floor(Math.random() * 3)],
        sourceColor: ['#4F46E5', '#16A34A', '#DC2626'][Math.floor(Math.random() * 3)],
        event: ['matter.document.created', 'drive.file.created', 'message.attachment'][Math.floor(Math.random() * 3)],
        fileName: ['NewDoc_' + Date.now().toString().slice(-4) + '.pdf', 'Record_Update.docx', 'Filing_Scan.pdf'][Math.floor(Math.random() * 3)],
        size: ['1.2 MB', '340 KB', '2.8 MB'][Math.floor(Math.random() * 3)],
        outcome: 'queued',
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 14)]);
    }
  }, [tick]);

  const totalQueued = sources.reduce((a, s) => a + s.docsQueued, 0);
  const activeSources = sources.filter((s) => s.status === 'listening' || s.status === 'syncing').length;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1120 }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
            letterSpacing: '0.6px',
          }}>
            PHASE 1
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Connect &amp; Collect</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Collection &amp; Sync
        </h1>
        <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
          Documents are discovered via event-driven webhooks and queued for extraction. Real-time. Zero polling waste.
        </p>
      </div>

      {/* ── Top Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Active Sources', value: `${activeSources}`, sub: `of ${sources.length} connected`, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Queue Depth', value: `${queueDepth}`, sub: 'documents waiting', color: '#2563EB', bg: '#EEF2FF' },
          { label: 'Total Collected', value: `${processedCount}`, sub: 'since last reset', color: '#1E3A5F', bg: '#EEF2FF' },
          { label: 'Avg Webhook Latency', value: '427ms', sub: 'event to queue time', color: '#7C3AED', bg: '#F5F3FF' },
        ].map((s) => (
          <div key={s.label} className="surface" style={{ padding: '16px 18px', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: '-0.8px', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, alignItems: 'start' }}>

        {/* ── Left: Source Cards ── */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: 12 }}>
            Active Sources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sources.map((src) => {
              const sCfg = statusConfig[src.status];
              const mCfg = syncMethodConfig[src.syncMethod];
              const isExpanded = expandedRule === src.id;
              return (
                <div key={src.id} className="surface" style={{ boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 18px' }}>
                    {/* Row 1: Icon + Name + Status + Method */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        backgroundColor: '#F0FDF4', border: '1px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: src.iconColor,
                      }}>
                        {src.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{src.name}</span>
                          {/* Sync method badge */}
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                            backgroundColor: mCfg.bg, color: mCfg.color, border: `1px solid ${mCfg.border}`,
                          }}>
                            {mCfg.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                          Last event: <strong style={{ color: 'var(--text-secondary)' }}>{src.lastEvent}</strong>
                          &nbsp;·&nbsp;Latency: <strong style={{ color: 'var(--text-secondary)' }}>{src.latencyMs}ms</strong>
                          {src.deltaToken && <>&nbsp;·&nbsp;Token: <code style={{ fontSize: 10, backgroundColor: 'var(--bg-base)', padding: '0 4px', borderRadius: 3 }}>{src.deltaToken}</code></>}
                        </div>
                      </div>
                      {/* Status indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: 8, height: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sCfg.dot }} />
                          {sCfg.pulse && (
                            <div style={{
                              position: 'absolute', inset: -2, borderRadius: '50%',
                              border: `2px solid ${sCfg.dot}`, opacity: 0.4,
                              animation: 'pulse 1.8s ease-in-out infinite',
                            }} />
                          )}
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: sCfg.color }}>{sCfg.label}</span>
                      </div>
                    </div>

                    {/* Row 2: Metrics */}
                    <div style={{
                      marginTop: 14, display: 'flex', gap: 0,
                      borderRadius: 8, border: '1px solid var(--border-light)',
                      overflow: 'hidden',
                    }}>
                      {[
                        { label: 'In Queue', value: src.docsQueued, color: '#2563EB' },
                        { label: 'Collected', value: src.docsCollected, color: '#16A34A' },
                        { label: 'Watching', value: src.rules.length, color: '#7C3AED' },
                      ].map((m, i) => (
                        <div key={m.label} style={{
                          flex: 1, padding: '10px 14px', textAlign: 'center',
                          borderRight: i < 2 ? '1px solid var(--border-light)' : 'none',
                          backgroundColor: 'var(--bg-base)',
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Collection Rules toggle */}
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : src.id)}
                      style={{
                        marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', padding: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      Collection Rules ({src.rules.length})
                    </button>
                  </div>

                  {/* Expanded Rules */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-base)' }}>
                      {src.rules.map((rule, i) => (
                        <div key={i} style={{
                          padding: '11px 18px',
                          borderBottom: i < src.rules.length - 1 ? '1px solid var(--border-light)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{rule.path}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{rule.description}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {rule.fileTypes.map((ft) => (
                              <span key={ft} style={{
                                fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                                backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                                color: 'var(--text-secondary)', textTransform: 'uppercase',
                              }}>{ft}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Queue Architecture Note */}
          <div style={{
            marginTop: 16, padding: '14px 16px', borderRadius: 9,
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              How the Queue Works
            </div>
            {[
              { step: '1', text: 'Webhook arrives → ack 200 OK in &lt;50ms', color: '#7C3AED' },
              { step: '2', text: 'SHA-256 hash checked against local store → duplicate? skip.', color: '#D97706' },
              { step: '3', text: 'File downloaded → written to <code style="background:#F3F4F6;padding:0 3px;border-radius:3px">~/.cluco/vault/raw/</code>', color: '#2563EB' },
              { step: '4', text: 'Job pushed to local queue (SQLite-backed, survives restarts)', color: '#16A34A' },
              { step: '5', text: 'Worker picks up → Textract/OCR → Gemini → save to DB', color: '#1E3A5F' },
              { step: '6', text: 'Failure? Exponential backoff retry ×3 → Dead queue → alert', color: '#DC2626' },
            ].map((s) => (
              <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', backgroundColor: s.color,
                  color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, marginTop: 1,
                }}>
                  {s.step}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: s.text }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Live Event Feed ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.7px', textTransform: 'uppercase' }}>
              Live Event Feed
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>Live</span>
            </div>
          </div>

          <div className="surface" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
            {events.map((ev, i) => {
              const oc = outcomeConfig[ev.outcome];
              return (
                <div key={ev.id} style={{
                  padding: '11px 14px',
                  borderBottom: i < events.length - 1 ? '1px solid var(--border-light)' : 'none',
                  backgroundColor: i === 0 ? '#FAFFFE' : 'transparent',
                  transition: 'background-color 0.3s ease',
                }}>
                  {/* Source + time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ev.sourceColor }}>{ev.source}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ev.ts}</span>
                  </div>
                  {/* Event type */}
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, fontFamily: 'monospace' }}>
                    {ev.event}
                  </div>
                  {/* Filename + outcome */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 500, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190,
                    }}>
                      {ev.fileName}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                      backgroundColor: oc.bg, color: oc.color, border: `1px solid ${oc.border}`,
                      flexShrink: 0, marginLeft: 6,
                    }}>
                      {oc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{ev.size}</div>
                </div>
              );
            })}
          </div>

          {/* Deduplication note */}
          <div style={{
            marginTop: 12, padding: '12px 14px', borderRadius: 8,
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)',
          }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              SHA-256 Deduplication
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Every file is fingerprinted before queuing. Same content from two different sources (Google Drive + Email) is detected and skipped automatically. No double-billing on Textract.
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
              {[
                { label: 'Unique files', value: '247' },
                { label: 'Duplicates caught', value: '18' },
                { label: 'Savings', value: '$3.20' },
              ].map((m) => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
