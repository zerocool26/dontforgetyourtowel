/**
 * Gallery-mode controller for the 3D tower experience.
 * Replaces scroll-based navigation with button/swipe/keyboard navigation.
 */

import { createAstroMount } from './tower3d/core/astro-mount';
import { getTowerCaps } from './tower3d/core/caps';
import { SceneDirector } from './tower3d/three/scene-director';

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
] as const;

const SCENE_NAMES = [
  'Genesis Core',
  'Liquid Metal',
  'Fireflies',
  'Kinetic Type',
  'Corridor',
  'Crystals',
  'Blueprint',
  'Ink Flow',
  'Silk Cloth',
  'Point Cloud',
  'Fractal',
  'Neural Net',
  'Library',
  'Abyss',
  'Data City',
  'Reality Collapse',
];

interface GalleryState {
  currentScene: number;
  targetProgress: number;
  isTransitioning: boolean;
  director: SceneDirector | null;
}

const state: GalleryState = {
  currentScene: 0,
  targetProgress: 0,
  isTransitioning: false,
  director: null,
};

// Touch/swipe tracking
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50;

// Auto-hide hints timeout
let hintsTimeout: ReturnType<typeof setTimeout> | null = null;

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

  // Setup all UI controls
  setupNavigation();
  setupDots();
  setupMenu();
  setupKeyboard();
  setupTouch();
  setupHintsAutoHide();
  updateUI();

  console.log('[Gallery] Initialized with', SCENE_IDS.length, 'scenes');

  // Animation loop - always active in gallery mode (fullscreen)
  let raf = 0;
  const tick = () => {
    // Smoothly interpolate to target progress for gallery navigation
    const currentProgress = director.getProgress?.() ?? 0;
    const diff = state.targetProgress - currentProgress;

    if (Math.abs(diff) > 0.001) {
      // Smooth easing toward target
      const newProgress = currentProgress + diff * 0.08;
      director.setProgress?.(newProgress);
    }

    director.tick();
    raf = window.requestAnimationFrame(tick);
  };

  const onResize = () => director.resize();
  window.addEventListener('resize', onResize, { passive: true });

  raf = window.requestAnimationFrame(tick);

  return {
    destroy: () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
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
        break;
      case ' ':
        e.preventDefault();
        navigateScene(1);
        break;
    }
  });
}

/** Setup touch/swipe navigation */
function setupTouch() {
  const gallery = document.querySelector<HTMLElement>('[data-tower3d-root]');
  if (!gallery) return;

  gallery.addEventListener(
    'touchstart',
    e => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  gallery.addEventListener(
    'touchend',
    e => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );
}

/** Process swipe gesture */
function handleSwipe() {
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) < SWIPE_THRESHOLD) return;

  if (diff > 0) {
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

  // Update all UI elements
  updateUI();
}

/** Update all UI elements to reflect current state */
function updateUI() {
  const index = state.currentScene;
  const sceneName = SCENE_NAMES[index] ?? 'Unknown';

  // Update title overlay
  const numberEl = document.querySelector('.gallery3d__scene-number');
  const nameEl = document.querySelector('.gallery3d__scene-name');
  if (numberEl) numberEl.textContent = String(index + 1).padStart(2, '0');
  if (nameEl) nameEl.textContent = sceneName;

  // Update dots
  const dots =
    document.querySelectorAll<HTMLButtonElement>('[data-scene-index]');
  dots.forEach(dot => {
    const dotIndex = parseInt(dot.dataset.sceneIndex ?? '0', 10);
    dot.classList.toggle('active', dotIndex === index);
  });

  // Update progress bar
  const progressBar = document.querySelector<HTMLElement>(
    '[data-gallery-progress]'
  );
  if (progressBar) {
    const percent = ((index + 1) / SCENE_IDS.length) * 100;
    progressBar.style.width = `${percent}%`;
  }

  // Update menu items
  const menuItems =
    document.querySelectorAll<HTMLButtonElement>('[data-menu-scene]');
  menuItems.forEach(item => {
    const itemIndex = parseInt(item.dataset.menuScene ?? '0', 10);
    item.classList.toggle('active', itemIndex === index);
  });

  // Update nav button states
  const prevBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-prev]'
  );
  const nextBtn = document.querySelector<HTMLButtonElement>(
    '[data-gallery-next]'
  );

  if (prevBtn) {
    prevBtn.disabled = index === 0;
    prevBtn.style.opacity = index === 0 ? '0.3' : '1';
  }
  if (nextBtn) {
    nextBtn.disabled = index === SCENE_IDS.length - 1;
    nextBtn.style.opacity = index === SCENE_IDS.length - 1 ? '0.3' : '1';
  }

  // Update data attribute on root
  const root = document.querySelector<HTMLElement>('[data-tower3d-root]');
  if (root) {
    root.dataset.towerScene = SCENE_IDS[index];
  }
}

export { goToScene, navigateScene, state };
