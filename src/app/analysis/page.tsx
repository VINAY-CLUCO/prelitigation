'use client';

import { useState, useRef } from 'react';

const allDocs = [
  { name: 'Police_Report_Johnson_2024.pdf', type: 'Police Report', size: '2.4 MB', source: 'Local Upload', date: 'Jun 30, 2026', status: 'complete', phase: 'Phase 4 — Case Attribution' },
  { name: 'Medical_Record_Smith_Mercy.pdf', type: 'Medical Record', size: '5.1 MB', source: 'Google Drive', date: 'Jun 30, 2026', status: 'flagged', phase: 'Phase 3 — Quality Check', flags: ['Missing Dates', 'Low OCR Confidence'] },
  { name: 'Witness_Statement_Doe.docx', type: 'Statement', size: '340 KB', source: 'Gmail', date: 'Jun 29, 2026', status: 'pending', phase: 'Phase 2 — Extraction' },
  { name: 'Insurance_Claim_AXA_2024.pdf', type: 'Insurance Doc', size: '1.8 MB', source: 'OneDrive', date: 'Jun 29, 2026', status: 'complete', phase: 'Phase 5 — Packaged' },
  { name: 'Court_Filing_Case4421.pdf', type: 'Court Filing', size: '820 KB', source: 'Local Upload', date: 'Jun 28, 2026', status: 'pending', phase: 'Phase 1 — Ingested' },
  { name: 'Deposition_Williams_06_2026.pdf', type: 'Deposition', size: '3.2 MB', source: 'Google Drive', date: 'Jun 28, 2026', status: 'complete', phase: 'Phase 4 — Case Attribution' },
  { name: 'Accident_Photos_Scene.zip', type: 'Evidence', size: '18.5 MB', source: 'Local Upload', date: 'Jun 27, 2026', status: 'flagged', phase: 'Phase 3 — Quality Check', flags: ['Missing Parties', 'Unreadable Content'] },
  { name: 'ER_Records_Memorial_Hosp.pdf', type: 'Medical Record', size: '4.7 MB', source: 'Email', date: 'Jun 27, 2026', status: 'complete', phase: 'Phase 5 — Packaged' },
];

const TABS = ['All', 'Complete', 'Flagged', 'Pending'];

const statusBadgeStyle: Record<string, { className: string; label: string }> = {
  complete: { className: 'badge badge-success', label: '✓ Complete' },
  flagged: { className: 'badge badge-warning', label: '⚠ Flagged' },
  pending: { className: 'badge badge-neutral', label: '○ Pending' },
};

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = activeTab === 'All' ? allDocs : allDocs.filter((d) => d.status === activeTab.toLowerCase());

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
          Document Analysis
        </h1>
        <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
          Upload, track, and review documents through the pipeline.
        </p>
      </div>

      {/* ── Upload Zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent-mid)' : 'var(--border-medium)'}`,
          borderRadius: 12,
          backgroundColor: isDragging ? 'var(--accent-light)' : 'var(--bg-surface)',
          padding: '40px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          marginBottom: 28,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: isDragging ? '#DBEAFE' : 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          transition: 'all 0.18s ease',
          color: isDragging ? 'var(--accent-mid)' : 'var(--text-muted)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: isDragging ? 'var(--accent-mid)' : 'var(--text-primary)', marginBottom: 4 }}>
          {isDragging ? 'Drop files to upload' : 'Drag & drop files here'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          or click to browse from your computer
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 6,
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-base)',
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          Supported: PDF, DOCX, TXT, PNG, JPG
        </div>
      </div>

      {/* ── Upload Success Notification ── */}
      {uploadedFiles.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}>
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} queued for ingestion: {uploadedFiles.slice(0, 2).join(', ')}{uploadedFiles.length > 2 ? ` +${uploadedFiles.length - 2} more` : ''}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setUploadedFiles([]); }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B9B', fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Filter Tabs + Doc List ── */}
      <div className="surface" style={{ overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-surface)',
        }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    marginBottom: -1,
                  }}
                >
                  {tab}
                  {tab !== 'All' && (
                    <span style={{
                      marginLeft: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 10,
                      backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-base)',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {allDocs.filter(d => d.status === tab.toLowerCase()).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 90px',
          padding: '10px 24px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-base)',
        }}>
          {['Document', 'Type', 'Size', 'Source', 'Pipeline Stage', 'Status'].map((col) => (
            <span key={col} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((doc, i) => (
          <div key={i}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 90px',
                padding: '13px 24px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-base)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.size}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.source}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{doc.phase}</span>
              <span className={statusBadgeStyle[doc.status].className}>{statusBadgeStyle[doc.status].label}</span>
            </div>
            {/* Flags row for flagged docs */}
            {doc.flags && (
              <div style={{
                padding: '6px 24px 10px 68px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                display: 'flex',
                gap: 6,
                backgroundColor: '#FFFBEB',
                marginTop: -1,
              }}>
                <span style={{ fontSize: 11, color: '#92400E', fontWeight: 500 }}>Issues:</span>
                {doc.flags.map((flag) => (
                  <span key={flag} style={{
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 10,
                    backgroundColor: 'white',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                    fontWeight: 500,
                  }}>
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
