'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1.5" />
        <rect width="7" height="5" x="3" y="15" rx="1.5" />
        <rect width="7" height="9" x="14" y="12" rx="1.5" />
        <rect width="7" height="5" x="14" y="3" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/collection',
    label: 'Collection',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/analysis',
    label: 'Analysis',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    href: '/research',
    label: 'Research',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    ),
  },
  {
    href: '/cms',
    label: 'Matter CMS',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <path d="M13 8h4" />
        <path d="M13 12h4" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];


export default function Sidebar() {
  const pathname = usePathname();
  const [statsData, setStatsData] = useState({ totalDocs: 0, processedDocs: 0, pendingJobsCount: 0 });

  useEffect(() => {
    const loadStats = () => {
      fetch('/api/cms/stats')
        .then(res => res.json())
        .then(data => {
          setStatsData({
            totalDocs: data.totalDocs || 0,
            processedDocs: data.processedDocs || 0,
            pendingJobsCount: data.pendingJobsCount || 0
          });
        })
        .catch(() => {});
    };
    loadStats();
    const interval = setInterval(loadStats, 4000);
    return () => clearInterval(interval);
  }, []);

  const percent = statsData.totalDocs > 0 
    ? Math.round((statsData.processedDocs / statsData.totalDocs) * 100) 
    : 0;

  // Active Phase text mapping
  let activePhaseText = 'Phase 1 — Connect & Collect';
  if (statsData.pendingJobsCount > 0) {
    activePhaseText = 'Phase 2 — Extract & Normalize';
  } else if (statsData.totalDocs > 0 && percent === 100) {
    activePhaseText = 'Phase 4 — Case Attribution';
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        userSelect: 'none',
        boxShadow: '2px 0 8px rgba(15, 23, 42, 0.01)',
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-mid) 100%)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            Cluco
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', lineHeight: 1.1, marginTop: 2 }}>
            Pre-Litigation
          </div>
        </div>
      </div>

      {/* ── Nav Label ── */}
      <div style={{ padding: '24px 24px 8px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Main Menu
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '4px 12px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 4,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                background: isActive ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-mid) 100%)' : 'transparent',
                textDecoration: 'none',
                transition: 'all var(--transition-base)',
                boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-hover)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, opacity: isActive ? 1 : 0.8 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Pipeline Progress ── */}
      <div style={{ padding: '16px 16px 12px', borderTop: '1px solid var(--border-light)' }}>
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-base)',
            borderRadius: 10,
            border: '1px solid var(--border-default)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.01)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Pipeline Progress</span>
            <span style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700 }}>{percent}%</span>
          </div>
          <div style={{ height: 4, backgroundColor: 'var(--border-medium)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-mid) 100%)',
              borderRadius: 10,
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{activePhaseText}</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
          Cluco v0.1.0 · Prototype
        </div>
      </div>
    </aside>
  );
}
