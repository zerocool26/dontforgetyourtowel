/**
 * Swipe Gesture Detection Utility
 * Provides robust touch gesture recognition for mobile galleries and carousels
 */

export interface SwipeConfig {
  /** Minimum distance (px) to register as swipe */
  threshold?: number;
  /** Maximum time (ms) for swipe */
  maxDuration?: number;
  /** Minimum velocity (px/ms) */
  minVelocity?: number;
  /** Enable haptic feedback */
  haptic?: boolean;
  /** Lock scroll during swipe */
  preventScroll?: boolean;
}

export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type SwipeHandler = (event: SwipeEvent) => void;

const DEFAULT_CONFIG: Required<SwipeConfig> = {
  threshold: 50,
  maxDuration: 500,
  minVelocity: 0.3,
  haptic: true,
  preventScroll: true,
};

export class SwipeDetector {
  private element: HTMLElement;
  private config: Required<SwipeConfig>;
  private handlers: {
    onSwipeLeft?: SwipeHandler;
    onSwipeRight?: SwipeHandler;
    onSwipeUp?: SwipeHandler;
    onSwipeDown?: SwipeHandler;
    onSwipe?: SwipeHandler;
  } = {};

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private isSwiping = false;

  constructor(element: HTMLElement, config: SwipeConfig = {}) {
    this.element = element;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart, {
      passive: !this.config.preventScroll,
    });
    this.element.addEventListener('touchmove', this.handleTouchMove, {
      passive: !this.config.preventScroll,
    });
    this.element.addEventListener('touchend', this.handleTouchEnd);
    this.element.addEventListener('touchcancel', this.handleTouchCancel);
  }

  private handleTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isSwiping = false;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isSwiping && this.config.preventScroll) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - this.touchStartX);
      const deltaY = Math.abs(touch.clientY - this.touchStartY);

      // If horizontal swipe is dominant, prevent vertical scroll
      if (deltaX > deltaY && deltaX > 10) {
        this.isSwiping = true;
        e.preventDefault();
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - this.touchStartX;
    const deltaY = endY - this.touchStartY;
    const duration = endTime - this.touchStartTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const distance = Math.max(absX, absY);
    const velocity = distance / duration;

    // Check if swipe meets thresholds
    if (
      distance >= this.config.threshold &&
      duration <= this.config.maxDuration &&
      velocity >= this.config.minVelocity
    ) {
      const direction = this.getSwipeDirection(deltaX, deltaY);
      const swipeEvent: SwipeEvent = {
        direction,
        distance,
        velocity,
        duration,
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX,
        endY,
      };

      this.triggerHaptic();
      this.handleSwipe(swipeEvent);
    }

    this.isSwiping = false;
  };

  private handleTouchCancel = (): void => {
    this.isSwiping = false;
  };

  private getSwipeDirection(
    deltaX: number,
    deltaY: number
  ): 'left' | 'right' | 'up' | 'down' {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  private handleSwipe(event: SwipeEvent): void {
    // Call general swipe handler
    this.handlers.onSwipe?.(event);

    // Call direction-specific handler
    switch (event.direction) {
      case 'left':
        this.handlers.onSwipeLeft?.(event);
        break;
      case 'right':
        this.handlers.onSwipeRight?.(event);
        break;
      case 'up':
        this.handlers.onSwipeUp?.(event);
        break;
      case 'down':
        this.handlers.onSwipeDown?.(event);
        break;
    }
  }

  private triggerHaptic(): void {
    if (this.config.haptic && 'vibrate' in navigator) {
      navigator.vibrate(10); // Light tap
    }
  }

  /**
   * Register swipe handlers
   */
  public on(
    direction: 'left' | 'right' | 'up' | 'down' | 'any',
    handler: SwipeHandler
  ): this {
    if (direction === 'any') {
      this.handlers.onSwipe = handler;
    } else {
      const key =
        `onSwipe${direction.charAt(0).toUpperCase() + direction.slice(1)}` as keyof typeof this.handlers;
      this.handlers[key] = handler;
    }
    return this;
  }

  /**
   * Cleanup and remove event listeners
   */
  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }
}

/**
 * Simple swipe hook for Astro components
 */
export function setupSwipe(
  element: HTMLElement | null,
  handlers: {
    onSwipeLeft?: SwipeHandler;
    onSwipeRight?: SwipeHandler;
    onSwipeUp?: SwipeHandler;
    onSwipeDown?: SwipeHandler;
  },
  config?: SwipeConfig
): SwipeDetector | null {
  if (!element) return null;

  const detector = new SwipeDetector(element, config);

  if (handlers.onSwipeLeft) detector.on('left', handlers.onSwipeLeft);
  if (handlers.onSwipeRight) detector.on('right', handlers.onSwipeRight);
  if (handlers.onSwipeUp) detector.on('up', handlers.onSwipeUp);
  if (handlers.onSwipeDown) detector.on('down', handlers.onSwipeDown);

  return detector;
}

/**
 * Gallery/Carousel swipe helper
 */
export function setupGallerySwipe(
  gallery: HTMLElement | null,
  onNext: () => void,
  onPrev: () => void,
  config?: SwipeConfig
): SwipeDetector | null {
  if (!gallery) return null;

  return setupSwipe(
    gallery,
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrev,
    },
    config
  );
}
