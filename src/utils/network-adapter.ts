import { getNetworkInfo, watchNetworkStatus, type NetworkInfo } from './media';
import { useEffect, useState } from 'preact/hooks';

export type NetworkQuality = 'high' | 'medium' | 'low' | 'offline';

export type AdaptiveConfigState = {
  /** 0-100 (used only where build/runtime supports it) */
  imageQuality: number;
  /** Whether non-essential animations should run */
  enableAnimations: boolean;
  /** Whether we should prefetch non-critical routes/assets */
  prefetchEnabled: boolean;
  /** Whether we should autoplay video */
  videoAutoplay: boolean;
};

export type AdaptiveConfig = Record<NetworkQuality, AdaptiveConfigState>;

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  high: {
    imageQuality: 90,
    enableAnimations: true,
    prefetchEnabled: true,
    videoAutoplay: true,
  },
  medium: {
    imageQuality: 75,
    enableAnimations: true,
    prefetchEnabled: false,
    videoAutoplay: false,
  },
  low: {
    imageQuality: 60,
    enableAnimations: false,
    prefetchEnabled: false,
    videoAutoplay: false,
  },
  offline: {
    imageQuality: 50,
    enableAnimations: false,
    prefetchEnabled: false,
    videoAutoplay: false,
  },
};

function mergeAdaptiveConfig(
  base: AdaptiveConfig,
  overrides?: Partial<AdaptiveConfig>
): AdaptiveConfig {
  if (!overrides) return base;

  return {
    high: { ...base.high, ...overrides.high },
    medium: { ...base.medium, ...overrides.medium },
    low: { ...base.low, ...overrides.low },
    offline: { ...base.offline, ...overrides.offline },
  };
}

/**
 * Pure helper: classify a NetworkInfo into a coarse quality bucket.
 * Exported to keep unit tests deterministic.
 */
export function detectNetworkQuality(info: NetworkInfo): NetworkQuality {
  if (!info.online) return 'offline';

  // User explicitly requested data saver; treat as low.
  if (info.saveData) return 'low';

  // Effective type hints (where available).
  const et = (info.effectiveType || '').toLowerCase();
  if (et === 'slow-2g' || et === '2g') return 'low';
  if (et === '3g') return 'medium';
  if (et === '4g') return 'high';

  // Fallback heuristics when effectiveType is unavailable.
  // downlink is Mbps; rtt is ms.
  if (info.downlink <= 0.75 || info.rtt >= 700) return 'low';
  if (info.downlink <= 2 || info.rtt >= 300) return 'medium';

  return 'high';
}

export class NetworkAdapter {
  private quality: NetworkQuality;
  private config: AdaptiveConfig;
  private listeners: Set<(quality: NetworkQuality) => void> = new Set();
  private unsubscribeNetwork?: () => void;

  constructor(overrides?: Partial<AdaptiveConfig>) {
    this.config = mergeAdaptiveConfig(DEFAULT_ADAPTIVE_CONFIG, overrides);
    this.quality = detectNetworkQuality(getNetworkInfo());
    this.setupListeners();
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    this.unsubscribeNetwork = watchNetworkStatus(info => {
      this.updateQuality(info);
    });
  }

  private updateQuality(info?: NetworkInfo): void {
    const next = detectNetworkQuality(info ?? getNetworkInfo());
    if (next === this.quality) return;

    this.quality = next;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach(cb => cb(this.quality));
  }

  public getQuality(): NetworkQuality {
    return this.quality;
  }

  public getConfig(): AdaptiveConfigState {
    return this.config[this.quality];
  }

  public subscribe(callback: (quality: NetworkQuality) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public shouldEnableAnimations(): boolean {
    return this.getConfig().enableAnimations;
  }

  public getImageQuality(): number {
    return this.getConfig().imageQuality;
  }

  public shouldPrefetch(): boolean {
    return this.getConfig().prefetchEnabled;
  }

  public shouldAutoplayVideo(): boolean {
    return this.getConfig().videoAutoplay;
  }

  public destroy(): void {
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = undefined;
    this.listeners.clear();
  }
}

// Singleton instance (browser-safe; falls back to DEFAULT quality server-side).
export const networkAdapter = new NetworkAdapter();

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>(
    networkAdapter.getQuality()
  );

  useEffect(() => {
    return networkAdapter.subscribe(setQuality);
  }, []);

  return quality;
}
