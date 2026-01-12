import { networkAdapter } from '../utils/network-adapter';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch {
    return false;
  }
}

function supportsHoverPointer(): boolean {
  try {
    return window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
  } catch {
    return false;
  }
}

let loaded = false;

async function loadEnhancementsOnce(): Promise<void> {
  if (loaded) return;
  loaded = true;

  // Keep the feature work split: scroll animations for all devices,
  // but mouse-pointer flourishes only when hover is supported.
  await import('./animations');

  if (supportsHoverPointer()) {
    await Promise.all([import('./magnetic-buttons'), import('./spotlight')]);
  }
}

function shouldLoad(): boolean {
  if (prefersReducedMotion()) return false;
  if (!networkAdapter.shouldEnableAnimations()) return false;
  return true;
}

function attemptLoad(): void {
  if (!shouldLoad()) return;
  void loadEnhancementsOnce();
}

// Initial attempt.
attemptLoad();

// If the user goes from offline/low -> high/medium, load at that point.
networkAdapter.subscribe(() => {
  attemptLoad();
});

// If the user changes reduced-motion at runtime, respect it.
try {
  const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  mql?.addEventListener?.('change', () => {
    // We don't unload once loaded; we simply stop future attempts.
    attemptLoad();
  });
} catch {
  // ignore
}
