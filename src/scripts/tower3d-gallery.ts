/**
 * Gallery-mode controller for the 3D tower experience.
 * Replaces scroll-based navigation with button/swipe/keyboard navigation.
 */

import { createAstroMount } from './tower3d/core/astro-mount';
import { getTowerCaps } from './tower3d/core/caps';
import { SceneDirector } from './tower3d/three/scene-director';

type GalleryAutoPlayController = {
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

type Cleanup = () => void;

let galleryCleanups: Cleanup[] = [];
const addGalleryCleanup = (fn: Cleanup) => {
  galleryCleanups.push(fn);
};
const runGalleryCleanups = () => {
  const pending = galleryCleanups;
  galleryCleanups = [];
  for (const fn of pending) {
    try {
      fn();
    } catch {
      // Best-effort cleanup.
    }
  }
};

declare global {
  interface Window {
    __galleryAutoPlay?: GalleryAutoPlayController;
    __goToSceneOriginal?: (index: number) => void;
    __goToSceneImmediate?: (index: number) => void;
    __galleryGetTargetProgress?: () => number;
    __galleryGetCurrentScene?: () => number;
  }

  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
  }

  interface Document {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  }
}

type ShowroomMode = 'wrap' | 'wireframe' | 'glass';
type ShowroomFinish = 'custom' | 'matte' | 'satin' | 'gloss';

const ROOT_SELECTOR = '[data-tower3d-root]';

const SCENE_IDS = [
  'scene00',
  'scene01',
  'scene02',
  'scene03',
  'scene04',
  'scene05',
  'scene06',
  'scene07',
  'scene08',
  'scene09',
  'scene10',
  'scene11',
  'scene12',
  'scene13',
  'scene14',
  'scene15',
  'scene16',
  'scene17',
] as const;

const SCENE_NAMES = [
  'Genesis Forge',
  'Liquid‑Metal Relic',
  'Million Fireflies',
  'Quantum Ribbons',
  'Aurora Curtains',
  'Event Horizon',
  'Kaleido Glass',
  'Matrix Rain',
  'Orbital Mechanics',
  'Voronoi Shards',
  'Quantum Moiré',
  'Neural Constellation',
  'The Library',
  'Bioluminescent Abyss',
  'Neon Metropolis',
  'Digital Decay',
  'Ethereal Storm',
  'Porsche Showroom',
];

// Scene descriptions for info tooltips
const SCENE_DESCRIPTIONS = [
  'A cinematic forge: geometry warms, blooms, and wakes up',
  'A living SDF relic morphing across materials',
  'Swarm intelligence in a luminous flow‑field',
  'Ribbons of type and light assembling, then shattering',
  'Aurora curtains draped across a deep-night gradient',
  'Gravitational lensing bends reality at the edge',
  'Prismatic glasswork and wireframes pulsing with energy',
  'A procedural rainfield—density, depth, and signal',
  'A massive banner of motion: gravity, orbit, and drift',
  'Voronoi shards refracting space into crisp facets',
  'Moiré interference patterns collapsing into clarity',
  'Neurons firing across a living constellation',
  'Infinite hex rooms of impossible knowledge',
  'Bioluminescent organisms painting darkness with light',
  'A neon metropolis built from pure information',
  'A voxel world: controlled collapse, deliberate decay',
  'Volumetric storm cells and charged light sheets',
  'A studio car showcase—drag/press to orbit, wheel/pinch to zoom; tap cycles materials',
];

// Auto-play dwell time per scene (ms). Heavier/"slower" chapters linger longer.
const SCENE_DWELL_MS = [
  8500, // 00 Genesis Forge
  8500, // 01 Liquid-Metal Relic
  8000, // 02 Million Fireflies
  8000, // 03 Quantum Ribbons
  8500, // 04 Aurora Curtains
  9500, // 05 Event Horizon
  8500, // 06 Kaleido Glass
  7000, // 07 Matrix Rain
  9000, // 08 Orbital Mechanics
  7500, // 09 Voronoi Shards
  7500, // 10 Quantum Moiré
  8500, // 11 Neural Constellation
  9500, // 12 The Library
  8500, // 13 Bioluminescent Abyss
  8500, // 14 Neon Metropolis
  9000, // 15 Digital Decay
  8500, // 16 Ethereal Storm
  11000, // 17 Porsche Showroom
];

interface GalleryState {
  currentScene: number;
  targetProgress: number;
  isTransitioning: boolean;
  director: SceneDirector | null;
  isAutoPlaying: boolean;
  isFullscreen: boolean;
  idleTime: number;
  showingInfo: boolean;
}

const state: GalleryState = {
  currentScene: 0,
  targetProgress: 0,
  isTransitioning: false,
  director: null,
  isAutoPlaying: false,
  isFullscreen: false,
  idleTime: 0,
  showingInfo: false,
};

function getInitialSceneIndexFromQuery(): number | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const raw = (
    params.get('sceneId') ||
    params.get('scene') ||
    params.get('sceneIndex') ||
    ''
  ).trim();
  if (!raw) return null;

  // scene=scene17
  if (raw.startsWith('scene')) {
    const found = SCENE_IDS.indexOf(raw as (typeof SCENE_IDS)[number]);
    return found >= 0 ? found : null;
  }

  // scene=17 or sceneIndex=17 (supports 0-based or 1-based)
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed >= 0 && parsed <= SCENE_IDS.length - 1) return parsed;
  if (parsed >= 1 && parsed <= SCENE_IDS.length) return parsed - 1;

  return null;
}

function applyInitialSceneIndex(index: number): void {
  const clamped = Math.max(0, Math.min(SCENE_IDS.length - 1, index));
  state.currentScene = clamped;
  state.targetProgress = clamped / (SCENE_IDS.length - 1);

  // Debug/test breadcrumb.
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.galleryInitialScene = SCENE_IDS[clamped];
  }
}

let galleryCaps: ReturnType<typeof getTowerCaps> | null = null;

// Auto-play configuration
const AUTO_PLAY_INTERVAL = 8000; // ms between scene changes
const IDLE_TIMEOUT = 30000; // Start auto-play after 30s of inactivity
let idleTimer: ReturnType<typeof setTimeout> | null = null;

