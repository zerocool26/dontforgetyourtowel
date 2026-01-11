/**
 * Functional Programming Utilities
 * @module utils/functional
 * @description Monads, functors, and functional programming helpers
 * including Option, Result, Either, and composition utilities.
 */
/* eslint-disable no-redeclare */

// ============================================================================
// Option Monad (Maybe)
// ============================================================================

/**
 * Option type representing a value that may or may not exist
 */
export type Option<T> = Some<T> | None;

/**
 * Some value wrapper
 */
export class Some<T> {
  readonly _tag = 'Some' as const;

  constructor(readonly value: T) {}

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is None {
    return false;
  }

  map<U>(fn: (value: T) => U): Option<U> {
    return some(fn(this.value));
  }

  flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value);
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : none;
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  getOrThrow(_error?: Error): T {
    return this.value;
  }

  unwrap(): T {
    return this.value;
  }

  match<U>(matcher: { some: (value: T) => U; none: () => U }): U;
  match<U>(onSome: (value: T) => U, onNone: () => U): U;
  match<U>(
    arg1: ((value: T) => U) | { some: (value: T) => U; none: () => U },
    _arg2?: () => U
  ): U {
    if (typeof arg1 === 'object') {
      return arg1.some(this.value);
    }
    return arg1(this.value);
  }

  tap(fn: (value: T) => void): Option<T> {
    fn(this.value);
    return this;
  }

  toArray(): T[] {
    return [this.value];
  }

  toNullable(): T | null {
    return this.value;
  }

  toString(): string {
    return `Some(${String(this.value)})`;
  }
}

/**
 * None value representing absence
 */
export class None {
  readonly _tag = 'None' as const;
  private static instance: None;

  private constructor() {}

  static getInstance(): None {
    if (!None.instance) {
      None.instance = new None();
    }
    return None.instance;
  }

  isSome(): this is Some<never> {
    return false;
  }

  isNone(): this is None {
    return true;
  }

  map<U>(_fn: (value: never) => U): Option<U> {
    return this;
  }

  flatMap<U>(_fn: (value: never) => Option<U>): Option<U> {
    return this;
  }

  filter(_predicate: (value: never) => boolean): Option<never> {
    return this;
  }

  getOrElse<T>(defaultValue: T): T {
    return defaultValue;
  }

  getOrThrow(error?: Error): never {
    throw error ?? new Error('Called getOrThrow on None');
  }

  unwrap(): never {
    throw new Error('Called unwrap on None');
  }

  match<U>(matcher: { some: (value: never) => U; none: () => U }): U;
  match<U>(onSome: (value: never) => U, onNone: () => U): U;
  match<U>(
    arg1: ((value: never) => U) | { some: (value: never) => U; none: () => U },
    arg2?: () => U
  ): U {
    if (typeof arg1 === 'object') {
      return arg1.none();
    }
    return arg2!();
  }

  tap(_fn: (value: never) => void): Option<never> {
    return this;
  }

  toArray(): never[] {
    return [];
  }

  toNullable(): null {
    return null;
  }

  toString(): string {
    return 'None';
  }
}

/** Singleton None instance */
export const none: None = None.getInstance();

/**
 * Create Some value
 */
export function some<T>(value: T): Some<T> {
  return new Some(value);
}

/**
 * Create Option from nullable
 */
export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value == null ? none : some(value);
}

/**
 * Create Option from predicate
 */
export function fromPredicate<T>(
  value: T,
  predicate: (value: T) => boolean
): Option<T> {
  return predicate(value) ? some(value) : none;
}

/**
 * Create Option from try/catch
 */
export function tryCatch<T>(fn: () => T): Option<T> {
  try {
    return some(fn());
  } catch {
    return none;
  }
}

// ============================================================================
// Result Monad (Either)
// ============================================================================

/**
 * Result type representing success or failure
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Success wrapper
 */
export class Ok<T> {
  readonly _tag = 'Ok' as const;

