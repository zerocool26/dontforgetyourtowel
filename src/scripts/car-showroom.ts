import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import { createAstroMount } from './tower3d/core/astro-mount';
import { getTowerCaps } from './tower3d/core/caps';
import { CarShowroomScene } from './car-showroom/CarShowroomScene';
import { LIGHT_PRESETS, STYLE_PRESETS } from './car-showroom/presets';
import { MobileGestureHandler } from './car-showroom/MobileGestures';
import { TabSwipeHandler } from './car-showroom/TabSwipeHandler';
import { GyroscopeHandler } from './car-showroom/GyroscopeHandler';

const ROOT_SELECTOR = '[data-car-showroom-root]';

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

const normalizeHexColor = (value: string): string | null => {
  const raw = value.trim();
  if (!raw) return null;
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return hex.toLowerCase();
};

const clamp01 = (v: number) => clamp(v, 0, 1);

const parseNum = (value: string | null): number | null => {
  if (value == null) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

type SavedPreset = {
  id: string;
  name: string;
  state: Record<string, string>;
};

type ManualPartKind =
  | 'body'
  | 'decal'
  | 'trim'
  | 'wheel'
  | 'tire'
  | 'caliper'
  | 'light'
  | 'glass';

type PartMap = Record<string, ManualPartKind>;

const PRESETS_STORAGE_KEY = 'csr-presets-v1';

const PARTMAP_STORAGE_PREFIX = 'csr-partmap-v1::';

const isManualPartKind = (v: unknown): v is ManualPartKind =>
  v === 'body' ||
  v === 'decal' ||
  v === 'trim' ||
  v === 'wheel' ||
  v === 'tire' ||
  v === 'caliper' ||
  v === 'light' ||
  v === 'glass';

const normalizePartMap = (raw: unknown): PartMap => {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const out: PartMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k || '').trim();
    if (!key) continue;
    if (!isManualPartKind(v)) continue;
    out[key] = v;
  }
  return out;
};

const getPartMapStorageKey = (modelUrl: string): string | null => {
  const model = (modelUrl || '').trim();
  if (!model) return null;
  // Don't persist mappings for blob/data models.
  if (model.startsWith('blob:') || model.startsWith('data:')) return null;
  return `${PARTMAP_STORAGE_PREFIX}${model}`;
};

const loadPartMapForModel = (modelUrl: string): PartMap => {
  const key = getPartMapStorageKey(modelUrl);
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    const parsed = safeParseJson<unknown>(raw);
    return normalizePartMap(parsed);
  } catch {
    return {};
  }
};