// Touch/swipe tracking with enhanced gesture support
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;
let touchVelocityX = 0;
let isSwiping = false;
const SWIPE_THRESHOLD = 40;
const SWIPE_VELOCITY_THRESHOLD = 0.3; // pixels per ms
const MAX_SWIPE_TIME = 300; // ms

// Pinch gesture tracking
let initialPinchDistance = 0;
let isPinching = false;

// Auto-hide hints timeout
let hintsTimeout: ReturnType<typeof setTimeout> | null = null;

// Info panel elements (event-driven updates; avoids polling intervals)
let infoPanelDescEl: HTMLElement | null = null;

const syncInfoPanelDescription = () => {
  if (!state.showingInfo || !infoPanelDescEl) return;
  const desc =
    SCENE_DESCRIPTIONS[state.currentScene] ?? 'No description available.';
  if (infoPanelDescEl.textContent !== desc) {
    infoPanelDescEl.textContent = desc;
  }
};

// Haptic feedback support
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(patterns[style]);
  }
};

// Debounce for performance
type DebouncedFn<T extends (...args: unknown[]) => void> = ((
  ...args: Parameters<T>
) => void) & { cancel: () => void };

const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): DebouncedFn<T> => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  }) as DebouncedFn<T>;

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
};

// Mount the gallery using the Astro mount system
createAstroMount(ROOT_SELECTOR, () => {
  // If Astro navigates back/forward, avoid double-binding listeners/timers.
  runGalleryCleanups();

  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!root) return null;

  // Debug breadcrumb: if the loader is stuck and this is missing,
  // the boot module likely failed to load under the current base path.
  root.dataset.galleryBoot = '1';
  document.documentElement.dataset.galleryBoot = '1';

  // Debug/test breadcrumb: capture the query string at mount time.
  document.documentElement.dataset.gallerySearch = window.location.search;

  let deepLinkApplied = false;

  const canvas = root.querySelector<HTMLCanvasElement>(
    'canvas[data-tower3d-canvas]'
  );
  if (!canvas) return null;

  // Setup loading progress early so failures don't get stuck on the loader.
  const loader = document.querySelector<HTMLElement>('[data-gallery-loader]');
  const progressBar = document.querySelector<HTMLElement>(
    '[data-loader-progress]'
  );
  const loaderText =
    loader?.querySelector<HTMLElement>('.loader__text') ?? null;

  const updateLoadProgress = (progress: number) => {
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  };

  let loaderHideTimeout: ReturnType<typeof setTimeout> | null = null;
  let loaderRemoveTimeout: ReturnType<typeof setTimeout> | null = null;

  const hideLoader = () => {
    if (loader) {
      loader.classList.add('hidden');
      // Remove from DOM after animation
      if (loaderRemoveTimeout) clearTimeout(loaderRemoveTimeout);
      loaderRemoveTimeout = setTimeout(() => {
        loader.remove();
      }, 600);
    }
  };

  const showBootError = (message: string) => {
    if (loaderText) loaderText.textContent = message;
    updateLoadProgress(100);

    // Create an overlay inside the root (matches director's overlay style enough).
    let overlay = root.querySelector<HTMLElement>('.tower3d-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'tower3d-error-overlay';
      overlay.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(2,4,10,0.92);color:#e5e7eb;z-index:9999;text-align:center;';
      root.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div style="max-width:560px">
        <div style="font-weight:700;font-size:18px;margin-bottom:8px">3D Gallery failed to start</div>
        <div style="opacity:0.85;font-size:14px;line-height:1.5;margin-bottom:16px">${message}</div>
        <button data-gallery-reload style="cursor:pointer;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;padding:10px 14px;border-radius:10px;backdrop-filter:blur(10px)">Reload</button>
      </div>
    `;

    const reloadBtn = overlay.querySelector<HTMLButtonElement>(
      '[data-gallery-reload]'
    );
    const onReload = () => window.location.reload();
    reloadBtn?.addEventListener('click', onReload);
    addGalleryCleanup(() => reloadBtn?.removeEventListener('click', onReload));

    // Stop showing the loader after a short beat so the UI isn't stuck.
    if (loaderHideTimeout) clearTimeout(loaderHideTimeout);
    loaderHideTimeout = setTimeout(hideLoader, 250);
  };

  const caps = getTowerCaps();
  galleryCaps = caps;
  if (!caps.webgl) {
    showBootError('WebGL is unavailable in this browser/device.');
    return {
      destroy: () => {
        runGalleryCleanups();
        if (loaderHideTimeout) clearTimeout(loaderHideTimeout);
        if (loaderRemoveTimeout) clearTimeout(loaderRemoveTimeout);
      },
    };
  }

  // Apply deep-linking before the director boots so initial scene/progress is consistent.
  const initialIndex = getInitialSceneIndexFromQuery();
  if (initialIndex !== null) {
    applyInitialSceneIndex(initialIndex);
    // Hint the director's initial scene selection too.
    root.dataset.towerScene = SCENE_IDS[state.currentScene];
  }

  // Create director with gallery mode enabled
  let director: SceneDirector;
  try {
    director = new SceneDirector(root, canvas, caps, { galleryMode: true });
  } catch (e) {
    console.error('[Gallery] SceneDirector init failed', e);
    showBootError('WebGL initialization failed. Try reloading the page.');
    return {
      destroy: () => {
        runGalleryCleanups();
        if (loaderHideTimeout) clearTimeout(loaderHideTimeout);
        if (loaderRemoveTimeout) clearTimeout(loaderRemoveTimeout);
      },
    };
  }
  state.director = director;

  const applyDeepLinkIfNeeded = () => {
    if (deepLinkApplied) return;
    const idx = getInitialSceneIndexFromQuery();
    if (idx === null) return;

    applyInitialSceneIndex(idx);
    root.dataset.towerScene = SCENE_IDS[state.currentScene];
    director.setProgress?.(state.targetProgress);
    updateUI();
    deepLinkApplied = true;
  };

  // Seed gallery progress so computeScroll() starts on the intended scene.
  if (initialIndex !== null) {
    director.setProgress?.(state.targetProgress);
    deepLinkApplied = true;
  } else {
    // Some environments may mutate the URL shortly after mount; re-check once now.
    applyDeepLinkIfNeeded();
  }

  // If we reached this point, WebGL + director initialization succeeded.
  // Ensure the loader can't remain stuck even if later UI wiring throws.
  let loaderWatchdog: ReturnType<typeof setTimeout> | null = null;
  loaderWatchdog = setTimeout(() => {
    try {
      updateLoadProgress(100);
      hideLoader();
    } catch {
      // best-effort
    }
  }, 1800);

  addGalleryCleanup(() => {
    if (loaderWatchdog) {
      clearTimeout(loaderWatchdog);
      loaderWatchdog = null;
    }
  });

  // Simulate loading progress (real progress would come from asset loading)
  let loadProgress = 0;
  const loadInterval = setInterval(() => {
    loadProgress += Math.random() * 15;
    if (loadProgress >= 100) {
      loadProgress = 100;
      clearInterval(loadInterval);
      updateLoadProgress(100);
      // Give a moment to show 100% then hide
      if (loaderHideTimeout) clearTimeout(loaderHideTimeout);
      loaderHideTimeout = setTimeout(hideLoader, 200);
    } else {
      updateLoadProgress(loadProgress);
    }
  }, 100);

  addGalleryCleanup(() => {
    clearInterval(loadInterval);
    if (loaderHideTimeout) {
      clearTimeout(loaderHideTimeout);
      loaderHideTimeout = null;
    }
    if (loaderRemoveTimeout) {
      clearTimeout(loaderRemoveTimeout);
      loaderRemoveTimeout = null;
    }
  });

  // Setup all UI controls
  setupNavigation();
  setupDots();
  setupMenu();
  setupKeyboard();
  setupTouch();
  setupHintsAutoHide();
  setupAutoPlay();
  setupFullscreen();
  setupInfoPanel();
  setupShowroomPanel();
  setupIdleDetection();
  updateUI();

  console.log('[Gallery] Initialized with', SCENE_IDS.length, 'scenes');

  // Animation loop - always active in gallery mode (fullscreen)
  let raf = 0;
  let lastTime = 0;
  let frameCount = 0;
  let fps = 60;
  let targetEasing = 0.08; // Base easing factor

  // Adaptive performance - reduce easing on lower FPS
  const updatePerformance = () => {
    if (fps < 30) {
      targetEasing = 0.15; // Faster transitions on slow devices
    } else if (fps < 45) {
      targetEasing = 0.1;
    } else {
      targetEasing = 0.08;
    }
  };

  const tick = (timestamp: number) => {
    // Apply deep-link as soon as the URL contains it.
    applyDeepLinkIfNeeded();

    // Track FPS for adaptive performance
    frameCount++;
    if (timestamp - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = timestamp;
      updatePerformance();
    }

    // Smoothly interpolate to target progress for gallery navigation
    const currentProgress = director.getProgress?.() ?? 0;
    const diff = state.targetProgress - currentProgress;

    if (Math.abs(diff) > 0.0005) {
      // Smooth easing toward target with adaptive speed
      // Use exponential easing for more natural feel
      const steps = Math.abs(diff) * (SCENE_IDS.length - 1);
      const localEasing = Math.min(
        0.2,
        targetEasing + Math.min(0.06, steps * 0.01)
      );
      const easeAmount = 1 - Math.pow(1 - localEasing, fps / 60);
      const newProgress = currentProgress + diff * easeAmount;
      director.setProgress?.(newProgress);

      // Update transition state for UI feedback
      state.isTransitioning = Math.abs(diff) > 0.01;
    } else if (state.isTransitioning) {
      state.isTransitioning = false;
      // Haptic feedback when transition completes
      triggerHaptic('light');
    }

    director.tick();

    // Hide loader on first successful frame render.
    if (loader && !loader.classList.contains('hidden')) {
      updateLoadProgress(100);
      hideLoader();
    }
    raf = window.requestAnimationFrame(tick);
  };

  const onResize = debounce(() => {
    director.resize();
    // Re-sync UI after orientation change
    updateUI();
  }, 100);

  // Also handle orientation change specifically for mobile
  let orientationTimeout: ReturnType<typeof setTimeout> | null = null;
  const onOrientationChange = () => {
    // Slight delay to let browser settle
    if (orientationTimeout) clearTimeout(orientationTimeout);
    orientationTimeout = setTimeout(() => {
      director.resize();
      updateUI();
    }, 150);
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onOrientationChange, {
    passive: true,
  });

  addGalleryCleanup(() => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrientationChange);
    onResize.cancel();
    if (orientationTimeout) {
      clearTimeout(orientationTimeout);
      orientationTimeout = null;
    }
  });

  raf = window.requestAnimationFrame(tick);

  return {
    destroy: () => {
      window.cancelAnimationFrame(raf);

      runGalleryCleanups();

      director.destroy();
      state.director = null;
    },
  };
});

function isShowroomActive(): boolean {
  // Showroom is the merged last chapter (scene17).
  return state.currentScene === SCENE_IDS.length - 1;
}

function bumpShowroomRevision(): void {
  const ds = document.documentElement.dataset;
  const n = Number.parseInt(ds.wrapShowroomUiRevision ?? '0', 10);
  ds.wrapShowroomUiRevision = String(Number.isFinite(n) ? n + 1 : 1);
}

function normalizeHexColor(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return hex.toLowerCase();
}

function setShowroomState(partial: {
  mode?: ShowroomMode;
  wrapColor?: string;
  finish?: ShowroomFinish;
  tint?: number;
}): void {
  const ds = document.documentElement.dataset;

  if (partial.mode) ds.wrapShowroomMode = partial.mode;
  if (typeof partial.wrapColor === 'string')
    ds.wrapShowroomWrapColor = partial.wrapColor;
  if (partial.finish) ds.wrapShowroomWrapFinish = partial.finish;
  if (typeof partial.tint === 'number' && Number.isFinite(partial.tint)) {
    ds.wrapShowroomWrapTint = String(Math.max(0, Math.min(1, partial.tint)));
  }

  bumpShowroomRevision();
}

/** Setup previous/next button navigation */
function setupNavigation() {
  const prevBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-prev]'
  );
  const nextBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-next]'
  );

  const onPrev = () => navigateScene(-1);
  const onNext = () => navigateScene(1);

  prevBtn?.addEventListener('click', onPrev);
  nextBtn?.addEventListener('click', onNext);

  addGalleryCleanup(() => {
    prevBtn?.removeEventListener('click', onPrev);
    nextBtn?.removeEventListener('click', onNext);
  });
}

/** Setup scene indicator dots */
function setupDots() {
  const dotsContainer = document.querySelector('[data-gallery-dots]');
  if (!dotsContainer) return;

  const dots =
    dotsContainer.querySelectorAll<HTMLButtonElement>('[data-scene-index]');
  dots.forEach(dot => {
    const onDotClick = () => {
      const index = parseInt(dot.dataset.sceneIndex ?? '0', 10);
      goToScene(index);
    };

    dot.addEventListener('click', onDotClick);

    addGalleryCleanup(() => {
      dot.removeEventListener('click', onDotClick);
    });
  });
}

/** Setup the slide-out menu */
function setupMenu() {
  const menuToggle =
    document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menuClose =
    document.querySelector<HTMLButtonElement>('[data-menu-close]');
  const menu = document.querySelector<HTMLElement>('[data-gallery-menu]');

  const openMenu = () => menu?.classList.add('open');
  const closeMenu = () => menu?.classList.remove('open');

  menuToggle?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);

  addGalleryCleanup(() => {
    menuToggle?.removeEventListener('click', openMenu);
    menuClose?.removeEventListener('click', closeMenu);
  });

  // Close menu when clicking backdrop
  const onMenuBackdropClick = (e: Event) => {
    if (e.target === menu) closeMenu();
  };
  menu?.addEventListener('click', onMenuBackdropClick);

  addGalleryCleanup(() => {
    menu?.removeEventListener('click', onMenuBackdropClick);
  });

  // Menu scene items
  const menuItems =
    document.querySelectorAll<HTMLButtonElement>('[data-menu-scene]');
  menuItems.forEach(item => {
    const onItemClick = () => {
      const index = parseInt(item.dataset.menuScene ?? '0', 10);
      goToScene(index);
      closeMenu();
    };

    item.addEventListener('click', onItemClick);

    addGalleryCleanup(() => {
      item.removeEventListener('click', onItemClick);
    });
  });
}

/** Setup keyboard navigation */
function setupKeyboard() {
  const onKeyDown = (e: KeyboardEvent) => {
    // Don't interfere with form inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        navigateScene(-1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        navigateScene(1);
        break;
      case 'Home':
        e.preventDefault();
        goToScene(0);
        break;
      case 'End':
        e.preventDefault();
        goToScene(SCENE_IDS.length - 1);
        break;
      case 'Escape':
        document.querySelector('[data-gallery-menu]')?.classList.remove('open');
        // Also close info panel on Escape
        break;
      case ' ':
        e.preventDefault();
        navigateScene(1);
        break;
      case 'p':
      case 'P':
        // Toggle auto-play
        e.preventDefault();
        window.__galleryAutoPlay?.toggle?.();
        break;
      case 'f':
      case 'F':
        // Toggle fullscreen
        e.preventDefault();
        document
          .querySelector<HTMLButtonElement>('[data-gallery-fullscreen]')
          ?.click();
        break;
      case 'i':
      case 'I':
        // Toggle info panel
        e.preventDefault();
        document
          .querySelector<HTMLButtonElement>('[data-gallery-info]')
          ?.click();
        break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  addGalleryCleanup(() => {
    document.removeEventListener('keydown', onKeyDown);
  });
}

/** Setup touch/swipe navigation with advanced gestures */
function setupTouch() {
  const gallery = document.querySelector<HTMLElement>('[data-tower3d-root]');
  if (!gallery) return;

  // Track touch movement for visual feedback
  let swipePreviewActive = false;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture start
      isPinching = true;
      initialPinchDistance = getPinchDistance(e.touches);
      return;
    }

    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    touchStartTime = performance.now();
    isSwiping = false;
    swipePreviewActive = false;
  };

  gallery.addEventListener('touchstart', onTouchStart, { passive: true });
  addGalleryCleanup(() => {
    gallery.removeEventListener('touchstart', onTouchStart);
  });

  const onTouchMove = (e: TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      // Handle pinch zoom preview
      const currentDistance = getPinchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      handlePinchPreview(scale);
      return;
    }

    if (e.touches.length !== 1) return;

    const touch = e.changedTouches[0];
    const diffX = touch.screenX - touchStartX;
    const diffY = touch.screenY - touchStartY;

    // Only start horizontal swipe if moving more horizontally than vertically
    if (
      !isSwiping &&
      Math.abs(diffX) > 15 &&
      Math.abs(diffX) > Math.abs(diffY)
    ) {
      isSwiping = true;
      triggerHaptic('light');
    }

    if (isSwiping) {
      const swipeProgress = Math.min(1, Math.abs(diffX) / 150);

      // Visual preview of scene transition
      if (!swipePreviewActive && Math.abs(diffX) > SWIPE_THRESHOLD) {
        swipePreviewActive = true;
        showSwipePreview(diffX > 0 ? 'prev' : 'next');
      }

      // Update swipe indicator
      updateSwipeIndicator(swipeProgress, diffX > 0 ? 'left' : 'right');
    }
  };

  gallery.addEventListener('touchmove', onTouchMove, { passive: true });
  addGalleryCleanup(() => {
    gallery.removeEventListener('touchmove', onTouchMove);
  });

  const onTouchEnd = (e: TouchEvent) => {
    if (isPinching) {
      isPinching = false;
      hidePinchPreview();
      return;
    }

    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    const touchEndTime = performance.now();
    const touchDuration = touchEndTime - touchStartTime;

    // Calculate velocity for momentum-based swiping
    touchVelocityX = (touchEndX - touchStartX) / touchDuration;

    hideSwipePreview();
    hideSwipeIndicator();

    if (isSwiping) {
      handleSwipe(touchDuration);
    }

    isSwiping = false;
  };

  gallery.addEventListener('touchend', onTouchEnd, { passive: true });
  addGalleryCleanup(() => {
    gallery.removeEventListener('touchend', onTouchEnd);
  });

  // Prevent accidental navigation during 3D interaction
  const onTouchCancel = () => {
    isSwiping = false;
    isPinching = false;
    hideSwipePreview();
    hideSwipeIndicator();
    hidePinchPreview();
  };

  gallery.addEventListener('touchcancel', onTouchCancel);
  addGalleryCleanup(() => {
    gallery.removeEventListener('touchcancel', onTouchCancel);
  });
}

/** Calculate distance between two touch points */
function getPinchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Handle pinch zoom preview */
function handlePinchPreview(scale: number) {
  // Intentionally disabled: scaling the actual canvas can cause the 3D output
  // to appear clipped/off-center on some mobile browsers.
  void scale;
}

/** Hide pinch preview */
function hidePinchPreview() {
  // Kept for API symmetry; no-op since pinch preview is disabled.
}

/** Show preview indicator for next/prev scene */
function showSwipePreview(direction: 'prev' | 'next') {
  const previewIndex =
    direction === 'next'
      ? Math.min(state.currentScene + 1, SCENE_IDS.length - 1)
      : Math.max(state.currentScene - 1, 0);

  if (previewIndex === state.currentScene) return;

  // Show scene name preview
  const previewEl = document.querySelector('.gallery3d__swipe-preview');
  if (previewEl) {
    previewEl.textContent = SCENE_NAMES[previewIndex];
    previewEl.classList.add('visible');
    previewEl.classList.toggle('left', direction === 'prev');
    previewEl.classList.toggle('right', direction === 'next');
  }
}

/** Hide swipe preview */
function hideSwipePreview() {
  const previewEl = document.querySelector('.gallery3d__swipe-preview');
  if (previewEl) {
    previewEl.classList.remove('visible', 'left', 'right');
  }
}

/** Update swipe progress indicator */
function updateSwipeIndicator(progress: number, direction: 'left' | 'right') {
  const indicator = document.querySelector<HTMLElement>(
    '.gallery3d__swipe-indicator'
  );
  if (!indicator) return;

  indicator.style.opacity = String(progress * 0.8);
  indicator.style.transform =
    direction === 'left'
      ? `translateX(${-progress * 30}px)`
      : `translateX(${progress * 30}px)`;
  indicator.classList.add('active');
}

/** Hide swipe indicator */
function hideSwipeIndicator() {
  const indicator = document.querySelector<HTMLElement>(
    '.gallery3d__swipe-indicator'
  );
  if (!indicator) return;
  indicator.style.opacity = '0';
  indicator.classList.remove('active');
}

/** Process swipe gesture with velocity consideration */
function handleSwipe(duration: number) {
  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;

  // Ignore if vertical movement is dominant (scrolling intent)
  if (Math.abs(diffY) > Math.abs(diffX) * 1.5) return;

  // Check for quick flick gesture (velocity-based)
  const isQuickFlick =
    duration < MAX_SWIPE_TIME &&
    Math.abs(touchVelocityX) > SWIPE_VELOCITY_THRESHOLD;

  // Accept swipe if threshold met OR quick flick detected
  if (Math.abs(diffX) < SWIPE_THRESHOLD && !isQuickFlick) return;

  // Trigger haptic feedback on successful swipe
  triggerHaptic('medium');

  if (diffX > 0 || (isQuickFlick && touchVelocityX < 0)) {
    // Swipe left -> next scene
    navigateScene(1);
  } else {
    // Swipe right -> previous scene
    navigateScene(-1);
  }
}

/** Auto-hide keyboard hints after first interaction */
function setupHintsAutoHide() {
  const hints = document.querySelector('[data-gallery-hints]');
  if (!hints) return;

  const hideHints = () => {
    if (hintsTimeout) clearTimeout(hintsTimeout);
    hintsTimeout = setTimeout(() => {
      hints.classList.add('hidden');
    }, 3000);
  };

  // Hide after any interaction
  const onHideHintsKeyDown = () => hideHints();
  const onHideHintsClick = () => hideHints();
  const onHideHintsTouchStart = () => hideHints();

  document.addEventListener('keydown', onHideHintsKeyDown, { once: true });
  document.addEventListener('click', onHideHintsClick, { once: true });
  document.addEventListener('touchstart', onHideHintsTouchStart, {
    once: true,
  });

  addGalleryCleanup(() => {
    document.removeEventListener('keydown', onHideHintsKeyDown);
    document.removeEventListener('click', onHideHintsClick);
    document.removeEventListener('touchstart', onHideHintsTouchStart);
    if (hintsTimeout) {
      clearTimeout(hintsTimeout);
      hintsTimeout = null;
    }
  });
}

/** Auto-play timer reference */
let autoPlayTimeout: ReturnType<typeof setTimeout> | null = null;

/** Setup auto-play mode with idle detection */
function setupAutoPlay() {
  const toggleBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-autoplay]'
  );

  // Respect reduced motion: disable auto-play entirely.
  if (galleryCaps?.reducedMotion) {
    toggleBtn?.setAttribute('disabled', '');
    toggleBtn?.setAttribute('aria-disabled', 'true');
    toggleBtn?.setAttribute('title', 'Auto-play disabled (reduced motion).');
  }

  const startAutoPlay = () => {
    if (galleryCaps?.reducedMotion) return;
    if (state.isAutoPlaying || autoPlayTimeout) return;
    state.isAutoPlaying = true;

    const getDelayMs = () => {
      const base = SCENE_DWELL_MS[state.currentScene] ?? AUTO_PLAY_INTERVAL;
      // Slow devices get a little more time to "settle" visually.
      const tier = galleryCaps?.performanceTier;
      const tierMult = tier === 'low' ? 1.25 : 1.0;
      return Math.round(base * tierMult);
    };

    const scheduleNext = () => {
      if (!state.isAutoPlaying) return;
      const delayMs = getDelayMs();

      autoPlayTimeout = setTimeout(() => {
        if (!state.isAutoPlaying) return;

        // Avoid advancing scenes while a transition is still resolving, or while
        // the tab is hidden (prevents sudden jumps on return).
        if (
          state.isTransitioning ||
          (typeof document !== 'undefined' &&
            document.visibilityState !== 'visible')
        ) {
          scheduleNext();
          return;
        }

        // Loop back to start at end
        if (state.currentScene >= SCENE_IDS.length - 1) {
          goToScene(0);
        } else {
          navigateScene(1);
        }
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();

    toggleBtn?.classList.add('active');
    toggleBtn?.setAttribute('aria-pressed', 'true');
    document
      .querySelector('[data-tower3d-root]')
      ?.classList.add('auto-playing');
  };

  const stopAutoPlay = () => {
    if (!state.isAutoPlaying) return;
    state.isAutoPlaying = false;

    if (autoPlayTimeout) {
      clearTimeout(autoPlayTimeout);
      autoPlayTimeout = null;
    }

    toggleBtn?.classList.remove('active');
    toggleBtn?.setAttribute('aria-pressed', 'false');
    document
      .querySelector('[data-tower3d-root]')
      ?.classList.remove('auto-playing');
  };

  const toggleAutoPlay = () => {
    if (state.isAutoPlaying) {
      stopAutoPlay();
      triggerHaptic('light');
    } else {
      startAutoPlay();
      triggerHaptic('medium');
    }
  };

  // Button click handler
  toggleBtn?.addEventListener('click', toggleAutoPlay);
  addGalleryCleanup(() => {
    toggleBtn?.removeEventListener('click', toggleAutoPlay);
  });

  // Stop auto-play on user interaction
  const stopOnInteraction = () => {
    if (state.isAutoPlaying) {
      stopAutoPlay();
    }
    resetIdleTimer();
  };

  const onStopKeyDown = (e: KeyboardEvent) => {
    // Don't immediately cancel when the user is toggling auto-play.
    if (e.key === 'p' || e.key === 'P') return;
    stopOnInteraction();
  };

  const onStopTouchStart = (e: TouchEvent) => {
    // Don't stop/restart loops when tapping the auto-play button.
    if ((e.target as Element | null)?.closest?.('[data-gallery-autoplay]'))
      return;
    stopOnInteraction();
  };
  const onStopClick = (e: MouseEvent) => {
    // Don't stop if clicking the autoplay button itself
    if ((e.target as Element)?.closest('[data-gallery-autoplay]')) return;
    stopOnInteraction();
  };

  document.addEventListener('keydown', onStopKeyDown);
  document.addEventListener('touchstart', onStopTouchStart, { passive: true });
  document.addEventListener('click', onStopClick);

  addGalleryCleanup(() => {
    document.removeEventListener('keydown', onStopKeyDown);
    document.removeEventListener('touchstart', onStopTouchStart);
    document.removeEventListener('click', onStopClick);
    stopAutoPlay();
  });

  // Expose for external control
  window.__galleryAutoPlay = {
    start: startAutoPlay,
    stop: stopAutoPlay,
    toggle: toggleAutoPlay,
  };

  addGalleryCleanup(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__galleryAutoPlay = undefined;
  });
}

/** Setup fullscreen mode support */
function setupFullscreen() {
  const toggleBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-fullscreen]'
  );
  const root = document.querySelector<HTMLElement>('[data-tower3d-root]');

  if (!toggleBtn || !root) return;

  const enterFullscreen = async () => {
    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      }
      state.isFullscreen = true;
      toggleBtn.classList.add('active');
      triggerHaptic('medium');
    } catch (err) {
      console.warn('[Gallery] Fullscreen not supported:', err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
      state.isFullscreen = false;
      toggleBtn.classList.remove('active');
    } catch (err) {
      console.warn('[Gallery] Exit fullscreen failed:', err);
    }
  };

  const toggleFullscreen = () => {
    const isCurrentlyFullscreen =
      document.fullscreenElement || document.webkitFullscreenElement;
    if (isCurrentlyFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  toggleBtn.addEventListener('click', toggleFullscreen);
  addGalleryCleanup(() => {
    toggleBtn.removeEventListener('click', toggleFullscreen);
  });

  // Listen for fullscreen change events
  let fullscreenSyncTimeout: ReturnType<typeof setTimeout> | null = null;
  const handleFullscreenChange = () => {
    const isFS = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
    state.isFullscreen = isFS;
    toggleBtn.classList.toggle('active', isFS);
    root.classList.toggle('is-fullscreen', isFS);

    // Sync size after fullscreen change
    if (fullscreenSyncTimeout) clearTimeout(fullscreenSyncTimeout);
    fullscreenSyncTimeout = setTimeout(() => {
      state.director?.syncSize();
    }, 100);
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  addGalleryCleanup(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener(
      'webkitfullscreenchange',
      handleFullscreenChange
    );
    if (fullscreenSyncTimeout) {
      clearTimeout(fullscreenSyncTimeout);
      fullscreenSyncTimeout = null;
    }
  });

  // Double-tap to toggle fullscreen on mobile
  let lastTap = 0;
  const onDoubleTapTouchEnd = (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTap < 300 && e.touches.length === 0) {
      toggleFullscreen();
    }
    lastTap = now;
  };

  root.addEventListener('touchend', onDoubleTapTouchEnd, { passive: true });
  addGalleryCleanup(() => {
    root.removeEventListener('touchend', onDoubleTapTouchEnd);
  });
}

/** Setup info panel for scene descriptions */
function setupInfoPanel() {
  const toggleBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-info]'
  );
  const panel = document.querySelector<HTMLElement>('.gallery3d__info-panel');
  const descEl = panel?.querySelector<HTMLElement>('.info-panel__description');

  if (!toggleBtn || !panel) return;

  const showInfo = () => {
    state.showingInfo = true;
    panel.classList.add('visible');
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');

    infoPanelDescEl = descEl ?? null;
    syncInfoPanelDescription();

    triggerHaptic('light');
  };

  const hideInfo = () => {
    state.showingInfo = false;
    panel.classList.remove('visible');
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    infoPanelDescEl = null;
  };

  const toggleInfo = () => {
    if (state.showingInfo) {
      hideInfo();
    } else {
      showInfo();
    }
  };

  toggleBtn.addEventListener('click', toggleInfo);
  addGalleryCleanup(() => {
    toggleBtn.removeEventListener('click', toggleInfo);
  });

  // Close panel when clicking outside
  const onOutsideClick = (e: MouseEvent) => {
    if (
      state.showingInfo &&
      !panel.contains(e.target as Node) &&
      !toggleBtn.contains(e.target as Node)
    ) {
      hideInfo();
    }
  };

  document.addEventListener('click', onOutsideClick);
  addGalleryCleanup(() => {
    document.removeEventListener('click', onOutsideClick);
  });

  // Debug access
  window.__goToSceneOriginal = goToScene;
  window.__goToSceneImmediate = (index: number) => {
    goToScene(index);
    state.director?.setProgress?.(state.targetProgress);
  };
  window.__galleryGetTargetProgress = () => state.targetProgress;
  window.__galleryGetCurrentScene = () => state.currentScene;

  // Close on Escape key
  const onInfoEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && state.showingInfo) {
      hideInfo();
    }
  };

  document.addEventListener('keydown', onInfoEscape);
  addGalleryCleanup(() => {
    document.removeEventListener('keydown', onInfoEscape);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__goToSceneOriginal = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__goToSceneImmediate = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__galleryGetTargetProgress = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__galleryGetCurrentScene = undefined;
    infoPanelDescEl = null;
  });
}

/** Setup showroom panel for scene17 customization */
function setupShowroomPanel() {
  const toggleBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-showroom]'
  );
  const panel = document.querySelector<HTMLElement>(
    '[data-gallery-showroom-panel]'
  );

  if (!toggleBtn || !panel) return;

  const modeButtons = Array.from(
    panel.querySelectorAll<HTMLButtonElement>('[data-showroom-mode]')
  );
  const swatches = Array.from(
    panel.querySelectorAll<HTMLButtonElement>('[data-showroom-color]')
  );
  const colorInput = panel.querySelector<HTMLInputElement>(
    '[data-showroom-color-input]'
  );
  const finishSelect = panel.querySelector<HTMLSelectElement>(
    '[data-showroom-finish]'
  );
  const tintRange = panel.querySelector<HTMLInputElement>(
    '[data-showroom-tint]'
  );
  const resetBtn = panel.querySelector<HTMLButtonElement>(
    '[data-showroom-reset]'
  );

  const syncUiFromDataset = () => {
    const ds = document.documentElement.dataset;
    const mode = (ds.wrapShowroomMode || 'wrap') as ShowroomMode;
    const wrapColor =
      normalizeHexColor(ds.wrapShowroomWrapColor || '#00d1b2') ?? '#00d1b2';
    const finish = (ds.wrapShowroomWrapFinish || 'custom') as ShowroomFinish;
    const tint = Number.parseFloat(ds.wrapShowroomWrapTint || '0.92');
    const tint01 = Number.isFinite(tint)
      ? Math.max(0, Math.min(1, tint))
      : 0.92;

    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.showroomMode === mode);
    });
    swatches.forEach(btn => {
      btn.classList.toggle(
        'active',
        (btn.dataset.showroomColor || '').toLowerCase() === wrapColor
      );
    });

    if (colorInput) colorInput.value = wrapColor;
    if (finishSelect) finishSelect.value = finish;
    if (tintRange) tintRange.value = String(tint01);
  };

  const showPanel = () => {
    if (!isShowroomActive()) return;
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    syncUiFromDataset();
    resetIdleTimer();
  };

  const hidePanel = () => {
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  const togglePanel = () => {
    if (panel.classList.contains('visible')) hidePanel();
    else showPanel();
  };

  toggleBtn.addEventListener('click', togglePanel);
  addGalleryCleanup(() => {
    toggleBtn.removeEventListener('click', togglePanel);
  });

  // Close on outside click.
  const onOutsideClick = (e: MouseEvent) => {
    if (!panel.classList.contains('visible')) return;
    if (
      panel.contains(e.target as Node) ||
      toggleBtn.contains(e.target as Node)
    )
      return;
    hidePanel();
  };
  document.addEventListener('click', onOutsideClick);
  addGalleryCleanup(() => {
    document.removeEventListener('click', onOutsideClick);
  });

  // Keyboard shortcut: C
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'c' && e.key !== 'C') return;
    if (!isShowroomActive()) return;
    togglePanel();
  };
  document.addEventListener('keydown', onKeyDown);
  addGalleryCleanup(() => {
    document.removeEventListener('keydown', onKeyDown);
  });

  // Mode buttons
  const onModeClick = (e: MouseEvent) => {
    const btn = (e.target as Element | null)?.closest?.(
      '[data-showroom-mode]'
    ) as HTMLButtonElement | null;
    if (!btn) return;
    const mode = btn.dataset.showroomMode as ShowroomMode | undefined;
    if (!mode) return;
    setShowroomState({ mode });
    syncUiFromDataset();
  };
  panel.addEventListener('click', onModeClick);
  addGalleryCleanup(() => {
    panel.removeEventListener('click', onModeClick);
  });

  // Swatches
  const onSwatchClick = (e: MouseEvent) => {
    const btn = (e.target as Element | null)?.closest?.(
      '[data-showroom-color]'
    ) as HTMLButtonElement | null;
    if (!btn) return;
    const color = normalizeHexColor(btn.dataset.showroomColor || '');
    if (!color) return;
    setShowroomState({ wrapColor: color });
    syncUiFromDataset();
  };
  panel.addEventListener('click', onSwatchClick);
  addGalleryCleanup(() => {
    panel.removeEventListener('click', onSwatchClick);
  });

  // Color input
  const onColorInput = () => {
    if (!colorInput) return;
    const color = normalizeHexColor(colorInput.value);
    if (!color) return;
    setShowroomState({ wrapColor: color });
    syncUiFromDataset();
  };
  colorInput?.addEventListener('input', onColorInput);
  addGalleryCleanup(() => {
    colorInput?.removeEventListener('input', onColorInput);
  });

  // Finish select
  const onFinishChange = () => {
    if (!finishSelect) return;
    const finish = (finishSelect.value || 'custom') as ShowroomFinish;
    setShowroomState({ finish });
    syncUiFromDataset();
  };
  finishSelect?.addEventListener('change', onFinishChange);
  addGalleryCleanup(() => {
    finishSelect?.removeEventListener('change', onFinishChange);
  });

  // Tint
  const onTintInput = () => {
    if (!tintRange) return;
    const v = Number.parseFloat(tintRange.value);
    if (!Number.isFinite(v)) return;
    setShowroomState({ tint: v });
  };
  tintRange?.addEventListener('input', onTintInput);
  addGalleryCleanup(() => {
    tintRange?.removeEventListener('input', onTintInput);
  });

  // Reset
  const onReset = () => {
    setShowroomState({
      mode: 'wrap',
      wrapColor: '#00d1b2',
      finish: 'custom',
      tint: 0.92,
    });
    syncUiFromDataset();
  };
  resetBtn?.addEventListener('click', onReset);
  addGalleryCleanup(() => {
    resetBtn?.removeEventListener('click', onReset);
  });

  // Expose a small sync hook for updateUI.
  const syncAvailability = () => {
    const enabled = isShowroomActive();
    toggleBtn.disabled = !enabled;
    toggleBtn.setAttribute('aria-disabled', String(!enabled));
    if (!enabled) hidePanel();
    else syncUiFromDataset();
  };

  // Seed.
  syncAvailability();

  addGalleryCleanup(() => {
    hidePanel();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__syncShowroomPanelAvailability = syncAvailability;
  addGalleryCleanup(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__syncShowroomPanelAvailability = undefined;
  });
}

/** Reset idle timer */
function resetIdleTimer() {
  state.idleTime = 0;

  if (galleryCaps?.reducedMotion) {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    return;
  }

  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  idleTimer = setTimeout(() => {
    // Start auto-play after idle timeout (if not already playing)
    if (!state.isAutoPlaying) {
      const autoPlay = window.__galleryAutoPlay;
      if (autoPlay?.start) {
        console.log('[Gallery] Starting auto-play due to idle timeout');
        autoPlay.start();
      }
    }
  }, IDLE_TIMEOUT);
}

/** Setup idle detection to auto-start slideshow */
function setupIdleDetection() {
  // Reset timer on any user interaction
  const resetEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
  ];

  const onAnyActivity = () => resetIdleTimer();
  resetEvents.forEach(event => {
    document.addEventListener(event, onAnyActivity, { passive: true });
  });

  addGalleryCleanup(() => {
    resetEvents.forEach(event => {
      document.removeEventListener(event, onAnyActivity);
    });
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  });

  // Start initial idle timer
  resetIdleTimer();
}

/** Navigate relative to current scene */
function navigateScene(direction: -1 | 1) {
  const newIndex = state.currentScene + direction;
  goToScene(newIndex);
}

/** Jump to a specific scene by index */
function goToScene(index: number) {
  // Clamp to valid range
  const targetIndex = Math.max(0, Math.min(SCENE_IDS.length - 1, index));

  // Skip if already there
  if (targetIndex === state.currentScene) {
    return;
  }

  state.currentScene = targetIndex;

  // Calculate the progress value (0-1) for this scene
  state.targetProgress = targetIndex / (SCENE_IDS.length - 1);

  // Trigger haptic on scene change
  triggerHaptic(state.isAutoPlaying ? 'light' : 'medium');

  // Update all UI elements
  updateUI();

  // If the info panel is open, update content immediately.
  syncInfoPanelDescription();
}

/** Update all UI elements to reflect current state */
function updateUI() {
  const index = state.currentScene;
  const sceneName = SCENE_NAMES[index] ?? 'Unknown';

  // Update title overlay with animation
  const numberEl = document.querySelector('.gallery3d__scene-number');
  const nameEl = document.querySelector('.gallery3d__scene-name');
  const titleOverlay = document.querySelector<HTMLElement>(
    '.gallery3d__title-overlay'
  );

  if (numberEl) numberEl.textContent = String(index + 1).padStart(2, '0');
  if (nameEl) nameEl.textContent = sceneName;

  // Add subtle animation to title on change
  if (titleOverlay) {
    titleOverlay.style.animation = 'none';
    void titleOverlay.offsetHeight; // Force reflow
    titleOverlay.style.animation = 'title-pulse 0.5s ease-out';
  }

  // Update dots and scroll active dot into view on mobile
  const dotsContainer = document.querySelector<HTMLElement>(
    '[data-gallery-dots]'
  );
  const dots =
    document.querySelectorAll<HTMLButtonElement>('[data-scene-index]');

  dots.forEach(dot => {
    const dotIndex = parseInt(dot.dataset.sceneIndex ?? '0', 10);
    const isActive = dotIndex === index;
    dot.classList.toggle('active', isActive);

    // Scroll active dot into view on mobile (horizontal scrolling dots)
    if (isActive && dotsContainer) {
      const dotRect = dot.getBoundingClientRect();
      const containerRect = dotsContainer.getBoundingClientRect();

      // Check if dot is outside visible area
      if (
        dotRect.left < containerRect.left ||
        dotRect.right > containerRect.right
      ) {
        dot.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  });

  // Update progress bar with smooth animation
  const progressBar = document.querySelector<HTMLElement>(
    '[data-gallery-progress]'
  );
  if (progressBar) {
    const percent = ((index + 1) / SCENE_IDS.length) * 100;
    progressBar.style.width = `${percent}%`;
  }

  // Update menu items and scroll active into view
  const menuList = document.querySelector<HTMLElement>('.gallery-menu__list');
  const menuItems =
    document.querySelectorAll<HTMLButtonElement>('[data-menu-scene]');

  menuItems.forEach(item => {
    const itemIndex = parseInt(item.dataset.menuScene ?? '0', 10);
    const isActive = itemIndex === index;
    item.classList.toggle('active', isActive);

    // Scroll active menu item into view when menu is open
    if (isActive && menuList && document.querySelector('.gallery-menu.open')) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  // Update nav button states with accessibility
  const prevBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-prev]'
  );
  const nextBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-next]'
  );

  if (prevBtn) {
    const isDisabled = index === 0;
    prevBtn.disabled = isDisabled;
    prevBtn.style.opacity = isDisabled ? '0.3' : '1';
    prevBtn.setAttribute('aria-disabled', String(isDisabled));
  }
  if (nextBtn) {
    const isDisabled = index === SCENE_IDS.length - 1;
    nextBtn.disabled = isDisabled;
    nextBtn.style.opacity = isDisabled ? '0.3' : '1';
    nextBtn.setAttribute('aria-disabled', String(isDisabled));
  }

  // Update data attribute on root
  const root = document.querySelector<HTMLElement>('[data-tower3d-root]');
  if (root) {
    root.dataset.towerScene = SCENE_IDS[index];
    root.dataset.sceneIndex = String(index);
  }

  // Update document title for better context
  document.title = `${sceneName} | 3D Gallery`;

  // Keep the showroom panel enabled only for scene17.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__syncShowroomPanelAvailability?.();
}

export { goToScene, navigateScene, state };
