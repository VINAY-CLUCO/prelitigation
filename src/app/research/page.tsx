'use client';

import { useState, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SourceDoc {
  id: string;
  title: string;
  source: string;
  date: string;
  snippet: string;
  url?: string;
  type: 'internal' | 'external';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceDoc[];
  isThinking?: boolean;
  thinkingSteps?: string[];
  currentStepIndex?: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SOURCES: SourceDoc[] = [
  {
    id: 'doc-1',
    title: 'Deposition of John Smith.pdf',
    source: 'Filevine (Internal)',
    date: 'Oct 12, 2025',
    snippet: '...whereupon the witness testified under oath that he did not see the warning sign before the slip and fall incident occurred in the lobby of the California premises...',
    type: 'internal'
  },
  {
    id: 'doc-2',
    title: 'Ortega v. Kmart Corp., 26 Cal. 4th 1200',
    source: 'CourtListener',
    date: 'Dec 20, 2001',
    snippet: 'The California Supreme Court held that a plaintiff may demonstrate constructive notice by showing that the site had not been inspected within a reasonable period of time...',
    url: 'https://www.courtlistener.com',
    type: 'external'
  },
  {
    id: 'doc-3',
    title: 'Moore v. Wal-Mart Stores, Inc., 111 Cal. App. 4th 472',
    source: 'CourtListener',
    date: 'Aug 14, 2003',
    snippet: 'In cases of premises liability, constructive knowledge of the dangerous condition can be imputed to the owner if the condition existed long enough...',
    url: 'https://www.courtlistener.com',
    type: 'external'
  }
];

const MOCK_AI_RESPONSE = `Based on the internal client records and California precedent, here is the synthesis regarding the slip and fall liability claim:

### 1. Factual Background (Internal Vault)
According to the **Deposition of John Smith** [1], the plaintiff testified under oath that there were no visible warning signs at the time of the incident in the lobby. This establishes a baseline that actual notice was not provided to the plaintiff.

### 2. Legal Standard for Constructive Notice
Under California law, a store owner must have actual or constructive notice of a dangerous condition to be held liable. The leading case, **Ortega v. Kmart Corp.** [2], establishes that a plaintiff may prove constructive notice by showing that the hazardous condition existed for an unreasonable amount of time without inspection.

Furthermore, in **Moore v. Wal-Mart Stores** [3], the appellate court reinforced that the failure to inspect the premises within a reasonable time frame allows a jury to infer that the hazard was present long enough to be discovered.

### 3. Strategic Recommendation
Because the internal deposition [1] confirms the absence of warning signs, the plaintiff's case will hinge on proving the duration the hazard was present. We should request maintenance and inspection logs from the defendant to determine if they failed to inspect the premises within a reasonable timeframe, as required by the Ortega standard [2].`;


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim()
    };

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      isThinking: true,
      thinkingSteps: [
        'Analyzing query semantics...',
        'Scanning Internal Vault (Filevine, Clio)...',
        'Querying CourtListener for California Precedents...',
        'Cross-referencing factual assertions...',
        'Synthesizing legal memo...'
      ],
      currentStepIndex: 0
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    setQuery('');
    
    // Auto-resize reset
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Simulate AI thinking and step progression
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < 5) {
        setMessages(prev => prev.map(m => 
          m.id === aiMessageId ? { ...m, currentStepIndex: step } : m
        ));
      } else {
        clearInterval(interval);
        // Finish thinking, show result
        setMessages(prev => prev.map(m => 
          m.id === aiMessageId ? { 
            ...m, 
            isThinking: false, 
            content: MOCK_AI_RESPONSE,
            sources: MOCK_SOURCES
          } : m
        ));
      }
    }, 1200); // 1.2s per step
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  // Helper to render text with inline citations
  const renderTextWithCitations = (text: string, sources: SourceDoc[] = []) => {
    // Basic markdown to HTML for bolding (e.g. **text**)
    let processedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace [1], [2], etc with interactive citation pills
    const parts = processedText.split(/(\[\d+\])/g);
    
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const sourceIndex = parseInt(match[1], 10) - 1;
        const source = sources[sourceIndex];
        if (source) {
          return (
            <span key={i} className="citation-pill" title={source.title}>
              {match[1]}
              <div className="citation-tooltip">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{source.source}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{source.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>"{source.snippet}"</div>
              </div>
            </span>
          );
        }
      }
      return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          
          .message-enter { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          
          /* Citation Pill */
          .citation-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            background-color: var(--bg-hover);
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 700;
            margin: 0 4px;
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
            border: 1px solid var(--border-medium);
            vertical-align: super;
          }
          .citation-pill:hover {
            background-color: #F5F3FF;
            color: #6D28D9;
            border-color: #DDD6FE;
          }
          
          /* Tooltip */
          .citation-tooltip {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%) translateY(5px);
            width: 320px;
            background-color: var(--bg-surface);
            border: 1px solid var(--border-medium);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 100;
            text-align: left;
            pointer-events: none;
          }
          .citation-pill:hover .citation-tooltip {
            visibility: visible;
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          
          /* Custom Scrollbar for Textarea */
          textarea::-webkit-scrollbar { width: 6px; }
          textarea::-webkit-scrollbar-track { background: transparent; }
          textarea::-webkit-scrollbar-thumb { background-color: var(--border-medium); border-radius: 10px; }
          
          /* Memo formatting */
          .memo-content h3 {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 24px 0 8px 0;
          }
          .memo-content p {
            margin-bottom: 16px;
            line-height: 1.7;
          }
        `
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', backgroundColor: '#FAFAFA' }}>
        
        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {messages.length === 0 ? (
            <div className="message-enter" style={{ maxWidth: 800, width: '100%', marginTop: '8vh' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px auto',
                  background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 12 }}>
                  AI Briefing Engine
                </h1>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto', lineHeight: 1.5 }}>
                  Ask any legal question. The AI will instantly search your internal Vaults and external Federal precedents to write a fully synthesized, cited legal memo.
                </p>
              </div>

              {/* Suggestions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 600, margin: '0 auto' }}>
                {[
                  "Draft a memo on California premises liability and constructive notice.",
                  "Analyze John Smith's deposition for contradictions.",
                  "What is the statute of limitations for medical malpractice in NY?",
                  "Cross-reference the latest Filevine uploads with recent Supreme Court rulings."
                ].map((s, i) => (
                  <button key={i} onClick={() => { setQuery(s); inputRef.current?.focus(); }} style={{
                    padding: '16px 20px', borderRadius: 12, backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)', textAlign: 'left',
                    fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                     onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 800, width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
              {messages.map(msg => (
                <div key={msg.id} className="message-enter" style={{ display: 'flex', gap: 16 }}>
                  
                  {/* Avatar */}
                  <div style={{ flexShrink: 0 }}>
                    {msg.role === 'user' ? (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
                    {msg.role === 'user' ? (
                      <div style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div>
                        {/* Thinking State */}
                        {msg.isThinking && msg.thinkingSteps && (
                          <div style={{ 
                            padding: '16px 20px', borderRadius: 12, backgroundColor: 'white', 
                            border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                            display: 'flex', flexDirection: 'column', gap: 12
                          }}>
                            {msg.thinkingSteps.map((step, idx) => {
                              const isActive = idx === msg.currentStepIndex;
                              const isPast = idx < (msg.currentStepIndex || 0);
                              
                              if (idx > (msg.currentStepIndex || 0)) return null;

                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'fade-in 0.3s ease' }}>
                                  {isPast ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite', color: '#6366F1' }}>
                                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                    </svg>
                                  )}
                                  <span style={{ fontSize: 13.5, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 500 : 400 }}>
                                    {step}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Final Answer */}
                        {!msg.isThinking && (
                          <div className="memo-content" style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                            
                            {/* Memo Text */}
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              {renderTextWithCitations(msg.content, msg.sources)}
                            </div>

                            {/* Source Cards */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div style={{ marginTop: 40, borderTop: '1px solid var(--border-medium)', paddingTop: 24 }}>
                                <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
                                  Sources Analyzed ({msg.sources.length})
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                                  {msg.sources.map((source, i) => (
                                    <div key={source.id} style={{
                                      padding: '16px', borderRadius: 12, backgroundColor: 'white',
                                      border: '1px solid var(--border-light)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                      display: 'flex', flexDirection: 'column', gap: 8,
                                      cursor: 'pointer', transition: 'all 0.2s'
                                    }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                       onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                      
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: source.type === 'internal' ? '#0F172A' : '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>{i + 1}</span>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: source.type === 'internal' ? '#0F172A' : '#6D28D9' }}>
                                          {source.source.split(' ')[0]}
                                        </span>
                                      </div>
                                      
                                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {source.title}
                                      </div>
                                      
                                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {source.date}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '24px', backgroundColor: '#FAFAFA', 
          borderTop: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', justifyContent: 'center'
        }}>
          <div style={{ 
            maxWidth: 800, width: '100%',
            backgroundColor: 'white', borderRadius: 16,
            border: '1px solid var(--border-medium)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            padding: '8px 12px', display: 'flex', alignItems: 'flex-end', gap: 12,
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.04)'; }}>
            
            <div style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            <textarea
              ref={inputRef}
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or generate a brief..."
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                padding: '10px 0', fontSize: 15, lineHeight: 1.5,
                color: 'var(--text-primary)', backgroundColor: 'transparent',
                maxHeight: 200, fontFamily: 'inherit'
              }}
            />

            <div style={{ paddingBottom: 6 }}>
              <button 
                onClick={handleSubmit}
                disabled={!query.trim()}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: query.trim() ? '#0F172A' : '#E2E8F0',
                  color: 'white', border: 'none', cursor: query.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
