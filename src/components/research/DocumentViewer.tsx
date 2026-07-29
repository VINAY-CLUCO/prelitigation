import React, { useState } from 'react';

interface DocumentViewerProps {
  document: any;
  onClose: () => void;
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'chat'>('text');
  
  if (!document) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-medium)',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.03)',
      animation: 'slide-in-right 0.3s ease-out',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid var(--border-medium)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        backgroundColor: 'var(--bg-base)'
      }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              color: 'var(--text-primary)', backgroundColor: 'var(--border-light)',
              padding: '3px 8px', borderRadius: 4,
            }}>
              Reference View
            </span>
            {document.court && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {document.court}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
            {document.caseName || document.title || 'Selected Document'}
          </h2>
          {(document.citation || document.dateFiled || document.dateIssued) && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {document.citation && <span>{document.citation}</span>}
              {document.citation && (document.dateFiled || document.dateIssued) && <span style={{ margin: '0 8px' }}>•</span>}
              {(document.dateFiled || document.dateIssued) && <span>{new Date(document.dateFiled || document.dateIssued).toLocaleDateString()}</span>}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 8, borderRadius: '50%', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background-color 0.15s, color 0.15s'
        }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
           onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-medium)', padding: '0 16px' }}>
        <button
          onClick={() => setActiveTab('text')}
          style={{
            background: 'none', border: 'none', padding: '14px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            color: activeTab === 'text' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'text' ? '2px solid var(--text-primary)' : '2px solid transparent',
            transition: 'color 0.15s'
          }}
        >
          Document Text
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            background: 'none', border: 'none', padding: '14px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'chat' ? '2px solid var(--text-primary)' : '2px solid transparent',
            transition: 'color 0.15s'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          AI Analysis
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {activeTab === 'text' && (
          <div style={{ animation: 'fade-in 0.2s ease-out' }}>
            <div style={{ 
              padding: '16px 20px', backgroundColor: '#FEFCE8', 
              borderLeft: '4px solid #F59E0B', borderRadius: '4px 8px 8px 4px',
              marginBottom: 24, fontSize: 13.5, color: '#92400E', lineHeight: 1.6
            }}>
              <strong>Reference Match:</strong> The search query directly matched the following extracted paragraph from the document.
            </div>
            
            {document.snippet ? (
              <div 
                style={{ 
                  fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)', 
                  fontFamily: "'Georgia', serif",
                }}
                dangerouslySetInnerHTML={{ __html: document.snippet }}
              />
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Full text preview is not available for this record.</div>
            )}
            
            <div style={{ marginTop: 40, borderTop: '1px dashed var(--border-medium)', paddingTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Metadata
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 13 }}>
                <div style={{ color: 'var(--text-muted)' }}>Source ID</div>
                <div style={{ fontFamily: 'monospace' }}>{document.id}</div>
                {document.absoluteUrl && (
                  <>
                    <div style={{ color: 'var(--text-muted)' }}>URL</div>
                    <div><a href={document.absoluteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1D4ED8' }}>External Link</a></div>
                  </>
                )}
                {document.authors && (
                  <>
                    <div style={{ color: 'var(--text-muted)' }}>Authors</div>
                    <div>{document.authors}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'chat' && (
          <div style={{ animation: 'fade-in 0.2s ease-out', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ 
              backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-medium)', 
              borderRadius: 12, padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 16
            }}>
              {/* Chat history placeholder */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, marginLeft: 4 }}>Copilot</div>
                  <div style={{ backgroundColor: '#F3F4F6', padding: '12px 16px', borderRadius: '2px 16px 16px 16px', fontSize: 13.5, color: '#1F2937', lineHeight: 1.5 }}>
                    I am ready to help you analyze <strong>{document.caseName || document.title}</strong>. What would you like to know? I can summarize the key findings or extract specific legal arguments.
                  </div>
                </div>
              </div>
              
              {/* Input box */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  placeholder="Ask a question about this document..." 
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 20,
                    border: '1px solid var(--border-medium)', outline: 'none',
                    fontSize: 13.5
                  }}
                />
                <button style={{
                  width: 44, height: 44, borderRadius: '50%',
                  backgroundColor: '#111827', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slide-in-right {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `
      }} />
    </div>
  );
}
