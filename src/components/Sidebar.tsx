'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    description: 'Overview & activity',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1.5" />
        <rect width="7" height="5" x="3" y="15" rx="1.5" />
        <rect width="7" height="9" x="14" y="12" rx="1.5" />
        <rect width="7" height="5" x="14" y="3" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Connections',
    description: 'Integrations & sync',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    href: '/collection',
    label: 'Documents',
    description: 'All synced files',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/analysis',
    label: 'Analysis',
    description: 'Review & classify',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/research',
    label: 'Research',
    description: 'Case law & precedents',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    href: '/cms',
    label: 'Case Manager',
    description: 'Matters & clients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <path d="M13 8h4" /><path d="M13 12h4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [statsData, setStatsData] = useState({ totalDocs: 0, processedDocs: 0, pendingJobsCount: 0 });
  const [connectedCount, setConnectedCount] = useState(0);

  useEffect(() => {
    const loadStats = () => {
      fetch('/api/cms/stats')
        .then(res => res.json())
        .then(data => setStatsData({ totalDocs: data.totalDocs || 0, processedDocs: data.processedDocs || 0, pendingJobsCount: data.pendingJobsCount || 0 }))
        .catch(() => {});
      fetch('/api/connections/status')
        .then(res => res.json())
        .then(data => setConnectedCount(Object.values(data).filter((v: any) => v.connected).length))
        .catch(() => {});
    };
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const percent = statsData.totalDocs > 0
    ? Math.round((statsData.processedDocs / statsData.totalDocs) * 100)
    : 0;

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      left: 0, top: 0,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      userSelect: 'none',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--sidebar-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 34,
          height: 34,
          background: 'linear-gradient(135deg, #5B6CF8 0%, #7B87FA 100%)',
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(91, 108, 248, 0.35)',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
            Cluco
          </div>
          <div style={{ fontSize: 10, color: 'var(--sidebar-text)', fontWeight: 500, letterSpacing: '0.5px', marginTop: 1 }}>
            Pre-Litigation
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-section-label)', letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px 8px' }}>
          Workspace
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const isConnections = item.href === '/settings';
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--sidebar-active-border)' : 'transparent'}`,
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                }
              }}
            >
              <span style={{
                display: 'flex',
                flexShrink: 0,
                color: isActive ? '#7B87FA' : 'inherit',
              }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {isConnections && connectedCount > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 20,
                  background: 'rgba(91, 108, 248, 0.2)',
                  color: '#7B87FA',
                  border: '1px solid rgba(91, 108, 248, 0.3)',
                }}>
                  {connectedCount}
                </span>
              )}
              {statsData.pendingJobsCount > 0 && item.href === '/' && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#F59E0B',
                  boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)',
                  flexShrink: 0,
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Pipeline Progress ── */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--sidebar-border)' }}>
        <div style={{
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--sidebar-text)', fontWeight: 600 }}>Pipeline</span>
            <span style={{ fontSize: 12, color: '#7B87FA', fontWeight: 700 }}>{percent}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{
              width: `${percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #5B6CF8 0%, #7B87FA 100%)',
              borderRadius: 20,
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--sidebar-text)', fontWeight: 500 }}>
              {statsData.totalDocs} docs collected
            </span>
            {statsData.pendingJobsCount > 0 && (
              <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Syncing
              </span>
            )}
          </div>
        </div>

        {/* User footer */}
        <div style={{
          marginTop: 10,
          padding: '10px 12px',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          transition: 'background var(--transition-fast)',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #5B6CF8, #7B87FA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            C
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Cluco Workspace</div>
            <div style={{ fontSize: 10, color: 'var(--sidebar-text)', fontWeight: 500 }}>v0.2.0 · Pre-Litigation</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
