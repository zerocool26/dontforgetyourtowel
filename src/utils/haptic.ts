/**
 * Haptic Feedback Utility
 * Provides cross-platform haptic/vibration feedback for improved mobile UX
 */

export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

interface HapticConfig {
  /** Enable/disable haptics globally */
  enabled?: boolean;
  /** Respect user's reduced motion preference */
  respectReducedMotion?: boolean;
}

const DEFAULT_CONFIG: Required<HapticConfig> = {
  enabled: true,
  respectReducedMotion: true,
};

/**
 * Vibration patterns (in milliseconds)
 */
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10, // Quick tap
  medium: 20, // Standard feedback
  heavy: 30, // Strong feedback
  success: [10, 50, 10], // Double tap
  warning: [20, 50, 20, 50, 20], // Triple tap
  error: [30, 100, 30], // Strong double tap
  selection: 5, // Subtle selection feedback
};

class HapticManager {
  private config: Required<HapticConfig>;
  private isSupported: boolean;

  constructor(config: HapticConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isSupported = 'vibrate' in navigator;
  }

  /**
   * Check if haptics are available and enabled
   */
  private canVibrate(): boolean {
    if (!this.config.enabled || !this.isSupported) {
      return false;
    }

    // Respect reduced motion preference
    if (
      this.config.respectReducedMotion &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return false;
    }

    return true;
  }

  /**
   * Trigger haptic feedback with a specific pattern
   */
  public trigger(pattern: HapticPattern): void {
    if (!this.canVibrate()) return;

    const vibrationPattern = PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
  }

  /**
   * Trigger custom vibration pattern
   */
  public custom(pattern: number | number[]): void {
    if (!this.canVibrate()) return;
    navigator.vibrate(pattern);
  }

  /**
   * Stop any ongoing vibration
   */
  public stop(): void {
    if (this.isSupported) {
      navigator.vibrate(0);
    }
  }

  /**
   * Enable haptics
   */
  public enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable haptics
   */
  public disable(): void {
    this.config.enabled = false;
    this.stop();
  }

  /**
   * Check if haptics are currently enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled && this.isSupported;
  }
}

// Global singleton instance
let hapticInstance: HapticManager | null = null;

/**
 * Get or create the global haptic manager instance
 */
export function getHaptic(config?: HapticConfig): HapticManager {
  if (!hapticInstance) {
    hapticInstance = new HapticManager(config);
  }
  return hapticInstance;
}

/**
 * Convenient shorthand functions
 */
export const haptic = {
  light: () => getHaptic().trigger('light'),
  medium: () => getHaptic().trigger('medium'),
  heavy: () => getHaptic().trigger('heavy'),
  success: () => getHaptic().trigger('success'),
  warning: () => getHaptic().trigger('warning'),
  error: () => getHaptic().trigger('error'),
  selection: () => getHaptic().trigger('selection'),
  custom: (pattern: number | number[]) => getHaptic().custom(pattern),
  stop: () => getHaptic().stop(),
  enable: () => getHaptic().enable(),
  disable: () => getHaptic().disable(),
  isSupported: () => 'vibrate' in navigator,
};

/**
 * Add haptic feedback to elements via data attributes
 * Usage: <button data-haptic="medium">Click me</button>
 */
export function initHapticAttributes(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-haptic]');

  elements.forEach(element => {
    const pattern = element.getAttribute('data-haptic') as HapticPattern;

    if (pattern && PATTERNS[pattern]) {
      element.addEventListener('click', () => {
        haptic[pattern]?.();
      });

      // Also add on touch for mobile
      element.addEventListener(
        'touchstart',
        () => {
          haptic[pattern]?.();
        },
        { passive: true }
      );
    }
  });
}

/**
 * Add haptic feedback to form elements
 */
export function initFormHaptics(): void {
  // Input focus
  const inputs = document.querySelectorAll<HTMLInputElement>(
    'input, textarea, select'
  );
  inputs.forEach(input => {
    input.addEventListener('focus', () => haptic.selection());
  });

  // Checkbox/radio toggle
  const toggles = document.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"], input[type="radio"]'
  );
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => haptic.light());
  });

  // Button clicks
  const buttons = document.querySelectorAll<HTMLButtonElement>('button');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.type === 'submit') {
        haptic.medium();
      } else {
        haptic.light();
      }
    });
  });
}

/**
 * Add haptic feedback to navigation
 */
export function initNavigationHaptics(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href]');

  links.forEach(link => {
    link.addEventListener('click', _e => {
      // Don't trigger for external links or hash links
      if (
        link.hostname !== window.location.hostname ||
        link.getAttribute('href')?.startsWith('#')
      ) {
        return;
      }

      haptic.light();
    });
  });
}

/**
 * Initialize all haptic feedback automatically
 */
export function initAllHaptics(): void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHapticAttributes();
      initFormHaptics();
      initNavigationHaptics();
    });
  } else {
    initHapticAttributes();
    initFormHaptics();
    initNavigationHaptics();
  }

  // Re-initialize on Astro page transitions
  document.addEventListener('astro:page-load', () => {
    initHapticAttributes();
    initFormHaptics();
    initNavigationHaptics();
  });
}
