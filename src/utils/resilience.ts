/**
 * Resilience Utilities
 * @module utils/resilience
 * @description Fault tolerance patterns including circuit breaker, retry,
 * rate limiting, bulkhead, and timeout utilities.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit */
  recoveryTimeout: number;
  /** Number of successful calls in half-open state to close circuit */
  successThreshold?: number;
  /** Custom function to determine if error should count as failure */
  isFailure?: (error: unknown) => boolean;
  /** Called when state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in ms between retries */
  baseDelay: number;
  /** Maximum delay in ms */
  maxDelay?: number;
  /** Backoff strategy */
  backoff?: 'fixed' | 'linear' | 'exponential' | 'jitter';
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: unknown, attempt: number) => boolean;
  /** Called before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Maximum requests per interval */
  maxRequests: number;
  /** Interval in ms */
  interval: number;
  /** Whether to queue excess requests or reject them */
  queueExcess?: boolean;
  /** Maximum queue size (if queueExcess is true) */
  maxQueueSize?: number;
}

/**
 * Bulkhead options
 */
export interface BulkheadOptions {
  /** Maximum concurrent executions */
  maxConcurrent: number;
  /** Maximum queue size for waiting executions */
  maxQueue?: number;
  /** Timeout in ms for queued items */
  queueTimeout?: number;
}

// ============================================================================
// Circuit Breaker
// ============================================================================

/**
 * Circuit Breaker implementation for fault tolerance
 */
export class CircuitBreaker<
  T extends (...args: unknown[]) => Promise<unknown>,
