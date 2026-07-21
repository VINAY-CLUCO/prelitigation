// src/lib/__tests__/queueStore.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { 
  addJob, 
  getNextJob, 
  updateJobProgress, 
  completeJob, 
  failJob, 
  pruneQueue,
  readQueue,
  QUEUE_FILE 
} from '../queueStore';

describe('queueStore.ts (Queue Database)', () => {
  // Clear test queue file before and after test runs
  beforeEach(() => {
    if (fs.existsSync(QUEUE_FILE)) {
      fs.unlinkSync(QUEUE_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(QUEUE_FILE)) {
      fs.unlinkSync(QUEUE_FILE);
    }
  });

  it('should add a job to the queue successfully', async () => {
    const job = await addJob('test-sync', { foo: 'bar' });
    expect(job).toBeDefined();
    expect(job.id).toMatch(/^job_/);
    expect(job.status).toBe('pending');
    expect(job.data).toEqual({ foo: 'bar' });

    const queue = await readQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(job.id);
  });

  it('should pick up the next pending job and mark it as processing', async () => {
    await addJob('test-sync', { job: 1 });
    const nextJob = await getNextJob();
    expect(nextJob).toBeDefined();
    expect(nextJob?.status).toBe('processing');

    const emptyJob = await getNextJob();
    expect(emptyJob).toBeNull();
  });

  it('should update progress on an active job', async () => {
    const job = await addJob('test-sync', {});
    await updateJobProgress(job.id, { percent: 50, completed: 5, total: 10, msg: 'Halfway' });

    const queue = await readQueue();
    expect(queue[0].progress).toEqual({ percent: 50, completed: 5, total: 10, msg: 'Halfway' });
  });

  it('should complete a job and mark progress as 100%', async () => {
    const job = await addJob('test-sync', {});
    await completeJob(job.id);

    const queue = await readQueue();
    expect(queue[0].status).toBe('completed');
    expect(queue[0].progress?.percent).toBe(100);
  });

  it('should retry a failed job with exponential backoff if below maxRetries', async () => {
    const job = await addJob('test-sync', {}, { maxRetries: 3 });
    expect(job.retryCount).toBe(0);

    // Fail once
    await failJob(job.id, 'Connection timeout');
    let queue = await readQueue();
    expect(queue[0].status).toBe('pending'); // Puts back to pending
    expect(queue[0].retryCount).toBe(1);
    expect(queue[0].error).toBe('Connection timeout');
    expect(queue[0].runAfter).toBeGreaterThan(Date.now());

    // Fail twice
    await failJob(job.id, 'Auth failure');
    queue = await readQueue();
    expect(queue[0].status).toBe('pending');
    expect(queue[0].retryCount).toBe(2);

    // Fail third time -> should permanently fail
    await failJob(job.id, 'Permanent fail');
    queue = await readQueue();
    expect(queue[0].status).toBe('failed');
    expect(queue[0].retryCount).toBe(3);
    expect(queue[0].progress?.msg).toBe('Failed: Permanent fail');
  });

  it('should prune old completed or failed jobs', async () => {
    const job1 = await addJob('test-sync', {});
    const job2 = await addJob('test-sync', {});

    await completeJob(job1.id);
    await failJob(job2.id, 'Fatal error');
    await failJob(job2.id, 'Fatal error');
    await failJob(job2.id, 'Fatal error'); // permanently failed

    // Manually backdate the updatedAt timestamp for job1 to mock 25 hours ago
    const queue = await readQueue();
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    queue[0].updatedAt = yesterday;
    
    // Save mock modified queue
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');

    // Prune queue for jobs older than 24 hours
    await pruneQueue(24);

    const prunedQueue = await readQueue();
    // job1 (completed 25h ago) should be deleted, job2 (failed recently) should remain
    expect(prunedQueue.length).toBe(1);
    expect(prunedQueue[0].id).toBe(job2.id);
  });
});
