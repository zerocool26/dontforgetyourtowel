import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { withBasePath } from '../../utils/helpers';

type ShowroomMode = 'paint' | 'wrap' | 'glass' | 'wireframe' | 'factory';
type ShowroomFinish = 'gloss' | 'satin' | 'matte';
type ShowroomBackground =
  | 'studio'
  | 'day'
  | 'sunset'
  | 'night'
  | 'grid'
  | 'void';
type WheelFinish = 'graphite' | 'chrome' | 'black';
type TrimFinish = 'black' | 'chrome' | 'brushed';
type CameraPreset = 'hero' | 'front' | 'rear' | 'side' | 'top' | 'detail';
type FloorPreset = 'auto' | 'asphalt' | 'matte' | 'polished' | 'glass';
type WrapPattern =
  | 'solid'
  | 'stripes'
  | 'carbon'
  | 'camo'
  | 'checker'
  | 'hex'
  | 'race';
type QualityPreset = 'performance' | 'balanced' | 'ultra';
type MotionStyle = 'spin' | 'orbit' | 'pendulum';

type WrapStyle = 'oem' | 'procedural';

type UiState = {
  modelUrl: string;
  mode: ShowroomMode;
  wrapStyle: WrapStyle;
  wrapTint: number;
  wrapOffsetX: number;
  wrapOffsetY: number;
  wrapRotationDeg: number;
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
  clearcoat: number;
  flakeIntensity: number;
  flakeScale: number;
  pearl: number;
  pearlThickness: number;
  rideHeight: number;
  modelYaw: number;
  wheelFinish: WheelFinish;
  trimFinish: TrimFinish;
  glassTint: number;
  background: ShowroomBackground;
  envIntensity: number;
  lightIntensity: number;
  lightWarmth: number;
  rimBoost: number;
  rigYaw: number;
  rigHeight: number;
  underglow: number;
  underglowColor: THREE.Color;
  underglowSize: number;
  underglowPulse: number;
  shadowStrength: number;
  shadowSize: number;
  floorPreset: FloorPreset;
  floorColor: THREE.Color;
  floorRoughness: number;
  floorMetalness: number;
  floorOpacity: number;
  gridEnabled: boolean;
  cameraPreset: CameraPreset;
  cameraMode: 'preset' | 'manual';
  camYawDeg: number;
  camPitchDeg: number;
  camDistance: number;
  fov: number;
  lookAt: THREE.Vector3 | null;
  autoRotate: boolean;
  motionStyle: MotionStyle;
  motionRange: number;
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
  } else if (pattern === 'checker') {
    const cell = 56;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const v = (x / cell + y / cell) % 2;
        const c = v < 1 ? 238 : 205;
        ctx.fillStyle = `rgb(${c},${c},${c})`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    for (let y = 0; y <= size; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    for (let x = 0; x <= size; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  } else if (pattern === 'hex') {
    const r = 34;
    const h = Math.sqrt(3) * r;
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;

    const drawHex = (cx: number, cy: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    for (let y = -h; y < size + h; y += h) {
      const row = Math.round(y / h);
      const xOffset = row % 2 === 0 ? 0 : r * 1.5;
      for (let x = -r * 3; x < size + r * 3; x += r * 3) {
        drawHex(x + xOffset, y);
      }
    }
  } else if (pattern === 'race') {
    // Grayscale livery meant to be tinted by wrap color.
    ctx.fillStyle = 'rgb(248,248,248)';
    ctx.fillRect(0, 0, size, size);

    // Diagonal stripes.
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.translate(-size / 2, -size / 2);
    ctx.globalAlpha = 0.28;
    const stripeW = 56;
    for (let x = -size; x < size * 2; x += stripeW) {
      const t = (x / stripeW) % 2;
      ctx.fillStyle = t < 1 ? 'rgb(220,220,220)' : 'rgb(245,245,245)';
      ctx.fillRect(x, 0, stripeW, size);
    }
    ctx.restore();

    // Door roundels + numbers (will tile, but reads as race livery).
    const drawRoundel = (cx: number, cy: number, num: string) => {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgb(250,250,250)';
      ctx.strokeStyle = 'rgb(35,35,35)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 110, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgb(25,25,25)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font =
        '800 140px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText(num, cx, cy + 6);
      ctx.restore();
    };

    drawRoundel(size * 0.32, size * 0.55, '26');
    drawRoundel(size * 0.72, size * 0.4, '26');

    // Small sponsor blocks.
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = 'rgb(30,30,30)';
    ctx.fillRect(size * 0.08, size * 0.12, 180, 34);
    ctx.fillRect(size * 0.58, size * 0.78, 210, 34);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

const createFlakeNormalTexture = (size = 256): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const strength = 22;
    for (let i = 0; i < data.length; i += 4) {
      const nx = (Math.random() * 2 - 1) * strength;
      const ny = (Math.random() * 2 - 1) * strength;
      data[i] = 128 + nx;
      data[i + 1] = 128 + ny;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
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

  private readonly keyLightBase = new THREE.Vector3(7, 10, 6);
  private readonly fillLightBase = new THREE.Vector3(-8, 7, 2);
  private readonly rimLightBase = new THREE.Vector3(-6, 6, -8);

  private baseKeyIntensity = 3.0;
  private baseFillIntensity = 1.25;
  private baseRimIntensity = 1.1;
  private baseTopIntensity = 0.9;

  private baseKeyColor = new THREE.Color('#ffffff');
  private baseFillColor = new THREE.Color('#8db8ff');
  private baseRimColor = new THREE.Color('#ffffff');

  private envTex: THREE.Texture | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;

  private loader: GLTFLoader;
  private loaded: THREE.Object3D | null = null;
  private loadingUrl: string | null = null;
  private lastUiRevision = '';

  private savedMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private oemWrapMaterials = new Map<
    string,
    | { material: THREE.Material | THREE.Material[]; baseColor: THREE.Color }
    | Array<{
        material: THREE.Material | THREE.Material[];
        baseColor: THREE.Color;
      }>
  >();

  private bodyMat: THREE.MeshPhysicalMaterial;
  private wrapMat: THREE.MeshPhysicalMaterial;
  private glassMat: THREE.MeshPhysicalMaterial;
  private trimMat: THREE.MeshPhysicalMaterial;
  private wheelMat: THREE.MeshPhysicalMaterial;
  private caliperMat: THREE.MeshPhysicalMaterial;
  private tireMat: THREE.MeshStandardMaterial;
  private lightMat: THREE.MeshStandardMaterial;
  private wireframeMat: THREE.MeshStandardMaterial;

  private readonly underglowLight: THREE.PointLight;
  private readonly underglowMesh: THREE.Mesh;
  private readonly underglowMat: THREE.MeshBasicMaterial;
  private underglowBaseIntensity = 0;
  private underglowPulse = 0;

  private wrapTex: THREE.CanvasTexture | null = null;
  private wrapTexKey = '';
  private readonly flakeNormal: THREE.CanvasTexture;

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

  private rigYaw = 0;
  private rigYawTarget = 0;
  private readonly rigAxis = new THREE.Vector3(0, 1, 0);
  private readonly rigTmp = new THREE.Vector3();

  private modelBaseY = 0;
  private modelYaw = 0;
  private modelYawTarget = 0;
  private rideHeight = 0;
  private rideHeightTarget = 0;

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
    this.keyLight.position.copy(this.keyLightBase);
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
    this.fillLight.position.copy(this.fillLightBase);
    this.stage.add(this.fillLight);
    this.stage.add(this.fillLight.target);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.rimLight.position.copy(this.rimLightBase);
    this.stage.add(this.rimLight);

    this.topLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.topLight.position.set(0, 14, 0);
    this.stage.add(this.topLight);

    this.underglowLight = new THREE.PointLight(0x22d3ee, 0, 12, 2);
    this.underglowLight.position.set(0, 0.35, 0);
    this.stage.add(this.underglowLight);

    this.underglowMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.underglowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1, 80),
      this.underglowMat
    );
    this.underglowMesh.rotation.x = -Math.PI / 2;
    this.underglowMesh.position.y = 0.01;
    this.underglowMesh.visible = false;
    this.stage.add(this.underglowMesh);

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

    this.flakeNormal = createFlakeNormalTexture(256);

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
      this.keyLight.castShadow = false;
      this.ground.receiveShadow = false;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.normalBias = 0.03;
      this.keyLight.shadow.bias = -0.00025;
      return;
    }

    if (preset === 'ultra') {
      this.keyLight.castShadow = true;
      this.ground.receiveShadow = true;
      this.keyLight.shadow.mapSize.set(4096, 4096);
      this.keyLight.shadow.normalBias = 0.015;
      this.keyLight.shadow.bias = -0.0001;
      return;
    }

    // balanced
    this.keyLight.castShadow = true;
    this.ground.receiveShadow = true;
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
    meshPath: string;
  } | null {
    if (!this.loaded) return null;
    raycaster.setFromCamera(ndc, this.camera);
    const hits = raycaster.intersectObject(this.loaded, true);
    const hit = hits.find(h => (h.object as THREE.Mesh)?.isMesh);
    if (!hit) return null;
    const mesh = hit.object as THREE.Mesh;
    return {
      mesh,
      part: this.classifyMesh(mesh),
      meshPath: this.getMeshPath(mesh),
    };
  }

  private sanitizePathToken(name: string): string {
    const raw = (name || '').trim().toLowerCase();
    if (!raw) return '~';
    return raw.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
  }

  private getMeshPath(mesh: THREE.Object3D): string {
    if (!this.loaded) return '';

    // Build a stable-ish path based on parent chain + child indices.
    // This survives material changes and is deterministic per GLB.
    const parts: string[] = [];
    let node: THREE.Object3D | null = mesh;
    while (node && node !== this.loaded) {
      const parentObj: THREE.Object3D | null = node.parent;
      if (!parentObj) break;
      const idx = parentObj.children.indexOf(node);
      const token = this.sanitizePathToken(node.name);
      parts.push(`${token}[${idx < 0 ? 0 : idx}]`);
      node = parentObj;
    }
    parts.reverse();
    return parts.join('/');
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
    this.underglowMat.dispose();
    (this.underglowMesh.geometry as THREE.BufferGeometry).dispose();
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

    // If we swapped materials for configurator modes, restore the original materials
    // first so they are properly disposed with the model.
    this.loaded.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const saved = this.savedMaterials.get(mesh.uuid);
      if (saved) mesh.material = saved;
    });

    for (const mapped of this.oemWrapMaterials.values()) {
      const items = Array.isArray(mapped) ? mapped : [mapped];
      for (const item of items) {
        const mat = item.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
    }
    this.oemWrapMaterials.clear();

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
    this.savedMaterials.clear();
  }

  private captureOriginalMaterials(loaded: THREE.Object3D) {
    this.savedMaterials.clear();
    loaded.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      this.savedMaterials.set(mesh.uuid, mesh.material);
    });
  }

  private restoreOriginalMaterialForMesh(mesh: THREE.Mesh) {
    const saved = this.savedMaterials.get(mesh.uuid);
    if (saved) mesh.material = saved;
  }

  private updateModelStats(loaded: THREE.Object3D) {
    const ds = this.root.dataset;
    const box = new THREE.Box3().setFromObject(loaded);
    const size = new THREE.Vector3();
    box.getSize(size);

    let meshes = 0;
    let tris = 0;
    loaded.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes += 1;
      const geom = mesh.geometry as THREE.BufferGeometry | undefined;
      if (!geom) return;
      const index = geom.index;
      if (index) tris += Math.floor(index.count / 3);
      else {
        const pos = geom.getAttribute('position');
        if (pos) tris += Math.floor(pos.count / 3);
      }
    });

    ds.carShowroomModelSizeX = size.x.toFixed(2);
    ds.carShowroomModelSizeY = size.y.toFixed(2);
    ds.carShowroomModelSizeZ = size.z.toFixed(2);
    ds.carShowroomModelMeshes = String(meshes);
    ds.carShowroomModelTris = String(tris);
  }

  private applyModelTransform(ui: UiState, immediate: boolean) {
    if (!this.loaded) return;
    this.modelYawTarget = degToRad(ui.modelYaw);
    this.rideHeightTarget = clamp(ui.rideHeight, -0.3, 0.3);

    if (immediate) {
      this.modelYaw = this.modelYawTarget;
      this.rideHeight = this.rideHeightTarget;
    }

    this.loaded.rotation.y = this.modelYaw;
    this.loaded.position.y = this.modelBaseY + this.rideHeight;
  }

  private getMeshBaseColor(material: THREE.Material): THREE.Color {
    const anyMat = material as unknown as { color?: THREE.Color };
    if (anyMat?.color instanceof THREE.Color) return anyMat.color.clone();
    return new THREE.Color(0xffffff);
  }

  private cloneAsPhysicalWrap(
    src: THREE.Material,
    wrapColor: THREE.Color,
    wrapTint: number,
    ui: UiState
  ): { material: THREE.MeshPhysicalMaterial; baseColor: THREE.Color } {
    const baseColor = this.getMeshBaseColor(src);

    const stdSrc = src as unknown as THREE.MeshStandardMaterial;
    const physSrc = src as unknown as THREE.MeshPhysicalMaterial;

    const mat = new THREE.MeshPhysicalMaterial({
      color: baseColor.clone().lerp(wrapColor, wrapTint),
      map: stdSrc.map ?? null,
      normalMap: stdSrc.normalMap ?? null,
      normalScale:
        (physSrc.normalScale?.clone?.() as THREE.Vector2 | undefined) ??
        new THREE.Vector2(1, 1),
      roughnessMap: stdSrc.roughnessMap ?? null,
      metalnessMap: stdSrc.metalnessMap ?? null,
      aoMap: stdSrc.aoMap ?? null,
      aoMapIntensity: (stdSrc.aoMapIntensity as number | undefined) ?? 1,
      emissive:
        (physSrc.emissive?.clone?.() as THREE.Color | undefined) ??
        new THREE.Color(0x000000),
      emissiveMap:
        (stdSrc.emissiveMap as THREE.Texture | null | undefined) ?? null,
      emissiveIntensity: (physSrc.emissiveIntensity as number | undefined) ?? 0,
      alphaMap: (stdSrc.alphaMap as THREE.Texture | null | undefined) ?? null,
      transparent: (stdSrc.transparent as boolean | undefined) ?? false,
      opacity: (stdSrc.opacity as number | undefined) ?? 1,
      alphaTest: (stdSrc.alphaTest as number | undefined) ?? 0,
      side: (stdSrc.side as THREE.Side | undefined) ?? THREE.FrontSide,
      depthWrite: (stdSrc.depthWrite as boolean | undefined) ?? true,
      depthTest: (stdSrc.depthTest as boolean | undefined) ?? true,
    });

    const anySrc = src as unknown as {
      envMapIntensity?: number;
      transmission?: number;
      thickness?: number;
      ior?: number;
      clearcoat?: number;
      clearcoatRoughness?: number;
    };
    if (typeof anySrc.envMapIntensity === 'number') {
      (mat as unknown as { envMapIntensity?: number }).envMapIntensity =
        anySrc.envMapIntensity;
    }
    if (typeof anySrc.transmission === 'number') mat.transmission = 0;
    if (typeof anySrc.thickness === 'number') mat.thickness = 0.15;
    if (typeof anySrc.ior === 'number') mat.ior = anySrc.ior;
    if (typeof anySrc.clearcoat === 'number') mat.clearcoat = anySrc.clearcoat;
    if (typeof anySrc.clearcoatRoughness === 'number')
      mat.clearcoatRoughness = anySrc.clearcoatRoughness;

    this.applyFinishPreset(mat, ui.finish);
    this.applyPaintTuning(mat, ui);

    if (!stdSrc.normalMap) {
      const flake = clamp(ui.flakeIntensity, 0, 1);
      if (flake > 0.01) {
        this.flakeNormal.repeat.set(ui.flakeScale, ui.flakeScale);
        mat.normalMap = this.flakeNormal;
        const scale = 0.35 * flake;
        mat.normalScale.set(scale, scale);
      } else {
        mat.normalMap = null;
        mat.normalScale.set(0, 0);
      }
      mat.needsUpdate = true;
    }
    mat.needsUpdate = true;
    return { material: mat, baseColor };
  }

  private getOrCreateOemWrapMaterial(
    mesh: THREE.Mesh,
    ui: UiState
  ): THREE.Material | THREE.Material[] | null {
    const saved = this.savedMaterials.get(mesh.uuid);
    if (!saved) return null;

    const cached = this.oemWrapMaterials.get(mesh.uuid);
    if (cached) {
      const items = Array.isArray(cached) ? cached : [cached];
      for (const item of items) {
        const mats = Array.isArray(item.material)
          ? item.material
          : [item.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshPhysicalMaterial) {
            mat.color.copy(item.baseColor).lerp(ui.wrapColor, ui.wrapTint);
            this.applyFinishPreset(mat, ui.finish);
            this.applyPaintTuning(mat, ui);
            mat.needsUpdate = true;
          }
        }
      }
      return Array.isArray(cached)
        ? (cached.map(c => c.material).flat() as unknown as THREE.Material[])
        : cached.material;
    }

    if (Array.isArray(saved)) {
      const mapped = saved.map(m =>
        this.cloneAsPhysicalWrap(m, ui.wrapColor, ui.wrapTint, ui)
      );
      this.oemWrapMaterials.set(mesh.uuid, mapped);
      return mapped.map(m => m.material);
    }

    const mapped = this.cloneAsPhysicalWrap(
      saved,
      ui.wrapColor,
      ui.wrapTint,
      ui
    );
    this.oemWrapMaterials.set(mesh.uuid, mapped);
    return mapped.material;
  }

  private getUiState(): UiState {
    const ds = this.root.dataset;
    const modelUrl = (
      ds.carShowroomModel || '/models/porsche-911-gt3rs.glb'
    ).trim();

    const modeRaw = (ds.carShowroomMode || 'paint').trim().toLowerCase();
    const mode: ShowroomMode =
      modeRaw === 'paint' ||
      modeRaw === 'wrap' ||
      modeRaw === 'glass' ||
      modeRaw === 'wireframe' ||
      modeRaw === 'factory'
        ? (modeRaw as ShowroomMode)
        : 'paint';

    const wrapStyleRaw = (ds.carShowroomWrapStyle || 'oem')
      .trim()
      .toLowerCase();
    const wrapStyle: WrapStyle =
      wrapStyleRaw === 'procedural' || wrapStyleRaw === 'oem'
        ? (wrapStyleRaw as WrapStyle)
        : 'oem';
    const wrapTint = clamp(parseNumber(ds.carShowroomWrapTint, 0.92), 0, 1);
    const wrapOffsetX = clamp(parseNumber(ds.carShowroomWrapOffsetX, 0), -2, 2);
    const wrapOffsetY = clamp(parseNumber(ds.carShowroomWrapOffsetY, 0), -2, 2);
    const wrapRotationDeg = clamp(
      parseNumber(ds.carShowroomWrapRotationDeg, 0),
      -180,
      180
    );
    const finish = (ds.carShowroomFinish || 'gloss') as ShowroomFinish;
    const clearcoat = clamp(parseNumber(ds.carShowroomClearcoat, 1), 0, 1);
    const flakeIntensity = clamp(
      parseNumber(ds.carShowroomFlakeIntensity, 0.25),
      0,
      1
    );
    const flakeScale = clamp(
      parseNumber(ds.carShowroomFlakeScale, 2.5),
      0.5,
      8
    );
    const pearl = clamp(parseNumber(ds.carShowroomPearl, 0), 0, 1);
    const pearlThickness = clamp(
      parseNumber(ds.carShowroomPearlThickness, 320),
      100,
      800
    );
    const rideHeight = clamp(
      parseNumber(ds.carShowroomRideHeight, 0.05),
      -0.3,
      0.3
    );
    const modelYaw = clamp(parseNumber(ds.carShowroomModelYaw, 0), 0, 360);
    const wheelFinish = (ds.carShowroomWheelFinish ||
      'graphite') as WheelFinish;
    const trimFinish = (ds.carShowroomTrimFinish || 'black') as TrimFinish;
    const glassTint = parseNumber01(ds.carShowroomGlassTint || '0.15', 0.15);
    const background = (ds.carShowroomBackground ||
      'void') as ShowroomBackground;

    const envIntensity = clamp(
      parseNumber(ds.carShowroomEnvIntensity, 0.7),
      0,
      3
    );
    const lightIntensity = clamp(
      parseNumber(ds.carShowroomLightIntensity, 1),
      0.2,
      2.5
    );
    const lightWarmth = clamp(parseNumber(ds.carShowroomLightWarmth, 0), 0, 1);
    const rimBoost = clamp(parseNumber(ds.carShowroomRimBoost, 1), 0.5, 2);
    const rigYaw = clamp(parseNumber(ds.carShowroomRigYaw, 0), 0, 360);
    const rigHeight = clamp(parseNumber(ds.carShowroomRigHeight, 1), 0.6, 1.6);
    const underglow = clamp(parseNumber(ds.carShowroomUnderglow, 0), 0, 5);
    const underglowColor = parseColor(
      ds.carShowroomUnderglowColor || '#22d3ee',
      new THREE.Color('#22d3ee')
    );
    const underglowSize = clamp(
      parseNumber(ds.carShowroomUnderglowSize, 4.5),
      2,
      8
    );
    const underglowPulse = clamp(
      parseNumber(ds.carShowroomUnderglowPulse, 0),
      0,
      1
    );
    const shadowStrength = clamp(
      parseNumber(ds.carShowroomShadowStrength, 0.5),
      0,
      1
    );
    const shadowSize = clamp(parseNumber(ds.carShowroomShadowSize, 6), 3, 10);

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
      parseNumber(ds.carShowroomFloorOpacity, 0),
      0,
      1
    );
    const gridEnabled =
      (ds.carShowroomGrid || '').trim() === 'true' ||
      (ds.carShowroomGrid || '').trim() === '1';

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
    const motionStyleRaw = (ds.carShowroomMotionStyle || 'spin')
      .trim()
      .toLowerCase();
    const motionStyle: MotionStyle =
      motionStyleRaw === 'orbit' ||
      motionStyleRaw === 'pendulum' ||
      motionStyleRaw === 'spin'
        ? (motionStyleRaw as MotionStyle)
        : 'spin';
    const motionRange = clamp(
      parseNumber(ds.carShowroomMotionRange, 18),
      0,
      45
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
      rawWrapPattern === 'camo' ||
      rawWrapPattern === 'checker' ||
      rawWrapPattern === 'hex' ||
      rawWrapPattern === 'race'
        ? (rawWrapPattern as WrapPattern)
        : 'stripes';
    const wrapScale = clamp(parseNumber(ds.carShowroomWrapScale, 1.6), 0.2, 6);

    return {
      modelUrl,
      mode,
      wrapStyle,
      wrapTint,
      wrapOffsetX,
      wrapOffsetY,
      wrapRotationDeg,
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
      clearcoat,
      flakeIntensity,
      flakeScale,
      pearl,
      pearlThickness,
      rideHeight,
      modelYaw,
      wheelFinish,
      trimFinish,
      glassTint,
      background,
      envIntensity,
      lightIntensity,
      lightWarmth,
      rimBoost,
      rigYaw,
      rigHeight,
      underglow,
      underglowColor,
      underglowSize,
      underglowPulse,
      shadowStrength,
      shadowSize,
      floorPreset,
      floorColor,
      floorRoughness,
      floorMetalness,
      floorOpacity,
      gridEnabled,
      cameraPreset,
      cameraMode,
      camYawDeg,
      camPitchDeg,
      camDistance,
      fov,
      lookAt,
      autoRotate,
      motionStyle,
      motionRange,
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

  private applyLightMultiplier(mult: number, rimBoost: number) {
    const m = clamp(mult, 0.2, 2.5);
    const rim = clamp(rimBoost, 0.5, 2);
    this.keyLight.intensity = this.baseKeyIntensity * m;
    this.fillLight.intensity = this.baseFillIntensity * m;
    this.rimLight.intensity = this.baseRimIntensity * m * rim;
    this.topLight.intensity = this.baseTopIntensity * m;
  }

  private applyLightWarmth(warmth: number) {
    const t = clamp(warmth, 0, 1);
    const cool = new THREE.Color('#9bb6ff');
    const warm = new THREE.Color('#ffb088');
    const tint = cool.lerp(warm, t);

    this.keyLight.color.copy(this.baseKeyColor).lerp(tint, 0.55);
    this.fillLight.color.copy(this.baseFillColor).lerp(tint, 0.35);
    this.rimLight.color.copy(this.baseRimColor).lerp(tint, 0.45);
  }

  private applyRigPositions(driftX: number, driftZ: number, rigHeight: number) {
    const height = clamp(rigHeight, 0.6, 1.6);

    this.rigTmp
      .copy(this.keyLightBase)
      .setY(this.keyLightBase.y * height)
      .applyAxisAngle(this.rigAxis, this.rigYaw);
    this.keyLight.position.set(
      this.rigTmp.x + driftX,
      this.rigTmp.y,
      this.rigTmp.z + driftZ
    );

    this.rigTmp
      .copy(this.fillLightBase)
      .setY(this.fillLightBase.y * height)
      .applyAxisAngle(this.rigAxis, this.rigYaw);
    this.fillLight.position.copy(this.rigTmp);

    this.rigTmp
      .copy(this.rimLightBase)
      .setY(this.rimLightBase.y * height)
      .applyAxisAngle(this.rigAxis, this.rigYaw);
    this.rimLight.position.copy(this.rigTmp);

    this.topLight.position.set(0, 14 * height, 0);
  }

  private applyUnderglow(ui: UiState) {
    const intensity = clamp(ui.underglow, 0, 5);
    const size = clamp(ui.underglowSize, 2, 8);
    this.underglowBaseIntensity = intensity;
    this.underglowPulse = clamp(ui.underglowPulse, 0, 1);
    this.underglowLight.color.copy(ui.underglowColor);
    this.underglowLight.intensity = intensity;
    this.underglowLight.distance = size * 3.2;

    this.underglowMat.color.copy(ui.underglowColor);
    this.underglowMat.opacity = clamp(intensity / 5, 0, 1) * 0.6;
    this.underglowMesh.scale.set(size, size, 1);
    this.underglowMesh.visible = intensity > 0.02;
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

    const op = clamp(ui.floorOpacity, 0, 1);
    this.groundMat.opacity = op;
    this.groundMat.transparent = op < 0.999;
    this.groundMat.depthWrite = op >= 0.999;
    this.groundMat.needsUpdate = true;
    this.ground.visible = op > 0.001;
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

  getSelectionFrameRecommendation(): {
    yawDeg: number;
    pitchDeg: number;
    distance: number;
    fov: number;
    lookAt: THREE.Vector3;
  } | null {
    if (!this.selectedMesh) return null;

    const box = new THREE.Box3().setFromObject(this.selectedMesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(1e-3, size.x, size.y, size.z);
    const distance = clamp(maxDim * 2.6, 2.5, 9);

    const yawDeg = radToDeg(this.orbitYawTarget || this.orbitYaw || 0.3);
    const pitchDeg = clamp(
      radToDeg(this.orbitPitchTarget || this.orbitPitch),
      0,
      45
    );
    const fov = clamp(this.fovTarget || this.camera.fov || 55, 35, 85);

    const lookAt = new THREE.Vector3(
      center.x,
      center.y + size.y * 0.05,
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
    | 'decal'
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
      text.includes('head_light') ||
      text.includes('taillight') ||
      text.includes('tail_light') ||
      text.includes('brakelight') ||
      text.includes('brake_light') ||
      text.includes('turnsignal') ||
      text.includes('turn_signal') ||
      text.includes('indicator') ||
      (text.includes('light') && !text.includes('highlight')) ||
      text.includes('lamp') ||
      text.includes('emissive') ||
      text.includes('led');
    if (isLight) return 'light';

    const isDecal =
      text.includes('decal') ||
      text.includes('livery') ||
      text.includes('sticker') ||
      text.includes('vinyl') ||
      text.includes('sponsor') ||
      text.includes('roundel') ||
      text.includes('number') ||
      text.includes('door_number') ||
      text.includes('door-number') ||
      text.includes('racing_number') ||
      text.includes('racing-number');
    if (isDecal) return 'decal';

    const isCaliper =
      text.includes('caliper') ||
      text.includes('brakecaliper') ||
      text.includes('brake_caliper') ||
      text.includes('brembo') ||
      (text.includes('brake') &&
        !text.includes('disc') &&
        !text.includes('disk') &&
        !text.includes('rotor') &&
        !text.includes('pad'));
    if (isCaliper) return 'caliper';

    const isTire =
      text.includes('tire') || text.includes('tyre') || text.includes('rubber');
    if (isTire) return 'tire';

    const isWheel =
      text.includes('wheel') ||
      text.includes('rim') ||
      text.includes('rims') ||
      text.includes('alloy') ||
      text.includes('spoke') ||
      text.includes('hub') ||
      text.includes('hubcap');
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

  private applyPaintTuning(mat: THREE.MeshPhysicalMaterial, ui: UiState) {
    const depth = clamp(ui.clearcoat, 0, 1);
    const baseClearcoat = mat.clearcoat;
    const baseRoughness = mat.clearcoatRoughness;
    const coatMul = lerp(0.45, 1.0, depth);
    const roughMul = lerp(1.6, 0.7, depth);
    mat.clearcoat = clamp(baseClearcoat * coatMul, 0, 1);
    mat.clearcoatRoughness = clamp(baseRoughness * roughMul, 0.02, 1);

    const pearl = clamp(ui.pearl, 0, 1);
    mat.iridescence = pearl;
    mat.iridescenceIOR = 1.3;
    const thickness = clamp(ui.pearlThickness, 100, 800);
    mat.iridescenceThicknessRange = [
      Math.max(50, thickness - 120),
      thickness + 120,
    ];
  }

  private setBackground(scene: THREE.Scene, bg: ShowroomBackground) {
    switch (bg) {
      case 'void':
        scene.background = null;
        this.groundMat.color.set('#02030a');
        this.baseKeyIntensity = 2.65;
        this.baseFillColor.set('#c7def8');
        this.fillLight.color.copy(this.baseFillColor);
        this.baseFillIntensity = 1.05;
        this.baseRimIntensity = 1.15;
        break;
      case 'day':
        scene.background = new THREE.Color('#071223');
        this.groundMat.color.set('#040812');
        this.baseKeyIntensity = 3.15;
        this.baseFillColor.set('#bfe6ff');
        this.fillLight.color.copy(this.baseFillColor);
        this.baseFillIntensity = 1.45;
        this.baseRimIntensity = 1.05;
        break;
      case 'sunset':
        scene.background = new THREE.Color('#08040a');
        this.groundMat.color.set('#05070d');
        this.baseKeyIntensity = 3.0;
        this.baseFillColor.set('#ffb088');
        this.fillLight.color.copy(this.baseFillColor);
        this.baseFillIntensity = 1.25;
        this.baseRimIntensity = 1.25;
        break;
      case 'night':
        scene.background = new THREE.Color('#02030a');
        this.groundMat.color.set('#040612');
        this.baseKeyIntensity = 2.6;
        this.baseFillColor.set('#8db8ff');
        this.fillLight.color.copy(this.baseFillColor);
        this.baseFillIntensity = 1.15;
        this.baseRimIntensity = 1.35;
        break;
      case 'grid':
        scene.background = new THREE.Color('#030616');
        this.groundMat.color.set('#030616');
        this.baseKeyIntensity = 2.9;
        this.baseFillColor.set('#8db8ff');
        this.fillLight.color.copy(this.baseFillColor);
        this.baseFillIntensity = 1.15;
        this.baseRimIntensity = 1.2;
        break;
      case 'studio':
      default:
        scene.background = new THREE.Color('#02030a');
        this.groundMat.color.set('#05070d');
        this.baseKeyIntensity = 3.0;
        this.baseFillColor.set('#8db8ff');
        this.fillLight.color.copy(this.baseFillColor);
        this.baseFillIntensity = 1.25;
        this.baseRimIntensity = 1.1;
        break;
    }

    // Top light stays stable across scenes.
    this.baseTopIntensity = 0.9;
    this.baseKeyColor.set('#ffffff');
    this.baseRimColor.set('#ffffff');
  }

  private applyMaterials(loaded: THREE.Object3D, ui: UiState) {
    this.bodyMat.color.copy(ui.color);
    this.wrapMat.color.copy(ui.wrapColor);

    this.applyFinishPreset(this.bodyMat, ui.finish);
    this.applyFinishPreset(this.wrapMat, ui.finish);
    this.applyPaintTuning(this.bodyMat, ui);
    this.applyPaintTuning(this.wrapMat, ui);

    const flake = clamp(ui.flakeIntensity, 0, 1);
    if (flake > 0.01) {
      this.flakeNormal.repeat.set(ui.flakeScale, ui.flakeScale);
      this.bodyMat.normalMap = this.flakeNormal;
      this.wrapMat.normalMap = this.flakeNormal;
      const scale = 0.35 * flake;
      this.bodyMat.normalScale.set(scale, scale);
      this.wrapMat.normalScale.set(scale, scale);
    } else {
      this.bodyMat.normalMap = null;
      this.wrapMat.normalMap = null;
      this.bodyMat.normalScale.set(0, 0);
      this.wrapMat.normalScale.set(0, 0);
    }
    this.bodyMat.needsUpdate = true;
    this.wrapMat.needsUpdate = true;

    // Wrap material gets a subtle procedural pattern so it looks distinct from paint.
    if (ui.mode === 'wrap' && ui.wrapPattern !== 'solid') {
      this.ensureWrapTexture(ui.wrapPattern);
      if (this.wrapTex) {
        this.wrapTex.repeat.set(ui.wrapScale, ui.wrapScale);
        this.wrapTex.offset.set(ui.wrapOffsetX, ui.wrapOffsetY);
        this.wrapTex.center.set(0.5, 0.5);
        this.wrapTex.rotation = degToRad(ui.wrapRotationDeg);
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

    const manualMap = (() => {
      const raw = (this.root.dataset.carShowroomPartMap || '').trim();
      if (!raw) return {} as Record<string, string>;
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed || {})) {
          const key = String(k || '').trim();
          const val = typeof v === 'string' ? v : '';
          if (!key || !val) continue;
          out[key] = val;
        }
        return out;
      } catch {
        return {} as Record<string, string>;
      }
    })();

    const isValidManualPart = (v: string) =>
      v === 'glass' ||
      v === 'tire' ||
      v === 'wheel' ||
      v === 'trim' ||
      v === 'caliper' ||
      v === 'light' ||
      v === 'decal' ||
      v === 'body';

    loaded.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mode === 'factory') {
        this.restoreOriginalMaterialForMesh(mesh);
        return;
      }

      const path = this.getMeshPath(mesh);
      const mapped = path ? String(manualMap[path] || '').trim() : '';
      const part =
        mapped && isValidManualPart(mapped)
          ? (mapped as ReturnType<CarShowroomScene['classifyMesh']>)
          : this.classifyMesh(mesh);

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

      if (part === 'decal') {
        this.restoreOriginalMaterialForMesh(mesh);
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

      if (mode === 'wrap' && ui.wrapStyle === 'oem') {
        const wrapped = this.getOrCreateOemWrapMaterial(mesh, ui);
        if (wrapped) {
          mesh.material = wrapped;
          return;
        }
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
    this.root.dataset.carShowroomModelSizeX = '';
    this.root.dataset.carShowroomModelSizeY = '';
    this.root.dataset.carShowroomModelSizeZ = '';
    this.root.dataset.carShowroomModelMeshes = '';
    this.root.dataset.carShowroomModelTris = '';

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
      this.modelBaseY = gltf.position.y;
      this.modelYaw = gltf.rotation.y;
      this.modelYawTarget = this.modelYaw;
      this.rideHeight = 0;
      this.rideHeightTarget = 0;

      this.captureOriginalMaterials(gltf);
      this.updateModelStats(gltf);

      const ui = this.getUiState();
      this.applyCameraPreset(ui, true);
      this.lastCameraPreset = ui.cameraPreset;
      this.applyMaterials(gltf, ui);
      this.applyModelTransform(ui, true);

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
    this.gridHelper.visible = ui.gridEnabled || ui.background === 'grid';

    // Lights/env/floor
    this.applyLightMultiplier(ui.lightIntensity, ui.rimBoost);
    this.applyLightWarmth(ui.lightWarmth);
    this.rigYawTarget = degToRad(ui.rigYaw);
    this.applyUnderglow(ui);
    this.applyFloor(ui);
    this.applyEnvironmentIntensity(this.loaded, ui.envIntensity);

    // Model
    if (ui.modelUrl && resolveModelUrl(ui.modelUrl) !== this.loadingUrl) {
      void this.loadModel(ui.modelUrl);
    }

    if (this.loaded) {
      this.applyMaterials(this.loaded, ui);
      this.applyModelTransform(ui, false);
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
    let motionOffset = 0;
    if (ui.autoRotate) {
      if (ui.motionStyle === 'spin') {
        this.orbitYawTarget += ui.spinSpeed * dt * 0.28;
      } else {
        const amp = degToRad(ui.motionRange);
        const freq = ui.motionStyle === 'pendulum' ? 0.55 : 0.85;
        motionOffset = Math.sin(this.time * ui.spinSpeed * freq) * amp;
      }
    }

    // Zoom shaping: allow a genuinely close dolly-in.
    // In manual mode, distance comes from the slider, so don't override.
    if (ui.cameraMode !== 'manual') {
      const zoomCurve = zoom * zoom;
      this.orbitRadiusTarget = lerp(11.6, 3.25, zoomCurve);
    }

    // Damping
    const yawTarget = this.orbitYawTarget + motionOffset;
    this.orbitYaw = damp(this.orbitYaw, yawTarget, 7.5, dt);
    this.orbitPitch = damp(this.orbitPitch, this.orbitPitchTarget, 7.5, dt);
    this.orbitRadius = damp(this.orbitRadius, this.orbitRadiusTarget, 6.5, dt);
    this.lookAt.x = damp(this.lookAt.x, this.lookAtTarget.x, 7.5, dt);
    this.lookAt.y = damp(this.lookAt.y, this.lookAtTarget.y, 7.5, dt);
    this.lookAt.z = damp(this.lookAt.z, this.lookAtTarget.z, 7.5, dt);
    this.rigYaw = damp(this.rigYaw, this.rigYawTarget, 6.5, dt);
    this.modelYaw = damp(this.modelYaw, this.modelYawTarget, 6.5, dt);
    this.rideHeight = damp(this.rideHeight, this.rideHeightTarget, 6.5, dt);

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

    if (this.loaded) {
      this.loaded.rotation.y = this.modelYaw;
      this.loaded.position.y = this.modelBaseY + this.rideHeight;
    }

    // Contact shadow responds to camera distance
    const shadowOpacity = clamp(1.12 - (this.orbitRadius - 6) * 0.1, 0.25, 0.9);
    const mat = this.contactShadow.material as THREE.MeshBasicMaterial;
    mat.opacity = shadowOpacity * clamp(ui.shadowStrength, 0, 1);
    const shadowSize = clamp(ui.shadowSize, 3, 10);
    this.contactShadow.scale.set(shadowSize, shadowSize * 0.5, 1);

    // Slight lighting drift for realism.
    const drift = 0.18;
    const driftX = Math.sin(this.time * 0.35) * drift;
    const driftZ = Math.cos(this.time * 0.31) * drift;
    this.applyRigPositions(driftX, driftZ, ui.rigHeight);

    if (this.underglowBaseIntensity > 0) {
      const pulse =
        this.underglowPulse > 0
          ? 1 + Math.sin(this.time * 2.4) * 0.5 * this.underglowPulse
          : 1;
      const baseOpacity = clamp(this.underglowBaseIntensity / 5, 0, 1) * 0.6;
      this.underglowLight.intensity = this.underglowBaseIntensity * pulse;
      this.underglowMat.opacity = baseOpacity * pulse;
    }

    if (this.selectedMesh) {
      this.selectionBox.setFromObject(this.selectedMesh);
      this.selectionHelper.updateMatrixWorld(true);
    }
  }
}
