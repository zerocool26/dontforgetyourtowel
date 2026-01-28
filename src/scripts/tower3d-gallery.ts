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

declare global {
  interface Window {
    __galleryAutoPlay?: GalleryAutoPlayController;
    __goToSceneOriginal?: (index: number) => void;
  }

  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void> | void;
  }

  interface Document {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  }
}

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
  'Cyber Porsche',
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
  'A high-fidelity hero asset chapter—speed and sheen',
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

// Haptic feedback support
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(patterns[style]);
  }
};

// Debounce for performance
const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};

// Mount the gallery using the Astro mount system
createAstroMount(ROOT_SELECTOR, () => {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!root) return null;

  const canvas = root.querySelector<HTMLCanvasElement>(
    'canvas[data-tower3d-canvas]'
  );
  if (!canvas) return null;

  const caps = getTowerCaps();
  if (!caps.webgl) return null;

  // Create director with gallery mode enabled
  const director = new SceneDirector(root, canvas, caps, { galleryMode: true });
  state.director = director;

  // Setup loading progress
  const loader = document.querySelector<HTMLElement>('[data-gallery-loader]');
  const progressBar = document.querySelector<HTMLElement>(
    '[data-loader-progress]'
  );

  const updateLoadProgress = (progress: number) => {
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  };

  const hideLoader = () => {
    if (loader) {
      loader.classList.add('hidden');
      // Remove from DOM after animation
      setTimeout(() => {
        loader.remove();
      }, 600);
    }
  };

  // Simulate loading progress (real progress would come from asset loading)
  let loadProgress = 0;
  const loadInterval = setInterval(() => {
    loadProgress += Math.random() * 15;
    if (loadProgress >= 100) {
      loadProgress = 100;
      clearInterval(loadInterval);
      updateLoadProgress(100);
      // Give a moment to show 100% then hide
      setTimeout(hideLoader, 200);
    } else {
      updateLoadProgress(loadProgress);
    }
  }, 100);

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
      const easeAmount = 1 - Math.pow(1 - targetEasing, fps / 60);
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
    raf = window.requestAnimationFrame(tick);
  };

  const onResize = debounce(() => {
    director.resize();
    // Re-sync UI after orientation change
    updateUI();
  }, 100);

  // Also handle orientation change specifically for mobile
  const onOrientationChange = () => {
    // Slight delay to let browser settle
    setTimeout(() => {
      director.resize();
      updateUI();
    }, 150);
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onOrientationChange, {
    passive: true,
  });

  raf = window.requestAnimationFrame(tick);

  return {
    destroy: () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      director.destroy();
      state.director = null;
    },
  };
});

/** Setup previous/next button navigation */
function setupNavigation() {
  const prevBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-prev]'
  );
  const nextBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-next]'
  );

  prevBtn?.addEventListener('click', () => navigateScene(-1));
  nextBtn?.addEventListener('click', () => navigateScene(1));
}

/** Setup scene indicator dots */
function setupDots() {
  const dotsContainer = document.querySelector('[data-gallery-dots]');
  if (!dotsContainer) return;

  const dots =
    dotsContainer.querySelectorAll<HTMLButtonElement>('[data-scene-index]');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.dataset.sceneIndex ?? '0', 10);
      goToScene(index);
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

  // Close menu when clicking backdrop
  menu?.addEventListener('click', e => {
    if (e.target === menu) closeMenu();
  });

  // Menu scene items
  const menuItems =
    document.querySelectorAll<HTMLButtonElement>('[data-menu-scene]');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.menuScene ?? '0', 10);
      goToScene(index);
      closeMenu();
    });
  });
}

/** Setup keyboard navigation */
function setupKeyboard() {
  document.addEventListener('keydown', e => {
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
  });
}

