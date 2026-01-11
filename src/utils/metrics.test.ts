/**
 * Metrics/Observability Utilities Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Counter
  Counter,
  createCounter,

  // Gauge
  Gauge,
  createGauge,

  // Histogram
  createHistogram,

  // Summary
  createSummary,

  // Registry
  MetricsRegistry,
  defaultRegistry,

  // Timing
  Stopwatch,
  time,
  timeAsync,

  // Labels
  labeledCounter,
  labeledGauge,
  labeledHistogram,

  // Utilities
  resetAllMetrics,
  getMetricsSnapshot,
  exportPrometheus,
} from './metrics';

describe('Metrics/Observability Utilities', () => {
  beforeEach(() => {
    resetAllMetrics();
  });

  describe('Counter', () => {
    it('should start at zero', () => {
      const counter = new Counter('test_counter', 'Test counter');
      expect(counter.value).toBe(0);
    });

    it('should increment by 1', () => {
      const counter = createCounter('test_counter', 'Test');
      counter.inc();
      expect(counter.value).toBe(1);
    });

    it('should increment by N', () => {
      const counter = createCounter('test_counter', 'Test');
      counter.inc(5);
      expect(counter.value).toBe(5);
    });

    it('should not allow negative increments', () => {
      const counter = createCounter('test_counter', 'Test');
      expect(() => counter.inc(-1)).toThrow();
    });

    it('should reset', () => {
      const counter = createCounter('test_counter', 'Test');
      counter.inc(10);
      counter.reset();
      expect(counter.value).toBe(0);
    });

    it('should have metadata', () => {
      const counter = createCounter('test_counter', 'Test description');
      expect(counter.name).toBe('test_counter');
      expect(counter.help).toBe('Test description');
    });
  });

  describe('Gauge', () => {
    it('should start at zero', () => {
      const gauge = new Gauge('test_gauge', 'Test gauge');
      expect(gauge.value).toBe(0);
    });

    it('should set value', () => {
      const gauge = createGauge('test_gauge', 'Test');
      gauge.set(42);
      expect(gauge.value).toBe(42);
    });

    it('should increment', () => {
      const gauge = createGauge('test_gauge', 'Test');
      gauge.set(10);
      gauge.inc();
      expect(gauge.value).toBe(11);
    });

    it('should increment by N', () => {
      const gauge = createGauge('test_gauge', 'Test');
      gauge.inc(5);
      expect(gauge.value).toBe(5);
    });

    it('should decrement', () => {
      const gauge = createGauge('test_gauge', 'Test');
      gauge.set(10);
      gauge.dec();
      expect(gauge.value).toBe(9);
    });

    it('should decrement by N', () => {
      const gauge = createGauge('test_gauge', 'Test');
      gauge.set(10);
      gauge.dec(5);
      expect(gauge.value).toBe(5);
    });

    it('should allow negative values', () => {
      const gauge = createGauge('test_gauge', 'Test');
      gauge.set(-10);
      expect(gauge.value).toBe(-10);
    });

    it('should set to current time', () => {
      const gauge = createGauge('test_gauge', 'Test');
      const before = Date.now();
      gauge.setToCurrentTime();
      const after = Date.now();
      expect(gauge.value).toBeGreaterThanOrEqual(before);
      expect(gauge.value).toBeLessThanOrEqual(after);
    });
  });

  describe('Histogram', () => {
    it('should track observations', () => {
      const histogram = createHistogram('test_histogram', 'Test');
      histogram.observe(5);
      histogram.observe(10);
      histogram.observe(15);

      expect(histogram.count).toBe(3);
      expect(histogram.sum).toBe(30);
    });

    it('should use default buckets', () => {
      const histogram = createHistogram('test_histogram', 'Test');
      histogram.observe(0.01);
      histogram.observe(0.5);
      histogram.observe(1);

      const buckets = histogram.buckets;
      expect(buckets.length).toBeGreaterThan(0);
    });

    it('should use custom buckets', () => {
      const histogram = createHistogram('test_histogram', 'Test', {
        buckets: [1, 5, 10, 50, 100],
      });

      histogram.observe(3);
      histogram.observe(7);
      histogram.observe(75);

      const buckets = histogram.buckets;
      expect(buckets.some(b => b.le === 5 && b.count === 1)).toBe(true);
      expect(buckets.some(b => b.le === 10 && b.count === 2)).toBe(true);
    });

    it('should calculate percentiles', () => {
      const histogram = createHistogram('test_histogram', 'Test');
      for (let i = 1; i <= 100; i++) {
        histogram.observe(i);
      }

      expect(histogram.percentile(0.5)).toBeCloseTo(50, 0);
      expect(histogram.percentile(0.9)).toBeCloseTo(90, 0);
    });

    it('should calculate mean', () => {
      const histogram = createHistogram('test_histogram', 'Test');
      histogram.observe(10);
      histogram.observe(20);
      histogram.observe(30);

      expect(histogram.mean).toBeCloseTo(20);
    });

    it('should reset', () => {
      const histogram = createHistogram('test_histogram', 'Test');
      histogram.observe(10);
      histogram.reset();

      expect(histogram.count).toBe(0);
      expect(histogram.sum).toBe(0);
    });
  });

  describe('Summary', () => {
    it('should track observations', () => {
      const summary = createSummary('test_summary', 'Test');
      summary.observe(5);
      summary.observe(10);
      summary.observe(15);

      expect(summary.count).toBe(3);
      expect(summary.sum).toBe(30);
    });

    it('should calculate quantiles', () => {
      const summary = createSummary('test_summary', 'Test', {
        quantiles: [0.5, 0.9, 0.99],
      });

      for (let i = 1; i <= 100; i++) {
        summary.observe(i);
      }

      const quantiles = summary.quantiles;
      expect(quantiles.get(0.5)).toBeCloseTo(50, 0);
      expect(quantiles.get(0.9)).toBeCloseTo(90, 0);
    });

    it('should use sliding window', () => {
      const summary = createSummary('test_summary', 'Test', {
        maxAge: 100,
        ageBuckets: 2,
      });

      summary.observe(10);
      expect(summary.count).toBe(1);
    });
  });

  describe('MetricsRegistry', () => {
    it('should register metrics', () => {
      const registry = new MetricsRegistry();
      const counter = registry.createCounter('test_counter', 'Test');

      expect(registry.getMetric('test_counter')).toBe(counter);
    });

    it('should list all metrics', () => {
      const registry = new MetricsRegistry();
      registry.createCounter('counter1', 'Counter 1');
      registry.createGauge('gauge1', 'Gauge 1');

      const metrics = registry.getAllMetrics();
      expect(metrics).toHaveLength(2);
    });

    it('should prevent duplicate names', () => {
      const registry = new MetricsRegistry();
      registry.createCounter('test', 'Test');

      expect(() => registry.createCounter('test', 'Test 2')).toThrow();
    });

    it('should clear all metrics', () => {
      const registry = new MetricsRegistry();
      registry.createCounter('counter1', 'Counter 1');
      registry.clear();

      expect(registry.getAllMetrics()).toHaveLength(0);
    });

    it('should use default registry', () => {
      const counter = defaultRegistry.createCounter('default_counter', 'Test');
      expect(defaultRegistry.getMetric('default_counter')).toBe(counter);
    });
  });

  describe('Stopwatch', () => {
    it('should measure elapsed time', async () => {
      const stopwatch = new Stopwatch();
      stopwatch.start();

      await new Promise(r => setTimeout(r, 50));

      stopwatch.stop();
      expect(stopwatch.elapsedMs).toBeGreaterThanOrEqual(40);
    });

    it('should support lap times', async () => {
      const stopwatch = new Stopwatch();
      stopwatch.start();

      await new Promise(r => setTimeout(r, 20));
      const lap1 = stopwatch.lap();

      await new Promise(r => setTimeout(r, 20));
      const lap2 = stopwatch.lap();

      expect(lap1).toBeGreaterThanOrEqual(10);
      expect(lap2).toBeGreaterThanOrEqual(10);
      expect(stopwatch.laps).toHaveLength(2);
    });

    it('should reset', async () => {
      const stopwatch = new Stopwatch();
      stopwatch.start();

      await new Promise(r => setTimeout(r, 20));

      stopwatch.reset();
      expect(stopwatch.elapsedMs).toBe(0);
      expect(stopwatch.laps).toHaveLength(0);
    });

    it('should get elapsed without stopping', async () => {
      const stopwatch = new Stopwatch();
      stopwatch.start();

      await new Promise(r => setTimeout(r, 20));

      expect(stopwatch.elapsedMs).toBeGreaterThanOrEqual(10);
      expect(stopwatch.isRunning).toBe(true);
    });
  });

  describe('Timing Functions', () => {
    it('should time synchronous function', () => {
      const result = time(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result.value).toBe(499500);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should time async function', async () => {
      const result = await timeAsync(async () => {
        await new Promise(r => setTimeout(r, 20));
        return 'done';
      });

      expect(result.value).toBe('done');
      expect(result.durationMs).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Labeled Metrics', () => {
    it('should create labeled counter', () => {
      const counter = labeledCounter('http_requests', 'HTTP requests', [
        'method',
        'status',
      ]);

      counter.labels({ method: 'GET', status: '200' }).inc();
      counter.labels({ method: 'POST', status: '201' }).inc(5);

      expect(counter.labels({ method: 'GET', status: '200' }).value).toBe(1);
      expect(counter.labels({ method: 'POST', status: '201' }).value).toBe(5);
    });

    it('should create labeled gauge', () => {
      const gauge = labeledGauge('temperature', 'Temperature', ['location']);

      gauge.labels({ location: 'office' }).set(22);
      gauge.labels({ location: 'outside' }).set(15);

      expect(gauge.labels({ location: 'office' }).value).toBe(22);
      expect(gauge.labels({ location: 'outside' }).value).toBe(15);
    });

    it('should create labeled histogram', () => {
      const histogram = labeledHistogram(
        'request_duration',
        'Request duration',
        ['endpoint']
      );

      histogram.labels({ endpoint: '/api/users' }).observe(0.1);
      histogram.labels({ endpoint: '/api/posts' }).observe(0.5);

      expect(histogram.labels({ endpoint: '/api/users' }).count).toBe(1);
      expect(histogram.labels({ endpoint: '/api/posts' }).count).toBe(1);
    });
  });

  describe('Export Functions', () => {
    it('should get metrics snapshot', () => {
      const registry = new MetricsRegistry();
      const counter = registry.createCounter('test_counter', 'Test');
      counter.inc(5);

      const snapshot = getMetricsSnapshot(registry);
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].name).toBe('test_counter');
      expect(snapshot[0].value).toBe(5);
    });

    it('should export Prometheus format', () => {
      const registry = new MetricsRegistry();
      const counter = registry.createCounter('test_counter', 'Test counter');
      counter.inc(5);

      const prometheus = exportPrometheus(registry);
      expect(prometheus).toContain('# HELP test_counter Test counter');
      expect(prometheus).toContain('# TYPE test_counter counter');
      expect(prometheus).toContain('test_counter 5');
    });

    it('should export histogram in Prometheus format', () => {
      const registry = new MetricsRegistry();
      const histogram = registry.createHistogram(
        'test_histogram',
        'Test histogram',
        {
          buckets: [1, 5, 10],
        }
      );
      histogram.observe(3);
      histogram.observe(7);

      const prometheus = exportPrometheus(registry);
      expect(prometheus).toContain('test_histogram_bucket');
      expect(prometheus).toContain('test_histogram_count');
      expect(prometheus).toContain('test_histogram_sum');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero observations in histogram', () => {
      const histogram = createHistogram('empty_histogram', 'Empty');
      expect(histogram.count).toBe(0);
      expect(histogram.mean).toBeNaN();
    });

    it('should handle very large values', () => {
      const counter = createCounter('large_counter', 'Large');
      counter.inc(Number.MAX_SAFE_INTEGER);
      expect(counter.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle rapid increments', () => {
      const counter = createCounter('rapid_counter', 'Rapid');
      for (let i = 0; i < 10000; i++) {
        counter.inc();
      }
      expect(counter.value).toBe(10000);
    });

    it('should handle concurrent stopwatch laps', async () => {
      const stopwatch = new Stopwatch();
      stopwatch.start();

      const laps = await Promise.all([
        new Promise<number>(r => setTimeout(() => r(stopwatch.lap()), 10)),
        new Promise<number>(r => setTimeout(() => r(stopwatch.lap()), 20)),
        new Promise<number>(r => setTimeout(() => r(stopwatch.lap()), 30)),
      ]);

      expect(laps).toHaveLength(3);
      expect(stopwatch.laps).toHaveLength(3);
    });
  });
});
