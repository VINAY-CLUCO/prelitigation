'use client';

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
  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
          Dashboard
        </h1>
        <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
          Good morning. Here&apos;s your pre-litigation pipeline overview.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="surface"
            style={{ padding: '20px', boxShadow: 'var(--shadow-xs)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.1px' }}>
                {stat.label}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: stat.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.iconColor,
                  flexShrink: 0,
                }}
              >
                {stat.icon}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Phases ── */}
      <div className="surface" style={{ padding: '24px', marginBottom: 32, boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            Pipeline Phases
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Track document progress across all 5 phases
          </p>
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {phases.map((phase, idx) => {
            const cfg = phaseStatusConfig[phase.status];
            return (
              <div key={phase.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    flex: 1,
                    border: `1px solid ${cfg.border}`,
                    backgroundColor: cfg.bg,
                    borderRadius: 8,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: phase.status === 'done' ? '#16A34A' : phase.status === 'active' ? '#2563EB' : '#E5E4E0',
                        color: phase.status === 'pending' ? '#9B9B9B' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {phase.status === 'done' ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : phase.num}
                    </span>
                    <span className="badge" style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      backgroundColor: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 12,
                      fontWeight: 600,
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {phase.name}
                  </div>
                  {phase.count > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {phase.count} docs
                    </div>
                  )}
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

      {/* ── Recent Documents ── */}
      <div className="surface" style={{ boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Recent Documents
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Last 5 documents ingested into the pipeline
            </p>
          </div>
          <a href="/analysis" style={{
            fontSize: 12,
            color: 'var(--accent-mid)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            View all
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
        <div>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1fr 1fr 1fr 80px',
            padding: '10px 24px',
            borderBottom: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-base)',
          }}>
            {['Document', 'Type', 'Source', 'Date', 'Status'].map((col) => (
              <span key={col} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {col}
              </span>
            ))}
          </div>
          {/* Rows */}
          {recentDocs.map((doc, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 1fr 1fr 80px',
                padding: '13px 24px',
                borderBottom: i < recentDocs.length - 1 ? '1px solid var(--border-light)' : 'none',
                alignItems: 'center',
                transition: 'background-color 0.12s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-base)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, backgroundColor: '#F0F2F5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.type}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.source}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.date}</span>
              <span className={docStatusBadge[doc.status]}>{docStatusLabel[doc.status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
