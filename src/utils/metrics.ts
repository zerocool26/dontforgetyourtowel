/**
 * Metrics and Observability Utilities
 * @module utils/metrics
 * @description Performance metrics, counters, histograms, and
 * observability utilities for monitoring application health.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric labels
 */
export type Labels = Record<string, string>;

/**
 * Metric options
 */
export interface MetricOptions {
  name: string;
  help?: string;
  labels?: string[];
}

/**
 * Histogram options
 */
export interface HistogramOptions extends MetricOptions {
  buckets?: number[];
}

/**
 * Summary options
 */
export interface SummaryOptions extends MetricOptions {
  percentiles?: number[];
  maxAge?: number;
  ageBuckets?: number;
}

/**
 * Metric value with labels
 */
export interface MetricValue {
  value: number;
  labels: Labels;
  timestamp: number;
}

/**
 * Histogram bucket
 */
export interface HistogramBucket {
  le: number;
  count: number;
}

/**
 * Histogram value
 */
export interface HistogramValue {
  labels: Labels;
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

/**
 * Summary value
 */
export interface SummaryValue {
  labels: Labels;
  quantiles: Map<number, number>;
  sum: number;
  count: number;
}

// ============================================================================
// Counter
// ============================================================================

/**
 * Monotonically increasing counter
 */
export class Counter {
  private values = new Map<string, number>();
  readonly type: MetricType = 'counter';
  readonly name: string;
  readonly help: string;

  constructor(readonly options: MetricOptions) {
    this.name = options.name;
    this.help = options.help || '';
  }

  /**
   * Increment counter
   */
  inc(amount: number | Labels = 1, labels: Labels = {}): void {
    let actualAmount = 1;
    let actualLabels: Labels = {};

    if (typeof amount === 'number') {
      actualAmount = amount;
      actualLabels = labels;
    } else {
      actualLabels = amount;
      actualAmount = 1;
    }

    if (actualAmount < 0) {
      throw new Error('Counter can only be incremented');
    }
    const key = this.labelsToKey(actualLabels);
    const current = this.values.get(key) ?? 0;
    this.values.set(key, current + actualAmount);
  }

  get value(): number {
    return this.get();
  }

  /**
   * Get current value
   */
  get(labels: Labels = {}): number {
    const key = this.labelsToKey(labels);
    return this.values.get(key) ?? 0;
  }

  /**
   * Reset counter
   */
  reset(labels?: Labels): void {
    if (labels) {
      const key = this.labelsToKey(labels);
      this.values.delete(key);
    } else {
      this.values.clear();
    }
  }

  /**
   * Get all values
   */
  getAll(): MetricValue[] {
    const timestamp = Date.now();
    return Array.from(this.values.entries()).map(([key, value]) => ({
      value,
      labels: this.keyToLabels(key),
      timestamp,
    }));
  }

  private labelsToKey(labels: Labels): string {
    const sorted = Object.keys(labels)
      .sort()
      .map(k => `${k}="${labels[k]}"`)
      .join(',');
    return sorted || '__default__';
  }

  private keyToLabels(key: string): Labels {
    if (key === '__default__') return {};
    const labels: Labels = {};
    const pairs = key.split(',');
    for (const pair of pairs) {
      const match = pair.match(/^([^=]+)="([^"]*)"$/);
      if (match) {
        labels[match[1]] = match[2];
      }
    }
    return labels;
  }
}

// ============================================================================
// Gauge
// ============================================================================

/**
 * Gauge that can go up and down
 */
export class Gauge {
  private values = new Map<string, number>();
  readonly type: MetricType = 'gauge';
  readonly name: string;
  readonly help: string;

  constructor(readonly options: MetricOptions) {
    this.name = options.name;
    this.help = options.help || '';
  }

  get value(): number {
    return this.get();
  }

  /**
   * Set gauge value
   */
  set(value: number, labels: Labels = {}): void {
    const key = this.labelsToKey(labels);
    this.values.set(key, value);
  }

