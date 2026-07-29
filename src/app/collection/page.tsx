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
  size: string;
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

const MAIN_TABS = ['All Files', 'Emails', 'Cloud Drives', 'Case Managers', 'Audit Logs'] as const;
type MainTab = typeof MAIN_TABS[number];

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

  // Fetch Documents & Logs
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const res = await fetch('/api/cms/stats');
        const data = await res.json();
        if (active && data) {
          if (data.recentDocs) setDocuments(data.recentDocs);
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

  // Filter Logic
  const filteredDocs = useMemo(() => {
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
      if (emailFilter !== 'All') {
        result = result.filter(d => d.source.includes(emailFilter));
      }
    } else if (activeTab === 'Cloud Drives') {
      result = result.filter(d => d.source.includes('Drive') || d.source.includes('Dropbox') || d.source.includes('OneDrive'));
      if (driveFilter !== 'All') {
        result = result.filter(d => d.source.includes(driveFilter));
      }
    } else if (activeTab === 'Case Managers') {
      result = result.filter(d => d.source.includes('Clio') || d.source.includes('MyCase') || d.source.includes('Filevine'));
      if (caseFilter !== 'All') {
        result = result.filter(d => d.source.includes(caseFilter));
      }
    }

    return result;
  }, [documents, searchQuery, activeTab, emailFilter, driveFilter, caseFilter]);

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
              backgroundColor: 'var(--info-light)', color: 'var(--info)', border: '1px solid var(--info-border)',
              letterSpacing: '0.6px', textTransform: 'uppercase',
            }}>
              LIBRARY
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
            Documents & Logs
          </h1>
        </div>

        {/* ── Unified Search ── */}
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
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
              outline: 'none', transition: 'all var(--transition-fast)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-light)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
          />
        </div>
      </div>

      {/* ── Main Segmented Control Tabs ── */}
      <div style={{ marginBottom: 24, display: 'flex' }}>
        <div style={{ 
          display: 'inline-flex', background: 'var(--bg-hover)', 
          padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' 
        }}>
          {MAIN_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
      </div>

      {/* ── Sub Filters (Only visible on specific tabs) ── */}
      {activeTab !== 'All Files' && activeTab !== 'Audit Logs' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>
            Filter {activeTab}:
          </span>
          
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
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="animate-spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--border-medium)', borderTopColor: 'var(--accent)', borderRadius: '50%', marginBottom: 16 }}></div>
          <div>Loading system data...</div>
        </div>
      ) : activeTab === 'Audit Logs' ? (
        
        /* ── Audit Logs Table ── */
        <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
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
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>
                    {log.ts}
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: log.sourceColor }} />
                      {log.source}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    {log.event}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {log.fileName}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {log.size}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {log.outcome === 'complete' && <span style={{ display: 'inline-block', padding: '2px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid #A7F3D0' }}>COMPLETED</span>}
                    {log.outcome === 'error' && <span style={{ display: 'inline-block', padding: '2px 8px', background: '#FEE2E2', color: '#991B1B', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid #FECACA' }}>ERROR</span>}
                    {log.outcome === 'queued' && <span style={{ display: 'inline-block', padding: '2px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid #FDE68A' }}>QUEUED</span>}
                  </td>
                </tr>
              ))}
              {eventLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No audit logs available</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      ) : (

        /* ── Enterprise Data Grid (Documents & Emails) ── */
        <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
          <table className="premium-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center', paddingRight: 0 }}>
                <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
              </th>
              <th>Name / Subject</th>
              <th>Source / Sender</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Size</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc, idx) => {
              const isExpanded = selectedDocId === doc.id;
              const attachments = doc.attachments || [];
              const senderOrSource = doc.emailSender ? doc.emailSender.split('<')[0].trim() : doc.source;
              const avatar = getAvatarColor(senderOrSource);
              const displayName = doc.emailSubject || doc.name || 'Untitled Document';

              return (
                <React.Fragment key={doc.id || idx}>
                  <tr 
                    onClick={() => setSelectedDocId(isExpanded ? null : doc.id!)}
                    style={{ 
                      background: isExpanded ? 'var(--bg-hover)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ width: 40, textAlign: 'center', paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {displayName}
                        {attachments.length > 0 && (
                          <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: 'var(--bg-hover)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 10, color: 'var(--text-secondary)' }}>
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
                      {doc.downloadedAtRaw ? new Date(doc.downloadedAtRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : doc.date}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>
                      {doc.size}
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      <td colSpan={5} style={{ padding: '0', borderBottom: '1px solid var(--border-medium)' }}>
                        <div style={{ 
                          padding: '24px 24px 32px 60px', 
                          display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 40,
                          boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.05)' 
                        }}>
                          
                          {/* Left Pane: Content */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                Document Preview
                              </div>
                              <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                            </div>
                            <div style={{ 
                              fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)',
                              background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
                              padding: '16px 20px', borderRadius: 'var(--radius-md)'
                            }}>
                              {doc.snippet || 'No plain-text preview available. This document might only contain binary data, tables, or images.'}
                            </div>
                          </div>

                          {/* Right Pane: Metadata & Actions */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                Details
                              </div>
                              <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {/* Source */}
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Ingestion Source</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284C7' }} />
                                  {doc.source}
                                </div>
                              </div>

                              {/* Path */}
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Vault Path</div>
                                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>
                                  ~/.cluco/vault/{doc.source.toLowerCase().replace(/ /g,'_')}/{doc.id}.json
                                </div>
                              </div>

                              {/* AI Classification */}
                              {doc.type && doc.type !== 'Email' && (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>AI Classification</div>
                                  <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                                    {doc.type}
                                  </div>
                                </div>
                              )}

                              {/* Attachments List */}
                              {attachments.length > 0 && (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Attachments</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {attachments.map((attName: string, i: number) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline points="14 2 14 8 20 8"></polyline>
                                        </svg>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {attName}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px auto' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No documents found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}

    </div>
  );
}