  constructor(readonly value: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is Err<never> {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  flatMap<U, F>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.value);
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  getOrThrow(_errorFn?: (e: never) => Error): T {
    return this.value;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapErr(): never {
    throw new Error('Called unwrapErr on Ok');
  }

  match<U>(matcher: { ok: (value: T) => U; err: (error: never) => U }): U;
  match<U>(onOk: (value: T) => U, onErr: (error: never) => U): U;
  match<U>(
    arg1: ((value: T) => U) | { ok: (value: T) => U; err: (error: never) => U },
    _arg2?: (error: never) => U
  ): U {
    if (typeof arg1 === 'object') {
      return arg1.ok(this.value);
    }
    return arg1(this.value);
  }

  tap(fn: (value: T) => void): Result<T, never> {
    fn(this.value);
    return this;
  }

  tapErr(_fn: (error: never) => void): Result<T, never> {
    return this;
  }

  toOption(): Option<T> {
    return some(this.value);
  }

  toString(): string {
    return `Ok(${String(this.value)})`;
  }
}

/**
 * Error wrapper
 */
export class Err<E> {
  readonly _tag = 'Err' as const;

  constructor(readonly error: E) {}

  isOk(): this is Ok<never> {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return err(fn(this.error));
  }

  flatMap<U, F>(_fn: (value: never) => Result<U, F>): Result<U, E | F> {
    return this as unknown as Result<U, E | F>;
  }

  getOrElse<T>(defaultValue: T): T {
    return defaultValue;
  }

  getOrThrow(errorFn?: (e: E) => Error): never {
    throw errorFn ? errorFn(this.error) : this.error;
  }

  unwrap(): never {
    throw this.error;
  }

  unwrapErr(): E {
    return this.error;
  }

  match<U>(matcher: { ok: (value: never) => U; err: (error: E) => U }): U;
  match<U>(onOk: (value: never) => U, onErr: (error: E) => U): U;
  match<U>(
    arg1:
      | ((value: never) => U)
      | { ok: (value: never) => U; err: (error: E) => U },
    arg2?: (error: E) => U
  ): U {
    if (typeof arg1 === 'object') {
      return arg1.err(this.error);
    }
    return arg2!(this.error);
  }

  tap(_fn: (value: never) => void): Result<never, E> {
    return this;
  }

  tapErr(fn: (error: E) => void): Result<never, E> {
    fn(this.error);
    return this;
  }

  toOption(): Option<never> {
    return none;
  }

  toString(): string {
    return `Err(${String(this.error)})`;
  }
}

/**
 * Create Ok result
 */
export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

/**
 * Create Err result
 */
export function err<E>(error: E): Err<E> {
  return new Err(error);
}

/**
 * Wrap function in Result
 */
export function tryResult<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e as E);
  }
}

/**
 * Wrap async function in Result
 */
export async function tryResultAsync<T, E = Error>(
  fn: () => Promise<T>
): Promise<Result<T, E>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e as E);
  }
}

// ============================================================================
// Either Type
// ============================================================================

/**
 * Either type representing one of two values
 */
export type Either<L, R> = Left<L> | Right<R>;

/**
 * Left value
 */
export class Left<L> {
  readonly _tag = 'Left' as const;

  constructor(readonly value: L) {}

  isLeft(): this is Left<L> {
    return true;
  }

  isRight(): this is Right<never> {
    return false;
  }

  map<U>(_fn: (value: never) => U): Either<L, U> {
    return this as unknown as Either<L, U>;
  }

  mapLeft<U>(fn: (value: L) => U): Either<U, never> {
    return left(fn(this.value));
  }

  flatMap<U>(_fn: (value: never) => Either<L, U>): Either<L, U> {
    return this as unknown as Either<L, U>;
  }

  unwrap(): L {
    return this.value;
  }

  match<U>(matcher: { left: (value: L) => U; right: (value: never) => U }): U;
  match<U>(onLeft: (value: L) => U, onRight: (value: never) => U): U;
  match<U>(
    arg1:
      | ((value: L) => U)
      | { left: (value: L) => U; right: (value: never) => U },
    _arg2?: (value: never) => U
  ): U {
    if (typeof arg1 === 'object') {
      return arg1.left(this.value);
    }
    return arg1(this.value);
  }

  swap(): Either<never, L> {
    return right(this.value);
  }

