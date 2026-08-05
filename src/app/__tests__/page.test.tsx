/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../page';

// Mock fetch for the components
global.fetch = vi.fn();

describe('Landing DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the loading skeleton initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    const { container } = render(<DashboardPage />);
    
    // Based on the code, a loading skeleton is rendered when loading is true
    expect(container.querySelector('.skeleton')).not.toBeNull();
  });

  it('should render the dashboard when data is loaded', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/cms/stats')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            totalDocs: 100, processedDocs: 50, flaggedDocs: 5, pendingJobsCount: 2, recentDocs: []
          })
        });
      }
      if (url.includes('/api/connections/status')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            google: { connected: true }
          })
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    const { container } = render(<DashboardPage />);
    
    // Wait for the skeleton to disappear
    await waitFor(() => {
      expect(container.querySelector('.skeleton')).toBeNull();
    });

    // Check if total docs is rendered somewhere, or the 'Connect' text from the phases
    expect(screen.getAllByText(/Connect/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Collect/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Analyze/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Review/i)[0]).toBeDefined();
  });
});
