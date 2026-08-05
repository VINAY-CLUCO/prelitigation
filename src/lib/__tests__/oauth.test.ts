import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClioConfig, buildClioAuthUrl, exchangeClioCode, refreshClioToken, revokeClioToken, getClioUserEmail } from '../clioOAuth';

describe('OAuth Logic - Clio', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CLIO_CLIENT_ID: 'test_client', CLIO_CLIENT_SECRET: 'test_secret', CLIO_REDIRECT_URI: 'http://test/redirect' };
    
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('getClioConfig should return configuration', () => {
    const config = getClioConfig();
    expect(config.clientId).toBe('test_client');
    expect(config.clientSecret).toBe('test_secret');
  });

  it('getClioConfig should throw if missing credentials', () => {
    delete process.env.CLIO_CLIENT_ID;
    expect(() => getClioConfig()).toThrow('Missing CLIO_CLIENT_ID');
  });

  it('buildClioAuthUrl should build a correct url', () => {
    const url = buildClioAuthUrl();
    expect(url).toContain('https://app.clio.com/oauth/authorize?response_type=code');
    expect(url).toContain('client_id=test_client');
  });

  it('exchangeClioCode should call fetch with correct parameters', async () => {
    const mockResponse = { access_token: 'access123', refresh_token: 'refresh123' };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const res = await exchangeClioCode('mock_code');
    
    expect(global.fetch).toHaveBeenCalledWith('https://app.clio.com/oauth/token', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('grant_type=authorization_code')
    }));
    expect(res.access_token).toBe('access123');
  });

  it('refreshClioToken should call fetch with refresh_token grant', async () => {
    const mockResponse = { access_token: 'new_access' };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const res = await refreshClioToken('mock_refresh');
    
    expect(global.fetch).toHaveBeenCalledWith('https://app.clio.com/oauth/token', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('grant_type=refresh_token')
    }));
    expect(res.access_token).toBe('new_access');
  });
  
  it('revokeClioToken should call deauthorize endpoint', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('')
    });

    await revokeClioToken('token123');
    
    expect(global.fetch).toHaveBeenCalledWith('https://app.clio.com/oauth/deauthorize', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('token=token123')
    }));
  });
});