> {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly fn: T,
    options: CircuitBreakerOptions
  ) {
    this.options = {
      failureThreshold: options.failureThreshold,
      recoveryTimeout: options.recoveryTimeout,
      successThreshold: options.successThreshold ?? 1,
      isFailure: options.isFailure ?? (() => true),
      onStateChange: options.onStateChange ?? (() => {}),
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Execute function through circuit breaker
   * @param args - Function arguments
   * @returns Promise with function result
   */
  async execute(...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    // Check if circuit should transition from open to half-open
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.options.recoveryTimeout) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit is open. Retry after ${this.options.recoveryTimeout - timeSinceFailure}ms`
        );
      }
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result as Awaited<ReturnType<T>>;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Force circuit to closed state
   */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.transitionTo('closed');
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.failures = 0;
        this.successes = 0;
        this.transitionTo('closed');
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(error: unknown): void {
    if (!this.options.isFailure(error)) return;

    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.successes = 0;
      this.transitionTo('open');
    } else if (this.failures >= this.options.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.options.onStateChange(oldState, newState);
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  readonly name = 'CircuitBreakerOpenError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CircuitBreakerOpenError.prototype);
  }
}

/**
 * Create a circuit breaker wrapper for a function
 * @param fn - Function to wrap
 * @param options - Circuit breaker options
 */
export function withCircuitBreaker<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, options: CircuitBreakerOptions): CircuitBreaker<T> {
  return new CircuitBreaker(fn, options);
}

// ============================================================================
// Retry
// ============================================================================

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const { baseDelay, maxDelay = Infinity, backoff = 'exponential' } = options;

  let delay: number;

  switch (backoff) {
    case 'fixed':
      delay = baseDelay;
      break;
    case 'linear':
      delay = baseDelay * attempt;
      break;
    case 'exponential':
      delay = baseDelay * Math.pow(2, attempt - 1);
      break;
    case 'jitter': {
      // Exponential backoff with full jitter
      const maxJitterDelay = baseDelay * Math.pow(2, attempt - 1);
      delay = Math.random() * maxJitterDelay;
      break;
    }
    default:
      delay = baseDelay;
  }

  return Math.min(delay, maxDelay);
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new AbortError('Retry aborted'));
      });
    }
  });
}

/**
 * Abort error
 */
export class AbortError extends Error {
  readonly name = 'AbortError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}

/**
 * Retry error containing all attempt errors
 */
export class RetryError extends Error {
  readonly name = 'RetryError';
  readonly attempts: unknown[];

  constructor(message: string, attempts: unknown[]) {
    super(message);
    this.attempts = attempts;
    Object.setPrototypeOf(this, RetryError.prototype);
  }
}

/**
 * Execute function with retry logic
 * @param fn - Function to execute
 * @param options - Retry options
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, isRetryable = () => true, onRetry, signal } = options;

  const errors: unknown[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new AbortError('Retry aborted');
    }

    try {
      return await fn();
    } catch (error) {
      errors.push(error);

      if (attempt === maxAttempts || !isRetryable(error, attempt)) {
        throw new RetryError(
          `Failed after ${attempt} attempts: ${error instanceof Error ? error.message : String(error)}`,
          errors
        );
      }

      const delay = calculateDelay(attempt, options);
      onRetry?.(error, attempt, delay);

      await sleep(delay, signal);
    }
  }

  throw new RetryError(`Failed after ${maxAttempts} attempts`, errors);
}

/**
 * Create a retryable version of a function
 * @param fn - Function to wrap
 * @param options - Retry options
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return retry(() => fn(...args), options) as Promise<Awaited<ReturnType<T>>>;
  };
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Token Bucket Rate Limiter
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly options: Required<RateLimiterOptions>;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(options: RateLimiterOptions) {
    this.options = {
      maxRequests: options.maxRequests,
      interval: options.interval,
      queueExcess: options.queueExcess ?? false,
      maxQueueSize: options.maxQueueSize ?? 100,
    };
    this.tokens = this.options.maxRequests;
    this.lastRefill = Date.now();
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Acquire a token (wait if necessary)
   * @returns Promise that resolves when token is acquired
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    if (!this.options.queueExcess) {
      throw new RateLimitExceededError('Rate limit exceeded');
    }

    if (this.queue.length >= this.options.maxQueueSize) {
      throw new RateLimitExceededError('Rate limit queue full');
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.scheduleQueueProcessing();
    });
  }

  /**
   * Try to acquire a token without waiting
   * @returns True if token was acquired
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Execute function with rate limiting
   * @param fn - Function to execute
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.options.maxRequests;
    this.lastRefill = Date.now();
    this.queue = [];
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillAmount =
      (elapsed / this.options.interval) * this.options.maxRequests;

    if (refillAmount >= 1) {
      this.tokens = Math.min(
        this.options.maxRequests,
        this.tokens + Math.floor(refillAmount)
      );
      this.lastRefill = now;
    }
  }

  private scheduleQueueProcessing(): void {
    const timeUntilToken = this.options.interval / this.options.maxRequests;

    setTimeout(() => {
      this.refill();

      while (this.tokens > 0 && this.queue.length > 0) {
        this.tokens--;
        const item = this.queue.shift()!;
        item.resolve();
      }

      if (this.queue.length > 0) {
        this.scheduleQueueProcessing();
      }
    }, timeUntilToken);
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
  readonly name = 'RateLimitExceededError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RateLimitExceededError.prototype);
  }
}

/**
 * Create a rate-limited version of a function
 * @param fn - Function to wrap
 * @param options - Rate limiter options
 */
export function withRateLimit<
  T extends (...args: unknown[]) => Promise<unknown>,
>(
  fn: T,
  options: RateLimiterOptions
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const limiter = new RateLimiter(options);

  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return limiter.execute(() => fn(...args)) as Promise<
      Awaited<ReturnType<T>>
    >;
  };
}

// ============================================================================
// Bulkhead
// ============================================================================

/**
 * Bulkhead for limiting concurrent executions
 */
export class Bulkhead {
  private running = 0;
  private queue: Array<{
    fn: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }> = [];
  private readonly options: Required<BulkheadOptions>;

  constructor(options: BulkheadOptions) {
    this.options = {
      maxConcurrent: options.maxConcurrent,
      maxQueue: options.maxQueue ?? Infinity,
      queueTimeout: options.queueTimeout ?? 0,
    };
  }

  /**
   * Get number of running executions
   */
  getRunning(): number {
    return this.running;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if bulkhead is available
   */
  isAvailable(): boolean {
    return this.running < this.options.maxConcurrent;
  }

  /**
   * Execute function through bulkhead
   * @param fn - Function to execute
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running < this.options.maxConcurrent) {
      return this.run(fn);
    }

    if (this.queue.length >= this.options.maxQueue) {
      throw new BulkheadFullError('Bulkhead queue full');
    }

    return new Promise<T>((resolve, reject) => {
      const item = {
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: undefined as NodeJS.Timeout | undefined,
      };

      if (this.options.queueTimeout > 0) {
        item.timeout = setTimeout(() => {
          const index = this.queue.indexOf(item);
          if (index !== -1) {
            this.queue.splice(index, 1);
            reject(new BulkheadTimeoutError('Queue timeout exceeded'));
          }
        }, this.options.queueTimeout);
      }

      this.queue.push(item);
    });
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    while (this.running < this.options.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!;

      if (item.timeout) {
        clearTimeout(item.timeout);
      }

      this.run(item.fn).then(item.resolve).catch(item.reject);
    }
  }
}

/**
 * Error thrown when bulkhead is full
 */
export class BulkheadFullError extends Error {
  readonly name = 'BulkheadFullError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BulkheadFullError.prototype);
  }
}

/**
 * Error thrown when bulkhead queue timeout is exceeded
 */
export class BulkheadTimeoutError extends Error {
  readonly name = 'BulkheadTimeoutError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BulkheadTimeoutError.prototype);
  }
}

/**
 * Create a bulkhead-protected version of a function
 * @param fn - Function to wrap
 * @param options - Bulkhead options
 */
export function withBulkhead<
  T extends (...args: unknown[]) => Promise<unknown>,
>(
  fn: T,
  options: BulkheadOptions
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const bulkhead = new Bulkhead(options);

  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return bulkhead.execute(() => fn(...args)) as Promise<
      Awaited<ReturnType<T>>
    >;
  };
}

// ============================================================================
// Timeout
// ============================================================================

/**
 * Timeout error
 */
export class TimeoutError extends Error {
  readonly name = 'TimeoutError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Execute function with timeout
 * @param fn - Function to execute
 * @param ms - Timeout in milliseconds
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${ms}ms`));
    }, ms);

    fn()
      .then(result => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Create a timeout-wrapped version of a function
 * @param fn - Function to wrap
 * @param ms - Timeout in milliseconds
 */
export function timeout<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return withTimeout(() => fn(...args), ms) as Promise<
      Awaited<ReturnType<T>>
    >;
  };
}

