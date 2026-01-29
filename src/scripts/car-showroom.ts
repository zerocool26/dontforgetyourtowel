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
  const autoRotateChk = root.querySelector<HTMLInputElement>(
    '[data-csr-autorotate]'
  );
  const spinSpeedRange = root.querySelector<HTMLInputElement>(
    '[data-csr-spinspeed]'
  );
  const zoomRange = root.querySelector<HTMLInputElement>('[data-csr-zoom]');
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-csr-reset]');
  const resetCameraBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-reset-camera]'
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
  root.dataset.carShowroomMode ||= modeSel?.value || 'paint';
  root.dataset.carShowroomColor ||= colorInp?.value || '#00d1b2';
  root.dataset.carShowroomFinish ||= finishSel?.value || 'gloss';
  root.dataset.carShowroomWheelFinish ||= wheelFinishSel?.value || 'graphite';
  root.dataset.carShowroomTrimFinish ||= trimFinishSel?.value || 'black';
  root.dataset.carShowroomGlassTint ||= glassTintRange?.value || '0.15';
  root.dataset.carShowroomBackground ||= bgSel?.value || 'studio';
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
  if (autoRotateChk && root.dataset.carShowroomAutoRotate)
    autoRotateChk.checked = root.dataset.carShowroomAutoRotate !== 'false';
  if (spinSpeedRange && root.dataset.carShowroomSpinSpeed)
    spinSpeedRange.value = root.dataset.carShowroomSpinSpeed;
  if (zoomRange && root.dataset.carShowroomZoom)
    zoomRange.value = root.dataset.carShowroomZoom;

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
    if (modeSel) root.dataset.carShowroomMode = modeSel.value;
    if (colorInp) root.dataset.carShowroomColor = colorInp.value;
    if (finishSel) root.dataset.carShowroomFinish = finishSel.value;
    if (wheelFinishSel)
      root.dataset.carShowroomWheelFinish = wheelFinishSel.value;
    if (trimFinishSel) root.dataset.carShowroomTrimFinish = trimFinishSel.value;
    if (glassTintRange)
      root.dataset.carShowroomGlassTint = glassTintRange.value;
    if (bgSel) root.dataset.carShowroomBackground = bgSel.value;
    if (autoRotateChk)
      root.dataset.carShowroomAutoRotate = autoRotateChk.checked
        ? 'true'
        : 'false';
    if (spinSpeedRange)
      root.dataset.carShowroomSpinSpeed = spinSpeedRange.value;
    if (zoomRange) root.dataset.carShowroomZoom = zoomRange.value;
    bumpRevision();
  };

  [
    modelSel,
    cameraSel,
    modeSel,
    colorInp,
    finishSel,
    wheelFinishSel,
    trimFinishSel,
    glassTintRange,
    bgSel,
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

    url.search = params.toString();
    const ok = await copyToClipboard(url.toString());
    showToast(ok ? 'Link copied.' : 'Could not copy link.');
  };

  copyLinkBtn?.addEventListener('click', () => {
    void copyShareLink();
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