const savePartMapForModel = (modelUrl: string, map: PartMap) => {
  const key = getPartMapStorageKey(modelUrl);
  if (!key) return;
  try {
    const keys = Object.keys(map);
    if (keys.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
};

// URL-safe base64 helpers for sharing smallish maps.
const toBase64Url = (text: string): string => {
  const b64 = btoa(unescape(encodeURIComponent(text)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (text: string): string | null => {
  try {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const b64 = padded + '='.repeat(padLen);
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
};

const safeParseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const createPresetId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return String(Date.now());
};

createAstroMount(ROOT_SELECTOR, () => {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  if (!root) return null;

  const canvas = root.querySelector<HTMLCanvasElement>(
    '[data-car-showroom-canvas]'
  );
  if (!canvas) return null;

  const caps = getTowerCaps();
  const enable3d = caps.webgl;

  // --- Floating Action Button (Mobile) ---
  const fabEl = root.querySelector<HTMLElement>('[data-csr-fab]');
  const fabTrigger = root.querySelector<HTMLButtonElement>(
    '[data-csr-fab-trigger]'
  );
  const fabMenu = root.querySelector<HTMLElement>('[data-csr-fab-menu]');
  const fabScreenshot = root.querySelector<HTMLButtonElement>(
    '[data-csr-fab-screenshot]'
  );
  const fabShare = root.querySelector<HTMLButtonElement>(
    '[data-csr-fab-share]'
  );
  const fabFrame = root.querySelector<HTMLButtonElement>(
    '[data-csr-fab-frame]'
  );
  const fabReset = root.querySelector<HTMLButtonElement>(
    '[data-csr-fab-reset]'
  );
  const fabGyro = root.querySelector<HTMLButtonElement>('[data-csr-fab-gyro]');

  let fabOpen = false;

  const toggleFAB = () => {
    fabOpen = !fabOpen;
    if (fabMenu && fabTrigger) {
      fabMenu.hidden = !fabOpen;
      fabTrigger.setAttribute('aria-expanded', String(fabOpen));
    }
  };

  const closeFAB = () => {
    fabOpen = false;
    if (fabMenu && fabTrigger) {
      fabMenu.hidden = true;
      fabTrigger.setAttribute('aria-expanded', 'false');
    }
  };

  // Show FAB on mobile
  const isMobileDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  if (fabEl && isMobileDevice() && root.dataset.carShowroomShowFab === 'true') {
    fabEl.hidden = false;
  }

  fabTrigger?.addEventListener('click', toggleFAB);

  // Close FAB when clicking outside
  document.addEventListener('click', e => {
    if (fabOpen && !fabEl?.contains(e.target as Node)) {
      closeFAB();
    }
  });

  // --- Orientation Change Handler ---
  let currentOrientation = window.matchMedia('(orientation: landscape)').matches
    ? 'landscape'
    : 'portrait';

  const handleOrientationChange = () => {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const newOrientation = isLandscape ? 'landscape' : 'portrait';

    if (newOrientation !== currentOrientation && isMobileDevice()) {
      currentOrientation = newOrientation;

      // Close FAB on orientation change
      closeFAB();

      // Show toast
      const message =
        newOrientation === 'landscape'
          ? 'Landscape mode: Panel moved to side'
          : 'Portrait mode restored';
      showToast(message);

      // Optional: Trigger a resize to ensure proper layout
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  };

  window
    .matchMedia('(orientation: landscape)')
    .addEventListener('change', handleOrientationChange);

  // --- Gyroscope Tilt Controls ---
  let gyroscopeHandler: GyroscopeHandler | null = null;
  let gyroActive = false;
  let gyroBaseYaw = 0;
  let gyroBasePitch = 0;

  if (isMobileDevice()) {
    gyroscopeHandler = new GyroscopeHandler({
      onRotate: (yaw, pitch) => {
        if (!gyroActive) return;

        // Update camera orbit targets
        const camYawRange =
          root.querySelector<HTMLInputElement>('[data-csr-cam-yaw]');
        const camPitchRange = root.querySelector<HTMLInputElement>(
          '[data-csr-cam-pitch]'
        );

        if (camYawRange && camPitchRange) {
          const newYaw = gyroBaseYaw + yaw * 100;
          const newPitch = Math.max(
            -10,
            Math.min(50, gyroBasePitch + pitch * 100)
          );

          camYawRange.value = String(Math.round(newYaw));
          camPitchRange.value = String(Math.round(newPitch));

          root.dataset.carShowroomCamYaw = String(newYaw);
          root.dataset.carShowroomCamPitch = String(newPitch);

          // Switch to manual camera mode
          const cameraModeSel = root.querySelector<HTMLSelectElement>(
            '[data-csr-camera-mode]'
          );
          if (cameraModeSel && cameraModeSel.value !== 'manual') {
            cameraModeSel.value = 'manual';
            root.dataset.carShowroomCameraMode = 'manual';
          }
        }
      },
    });
  }

  const toggleGyroscope = async () => {
    if (!gyroscopeHandler) {
      showToast('Gyroscope not supported on this device');
      return;
    }

    if (!gyroActive) {
      // Try to start gyroscope
      const started = await gyroscopeHandler.start();
      if (started) {
        gyroActive = true;

        // Save current camera position as base
        const camYawRange =
          root.querySelector<HTMLInputElement>('[data-csr-cam-yaw]');
        const camPitchRange = root.querySelector<HTMLInputElement>(
          '[data-csr-cam-pitch]'
        );
        gyroBaseYaw = parseFloat(camYawRange?.value || '0');
        gyroBasePitch = parseFloat(camPitchRange?.value || '0');

        gyroscopeHandler.calibrate();

        if (fabGyro) fabGyro.dataset.active = 'true';
        showToast('Tilt controls enabled');

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([10, 50, 10]);
        }
      } else {
        showToast('Gyroscope permission denied');
      }
    } else {
      // Stop gyroscope
      gyroscopeHandler.stop();
      gyroActive = false;
      if (fabGyro) fabGyro.dataset.active = 'false';
      showToast('Tilt controls disabled');
    }
  };

  fabGyro?.addEventListener('click', () => {
    closeFAB();
    setTimeout(toggleGyroscope, 100);
  });

  // --- Quality Badge ---
  const qualityBadge = root.querySelector<HTMLElement>(
    '[data-csr-quality-badge]'
  );
  const qualityFps = root.querySelector<HTMLElement>('[data-csr-quality-fps]');

  if (qualityBadge && isMobileDevice()) {
    qualityBadge.hidden = false;
  }

  const updateQualityBadge = (fps: number, _quality: string) => {
    if (!qualityFps || !qualityBadge) return;

    qualityFps.textContent = Math.round(fps).toString();

    // Update FPS level for color coding
    if (fps >= 50) {
      qualityBadge.dataset.fpsLevel = 'high';
    } else if (fps >= 35) {
      qualityBadge.dataset.fpsLevel = 'medium';
    } else {
      qualityBadge.dataset.fpsLevel = 'low';
    }
  };

  // --- Quick Color Palette ---
  const quickColorsEl = root.querySelector<HTMLElement>(
    '[data-csr-quick-colors]'
  );
  const quickColorButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.csr-quick-color')
  );

  if (quickColorsEl && isMobileDevice()) {
    quickColorsEl.hidden = false;
  }

  // Update active state on quick color buttons
  const updateQuickColorActive = (currentColor: string) => {
    for (const btn of quickColorButtons) {
      const btnColor = btn.dataset.color || '';
      btn.dataset.active =
        btnColor.toLowerCase() === currentColor.toLowerCase()
          ? 'true'
          : 'false';
    }
  };

  // Handle quick color selection
  for (const btn of quickColorButtons) {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      if (!color) return;

      // Update the main color input
      const colorInp = root.querySelector<HTMLInputElement>('[data-csr-color]');
      if (colorInp) {
        colorInp.value = color;
        colorInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Update dataset
      root.dataset.carShowroomColor = color;

      // Update active states
      updateQuickColorActive(color);

      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(15);
      }

      showToast(`Applied ${btn.title || 'color'}`);
      bumpRevision();
    });
  }

  // --- Smart Mobile Quick Bar ---
  const modePills = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.csr-mode-pill')
  );
  const quickStripColors = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-quick-color]')
  );
  const openColorsBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-open-colors]'
  );

  // Handle mode pill selection
  for (const pill of modePills) {
    pill.addEventListener('click', () => {
      const mode = pill.dataset.mode;
      if (!mode) return;

      // Update pill states
      for (const p of modePills) {
        const isActive = p.dataset.mode === mode;
        p.dataset.active = isActive ? 'true' : 'false';
        p.setAttribute('aria-checked', isActive ? 'true' : 'false');
      }

      // Update the main mode selector
      const modeSel = root.querySelector<HTMLSelectElement>('[data-csr-mode]');
      if (modeSel) {
        modeSel.value = mode;
        modeSel.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Update root dataset for CSS context styling
      root.dataset.carShowroomMode = mode;

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      bumpRevision();
    });
  }

  // Handle quick strip color selection
  for (const btn of quickStripColors) {
    btn.addEventListener('click', () => {
      const color = btn.dataset.quickColor;
      if (!color) return;

      // Update active state
      for (const b of quickStripColors) {
        b.dataset.active = b.dataset.quickColor === color ? 'true' : 'false';
      }

      // Update main color input
      const colorInp = root.querySelector<HTMLInputElement>('[data-csr-color]');
      if (colorInp) {
        colorInp.value = color;
        colorInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Update preview swatch
      const previewSwatch = root.querySelector<HTMLElement>(
        '[data-csr-color-preview]'
      );
      if (previewSwatch) {
        previewSwatch.style.background = color;
      }

      root.dataset.carShowroomColor = color;

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(8);
      }

      bumpRevision();
    });
  }

  // Open full color palette
  openColorsBtn?.addEventListener('click', () => {
    // Find and open the color accordion
    const colorAccordion = root.querySelector<HTMLDetailsElement>(
      '[data-csr-color-accordion]'
    );
    if (colorAccordion) {
      colorAccordion.open = true;
      colorAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Switch to Look tab if not already there
    const lookTabBtn = root.querySelector<HTMLButtonElement>(
      '[data-csr-tab-btn="look"]'
    );
    lookTabBtn?.click();
  });

  // Sync mode pills when mode selector changes
  const syncModePills = () => {
    const currentMode = root.dataset.carShowroomMode || 'paint';
    for (const pill of modePills) {
      const isActive = pill.dataset.mode === currentMode;
      pill.dataset.active = isActive ? 'true' : 'false';
      pill.setAttribute('aria-checked', isActive ? 'true' : 'false');
    }
  };

  // Sync quick strip colors with current color
  const syncQuickStripColors = () => {
    const currentColor = root.dataset.carShowroomColor || '#00d1b2';
    for (const btn of quickStripColors) {
      const isActive =
        btn.dataset.quickColor?.toLowerCase() === currentColor.toLowerCase();
      btn.dataset.active = isActive ? 'true' : 'false';
    }
  };

  // --- Floating Action Bar ---
  const floatingBar = root.querySelector<HTMLElement>(
    '[data-csr-floating-bar]'
  );
  const floatingScreenshotBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-floating-screenshot]'
  );
  const floatingShareBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-floating-share]'
  );
  const floatingRandomizeBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-floating-randomize]'
  );

  let floatingBarVisible = false;
  let floatingBarTimeout: number | null = null;

  const showFloatingBar = () => {
    if (!floatingBar || !isMobileDevice()) return;
    floatingBar.dataset.visible = 'true';
    floatingBarVisible = true;

    // Auto-hide after 5 seconds
    if (floatingBarTimeout) {
      window.clearTimeout(floatingBarTimeout);
    }
    floatingBarTimeout = window.setTimeout(() => {
      hideFloatingBar();
    }, 5000);
  };

  const hideFloatingBar = () => {
    if (!floatingBar) return;
    floatingBar.dataset.visible = 'false';
    floatingBarVisible = false;
  };

  // Show floating bar on color/mode changes
  const onConfigChange = () => {
    syncModePills();
    syncQuickStripColors();
    if (isMobileDevice()) {
      showFloatingBar();
    }
  };

  // Wire floating bar buttons
  floatingScreenshotBtn?.addEventListener('click', () => {
    const screenshotBtn = root.querySelector<HTMLButtonElement>(
      '[data-csr-screenshot]'
    );
    screenshotBtn?.click();
    hideFloatingBar();
  });

  floatingShareBtn?.addEventListener('click', () => {
    const copyLinkBtn = root.querySelector<HTMLButtonElement>(
      '[data-csr-copy-link]'
    );
    copyLinkBtn?.click();
    hideFloatingBar();
  });

  floatingRandomizeBtn?.addEventListener('click', () => {
    const randomizeBtn = root.querySelector<HTMLButtonElement>(
      '[data-csr-randomize-look]'
    );
    randomizeBtn?.click();
  });

  // --- UI wiring (dataset-driven)
  const bumpRevision = () => {
    const ds = root.dataset;
    const n = Number.parseInt(ds.carShowroomUiRevision ?? '0', 10);
    ds.carShowroomUiRevision = String(Number.isFinite(n) ? n + 1 : 1);
  };

  const panel = root.querySelector<HTMLElement>('[data-csr-panel]');
  const panelHead =
    panel?.querySelector<HTMLElement>('.csr-panel-head') || null;
  const sheetHandle = root.querySelector<HTMLButtonElement>(
    '[data-csr-sheet-handle]'
  );
  const filterInput = root.querySelector<HTMLInputElement>('[data-csr-filter]');
  const filterClearBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-filter-clear]'
  );
  const filterEmpty = root.querySelector<HTMLElement>(
    '[data-csr-filter-empty]'
  );
  const loadingEl = root.querySelector<HTMLElement>('[data-csr-loading]');
  const errorEl = root.querySelector<HTMLElement>('[data-csr-error]');
  const togglePanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-toggle-panel]'
  );
  const quickPanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-quick-panel]'
  );
  const quickFrameBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-quick-frame]'
  );
  const quickResetBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-quick-reset]'
  );
  const quickSpinChk = root.querySelector<HTMLInputElement>(
    '[data-csr-quick-spin]'
  );
  const quickZoomRange = root.querySelector<HTMLInputElement>(
    '[data-csr-quick-zoom]'
  );
  const quickStyleSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-quick-style]'
  );
  const quickLightSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-quick-light]'
  );
  const closePanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-close-panel]'
  );
  const toolsFrameBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-tools-frame]'
  );
  const toolsResetViewBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-tools-reset-view]'
  );
  const toolsShareBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-tools-share]'
  );
  const toolsScreenshotBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-tools-screenshot]'
  );
  const toolsImportBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-tools-import]'
  );
  const toolsGyroBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-tools-gyro]'
  );
  const copyLinkBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-copy-link]'
  );
  const screenshotBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-screenshot]'
  );
  const importBtn = root.querySelector<HTMLButtonElement>('[data-csr-import]');
  const fileInp = root.querySelector<HTMLInputElement>('[data-csr-file]');
  const modelSel = root.querySelector<HTMLSelectElement>('[data-csr-model]');
  const modelUrlInp = root.querySelector<HTMLInputElement>(
    '[data-csr-model-url]'
  );
  const loadModelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-load-model]'
  );
  const modeSel = root.querySelector<HTMLSelectElement>('[data-csr-mode]');
  const cameraSel = root.querySelector<HTMLSelectElement>('[data-csr-camera]');
  const cameraModeSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-camera-mode]'
  );
  const camYawRange =
    root.querySelector<HTMLInputElement>('[data-csr-cam-yaw]');
  const camPitchRange = root.querySelector<HTMLInputElement>(
    '[data-csr-cam-pitch]'
  );
  const camDistanceRange = root.querySelector<HTMLInputElement>(
    '[data-csr-cam-distance]'
  );
  const fovRange = root.querySelector<HTMLInputElement>('[data-csr-fov]');
  const frameBtn = root.querySelector<HTMLButtonElement>('[data-csr-frame]');
  const focusSelectionBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-focus-selection]'
  );
  const resetViewBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-reset-view]'
  );
  const colorInp = root.querySelector<HTMLInputElement>('[data-csr-color]');
  const wrapColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-wrap-color]'
  );
  const wrapPatternSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-wrap-pattern]'
  );
  const wrapScaleRange = root.querySelector<HTMLInputElement>(
    '[data-csr-wrap-scale]'
  );
  const wrapStyleSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-wrap-style]'
  );
  const wrapTintRange = root.querySelector<HTMLInputElement>(
    '[data-csr-wrap-tint]'
  );
  const wrapRotRange = root.querySelector<HTMLInputElement>(
    '[data-csr-wrap-rot]'
  );
  const wrapOffsetXRange =
    root.querySelector<HTMLInputElement>('[data-csr-wrap-ox]');
  const wrapOffsetYRange =
    root.querySelector<HTMLInputElement>('[data-csr-wrap-oy]');
  const stylePresetSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-style-preset]'
  );
  const finishSel = root.querySelector<HTMLSelectElement>('[data-csr-finish]');
  const clearcoatRange = root.querySelector<HTMLInputElement>(
    '[data-csr-clearcoat]'
  );
  const flakeIntensityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-flake-intensity]'
  );
  const flakeScaleRange = root.querySelector<HTMLInputElement>(
    '[data-csr-flake-scale]'
  );
  const pearlRange = root.querySelector<HTMLInputElement>('[data-csr-pearl]');
  const pearlThicknessRange = root.querySelector<HTMLInputElement>(
    '[data-csr-pearl-thickness]'
  );
  const wheelFinishSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-wheel-finish]'
  );
  const wheelColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-wheel-color]'
  );
  const trimFinishSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-trim-finish]'
  );
  const trimColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-trim-color]'
  );
  const caliperColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-caliper-color]'
  );
  const lightColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-light-color]'
  );
  const lightGlowRange = root.querySelector<HTMLInputElement>(
    '[data-csr-light-glow]'
  );
  const glassTintRange = root.querySelector<HTMLInputElement>(
    '[data-csr-glass-tint]'
  );
  const bgSel = root.querySelector<HTMLSelectElement>('[data-csr-background]');
  const envIntensityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-env-intensity]'
  );
  const lightPresetSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-light-preset]'
  );
  const lightIntensityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-light-intensity]'
  );
  const lightWarmthRange = root.querySelector<HTMLInputElement>(
    '[data-csr-light-warmth]'
  );
  const rimBoostRange = root.querySelector<HTMLInputElement>(
    '[data-csr-rim-boost]'
  );
  const rigYawRange =
    root.querySelector<HTMLInputElement>('[data-csr-rig-yaw]');
  const rigHeightRange = root.querySelector<HTMLInputElement>(
    '[data-csr-rig-height]'
  );
  const gridToggle = root.querySelector<HTMLInputElement>('[data-csr-grid]');
  const underglowColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-underglow-color]'
  );
  const underglowRange = root.querySelector<HTMLInputElement>(
    '[data-csr-underglow]'
  );
  const underglowPulseRange = root.querySelector<HTMLInputElement>(
    '[data-csr-underglow-pulse]'
  );
  const underglowSizeRange = root.querySelector<HTMLInputElement>(
    '[data-csr-underglow-size]'
  );
  const shadowStrengthRange =
    root.querySelector<HTMLInputElement>('[data-csr-shadow]');
  const shadowSizeRange = root.querySelector<HTMLInputElement>(
    '[data-csr-shadow-size]'
  );
  const floorPresetSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-floor-preset]'
  );
  const floorColorInp = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-color]'
  );
  const floorRoughnessRange = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-roughness]'
  );
  const floorMetalnessRange = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-metalness]'
  );
  const floorOpacityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-floor-opacity]'
  );
  const exposureRange = root.querySelector<HTMLInputElement>(
    '[data-csr-exposure]'
  );
  const bloomStrengthRange =
    root.querySelector<HTMLInputElement>('[data-csr-bloom]');
  const bloomThresholdRange = root.querySelector<HTMLInputElement>(
    '[data-csr-bloom-threshold]'
  );
  const bloomRadiusRange = root.querySelector<HTMLInputElement>(
    '[data-csr-bloom-radius]'
  );
  const autoRotateChk = root.querySelector<HTMLInputElement>(
    '[data-csr-autorotate]'
  );
  const motionStyleSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-motion-style]'
  );
  const spinSpeedRange = root.querySelector<HTMLInputElement>(
    '[data-csr-spinspeed]'
  );
  const motionRange = root.querySelector<HTMLInputElement>(
    '[data-csr-motion-range]'
  );
  const zoomRange = root.querySelector<HTMLInputElement>('[data-csr-zoom]');
  const zoomWideBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-zoom-wide]'
  );
  const zoomMidBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-zoom-mid]'
  );
  const zoomCloseBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-zoom-close]'
  );
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-csr-reset]');
  const resetCameraBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-reset-camera]'
  );

  const presetSel = root.querySelector<HTMLSelectElement>('[data-csr-preset]');
  const presetSaveBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-preset-save]'
  );
  const presetLoadBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-preset-load]'
  );
  const presetDeleteBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-preset-delete]'
  );

  const swatches = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-csr-swatch]')
  );
  const colorPreviewSwatch = root.querySelector<HTMLElement>(
    '[data-csr-color-preview]'
  );
  const randomizeLookBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-randomize-look]'
  );

  // Update the accordion preview swatch to show current body color
  const updateColorPreview = (hex: string) => {
    if (colorPreviewSwatch) {
      colorPreviewSwatch.style.background = hex;
    }
  };

  const selectedPartEl = root.querySelector<HTMLElement>(
    '[data-csr-selected-part]'
  );
  const selectedMeshEl = root.querySelector<HTMLElement>(
    '[data-csr-selected-mesh]'
  );
  const selectedPathEl = root.querySelector<HTMLElement>(
    '[data-csr-selected-path]'
  );
  const selectedMaterialEl = root.querySelector<HTMLElement>(
    '[data-csr-selected-material]'
  );
  const modelSizeEl = root.querySelector<HTMLElement>('[data-csr-model-size]');
  const modelMeshesEl = root.querySelector<HTMLElement>(
    '[data-csr-model-meshes]'
  );
  const modelTrisEl = root.querySelector<HTMLElement>('[data-csr-model-tris]');
  const fpsEl = root.querySelector<HTMLElement>('[data-csr-fps]');
  const qualitySel =
    root.querySelector<HTMLSelectElement>('[data-csr-quality]');
  const autoQualityChk = root.querySelector<HTMLInputElement>(
    '[data-csr-auto-quality]'
  );
  const shotScaleSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-shot-scale]'
  );
  const shotTransparentChk = root.querySelector<HTMLInputElement>(
    '[data-csr-shot-transparent]'
  );
  const rideHeightRange = root.querySelector<HTMLInputElement>(
    '[data-csr-ride-height]'
  );
  const modelYawRange = root.querySelector<HTMLInputElement>(
    '[data-csr-model-yaw]'
  );
  const clearSelectionBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-clear-selection]'
  );
  const copyBuildBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-copy-build]'
  );

  const assignPartSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-assign-part]'
  );
  const assignApplyBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-assign-apply]'
  );
  const assignClearAllBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-assign-clear-all]'
  );
  const buildsheetPasteTa = root.querySelector<HTMLTextAreaElement>(
    '[data-csr-buildsheet-paste]'
  );
  const buildsheetApplyBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-buildsheet-apply]'
  );
  const buildsheetClearBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-buildsheet-clear]'
  );

  // --- Panel tabs (mobile-friendly)
  const TAB_STORAGE_KEY = 'csr-active-tab-v1';
  const tabButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-csr-tab-btn]')
  );
  const tabPanels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-csr-tab-panel]')
  );
  const tabSelect = root.querySelector<HTMLSelectElement>(
    '[data-csr-tab-select]'
  );

  const getTabId = (el: Element) =>
    (el.getAttribute('data-csr-tab-btn') || '').trim();
  const getPanelId = (el: Element) =>
    (el.getAttribute('data-csr-tab-panel') || '').trim();

  // Panel snap state - must be defined before setActiveTab which uses them
  type PanelSnap = 'collapsed' | 'peek' | 'half' | 'full';
  const isMobilePanel = () => window.matchMedia('(max-width: 980px)').matches;
  let panelSnap: PanelSnap = 'peek';

  // Mobile bottom tab bar (queried early so setActiveTab can use it)
  const mobileTabBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-csr-mobile-tab]')
  );

  const setActiveTab = (tabId: string) => {
    if (!tabId) return;
    let matched = false;

    for (const btn of tabButtons) {
      const id = getTabId(btn);
      const active = id === tabId;
      if (active) matched = true;
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    }

    for (const panelEl of tabPanels) {
      const id = getPanelId(panelEl);
      panelEl.hidden = id !== tabId;
    }

    if (tabSelect && tabSelect.value !== tabId) {
      tabSelect.value = tabId;
    }

    // Update mobile bottom tab bar
    for (const mobileBtn of mobileTabBtns) {
      const mobileTabId = mobileBtn.getAttribute('data-csr-mobile-tab') || '';
      const isActive = mobileTabId === tabId;
      mobileBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    if (matched) {
      try {
        localStorage.setItem(TAB_STORAGE_KEY, tabId);
      } catch {
        // ignore
      }

      // If the docked panel is collapsed on mobile, opening a tab should
      // expand it so the content is actually usable.
      if (isMobilePanel() && panelSnap === 'collapsed') {
        setPanelSnap('peek', true);
      }
    }
  };

  const initTabs = () => {
    if (tabButtons.length === 0 || tabPanels.length === 0) return;

    const saved = (() => {
      try {
        return (localStorage.getItem(TAB_STORAGE_KEY) || '').trim();
      } catch {
        return '';
      }
    })();

    const findTab = (id: string) =>
      tabButtons.find(btn => getTabId(btn) === id) || null;

    const preferredFallback = isMobileDevice()
      ? findTab('quick')
      : findTab('look');
    const fallback = getTabId(preferredFallback || tabButtons[0]);

    const savedBtn = saved ? findTab(saved) : null;
    const initial = savedBtn ? saved : fallback;
    setActiveTab(initial);

    for (const btn of tabButtons) {
      btn.addEventListener('click', () => {
        const id = getTabId(btn);
        setActiveTab(id);
      });

      btn.addEventListener('keydown', e => {
        const key = e.key;
        if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
        if (tabButtons.length < 2) return;
        e.preventDefault();

        const currentIndex = tabButtons.indexOf(btn);
        const dir = key === 'ArrowRight' ? 1 : -1;
        const nextIndex =
          (currentIndex + dir + tabButtons.length) % tabButtons.length;
        const nextBtn = tabButtons[nextIndex];
        nextBtn.focus();
        setActiveTab(getTabId(nextBtn));
      });
    }

    tabSelect?.addEventListener('change', () => {
      const next = (tabSelect.value || '').trim();
      setActiveTab(next);
    });
  };

  let currentObjectUrl: string | null = null;
  let zoomTarget = 0;

  initTabs();

  // Handle mobile bottom tab bar clicks
  for (const btn of mobileTabBtns) {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-csr-mobile-tab') || '';
      if (tabId) {
        setActiveTab(tabId);

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    });
  }

  // Tab swipe navigation for mobile
  let tabSwipeHandler: TabSwipeHandler | null = null;
  const tabPanelsContainer = root.querySelector<HTMLElement>(
    '[data-csr-tab-panels]'
  );

  const navigateTab = (direction: 'next' | 'prev') => {
    if (tabButtons.length < 2) return;

    // Find current active tab
    let currentIndex = 0;
    for (let i = 0; i < tabButtons.length; i++) {
      if (tabButtons[i].getAttribute('aria-selected') === 'true') {
        currentIndex = i;
        break;
      }
    }

    // Calculate next index
    const offset = direction === 'next' ? 1 : -1;
    const nextIndex =
      (currentIndex + offset + tabButtons.length) % tabButtons.length;
    const nextBtn = tabButtons[nextIndex];
    const nextId = getTabId(nextBtn);

    setActiveTab(nextId);
  };

  // Wire Tools tab actions (mobile-friendly)
  toolsFrameBtn?.addEventListener('click', () => {
    frameBtn?.click();
  });
  toolsResetViewBtn?.addEventListener('click', () => {
    resetViewBtn?.click();
  });
  toolsShareBtn?.addEventListener('click', () => {
    copyLinkBtn?.click();
  });
  toolsScreenshotBtn?.addEventListener('click', () => {
    screenshotBtn?.click();
  });
  toolsImportBtn?.addEventListener('click', () => {
    importBtn?.click();
  });
  toolsGyroBtn?.addEventListener('click', () => {
    void toggleGyroscope();
  });

  if (tabPanelsContainer && isMobileDevice()) {
    tabSwipeHandler = new TabSwipeHandler(tabPanelsContainer, navigateTab);

    // Update tab edge state when tab changes for rubber band effect
    const updateTabEdgeState = () => {
      if (!tabSwipeHandler) return;
      let currentIndex = 0;
      for (let i = 0; i < tabButtons.length; i++) {
        if (tabButtons[i].getAttribute('aria-selected') === 'true') {
          currentIndex = i;
          break;
        }
      }
      const isAtStart = currentIndex === 0;
      const isAtEnd = currentIndex === tabButtons.length - 1;
      tabSwipeHandler.setEdgeState(isAtStart, isAtEnd);
    };

    // Update on tab change - attach listeners to update edge state
    for (const btn of tabButtons) {
      btn.addEventListener('click', () => updateTabEdgeState());
    }
    for (const mobileBtn of mobileTabBtns) {
      mobileBtn.addEventListener('click', () => updateTabEdgeState());
    }
    updateTabEdgeState();

    // Add scroll position tracking for edge glow effects
    tabPanelsContainer.addEventListener(
      'scroll',
      () => {
        const scrollTop = tabPanelsContainer.scrollTop;
        const scrollHeight = tabPanelsContainer.scrollHeight;
        const clientHeight = tabPanelsContainer.clientHeight;
        const isAtTop = scrollTop <= 5;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;

        if (isAtTop) {
          tabPanelsContainer.setAttribute('data-scroll', 'top');
        } else if (isAtBottom) {
          tabPanelsContainer.setAttribute('data-scroll', 'bottom');
        } else {
          tabPanelsContainer.removeAttribute('data-scroll');
        }
      },
      { passive: true }
    );
  }

  const filterTargets = Array.from(
    root.querySelectorAll<HTMLElement>(
      '.csr-tab-panels .csr-field:not([data-csr-no-filter]), .csr-tab-panels .csr-row:not([data-csr-no-filter])'
    )
  );
  const filterText = new Map<HTMLElement, string>();
  const normalizeFilterText = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  filterTargets.forEach(el => {
    const label = normalizeFilterText(el.textContent || '');
    filterText.set(el, label);
  });

  const applyFilter = (query: string) => {
    const q = normalizeFilterText(query);
    let matches = 0;
    filterTargets.forEach(el => {
      const text = filterText.get(el) || '';
      const hit = !q || text.includes(q);
      el.hidden = !hit;
      if (hit) matches += 1;
    });
    if (filterEmpty) {
      filterEmpty.hidden = !q || matches > 0;
    }
  };

  filterInput?.addEventListener('input', () => {
    applyFilter(filterInput.value);
  });

  filterInput?.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    filterInput.value = '';
    applyFilter('');
  });

  filterClearBtn?.addEventListener('click', () => {
    if (!filterInput) return;
    filterInput.value = '';
    applyFilter('');
    filterInput.focus();
  });

  // Create ARIA live region for screen reader announcements
  let liveRegion = document.getElementById('csr-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'csr-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(liveRegion);
  }

  const showToast = (
    message: string,
    type: 'info' | 'success' | 'error' = 'info'
  ) => {
    root.dataset.carShowroomLoadError = message;
    syncStatus();

    // Announce to screen readers
    if (liveRegion) {
      liveRegion.textContent = message;
    }

    // Create visual toast element if it doesn't exist
    let toast = document.querySelector('.csr-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'csr-toast';
      toast.setAttribute('role', 'alert');
      document.body.appendChild(toast);
    }

    // Update toast content and show
    toast.textContent = message;
    toast.className = `csr-toast csr-toast--${type}`;
    requestAnimationFrame(() => {
      toast?.classList.add('is-visible');
    });

    window.setTimeout(() => {
      toast?.classList.remove('is-visible');
      if ((root.dataset.carShowroomLoadError || '') === message) {
        root.dataset.carShowroomLoadError = '';
      }
    }, 2200);
  };

  const applyQueryState = () => {
    const params = new URLSearchParams(window.location.search);
    const model = params.get('model');
    const mode = params.get('mode');
    const color = params.get('color');
    const finish = params.get('finish');
    const wheel = params.get('wheel');
    const trim = params.get('trim');
    const whc = params.get('whc');
    const trc = params.get('trc');
    const ccol = params.get('ccol');
    const lcol = params.get('lcol');
    const lglow = params.get('lglow');
    const tint = params.get('tint');
    const bg = params.get('bg');
    const cam = params.get('cam');
    const spin = params.get('spin');
    const zoom = params.get('zoom');
    const ar = params.get('ar');
    const aq = params.get('aq');
    const ms = params.get('ms');
    const ma = params.get('ma');
    const cm = params.get('cm');
    const yaw = params.get('yaw');
    const pitch = params.get('pitch');
    const dist = params.get('dist');
    const fov = params.get('fov');
    const lx = params.get('lx');
    const ly = params.get('ly');
    const lz = params.get('lz');
    const exp = params.get('exp');
    const bloom = params.get('bloom');
    const bt = params.get('bt');
    const br = params.get('br');
    const cc = params.get('cc');
    const fi = params.get('fi');
    const fs = params.get('fs');
    const pr = params.get('pr');
    const pt = params.get('pt');
    const rh = params.get('rh');
    const my = params.get('my');
    const lw = params.get('lw');
    const rb = params.get('rb');
    const lp = params.get('lp');

    const env = params.get('env');
    const li = params.get('li');
    const ry = params.get('ry');
    const rgh = params.get('rgh');
    const grid = params.get('grid');
    const ug = params.get('ug');
    const ugc = params.get('ugc');
    const ugs = params.get('ugs');
    const up = params.get('up');
    const ss = params.get('ss');
    const sz = params.get('sz');
    const floor = params.get('floor');
    const fcol = params.get('fcol');
    const fr = params.get('fr');
    const fm = params.get('fm');
    const fo = params.get('fo');

    const wcolor = params.get('wcolor');
    const wpat = params.get('wpat');
    const wscale = params.get('wscale');
    const wstyle = params.get('wstyle');
    const wtint = params.get('wtint');
    const wrot = params.get('wrot');
    const wox = params.get('wox');
    const woy = params.get('woy');

    const pm = params.get('pm');

    if (model) root.dataset.carShowroomModel = model;

    if (
      mode === 'paint' ||
      mode === 'wrap' ||
      mode === 'glass' ||
      mode === 'wireframe' ||
      mode === 'factory'
    ) {
      root.dataset.carShowroomMode = mode;
    }
    if (finish) root.dataset.carShowroomFinish = finish;
    const fiN = parseNum(fi);
    if (fiN !== null)
      root.dataset.carShowroomFlakeIntensity = String(clamp01(fiN));
    const fsN = parseNum(fs);
    if (fsN !== null)
      root.dataset.carShowroomFlakeScale = String(clamp(fsN, 0.5, 8));
    if (wheel) root.dataset.carShowroomWheelFinish = wheel;
    if (trim) root.dataset.carShowroomTrimFinish = trim;
    if (bg) root.dataset.carShowroomBackground = bg;
    if (cam) root.dataset.carShowroomCameraPreset = cam;

    if (whc) {
      const hex = normalizeHexColor(whc);
      if (hex) root.dataset.carShowroomWheelColor = hex;
    }
    if (trc) {
      const hex = normalizeHexColor(trc);
      if (hex) root.dataset.carShowroomTrimColor = hex;
    }
    if (ccol) {
      const hex = normalizeHexColor(ccol);
      if (hex) root.dataset.carShowroomCaliperColor = hex;
    }
    if (lcol) {
      const hex = normalizeHexColor(lcol);
      if (hex) root.dataset.carShowroomLightColor = hex;
    }

    const lglowN = parseNum(lglow);
    if (lglowN !== null)
      root.dataset.carShowroomLightGlow = String(clamp(lglowN, 0, 4));

    if (color) {
      const hex = normalizeHexColor(color);
      if (hex) root.dataset.carShowroomColor = hex;
    }

    const tintN = parseNum(tint);
    if (tintN !== null)
      root.dataset.carShowroomGlassTint = String(clamp01(tintN));

    const lwN = parseNum(lw);
    if (lwN !== null)
      root.dataset.carShowroomLightWarmth = String(clamp01(lwN));

    const rbN = parseNum(rb);
    if (rbN !== null)
      root.dataset.carShowroomRimBoost = String(clamp(rbN, 0.5, 2));

    if (lp) root.dataset.carShowroomLightPreset = lp;

    const ccN = parseNum(cc);
    if (ccN !== null) root.dataset.carShowroomClearcoat = String(clamp01(ccN));

    const prN = parseNum(pr);
    if (prN !== null) root.dataset.carShowroomPearl = String(clamp01(prN));

    const ptN = parseNum(pt);
    if (ptN !== null)
      root.dataset.carShowroomPearlThickness = String(clamp(ptN, 100, 800));

    const rhN = parseNum(rh);
    if (rhN !== null)
      root.dataset.carShowroomRideHeight = String(clamp(rhN, -0.3, 0.3));

    const myN = parseNum(my);
    if (myN !== null)
      root.dataset.carShowroomModelYaw = String(clamp(myN, 0, 360));

    const spinN = parseNum(spin);
    if (spinN !== null)
      root.dataset.carShowroomSpinSpeed = String(clamp(spinN, 0, 2));

    const zoomN = parseNum(zoom);
    if (zoomN !== null) root.dataset.carShowroomZoom = String(clamp01(zoomN));

    if (ar === '0' || ar === 'false')
      root.dataset.carShowroomAutoRotate = 'false';
    if (ar === '1' || ar === 'true')
      root.dataset.carShowroomAutoRotate = 'true';

    if (aq === '0' || aq === 'false')
      root.dataset.carShowroomAutoQuality = 'false';
    if (aq === '1' || aq === 'true')
      root.dataset.carShowroomAutoQuality = 'true';

    if (ms === 'spin' || ms === 'orbit' || ms === 'pendulum') {
      root.dataset.carShowroomMotionStyle = ms;
    }

    const maN = parseNum(ma);
    if (maN !== null)
      root.dataset.carShowroomMotionRange = String(clamp(maN, 0, 45));

    if (cm === 'manual' || cm === 'preset')
      root.dataset.carShowroomCameraMode = cm;

    const yawN = parseNum(yaw);
    if (yawN !== null)
      root.dataset.carShowroomCamYaw = String(clamp(yawN, -180, 180));
    const pitchN = parseNum(pitch);
    if (pitchN !== null)
      root.dataset.carShowroomCamPitch = String(clamp(pitchN, -5, 60));
    const distN = parseNum(dist);
    if (distN !== null)
      root.dataset.carShowroomCamDistance = String(clamp(distN, 2.5, 14));
    const fovN = parseNum(fov);
    if (fovN !== null)
      root.dataset.carShowroomFov = String(clamp(fovN, 35, 85));

    const lxN = parseNum(lx);
    const lyN = parseNum(ly);
    const lzN = parseNum(lz);
    if (lxN !== null) root.dataset.carShowroomLookAtX = String(lxN);
    if (lyN !== null) root.dataset.carShowroomLookAtY = String(lyN);
    if (lzN !== null) root.dataset.carShowroomLookAtZ = String(lzN);

    const expN = parseNum(exp);
    if (expN !== null)
      root.dataset.carShowroomExposure = String(clamp(expN, 0.1, 3));

    const bloomN = parseNum(bloom);
    if (bloomN !== null)
      root.dataset.carShowroomBloomStrength = String(clamp(bloomN, 0, 3));

    const btN = parseNum(bt);
    if (btN !== null)
      root.dataset.carShowroomBloomThreshold = String(clamp01(btN));

    const brN = parseNum(br);
    if (brN !== null)
      root.dataset.carShowroomBloomRadius = String(clamp01(brN));

    const envN = parseNum(env);
    if (envN !== null)
      root.dataset.carShowroomEnvIntensity = String(clamp(envN, 0, 3));

    const liN = parseNum(li);
    if (liN !== null)
      root.dataset.carShowroomLightIntensity = String(clamp(liN, 0.2, 2.5));

    const ryN = parseNum(ry);
    if (ryN !== null)
      root.dataset.carShowroomRigYaw = String(clamp(ryN, 0, 360));

    const rghN = parseNum(rgh);
    if (rghN !== null)
      root.dataset.carShowroomRigHeight = String(clamp(rghN, 0.6, 1.6));

    if (grid === '1' || grid === 'true') root.dataset.carShowroomGrid = 'true';
    if (grid === '0' || grid === 'false')
      root.dataset.carShowroomGrid = 'false';

    const ugN = parseNum(ug);
    if (ugN !== null)
      root.dataset.carShowroomUnderglow = String(clamp(ugN, 0, 5));

    if (ugc) {
      const hex = normalizeHexColor(ugc);
      if (hex) root.dataset.carShowroomUnderglowColor = hex;
    }

    const ugsN = parseNum(ugs);
    if (ugsN !== null)
      root.dataset.carShowroomUnderglowSize = String(clamp(ugsN, 2, 8));

    const upN = parseNum(up);
    if (upN !== null)
      root.dataset.carShowroomUnderglowPulse = String(clamp01(upN));

    const ssN = parseNum(ss);
    if (ssN !== null)
      root.dataset.carShowroomShadowStrength = String(clamp01(ssN));

    const szN = parseNum(sz);
    if (szN !== null)
      root.dataset.carShowroomShadowSize = String(clamp(szN, 3, 10));

    if (
      floor === 'auto' ||
      floor === 'asphalt' ||
      floor === 'matte' ||
      floor === 'polished' ||
      floor === 'glass'
    ) {
      root.dataset.carShowroomFloorPreset = floor;
    }

    if (fcol) {
      const hex = normalizeHexColor(fcol);
      if (hex) root.dataset.carShowroomFloorColor = hex;
    }

    const frN = parseNum(fr);
    if (frN !== null)
      root.dataset.carShowroomFloorRoughness = String(clamp01(frN));

    const fmN = parseNum(fm);
    if (fmN !== null)
      root.dataset.carShowroomFloorMetalness = String(clamp01(fmN));

    const foN = parseNum(fo);
    if (foN !== null)
      root.dataset.carShowroomFloorOpacity = String(clamp(foN, 0, 1));

    if (wcolor) {
      const hex = normalizeHexColor(wcolor);
      if (hex) root.dataset.carShowroomWrapColor = hex;
    }

    if (
      wpat === 'solid' ||
      wpat === 'stripes' ||
      wpat === 'carbon' ||
      wpat === 'camo' ||
      wpat === 'checker' ||
      wpat === 'hex' ||
      wpat === 'race'
    ) {
      root.dataset.carShowroomWrapPattern = wpat;
    }

    const wscaleN = parseNum(wscale);
    if (wscaleN !== null)
      root.dataset.carShowroomWrapScale = String(clamp(wscaleN, 0.2, 6));

    if (wstyle === 'oem' || wstyle === 'procedural') {
      root.dataset.carShowroomWrapStyle = wstyle;
    }

    const wtintN = parseNum(wtint);
    if (wtintN !== null)
      root.dataset.carShowroomWrapTint = String(clamp01(wtintN));

    const wrotN = parseNum(wrot);
    if (wrotN !== null)
      root.dataset.carShowroomWrapRotationDeg = String(clamp(wrotN, -180, 180));

    const woxN = parseNum(wox);
    if (woxN !== null)
      root.dataset.carShowroomWrapOffsetX = String(clamp(woxN, -2, 2));

    const woyN = parseNum(woy);
    if (woyN !== null)
      root.dataset.carShowroomWrapOffsetY = String(clamp(woyN, -2, 2));

    if (pm) {
      const decoded = fromBase64Url(pm);
      const parsed = decoded ? safeParseJson<unknown>(decoded) : null;
      const map = normalizePartMap(parsed);
      const json = Object.keys(map).length ? JSON.stringify(map) : '';
      if (json) root.dataset.carShowroomPartMap = json;
    }
  };

  // Apply deep-link state before defaults so query params win.
  applyQueryState();

  if (!enable3d) {
    root.dataset.carShowroomLoadError =
      'WebGL is unavailable. Controls are enabled, but 3D rendering is off.';
  }

  const syncStatus = () => {
    const ds = root.dataset;
    const isLoading = ds.carShowroomLoading === '1';
    const error = (ds.carShowroomLoadError || '').trim();

    if (loadingEl) loadingEl.hidden = !isLoading;
    if (errorEl) {
      errorEl.hidden = error.length === 0;
      errorEl.textContent = error;
    }
  };

  const syncModelStats = () => {
    const ds = root.dataset;
    const sizeX = (ds.carShowroomModelSizeX || '').trim();
    const sizeY = (ds.carShowroomModelSizeY || '').trim();
    const sizeZ = (ds.carShowroomModelSizeZ || '').trim();
    const meshes = (ds.carShowroomModelMeshes || '').trim();
    const tris = (ds.carShowroomModelTris || '').trim();
    const fps = (ds.carShowroomFps || '').trim();

    if (modelSizeEl) {
      modelSizeEl.textContent =
        sizeX && sizeY && sizeZ ? `${sizeX} × ${sizeY} × ${sizeZ}` : '—';
    }
    if (modelMeshesEl) modelMeshesEl.textContent = meshes || '—';
    if (modelTrisEl) modelTrisEl.textContent = tris || '—';
    if (fpsEl) fpsEl.textContent = fps || '—';
  };

  const PRESET_DATASET_KEYS: Array<keyof DOMStringMap> = [
    'carShowroomQuality',
    'carShowroomModel',
    'carShowroomMode',
    'carShowroomColor',
    'carShowroomWrapColor',
    'carShowroomWrapPattern',
    'carShowroomWrapScale',
    'carShowroomWrapStyle',
    'carShowroomWrapTint',
    'carShowroomWrapRotationDeg',
    'carShowroomWrapOffsetX',
    'carShowroomWrapOffsetY',
    'carShowroomFinish',
    'carShowroomClearcoat',
    'carShowroomFlakeIntensity',
    'carShowroomFlakeScale',
    'carShowroomPearl',
    'carShowroomPearlThickness',
    'carShowroomRideHeight',
    'carShowroomModelYaw',
    'carShowroomWheelFinish',
    'carShowroomWheelColor',
    'carShowroomTrimFinish',
    'carShowroomTrimColor',
    'carShowroomCaliperColor',
    'carShowroomLightColor',
    'carShowroomLightGlow',
    'carShowroomGlassTint',
    'carShowroomLightPreset',
    'carShowroomLightWarmth',
    'carShowroomRimBoost',
    'carShowroomBackground',
    'carShowroomEnvIntensity',
    'carShowroomLightIntensity',
    'carShowroomRigYaw',
    'carShowroomRigHeight',
    'carShowroomGrid',
    'carShowroomUnderglow',
    'carShowroomUnderglowColor',
    'carShowroomUnderglowSize',
    'carShowroomUnderglowPulse',
    'carShowroomShadowStrength',
    'carShowroomShadowSize',
    'carShowroomFloorPreset',
    'carShowroomFloorColor',
    'carShowroomFloorRoughness',
    'carShowroomFloorMetalness',
    'carShowroomFloorOpacity',
    'carShowroomExposure',
    'carShowroomBloomStrength',
    'carShowroomBloomThreshold',
    'carShowroomBloomRadius',
    'carShowroomCameraPreset',
    'carShowroomCameraMode',
    'carShowroomCamYaw',
    'carShowroomCamPitch',
    'carShowroomCamDistance',
    'carShowroomFov',
    'carShowroomLookAtX',
    'carShowroomLookAtY',
    'carShowroomLookAtZ',
    'carShowroomMotionStyle',
    'carShowroomMotionRange',
    'carShowroomSpinSpeed',
    'carShowroomZoom',
    'carShowroomAutoRotate',
    'carShowroomAutoQuality',
    'carShowroomPartMap',
  ];

  const loadSavedPresets = (): SavedPreset[] => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
      const parsed = safeParseJson<SavedPreset[]>(raw);
      if (!parsed || !Array.isArray(parsed)) return [];
      return parsed
        .map(p => ({
          id: String(p?.id || ''),
          name: String(p?.name || 'Preset'),
          state: (p?.state || {}) as Record<string, string>,
        }))
        .filter(p => p.id.length > 0);
    } catch {
      return [];
    }
  };

  const saveSavedPresets = (presets: SavedPreset[]) => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // ignore
    }
  };

  const syncInputsFromDataset = () => {
    const ds = root.dataset;

    if (selectedPartEl) {
      const part = (ds.carShowroomSelectedPart || '').trim();
      selectedPartEl.textContent = part
        ? `Selected: ${part}`
        : 'Tap/click the car to select';
    }

    if (selectedMeshEl) {
      const name = (ds.carShowroomSelectedMeshName || '').trim();
      selectedMeshEl.hidden = name.length === 0;
      selectedMeshEl.textContent = name ? `Mesh: ${name}` : '';
    }

    if (selectedPathEl) {
      const path = (ds.carShowroomSelectedMeshPath || '').trim();
      selectedPathEl.hidden = path.length === 0;
      selectedPathEl.textContent = path ? `Path: ${path}` : '';
    }

    if (selectedMaterialEl) {
      const name = (ds.carShowroomSelectedMaterialName || '').trim();
      selectedMaterialEl.hidden = name.length === 0;
      selectedMaterialEl.textContent = name ? `Material: ${name}` : '';
    }

    if (qualitySel && ds.carShowroomQuality)
      qualitySel.value = ds.carShowroomQuality;
    if (autoQualityChk && ds.carShowroomAutoQuality)
      autoQualityChk.checked = ds.carShowroomAutoQuality !== 'false';
    const model = (ds.carShowroomModel || '').trim();
    if (modelUrlInp) modelUrlInp.value = model;
    if (modelSel && model) {
      if (Array.from(modelSel.options).some(o => o.value === model)) {
        modelSel.value = model;
      }
    }

    if (modeSel && ds.carShowroomMode) modeSel.value = ds.carShowroomMode;
    if (cameraSel && ds.carShowroomCameraPreset)
      cameraSel.value = ds.carShowroomCameraPreset;
    if (cameraModeSel && ds.carShowroomCameraMode)
      cameraModeSel.value = ds.carShowroomCameraMode;
    if (camYawRange && ds.carShowroomCamYaw)
      camYawRange.value = ds.carShowroomCamYaw;
    if (camPitchRange && ds.carShowroomCamPitch)
      camPitchRange.value = ds.carShowroomCamPitch;
    if (camDistanceRange && ds.carShowroomCamDistance)
      camDistanceRange.value = ds.carShowroomCamDistance;
    if (fovRange && ds.carShowroomFov) fovRange.value = ds.carShowroomFov;
    if (colorInp && ds.carShowroomColor) colorInp.value = ds.carShowroomColor;
    if (wrapColorInp && ds.carShowroomWrapColor)
      wrapColorInp.value = ds.carShowroomWrapColor;
    if (wrapPatternSel && ds.carShowroomWrapPattern)
      wrapPatternSel.value = ds.carShowroomWrapPattern;
    if (wrapScaleRange && ds.carShowroomWrapScale)
      wrapScaleRange.value = ds.carShowroomWrapScale;
    if (wrapStyleSel && ds.carShowroomWrapStyle)
      wrapStyleSel.value = ds.carShowroomWrapStyle;
    if (wrapTintRange && ds.carShowroomWrapTint)
      wrapTintRange.value = ds.carShowroomWrapTint;
    if (wrapRotRange && ds.carShowroomWrapRotationDeg)
      wrapRotRange.value = ds.carShowroomWrapRotationDeg;
    if (wrapOffsetXRange && ds.carShowroomWrapOffsetX)
      wrapOffsetXRange.value = ds.carShowroomWrapOffsetX;
    if (wrapOffsetYRange && ds.carShowroomWrapOffsetY)
      wrapOffsetYRange.value = ds.carShowroomWrapOffsetY;
    if (finishSel && ds.carShowroomFinish)
      finishSel.value = ds.carShowroomFinish;
    if (clearcoatRange && ds.carShowroomClearcoat)
      clearcoatRange.value = ds.carShowroomClearcoat;
    if (flakeIntensityRange && ds.carShowroomFlakeIntensity)
      flakeIntensityRange.value = ds.carShowroomFlakeIntensity;
    if (flakeScaleRange && ds.carShowroomFlakeScale)
      flakeScaleRange.value = ds.carShowroomFlakeScale;
    if (pearlRange && ds.carShowroomPearl)
      pearlRange.value = ds.carShowroomPearl;
    if (pearlThicknessRange && ds.carShowroomPearlThickness)
      pearlThicknessRange.value = ds.carShowroomPearlThickness;
    if (rideHeightRange && ds.carShowroomRideHeight)
      rideHeightRange.value = ds.carShowroomRideHeight;
    if (modelYawRange && ds.carShowroomModelYaw)
      modelYawRange.value = ds.carShowroomModelYaw;
    if (wheelFinishSel && ds.carShowroomWheelFinish)
      wheelFinishSel.value = ds.carShowroomWheelFinish;
    if (wheelColorInp && ds.carShowroomWheelColor)
      wheelColorInp.value = ds.carShowroomWheelColor;
    if (trimFinishSel && ds.carShowroomTrimFinish)
      trimFinishSel.value = ds.carShowroomTrimFinish;
    if (trimColorInp && ds.carShowroomTrimColor)
      trimColorInp.value = ds.carShowroomTrimColor;
    if (caliperColorInp && ds.carShowroomCaliperColor)
      caliperColorInp.value = ds.carShowroomCaliperColor;
    if (lightColorInp && ds.carShowroomLightColor)
      lightColorInp.value = ds.carShowroomLightColor;
    if (lightGlowRange && ds.carShowroomLightGlow)
      lightGlowRange.value = ds.carShowroomLightGlow;
    if (glassTintRange && ds.carShowroomGlassTint)
      glassTintRange.value = ds.carShowroomGlassTint;
    if (lightPresetSel && ds.carShowroomLightPreset)
      lightPresetSel.value = ds.carShowroomLightPreset;
    if (bgSel && ds.carShowroomBackground)
      bgSel.value = ds.carShowroomBackground;
    if (envIntensityRange && ds.carShowroomEnvIntensity)
      envIntensityRange.value = ds.carShowroomEnvIntensity;
    if (lightIntensityRange && ds.carShowroomLightIntensity)
      lightIntensityRange.value = ds.carShowroomLightIntensity;
    if (lightWarmthRange && ds.carShowroomLightWarmth)
      lightWarmthRange.value = ds.carShowroomLightWarmth;
    if (rimBoostRange && ds.carShowroomRimBoost)
      rimBoostRange.value = ds.carShowroomRimBoost;
    if (rigYawRange && ds.carShowroomRigYaw)
      rigYawRange.value = ds.carShowroomRigYaw;
    if (rigHeightRange && ds.carShowroomRigHeight)
      rigHeightRange.value = ds.carShowroomRigHeight;
    if (gridToggle && ds.carShowroomGrid)
      gridToggle.checked = ds.carShowroomGrid === 'true';
    if (underglowColorInp && ds.carShowroomUnderglowColor)
      underglowColorInp.value = ds.carShowroomUnderglowColor;
    if (underglowRange && ds.carShowroomUnderglow)
      underglowRange.value = ds.carShowroomUnderglow;
    if (underglowSizeRange && ds.carShowroomUnderglowSize)
      underglowSizeRange.value = ds.carShowroomUnderglowSize;
    if (underglowPulseRange && ds.carShowroomUnderglowPulse)
      underglowPulseRange.value = ds.carShowroomUnderglowPulse;
    if (shadowStrengthRange && ds.carShowroomShadowStrength)
      shadowStrengthRange.value = ds.carShowroomShadowStrength;
    if (shadowSizeRange && ds.carShowroomShadowSize)
      shadowSizeRange.value = ds.carShowroomShadowSize;
    if (floorPresetSel && ds.carShowroomFloorPreset)
      floorPresetSel.value = ds.carShowroomFloorPreset;
    if (floorColorInp && ds.carShowroomFloorColor)
      floorColorInp.value = ds.carShowroomFloorColor;
    if (floorRoughnessRange && ds.carShowroomFloorRoughness)
      floorRoughnessRange.value = ds.carShowroomFloorRoughness;
    if (floorMetalnessRange && ds.carShowroomFloorMetalness)
      floorMetalnessRange.value = ds.carShowroomFloorMetalness;
    if (floorOpacityRange && ds.carShowroomFloorOpacity)
      floorOpacityRange.value = ds.carShowroomFloorOpacity;
    if (exposureRange && ds.carShowroomExposure)
      exposureRange.value = ds.carShowroomExposure;
    if (bloomStrengthRange && ds.carShowroomBloomStrength)
      bloomStrengthRange.value = ds.carShowroomBloomStrength;
    if (bloomThresholdRange && ds.carShowroomBloomThreshold)
      bloomThresholdRange.value = ds.carShowroomBloomThreshold;
    if (bloomRadiusRange && ds.carShowroomBloomRadius)
      bloomRadiusRange.value = ds.carShowroomBloomRadius;
    if (autoRotateChk)
      autoRotateChk.checked = ds.carShowroomAutoRotate !== 'false';
    if (motionStyleSel && ds.carShowroomMotionStyle)
      motionStyleSel.value = ds.carShowroomMotionStyle;
    if (spinSpeedRange && ds.carShowroomSpinSpeed)
      spinSpeedRange.value = ds.carShowroomSpinSpeed;
    if (motionRange && ds.carShowroomMotionRange)
      motionRange.value = ds.carShowroomMotionRange;
    if (zoomRange && ds.carShowroomZoom) zoomRange.value = ds.carShowroomZoom;
    if (quickSpinChk)
      quickSpinChk.checked = ds.carShowroomAutoRotate !== 'false';
    if (quickZoomRange && ds.carShowroomZoom)
      quickZoomRange.value = ds.carShowroomZoom;
    if (quickLightSel && ds.carShowroomLightPreset)
      quickLightSel.value = ds.carShowroomLightPreset;
    if (quickStyleSel && stylePresetSel)
      quickStyleSel.value = stylePresetSel.value || '';
  };

  let savedPresets: SavedPreset[] = loadSavedPresets();

  const renderPresetOptions = () => {
    if (!presetSel) return;

    presetSel.innerHTML = '';

    if (savedPresets.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No saved presets';
      presetSel.appendChild(opt);
      presetSel.disabled = true;
      if (presetLoadBtn) presetLoadBtn.disabled = true;
      if (presetDeleteBtn) presetDeleteBtn.disabled = true;
      return;
    }

    presetSel.disabled = false;
    if (presetLoadBtn) presetLoadBtn.disabled = false;
    if (presetDeleteBtn) presetDeleteBtn.disabled = false;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a preset…';
    presetSel.appendChild(placeholder);

    for (const p of savedPresets) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      presetSel.appendChild(opt);
    }
  };

  const captureStateForPreset = (): Record<string, string> => {
    const ds = root.dataset;
    const state: Record<string, string> = {};
    for (const key of PRESET_DATASET_KEYS) {
      const value = String(ds[key] || '').trim();
      if (value.length > 0) state[String(key)] = value;
    }
    return state;
  };

  const applyPresetState = (state: Record<string, string>) => {
    for (const key of PRESET_DATASET_KEYS) {
      const v = state[String(key)];
      if (typeof v === 'string') {
        root.dataset[key] = v;
      }
    }
    syncInputsFromDataset();
    bumpRevision();
  };

  const statusObserver = new MutationObserver(() => {
    syncStatus();
    syncModelStats();
  });
  statusObserver.observe(root, { attributes: true });
  addEventListener('beforeunload', () => statusObserver.disconnect(), {
    once: true,
  });

  const snapOrder: PanelSnap[] = ['collapsed', 'peek', 'half', 'full'];

  const PANEL_SNAP_STORAGE_KEY = 'csr-panel-snap-v1';

  const getSnapHeights = () => {
    const vv =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).visualViewport?.height || window.innerHeight;
    const collapsed = 88;
    // Mobile split-view defaults: keep the model visible.
    const peek = Math.round(vv * 0.28);
    const half = Math.round(vv * 0.45);
    const full = Math.round(vv * 0.65);
    const clampHeight = (v: number) =>
      Math.max(collapsed, Math.min(full, Math.round(v)));
    const peekH = clampHeight(peek);
    const halfH = clampHeight(Math.max(peekH + 40, half));
    const fullH = clampHeight(Math.max(halfH + 40, full));
    return {
      collapsed,
      peek: peekH,
      half: halfH,
      full: fullH,
    };
  };

  const getNearestSnap = (
    height: number,
    heights: Record<PanelSnap, number>
  ) => {
    let best = snapOrder[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const snap of snapOrder) {
      const dist = Math.abs(height - heights[snap]);
      if (dist < bestDist) {
        bestDist = dist;
        best = snap;
      }
    }
    return best;
  };

  const setPanelSnap = (snap: PanelSnap, persist: boolean) => {
    if (!panel) return;
    panelSnap = snap;
    root.dataset.carShowroomPanelSnap = snap;
    const collapsed = snap === 'collapsed';
    togglePanelBtn?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

    if (isMobilePanel()) {
      const heights = getSnapHeights();
      const height = heights[snap];
      panel.hidden = false;
      panel.classList.toggle('is-collapsed', collapsed);
      panel.style.setProperty('--csr-panel-height', `${height}px`);
      root.style.setProperty('--csr-panel-height', `${height}px`);
      root.classList.remove('is-panel-collapsed');
    } else {
      panel.classList.remove('is-collapsed');
      panel.style.removeProperty('--csr-panel-height');
      root.style.removeProperty('--csr-panel-height');
      panel.hidden = collapsed;
      root.classList.toggle('is-panel-collapsed', collapsed);
    }

    if (persist) {
      try {
        localStorage.setItem(PANEL_SNAP_STORAGE_KEY, snap);
      } catch {
        // ignore
      }
    }
  };

  const initPanelState = () => {
    if (!panel) return;
    let savedSnap: PanelSnap | null = null;
    try {
      const raw = (localStorage.getItem(PANEL_SNAP_STORAGE_KEY) || '').trim();
      if (snapOrder.includes(raw as PanelSnap)) {
        savedSnap = raw as PanelSnap;
      }
    } catch {
      // ignore
    }
    const initialSnap = savedSnap ?? (isMobilePanel() ? 'collapsed' : 'peek');
    setPanelSnap(initialSnap, false);
  };

  let dragActive = false;
  let dragStartY = 0;
  let dragStartHeight = 0;
  let dragStartTime = 0;
  let lastDragY = 0;
  let lastDragTime = 0;

  const beginDrag = (clientY: number) => {
    if (!panel || !isMobilePanel()) return;
    dragActive = true;
    panel.classList.add('is-dragging');
    panel.removeAttribute('data-pull-state');
    dragStartY = clientY;
    dragStartHeight = panel.getBoundingClientRect().height;
    dragStartTime = performance.now();
    lastDragY = clientY;
    lastDragTime = dragStartTime;

    // Light haptic feedback when starting drag
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  const onDragMove = (e: PointerEvent) => {
    if (!dragActive || !panel || !isMobilePanel()) return;
    e.preventDefault();
    const heights = getSnapHeights();
    const dy = e.clientY - dragStartY;
    const nextHeight = clamp(
      dragStartHeight - dy,
      heights.collapsed,
      heights.full
    );
    panel.style.setProperty(
      '--csr-panel-height',
      `${Math.round(nextHeight)}px`
    );
    panel.classList.toggle('is-collapsed', nextHeight <= heights.collapsed + 4);

    // Update pull state for visual feedback
    const pullThreshold = 30;
    const pullDistance = dragStartY - e.clientY;
    if (pullDistance > pullThreshold && dragStartHeight < heights.half) {
      panel.setAttribute('data-pull-state', 'ready');
    } else if (pullDistance > 10 && dragStartHeight < heights.half) {
      panel.setAttribute('data-pull-state', 'pulling');
    } else if (
      pullDistance < -pullThreshold &&
      dragStartHeight > heights.peek
    ) {
      panel.setAttribute('data-pull-state', 'collapsing');
    } else {
      panel.removeAttribute('data-pull-state');
    }

    lastDragY = e.clientY;
    lastDragTime = performance.now();
  };

  const onDragEnd = (e: PointerEvent) => {
    if (!dragActive || !panel) return;
    dragActive = false;
    panel.classList.remove('is-dragging');
    panel.removeAttribute('data-pull-state');

    const heights = getSnapHeights();
    const rectNow = panel.getBoundingClientRect();
    const height = rectNow.height;
    const dt = Math.max(1, lastDragTime - dragStartTime);
    const velocity = ((lastDragY - dragStartY) / dt) * 1000;
    const nearest = getNearestSnap(height, heights);
    const idx = snapOrder.indexOf(nearest);
    const velocityThreshold = 700;
    let nextSnap = nearest;
    if (Math.abs(velocity) > velocityThreshold) {
      if (velocity > 0) {
        nextSnap = snapOrder[Math.max(0, idx - 1)];
      } else {
        nextSnap = snapOrder[Math.min(snapOrder.length - 1, idx + 1)];
      }
    }
    setPanelSnap(nextSnap, true);

    // Haptic feedback on snap
    if ('vibrate' in navigator) {
      if (nextSnap === 'full') {
        navigator.vibrate([10, 30, 10]); // Double tap for full expand
      } else if (nextSnap === 'collapsed') {
        navigator.vibrate(15); // Single for collapse
      } else {
        navigator.vibrate(8); // Light for partial snap
      }
    }

    try {
      sheetHandle?.releasePointerCapture?.(e.pointerId);
      panelHead?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const canStartDrag = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return true;
    return !el.closest(
      'button, input, select, textarea, a, [data-csr-no-drag]'
    );
  };

  const attachDragHandle = (el: HTMLElement | null) => {
    el?.addEventListener('pointerdown', e => {
      if (!isMobilePanel()) return;
      if (!canStartDrag(e.target)) return;
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      beginDrag(e.clientY);
      window.addEventListener('pointermove', onDragMove, { passive: false });
      window.addEventListener('pointerup', onDragEnd, {
        passive: true,
        once: true,
      });
    });
  };

  attachDragHandle(sheetHandle);
  attachDragHandle(panelHead);

  togglePanelBtn?.addEventListener('click', () => {
    if (isMobilePanel()) {
      setPanelSnap(panelSnap === 'collapsed' ? 'peek' : 'collapsed', true);
      return;
    }
    if (panelSnap === 'collapsed') {
      setPanelSnap('peek', true);
    }
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  closePanelBtn?.addEventListener('click', () => {
    if (isMobilePanel()) {
      setPanelSnap('collapsed', true);
      return;
    }
    setPanelSnap('collapsed', true);
    canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  quickPanelBtn?.addEventListener('click', () => {
    if (isMobilePanel()) {
      setPanelSnap('half', true);
      return;
    }
    setPanelSnap('peek', true);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.addEventListener('resize', () => {
    initPanelState();
  });

  initPanelState();
  // Defaults
  root.dataset.carShowroomModel ||=
    modelSel?.value || '/models/porsche-911-gt3rs.glb';
  root.dataset.carShowroomCameraPreset ||= cameraSel?.value || 'hero';
  root.dataset.carShowroomCameraMode ||= cameraModeSel?.value || 'preset';
  root.dataset.carShowroomCamYaw ||= camYawRange?.value || '17';
  root.dataset.carShowroomCamPitch ||= camPitchRange?.value || '7';
  root.dataset.carShowroomCamDistance ||= camDistanceRange?.value || '9.8';
  root.dataset.carShowroomFov ||= fovRange?.value || '55';
  root.dataset.carShowroomMode ||= modeSel?.value || 'paint';
  root.dataset.carShowroomColor ||= colorInp?.value || '#00d1b2';
  root.dataset.carShowroomWrapColor ||= wrapColorInp?.value || '#00d1b2';
  root.dataset.carShowroomWrapPattern ||= wrapPatternSel?.value || 'stripes';
  root.dataset.carShowroomWrapScale ||= wrapScaleRange?.value || '1.6';
  root.dataset.carShowroomWrapStyle ||= wrapStyleSel?.value || 'oem';
  root.dataset.carShowroomWrapTint ||= wrapTintRange?.value || '0.92';
  root.dataset.carShowroomWrapRotationDeg ||= wrapRotRange?.value || '0';
  root.dataset.carShowroomWrapOffsetX ||= wrapOffsetXRange?.value || '0';
  root.dataset.carShowroomWrapOffsetY ||= wrapOffsetYRange?.value || '0';
  root.dataset.carShowroomFinish ||= finishSel?.value || 'gloss';
  root.dataset.carShowroomClearcoat ||= clearcoatRange?.value || '1';
  root.dataset.carShowroomFlakeIntensity ||=
    flakeIntensityRange?.value || '0.25';
  root.dataset.carShowroomFlakeScale ||= flakeScaleRange?.value || '2.5';
  root.dataset.carShowroomPearl ||= pearlRange?.value || '0';
  root.dataset.carShowroomPearlThickness ||=
    pearlThicknessRange?.value || '320';
  root.dataset.carShowroomRideHeight ||= rideHeightRange?.value || '0.05';
  root.dataset.carShowroomModelYaw ||= modelYawRange?.value || '0';
  root.dataset.carShowroomWheelFinish ||= wheelFinishSel?.value || 'graphite';
  root.dataset.carShowroomTrimFinish ||= trimFinishSel?.value || 'black';
  root.dataset.carShowroomWheelColor ||= wheelColorInp?.value || '#1f2937';
  root.dataset.carShowroomTrimColor ||= trimColorInp?.value || '#0b0f1a';
  root.dataset.carShowroomCaliperColor ||= caliperColorInp?.value || '#ef4444';
  root.dataset.carShowroomLightColor ||= lightColorInp?.value || '#dbeafe';
  root.dataset.carShowroomLightGlow ||= lightGlowRange?.value || '1.25';
  root.dataset.carShowroomGlassTint ||= glassTintRange?.value || '0.15';
  root.dataset.carShowroomLightPreset ||= lightPresetSel?.value || 'studio';
  root.dataset.carShowroomBackground ||= bgSel?.value || 'void';
  root.dataset.carShowroomEnvIntensity ||= envIntensityRange?.value || '0.7';
  root.dataset.carShowroomLightIntensity ||= lightIntensityRange?.value || '1';
  root.dataset.carShowroomLightWarmth ||= lightWarmthRange?.value || '0';
  root.dataset.carShowroomRimBoost ||= rimBoostRange?.value || '1';
  root.dataset.carShowroomRigYaw ||= rigYawRange?.value || '0';
  root.dataset.carShowroomRigHeight ||= rigHeightRange?.value || '1';
  root.dataset.carShowroomGrid ||=
    gridToggle?.checked === true ? 'true' : 'false';
  root.dataset.carShowroomUnderglow ||= underglowRange?.value || '0';
  root.dataset.carShowroomUnderglowColor ||=
    underglowColorInp?.value || '#22d3ee';
  root.dataset.carShowroomUnderglowSize ||= underglowSizeRange?.value || '4.5';
  root.dataset.carShowroomUnderglowPulse ||= underglowPulseRange?.value || '0';
  root.dataset.carShowroomShadowStrength ||=
    shadowStrengthRange?.value || '0.5';
  root.dataset.carShowroomShadowSize ||= shadowSizeRange?.value || '6';
  root.dataset.carShowroomFloorPreset ||= floorPresetSel?.value || 'auto';
  root.dataset.carShowroomFloorColor ||= floorColorInp?.value || '#05070d';
  root.dataset.carShowroomFloorRoughness ||=
    floorRoughnessRange?.value || '0.55';
  root.dataset.carShowroomFloorMetalness ||=
    floorMetalnessRange?.value || '0.02';
  root.dataset.carShowroomFloorOpacity ||= floorOpacityRange?.value || '0';
  root.dataset.carShowroomExposure ||= exposureRange?.value || '1';
  root.dataset.carShowroomBloomStrength ||= bloomStrengthRange?.value || '0';
  root.dataset.carShowroomBloomThreshold ||=
    bloomThresholdRange?.value || '0.9';
  root.dataset.carShowroomBloomRadius ||= bloomRadiusRange?.value || '0';
  root.dataset.carShowroomAutoRotate ||=
    autoRotateChk?.checked === false ? 'false' : 'true';
  root.dataset.carShowroomAutoQuality ||=
    autoQualityChk?.checked === false ? 'false' : 'true';
  root.dataset.carShowroomMotionStyle ||= motionStyleSel?.value || 'spin';
  root.dataset.carShowroomMotionRange ||= motionRange?.value || '18';
  root.dataset.carShowroomSpinSpeed ||= spinSpeedRange?.value || '0.75';
  const defaultZoom = isMobilePanel() ? '0.85' : '0.8';
  if (!root.dataset.carShowroomZoom && zoomRange && isMobilePanel()) {
    zoomRange.value = defaultZoom;
  }
  root.dataset.carShowroomZoom ||= zoomRange?.value || defaultZoom;
  root.dataset.carShowroomReady ||= '0';
  root.dataset.carShowroomLoading ||= '0';
  root.dataset.carShowroomLoadError ||= '';
  root.dataset.carShowroomFps ||= '';

  // Default empty part map.
  root.dataset.carShowroomPartMap ||= '';

  if (modelUrlInp) modelUrlInp.value = root.dataset.carShowroomModel;

  // Sync inputs to dataset (including deep-linking).
  if (modelSel && root.dataset.carShowroomModel) {
    const value = root.dataset.carShowroomModel;
    if (value && Array.from(modelSel.options).some(o => o.value === value)) {
      modelSel.value = value;
    }
  }
  if (modeSel && root.dataset.carShowroomMode)
    modeSel.value = root.dataset.carShowroomMode;
  if (cameraSel && root.dataset.carShowroomCameraPreset)
    cameraSel.value = root.dataset.carShowroomCameraPreset;
  if (cameraModeSel && root.dataset.carShowroomCameraMode)
    cameraModeSel.value = root.dataset.carShowroomCameraMode;
  if (camYawRange && root.dataset.carShowroomCamYaw)
    camYawRange.value = root.dataset.carShowroomCamYaw;
  if (camPitchRange && root.dataset.carShowroomCamPitch)
    camPitchRange.value = root.dataset.carShowroomCamPitch;
  if (camDistanceRange && root.dataset.carShowroomCamDistance)
    camDistanceRange.value = root.dataset.carShowroomCamDistance;
  if (fovRange && root.dataset.carShowroomFov)
    fovRange.value = root.dataset.carShowroomFov;
  if (colorInp && root.dataset.carShowroomColor)
    colorInp.value = root.dataset.carShowroomColor;
  if (wrapColorInp && root.dataset.carShowroomWrapColor)
    wrapColorInp.value = root.dataset.carShowroomWrapColor;
  if (wrapPatternSel && root.dataset.carShowroomWrapPattern)
    wrapPatternSel.value = root.dataset.carShowroomWrapPattern;
  if (wrapScaleRange && root.dataset.carShowroomWrapScale)
    wrapScaleRange.value = root.dataset.carShowroomWrapScale;
  if (wrapStyleSel && root.dataset.carShowroomWrapStyle)
    wrapStyleSel.value = root.dataset.carShowroomWrapStyle;
  if (wrapTintRange && root.dataset.carShowroomWrapTint)
    wrapTintRange.value = root.dataset.carShowroomWrapTint;
  if (wrapRotRange && root.dataset.carShowroomWrapRotationDeg)
    wrapRotRange.value = root.dataset.carShowroomWrapRotationDeg;
  if (wrapOffsetXRange && root.dataset.carShowroomWrapOffsetX)
    wrapOffsetXRange.value = root.dataset.carShowroomWrapOffsetX;
  if (wrapOffsetYRange && root.dataset.carShowroomWrapOffsetY)
    wrapOffsetYRange.value = root.dataset.carShowroomWrapOffsetY;
  if (finishSel && root.dataset.carShowroomFinish)
    finishSel.value = root.dataset.carShowroomFinish;
  if (clearcoatRange && root.dataset.carShowroomClearcoat)
    clearcoatRange.value = root.dataset.carShowroomClearcoat;
  if (flakeIntensityRange && root.dataset.carShowroomFlakeIntensity)
    flakeIntensityRange.value = root.dataset.carShowroomFlakeIntensity;
  if (flakeScaleRange && root.dataset.carShowroomFlakeScale)
    flakeScaleRange.value = root.dataset.carShowroomFlakeScale;
  if (pearlRange && root.dataset.carShowroomPearl)
    pearlRange.value = root.dataset.carShowroomPearl;
  if (pearlThicknessRange && root.dataset.carShowroomPearlThickness)
    pearlThicknessRange.value = root.dataset.carShowroomPearlThickness;
  if (rideHeightRange && root.dataset.carShowroomRideHeight)
    rideHeightRange.value = root.dataset.carShowroomRideHeight;
  if (modelYawRange && root.dataset.carShowroomModelYaw)
    modelYawRange.value = root.dataset.carShowroomModelYaw;
  if (wheelFinishSel && root.dataset.carShowroomWheelFinish)
    wheelFinishSel.value = root.dataset.carShowroomWheelFinish;
  if (trimFinishSel && root.dataset.carShowroomTrimFinish)
    trimFinishSel.value = root.dataset.carShowroomTrimFinish;
  if (wheelColorInp && root.dataset.carShowroomWheelColor)
    wheelColorInp.value = root.dataset.carShowroomWheelColor;
  if (trimColorInp && root.dataset.carShowroomTrimColor)
    trimColorInp.value = root.dataset.carShowroomTrimColor;
  if (caliperColorInp && root.dataset.carShowroomCaliperColor)
    caliperColorInp.value = root.dataset.carShowroomCaliperColor;
  if (lightColorInp && root.dataset.carShowroomLightColor)
    lightColorInp.value = root.dataset.carShowroomLightColor;
  if (lightGlowRange && root.dataset.carShowroomLightGlow)
    lightGlowRange.value = root.dataset.carShowroomLightGlow;
  if (glassTintRange && root.dataset.carShowroomGlassTint)
    glassTintRange.value = root.dataset.carShowroomGlassTint;
  if (lightPresetSel && root.dataset.carShowroomLightPreset)
    lightPresetSel.value = root.dataset.carShowroomLightPreset;
  if (bgSel && root.dataset.carShowroomBackground)
    bgSel.value = root.dataset.carShowroomBackground;
  if (envIntensityRange && root.dataset.carShowroomEnvIntensity)
    envIntensityRange.value = root.dataset.carShowroomEnvIntensity;
  if (lightIntensityRange && root.dataset.carShowroomLightIntensity)
    lightIntensityRange.value = root.dataset.carShowroomLightIntensity;
  if (lightWarmthRange && root.dataset.carShowroomLightWarmth)
    lightWarmthRange.value = root.dataset.carShowroomLightWarmth;
  if (rimBoostRange && root.dataset.carShowroomRimBoost)
    rimBoostRange.value = root.dataset.carShowroomRimBoost;
  if (rigYawRange && root.dataset.carShowroomRigYaw)
    rigYawRange.value = root.dataset.carShowroomRigYaw;
  if (rigHeightRange && root.dataset.carShowroomRigHeight)
    rigHeightRange.value = root.dataset.carShowroomRigHeight;
  if (gridToggle && root.dataset.carShowroomGrid)
    gridToggle.checked = root.dataset.carShowroomGrid === 'true';
  if (underglowColorInp && root.dataset.carShowroomUnderglowColor)
    underglowColorInp.value = root.dataset.carShowroomUnderglowColor;
  if (underglowRange && root.dataset.carShowroomUnderglow)
    underglowRange.value = root.dataset.carShowroomUnderglow;
  if (underglowSizeRange && root.dataset.carShowroomUnderglowSize)
    underglowSizeRange.value = root.dataset.carShowroomUnderglowSize;
  if (underglowPulseRange && root.dataset.carShowroomUnderglowPulse)
    underglowPulseRange.value = root.dataset.carShowroomUnderglowPulse;
  if (shadowStrengthRange && root.dataset.carShowroomShadowStrength)
    shadowStrengthRange.value = root.dataset.carShowroomShadowStrength;
  if (shadowSizeRange && root.dataset.carShowroomShadowSize)
    shadowSizeRange.value = root.dataset.carShowroomShadowSize;
  if (floorPresetSel && root.dataset.carShowroomFloorPreset)
    floorPresetSel.value = root.dataset.carShowroomFloorPreset;
  if (floorColorInp && root.dataset.carShowroomFloorColor)
    floorColorInp.value = root.dataset.carShowroomFloorColor;
  if (floorRoughnessRange && root.dataset.carShowroomFloorRoughness)
    floorRoughnessRange.value = root.dataset.carShowroomFloorRoughness;
  if (floorMetalnessRange && root.dataset.carShowroomFloorMetalness)
    floorMetalnessRange.value = root.dataset.carShowroomFloorMetalness;
  if (floorOpacityRange && root.dataset.carShowroomFloorOpacity)
    floorOpacityRange.value = root.dataset.carShowroomFloorOpacity;
  if (exposureRange && root.dataset.carShowroomExposure)
    exposureRange.value = root.dataset.carShowroomExposure;
  if (bloomStrengthRange && root.dataset.carShowroomBloomStrength)
    bloomStrengthRange.value = root.dataset.carShowroomBloomStrength;
  if (bloomThresholdRange && root.dataset.carShowroomBloomThreshold)
    bloomThresholdRange.value = root.dataset.carShowroomBloomThreshold;
  if (bloomRadiusRange && root.dataset.carShowroomBloomRadius)
    bloomRadiusRange.value = root.dataset.carShowroomBloomRadius;
  if (autoRotateChk && root.dataset.carShowroomAutoRotate)
    autoRotateChk.checked = root.dataset.carShowroomAutoRotate !== 'false';
  if (autoQualityChk && root.dataset.carShowroomAutoQuality)
    autoQualityChk.checked = root.dataset.carShowroomAutoQuality !== 'false';
  if (motionStyleSel && root.dataset.carShowroomMotionStyle)
    motionStyleSel.value = root.dataset.carShowroomMotionStyle;
  if (spinSpeedRange && root.dataset.carShowroomSpinSpeed)
    spinSpeedRange.value = root.dataset.carShowroomSpinSpeed;
  if (motionRange && root.dataset.carShowroomMotionRange)
    motionRange.value = root.dataset.carShowroomMotionRange;
  if (zoomRange && root.dataset.carShowroomZoom)
    zoomRange.value = root.dataset.carShowroomZoom;
  if (quickSpinChk && root.dataset.carShowroomAutoRotate)
    quickSpinChk.checked = root.dataset.carShowroomAutoRotate !== 'false';
  if (quickZoomRange && root.dataset.carShowroomZoom)
    quickZoomRange.value = root.dataset.carShowroomZoom;
  if (quickLightSel && root.dataset.carShowroomLightPreset)
    quickLightSel.value = root.dataset.carShowroomLightPreset;
  if (quickStyleSel && stylePresetSel)
    quickStyleSel.value = stylePresetSel.value || '';

  renderPresetOptions();

  // Load per-model part map unless a deep-link already provided one.
  if (!(root.dataset.carShowroomPartMap || '').trim()) {
    const model = (root.dataset.carShowroomModel || '').trim();
    const map = loadPartMapForModel(model);
    root.dataset.carShowroomPartMap = Object.keys(map).length
      ? JSON.stringify(map)
      : '';
  } else {
    // Deep link wins; persist it for this model when possible.
    const model = (root.dataset.carShowroomModel || '').trim();
    const parsed = safeParseJson<unknown>(root.dataset.carShowroomPartMap);
    const map = normalizePartMap(parsed);
    savePartMapForModel(model, map);
  }

  bumpRevision();
  syncStatus();
  syncModelStats();

  // Keep the URL input in sync with the select.
  modelSel?.addEventListener('change', () => {
    if (!modelUrlInp) return;
    modelUrlInp.value = modelSel.value;

    // When the model changes via the dropdown, swap to its saved part map.
    const model = (modelSel.value || '').trim();
    const map = loadPartMapForModel(model);
    root.dataset.carShowroomPartMap = Object.keys(map).length
      ? JSON.stringify(map)
      : '';
    bumpRevision();
  });

  // Color swatches
  swatches.forEach(btn => {
    btn.addEventListener(
      'click',
      () => {
        const hex = normalizeHexColor(btn.dataset.csrSwatch || '');
        if (!hex) return;
        const mode = (modeSel?.value || root.dataset.carShowroomMode || 'paint')
          .trim()
          .toLowerCase();
        if (mode === 'wrap') {
          if (wrapColorInp) wrapColorInp.value = hex;
          root.dataset.carShowroomWrapColor = hex;
        } else {
          if (colorInp) colorInp.value = hex;
          root.dataset.carShowroomColor = hex;
          updateColorPreview(hex);
        }
        bumpRevision();
      },
      { passive: true }
    );
  });

  const applyModelUrl = () => {
    const raw = (modelUrlInp?.value || '').trim();
    if (!raw) return;
    root.dataset.carShowroomModel = raw;

    // When switching models manually, load its saved part map.
    const map = loadPartMapForModel(raw);
    root.dataset.carShowroomPartMap = Object.keys(map).length
      ? JSON.stringify(map)
      : '';
    bumpRevision();
  };

  const readPartMapFromDataset = (): PartMap => {
    const raw = (root.dataset.carShowroomPartMap || '').trim();
    if (!raw) return {};
    const parsed = safeParseJson<unknown>(raw);
    return normalizePartMap(parsed);
  };

  const writePartMapToDataset = (map: PartMap) => {
    const json = Object.keys(map).length ? JSON.stringify(map) : '';
    root.dataset.carShowroomPartMap = json;
    const model = (root.dataset.carShowroomModel || '').trim();
    savePartMapForModel(model, map);
  };

  assignApplyBtn?.addEventListener('click', () => {
    const path = (root.dataset.carShowroomSelectedMeshPath || '').trim();
    if (!path) {
      showToast('Select a mesh first.');
      return;
    }
    const raw = (assignPartSel?.value || '').trim();
    const map = readPartMapFromDataset();

    if (!raw) {
      // Auto (remove mapping)
      if (map[path]) delete map[path];
      writePartMapToDataset(map);
      showToast('Mapping cleared for selected mesh.');
      bumpRevision();
      return;
    }

    if (!isManualPartKind(raw)) {
      showToast('Invalid part type.');
      return;
    }

    map[path] = raw;
    writePartMapToDataset(map);
    showToast(`Assigned selected mesh as ${raw}.`);
    bumpRevision();
  });

  assignClearAllBtn?.addEventListener('click', () => {
    writePartMapToDataset({});
    showToast('Part map cleared.');
    bumpRevision();
  });

  buildsheetClearBtn?.addEventListener('click', () => {
    if (buildsheetPasteTa) buildsheetPasteTa.value = '';
  });

  buildsheetApplyBtn?.addEventListener('click', () => {
    const raw = (buildsheetPasteTa?.value || '').trim();
    if (!raw) {
      showToast('Paste a build sheet JSON first.');
      return;
    }

    const parsed = safeParseJson<unknown>(raw);
    if (!parsed || typeof parsed !== 'object') {
      showToast('Invalid JSON.');
      return;
    }

    const obj = parsed as Record<string, unknown>;
    const stateCandidate =
      obj.state && typeof obj.state === 'object'
        ? (obj.state as Record<string, unknown>)
        : (obj as Record<string, unknown>);

    const state: Record<string, string> = {};
    for (const k of PRESET_DATASET_KEYS) {
      const v = stateCandidate[String(k)];
      if (typeof v === 'string') state[String(k)] = v;
    }

    if (Object.keys(state).length === 0) {
      showToast('No recognized state found in JSON.');
      return;
    }

    applyPresetState(state);

    // Ensure any imported part map gets persisted for this model.
    const model = (root.dataset.carShowroomModel || '').trim();
    const map = readPartMapFromDataset();
    savePartMapForModel(model, map);

    showToast('Build sheet applied.');
  });

  const applyFloorPreset = (preset: string) => {
    if (preset === 'asphalt') {
      if (floorColorInp) floorColorInp.value = '#0b0f1a';
      if (floorRoughnessRange) floorRoughnessRange.value = '0.95';
      if (floorMetalnessRange) floorMetalnessRange.value = '0.02';
      if (floorOpacityRange) floorOpacityRange.value = '1';
    } else if (preset === 'matte') {
      if (floorColorInp) floorColorInp.value = '#05070d';
      if (floorRoughnessRange) floorRoughnessRange.value = '0.78';
      if (floorMetalnessRange) floorMetalnessRange.value = '0.02';
      if (floorOpacityRange) floorOpacityRange.value = '1';
    } else if (preset === 'polished') {
      if (floorColorInp) floorColorInp.value = '#0b1220';
      if (floorRoughnessRange) floorRoughnessRange.value = '0.16';
      if (floorMetalnessRange) floorMetalnessRange.value = '0.35';
      if (floorOpacityRange) floorOpacityRange.value = '1';
    } else if (preset === 'glass') {
      if (floorColorInp) floorColorInp.value = '#0b1220';
      if (floorRoughnessRange) floorRoughnessRange.value = '0.05';
      if (floorMetalnessRange) floorMetalnessRange.value = '0';
      if (floorOpacityRange) floorOpacityRange.value = '0.25';
    }

    if (floorPresetSel) floorPresetSel.value = preset;
    root.dataset.carShowroomFloorPreset = preset;

    if (floorColorInp) root.dataset.carShowroomFloorColor = floorColorInp.value;
    if (floorRoughnessRange)
      root.dataset.carShowroomFloorRoughness = floorRoughnessRange.value;
    if (floorMetalnessRange)
      root.dataset.carShowroomFloorMetalness = floorMetalnessRange.value;
    if (floorOpacityRange)
      root.dataset.carShowroomFloorOpacity = floorOpacityRange.value;
    bumpRevision();
  };

  const applyLightPreset = (presetId: string, announce = true) => {
    const preset = LIGHT_PRESETS[presetId];
    if (!preset) return;

    if (lightPresetSel) lightPresetSel.value = presetId;
    if (quickLightSel) quickLightSel.value = presetId;
    root.dataset.carShowroomLightPreset = presetId;

    const setRange = (
      el: HTMLInputElement | null,
      value: number | undefined,
      key: keyof DOMStringMap
    ) => {
      if (value == null) return;
      const next = value.toString();
      if (el) el.value = next;
      root.dataset[key] = next;
    };

    if (preset.background && bgSel) {
      bgSel.value = preset.background;
      root.dataset.carShowroomBackground = preset.background;
    }

    setRange(envIntensityRange, preset.envIntensity, 'carShowroomEnvIntensity');
    setRange(
      lightIntensityRange,
      preset.lightIntensity,
      'carShowroomLightIntensity'
    );
    setRange(lightWarmthRange, preset.lightWarmth, 'carShowroomLightWarmth');
    setRange(rimBoostRange, preset.rimBoost, 'carShowroomRimBoost');
    setRange(exposureRange, preset.exposure, 'carShowroomExposure');
    setRange(
      bloomStrengthRange,
      preset.bloomStrength,
      'carShowroomBloomStrength'
    );
    setRange(
      bloomThresholdRange,
      preset.bloomThreshold,
      'carShowroomBloomThreshold'
    );
    setRange(bloomRadiusRange, preset.bloomRadius, 'carShowroomBloomRadius');
    setRange(rigYawRange, preset.rigYaw, 'carShowroomRigYaw');
    setRange(underglowRange, preset.underglow, 'carShowroomUnderglow');

    if (preset.underglowColor) {
      if (underglowColorInp) underglowColorInp.value = preset.underglowColor;
      root.dataset.carShowroomUnderglowColor = preset.underglowColor;
    }

    bumpRevision();
    if (announce) showToast('Lighting preset applied.');
  };

  const applyStylePreset = (presetId: string) => {
    const preset = STYLE_PRESETS[presetId];
    if (!preset) return;

    const setValue = (
      el: HTMLInputElement | HTMLSelectElement | null,
      value: string | number | undefined,
      key: keyof DOMStringMap
    ) => {
      if (value == null) return;
      const next = String(value);
      if (el) el.value = next;
      root.dataset[key] = next;
    };

    if (stylePresetSel) stylePresetSel.value = presetId;
    if (quickStyleSel) quickStyleSel.value = presetId;

    if (preset.mode && modeSel) {
      modeSel.value = preset.mode;
      root.dataset.carShowroomMode = preset.mode;
    }

    if (preset.body) {
      if (colorInp) colorInp.value = preset.body;
      root.dataset.carShowroomColor = preset.body;
    }

    if (preset.wrap) {
      if (wrapColorInp) wrapColorInp.value = preset.wrap;
      root.dataset.carShowroomWrapColor = preset.wrap;
    }

    if (preset.wrapPattern && wrapPatternSel) {
      wrapPatternSel.value = preset.wrapPattern;
      root.dataset.carShowroomWrapPattern = preset.wrapPattern;
    }

    if (preset.wrapStyle && wrapStyleSel) {
      wrapStyleSel.value = preset.wrapStyle;
      root.dataset.carShowroomWrapStyle = preset.wrapStyle;
    }

    setValue(finishSel, preset.finish, 'carShowroomFinish');
    setValue(clearcoatRange, preset.clearcoat, 'carShowroomClearcoat');
    setValue(
      flakeIntensityRange,
      preset.flakeIntensity,
      'carShowroomFlakeIntensity'
    );
    setValue(flakeScaleRange, preset.flakeScale, 'carShowroomFlakeScale');
    setValue(wheelFinishSel, preset.wheelFinish, 'carShowroomWheelFinish');

    if (preset.wheelColor) {
      if (wheelColorInp) wheelColorInp.value = preset.wheelColor;
      root.dataset.carShowroomWheelColor = preset.wheelColor;
    }

    setValue(trimFinishSel, preset.trimFinish, 'carShowroomTrimFinish');

    if (preset.trimColor) {
      if (trimColorInp) trimColorInp.value = preset.trimColor;
      root.dataset.carShowroomTrimColor = preset.trimColor;
    }

    if (preset.caliper) {
      if (caliperColorInp) caliperColorInp.value = preset.caliper;
      root.dataset.carShowroomCaliperColor = preset.caliper;
    }

    setValue(glassTintRange, preset.glassTint, 'carShowroomGlassTint');

    if (preset.lightPreset) {
      applyLightPreset(preset.lightPreset, false);
    }

    bumpRevision();
    showToast('Style preset applied.');
  };

  floorPresetSel?.addEventListener('change', () => {
    const preset = (floorPresetSel.value || 'auto').trim();
    applyFloorPreset(preset);
  });

  lightPresetSel?.addEventListener('change', () => {
    const preset = (lightPresetSel.value || 'studio').trim();
    applyLightPreset(preset);
  });

  stylePresetSel?.addEventListener('change', () => {
    const preset = (stylePresetSel.value || '').trim();
    if (!preset) return;
    applyStylePreset(preset);
  });

  loadModelBtn?.addEventListener('click', () => {
    applyModelUrl();
  });

  modelUrlInp?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    applyModelUrl();
  });

  const syncFromInputs = () => {
    if (modelSel) root.dataset.carShowroomModel = modelSel.value;
    if (cameraSel) root.dataset.carShowroomCameraPreset = cameraSel.value;
    if (cameraModeSel) root.dataset.carShowroomCameraMode = cameraModeSel.value;
    if (camYawRange) root.dataset.carShowroomCamYaw = camYawRange.value;
    if (camPitchRange) root.dataset.carShowroomCamPitch = camPitchRange.value;
    if (camDistanceRange)
      root.dataset.carShowroomCamDistance = camDistanceRange.value;
    if (fovRange) root.dataset.carShowroomFov = fovRange.value;
    if (modeSel) root.dataset.carShowroomMode = modeSel.value;
    if (colorInp) {
      root.dataset.carShowroomColor = colorInp.value;
      updateColorPreview(colorInp.value);
    }
    if (wrapColorInp) root.dataset.carShowroomWrapColor = wrapColorInp.value;
    if (wrapPatternSel)
      root.dataset.carShowroomWrapPattern = wrapPatternSel.value;
    if (wrapScaleRange)
      root.dataset.carShowroomWrapScale = wrapScaleRange.value;
    if (wrapStyleSel) root.dataset.carShowroomWrapStyle = wrapStyleSel.value;
    if (wrapTintRange) root.dataset.carShowroomWrapTint = wrapTintRange.value;
    if (wrapRotRange)
      root.dataset.carShowroomWrapRotationDeg = wrapRotRange.value;
    if (wrapOffsetXRange)
      root.dataset.carShowroomWrapOffsetX = wrapOffsetXRange.value;
    if (wrapOffsetYRange)
      root.dataset.carShowroomWrapOffsetY = wrapOffsetYRange.value;
    if (finishSel) root.dataset.carShowroomFinish = finishSel.value;
    if (clearcoatRange)
      root.dataset.carShowroomClearcoat = clearcoatRange.value;
    if (flakeIntensityRange)
      root.dataset.carShowroomFlakeIntensity = flakeIntensityRange.value;
    if (flakeScaleRange)
      root.dataset.carShowroomFlakeScale = flakeScaleRange.value;
    if (pearlRange) root.dataset.carShowroomPearl = pearlRange.value;
    if (pearlThicknessRange)
      root.dataset.carShowroomPearlThickness = pearlThicknessRange.value;
    if (rideHeightRange)
      root.dataset.carShowroomRideHeight = rideHeightRange.value;
    if (modelYawRange) root.dataset.carShowroomModelYaw = modelYawRange.value;
    if (wheelFinishSel)
      root.dataset.carShowroomWheelFinish = wheelFinishSel.value;
    if (trimFinishSel) root.dataset.carShowroomTrimFinish = trimFinishSel.value;
    if (wheelColorInp) root.dataset.carShowroomWheelColor = wheelColorInp.value;
    if (trimColorInp) root.dataset.carShowroomTrimColor = trimColorInp.value;
    if (caliperColorInp)
      root.dataset.carShowroomCaliperColor = caliperColorInp.value;
    if (lightColorInp) root.dataset.carShowroomLightColor = lightColorInp.value;
    if (lightGlowRange)
      root.dataset.carShowroomLightGlow = lightGlowRange.value;
    if (glassTintRange)
      root.dataset.carShowroomGlassTint = glassTintRange.value;
    if (lightPresetSel)
      root.dataset.carShowroomLightPreset = lightPresetSel.value;
    if (bgSel) root.dataset.carShowroomBackground = bgSel.value;
    if (envIntensityRange)
      root.dataset.carShowroomEnvIntensity = envIntensityRange.value;
    if (lightIntensityRange)
      root.dataset.carShowroomLightIntensity = lightIntensityRange.value;
    if (lightWarmthRange)
      root.dataset.carShowroomLightWarmth = lightWarmthRange.value;
    if (rimBoostRange) root.dataset.carShowroomRimBoost = rimBoostRange.value;
    if (rigYawRange) root.dataset.carShowroomRigYaw = rigYawRange.value;
    if (rigHeightRange)
      root.dataset.carShowroomRigHeight = rigHeightRange.value;
    if (gridToggle)
      root.dataset.carShowroomGrid = gridToggle.checked ? 'true' : 'false';
    if (underglowColorInp)
      root.dataset.carShowroomUnderglowColor = underglowColorInp.value;
    if (underglowRange)
      root.dataset.carShowroomUnderglow = underglowRange.value;
    if (underglowSizeRange)
      root.dataset.carShowroomUnderglowSize = underglowSizeRange.value;
    if (underglowPulseRange)
      root.dataset.carShowroomUnderglowPulse = underglowPulseRange.value;
    if (shadowStrengthRange)
      root.dataset.carShowroomShadowStrength = shadowStrengthRange.value;
    if (shadowSizeRange)
      root.dataset.carShowroomShadowSize = shadowSizeRange.value;
    if (floorPresetSel)
      root.dataset.carShowroomFloorPreset = floorPresetSel.value;
    if (floorColorInp) root.dataset.carShowroomFloorColor = floorColorInp.value;
    if (floorRoughnessRange)
      root.dataset.carShowroomFloorRoughness = floorRoughnessRange.value;
    if (floorMetalnessRange)
      root.dataset.carShowroomFloorMetalness = floorMetalnessRange.value;
    if (floorOpacityRange)
      root.dataset.carShowroomFloorOpacity = floorOpacityRange.value;
    if (exposureRange) root.dataset.carShowroomExposure = exposureRange.value;
    if (bloomStrengthRange)
      root.dataset.carShowroomBloomStrength = bloomStrengthRange.value;
    if (bloomThresholdRange)
      root.dataset.carShowroomBloomThreshold = bloomThresholdRange.value;
    if (bloomRadiusRange)
      root.dataset.carShowroomBloomRadius = bloomRadiusRange.value;
    if (autoRotateChk)
      root.dataset.carShowroomAutoRotate = autoRotateChk.checked
        ? 'true'
        : 'false';
    if (autoQualityChk)
      root.dataset.carShowroomAutoQuality = autoQualityChk.checked
        ? 'true'
        : 'false';
    if (motionStyleSel)
      root.dataset.carShowroomMotionStyle = motionStyleSel.value;
    if (spinSpeedRange)
      root.dataset.carShowroomSpinSpeed = spinSpeedRange.value;
    if (motionRange) root.dataset.carShowroomMotionRange = motionRange.value;
    if (zoomRange) {
      root.dataset.carShowroomZoom = zoomRange.value;
      // Keep internal smoothing in sync with the slider so zoom doesn't
      // "bounce" back toward the previous wheel/pinch target.
      zoomTarget = clamp(Number.parseFloat(zoomRange.value) || 0, 0, 1);
    }
    if (quickZoomRange && zoomRange) quickZoomRange.value = zoomRange.value;
    if (quickSpinChk && autoRotateChk)
      quickSpinChk.checked = autoRotateChk.checked;
    if (quickLightSel && lightPresetSel)
      quickLightSel.value = lightPresetSel.value;
    if (quickStyleSel && stylePresetSel)
      quickStyleSel.value = stylePresetSel.value || '';
    bumpRevision();
  };

  quickFrameBtn?.addEventListener('click', () => {
    frameBtn?.click();
  });

  quickResetBtn?.addEventListener('click', () => {
    resetViewBtn?.click();
  });

  // FAB action handlers
  fabScreenshot?.addEventListener('click', async () => {
    closeFAB();

    // Small delay for FAB to close
    await new Promise(resolve => setTimeout(resolve, 100));

    // Trigger screenshot
    downloadScreenshot();

    // Optionally trigger native share with screenshot
    // (Implementation in downloadScreenshot function below)
  });

  fabShare?.addEventListener('click', () => {
    closeFAB();
    copyLinkBtn?.click();
  });

  fabFrame?.addEventListener('click', () => {
    closeFAB();
    frameBtn?.click();
  });

  fabReset?.addEventListener('click', () => {
    closeFAB();
    resetViewBtn?.click();
  });

  quickSpinChk?.addEventListener('change', () => {
    if (autoRotateChk) autoRotateChk.checked = quickSpinChk.checked;
    syncFromInputs();
  });

  quickZoomRange?.addEventListener('input', () => {
    if (zoomRange) zoomRange.value = quickZoomRange.value;
    syncFromInputs();
  });

  quickStyleSel?.addEventListener('change', () => {
    const preset = (quickStyleSel.value || '').trim();
    if (!preset) return;
    if (stylePresetSel) stylePresetSel.value = preset;
    applyStylePreset(preset);
  });

  quickLightSel?.addEventListener('change', () => {
    const preset = (quickLightSel.value || '').trim();
    if (!preset) return;
    if (lightPresetSel) lightPresetSel.value = preset;
    applyLightPreset(preset);
  });

  [
    modelSel,
    cameraSel,
    cameraModeSel,
    camYawRange,
    camPitchRange,
    camDistanceRange,
    fovRange,
    modeSel,
    colorInp,
    wrapColorInp,
    wrapPatternSel,
    wrapScaleRange,
    wrapStyleSel,
    wrapTintRange,
    wrapRotRange,
    wrapOffsetXRange,
    wrapOffsetYRange,
    finishSel,
    clearcoatRange,
    flakeIntensityRange,
    flakeScaleRange,
    pearlRange,
    pearlThicknessRange,
    wheelFinishSel,
    trimFinishSel,
    wheelColorInp,
    trimColorInp,
    caliperColorInp,
    lightColorInp,
    lightGlowRange,
    glassTintRange,
    bgSel,
    envIntensityRange,
    lightPresetSel,
    lightIntensityRange,
    lightWarmthRange,
    rimBoostRange,
    rigYawRange,
    rigHeightRange,
    gridToggle,
    underglowColorInp,
    underglowRange,
    underglowPulseRange,
    underglowSizeRange,
    shadowStrengthRange,
    shadowSizeRange,
    rideHeightRange,
    modelYawRange,
    floorPresetSel,
    floorColorInp,
    floorRoughnessRange,
    floorMetalnessRange,
    floorOpacityRange,
    exposureRange,
    bloomStrengthRange,
    bloomThresholdRange,
    bloomRadiusRange,
    autoRotateChk,
    autoQualityChk,
    motionStyleSel,
    spinSpeedRange,
    motionRange,
    zoomRange,
  ].forEach(el => {
    if (!el) return;
    el.addEventListener('input', syncFromInputs, { passive: true });
    el.addEventListener('change', syncFromInputs, { passive: true });
  });

  const randomizeLook = () => {
    const pick = <T>(list: T[]) =>
      list[Math.floor(Math.random() * list.length)];
    const range = (min: number, max: number, digits = 2) =>
      (min + Math.random() * (max - min)).toFixed(digits);

    const paintPalette = [
      '#00d1b2',
      '#60a5fa',
      '#f472b6',
      '#fbbf24',
      '#f87171',
      '#e5e7eb',
      '#0b0f1a',
      '#ffffff',
      '#22c55e',
      '#a855f7',
      '#fb923c',
      '#94a3b8',
    ];
    const accentPalette = [
      '#ef4444',
      '#f97316',
      '#fbbf24',
      '#22d3ee',
      '#a855f7',
      '#22c55e',
      '#f472b6',
    ];
    const wheelPalette = ['#111827', '#1f2937', '#e5e7eb', '#0b0f1a'];
    const finishes = ['gloss', 'satin', 'matte'];
    const wrapPatterns = [
      'solid',
      'stripes',
      'carbon',
      'camo',
      'checker',
      'hex',
      'race',
    ];
    const wrapStyles = ['oem', 'procedural'];
    const wheelFinishes = ['graphite', 'chrome', 'black'];
    const trimFinishes = ['black', 'chrome', 'brushed'];

    if (colorInp) colorInp.value = pick(paintPalette);
    if (wrapColorInp) wrapColorInp.value = pick(paintPalette);
    if (caliperColorInp) caliperColorInp.value = pick(accentPalette);
    if (wheelColorInp) wheelColorInp.value = pick(wheelPalette);
    if (trimColorInp) trimColorInp.value = pick(wheelPalette);

    if (finishSel) finishSel.value = pick(finishes);
    if (clearcoatRange) clearcoatRange.value = range(0.7, 1, 2);
    if (flakeIntensityRange) flakeIntensityRange.value = range(0.05, 0.55, 2);
    if (flakeScaleRange) flakeScaleRange.value = range(1, 5, 1);
    if (pearlRange) pearlRange.value = range(0, 0.6, 2);
    if (pearlThicknessRange) pearlThicknessRange.value = range(180, 620, 0);

    if (wrapPatternSel) wrapPatternSel.value = pick(wrapPatterns);
    if (wrapStyleSel) wrapStyleSel.value = pick(wrapStyles);
    if (wrapScaleRange) wrapScaleRange.value = range(0.6, 3, 2);
    if (wrapRotRange) wrapRotRange.value = range(-45, 45, 0);
    if (wrapTintRange) wrapTintRange.value = range(0.7, 1, 2);

    if (wheelFinishSel) wheelFinishSel.value = pick(wheelFinishes);
    if (trimFinishSel) trimFinishSel.value = pick(trimFinishes);

    if (stylePresetSel) stylePresetSel.value = '';

    syncFromInputs();
    showToast('New look generated.');
  };

  randomizeLookBtn?.addEventListener('click', randomizeLook);

  resetBtn?.addEventListener('click', () => {
    if (modelSel) modelSel.value = '/models/porsche-911-gt3rs.glb';
    if (modelUrlInp) modelUrlInp.value = '/models/porsche-911-gt3rs.glb';
    if (cameraSel) cameraSel.value = 'hero';
    if (modeSel) modeSel.value = 'paint';
    if (colorInp) colorInp.value = '#00d1b2';
    if (wrapColorInp) wrapColorInp.value = '#00d1b2';
    if (wrapPatternSel) wrapPatternSel.value = 'stripes';
    if (wrapScaleRange) wrapScaleRange.value = '1.6';
    if (wrapStyleSel) wrapStyleSel.value = 'oem';
    if (wrapTintRange) wrapTintRange.value = '0.92';
    if (wrapRotRange) wrapRotRange.value = '0';
    if (wrapOffsetXRange) wrapOffsetXRange.value = '0';
    if (wrapOffsetYRange) wrapOffsetYRange.value = '0';
    if (stylePresetSel) stylePresetSel.value = '';
    if (finishSel) finishSel.value = 'gloss';
    if (clearcoatRange) clearcoatRange.value = '1';
    if (flakeIntensityRange) flakeIntensityRange.value = '0.25';
    if (flakeScaleRange) flakeScaleRange.value = '2.5';
    if (pearlRange) pearlRange.value = '0';
    if (pearlThicknessRange) pearlThicknessRange.value = '320';
    if (rideHeightRange) rideHeightRange.value = '0.05';
    if (modelYawRange) modelYawRange.value = '0';
    if (wheelFinishSel) wheelFinishSel.value = 'graphite';
    if (trimFinishSel) trimFinishSel.value = 'black';
    if (wheelColorInp) wheelColorInp.value = '#1f2937';
    if (trimColorInp) trimColorInp.value = '#0b0f1a';
    if (caliperColorInp) caliperColorInp.value = '#ef4444';
    if (lightColorInp) lightColorInp.value = '#dbeafe';
    if (lightGlowRange) lightGlowRange.value = '1.25';
    if (glassTintRange) glassTintRange.value = '0.15';
    if (lightPresetSel) lightPresetSel.value = 'studio';
    if (bgSel) bgSel.value = 'void';
    if (envIntensityRange) envIntensityRange.value = '0.7';
    if (lightIntensityRange) lightIntensityRange.value = '1';
    if (lightWarmthRange) lightWarmthRange.value = '0';
    if (rimBoostRange) rimBoostRange.value = '1';
    if (rigYawRange) rigYawRange.value = '0';
    if (rigHeightRange) rigHeightRange.value = '1';
    if (gridToggle) gridToggle.checked = false;
    if (underglowColorInp) underglowColorInp.value = '#22d3ee';
    if (underglowRange) underglowRange.value = '0';
    if (underglowPulseRange) underglowPulseRange.value = '0';
    if (underglowSizeRange) underglowSizeRange.value = '4.5';
    if (shadowStrengthRange) shadowStrengthRange.value = '0.5';
    if (shadowSizeRange) shadowSizeRange.value = '6';
    if (floorPresetSel) floorPresetSel.value = 'auto';
    if (floorColorInp) floorColorInp.value = '#05070d';
    if (floorRoughnessRange) floorRoughnessRange.value = '0.55';
    if (floorMetalnessRange) floorMetalnessRange.value = '0.02';
    if (floorOpacityRange) floorOpacityRange.value = '0';
    if (exposureRange) exposureRange.value = '1';
    if (bloomStrengthRange) bloomStrengthRange.value = '0';
    if (bloomThresholdRange) bloomThresholdRange.value = '0.9';
    if (bloomRadiusRange) bloomRadiusRange.value = '0';
    if (autoRotateChk) autoRotateChk.checked = true;
    if (autoQualityChk) autoQualityChk.checked = true;
    if (motionStyleSel) motionStyleSel.value = 'spin';
    if (spinSpeedRange) spinSpeedRange.value = '0.75';
    if (motionRange) motionRange.value = '18';
    if (zoomRange) zoomRange.value = isMobilePanel() ? '0.85' : '0.8';
    syncFromInputs();
  });

  resetCameraBtn?.addEventListener('click', () => {
    if (cameraSel) cameraSel.value = 'hero';
    root.dataset.carShowroomCameraPreset = 'hero';
    bumpRevision();
  });

  resetViewBtn?.addEventListener('click', () => {
    if (cameraModeSel) cameraModeSel.value = 'preset';
    root.dataset.carShowroomCameraMode = 'preset';
    if (cameraSel) cameraSel.value = 'hero';
    root.dataset.carShowroomCameraPreset = 'hero';

    if (camYawRange) camYawRange.value = '17';
    if (camPitchRange) camPitchRange.value = '7';
    if (camDistanceRange) camDistanceRange.value = '9.8';
    if (fovRange) fovRange.value = '55';
    root.dataset.carShowroomCamYaw = '17';
    root.dataset.carShowroomCamPitch = '7';
    root.dataset.carShowroomCamDistance = '9.8';
    root.dataset.carShowroomFov = '55';
    bumpRevision();
  });

  const copyShareLink = async () => {
    const ds = root.dataset;
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    const model = (ds.carShowroomModel || '').trim();
    // Don't try to share blob/data URLs.
    if (model && !model.startsWith('blob:') && !model.startsWith('data:')) {
      params.set('model', model);
    } else {
      params.delete('model');
    }

    // Part mapping (only for shareable models)
    const pmRaw = (ds.carShowroomPartMap || '').trim();
    if (
      pmRaw &&
      model &&
      !model.startsWith('blob:') &&
      !model.startsWith('data:')
    ) {
      const parsed = safeParseJson<unknown>(pmRaw);
      const map = normalizePartMap(parsed);
      const json = Object.keys(map).length ? JSON.stringify(map) : '';
      if (json) {
        const encoded = toBase64Url(json);
        // Keep links from becoming absurdly large.
        if (encoded.length < 2000) params.set('pm', encoded);
        else params.delete('pm');
      } else {
        params.delete('pm');
      }
    } else {
      params.delete('pm');
    }

    params.set('mode', ds.carShowroomMode || 'paint');
    params.set('color', ds.carShowroomColor || '#00d1b2');
    params.set('wcolor', ds.carShowroomWrapColor || '#00d1b2');
    params.set('wpat', ds.carShowroomWrapPattern || 'stripes');
    params.set('wscale', ds.carShowroomWrapScale || '1.6');
    params.set('wstyle', ds.carShowroomWrapStyle || 'oem');
    params.set('wtint', ds.carShowroomWrapTint || '0.92');
    params.set('wrot', ds.carShowroomWrapRotationDeg || '0');
    params.set('wox', ds.carShowroomWrapOffsetX || '0');
    params.set('woy', ds.carShowroomWrapOffsetY || '0');
    params.set('finish', ds.carShowroomFinish || 'gloss');
    params.set('cc', ds.carShowroomClearcoat || '1');
    params.set('fi', ds.carShowroomFlakeIntensity || '0.25');
    params.set('fs', ds.carShowroomFlakeScale || '2.5');
    params.set('pr', ds.carShowroomPearl || '0');
    params.set('pt', ds.carShowroomPearlThickness || '320');
    params.set('rh', ds.carShowroomRideHeight || '0');
    params.set('my', ds.carShowroomModelYaw || '0');
    params.set('wheel', ds.carShowroomWheelFinish || 'graphite');
    params.set('trim', ds.carShowroomTrimFinish || 'black');
    params.set('whc', ds.carShowroomWheelColor || '#1f2937');
    params.set('trc', ds.carShowroomTrimColor || '#0b0f1a');
    params.set('ccol', ds.carShowroomCaliperColor || '#ef4444');
    params.set('lcol', ds.carShowroomLightColor || '#dbeafe');
    params.set('lglow', ds.carShowroomLightGlow || '1.25');
    params.set('tint', ds.carShowroomGlassTint || '0.15');
    params.set('bg', ds.carShowroomBackground || 'void');
    params.set('cam', ds.carShowroomCameraPreset || 'hero');
    params.set('spin', ds.carShowroomSpinSpeed || '0.65');
    params.set('zoom', ds.carShowroomZoom || '0');
    params.set('ar', ds.carShowroomAutoRotate === 'false' ? '0' : '1');
    params.set('aq', ds.carShowroomAutoQuality === 'false' ? '0' : '1');
    params.set('ms', ds.carShowroomMotionStyle || 'spin');
    params.set('ma', ds.carShowroomMotionRange || '18');

    params.set('exp', ds.carShowroomExposure || '1');
    params.set('bloom', ds.carShowroomBloomStrength || '0');
    params.set('bt', ds.carShowroomBloomThreshold || '0.9');
    params.set('br', ds.carShowroomBloomRadius || '0');

    params.set('env', ds.carShowroomEnvIntensity || '0.7');
    params.set('li', ds.carShowroomLightIntensity || '1');
    params.set('lw', ds.carShowroomLightWarmth || '0');
    params.set('rb', ds.carShowroomRimBoost || '1');
    params.set('lp', ds.carShowroomLightPreset || 'studio');
    params.set('ry', ds.carShowroomRigYaw || '0');
    params.set('rgh', ds.carShowroomRigHeight || '1');
    params.set('grid', ds.carShowroomGrid === 'true' ? '1' : '0');
    params.set('ug', ds.carShowroomUnderglow || '0');
    params.set('ugc', ds.carShowroomUnderglowColor || '#22d3ee');
    params.set('ugs', ds.carShowroomUnderglowSize || '4.5');
    params.set('up', ds.carShowroomUnderglowPulse || '0');
    params.set('ss', ds.carShowroomShadowStrength || '0.85');
    params.set('sz', ds.carShowroomShadowSize || '6');
    params.set('floor', ds.carShowroomFloorPreset || 'auto');
    params.set('fcol', ds.carShowroomFloorColor || '#05070d');
    params.set('fr', ds.carShowroomFloorRoughness || '0.55');
    params.set('fm', ds.carShowroomFloorMetalness || '0.02');
    params.set('fo', ds.carShowroomFloorOpacity || '0');

    const cm = (ds.carShowroomCameraMode || '').trim();
    if (cm === 'manual') {
      params.set('cm', 'manual');
      params.set('yaw', ds.carShowroomCamYaw || '17');
      params.set('pitch', ds.carShowroomCamPitch || '7');
      params.set('dist', ds.carShowroomCamDistance || '9.8');
      params.set('fov', ds.carShowroomFov || '55');
      const lx = (ds.carShowroomLookAtX || '').trim();
      const ly = (ds.carShowroomLookAtY || '').trim();
      const lz = (ds.carShowroomLookAtZ || '').trim();
      if (lx) params.set('lx', lx);
      if (ly) params.set('ly', ly);
      if (lz) params.set('lz', lz);
    } else {
      params.delete('cm');
      params.delete('yaw');
      params.delete('pitch');
      params.delete('dist');
      params.delete('fov');
      params.delete('lx');
      params.delete('ly');
      params.delete('lz');
    }

    url.search = params.toString();

    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Car Configuration',
          text: 'Check out my custom car design!',
          url: url.toString(),
        });
        showToast('Shared successfully!');
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share failed:', err);
        }
      }
    }

    // Fallback to clipboard
    const ok = await copyToClipboard(url.toString());
    showToast(ok ? 'Link copied.' : 'Could not copy link.');
  };

  copyLinkBtn?.addEventListener('click', () => {
    void copyShareLink();
  });

  const copyBuildSheet = async () => {
    const ds = root.dataset;
    const state: Record<string, string> = {};
    for (const k of PRESET_DATASET_KEYS) {
      const v = (ds[k] || '').trim();
      if (v) state[String(k)] = v;
    }

    // Include a share URL for convenience.
    const url = new URL(window.location.href);
    // Re-use the share link logic so it matches the UI.
    await (async () => {
      const params = new URLSearchParams(url.search);

      const model = (ds.carShowroomModel || '').trim();
      if (model && !model.startsWith('blob:') && !model.startsWith('data:')) {
        params.set('model', model);
      } else {
        params.delete('model');
      }

      const pmRaw = (ds.carShowroomPartMap || '').trim();
      if (
        pmRaw &&
        model &&
        !model.startsWith('blob:') &&
        !model.startsWith('data:')
      ) {
        const parsed = safeParseJson<unknown>(pmRaw);
        const map = normalizePartMap(parsed);
        const json = Object.keys(map).length ? JSON.stringify(map) : '';
        if (json) {
          const encoded = toBase64Url(json);
          if (encoded.length < 2000) params.set('pm', encoded);
          else params.delete('pm');
        } else {
          params.delete('pm');
        }
      } else {
        params.delete('pm');
      }

      params.set('mode', ds.carShowroomMode || 'paint');
      params.set('color', ds.carShowroomColor || '#00d1b2');
      params.set('wcolor', ds.carShowroomWrapColor || '#00d1b2');
      params.set('wpat', ds.carShowroomWrapPattern || 'stripes');
      params.set('wscale', ds.carShowroomWrapScale || '1.6');
      params.set('wstyle', ds.carShowroomWrapStyle || 'oem');
      params.set('wtint', ds.carShowroomWrapTint || '0.92');
      params.set('wrot', ds.carShowroomWrapRotationDeg || '0');
      params.set('wox', ds.carShowroomWrapOffsetX || '0');
      params.set('woy', ds.carShowroomWrapOffsetY || '0');
      params.set('finish', ds.carShowroomFinish || 'gloss');
      params.set('cc', ds.carShowroomClearcoat || '1');
      params.set('fi', ds.carShowroomFlakeIntensity || '0.25');
      params.set('fs', ds.carShowroomFlakeScale || '2.5');
      params.set('pr', ds.carShowroomPearl || '0');
      params.set('pt', ds.carShowroomPearlThickness || '320');
      params.set('rh', ds.carShowroomRideHeight || '0');
      params.set('my', ds.carShowroomModelYaw || '0');
      params.set('wheel', ds.carShowroomWheelFinish || 'graphite');
      params.set('trim', ds.carShowroomTrimFinish || 'black');
      params.set('whc', ds.carShowroomWheelColor || '#1f2937');
      params.set('trc', ds.carShowroomTrimColor || '#0b0f1a');
      params.set('ccol', ds.carShowroomCaliperColor || '#ef4444');
      params.set('lcol', ds.carShowroomLightColor || '#dbeafe');
      params.set('lglow', ds.carShowroomLightGlow || '1.25');
      params.set('tint', ds.carShowroomGlassTint || '0.15');
      params.set('bg', ds.carShowroomBackground || 'void');
      params.set('cam', ds.carShowroomCameraPreset || 'hero');
      params.set('spin', ds.carShowroomSpinSpeed || '0.65');
      params.set('zoom', ds.carShowroomZoom || '0');
      params.set('ar', ds.carShowroomAutoRotate === 'false' ? '0' : '1');
      params.set('aq', ds.carShowroomAutoQuality === 'false' ? '0' : '1');
      params.set('ms', ds.carShowroomMotionStyle || 'spin');
      params.set('ma', ds.carShowroomMotionRange || '18');

      params.set('exp', ds.carShowroomExposure || '1');
      params.set('bloom', ds.carShowroomBloomStrength || '0');
      params.set('bt', ds.carShowroomBloomThreshold || '0.9');
      params.set('br', ds.carShowroomBloomRadius || '0');

      params.set('env', ds.carShowroomEnvIntensity || '0.7');
      params.set('li', ds.carShowroomLightIntensity || '1');
      params.set('lw', ds.carShowroomLightWarmth || '0');
      params.set('rb', ds.carShowroomRimBoost || '1');
      params.set('lp', ds.carShowroomLightPreset || 'studio');
      params.set('ry', ds.carShowroomRigYaw || '0');
      params.set('rgh', ds.carShowroomRigHeight || '1');
      params.set('grid', ds.carShowroomGrid === 'true' ? '1' : '0');
      params.set('ug', ds.carShowroomUnderglow || '0');
      params.set('ugc', ds.carShowroomUnderglowColor || '#22d3ee');
      params.set('ugs', ds.carShowroomUnderglowSize || '4.5');
      params.set('up', ds.carShowroomUnderglowPulse || '0');
      params.set('ss', ds.carShowroomShadowStrength || '0.85');
      params.set('sz', ds.carShowroomShadowSize || '6');
      params.set('floor', ds.carShowroomFloorPreset || 'auto');
      params.set('fcol', ds.carShowroomFloorColor || '#05070d');
      params.set('fr', ds.carShowroomFloorRoughness || '0.55');
      params.set('fm', ds.carShowroomFloorMetalness || '0.02');
      params.set('fo', ds.carShowroomFloorOpacity || '0');

      const cm = (ds.carShowroomCameraMode || '').trim();
      if (cm === 'manual') {
        params.set('cm', 'manual');
        params.set('yaw', ds.carShowroomCamYaw || '17');
        params.set('pitch', ds.carShowroomCamPitch || '7');
        params.set('dist', ds.carShowroomCamDistance || '9.8');
        params.set('fov', ds.carShowroomFov || '55');
        const lx = (ds.carShowroomLookAtX || '').trim();
        const ly = (ds.carShowroomLookAtY || '').trim();
        const lz = (ds.carShowroomLookAtZ || '').trim();
        if (lx) params.set('lx', lx);
        if (ly) params.set('ly', ly);
        if (lz) params.set('lz', lz);
      } else {
        params.delete('cm');
        params.delete('yaw');
        params.delete('pitch');
        params.delete('dist');
        params.delete('fov');
        params.delete('lx');
        params.delete('ly');
        params.delete('lz');
      }

      url.search = params.toString();
    })();

    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      selectedPart: (ds.carShowroomSelectedPart || '').trim() || null,
      shareUrl: url.toString(),
      state,
    };

    const ok = await copyToClipboard(JSON.stringify(payload, null, 2));
    showToast(ok ? 'Build sheet copied.' : 'Could not copy build sheet.');
  };

  copyBuildBtn?.addEventListener('click', () => {
    void copyBuildSheet();
  });

  presetSaveBtn?.addEventListener('click', () => {
    const ds = root.dataset;
    const model = (ds.carShowroomModel || '').trim();
    if (model.startsWith('blob:') || model.startsWith('data:')) {
      showToast('Cannot save presets that use local (blob/data) models.');
      return;
    }

    const existingNames = new Set(savedPresets.map(p => p.name));
    const suggested = (() => {
      for (let i = 1; i < 1000; i++) {
        const name = `Preset ${i}`;
        if (!existingNames.has(name)) return name;
      }
      return `Preset ${Date.now()}`;
    })();

    const nameRaw = window.prompt('Preset name:', suggested);
    const name = (nameRaw || '').trim();
    if (!name) return;

    const preset: SavedPreset = {
      id: createPresetId(),
      name,
      state: captureStateForPreset(),
    };

    savedPresets = [preset, ...savedPresets].slice(0, 50);
    saveSavedPresets(savedPresets);
    renderPresetOptions();
    if (presetSel) presetSel.value = preset.id;
    showToast('Preset saved.');
  });

  presetLoadBtn?.addEventListener('click', () => {
    const id = (presetSel?.value || '').trim();
    if (!id) {
      showToast('Choose a preset first.');
      return;
    }
    const preset = savedPresets.find(p => p.id === id);
    if (!preset) {
      showToast('Preset not found.');
      return;
    }
    applyPresetState(preset.state);
    showToast(`Loaded: ${preset.name}`);
  });

  presetDeleteBtn?.addEventListener('click', () => {
    const id = (presetSel?.value || '').trim();
    if (!id) {
      showToast('Choose a preset first.');
      return;
    }
    const preset = savedPresets.find(p => p.id === id);
    if (!preset) {
      showToast('Preset not found.');
      return;
    }
    const ok = window.confirm(`Delete preset "${preset.name}"?`);
    if (!ok) return;
    savedPresets = savedPresets.filter(p => p.id !== id);
    saveSavedPresets(savedPresets);
    renderPresetOptions();
    showToast('Preset deleted.');
  });

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      showToast('Please choose a .glb file.');
      return;
    }

    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    const url = URL.createObjectURL(file);
    currentObjectUrl = url;
    root.dataset.carShowroomModel = url;
    if (modelUrlInp) modelUrlInp.value = url;
    bumpRevision();
    showToast(`Loaded local model: ${file.name}`);
  };

  importBtn?.addEventListener('click', () => {
    fileInp?.click();
  });

  fileInp?.addEventListener('change', () => {
    const file = fileInp.files?.[0];
    if (!file) return;
    handleFile(file);
    // Allow re-selecting the same file.
    fileInp.value = '';
  });

  // Drag & drop a GLB anywhere.
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    handleFile(file);
  };
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('drop', onDrop);

  let downloadScreenshot = () => {
    showToast('Screenshot not ready yet.');
  };

  screenshotBtn?.addEventListener('click', () => {
    downloadScreenshot();
  });

  // Keyboard shortcuts
  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key;
    if (key === 'o' || key === 'O') {
      if (isMobilePanel()) {
        setPanelSnap(panelSnap === 'collapsed' ? 'half' : 'collapsed', true);
      } else {
        if (panelSnap === 'collapsed') setPanelSnap('peek', true);
        panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      e.preventDefault();
      return;
    }
    if (key === 'r' || key === 'R') {
      resetBtn?.click();
      e.preventDefault();
      return;
    }
    if (key === 'c' || key === 'C') {
      void copyShareLink();
      e.preventDefault();
      return;
    }
    if (key === 's' || key === 'S') {
      downloadScreenshot();
      e.preventDefault();
      return;
    }
    if (key === 'p' || key === 'P') {
      presetSaveBtn?.click();
      e.preventDefault();
      return;
    }
    if (key === 'Escape') {
      if (isMobilePanel()) setPanelSnap('collapsed', true);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // --- Three.js runtime
  let renderer: THREE.WebGLRenderer | null = null;
  let composer: EffectComposer | null = null;
  let showroom: CarShowroomScene | null = null;
  const size = { width: 1, height: 1, dpr: 1 };
  let qualityDprCap = caps.maxDpr;
  let onResize: (() => void) | null = null;
  let raf = 0;
  let running = false;
  let io: IntersectionObserver | null = null;
  let applyPostFxFromDataset = () => {};
  let onPointerMove: ((e: PointerEvent) => void) | null = null;
  let onPointerDown: (() => void) | null = null;
  let onPointerUp: (() => void) | null = null;
  let onWheel: ((e: WheelEvent) => void) | null = null;
  let onTouchStart: ((e: TouchEvent) => void) | null = null;
  let onTouchMove: ((e: TouchEvent) => void) | null = null;
  let onTouchEnd: (() => void) | null = null;
  let onCanvasPointerUp: ((e: PointerEvent) => void) | null = null;
  let mobileGestures: MobileGestureHandler | null = null;

  if (enable3d) {
    const rendererInstance = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !caps.coarsePointer,
      powerPreference: 'high-performance',
    });
    renderer = rendererInstance;

    rendererInstance.shadowMap.enabled = true;
    rendererInstance.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererInstance.toneMapping = THREE.ACESFilmicToneMapping;
    rendererInstance.toneMappingExposure = 1.0;

    const sceneInstance = new THREE.Scene();

    const showroomInstance = new CarShowroomScene(root, rendererInstance);
    showroom = showroomInstance;
    showroomInstance.setEnvironment(sceneInstance);
    sceneInstance.add(showroomInstance.group);

    const applyQuality = () => {
      const q = (root.dataset.carShowroomQuality || 'balanced') as
        | 'performance'
        | 'balanced'
        | 'ultra';
      showroomInstance.setQuality(q);
    };

    // default
    if (!root.dataset.carShowroomQuality) {
      root.dataset.carShowroomQuality = 'balanced';
    }
    applyQuality();

    const composerInstance = new EffectComposer(rendererInstance);
    composer = composerInstance;
    const renderPassInstance = new RenderPass(
      sceneInstance,
      showroomInstance.camera
    );
    composerInstance.addPass(renderPassInstance);

    const bloomInstance = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      0.55,
      0.35,
      0.88
    );
    bloomInstance.enabled = false;
    composerInstance.addPass(bloomInstance);

    const fxaaInstance = new ShaderPass(FXAAShader);
    composerInstance.addPass(fxaaInstance);

    const outputInstance = new OutputPass();
    composerInstance.addPass(outputInstance);

    let lastUiRevision = '';
    applyPostFxFromDataset = () => {
      const ds = root.dataset;
      const rev = ds.carShowroomUiRevision || '';
      if (rev === lastUiRevision) return;
      lastUiRevision = rev;

      const exp = clamp(
        Number.parseFloat(ds.carShowroomExposure || '1') || 1,
        0.1,
        3
      );
      rendererInstance.toneMappingExposure = exp;

      const bloomStrength = clamp(
        Number.parseFloat(ds.carShowroomBloomStrength || '0') || 0,
        0,
        3
      );
      bloomInstance.strength = bloomStrength;
      bloomInstance.enabled = bloomStrength > 0.01;
      bloomInstance.threshold = clamp01(
        Number.parseFloat(ds.carShowroomBloomThreshold || '0.9') || 0
      );
      bloomInstance.radius = clamp01(
        Number.parseFloat(ds.carShowroomBloomRadius || '0') || 0
      );
    };

    applyPostFxFromDataset();

    // Input shaping
    const rawPointer = new THREE.Vector2(0, 0);
    const pointer = new THREE.Vector2(0, 0);
    const prevPointer = new THREE.Vector2(0, 0);
    const pointerVelocity = new THREE.Vector2(0, 0);

    let press = 0;
    let pressTarget = 0;

    zoomTarget = clamp(
      Number.parseFloat(root.dataset.carShowroomZoom || '0') || 0,
      0,
      1
    );
    let zoom = zoomTarget;

    let pinchActive = false;
    let pinchStartDist = 0;
    let pinchStartZoom = 0;

    const setZoom = (v: number) => {
      zoomTarget = clamp(v, 0, 1);
      if (zoomRange) {
        zoomRange.value = zoomTarget.toFixed(2);
        root.dataset.carShowroomZoom = zoomRange.value;
        bumpRevision();
      }
    };

    zoomWideBtn?.addEventListener('click', () => setZoom(0.0));
    zoomMidBtn?.addEventListener('click', () => setZoom(0.5));
    zoomCloseBtn?.addEventListener('click', () => setZoom(1.0));

    const applyCameraFrame = (
      rec: {
        yawDeg: number;
        pitchDeg: number;
        distance: number;
        fov: number;
        lookAt: { x: number; y: number; z: number };
      } | null,
      message: string,
      zoomValue = 0.65
    ) => {
      if (!rec) {
        showToast('Model not ready yet.');
        return;
      }

      if (cameraModeSel) cameraModeSel.value = 'manual';
      root.dataset.carShowroomCameraMode = 'manual';

      if (camYawRange) camYawRange.value = String(Math.round(rec.yawDeg));
      if (camPitchRange) camPitchRange.value = String(Math.round(rec.pitchDeg));
      if (camDistanceRange) camDistanceRange.value = rec.distance.toFixed(2);
      if (fovRange) fovRange.value = String(Math.round(rec.fov));

      root.dataset.carShowroomCamYaw = String(rec.yawDeg);
      root.dataset.carShowroomCamPitch = String(rec.pitchDeg);
      root.dataset.carShowroomCamDistance = String(rec.distance);
      root.dataset.carShowroomFov = String(rec.fov);
      root.dataset.carShowroomLookAtX = rec.lookAt.x.toFixed(3);
      root.dataset.carShowroomLookAtY = rec.lookAt.y.toFixed(3);
      root.dataset.carShowroomLookAtZ = rec.lookAt.z.toFixed(3);

      // Bring zoom slider in sync with the new distance feel.
      setZoom(zoomValue);

      bumpRevision();
      showToast(message);
    };

    frameBtn?.addEventListener('click', () => {
      applyCameraFrame(
        showroomInstance.getFrameRecommendation(),
        'Framed model.'
      );
    });

    focusSelectionBtn?.addEventListener('click', () => {
      const rec = showroomInstance.getSelectionFrameRecommendation();
      if (!rec) {
        showToast('Select a mesh first.');
        return;
      }
      applyCameraFrame(rec, 'Focused on selection.', 0.8);
    });

    downloadScreenshot = () => {
      try {
        const scaleRaw = (shotScaleSel?.value || '1').trim();
        const scale = clamp(Number.parseFloat(scaleRaw) || 1, 1, 4);
        const transparent = Boolean(shotTransparentChk?.checked);

        // Temporarily render at higher res for export.
        const prevBg = sceneInstance.background;
        if (transparent) sceneInstance.background = null;

        const exportW = Math.max(1, Math.floor(size.width * scale));
        const exportH = Math.max(1, Math.floor(size.height * scale));

        const prevDpr = size.dpr;
        rendererInstance.setPixelRatio(1);
        rendererInstance.setSize(exportW, exportH, false);
        composerInstance.setPixelRatio(1);
        composerInstance.setSize(exportW, exportH);
        showroomInstance.resize(exportW, exportH);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fxaaInstance.material.uniforms as any)['resolution'].value.set(
          1 / exportW,
          1 / exportH
        );
        bloomInstance.setSize(exportW, exportH);

        composerInstance.render();

        canvas.toBlob(async blob => {
          if (!blob) {
            showToast('Screenshot failed (no image data).');
            return;
          }

          // Try native share on mobile (with screenshot)
          if (isMobileDevice() && navigator.share && navigator.canShare) {
            try {
              const file = new File([blob], 'car-showroom.png', {
                type: 'image/png',
              });

              const shareData = {
                title: 'My 3D Car Configuration',
                text: 'Check out my custom car design!',
                files: [file],
              };

              if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
                showToast('Shared successfully!');

                // Restore view sizing
                sceneInstance.background = prevBg;
                rendererInstance.setPixelRatio(prevDpr);
                rendererInstance.setSize(size.width, size.height, false);
                composerInstance.setPixelRatio(prevDpr);
                composerInstance.setSize(size.width, size.height);
                showroomInstance.resize(size.width, size.height);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (fxaaInstance.material.uniforms as any)['resolution'].value.set(
                  1 / (size.width * prevDpr),
                  1 / (size.height * prevDpr)
                );
                bloomInstance.setSize(size.width, size.height);
                return;
              }
            } catch (err) {
              // User cancelled or share failed, fall through to download
              if ((err as Error).name !== 'AbortError') {
                console.warn('Share failed:', err);
              }
            }
          }

          // Fallback to download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'car-showroom.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Screenshot downloaded.');

          // Restore view sizing
          sceneInstance.background = prevBg;
          rendererInstance.setPixelRatio(prevDpr);
          rendererInstance.setSize(size.width, size.height, false);
          composerInstance.setPixelRatio(prevDpr);
          composerInstance.setSize(size.width, size.height);
          showroomInstance.resize(size.width, size.height);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fxaaInstance.material.uniforms as any)['resolution'].value.set(
            1 / (size.width * prevDpr),
            1 / (size.height * prevDpr)
          );
          bloomInstance.setSize(size.width, size.height);
        }, 'image/png');
      } catch {
        showToast('Screenshot failed.');
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      size.width = Math.max(1, Math.floor(rect.width));
      size.height = Math.max(1, Math.floor(rect.height));
      size.dpr = Math.min(caps.devicePixelRatio, qualityDprCap);

      rendererInstance.setPixelRatio(size.dpr);
      rendererInstance.setSize(size.width, size.height, false);
      composerInstance.setPixelRatio(size.dpr);
      composerInstance.setSize(size.width, size.height);

      showroomInstance.resize(size.width, size.height);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fxaaInstance.material.uniforms as any)['resolution'].value.set(
        1 / (size.width * size.dpr),
        1 / (size.height * size.dpr)
      );

      bloomInstance.setSize(size.width, size.height);
    };

    resize();

    const updateQualityCap = (v: string) => {
      if (v === 'performance') qualityDprCap = 1;
      else if (v === 'ultra') qualityDprCap = caps.maxDpr;
      else qualityDprCap = Math.min(caps.maxDpr, 1.75);
    };

    updateQualityCap(root.dataset.carShowroomQuality || 'balanced');

    let lastQualityShift = 0;
    let lowFpsTime = 0;
    let highFpsTime = 0;

    const setQuality = (v: string, fromAuto = false) => {
      const next =
        v === 'performance' || v === 'balanced' || v === 'ultra'
          ? v
          : 'balanced';
      const current = root.dataset.carShowroomQuality || 'balanced';
      if (current === next) return;
      root.dataset.carShowroomQuality = next;
      if (qualitySel) qualitySel.value = next;
      updateQualityCap(next);
      applyQuality();
      resize();
      bumpRevision();
      lastQualityShift = performance.now();
      if (!fromAuto) {
        lowFpsTime = 0;
        highFpsTime = 0;
      }
    };

    qualitySel?.addEventListener('change', () => {
      const v = (qualitySel.value || 'balanced').trim();
      setQuality(v, false);
    });

    // Sensible defaults for export options
    if (shotScaleSel && !shotScaleSel.value) shotScaleSel.value = '2';
    if (shotScaleSel && (shotScaleSel.value || '').trim() === '1') {
      // leave as-is
    }

    // Tap/click part picking
    const raycaster = new THREE.Raycaster();
    const pickNdc = new THREE.Vector2();
    const pickPartAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / Math.max(1, rect.width);
      const y = (clientY - rect.top) / Math.max(1, rect.height);
      pickNdc.set(x * 2 - 1, -(y * 2 - 1));
      const hit = showroomInstance.pickMesh(pickNdc, raycaster);
      if (!hit) return;
      root.dataset.carShowroomSelectedPart = hit.part;
      root.dataset.carShowroomSelectedMeshName = (hit.mesh?.name || '').trim();
      root.dataset.carShowroomSelectedMeshPath = (hit.meshPath || '').trim();
      root.dataset.carShowroomSelectedMaterialName = (() => {
        const readName = (v: unknown): string => {
          if (!v) return '';
          const obj = v as { name?: unknown };
          return typeof obj.name === 'string' ? obj.name : '';
        };

        const mat = hit.mesh?.material as unknown;
        if (Array.isArray(mat)) return readName(mat[0]).trim();
        return readName(mat).trim();
      })();
      showroomInstance.setSelectedMesh(hit.mesh);
      if (selectedPartEl) selectedPartEl.textContent = `Selected: ${hit.part}`;
      if (selectedMeshEl) {
        const name = (root.dataset.carShowroomSelectedMeshName || '').trim();
        selectedMeshEl.hidden = name.length === 0;
        selectedMeshEl.textContent = name ? `Mesh: ${name}` : '';
      }
      if (selectedPathEl) {
        const path = (root.dataset.carShowroomSelectedMeshPath || '').trim();
        selectedPathEl.hidden = path.length === 0;
        selectedPathEl.textContent = path ? `Path: ${path}` : '';
      }
      if (selectedMaterialEl) {
        const name = (
          root.dataset.carShowroomSelectedMaterialName || ''
        ).trim();
        selectedMaterialEl.hidden = name.length === 0;
        selectedMaterialEl.textContent = name ? `Material: ${name}` : '';
      }
    };

    onCanvasPointerUp = e => {
      // Avoid picking while dragging/rotating.
      if (press > 0.55) return;
      pickPartAt(e.clientX, e.clientY);
    };
    canvas.addEventListener('pointerup', onCanvasPointerUp);

    clearSelectionBtn?.addEventListener('click', () => {
      root.dataset.carShowroomSelectedPart = '';
      root.dataset.carShowroomSelectedMeshName = '';
      root.dataset.carShowroomSelectedMeshPath = '';
      root.dataset.carShowroomSelectedMaterialName = '';
      showroomInstance.clearSelection();
      if (selectedPartEl)
        selectedPartEl.textContent = 'Tap/click the car to select';
      if (selectedMeshEl) {
        selectedMeshEl.hidden = true;
        selectedMeshEl.textContent = '';
      }
      if (selectedPathEl) {
        selectedPathEl.hidden = true;
        selectedPathEl.textContent = '';
      }
      if (selectedMaterialEl) {
        selectedMaterialEl.hidden = true;
        selectedMaterialEl.textContent = '';
      }
    });

    // Deterministic test breadcrumb.
    document.documentElement.dataset.carShowroomBoot = '1';

    onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      rawPointer.set(x, y);
    };

    onPointerDown = () => {
      pressTarget = 1;
    };

    onPointerUp = () => {
      pressTarget = 0;
    };

    onWheel = (e: WheelEvent) => {
      if (caps.reducedMotion) return;
      // Trackpad can be huge; keep it gentle.
      const delta = clamp(e.deltaY / 1200, -0.25, 0.25);
      zoomTarget = clamp(zoomTarget + delta, 0, 1);
      if (zoomRange) {
        zoomRange.value = zoomTarget.toFixed(2);
        root.dataset.carShowroomZoom = zoomRange.value;
        bumpRevision();
      }
    };

    // Enhanced mobile gesture handler

    const isMobileDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    if (isMobileDevice()) {
      mobileGestures = new MobileGestureHandler(canvas, {
        onPinchZoom: (_scale, delta) => {
          const sensitivity = 0.8;
          zoomTarget = clamp(zoomTarget - delta * sensitivity, 0, 1);

          if (zoomRange) {
            zoomRange.value = zoomTarget.toFixed(2);
            root.dataset.carShowroomZoom = zoomRange.value;
            bumpRevision();
          }
        },

        onRotate: (deltaX, deltaY, velocity) => {
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;

          const normalizedX = (deltaX / rect.width) * 2;
          const normalizedY = (deltaY / rect.height) * 2;

          rawPointer.x += normalizedX;
          rawPointer.y -= normalizedY;

          // Apply velocity for momentum
          if (!caps.reducedMotion) {
            const momentumX = (velocity.x / rect.width) * 0.5;
            const momentumY = (velocity.y / rect.height) * 0.5;
            pointer.x += momentumX * 0.1;
            pointer.y -= momentumY * 0.1;
          }
        },

        onDoubleTap: () => {
          // Double-tap to frame the model
          const rec = showroomInstance.getFrameRecommendation();
          if (rec) {
            applyCameraFrame(rec, 'Framed model.');
          }
        },

        onLongPress: (x, y) => {
          // Long-press to pick part
          pickPartAt(x, y);
        },
      });
    }

    // Legacy touch handlers for pinch (as fallback)
    onTouchStart = (e: TouchEvent) => {
      if (mobileGestures) return; // Use enhanced gestures instead
      if (e.touches.length !== 2) return;
      pinchActive = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.hypot(dx, dy);
      pinchStartZoom = zoomTarget;
    };

    onTouchMove = (e: TouchEvent) => {
      if (mobileGestures) return; // Use enhanced gestures instead
      if (!pinchActive || e.touches.length !== 2) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);

      const t = clamp((dist - pinchStartDist) / 260, -1, 1);
      zoomTarget = clamp(pinchStartZoom - t, 0, 1);

      if (zoomRange) {
        zoomRange.value = zoomTarget.toFixed(2);
        root.dataset.carShowroomZoom = zoomRange.value;
        bumpRevision();
      }
    };

    onTouchEnd = () => {
      if (mobileGestures) return; // Use enhanced gestures instead
      pinchActive = false;
    };

    if (!caps.reducedMotion) {
      canvas.addEventListener('pointermove', onPointerMove, { passive: true });
      canvas.addEventListener('pointerdown', onPointerDown, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      canvas.addEventListener('wheel', onWheel, { passive: true });
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      canvas.addEventListener('touchmove', onTouchMove, { passive: true });
      canvas.addEventListener('touchend', onTouchEnd, { passive: true });
      canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    // Render loop
    const clock = new THREE.Clock();
    running = true;
    let fpsSmoothed = 0;
    let fpsTimer = 0;

    const loop = () => {
      if (!running) return;
      raf = requestAnimationFrame(loop);

      applyPostFxFromDataset();

      const dtRaw = Math.min(clock.getDelta(), 0.05);

      const fpsInstant = 1 / Math.max(dtRaw, 1e-4);
      fpsSmoothed = fpsSmoothed
        ? lerp(fpsSmoothed, fpsInstant, 0.1)
        : fpsInstant;
      fpsTimer += dtRaw;
      if (fpsTimer > 0.5) {
        root.dataset.carShowroomFps = Math.round(fpsSmoothed).toString();

        // Update quality badge on mobile
        const currentQuality = root.dataset.carShowroomQuality || 'balanced';
        updateQualityBadge(fpsSmoothed, currentQuality);

        fpsTimer = 0;
      }

      const autoQuality =
        root.dataset.carShowroomAutoQuality !== 'false' &&
        root.dataset.carShowroomAutoQuality !== '0';
      if (autoQuality) {
        const now = performance.now();
        const currentQuality = root.dataset.carShowroomQuality || 'balanced';
        const cooldown = now - lastQualityShift;

        // More aggressive thresholds on mobile
        const isMobile = isMobileDevice();
        const lowFpsThreshold = isMobile ? 35 : 40;
        const highFpsThreshold = isMobile ? 50 : 58;
        const lowFpsDuration = isMobile ? 1.5 : 2.5;
        const highFpsDuration = isMobile ? 3.0 : 4.0;
        const cooldownTime = isMobile ? 2000 : 2500;

        if (fpsSmoothed < lowFpsThreshold) {
          lowFpsTime += dtRaw;
          highFpsTime = 0;
        } else if (fpsSmoothed > highFpsThreshold) {
          highFpsTime += dtRaw;
          lowFpsTime = 0;
        } else {
          lowFpsTime = 0;
          highFpsTime = 0;
        }

        if (lowFpsTime > lowFpsDuration && cooldown > cooldownTime) {
          if (currentQuality === 'ultra') setQuality('balanced', true);
          else if (currentQuality === 'balanced')
            setQuality('performance', true);
          lowFpsTime = 0;
        } else if (
          highFpsTime > highFpsDuration &&
          cooldown > cooldownTime + 1000
        ) {
          if (currentQuality === 'performance') setQuality('balanced', true);
          else if (currentQuality === 'balanced' && !isMobile)
            setQuality('ultra', true);
          highFpsTime = 0;
        }

        // Dynamic pixel ratio adjustment on mobile
        if (isMobile) {
          const targetDpr =
            fpsSmoothed > 55 ? 1.5 : fpsSmoothed > 45 ? 1.25 : 1.0;
          const currentDpr = size.dpr;
          const maxAllowed = Math.min(caps.devicePixelRatio, qualityDprCap);
          const adjustedDpr = Math.min(targetDpr, maxAllowed);

          if (Math.abs(currentDpr - adjustedDpr) > 0.15) {
            size.dpr = adjustedDpr;

            rendererInstance.setPixelRatio(size.dpr);
            rendererInstance.setSize(size.width, size.height, false);

            composerInstance.setPixelRatio(size.dpr);
            composerInstance.setSize(size.width, size.height);

            showroomInstance.resize(size.width, size.height);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fxaaInstance.material.uniforms as any)['resolution'].value.set(
              1 / (size.width * size.dpr),
              1 / (size.height * size.dpr)
            );
            bloomInstance.setSize(size.width, size.height);
          }
        }
      }

      // Smooth pointer.
      pointer.x = damp(pointer.x, rawPointer.x, 12, dtRaw);
      pointer.y = damp(pointer.y, rawPointer.y, 12, dtRaw);

      pointerVelocity
        .copy(pointer)
        .sub(prevPointer)
        .divideScalar(Math.max(dtRaw, 1e-4));
      prevPointer.copy(pointer);

      press = damp(press, pressTarget, 10, dtRaw);

      // Smooth zoom
      zoom = damp(zoom, zoomTarget, 8, dtRaw);

      // Advance the showroom.
      showroomInstance.update(
        sceneInstance,
        dtRaw,
        pointer,
        pointerVelocity,
        press,
        zoom
      );

      composerInstance.render();
    };

    loop();

    onResize = () => resize();
    window.addEventListener('resize', onResize, { passive: true });

    // Keep it alive only when visible.
    io = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) clock.getDelta();
      },
      { root: null, threshold: 0.01 }
    );
    io.observe(root);
  }

  return {
    destroy: () => {
      document.documentElement.dataset.carShowroomBoot = '0';
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      statusObserver.disconnect();
      if (onResize) window.removeEventListener('resize', onResize);
      if (!caps.reducedMotion && enable3d) {
        if (onPointerMove)
          canvas.removeEventListener('pointermove', onPointerMove);
        if (onPointerDown)
          canvas.removeEventListener('pointerdown', onPointerDown);
        if (onPointerUp) window.removeEventListener('pointerup', onPointerUp);
        if (onWheel) canvas.removeEventListener('wheel', onWheel);
        if (onTouchStart)
          canvas.removeEventListener('touchstart', onTouchStart);
        if (onTouchMove) canvas.removeEventListener('touchmove', onTouchMove);
        if (onTouchEnd) {
          canvas.removeEventListener('touchend', onTouchEnd);
          canvas.removeEventListener('touchcancel', onTouchEnd);
        }
      }
      if (onCanvasPointerUp)
        canvas.removeEventListener('pointerup', onCanvasPointerUp);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('keydown', onKeyDown);
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      mobileGestures?.destroy();
      tabSwipeHandler?.destroy();
      gyroscopeHandler?.stop();
      showroom?.dispose();
      composer?.dispose();
      renderer?.dispose();
    },
  };
});
