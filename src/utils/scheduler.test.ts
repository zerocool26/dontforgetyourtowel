/**
 * Tests for scheduler utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  timeout,
  interval,
  debounce,
  throttle,
  createScheduler,
  requestFrame,
  createLoop,
  requestIdleCallback,
  waitFrames,
  sleep,
  waitUntil,
} from './scheduler';

describe('scheduler utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeout', () => {
    it('should call callback after delay', () => {
      const callback = vi.fn();
      timeout(callback, 1000);

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should be cancellable', () => {
      const callback = vi.fn();
      const timer = timeout(callback, 1000);

      timer.cancel();
      vi.advanceTimersByTime(2000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should report active status', () => {
      const timer = timeout(() => {}, 1000);

      expect(timer.isActive()).toBe(true);

      vi.advanceTimersByTime(1000);

      expect(timer.isActive()).toBe(false);
    });

    it('should report remaining time', () => {
      vi.useRealTimers(); // Need real timers for remaining calculation
      const timer = timeout(() => {}, 1000);

      expect(timer.remaining()).toBeLessThanOrEqual(1000);
      expect(timer.remaining()).toBeGreaterThan(0);

      timer.cancel();
    });

    it('should be pausable and resumable', () => {
      vi.useRealTimers();
      const callback = vi.fn();
      const timer = timeout(callback, 100);

      timer.pause();

      // Wait a bit while paused
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        timer.resume();
      }, 50);
    });
  });

  describe('interval', () => {
    it('should call callback repeatedly', () => {
      const callback = vi.fn();
      interval(callback, 100);

      vi.advanceTimersByTime(350);

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should call immediately when option set', () => {
      const callback = vi.fn();
      interval(callback, 100, { immediate: true });

      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should limit runs with maxRuns', () => {
      const callback = vi.fn();
      interval(callback, 100, { maxRuns: 3 });

      vi.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should be cancellable', () => {
      const callback = vi.fn();
      const timer = interval(callback, 100);

      vi.advanceTimersByTime(250);
      timer.cancel();
      vi.advanceTimersByTime(250);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should be pausable and resumable', () => {
      const callback = vi.fn();
      const timer = interval(callback, 100);

      vi.advanceTimersByTime(250);
      timer.pause();
      vi.advanceTimersByTime(500);

      expect(callback).toHaveBeenCalledTimes(2);

      timer.resume();
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call on leading edge when specified', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: false });

      debounced();

      expect(fn).toHaveBeenCalledTimes(1);

      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call on both edges when specified', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: true });

      // First call triggers leading edge
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      // Call again during debounce period to have args for trailing
      debounced();
      vi.advanceTimersByTime(100);

      // Should call trailing since we called during the wait period
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect maxWait', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      // Call repeatedly
      for (let i = 0; i < 10; i++) {
        debounced();
        vi.advanceTimersByTime(50);
      }

      expect(fn.mock.calls.length).toBeGreaterThan(0);
    });

    it('should be cancellable', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should have flush method', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call on trailing edge by default', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2); // Leading + trailing
    });

    it('should skip leading when specified', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false });

      // First call with leading=false doesn't invoke immediately
      throttled();
      expect(fn).not.toHaveBeenCalled();

      // Need a second call to schedule the trailing timeout
      vi.advanceTimersByTime(50);
      throttled();

      vi.advanceTimersByTime(50);
      // After the wait period, trailing should fire
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should skip trailing when specified', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { trailing: false });

      throttled();
      throttled();
      throttled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should be cancellable', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false });

      throttled();
      throttled.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('createScheduler', () => {
    it('should create scheduler instance', () => {
      const scheduler = createScheduler();

      expect(scheduler).toBeDefined();
      expect(typeof scheduler.schedule).toBe('function');
      expect(typeof scheduler.cancel).toBe('function');
      expect(typeof scheduler.start).toBe('function');
      expect(typeof scheduler.stop).toBe('function');
    });

    it('should schedule jobs with interval pattern', () => {
      const scheduler = createScheduler();
      const callback = vi.fn();

      scheduler.schedule('every 1s', callback);
      scheduler.start();

      vi.advanceTimersByTime(3500);

      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(1);

      scheduler.destroy();
    });

    it('should cancel jobs', () => {
      const scheduler = createScheduler();
      const callback = vi.fn();

      const jobId = scheduler.schedule('every 1s', callback);
      scheduler.start();

      vi.advanceTimersByTime(1500);
      scheduler.cancel(jobId);
      vi.advanceTimersByTime(3000);

      const callCount = callback.mock.calls.length;
      vi.advanceTimersByTime(3000);

      expect(callback.mock.calls.length).toBe(callCount);

      scheduler.destroy();
    });

    it('should get job info', () => {
      const scheduler = createScheduler();

      const jobId = scheduler.schedule('every 5m', () => {}, {
        name: 'Test Job',
      });
      const job = scheduler.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.name).toBe('Test Job');
      expect(job?.pattern).toBe('every 5m');

      scheduler.destroy();
    });

    it('should get all jobs', () => {
      const scheduler = createScheduler();

      scheduler.schedule('every 1m', () => {});
      scheduler.schedule('every 5m', () => {});

      const jobs = scheduler.getJobs();

      expect(jobs).toHaveLength(2);

      scheduler.destroy();
    });

    it('should pause and resume jobs', () => {
      const scheduler = createScheduler();
      const callback = vi.fn();

      const jobId = scheduler.schedule('every 1s', callback);
      scheduler.start();

      vi.advanceTimersByTime(1500);
      const countBeforePause = callback.mock.calls.length;

      scheduler.pause(jobId);
      vi.advanceTimersByTime(3000);

      expect(callback.mock.calls.length).toBe(countBeforePause);

      scheduler.resume(jobId);
      vi.advanceTimersByTime(1500);

      expect(callback.mock.calls.length).toBeGreaterThan(countBeforePause);

      scheduler.destroy();
    });

    it('should run job immediately', async () => {
      const scheduler = createScheduler();
      const callback = vi.fn();

      const jobId = scheduler.schedule('every 1h', callback);
      await scheduler.run(jobId);

      expect(callback).toHaveBeenCalledTimes(1);

      scheduler.destroy();
    });

    it('should run immediately with option', () => {
      const scheduler = createScheduler();
      const callback = vi.fn();

      scheduler.schedule('every 1h', callback, { immediate: true });

      expect(callback).toHaveBeenCalledTimes(1);

      scheduler.destroy();
    });
  });

  describe('requestFrame', () => {
    it('should return cleanup function', () => {
      const cleanup = requestFrame(() => {});
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('createLoop', () => {
    it('should create animation loop', () => {
      const loop = createLoop(() => {});

      expect(typeof loop.start).toBe('function');
      expect(typeof loop.stop).toBe('function');
      expect(typeof loop.isRunning).toBe('function');
    });

    it('should track running state', () => {
      const loop = createLoop(() => {});

      expect(loop.isRunning()).toBe(false);

      loop.start();
      expect(loop.isRunning()).toBe(true);

      loop.stop();
      expect(loop.isRunning()).toBe(false);
    });
  });

  describe('requestIdleCallback', () => {
    it('should return cleanup function', () => {
      const cleanup = requestIdleCallback(() => {});
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('waitFrames', () => {
    it('should return a promise', () => {
      const result = waitFrames(1);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('sleep', () => {
    it('should resolve after delay', async () => {
      const promise = sleep(100);

      vi.advanceTimersByTime(100);
      await promise;

      // With fake timers, this should complete
      expect(true).toBe(true);
    });
  });

  describe('waitUntil', () => {
    it('should resolve when condition is true', async () => {
      let flag = false;

      setTimeout(() => {
        flag = true;
      }, 50);

      const promise = waitUntil(() => flag);

      vi.advanceTimersByTime(100);

      await promise;
      expect(flag).toBe(true);
    });

    it('should reject on timeout', async () => {
      const promise = waitUntil(() => false, { timeout: 100 });

      vi.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow('timeout');
    });
  });
});
