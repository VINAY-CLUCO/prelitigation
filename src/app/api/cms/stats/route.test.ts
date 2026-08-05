import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prismaMock } from '../../../../../vitest.setup';
import { NextRequest } from 'next/server';

describe('Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/cms/stats should return aggregated statistics', async () => {
    const mockDocs = [
      { id: '1', name: 'Doc 1', aiTag: 'Medical Record 🏥', size: 1024, source: 'clio', downloadedAt: new Date() },
      { id: '2', name: 'Doc 2', aiTag: 'Uncategorized', size: 2048, source: 'gdrive', downloadedAt: new Date() }
    ];
    prismaMock.document.findMany.mockResolvedValue(mockDocs as any);

    const req = new NextRequest('http://localhost/api/cms/stats');
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalDocs).toBe(2);
    expect(json.processedDocs).toBe(1);
    expect(json.flaggedDocs).toBe(1);
    expect(json.recentDocs.length).toBe(2);
  });
});
