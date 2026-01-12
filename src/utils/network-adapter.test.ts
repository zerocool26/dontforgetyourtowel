import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NetworkAdapter,
  detectNetworkQuality,
  type NetworkQuality,
} from './network-adapter';

function stubNavigator(args: {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}) {
  vi.stubGlobal('navigator', {
    onLine: args.online,
    connection: {
      effectiveType: args.effectiveType,
      downlink: args.downlink,
      rtt: args.rtt,
      saveData: args.saveData,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

describe('network-adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('window', window);
    stubNavigator({ online: true, effectiveType: '4g', downlink: 10, rtt: 50 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('detectNetworkQuality', () => {
    it('returns offline when navigator is offline', () => {
      expect(
        detectNetworkQuality({
          online: false,
          type: 'unknown',
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false,
        })
      ).toBe('offline');
    });

    it('returns low when saveData is enabled', () => {
      expect(
        detectNetworkQuality({
          online: true,
          type: 'unknown',
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: true,
        })
      ).toBe('low');
    });

    it('maps effectiveType 2g/3g/4g to low/medium/high', () => {
      const base = {
        online: true,
        type: 'unknown',
        downlink: 10,
        rtt: 50,
        saveData: false,
      };

      expect(detectNetworkQuality({ ...base, effectiveType: '2g' })).toBe(
        'low'
      );
      expect(detectNetworkQuality({ ...base, effectiveType: '3g' })).toBe(
        'medium'
      );
      expect(detectNetworkQuality({ ...base, effectiveType: '4g' })).toBe(
        'high'
      );
    });

    it('uses downlink/rtt heuristics when effectiveType is missing', () => {
      const base = {
        online: true,
        type: 'unknown',
        effectiveType: '',
        saveData: false,
      };

      expect(detectNetworkQuality({ ...base, downlink: 0.5, rtt: 80 })).toBe(
        'low'
      );
      expect(detectNetworkQuality({ ...base, downlink: 1.5, rtt: 250 })).toBe(
        'medium'
      );
      expect(detectNetworkQuality({ ...base, downlink: 8, rtt: 80 })).toBe(
        'high'
      );
    });
  });

  describe('NetworkAdapter', () => {
    it('reports initial quality from network info', () => {
      stubNavigator({
        online: true,
        effectiveType: '3g',
        downlink: 1.2,
        rtt: 250,
      });
      const adapter = new NetworkAdapter();
      expect(adapter.getQuality()).toBe('medium');
      adapter.destroy();
    });

    it('notifies subscribers when quality changes', () => {
      stubNavigator({
        online: true,
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      });
      const adapter = new NetworkAdapter();

      const changes: NetworkQuality[] = [];
      const unsub = adapter.subscribe(q => changes.push(q));

      // Flip to offline and dispatch the offline event.
      stubNavigator({ online: false });
      window.dispatchEvent(new Event('offline'));

      expect(changes).toContain('offline');

      unsub();
      adapter.destroy();
    });

    it('destroy stops future notifications', () => {
      stubNavigator({
        online: true,
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      });
      const adapter = new NetworkAdapter();

      const cb = vi.fn();
      adapter.subscribe(cb);
      adapter.destroy();

      stubNavigator({ online: false });
      window.dispatchEvent(new Event('offline'));

      expect(cb).not.toHaveBeenCalled();
    });
  });
});
