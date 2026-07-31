'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Connections',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    href: '/collection',
    label: 'Documents',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/research',
    label: 'Research',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    href: '/cms',
    label: 'Case Manager',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      userSelect: 'none',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '24px 24px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 32,
          height: 32,
          background: 'var(--accent)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            Cluco
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.2px', marginTop: 2, textTransform: 'uppercase' }}>
            Pre-Litigation
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sidebar-section-label)', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '8px 12px 8px' }}>
          Menu
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
                gap: 12,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
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
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-muted)',
              }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {isConnections && connectedCount > 0 && (
                <span className="badge badge-neutral">
                  {connectedCount}
                </span>
              )}
              {statsData.pendingJobsCount > 0 && item.href === '/' && (
                <span className="status-dot syncing" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Pipeline Progress ── */}
      <div style={{ padding: '24px 16px' }}>
        <div style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-default)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>Sync Pipeline</span>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{percent}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--border-medium)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${percent}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {statsData.totalDocs} items
            </span>
            {statsData.pendingJobsCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Syncing
              </span>
            )}
          </div>
        </div>

        {/* User footer */}
        <div style={{
          marginTop: 16,
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <UserButton showName={true} appearance={{
            elements: {
              userButtonBox: "flex flex-row-reverse w-full justify-between",
              userButtonOuterIdentifier: "text-[13px] font-medium text-[var(--text-primary)]"
            }
          }} />
        </div>
      </div>
    </aside>
  );
}
