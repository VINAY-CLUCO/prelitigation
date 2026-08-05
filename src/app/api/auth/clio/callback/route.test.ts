import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'test_user_id' }))
}));

vi.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    integration: {
      upsert: vi.fn()
    }
  };
  return {
    PrismaClient: class {
      constructor() {
        return mockPrisma;
      }
    }
  };
});

// Mock clioOAuth
vi.mock('@/lib/clioOAuth', () => ({
  exchangeClioCode: vi.fn(),
  getClioUserEmail: vi.fn()
}));

// Mock next/server response
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    NextResponse: {
      redirect: vi.fn((url) => ({ status: 307, headers: { Location: url } }))
    }
  };
});

describe('Clio OAuth Callback Redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect back to the origin that initiated the request when an error occurs', async () => {
    // Simulate a request from localhost:3000
    const req = new NextRequest('http://localhost:3000/api/auth/clio/callback?error=access_denied');
    
    await GET(req);
    
    // Verify it didn't use the hardcoded production URL
    const { NextResponse } = await import('next/server');
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3000/settings?error=access_denied')
    );
    expect(NextResponse.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining('https://cluco.vinayk.in')
    );
  });

  it('should redirect back to the production origin if requested from production', async () => {
    // Simulate a request from production
    const req = new NextRequest('https://cluco.vinayk.in/api/auth/clio/callback?error=access_denied');
    
    await GET(req);
    
    const { NextResponse } = await import('next/server');
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('https://cluco.vinayk.in/settings?error=access_denied')
    );
  });
});
