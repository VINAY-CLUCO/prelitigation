'use client';

import { useState, useRef } from 'react';

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

type AnyResult = CLResult | GovResult | ScholarResult;

function isCL(r: AnyResult): r is CLResult {
  return 'caseName' in r;
}

function isGov(r: AnyResult): r is GovResult {
  return 'collectionCode' in r;
}

function isScholar(r: AnyResult): r is ScholarResult {
  return !('caseName' in r) && !('collectionCode' in r);
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
      'Search legal articles, secondary sources, and scholarly papers. Uses SerpApi’s 100% Free Plan (250 queries/month, no credit card required, completely safe).',
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
  },
  {
    id: 'westlaw',
    name: 'Westlaw',
    tagline: 'Thomson Reuters',
    description:
      'The gold standard in legal research. KeyCite citation validation, Westlaw Precision AI, and the most comprehensive legal database for US law firms.',
    coverage: 'Premium legal database',
    status: 'premium',
    color: '#1E40AF',
    colorRgb: '30,64,175',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    placeholder: 'Enter a query to open in Westlaw…',
    searchUrl: 'https://1.next.westlaw.com/Search/Results.html?query=',
    features: [
      'KeyCite citation validation',
      'Westlaw Precision AI',
      'Expert witness database',
      'Jury verdicts & settlements',
      'Attorney general opinions',
      'Pattern jury instructions',
    ],
    priceNote:
      'Subscription required — contact Thomson Reuters for enterprise licensing and API access.',
  },
];

