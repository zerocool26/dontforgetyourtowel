import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { withBasePath } from '../../utils/helpers';

type ShowroomMode = 'paint' | 'wrap' | 'glass' | 'wireframe';
type ShowroomFinish = 'gloss' | 'satin' | 'matte';
type ShowroomBackground = 'studio' | 'day' | 'sunset' | 'night' | 'grid';
type WheelFinish = 'graphite' | 'chrome' | 'black';
type TrimFinish = 'black' | 'chrome' | 'brushed';
type CameraPreset = 'hero' | 'front' | 'rear' | 'side' | 'top' | 'detail';
type FloorPreset = 'auto' | 'asphalt' | 'matte' | 'polished' | 'glass';
type WrapPattern = 'solid' | 'stripes' | 'carbon' | 'camo';
type QualityPreset = 'performance' | 'balanced' | 'ultra';

type UiState = {
  modelUrl: string;
  mode: ShowroomMode;
  color: THREE.Color;
  wrapColor: THREE.Color;
  wheelColor: THREE.Color;
  trimColor: THREE.Color;
  caliperColor: THREE.Color;
  lightColor: THREE.Color;
  lightGlow: number;
  wrapPattern: WrapPattern;
  wrapScale: number;
  finish: ShowroomFinish;
  wheelFinish: WheelFinish;
  trimFinish: TrimFinish;
  glassTint: number;
  background: ShowroomBackground;
  envIntensity: number;
  lightIntensity: number;
  floorPreset: FloorPreset;
  floorColor: THREE.Color;
  floorRoughness: number;
  floorMetalness: number;
  floorOpacity: number;
  cameraPreset: CameraPreset;
  cameraMode: 'preset' | 'manual';
  camYawDeg: number;
  camPitchDeg: number;
  camDistance: number;
  fov: number;
  lookAt: THREE.Vector3 | null;
  autoRotate: boolean;
  spinSpeed: number;
  zoom: number;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

const parseColor = (value: string | null, fallback: THREE.Color) => {
  if (!value) return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  try {
    return new THREE.Color(raw);
  } catch {
    return fallback;
  }
};

const parseNumber01 = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const v = Number.parseFloat(value);
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, 0, 1);
};

const parseNumber = (value: string | null | undefined, fallback: number) => {
  if (!value) return fallback;
  const v = Number.parseFloat(value);
  return Number.isFinite(v) ? v : fallback;
};

const degToRad = (d: number) => (d * Math.PI) / 180;
const radToDeg = (r: number) => (r * 180) / Math.PI;

const resolveModelUrl = (raw: string): string => {
  const v = raw.trim();
  if (!v) return withBasePath('/models/porsche-911-gt3rs.glb');
  if (
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('data:') ||
    v.startsWith('blob:')
  )
    return v;

  const normalized = v.startsWith('/') ? v : `/${v}`;
  return withBasePath(normalized);
};

const createContactShadowTexture = (size = 256): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;

    const blob = ctx.createRadialGradient(
      cx,
      cy,
      size * 0.12,
      cx,
      cy,
      size * 0.52
    );
    blob.addColorStop(0, 'rgba(0,0,0,0.55)');
    blob.addColorStop(0.38, 'rgba(0,0,0,0.24)');
    blob.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, size, size);

    const core = ctx.createRadialGradient(
      cx,
      cy + size * 0.03,
      0,
      cx,
      cy,
      size * 0.18
    );
    core.addColorStop(0, 'rgba(0,0,0,0.24)');
    core.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

