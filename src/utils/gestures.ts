import { useEffect, useRef } from 'preact/hooks';

export interface GestureConfig {
  /** Minimum distance (px) to qualify as a swipe. */
  swipeThreshold?: number; // Default: 50px
  /** Maximum time (ms) to qualify as a swipe. */
  swipeMaxDuration?: number; // Default: 700ms
  /** If true, the detector may call preventDefault() during horizontal swipes. */
  preventScrollDuringSwipe?: boolean; // Default: true
  /** Long press delay (ms). */
  longPressDelay?: number; // Default: 500ms
  /** Maximum movement (px) allowed before long-press cancels. */
  longPressMaxMove?: number; // Default: 10px
  /** Minimum time (ms) between high-frequency callbacks (e.g., pinch). */
  debounceMs?: number; // Default: 16ms
  /** Disable all gesture handling when false. */
  enabled?: boolean; // Default: true

  onSwipe?: (e: SwipeEvent) => void;
  onPinch?: (e: PinchEvent) => void;
  onLongPress?: (e: LongPressEvent) => void;
}

export interface SwipeEvent {
  direction: 'up' | 'down' | 'left' | 'right';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  distance: number;
  duration: number;
  velocity: number;
  originalEvent: TouchEvent;
}

export interface PinchEvent {
  /** Relative scale to the initial pinch distance. */
  scale: number;
  centerX: number;
  centerY: number;
  distance: number;
  originalEvent: TouchEvent;
}

export interface LongPressEvent {
  x: number;
  y: number;
  originalEvent: TouchEvent;
}

type TouchLike = { clientX: number; clientY: number; identifier: number };

function getTouchById(touches: TouchList | TouchLike[], id: number) {
  for (let i = 0; i < touches.length; i++) {
    const t = touches[i] as unknown as TouchLike;
    if (t.identifier === id) return t;
  }
  return null;
}

function getDistance(a: TouchLike, b: TouchLike) {
  const dx = b.clientX - a.clientX;
  const dy = b.clientY - a.clientY;
  return Math.hypot(dx, dy);
}

