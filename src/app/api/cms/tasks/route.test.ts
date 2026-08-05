import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, PATCH } from './route';
import { prismaMock } from '../../../../../vitest.setup';
import { NextRequest } from 'next/server';

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/cms/tasks should create a task', async () => {
    const newTask = { matterId: '1', name: 'New Task', dueAt: new Date().toISOString() };
    const mockCreatedTask = { id: '2', name: newTask.name, dueAt: new Date(newTask.dueAt), matterId: '1', userId: 'test_user_id' };
    
    prismaMock.matter.findUnique.mockResolvedValue({ id: '1', userId: 'test_user_id' } as any);
    prismaMock.task.create.mockResolvedValue(mockCreatedTask as any);

    const req = new NextRequest('http://localhost/api/cms/tasks', {
      method: 'POST',
      body: JSON.stringify(newTask)
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