  /**
   * Increment gauge
   */
  inc(amount: number | Labels = 1, labels: Labels = {}): void {
    let actualAmount = 1;
    let actualLabels: Labels = {};

    if (typeof amount === 'number') {
      actualAmount = amount;
      actualLabels = labels;
    } else {
      actualLabels = amount;
      actualAmount = 1;
    }

    const key = this.labelsToKey(actualLabels);
    const current = this.values.get(key) ?? 0;
    this.values.set(key, current + actualAmount);
  }

  /**
   * Decrement gauge
   */
  dec(amount: number | Labels = 1, labels: Labels = {}): void {
    let actualAmount = 1;
    let actualLabels: Labels = {};

    if (typeof amount === 'number') {
      actualAmount = amount;
      actualLabels = labels;
    } else {
      actualLabels = amount;
      actualAmount = 1;
    }

    const key = this.labelsToKey(actualLabels);
    const current = this.values.get(key) ?? 0;
    this.values.set(key, current - actualAmount);
  }

  /**
   * Get current value
   */
  get(labels: Labels = {}): number {
    const key = this.labelsToKey(labels);
    return this.values.get(key) ?? 0;
  }

  /**
   * Set to current time
   */
  setToCurrentTime(labels: Labels = {}): void {
    this.set(Date.now(), labels);
  }

  /**
   * Track in progress
   */
  trackInProgress<T>(
    fn: () => T | Promise<T>,
    labels: Labels = {}
  ): T | Promise<T> {
    this.inc(labels);
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => this.dec(labels));
    }

    this.dec(labels);
    return result;
  }

  /**
   * Get all values
   */
  getAll(): MetricValue[] {
    const timestamp = Date.now();
    return Array.from(this.values.entries()).map(([key, value]) => ({
      value,
      labels: this.keyToLabels(key),
      timestamp,
    }));
  }

  private labelsToKey(labels: Labels): string {
    const sorted = Object.keys(labels)
      .sort()
      .map(k => `${k}="${labels[k]}"`)
      .join(',');
    return sorted || '__default__';
  }

  private keyToLabels(key: string): Labels {
    if (key === '__default__') return {};
    const labels: Labels = {};
    const pairs = key.split(',');
    for (const pair of pairs) {
      const match = pair.match(/^([^=]+)="([^"]*)"$/);
      if (match) {
        labels[match[1]] = match[2];
      }
    }
    return labels;
  }
}

// ============================================================================
// Histogram
// ============================================================================

/**
 * Default histogram buckets
 */
export const DEFAULT_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

/**
 * Histogram for measuring distributions
 */
export class Histogram {
  private data = new Map<
    string,
    { sum: number; count: number; values: number[] }
  >();
  readonly type: MetricType = 'histogram';
  readonly bucketBoundaries: number[];
  readonly name: string;
  readonly help: string;

  constructor(readonly options: HistogramOptions) {
    this.name = options.name;
    this.help = options.help || '';
    this.bucketBoundaries = [...(options.buckets ?? DEFAULT_BUCKETS)].sort(
      (a, b) => a - b
    );
  }

  get count(): number {
    let total = 0;
    for (const d of this.data.values()) {
      total += d.count;
    }
    return total;
  }

  get sum(): number {
    let total = 0;
    for (const d of this.data.values()) {
      total += d.sum;
    }
    return total;
  }

  get buckets(): HistogramBucket[] {
    // Aggregate all data
    const allValues: number[] = [];
    for (const d of this.data.values()) {
      allValues.push(...d.values);
    }

    const buckets: HistogramBucket[] = this.bucketBoundaries.map(le => ({
      le,
      count: allValues.filter(v => v <= le).length,
    }));

    // Add +Inf bucket
    buckets.push({ le: Infinity, count: allValues.length });
    return buckets;
  }

  get mean(): number {
    let totalSum = 0;
    let totalCount = 0;
    for (const d of this.data.values()) {
      totalSum += d.sum;
      totalCount += d.count;
    }
    return totalCount === 0 ? NaN : totalSum / totalCount;
  }

