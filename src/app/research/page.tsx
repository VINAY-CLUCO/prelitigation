'use client';

import { useState, useRef, useEffect } from 'react';
import DocumentViewer from '@/components/research/DocumentViewer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CLResult {
  id: string;
  caseName: string;
  citation: string;
  court: string;
  dateFiled: string;
  snippet: string;
  absoluteUrl: string | null;
  status?: string;
  judges?: string;
}

interface GovResult {
  id: string;
  title: string;
  collectionCode: string;
  collectionName: string;
  dateIssued: string;
  detailsLink: string | null;
  packageId: string;
  granuleId?: string;
  pdfLink?: string | null;
  snippet?: string;
}

interface ScholarResult {
  id: string;
  title: string;
  link: string | null;
  snippet: string;
  authors: string;
  year: string;
  pdfLink: string | null;
}

interface InternalResult {
  id: string;
  title: string;
  source: string;
  snippet: string;
  date: string;
  category: string;
}

type AnyResult = CLResult | GovResult | ScholarResult | InternalResult;

function isCL(r: AnyResult): r is CLResult {
  return 'caseName' in r;
}

function isGov(r: AnyResult): r is GovResult {
  return 'collectionCode' in r;
}

function isScholar(r: AnyResult): r is ScholarResult {
  return 'authors' in r && 'year' in r;
}

function isInternal(r: AnyResult): r is InternalResult {
  return 'source' in r && 'category' in r;
}

// ─── Platform Config ──────────────────────────────────────────────────────────

interface Platform {
  id: string;
  name: string;
  tagline: string;
  description: string;
  coverage: string;
  status: 'live' | 'premium';
  color: string;
  colorRgb: string;
  bgColor: string;
  borderColor: string;
  placeholder: string;
  searchUrl?: string;
  features?: string[];
  priceNote?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'internal',
    name: 'Internal Client Vault',
    tagline: 'Cluco Secure Vault',
    description: 'Search ingested documents across all active integrations (Clio, Drive, Filevine, Gmail). Discover cross-references between your case files.',
    coverage: 'Client Data',
    status: 'live',
    color: '#0F172A',
    colorRgb: '15,23,42',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    placeholder: 'Search internal files... (e.g., "Smith Deposition")',
  },
  {
    id: 'courtlistener',
    name: 'CourtListener',
    tagline: 'Free Law Project',
    description:
      'Search millions of US federal and state court opinions, PACER dockets, and RECAP documents. The largest free legal database in the US.',
    coverage: '50M+ opinions',
    status: 'live',
    color: '#6D28D9',
    colorRgb: '109,40,217',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    placeholder: 'Search case opinions… (e.g. "slip and fall California" or "Miranda rights")',
  },
  {
    id: 'govinfo',
    name: 'GovInfo',
    tagline: 'US Government Publishing Office',
    description:
      'Official US Government source for the United States Code and Code of Federal Regulations. Authoritative primary law.',
    coverage: 'US Code + CFR',
    status: 'live',
    color: '#047857',
    colorRgb: '4,120,87',
    bgColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    placeholder: 'Search US Code & CFR… (e.g. "diversity jurisdiction 28 USC")',
  },
  {
    id: 'scholar',
    name: 'Google Scholar',
    tagline: 'Google LLC · via SerpApi',
    description:
      'Search legal articles, secondary sources, and scholarly papers.',
    coverage: 'Legal Scholarship',
    status: 'live',
    color: '#D97706',
    colorRgb: '217,119,6',
    bgColor: '#FFF7ED',
    borderColor: '#FDE8D0',
    placeholder: 'Search law review articles & scholarship… (e.g. "AI patent liability")',
  },
  {
    id: 'lexisnexis',
    name: 'LexisNexis',
    tagline: 'LexisNexis Advance',
    description:
      "Industry-leading enterprise legal research platform with Shepard's Citations, 15+ billion searchable documents, and Lexis+ AI.",
    coverage: '15B+ documents',
    status: 'premium',
    color: '#B91C1C',
    colorRgb: '185,28,28',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    placeholder: 'Enter a query to open in LexisNexis…',
    searchUrl: 'https://advance.lexis.com/search/#/page/1?q=',
    features: [
      "Shepard's Citation Service",
      'Lexis+ AI Research Assistant',
      '15+ billion searchable documents',
      'Secondary sources & law reviews',
      'Court documents & filings',
      'News & business intelligence',
    ],
    priceNote:
      'Subscription required — contact your LexisNexis account representative to enable full API integration.',
  }
];

