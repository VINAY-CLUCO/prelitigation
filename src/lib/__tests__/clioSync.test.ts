import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncClioData } from '../clioSync';
import { prismaMock } from '../../../../vitest.setup';
import fetch from 'node-fetch';

vi.mock('node-fetch', () => {
  return {
    default: vi.fn()
  };
});

describe('Clio Sync Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw an error if no access token is provided', async () => {
    await expect(syncClioData('user_id', '')).rejects.toThrow('Clio is not connected.');
  });

  it('should fetch matters and save them to prisma', async () => {
    // Mock the fetch responses for matters
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 123, display_number: '001', description: 'Test Matter', status: 'open' }],
        meta: { paging: {} }
      })
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], meta: { paging: {} } }) // closed
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], meta: { paging: {} } }) // pending
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], meta: { paging: {} } }) // documents
    });

    prismaMock.matter.findFirst.mockResolvedValue(null);
    prismaMock.matter.create.mockResolvedValue({ id: 'uuid', userId: 'user_id', name: '001', description: '', status: '', source: '', sourceId: '123' });

    await syncClioData('user_id', 'valid_token');

    expect(prismaMock.matter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_id',
        sourceId: '123',
        source: 'clio'
      })
    });
  });
});
