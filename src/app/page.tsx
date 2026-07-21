'use client';

import { useState, useEffect } from 'react';

// Dashboard – Home Page

const stats = [
  {
    label: 'Total Documents',
    value: '247',
    sub: 'Ingested across all sources',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    iconBg: '#EEF2FF',
    iconColor: '#1E3A5F',
  },
  {
    label: 'Flagged / Incomplete',
    value: '18',
    sub: '7.3% of total — needs action',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
  },
  {
    label: 'Complete & Processed',
    value: '201',
    sub: '81.4% success rate',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
  },
  {
    label: 'Pending Review',
    value: '28',
    sub: '11.3% awaiting attorney',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    iconBg: '#EEF2FF',
    iconColor: '#2563EB',
  },
];

const phases = [
  { num: 1, name: 'Connect & Collect', count: 247, status: 'done' },
  { num: 2, name: 'Extract & Normalize', count: 235, status: 'active' },
  { num: 3, name: 'Quality Check', count: 219, status: 'pending' },
  { num: 4, name: 'Case Attribution', count: 0, status: 'pending' },
  { num: 5, name: 'Package & Deliver', count: 0, status: 'pending' },
];

const phaseStatusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  done: { label: 'Complete', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  active: { label: 'Running', color: '#2563EB', bg: '#EEF2FF', border: '#BFDBFE' },
  pending: { label: 'Pending', color: '#9B9B9B', bg: '#F7F7F5', border: '#E5E4E0' },
};

const recentDocs = [
  { name: 'Police_Report_Johnson_2024.pdf', type: 'Police Report', source: 'Local Upload', date: 'Jun 30, 2026', status: 'complete', phase: 4 },
  { name: 'Medical_Record_Smith_Mercy.pdf', type: 'Medical Record', source: 'Google Drive', date: 'Jun 30, 2026', status: 'flagged', phase: 3 },
  { name: 'Witness_Statement_Doe.docx', type: 'Statement', source: 'Gmail', date: 'Jun 29, 2026', status: 'pending', phase: 2 },
  { name: 'Insurance_Claim_AXA_2024.pdf', type: 'Insurance Doc', source: 'OneDrive', date: 'Jun 29, 2026', status: 'complete', phase: 5 },
  { name: 'Court_Filing_Case4421.pdf', type: 'Court Filing', source: 'Local Upload', date: 'Jun 28, 2026', status: 'pending', phase: 1 },
];

const docStatusBadge: Record<string, string> = {
  complete: 'badge badge-success',
  flagged: 'badge badge-warning',
  pending: 'badge badge-neutral',
  duplicate: 'badge badge-info',
};
const docStatusLabel: Record<string, string> = {
  complete: 'Complete',
  flagged: 'Flagged',
  pending: 'Pending',
  duplicate: 'Duplicate',
};