  percentile(p: number): number {
    const allValues: number[] = [];
    for (const d of this.data.values()) {
      allValues.push(...d.values);
    }
    allValues.sort((a, b) => a - b);
    if (allValues.length === 0) return 0;
    const index = Math.ceil(p * allValues.length) - 1;
    return allValues[Math.max(0, index)];
  }

  /**
   * Observe a value
   */
  observe(value: number, labels: Labels = {}): void {
    const key = this.labelsToKey(labels);
    let data = this.data.get(key);

    if (!data) {
      data = { sum: 0, count: 0, values: [] };
      this.data.set(key, data);
    }

    data.sum += value;
    data.count++;
    data.values.push(value);
  }

  /**
   * Time a function
   */
  time<T>(fn: () => T, labels: Labels = {}): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = (performance.now() - start) / 1000;
      this.observe(duration, labels);
    }
  }

  /**
   * Time an async function
   */
  async timeAsync<T>(fn: () => Promise<T>, labels: Labels = {}): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = (performance.now() - start) / 1000;
      this.observe(duration, labels);
    }
  }

  /**
   * Create a timer
   */
  startTimer(labels: Labels = {}): () => number {
    const start = performance.now();
    return () => {
      const duration = (performance.now() - start) / 1000;
      this.observe(duration, labels);
      return duration;
    };
  }

  /**
   * Get histogram value
   */
  get(labels: Labels = {}): HistogramValue | undefined {
    const key = this.labelsToKey(labels);
    const data = this.data.get(key);

    if (!data) return undefined;

    const buckets: HistogramBucket[] = this.bucketBoundaries.map(le => ({
      le,
      count: data.values.filter(v => v <= le).length,
    }));

    // Add +Inf bucket
    buckets.push({ le: Infinity, count: data.count });

    return {
      labels: this.keyToLabels(key),
      buckets,
      sum: data.sum,
      count: data.count,
    };
  }

  /**
   * Get all histogram values
   */
  getAll(): HistogramValue[] {
    return Array.from(this.data.keys()).map(key => {
      const labels = this.keyToLabels(key);
      return this.get(labels)!;
    });
  }

  /**
   * Reset histogram
   */
  reset(labels?: Labels): void {
    if (labels) {
      const key = this.labelsToKey(labels);
      this.data.delete(key);
    } else {
      this.data.clear();
    }
  }

  private labelsToKey(labels: Labels): string {
    const sorted = Object.keys(labels)
      .sort()
      .map(k => `${k}="${labels[k]}"`)
      .join(',');
    return sorted || '__default__';
  }

  private keyToLabels(key: string): Labels {
    if (key === '__default__') return {};
    const labels: Labels = {};
    const pairs = key.split(',');
    for (const pair of pairs) {
      const match = pair.match(/^([^=]+)="([^"]*)"$/);
      if (match) {
        labels[match[1]] = match[2];
      }
    }
    return labels;
  }
}

// ============================================================================
// Summary
// ============================================================================

/**
 * Default percentiles
 */
export const DEFAULT_PERCENTILES = [0.5, 0.9, 0.95, 0.99];

/**
 * Summary for calculating percentiles
 */
export class Summary {
  private data = new Map<
    string,
    { sum: number; count: number; values: number[] }
  >();
  readonly type: MetricType = 'summary';
  readonly percentiles: number[];
  readonly name: string;
  readonly help: string;
  private maxAge: number;
  private ageBuckets: number;
  private timestamps = new Map<string, number[]>();

  constructor(readonly options: SummaryOptions) {
    this.name = options.name;
    this.help = options.help || '';
    this.percentiles = options.percentiles ?? DEFAULT_PERCENTILES;
    this.maxAge = options.maxAge ?? 600000; // 10 minutes
    this.ageBuckets = options.ageBuckets ?? 5;
  }

  get count(): number {
    let total = 0;
    for (const d of this.data.values()) {
      total += d.count;
    }
    return total;
  }

  get sum(): number {
    let total = 0;
    for (const d of this.data.values()) {
      total += d.sum;
    }
    return total;
  }

