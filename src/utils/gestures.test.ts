import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateVelocity,
  detectSwipeDirection,
  GestureDetector,
  type GestureConfig,
} from './gestures';

type TouchLike = { clientX: number; clientY: number; identifier: number };

type TouchEventLike = {
  touches: TouchLike[];
  changedTouches: TouchLike[];
  preventDefault?: () => void;
};

function touch(x: number, y: number, id = 1): TouchLike {
  return { clientX: x, clientY: y, identifier: id };
}

describe('gestures utilities', () => {
  it('detectSwipeDirection returns left/right for horizontal deltas', () => {
    expect(detectSwipeDirection(0, 0, 100, 10)).toBe('right');
    expect(detectSwipeDirection(0, 0, -100, 10)).toBe('left');
  });

  it('detectSwipeDirection returns up/down for vertical deltas', () => {
    expect(detectSwipeDirection(0, 0, 10, 100)).toBe('down');
    expect(detectSwipeDirection(0, 0, 10, -100)).toBe('up');
  });

  it('calculateVelocity returns 0 for invalid duration', () => {
    expect(calculateVelocity(100, 0)).toBe(0);
    expect(calculateVelocity(100, -1)).toBe(0);
  });

  it('calculateVelocity returns px/ms', () => {
    expect(calculateVelocity(100, 50)).toBeCloseTo(2);
  });
});

describe('GestureDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onSwipe on touchend when threshold and duration match', () => {
    const el = document.createElement('div');
    const onSwipe = vi.fn();

    // Keep callbacks immediate for deterministic tests.
    const cfg: GestureConfig = {
      swipeThreshold: 40,
      swipeMaxDuration: 1000,
      debounceMs: 0,
      onSwipe,
    };

    // Capture listeners registered by the detector.
    const listeners: Record<string, (e: TouchEventLike) => void> = {};
    const add = el.addEventListener.bind(el);
    vi.spyOn(el, 'addEventListener').mockImplementation(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => {
        listeners[String(type)] = listener as unknown as (
          e: TouchEventLike
        ) => void;
        add(type, listener, options);
      }
    );

    const detector2 = new GestureDetector(el, cfg);

    listeners.touchstart?.({
      touches: [touch(0, 0, 1)],
      changedTouches: [touch(0, 0, 1)],
    });

    vi.setSystemTime(new Date('2026-01-01T00:00:00.200Z'));

    listeners.touchend?.({
      touches: [],
      changedTouches: [touch(60, 0, 1)],
    });

    expect(onSwipe).toHaveBeenCalledTimes(1);
    const evt = onSwipe.mock.calls[0]?.[0];
    expect(evt.direction).toBe('right');

    detector2.destroy();
  });

  it('fires onLongPress after delay when there is no movement', () => {
    const el = document.createElement('div');
    const onLongPress = vi.fn();

    const listeners: Record<string, (e: TouchEventLike) => void> = {};
    const add = el.addEventListener.bind(el);
    vi.spyOn(el, 'addEventListener').mockImplementation(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => {
        listeners[String(type)] = listener as unknown as (
          e: TouchEventLike
        ) => void;
        add(type, listener, options);
      }
    );

    const detector = new GestureDetector(el, {
      longPressDelay: 500,
      debounceMs: 0,
      onLongPress,
    });

    listeners.touchstart?.({
      touches: [touch(10, 10, 1)],
      changedTouches: [touch(10, 10, 1)],
    });

    vi.advanceTimersByTime(600);

    expect(onLongPress).toHaveBeenCalledTimes(1);

    detector.destroy();
  });

  it('fires onPinch with scale for two-touch move', () => {
    const el = document.createElement('div');
    const onPinch = vi.fn();

    const listeners: Record<string, (e: TouchEventLike) => void> = {};
    const add = el.addEventListener.bind(el);
    vi.spyOn(el, 'addEventListener').mockImplementation(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => {
        listeners[String(type)] = listener as unknown as (
          e: TouchEventLike
        ) => void;
        add(type, listener, options);
      }
    );

    const detector = new GestureDetector(el, {
      debounceMs: 0,
      onPinch,
    });

    // Initial pinch distance: 100
    listeners.touchstart?.({
      touches: [touch(0, 0, 1), touch(100, 0, 2)],
      changedTouches: [touch(0, 0, 1), touch(100, 0, 2)],
    });

    // New distance: 200 => scale ~2
    listeners.touchmove?.({
      touches: [touch(0, 0, 1), touch(200, 0, 2)],
      changedTouches: [touch(0, 0, 1), touch(200, 0, 2)],
      preventDefault: vi.fn(),
    });

    expect(onPinch).toHaveBeenCalled();
    const evt = onPinch.mock.calls[0]?.[0];
    expect(evt.scale).toBeCloseTo(2);

    detector.destroy();
  });
});