// ============================================================================
// Fallback
// ============================================================================

/**
 * Execute function with fallback
 * @param fn - Primary function
 * @param fallback - Fallback function or value
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T | ((error: unknown) => T | Promise<T>)
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (typeof fallback === 'function') {
      return (fallback as (error: unknown) => T | Promise<T>)(error);
    }
    return fallback;
  }
}

/**
 * Create a function with fallback behavior
 * @param fn - Primary function
 * @param fallback - Fallback function or value
 */
export function fallback<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  fallbackValue:
    | Awaited<ReturnType<T>>
    | ((
        error: unknown,
        ...args: Parameters<T>
      ) => Awaited<ReturnType<T>> | Promise<Awaited<ReturnType<T>>>)
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return (await fn(...args)) as Awaited<ReturnType<T>>;
    } catch (error) {
      if (typeof fallbackValue === 'function') {
        return (
          fallbackValue as (
            error: unknown,
            ...args: Parameters<T>
          ) => Awaited<ReturnType<T>>
        )(error, ...args);
      }
      return fallbackValue;
    }
  };
}

// ============================================================================
// Hedging
// ============================================================================

/**
 * Execute multiple attempts in parallel, return first success
 * @param fn - Function to execute
 * @param attempts - Number of parallel attempts
 * @param delay - Delay between starting attempts (ms)
 */
export async function hedge<T>(
  fn: () => Promise<T>,
  attempts: number,
  delay: number
): Promise<T> {
  const promises: Promise<T>[] = [];
  const errors: unknown[] = [];

  return new Promise<T>((resolve, reject) => {
    let resolved = false;

    for (let i = 0; i < attempts; i++) {
      setTimeout(() => {
        if (resolved) return;

        const promise = fn();
        promises.push(promise);

        promise
          .then(result => {
            if (!resolved) {
              resolved = true;
              resolve(result);
            }
          })
          .catch(error => {
            errors.push(error);
            if (errors.length === attempts) {
              reject(new Error(`All ${attempts} hedge attempts failed`));
            }
          });
      }, i * delay);
    }
  });
}

// ============================================================================
// Composition
// ============================================================================

/**
 * Compose multiple resilience patterns
 * @param fn - Function to wrap
 * @param wrappers - Array of wrapper functions to apply
 */
export function compose<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ...wrappers: Array<
    (
      fn: (...args: unknown[]) => Promise<unknown>
    ) => (...args: unknown[]) => Promise<unknown>
  >
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const base = fn as (...args: unknown[]) => Promise<unknown>;
  const composed = wrappers.reduce(
    (wrapped, wrapper) => wrapper(wrapped),
    base
  );
  return composed as (
    ...args: Parameters<T>
  ) => Promise<Awaited<ReturnType<T>>>;
}

/**
 * Create a resilient function with circuit breaker, retry, and timeout
 * @param fn - Function to wrap
 * @param options - Combined options
 */
export function resilient<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    circuitBreaker?: CircuitBreakerOptions;
    retry?: RetryOptions;
    timeout?: number;
    rateLimit?: RateLimiterOptions;
    bulkhead?: BulkheadOptions;
  }
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let wrapped: (...args: unknown[]) => Promise<unknown> = fn;

  // Apply timeout first (innermost)
  if (options.timeout) {
    const timeoutMs = options.timeout;
    const inner = wrapped;
    wrapped = (...args) => withTimeout(() => inner(...args), timeoutMs);
  }

  // Apply retry
  if (options.retry) {
    const retryOpts = options.retry;
    const inner = wrapped;
    wrapped = (...args) => retry(() => inner(...args), retryOpts);
  }

  // Apply circuit breaker
  if (options.circuitBreaker) {
    const cb = new CircuitBreaker(
      wrapped as (...args: unknown[]) => Promise<unknown>,
      options.circuitBreaker
    );
    wrapped = (...args) => cb.execute(...args);
  }

  // Apply rate limit
  if (options.rateLimit) {
    const limiter = new RateLimiter(options.rateLimit);
    const inner = wrapped;
    wrapped = (...args) => limiter.execute(() => inner(...args));
  }

  // Apply bulkhead (outermost)
  if (options.bulkhead) {
    const bulk = new Bulkhead(options.bulkhead);
    const inner = wrapped;
    wrapped = (...args) => bulk.execute(() => inner(...args));
  }

  return wrapped as (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

/**
 * Create a health check for a service
 * @param check - Health check function
 * @param timeout - Timeout in ms
 */
export function createHealthCheck(
  check: () => Promise<void>,
  timeoutMs = 5000
): () => Promise<HealthCheckResult> {
  return async (): Promise<HealthCheckResult> => {
    const start = Date.now();

    try {
      await withTimeout(check, timeoutMs);
      return {
        healthy: true,
        latency: Date.now() - start,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  };
}