/** Setup touch/swipe navigation with advanced gestures */
function setupTouch() {
  const gallery = document.querySelector<HTMLElement>('[data-tower3d-root]');
  if (!gallery) return;

  // Track touch movement for visual feedback
  let swipePreviewActive = false;

  gallery.addEventListener(
    'touchstart',
    e => {
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
    },
    { passive: true }
  );

  gallery.addEventListener(
    'touchmove',
    e => {
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
    },
    { passive: true }
  );

  gallery.addEventListener(
    'touchend',
    e => {
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
    },
    { passive: true }
  );

  // Prevent accidental navigation during 3D interaction
  gallery.addEventListener('touchcancel', () => {
    isSwiping = false;
    isPinching = false;
    hideSwipePreview();
    hideSwipeIndicator();
    hidePinchPreview();
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
  document.addEventListener('keydown', hideHints, { once: true });
  document.addEventListener('click', hideHints, { once: true });
  document.addEventListener('touchstart', hideHints, { once: true });
}

/** Auto-play timer reference */
let autoPlayInterval: ReturnType<typeof setInterval> | null = null;

/** Setup auto-play mode with idle detection */
function setupAutoPlay() {
  const toggleBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-autoplay]'
  );

  const startAutoPlay = () => {
    if (state.isAutoPlaying || autoPlayInterval) return;
    state.isAutoPlaying = true;

    autoPlayInterval = setInterval(() => {
      // Loop back to start at end
      if (state.currentScene >= SCENE_IDS.length - 1) {
        goToScene(0);
      } else {
        navigateScene(1);
      }
    }, AUTO_PLAY_INTERVAL);

    toggleBtn?.classList.add('active');
    toggleBtn?.setAttribute('aria-pressed', 'true');
    document
      .querySelector('[data-tower3d-root]')
      ?.classList.add('auto-playing');
  };

  const stopAutoPlay = () => {
    if (!state.isAutoPlaying) return;
    state.isAutoPlaying = false;

    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
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

  // Stop auto-play on user interaction
  const stopOnInteraction = () => {
    if (state.isAutoPlaying) {
      stopAutoPlay();
    }
    resetIdleTimer();
  };

  document.addEventListener('keydown', stopOnInteraction);
  document.addEventListener('touchstart', stopOnInteraction, { passive: true });
  document.addEventListener('click', e => {
    // Don't stop if clicking the autoplay button itself
    if ((e.target as Element)?.closest('[data-gallery-autoplay]')) return;
    stopOnInteraction();
  });

  // Expose for external control
  window.__galleryAutoPlay = {
    start: startAutoPlay,
    stop: stopAutoPlay,
    toggle: toggleAutoPlay,
  };
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

  // Listen for fullscreen change events
  const handleFullscreenChange = () => {
    const isFS = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
    state.isFullscreen = isFS;
    toggleBtn.classList.toggle('active', isFS);
    root.classList.toggle('is-fullscreen', isFS);

    // Sync size after fullscreen change
    setTimeout(() => {
      state.director?.syncSize();
    }, 100);
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  // Double-tap to toggle fullscreen on mobile
  let lastTap = 0;
  root.addEventListener(
    'touchend',
    e => {
      const now = Date.now();
      if (now - lastTap < 300 && e.touches.length === 0) {
        toggleFullscreen();
      }
      lastTap = now;
    },
    { passive: true }
  );
}

/** Setup info panel for scene descriptions */
function setupInfoPanel() {
  const toggleBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-info]'
  );
  const panel = document.querySelector<HTMLElement>('.gallery3d__info-panel');
  const descEl = panel?.querySelector('.info-panel__description');

  if (!toggleBtn || !panel) return;

  const showInfo = () => {
    state.showingInfo = true;
    panel.classList.add('visible');
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');

    // Update description content
    if (descEl) {
      const desc =
        SCENE_DESCRIPTIONS[state.currentScene] ?? 'No description available.';
      descEl.textContent = desc;
    }

    triggerHaptic('light');
  };

  const hideInfo = () => {
    state.showingInfo = false;
    panel.classList.remove('visible');
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  const toggleInfo = () => {
    if (state.showingInfo) {
      hideInfo();
    } else {
      showInfo();
    }
  };

  toggleBtn.addEventListener('click', toggleInfo);

  // Close panel when clicking outside
  document.addEventListener('click', e => {
    if (
      state.showingInfo &&
      !panel.contains(e.target as Node) &&
      !toggleBtn.contains(e.target as Node)
    ) {
      hideInfo();
    }
  });

  // Update description when scene changes
  const originalGoToScene = goToScene;
  window.__goToSceneOriginal = originalGoToScene;

  // Watch for scene changes and update info panel
  setInterval(() => {
    if (state.showingInfo && descEl) {
      const desc =
        SCENE_DESCRIPTIONS[state.currentScene] ?? 'No description available.';
      if (descEl.textContent !== desc) {
        descEl.textContent = desc;
      }
    }
  }, 200);

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.showingInfo) {
      hideInfo();
    }
  });
}

/** Reset idle timer */
function resetIdleTimer() {
  state.idleTime = 0;

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

  resetEvents.forEach(event => {
    document.addEventListener(event, () => resetIdleTimer(), { passive: true });
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
  triggerHaptic('medium');

  // Update all UI elements
  updateUI();
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
}

export { goToScene, navigateScene, state };