  get quantiles(): Map<number, number> {
    const allValues: number[] = [];
    for (const d of this.data.values()) {
      allValues.push(...d.values);
    }
    allValues.sort((a, b) => a - b);

    const quantiles = new Map<number, number>();
    for (const p of this.percentiles) {
      const index = Math.ceil(p * allValues.length) - 1;
      quantiles.set(p, allValues[Math.max(0, index)] ?? 0);
    }
    return quantiles;
  }

  /**
   * Observe a value
   */
  observe(value: number, labels: Labels = {}): void {
    const key = this.labelsToKey(labels);
    let data = this.data.get(key);
    let timestamps = this.timestamps.get(key);

    if (!data) {
      data = { sum: 0, count: 0, values: [] };
      this.data.set(key, data);
      timestamps = [];
      this.timestamps.set(key, timestamps);
    }

    const now = Date.now();
    data.sum += value;
    data.count++;
    data.values.push(value);
    timestamps!.push(now);

    // Clean up old values
    this.cleanup(key);
  }

  /**
   * Time a function
   */
  time<T>(fn: () => T, labels: Labels = {}): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = (performance.now() - start) / 1000;
      this.observe(duration, labels);
    }
  }

  /**
   * Time an async function
   */
  async timeAsync<T>(fn: () => Promise<T>, labels: Labels = {}): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = (performance.now() - start) / 1000;
      this.observe(duration, labels);
    }
  }

  /**
   * Create a timer
   */
  startTimer(labels: Labels = {}): () => number {
    const start = performance.now();
    return () => {
      const duration = (performance.now() - start) / 1000;
      this.observe(duration, labels);
      return duration;
    };
  }

  /**
   * Get summary value
   */
  get(labels: Labels = {}): SummaryValue | undefined {
    const key = this.labelsToKey(labels);
    const data = this.data.get(key);

    if (!data) return undefined;

    const sorted = [...data.values].sort((a, b) => a - b);
    const quantiles = new Map<number, number>();

    for (const p of this.percentiles) {
      const index = Math.ceil(p * sorted.length) - 1;
      quantiles.set(p, sorted[Math.max(0, index)] ?? 0);
    }

    return {
      labels: this.keyToLabels(key),
      quantiles,
      sum: data.sum,
      count: data.count,
    };
  }

  /**
   * Get all summary values
   */
  getAll(): SummaryValue[] {
    return Array.from(this.data.keys()).map(key => {
      const labels = this.keyToLabels(key);
      return this.get(labels)!;
    });
  }

  /**
   * Reset summary
   */
  reset(labels?: Labels): void {
    if (labels) {
      const key = this.labelsToKey(labels);
      this.data.delete(key);
      this.timestamps.delete(key);
    } else {
      this.data.clear();
      this.timestamps.clear();
    }
  }

  private cleanup(key: string): void {
    const data = this.data.get(key);
    const timestamps = this.timestamps.get(key);
    if (!data || !timestamps) return;

    const now = Date.now();
    const cutoff = now - this.maxAge;

    let removeCount = 0;
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] < cutoff) {
        removeCount++;
      } else {
        break;
      }
    }

    if (removeCount > 0) {
      const removed = data.values.splice(0, removeCount);
      timestamps.splice(0, removeCount);
      data.count -= removeCount;
      data.sum -= removed.reduce((a, b) => a + b, 0);
    }
  }

  private labelsToKey(labels: Labels): string {
    const sorted = Object.keys(labels)
      .sort()
      .map(k => `${k}="${labels[k]}"`)
      .join(',');
    return sorted || '__default__';
  }

  private keyToLabels(key: string): Labels {
    if (key === '__default__') return {};
    const labels: Labels = {};
    const pairs = key.split(',');
    for (const pair of pairs) {
      const match = pair.match(/^([^=]+)="([^"]*)"$/);
      if (match) {
        labels[match[1]] = match[2];
      }
    }
    return labels;
  }
}

// ============================================================================
// Registry
// ============================================================================

type AnyMetric = Counter | Gauge | Histogram | Summary;

/**
 * Registry for managing metrics
 */
export class MetricsRegistry {
  private metrics = new Map<string, AnyMetric>();