  toString(): string {
    return `Left(${String(this.value)})`;
  }
}

/**
 * Right value
 */
export class Right<R> {
  readonly _tag = 'Right' as const;

  constructor(readonly value: R) {}

  isLeft(): this is Left<never> {
    return false;
  }

  isRight(): this is Right<R> {
    return true;
  }

  map<U>(fn: (value: R) => U): Either<never, U> {
    return right(fn(this.value));
  }

  mapLeft<U>(_fn: (value: never) => U): Either<U, R> {
    return this as unknown as Either<U, R>;
  }

  flatMap<L, U>(fn: (value: R) => Either<L, U>): Either<L, U> {
    return fn(this.value);
  }

  unwrap(): R {
    return this.value;
  }

  match<U>(matcher: { left: (value: never) => U; right: (value: R) => U }): U;
  match<U>(onLeft: (value: never) => U, onRight: (value: R) => U): U;
  match<U>(
    arg1:
      | ((value: never) => U)
      | { left: (value: never) => U; right: (value: R) => U },
    arg2?: (value: R) => U
  ): U {
    if (typeof arg1 === 'object') {
      return arg1.right(this.value);
    }
    return arg2!(this.value);
  }

  swap(): Either<R, never> {
    return left(this.value);
  }

  toString(): string {
    return `Right(${String(this.value)})`;
  }
}

/**
 * Create Left value
 */
export function left<L>(value: L): Left<L> {
  return new Left(value);
}

/**
 * Create Right value
 */
export function right<R>(value: R): Right<R> {
  return new Right(value);
}

// ============================================================================
// Lazy Evaluation
// ============================================================================

/**
 * Lazy evaluation wrapper
 */
export class Lazy<T> {
  private computed = false;
  private value?: T;

  constructor(private readonly thunk: () => T) {}

  /**
   * Get the value (compute if needed)
   */
  get(): T {
    if (!this.computed) {
      this.value = this.thunk();
      this.computed = true;
    }
    return this.value as T;
  }

  /**
   * Check if computed
   */
  isComputed(): boolean {
    return this.computed;
  }

  /**
   * Map over lazy value
   */
  map<U>(fn: (value: T) => U): Lazy<U> {
    return lazy(() => fn(this.get()));
  }

  /**
   * FlatMap over lazy value
   */
  flatMap<U>(fn: (value: T) => Lazy<U>): Lazy<U> {
    return lazy(() => fn(this.get()).get());
  }
}

/**
 * Create lazy value
 */
export function lazy<T>(thunk: () => T): Lazy<T> {
  return new Lazy(thunk);
}

// ============================================================================
// Composition Utilities
// ============================================================================

/**
 * Compose functions (right to left)
 */
export function compose<A, B>(f: (a: A) => B): (a: A) => B;
export function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C;
export function compose<A, B, C, D>(
  f: (c: C) => D,
  g: (b: B) => C,
  h: (a: A) => B
): (a: A) => D;
export function compose<A, B, C, D, E>(
  f: (d: D) => E,
  g: (c: C) => D,
  h: (b: B) => C,
  i: (a: A) => B
): (a: A) => E;
export function compose(
  ...fns: Array<(x: unknown) => unknown>
): (x: unknown) => unknown {
  return (x: unknown) => fns.reduceRight((acc, fn) => fn(acc), x);
}

/**
 * Pipe functions (left to right)
 */
export function pipe<A, B>(a: A, f: (a: A) => B): B;
export function pipe<A, B, C>(a: A, f: (a: A) => B, g: (b: B) => C): C;
export function pipe<A, B, C, D>(
  a: A,
  f: (a: A) => B,
  g: (b: B) => C,
  h: (c: C) => D
): D;
export function pipe<A, B, C, D, E>(
  a: A,
  f: (a: A) => B,
  g: (b: B) => C,
  h: (c: C) => D,
  i: (d: D) => E
): E;
export function pipe<A, B, C, D, E, F>(
  a: A,
  f: (a: A) => B,
  g: (b: B) => C,
  h: (c: C) => D,
  i: (d: D) => E,
  j: (e: E) => F
): F;
export function pipe(
  initial: unknown,
  ...fns: Array<(x: unknown) => unknown>
): unknown {
  return fns.reduce((acc, fn) => fn(acc), initial);
}

