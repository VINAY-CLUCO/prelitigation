'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type AuthMethod = 'oauth' | 'apikey' | 'webhook+oauth';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface Scope { label: string; description: string; }
interface Connection {
  id: string; name: string; provider: string; description: string;
  category: string; authMethod: AuthMethod; status: ConnectionStatus;
  scopes?: Scope[];
  fields?: { key: string; label: string; placeholder: string; type: string; help?: string }[];
  lastSync?: string; docsIngested?: number; webhookSupport?: boolean;
  badge?: string; iconColor: string; icon: React.ReactNode;
  emoji: string; firstSyncWarning: string;
}

interface SyncLog {
  ts: string; msg: string; type: 'info' | 'success' | 'warning' | 'scan';
}

interface SyncState {
  active: boolean; paused: boolean;
  phase: 'idle' | 'scanning' | 'downloading' | 'done' | 'error';
  msg: string; percent: number;
  found: number; downloaded: number;
  elapsed: number; // seconds
  logs: SyncLog[];
}

const initialConnections: Connection[] = [
  {
    id: 'clio', name: 'Clio Manage', provider: 'clio.com', emoji: '🟣',
    description: 'Sync matters, clients, and documents. Real-time webhooks for instant ingestion.',
    category: 'Case Management', authMethod: 'webhook+oauth', status: 'disconnected',
    iconColor: '#4F46E5', webhookSupport: true,
    firstSyncWarning: 'Scans all your Clio matters and documents. May take 1–3 min on first sync.',
    scopes: [
      { label: 'matters.read', description: 'Read your matters and case files' },
      { label: 'documents.read', description: 'Download and read case documents' },
      { label: 'contacts.read', description: 'Read contact and client information' },
    ],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" /></svg>),
  },
  {
    id: 'gdrive', name: 'Google Drive', provider: 'drive.google.com', emoji: '🟢',
    description: 'Recursively scans all folders and pulls every PDF and Word doc automatically.',
    category: 'Cloud Storage', authMethod: 'oauth', status: 'disconnected',
    iconColor: '#16A34A',
    firstSyncWarning: 'Recursively scans all Drive folders. Large accounts may take 3–5 min.',
    scopes: [
      { label: 'drive.readonly', description: 'Read files from your Google Drive' },
      { label: 'drive.metadata.readonly', description: 'Read file names, dates, and metadata' },
    ],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>),
  },
  {
    id: 'onedrive', name: 'OneDrive', provider: 'microsoft.com', emoji: '🔵',
    description: 'Scans all OneDrive folders recursively via Microsoft Graph API.',
    category: 'Cloud Storage', authMethod: 'oauth', status: 'disconnected',
    iconColor: '#0078D4',
    firstSyncWarning: 'Recursively scans all OneDrive folders. Large accounts may take 3–5 min.',
    scopes: [
      { label: 'Files.Read', description: 'Read your OneDrive files' },
      { label: 'Files.Read.All', description: 'Read files in SharePoint/Teams shared libraries' },
    ],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" /></svg>),
  },
  {
    id: 'dropbox', name: 'Dropbox', provider: 'dropbox.com', emoji: '🔷',
    description: 'Ingest documents from shared Dropbox team folders using PKCE-secured OAuth.',
    category: 'Cloud Storage', authMethod: 'oauth', status: 'disconnected',
    iconColor: '#0061FF',
    firstSyncWarning: 'Scans all Dropbox folders. Large team accounts may take 2–4 min.',
    scopes: [
      { label: 'files.content.read', description: 'Read the content of your files' },
      { label: 'files.metadata.read', description: 'Read file and folder metadata' },
    ],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 5.5 6.5l6.5 4.5L5.5 15 12 19.5 18.5 15 12 11l6.5-4.5L12 2z" /></svg>),
  },
  {
    id: 'gmail', name: 'Gmail', provider: 'gmail.google.com', emoji: '🔴',
    description: 'Scans your entire Gmail inbox for PDF/Word attachments — up to 10,000 emails.',
    category: 'Email', authMethod: 'oauth', status: 'disconnected',
    iconColor: '#DC2626',
    firstSyncWarning: 'Scans up to 10,000 emails page by page. Gmail inboxes can take 5–10 min on first sync.',
    scopes: [
      { label: 'gmail.readonly', description: 'Read emails in your Gmail account' },
      { label: 'gmail.labels', description: 'Read and manage email labels' },
    ],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>),
  },
  {
    id: 'outlook', name: 'Outlook', provider: 'microsoft.com', emoji: '🔵',
    description: 'Scans your entire Outlook inbox for PDF/Word attachments via Microsoft Graph.',
    category: 'Email', authMethod: 'oauth', status: 'disconnected',
    iconColor: '#0078D4',
    firstSyncWarning: 'Scans up to 10,000 emails page by page. Outlook inboxes can take 5–10 min on first sync.',
    scopes: [
      { label: 'Mail.Read', description: 'Read emails in your mailbox' },
      { label: 'Mail.ReadBasic', description: 'Read basic email metadata' },
    ],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>),
  },
];

