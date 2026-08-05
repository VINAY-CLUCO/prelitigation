import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncFilevineData } from '../filevineSync';
import { prismaMock } from '../../../../vitest.setup';
import fetch from 'node-fetch';
import { isJobPaused } from '../queueStore';

vi.mock('node-fetch');
vi.mock('../queueStore', () => ({
  isJobPaused: vi.fn().mockResolvedValue(false)
}));

describe('filevineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isJobPaused as any).mockResolvedValue(false);
  });

  it('should throw an error if filevine is not connected', async () => {
    prismaMock.integration.findFirst.mockResolvedValue(null as any);
    await expect(syncFilevineData('user123', vi.fn())).rejects.toThrow('Filevine is not connected or token is missing.');
  });

  it('should sync projects and documents successfully', async () => {
    // Mock integration
    prismaMock.integration.findFirst.mockResolvedValue({
      id: 'int1', userId: 'user123', platform: 'filevine', accessToken: 'mock-token'
    } as any);

    // Mock fetch responses
    const mockProjectsResponse = {
      items: [
        { projectId: 3001, projectName: 'Project 1' }
      ]
    };
    const mockDocsResponse = {
      items: [
        { documentId: 4001, filename: 'file1.pdf', size: 1024 },
        { documentId: 4002, filename: 'ignored.zip', size: 500 } // Should be ignored based on isTargetDoc
      ]
    };

    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/core/projects') && !url.includes('/documents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjectsResponse)
        });
      }
      if (url.includes('/documents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDocsResponse)
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Mock Prisma behavior
    prismaMock.matter.findFirst.mockResolvedValue(null as any); // Matter doesn't exist
    prismaMock.matter.create.mockResolvedValue({ id: 'matter_db_1', sourceId: '3001' } as any);
    prismaMock.document.findFirst.mockResolvedValue(null as any); // Doc doesn't exist
    prismaMock.document.create.mockResolvedValue({ id: 'doc_db_1' } as any);

    const onProgress = vi.fn();
    await syncFilevineData('user123', onProgress, 'job1');

    // Expectations
    expect(prismaMock.matter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Project 1',
        sourceId: '3001'
      })
    });

    expect(prismaMock.document.create).toHaveBeenCalledTimes(1); // Only file1.pdf should be created
    expect(prismaMock.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'file1.pdf',
        sourceId: '4001'
      })
    });

    expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Sync complete!'), 100);
  });
});
