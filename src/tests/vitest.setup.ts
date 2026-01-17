import { vi, beforeEach } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// JSDOM does not implement Canvas APIs by default. Some components/utilities probe for
// canvas support (or call getContext), which would otherwise emit noisy warnings.
// We stub a minimal getContext implementation for test stability.
if (typeof HTMLCanvasElement !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = vi.fn(() => null);
}

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});
