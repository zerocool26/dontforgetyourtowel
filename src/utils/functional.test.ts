/**
 * Functional Programming Utilities Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  // Option
  some,
  none,
  fromNullable,
  fromPredicate,

  // Result
  ok,
  err,
  tryResult,
  tryResultAsync,
  fromPromise,

  // Either
  left,
  right,

  // Composition
  pipe,
  compose,
  flow,

  // Currying
  curry,
  partial,
  partialRight,

  // Lazy evaluation
  lazy,

  // Identity and constant
  identity,
  constant,
  noop,

  // Logic
  not,
  and,
  or,
  both,
  either,
  allPass,
  anyPass,

  // Collections
  head,
  tail,
  partition,
  zip,
  unzip,
  forEach,
  map,
  filter,
  reduce,
  flatMap,

  // Predicates
  isNil,
  isNotNil,
  isEmpty,
  isNotEmpty,

  // Higher-order
  memoize,
  debounce,
  throttle,
  once,
} from './functional';

describe('Functional Programming Utilities', () => {
  describe('Option Monad', () => {
    describe('Some', () => {
      it('should wrap a value', () => {
        const opt = some(5);
        expect(opt.isSome()).toBe(true);
        expect(opt.isNone()).toBe(false);
        expect(opt.unwrap()).toBe(5);
      });

      it('should map over value', () => {
        const opt = some(5).map(x => x * 2);
        expect(opt.unwrap()).toBe(10);
      });

      it('should flatMap', () => {
        const opt = some(5).flatMap(x => some(x * 2));
        expect(opt.unwrap()).toBe(10);
      });

      it('should filter', () => {
        expect(
          some(5)
            .filter(x => x > 0)
            .isSome()
        ).toBe(true);
        expect(
          some(5)
            .filter(x => x < 0)
            .isNone()
        ).toBe(true);
      });

      it('should return value on getOrElse', () => {
        expect(some(5).getOrElse(10)).toBe(5);
      });

      it('should return value on match', () => {
        const result = some(5).match({
          some: x => x * 2,
          none: () => 0,
        });
        expect(result).toBe(10);
      });
    });

    describe('None', () => {
      it('should represent no value', () => {
        const opt = none;
        expect(opt.isSome()).toBe(false);
        expect(opt.isNone()).toBe(true);
      });

      it('should throw on unwrap', () => {
        expect(() => none.unwrap()).toThrow();
      });

      it('should return default on getOrElse', () => {
        expect(none.getOrElse(10)).toBe(10);
      });

      it('should map to None', () => {
        const opt = none.map((x: number) => x * 2);
        expect(opt.isNone()).toBe(true);
      });

      it('should flatMap to None', () => {
        const opt = none.flatMap((x: number) => some(x * 2));
        expect(opt.isNone()).toBe(true);
      });

      it('should return none branch on match', () => {
        const result = none.match({
          some: (x: number) => x * 2,
          none: () => 0,
        });
        expect(result).toBe(0);
      });
    });

    describe('Helper Functions', () => {
      it('should create Option from nullable', () => {
        expect(fromNullable(5).isSome()).toBe(true);
        expect(fromNullable(null).isNone()).toBe(true);
        expect(fromNullable(undefined).isNone()).toBe(true);
      });

      it('should create Option from predicate', () => {
        expect(fromPredicate(5, x => x > 0).isSome()).toBe(true);
        expect(fromPredicate(5, x => x < 0).isNone()).toBe(true);
      });
    });
  });

  describe('Result Monad', () => {
    describe('Ok', () => {
      it('should wrap success value', () => {
        const result = ok(5);
        expect(result.isOk()).toBe(true);
        expect(result.isErr()).toBe(false);
        expect(result.unwrap()).toBe(5);
      });

      it('should map over value', () => {
        const result = ok(5).map(x => x * 2);
        expect(result.unwrap()).toBe(10);
      });

      it('should flatMap', () => {
        const result = ok(5).flatMap(x => ok(x * 2));
        expect(result.unwrap()).toBe(10);
      });

      it('should not mapErr', () => {
        const result = ok(5).mapErr((e: string) => e.toUpperCase());
        expect(result.unwrap()).toBe(5);
      });

      it('should return value on getOrElse', () => {
        expect(ok(5).getOrElse(10)).toBe(5);
      });

      it('should return ok branch on match', () => {
        const result = ok(5).match({
          ok: x => x * 2,
          err: () => 0,
        });
        expect(result).toBe(10);
      });
    });

    describe('Err', () => {
      it('should wrap error value', () => {
        const result = err('error');
        expect(result.isOk()).toBe(false);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('error');
      });

      it('should throw on unwrap', () => {
        expect(() => err('error').unwrap()).toThrow();
      });

      it('should map to same error', () => {
        const result = err('error').map((x: number) => x * 2);
        expect(result.unwrapErr()).toBe('error');
      });

      it('should mapErr', () => {
        const result = err('error').mapErr((e: string) => e.toUpperCase());
        expect(result.unwrapErr()).toBe('ERROR');
      });

      it('should return default on getOrElse', () => {
        expect(err('error').getOrElse(10)).toBe(10);
      });

      it('should return err branch on match', () => {
        const result = err('error').match({
          ok: (x: number) => x * 2,
          err: (e: string) => e.length,
        });
        expect(result).toBe(5);
      });
    });

    describe('Helper Functions', () => {
      it('should catch synchronous errors', () => {
        const result = tryResult(() => {
          throw new Error('test');
        });
        expect(result.isErr()).toBe(true);
      });

      it('should catch successful sync', () => {
        const result = tryResult(() => 5);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(5);
      });

      it('should catch async errors', async () => {
        const result = await tryResultAsync(async () => {
          throw new Error('test');
        });
        expect(result.isErr()).toBe(true);
      });

      it('should catch successful async', async () => {
        const result = await tryResultAsync(async () => 5);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(5);
      });

      it('should convert promise', async () => {
        const success = await fromPromise(Promise.resolve(5));
        expect(success.isOk()).toBe(true);

        const failure = await fromPromise(Promise.reject(new Error('test')));
        expect(failure.isErr()).toBe(true);
      });
    });
  });

  describe('Either Monad', () => {
    describe('Right', () => {
      it('should wrap right value', () => {
        const either = right(5);
        expect(either.isRight()).toBe(true);
        expect(either.isLeft()).toBe(false);
      });

      it('should map over right', () => {
        const either = right(5).map(x => x * 2);
        expect(either.isRight()).toBe(true);
        if (either.isRight()) {
          expect(either.unwrap()).toBe(10);
        }
      });

      it('should flatMap', () => {
        const either = right(5).flatMap(x => right(x * 2));
        expect(either.isRight()).toBe(true);
        if (either.isRight()) {
          expect(either.unwrap()).toBe(10);
        }
      });
    });

    describe('Left', () => {
      it('should wrap left value', () => {
        const either = left('error');
        expect(either.isLeft()).toBe(true);
        expect(either.isRight()).toBe(false);
      });

      it('should not map left', () => {
        const either = left('error').map((x: number) => x * 2);
        expect(either.isLeft()).toBe(true);
        if (either.isLeft()) {
          expect(either.unwrap()).toBe('error');
        }
      });

      it('should mapLeft', () => {
        const either = left('error').mapLeft((e: string) => e.toUpperCase());
        expect(either.isLeft()).toBe(true);
        if (either.isLeft()) {
          expect(either.unwrap()).toBe('ERROR');
        }
      });
    });
  });

  describe('Composition Functions', () => {
    it('should pipe functions left to right', () => {
      const add1 = (x: number) => x + 1;
      const mult2 = (x: number) => x * 2;

      const result = pipe(5, add1, mult2);
      expect(result).toBe(12); // (5 + 1) * 2
    });

    it('should compose functions right to left', () => {
      const add1 = (x: number) => x + 1;
      const mult2 = (x: number) => x * 2;

      const composed = compose(add1, mult2);
      expect(composed(5)).toBe(11); // (5 * 2) + 1
    });

    it('should flow functions left to right', () => {
      const add1 = (x: number) => x + 1;
      const mult2 = (x: number) => x * 2;

      const flowed = flow(add1, mult2);
      expect(flowed(5)).toBe(12); // (5 + 1) * 2
    });
  });

  describe('Currying Functions', () => {
    it('should curry functions', () => {
      const add = (a: number, b: number, c: number) => a + b + c;
      const curried = curry(add) as (
        a: number
      ) => (b: number) => (c: number) => number;

      expect(curried(1)(2)(3)).toBe(6);
      expect(curried(1, 2)(3)).toBe(6);
      expect(curried(1)(2, 3)).toBe(6);
      expect(curried(1, 2, 3)).toBe(6);
    });

    it('should partial apply from left', () => {
      const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
      const sayHello = partial(greet, 'Hello');

      expect(sayHello('World')).toBe('Hello, World!');
    });

    it('should partial apply from right', () => {
      const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
      const greetWorld = partialRight(greet, 'World');

      expect(greetWorld('Hello')).toBe('Hello, World!');
    });
  });

  describe('Higher-Order Functions', () => {
    it('should memoize', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);

      expect(memoized(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should debounce', async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      await new Promise(r => setTimeout(r, 100));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throttle', async () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 50);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      await new Promise(r => setTimeout(r, 100));
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call once', () => {
      const fn = vi.fn(() => 'result');
      const onceFn = once(fn);

      expect(onceFn()).toBe('result');
      expect(onceFn()).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lazy Evaluation', () => {
    it('should defer computation', () => {
      const fn = vi.fn(() => 42);
      const lazyValue = lazy(fn);

      expect(fn).not.toHaveBeenCalled();

      expect(lazyValue.get()).toBe(42);
      expect(fn).toHaveBeenCalledTimes(1);

      // Cached
      expect(lazyValue.get()).toBe(42);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should map lazily', () => {
      const lazyValue = lazy(() => 5).map(x => x * 2);
      expect(lazyValue.get()).toBe(10);
    });
  });

  describe('Identity and Constant', () => {
    it('should return identity', () => {
      expect(identity(5)).toBe(5);
      expect(identity('hello')).toBe('hello');
    });

    it('should return constant', () => {
      const five = constant(5);
      expect(five()).toBe(5);
      expect(five('ignored')).toBe(5);
    });

    it('should do nothing', () => {
      expect(noop()).toBeUndefined();
    });
  });

  describe('Logic Functions', () => {
    it('should negate predicate', () => {
      const isEven = (x: number) => x % 2 === 0;
      const isOdd = not(isEven);

      expect(isOdd(3)).toBe(true);
      expect(isOdd(4)).toBe(false);
    });

    it('should combine with both', () => {
      const isPositive = (x: number) => x > 0;
      const isEven = (x: number) => x % 2 === 0;
      const isPositiveEven = both(isPositive, isEven);

      expect(isPositiveEven(4)).toBe(true);
      expect(isPositiveEven(-4)).toBe(false);
      expect(isPositiveEven(3)).toBe(false);
    });

    it('should combine with either', () => {
      const isZero = (x: number) => x === 0;
      const isNegative = (x: number) => x < 0;
      const isZeroOrNegative = either(isZero, isNegative);

      expect(isZeroOrNegative(0)).toBe(true);
      expect(isZeroOrNegative(-1)).toBe(true);
      expect(isZeroOrNegative(1)).toBe(false);
    });

    it('should check allPass', () => {
      const checks = [
        (x: number) => x > 0,
        (x: number) => x < 100,
        (x: number) => x % 2 === 0,
      ];
      const isValid = allPass(checks);

      expect(isValid(50)).toBe(true);
      expect(isValid(51)).toBe(false);
    });

    it('should check anyPass', () => {
      const checks = [(x: number) => x === 0, (x: number) => x === 1];
      const isZeroOrOne = anyPass(checks);

      expect(isZeroOrOne(0)).toBe(true);
      expect(isZeroOrOne(1)).toBe(true);
      expect(isZeroOrOne(2)).toBe(false);
    });
  });

  describe('Iteration Functions', () => {
    it('should forEach', () => {
      const results: number[] = [];
      forEach([1, 2, 3], x => results.push(x * 2));
      expect(results).toEqual([2, 4, 6]);
    });

    it('should map', () => {
      const result = map([1, 2, 3], x => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    it('should filter', () => {
      const result = filter([1, 2, 3, 4], x => x % 2 === 0);
      expect(result).toEqual([2, 4]);
    });

    it('should reduce', () => {
      const result = reduce([1, 2, 3], (acc, x) => acc + x, 0);
      expect(result).toBe(6);
    });

    it('should flatMap', () => {
      const result = flatMap([1, 2, 3], x => [x, x * 2]);
      expect(result).toEqual([1, 2, 2, 4, 3, 6]);
    });
  });

  describe('Predicates', () => {
    it('should check nil', () => {
      expect(isNil(null)).toBe(true);
      expect(isNil(undefined)).toBe(true);
      expect(isNil(0)).toBe(false);
      expect(isNil('')).toBe(false);
    });

    it('should check not nil', () => {
      expect(isNotNil(0)).toBe(true);
      expect(isNotNil('')).toBe(true);
      expect(isNotNil(null)).toBe(false);
    });

    it('should check empty', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty({})).toBe(true);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty('a')).toBe(false);
    });

    it('should check not empty', () => {
      expect(isNotEmpty([1])).toBe(true);
      expect(isNotEmpty('a')).toBe(true);
      expect(isNotEmpty([])).toBe(false);
    });
  });
});
