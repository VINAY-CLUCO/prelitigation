import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFile, downloadFile, getPublicUrl, deleteFile, BUCKET_NAME } from '../storage';
import { createClient } from '@supabase/supabase-js';

// Unmock the globally mocked storage so we can actually test it
vi.unmock('@/lib/storage');
vi.unmock('../storage');

// Mock supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockStorage = {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn(),
    download: vi.fn(),
    getPublicUrl: vi.fn(),
    remove: vi.fn()
  };

  return {
    createClient: vi.fn(() => ({
      storage: mockStorage
    }))
  };
});

describe('Supabase Storage Logic', () => {
  const supabase = createClient('', '');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploadFile should upload to the correct bucket with correct parameters', async () => {
    const mockPath = 'user_123/doc.pdf';
    const mockBuffer = Buffer.from('test');
    
    (supabase.storage.upload as any).mockResolvedValue({
      data: { path: mockPath },
      error: null
    });

    const result = await uploadFile(mockPath, mockBuffer, 'application/pdf');
    
    expect(supabase.storage.from).toHaveBeenCalledWith(BUCKET_NAME);
    expect(supabase.storage.upload).toHaveBeenCalledWith(mockPath, mockBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    expect(result).toBe(mockPath);
  });

  it('uploadFile should throw an error if upload fails', async () => {
    (supabase.storage.upload as any).mockResolvedValue({
      data: null,
      error: new Error('Upload failed')
    });

    await expect(uploadFile('path', Buffer.from('test'))).rejects.toThrow('Upload failed');
  });

  it('downloadFile should download and return a Buffer', async () => {
    const mockArrayBuffer = new ArrayBuffer(4);
    (supabase.storage.download as any).mockResolvedValue({
      data: {
        arrayBuffer: () => Promise.resolve(mockArrayBuffer)
      },
      error: null
    });

    const result = await downloadFile('path');
    
    expect(supabase.storage.from).toHaveBeenCalledWith(BUCKET_NAME);
    expect(supabase.storage.download).toHaveBeenCalledWith('path');
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('getPublicUrl should return the public URL', () => {
    (supabase.storage.getPublicUrl as any).mockReturnValue({
      data: { publicUrl: 'https://supabase.com/file.pdf' }
    });

    const url = getPublicUrl('path');
    expect(url).toBe('https://supabase.com/file.pdf');
    expect(supabase.storage.getPublicUrl).toHaveBeenCalledWith('path');
  });

  it('deleteFile should remove the file', async () => {
    (supabase.storage.remove as any).mockResolvedValue({ error: null });

    await deleteFile('path/to/remove');
    expect(supabase.storage.remove).toHaveBeenCalledWith(['path/to/remove']);
  });
});
