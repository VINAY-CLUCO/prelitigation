import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH } from './route';
import { prismaMock } from '../../../../../vitest.setup';
import { NextRequest } from 'next/server';

describe('Matters API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/cms/matters should return a list of matters', async () => {
    const mockMatters = [
      { id: '1', name: 'Matter 1', description: 'desc', status: 'Open', userId: 'test_user_id', source: 'clio', sourceId: '123', createdAt: new Date() }
    ];
    prismaMock.matter.findMany.mockResolvedValue(mockMatters as any);

    const req = new NextRequest('http://localhost/api/cms/matters');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('POST /api/cms/matters should create a new matter', async () => {
    const newMatter = { clientName: 'John Doe', clientEmail: 'john@example.com', matterDescription: 'Test Matter', status: 'Open' };
    const mockCreatedMatter = { id: '2', name: newMatter.clientName, description: newMatter.matterDescription, status: newMatter.status, userId: 'test_user_id', source: 'manual', sourceId: null, createdAt: new Date() };
    
    prismaMock.matter.create.mockResolvedValue(mockCreatedMatter as any);

    const req = new NextRequest('http://localhost/api/cms/matters', {
      method: 'POST',
      body: JSON.stringify(newMatter)
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
