import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { prismaMock } from '../../../../../vitest.setup';
import { NextRequest } from 'next/server';

describe('Calendar API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/cms/calendar should create an event', async () => {
    const newEvent = { matterId: '1', summary: 'New Event', startAt: new Date().toISOString() };
    const mockCreatedEvent = { id: '2', summary: newEvent.summary, startAt: new Date(newEvent.startAt), matterId: '1', userId: 'test_user_id' };
    
    prismaMock.matter.findUnique.mockResolvedValue({ id: '1', userId: 'test_user_id' } as any);
    prismaMock.event.create.mockResolvedValue(mockCreatedEvent as any);

    const req = new NextRequest('http://localhost/api/cms/calendar', {
      method: 'POST',
      body: JSON.stringify(newEvent)
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