const createWrapPatternTexture = (
  pattern: WrapPattern
): THREE.CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgb(255,255,255)';
  ctx.fillRect(0, 0, size, size);

  const rand = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  if (pattern === 'stripes') {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-size / 2, -size / 2);
    const stripeW = 42;
    for (let x = -size; x < size * 2; x += stripeW) {
      const t = (x / stripeW) % 2;
      ctx.fillStyle = t < 1 ? 'rgb(245,245,245)' : 'rgb(210,210,210)';
      ctx.fillRect(x, 0, stripeW, size);
    }
    ctx.restore();
  } else if (pattern === 'carbon') {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 8);
    ctx.translate(-size / 2, -size / 2);
    const cell = 18;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const v = (x / cell + y / cell) % 2;
        const c = v < 1 ? 235 : 205;
        ctx.fillStyle = `rgb(${c},${c},${c})`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    // Subtle weave highlight
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = 'white';
    for (let y = 0; y < size; y += 36) {
      ctx.fillRect(0, y, size, 2);
    }
    ctx.restore();
  } else if (pattern === 'camo') {
    const blobs = 120;
    for (let i = 0; i < blobs; i++) {
      const r = 18 + rand(i * 11.7) * 90;
      const x = rand(i * 3.1) * size;
      const y = rand(i * 5.3) * size;
      const c = 200 + rand(i * 9.9) * 45;
      ctx.fillStyle = `rgb(${c},${c},${c})`;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        r,
        r * (0.55 + rand(i * 2.2) * 0.9),
        rand(i) * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

export class CarShowroomScene {
  public readonly group = new THREE.Group();
  public readonly camera: THREE.PerspectiveCamera;

  private readonly root: HTMLElement;
  private readonly stage = new THREE.Group();
  private readonly modelGroup = new THREE.Group();

  private readonly ground: THREE.Mesh;
  private readonly groundMat: THREE.MeshStandardMaterial;
  private readonly contactShadow: THREE.Mesh;

  private readonly gridHelper: THREE.GridHelper;

  private readonly keyLight: THREE.DirectionalLight;
  private readonly fillLight: THREE.DirectionalLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly topLight: THREE.DirectionalLight;

  private baseKeyIntensity = 3.0;
  private baseFillIntensity = 1.25;
  private baseRimIntensity = 1.1;
  private baseTopIntensity = 0.9;

  private envTex: THREE.Texture | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;

  private loader: GLTFLoader;
  private loaded: THREE.Object3D | null = null;
  private loadingUrl: string | null = null;
  private lastUiRevision = '';

  private bodyMat: THREE.MeshPhysicalMaterial;
  private wrapMat: THREE.MeshPhysicalMaterial;
  private glassMat: THREE.MeshPhysicalMaterial;
  private trimMat: THREE.MeshPhysicalMaterial;
  private wheelMat: THREE.MeshPhysicalMaterial;
  private caliperMat: THREE.MeshPhysicalMaterial;
  private tireMat: THREE.MeshStandardMaterial;
  private lightMat: THREE.MeshStandardMaterial;
  private wireframeMat: THREE.MeshStandardMaterial;

  private wrapTex: THREE.CanvasTexture | null = null;
  private wrapTexKey = '';

  private selectedMesh: THREE.Mesh | null = null;
  private selectionBox = new THREE.Box3();
  private selectionHelper: THREE.Box3Helper;

  private orbitYaw = 0;
  private orbitPitch = 0.12;
  private orbitYawTarget = 0;
  private orbitPitchTarget = 0.12;
  private orbitRadius = 9.8;
  private orbitRadiusTarget = 9.8;
  private lookAt = new THREE.Vector3(0, 0.85, 0);
  private lookAtTarget = new THREE.Vector3(0, 0.85, 0);

  private fovTarget = 55;

  private lastCameraPreset: string | null = null;

  private time = 0;

  constructor(root: HTMLElement, renderer: THREE.WebGLRenderer) {
    this.root = root;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
    this.camera.position.set(0, 2.0, 9.8);

    this.group.add(this.stage);
    this.stage.add(this.modelGroup);

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x05070d,
      roughness: 0.55,
      metalness: 0.02,
    });
    this.ground = new THREE.Mesh(groundGeo, this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.stage.add(this.ground);

    const shadowTex = createContactShadowTexture(256);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      shadowMat
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.002;
    this.contactShadow.scale.set(6.0, 3.0, 1);
    this.contactShadow.renderOrder = 1;
    this.stage.add(this.contactShadow);

    this.gridHelper = new THREE.GridHelper(40, 40, 0x22304a, 0x182235);
    this.gridHelper.visible = false;
    this.stage.add(this.gridHelper);

    this.selectionHelper = new THREE.Box3Helper(
      this.selectionBox,
      new THREE.Color('#22d3ee')
    );
    this.selectionHelper.visible = false;
    // Always readable on dark scenes.
    const selMat = this.selectionHelper.material as THREE.LineBasicMaterial;
    selMat.transparent = true;
    selMat.opacity = 0.9;
    selMat.depthTest = false;
    this.stage.add(this.selectionHelper);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    this.keyLight.position.set(7, 10, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.00015;
    this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 60;
    this.keyLight.shadow.camera.left = -16;
    this.keyLight.shadow.camera.right = 16;
    this.keyLight.shadow.camera.top = 16;
    this.keyLight.shadow.camera.bottom = -16;
    this.stage.add(this.keyLight);
    this.stage.add(this.keyLight.target);

    this.fillLight = new THREE.DirectionalLight(0x8db8ff, 1.25);
    this.fillLight.position.set(-8, 7, 2);
    this.stage.add(this.fillLight);
    this.stage.add(this.fillLight.target);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.rimLight.position.set(-6, 6, -8);
    this.stage.add(this.rimLight);

    this.topLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.topLight.position.set(0, 14, 0);
    this.stage.add(this.topLight);

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d1b2,
      roughness: 0.22,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    this.wrapMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d1b2,
      roughness: 0.3,
      metalness: 0.06,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0,
      transmission: 1,
      thickness: 0.15,
      ior: 1.45,
      transparent: true,
      opacity: 1,
    });

    this.trimMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b0f1a,
      roughness: 0.25,
      metalness: 1.0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
    });

    this.wheelMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 1.0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
    });

    this.caliperMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      roughness: 0.28,
      metalness: 0.25,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
    });

    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f1a,
      roughness: 1.0,
      metalness: 0.0,
    });

    this.lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.0,
      emissive: new THREE.Color('#dbeafe'),
      emissiveIntensity: 1.25,
    });

    this.wireframeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 1,
      metalness: 0,
      wireframe: true,
    });

    const draco = new DRACOLoader();
    draco.setDecoderPath(withBasePath('/draco/gltf/'));
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(draco);
    this.loader.setMeshoptDecoder(MeshoptDecoder);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    this.envTex = this.pmrem.fromScene(env, 0.04).texture;
  }

  setQuality(preset: QualityPreset) {
    if (preset === 'performance') {
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.normalBias = 0.03;
      this.keyLight.shadow.bias = -0.00025;
      return;
    }

    if (preset === 'ultra') {
      this.keyLight.shadow.mapSize.set(4096, 4096);
      this.keyLight.shadow.normalBias = 0.015;
      this.keyLight.shadow.bias = -0.0001;
      return;
    }

    // balanced
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.shadow.bias = -0.00015;
  }

  clearSelection() {
    this.selectedMesh = null;
    this.selectionHelper.visible = false;
  }

  setSelectedMesh(mesh: THREE.Mesh | null) {
    this.selectedMesh = mesh;
    if (!mesh) {
      this.selectionHelper.visible = false;
      return;
    }
    this.selectionBox.setFromObject(mesh);
    this.selectionHelper.visible = true;
  }

  pickMesh(
    ndc: THREE.Vector2,
    raycaster: THREE.Raycaster
  ): {
    mesh: THREE.Mesh;
    part: ReturnType<CarShowroomScene['classifyMesh']>;
  } | null {
    if (!this.loaded) return null;
    raycaster.setFromCamera(ndc, this.camera);
    const hits = raycaster.intersectObject(this.loaded, true);
    const hit = hits.find(h => (h.object as THREE.Mesh)?.isMesh);
    if (!hit) return null;
    const mesh = hit.object as THREE.Mesh;
    return { mesh, part: this.classifyMesh(mesh) };
  }

  dispose() {
    this.disposeLoaded();
    this.bodyMat.dispose();
    this.wrapMat.dispose();
    this.glassMat.dispose();
    this.trimMat.dispose();
    this.wheelMat.dispose();
    this.caliperMat.dispose();
    this.tireMat.dispose();
    this.lightMat.dispose();
    this.wireframeMat.dispose();
    (this.contactShadow.material as THREE.Material).dispose();
    (this.contactShadow.geometry as THREE.BufferGeometry).dispose();
    (this.groundMat as THREE.Material).dispose();
    (this.ground.geometry as THREE.BufferGeometry).dispose();
    this.envTex?.dispose();
    this.pmrem?.dispose();
  }

  resize(width: number, height: number) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setEnvironment(scene: THREE.Scene) {
    if (this.envTex) {
      scene.environment = this.envTex;
    }
  }

  private disposeLoaded() {
    if (!this.loaded) return;

    const isSharedMaterial = (mat: THREE.Material | null | undefined) => {
      if (!mat) return false;
      return (
        mat === this.bodyMat ||
        mat === this.wrapMat ||
        mat === this.glassMat ||
        mat === this.trimMat ||
        mat === this.wheelMat ||
        mat === this.caliperMat ||
        mat === this.tireMat ||
        mat === this.lightMat ||
        mat === this.wireframeMat
      );
    };

    this.loaded.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.geometry?.dispose?.();
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach(m => {
          if (!isSharedMaterial(m)) m.dispose();
        });
      } else {
        if (!isSharedMaterial(mat)) mat?.dispose?.();
      }
    });

    this.modelGroup.remove(this.loaded);
    this.loaded = null;
  }

  private getUiState(): UiState {
    const ds = this.root.dataset;
    const modelUrl = (
      ds.carShowroomModel || '/models/porsche-911-gt3rs.glb'
    ).trim();
    const mode = (ds.carShowroomMode || 'paint') as ShowroomMode;
    const finish = (ds.carShowroomFinish || 'gloss') as ShowroomFinish;
    const wheelFinish = (ds.carShowroomWheelFinish ||
      'graphite') as WheelFinish;
    const trimFinish = (ds.carShowroomTrimFinish || 'black') as TrimFinish;
    const glassTint = parseNumber01(ds.carShowroomGlassTint || '0.15', 0.15);
    const background = (ds.carShowroomBackground ||
      'studio') as ShowroomBackground;

    const envIntensity = clamp(
      parseNumber(ds.carShowroomEnvIntensity, 1),
      0,
      3
    );
    const lightIntensity = clamp(
      parseNumber(ds.carShowroomLightIntensity, 1),
      0.2,
      2.5
    );

    const floorPreset = (ds.carShowroomFloorPreset || 'auto') as FloorPreset;
    const floorColor = parseColor(
      ds.carShowroomFloorColor || '#05070d',
      new THREE.Color('#05070d')
    );
    const floorRoughness = parseNumber01(
      ds.carShowroomFloorRoughness || '0.55',
      0.55
    );
    const floorMetalness = parseNumber01(
      ds.carShowroomFloorMetalness || '0.02',
      0.02
    );
    const floorOpacity = clamp(
      parseNumber(ds.carShowroomFloorOpacity, 1),
      0.05,
      1
    );

    const cameraPreset = (ds.carShowroomCameraPreset || 'hero') as CameraPreset;

    const cameraMode = (ds.carShowroomCameraMode || 'preset') as
      | 'preset'
      | 'manual';

    const camYawDeg = clamp(parseNumber(ds.carShowroomCamYaw, 17), -180, 180);
    const camPitchDeg = clamp(parseNumber(ds.carShowroomCamPitch, 7), -5, 60);
    const camDistance = clamp(
      parseNumber(ds.carShowroomCamDistance, 9.8),
      2.5,
      14
    );
    const fov = clamp(parseNumber(ds.carShowroomFov, 55), 35, 85);

    const lx = ds.carShowroomLookAtX;
    const ly = ds.carShowroomLookAtY;
    const lz = ds.carShowroomLookAtZ;
    const hasLookAt =
      lx != null && ly != null && lz != null && `${lx}${ly}${lz}`.trim() !== '';
    const lookAt = hasLookAt
      ? new THREE.Vector3(
          parseNumber(lx, 0),
          parseNumber(ly, 0.85),
          parseNumber(lz, 0)
        )
      : null;

    const spinSpeed = clamp(
      Number.parseFloat(ds.carShowroomSpinSpeed || '0.65') || 0.65,
      0,
      2
    );
    const zoom = clamp(Number.parseFloat(ds.carShowroomZoom || '0') || 0, 0, 1);
    const autoRotate = ds.carShowroomAutoRotate !== 'false';

    const color = parseColor(
      ds.carShowroomColor || '#00d1b2',
      new THREE.Color(0x00d1b2)
    );

    const wrapColor = parseColor(
      ds.carShowroomWrapColor || ds.carShowroomColor || '#00d1b2',
      new THREE.Color(0x00d1b2)
    );

    const wheelColor = parseColor(
      ds.carShowroomWheelColor || '#1f2937',
      new THREE.Color('#1f2937')
    );

    const trimColor = parseColor(
      ds.carShowroomTrimColor || '#0b0f1a',
      new THREE.Color('#0b0f1a')
    );

    const caliperColor = parseColor(
      ds.carShowroomCaliperColor || '#ef4444',
      new THREE.Color('#ef4444')
    );

    const lightColor = parseColor(
      ds.carShowroomLightColor || '#dbeafe',
      new THREE.Color('#dbeafe')
    );

    const lightGlow = clamp(parseNumber(ds.carShowroomLightGlow, 1.25), 0, 4);

    const rawWrapPattern = (
      ds.carShowroomWrapPattern || 'stripes'
    ).toLowerCase();
    const wrapPattern: WrapPattern =
      rawWrapPattern === 'solid' ||
      rawWrapPattern === 'stripes' ||
      rawWrapPattern === 'carbon' ||
      rawWrapPattern === 'camo'
        ? (rawWrapPattern as WrapPattern)
        : 'stripes';
    const wrapScale = clamp(parseNumber(ds.carShowroomWrapScale, 1.6), 0.2, 6);

    return {
      modelUrl,
      mode,
      color,
      wrapColor,
      wheelColor,
      trimColor,
      caliperColor,
      lightColor,
      lightGlow,
      wrapPattern,
      wrapScale,
      finish,
      wheelFinish,
      trimFinish,
      glassTint,
      background,
      envIntensity,
      lightIntensity,
      floorPreset,
      floorColor,
      floorRoughness,
      floorMetalness,
      floorOpacity,
      cameraPreset,
      cameraMode,
      camYawDeg,
      camPitchDeg,
      camDistance,
      fov,
      lookAt,
      autoRotate,
      spinSpeed,
      zoom,
    };
  }

  private ensureWrapTexture(pattern: WrapPattern) {
    const key = pattern;
    if (this.wrapTex && this.wrapTexKey === key) return;
    this.wrapTex?.dispose();
    this.wrapTex = createWrapPatternTexture(pattern);
    this.wrapTexKey = key;
  }

  private applyLightMultiplier(mult: number) {
    const m = clamp(mult, 0.2, 2.5);
    this.keyLight.intensity = this.baseKeyIntensity * m;
    this.fillLight.intensity = this.baseFillIntensity * m;
    this.rimLight.intensity = this.baseRimIntensity * m;
    this.topLight.intensity = this.baseTopIntensity * m;
  }

  private applyEnvironmentIntensity(loaded: THREE.Object3D | null, v: number) {
    const intensity = clamp(v, 0, 3);
    const applyToMat = (mat: THREE.Material | null | undefined) => {
      if (!mat) return;
      const anyMat = mat as unknown as {
        envMapIntensity?: number;
        needsUpdate?: boolean;
      };
      if (typeof anyMat.envMapIntensity === 'number') {
        anyMat.envMapIntensity = intensity;
        anyMat.needsUpdate = true;
      }
    };

    applyToMat(this.bodyMat);
    applyToMat(this.wrapMat);
    applyToMat(this.glassMat);
    applyToMat(this.trimMat);
    applyToMat(this.wheelMat);

    if (!loaded) return;
    loaded.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material;
      if (Array.isArray(m)) m.forEach(applyToMat);
      else applyToMat(m);
    });
  }

  private applyFloor(ui: UiState) {
    // Preset is mostly a UX hint (runtime sets the underlying values).
    // But in case a deep-link sets a preset only, provide best-effort defaults.
    if (ui.floorPreset !== 'auto') {
      if (ui.floorPreset === 'asphalt') {
        this.groundMat.color.set('#0b0f1a');
        this.groundMat.roughness = 0.95;
        this.groundMat.metalness = 0.02;
      } else if (ui.floorPreset === 'matte') {
        this.groundMat.color.set('#05070d');
        this.groundMat.roughness = 0.78;
        this.groundMat.metalness = 0.02;
      } else if (ui.floorPreset === 'polished') {
        this.groundMat.color.set('#0b1220');
        this.groundMat.roughness = 0.16;
        this.groundMat.metalness = 0.35;
      } else if (ui.floorPreset === 'glass') {
        this.groundMat.color.set('#0b1220');
        this.groundMat.roughness = 0.05;
        this.groundMat.metalness = 0.0;
      }
    }

    this.groundMat.color.copy(ui.floorColor);
    this.groundMat.roughness = clamp(ui.floorRoughness, 0, 1);
    this.groundMat.metalness = clamp(ui.floorMetalness, 0, 1);

    const op = clamp(ui.floorOpacity, 0.05, 1);
    this.groundMat.opacity = op;
    this.groundMat.transparent = op < 0.999;
    this.groundMat.depthWrite = op >= 0.999;
    this.groundMat.needsUpdate = true;
  }

  getFrameRecommendation(): {
    yawDeg: number;
    pitchDeg: number;
    distance: number;
    fov: number;
    lookAt: THREE.Vector3;
  } | null {
    if (!this.loaded) return null;

    const box = new THREE.Box3().setFromObject(this.loaded);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(1e-3, size.x, size.y, size.z);
    // Heuristic: give some margin so the car fits comfortably.
    const distance = clamp(maxDim * 2.35, 3.25, 14);

    const yawDeg = radToDeg(this.orbitYawTarget || this.orbitYaw || 0.3);
    const pitchDeg = clamp(
      radToDeg(this.orbitPitchTarget || this.orbitPitch),
      0,
      45
    );
    const fov = clamp(this.fovTarget || this.camera.fov || 55, 35, 85);

    // Aim a bit above center so the car sits nicely in frame.
    const lookAt = new THREE.Vector3(
      center.x,
      center.y + size.y * 0.08,
      center.z
    );
    return { yawDeg, pitchDeg, distance, fov, lookAt };
  }

  private applyWheelPreset(finish: WheelFinish) {
    if (finish === 'chrome') {
      this.wheelMat.color.set('#e5e7eb');
      this.wheelMat.roughness = 0.12;
      this.wheelMat.metalness = 1.0;
      this.wheelMat.clearcoat = 0.5;
      this.wheelMat.clearcoatRoughness = 0.12;
      return;
    }
    if (finish === 'black') {
      this.wheelMat.color.set('#0b0f1a');
      this.wheelMat.roughness = 0.55;
      this.wheelMat.metalness = 0.85;
      this.wheelMat.clearcoat = 0.15;
      this.wheelMat.clearcoatRoughness = 0.6;
      return;
    }
    // graphite
    this.wheelMat.color.set('#1f2937');
    this.wheelMat.roughness = 0.35;
    this.wheelMat.metalness = 1.0;
    this.wheelMat.clearcoat = 0.2;
    this.wheelMat.clearcoatRoughness = 0.4;
  }

  private applyTrimPreset(finish: TrimFinish) {
    if (finish === 'chrome') {
      this.trimMat.color.set('#e5e7eb');
      this.trimMat.roughness = 0.16;
      this.trimMat.metalness = 1.0;
      this.trimMat.clearcoat = 0.45;
      this.trimMat.clearcoatRoughness = 0.16;
      return;
    }
    if (finish === 'brushed') {
      this.trimMat.color.set('#9ca3af');
      this.trimMat.roughness = 0.32;
      this.trimMat.metalness = 1.0;
      this.trimMat.clearcoat = 0.25;
      this.trimMat.clearcoatRoughness = 0.38;
      return;
    }
    // black
    this.trimMat.color.set('#0b0f1a');
    this.trimMat.roughness = 0.42;
    this.trimMat.metalness = 0.75;
    this.trimMat.clearcoat = 0.18;
    this.trimMat.clearcoatRoughness = 0.55;
  }

  private applyGlassTint(t: number) {
    const tint = clamp(t, 0, 1);
    const clear = new THREE.Color('#ffffff');
    const smoke = new THREE.Color('#0b1220');
    const c = clear.clone().lerp(smoke, tint);
    this.glassMat.color.copy(c);
    this.glassMat.roughness = lerp(0.05, 0.22, tint);
    this.glassMat.transmission = lerp(1.0, 0.65, tint);
  }

  private applyCameraPreset(ui: UiState, immediate: boolean) {
    const preset = ui.cameraPreset;
    const map: Record<
      CameraPreset,
      {
        yaw: number;
        pitch: number;
        radius: number;
        lookAt: THREE.Vector3;
      }
    > = {
      hero: {
        yaw: 0.3,
        pitch: 0.12,
        radius: 9.8,
        lookAt: new THREE.Vector3(0, 0.85, 0),
      },
      front: {
        yaw: 0.65,
        pitch: 0.1,
        radius: 8.8,
        lookAt: new THREE.Vector3(0, 0.85, 0),
      },
      rear: {
        yaw: -2.35,
        pitch: 0.11,
        radius: 8.8,
        lookAt: new THREE.Vector3(0, 0.85, 0),
      },
      side: {
        yaw: 1.57,
        pitch: 0.08,
        radius: 9.4,
        lookAt: new THREE.Vector3(0, 0.85, 0),
      },
      top: {
        yaw: 0.2,
        pitch: 0.42,
        radius: 11.0,
        lookAt: new THREE.Vector3(0, 0.9, 0),
      },
      detail: {
        yaw: 0.85,
        pitch: 0.12,
        radius: 6.8,
        lookAt: new THREE.Vector3(0, 1.05, 0),
      },
    };

    const p = map[preset] ?? map.hero;
    this.orbitYawTarget = p.yaw;
    this.orbitPitchTarget = p.pitch;
    this.orbitRadiusTarget = p.radius;

    this.lookAtTarget.copy(p.lookAt);

    if (immediate) {
      this.orbitYaw = this.orbitYawTarget;
      this.orbitPitch = this.orbitPitchTarget;
      this.orbitRadius = this.orbitRadiusTarget;
      this.lookAt.copy(this.lookAtTarget);
    }
  }

  private classifyMesh(
    mesh: THREE.Mesh
  ):
    | 'glass'
    | 'tire'
    | 'wheel'
    | 'trim'
    | 'caliper'
    | 'light'
    | 'body'
    | 'other' {
    const name = `${mesh.name || ''}`.toLowerCase();
    const matName = Array.isArray(mesh.material)
      ? (mesh.material[0]?.name || '').toLowerCase()
      : (mesh.material?.name || '').toLowerCase();

    const text = `${name} ${matName}`;

    const isGlass =
      text.includes('glass') ||
      text.includes('window') ||
      text.includes('windscreen') ||
      text.includes('windshield');
    if (isGlass) return 'glass';

    const isLight =
      text.includes('headlight') ||
      text.includes('taillight') ||
      (text.includes('light') && !text.includes('highlight')) ||
      text.includes('lamp');
    if (isLight) return 'light';

    const isCaliper = text.includes('caliper') || text.includes('brakecaliper');
    if (isCaliper) return 'caliper';

    const isTire =
      text.includes('tire') || text.includes('tyre') || text.includes('rubber');
    if (isTire) return 'tire';

    const isWheel =
      text.includes('wheel') ||
      text.includes('rim') ||
      text.includes('alloy') ||
      text.includes('spoke');
    if (isWheel) return 'wheel';

    const isTrim =
      text.includes('trim') ||
      text.includes('chrome') ||
      text.includes('badge') ||
      text.includes('logo') ||
      text.includes('grill') ||
      text.includes('grille') ||
      text.includes('exhaust') ||
      text.includes('mirror') ||
      text.includes('metal');
    if (isTrim) return 'trim';

    const isBody =
      text.includes('body') ||
      text.includes('paint') ||
      text.includes('panel') ||
      text.includes('hood') ||
      text.includes('bonnet') ||
      text.includes('door') ||
      text.includes('bumper');
    if (isBody) return 'body';

    return 'other';
  }

  private applyFinishPreset(
    mat: THREE.MeshPhysicalMaterial,
    finish: ShowroomFinish
  ) {
    if (finish === 'matte') {
      mat.roughness = 0.62;
      mat.metalness = 0.06;
      mat.clearcoat = 0.35;
      mat.clearcoatRoughness = 0.65;
    } else if (finish === 'satin') {
      mat.roughness = 0.38;
      mat.metalness = 0.09;
      mat.clearcoat = 0.7;
      mat.clearcoatRoughness = 0.22;
    } else {
      mat.roughness = 0.22;
      mat.metalness = 0.12;
      mat.clearcoat = 1.0;
      mat.clearcoatRoughness = 0.08;
    }
  }

  private setBackground(scene: THREE.Scene, bg: ShowroomBackground) {
    this.gridHelper.visible = bg === 'grid';

    switch (bg) {
      case 'day':
        scene.background = new THREE.Color('#071223');
        this.groundMat.color.set('#040812');
        this.baseKeyIntensity = 3.15;
        this.fillLight.color.set('#bfe6ff');
        this.baseFillIntensity = 1.45;
        this.baseRimIntensity = 1.05;
        break;
      case 'sunset':
        scene.background = new THREE.Color('#08040a');
        this.groundMat.color.set('#05070d');
        this.baseKeyIntensity = 3.0;
        this.fillLight.color.set('#ffb088');
        this.baseFillIntensity = 1.25;
        this.baseRimIntensity = 1.25;
        break;
      case 'night':
        scene.background = new THREE.Color('#02030a');
        this.groundMat.color.set('#040612');
        this.baseKeyIntensity = 2.6;
        this.fillLight.color.set('#8db8ff');
        this.baseFillIntensity = 1.15;
        this.baseRimIntensity = 1.35;
        break;
      case 'grid':
        scene.background = new THREE.Color('#030616');
        this.groundMat.color.set('#030616');
        this.baseKeyIntensity = 2.9;
        this.fillLight.color.set('#8db8ff');
        this.baseFillIntensity = 1.15;
        this.baseRimIntensity = 1.2;
        break;
      case 'studio':
      default:
        scene.background = new THREE.Color('#02030a');
        this.groundMat.color.set('#05070d');
        this.baseKeyIntensity = 3.0;
        this.fillLight.color.set('#8db8ff');
        this.baseFillIntensity = 1.25;
        this.baseRimIntensity = 1.1;
        break;
    }

    // Top light stays stable across scenes.
    this.baseTopIntensity = 0.9;
  }

  private applyMaterials(loaded: THREE.Object3D, ui: UiState) {
    this.bodyMat.color.copy(ui.color);
    this.wrapMat.color.copy(ui.wrapColor);

    this.applyFinishPreset(this.bodyMat, ui.finish);
    this.applyFinishPreset(this.wrapMat, ui.finish);

    // Wrap material gets a subtle procedural pattern so it looks distinct from paint.
    if (ui.mode === 'wrap' && ui.wrapPattern !== 'solid') {
      this.ensureWrapTexture(ui.wrapPattern);
      if (this.wrapTex) {
        this.wrapTex.repeat.set(ui.wrapScale, ui.wrapScale);
        this.wrapTex.needsUpdate = true;
        this.wrapMat.map = this.wrapTex;
      }
    } else {
      this.wrapMat.map = null;
    }
    this.wrapMat.needsUpdate = true;

    this.applyWheelPreset(ui.wheelFinish);
    this.applyTrimPreset(ui.trimFinish);
    this.applyGlassTint(ui.glassTint);

    // Per-part color overrides keep the physical tuning from presets.
    this.wheelMat.color.copy(ui.wheelColor);
    this.trimMat.color.copy(ui.trimColor);
    this.caliperMat.color.copy(ui.caliperColor);
    this.lightMat.color.copy(ui.lightColor);
    this.lightMat.emissive.copy(ui.lightColor);
    this.lightMat.emissiveIntensity = ui.lightGlow;

    const mode = ui.mode;

    loaded.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const part = this.classifyMesh(mesh);

      if (mode === 'wireframe') {
        mesh.material = this.wireframeMat;
        return;
      }

      if (mode === 'glass') {
        mesh.material = this.glassMat;
        return;
      }

      if (part === 'light') {
        mesh.material = this.lightMat;
        return;
      }

      if (part === 'caliper') {
        mesh.material = this.caliperMat;
        return;
      }

      if (part === 'glass') {
        mesh.material = this.glassMat;
        return;
      }

      if (part === 'tire') {
        mesh.material = this.tireMat;
        return;
      }

      if (part === 'wheel') {
        mesh.material = this.wheelMat;
        return;
      }

      if (part === 'trim') {
        mesh.material = this.trimMat;
        return;
      }

      mesh.material = mode === 'wrap' ? this.wrapMat : this.bodyMat;
    });
  }

  private async loadModel(url: string) {
    const normalized = resolveModelUrl(url);
    this.loadingUrl = normalized;

    this.root.dataset.carShowroomReady = '0';
    this.root.dataset.carShowroomLoading = '1';
    this.root.dataset.carShowroomLoadError = '';

    try {
      const res = await fetch(normalized);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();

      const gltf = await new Promise<THREE.Object3D>((resolve, reject) => {
        this.loader.parse(
          buffer,
          '',
          data => resolve(data.scene),
          err => reject(err)
        );
      });

      if (this.loadingUrl !== normalized) {
        // A newer request won; drop this load.
        gltf.traverse(obj => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose?.();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat?.dispose?.();
        });
        return;
      }

      this.disposeLoaded();

      // Normalize scale + center + place on floor.
      // Important: if we scale the object, we must recompute the box; otherwise
      // translations won't match the scaled size and the car can end up sunk.
      const box = new THREE.Box3().setFromObject(gltf);
      const size = new THREE.Vector3();
      box.getSize(size);

      const maxDim = Math.max(1e-3, size.x, size.y, size.z);
      const scale = 4.0 / maxDim;
      gltf.scale.setScalar(scale);

      box.setFromObject(gltf);
      const center = new THREE.Vector3();
      box.getCenter(center);
      gltf.position.sub(center);

      box.setFromObject(gltf);
      // Raise so the bottom touches y=0.
      gltf.position.y -= box.min.y;

      this.loaded = gltf;
      this.modelGroup.add(gltf);

      const ui = this.getUiState();
      this.applyCameraPreset(ui, true);
      this.lastCameraPreset = ui.cameraPreset;
      this.applyMaterials(gltf, ui);

      this.root.dataset.carShowroomReady = '1';
      this.root.dataset.carShowroomLoading = '0';
    } catch (e) {
      console.error('[CarShowroom] Failed to load model', normalized, e);
      this.root.dataset.carShowroomReady = '0';
      this.root.dataset.carShowroomLoading = '0';
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Unknown error';
      this.root.dataset.carShowroomLoadError = `Failed to load model: ${message}`;
    }
  }

  private syncFromUi(scene: THREE.Scene) {
    const ds = this.root.dataset;
    const revision = ds.carShowroomUiRevision || '';
    if (revision === this.lastUiRevision) return;
    this.lastUiRevision = revision;

    const ui = this.getUiState();

    if (ui.cameraMode === 'preset') {
      if (this.lastCameraPreset !== ui.cameraPreset) {
        this.applyCameraPreset(ui, false);
        this.lastCameraPreset = ui.cameraPreset;
      }
    }

    // Background
    this.setBackground(scene, ui.background);

    // Lights/env/floor
    this.applyLightMultiplier(ui.lightIntensity);
    this.applyFloor(ui);
    this.applyEnvironmentIntensity(this.loaded, ui.envIntensity);

    // Model
    if (ui.modelUrl && resolveModelUrl(ui.modelUrl) !== this.loadingUrl) {
      void this.loadModel(ui.modelUrl);
    }

    if (this.loaded) {
      this.applyMaterials(this.loaded, ui);
    }
  }

  update(
    scene: THREE.Scene,
    dt: number,
    pointer: THREE.Vector2,
    pointerVelocity: THREE.Vector2,
    press: number,
    zoomFromInput: number
  ) {
    this.time += dt;

    // Sync UI-driven changes.
    this.syncFromUi(scene);

    const ui = this.getUiState();

    // Camera mode + manual overrides.
    if (ui.cameraMode === 'manual') {
      this.orbitYawTarget = degToRad(ui.camYawDeg);
      this.orbitPitchTarget = degToRad(ui.camPitchDeg);
      this.orbitPitchTarget = clamp(this.orbitPitchTarget, -0.05, 0.95);
      this.orbitRadiusTarget = ui.camDistance;
      if (ui.lookAt) this.lookAtTarget.copy(ui.lookAt);
    }

    this.fovTarget = ui.fov;

    // Use the runtime-smoothed zoom value (only when not in manual distance mode).
    const zoom = clamp(zoomFromInput, 0, 1);

    // Orbit targets.
    const pressBoost = 0.55 + 0.9 * press;
    this.orbitYawTarget += pointerVelocity.x * dt * 0.22 * pressBoost;
    this.orbitPitchTarget += pointerVelocity.y * dt * 0.16 * pressBoost;
    this.orbitPitchTarget = clamp(this.orbitPitchTarget, -0.05, 0.55);

    // Gentle idle motion
    const idleSpin = ui.autoRotate ? ui.spinSpeed : 0;
    this.orbitYawTarget += idleSpin * dt * 0.28;

    // Zoom shaping: allow a genuinely close dolly-in.
    // In manual mode, distance comes from the slider, so don't override.
    if (ui.cameraMode !== 'manual') {
      const zoomCurve = zoom * zoom;
      this.orbitRadiusTarget = lerp(11.6, 3.25, zoomCurve);
    }

    // Damping
    this.orbitYaw = damp(this.orbitYaw, this.orbitYawTarget, 7.5, dt);
    this.orbitPitch = damp(this.orbitPitch, this.orbitPitchTarget, 7.5, dt);
    this.orbitRadius = damp(this.orbitRadius, this.orbitRadiusTarget, 6.5, dt);
    this.lookAt.x = damp(this.lookAt.x, this.lookAtTarget.x, 7.5, dt);
    this.lookAt.y = damp(this.lookAt.y, this.lookAtTarget.y, 7.5, dt);
    this.lookAt.z = damp(this.lookAt.z, this.lookAtTarget.z, 7.5, dt);

    const fov = damp(this.camera.fov, this.fovTarget, 6.5, dt);
    if (Math.abs(fov - this.camera.fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    const xRel =
      Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitRadius;
    const zRel =
      Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitRadius;
    const yRel = Math.sin(this.orbitPitch) * this.orbitRadius;

    this.camera.position.set(
      this.lookAt.x + xRel,
      this.lookAt.y + yRel,
      this.lookAt.z + zRel
    );
    this.camera.lookAt(this.lookAt);

    // Contact shadow responds to camera distance
    const shadowOpacity = clamp(1.12 - (this.orbitRadius - 6) * 0.1, 0.25, 0.9);
    const mat = this.contactShadow.material as THREE.MeshBasicMaterial;
    mat.opacity = shadowOpacity;

    // Slight lighting drift for realism.
    const drift = 0.18;
    this.keyLight.position.x = 7 + Math.sin(this.time * 0.35) * drift;
    this.keyLight.position.z = 6 + Math.cos(this.time * 0.31) * drift;

    if (this.selectedMesh) {
      this.selectionBox.setFromObject(this.selectedMesh);
      this.selectionHelper.updateMatrixWorld(true);
    }
  }
}
