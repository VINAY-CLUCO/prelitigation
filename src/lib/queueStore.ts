// src/lib/queueStore.ts
// Local file-backed transaction-safe queue store for background task execution

import fs from 'fs';
import path from 'path';
import { VAULT_DIR } from './tokenStore';

export const QUEUE_FILE = process.env.NODE_ENV === 'test'
  ? path.join(VAULT_DIR, 'queue_test.json')
  : path.join(VAULT_DIR, 'queue.json');

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobProgress {
  percent: number;
  completed: number;
  total: number;
  msg?: string;
}

export interface QueueJob<T = any> {
  id: string;
  type: string;
  status: JobStatus;
  data: T;
  retryCount: number;
  maxRetries: number;
  error: string | null;
  progress: JobProgress | null;
  isPaused?: boolean;
  runAfter: number; // Timestamp after which the job can run
  createdAt: string;
  updatedAt: string;
}

function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
}

// Atomic file locker helper to prevent race conditions during write/read
let fileLock = false;
async function acquireLock(retries = 20, delayMs = 15): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    if (!fileLock) {
      fileLock = true;
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function releaseLock() {
  fileLock = false;
}

export async function readQueue(): Promise<QueueJob[]> {
  try {
    ensureVaultDir();
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
    return JSON.parse(raw) as QueueJob[];
  } catch {
    return [];
  }
}

export async function writeQueue(jobs: QueueJob[]): Promise<void> {
  const hasLock = await acquireLock();
  try {
    ensureVaultDir();
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  } finally {
    if (hasLock) releaseLock();
  }
}

export async function addJob<T = any>(
  type: string,
  data: T,
  options?: { maxRetries?: number }
): Promise<QueueJob<T>> {
  const jobs = await readQueue();
  
  const newJob: QueueJob<T> = {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    status: 'pending',
    data,
    retryCount: 0,
    maxRetries: options?.maxRetries ?? 3,
    error: null,
    progress: null,
    isPaused: false,
    runAfter: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  jobs.push(newJob);
  await writeQueue(jobs);
  return newJob;
}

export async function getNextJob(): Promise<QueueJob | null> {
  const jobs = await readQueue();
  const now = Date.now();
  
  // Find the first job that is pending and ready to run
  const jobIndex = jobs.findIndex(
    (j) => j.status === 'pending' && now >= j.runAfter
  );

  if (jobIndex === -1) return null;

  // Lock and mark the job as processing
  const job = jobs[jobIndex];
  job.status = 'processing';
  job.updatedAt = new Date().toISOString();
  
  await writeQueue(jobs);
  return job;
}

export async function updateJobProgress(
  id: string,
  progress: JobProgress
): Promise<void> {
  const jobs = await readQueue();
  const jobIndex = jobs.findIndex((j) => j.id === id);
  if (jobIndex === -1) return;

  jobs[jobIndex].progress = progress;
  jobs[jobIndex].updatedAt = new Date().toISOString();
  await writeQueue(jobs);
}

export async function completeJob(id: string): Promise<void> {
  const jobs = await readQueue();
  const jobIndex = jobs.findIndex((j) => j.id === id);
  if (jobIndex === -1) return;

  jobs[jobIndex].status = 'completed';
  jobs[jobIndex].progress = { percent: 100, completed: 1, total: 1, msg: 'Completed successfully.' };
  jobs[jobIndex].updatedAt = new Date().toISOString();
  await writeQueue(jobs);
}

export async function failJob(id: string, error: string): Promise<void> {
  const jobs = await readQueue();
  const jobIndex = jobs.findIndex((j) => j.id === id);
  if (jobIndex === -1) return;

  const job = jobs[jobIndex];
  job.retryCount += 1;
  job.error = error;

  if (job.retryCount >= job.maxRetries) {
    job.status = 'failed';
    job.progress = { percent: 0, completed: 0, total: 1, msg: `Failed: ${error}` };
  } else {
    job.status = 'pending'; // Put back to pending
    // Exponential backoff: retry after 5s, 30s, 2m, etc.
    const waitTime = Math.pow(6, job.retryCount) * 1000; 
    job.runAfter = Date.now() + waitTime;
    job.progress = { 
      percent: 0, 
      completed: 0, 
      total: 1, 
      msg: `Retrying in ${waitTime / 1000}s due to error: ${error}` 
    };
  }

  job.updatedAt = new Date().toISOString();
  await writeQueue(jobs);
}

// Clean up old completed/failed jobs from queue to keep the file small
export async function pruneQueue(maxAgeHours = 24): Promise<void> {
  const jobs = await readQueue();
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  
  const filtered = jobs.filter((j) => {
    if (j.status !== 'completed' && j.status !== 'failed') return true;
    return new Date(j.updatedAt).getTime() > cutoff;
  });

  await writeQueue(filtered);
}

export async function pauseJob(id: string): Promise<void> {
  const jobs = await readQueue();
  const job = jobs.find((j) => j.id === id);
  if (job) {
    job.isPaused = true;
    job.updatedAt = new Date().toISOString();
    await writeQueue(jobs);
  }
}

export async function resumeJob(id: string): Promise<void> {
  const jobs = await readQueue();
  const job = jobs.find((j) => j.id === id);
  if (job) {
    job.isPaused = false;
    job.updatedAt = new Date().toISOString();
    await writeQueue(jobs);
  }
}

export async function isJobPaused(id: string): Promise<boolean> {
  const jobs = await readQueue();
  const job = jobs.find((j) => j.id === id);
  return job ? !!job.isPaused : false;
}

/**
 * Cancel all pending/processing jobs whose `type` starts with the given provider prefix.
 * Called on disconnect so the sidebar immediately stops showing "Syncing".
 */
export async function cancelJobsByProvider(provider: string): Promise<number> {
  const jobs = await readQueue();
  let cancelled = 0;
  const prefix = provider.toLowerCase();
  for (const job of jobs) {
    if (
      (job.status === 'pending' || job.status === 'processing') &&
      job.type.toLowerCase().startsWith(prefix)
    ) {
      job.status = 'failed';
      job.error = `Cancelled: provider ${provider} was disconnected.`;
      job.progress = { percent: 0, completed: 0, total: 1, msg: 'Cancelled by disconnect.' };
      job.updatedAt = new Date().toISOString();
      cancelled++;
    }
  }
  if (cancelled > 0) await writeQueue(jobs);
  return cancelled;
}