/**
 * Create a pipeline builder
 */
export function pipeline<A>(): PipelineBuilder<A, A> {
  return new PipelineBuilder<A, A>([]);
}

class PipelineBuilder<TInput, TOutput> {
  constructor(private readonly fns: Array<(x: unknown) => unknown>) {}

  then<U>(fn: (value: TOutput) => U): PipelineBuilder<TInput, U> {
    return new PipelineBuilder([...this.fns, fn as (x: unknown) => unknown]);
  }

  build(): (input: TInput) => TOutput {
    return (input: TInput) =>
      this.fns.reduce<unknown>(
        (acc, fn) => fn(acc),
        input as unknown
      ) as TOutput;
  }
}

/**
 * Curry a function
 */
export function curry<T1, R>(fn: (a: T1) => R): (a: T1) => R;
export function curry<T1, T2, R>(
  fn: (a: T1, b: T2) => R
): (a: T1) => (b: T2) => R;
export function curry<T1, T2, T3, R>(
  fn: (a: T1, b: T2, c: T3) => R
): (a: T1) => (b: T2) => (c: T3) => R;
export function curry<T1, T2, T3, T4, R>(
  fn: (a: T1, b: T2, c: T3, d: T4) => R
): (a: T1) => (b: T2) => (c: T3) => (d: T4) => R;
export function curry(fn: (...args: unknown[]) => unknown): unknown {
  const arity = fn.length;

  function curried(...args: unknown[]): unknown {
    if (args.length >= arity) {
      return fn(...args);
    }
    return (...more: unknown[]) => curried(...args, ...more);
  }

  return curried;
}

/**
 * Partial application
 */
export function partial<T1, R>(fn: (a: T1) => R): (a: T1) => R;
export function partial<T1, T2, R>(
  fn: (a: T1, b: T2) => R,
  a: T1
): (b: T2) => R;
export function partial<T1, T2, T3, R>(
  fn: (a: T1, b: T2, c: T3) => R,
  a: T1,
  b: T2
): (c: T3) => R;
export function partial<T1, T2, T3, T4, R>(
  fn: (a: T1, b: T2, c: T3, d: T4) => R,
  a: T1,
  b: T2,
  c: T3
): (d: T4) => R;
export function partial(
  fn: (...args: unknown[]) => unknown,
  ...partialArgs: unknown[]
): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => fn(...partialArgs, ...args);
}

/**
 * Flip function arguments
 */
export function flip<A, B, R>(fn: (a: A, b: B) => R): (b: B, a: A) => R {
  return (b: B, a: A) => fn(a, b);
}

/**
 * Constant function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function constant<T>(value: T): (...args: any[]) => T {
  return () => value;
}

/**
 * Identity function
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * No-operation function
 */
export function noop(): void {}

/**
 * Always true predicate
 */
export function always(): boolean {
  return true;
}

/**
 * Always false predicate
 */
export function never(): boolean {
  return false;
}

// ============================================================================
// Predicate Utilities
// ============================================================================

/**
 * Negate a predicate
 */
export function not<T>(
  predicate: (value: T) => boolean
): (value: T) => boolean {
  return (value: T) => !predicate(value);
}

/**
 * Combine predicates with AND
 */
export function and<T>(
  ...predicates: Array<(value: T) => boolean>
): (value: T) => boolean {
  return (value: T) => predicates.every(p => p(value));
}

/**
 * Combine predicates with OR
 */
export function or<T>(
  ...predicates: Array<(value: T) => boolean>
): (value: T) => boolean {
  return (value: T) => predicates.some(p => p(value));
}

/**
 * Create equality predicate
 */
export function eq<T>(expected: T): (value: T) => boolean {
  return (value: T) => value === expected;
}

/**
 * Create not-equal predicate
 */
export function neq<T>(expected: T): (value: T) => boolean {
  return (value: T) => value !== expected;
}

/**
 * Create greater-than predicate
 */
export function gt(threshold: number): (value: number) => boolean {
  return (value: number) => value > threshold;
}