// ─── GovInfo collection badge styles ─────────────────────────────────────────

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
  const [activeId, setActiveId] = useState('courtlistener');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const platform = PLATFORMS.find((p) => p.id === activeId)!;

  const switchTab = (id: string) => {
    setActiveId(id);
    setResults([]);
    setHasSearched(false);
    setError(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || platform.status === 'premium') return;

    setLoading(true);
    setHasSearched(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(
        `/api/research?q=${encodeURIComponent(query)}&platform=${activeId}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch results.');
      setResults(data.results ?? []);
      setCount(data.count ?? 0);
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
      {/* ── Page-level keyframes ───────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }
          @keyframes fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
          .result-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
          .result-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.09) !important; transform: translateY(-2px) !important; }
          .pl-tab:hover:not(.pl-tab-active) { background-color: var(--bg-hover) !important; }
          .cl-view-btn:hover { background-color: var(--bg-base) !important; }
          .pl-deep-btn:hover { filter: brightness(1.08); }
          em { background-color:#FEF3C7; font-style:normal; font-weight:600; color:#92400E; padding:0 2px; border-radius:2px; }
        `
      }} />

      <div style={{ padding: '28px 40px', maxWidth: 1140 }}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            {/* Title block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #6D28D9 0%, #1D4ED8 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(109,40,217,0.35)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  <line x1="10" y1="10" x2="16" y2="10" />
                  <line x1="10" y1="14" x2="14" y2="14" />
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                  Legal Research Hub
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                  Search US federal courts, statutes, and global academic legal literature in one place
                </p>
              </div>
            </div>

            {/* Status badges */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7',
                fontSize: 12, fontWeight: 600, color: '#047857',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#047857', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                {livePlatforms.length} Live Platforms
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                backgroundColor: '#FFF7ED', border: '1px solid #FED7AA',
                fontSize: 12, fontWeight: 600, color: '#C2410C',
              }}>
                ◆ {premiumPlatforms.length} Premium Available
              </div>
            </div>
          </div>

          {/* Coverage stat strip */}
          <div style={{ display: 'flex', gap: 20, marginTop: 18, padding: '14px 18px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 10, flexWrap: 'wrap' }}>
            {[
              { icon: '⚖️', label: 'CourtListener', value: '50M+ Opinions', color: '#6D28D9' },
              { icon: '📜', label: 'GovInfo', value: 'US Code + CFR', color: '#047857' },
              { icon: '🎓', label: 'Google Scholar', value: 'Scholarly Articles', color: '#D97706' },
              { icon: '🔗', label: 'LexisNexis', value: '15B+ Documents', color: '#B91C1C' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 160px' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 1 }}>{s.value}</div>
                </div>
                {i < 3 && <div style={{ width: 1, height: 28, backgroundColor: 'var(--border-light)', marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Platform Tab Bar ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 4, padding: '5px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 10, marginBottom: 20,
          boxShadow: 'var(--shadow-xs)',
        }}>
          {PLATFORMS.map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                onClick={() => switchTab(p.id)}
                className={`pl-tab${isActive ? ' pl-tab-active' : ''}`}
                style={{
                  flex: 1, border: isActive ? `1.5px solid ${p.borderColor}` : '1.5px solid transparent',
                  borderRadius: 7, cursor: 'pointer',
                  backgroundColor: isActive ? p.bgColor : 'transparent',
                  padding: '11px 8px', textAlign: 'center',
                  transition: 'all 0.18s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{
                  fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                  color: isActive ? p.color : 'var(--text-secondary)',
                  letterSpacing: '-0.2px',
                }}>
                  {p.name}
                </span>
                <span style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase',
                  color: isActive ? p.color : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  {p.status === 'live' ? (
                    <>
                      <span style={{
                        display: 'inline-block', width: 5, height: 5,
                        borderRadius: '50%', backgroundColor: isActive ? p.color : '#9B9B9B',
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

        {/* ── Content area ─────────────────────────────────────────────────── */}
        {platform.status === 'live' ? (
          <LiveSearchArea
            key={platform.id}
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
          />
        ) : (
          <PremiumCard platform={platform} />
        )}
      </div>
    </>
  );
}

// ─── Live Search Area ─────────────────────────────────────────────────────────

function LiveSearchArea({
  platform, query, setQuery, loading, hasSearched, results, count, error, onSearch, inputRef,
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
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      {/* Search bar card */}
      <div className="surface" style={{ padding: '20px', marginBottom: 16, boxShadow: 'var(--shadow-xs)' }}>
        {/* Platform info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            backgroundColor: platform.bgColor, border: `1px solid ${platform.borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {platform.id === 'courtlistener' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 22v-8.5a4 4 0 0 1 8 0V22" />
                <path d="M13 22V10a4 4 0 0 1 8 0v12" />
                <line x1="2" y1="22" x2="22" y2="22" />
              </svg>
            ) : platform.id === 'govinfo' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10v6M12 4l10 6-10 6-10-6z" />
                <path d="M6 12v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {platform.name}
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: platform.color, backgroundColor: platform.bgColor, padding: '2px 7px', borderRadius: 4, border: `1px solid ${platform.borderColor}` }}>
                LIVE
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {platform.tagline} · {platform.coverage}
            </div>
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

            {/* Divider */}
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-medium)', flexShrink: 0 }} />

            {/* Platform label */}
            <span style={{ padding: '0 10px 0 12px', fontSize: 11, fontWeight: 700, color: platform.color, textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {platform.id === 'courtlistener' ? 'Opinions' : platform.id === 'govinfo' ? 'US Code/CFR' : 'Scholarship'}
            </span>

            {/* Divider */}
            <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-medium)', flexShrink: 0 }} />

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
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>

          {/* Platform description hint */}
          {!hasSearched && (
            <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {platform.description}
            </p>
          )}
        </form>
      </div>

      {/* Results */}
      {hasSearched && (
        <div style={{ animation: 'fade-up 0.3s ease-out' }}>

          {/* Error */}
          {error && (
            <div style={{
              padding: '14px 18px', borderRadius: 9,
              backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger-border)',
              color: 'var(--danger)', fontSize: 13.5, marginBottom: 16,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div><strong>Error: </strong>{error}</div>
            </div>
          )}

          {/* Skeleton loader */}
          {loading && <SkeletonLoader />}

          {/* Empty state */}
          {!loading && !error && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: 12 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>No results found</div>
              <div style={{ fontSize: 13 }}>Try different keywords or broaden your search terms.</div>
            </div>
          )}

          {/* Results list */}
          {!loading && results.length > 0 && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  {results.length} results
                  {count > results.length && <span style={{ fontWeight: 400 }}> of {count.toLocaleString()} total</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: platform.color, fontWeight: 500 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: platform.color, display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                  {platform.name} · Live
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map((r, idx) => {
                  if (isCL(r)) {
                    return <CLResultCard key={r.id} result={r} platform={platform} idx={idx} />;
                  } else if (isGov(r)) {
                    return <GovResultCard key={r.id} result={r as GovResult} idx={idx} />;
                  } else {
                    return <ScholarResultCard key={r.id} result={r as ScholarResult} platform={platform} idx={idx} />;
                  }
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CourtListener Result Card ────────────────────────────────────────────────

function CLResultCard({ result, platform, idx }: { result: CLResult; platform: Platform; idx: number }) {
  return (
    <div
      className="result-card surface"
      style={{
        borderRadius: 10, overflow: 'hidden',
        display: 'flex',
        animation: `fade-up 0.35s ease-out ${idx * 60}ms both`,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Accent bar */}
      <div style={{ width: 4, flexShrink: 0, backgroundColor: platform.color, opacity: 0.65 }} />

      <div style={{ flex: 1, padding: '16px 20px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                color: platform.color, backgroundColor: platform.bgColor,
                padding: '2px 7px', borderRadius: 4, border: `1px solid ${platform.borderColor}`,
              }}>
                Opinion
              </span>
              {result.citation && result.citation !== 'No citation available' && result.citation !== '' && (
                <code style={{
                  fontSize: 11, backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)',
                  padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border-default)',
                  fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                }}>
                  {result.citation}
                </code>
              )}
            </div>

            {/* Case name */}
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {result.absoluteUrl ? (
                <a
                  href={result.absoluteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = platform.color)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'inherit')}
                >
                  {result.caseName}
                </a>
              ) : result.caseName}
            </h3>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 11 }}>{result.court}</span>
              {result.dateFiled && (
                <>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'var(--border-medium)', flexShrink: 0 }} />
                  <span>
                    Filed:{' '}
                    {(() => {
                      try {
                        return new Date(result.dateFiled).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      } catch {
                        return result.dateFiled;
                      }
                    })()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          {result.absoluteUrl && (
            <a
              href={result.absoluteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cl-view-btn"
              style={{
                flexShrink: 0, padding: '7px 13px',
                borderRadius: 7, fontSize: 12, fontWeight: 500,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background-color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              Read Opinion
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>

        {/* Snippet */}
        {result.snippet && (
          <div
            style={{
              fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-base)',
              padding: '11px 14px', borderRadius: 7,
              borderLeft: `3px solid rgba(${platform.colorRgb}, 0.35)`,
            }}
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />
        )}
      </div>
    </div>
  );
}

// ─── GovInfo Result Card ──────────────────────────────────────────────────────

function GovResultCard({ result, idx }: { result: GovResult; idx: number }) {
  const coll = COLL[result.collectionCode] ?? COLL.DEFAULT;

  return (
    <div
      className="result-card surface"
      style={{
        borderRadius: 10, overflow: 'hidden',
        display: 'flex',
        animation: `fade-up 0.35s ease-out ${idx * 60}ms both`,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Accent bar */}
      <div style={{ width: 4, flexShrink: 0, backgroundColor: '#047857', opacity: 0.65 }} />

      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                color: coll.color, backgroundColor: coll.bg,
                padding: '2px 7px', borderRadius: 4,
                border: `1px solid ${coll.color}40`,
              }}>
                {coll.label}
              </span>
              {result.dateIssued && (
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Issued:{' '}
                  {(() => {
                    try {
                      return new Date(result.dateIssued).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    } catch {
                      return result.dateIssued;
                    }
                  })()}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {result.detailsLink ? (
                <a
                  href={result.detailsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#047857')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'inherit')}
                >
                  {result.title}
                </a>
              ) : result.title}
            </h3>

            {/* Codes & PDF */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {result.packageId && (
                <code style={{
                  fontSize: 11, color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)',
                  padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border-default)',
                  fontFamily: "'SFMono-Regular', Consolas, monospace",
                }}>
                  {result.packageId}
                </code>
              )}
              {result.granuleId && (
                <code style={{
                  fontSize: 11, color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)',
                  padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border-default)',
                  fontFamily: "'SFMono-Regular', Consolas, monospace",
                }}>
                  {result.granuleId.split('-').slice(-1)[0]}
                </code>
              )}
            </div>
          </div>

          {/* CTA Row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {result.detailsLink && (
              <a
                href={result.detailsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="cl-view-btn"
                style={{
                  padding: '7px 13px',
                  borderRadius: 7, fontSize: 12, fontWeight: 500,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'background-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                View Details
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
            {result.pdfLink && (
              <a
                href={result.pdfLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '7px 13px',
                  borderRadius: 7, fontSize: 12, fontWeight: 500,
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#047857',
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'background-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#D1FAE5')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#ECFDF5')}
              >
                Download PDF
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scholar Result Card ──────────────────────────────────────────────────────

function ScholarResultCard({ result, platform, idx }: { result: ScholarResult; platform: Platform; idx: number }) {
  return (
    <div
      className="result-card surface"
      style={{
        borderRadius: 10, overflow: 'hidden',
        display: 'flex',
        animation: `fade-up 0.35s ease-out ${idx * 60}ms both`,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Accent bar */}
      <div style={{ width: 4, flexShrink: 0, backgroundColor: platform.color, opacity: 0.65 }} />

      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                color: platform.color, backgroundColor: platform.bgColor,
                padding: '2px 7px', borderRadius: 4, border: `1px solid ${platform.borderColor}`,
              }}>
                Scholar Article
              </span>
              {result.year && (
                <span style={{ fontSize: 11.5, color: '#D97706', fontWeight: 600, backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>
                  {result.year}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {result.link ? (
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = platform.color)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'inherit')}
                >
                  {result.title}
                </a>
              ) : result.title}
            </h3>

            {/* Authors */}
            {result.authors && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {result.authors}
              </div>
            )}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {result.link && (
              <a
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                className="cl-view-btn"
                style={{
                  padding: '7px 13px',
                  borderRadius: 7, fontSize: 12, fontWeight: 500,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'background-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                View Source
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
            {result.pdfLink && (
              <a
                href={result.pdfLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '7px 13px',
                  borderRadius: 7, fontSize: 12, fontWeight: 500,
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FFEDD5',
                  color: '#C2410C',
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'background-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#FFD8A8')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#FFF7ED')}
              >
                View PDF
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Snippet */}
        {result.snippet && (
          <div
            style={{
              fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-base)',
              padding: '11px 14px', borderRadius: 7,
              borderLeft: `3px solid rgba(${platform.colorRgb}, 0.35)`,
              marginTop: 10,
            }}
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Premium Platform Card ────────────────────────────────────────────────────

function PremiumCard({ platform }: { platform: Platform }) {
  const [deepQuery, setDeepQuery] = useState('');

  return (
    <div
      className="surface"
      style={{ padding: '36px 40px', boxShadow: 'var(--shadow-sm)', animation: 'fade-up 0.3s ease-out', borderRadius: 12 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            backgroundColor: platform.bgColor,
            border: `2px solid ${platform.borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <circle cx="12" cy="10" r="2" />
              <path d="m8 20 4-4 4 4" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              {platform.name}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>{platform.tagline}</div>
          </div>
        </div>
        <div style={{
          padding: '7px 16px', borderRadius: 20,
          backgroundColor: '#FFF7ED', border: '1px solid #FED7AA',
          fontSize: 11.5, fontWeight: 700, color: '#C2410C',
          letterSpacing: 0.6, textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          ◆ Enterprise Premium
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 28, maxWidth: 680 }}>
        {platform.description}
      </p>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'var(--border-light)', marginBottom: 24 }} />

      {/* Features */}
      {platform.features && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 14 }}>
            Platform Features
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {platform.features.map((feat, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 8,
                backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-light)',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: platform.bgColor, border: `1.5px solid ${platform.borderColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={platform.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick search passthrough */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 12 }}>
          Quick Search on {platform.name}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={deepQuery}
            onChange={(e) => setDeepQuery(e.target.value)}
            placeholder={platform.placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deepQuery.trim() && platform.searchUrl) {
                window.open(platform.searchUrl + encodeURIComponent(deepQuery), '_blank');
              }
            }}
            style={{
              flex: 1, padding: '12px 16px',
              fontSize: 14, borderRadius: 8,
              border: '1.5px solid var(--border-medium)',
              backgroundColor: 'var(--bg-surface)', outline: 'none',
              color: 'var(--text-primary)', transition: 'border-color 0.18s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = platform.color)}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
          />
          <a
            href={
              platform.searchUrl && deepQuery.trim()
                ? platform.searchUrl + encodeURIComponent(deepQuery)
                : (platform.searchUrl ?? '#')
            }
            target="_blank"
            rel="noopener noreferrer"
            className="pl-deep-btn"
            style={{
              padding: '12px 22px', borderRadius: 8,
              backgroundColor: platform.color, color: 'white',
              fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'filter 0.18s', whiteSpace: 'nowrap',
            }}
          >
            Open {platform.name}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Price/access note */}
      {platform.priceNote && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 16px', borderRadius: 8,
          backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-light)',
          fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {platform.priceNote}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

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
        <div key={i} className="surface" style={{ borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ ...shimmer, height: 18, width: 70 }} />
            <div style={{ ...shimmer, height: 18, width: 90 }} />
          </div>
          <div style={{ ...shimmer, height: 20, width: '65%' }} />
          <div style={{ ...shimmer, height: 14, width: '40%' }} />
          <div style={{ ...shimmer, height: 64, width: '100%', borderRadius: 7 }} />
        </div>
      ))}
    </div>
  );
}
