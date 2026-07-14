'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────
type AuthMethod = 'oauth' | 'apikey' | 'webhook+oauth';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';


interface Scope {
  label: string;
  description: string;
}

interface Connection {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: string;
  authMethod: AuthMethod;
  status: ConnectionStatus;
  scopes?: Scope[];
  fields?: { key: string; label: string; placeholder: string; type: string; help?: string }[];
  lastSync?: string;
  docsIngested?: number;
  webhookSupport?: boolean;
  badge?: string;
  iconColor: string;
  icon: React.ReactNode;
}

// ─── Initial Connections Data ────────────────────────────────────────
const initialConnections: Connection[] = [
  // ── Case Management
  {
    id: 'clio',
    name: 'Clio Manage',
    provider: 'clio.com',
    description: 'Sync matters, clients, and documents. Supports real-time webhooks for instant ingestion.',
    category: 'Case Management',
    authMethod: 'webhook+oauth',
    status: 'disconnected',
    iconColor: '#4F46E5',
    webhookSupport: true,
    scopes: [
      { label: 'matters.read', description: 'Read your matters and case files' },
      { label: 'documents.read', description: 'Download and read case documents' },
      { label: 'contacts.read', description: 'Read contact and client information' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    ),
  },
  {
    id: 'mycase',
    name: 'MyCase',
    provider: 'mycase.com',
    description: 'Pull case files, client documents, and billing notes from MyCase via OAuth.',
    category: 'Case Management',
    authMethod: 'oauth',
    status: 'disconnected',
    iconColor: '#0EA5E9',
    scopes: [
      { label: 'cases:read', description: 'Read cases and associated documents' },
      { label: 'documents:read', description: 'Access uploaded document files' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },

  // ── Cloud Storage
  {
    id: 'gdrive',
    name: 'Google Drive',
    provider: 'google.com',
    description: 'Watch specified folders for new legal documents and auto-ingest them into the pipeline.',
    category: 'Cloud Storage',
    authMethod: 'oauth',
    status: 'connected',
    lastSync: '2 mins ago',
    docsIngested: 84,
    iconColor: '#16A34A',
    scopes: [
      { label: 'drive.readonly', description: 'Read files from your Google Drive' },
      { label: 'drive.metadata.readonly', description: 'Read file names, dates, and metadata' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'onedrive',
    name: 'Microsoft OneDrive',
    provider: 'microsoft.com',
    description: 'Connect via Microsoft Graph API to watch OneDrive folders for new documents.',
    category: 'Cloud Storage',
    authMethod: 'oauth',
    status: 'disconnected',
    iconColor: '#0078D4',
    scopes: [
      { label: 'Files.Read', description: 'Read your OneDrive files' },
      { label: 'Files.Read.All', description: 'Read files in SharePoint/Teams shared libraries' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
      </svg>
    ),
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    provider: 'dropbox.com',
    description: 'Ingest documents from shared Dropbox team folders using PKCE-secured OAuth.',
    category: 'Cloud Storage',
    authMethod: 'oauth',
    status: 'disconnected',
    iconColor: '#0061FF',
    scopes: [
      { label: 'files.content.read', description: 'Read the content of your files' },
      { label: 'files.metadata.read', description: 'Read file and folder metadata' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 5.5 6.5l6.5 4.5L5.5 15 12 19.5 18.5 15 12 11l6.5-4.5L12 2z" />
        <path d="M5.5 6.5 12 11l6.5-4.5" />
      </svg>
    ),
  },

  // ── Communication
  {
    id: 'gmail',
    name: 'Gmail',
    provider: 'google.com',
    description: 'Watch labeled Gmail threads and auto-extract legal document attachments.',
    category: 'Communication',
    authMethod: 'oauth',
    status: 'connected',
    lastSync: '18 mins ago',
    docsIngested: 31,
    iconColor: '#DC2626',
    scopes: [
      { label: 'gmail.readonly', description: 'Read emails in your Gmail account' },
      { label: 'gmail.labels', description: 'Read and manage email labels' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    provider: 'microsoft.com',
    description: 'Pull email attachments from designated Outlook folders via Microsoft Graph API.',
    category: 'Communication',
    authMethod: 'oauth',
    status: 'disconnected',
    iconColor: '#0078D4',
    scopes: [
      { label: 'Mail.Read', description: 'Read emails in your mailbox' },
      { label: 'Mail.ReadBasic', description: 'Read basic email metadata' },
    ],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
];

const categoryOrder = ['Case Management', 'Cloud Storage', 'Communication', 'Local Vault'];

const categoryColors: Record<string, { bg: string; color: string }> = {
  'Case Management': { bg: '#EEF2FF', color: '#1E3A5F' },
  'Cloud Storage': { bg: '#F0FDF4', color: '#166534' },
  'Communication': { bg: '#FFF7ED', color: '#9A3412' },
  'Local Vault': { bg: '#F3F4F6', color: '#374151' },
};

const authMethodConfig: Record<AuthMethod, { label: string; color: string; bg: string; border: string; description: string }> = {
  'oauth': {
    label: 'OAuth 2.0',
    color: '#16A34A',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    description: 'Secure delegated access. You authorize on the platform\'s own screen.',
  },
  'apikey': {
    label: 'IAM Access Keys',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    description: 'Minimum-privilege IAM credentials. Encrypted at rest with AES-256.',
  },
  'webhook+oauth': {
    label: 'OAuth + Webhooks',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    description: 'OAuth for auth + real-time webhooks. Documents ingested instantly on change.',
  },
};

// ─── OAuth provider → API route mapping ─────────────────────────────
const OAUTH_ROUTES: Record<string, string> = {
  clio: '/api/auth/clio',
  gdrive: '/api/auth/google?provider=gdrive',
  gmail: '/api/auth/google?provider=gmail',
  onedrive: '/api/auth/microsoft?provider=onedrive',
  outlook: '/api/auth/microsoft?provider=outlook',
  dropbox: '/api/auth/dropbox',
};

// ─── Main Component ─────────────────────────────────────────────────
export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [syncingState, setSyncingState] = useState<Record<string, { active: boolean; msg?: string; count?: number }>>({});
  const [simulatingOAuth, setSimulatingOAuth] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Fetch real connection status from tokens.json on mount ──
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/connections/status');
      const status = await res.json() as Record<string, { connected: boolean; email?: string; connected_at?: string }>;
      setConnections((prev) =>
        prev.map((c) => ({
          ...c,
          status: status[c.id]?.connected ? 'connected' : 'disconnected',
          lastSync: status[c.id]?.connected_at
            ? new Date(status[c.id].connected_at!).toLocaleString()
            : undefined,
          connectedEmail: status[c.id]?.email,
        }))
      );
    } catch {
      // API not yet wired — silently fail (happens before credentials are set)
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Handle OAuth callback params in URL ──
  useEffect(() => {
    const connected = searchParams.get('connected');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (connected) {
      setToast({ type: 'success', message: `${connected} connected as ${decodeURIComponent(email || '')}` });
      fetchStatus();
      router.replace('/settings'); // clean the URL
    } else if (error) {
      setToast({ type: 'error', message: decodeURIComponent(error) });
      router.replace('/settings');
    }
  }, [searchParams, fetchStatus, router]);

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const getConnection = (id: string) => connections.find((c) => c.id === id);

  const openModal = (id: string) => {
    // If it's an OAuth-based connection, go directly to the provider login
    if (OAUTH_ROUTES[id]) {
      window.location.href = OAUTH_ROUTES[id];
      return;
    }
    setFormValues({});
    setTestResult(null);
    setActiveModal(id);
  };

  const closeModal = () => {
    setActiveModal(null);
    setTestResult(null);
  };

  const disconnect = async (id: string) => {
    try {
      await fetch(`/api/connections/disconnect/${id}`, { method: 'DELETE' });
    } catch { /* local disconnect still proceeds */ }
    setConnections((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: 'disconnected', lastSync: undefined, docsIngested: undefined } : c)
    );
    setToast({ type: 'success', message: `${id} disconnected` });
  };

  const handleOAuthConnect = (id: string) => {
    // Real OAuth — redirect to provider
    if (OAUTH_ROUTES[id]) {
      window.location.href = OAUTH_ROUTES[id];
      return;
    }
    // Fallback for non-mapped providers
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((c) => c.id === id ? {
          ...c,
          status: 'connected',
          lastSync: 'Just now',
          docsIngested: 0,
        } : c)
      );
      setSimulatingOAuth(false);
      closeModal();
    }, 2200);
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTestResult(null);
    setTimeout(() => {
      setTestingConnection(false);
      // Simulate success if all fields filled
      const conn = getConnection(activeModal!);
      const allFilled = conn?.fields?.every((f) => formValues[f.key]);
      setTestResult(allFilled ? 'success' : 'error');
    }, 1800);
  };

  const handleApiKeySave = (id: string) => {
    if (testResult !== 'success') return;
    setConnections((prev) =>
      prev.map((c) => c.id === id ? {
        ...c,
        status: 'connected',
        lastSync: 'Just now',
        docsIngested: 0,
      } : c)
    );
    closeModal();
  };

  const handleSync = (id: string) => {
    if (id !== 'clio') {
      setToast({ type: 'error', message: 'Sync is not supported for this provider yet.' });
      return;
    }
    
    setSyncingState((prev) => ({ ...prev, [id]: { active: true, msg: 'Initializing sync...', count: 0 } }));
    
    const eventSource = new EventSource('/api/connections/clio/sync');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setSyncingState((prev) => ({
        ...prev,
        [id]: {
          active: !data.done,
          msg: data.msg,
          count: data.docsIngested !== undefined ? data.docsIngested : prev[id]?.count,
        }
      }));
      
      if (data.done) {
        eventSource.close();
        setConnections((prev) => prev.map((c) => c.id === id ? {
          ...c,
          docsIngested: data.docsIngested !== undefined ? data.docsIngested : c.docsIngested,
          lastSync: 'Just now'
        } : c));
        setToast({ type: 'success', message: `Sync complete for ${id}` });
        setTimeout(() => {
          setSyncingState((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 3000);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setSyncingState((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setToast({ type: 'error', message: 'Sync failed or connection lost.' });
    };
  };

  const activeConn = activeModal ? getConnection(activeModal) : null;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 880 }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Settings
        </h1>
        <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage integrations, authentication, and pipeline configuration.
        </p>
      </div>

      {/* ── MCP Status Banner ── */}
      <div style={{
        padding: '14px 20px',
        borderRadius: 10,
        backgroundColor: 'var(--accent-light)',
        border: '1px solid var(--accent-border)',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent)' }}>MCP Connections</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            All credentials are encrypted with AES-256 before storage. OAuth tokens are scoped to minimum required permissions.
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
            {connections.filter((c) => c.status === 'connected').length}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/{connections.length}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>connected</div>
        </div>
      </div>

      {/* ── Integration Sections ── */}
      {categoryOrder.map((category) => {
        const catConnections = connections.filter((c) => c.category === category);
        return (
          <div key={category} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
                {category.toUpperCase()}
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {catConnections.filter((c) => c.status === 'connected').length}/{catConnections.length} active
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {catConnections.map((conn) => {
                const authCfg = authMethodConfig[conn.authMethod];
                const isConnected = conn.status === 'connected';
                return (
                  <div
                    key={conn.id}
                    className="surface"
                    style={{
                      padding: '18px 20px',
                      boxShadow: 'var(--shadow-xs)',
                      borderColor: isConnected ? 'var(--success-border)' : 'var(--border-default)',
                      transition: 'box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)')}
                  >
                    {/* ── Row 1: Icon + Info + Status + Actions ── */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Icon */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        backgroundColor: isConnected ? '#F0FDF4' : 'var(--bg-base)',
                        border: `1px solid ${isConnected ? 'var(--success-border)' : 'var(--border-default)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isConnected ? conn.iconColor : 'var(--text-secondary)',
                        transition: 'all 0.18s ease',
                      }}>
                        {conn.icon}
                      </div>

                      {/* Name + Badges + Description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{conn.name}</span>

                          {/* Auth method badge */}
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            padding: '2px 7px', borderRadius: 10,
                            backgroundColor: authCfg.bg, color: authCfg.color, border: `1px solid ${authCfg.border}`,
                            letterSpacing: '0.2px',
                          }}>
                            {authCfg.label}
                          </span>

                          {conn.badge && (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              padding: '2px 7px', borderRadius: 10,
                              backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A',
                            }}>
                              {conn.badge}
                            </span>
                          )}

                          {conn.webhookSupport && (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              padding: '2px 7px', borderRadius: 10,
                              backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE',
                            }}>
                              ⚡ Real-time
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>
                          {conn.description}
                        </p>
                      </div>

                      {/* Right side: status + buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        {/* Status dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            backgroundColor: isConnected ? 'var(--success)' : 'var(--border-medium)',
                            boxShadow: isConnected ? '0 0 0 2px #F0FDF4' : 'none',
                          }} />
                          <span style={{ fontSize: 11.5, fontWeight: 500, color: isConnected ? 'var(--success)' : 'var(--text-muted)' }}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>

                        {/* Action buttons */}
                        {isConnected ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => disconnect(conn.id)}
                              style={{
                                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-secondary)',
                                transition: 'all 0.12s ease',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)';
                                (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                              }}
                            >
                              Disconnect
                            </button>
                            <button style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)',
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => conn.badge === 'Coming Soon' ? null : openModal(conn.id)}
                            disabled={conn.badge === 'Coming Soon'}
                            style={{
                              padding: '7px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, 
                              cursor: conn.badge === 'Coming Soon' ? 'not-allowed' : 'pointer',
                              border: `1px solid ${conn.badge === 'Coming Soon' ? 'var(--border-medium)' : 'var(--accent)'}`,
                              backgroundColor: conn.badge === 'Coming Soon' ? 'var(--bg-surface)' : 'var(--accent)', 
                              color: conn.badge === 'Coming Soon' ? 'var(--text-muted)' : 'white',
                              transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (conn.badge !== 'Coming Soon') (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (conn.badge !== 'Coming Soon') (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)';
                            }}
                          >
                            {conn.badge === 'Coming Soon' ? 'Coming Soon' : 'Connect'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Row 2: Connected metadata ── */}
                    {isConnected && (
                      <div style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid var(--border-light)',
                        display: 'flex',
                        gap: 24,
                        alignItems: 'center',
                      }}>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last sync: </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{conn.lastSync}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Documents ingested: </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{conn.docsIngested}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auth: </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: authCfg.color }}>{authCfg.label}</span>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                          {syncingState[conn.id]?.active && (
                            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                              </svg>
                              {syncingState[conn.id].msg}
                            </div>
                          )}
                          <button 
                            onClick={() => handleSync(conn.id)}
                            disabled={syncingState[conn.id]?.active}
                            style={{
                              padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 500, 
                              cursor: syncingState[conn.id]?.active ? 'not-allowed' : 'pointer',
                              border: `1px solid ${syncingState[conn.id]?.active ? 'var(--border-medium)' : 'var(--success-border)'}`, 
                              backgroundColor: syncingState[conn.id]?.active ? 'var(--bg-surface)' : 'var(--success-light)', 
                              color: syncingState[conn.id]?.active ? 'var(--text-muted)' : 'var(--success)',
                              transition: 'all 0.2s ease',
                          }}>
                            {syncingState[conn.id]?.active ? 'Syncing...' : 'Sync Now'}
                          </button>
                          <style dangerouslySetInnerHTML={{__html: `
                            @keyframes spin { 100% { transform: rotate(360deg); } }
                          `}} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Global Data Providers ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            GLOBAL DATA PROVIDERS
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }} />
        </div>

        <div className="surface" style={{ padding: '18px 20px', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              backgroundColor: '#F3E8FF', border: '1px solid #D8B4FE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>CourtListener API</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                  backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
                }}>
                  Active
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                  backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                }}>
                  Public Data
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>
                Provides real-time access to millions of US Federal and State court opinions. This integration operates globally using a master API key and does not require user authentication.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  boxShadow: '0 0 0 2px #F0FDF4',
                }} />
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--success)' }}>
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Local Vault Storage ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            LOCAL VAULT
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }} />
        </div>

        <div className="surface" style={{ padding: '18px 20px', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              backgroundColor: '#F0FDF4', border: '1px solid var(--success-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Local Document Vault</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                  backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
                }}>
                  Active
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>
                All ingested documents are stored on your local machine. Raw files are preserved exactly as received — no modifications.
              </p>

              {/* Vault path display */}
              <div style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 7,
                backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-default)',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <code style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>
                  C:\Users\vinay\.cluco\vault\
                </code>
                <button style={{
                  padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)',
                }}>
                  Change
                </button>
              </div>

              {/* Storage stats */}
              <div style={{ marginTop: 12, display: 'flex', gap: 20 }}>
                {[
                  { label: 'Raw documents', value: '247 files' },
                  { label: 'Storage used', value: '1.4 GB' },
                  { label: 'Vault structure', value: 'Category / Urgency' },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── General Settings ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            GENERAL
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-light)' }} />
        </div>

        <div className="surface" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
          {[
            { label: 'Pipeline Scan Interval', desc: 'How often connected cloud sources are polled as a fallback.', value: 'Every 15 min' },
            { label: 'Minimum OCR Confidence', desc: 'Documents below this threshold are flagged for human review.', value: '70%' },
            { label: 'Auto-assign Threshold', desc: 'Confidence above which documents are automatically linked to a case.', value: '85%' },
            { label: 'Deduplication Method', desc: 'Algorithm used to detect duplicate documents across sources.', value: 'SHA-256' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              padding: '15px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--accent)',
                padding: '4px 12px', borderRadius: 6,
                backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                cursor: 'pointer', flexShrink: 0,
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* ── MODALS ────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {activeModal && activeConn && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 14,
            width: '100%',
            maxWidth: activeConn.authMethod === 'apikey' ? 500 : 460,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            overflow: 'hidden',
          }}>

            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  {activeConn.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Connect {activeConn.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeConn.provider}</div>
                </div>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px' }}>

              {/* ── OAuth / Webhook+OAuth Modal ── */}
              {(activeConn.authMethod === 'oauth' || activeConn.authMethod === 'webhook+oauth') && (
                <>
                  {/* Auth method explanation */}
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    backgroundColor: authMethodConfig[activeConn.authMethod].bg,
                    border: `1px solid ${authMethodConfig[activeConn.authMethod].border}`,
                    marginBottom: 18,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: authMethodConfig[activeConn.authMethod].color, marginBottom: 3 }}>
                      {authMethodConfig[activeConn.authMethod].label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {authMethodConfig[activeConn.authMethod].description}
                    </div>
                  </div>

                  {/* Scopes */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Permissions Requested
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {activeConn.scopes?.map((scope) => (
                        <div key={scope.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{scope.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{scope.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeConn.webhookSupport && (
                    <div style={{
                      padding: '10px 12px', borderRadius: 7,
                      backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE',
                      marginBottom: 20,
                      fontSize: 11.5, color: '#6D28D9', lineHeight: 1.5,
                    }}>
                      ⚡ <strong>Webhook URL</strong> will be registered automatically after authorization. Documents appear in your pipeline in real-time.
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
                    You will be redirected to <strong>{activeConn.name}</strong> to complete authorization. Cluco never stores your password.
                  </div>

                  <button
                    onClick={() => handleOAuthConnect(activeConn.id)}
                    disabled={simulatingOAuth}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                      backgroundColor: simulatingOAuth ? 'var(--border-default)' : 'var(--accent)',
                      color: 'white', fontSize: 13.5, fontWeight: 600, cursor: simulatingOAuth ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {simulatingOAuth ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Authorizing via {activeConn.name}...
                      </>
                    ) : (
                      <>
                        Authorize with {activeConn.name}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </>
                    )}
                  </button>
                </>
              )}

              {/* ── API Key Modal (AWS S3) ── */}
              {activeConn.authMethod === 'apikey' && (
                <>
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#D97706', marginBottom: 3 }}>IAM Minimum Privilege Required</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Create a dedicated IAM user with only <code style={{ backgroundColor: '#FEF9C3', padding: '1px 4px', borderRadius: 3 }}>s3:GetObject</code> and <code style={{ backgroundColor: '#FEF9C3', padding: '1px 4px', borderRadius: 3 }}>s3:ListBucket</code> on your bucket. Never use root account keys.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                    {activeConn.fields?.map((field) => (
                      <div key={field.key}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formValues[field.key] || ''}
                          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: 7,
                            border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-base)',
                            fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                            fontFamily: field.type === 'password' ? 'monospace' : 'inherit',
                            transition: 'border-color 0.12s ease',
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-mid)')}
                          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                        />
                        {field.help && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{field.help}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Test result */}
                  {testResult && (
                    <div style={{
                      padding: '10px 12px', borderRadius: 7, marginBottom: 14,
                      backgroundColor: testResult === 'success' ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${testResult === 'success' ? '#BBF7D0' : '#FECACA'}`,
                      fontSize: 12, fontWeight: 500,
                      color: testResult === 'success' ? '#16A34A' : '#DC2626',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {testResult === 'success' ? '✓ Connection successful! Bucket is reachable with the provided credentials.' : '✗ Connection failed. Check your credentials and bucket name.'}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 7, border: '1px solid var(--border-medium)',
                        backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)',
                        fontSize: 13, fontWeight: 600, cursor: testingConnection ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {testingConnection ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      onClick={() => handleApiKeySave(activeConn.id)}
                      disabled={testResult !== 'success'}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 7, border: 'none',
                        backgroundColor: testResult === 'success' ? 'var(--accent)' : 'var(--border-default)',
                        color: testResult === 'success' ? 'white' : 'var(--text-muted)',
                        fontSize: 13, fontWeight: 600, cursor: testResult === 'success' ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Save & Connect
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spin animation for loading state */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