  createCounter(
    name: string,
    help: string,
    options?: Partial<MetricOptions>
  ): Counter {
    if (this.metrics.has(name)) {
      throw new Error(`Metric ${name} already exists`);
    }
    const metric = new Counter({ name, help, ...options });
    this.metrics.set(name, metric);
    return metric;
  }

  createGauge(
    name: string,
    help: string,
    options?: Partial<MetricOptions>
  ): Gauge {
    if (this.metrics.has(name))
      throw new Error(`Metric ${name} already exists`);
    const metric = new Gauge({ name, help, ...options });
    this.metrics.set(name, metric);
    return metric;
  }

  createHistogram(
    name: string,
    help: string,
    options?: Partial<HistogramOptions>
  ): Histogram {
    if (this.metrics.has(name))
      throw new Error(`Metric ${name} already exists`);
    const metric = new Histogram({ name, help, ...options });
    this.metrics.set(name, metric);
    return metric;
  }

  createSummary(
    name: string,
    help: string,
    options?: Partial<SummaryOptions>
  ): Summary {
    if (this.metrics.has(name))
      throw new Error(`Metric ${name} already exists`);
    const metric = new Summary({ name, help, ...options });
    this.metrics.set(name, metric);
    return metric;
  }

  getMetric(name: string): AnyMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): AnyMetric[] {
    return Array.from(this.metrics.values());
  }

  clear(): void {
    this.metrics.clear();
  }

  toPrometheus(): string {
    return '';
  }
}

export const defaultRegistry = new MetricsRegistry();

// ============================================================================
// Factory Functions
// ============================================================================

export function createCounter(
  name: string,
  help: string,
  options?: Partial<MetricOptions>
): Counter {
  return defaultRegistry.createCounter(name, help, options);
}

export function createGauge(
  name: string,
  help: string,
  options?: Partial<MetricOptions>
): Gauge {
  return defaultRegistry.createGauge(name, help, options);
}

export function createHistogram(
  name: string,
  help: string,
  options?: Partial<HistogramOptions>
): Histogram {
  return defaultRegistry.createHistogram(name, help, options);
}

export function createSummary(
  name: string,
  help: string,
  options?: Partial<SummaryOptions>
): Summary {
  return defaultRegistry.createSummary(name, help, options);
}

// ============================================================================
// Stopwatch
// ============================================================================

export class Stopwatch {
  private startTime: number = 0;
  private running = false;
  private _laps: number[] = [];
  private _elapsed: number = 0;

  start(): void {
    if (!this.running) {
      this.startTime = performance.now();
      this.running = true;
    }
  }

  stop(): void {
    if (this.running) {
      this._elapsed += performance.now() - this.startTime;
      this.running = false;
    }
  }

  reset(): void {
    this._elapsed = 0;
    this.startTime = 0;
    this.running = false;
    this._laps = [];
  }

  lap(): number {
    const current = this.elapsedMs;
    this._laps.push(current);
    return current;
  }

