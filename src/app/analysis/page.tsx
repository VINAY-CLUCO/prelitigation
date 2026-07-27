'use client';

import { useState, useRef, useEffect } from 'react';

const TABS = ['All', 'Complete', 'Flagged', 'Pending'];

const statusBadgeStyle: Record<string, { className: string; label: string }> = {
  complete: { className: 'badge badge-success', label: '✓ Complete' },
  flagged: { className: 'badge badge-warning', label: '⚠ Flagged' },
  pending: { className: 'badge badge-neutral', label: '○ Pending' },
};

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/cms/documents')
      .then(res => res.json())
      .then(data => {
        if (data.documents && data.documents.length > 0) {
          setAllDocs(data.documents);
          setLoading(false);
        } else {
          return fetch('/api/cms/matters').then(res => res.json()).then(mData => {
            const matters = mData.matters || [];
            const filesList: any[] = [];
            for (const m of matters) {
              for (const d of m.documents) {
                const isFlagged = !d.ai_tag || d.ai_tag.includes('Uncategorized') || d.ai_tag.includes('⚠');
                filesList.push({
                  id: d.id,
                  name: d.name,
                  type: d.ai_tag || 'Document 📄',
                  size: d.size ? `${(d.size / 1024).toFixed(0)} KB` : '120 KB',
                  source: 'Clio Manage',
                  date: d.downloaded_at ? new Date(d.downloaded_at).toLocaleDateString() : 'Just now',
                  status: isFlagged ? 'flagged' : 'complete',
                  phase: isFlagged ? 'Phase 3 — Quality Check' : 'Phase 4 — Case Attribution',
                  flags: isFlagged ? ['Uncategorized File Type'] : [],
                  downloadUrl: `/api/connections/clio/download?docId=${d.id || ''}&name=${encodeURIComponent(d.name || '')}`
                });
              }
            }
            setAllDocs(filesList);
            setLoading(false);
          });
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const combinedDocs = [...allDocs, ...uploadedFiles];
  const filtered = activeTab === 'All' ? combinedDocs : combinedDocs.filter((d) => d.status === activeTab.toLowerCase());

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({
        name: f.name,
        type: 'Local Upload',
        size: `${(f.size / 1024).toFixed(0)} KB`,
        source: 'Local File',
        date: new Date().toLocaleDateString(),
        status: 'pending',
        phase: 'Phase 1 — Ingested'
      }))
    ]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({
        name: f.name,
        type: 'Local Upload',
        size: `${(f.size / 1024).toFixed(0)} KB`,
        source: 'Local File',
        date: new Date().toLocaleDateString(),
        status: 'pending',
        phase: 'Phase 1 — Ingested'
      }))
    ]);
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
          Document Analysis
        </h1>
        <p style={{ marginTop: 6, fontSize: 14.5, color: 'var(--text-secondary)' }}>
          Upload, track, and review documents through the pipeline.
        </p>
      </div>

      {/* ── Upload Zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="premium-card"
        style={{
          border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--border-medium)',
          backgroundColor: isDragging ? 'var(--accent-light)' : 'var(--bg-surface)',
          padding: '48px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-base)',
          marginBottom: 36,
          boxShadow: isDragging ? '0 10px 25px rgba(79, 70, 229, 0.05)' : 'var(--shadow-premium)',
          transform: isDragging ? 'scale(1.005)' : 'none',
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
          width: 52,
          height: 52,
          borderRadius: 12,
          backgroundColor: isDragging ? '#C7D2FE' : 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          transition: 'all var(--transition-base)',
          color: isDragging ? 'var(--accent)' : 'var(--text-muted)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: isDragging ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 6 }}>
          {isDragging ? 'Drop files to upload' : 'Drag & drop files here'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          or click to browse from your computer
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 20,
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-base)',
          fontSize: 11.5,
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}>
          Supported: PDF, DOCX, TXT, PNG, JPG
        </div>
      </div>

      {/* ── Upload Success Notification ── */}
      {uploadedFiles.length > 0 && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 10,
          backgroundColor: 'var(--success-light)',
          border: '1px solid var(--success-border)',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.05)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} queued for ingestion: {uploadedFiles.slice(0, 2).join(', ')}{uploadedFiles.length > 2 ? ` +${uploadedFiles.length - 2} more` : ''}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setUploadedFiles([]); }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Filter Tabs + Doc List ── */}
      <div className="premium-card" style={{ overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-surface)',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '16px 12px',
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    marginBottom: -1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {tab}
                  {tab !== 'All' && (
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-hover)',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                    }}>
                      {allDocs.filter(d => d.status === tab.toLowerCase()).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1.3fr 100px 100px',
          padding: '12px 28px',
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-base)',
        }}>
          {['Document', 'Type', 'Size', 'Source', 'Pipeline Stage', 'Status', 'Action'].map((col) => (
            <span key={col} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
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
                gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1.3fr 100px 100px',
                padding: '16px 28px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast)',
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
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{doc.type}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{doc.size}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{doc.source}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{doc.phase}</span>
              <div>
                <span className={statusBadgeStyle[doc.status].className} style={{ padding: '3px 9px', fontSize: 11, fontWeight: 700 }}>
                  {statusBadgeStyle[doc.status].label}
                </span>
              </div>
              <div>
                <a
                  href={doc.downloadUrl || `/api/connections/clio/download?name=${encodeURIComponent(doc.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Save
                </a>
              </div>
            </div>
            {/* Flags row for flagged docs */}
            {doc.flags && (
              <div style={{
                padding: '10px 28px 14px 72px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'var(--warning-light)',
                marginTop: -1,
                borderTop: '1px solid var(--warning-border)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Pipeline Issues:
                </span>
                {doc.flags.map((flag: string) => (
                  <span key={flag} style={{
                    fontSize: 11.5,
                    padding: '2px 8px',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--warning-border)',
                    color: 'var(--warning)',
                    fontWeight: 600,
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
