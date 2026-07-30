'use client';

import { useState } from 'react';
import { useUser, SignOutButton } from '@clerk/nextjs';

export default function IntegrationsPage() {
  const { user, isLoaded } = useUser();
  const [connecting, setConnecting] = useState<string | null>(null);

  const integrations = [
    {
      id: 'google_drive',
      name: 'Google Drive',
      description: 'Sync your client folders and deposition videos directly from Drive.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0F9D58' }}>
          <path d="M12 2L2 22h20L12 2z"/>
        </svg>
      ),
      connected: false
    },
    {
      id: 'clio',
      name: 'Clio Manage',
      description: 'Import case matters, client communications, and billing records.',
      icon: (
        <div style={{ width: 24, height: 24, backgroundColor: '#0070D2', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>C</span>
        </div>
      ),
      connected: true // Mocked connection for demonstration
    },
    {
      id: 'filevine',
      name: 'Filevine',
      description: 'Sync case medical chronologies and settlement documents.',
      icon: (
        <div style={{ width: 24, height: 24, backgroundColor: '#FF6200', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>F</span>
        </div>
      ),
      connected: false
    }
  ];

  const handleConnect = (id: string) => {
    setConnecting(id);
    // Simulate OAuth redirect
    setTimeout(() => {
      setConnecting(null);
      alert(`OAuth flow initiated for ${id}. In production, this redirects to the provider.`);
    }, 1500);
  };

  if (!isLoaded) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
      
      {/* Header Profile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--bg-base)', overflow: 'hidden' }}>
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0', color: '#475569', fontWeight: 600 }}>
                {user?.firstName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {user?.fullName || 'Attorney Workspace'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
        
        <SignOutButton>
          <button style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Sign Out
          </button>
        </SignOutButton>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Data Integrations</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Connect your firm's case management tools to seamlessly ingest documents into the Deep Forensics engine. These integrations are secured with OAuth 2.0 and bound strictly to your account.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {integrations.map((integration) => (
          <div key={integration.id} style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: 24, borderRadius: 12, backgroundColor: 'white', 
            border: integration.connected ? '1px solid var(--border-medium)' : '1px solid var(--border-light)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {integration.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {integration.name}
                  {integration.connected && (
                    <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Connected
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {integration.description}
                </p>
              </div>
            </div>
            
            <div>
              {integration.connected ? (
                <button style={{ 
                  padding: '10px 20px', borderRadius: 8, backgroundColor: 'transparent', 
                  border: '1px solid var(--border-medium)', color: 'var(--danger)', 
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' 
                }}>
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={() => handleConnect(integration.id)}
                  disabled={connecting === integration.id}
                  style={{ 
                    padding: '10px 20px', borderRadius: 8, backgroundColor: '#0F172A', 
                    border: 'none', color: 'white', fontSize: 14, fontWeight: 600, 
                    cursor: connecting === integration.id ? 'not-allowed' : 'pointer', 
                    transition: 'all 0.2s', opacity: connecting === integration.id ? 0.7 : 1
                  }}>
                  {connecting === integration.id ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
