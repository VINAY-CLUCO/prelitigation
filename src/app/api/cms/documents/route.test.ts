import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prismaMock } from '../../../../../vitest.setup';
import { NextRequest } from 'next/server';

describe('Documents API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/cms/documents should return a list of documents', async () => {
    const mockDocs = [
      { id: '1', name: 'Doc 1', type: 'PDF', size: 1024, matterId: '1', userId: 'test_user_id', source: 'clio', sourceId: '123', storagePath: 'test_user_id/clio/1_Doc 1.pdf', downloaded: true, downloadedAt: new Date(), createdAt: new Date() }
    ];
    prismaMock.document.findMany.mockResolvedValue(mockDocs as any);

    const req = new NextRequest('http://localhost/api/cms/documents');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
