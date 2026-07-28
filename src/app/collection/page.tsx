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

// ─── Main Component ───────────────────────────────────────────────────
export default function CollectionLibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All Emails' | 'Gmail' | 'Outlook' | 'Grouped by Sender' | 'Grouped by Subject' | 'Grouped by Matter' | 'All'>('All Emails');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Advanced Email Filters
  const [emailFilterDate, setEmailFilterDate] = useState<'all'|'today'|'week'|'month'>('all');
  const [emailFilterSender, setEmailFilterSender] = useState<string>('all');
  const [emailFilterHasAttachments, setEmailFilterHasAttachments] = useState<boolean>(false);

  // Fetch Documents
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const res = await fetch('/api/cms/stats');
        const data = await res.json();
        if (active && data.recentDocs) {
          setDocuments(data.recentDocs);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    };

    loadData();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadData();
    }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  // Filter and Group Logic
  const filteredDocs = useMemo(() => {
    return documents.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || (d.emailSender || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [documents, searchQuery]);

  // Extract unique senders for the filter dropdown
  const uniqueSenders = useMemo(() => {
    return Array.from(new Set(
      documents
        .filter(d => (d.source?.includes('Gmail') || d.source?.includes('Outlook')) && d.emailSender)
        .map(d => d.emailSender)
    )).sort();
  }, [documents]);

  const groupedDocs = useMemo(() => {
    if (activeTab === 'All' || activeTab === 'All Emails' || activeTab === 'Gmail' || activeTab === 'Outlook') return { 'All Files': filteredDocs };

    const groups: Record<string, Document[]> = {};
    filteredDocs.forEach(doc => {
      let key = 'Ungrouped';
      if (activeTab === 'Grouped by Sender' && doc.emailSender) key = doc.emailSender;
      if (activeTab === 'Grouped by Subject' && doc.emailSubject) key = doc.emailSubject;
      if (activeTab === 'Grouped by Matter' && doc.matterId) key = `Matter ID: ${doc.matterId}`;
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });
    return groups;
  }, [filteredDocs, activeTab]);

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
            Documents
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

      {/* ── Segmented Control Tabs ── */}
      <div style={{ marginBottom: 24, display: 'flex' }}>
        <div style={{ 
          display: 'inline-flex', background: 'var(--bg-hover)', 
          padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' 
        }}>
          {['All Emails', 'Gmail', 'Outlook', 'Grouped by Sender', 'Grouped by Subject', 'Grouped by Matter', 'All'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
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

      {/* ── Loading State ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="animate-spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--border-medium)', borderTopColor: 'var(--accent)', borderRadius: '50%', marginBottom: 16 }}></div>
          <div>Loading document library...</div>
        </div>
      ) : (activeTab === 'All Emails' || activeTab === 'Gmail' || activeTab === 'Outlook') ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* ── Smart Filters Bar ── */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>
              Filter:
            </span>
            
            <div style={{ position: 'relative' }}>
              <select 
                value={emailFilterDate} 
                onChange={e => setEmailFilterDate(e.target.value as any)}
                className="form-control"
                style={{ cursor: 'pointer', appearance: 'none', paddingRight: 28, background: 'var(--bg-surface)' }}
              >
                <option value="all">Any Date</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>

            <div style={{ position: 'relative' }}>
              <select 
                value={emailFilterSender} 
                onChange={e => setEmailFilterSender(e.target.value)}
                className="form-control"
                style={{ cursor: 'pointer', appearance: 'none', paddingRight: 28, maxWidth: 220, background: 'var(--bg-surface)' }}
              >
                <option value="all">All Senders</option>
                {uniqueSenders.map(sender => (
                  <option key={sender as string} value={sender as string}>{(sender as string).split('<')[0].trim()}</option>
                ))}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
            >
              <input 
                type="checkbox" 
                checked={emailFilterHasAttachments}
                onChange={e => setEmailFilterHasAttachments(e.target.checked)}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              Has Attachments
            </label>
            
            {(emailFilterDate !== 'all' || emailFilterSender !== 'all' || emailFilterHasAttachments) && (
              <button 
                onClick={() => { setEmailFilterDate('all'); setEmailFilterSender('all'); setEmailFilterHasAttachments(false); }}
                className="btn btn-ghost"
                style={{ padding: '6px 12px', height: 'auto' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Enterprise Data Grid ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
            <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center', paddingRight: 0 }}>
                  <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
                </th>
                <th>Sender</th>
                <th>Subject & Snippet</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.filter(d => {
                if (activeTab === 'Gmail') return d.source.includes('Gmail');
                if (activeTab === 'Outlook') return d.source.includes('Outlook');
                return d.source.includes('Gmail') || d.source.includes('Outlook');
              })
                .filter(d => {
                  if (emailFilterSender !== 'all' && d.emailSender !== emailFilterSender) return false;
                  if (emailFilterHasAttachments && d.type === 'Email' && (!d.attachments || d.attachments.length === 0)) return false;
                  if (emailFilterDate !== 'all' && d.downloadedAtRaw) {
                    const diffDays = (new Date().getTime() - new Date(d.downloadedAtRaw).getTime()) / (1000 * 3600 * 24);
                    if (emailFilterDate === 'today' && diffDays > 1) return false;
                    if (emailFilterDate === 'week' && diffDays > 7) return false;
                    if (emailFilterDate === 'month' && diffDays > 30) return false;
                  }
                  return true;
                })
                .reduce((acc: any[], current) => {
                  const isDuplicate = acc.find(item => item.emailSubject === current.emailSubject && item.emailSender === current.emailSender);
                  if (!isDuplicate) acc.push(current);
                  return acc;
                }, [])
                .map((doc, idx) => {
                const isExpanded = selectedEmailId === doc.id;
                const attachments = doc.attachments || [];
                const senderName = (doc.emailSender || 'Unknown').split('<')[0].trim();
                const avatar = getAvatarColor(senderName);

                return (
                  <React.Fragment key={doc.id || idx}>
                    <tr 
                      onClick={() => setSelectedEmailId(isExpanded ? null : doc.id!)}
                      style={{ 
                        background: isExpanded ? 'var(--bg-hover)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ width: 40, textAlign: 'center', paddingRight: 0 }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ accentColor: 'var(--accent)' }} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ 
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: avatar.bg, color: avatar.text, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700 
                          }}>
                            {getInitials(senderName)}
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                            {senderName}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {doc.emailSubject || '(No Subject)'}
                          {attachments.length > 0 && (
                            <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: 'var(--bg-hover)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: 10, color: 'var(--text-secondary)' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                              {attachments.length}
                            </span>
                          )}
                        </div>
                        <div style={{ maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: 13 }}>
                          {(doc as any).snippet || 'No preview available...'}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>
                        {doc.downloadedAtRaw ? new Date(doc.downloadedAtRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : doc.date}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
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
                                {(doc as any).snippet || 'No preview available. This document might only contain binary attachments or images.'}
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
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: doc.source.includes('Outlook') ? '#0284C7' : '#DC2626' }} />
                                    {doc.source}
                                  </div>
                                </div>

                                {/* Path */}
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Vault Path</div>
                                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>
                                    ~/.cluco/vault/{doc.source.toLowerCase()}/{doc.id}.json
                                  </div>
                                </div>

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
              {filteredDocs.filter(d => {
                if (activeTab === 'Gmail') return d.source.includes('Gmail');
                if (activeTab === 'Outlook') return d.source.includes('Outlook');
                return d.source.includes('Gmail') || d.source.includes('Outlook');
              })
                .filter(d => {
                  if (emailFilterSender !== 'all' && d.emailSender !== emailFilterSender) return false;
                  if (emailFilterHasAttachments && d.type === 'Email' && (!d.attachments || d.attachments.length === 0)) return false;
                  if (emailFilterDate !== 'all' && d.downloadedAtRaw) {
                    const diffDays = (new Date().getTime() - new Date(d.downloadedAtRaw).getTime()) / (1000 * 3600 * 24);
                    if (emailFilterDate === 'today' && diffDays > 1) return false;
                    if (emailFilterDate === 'week' && diffDays > 7) return false;
                    if (emailFilterDate === 'month' && diffDays > 30) return false;
                  }
                  return true;
                }).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px auto' }}>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>No documents found</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters or search query.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      ) : (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedDocs).map(([groupName, docs]) => (
            <div key={groupName} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              
              {/* Group Header */}
              <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{groupName}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>

              {/* Group Files */}
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {docs.map((doc, idx) => (
                  <div key={idx} className="surface" style={{
                    display: 'flex', flexDirection: 'column', padding: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', border: '1px solid var(--border-medium)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: doc.type.includes('Medical') ? 'var(--danger-light)' : doc.type.includes('Contract') ? 'var(--info-light)' : 'var(--bg-hover)',
                        color: doc.type.includes('Medical') ? 'var(--danger)' : doc.type.includes('Contract') ? 'var(--info)' : 'var(--text-secondary)',
                        border: `1px solid ${doc.type.includes('Medical') ? 'var(--danger-border)' : doc.type.includes('Contract') ? 'var(--info-border)' : 'var(--border-default)'}`,
                      }}>
                        {doc.type}
                      </div>
                    </div>

                    <div style={{ flex: 1, marginBottom: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
                        {doc.name}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: doc.source.includes('Google') ? '#16A34A' : doc.source.includes('Mail') || doc.source.includes('Outlook') ? '#DC2626' : '#4F46E5' }} />
                          {doc.source}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/api/connections/clio/download?docId=${doc.id || ''}&name=${encodeURIComponent(doc.name || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download Raw File
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedDocs).length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px auto' }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No grouped documents found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search query.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