function getCenter(a: TouchLike, b: TouchLike) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function clampNonNegative(n: number) {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function shouldHandle(cfg: Required<Pick<GestureConfig, 'enabled'>>) {
  return cfg.enabled !== false;
}

function makeThrottled<Args extends unknown[]>(
  fn: (...args: Args) => void,
  intervalMs: number
): (...args: Args) => void {
  const interval = clampNonNegative(intervalMs);
  if (interval === 0) return fn;

  let last = 0;
  return (...args: Args) => {
    const now = Date.now();
    if (now - last < interval) return;
    last = now;
    fn(...args);
  };
}

export class GestureDetector {
  private element: HTMLElement;
  private config: Required<GestureConfig>;

  private startX = 0;
  private startY = 0;
  private startAt = 0;
  private activeTouchId: number | null = null;

  private longPressTimer: number | null = null;
  private longPressFired = false;

  private pinchIds: [number, number] | null = null;
  private pinchStartDistance = 0;

  private onTouchStartBound: (e: TouchEvent) => void;
  private onTouchMoveBound: (e: TouchEvent) => void;
  private onTouchEndBound: (e: TouchEvent) => void;
  private onTouchCancelBound: (e: TouchEvent) => void;
  private onScrollBound: () => void;

  private emitPinch: (e: PinchEvent) => void;

  constructor(element: HTMLElement, config: GestureConfig = {}) {
    this.element = element;

    this.config = {
      swipeThreshold: config.swipeThreshold ?? 50,
      swipeMaxDuration: config.swipeMaxDuration ?? 700,
      preventScrollDuringSwipe: config.preventScrollDuringSwipe ?? true,
      longPressDelay: config.longPressDelay ?? 500,
      longPressMaxMove: config.longPressMaxMove ?? 10,
      debounceMs: config.debounceMs ?? 16,
      enabled: config.enabled ?? true,
      onSwipe: config.onSwipe ?? (() => {}),
      onPinch: config.onPinch ?? (() => {}),
      onLongPress: config.onLongPress ?? (() => {}),
    };

    this.emitPinch = makeThrottled(
      (evt: PinchEvent) => this.config.onPinch(evt),
      this.config.debounceMs
    );

    this.onTouchStartBound = e => this.onTouchStart(e);
    this.onTouchMoveBound = e => this.onTouchMove(e);
    this.onTouchEndBound = e => this.onTouchEnd(e);
    this.onTouchCancelBound = () => this.reset();
    this.onScrollBound = () => this.reset();

    // Always keep start/end listeners passive.
    this.element.addEventListener('touchstart', this.onTouchStartBound, {
      passive: true,
    });

    // touchmove is only non-passive if we intend to prevent scrolling.
    this.element.addEventListener('touchmove', this.onTouchMoveBound, {
      passive: !this.config.preventScrollDuringSwipe,
    });

    this.element.addEventListener('touchend', this.onTouchEndBound, {
      passive: true,
    });
    this.element.addEventListener('touchcancel', this.onTouchCancelBound, {
      passive: true,
    });

    // Cancel active gestures on scroll to reduce accidental triggers.
    window.addEventListener('scroll', this.onScrollBound, { passive: true });
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.onTouchStartBound);
    this.element.removeEventListener('touchmove', this.onTouchMoveBound);
    this.element.removeEventListener('touchend', this.onTouchEndBound);
    this.element.removeEventListener('touchcancel', this.onTouchCancelBound);
    window.removeEventListener('scroll', this.onScrollBound);
    this.reset();
  }

  private reset() {
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
    }
    this.longPressTimer = null;
    this.longPressFired = false;
    this.activeTouchId = null;
    this.pinchIds = null;
    this.pinchStartDistance = 0;
  }

  private onTouchStart(e: TouchEvent) {
    if (!shouldHandle(this.config)) return;

    // Ignore if already tracking; only one active gesture sequence.
    if (this.activeTouchId !== null || this.pinchIds !== null) return;

    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.activeTouchId = t.identifier;
      this.startX = t.clientX;
      this.startY = t.clientY;
      this.startAt = Date.now();
      this.longPressFired = false;

      this.longPressTimer = window.setTimeout(() => {
        if (!shouldHandle(this.config)) return;
        if (this.longPressFired) return;
        if (this.activeTouchId === null) return;

        this.longPressFired = true;
        this.config.onLongPress({
          x: this.startX,
          y: this.startY,
          originalEvent: e,
        });
      }, this.config.longPressDelay);

      return;
    }

    if (e.touches.length >= 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      this.pinchIds = [a.identifier, b.identifier];
      this.pinchStartDistance = getDistance(a, b);

      if (this.longPressTimer !== null) {
        window.clearTimeout(this.longPressTimer);
      }
      this.longPressTimer = null;
      this.longPressFired = false;
    }
  }

  private onTouchMove(e: TouchEvent) {
    if (!shouldHandle(this.config)) return;

    // Pinch path (2+ touches)
    if (this.pinchIds && e.touches.length >= 2) {
      const [idA, idB] = this.pinchIds;
      const a = getTouchById(e.touches, idA);
      const b = getTouchById(e.touches, idB);
      if (!a || !b) return;

      const distance = getDistance(a, b);
      const start = this.pinchStartDistance || 1;
      const scale = distance / start;
      const center = getCenter(a, b);

      this.emitPinch({
        scale,
        centerX: center.x,
        centerY: center.y,
        distance,
        originalEvent: e,
      });
      return;
    }

    // Swipe/long-press path (single touch)
    if (this.activeTouchId === null) return;

    const t = getTouchById(e.touches, this.activeTouchId);
    if (!t) return;

    const dx = t.clientX - this.startX;
    const dy = t.clientY - this.startY;

    // Cancel long-press if the user moved too much.
    if (
      this.longPressTimer !== null &&
      (Math.abs(dx) > this.config.longPressMaxMove ||
        Math.abs(dy) > this.config.longPressMaxMove)
    ) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // If this looks like a horizontal swipe, optionally prevent scrolling.
    if (
      this.config.preventScrollDuringSwipe &&
      Math.abs(dx) > Math.abs(dy) &&
      Math.abs(dx) > 8
    ) {
      // Only works if listener is non-passive.
      e.preventDefault?.();
    }
  }

  private onTouchEnd(e: TouchEvent) {
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
    }
    this.longPressTimer = null;

    if (!shouldHandle(this.config)) {
      this.reset();
      return;
    }

    // Ignore swipe if a long-press has fired (avoid double-trigger).
    if (this.longPressFired) {
      this.reset();
      return;
    }

    // If pinch ended, reset.
    if (this.pinchIds) {
      this.reset();
      return;
    }

    if (this.activeTouchId === null) return;

    const changed = getTouchById(e.changedTouches, this.activeTouchId);
    if (!changed) {
      this.reset();
      return;
    }

    const endX = changed.clientX;
    const endY = changed.clientY;
    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const duration = Date.now() - this.startAt;

    const distance = Math.hypot(dx, dy);

    const thresholdHit =
      Math.max(Math.abs(dx), Math.abs(dy)) >= this.config.swipeThreshold;
    const durationOk = duration <= this.config.swipeMaxDuration;

    if (thresholdHit && durationOk) {
      const direction = detectSwipeDirection(
        this.startX,
        this.startY,
        endX,
        endY
      );
      const velocity = calculateVelocity(distance, duration);

      this.config.onSwipe({
        direction,
        startX: this.startX,
        startY: this.startY,
        endX,
        endY,
        deltaX: dx,
        deltaY: dy,
        distance,
        duration,
        velocity,
        originalEvent: e,
      });
    }

    this.reset();
  }
}

export type RefObject<T> = { current: T | null };

export interface GestureHandlers {
  onSwipe?: (e: SwipeEvent) => void;
  onPinch?: (e: PinchEvent) => void;
  onLongPress?: (e: LongPressEvent) => void;
}

export function useGesture(
  ref: RefObject<HTMLElement>,
  handlers: GestureHandlers,
  config: GestureConfig = {}
): void {
  const handlersRef = useRef<GestureHandlers>(handlers);
  handlersRef.current = handlers;

  const configRef = useRef<GestureConfig>(config);
  configRef.current = config;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const detector = new GestureDetector(el, {
      ...configRef.current,
      onSwipe: e => handlersRef.current.onSwipe?.(e),
      onPinch: e => handlersRef.current.onPinch?.(e),
      onLongPress: e => handlersRef.current.onLongPress?.(e),
    });

    return () => detector.destroy();
  }, [ref]);
}

export function detectSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): SwipeEvent['direction'] {
  const dx = endX - startX;
  const dy = endY - startY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'down' : 'up';
}

export function calculateVelocity(distance: number, duration: number): number {
  if (
    !Number.isFinite(distance) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return 0;
  }
  return distance / duration;
}