/**
 * Create greater-than-or-equal predicate
 */
export function gte(threshold: number): (value: number) => boolean {
  return (value: number) => value >= threshold;
}

/**
 * Create less-than predicate
 */
export function lt(threshold: number): (value: number) => boolean {
  return (value: number) => value < threshold;
}

/**
 * Create less-than-or-equal predicate
 */
export function lte(threshold: number): (value: number) => boolean {
  return (value: number) => value <= threshold;
}

/**
 * Create between predicate (inclusive)
 */
export function between(min: number, max: number): (value: number) => boolean {
  return (value: number) => value >= min && value <= max;
}

/**
 * Create property predicate
 */
export function prop<T, K extends keyof T>(
  key: K,
  predicate: (value: T[K]) => boolean
): (obj: T) => boolean {
  return (obj: T) => predicate(obj[key]);
}

// ============================================================================
// Collection Utilities
// ============================================================================

/**
 * Safe head of array
 */
export function head<T>(arr: T[]): Option<T> {
  return arr.length > 0 ? some(arr[0]) : none;
}

/**
 * Safe tail of array
 */
export function tail<T>(arr: T[]): Option<T[]> {
  return arr.length > 0 ? some(arr.slice(1)) : none;
}

/**
 * Safe last of array
 */
export function last<T>(arr: T[]): Option<T> {
  return arr.length > 0 ? some(arr[arr.length - 1]) : none;
}

/**
 * Safe init of array (all but last)
 */
export function init<T>(arr: T[]): Option<T[]> {
  return arr.length > 0 ? some(arr.slice(0, -1)) : none;
}

/**
 * Safe array access
 */
export function at<T>(arr: T[], index: number): Option<T> {
  const normalizedIndex = index < 0 ? arr.length + index : index;
  return normalizedIndex >= 0 && normalizedIndex < arr.length
    ? some(arr[normalizedIndex])
    : none;
}

/**
 * Find with Option
 */
export function findOption<T>(
  arr: T[],
  predicate: (value: T) => boolean
): Option<T> {
  const result = arr.find(predicate);
  return result !== undefined ? some(result) : none;
}

/**
 * Safe object property access
 */
export function getProp<T, K extends keyof T>(obj: T, key: K): Option<T[K]> {
  return obj[key] !== undefined ? some(obj[key]) : none;
}

/**
 * Partition array by predicate
 */
export function partition<T>(
  arr: T[],
  predicate: (value: T) => boolean
): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];

  for (const item of arr) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }

  return [pass, fail];
}

/**
 * Zip arrays
 */
export function zip<A, B>(a: A[], b: B[]): Array<[A, B]> {
  const length = Math.min(a.length, b.length);
  const result: Array<[A, B]> = [];

  for (let i = 0; i < length; i++) {
    result.push([a[i], b[i]]);
  }

  return result;
}

/**
 * Unzip array of tuples
 */
export function unzip<A, B>(arr: Array<[A, B]>): [A[], B[]] {
  const as: A[] = [];
  const bs: B[] = [];

  for (const [a, b] of arr) {
    as.push(a);
    bs.push(b);
  }

  return [as, bs];
}

// ============================================================================
// Missing Utilities (Added for Test Compatibility)
// ============================================================================

/**
 * Throttle a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastFn: ReturnType<typeof setTimeout>;
  let lastTime: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(
        () => {
          if (Date.now() - lastTime >= wait) {
            fn.apply(this, args);
            lastTime = Date.now();
          }
        },
        Math.max(wait - (Date.now() - lastTime), 0)
      );
    }
  };
}

/**
 * Run a function only once
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function once<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  let called = false;
  let result: ReturnType<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: Parameters<T>) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}

/**
 * Combine two predicates with AND
 */
export function both<T>(
  p1: (a: T) => boolean,
  p2: (a: T) => boolean
): (a: T) => boolean {
  return (a: T) => p1(a) && p2(a);
}

/**
 * Combine two predicates with OR
 */
export function either<T>(
  p1: (a: T) => boolean,
  p2: (a: T) => boolean
): (a: T) => boolean {
  return (a: T) => p1(a) || p2(a);
}

/**
 * Check if all predicates pass
 */
