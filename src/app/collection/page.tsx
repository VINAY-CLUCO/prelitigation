'use client';

import { useState, useEffect, useMemo } from 'react';

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
}

// ─── Main Component ───────────────────────────────────────────────────
export default function CollectionLibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Grouped by Sender' | 'Grouped by Subject' | 'Grouped by Matter' | 'Emails (Gmail & Outlook)'>('Grouped by Sender');
  const [searchQuery, setSearchQuery] = useState('');

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

  const groupedDocs = useMemo(() => {
    if (activeTab === 'All' || activeTab === 'Emails (Gmail & Outlook)') return { 'All Files': filteredDocs };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
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
            Document Packages
          </h1>
          <p style={{ marginTop: 6, fontSize: 14.5, color: 'var(--text-secondary)' }}>
            All collected files elegantly grouped by sender, subject, or matter for easy review.
          </p>
        </div>

        {/* ── Search ── */}
        <div style={{ position: 'relative', width: 280 }}>
          <svg style={{ position: 'absolute', left: 14, top: 11, color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input 
            type="text" 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 38px', borderRadius: 12,
              background: 'var(--bg-hover)', border: '1px solid var(--border-default)',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
              outline: 'none', transition: 'all var(--transition-fast)'
            }}
          />
        </div>
      </div>

      {/* ── View Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-default)', paddingBottom: 16 }}>
        {['Grouped by Sender', 'Grouped by Subject', 'Grouped by Matter', 'All', 'Emails (Gmail & Outlook)'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: activeTab === tab ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === tab ? 'var(--border-strong)' : 'transparent'}`,
              cursor: 'pointer', transition: 'all var(--transition-fast)'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Loading State ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading document library...
        </div>
      ) : activeTab === 'Emails (Gmail & Outlook)' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-default)' }}>
              <tr>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Subject</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Sender / Receiver</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Important Info Snippet</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Action / Path</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.filter(d => d.source.includes('Gmail') || d.source.includes('Outlook')).map((doc, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-base)' }}>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{doc.name.replace('.pdf', '')}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: 4 }}><strong>From:</strong> {doc.emailSender || 'Unknown'}</div>
                    <div style={{ color: 'var(--text-muted)' }}><strong>To:</strong> Me</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.type.includes('Contract') ? 'Contains terms & conditions regarding...' : 'General discussion and follow-ups...'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{doc.date}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 6 }}>
                      ~/.cluco/vault/{doc.source.toLowerCase()}/{doc.id || Math.floor(Math.random()*1000)}.eml
                    </div>
                    <button style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', cursor: 'pointer'
                    }}>
                      Inspect Locally
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDocs.filter(d => d.source.includes('Gmail') || d.source.includes('Outlook')).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No emails found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedDocs).map(([groupName, docs]) => (
            <div key={groupName} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              
              {/* Group Header */}
              <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{groupName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{docs.length} document{docs.length !== 1 ? 's' : ''} package</div>
                  </div>
                </div>
              </div>

              {/* Group Files: BOX STRUCTURE / GRID LAYOUT */}
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', background: 'var(--bg-base)' }}>
                {docs.map((doc, idx) => (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column', padding: '16px',
                    borderRadius: 12, background: 'var(--bg-hover)', border: '1px solid var(--border-default)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'transform var(--transition-fast)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      {/* Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      
                      {/* AI Tag */}
                      <div style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: doc.type.includes('Medical') ? 'var(--danger-light)' : doc.type.includes('Contract') ? 'var(--info-light)' : 'var(--bg-hover)',
                        color: doc.type.includes('Medical') ? 'var(--danger)' : doc.type.includes('Contract') ? 'var(--info)' : 'var(--text-secondary)',
                        border: `1px solid ${doc.type.includes('Medical') ? 'var(--danger-border)' : doc.type.includes('Contract') ? 'var(--info-border)' : 'var(--border-default)'}`,
                      }}>
                        {doc.type}
                      </div>
                    </div>

                    {/* Meta */}
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

                    {/* Download Raw File Button */}
                    <a
                      href={`/api/connections/clio/download?docId=${doc.id || ''}&name=${encodeURIComponent(doc.name || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      download
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 12px', borderRadius: 8, width: '100%',
                        background: 'linear-gradient(135deg, #5B6CF8 0%, #4F46E5 100%)',
                        color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                        textDecoration: 'none', boxShadow: '0 2px 8px rgba(91, 108, 248, 0.25)',
                        transition: 'transform var(--transition-fast)'
                      }}
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
              No documents found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