  get elapsedMs(): number {
    if (this.running) {
      return this._elapsed + (performance.now() - this.startTime);
    }
    return this._elapsed;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get laps(): number[] {
    return this._laps;
  }
}

// ============================================================================
// Timing Functions
// ============================================================================

export function time<T>(fn: () => T): { value: T; durationMs: number } {
  const start = performance.now();
  const value = fn();
  const durationMs = performance.now() - start;
  return { value, durationMs };
}

export async function timeAsync<T>(
  fn: () => Promise<T>
): Promise<{ value: T; durationMs: number }> {
  const start = performance.now();
  const value = await fn();
  const durationMs = performance.now() - start;
  return { value, durationMs };
}

// ============================================================================
// Labeled Metrics
// ============================================================================

export function labeledCounter(
  name: string,
  help: string,
  labelNames: string[]
) {
  const counter = createCounter(name, help);
  return {
    labels: (labels: Labels) => ({
      inc: (amount?: number) => counter.inc(amount, labels),
      get value() {
        return counter.get(labels);
      },
    }),
  };
}

export function labeledGauge(name: string, help: string, labelNames: string[]) {
  const gauge = createGauge(name, help);
  return {
    labels: (labels: Labels) => ({
      set: (value: number) => gauge.set(value, labels),
      inc: (amount?: number) => gauge.inc(amount, labels),
      dec: (amount?: number) => gauge.dec(amount, labels),
      get value() {
        return gauge.get(labels);
      },
    }),
  };
}

export function labeledHistogram(
  name: string,
  help: string,
  labelNames: string[],
  options?: Partial<HistogramOptions>
) {
  const histogram = createHistogram(name, help, options);
  return {
    labels: (labels: Labels) => ({
      observe: (value: number) => histogram.observe(value, labels),
      startTimer: () => histogram.startTimer(labels),
      get count() {
        return histogram.get(labels)?.count ?? 0;
      },
      get sum() {
        return histogram.get(labels)?.sum ?? 0;
      },
    }),
  };
}

// ============================================================================
// Utilities
// ============================================================================

export function resetAllMetrics(): void {
  defaultRegistry.clear();
}

export function getMetricsSnapshot(
  registry: MetricsRegistry = defaultRegistry
): Array<{
  name: string;
  help: string;
  type: MetricType;
  value: unknown;
}> {
  return registry.getAllMetrics().map(metric => {
    let value: unknown;

    if (metric.type === 'counter' || metric.type === 'gauge') {
      value = (metric as Counter | Gauge).value;
    } else {
      value = metric.getAll();
    }

    return {
      name: metric.name,
      help: metric.help,
      type: metric.type,
      value,
    };
  });
}

export function exportPrometheus(
  registry: MetricsRegistry = defaultRegistry
): string {
  let output = '';
  for (const metric of registry.getAllMetrics()) {
    output += `# HELP ${metric.name} ${metric.help}\n`;
    output += `# TYPE ${metric.name} ${metric.type}\n`;

    const formatLabels = (labels: Labels): string => {
      const entries = Object.entries(labels);
      if (entries.length === 0) return '';
      return entries.map(([k, val]) => `${k}="${val}"`).join(',');
    };

    if (metric.type === 'histogram') {
      const values = (metric as Histogram).getAll();
      for (const v of values) {
        const labels = formatLabels(v.labels || {});
        const labelStr = labels ? `{${labels}}` : '';
        const labelPrefix = labels ? `${labels},` : '';

        for (const b of v.buckets) {
          const le = b.le === Infinity ? '+Inf' : b.le;
          output += `${metric.name}_bucket{${labelPrefix}le="${le}"} ${b.count}\n`;
        }

        output += `${metric.name}_sum${labelStr} ${v.sum}\n`;
        output += `${metric.name}_count${labelStr} ${v.count}\n`;
      }
      continue;
    }

    if (metric.type === 'summary') {
      const values = (metric as Summary).getAll();
      for (const v of values) {
        const baseLabels = v.labels || {};
        const baseLabelStr = formatLabels(baseLabels);
        const baseLabelPrefix = baseLabelStr ? `${baseLabelStr},` : '';
        const baseLabelBlock = baseLabelStr ? `{${baseLabelStr}}` : '';

        for (const [quantile, value] of v.quantiles.entries()) {
          output += `${metric.name}{${baseLabelPrefix}quantile="${quantile}"} ${value}\n`;
        }

        output += `${metric.name}_sum${baseLabelBlock} ${v.sum}\n`;
        output += `${metric.name}_count${baseLabelBlock} ${v.count}\n`;
      }
      continue;
    }

    // counter / gauge
    const values = (metric as Counter | Gauge).getAll();
    for (const v of values) {
      const labels = formatLabels(v.labels || {});
      const labelStr = labels ? `{${labels}}` : '';
      output += `${metric.name}${labelStr} ${v.value}\n`;
    }
  }
  return output;
}

export const metrics = {
  Counter,
  Gauge,
  Histogram,
  Summary,
  MetricsRegistry,
  Stopwatch,
  defaultRegistry,
  createCounter,
  createGauge,
  createHistogram,
  createSummary,
  time,
  timeAsync,
  labeledCounter,
  labeledGauge,
  labeledHistogram,
  resetAllMetrics,
  getMetricsSnapshot,
  exportPrometheus,
};