export function allPass<T>(preds: Array<(a: T) => boolean>): (a: T) => boolean {
  return (a: T) => preds.every(p => p(a));
}

/**
 * Check if any predicate passes
 */
export function anyPass<T>(preds: Array<(a: T) => boolean>): (a: T) => boolean {
  return (a: T) => preds.some(p => p(a));
}

/**
 * Iterate over array
 */
export function forEach<T>(arr: T[], fn: (value: T) => void): void {
  arr.forEach(fn);
}

/**
 * Map array
 */
export function map<T, U>(arr: T[], fn: (value: T) => U): U[] {
  return arr.map(fn);
}

/**
 * Filter array
 */
export function filter<T>(arr: T[], fn: (value: T) => boolean): T[] {
  return arr.filter(fn);
}

/**
 * Reduce array
 */
export function reduce<T, U>(
  arr: T[],
  fn: (acc: U, value: T) => U,
  initial: U
): U {
  return arr.reduce(fn, initial);
}

/**
 * FlatMap array
 */
export function flatMap<T, U>(arr: T[], fn: (value: T) => U[]): U[] {
  return arr.flatMap(fn);
}

/**
 * Check if value is null or undefined
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is not null or undefined
 */
export function isNotNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is empty (string, array, object)
 */
export function isEmpty(value: unknown): boolean {
  if (isNil(value)) return true;
  if (typeof value === 'string' || Array.isArray(value))
    return value.length === 0;
  if (typeof value === 'object')
    return Object.keys(value as object).length === 0;
  return false;
}

/**
 * Check if value is not empty
 */
export function isNotEmpty(value: unknown): boolean {
  return !isEmpty(value);
}

/**
 * Partial application from right
 */
export function partialRight<T1, T2, R>(
  fn: (a: T1, b: T2) => R,
  b: T2
): (a: T1) => R {
  return (a: T1) => fn(a, b);
}

/**
 * Memoize a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * Debounce a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Flow functions (left to right composition)
 */
export function flow<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C {
  return (a: A) => g(f(a));
}

/**
 * Create Result from Promise
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    return err(e as E);
  }
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Map over array with async function
 */
export async function mapAsync<T, U>(
  arr: T[],
  fn: (value: T, index: number) => Promise<U>
): Promise<U[]> {
  return Promise.all(arr.map(fn));
}

/**
 * Filter array with async predicate
 */
export async function filterAsync<T>(
  arr: T[],
  predicate: (value: T, index: number) => Promise<boolean>
): Promise<T[]> {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_, i) => results[i]);
}

/**
 * Reduce array with async reducer
 */
export async function reduceAsync<T, U>(
  arr: T[],
  reducer: (acc: U, value: T, index: number) => Promise<U>,
  initial: U
): Promise<U> {
  let acc = initial;
  for (let i = 0; i < arr.length; i++) {
    acc = await reducer(acc, arr[i], i);
  }
  return acc;
}

/**
 * Find with async predicate
 */
export async function findAsync<T>(
  arr: T[],
  predicate: (value: T, index: number) => Promise<boolean>
): Promise<Option<T>> {
  for (let i = 0; i < arr.length; i++) {
    if (await predicate(arr[i], i)) {
      return some(arr[i]);
    }
  }
  return none;
}

// ============================================================================
// Export Default
// ============================================================================

export const functional = {
  // Option
  Some,
  None,
  none,
  some,
  fromNullable,
  fromPredicate,
  tryCatch,

  // Result
  Ok,
  Err,
  ok,
  err,
  tryResult,
  tryResultAsync,

  // Either
  Left,
  Right,
  left,
  right,

  // Lazy
  Lazy,
  lazy,

  // Composition
  compose,
  pipe,
  pipeline,
  curry,
  partial,
  flip,
  constant,
  identity,
  noop,
  always,
  never,

  // Predicates
  not,
  and,
  or,
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  between,
  prop,

  // Collections
  head,
  tail,
  last,
  init,
  at,
  findOption,
  getProp,
  partition,
  zip,
  unzip,

  // Async
  mapAsync,
  filterAsync,
  reduceAsync,
  findAsync,
};
