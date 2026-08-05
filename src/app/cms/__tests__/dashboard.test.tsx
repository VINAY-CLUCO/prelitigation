/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MatterCMSDashboard from '../page';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

global.fetch = vi.fn();

describe('MatterCMSDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<MatterCMSDashboard />);
    expect(container.querySelector('.spinner')).not.toBeNull();
  });

  it('renders matters and connects correctly after fetch', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/cms/matters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            matters: [
              { id: '1', display_number: 'CLO-123', description: 'Test Matter', status: 'Open', provider: 'clio', documents: [], tasks: [], calendar: [] }
            ]
          })
        });
      }
      if (url.includes('/api/connections/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ clio: true })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<MatterCMSDashboard />);

    // Wait for the matter to be displayed
    await waitFor(() => {
      expect(screen.getByText('CLO-123')).toBeDefined();
    });
  });
});
