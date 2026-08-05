import { vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient globally
const prismaMock = mockDeep<PrismaClient>();

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      constructor() {
        return prismaMock;
      }
    }
  };
});

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock Supabase storage
vi.mock('@/lib/storage', () => ({
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
  getPublicUrl: vi.fn(),
  deleteFile: vi.fn(),
  supabase: {}
}));

// Mock Clerk auth to avoid server-only error
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'test_user_id', getToken: vi.fn() }))
}));

// Mock queueStore
vi.mock('@/lib/queueStore', () => ({
  addJob: vi.fn(),
  readQueue: vi.fn(() => []),
  updateJobProgress: vi.fn(),
  completeJob: vi.fn(),
  failJob: vi.fn(),
  isJobPaused: vi.fn()
}));

// Mock tokenStore
vi.mock('@/lib/tokenStore', () => ({
  getToken: vi.fn(),
  setToken: vi.fn()
}));

// Mock clioPush
vi.mock('@/lib/clioPush', () => ({
  createClioContact: vi.fn(),
  createClioMatter: vi.fn(),
  updateClioMatterStatus: vi.fn(),
  createClioTask: vi.fn(),
  completeClioTask: vi.fn(),
  createClioCalendarEvent: vi.fn()
}));

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy';

beforeEach(() => {
  mockReset(prismaMock);
});

export { prismaMock };