const OAUTH_ROUTES: Record<string, string> = {
  clio: '/api/auth/clio',
  gdrive: '/api/auth/google?provider=gdrive',
  gmail: '/api/auth/google?provider=gmail',
  onedrive: '/api/auth/microsoft?provider=onedrive',
  outlook: '/api/auth/microsoft?provider=outlook',
  dropbox: '/api/auth/dropbox',
};

const authMethodConfig: Record<AuthMethod, { label: string; color: string; bg: string; border: string; description: string }> = {
  oauth: { label: 'OAuth 2.0', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', description: 'Secure delegated access. You authorize on the platform\'s own screen.' },
  apikey: { label: 'IAM Keys', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', description: 'Minimum-privilege IAM credentials. Encrypted at rest with AES-256.' },
  'webhook+oauth': { label: 'OAuth + Webhooks', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', description: 'OAuth for auth + real-time webhooks. Documents ingested instantly on change.' },
};

const categoryOrder = ['Case Management', 'Cloud Storage', 'Email'];

// ─── Sync Console Component ───────────────────────────────────────────────────
function SyncConsole({ conn, sync, onPause, onResume, onStop }: {
  conn: Connection;
  sync: SyncState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [sync.logs.length]);

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const phaseLabel: Record<string, string> = {
    idle: 'Preparing...', scanning: 'Scanning', downloading: 'Downloading', done: 'Complete', error: 'Error',
  };
  const phaseColor: Record<string, string> = {
    idle: 'var(--text-muted)', scanning: '#F59E0B', downloading: 'var(--accent)', done: 'var(--success)', error: 'var(--danger)',
  };

  return (
    <div style={{
      margin: '14px 0 0 0',
      borderRadius: 12,
      border: '1px solid var(--border-default)',
      overflow: 'hidden',
      background: '#0D1117',
    }}>
      {/* Console Header */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: sync.phase === 'error' ? '#DC2626' : '#F59E0B' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1A2035' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: sync.phase === 'done' ? '#059669' : '#1A2035' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#8B92A5', fontFamily: 'monospace' }}>
          {conn.emoji} {conn.name} — Sync Console
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: phaseColor[sync.phase], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {sync.phase !== 'idle' && (
              <span style={{ marginRight: 5 }}>
                {sync.phase === 'scanning' && '⟳ '}
                {sync.phase === 'downloading' && '↓ '}
                {sync.phase === 'done' && '✓ '}
                {sync.phase === 'error' && '✗ '}
              </span>
            )}
            {phaseLabel[sync.phase]}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace' }}>
            {formatTime(sync.elapsed)}
          </span>
        </div>
      </div>

      {/* ── Big Status Numbers ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'EMAILS / FILES SCANNED', value: sync.found.toLocaleString(), color: '#F59E0B', icon: '⟳' },
          { label: 'DOCS DOWNLOADED', value: sync.downloaded.toLocaleString(), color: '#5B6CF8', icon: '↓' },
          { label: 'PROGRESS', value: `${sync.percent}%`, color: sync.percent === 100 ? '#059669' : '#8B92A5', icon: '◉' },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: '14px 18px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4B5563', letterSpacing: '0.8px', marginBottom: 6, fontFamily: 'monospace' }}>
              {stat.icon} {stat.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, letterSpacing: '-1px', lineHeight: 1, fontFamily: 'monospace' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      {sync.active && (
        <div style={{ padding: '0', background: '#0D1117' }}>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', width: `${sync.percent}%`,
              background: sync.phase === 'scanning'
                ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                : sync.phase === 'done'
                  ? 'linear-gradient(90deg, #059669, #34D399)'
                  : 'linear-gradient(90deg, #5B6CF8, #7B87FA)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── What's happening right now ── */}
      <div style={{ padding: '10px 16px', background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {sync.active && !sync.paused && (
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0,
              animation: 'pulse-dot 1s ease-in-out infinite',
            }} />
          )}
          {sync.paused && <span style={{ fontSize: 12 }}>⏸</span>}
          <span style={{ fontSize: 13, color: sync.paused ? '#6B7280' : '#E5E7EB', fontWeight: 500, fontFamily: 'monospace' }}>
            {sync.paused ? 'Sync paused — click Resume to continue' : (sync.msg || 'Initializing...')}
          </span>
        </div>
      </div>

      {/* ── Warning for long first sync ── */}
      {sync.phase === 'scanning' && sync.elapsed > 10 && (
        <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
          <span style={{ fontSize: 12, color: '#FCD34D', fontWeight: 500 }}>
            ⏱ {conn.firstSyncWarning} — Please keep this tab open.
          </span>
        </div>
      )}

      {/* ── Live Log ── */}
      <div ref={logRef} style={{
        height: 160, overflowY: 'auto', padding: '8px 0',
        fontFamily: 'monospace', fontSize: 11.5,
      }}>
        {sync.logs.length === 0 ? (
          <div style={{ padding: '16px', color: '#4B5563' }}>Waiting for events...</div>
        ) : sync.logs.map((log, i) => {
          const logColor: Record<string, string> = {
            info: '#8B92A5', success: '#34D399', warning: '#FCD34D', scan: '#60A5FA',
          };
          const logPrefix: Record<string, string> = {
            info: '  │', success: '  ✓', warning: '  ⚠', scan: '  →',
          };
          return (
            <div key={i} style={{ padding: '2px 16px', display: 'flex', gap: 10, alignItems: 'baseline', lineHeight: 1.6 }}>
              <span style={{ color: '#374151', flexShrink: 0, fontSize: 10 }}>{log.ts}</span>
              <span style={{ color: logColor[log.type] || '#8B92A5', flexShrink: 0 }}>{logPrefix[log.type]}</span>
              <span style={{ color: logColor[log.type] || '#8B92A5' }}>{log.msg}</span>
            </div>
          );
        })}
      </div>

      {/* ── Controls ── */}
      <div style={{
        padding: '10px 16px',
        display: 'flex', gap: 10, alignItems: 'center',
        background: '#161B22', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {sync.active && !sync.paused && (
          <button onClick={onPause} style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#D1D5DB', transition: 'all var(--transition-fast)',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            ⏸ Pause
          </button>
        )}
        {sync.paused && (
          <button onClick={onResume} style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            background: '#5B6CF8', border: '1px solid #5B6CF8', color: 'white',
          }}>
            ▶ Resume
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#4B5563', fontFamily: 'monospace' }}>
          {sync.phase === 'done'
            ? `✓ Finished in ${formatTime(sync.elapsed)}`
            : sync.active
              ? `Elapsed: ${formatTime(sync.elapsed)}`
              : ''
          }
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function SettingsPageContent() {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});
  const timerRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/connections/status');
      const status = await res.json() as Record<string, { connected: boolean; email?: string; connected_at?: string; docsIngested?: number }>;
      setConnections((prev) =>
        prev.map((c) => ({
          ...c,
          status: status[c.id]?.connected ? 'connected' : 'disconnected',
          lastSync: status[c.id]?.connected_at ? new Date(status[c.id].connected_at!).toLocaleString() : undefined,
          docsIngested: status[c.id]?.connected ? (status[c.id].docsIngested ?? 0) : undefined,
        }))
      );
    } catch { }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const email = searchParams.get('email');
    const error = searchParams.get('error');
    if (connected) {
      setToast({ type: 'success', message: `✓ ${connected} connected${email ? ` as ${decodeURIComponent(email)}` : ''}` });
      fetchStatus();
      router.replace('/settings');
    } else if (error) {
      setToast({ type: 'error', message: decodeURIComponent(error) });
      router.replace('/settings');
    }
  }, [searchParams, fetchStatus, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Elapsed timer per sync
  const startElapsedTimer = (id: string) => {
    if (timerRefs.current[id]) clearInterval(timerRefs.current[id]);
    timerRefs.current[id] = setInterval(() => {
      setSyncStates(prev => {
        const s = prev[id];
        if (!s || !s.active || s.paused) return prev;
        return { ...prev, [id]: { ...s, elapsed: s.elapsed + 1 } };
      });
    }, 1000);
  };

  const stopElapsedTimer = (id: string) => {
    if (timerRefs.current[id]) { clearInterval(timerRefs.current[id]); delete timerRefs.current[id]; }
  };

  // Store EventSource refs so we can forcibly close them on disconnect
  const eventSourceRefs = useRef<Record<string, EventSource>>({});

  const killSync = (id: string) => {
    // Close the SSE stream
    if (eventSourceRefs.current[id]) {
      eventSourceRefs.current[id].close();
      delete eventSourceRefs.current[id];
    }
    // Stop the elapsed timer
    stopElapsedTimer(id);
    // Wipe the sync state entirely
    setSyncStates(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const getConnection = (id: string) => connections.find((c) => c.id === id);
  const openModal = (id: string) => { setFormValues({}); setTestResult(null); setActiveModal(id); };
  const closeModal = () => { setActiveModal(null); setTestResult(null); };

  const disconnect = async (id: string) => {
    // 1. Kill any active sync for this provider immediately
    killSync(id);
    // 2. Tell the backend to cancel the running job
    try { await fetch(`/api/connections/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: id }) }); } catch { }
    // 3. Disconnect the integration
    try { await fetch(`/api/connections/disconnect/${id}`, { method: 'DELETE' }); } catch { }
    setConnections((prev) => prev.map((c) => c.id === id ? { ...c, status: 'disconnected', lastSync: undefined, docsIngested: undefined } : c));
    setToast({ type: 'success', message: `${getConnection(id)?.name || id} disconnected.` });
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTestResult(null);
    setTimeout(() => {
      setTestingConnection(false);
      const conn = getConnection(activeModal!);
      const allFilled = conn?.fields?.every((f) => formValues[f.key]);
      setTestResult(allFilled ? 'success' : 'error');
    }, 1800);
  };

  const handleApiKeySave = (id: string) => {
    if (testResult !== 'success') return;
    setConnections((prev) => prev.map((c) => c.id === id ? { ...c, status: 'connected', lastSync: 'Just now', docsIngested: 0 } : c));
    closeModal();
  };

  const addLog = (id: string, msg: string, type: SyncLog['type'] = 'info') => {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSyncStates(prev => {
      const s = prev[id];
      if (!s) return prev;
      const logs = [...(s.logs || []), { ts, msg, type }].slice(-80); // keep last 80 lines
      return { ...prev, [id]: { ...s, logs } };
    });
  };

  const handleSync = (id: string) => {
    // Kill any previous sync for this provider before starting a new one
    killSync(id);

    const initialState: SyncState = {
      active: true, paused: false, phase: 'scanning',
      msg: 'Connecting to ' + (getConnection(id)?.name || id) + '...',
      percent: 0, found: 0, downloaded: 0, elapsed: 0, logs: [],
    };
    setSyncStates(prev => ({ ...prev, [id]: initialState }));
    startElapsedTimer(id);

    const eventSource = new EventSource(`/api/connections/sync?provider=${id}`);
    // Store ref so disconnect() can kill it
    eventSourceRefs.current[id] = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setSyncStates(prev => {
        const s = prev[id];
        if (!s) return prev;

        // Determine phase from msg content
        let phase: SyncState['phase'] = s.phase;
        const msgLower = (data.msg || '').toLowerCase();
        if (data.done) phase = 'done';
        else if (msgLower.includes('error') || msgLower.includes('failed')) phase = 'error';
        else if (msgLower.includes('downloading') || msgLower.includes('saving')) phase = 'downloading';
        else if (msgLower.includes('scan') || msgLower.includes('search') || msgLower.includes('query') || msgLower.includes('found')) phase = 'scanning';

        const found = data.total !== undefined ? data.total : s.found;
        const downloaded = data.docsIngested !== undefined ? data.docsIngested : data.completed !== undefined ? data.completed : s.downloaded;

        return {
          ...prev,
          [id]: {
            ...s,
            active: !data.done,
            paused: data.paused || false,
            phase,
            msg: data.msg || s.msg,
            percent: data.percent ?? s.percent,
            found: found > s.found ? found : s.found,
            downloaded: downloaded > s.downloaded ? downloaded : s.downloaded,
          }
        };
      });

      // Add to log
      if (data.msg) {
        const msgLower = (data.msg || '').toLowerCase();
        const logType: SyncLog['type'] =
          msgLower.includes('found') || msgLower.includes('scan') ? 'scan' :
            msgLower.includes('download') || msgLower.includes('saving') ? 'success' :
              msgLower.includes('skip') || msgLower.includes('rate limit') ? 'warning' : 'info';
        addLog(id, data.msg, logType);
      }

      if (data.done) {
        stopElapsedTimer(id);
        eventSource.close();
        delete eventSourceRefs.current[id];
        setConnections((prev) => prev.map((c) => c.id === id ? {
          ...c,
          docsIngested: data.docsIngested ?? c.docsIngested,
          lastSync: 'Just now'
        } : c));
        addLog(id, `✓ Sync complete — ${data.docsIngested ?? 0} documents indexed`, 'success');
        setToast({ type: 'success', message: `✓ ${getConnection(id)?.name} sync complete — ${data.docsIngested ?? 0} docs` });
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      stopElapsedTimer(id);
      setSyncStates(prev => {
        const s = prev[id];
        if (!s) return prev;
        return { ...prev, [id]: { ...s, active: false, phase: 'error', msg: 'Connection lost or sync error.' } };
      });
      addLog(id, 'Sync connection lost or server error.', 'warning');
      setToast({ type: 'error', message: 'Sync failed or connection lost.' });
    };
  };

  const handlePause = async (id: string) => {
    await fetch('/api/connections/pause', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: id }) });
    setSyncStates(prev => prev[id] ? { ...prev, [id]: { ...prev[id], paused: true } } : prev);
    stopElapsedTimer(id);
    addLog(id, 'Sync paused by user.', 'warning');
  };

  const handleResume = async (id: string) => {
    await fetch('/api/connections/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: id }) });
    setSyncStates(prev => prev[id] ? { ...prev, [id]: { ...prev[id], paused: false } } : prev);
    startElapsedTimer(id);
    addLog(id, 'Sync resumed.', 'info');
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const activeConn = activeModal ? getConnection(activeModal) : null;

  return (
    <div className="page-content" style={{ maxWidth: 960 }}>

      {/* ── Page Header ── */}
      <div className="page-header">
        <h1>Connections</h1>
        <p>Connect your integrations and sync documents into the pipeline.</p>
      </div>

      {/* ── Summary Bar ── */}
      <div style={{
        padding: '16px 20px', borderRadius: 12, marginBottom: 28,
        background: connectedCount > 0
          ? 'linear-gradient(135deg, rgba(5,150,105,0.05) 0%, rgba(5,150,105,0.02) 100%)'
          : 'linear-gradient(135deg, rgba(91,108,248,0.06) 0%, rgba(91,108,248,0.02) 100%)',
        border: `1px solid ${connectedCount > 0 ? 'var(--success-border)' : 'var(--accent-border)'}`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: connectedCount > 0 ? 'var(--success)' : 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: connectedCount > 0 ? '0 4px 12px rgba(5,150,105,0.25)' : '0 4px 12px rgba(91,108,248,0.25)',
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>
            {connectedCount === 0 ? 'No integrations connected yet' : `${connectedCount} of ${connections.length} integrations active`}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
            {connectedCount === 0
              ? 'Click Connect below to authorize your first integration and start pulling documents.'
              : 'All credentials encrypted with AES-256. OAuth tokens use minimum required scopes.'}
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: connectedCount > 0 ? 'var(--success)' : 'var(--accent)', flexShrink: 0, letterSpacing: '-1px' }}>
          {connectedCount}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>/{connections.length}</span>
        </div>
      </div>

      {/* ── Integration Categories ── */}
      {categoryOrder.map((category) => {
        const catConns = connections.filter(c => c.category === category);
        const catConnected = catConns.filter(c => c.status === 'connected').length;

        return (
          <div key={category} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{category}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
              {catConnected > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
                  {catConnected} active
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {catConns.map((conn) => {
                const isConnected = conn.status === 'connected';
                const sync = syncStates[conn.id];
                const isSyncing = sync?.active;
                const isDone = sync?.phase === 'done';

                return (
                  <div key={conn.id} className="premium-card" style={{
                    padding: '18px 20px',
                    border: `1px solid ${isSyncing ? 'var(--accent-border)' : isDone ? 'var(--success-border)' : isConnected ? 'var(--success-border)' : 'var(--border-default)'}`,
                    background: isConnected ? 'linear-gradient(135deg, rgba(5,150,105,0.015) 0%, #FFFFFF 100%)' : 'var(--bg-surface)',
                    transition: 'all var(--transition-base)',
                  }}>

                    {/* ── Row 1: Header ── */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 11, flexShrink: 0,
                        background: isConnected ? 'var(--success-light)' : 'var(--bg-base)',
                        border: `1px solid ${isConnected ? 'var(--success-border)' : 'var(--border-default)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>
                        {conn.emoji}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{conn.name}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                            background: authMethodConfig[conn.authMethod].bg,
                            color: authMethodConfig[conn.authMethod].color,
                            border: `1px solid ${authMethodConfig[conn.authMethod].border}`,
                            textTransform: 'uppercase',
                          }}>
                            {authMethodConfig[conn.authMethod].label}
                          </span>
                          {conn.webhookSupport && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', textTransform: 'uppercase' }}>
                              ⚡ Real-time
                            </span>
                          )}
                          {isSyncing && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(91,108,248,0.1)', color: 'var(--accent)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <svg style={{ animation: 'spin 1s linear infinite' }} width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                              SYNCING
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{conn.description}</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: isConnected ? 'var(--success)' : 'var(--text-muted)' }}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>

                        {isConnected ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => disconnect(conn.id)} className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)'; (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                            >
                              Disconnect
                            </button>
                            <button onClick={() => handleSync(conn.id)} disabled={isSyncing}
                              style={{
                                padding: '5px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: isSyncing ? 'not-allowed' : 'pointer', border: 'none',
                                background: isSyncing ? 'var(--bg-base)' : 'var(--accent)',
                                color: isSyncing ? 'var(--text-muted)' : 'white',
                                boxShadow: isSyncing ? 'none' : '0 2px 8px rgba(91,108,248,0.25)',
                                transition: 'all var(--transition-fast)',
                              }}
                              onMouseEnter={(e) => { if (!isSyncing) (e.currentTarget.style.background = 'var(--accent-hover)'); }}
                              onMouseLeave={(e) => { if (!isSyncing) (e.currentTarget.style.background = 'var(--accent)'); }}
                            >
                              {isSyncing ? 'Syncing...' : isDone ? '↻ Sync Again' : '↻ Sync Now'}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => conn.badge === 'Coming Soon' ? null : openModal(conn.id)} disabled={conn.badge === 'Coming Soon'}
                            className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>
                            Connect
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Connected Metadata (when idle) ── */}
                    {isConnected && !isSyncing && !isDone && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last sync</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{conn.lastSync || 'Never'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Docs indexed</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{conn.docsIngested ?? 0}</div>
                        </div>
                        {conn.lastSync === 'Never' || !conn.lastSync ? (
                          <div style={{
                            marginLeft: 'auto', padding: '6px 12px', borderRadius: 8,
                            background: '#FFFBEB', border: '1px solid #FDE68A',
                            fontSize: 12, color: '#92400E', fontWeight: 500,
                          }}>
                            ⚡ First sync required — click Sync Now to start
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* ── Sync Console ── */}
                    {sync && (isSyncing || isDone || sync.phase === 'error') && (
                      <SyncConsole
                        conn={conn}
                        sync={sync}
                        onPause={() => handlePause(conn.id)}
                        onResume={() => handleResume(conn.id)}
                        onStop={() => {
                          stopElapsedTimer(conn.id);
                          setSyncStates(prev => { const n = { ...prev }; delete n[conn.id]; return n; });
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── System Integrations ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>System</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="premium-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: '#F5F3FF', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚖️</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>CourtListener API</span>
                  <span className="badge badge-success">Active</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Real-time US Federal and State court opinions.</p>
              </div>
              <div className="status-dot online" />
            </div>
          </div>
          <div className="premium-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--success-light)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🗄️</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Local Vault</span>
                  <span className="badge badge-success">Active</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  <code style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--bg-base)', padding: '1px 5px', borderRadius: 4 }}>~/.cluco/vault/</code>
                </p>
              </div>
              <div className="status-dot online" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast-${toast.type}`} onClick={() => setToast(null)} style={{ cursor: 'pointer' }}>
          {toast.type === 'success'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          }
          {toast.message}
        </div>
      )}

      {/* ── Connect Modal ── */}
      {activeModal && activeConn && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(9,9,11,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, backdropFilter: 'blur(6px)',
        }} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 16, width: '100%', maxWidth: 480,
            boxShadow: '0 25px 50px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
            overflow: 'hidden', animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg-base)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {activeConn.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Connect {activeConn.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{activeConn.provider}</div>
                </div>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}>×</button>
            </div>

            <div style={{ padding: '22px 24px' }}>
              {/* First sync warning */}
              <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 18, display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⏱</span>
                <div style={{ fontSize: 12.5, color: '#92400E', lineHeight: 1.55 }}>
                  <strong>First sync timing:</strong> {activeConn.firstSyncWarning}
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 9, background: authMethodConfig[activeConn.authMethod].bg, border: `1px solid ${authMethodConfig[activeConn.authMethod].border}`, marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: authMethodConfig[activeConn.authMethod].color, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>{authMethodConfig[activeConn.authMethod].label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{authMethodConfig[activeConn.authMethod].description}</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Permissions Requested</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeConn.scopes?.map((scope) => (
                    <div key={scope.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--success-light)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{scope.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{scope.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeConn.webhookSupport && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--accent-light)', border: '1px solid var(--accent-border)', marginBottom: 18, fontSize: 12.5, color: 'var(--accent)', lineHeight: 1.55 }}>
                  ⚡ Webhook URL will be registered automatically. Documents appear in real-time after setup.
                </div>
              )}

              <button onClick={() => { if (OAUTH_ROUTES[activeConn.id]) window.location.href = OAUTH_ROUTES[activeConn.id]; }}
                className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center' }}>
                Authorize with {activeConn.name}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="page-content"><p style={{ color: 'var(--text-muted)' }}>Loading connections...</p></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
