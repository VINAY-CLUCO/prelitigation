'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<any>({
    totalDocs: 0, processedDocs: 0, flaggedDocs: 0, pendingJobsCount: 0, recentDocs: []
  });
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = () => {
      fetch('/api/cms/stats').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
      fetch('/api/connections/status').then(r => r.json()).then(setConnections).catch(() => {});
    };
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, []);

  const connectedList = Object.entries(connections).filter(([, v]: any) => v.connected);
  const totalPercent = data.totalDocs > 0 ? Math.round((data.processedDocs / data.totalDocs) * 100) : 0;
  const flaggedPercent = data.totalDocs > 0 ? ((data.flaggedDocs / data.totalDocs) * 100).toFixed(1) : '0';

  const phases = [
    { num: 1, name: 'Connect', sub: 'Link integrations', status: connectedList.length > 0 ? 'done' : 'active', count: connectedList.length },
    { num: 2, name: 'Collect', sub: 'Sync documents', status: data.totalDocs > 0 ? 'done' : connectedList.length > 0 ? 'active' : 'pending', count: data.totalDocs },
    { num: 3, name: 'Analyze', sub: 'AI classification', status: data.pendingJobsCount > 0 ? 'active' : data.processedDocs > 0 ? 'done' : 'pending', count: data.processedDocs },
    { num: 4, name: 'Review', sub: 'Quality check', status: data.flaggedDocs > 0 ? 'active' : 'pending', count: data.flaggedDocs },
    { num: 5, name: 'Package', sub: 'Deliver output', status: 'pending', count: 0 },
  ];

  const docStatusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    complete: { label: 'Complete', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    flagged: { label: 'Flagged', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    pending: { label: 'Pending', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  };

  const sourceIcon: Record<string, string> = {
    'Google Drive': '🟢', 'Gmail': '🔴', 'Clio Manage': '🟣',
    'Microsoft OneDrive': '🔵', 'Microsoft Outlook': '🔵', 'Dropbox': '🔷', 'Local Upload': '⚪',
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="skeleton" style={{ height: 28, width: 200, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 16, width: 320 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card skeleton" style={{ height: 120 }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: 100, marginBottom: 28 }} />
        <div className="card skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Your pre-litigation pipeline at a glance.</p>
        </div>
        {connectedList.length === 0 && (
          <Link href="/settings" className="btn btn-primary" style={{ flexShrink: 0, marginTop: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Connect Integrations
          </Link>
        )}
      </div>

      {/* ── Next Action Banner ── */}
      {connectedList.length === 0 ? (
        <div style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-default)',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-lg)',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Get started — connect your first integration</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Link Clio, Google Drive, Gmail or Outlook to begin pulling documents into the pipeline.</div>
          </div>
          <Link href="/settings" className="btn btn-primary">
            Set up Connections →
          </Link>
        </div>
      ) : data.totalDocs === 0 ? (
        <div style={{
          padding: '16px 20px',
          borderRadius: 12,
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 0 3px rgba(245,158,11,0.2)', flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#92400E' }}>
            {connectedList.length} integration{connectedList.length > 1 ? 's' : ''} connected — run your first sync to pull in documents.
          </span>
          <Link href="/settings" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#D97706', flexShrink: 0 }}>
            Sync Now →
          </Link>
        </div>
      ) : null}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          {
            label: 'Total Documents',
            value: data.totalDocs,
            sub: `Across ${connectedList.length} connected source${connectedList.length !== 1 ? 's' : ''}`,
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            ),
            iconBg: 'var(--accent-light)', iconColor: 'var(--accent)',
            trend: null,
          },
          {
            label: 'Processed',
            value: data.processedDocs,
            sub: `${totalPercent}% success rate`,
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ),
            iconBg: 'var(--success-light)', iconColor: 'var(--success)',
            trend: totalPercent,
          },
          {
            label: 'Needs Review',
            value: data.flaggedDocs,
            sub: `${flaggedPercent}% of total`,
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ),
            iconBg: 'var(--warning-light)', iconColor: 'var(--warning)',
            trend: null,
          },
          {
            label: 'Active Jobs',
            value: data.pendingJobsCount,
            sub: data.pendingJobsCount > 0 ? 'Workers processing now' : 'Pipeline idle',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={data.pendingJobsCount > 0 ? { animation: 'spin 2s linear infinite' } : {}}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ),
            iconBg: data.pendingJobsCount > 0 ? '#FFFBEB' : 'var(--bg-base)', iconColor: data.pendingJobsCount > 0 ? '#F59E0B' : 'var(--text-muted)',
            trend: null,
          },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {stat.label}
              </span>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: stat.iconBg, color: stat.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              {stat.trend !== null && (stat.trend as number) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
                  ↑ {stat.trend}%
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Phases ── */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: 28 }}>
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Pipeline Phases</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>End-to-end document processing workflow</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {phases.map((phase, idx) => {
            const isDone = phase.status === 'done';
            const isActive = phase.status === 'active';
            return (
              <div key={phase.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: isDone ? 'var(--success-light)' : isActive ? 'var(--accent-light)' : 'var(--bg-base)',
                  border: `1px solid ${isDone ? 'var(--success-border)' : isActive ? 'var(--accent-border)' : 'var(--border-light)'}`,
                  transition: 'all var(--transition-base)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border-medium)',
                      color: isDone || isActive ? 'white' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, flexShrink: 0,
                    }}>
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isActive ? (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : phase.num}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {phase.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                    {phase.count > 0 ? `${phase.count} files` : phase.sub}
                  </div>
                </div>
                {idx < phases.length - 1 && (
                  <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--border-medium)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two-Column Row: Recent Docs + Connected Sources ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Recent Documents */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Documents</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Last documents pulled into the pipeline</p>
            </div>
            <Link href="/analysis" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all →
            </Link>
          </div>

          {data.recentDocs && data.recentDocs.length > 0 ? (
            <div>
              {/* Table Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 90px',
                padding: '10px 22px', background: 'var(--bg-base)',
                borderBottom: '1px solid var(--border-light)',
              }}>
                {['Document', 'Source', 'Date', 'Status'].map(col => (
                  <span key={col} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col}</span>
                ))}
              </div>
              {data.recentDocs.slice(0, 6).map((doc: any, i: number) => {
                const cfg = docStatusConfig[doc.status] || docStatusConfig.pending;
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 90px',
                    padding: '13px 22px',
                    borderBottom: i < data.recentDocs.length - 1 ? '1px solid var(--border-light)' : 'none',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>{sourceIcon[doc.source] || '📄'}</span> {doc.source}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.date}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>No documents yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Connect an integration and run a sync to get started.</div>
              <Link href="/settings" style={{
                display: 'inline-flex', marginTop: 16, padding: '8px 16px', borderRadius: 8,
                background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700,
                boxShadow: 'var(--shadow-sm)',
              }}>
                Go to Connections
              </Link>
            </div>
          )}
        </div>

        {/* Connected Sources */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Connected Sources</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {connectedList.length} of 6 active
            </p>
          </div>
          <div style={{ padding: '12px' }}>
            {connectedList.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔌</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No integrations connected yet.</div>
                <Link href="/settings" style={{ display: 'inline-flex', marginTop: 12, padding: '7px 14px', borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
                  Connect →
                </Link>
              </div>
            ) : connectedList.map(([id, val]: any) => {
              const providerNames: Record<string, string> = {
                clio: 'Clio Manage', gdrive: 'Google Drive', gmail: 'Gmail',
                onedrive: 'OneDrive', outlook: 'Outlook', dropbox: 'Dropbox',
              };
              const providerIcons: Record<string, string> = {
                clio: '🟣', gdrive: '🟢', gmail: '🔴', onedrive: '🔵', outlook: '🔵', dropbox: '🔷',
              };
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 9,
                  background: 'var(--bg-base)', border: '1px solid var(--border-light)',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{providerIcons[id] || '⚪'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{providerNames[id] || id}</div>
                    {val.email && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val.email}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <div className="status-dot online" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)' }}>Live</span>
                  </div>
                </div>
              );
            })}
            {connectedList.length > 0 && (
              <Link href="/settings" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '9px', borderRadius: 8, marginTop: 4,
                border: '1px dashed var(--border-medium)',
                fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                transition: 'all var(--transition-fast)',
              }}
                onMouseEnter={(e) => { (e.currentTarget.style.borderColor = 'var(--accent-border)'); (e.currentTarget.style.color = 'var(--accent)'); }}
                onMouseLeave={(e) => { (e.currentTarget.style.borderColor = 'var(--border-medium)'); (e.currentTarget.style.color = 'var(--text-muted)'); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add integration
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
