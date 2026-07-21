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
  queued: { label: 'Queued', color: 'var(--info)', bg: 'var(--info-light)', border: 'var(--info-border)' },
  duplicate: { label: 'Duplicate', color: 'var(--text-secondary)', bg: 'var(--bg-hover)', border: 'var(--border-default)' },
  skipped: { label: 'Skipped', color: 'var(--warning)', bg: 'var(--warning-light)', border: 'var(--warning-border)' },
  error: { label: 'Error', color: 'var(--danger)', bg: 'var(--danger-light)', border: 'var(--danger-border)' },
  complete: { label: 'Synced', color: 'var(--success)', bg: 'var(--success-light)', border: 'var(--success-border)' },
};

const statusConfig: Record<SourceStatus, { label: string; color: string; dot: string; pulse: boolean }> = {
  listening: { label: 'Listening', color: 'var(--success)', dot: 'var(--success)', pulse: true },
  syncing: { label: 'Syncing…', color: 'var(--info)', dot: 'var(--info)', pulse: true },
  idle: { label: 'Idle', color: 'var(--text-muted)', dot: 'var(--border-medium)', pulse: false },
  error: { label: 'Error', color: 'var(--danger)', dot: 'var(--danger)', pulse: false },
};

// ─── Main Component ───────────────────────────────────────────────────
export default function CollectionPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [queueDepth, setQueueDepth] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Poll active connection statuses and pipeline stats from endpoint
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [connRes, statsRes] = await Promise.all([
          fetch('/api/connections/status'),
          fetch('/api/cms/stats')
        ]);
        const connData = await connRes.json();
        const statsData = await statsRes.json();

        if (!active) return;

        // Build dynamic sources listing based on active credentials
        const updatedSources: Source[] = [
          {
            id: 'gdrive',
            name: 'Google Drive',
            iconColor: '#16A34A',
            status: connData.google?.connected ? 'listening' : 'idle',
            syncMethod: 'delta+webhook',
            docsQueued: 0,
            docsCollected: 0,
            lastEvent: connData.google?.connected ? 'Listening' : 'Not Connected',
            latencyMs: 340,
            rules: [
              { path: '/Cases/Active/', fileTypes: ['pdf', 'docx'], description: 'Active case documents' },
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
            status: connData.google?.connected ? 'listening' : 'idle',
            syncMethod: 'pubsub',
            docsQueued: 0,
            docsCollected: 0,
            lastEvent: connData.google?.connected ? 'Listening' : 'Not Connected',
            latencyMs: 820,
            rules: [
              { path: 'Label: Legal-Incoming', fileTypes: ['pdf', 'docx'], description: 'Emails tagged Legal-Incoming with attachments' },
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
            status: connData.clio?.connected ? (statsData.pendingJobsCount > 0 ? 'syncing' : 'listening') : 'idle',
            syncMethod: 'webhook',
            docsQueued: statsData.pendingJobsCount,
            docsCollected: statsData.totalDocs,
            lastEvent: connData.clio?.connected ? 'Ready' : 'Not Connected',
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

        setSources(updatedSources);
        setEvents(statsData.eventLogs || []);
        setQueueDepth(statsData.pendingJobsCount);
        setProcessedCount(statsData.totalDocs);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load collection telemetry:', err);
      }
    };

    loadData();
    const timer = setInterval(loadData, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const totalQueued = queueDepth;
  const activeSources = sources.filter((s) => s.status === 'listening' || s.status === 'syncing').length;

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
            backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}>
            PHASE 1
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Connect &amp; Collect</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
          Collection &amp; Sync
        </h1>
        <p style={{ marginTop: 6, fontSize: 14.5, color: 'var(--text-secondary)' }}>
          Documents are discovered via event-driven webhooks and queued for extraction. Real-time. Zero polling waste.
        </p>
      </div>

      {/* ── Top Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
        {[
          { label: 'Active Sources', value: `${activeSources}`, sub: `of ${sources.length} connected`, color: 'var(--success)', bg: 'var(--success-light)', border: 'var(--success-border)' },
          { label: 'Queue Depth', value: `${queueDepth}`, sub: 'documents waiting', color: 'var(--accent)', bg: 'var(--accent-light)', border: 'var(--accent-border)' },
          { label: 'Total Collected', value: `${processedCount}`, sub: 'since last reset', color: 'var(--text-primary)', bg: 'var(--bg-hover)', border: 'var(--border-default)' },
          { label: 'Avg Webhook Latency', value: '427ms', sub: 'event to queue time', color: 'var(--info)', bg: 'var(--info-light)', border: 'var(--info-border)' },
        ].map((s) => (
          <div key={s.label} className="premium-card hover-lift" style={{ padding: '20px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.2px' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.8px', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left: Source Cards ── */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 14 }}>
            Active Sources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sources.map((src) => {
              const sCfg = statusConfig[src.status];
              const mCfg = syncMethodConfig[src.syncMethod];
              const isExpanded = expandedRule === src.id;
              return (
                <div key={src.id} className="premium-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '20px' }}>
                    {/* Row 1: Icon + Name + Status + Method */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: src.iconColor,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      }}>
                        {src.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{src.name}</span>
                          {/* Sync method badge */}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                            backgroundColor: mCfg.bg, color: mCfg.color, border: `1px solid ${mCfg.border}`,
                            textTransform: 'uppercase', letterSpacing: '0.2px',
                          }}>
                            {mCfg.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <span>Last: <strong style={{ color: 'var(--text-secondary)' }}>{src.lastEvent}</strong></span>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'var(--border-medium)' }} />
                          <span>Latency: <strong style={{ color: 'var(--text-secondary)' }}>{src.latencyMs}ms</strong></span>
                          {src.deltaToken && (
                            <>
                              <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'var(--border-medium)' }} />
                              <span>Token: <code style={{ fontSize: 10.5, backgroundColor: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>{src.deltaToken}</code></span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Status indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: 8, height: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sCfg.dot }} />
                          {sCfg.pulse && (
                            <div style={{
                              position: 'absolute', inset: -3, borderRadius: '50%',
                              border: `2px solid ${sCfg.dot}`, opacity: 0.4,
                              animation: 'pulse 1.8s ease-in-out infinite',
                            }} />
                          )}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sCfg.color }}>{sCfg.label}</span>
                      </div>
                    </div>

                    {/* Row 2: Metrics */}
                    <div style={{
                      marginTop: 16, display: 'flex',
                      borderRadius: 8, border: '1px solid var(--border-default)',
                      overflow: 'hidden',
                    }}>
                      {[
                        { label: 'In Queue', value: src.docsQueued, color: 'var(--info)' },
                        { label: 'Collected', value: src.docsCollected, color: 'var(--success)' },
                        { label: 'Watching', value: src.rules.length, color: 'var(--accent)' },
                      ].map((m, i) => (
                        <div key={m.label} style={{
                          flex: 1, padding: '12px 14px', textAlign: 'center',
                          borderRight: i < 2 ? '1px solid var(--border-default)' : 'none',
                          backgroundColor: 'var(--bg-base)',
                        }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: m.color, lineHeight: 1.1 }}>{m.value}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Collection Rules toggle */}
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : src.id)}
                      style={{
                        marginTop: 14, background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', padding: 0,
                        transition: 'color var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform var(--transition-fast)' }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      Collection Rules ({src.rules.length})
                    </button>
                  </div>

                  {/* Expanded Rules */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-base)', padding: '4px 0' }}>
                      {src.rules.map((rule, i) => (
                        <div key={i} style={{
                          padding: '12px 20px',
                          borderBottom: i < src.rules.length - 1 ? '1px solid var(--border-light)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.path}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{rule.description}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {rule.fileTypes.map((ft) => (
                              <span key={ft} style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
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
          <div className="premium-card" style={{ marginTop: 20, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              How the Queue Works
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { step: '1', text: 'Webhook arrives → ack 200 OK in &lt;50ms', color: '#7C3AED' },
                { step: '2', text: 'SHA-256 hash checked against local store → duplicate? skip.', color: '#D97706' },
                { step: '3', text: 'File downloaded → written to <code style="background:var(--bg-hover);padding:1px 5px;border-radius:4px;font-family:monospace">~/.cluco/vault/raw/</code>', color: '#2563EB' },
                { step: '4', text: 'Job pushed to local queue (SQLite-backed, survives restarts)', color: '#16A34A' },
                { step: '5', text: 'Worker picks up → Textract/OCR → Gemini → save to DB', color: '#1E3A5F' },
                { step: '6', text: 'Failure? Exponential backoff retry ×3 → Dead queue → alert', color: '#DC2626' },
              ].map((s) => (
                <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', backgroundColor: s.color,
                    color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    {s.step}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: s.text }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Live Event Feed ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Live Event Feed
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--success-light)', border: '1px solid var(--success-border)', padding: '2px 8px', borderRadius: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--success)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Live</span>
            </div>
          </div>

          <div className="premium-card" style={{ overflow: 'hidden', marginBottom: 20 }}>
            {events.map((ev, i) => {
              const oc = outcomeConfig[ev.outcome];
              return (
                <div key={ev.id} style={{
                  padding: '14px 18px',
                  borderBottom: i < events.length - 1 ? '1px solid var(--border-light)' : 'none',
                  backgroundColor: i === 0 ? 'rgba(79, 70, 229, 0.02)' : 'transparent',
                  transition: 'background-color 0.3s ease',
                }}>
                  {/* Source + time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: ev.sourceColor }}>{ev.source}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ev.ts}</span>
                  </div>
                  {/* Event type */}
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.event}
                  </div>
                  {/* Filename + outcome */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ev.fileName}
                    </span>
                    <span className="badge" style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                      backgroundColor: oc.bg, color: oc.color, border: `1px solid ${oc.border}`,
                      flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.2px',
                    }}>
                      {oc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{ev.size}</div>
                </div>
              );
            })}
          </div>

          {/* Deduplication note */}
          <div className="premium-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              SHA-256 Deduplication
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Every file is fingerprinted before queuing. Same content from two different sources (Google Drive + Email) is detected and skipped automatically. No double-billing on Textract.
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 16 }}>
              {[
                { label: 'Unique files', value: '247' },
                { label: 'Duplicates caught', value: '18' },
                { label: 'Savings', value: '$3.20' },
              ].map((m) => (
                <div key={m.label} style={{ flex: 1, backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-default)', padding: '8px 10px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.2px' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