const COLL: Record<string, { bg: string; color: string; label: string }> = {
  USCODE:  { bg: '#ECFDF5', color: '#047857', label: 'US Code' },
  CFR:     { bg: '#EFF6FF', color: '#1D4ED8', label: 'CFR' },
  FR:      { bg: '#FFF7ED', color: '#C2410C', label: 'Federal Register' },
  BILLS:   { bg: '#F5F3FF', color: '#6D28D9', label: 'Bill' },
  STATUTE: { bg: '#FEFCE8', color: '#A16207', label: 'Statute' },
  DEFAULT: { bg: '#F3F4F6', color: '#374151', label: 'Document' },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [activeId, setActiveId] = useState('internal');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // New state for Dual-Pane viewer
  const [selectedDocument, setSelectedDocument] = useState<AnyResult | null>(null);

  const platform = PLATFORMS.find((p) => p.id === activeId)!;

  const switchTab = (id: string) => {
    setActiveId(id);
    setResults([]);
    setHasSearched(false);
    setError(null);
    setQuery('');
    setSelectedDocument(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || platform.status === 'premium') return;

    setLoading(true);
    setHasSearched(true);
    setError(null);
    setResults([]);
    setSelectedDocument(null);

    try {
      if (activeId === 'internal') {
        // Mock internal search for demonstration purposes
        await new Promise(resolve => setTimeout(resolve, 800)); // simulate network delay
        const mockResults: InternalResult[] = [
          {
            id: 'doc-1',
            title: 'Deposition of John Smith.pdf',
            source: 'Filevine',
            date: new Date().toISOString(),
            category: 'Case Management',
            snippet: '...whereupon the witness, John Smith, testified under oath that he did not see the warning sign before the slip and fall incident occurred in the lobby of the California premises...'
          },
          {
            id: 'doc-2',
            title: 'Re: Settlement Negotiation - Smith v. Store',
            source: 'Gmail',
            date: new Date(Date.now() - 86400000).toISOString(),
            category: 'Communication',
            snippet: '...opposing counsel has offered a settlement of $50,000. However, our internal review of the premises liability precedent in California suggests we could argue for a higher claim...'
          }
        ].filter(r => r.snippet.toLowerCase().includes(query.toLowerCase()) || query.length > 0);
        
        setResults(mockResults);
        setCount(mockResults.length);
      } else {
        const res = await fetch(
          `/api/research?q=${encodeURIComponent(query)}&platform=${activeId}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to fetch results.');
        setResults(data.results ?? []);
        setCount(data.count ?? 0);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const livePlatforms = PLATFORMS.filter((p) => p.status === 'live');
  const premiumPlatforms = PLATFORMS.filter((p) => p.status === 'premium');

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }
          @keyframes fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
          .result-card { transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease; cursor: pointer; border: 1px solid transparent; }
          .result-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.06) !important; transform: translateY(-1px) !important; border-color: var(--border-medium); }
          .result-card.selected { border-color: var(--text-primary); box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; }
          .pl-tab:hover:not(.pl-tab-active) { background-color: var(--bg-hover) !important; }
          .cl-view-btn:hover { background-color: var(--bg-base) !important; }
          .pl-deep-btn:hover { filter: brightness(1.08); }
          em { background-color:#FEF3C7; font-style:normal; font-weight:600; color:#92400E; padding:0 2px; border-radius:2px; }
          
          /* Switch layout styles */
          .research-container {
            display: flex;
            height: calc(100vh - 64px); /* assuming top header is 64px */
            overflow: hidden;
            width: 100%;
          }
          .research-left {
            flex: 1;
            padding: 40px 48px;
            overflow-y: auto;
            max-width: ${selectedDocument ? '55%' : '100%'};
            transition: max-width 0.3s ease-in-out;
            margin: ${selectedDocument ? '0' : '0 auto'};
          }
          .research-right {
            flex: ${selectedDocument ? '1' : '0'};
            width: ${selectedDocument ? '45%' : '0'};
            min-width: ${selectedDocument ? '400px' : '0'};
            transition: all 0.3s ease-in-out;
            border-left: ${selectedDocument ? '1px solid var(--border-medium)' : 'none'};
            background-color: var(--bg-surface);
            overflow: hidden;
          }
        `
      }} />

      <div className="research-container">
        {/* LEFT PANE: Search and Results */}
        <div className="research-left">
          
          {/* Header */}
          <div style={{ marginBottom: 36, display: selectedDocument ? 'none' : 'block' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(15,23,42,0.2)',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/>
                    <path d="M3 16.2V21m0 0h4.8M3 21l6-6"/>
                    <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/>
                    <path d="M3 7.8V3m0 0h4.8M3 3l6 6"/>
                  </svg>
                </div>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                    Deep Forensics Discovery
                  </h1>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                    Semantic analysis across Internal Vaults, Federal Courts, and Academic Literature
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Tab Bar */}
          <div className="premium-card" style={{
            display: 'flex', gap: 6, padding: '6px',
            borderRadius: 12, marginBottom: 24,
          }}>
            {PLATFORMS.map((p) => {
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  onClick={() => switchTab(p.id)}
                  className={`pl-tab${isActive ? ' pl-tab-active' : ''}`}
                  style={{
                    flex: 1,
                    border: '1px solid ' + (isActive ? p.borderColor : 'transparent'),
                    borderRadius: 8,
                    cursor: 'pointer',
                    backgroundColor: isActive ? p.bgColor : 'transparent',
                    padding: '12px 10px',
                    textAlign: 'center',
                    transition: 'all var(--transition-base)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: isActive ? p.color : 'var(--text-secondary)',
                    letterSpacing: '-0.3px',
                  }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                    color: isActive ? p.color : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {p.status === 'live' ? (
                      <>
                        <span style={{
                          display: 'inline-block', width: 5, height: 5,
                          borderRadius: '50%', backgroundColor: isActive ? p.color : 'var(--text-placeholder)',
                          ...(isActive ? { animation: 'pulse-dot 2s infinite' } : {}),
                        }} />
                        LIVE
                      </>
                    ) : (
                      <><span style={{ fontSize: 8 }}>◆</span> PREMIUM</>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content area */}
          {platform.status === 'live' ? (
            <LiveSearchArea
              platform={platform}
              query={query}
              setQuery={setQuery}
              loading={loading}
              hasSearched={hasSearched}
              results={results}
              count={count}
              error={error}
              onSearch={handleSearch}
              inputRef={inputRef}
              selectedDocumentId={selectedDocument?.id}
              onSelectDocument={setSelectedDocument}
            />
          ) : (
            <PremiumCard platform={platform} />
          )}

        </div>

        {/* RIGHT PANE: Document Viewer */}
        <div className="research-right">
          {selectedDocument && (
            <DocumentViewer 
              document={selectedDocument} 
              onClose={() => setSelectedDocument(null)} 
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Live Search Area ─────────────────────────────────────────────────────────

function LiveSearchArea({
  platform, query, setQuery, loading, hasSearched, results, count, error, onSearch, inputRef,
  selectedDocumentId, onSelectDocument
}: {
  platform: Platform;
  query: string;
  setQuery: (v: string) => void;
  loading: boolean;
  hasSearched: boolean;
  results: AnyResult[];
  count: number;
  error: string | null;
  onSearch: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  selectedDocumentId?: string;
  onSelectDocument: (doc: AnyResult) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [isSemantic, setIsSemantic] = useState(true);

  return (
    <div>
      {/* Search bar card */}
      <div className="surface" style={{ padding: '20px', marginBottom: 16, boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              backgroundColor: platform.bgColor, border: `1px solid ${platform.borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {platform.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {platform.tagline}
              </div>
            </div>
          </div>
          
          {/* Semantic Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
            <span>Exact Match</span>
            <div 
              onClick={() => setIsSemantic(!isSemantic)}
              style={{
                width: 36, height: 20, borderRadius: 10, backgroundColor: isSemantic ? platform.color : 'var(--border-medium)',
                position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: isSemantic ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', backgroundColor: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ color: isSemantic ? platform.color : 'inherit', fontWeight: isSemantic ? 600 : 500 }}>AI Semantic</span>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={onSearch}>
          <div style={{
            display: 'flex', alignItems: 'center',
            borderRadius: 9,
            border: `1.5px solid ${focused ? platform.color : 'var(--border-medium)'}`,
            backgroundColor: 'var(--bg-surface)',
            boxShadow: focused ? `0 0 0 3px rgba(${platform.colorRgb}, 0.12)` : 'none',
            transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
            overflow: 'hidden',
          }}>
            {/* Search icon */}
            <div style={{ padding: '0 12px 0 16px', color: focused ? platform.color : 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.18s' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={platform.placeholder}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1, border: 'none', outline: 'none',
                padding: '14px 12px',
                fontSize: 14, color: 'var(--text-primary)',
                backgroundColor: 'transparent',
              }}
            />

            {/* Submit button */}
            <div style={{ padding: '0 8px', flexShrink: 0 }}>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                style={{
                  padding: '9px 22px', borderRadius: 7,
                  backgroundColor: query.trim() ? platform.color : 'var(--border-medium)',
                  color: 'white', fontSize: 13.5, fontWeight: 600,
                  border: 'none',
                  cursor: query.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.18s',
                }}
              >
                {loading ? 'Analyzing…' : 'Search'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results */}
      {hasSearched && (
        <div style={{ animation: 'fade-up 0.3s ease-out' }}>
          {error && (
            <div style={{ padding: '14px 18px', borderRadius: 9, backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: 13.5, marginBottom: 16 }}>
              <strong>Error: </strong>{error}
            </div>
          )}

          {loading && <SkeletonLoader />}

          {!loading && !error && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
              No results found. Try broadening your terms.
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              {isSemantic && (
                <div style={{
                  padding: '16px 20px', borderRadius: 8, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0',
                  marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', marginBottom: 4 }}>AI Executive Summary</div>
                    <div style={{ fontSize: 13.5, color: '#14532D', lineHeight: 1.5 }}>
                      Found {count} highly relevant documents. The primary precedents indicate a strong focus on {query || "the subject matter"}. Click any document below to open the Deep Analysis viewer and extract specific arguments.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map((r, idx) => {
                  const isSelected = selectedDocumentId === r.id;
                  return (
                    <div 
                      key={r.id} 
                      onClick={() => onSelectDocument(r)}
                      className={`result-card premium-card ${isSelected ? 'selected' : ''}`}
                    >
                      {isInternal(r) ? (
                         <InternalResultCard result={r as InternalResult} platform={platform} idx={idx} />
                      ) : isCL(r) ? (
                        <CLResultCard result={r as CLResult} platform={platform} idx={idx} />
                      ) : isGov(r) ? (
                        <GovResultCard result={r as GovResult} idx={idx} />
                      ) : (
                        <ScholarResultCard result={r as ScholarResult} platform={platform} idx={idx} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Internal Vault Result Card ────────────────────────────────────────────────
function InternalResultCard({ result, platform, idx }: { result: InternalResult; platform: Platform; idx: number }) {
  return (
    <div style={{ display: 'flex', animation: `fade-up 0.35s ease-out ${idx * 60}ms both` }}>
      <div style={{ width: 4, flexShrink: 0, backgroundColor: platform.color, opacity: 0.65 }} />
      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: platform.color, backgroundColor: platform.bgColor, padding: '2px 7px', borderRadius: 4, border: `1px solid ${platform.borderColor}` }}>
            {result.source}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{result.category}</span>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>
          {result.title}
        </h3>
        {result.snippet && (
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            "{result.snippet}"
          </div>
        )}
      </div>
    </div>
  );
}

// ─── External Result Cards (Simplified for layout) ───────────────────────────
function CLResultCard({ result, platform, idx }: { result: CLResult; platform: Platform; idx: number }) {
  return (
    <div style={{ display: 'flex', animation: `fade-up 0.35s ease-out ${idx * 60}ms both` }}>
      <div style={{ width: 4, flexShrink: 0, backgroundColor: platform.color, opacity: 0.65 }} />
      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: platform.color, backgroundColor: platform.bgColor, padding: '2px 7px', borderRadius: 4, border: `1px solid ${platform.borderColor}` }}>Opinion</span>
          {result.citation && <code style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{result.citation}</code>}
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>{result.caseName}</h3>
        {result.snippet && <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: result.snippet }} />}
      </div>
    </div>
  );
}

function GovResultCard({ result, idx }: { result: GovResult; idx: number }) {
  const coll = COLL[result.collectionCode] ?? COLL.DEFAULT;
  return (
    <div style={{ display: 'flex', animation: `fade-up 0.35s ease-out ${idx * 60}ms both` }}>
      <div style={{ width: 4, flexShrink: 0, backgroundColor: '#047857', opacity: 0.65 }} />
      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: coll.color, backgroundColor: coll.bg, padding: '2px 7px', borderRadius: 4, border: `1px solid ${coll.color}40` }}>{coll.label}</span>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>{result.title}</h3>
      </div>
    </div>
  );
}

function ScholarResultCard({ result, platform, idx }: { result: ScholarResult; platform: Platform; idx: number }) {
  return (
    <div style={{ display: 'flex', animation: `fade-up 0.35s ease-out ${idx * 60}ms both` }}>
      <div style={{ width: 4, flexShrink: 0, backgroundColor: platform.color, opacity: 0.65 }} />
      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: platform.color, backgroundColor: platform.bgColor, padding: '2px 7px', borderRadius: 4, border: `1px solid ${platform.borderColor}` }}>Scholar</span>
          <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>{result.year}</span>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>{result.title}</h3>
        {result.authors && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{result.authors}</div>}
      </div>
    </div>
  );
}

// ─── Skeleton & Premium Card ──────────────────────────────────────────────────
function PremiumCard({ platform }: { platform: Platform }) {
  return (
    <div className="premium-card" style={{ padding: '36px 40px', animation: 'fade-up 0.3s ease-out', borderRadius: 14 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{platform.name}</h2>
      <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>{platform.description}</p>
      {platform.priceNote && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{platform.priceNote}</div>}
    </div>
  );
}

function SkeletonLoader() {
  const shimmer = {
    background: 'linear-gradient(90deg, var(--bg-base) 25%, var(--border-light) 50%, var(--bg-base) 75%)',
    backgroundSize: '600px 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 5,
  } as React.CSSProperties;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {[1, 2, 3].map((i) => (
      <div key={i} className="premium-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ ...shimmer, height: 18, width: 70 }} />
            <div style={{ ...shimmer, height: 18, width: 90 }} />
          </div>
          <div style={{ ...shimmer, height: 20, width: '65%' }} />
          <div style={{ ...shimmer, height: 14, width: '40%' }} />
        </div>
      ))}
    </div>
  );
}
