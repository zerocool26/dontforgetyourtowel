/**
 * Analytics Tracker Utility
 * @module utils/analytics-tracker
 * @description Handles client-side event tracking and page views.
 * This is a lightweight abstraction layer for analytics that can be
 * connected to various providers (GA4, Plausible, PostHog, etc.)
 */

type EventName = string;
type EventProperties = Record<string, string | number | boolean | undefined>;

/**
 * Analytics provider interface for custom integrations
 */
export interface AnalyticsProvider {
  /** Track a page view */
  trackPageView(path: string, referrer?: string): void;
  /** Track a custom event */
  trackEvent(name: string, properties?: EventProperties): void;
  /** Identify a user (optional) */
  identify?(userId: string, traits?: EventProperties): void;
}

interface AnalyticsConfig {
  /** Enable debug logging to console */
  debug?: boolean;
  /** Enable/disable analytics tracking */
  enabled?: boolean;
  /** Custom analytics provider implementation */
  provider?: AnalyticsProvider;
  /** Sample rate for events (0-1, defaults to 1) */
  sampleRate?: number;
}

/**
 * Console-based analytics provider for development
 */
const consoleProvider: AnalyticsProvider = {
  trackPageView(path: string, referrer?: string) {
    console.log('[Analytics] Page View:', { path, referrer });
  },
  trackEvent(name: string, properties?: EventProperties) {
    console.log('[Analytics] Event:', name, properties);
  },
  identify(userId: string, traits?: EventProperties) {
    console.log('[Analytics] Identify:', { userId, traits });
  },
};

class AnalyticsTracker {
  private config: Required<Omit<AnalyticsConfig, 'provider'>> & {
    provider?: AnalyticsProvider;
  } = {
    debug: import.meta.env.DEV,
    enabled:
      import.meta.env.PUBLIC_ENABLE_ANALYTICS === 'true' ||
      import.meta.env.PUBLIC_ENABLE_ANALYTICS === '1' ||
      import.meta.env.PUBLIC_ENABLE_ANALYTICS === 'yes' ||
      import.meta.env.PUBLIC_ENABLE_ANALYTICS === 'on',
    sampleRate: 1,
  };

  constructor(config?: AnalyticsConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Check if this event should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Get the active provider
   */
  private getProvider(): AnalyticsProvider | null {
    if (this.config.provider) return this.config.provider;
    if (this.config.debug) return consoleProvider;
    return null;
  }

  /**
   * Configure the analytics tracker
   * @param config - Configuration options
   */
  public configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set a custom analytics provider
   * @param provider - Analytics provider implementation
   * @example
   * analytics.setProvider({
   *   trackPageView: (path) => window.gtag?.('event', 'page_view', { page_path: path }),
   *   trackEvent: (name, props) => window.gtag?.('event', name, props)
   * });
   */
  public setProvider(provider: AnalyticsProvider): void {
    this.config.provider = provider;
  }

  /**
   * Track a page view
   * @param path - The page path to track
   * @param referrer - Optional referrer URL
   */
  public pageView(path: string, referrer?: string): void {
    if (!this.config.enabled || !this.shouldSample()) return;

    const provider = this.getProvider();
    provider?.trackPageView(path, referrer);
  }

  /**
   * Track a custom event
   * @param name - Event name
   * @param properties - Optional event properties
   */
  public track(name: EventName, properties?: EventProperties): void {
    if (!this.config.enabled || !this.shouldSample()) return;

    const provider = this.getProvider();
    provider?.trackEvent(name, properties);
  }

  /**
   * Identify a user for analytics
   * @param userId - Unique user identifier
   * @param traits - Optional user traits
   */
  public identify(userId: string, traits?: EventProperties): void {
    if (!this.config.enabled) return;

    const provider = this.getProvider();
    provider?.identify?.(userId, traits);
  }

  /**
   * Track a timing event
   * @param category - Timing category
   * @param variable - Timing variable name
   * @param duration - Duration in milliseconds
   */
  public timing(category: string, variable: string, duration: number): void {
    this.track('timing', { category, variable, duration });
  }
}

export const analytics = new AnalyticsTracker();
