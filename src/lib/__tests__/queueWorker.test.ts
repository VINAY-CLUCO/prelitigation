import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startQueueWorker, stopQueueWorker } from '../queueWorker';

describe('queueWorker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopQueueWorker();
    vi.useRealTimers();
  });

  it('startQueueWorker should set up an interval', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    
    startQueueWorker();
    
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000); // Polling every 1s
  });

  it('stopQueueWorker should clear the interval', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    startQueueWorker();
    stopQueueWorker();
    
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});
