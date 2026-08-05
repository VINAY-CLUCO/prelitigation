'use client';

import React, { useState, useEffect, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────
interface Document {
  id?: string;
  name: string;
  type: string;
  source: string;
  date: string;
  status: string;
  size: string; // e.g. "120 KB" or "1.5 MB"
  emailSender: string | null;
  emailSubject: string | null;
  matterId: string | null;
  attachments?: string[];
  downloadedAtRaw?: string;
  snippet?: string;
}

interface EventLog {
  id: number;
  ts: string;
  source: string;
  sourceColor: string;
  event: string;
  fileName: string;
  size: string;
  outcome: string;
}

// ─── Utils ───────────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return '?';
  const clean = name.replace(/<[^>]*>?/gm, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): { bg: string, text: string } {
  const colors = [
    { bg: '#E0E7FF', text: '#3730A3' }, // Indigo
    { bg: '#DBEAFE', text: '#1E40AF' }, // Blue
    { bg: '#D1FAE5', text: '#065F46' }, // Emerald
    { bg: '#FEF3C7', text: '#92400E' }, // Amber
    { bg: '#FCE7F3', text: '#9D174D' }, // Pink
    { bg: '#F3E8FF', text: '#6B21A8' }, // Purple
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Parse "120 KB" or "1.5 MB" into bytes for accurate sorting
function parseSizeToBytes(sizeStr: string): number {
  if (!sizeStr) return 0;
  const num = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
  if (sizeStr.includes('MB')) return num * 1024 * 1024;
  if (sizeStr.includes('KB')) return num * 1024;
  if (sizeStr.includes('GB')) return num * 1024 * 1024 * 1024;
  return num;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const MAIN_TABS = ['All Files', 'Emails', 'Cloud Drives', 'Case Managers', 'Audit Logs'] as const;
type MainTab = typeof MAIN_TABS[number];
type SortConfig = { key: keyof Document | 'displayName', direction: 'asc' | 'desc' } | null;

// ─── Main Component ───────────────────────────────────────────────────
export default function CollectionLibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<MainTab>('All Files');
  
  // Sub-filters for categories
  const [emailFilter, setEmailFilter] = useState<'All' | 'Gmail' | 'Outlook'>('All');
  const [driveFilter, setDriveFilter] = useState<'All' | 'Google Drive' | 'OneDrive' | 'Dropbox'>('All');
  const [caseFilter, setCaseFilter] = useState<'All' | 'Clio' | 'MyCase' | 'Filevine'>('All');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Advanced State: Multi-Select & Sorting
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Fetch Documents & Logs
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const res = await fetch('/api/cms/stats');
        const data = await res.json();
        if (active && data) {
          if (data.documentsList) setDocuments(data.documentsList);
          else if (data.recentDocs) setDocuments(data.recentDocs); // Fallback
          
          if (data.eventLogs) setEventLogs(data.eventLogs);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    loadData();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadData();
    }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  // Filter & Sort Logic
  const processedDocs = useMemo(() => {
    let result = documents;

    // 1. Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        (d.name || '').toLowerCase().includes(q) || 
        (d.emailSender || '').toLowerCase().includes(q) ||
        (d.emailSubject || '').toLowerCase().includes(q)
      );
    }

    // 2. Main Tab Filter
    if (activeTab === 'Emails') {
      result = result.filter(d => d.source.includes('Gmail') || d.source.includes('Outlook'));
      if (emailFilter !== 'All') result = result.filter(d => d.source.includes(emailFilter));
    } else if (activeTab === 'Cloud Drives') {
      result = result.filter(d => d.source.includes('Drive') || d.source.includes('Dropbox') || d.source.includes('OneDrive'));
      if (driveFilter !== 'All') result = result.filter(d => d.source.includes(driveFilter));
    } else if (activeTab === 'Case Managers') {
      result = result.filter(d => d.source.includes('Clio') || d.source.includes('MyCase') || d.source.includes('Filevine'));
      if (caseFilter !== 'All') result = result.filter(d => d.source.includes(caseFilter));
    }

    // 3. Sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof Document] || '';
        let valB: any = b[sortConfig.key as keyof Document] || '';

        // Special handling for computed fields
        if (sortConfig.key === 'displayName') {
          valA = a.emailSubject || a.name || '';
          valB = b.emailSubject || b.name || '';
        } else if (sortConfig.key === 'size') {
          valA = parseSizeToBytes(a.size);
          valB = parseSizeToBytes(b.size);
        } else if (sortConfig.key === 'date') {
          valA = a.downloadedAtRaw ? new Date(a.downloadedAtRaw).getTime() : new Date(a.date).getTime();
          valB = b.downloadedAtRaw ? new Date(b.downloadedAtRaw).getTime() : new Date(b.date).getTime();
        } else if (sortConfig.key === 'source') {
          valA = (a.emailSender || a.source || '').toLowerCase();
          valB = (b.emailSender || b.source || '').toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [documents, searchQuery, activeTab, emailFilter, driveFilter, caseFilter, sortConfig]);

  // Telemetry Metrics
  const totalSizeBytes = useMemo(() => {
    return documents.reduce((sum, doc) => sum + parseSizeToBytes(doc.size), 0);
  }, [documents]);
  const formattedTotalSize = formatBytes(totalSizeBytes);

  // Executive Abstract: Aggregate data by source system
  const sourceStats = useMemo(() => {
    const stats: Record<string, { count: number, sizeBytes: number, category: string }> = {};
    documents.forEach(doc => {
      let s = doc.source || 'Unknown';
      let category = 'System Integration';
      if (s.includes('Gmail')) { s = 'Google Workspace (Gmail)'; category = 'Communication'; }
      else if (s.includes('Outlook')) { s = 'Microsoft 365 (Outlook)'; category = 'Communication'; }
      else if (s.includes('Drive')) { s = 'Google Drive'; category = 'Cloud Storage'; }
      else if (s.includes('Dropbox')) { s = 'Dropbox Enterprise'; category = 'Cloud Storage'; }
      else if (s.includes('OneDrive')) { s = 'Microsoft OneDrive'; category = 'Cloud Storage'; }
      else if (s.includes('Clio')) { s = 'Clio Manage'; category = 'Case Management'; }
      else if (s.includes('MyCase')) { s = 'MyCase Platform'; category = 'Case Management'; }
      else if (s.includes('Filevine')) { s = 'Filevine Suite'; category = 'Case Management'; }

      if (!stats[s]) stats[s] = { count: 0, sizeBytes: 0, category };
      stats[s].count += 1;
      stats[s].sizeBytes += parseSizeToBytes(doc.size);
    });
    
    return Object.entries(stats)
      .map(([source, data]) => ({
        source,
        category: data.category,
        count: data.count,
        sizeBytes: data.sizeBytes,
        formattedSize: formatBytes(data.sizeBytes)
      }))
      .sort((a, b) => b.sizeBytes - a.sizeBytes); // Sort by total storage volume
  }, [documents]);

  // Sorting Handler
  const requestSort = (key: keyof Document | 'displayName') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Selection Handlers
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === processedDocs.length && processedDocs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedDocs.map(d => d.id!)));
    }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1500, margin: '0 auto', position: 'relative' }}>
      
      {/* ── Dashboard Telemetry Header ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        
        {/* Title Block */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 20, backgroundColor: 'var(--info-light)', color: 'var(--info)', border: '1px solid var(--info-border)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              MASTER REPOSITORY
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
              <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Live Sync Active
            </div>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
            Data Forensics & Library
          </h1>
        </div>

        {/* Metric Cards */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Indexed Evidence</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {documents.length.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Vault Footprint</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {formattedTotalSize}
          </div>
        </div>

      </div>

      {/* ── Executive Ingestion Abstract ── */}
      <div className="card animate-fade-in" style={{ padding: '20px 24px', marginBottom: 32, background: 'var(--bg-surface)', border: '1px solid var(--border-medium)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Ingestion Sources Executive Summary
          </h2>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Attorney Client Privilege Work Product</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sourceStats.map(stat => (
            <div key={stat.source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{stat.source}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.category}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{stat.count.toLocaleString()}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{stat.formattedSize}</div>
              </div>
            </div>
          ))}
          {sourceStats.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No ingestion sources populated yet.</div>
          )}
        </div>
      </div>

      {/* ── Toolbar: Search & Tabs ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-hover)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          {MAIN_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
              style={{
                padding: '6px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
                background: activeTab === tab ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: activeTab === tab ? 'var(--shadow-sm), 0 0 0 1px var(--border-medium)' : 'none',
                cursor: 'pointer', transition: 'all var(--transition-fast)'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 320 }}>
          <svg style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input 
            type="text" 
            placeholder="Search documents, senders, or content..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, outline: 'none', transition: 'all var(--transition-fast)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
          />
        </div>
      </div>

      {/* ── Sub Filters ── */}
      {activeTab !== 'All Files' && activeTab !== 'Audit Logs' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'inline-flex', background: 'var(--bg-hover)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            
            {activeTab === 'Emails' && ['All', 'Gmail', 'Outlook'].map(f => (
              <button key={f} onClick={() => setEmailFilter(f as any)} style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, background: emailFilter === f ? 'var(--bg-surface)' : 'transparent', color: emailFilter === f ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', boxShadow: emailFilter === f ? '0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px var(--border-medium)' : 'none', cursor: 'pointer' }}>{f}</button>
            ))}

            {activeTab === 'Cloud Drives' && ['All', 'Google Drive', 'OneDrive', 'Dropbox'].map(f => (
              <button key={f} onClick={() => setDriveFilter(f as any)} style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, background: driveFilter === f ? 'var(--bg-surface)' : 'transparent', color: driveFilter === f ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', boxShadow: driveFilter === f ? '0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px var(--border-medium)' : 'none', cursor: 'pointer' }}>{f}</button>
            ))}

            {activeTab === 'Case Managers' && ['All', 'Clio', 'MyCase', 'Filevine'].map(f => (
              <button key={f} onClick={() => setCaseFilter(f as any)} style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, background: caseFilter === f ? 'var(--bg-surface)' : 'transparent', color: caseFilter === f ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', boxShadow: caseFilter === f ? '0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px var(--border-medium)' : 'none', cursor: 'pointer' }}>{f}</button>
            ))}
            
          </div>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
          <div className="animate-spin" style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid var(--border-medium)', borderTopColor: 'var(--accent)', borderRadius: '50%', marginBottom: 16 }}></div>
          <div style={{ fontWeight: 600 }}>Loading telemetry data...</div>
        </div>
      ) : activeTab === 'Audit Logs' ? (
        
        /* ── Audit Logs Table ── */
        <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto', border: '1px solid var(--border-light)' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Source</th>
                <th>Event Action</th>
                <th>Target File</th>
                <th>Size</th>
                <th style={{ textAlign: 'right' }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {eventLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>{log.ts}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: log.sourceColor }} />
                      {log.source}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{log.event}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{log.fileName}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{log.size}</td>
                  <td style={{ textAlign: 'right' }}>
                    {log.outcome === 'complete' && <span style={{ display: 'inline-block', padding: '2px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid #A7F3D0' }}>COMPLETED</span>}
                    {log.outcome === 'error' && <span style={{ display: 'inline-block', padding: '2px 8px', background: '#FEE2E2', color: '#991B1B', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid #FECACA' }}>ERROR</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (

        /* ── Enterprise Data Grid (Documents & Emails) ── */
        <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto', border: '1px solid var(--border-light)' }}>
          <table className="premium-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center', paddingRight: 0 }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === processedDocs.length && processedDocs.length > 0}
                  onChange={toggleSelectAll}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} 
                />
              </th>
              <th onClick={() => requestSort('displayName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Name / Subject {sortConfig?.key === 'displayName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => requestSort('source')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Source / Sender {sortConfig?.key === 'source' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => requestSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Date {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => requestSort('size')} style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}>
                Size {sortConfig?.key === 'size' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {processedDocs.map((doc, idx) => {
              const isExpanded = selectedDocId === doc.id;
              const isSelected = selectedIds.has(doc.id!);
              const attachments = doc.attachments || [];
              const senderOrSource = doc.emailSender ? doc.emailSender.split('<')[0].trim() : doc.source;
              const avatar = getAvatarColor(senderOrSource);
              const displayName = doc.emailSubject || doc.name || 'Untitled Document';

              return (
                <React.Fragment key={doc.id || idx}>
                  <tr 
                    onClick={() => setSelectedDocId(isExpanded ? null : doc.id!)}
                    style={{ 
                      background: isSelected ? 'var(--accent-light)' : (isExpanded ? 'var(--bg-hover)' : 'transparent'),
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <td style={{ width: 40, textAlign: 'center', paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelection(doc.id!)}
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} 
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {displayName}
                        {attachments.length > 0 && (
                          <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 10, color: 'var(--text-secondary)' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            {attachments.length}
                          </span>
                        )}
                      </div>
                      <div style={{ maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: 13 }}>
                        {doc.snippet || doc.type || 'Document'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: avatar.bg, color: avatar.text, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700 
                        }}>
                          {getInitials(senderOrSource)}
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                          {senderOrSource}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>
                      {doc.downloadedAtRaw ? new Date(doc.downloadedAtRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : doc.date}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>
                      {doc.size}
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr style={{ background: 'var(--bg-surface)' }}>
                      <td colSpan={5} style={{ padding: '0', borderBottom: '1px solid var(--border-medium)' }}>
                        <div style={{ 
                          padding: '24px 24px 32px 60px', 
                          display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40,
                          boxShadow: 'inset 0 8px 12px -8px rgba(0,0,0,0.08)' 
                        }}>
                          
                          {/* Left Pane: Forensics Content */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                Content Forensics
                              </div>
                              <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                            </div>
                            <div style={{ 
                              fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)',
                              background: '#FAFAFA', border: '1px solid var(--border-medium)',
                              padding: '16px 20px', borderRadius: 'var(--radius-md)'
                            }}>
                              {doc.snippet || 'No plain-text preview available. Document contains encrypted binary data, structured tables, or scanned images.'}
                            </div>

                            {/* Attachments List inside left pane if they exist */}
                            {attachments.length > 0 && (
                              <div style={{ marginTop: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Included Attachments</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                                  {attachments.map((attName: string, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FAFAFA', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                      </svg>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {attName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Pane: Telemetry Metadata */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                System Metadata
                              </div>
                              <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {/* Source */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Ingestion Node</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#FAFAFA', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700 }}>
                                  <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }} />
                                  {doc.source}
                                </div>
                              </div>

                              {/* Path */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Vault Origin Path</div>
                                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', background: '#FAFAFA', border: '1px solid var(--border-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>
                                  ~/.cluco/vault/{doc.source.toLowerCase().replace(/ /g,'_')}/{doc.id}.json
                                </div>
                              </div>

                              {/* AI Classification */}
                              {doc.type && doc.type !== 'Email' && (
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>AI Classification</div>
                                  <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700 }}>
                                    {doc.type}
                                  </div>
                                </div>
                              )}
                              
                              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <button style={{ flex: 1, padding: '8px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Raw JSON</button>
                                <button 
                                  onClick={() => window.open(`/api/documents/download?id=${doc.id}`, '_blank')}
                                  style={{ flex: 1, padding: '8px', background: 'var(--text-primary)', color: '#FFF', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Download File
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            
            {/* Empty State */}
            {processedDocs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px auto', opacity: 0.5 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No documents match your filters</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      {/* ── Floating Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="animate-fade-in" style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-primary)', color: '#FFF',
          padding: '12px 24px', borderRadius: '30px',
          display: 'flex', alignItems: 'center', gap: 24,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1) inset',
          zIndex: 100
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'document' : 'documents'} selected
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20, color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
              Download All
            </button>
            <button style={{ padding: '6px 14px', background: 'var(--accent)', border: 'none', borderRadius: 20, color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}>
              Export to Matter
            </button>
            <button style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
