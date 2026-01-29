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

const PRESETS_STORAGE_KEY = 'csr-presets-v1';

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
  if (!caps.webgl) return null;

  // --- UI wiring (dataset-driven)
  const bumpRevision = () => {
    const ds = root.dataset;
    const n = Number.parseInt(ds.carShowroomUiRevision ?? '0', 10);
    ds.carShowroomUiRevision = String(Number.isFinite(n) ? n + 1 : 1);
  };

  const panel = root.querySelector<HTMLElement>('[data-csr-panel]');
  const loadingEl = root.querySelector<HTMLElement>('[data-csr-loading]');
  const errorEl = root.querySelector<HTMLElement>('[data-csr-error]');
  const togglePanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-toggle-panel]'
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
  const resetViewBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-reset-view]'
  );
  const colorInp = root.querySelector<HTMLInputElement>('[data-csr-color]');
  const finishSel = root.querySelector<HTMLSelectElement>('[data-csr-finish]');
  const wheelFinishSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-wheel-finish]'
  );
  const trimFinishSel = root.querySelector<HTMLSelectElement>(
    '[data-csr-trim-finish]'
  );
  const glassTintRange = root.querySelector<HTMLInputElement>(
    '[data-csr-glass-tint]'
  );
  const bgSel = root.querySelector<HTMLSelectElement>('[data-csr-background]');
  const envIntensityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-env-intensity]'
  );
  const lightIntensityRange = root.querySelector<HTMLInputElement>(
    '[data-csr-light-intensity]'
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
  const spinSpeedRange = root.querySelector<HTMLInputElement>(
    '[data-csr-spinspeed]'
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

  let currentObjectUrl: string | null = null;

  const showToast = (message: string) => {
    root.dataset.carShowroomLoadError = message;
    syncStatus();
    window.setTimeout(() => {
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
    const tint = params.get('tint');
    const bg = params.get('bg');
    const cam = params.get('cam');
    const spin = params.get('spin');
    const zoom = params.get('zoom');
    const ar = params.get('ar');
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

    const env = params.get('env');
    const li = params.get('li');
    const floor = params.get('floor');
    const fcol = params.get('fcol');
    const fr = params.get('fr');
    const fm = params.get('fm');
    const fo = params.get('fo');

    if (model) root.dataset.carShowroomModel = model;
    if (mode) root.dataset.carShowroomMode = mode;
    if (finish) root.dataset.carShowroomFinish = finish;
    if (wheel) root.dataset.carShowroomWheelFinish = wheel;
    if (trim) root.dataset.carShowroomTrimFinish = trim;
    if (bg) root.dataset.carShowroomBackground = bg;
    if (cam) root.dataset.carShowroomCameraPreset = cam;

    if (color) {
      const hex = normalizeHexColor(color);
      if (hex) root.dataset.carShowroomColor = hex;
    }

    const tintN = parseNum(tint);
    if (tintN !== null)
      root.dataset.carShowroomGlassTint = String(clamp01(tintN));

    const spinN = parseNum(spin);
    if (spinN !== null)
      root.dataset.carShowroomSpinSpeed = String(clamp(spinN, 0, 2));

    const zoomN = parseNum(zoom);
    if (zoomN !== null) root.dataset.carShowroomZoom = String(clamp01(zoomN));

    if (ar === '0' || ar === 'false')
      root.dataset.carShowroomAutoRotate = 'false';
    if (ar === '1' || ar === 'true')
      root.dataset.carShowroomAutoRotate = 'true';

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
      root.dataset.carShowroomFloorOpacity = String(clamp(foN, 0.05, 1));
  };

  // Apply deep-link state before defaults so query params win.
  applyQueryState();

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

  const PRESET_DATASET_KEYS: Array<keyof DOMStringMap> = [
    'carShowroomModel',
    'carShowroomMode',
    'carShowroomColor',
    'carShowroomFinish',
    'carShowroomWheelFinish',
    'carShowroomTrimFinish',
    'carShowroomGlassTint',
    'carShowroomBackground',
    'carShowroomEnvIntensity',
    'carShowroomLightIntensity',
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
    'carShowroomSpinSpeed',
    'carShowroomZoom',
    'carShowroomAutoRotate',
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
    if (finishSel && ds.carShowroomFinish)
      finishSel.value = ds.carShowroomFinish;
    if (wheelFinishSel && ds.carShowroomWheelFinish)
      wheelFinishSel.value = ds.carShowroomWheelFinish;
    if (trimFinishSel && ds.carShowroomTrimFinish)
      trimFinishSel.value = ds.carShowroomTrimFinish;
    if (glassTintRange && ds.carShowroomGlassTint)
      glassTintRange.value = ds.carShowroomGlassTint;
    if (bgSel && ds.carShowroomBackground)
      bgSel.value = ds.carShowroomBackground;
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
    if (spinSpeedRange && ds.carShowroomSpinSpeed)
      spinSpeedRange.value = ds.carShowroomSpinSpeed;
    if (zoomRange && ds.carShowroomZoom) zoomRange.value = ds.carShowroomZoom;
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

  const statusObserver = new MutationObserver(() => syncStatus());
  statusObserver.observe(root, { attributes: true });
  addEventListener('beforeunload', () => statusObserver.disconnect(), {
    once: true,
  });

  const setPanelOpen = (open: boolean) => {
    if (!panel) return;
    panel.hidden = !open;
  };

  togglePanelBtn?.addEventListener('click', () => {
    setPanelOpen(Boolean(panel?.hidden));
  });

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
  root.dataset.carShowroomFinish ||= finishSel?.value || 'gloss';
  root.dataset.carShowroomWheelFinish ||= wheelFinishSel?.value || 'graphite';
  root.dataset.carShowroomTrimFinish ||= trimFinishSel?.value || 'black';
  root.dataset.carShowroomGlassTint ||= glassTintRange?.value || '0.15';
  root.dataset.carShowroomBackground ||= bgSel?.value || 'studio';
  root.dataset.carShowroomEnvIntensity ||= envIntensityRange?.value || '1';
  root.dataset.carShowroomLightIntensity ||= lightIntensityRange?.value || '1';
  root.dataset.carShowroomFloorPreset ||= floorPresetSel?.value || 'auto';
  root.dataset.carShowroomFloorColor ||= floorColorInp?.value || '#05070d';
  root.dataset.carShowroomFloorRoughness ||=
    floorRoughnessRange?.value || '0.55';
  root.dataset.carShowroomFloorMetalness ||=
    floorMetalnessRange?.value || '0.02';
  root.dataset.carShowroomFloorOpacity ||= floorOpacityRange?.value || '1';
  root.dataset.carShowroomExposure ||= exposureRange?.value || '1';
  root.dataset.carShowroomBloomStrength ||= bloomStrengthRange?.value || '0.35';
  root.dataset.carShowroomBloomThreshold ||=
    bloomThresholdRange?.value || '0.88';
  root.dataset.carShowroomBloomRadius ||= bloomRadiusRange?.value || '0.35';
  root.dataset.carShowroomAutoRotate ||=
    autoRotateChk?.checked === false ? 'false' : 'true';
  root.dataset.carShowroomSpinSpeed ||= spinSpeedRange?.value || '0.65';
  root.dataset.carShowroomZoom ||= zoomRange?.value || '0';
  root.dataset.carShowroomReady ||= '0';
  root.dataset.carShowroomLoading ||= '0';
  root.dataset.carShowroomLoadError ||= '';

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
  if (finishSel && root.dataset.carShowroomFinish)
    finishSel.value = root.dataset.carShowroomFinish;
  if (wheelFinishSel && root.dataset.carShowroomWheelFinish)
    wheelFinishSel.value = root.dataset.carShowroomWheelFinish;
  if (trimFinishSel && root.dataset.carShowroomTrimFinish)
    trimFinishSel.value = root.dataset.carShowroomTrimFinish;
  if (glassTintRange && root.dataset.carShowroomGlassTint)
    glassTintRange.value = root.dataset.carShowroomGlassTint;
  if (bgSel && root.dataset.carShowroomBackground)
    bgSel.value = root.dataset.carShowroomBackground;
  if (envIntensityRange && root.dataset.carShowroomEnvIntensity)
    envIntensityRange.value = root.dataset.carShowroomEnvIntensity;
  if (lightIntensityRange && root.dataset.carShowroomLightIntensity)
    lightIntensityRange.value = root.dataset.carShowroomLightIntensity;
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
  if (spinSpeedRange && root.dataset.carShowroomSpinSpeed)
    spinSpeedRange.value = root.dataset.carShowroomSpinSpeed;
  if (zoomRange && root.dataset.carShowroomZoom)
    zoomRange.value = root.dataset.carShowroomZoom;

  renderPresetOptions();

  bumpRevision();
  syncStatus();

  // Keep the URL input in sync with the select.
  modelSel?.addEventListener('change', () => {
    if (!modelUrlInp) return;
    modelUrlInp.value = modelSel.value;
  });

  // Color swatches
  swatches.forEach(btn => {
    btn.addEventListener(
      'click',
      () => {
        const hex = normalizeHexColor(btn.dataset.csrSwatch || '');
        if (!hex) return;
        if (colorInp) colorInp.value = hex;
        root.dataset.carShowroomColor = hex;
        bumpRevision();
      },
      { passive: true }
    );
  });

  const applyModelUrl = () => {
    const raw = (modelUrlInp?.value || '').trim();
    if (!raw) return;
    root.dataset.carShowroomModel = raw;
    bumpRevision();
  };

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

  floorPresetSel?.addEventListener('change', () => {
    const preset = (floorPresetSel.value || 'auto').trim();
    applyFloorPreset(preset);
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
    if (colorInp) root.dataset.carShowroomColor = colorInp.value;
    if (finishSel) root.dataset.carShowroomFinish = finishSel.value;
    if (wheelFinishSel)
      root.dataset.carShowroomWheelFinish = wheelFinishSel.value;
    if (trimFinishSel) root.dataset.carShowroomTrimFinish = trimFinishSel.value;
    if (glassTintRange)
      root.dataset.carShowroomGlassTint = glassTintRange.value;
    if (bgSel) root.dataset.carShowroomBackground = bgSel.value;
    if (envIntensityRange)
      root.dataset.carShowroomEnvIntensity = envIntensityRange.value;
    if (lightIntensityRange)
      root.dataset.carShowroomLightIntensity = lightIntensityRange.value;
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
    if (spinSpeedRange)
      root.dataset.carShowroomSpinSpeed = spinSpeedRange.value;
    if (zoomRange) {
      root.dataset.carShowroomZoom = zoomRange.value;
      // Keep internal smoothing in sync with the slider so zoom doesn't
      // "bounce" back toward the previous wheel/pinch target.
      zoomTarget = clamp(Number.parseFloat(zoomRange.value) || 0, 0, 1);
    }
    bumpRevision();
  };

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
    finishSel,
    wheelFinishSel,
    trimFinishSel,
    glassTintRange,
    bgSel,
    envIntensityRange,
    lightIntensityRange,
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
    spinSpeedRange,
    zoomRange,
  ].forEach(el => {
    if (!el) return;
    el.addEventListener('input', syncFromInputs, { passive: true });
    el.addEventListener('change', syncFromInputs, { passive: true });
  });

  resetBtn?.addEventListener('click', () => {
    if (modelSel) modelSel.value = '/models/porsche-911-gt3rs.glb';
    if (modelUrlInp) modelUrlInp.value = '/models/porsche-911-gt3rs.glb';
    if (cameraSel) cameraSel.value = 'hero';
    if (modeSel) modeSel.value = 'paint';
    if (colorInp) colorInp.value = '#00d1b2';
    if (finishSel) finishSel.value = 'gloss';
    if (wheelFinishSel) wheelFinishSel.value = 'graphite';
    if (trimFinishSel) trimFinishSel.value = 'black';
    if (glassTintRange) glassTintRange.value = '0.15';
    if (bgSel) bgSel.value = 'studio';
    if (envIntensityRange) envIntensityRange.value = '1';
    if (lightIntensityRange) lightIntensityRange.value = '1';
    if (floorPresetSel) floorPresetSel.value = 'auto';
    if (floorColorInp) floorColorInp.value = '#05070d';
    if (floorRoughnessRange) floorRoughnessRange.value = '0.55';
    if (floorMetalnessRange) floorMetalnessRange.value = '0.02';
    if (floorOpacityRange) floorOpacityRange.value = '1';
    if (exposureRange) exposureRange.value = '1';
    if (bloomStrengthRange) bloomStrengthRange.value = '0.35';
    if (bloomThresholdRange) bloomThresholdRange.value = '0.88';
    if (bloomRadiusRange) bloomRadiusRange.value = '0.35';
    if (autoRotateChk) autoRotateChk.checked = true;
    if (spinSpeedRange) spinSpeedRange.value = '0.65';
    if (zoomRange) zoomRange.value = '0';
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

    params.set('mode', ds.carShowroomMode || 'paint');
    params.set('color', ds.carShowroomColor || '#00d1b2');
    params.set('finish', ds.carShowroomFinish || 'gloss');
    params.set('wheel', ds.carShowroomWheelFinish || 'graphite');
    params.set('trim', ds.carShowroomTrimFinish || 'black');
    params.set('tint', ds.carShowroomGlassTint || '0.15');
    params.set('bg', ds.carShowroomBackground || 'studio');
    params.set('cam', ds.carShowroomCameraPreset || 'hero');
    params.set('spin', ds.carShowroomSpinSpeed || '0.65');
    params.set('zoom', ds.carShowroomZoom || '0');
    params.set('ar', ds.carShowroomAutoRotate === 'false' ? '0' : '1');

    params.set('exp', ds.carShowroomExposure || '1');
    params.set('bloom', ds.carShowroomBloomStrength || '0.35');
    params.set('bt', ds.carShowroomBloomThreshold || '0.88');
    params.set('br', ds.carShowroomBloomRadius || '0.35');

    params.set('env', ds.carShowroomEnvIntensity || '1');
    params.set('li', ds.carShowroomLightIntensity || '1');
    params.set('floor', ds.carShowroomFloorPreset || 'auto');
    params.set('fcol', ds.carShowroomFloorColor || '#05070d');
    params.set('fr', ds.carShowroomFloorRoughness || '0.55');
    params.set('fm', ds.carShowroomFloorMetalness || '0.02');
    params.set('fo', ds.carShowroomFloorOpacity || '1');

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
    const ok = await copyToClipboard(url.toString());
    showToast(ok ? 'Link copied.' : 'Could not copy link.');
  };

  copyLinkBtn?.addEventListener('click', () => {
    void copyShareLink();
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
      setPanelOpen(Boolean(panel?.hidden));
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
      setPanelOpen(false);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // --- Three.js runtime
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !caps.coarsePointer,
    powerPreference: 'high-performance',
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();

  const showroom = new CarShowroomScene(root, renderer);
  showroom.setEnvironment(scene);
  scene.add(showroom.group);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, showroom.camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.35, 0.88);
  bloom.enabled = true;
  composer.addPass(bloom);

  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);

  const output = new OutputPass();
  composer.addPass(output);

  let lastUiRevision = '';
  const applyPostFxFromDataset = () => {
    const ds = root.dataset;
    const rev = ds.carShowroomUiRevision || '';
    if (rev === lastUiRevision) return;
    lastUiRevision = rev;

    const exp = clamp(
      Number.parseFloat(ds.carShowroomExposure || '1') || 1,
      0.1,
      3
    );
    renderer.toneMappingExposure = exp;

    bloom.strength = clamp(
      Number.parseFloat(ds.carShowroomBloomStrength || '0.35') || 0,
      0,
      3
    );
    bloom.threshold = clamp01(
      Number.parseFloat(ds.carShowroomBloomThreshold || '0.88') || 0
    );
    bloom.radius = clamp01(
      Number.parseFloat(ds.carShowroomBloomRadius || '0.35') || 0
    );
  };

  applyPostFxFromDataset();

  frameBtn?.addEventListener('click', () => {
    const rec = showroom.getFrameRecommendation();
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
    setZoom(0.65);

    bumpRevision();
    showToast('Framed model.');
  });

  downloadScreenshot = () => {
    try {
      composer.render();
      canvas.toBlob(blob => {
        if (!blob) {
          showToast('Screenshot failed (no image data).');
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'car-showroom.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Screenshot downloaded.');
      }, 'image/png');
    } catch {
      showToast('Screenshot failed.');
    }
  };

  const size = { width: 1, height: 1, dpr: 1 };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    size.width = Math.max(1, Math.floor(rect.width));
    size.height = Math.max(1, Math.floor(rect.height));
    size.dpr = Math.min(caps.devicePixelRatio, caps.maxDpr);

    renderer.setPixelRatio(size.dpr);
    renderer.setSize(size.width, size.height, false);
    composer.setPixelRatio(size.dpr);
    composer.setSize(size.width, size.height);

    showroom.resize(size.width, size.height);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fxaa.material.uniforms as any)['resolution'].value.set(
      1 / (size.width * size.dpr),
      1 / (size.height * size.dpr)
    );

    bloom.setSize(size.width, size.height);
  };

  resize();

  // Deterministic test breadcrumb.
  document.documentElement.dataset.carShowroomBoot = '1';

  // Input shaping
  const rawPointer = new THREE.Vector2(0, 0);
  const pointer = new THREE.Vector2(0, 0);
  const prevPointer = new THREE.Vector2(0, 0);
  const pointerVelocity = new THREE.Vector2(0, 0);

  let press = 0;
  let pressTarget = 0;

  let zoomTarget = clamp(
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

  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    rawPointer.set(x, y);
  };

  const onPointerDown = () => {
    pressTarget = 1;
  };

  const onPointerUp = () => {
    pressTarget = 0;
  };

  const onWheel = (e: WheelEvent) => {
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

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 2) return;
    pinchActive = true;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchStartDist = Math.hypot(dx, dy);
    pinchStartZoom = zoomTarget;
  };

  const onTouchMove = (e: TouchEvent) => {
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

  const onTouchEnd = () => {
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
  let raf = 0;
  let running = true;

  const loop = () => {
    if (!running) return;
    raf = requestAnimationFrame(loop);

    applyPostFxFromDataset();

    const dtRaw = Math.min(clock.getDelta(), 0.05);

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
    showroom.update(scene, dtRaw, pointer, pointerVelocity, press, zoom);

    composer.render();
  };

  loop();

  const onResize = () => resize();
  window.addEventListener('resize', onResize, { passive: true });

  // Keep it alive only when visible.
  const io = new IntersectionObserver(
    entries => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting) clock.getDelta();
    },
    { root: null, threshold: 0.01 }
  );
  io.observe(root);

  return {
    destroy: () => {
      document.documentElement.dataset.carShowroomBoot = '0';
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      statusObserver.disconnect();
      window.removeEventListener('resize', onResize);
      if (!caps.reducedMotion) {
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        canvas.removeEventListener('touchcancel', onTouchEnd);
      }
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('keydown', onKeyDown);
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      showroom.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
});