export default function DashboardPage() {
  const [data, setData] = useState<any>({
    totalDocs: 0,
    processedDocs: 0,
    flaggedDocs: 0,
    pendingJobsCount: 0,
    recentDocs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cms/stats')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ height: 28, width: 220, backgroundColor: 'var(--border-light)', borderRadius: 6, marginBottom: 10 }} className="animate-pulse" />
          <div style={{ height: 16, width: 340, backgroundColor: 'var(--border-light)', borderRadius: 4 }} className="animate-pulse" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="premium-card" style={{ height: 130, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ height: 14, width: '60%', backgroundColor: 'var(--border-light)', borderRadius: 4 }} className="animate-pulse" />
              <div style={{ height: 32, width: '40%', backgroundColor: 'var(--border-light)', borderRadius: 6 }} className="animate-pulse" />
              <div style={{ height: 12, width: '80%', backgroundColor: 'var(--border-light)', borderRadius: 4 }} className="animate-pulse" />
            </div>
          ))}
        </div>
        <div className="premium-card" style={{ height: 160, padding: 28, marginBottom: 36, backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ height: 16, width: 140, backgroundColor: 'var(--border-light)', borderRadius: 4, marginBottom: 20 }} className="animate-pulse" />
          <div style={{ display: 'flex', gap: 20 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ flex: 1, height: 75, backgroundColor: 'var(--border-light)', borderRadius: 8 }} className="animate-pulse" />
            ))}
          </div>
        </div>
        <div className="premium-card" style={{ height: 300, padding: 28, backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ height: 16, width: 180, backgroundColor: 'var(--border-light)', borderRadius: 4, marginBottom: 20 }} className="animate-pulse" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: 36, backgroundColor: 'var(--border-light)', borderRadius: 6 }} className="animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Map state to dynamic card display values
  const totalPercent = data.totalDocs > 0 ? ((data.processedDocs / data.totalDocs) * 100).toFixed(1) : '0';
  const flaggedPercent = data.totalDocs > 0 ? ((data.flaggedDocs / data.totalDocs) * 100).toFixed(1) : '0';
  
  const dynamicStats = [
    {
      label: 'Total Documents',
      value: String(data.totalDocs),
      sub: 'Ingested across active sources',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      iconBg: '#EEF2FF',
      iconColor: '#1E3A5F',
    },
    {
      label: 'Flagged / Incomplete',
      value: String(data.flaggedDocs),
      sub: `${flaggedPercent}% of total - needs action`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
    },
    {
      label: 'Complete & Processed',
      value: String(data.processedDocs),
      sub: `${totalPercent}% processing success rate`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
    },
    {
      label: 'Pending In Queue',
      value: String(data.pendingJobsCount),
      sub: `${data.pendingJobsCount > 0 ? 'Workers actively processing' : 'Pipeline idle'}`,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      iconBg: '#EEF2FF',
      iconColor: '#2563EB',
    },
  ];

  // Dynamic Phase mapping
  const dynamicPhases = [
    { num: 1, name: 'Connect & Collect', count: data.totalDocs, status: data.totalDocs > 0 ? 'done' : 'pending' },
    { num: 2, name: 'Extract & Normalize', count: data.processedDocs, status: data.pendingJobsCount > 0 ? 'active' : data.processedDocs > 0 ? 'done' : 'pending' },
    { num: 3, name: 'Quality Check', count: data.flaggedDocs, status: data.flaggedDocs > 0 ? 'active' : 'pending' },
    { num: 4, name: 'Case Attribution', count: data.processedDocs, status: data.processedDocs > 0 ? 'done' : 'pending' },
    { num: 5, name: 'Package & Deliver', count: 0, status: 'pending' },
  ];

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
          Dashboard
        </h1>
        <p style={{ marginTop: 6, fontSize: 14.5, color: 'var(--text-secondary)' }}>
          Welcome back. Here is your pre-litigation pipeline overview.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
        {dynamicStats.map((stat) => (
          <div
            key={stat.label}
            className="premium-card hover-lift"
            style={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.2px' }}>
                {stat.label}
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: stat.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.iconColor,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                }}
              >
                {stat.icon}
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Phases ── */}
      <div className="premium-card" style={{ padding: '28px', marginBottom: 36 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Pipeline Phases
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Track document progress across all 5 phases
          </p>
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {dynamicPhases.map((phase, idx) => {
            const cfg = phaseStatusConfig[phase.status];
            const isDone = phase.status === 'done';
            const isActive = phase.status === 'active';
            return (
              <div key={phase.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    flex: 1,
                    border: `1px solid ${cfg.border}`,
                    backgroundColor: cfg.bg,
                    borderRadius: 10,
                    padding: '16px 18px',
                    boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.08)' : 'none',
                    transition: 'all var(--transition-base)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border-medium)',
                        color: isDone || isActive ? 'white' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {isDone ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : phase.num}
                    </span>
                    <span className="badge" style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      backgroundColor: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 12,
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {phase.name}
                  </div>
                  {phase.count > 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 6 }}>
                      {phase.count} files
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                      No files
                    </div>
                  )}
                </div>
                {idx < dynamicPhases.length - 1 && (
                  <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--border-medium)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Documents ── */}
      <div className="premium-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Recent Documents
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Last documents ingested into the pipeline
            </p>
          </div>
          <a href="/analysis" style={{
            fontSize: 13,
            color: 'var(--accent)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 6,
            transition: 'all var(--transition-fast)',
          }}
             onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-hover)')}
             onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          >
            View all
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
        <div>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1.2fr 100px',
            padding: '12px 28px',
            borderBottom: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-base)',
          }}>
            {['Document', 'Type', 'Source', 'Date', 'Status'].map((col) => (
              <span key={col} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {col}
              </span>
            ))}
          </div>
          {/* Rows */}
          {data.recentDocs.length > 0 ? (
            data.recentDocs.map((doc: any, i: number) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1.2fr 100px',
                  padding: '16px 28px',
                  borderBottom: i < data.recentDocs.length - 1 ? '1px solid var(--border-light)' : 'none',
                  alignItems: 'center',
                  transition: 'background-color var(--transition-fast)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.type}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{doc.source}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{doc.date}</span>
                <div>
                  <span className={docStatusBadge[doc.status]} style={{ padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
                    {docStatusLabel[doc.status]}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '48px 28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No documents processed in the pipeline yet. Connect Clio or upload files to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
