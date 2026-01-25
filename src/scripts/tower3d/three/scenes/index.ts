import * as THREE from 'three';
import type { TowerCaps } from '../../core/caps';

export type SceneMeta = {
  id: string;
  title: string;
  caption: string;
  hint: string;
};

export type SceneRuntime = {
  renderer: THREE.WebGLRenderer;
  root: HTMLElement;
  caps: TowerCaps;
  size: { width: number; height: number; dpr: number };
  time: number;
  dt: number;
  progress: number;
  localProgress: number;
  pointer: THREE.Vector2;
  pointerVelocity: THREE.Vector2;
  /** Instant interaction impulse (tap/click). Decays quickly. Range: 0..1 */
  tap: number;
  /** Normalized press/hold amount while pointer is down. Range: 0..1 */
  press: number;
  scrollVelocity: number;
  sceneId: string;
  sceneIndex: number;
  /** Gyroscope tilt data (mobile only). Range: -1 to 1 for each axis */
  gyro: THREE.Vector3;
  /** Whether gyroscope is available and active */
  gyroActive: boolean;
};

export interface TowerScene {
  id: string;
  meta: SceneMeta;
  scene: THREE.Scene;
  camera: THREE.Camera;
  init(ctx: SceneRuntime): void;
  update(ctx: SceneRuntime): void;
  render(ctx: SceneRuntime): void;
  resize(ctx: SceneRuntime): void;
  dispose(): void;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/**
 * Returns a multiplier to push the camera back on portrait screens so content
 * fits without cropping. Uses aggressive scaling for mobile.
 * Reference: landscape aspect ~1.78 (16:9), phone portrait ~0.46 (9:19.5)
 *
 * Test values:
 * - aspect 1.0 (square): 1.0x
 * - aspect 0.75 (4:3 portrait): ~1.4x
 * - aspect 0.56 (9:16 portrait): ~1.9x
 * - aspect 0.46 (9:19.5 phone): ~2.3x
 * - aspect 0.4 (ultra-tall phone): ~2.6x
 */
const getAspectFitMultiplier = (aspect: number): number => {
  // Use 1.0 as the "design" aspect ratio (square-ish scenes look good here)
  const referenceAspect = 1.0;
  if (aspect >= referenceAspect) return 1;

  // For portrait: the narrower the screen, the more we need to pull back
  // Use a cubic curve for aggressive scaling on extreme portrait ratios
  const t = (referenceAspect - aspect) / referenceAspect;
  // Cubic curve: stronger effect as aspect gets more extreme
  return 1 + t * 1.6 + t * t * 1.2 + t * t * t * 0.6;
};

/**
 * Calculate vertical FOV adjustment for portrait screens.
 * Instead of just pulling camera back, we can also widen the FOV.
 * This keeps scenes centered and fully visible.
 */
const getPortraitFovAdjust = (aspect: number, baseFov: number): number => {
  if (aspect >= 1) return baseFov;

  // On portrait, increase FOV to show more content vertically
  // This works in tandem with camera distance adjustment
  const t = 1 - aspect;
  const fovMultiplier = 1 + t * 0.35; // Up to 35% increase for very narrow screens
  return Math.min(baseFov * fovMultiplier, 80); // Cap at 80 degrees
};

const sceneMeta: SceneMeta[] = [
  {
    id: 'scene00',
    title: 'Origin Core',
    caption: 'Cinematic resonance chamber tuned to scroll.',
    hint: 'Scroll to descend',
  },
  {
    id: 'scene01',
    title: 'Liquid‑Metal SDF Relic',
    caption: 'A living artifact morphing across materials.',
    hint: 'Drag to dent',
  },
  {
    id: 'scene02',
    title: 'Million Fireflies',
    caption: 'Swarm intelligence in a luminous flow-field.',
    hint: 'Move to steer',
  },
  {
    id: 'scene03',
    title: 'Kinetic Typography Monolith',
    caption: 'Editorial letters assembling then shattering.',
    hint: 'Hover to reveal',
  },
  {
    id: 'scene04',
    title: 'Aurora Borealis',
    caption: 'Dancing cosmic lights across the sky.',
    hint: 'Tilt to shift',
  },
  {
    id: 'scene05',
    title: 'Event Horizon',
    caption: 'Gravitational lensing bends reality itself.',
    hint: 'Approach the void',
  },
  {
    id: 'scene06',
    title: 'Holographic Blueprint',
    caption: 'Technical wireframes pulse with energy.',
    hint: 'Scan to analyze',
  },
  {
    id: 'scene07',
    title: 'Volumetric Ink Chamber',
    caption: 'Ink clouds carve a hidden silhouette.',
    hint: 'Stir the fog',
  },
  {
    id: 'scene08',
    title: 'Cloth & Light',
    caption: 'A colossal banner wrapping past the lens.',
    hint: 'Wind follows you',
  },
  {
    id: 'scene09',
    title: 'Sculpted Point Cloud',
    caption: 'Scan-grade points re‑lit in real time.',
    hint: 'Scroll to relight',
  },
  {
    id: 'scene10',
    title: 'Fractal Finale',
    caption: 'Infinite descent collapsing into a mark.',
    hint: 'Hold for the drop',
  },
  {
    id: 'scene11',
    title: 'Neural Network Constellation',
    caption: 'Journey into an AI mind—neurons firing in space.',
    hint: 'Click to activate',
  },
  {
    id: 'scene12',
    title: 'Library of Babel',
    caption: 'Infinite hexagonal rooms of impossible knowledge.',
    hint: 'Explore the stacks',
  },
  {
    id: 'scene13',
    title: 'Bioluminescent Abyss',
    caption: 'Deep sea organisms painting darkness with light.',
    hint: 'Move to attract',
  },
  {
    id: 'scene14',
    title: 'Holographic Data City',
    caption: 'Cyberpunk architecture built from pure information.',
    hint: 'Navigate the grid',
  },
  {
    id: 'scene15',
    title: 'Reality Collapse',
    caption: 'All dimensions converge into a singular truth.',
    hint: 'Witness the end',
  },
];

const findMeta = (id: string) =>
  sceneMeta.find(meta => meta.id === id) ?? sceneMeta[0];

abstract class SceneBase implements TowerScene {
  id: string;
  meta: SceneMeta;
  scene: THREE.Scene;
  camera: THREE.Camera;

  /** Aspect multiplier for camera distance (>1 on portrait screens). */
  protected aspectMult = 1;

  constructor(id: string) {
    this.id = id;
    this.meta = findMeta(id);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  }

  init(_ctx: SceneRuntime): void {}

  update(_ctx: SceneRuntime): void {}

  render(ctx: SceneRuntime): void {
    ctx.renderer.render(this.scene, this.camera);
  }

  /** Base camera Z distance before aspect adjustment. Override in subclasses. */
  protected baseCameraZ = 7;

  /** Base FOV for the camera. Override in subclasses. */
  protected baseFov = 45;

  resize(ctx: SceneRuntime): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const aspect = ctx.size.width / Math.max(1, ctx.size.height);
      this.camera.aspect = aspect;

      // On portrait screens, adjust both FOV and camera distance
      // This ensures content is always fully visible and centered
      this.aspectMult = getAspectFitMultiplier(aspect);
      this.camera.position.z = this.baseCameraZ * this.aspectMult;
      this.camera.fov = getPortraitFovAdjust(aspect, this.baseFov);

      // Also ensure camera looks at center
      this.camera.lookAt(0, 0, 0);
      this.camera.updateProjectionMatrix();
    }
  }

  dispose(): void {
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
      if (obj instanceof THREE.Line || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  }
}

class CoreScene extends SceneBase {
  protected baseCameraZ = 8;
  private group = new THREE.Group();

  // Multi-layered core (Genesis Origin)
  private innerPlasma: THREE.Mesh;
  private plasmaMaterial: THREE.ShaderMaterial;
  private middleCore: THREE.Mesh;
  private outerShell: THREE.Mesh;

  // Multiple orbital rings
  private rings: THREE.Mesh[] = [];
  private wireframes: THREE.LineSegments[] = [];

  // Three particle layers
  private innerParticles: THREE.Points;
  private outerParticles: THREE.Points;
  private trailParticles: THREE.Points;
  private innerBase: Float32Array;
  private outerBase: Float32Array;
  private trailBase: Float32Array;
  private trailVelocities: Float32Array;

  private hue = 210;
  private hue2 = 280;
  private energy = 0;

  constructor() {
    super('scene00');

    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x030610, 0.045);
    this.scene.add(this.group);

    // Enhanced lighting setup
    const ambient = new THREE.AmbientLight(0x101825, 0.4);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 4);
    const fill = new THREE.PointLight(0x4488ff, 1.2, 25, 2);
    fill.position.set(-8, -3, 6);
    const rim = new THREE.PointLight(0xff6644, 0.6, 20, 2);
    rim.position.set(4, -4, -8);
    this.scene.add(ambient, key, fill, rim);

    // Inner plasma orb with advanced volumetric noise shader
    this.plasmaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uColor1: { value: new THREE.Color(0x4488ff) },
        uColor2: { value: new THREE.Color(0xff44aa) },
        uColor3: { value: new THREE.Color(0x44ffaa) },
        uGyro: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uEnergy;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec2 uGyro;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        // Improved noise functions
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          vec3 shift = vec3(100.0);
          for (int i = 0; i < 5; i++) {
            v += a * snoise(p);
            p = p * 2.0 + shift;
            a *= 0.5;
          }
          return v;
        }

        // Turbulence for energy swirls
        float turbulence(vec3 p) {
          float t = 0.0;
          float scale = 1.0;
          for (int i = 0; i < 4; i++) {
            t += abs(snoise(p * scale)) / scale;
            scale *= 2.0;
          }
          return t;
        }

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);

          // Animated plasma field with gyro influence
          vec3 p = vPosition * 3.0 + vec3(uGyro.x * 0.5, uGyro.y * 0.5, 0.0);
          p += vec3(uTime * 0.3, uTime * 0.2, uTime * 0.25);

          float n1 = fbm(p) * 0.5 + 0.5;
          float n2 = fbm(p * 1.5 + 100.0) * 0.5 + 0.5;
          float turb = turbulence(p * 0.5 + uTime * 0.15);

          // Energy-responsive distortion
          float energyWarp = uEnergy * 0.5;
          n1 = pow(n1, 1.5 - energyWarp);
          n2 = pow(n2, 1.3 - energyWarp * 0.5);

          // Fresnel for rim glow
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

          // Three-way color blend based on noise layers
          vec3 color = mix(uColor1, uColor2, n1);
          color = mix(color, uColor3, n2 * 0.4 + turb * 0.2);

          // Add electric arcs effect
          float arcs = pow(snoise(vPosition * 8.0 + uTime * 2.0), 4.0) * uEnergy;
          color += vec3(0.8, 0.9, 1.0) * arcs * 2.0;

          // Pulsing core brightness
          float pulse = sin(uTime * 3.0) * 0.15 + 0.85;
          float glow = (0.6 + uEnergy * 0.6 + fresnel * 0.8) * pulse;

          // Inner core hotspot
          float core = smoothstep(0.4, 0.0, length(vPosition));
          color += vec3(1.0, 0.8, 0.6) * core * 0.5 * (1.0 + uEnergy);

          gl_FragColor = vec4(color * glow, 0.92 + fresnel * 0.08);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.innerPlasma = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.65, 5),
      this.plasmaMaterial
    );

    // Middle solid core with iridescence
    this.middleCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.0, 3),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x1a2a4a),
        emissive: new THREE.Color(0x4466aa),
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.3,
      })
    );

    // Outer glass shell with iridescence
    this.outerShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 1),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xaaccff),
        transparent: true,
        opacity: 0.25,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.6,
        thickness: 0.5,
        ior: 1.5,
        iridescence: 1.0,
        iridescenceIOR: 1.3,
        side: THREE.DoubleSide,
      })
    );

    // Multiple orbital rings at different angles
    const ringColors = [0x44aaff, 0xff66aa, 0x66ffaa];
    const ringRadii = [1.8, 2.2, 2.6];
    const ringTilts = [Math.PI / 2.2, Math.PI / 3, Math.PI / 4];

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(ringRadii[i], 0.02, 8, 80),
        new THREE.MeshBasicMaterial({
          color: ringColors[i],
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        })
      );
      ring.rotation.x = ringTilts[i];
      ring.rotation.y = (i * Math.PI) / 3;
      this.rings.push(ring);
      this.group.add(ring);
    }

    // Multiple wireframe shells
    const wireframeGeos = [
      new THREE.IcosahedronGeometry(1.55, 1),
      new THREE.OctahedronGeometry(2.0, 0),
      new THREE.DodecahedronGeometry(1.75, 0),
    ];

    wireframeGeos.forEach((geo, i) => {
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: new THREE.Color().setHSL(0.55 + i * 0.1, 0.9, 0.6),
          transparent: true,
          opacity: 0.12,
        })
      );
      this.wireframes.push(wire);
      this.group.add(wire);
    });

    // Inner orbital particles (electron-like)
    const innerCount = 150;
    const innerPositions = new Float32Array(innerCount * 3);
    for (let i = 0; i < innerCount; i++) {
      const idx = i * 3;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 0.3;
      innerPositions[idx] = r * Math.sin(phi) * Math.cos(theta);
      innerPositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      innerPositions[idx + 2] = r * Math.cos(phi);
    }
    this.innerBase = innerPositions.slice();

    const innerGeo = new THREE.BufferGeometry();
    innerGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(innerPositions, 3)
    );
    this.innerParticles = new THREE.Points(
      innerGeo,
      new THREE.PointsMaterial({
        color: 0x88ddff,
        size: 0.04,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    // Outer ambient particles
    const outerCount = 600;
    const outerPositions = new Float32Array(outerCount * 3);
    for (let i = 0; i < outerCount; i++) {
      const idx = i * 3;
      const r = 3 + Math.random() * 4;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 5;
      outerPositions[idx] = Math.cos(a) * r;
      outerPositions[idx + 1] = y;
      outerPositions[idx + 2] = Math.sin(a) * r;
    }
    this.outerBase = outerPositions.slice();

    const outerGeo = new THREE.BufferGeometry();
    outerGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(outerPositions, 3)
    );
    this.outerParticles = new THREE.Points(
      outerGeo,
      new THREE.PointsMaterial({
        color: 0x6688aa,
        size: 0.025,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    // Trail particles (light streaks)
    const trailCount = 80;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailVelocities = new Float32Array(trailCount * 3);
    for (let i = 0; i < trailCount; i++) {
      const idx = i * 3;
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 2;
      trailPositions[idx] = Math.cos(a) * r;
      trailPositions[idx + 1] = (Math.random() - 0.5) * 3;
      trailPositions[idx + 2] = Math.sin(a) * r;
      // Orbital velocity
      trailVelocities[idx] = -Math.sin(a) * 0.02;
      trailVelocities[idx + 1] = (Math.random() - 0.5) * 0.01;
      trailVelocities[idx + 2] = Math.cos(a) * 0.02;
    }
    this.trailBase = trailPositions.slice();
    this.trailVelocities = trailVelocities;

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(trailPositions, 3)
    );
    this.trailParticles = new THREE.Points(
      trailGeo,
      new THREE.PointsMaterial({
        color: 0xffaa66,
        size: 0.06,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.group.add(
      this.innerPlasma,
      this.middleCore,
      this.outerShell,
      this.innerParticles,
      this.outerParticles,
      this.trailParticles
    );

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 8);
    cam.lookAt(0, 0, 0);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const pointer = ctx.pointer;
    const local = ctx.localProgress;
    const gyro = ctx.gyro;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.2 + ctx.pointerVelocity.length() * 0.8,
      0,
      1
    );

    // Energy builds with scroll and interaction
    this.energy = damp(this.energy, local + impulse * 0.5, 3, ctx.dt);

    this.hue = damp(
      this.hue,
      210 + Math.sin(t * 0.15) * 25 + impulse * 15,
      2,
      ctx.dt
    );
    this.hue2 = damp(this.hue2, 280 + Math.cos(t * 0.2) * 20, 2, ctx.dt);

    // Group rotation with gyro support on mobile
    const gyroInfluence = ctx.gyroActive ? 0.4 : 0;
    this.group.rotation.y = t * 0.1 + pointer.x * 0.4 + gyro.x * gyroInfluence;
    this.group.rotation.x =
      -0.1 + pointer.y * -0.25 + gyro.y * gyroInfluence * 0.5;

    // Inner plasma animation with enhanced dynamics
    this.innerPlasma.rotation.y += ctx.dt * (0.5 + this.energy * 0.4);
    this.innerPlasma.rotation.x += ctx.dt * 0.35;
    this.innerPlasma.rotation.z += ctx.dt * 0.15 * Math.sin(t * 0.3);
    const plasmaWobble = Math.sin(t * 1.5) * 0.1 * (0.5 + this.energy);
    const plasmaPulse = Math.sin(t * 2.5) * 0.03 * this.energy;
    this.innerPlasma.scale.setScalar(1 + plasmaWobble + plasmaPulse);

    // Update all plasma shader uniforms
    this.plasmaMaterial.uniforms.uTime.value = t;
    this.plasmaMaterial.uniforms.uEnergy.value = this.energy;
    this.plasmaMaterial.uniforms.uColor1.value.setHSL(
      this.hue / 360,
      0.85,
      0.55
    );
    this.plasmaMaterial.uniforms.uColor2.value.setHSL(
      this.hue2 / 360,
      0.9,
      0.6
    );
    // Third color cycles through complementary hues for richer plasma
    const hue3 = (this.hue + 120 + Math.sin(t * 0.25) * 30) % 360;
    this.plasmaMaterial.uniforms.uColor3.value.setHSL(hue3 / 360, 0.95, 0.65);
    // Pass gyro data to shader for tilt-reactive plasma
    this.plasmaMaterial.uniforms.uGyro.value.set(gyro.x, gyro.y);

    // Middle core rotation
    this.middleCore.rotation.y += ctx.dt * (0.25 + local * 0.2);
    this.middleCore.rotation.x += ctx.dt * 0.15;
    const coreScale = 1 + Math.sin(t * 0.8) * 0.04 * (0.7 + this.energy);
    this.middleCore.scale.setScalar(coreScale);

    const coreMat = this.middleCore.material as THREE.MeshStandardMaterial;
    coreMat.emissive.setHSL(this.hue / 360, 0.9, 0.35 + this.energy * 0.15);
    coreMat.emissiveIntensity = 0.5 + this.energy * 0.5;

    // Outer shell subtle pulse
    this.outerShell.rotation.y = t * 0.08;
    const shellScale = 1 + Math.sin(t * 0.5) * 0.02;
    this.outerShell.scale.setScalar(shellScale);
    const shellMat = this.outerShell.material as THREE.MeshPhysicalMaterial;
    shellMat.opacity = 0.2 + this.energy * 0.15;

    // Orbital rings at different speeds
    this.rings.forEach((ring, i) => {
      ring.rotation.z = t * (0.2 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      ring.rotation.y += ctx.dt * 0.05 * (i + 1);
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.2 + this.energy * 0.25 + Math.sin(t + i) * 0.1;
      mat.color.setHSL((this.hue + i * 40) / 360, 0.9, 0.6);
    });

    // Wireframes counter-rotate
    this.wireframes.forEach((wire, i) => {
      wire.rotation.y = t * 0.15 * (i % 2 === 0 ? 1 : -1);
      wire.rotation.x = t * 0.1 * (i % 2 === 0 ? -1 : 1);
      const mat = wire.material as THREE.LineBasicMaterial;
      mat.opacity = 0.08 + this.energy * 0.12;
      mat.color.setHSL((this.hue + i * 30) / 360, 0.85, 0.55);
    });

    // Inner particles orbit like electrons
    const innerAttr = this.innerParticles.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const innerArr = innerAttr.array as Float32Array;
    for (let i = 0; i < innerArr.length; i += 3) {
      const bx = this.innerBase[i];
      const by = this.innerBase[i + 1];
      const bz = this.innerBase[i + 2];
      const orbitSpeed = t * 1.5 + i * 0.1;
      const jitter = Math.sin(orbitSpeed) * 0.1 * (1 + this.energy);
      // Orbital motion around Y axis
      const angle = orbitSpeed * 0.3;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      innerArr[i] = bx * cos - bz * sin + jitter;
      innerArr[i + 1] = by + Math.sin(orbitSpeed * 2) * 0.05;
      innerArr[i + 2] = bx * sin + bz * cos + jitter;
    }
    innerAttr.needsUpdate = true;
    const innerMat = this.innerParticles.material as THREE.PointsMaterial;
    innerMat.opacity = 0.6 + this.energy * 0.3;
    innerMat.size = 0.035 + this.energy * 0.02;

    // Outer particles gentle drift
    const outerAttr = this.outerParticles.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const outerArr = outerAttr.array as Float32Array;
    for (let i = 0; i < outerArr.length; i += 3) {
      const bx = this.outerBase[i];
      const by = this.outerBase[i + 1];
      const bz = this.outerBase[i + 2];
      const w = t * 0.4 + i * 0.01;
      outerArr[i] = bx + Math.sin(w) * 0.15;
      outerArr[i + 1] = by + Math.cos(w * 0.7) * 0.1;
      outerArr[i + 2] = bz + Math.sin(w * 0.5) * 0.15;
    }
    outerAttr.needsUpdate = true;
    const outerMat = this.outerParticles.material as THREE.PointsMaterial;
    outerMat.color.setHSL(this.hue / 360, 0.6, 0.55);
    outerMat.opacity = 0.3 + local * 0.2;

    // Trail particles orbit with velocity
    const trailAttr = this.trailParticles.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const trailArr = trailAttr.array as Float32Array;
    for (let i = 0; i < trailArr.length; i += 3) {
      trailArr[i] += this.trailVelocities[i] * (1 + this.energy * 2);
      trailArr[i + 1] += this.trailVelocities[i + 1];
      trailArr[i + 2] += this.trailVelocities[i + 2] * (1 + this.energy * 2);

      // Keep in orbital bounds
      const r = Math.hypot(trailArr[i], trailArr[i + 2]);
      if (r < 1.8 || r > 4.5) {
        trailArr[i] = this.trailBase[i];
        trailArr[i + 1] = this.trailBase[i + 1];
        trailArr[i + 2] = this.trailBase[i + 2];
      }
    }
    trailAttr.needsUpdate = true;
    const trailMat = this.trailParticles.material as THREE.PointsMaterial;
    trailMat.color.setHSL(this.hue2 / 360, 0.9, 0.65);
    trailMat.opacity = 0.5 + this.energy * 0.4;
    trailMat.size = 0.05 + this.energy * 0.04;

    // Camera with gyro parallax
    const cam = this.camera as THREE.PerspectiveCamera;
    const camX = pointer.x * 1.2 + gyro.x * gyroInfluence * 1.5;
    const camY = pointer.y * 0.8 + gyro.y * gyroInfluence * 1.0;
    cam.position.x = damp(cam.position.x, camX, 5, ctx.dt);
    cam.position.y = damp(cam.position.y, camY, 5, ctx.dt);
    cam.position.z = damp(
      cam.position.z,
      (this.baseCameraZ - local * 1.5 - impulse * 0.5) * this.aspectMult,
      4,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);

    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = 0.04 + local * 0.015;
  }
}

class RaymarchScene extends SceneBase {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor(id: string, mode: number) {
    super(id);

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2() },
      uGyro: { value: new THREE.Vector2() },
      uGyroActive: { value: 0 },
      uMode: { value: mode },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform vec2 uGyro;
        uniform float uGyroActive;
        uniform float uMode;

        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        float sdBox(vec3 p, vec3 b) {
          vec3 q = abs(p) - b;
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        float sdRoundBox(vec3 p, vec3 b, float r) {
          vec3 q = abs(p) - b;
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
        }

        mat2 rot(float a) {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c);
        }

        float sdTorus(vec3 p, vec2 t) {
          vec2 q = vec2(length(p.xz) - t.x, p.y);
          return length(q) - t.y;
        }

        float sdOctahedron(vec3 p, float s) {
          p = abs(p);
          return (p.x + p.y + p.z - s) * 0.57735027;
        }

        float opSmoothUnion(float d1, float d2, float k) {
          float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, d1, h) - k * h * (1.0 - h);
        }

        float opSmoothSubtraction(float d1, float d2, float k) {
          float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
          return mix(d2, -d1, h) + k * h * (1.0 - h);
        }

        float mapBase(vec3 p) {
          float t = uProgress;
          vec3 q = p;

          // Gyro influence on rotation
          float gyroMix = uGyroActive * 0.4;
          q.xz *= rot(0.22 * uTime + 0.9 * t + uGyro.x * gyroMix);
          q.yz *= rot(0.15 * uTime + uGyro.y * gyroMix * 0.5);

          // Multi-layer crystalline structure
          float a = sdOctahedron(q, 0.85);
          float b = sdRoundBox(q, vec3(0.65), 0.22);
          float c = sdTorus(q * 1.1, vec2(0.74, 0.18));

          // Nested inner structures
          vec3 q2 = q;
          q2.xy *= rot(uTime * 0.3);
          float inner = sdOctahedron(q2 * 1.5, 0.4);

          float d = opSmoothUnion(a, b, 0.35);
          float e = opSmoothUnion(d, c, 0.28 + 0.15 * sin(uTime * 0.35));
          float f = opSmoothSubtraction(inner, e, 0.25);

          // Enhanced pointer/gyro dent
          vec2 pp = uPointer * 0.7 + uGyro * gyroMix * 0.5;
          float dent = 0.28 * exp(-dot(q.xy - pp, q.xy - pp) * 2.2) * (0.4 + 0.6 * t);
          f -= dent;

          float morph = smoothstep(0.15, 0.85, t);
          return mix(d, f, morph);
        }

        float mapFractal(vec3 p) {
          vec3 z = p;
          float scale = 1.7;
          float dist = 0.0;
          z.xz *= rot(uTime * 0.1);
          for (int i = 0; i < 6; i++) {
            z = abs(z) / dot(z, z) - 0.85;
            z.xy *= rot(0.2);
            dist += exp(-float(i) * 0.55) * length(z);
            z *= scale;
          }
          return dist * 0.16 - 0.55;
        }

        float mapVol(vec3 p) {
          float d = mapBase(p);
          float swirl = sin(p.x * 2.1 + uTime * 0.5) + cos(p.z * 1.8 - uTime * 0.35);
          float pulse = sin(uTime * 2.0 + length(p) * 3.0) * 0.02 * uProgress;
          return d + swirl * 0.08 + pulse;
        }

        float mapScene(vec3 p) {
          if (uMode < 0.5) return mapBase(p);
          if (uMode < 1.5) return mapVol(p);
          return mapFractal(p);
        }

        vec3 getNormal(vec3 p) {
          vec2 e = vec2(0.001, 0.0);
          float d = mapScene(p);
          vec3 n = d - vec3(
            mapScene(p - e.xyy),
            mapScene(p - e.yxy),
            mapScene(p - e.yyx)
          );
          return normalize(n);
        }

        vec3 shade(vec3 p, vec3 rd) {
          vec3 n = getNormal(p);
          vec3 lightA = normalize(vec3(0.6, 0.9, 0.5));
          vec3 lightB = normalize(vec3(-0.5, 0.3, 0.9));
          vec3 lightC = normalize(vec3(0.0, -0.8, 0.3));

          float diffA = clamp(dot(n, lightA), 0.0, 1.0);
          float diffB = clamp(dot(n, lightB), 0.0, 1.0);
          float diffC = clamp(dot(n, lightC), 0.0, 1.0);
          float diff = diffA * 0.7 + diffB * 0.4 + diffC * 0.2;

          vec3 hA = normalize(lightA - rd);
          float specA = pow(clamp(dot(n, hA), 0.0, 1.0), 80.0);
          vec3 hB = normalize(lightB - rd);
          float specB = pow(clamp(dot(n, hB), 0.0, 1.0), 40.0);

          float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 4.5);
          float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.0);

          // Enhanced AO with more samples
          float ao = 0.0;
          ao += (0.015 - mapScene(p + n * 0.015));
          ao += (0.04 - mapScene(p + n * 0.04));
          ao += (0.08 - mapScene(p + n * 0.08));
          ao += (0.12 - mapScene(p + n * 0.12));
          ao = clamp(1.0 - ao * 2.2, 0.0, 1.0);

          // Iridescent color based on view angle and normal
          float irid = dot(n, rd) * 0.5 + 0.5;
          vec3 iridColor = vec3(
            0.5 + 0.5 * sin(irid * 6.28 + uTime * 0.5),
            0.5 + 0.5 * sin(irid * 6.28 + 2.09 + uTime * 0.4),
            0.5 + 0.5 * sin(irid * 6.28 + 4.18 + uTime * 0.3)
          );

          vec3 baseCool = mix(vec3(0.05, 0.08, 0.15), vec3(0.5, 0.75, 1.2), diff);
          vec3 baseHot = mix(vec3(0.08, 0.05, 0.12), vec3(1.2, 0.45, 0.75), diff);
          float modeMix = smoothstep(0.0, 2.0, uMode);
          vec3 base = mix(baseCool, baseHot, 0.2 + 0.6 * modeMix);

          // Mix in iridescence
          base = mix(base, base * iridColor, 0.3 * uProgress);

          vec3 specCol = mix(vec3(0.7, 0.85, 1.3), vec3(1.3, 0.65, 0.95), 0.25 + 0.5 * uProgress);
          vec3 col = base * ao;
          col += (specA * 1.0 + specB * 0.6) * specCol;
          col += rim * (0.15 + 0.4 * uProgress) * vec3(0.4, 0.6, 1.1);
          col += fres * 0.3 * vec3(0.55, 0.8, 1.25);

          // Subsurface scattering approximation
          float sss = pow(clamp(dot(rd, -n), 0.0, 1.0), 1.5) * 0.15;
          col += sss * vec3(0.8, 0.4, 0.3);

          return col;
        }

        void main() {
          vec2 uv = (vUv * 2.0 - 1.0);
          uv.x *= uResolution.x / max(1.0, uResolution.y);

          // Enhanced camera with gyro
          float camOrbit = 0.25 + 0.2 * smoothstep(0.0, 1.0, uProgress);
          float gyroMix = uGyroActive * 0.3;
          vec3 ro = vec3(
            sin(uTime * 0.2) * camOrbit + uGyro.x * gyroMix * 0.4,
            cos(uTime * 0.18) * camOrbit * 0.7 + uGyro.y * gyroMix * 0.3,
            3.0
          );
          ro.xy += uPointer * 0.45;

          // Lens distortion for depth
          uv *= 1.0 + 0.1 * dot(uv, uv);
          vec3 rd = normalize(vec3(uv, -1.5));

          float t = 0.0;
          float hit = -1.0;
          for (int i = 0; i < 120; i++) {
            vec3 p = ro + rd * t;
            float d = mapScene(p);
            if (d < 0.0008) {
              hit = t;
              break;
            }
            t += d * 0.72;
            if (t > 8.0) break;
          }

          // Deep space background with enhanced stars
          float star = step(0.994, fract(sin(dot(uv * 750.0, vec2(12.9898, 78.233))) * 43758.5453));
          float starBright = step(0.998, fract(sin(dot(uv * 650.0, vec2(45.233, 12.9898))) * 43758.5453));
          vec3 col = mix(vec3(0.01, 0.015, 0.035), vec3(0.025, 0.035, 0.07), smoothstep(-0.2, 1.0, uv.y));
          col += star * vec3(0.2, 0.3, 0.5);
          col += starBright * vec3(0.5, 0.6, 0.8);

          if (hit > 0.0) {
            vec3 p = ro + rd * hit;
            col = shade(p, rd);
            float fog = exp(-hit * (0.25 + 0.1 * sin(uTime * 0.25)));
            col = mix(vec3(0.01, 0.02, 0.04), col, fog);

            // Enhanced bloom
            float l = max(max(col.r, col.g), col.b);
            col += smoothstep(0.75, 1.5, l) * vec3(0.06, 0.1, 0.16);
          }

          // Chromatic aberration on edges
          float aberration = length(vUv - 0.5) * 0.015 * uProgress;

          float vign = smoothstep(1.3, 0.2, length(uv));
          col *= 0.75 + vign * 0.4;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  update(ctx: SceneRuntime): void {
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uPointer.value.copy(ctx.pointer);
  }

  resize(ctx: SceneRuntime): void {
    super.resize(ctx);
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
  }
}

class SwarmScene extends SceneBase {
  protected baseCameraZ = 6.0;
  private points: THREE.Points;
  private velocities: Float32Array;
  private base: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private phases: Float32Array;
  private color = new THREE.Color();
  private attractors: THREE.Vector3[] = [];
  private windDirection = new THREE.Vector3(1, 0, 0);

  constructor() {
    super('scene02');
    // Darker background for better contrast with bright fireflies
    this.scene.background = new THREE.Color(0x010408);
    // Much less fog so particles don't fade out
    this.scene.fog = new THREE.FogExp2(0x010408, 0.018);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 6.0);

    // MUCH brighter ambient and accent lighting for firefly visibility
    const ambient = new THREE.AmbientLight(0x223355, 0.8);
    const key = new THREE.PointLight(0xaaeeff, 4.5, 40);
    key.position.set(3, 5, 8);
    const rim = new THREE.PointLight(0xffcc66, 3.0, 35);
    rim.position.set(-5, -3, 5);
    const fill = new THREE.PointLight(0x66ffaa, 2.5, 30);
    fill.position.set(0, 4, -2);
    this.scene.add(ambient, key, rim, fill);

    // More particles for denser swarm
    const count = 18000;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Spawn in a spherical shell
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 2.5;
      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = r * Math.cos(phi);

      // Random initial velocities (orbital tendency)
      const vAngle = theta + Math.PI / 2;
      velocities[idx] = Math.cos(vAngle) * 0.1;
      velocities[idx + 1] = (Math.random() - 0.5) * 0.1;
      velocities[idx + 2] = Math.sin(vAngle) * 0.1;

      // Color gradient from gold to cyan
      const colorT = Math.random();
      const hue = lerp(0.12, 0.52, colorT); // Gold to cyan
      const sat = 0.7 + Math.random() * 0.3;
      const light = 0.5 + Math.random() * 0.3;
      const c = new THREE.Color().setHSL(hue, sat, light);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;

      // Variable sizes for depth
      sizes[i] = 0.015 + Math.random() * 0.025;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for variable sizes and colors with enhanced effects
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uScale: { value: 1 },
        uGyro: { value: new THREE.Vector2(0, 0) },
        uEnergy: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vEnergy;
        varying float vDist;
        uniform float uTime;
        uniform float uProgress;
        uniform float uScale;
        uniform float uEnergy;

        // Simplex noise for organic movement
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vColor = color;
          vEnergy = uEnergy;

          // Calculate distance from center for effects
          float dist = length(position);
          vDist = dist;

          // Organic displacement using noise
          float noise1 = snoise(position.xy * 0.5 + uTime * 0.3);
          float noise2 = snoise(position.yz * 0.5 + uTime * 0.2);
          vec3 displaced = position + vec3(noise1, noise2, noise1 * noise2) * 0.15 * uEnergy;

          vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

          // Multi-frequency pulsing - more pronounced
          float pulse1 = 1.0 + 0.35 * sin(uTime * 2.0 + dist * 2.0);
          float pulse2 = 1.0 + 0.25 * sin(uTime * 3.5 + dist * 1.5 + 1.5);
          float pulse3 = 1.0 + 0.15 * sin(uTime * 5.0 + dist * 3.0);
          float pulse = pulse1 * pulse2 * pulse3;

          // MUCH higher base alpha for visibility - fireflies should GLOW
          vAlpha = smoothstep(35.0, 2.0, -mvPosition.z) * (0.7 + 0.3 * uProgress) * (0.9 + uEnergy * 0.3);

          // Larger particles for visibility
          gl_PointSize = size * uScale * pulse * (350.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vEnergy;
        varying float vDist;
        uniform float uTime;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Soft circular particle with MUCH brighter glow
          float alpha = smoothstep(0.5, 0.08, dist) * vAlpha;

          // Stronger inner glow ring
          float ring = smoothstep(0.35, 0.2, dist) * smoothstep(0.1, 0.2, dist);
          ring *= (0.4 + vEnergy * 0.8);

          // Intense core brightness - the firefly "spark"
          float core = smoothstep(0.18, 0.0, dist);
          float innerCore = smoothstep(0.08, 0.0, dist);

          // Color with MUCH higher base brightness
          vec3 glow = vColor * (1.8 + core * 1.5 + ring * 1.2);

          // Firefly flicker - time-based brightness variation
          float flicker = 0.85 + 0.15 * sin(uTime * 8.0 + vDist * 15.0);

          // Add subtle color shift based on distance from center
          float hueShift = sin(vDist * 2.0 + uTime * 0.5) * 0.15;
          glow.r += hueShift * (0.5 + vEnergy * 0.5);
          glow.b -= hueShift * vEnergy * 0.3;

          // Final color with BRIGHT additive core - fireflies GLOW
          vec3 finalColor = glow * flicker;
          finalColor += vec3(1.0, 0.95, 0.8) * core * 1.2;
          finalColor += vec3(1.0, 1.0, 0.9) * innerCore * 0.8;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.velocities = velocities;
    this.base = positions.slice();
    this.colors = colors;
    this.sizes = sizes;
    this.phases = phases;
    this.scene.add(this.points);

    // Create dynamic attractors
    for (let i = 0; i < 3; i++) {
      this.attractors.push(new THREE.Vector3());
    }
  }

  update(ctx: SceneRuntime): void {
    const geo = this.points.geometry as THREE.BufferGeometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const count = arr.length / 3;
    const t = ctx.time;
    const gyro = ctx.gyro;
    const gyroActive = ctx.gyroActive;

    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.2 + ctx.pointerVelocity.length() * 0.85,
      0,
      1
    );
    const pull = 0.2 + ctx.localProgress * 0.8 + impulse * 0.4;
    const swirl = 0.4 + ctx.localProgress * 1.2 + impulse * 0.8;
    const pointer = ctx.pointer;

    // Update dynamic attractors
    this.attractors[0].set(
      Math.sin(t * 0.5) * 2.5,
      Math.cos(t * 0.4) * 1.5,
      Math.sin(t * 0.3) * 2
    );
    this.attractors[1].set(
      Math.cos(t * 0.6) * 2,
      Math.sin(t * 0.7) * 2,
      Math.cos(t * 0.5) * 1.5
    );
    this.attractors[2].set((pointer.x - 0.5) * 4, (pointer.y - 0.5) * 3, 0);

    // Wind direction influenced by gyro
    const gyroInfluence = gyroActive ? 0.5 : 0;
    this.windDirection.x = damp(
      this.windDirection.x,
      1 + gyro.x * gyroInfluence * 2,
      3,
      ctx.dt
    );
    this.windDirection.y = damp(
      this.windDirection.y,
      gyro.y * gyroInfluence * 1.5,
      3,
      ctx.dt
    );

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const px = arr[idx];
      const py = arr[idx + 1];
      const pz = arr[idx + 2];

      const bx = this.base[idx];
      const by = this.base[idx + 1];
      const bz = this.base[idx + 2];
      const phase = this.phases[i];

      // Curl noise-like swirl
      const curl = t * 0.8 + phase;
      const ax = Math.sin(curl + py * 0.5) * swirl - px * 0.08;
      const ay = Math.cos(curl * 0.8 + px * 0.6) * swirl * 0.6 - py * 0.05;
      const az = Math.cos(curl * 0.7 + px * 0.4) * swirl - pz * 0.08;

      // Attractor forces
      let attractX = 0,
        attractY = 0,
        attractZ = 0;
      for (const attractor of this.attractors) {
        const dx = attractor.x - px;
        const dy = attractor.y - py;
        const dz = attractor.z - pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
        const force = 0.15 / (dist * dist);
        attractX += dx * force;
        attractY += dy * force;
        attractZ += dz * force;
      }

      // Boids-like separation (avoid crowding)
      let sepX = 0,
        sepY = 0,
        sepZ = 0;
      const checkRadius = 0.3;
      const neighborStart = Math.max(0, i - 50);
      const neighborEnd = Math.min(count, i + 50);
      for (let j = neighborStart; j < neighborEnd; j += 3) {
        if (j === i) continue;
        const jdx = j * 3;
        const dx = px - arr[jdx];
        const dy = py - arr[jdx + 1];
        const dz = pz - arr[jdx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < checkRadius && dist > 0.01) {
          const repel = (checkRadius - dist) / checkRadius;
          sepX += dx * repel * 0.1;
          sepY += dy * repel * 0.1;
          sepZ += dz * repel * 0.1;
        }
      }

      // Wind force
      const windStrength = 0.02 + impulse * 0.03;
      const windX = this.windDirection.x * windStrength;
      const windY = this.windDirection.y * windStrength;

      // Combine forces
      this.velocities[idx] =
        this.velocities[idx] * 0.94 +
        (ax * 0.015 + attractX * 0.3 + sepX + windX + (bx - px) * pull * 0.008);
      this.velocities[idx + 1] =
        this.velocities[idx + 1] * 0.94 +
        (ay * 0.015 + attractY * 0.3 + sepY + windY + (by - py) * pull * 0.006);
      this.velocities[idx + 2] =
        this.velocities[idx + 2] * 0.94 +
        (az * 0.015 + attractZ * 0.3 + sepZ + (bz - pz) * pull * 0.008);

      // Clamp velocity
      const speed = 1.8 + impulse * 1.0;
      const maxVel = 0.15;
      const vel = Math.sqrt(
        this.velocities[idx] ** 2 +
          this.velocities[idx + 1] ** 2 +
          this.velocities[idx + 2] ** 2
      );
      if (vel > maxVel) {
        const scale = maxVel / vel;
        this.velocities[idx] *= scale;
        this.velocities[idx + 1] *= scale;
        this.velocities[idx + 2] *= scale;
      }

      arr[idx] += this.velocities[idx] * ctx.dt * speed;
      arr[idx + 1] += this.velocities[idx + 1] * ctx.dt * speed;
      arr[idx + 2] += this.velocities[idx + 2] * ctx.dt * speed;
    }

    attr.needsUpdate = true;

    // Update shader uniforms with enhanced energy tracking
    const mat = this.points.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uProgress.value = ctx.localProgress;
    mat.uniforms.uScale.value = 1 + ctx.localProgress * 0.5 + impulse * 0.3;
    mat.uniforms.uGyro.value.set(gyro.x, gyro.y);
    mat.uniforms.uEnergy.value = clamp(impulse + ctx.localProgress * 0.5, 0, 1);

    // Camera with gyro parallax
    const cam = this.camera as THREE.PerspectiveCamera;
    const camX = (pointer.x - 0.5) * 1.5 + gyro.x * gyroInfluence * 1.2;
    const camY = (pointer.y - 0.5) * 1.0 + gyro.y * gyroInfluence * 0.8;
    cam.position.x = damp(cam.position.x, camX, 4, ctx.dt);
    cam.position.y = damp(cam.position.y, camY, 4, ctx.dt);
    cam.position.z = damp(
      cam.position.z,
      (this.baseCameraZ - ctx.localProgress * 2) * this.aspectMult,
      3,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);

    // Slow rotation of entire swarm
    this.points.rotation.y += ctx.dt * 0.05;
  }
}

class KineticTypeScene extends SceneBase {
  protected baseCameraZ = 11.5;
  private points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private basePositions: Float32Array;
  private positions: Float32Array;
  private velocities: Float32Array;
  private seeds: Float32Array;
  private groups: Float32Array;
  private color = new THREE.Color();

  constructor() {
    super('scene03');
    this.scene.background = new THREE.Color(0x070a14);
    this.scene.fog = new THREE.FogExp2(0x070a14, 0.07);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 11.5);

    const letters = [
      ['11111', '10001', '10101', '10001', '10001', '10001', '11111'],
      ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
      ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
      ['11111', '10001', '10001', '10001', '10001', '10001', '11111'],
      ['11111', '10001', '10001', '10001', '10001', '10001', '11111'],
      ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
    ];

    const spacing = 1.2;
    const pixels: THREE.Vector3[] = [];
    letters.forEach((grid, letterIndex) => {
      grid.forEach((row, y) => {
        Array.from(row).forEach((cell, x) => {
          if (cell !== '1') return;
          const px =
            (letterIndex - (letters.length - 1) / 2) * spacing +
            (x - (row.length - 1) / 2) * 0.16;
          const py = ((grid.length - 1) / 2) * 0.2 - y * 0.2;
          // Keep it compact so it doesn't fill the viewport.
          const scale = 0.78;
          const pz = (Math.random() - 0.5) * 1.1;
          pixels.push(new THREE.Vector3(px * scale, py * scale, pz));
        });
      });
    });

    // Particle typography + ambient halo field (avoids the "giant solid square" read).
    const ambientCount = 1400;
    const total = pixels.length + ambientCount;
    this.basePositions = new Float32Array(total * 3);
    this.positions = new Float32Array(total * 3);
    this.velocities = new Float32Array(total * 3);
    this.seeds = new Float32Array(total);
    this.groups = new Float32Array(total);
    const sizes = new Float32Array(total);

    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      const idx = i * 3;
      this.basePositions[idx] = p.x;
      this.basePositions[idx + 1] = p.y;
      this.basePositions[idx + 2] = p.z;
      this.positions[idx] = p.x;
      this.positions[idx + 1] = p.y;
      this.positions[idx + 2] = p.z;
      this.seeds[i] = Math.random();
      this.groups[i] = 0;
      sizes[i] = 2.8 + Math.random() * 2.2;
    }

    for (let i = 0; i < ambientCount; i++) {
      const ii = pixels.length + i;
      const idx = ii * 3;
      const a = Math.random() * Math.PI * 2;
      const r = 3.5 + Math.pow(Math.random(), 0.7) * 8.0;
      const y = (Math.random() - 0.5) * 4.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      this.basePositions[idx] = x;
      this.basePositions[idx + 1] = y;
      this.basePositions[idx + 2] = z;
      this.positions[idx] = x;
      this.positions[idx + 1] = y;
      this.positions[idx + 2] = z;
      this.seeds[ii] = Math.random();
      this.groups[ii] = 1;
      sizes[ii] = 1.4 + Math.random() * 1.7;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      'aSeed',
      new THREE.BufferAttribute(this.seeds, 1)
    );
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute(
      'aGroup',
      new THREE.BufferAttribute(this.groups, 1)
    );

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uEnergy: { value: 0 },
        uGyro: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float aSeed;
        attribute float aSize;
        attribute float aGroup;
        uniform float uTime;
        uniform float uProgress;
        uniform float uEnergy;
        uniform vec2 uGyro;
        varying float vSeed;
        varying float vGroup;
        varying float vPulse;
        varying float vEnergy;
        varying float vDist;
        void main(){
          vSeed = aSeed;
          vGroup = aGroup;
          vEnergy = uEnergy;

          // Calculate distance from center for radial effects
          vDist = length(position.xy);

          // Gyro-influenced displacement
          vec3 displaced = position;
          displaced.x += uGyro.x * 0.15 * (1.0 - aGroup);
          displaced.y += uGyro.y * 0.1 * (1.0 - aGroup);

          vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
          float atten = 240.0 / max(1.0, -mv.z);

          // Multi-frequency pulsing
          float pulse1 = 0.85 + 0.35 * sin(uTime * 1.2 + aSeed * 12.0);
          float pulse2 = 1.0 + 0.15 * sin(uTime * 2.5 + aSeed * 8.0);
          float pulse3 = 1.0 + 0.1 * sin(uTime * 4.0 + vDist * 2.0);
          float pulse = pulse1 * pulse2 * pulse3;

          float p = smoothstep(0.0, 1.0, uProgress);
          float groupBoost = mix(1.0, 0.75, aGroup);
          float energyBoost = 1.0 + uEnergy * 0.3;

          gl_PointSize = aSize * atten * (0.85 + 0.35 * p) * pulse * groupBoost * energyBoost;
          gl_Position = projectionMatrix * mv;
          vPulse = 0.25 + 0.75 * p + uEnergy * 0.2;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vSeed;
        varying float vGroup;
        varying float vPulse;
        varying float vEnergy;
        varying float vDist;
        uniform float uTime;

        // HSV to RGB conversion
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main(){
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = dot(p, p);
          float a = smoothstep(1.0, 0.0, d);
          a *= smoothstep(1.0, 0.6, d);
          if(a < 0.02) discard;

          // Dynamic rainbow hue based on position and time
          float hueBase = vSeed * 0.5 + uTime * 0.1 + vDist * 0.15;
          float hue = fract(hueBase);

          // Core color from HSV with high saturation
          vec3 coreColor = hsv2rgb(vec3(hue, 0.85, 1.0));

          // Secondary complementary color
          vec3 accentColor = hsv2rgb(vec3(fract(hue + 0.5), 0.9, 0.9));

          // Mix based on group (letters vs ambient)
          vec3 col = mix(coreColor, accentColor, vGroup * 0.6);
          col *= mix(1.2, 0.7, vGroup);

          // Energy ring effect
          float ring = smoothstep(0.7, 0.5, d) * smoothstep(0.3, 0.5, d);
          col += ring * vEnergy * vec3(0.3, 0.4, 0.6);

          // Bright core
          float core = smoothstep(0.25, 0.0, d);
          col += core * vec3(1.0, 0.95, 0.9) * vPulse * 0.6;

          // Chromatic shimmer
          float shimmer = sin(uTime * 8.0 + vSeed * 20.0) * 0.5 + 0.5;
          col += shimmer * vEnergy * vec3(0.1, 0.15, 0.2) * core;

          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.material.toneMapped = false;

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = 0.055;
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    const t = ctx.time;
    const gyro = ctx.gyro;
    const gyroActive = ctx.gyroActive;
    const gyroInfluence = gyroActive ? 0.35 : 0;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.15 + ctx.pointerVelocity.length() * 0.9,
      0,
      1
    );
    const breathe = 0.28 + 0.22 * Math.sin(t * 0.85);
    const mid = Math.sin(progress * Math.PI);
    const scatter = mid * 2.1 + breathe + impulse * 1.2;

    const pos = this.positions;
    const base = this.basePositions;
    const vel = this.velocities;

    // Pointer + gyro for interaction
    const pointerWorldX = ctx.pointer.x * 1.3 + gyro.x * gyroInfluence * 0.8;
    const pointerWorldY = ctx.pointer.y * 0.85 + gyro.y * gyroInfluence * 0.5;

    const basePull = 6.2;
    const ambientPull = 1.15;
    const spin = 1.25 + impulse * 1.1;
    const speed = 1.05 + scatter * 0.22;

    for (let i = 0; i < this.seeds.length; i++) {
      const idx = i * 3;
      const bx = base[idx];
      const by = base[idx + 1];
      const bz = base[idx + 2];

      const x = pos[idx];
      const y = pos[idx + 1];
      const z = pos[idx + 2];

      const seed = this.seeds[i];
      const group = this.groups[i];
      const pull = group < 0.5 ? basePull : ambientPull;
      const w = t * (0.8 + seed) + seed * 10.0;

      // Spring back to base (letters stay legible at ends).
      const ax = (bx - x) * pull;
      const ay = (by - y) * pull;
      const az = (bz - z) * pull;

      // Pointer curl in XY plane.
      const dx = x - pointerWorldX;
      const dy = y - pointerWorldY;
      const inv = 1.0 / (0.65 + dx * dx + dy * dy);
      const curlX = -dy * inv * (0.35 + 0.9 * mid);
      const curlY = dx * inv * (0.35 + 0.9 * mid);

      // Time turbulence.
      const sx = Math.sin(w) * 0.55 + curlX;
      const sy = Math.cos(w * 0.9) * 0.45 + curlY;
      const sz = Math.sin(w * 0.75) * 0.65;

      // Scatter peaks mid-chapter; ambient points are looser.
      const kick = scatter * (0.9 + 0.55 * group);
      const jitter = (seed - 0.5) * kick * 0.02;

      vel[idx] = vel[idx] * 0.9 + ax * 0.02 + sx * 0.02 * spin;
      vel[idx + 1] = vel[idx + 1] * 0.9 + ay * 0.02 + sy * 0.02 * spin;
      vel[idx + 2] = vel[idx + 2] * 0.9 + az * 0.02 + sz * 0.02 * spin;

      pos[idx] = x + vel[idx] * ctx.dt * speed + jitter;
      pos[idx + 1] = y + vel[idx + 1] * ctx.dt * speed + Math.sin(w) * jitter;
      pos[idx + 2] = z + vel[idx + 2] * ctx.dt * speed + Math.cos(w) * jitter;
    }

    const pAttr = this.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    pAttr.needsUpdate = true;

    // Camera with gyro parallax
    const cam = this.camera as THREE.PerspectiveCamera;
    const camX = ctx.pointer.x * 0.55 + gyro.x * gyroInfluence * 0.6;
    const camY = 0.05 + ctx.pointer.y * 0.25 + gyro.y * gyroInfluence * 0.35;
    cam.position.x = damp(cam.position.x, camX, 4, ctx.dt);
    cam.position.y = damp(cam.position.y, camY, 4, ctx.dt);
    cam.position.z = damp(
      cam.position.z,
      (this.baseCameraZ - progress * 0.9) * this.aspectMult,
      3,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);

    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uProgress.value = progress;
    this.material.uniforms.uEnergy.value = impulse;
    this.material.uniforms.uGyro.value.set(
      gyro.x * gyroInfluence,
      gyro.y * gyroInfluence
    );

    // Nudge fog density through the chapter.
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = 0.05 + progress * 0.03;

    // Keep metadata color in sync for any other consumers.
    this.color.setHSL(0.62 + progress * 0.2, 0.75, 0.6);
  }
}

/**
 * AuroraNebulaScene - A spectacular cosmic aurora display
 * Fullscreen shader with volumetric aurora bands, star field,
 * and cosmic nebula clouds. Extremely visible and mesmerizing.
 */
class AuroraNebulaScene extends SceneBase {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor() {
    super('scene04');
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uGyro: { value: new THREE.Vector2() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform vec2 uGyro;

        #define PI 3.14159265359

        // High quality hash
        float hash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        // Smooth noise
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // FBM with domain warping
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < 6; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + vec2(100.0);
            a *= 0.5;
          }
          return v;
        }

        // Simplex-ish noise for aurora ribbons
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m * m; m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Aurora ribbon function
        float aurora(vec2 uv, float t, float offset) {
          float wave = sin(uv.x * 3.0 + t * 0.8 + offset) * 0.15;
          wave += sin(uv.x * 7.0 - t * 1.2 + offset * 2.0) * 0.08;
          wave += snoise(vec2(uv.x * 2.0 + t * 0.3, t * 0.1)) * 0.12;

          float y = uv.y - 0.4 - wave;
          float ribbon = smoothstep(0.15, 0.0, abs(y)) * smoothstep(-0.5, 0.0, y);
          ribbon *= 0.6 + 0.4 * sin(uv.x * 15.0 + t * 2.0 + offset);
          return ribbon;
        }

        // Star field
        float stars(vec2 uv, float t) {
          vec2 gv = fract(uv * 50.0) - 0.5;
          vec2 id = floor(uv * 50.0);
          float n = hash(id);
          float star = smoothstep(0.1, 0.02, length(gv)) * step(0.98, n);
          star *= 0.5 + 0.5 * sin(t * (3.0 + n * 5.0) + n * 100.0);
          return star;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / uResolution.y;
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
          float t = uTime * 0.5;

          // Interaction offset
          vec2 interaction = (uPointer - 0.5) * 0.3 + uGyro * 0.2;
          p += interaction * 0.15;

          // Deep space background gradient
          vec3 bgTop = vec3(0.02, 0.01, 0.08);
          vec3 bgBot = vec3(0.0, 0.02, 0.05);
          vec3 col = mix(bgBot, bgTop, uv.y);

          // Nebula clouds - base layer
          float nebula1 = fbm(p * 1.5 + vec2(t * 0.1, 0.0));
          float nebula2 = fbm(p * 2.5 - vec2(0.0, t * 0.08));
          float nebula3 = fbm(p * 0.8 + vec2(t * 0.05, t * 0.03));

          vec3 nebCol1 = vec3(0.3, 0.1, 0.5) * nebula1 * 0.6;
          vec3 nebCol2 = vec3(0.1, 0.2, 0.4) * nebula2 * 0.5;
          vec3 nebCol3 = vec3(0.4, 0.2, 0.3) * nebula3 * 0.4;
          col += nebCol1 + nebCol2 + nebCol3;

          // Star field
          float starField = stars(p + interaction, t);
          starField += stars(p * 0.5 - interaction, t * 0.7) * 0.5;
          col += vec3(1.0, 0.95, 0.8) * starField;

          // AURORA BANDS - the main visual spectacle
          // Green aurora (primary)
          float aur1 = aurora(p + vec2(0.0, interaction.y * 0.5), t, 0.0);
          vec3 green = vec3(0.2, 1.0, 0.4);
          col += green * aur1 * (1.2 + uProgress * 0.8);

          // Cyan aurora
          float aur2 = aurora(p + vec2(0.3, -0.1 + interaction.y * 0.3), t * 0.9, 2.0);
          vec3 cyan = vec3(0.3, 0.8, 1.0);
          col += cyan * aur2 * 0.9 * (0.8 + uProgress * 0.6);

          // Magenta aurora (edges)
          float aur3 = aurora(p + vec2(-0.2, 0.05 + interaction.y * 0.4), t * 1.1, 4.5);
          vec3 magenta = vec3(1.0, 0.3, 0.7);
          col += magenta * aur3 * 0.7 * uProgress;

          // Purple underlayer
          float aur4 = aurora(p * 0.8 + vec2(0.1, -0.15), t * 0.7, 1.5);
          vec3 purple = vec3(0.5, 0.2, 0.9);
          col += purple * aur4 * 0.6;

          // Vertical aurora curtains (the "dancing" effect)
          float curtain = 0.0;
          for (float i = 0.0; i < 5.0; i++) {
            float cx = p.x + sin(t * 0.5 + i) * 0.3;
            float cy = p.y - 0.2 + i * 0.05;
            float wave = sin(cx * 8.0 + t * 2.0 + i * 1.5) * 0.1;
            wave += snoise(vec2(cx * 3.0 + t, i)) * 0.15;
            float c = smoothstep(0.2, 0.0, abs(cy - wave)) * smoothstep(-0.3, 0.1, cy);
            c *= (0.7 + 0.3 * sin(cx * 20.0 + t * 3.0 + i));
            curtain += c * (1.0 - i * 0.15);
          }
          vec3 curtainCol = mix(green, cyan, sin(t + p.x * 3.0) * 0.5 + 0.5);
          col += curtainCol * curtain * 0.5 * (0.7 + uProgress * 0.5);

          // Bright corona effect around aurora
          float corona = (aur1 + aur2 + aur3) * 0.3;
          corona = pow(corona, 0.5) * 0.4;
          col += vec3(0.8, 1.0, 0.9) * corona;

          // Shooting stars / meteors
          float meteor = 0.0;
          for (float i = 0.0; i < 3.0; i++) {
            vec2 mp = p + vec2(mod(t * (0.5 + i * 0.2) + i * 2.0, 4.0) - 2.0, -mod(t * (0.3 + i * 0.15) + i * 1.5, 3.0) + 1.5);
            float m = smoothstep(0.02, 0.0, length(mp));
            // Trail
            m += smoothstep(0.15, 0.0, mp.x) * smoothstep(-0.002, 0.002, mp.y) * step(0.0, mp.x) * 0.3;
            meteor += m * step(0.7, fract(t * 0.1 + i * 0.3));
          }
          col += vec3(1.0, 0.9, 0.8) * meteor;

          // Subtle lens glow in center
          float glow = smoothstep(0.8, 0.0, length(p)) * 0.15;
          col += vec3(0.3, 0.5, 0.4) * glow * (1.0 + sin(t) * 0.2);

          // Color grading
          col = pow(col, vec3(0.95)); // Slight lift
          col *= 1.1; // Overall brightness boost

          // Vignette
          float vig = smoothstep(1.2, 0.3, length(p));
          col *= 0.6 + 0.5 * vig;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
  }

  update(ctx: SceneRuntime): void {
    const gyroActive = ctx.gyroActive;
    const gyroInfluence = gyroActive ? 0.5 : 0;
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uPointer.value.set(ctx.pointer.x, ctx.pointer.y);
    this.material.uniforms.uGyro.value.set(
      ctx.gyro.x * gyroInfluence,
      ctx.gyro.y * gyroInfluence
    );
  }

  resize(ctx: SceneRuntime): void {
    super.resize(ctx);
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
  }
}

/**
 * EventHorizonScene - A spectacular black hole with gravitational lensing
 * Features: accretion disk, light bending, relativistic jets, and intense visual drama
 */
class EventHorizonScene extends SceneBase {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor() {
    super('scene05');
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uTap: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uGyro: { value: new THREE.Vector2() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform float uTap;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform vec2 uGyro;

        #define PI 3.14159265359
        #define TAU 6.28318530718

        // High quality hash
        float hash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1, 0)), f.x),
            mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = rot * p * 2.0;
            a *= 0.5;
          }
          return v;
        }

        // Gravitational lensing distortion
        vec2 gravLens(vec2 p, vec2 center, float mass) {
          vec2 d = p - center;
          float dist = length(d);
          float strength = mass / (dist * dist + 0.01);
          return p - normalize(d) * strength * 0.15;
        }

        // Star field with gravitational effects
        float starField(vec2 uv, float t, vec2 bhPos, float bhMass) {
          float stars = 0.0;
          for (float i = 0.0; i < 3.0; i++) {
            vec2 gv = fract(uv * (40.0 + i * 15.0)) - 0.5;
            vec2 id = floor(uv * (40.0 + i * 15.0));

            // Distort by black hole
            float n = hash(id + i);
            vec2 starPos = uv + gv * 0.02;
            float distToBH = length(starPos - bhPos);

            // Stars get stretched near event horizon
            float stretch = smoothstep(0.3, 0.1, distToBH);
            gv.x *= 1.0 + stretch * 3.0;

            float star = smoothstep(0.12 - stretch * 0.08, 0.02, length(gv));
            star *= step(0.96, n);
            star *= 0.5 + 0.5 * sin(t * (2.0 + n * 4.0) + n * 100.0);

            // Redshift near black hole
            float redshift = smoothstep(0.15, 0.05, distToBH);
            stars += star * (1.0 - redshift * 0.7);
          }
          return stars;
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / uResolution.y;
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
          float t = uTime * 0.3;

          float tap = clamp(uTap, 0.0, 1.0);

          // Black hole center with interaction
          vec2 bhPos = vec2(0.0) + (uPointer - 0.5) * 0.15 + uGyro * 0.1;
          float bhMass = 0.8 + uProgress * 0.4 + tap * 0.25;

          // Apply gravitational lensing
          vec2 lensed = gravLens(p, bhPos, bhMass);
          float distToBH = length(p - bhPos);

          // Deep space background
          vec3 col = vec3(0.0);

          // Distant nebula (heavily distorted by lensing)
          float nebula = fbm(lensed * 2.0 + vec2(t * 0.05, 0.0));
          nebula += fbm(lensed * 4.0 - vec2(0.0, t * 0.03)) * 0.5;
          vec3 nebulaCol = mix(
            vec3(0.1, 0.02, 0.15),
            vec3(0.02, 0.05, 0.15),
            nebula
          ) * 0.4;
          col += nebulaCol;

          // Star field with lensing
          float stars = starField(lensed, t, bhPos, bhMass);
          col += vec3(1.0, 0.95, 0.9) * stars * 0.8;

          // Einstein ring (light bent around the black hole)
          float ringRadius = 0.22 + uProgress * 0.08;
          float ringDist = abs(distToBH - ringRadius);
          float einsteinRing = smoothstep(0.05, 0.01, ringDist);
          einsteinRing *= smoothstep(0.0, 0.1, distToBH); // fade at center
          // Slight spectral tint to feel more "real" + interactive overdrive
          vec3 ringCol = mix(vec3(1.0, 0.75, 0.45), vec3(0.55, 0.85, 1.0), 0.25 + 0.25 * sin(t * 2.0 + ringRadius * 22.0));
          ringCol *= einsteinRing * (1.5 + tap * 1.2);
          col += ringCol;

          // Accretion disk
          float diskAngle = atan(p.y - bhPos.y, p.x - bhPos.x);
          float diskRadius = distToBH;

          // Disk shape (toroidal, tilted)
          float diskY = (p.y - bhPos.y) * 2.5; // Tilt
          float diskPlane = exp(-diskY * diskY * 15.0);
          float diskInner = smoothstep(0.08, 0.15, diskRadius);
          float diskOuter = smoothstep(0.6, 0.25, diskRadius);
          float disk = diskPlane * diskInner * diskOuter;

          // Disk rotation and turbulence
          float diskNoise = fbm(vec2(diskAngle * 3.0 + t * 2.0, diskRadius * 10.0));
          float diskSpiral = sin(diskAngle * 8.0 - t * 5.0 - diskRadius * 20.0) * 0.5 + 0.5;
          diskSpiral += sin(diskAngle * 3.0 + t * 3.0 + diskRadius * 15.0) * 0.3;
          disk *= 0.5 + diskSpiral * 0.5 + diskNoise * 0.3;

          // Doppler shift - approaching side brighter, receding dimmer
          float doppler = sin(diskAngle + t * 0.5) * 0.5 + 0.5;

          // Disk color gradient (hot inner to cooler outer)
          vec3 diskHot = vec3(1.0, 0.9, 0.7); // White-hot inner
          vec3 diskWarm = vec3(1.0, 0.5, 0.2); // Orange middle
          vec3 diskCool = vec3(0.8, 0.2, 0.3); // Red outer
          vec3 diskColor = mix(diskHot, diskWarm, smoothstep(0.1, 0.3, diskRadius));
          diskColor = mix(diskColor, diskCool, smoothstep(0.3, 0.5, diskRadius));
          diskColor *= 0.6 + doppler * 0.8; // Doppler beaming

          col += diskColor * disk * (2.0 + uProgress + tap * 1.2);

          // Relativistic jets
          float jetAngle = abs(p.x - bhPos.x);
          float jetDist = abs(p.y - bhPos.y);
          float jet = smoothstep(0.06, 0.01, jetAngle) * smoothstep(0.0, 0.1, jetDist);
          jet *= smoothstep(0.8, 0.15, jetDist); // Fade out
          float jetPulse = fbm(vec2(jetDist * 15.0 - t * 8.0, p.x * 5.0));
          jet *= 0.5 + jetPulse * 0.8;

          // Jet glow
          vec3 jetCol = vec3(0.35, 0.6, 1.0) * jet * (1.35 + tap * 1.0) * uProgress;
          col += jetCol;

          // Event horizon (pure black center)
          float eventHorizon = smoothstep(0.12, 0.08, distToBH);
          col *= 1.0 - eventHorizon;

          // Photon sphere glow (just outside event horizon)
          float photonSphere = smoothstep(0.12, 0.14, distToBH) * smoothstep(0.18, 0.14, distToBH);
          col += vec3(1.0, 0.6, 0.3) * photonSphere * 0.8;

          // Hawking radiation particles
          float hawking = 0.0;
          for (float i = 0.0; i < 8.0; i++) {
            float angle = i * TAU / 8.0 + t * 0.3 + sin(t + i) * 0.5;
            float rad = 0.13 + sin(t * 2.0 + i * 1.5) * 0.02;
            vec2 particlePos = bhPos + vec2(cos(angle), sin(angle)) * rad;
            float particle = smoothstep(0.015, 0.005, length(p - particlePos));
            hawking += particle * (0.5 + 0.5 * sin(t * 10.0 + i * 3.0));
          }
          col += vec3(0.8, 0.9, 1.0) * hawking * 0.6;

          // Interaction shockwave (tap = brief energy pulse)
          float swR = 0.16 + fract(uTime * 0.12) * 0.75;
          float shock = exp(-abs(distToBH - swR) * 70.0) * tap;
          col += vec3(0.55, 0.8, 1.0) * shock * 0.9;

          // Gravitational wave ripples (subtle)
          float wave = sin(distToBH * 40.0 - t * 6.0) * 0.5 + 0.5;
          wave *= smoothstep(0.5, 0.15, distToBH) * smoothstep(0.12, 0.2, distToBH);
          col += vec3(0.2, 0.3, 0.5) * wave * 0.15 * uProgress;

          // Overall glow
          float glow = smoothstep(0.6, 0.1, distToBH) * 0.3;
          col += vec3(0.5, 0.3, 0.2) * glow;

          // Vignette
          float vig = smoothstep(1.3, 0.4, length(p));
          col *= 0.5 + 0.6 * vig;

          // Boost overall brightness
          col *= 1.3 + tap * 0.25;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
  }

  update(ctx: SceneRuntime): void {
    const gyroActive = ctx.gyroActive;
    const gyroInfluence = gyroActive ? 0.5 : 0;
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uTap.value = ctx.tap;
    this.material.uniforms.uPointer.value.set(ctx.pointer.x, ctx.pointer.y);
    this.material.uniforms.uGyro.value.set(
      ctx.gyro.x * gyroInfluence,
      ctx.gyro.y * gyroInfluence
    );
  }

  resize(ctx: SceneRuntime): void {
    super.resize(ctx);
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
  }
}

class BlueprintScene extends SceneBase {
  protected baseCameraZ = 5.0;
  private lines: THREE.LineSegments[] = [];
  private glowMeshes: THREE.Mesh[] = [];
  private scanLine: THREE.Mesh | null = null;
  private gridMesh: THREE.LineSegments | null = null;
  private hue = 205;

  constructor() {
    super('scene06');
    // Darker background for high contrast
    this.scene.background = new THREE.Color(0x020610);
    this.scene.fog = new THREE.FogExp2(0x020610, 0.04);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 5.0);

    // Many more geometric objects for a complex blueprint
    const geometries = [
      new THREE.BoxGeometry(1.8, 1.0, 1.2, 6, 4, 4),
      new THREE.ConeGeometry(0.9, 1.8, 12, 4),
      new THREE.CylinderGeometry(0.5, 0.7, 1.4, 16, 4),
      new THREE.TorusGeometry(0.6, 0.2, 8, 24),
      new THREE.OctahedronGeometry(0.8, 1),
      new THREE.TorusKnotGeometry(0.5, 0.15, 64, 8, 2, 3),
      new THREE.IcosahedronGeometry(0.7, 1),
    ];

    // Create both wireframe and glow versions for each shape
    geometries.forEach((geo, i) => {
      const edges = new THREE.EdgesGeometry(geo);

      // Main wireframe - BRIGHT and visible
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.58, 1.0, 0.7),
        transparent: true,
        opacity: 1.0,
        linewidth: 2,
      });
      const line = new THREE.LineSegments(edges, mat);

      // Arrange in a grid pattern
      const col = i % 3;
      const row = Math.floor(i / 3);
      line.position.set((col - 1) * 2.2, (row - 1) * 1.8, -row * 0.8);
      line.scale.setScalar(0.9);

      this.scene.add(line);
      this.lines.push(line);

      // Add glow mesh behind each wireframe
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.58, 1.0, 0.5),
        transparent: true,
        opacity: 0.15,
        wireframe: true,
      });
      const glowMesh = new THREE.Mesh(geo, glowMat);
      glowMesh.position.copy(line.position);
      glowMesh.rotation.copy(line.rotation);
      glowMesh.scale.setScalar(0.92);
      this.scene.add(glowMesh);
      this.glowMeshes.push(glowMesh);
    });

    // Add grid floor
    const gridGeo = new THREE.BufferGeometry();
    const gridVerts: number[] = [];
    const gridSize = 8;
    const gridStep = 0.5;
    for (let i = -gridSize; i <= gridSize; i += gridStep) {
      gridVerts.push(-gridSize, -2, i, gridSize, -2, i);
      gridVerts.push(i, -2, -gridSize, i, -2, gridSize);
    }
    gridGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(gridVerts, 3)
    );
    const gridMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x1a4a7a),
      transparent: true,
      opacity: 0.4,
    });
    this.gridMesh = new THREE.LineSegments(gridGeo, gridMat);
    this.scene.add(this.gridMesh);

    // Add scanning line effect
    const scanGeo = new THREE.PlaneGeometry(20, 0.08);
    const scanMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x00ffff),
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    this.scanLine = new THREE.Mesh(scanGeo, scanMat);
    this.scanLine.rotation.x = Math.PI / 2;
    this.scene.add(this.scanLine);

    // Bright lighting
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(2, 5, 4);
    this.scene.add(key);

    const ambient = new THREE.AmbientLight(0x4488ff, 0.6);
    this.scene.add(ambient);

    const point1 = new THREE.PointLight(0x00ffff, 1.5, 15);
    point1.position.set(-3, 2, 3);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0x8844ff, 1.2, 12);
    point2.position.set(3, -1, 2);
    this.scene.add(point2);
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    const gyro = ctx.gyro;
    const gyroActive = ctx.gyroActive;
    const gyroInfluence = gyroActive ? 0.4 : 0;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.05 + ctx.pointerVelocity.length() * 0.8,
      0,
      1
    );
    const t = ctx.time;
    this.hue = damp(
      this.hue,
      180 + progress * 60 + Math.sin(t * 0.25) * 25 + impulse * 20,
      2,
      ctx.dt
    );

    // Scanning line animation
    if (this.scanLine) {
      const scanY = Math.sin(t * 0.8) * 3;
      this.scanLine.position.y = scanY;
      (this.scanLine.material as THREE.MeshBasicMaterial).opacity =
        0.4 + Math.abs(Math.sin(t * 2)) * 0.4;
    }

    // Object rotation responds to gyro
    const gyroRotX = gyro.x * gyroInfluence * 0.5;
    const gyroRotY = gyro.y * gyroInfluence * 0.4;

    this.lines.forEach((line, i) => {
      // Rotation
      line.rotation.y +=
        ctx.dt * (0.15 + i * 0.05) +
        Math.sin(t * 0.22 + i) * 0.003 +
        gyroRotX * 0.03;
      line.rotation.x +=
        ctx.dt * 0.08 + Math.cos(t * 0.28 + i * 0.5) * 0.002 + gyroRotY * 0.02;

      // Pulsing scale
      const pulse = 1 + Math.sin(t * 2 + i * 0.7) * 0.05;
      line.scale.setScalar(0.9 * pulse);

      const mat = line.material as THREE.LineBasicMaterial;
      // Cycle through cyan to blue to purple
      mat.color.setHSL(this.hue / 360, 1.0, 0.65 + Math.sin(t + i) * 0.1);
      // HIGH base opacity for visibility
      mat.opacity =
        0.8 + progress * 0.2 + Math.abs(Math.sin(t * 1.5 + i * 0.7)) * 0.2;

      // Sync glow mesh
      if (this.glowMeshes[i]) {
        this.glowMeshes[i].rotation.copy(line.rotation);
        this.glowMeshes[i].scale.copy(line.scale).multiplyScalar(1.02);
        const glowMat = this.glowMeshes[i].material as THREE.MeshBasicMaterial;
        glowMat.color.setHSL(this.hue / 360, 1.0, 0.5);
        glowMat.opacity = 0.1 + progress * 0.15;
      }
    });

    // Grid pulse
    if (this.gridMesh) {
      const gridMat = this.gridMesh.material as THREE.LineBasicMaterial;
      gridMat.opacity = 0.25 + progress * 0.25 + Math.sin(t * 0.5) * 0.1;
    }

    // Camera with gyro parallax
    const cam = this.camera as THREE.PerspectiveCamera;
    const camX = (ctx.pointer.x - 0.5) * 0.8 + gyro.x * gyroInfluence * 0.6;
    const camY = (ctx.pointer.y - 0.5) * 0.5 + gyro.y * gyroInfluence * 0.4;
    cam.position.x = damp(cam.position.x, camX, 4, ctx.dt);
    cam.position.y = damp(cam.position.y, camY, 4, ctx.dt);
    cam.position.z = damp(
      cam.position.z,
      (this.baseCameraZ - progress * 1.2) * this.aspectMult,
      3,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);
  }
}

class InkScene extends SceneBase {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor() {
    super('scene07');
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2() },
        uGyro: { value: new THREE.Vector2() },
        uAspect: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform vec2 uGyro;
        uniform float uAspect;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
          for (int i = 0; i < 6; i++) {
            v += a * noise(p);
            p = m * p;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;

          // FIXED aspect ratio handling for both portrait and landscape
          // This ensures the ink effect fills the screen properly on mobile
          vec2 p = uv - 0.5;
          if (uAspect > 1.0) {
            // Landscape: stretch X
            p.x *= uAspect;
          } else {
            // Portrait: stretch Y (inverse aspect)
            p.y /= uAspect;
          }

          float t = uTime * 0.2;

          // Combined pointer and gyro influence (scaled for portrait)
          vec2 interaction = (uPointer - 0.5) * 0.5 + uGyro * 0.4;

          // Curl-ish advection - made more dramatic
          vec2 q = p;
          q += vec2(sin(q.y * 2.5 + t), cos(q.x * 2.3 - t)) * 0.12;
          q += interaction * 0.3;

          // Secondary swirl - continuous motion
          q += vec2(
            sin(t * 1.1 + p.x * 4.5),
            cos(t * 0.9 + p.y * 4.0)
          ) * 0.05;

          // Gyro flow
          q += uGyro * 0.2 * (1.0 + sin(t * 0.6));

          // Multi-layer FBM for richer ink texture
          float n1 = fbm(q * 2.5 + t * 0.8);
          float n2 = fbm(q * 4.5 - t * 0.5);
          float n3 = fbm(q * 1.5 + vec2(t * 0.3, -t * 0.2));

          float ink = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
          ink = smoothstep(0.25, 0.75, ink);

          // Progress-based reveal with smoother transition
          float reveal = smoothstep(0.0, 1.0, uProgress);

          // Central silhouette that emerges
          float dist = length(p * vec2(0.8, 1.0) + interaction * 0.2);
          float silhouette = smoothstep(0.6, 0.1, dist);

          // Blend ink and silhouette based on progress
          float body = mix(ink * 0.6, ink * 0.4 + silhouette * 0.6, reveal);
          body = clamp(body, 0.0, 1.0);

          // Richer color palette
          vec3 deepBg = vec3(0.01, 0.015, 0.025);
          vec3 inkBlue = vec3(0.15, 0.25, 0.45);
          vec3 inkCyan = vec3(0.3, 0.55, 0.75);
          vec3 highlight = vec3(0.7, 0.85, 1.0);

          vec3 col = deepBg;
          col = mix(col, inkBlue, smoothstep(0.0, 0.4, body));
          col = mix(col, inkCyan, smoothstep(0.3, 0.7, body));
          col = mix(col, highlight, smoothstep(0.6, 1.0, body) * 0.6);

          // Shimmering edges
          float edgeX = abs(dFdx(body));
          float edgeY = abs(dFdy(body));
          float edge = smoothstep(0.1, 0.0, edgeX + edgeY);
          col += edge * vec3(0.3, 0.45, 0.7) * 0.8;

          // Subtle flow lines
          float flowLine = sin(q.x * 20.0 + q.y * 15.0 + t * 2.0) * 0.5 + 0.5;
          flowLine *= smoothstep(0.2, 0.5, body) * smoothstep(0.8, 0.5, body);
          col += flowLine * vec3(0.1, 0.15, 0.25) * 0.3;

          // Vignette (adjusted for aspect)
          float vigDist = length(p * vec2(1.0 / max(uAspect, 1.0), min(uAspect, 1.0)));
          float vig = smoothstep(1.2, 0.3, vigDist);
          col *= 0.6 + 0.5 * vig;

          // Boost overall brightness
          col *= 1.2;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
  }

  update(ctx: SceneRuntime): void {
    const gyroActive = ctx.gyroActive;
    const gyroInfluence = gyroActive ? 0.5 : 0;
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uPointer.value.set(ctx.pointer.x, ctx.pointer.y);
    this.material.uniforms.uGyro.value.set(
      ctx.gyro.x * gyroInfluence,
      ctx.gyro.y * gyroInfluence
    );
  }

  resize(ctx: SceneRuntime): void {
    super.resize(ctx);
    const aspect = ctx.size.width / ctx.size.height;
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
    this.material.uniforms.uAspect.value = aspect;
  }
}

class ClothScene extends SceneBase {
  protected baseCameraZ = 6;
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    super('scene08');
    this.scene.background = new THREE.Color(0x070a14);
    const geo = new THREE.PlaneGeometry(5, 3.2, 140, 90);
    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uWind: { value: 0 },
      uGyro: { value: new THREE.Vector2() },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vPos;
        varying vec3 vN;
        uniform float uTime;
        uniform float uProgress;
        uniform float uWind;
        uniform vec2 uGyro;
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin((pos.x + uTime * 1.3) * 2.2) * 0.09;
          float ripple = cos((pos.y + uTime * 1.7) * 3.4) * 0.06;
          float gust = sin(uTime * 0.8 + pos.x * 1.7) * 0.16 * uWind;
          float wrinkle = sin((pos.x + pos.y) * 6.0 + uTime * 2.0) * 0.015;

          // Gyro-influenced wave direction
          float gyroWave = sin(pos.x * 2.0 + uGyro.x * 3.0 + uTime) * 0.05 * abs(uGyro.x);
          float gyroRipple = cos(pos.y * 2.0 + uGyro.y * 3.0 + uTime) * 0.04 * abs(uGyro.y);

          float waveSum = wave + ripple + gust + wrinkle + gyroWave + gyroRipple;
          vWave = waveSum;
          pos.z += waveSum;
          pos.x += sin(uTime + pos.y * 1.3) * 0.06 * uProgress;
          pos.x += uGyro.x * 0.1 * (1.0 - abs(pos.x) * 0.3); // cloth shifts with tilt
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          vPos = mv.xyz;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vPos;
        varying vec3 vN;
        void main() {
          vec3 a = vec3(0.04, 0.06, 0.09);
          vec3 b = vec3(0.42, 0.55, 0.78);
          vec3 base = mix(a, b, smoothstep(0.0, 1.0, vUv.x));

          // Fake weave + sheen
          float weave = sin(vUv.x * 180.0) * sin(vUv.y * 120.0);
          float sheen = smoothstep(-0.02, 0.08, vWave) * 0.65;
          base += weave * 0.03;
          base += sheen * vec3(0.25, 0.35, 0.55);

          // Reconstructed normal from screen-space derivatives for real lighting
          vec3 dpdx = dFdx(vPos);
          vec3 dpdy = dFdy(vPos);
          vec3 n = normalize(cross(dpdx, dpdy));
          // Keep it stable-ish when derivatives are degenerate
          n = normalize(mix(vN, n, 0.85));

          vec3 lightDirA = normalize(vec3(0.4, 0.75, 0.55));
          vec3 lightDirB = normalize(vec3(-0.7, 0.25, 0.6));
          float diff = clamp(dot(n, lightDirA), 0.0, 1.0) * 0.8 +
                       clamp(dot(n, lightDirB), 0.0, 1.0) * 0.45;
          vec3 viewDir = normalize(-vPos);
          vec3 h = normalize(lightDirA + viewDir);
          float spec = pow(clamp(dot(n, h), 0.0, 1.0), 48.0);
          base *= 0.55 + diff * 0.75;
          base += spec * vec3(0.55, 0.75, 1.1) * (0.25 + sheen * 0.9);

          // Edge darkening for depth
          float edge = smoothstep(0.95, 0.6, abs(vUv.x - 0.5) * 2.0);
          base *= 0.8 + 0.2 * edge;
          gl_FragColor = vec4(base, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0.2, 6);
  }

  update(ctx: SceneRuntime): void {
    const gyro = ctx.gyro;
    const gyroActive = ctx.gyroActive;
    const gyroInfluence = gyroActive ? 0.4 : 0;

    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uWind.value = clamp(
      ctx.localProgress +
        Math.abs(ctx.pointer.x) * 0.6 +
        Math.abs(gyro.x) * gyroInfluence * 0.3,
      0,
      1
    );
    this.material.uniforms.uGyro.value.set(
      gyro.x * gyroInfluence,
      gyro.y * gyroInfluence
    );

    // Cloth rotation with combined pointer and gyro
    this.mesh.rotation.y = ctx.pointer.x * 0.2 + gyro.x * gyroInfluence * 0.25;
    this.mesh.rotation.x = ctx.pointer.y * 0.1 + gyro.y * gyroInfluence * 0.15;

    // Camera parallax
    const cam = this.camera as THREE.PerspectiveCamera;
    const camX = (ctx.pointer.x - 0.5) * 0.5 + gyro.x * gyroInfluence * 0.4;
    const camY =
      0.2 + (ctx.pointer.y - 0.5) * 0.3 + gyro.y * gyroInfluence * 0.25;
    cam.position.x = damp(cam.position.x, camX, 4, ctx.dt);
    cam.position.y = damp(cam.position.y, camY, 4, ctx.dt);
    cam.position.z = damp(
      cam.position.z,
      (this.baseCameraZ - ctx.localProgress * 1.5) * this.aspectMult,
      3,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);
  }
}

class PointCloudScene extends SceneBase {
  protected baseCameraZ = 7;
  private points: THREE.Points;
  private base: Float32Array;
  private target: Float32Array;
  private color = new THREE.Color();

  constructor() {
    super('scene09');
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.08);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 7);

    const geoA = new THREE.TorusKnotGeometry(1.25, 0.34, 520, 28);
    const geoB = new THREE.IcosahedronGeometry(1.6, 6);
    const positionsA = geoA.getAttribute('position').array as Float32Array;
    const positionsB = geoB.getAttribute('position').array as Float32Array;

    const count = Math.min(positionsA.length, positionsB.length);
    const pos = new Float32Array(count);
    const base = new Float32Array(count);
    const target = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      base[i] = positionsA[i];
      target[i] = positionsB[i];
      pos[i] = positionsA[i];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Enhanced shader material for morphing point cloud
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uEnergy: { value: 0 },
        uGyro: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uEnergy;
        uniform vec2 uGyro;
        varying float vDepth;
        varying float vMorph;
        varying float vEnergy;

        void main() {
          vMorph = uProgress;
          vEnergy = uEnergy;

          // Gyro-influenced rotation
          vec3 pos = position;
          float gyroAngle = uGyro.x * 0.3;
          float c = cos(gyroAngle);
          float s = sin(gyroAngle);
          pos.xz = mat2(c, -s, s, c) * pos.xz;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vDepth = -mvPosition.z;

          // Multi-frequency pulsing size
          float pulse1 = 1.0 + 0.2 * sin(uTime * 2.0 + length(position) * 3.0);
          float pulse2 = 1.0 + 0.15 * sin(uTime * 3.5 + position.y * 4.0);
          float pulse = pulse1 * pulse2;

          // Size varies with morph progress and energy
          float baseSize = 2.5 + uProgress * 2.0 + uEnergy * 1.5;

          gl_PointSize = baseSize * pulse * (180.0 / vDepth);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        varying float vDepth;
        varying float vMorph;
        varying float vEnergy;

        // HSV to RGB
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.15, dist);

          // Color transitions through morph
          float hue = 0.55 + vMorph * 0.2 + sin(uTime * 0.3 + vDepth * 0.1) * 0.05;
          vec3 color = hsv2rgb(vec3(hue, 0.85, 0.9));

          // Energy-based color shift
          color = mix(color, vec3(1.0, 0.8, 0.6), vEnergy * 0.3);

          // Bright core
          float core = smoothstep(0.2, 0.0, dist);
          color += vec3(0.4, 0.5, 0.6) * core;

          // Ring effect during morph
          float ring = smoothstep(0.4, 0.3, dist) * smoothstep(0.2, 0.3, dist);
          color += ring * vEnergy * vec3(0.2, 0.3, 0.4);

          gl_FragColor = vec4(color, alpha * (0.6 + vMorph * 0.4 + vEnergy * 0.2));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.base = base;
    this.target = target;
    this.scene.add(this.points);
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    const t = ctx.time;
    const gyro = ctx.gyro;
    const gyroActive = ctx.gyroActive;
    const gyroInfluence = gyroActive ? 0.4 : 0;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.1 + ctx.pointerVelocity.length() * 0.85,
      0,
      1
    );
    const geo = this.points.geometry as THREE.BufferGeometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    // Morph with a living "scan" jitter that never fully stops.
    for (let i = 0; i < arr.length; i += 3) {
      const bx = this.base[i];
      const by = this.base[i + 1];
      const bz = this.base[i + 2];

      const tx = this.target[i];
      const ty = this.target[i + 1];
      const tz = this.target[i + 2];

      const mx = lerp(bx, tx, progress);
      const my = lerp(by, ty, progress);
      const mz = lerp(bz, tz, progress);

      const id = i * 0.003;
      const w = t * 0.9 + id;
      const jitter = 0.018 + impulse * 0.06;

      // Pointer + gyro interaction
      const px = ctx.pointer.x - 0.5 + gyro.x * gyroInfluence;
      const py = ctx.pointer.y - 0.5 + gyro.y * gyroInfluence;

      arr[i] =
        mx + Math.sin(w + mx * 1.4) * jitter + px * 0.22 * (0.2 + impulse);
      arr[i + 1] =
        my +
        Math.cos(w * 1.1 + my * 1.2) * jitter +
        py * 0.18 * (0.2 + impulse);
      arr[i + 2] = mz + Math.sin(w * 0.8 + mz * 1.6) * jitter;
    }
    attr.needsUpdate = true;

    // Update shader uniforms
    const mat = this.points.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uProgress.value = progress;
    mat.uniforms.uEnergy.value = impulse;
    mat.uniforms.uGyro.value.set(
      gyro.x * gyroInfluence,
      gyro.y * gyroInfluence
    );

    // Heavy camera drift for depth with gyro parallax.
    const cam = this.camera as THREE.PerspectiveCamera;
    const camX = ctx.pointer.x * 0.6 + gyro.x * gyroInfluence * 0.5;
    const camY = ctx.pointer.y * 0.35 + gyro.y * gyroInfluence * 0.3;
    cam.position.x = damp(cam.position.x, camX, 3, ctx.dt);
    cam.position.y = damp(cam.position.y, camY, 3, ctx.dt);
    cam.position.z = damp(
      cam.position.z,
      (this.baseCameraZ - progress * 2) * this.aspectMult,
      3,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);

    // Rotation with gyro influence
    this.points.rotation.y +=
      ctx.dt * (0.12 + Math.abs(ctx.scrollVelocity) * 0.08) +
      gyro.x * gyroInfluence * 0.005;
    this.points.rotation.x = damp(
      this.points.rotation.x,
      ctx.pointer.y * 0.35 + gyro.y * gyroInfluence * 0.25,
      4,
      ctx.dt
    );

    this.points.rotation.z = damp(
      this.points.rotation.z,
      Math.sin(t * 0.2) * 0.15 +
        ctx.pointer.x * 0.18 +
        gyro.x * gyroInfluence * 0.15,
      3,
      ctx.dt
    );
  }
}

class FractalScene extends RaymarchScene {
  constructor() {
    super('scene10', 2);
  }
}

// ============================================================================
// SCENE 11 - NEURAL NETWORK CONSTELLATION
// ============================================================================
class NeuralNetworkScene extends SceneBase {
  protected baseCameraZ = 12;
  private nodes: THREE.InstancedMesh;
  private connections: THREE.LineSegments;
  private pulses: THREE.Points;
  private nodePositions: Float32Array;
  private nodeActivation: Float32Array;
  private connectionPairs: Uint16Array;
  private pulsePositions: Float32Array;
  private pulseProgress: Float32Array;
  private dummy = new THREE.Object3D();
  private nodeCount = 180;
  private connectionCount = 350;
  private pulseCount = 120;

  constructor() {
    super('scene11');
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x020408, 0.04);

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 12);

    // Lighting
    const ambient = new THREE.AmbientLight(0x334466, 0.4);
    const key = new THREE.PointLight(0x88ccff, 1.5, 50);
    key.position.set(5, 8, 10);
    const rim = new THREE.PointLight(0xff6688, 0.8, 40);
    rim.position.set(-8, -4, -6);
    this.scene.add(ambient, key, rim);

    // Initialize arrays
    this.nodePositions = new Float32Array(this.nodeCount * 3);
    this.nodeActivation = new Float32Array(this.nodeCount);
    this.connectionPairs = new Uint16Array(this.connectionCount * 2);
    this.pulsePositions = new Float32Array(this.pulseCount * 3);
    this.pulseProgress = new Float32Array(this.pulseCount);

    // Create node positions in clusters (neural layers)
    const layers = 5;
    const layerSpacing = 4;
    let nodeIdx = 0;
    for (let layer = 0; layer < layers; layer++) {
      const nodesInLayer = Math.floor(
        this.nodeCount / layers + (layer === 2 ? 10 : 0)
      );
      const layerZ = (layer - layers / 2) * layerSpacing;
      for (let i = 0; i < nodesInLayer && nodeIdx < this.nodeCount; i++) {
        const angle = (i / nodesInLayer) * Math.PI * 2 + layer * 0.3;
        const radius = 2 + Math.random() * 3;
        const idx = nodeIdx * 3;
        this.nodePositions[idx] =
          Math.cos(angle) * radius + (Math.random() - 0.5) * 1.5;
        this.nodePositions[idx + 1] =
          Math.sin(angle) * radius + (Math.random() - 0.5) * 1.5;
        this.nodePositions[idx + 2] = layerZ + (Math.random() - 0.5) * 2;
        this.nodeActivation[nodeIdx] = Math.random();
        nodeIdx++;
      }
    }

    // Create instanced nodes (neurons) with enhanced materials
    const nodeGeo = new THREE.SphereGeometry(0.14, 16, 12);
    const nodeMat = new THREE.MeshPhysicalMaterial({
      color: 0x66aaff,
      emissive: 0x3366aa,
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      iridescence: 0.5,
      iridescenceIOR: 1.3,
    });
    this.nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, this.nodeCount);
    this.scene.add(this.nodes);

    // Position nodes
    for (let i = 0; i < this.nodeCount; i++) {
      const idx = i * 3;
      this.dummy.position.set(
        this.nodePositions[idx],
        this.nodePositions[idx + 1],
        this.nodePositions[idx + 2]
      );
      this.dummy.scale.setScalar(0.8 + this.nodeActivation[i] * 0.4);
      this.dummy.updateMatrix();
      this.nodes.setMatrixAt(i, this.dummy.matrix);
    }
    this.nodes.instanceMatrix.needsUpdate = true;

    // Create connections (synapses)
    const connectionPositions = new Float32Array(this.connectionCount * 6);
    for (let c = 0; c < this.connectionCount; c++) {
      const fromNode = Math.floor(Math.random() * this.nodeCount);
      let toNode = Math.floor(Math.random() * this.nodeCount);
      // Prefer connecting to nearby layers
      if (Math.random() > 0.3) {
        const fromZ = this.nodePositions[fromNode * 3 + 2];
        let bestDist = Infinity;
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = Math.floor(Math.random() * this.nodeCount);
          const candZ = this.nodePositions[candidate * 3 + 2];
          const dz = Math.abs(candZ - fromZ);
          if (dz > 2 && dz < 6 && dz < bestDist) {
            toNode = candidate;
            bestDist = dz;
          }
        }
      }
      this.connectionPairs[c * 2] = fromNode;
      this.connectionPairs[c * 2 + 1] = toNode;

      const fi = fromNode * 3;
      const ti = toNode * 3;
      const ci = c * 6;
      connectionPositions[ci] = this.nodePositions[fi];
      connectionPositions[ci + 1] = this.nodePositions[fi + 1];
      connectionPositions[ci + 2] = this.nodePositions[fi + 2];
      connectionPositions[ci + 3] = this.nodePositions[ti];
      connectionPositions[ci + 4] = this.nodePositions[ti + 1];
      connectionPositions[ci + 5] = this.nodePositions[ti + 2];
    }

    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(connectionPositions, 3)
    );
    const connMat = new THREE.LineBasicMaterial({
      color: 0x4488cc,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    this.connections = new THREE.LineSegments(connGeo, connMat);
    this.scene.add(this.connections);

    // Create data pulses
    for (let p = 0; p < this.pulseCount; p++) {
      this.pulseProgress[p] = Math.random();
      const connIdx = Math.floor(Math.random() * this.connectionCount);
      const fi = this.connectionPairs[connIdx * 2] * 3;
      const ti = this.connectionPairs[connIdx * 2 + 1] * 3;
      const prog = this.pulseProgress[p];
      const pi = p * 3;
      this.pulsePositions[pi] = lerp(
        this.nodePositions[fi],
        this.nodePositions[ti],
        prog
      );
      this.pulsePositions[pi + 1] = lerp(
        this.nodePositions[fi + 1],
        this.nodePositions[ti + 1],
        prog
      );
      this.pulsePositions[pi + 2] = lerp(
        this.nodePositions[fi + 2],
        this.nodePositions[ti + 2],
        prog
      );
    }

    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.pulsePositions, 3)
    );

    // Enhanced pulse material with custom shader for energy glow
    const pulseMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uColor1: { value: new THREE.Color(0xffdd88) },
        uColor2: { value: new THREE.Color(0x88ffff) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uEnergy;
        varying float vPulse;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Pulse effect based on position
          float pulse = 1.0 + 0.3 * sin(uTime * 4.0 + position.x * 2.0 + position.z * 2.0);
          vPulse = pulse * (0.8 + uEnergy * 0.4);

          gl_PointSize = (10.0 + uEnergy * 6.0) * pulse * (250.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying float vPulse;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Soft glow with core
          float alpha = smoothstep(0.5, 0.1, dist);
          float core = smoothstep(0.2, 0.0, dist);

          // Blend colors based on pulse
          vec3 color = mix(uColor1, uColor2, sin(uTime * 2.0 + vPulse) * 0.5 + 0.5);
          color += vec3(1.0, 0.95, 0.9) * core * 0.8;

          // Outer glow ring
          float ring = smoothstep(0.45, 0.35, dist) * smoothstep(0.25, 0.35, dist);
          color += uColor2 * ring * 0.5;

          gl_FragColor = vec4(color * vPulse, alpha * 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pulses = new THREE.Points(pulseGeo, pulseMat);
    this.scene.add(this.pulses);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.2 + ctx.pointerVelocity.length() * 0.9,
      0,
      1
    );

    // Animate node activations
    const nodeMat = this.nodes.material as THREE.MeshStandardMaterial;
    nodeMat.emissiveIntensity = 0.4 + progress * 0.5 + impulse * 0.3;

    // Update node scales based on activation waves
    for (let i = 0; i < this.nodeCount; i++) {
      const idx = i * 3;
      const x = this.nodePositions[idx];
      const y = this.nodePositions[idx + 1];
      const z = this.nodePositions[idx + 2];

      // Activation wave from pointer
      const px = (ctx.pointer.x - 0.5) * 12;
      const py = (ctx.pointer.y - 0.5) * 8;
      const dist = Math.hypot(x - px, y - py);
      const wave = Math.sin(t * 2 - dist * 0.5) * 0.5 + 0.5;
      const activation = clamp(
        wave * (1 + impulse) + Math.sin(t + i * 0.1) * 0.2,
        0,
        1
      );

      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(0.7 + activation * 0.6);
      this.dummy.updateMatrix();
      this.nodes.setMatrixAt(i, this.dummy.matrix);

      // Update color based on activation
      const color = new THREE.Color().setHSL(
        0.55 + activation * 0.15,
        0.8,
        0.5 + activation * 0.3
      );
      this.nodes.setColorAt(i, color);
    }
    this.nodes.instanceMatrix.needsUpdate = true;
    if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true;

    // Animate pulses along connections
    const pulseAttr = this.pulses.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const pulseSpeed = 0.4 + progress * 0.3 + impulse * 0.5;
    for (let p = 0; p < this.pulseCount; p++) {
      this.pulseProgress[p] += ctx.dt * pulseSpeed;
      if (this.pulseProgress[p] > 1) {
        this.pulseProgress[p] = 0;
      }
      const connIdx = p % this.connectionCount;
      const fi = this.connectionPairs[connIdx * 2] * 3;
      const ti = this.connectionPairs[connIdx * 2 + 1] * 3;
      const prog = this.pulseProgress[p];
      const pi = p * 3;
      this.pulsePositions[pi] = lerp(
        this.nodePositions[fi],
        this.nodePositions[ti],
        prog
      );
      this.pulsePositions[pi + 1] = lerp(
        this.nodePositions[fi + 1],
        this.nodePositions[ti + 1],
        prog
      );
      this.pulsePositions[pi + 2] = lerp(
        this.nodePositions[fi + 2],
        this.nodePositions[ti + 2],
        prog
      );
    }
    pulseAttr.needsUpdate = true;

    // Update pulse shader uniforms
    const pulseMat = this.pulses.material as THREE.ShaderMaterial;
    pulseMat.uniforms.uTime.value = t;
    pulseMat.uniforms.uEnergy.value = impulse + progress * 0.5;

    // Rotate the entire network
    this.nodes.rotation.y = t * 0.08 + ctx.pointer.x * 0.3;
    this.nodes.rotation.x = Math.sin(t * 0.05) * 0.1 + ctx.pointer.y * 0.2;
    this.connections.rotation.copy(this.nodes.rotation);
    this.pulses.rotation.copy(this.nodes.rotation);

    // Camera
    const cam = this.camera as THREE.PerspectiveCamera;
    const targetZ = (this.baseCameraZ - progress * 4) * this.aspectMult;
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 2.5, 3, ctx.dt);
    cam.position.y = damp(cam.position.y, ctx.pointer.y * 1.5, 3, ctx.dt);
    cam.position.z = damp(cam.position.z, targetZ, 3, ctx.dt);
    cam.lookAt(0, 0, 0);

    // Connection opacity
    const connMat = this.connections.material as THREE.LineBasicMaterial;
    connMat.opacity = 0.15 + progress * 0.2 + impulse * 0.15;
  }
}

// ============================================================================
// SCENE 12 - IMPOSSIBLE LIBRARY OF BABEL
// ============================================================================
class LibraryScene extends SceneBase {
  protected baseCameraZ = 8;
  private rooms: THREE.Group;
  private books: THREE.InstancedMesh;
  private candles: THREE.PointLight[] = [];
  private bookCount = 800;
  private dummy = new THREE.Object3D();

  constructor() {
    super('scene12');
    this.scene.background = new THREE.Color(0x0a0806);
    this.scene.fog = new THREE.FogExp2(0x0a0806, 0.08);

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 8);

    // Warm ambient lighting
    const ambient = new THREE.AmbientLight(0x332211, 0.3);
    this.scene.add(ambient);

    this.rooms = new THREE.Group();
    this.scene.add(this.rooms);

    // Create hexagonal room structure
    const roomRadius = 4;
    const wallHeight = 6;
    const shelfCount = 8;

    // Floor and ceiling
    const hexShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = Math.cos(angle) * roomRadius;
      const z = Math.sin(angle) * roomRadius;
      if (i === 0) hexShape.moveTo(x, z);
      else hexShape.lineTo(x, z);
    }
    hexShape.closePath();

    const floorGeo = new THREE.ShapeGeometry(hexShape);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1510,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -wallHeight / 2;
    this.rooms.add(floor);

    const ceiling = floor.clone();
    ceiling.position.y = wallHeight / 2;
    ceiling.rotation.x = Math.PI / 2;
    this.rooms.add(ceiling);

    // Create bookshelves on walls
    const shelfGeo = new THREE.BoxGeometry(2.8, 0.08, 0.4);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x2a1f15,
      roughness: 0.8,
    });

    for (let wall = 0; wall < 6; wall++) {
      const angle = (wall / 6) * Math.PI * 2;
      const wallX = Math.cos(angle) * (roomRadius - 0.3);
      const wallZ = Math.sin(angle) * (roomRadius - 0.3);

      for (let shelf = 0; shelf < shelfCount; shelf++) {
        const shelfMesh = new THREE.Mesh(shelfGeo, shelfMat);
        shelfMesh.position.set(
          wallX,
          -wallHeight / 2 + 0.6 + shelf * 0.7,
          wallZ
        );
        shelfMesh.rotation.y = angle + Math.PI / 2;
        this.rooms.add(shelfMesh);
      }
    }

    // Create instanced books
    const bookGeo = new THREE.BoxGeometry(0.06, 0.35, 0.25);
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0x663322,
      roughness: 0.7,
    });
    this.books = new THREE.InstancedMesh(bookGeo, bookMat, this.bookCount);
    this.scene.add(this.books);

    // Position books on shelves
    let bookIdx = 0;
    for (let wall = 0; wall < 6 && bookIdx < this.bookCount; wall++) {
      const angle = (wall / 6) * Math.PI * 2;
      const wallX = Math.cos(angle) * (roomRadius - 0.35);
      const wallZ = Math.sin(angle) * (roomRadius - 0.35);

      for (
        let shelf = 0;
        shelf < shelfCount && bookIdx < this.bookCount;
        shelf++
      ) {
        const shelfY = -wallHeight / 2 + 0.8 + shelf * 0.7;
        const booksOnShelf = 12 + Math.floor(Math.random() * 6);

        for (let b = 0; b < booksOnShelf && bookIdx < this.bookCount; b++) {
          const offset = (b - booksOnShelf / 2) * 0.08;
          const perpAngle = angle + Math.PI / 2;

          this.dummy.position.set(
            wallX + Math.cos(perpAngle) * offset,
            shelfY + (Math.random() - 0.5) * 0.02,
            wallZ + Math.sin(perpAngle) * offset
          );
          this.dummy.rotation.y = angle + (Math.random() - 0.5) * 0.1;
          this.dummy.scale.set(
            0.8 + Math.random() * 0.4,
            0.7 + Math.random() * 0.6,
            0.8 + Math.random() * 0.4
          );
          this.dummy.updateMatrix();
          this.books.setMatrixAt(bookIdx, this.dummy.matrix);

          // Varied book colors
          const hue = 0.05 + Math.random() * 0.1;
          const sat = 0.3 + Math.random() * 0.4;
          const lit = 0.15 + Math.random() * 0.25;
          const bookColor = new THREE.Color().setHSL(hue, sat, lit);
          this.books.setColorAt(bookIdx, bookColor);
          bookIdx++;
        }
      }
    }
    this.books.instanceMatrix.needsUpdate = true;
    if (this.books.instanceColor) this.books.instanceColor.needsUpdate = true;

    // Add candles
    for (let c = 0; c < 4; c++) {
      const angle = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const candle = new THREE.PointLight(0xffaa55, 0.8, 8, 2);
      candle.position.set(Math.cos(angle) * 2, 1.5, Math.sin(angle) * 2);
      this.candles.push(candle);
      this.scene.add(candle);
    }

    // Distant rooms (parallax layers)
    for (let d = 0; d < 3; d++) {
      const distantRoom = this.rooms.clone();
      distantRoom.scale.setScalar(0.5);
      const dAngle = (d / 3) * Math.PI * 2;
      distantRoom.position.set(
        Math.cos(dAngle) * 12,
        0,
        Math.sin(dAngle) * 12 - 15
      );
      distantRoom.rotation.y = dAngle;
      this.scene.add(distantRoom);
    }
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.0 + ctx.pointerVelocity.length() * 0.7,
      0,
      1
    );

    // Candle flicker
    this.candles.forEach((candle, i) => {
      const flicker =
        Math.sin(t * 8 + i * 2) * 0.15 + Math.sin(t * 13 + i) * 0.1;
      candle.intensity = 0.6 + flicker + progress * 0.3 + impulse * 0.15;
    });

    // Subtle room rotation
    this.rooms.rotation.y = t * 0.03 + ctx.pointer.x * 0.2;

    // Books subtle movement
    const bookMat = this.books.material as THREE.MeshStandardMaterial;
    bookMat.emissive = new THREE.Color(0x110800);
    bookMat.emissiveIntensity = progress * 0.3;

    // Camera
    const cam = this.camera as THREE.PerspectiveCamera;
    const targetZ = (this.baseCameraZ - progress * 3) * this.aspectMult;
    cam.position.x = damp(
      cam.position.x,
      ctx.pointer.x * 1.5 + Math.sin(t * 0.2) * 0.3,
      3,
      ctx.dt
    );
    cam.position.y = damp(cam.position.y, ctx.pointer.y * 1.0, 3, ctx.dt);
    cam.position.z = damp(cam.position.z, targetZ, 3, ctx.dt);
    cam.lookAt(0, 0, -2);

    // Fog density
    const fog = this.scene.fog as THREE.FogExp2;
    if (fog) fog.density = 0.06 + progress * 0.03;
  }
}

// ============================================================================
// SCENE 13 - BIOLUMINESCENT ORGANISMS
// ============================================================================
class BioluminescentScene extends SceneBase {
  protected baseCameraZ = 10;
  private jellyfish: THREE.Group[] = [];
  private plankton: THREE.Points;
  private planktonPositions: Float32Array;
  private planktonVelocities: Float32Array;
  private planktonCount = 3000;
  private causticPlane: THREE.Mesh;
  private shafts: THREE.Mesh[] = [];
  private burst = 0;

  constructor() {
    super('scene13');
    this.scene.background = new THREE.Color(0x000812);
    this.scene.fog = new THREE.FogExp2(0x000812, 0.035);

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 10);

    // Deep sea ambient
    const ambient = new THREE.AmbientLight(0x001122, 0.2);
    this.scene.add(ambient);

    // Soft overhead beam lighting (helps depth perception)
    const top = new THREE.DirectionalLight(0x66ccff, 0.4);
    top.position.set(0, 8, 6);
    this.scene.add(top);

    // Create jellyfish
    for (let j = 0; j < 5; j++) {
      const jelly = this.createJellyfish();
      jelly.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 8 - 3
      );
      jelly.scale.setScalar(0.5 + Math.random() * 0.8);
      jelly.userData.baseScale = jelly.scale.clone();
      jelly.userData.basePosition = jelly.position.clone();
      this.jellyfish.push(jelly);
      this.scene.add(jelly);
    }

    // Volumetric-ish light shafts (cheap, additive)
    for (let s = 0; s < 3; s++) {
      const geo = new THREE.CylinderGeometry(0.2, 5.5, 18, 18, 1, true);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uBurst: { value: 0 } },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uBurst;
          varying vec3 vPos;
          void main() {
            float h = (vPos.y + 9.0) / 18.0;
            float radial = 1.0 - smoothstep(0.0, 5.5, length(vPos.xz));
            float flick = 0.55 + 0.45 * sin(uTime * 0.7 + vPos.x * 0.2 + vPos.z * 0.2);
            float a = radial * (1.0 - h) * 0.08 * flick * (1.0 + uBurst * 1.3);
            vec3 col = mix(vec3(0.05, 0.25, 0.35), vec3(0.25, 0.65, 0.85), h);
            gl_FragColor = vec4(col, a);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 10, 5, -6 + Math.random() * 6);
      mesh.rotation.z = (Math.random() - 0.5) * 0.25;
      mesh.rotation.x = (Math.random() - 0.5) * 0.15;
      this.shafts.push(mesh);
      this.scene.add(mesh);
    }

    // Create plankton cloud
    this.planktonPositions = new Float32Array(this.planktonCount * 3);
    this.planktonVelocities = new Float32Array(this.planktonCount * 3);
    for (let i = 0; i < this.planktonCount; i++) {
      const idx = i * 3;
      this.planktonPositions[idx] = (Math.random() - 0.5) * 20;
      this.planktonPositions[idx + 1] = (Math.random() - 0.5) * 12;
      this.planktonPositions[idx + 2] = (Math.random() - 0.5) * 16 - 4;
      this.planktonVelocities[idx] = (Math.random() - 0.5) * 0.02;
      this.planktonVelocities[idx + 1] = (Math.random() - 0.5) * 0.02;
      this.planktonVelocities[idx + 2] = (Math.random() - 0.5) * 0.02;
    }

    const planktonGeo = new THREE.BufferGeometry();
    planktonGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.planktonPositions, 3)
    );

    // Enhanced plankton with bioluminescent shader
    const planktonMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uBurst: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uBurst;
        varying float vGlow;
        varying float vDepth;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mvPosition.z;

          // Organic pulsing glow
          float pulse = sin(uTime * 2.0 + position.x * 0.5 + position.y * 0.3) * 0.5 + 0.5;
          float flicker = sin(uTime * 8.0 + position.z * 2.0) * 0.3 + 0.7;
          vGlow = pulse * flicker * (0.6 + uProgress * 0.6) * (1.0 + uBurst * 1.4);

          // Size varies with glow
          float size = 3.0 + vGlow * 4.0;

          gl_PointSize = size * (180.0 / vDepth);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBurst;
        varying float vGlow;
        varying float vDepth;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Soft circular glow
          float alpha = smoothstep(0.5, 0.0, dist) * vGlow;

          // Color varies between cyan and green with depth
          float colorMix = sin(uTime * 0.5 + vDepth * 0.1) * 0.5 + 0.5;
          vec3 cyan = vec3(0.4, 0.9, 1.0);
          vec3 green = vec3(0.5, 1.0, 0.6);
          vec3 color = mix(cyan, green, colorMix);

          // Core brightness
          float core = smoothstep(0.15, 0.0, dist);
          color += vec3(0.3, 0.2, 0.1) * core;

          gl_FragColor = vec4(color * (0.8 + vGlow * 0.4) * (1.0 + uBurst * 0.35), alpha * (0.85 + uBurst * 0.1));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.plankton = new THREE.Points(planktonGeo, planktonMat);
    this.scene.add(this.plankton);

    // Caustic light plane (simulated)
    const causticGeo = new THREE.PlaneGeometry(30, 30, 1, 1);
    const causticMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uBurst: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBurst;
        varying vec2 vUv;

        float caustic(vec2 uv, float t) {
          vec2 p = uv * 8.0;
          float c = 0.0;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            p += vec2(sin(p.y + t * 0.3 + fi), cos(p.x + t * 0.2 + fi * 1.3)) * 0.5;
            c += sin(p.x + p.y + t * 0.4) * 0.3;
          }
          return smoothstep(0.3, 0.7, c * 0.5 + 0.5);
        }

        void main() {
          float c = caustic(vUv, uTime);
          vec3 color = vec3(0.1, 0.4, 0.5) * c;
          gl_FragColor = vec4(color * (1.0 + uBurst * 0.35), c * (0.15 + uBurst * 0.08));
        }
      `,
    });
    this.causticPlane = new THREE.Mesh(causticGeo, causticMat);
    this.causticPlane.position.y = -5;
    this.causticPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.causticPlane);
  }

  private createJellyfish(): THREE.Group {
    const group = new THREE.Group();

    // Bell (dome)
    const bellGeo = new THREE.SphereGeometry(
      1,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const bellMat = new THREE.MeshPhysicalMaterial({
      color: 0x4488ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
      transmission: 0.3,
      roughness: 0.2,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const bell = new THREE.Mesh(bellGeo, bellMat);
    group.add(bell);

    // Inner glow
    const innerGeo = new THREE.SphereGeometry(0.7, 16, 12);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 0.2;
    group.add(inner);

    // Tentacles (simplified as lines)
    const tentacleCount = 8;
    for (let t = 0; t < tentacleCount; t++) {
      const angle = (t / tentacleCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const segments = 12;
      for (let s = 0; s <= segments; s++) {
        const y = -s * 0.3;
        const wave = Math.sin(s * 0.5) * 0.2;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * (0.5 + wave),
            y,
            Math.sin(angle) * (0.5 + wave)
          )
        );
      }
      const tentGeo = new THREE.BufferGeometry().setFromPoints(points);
      const tentMat = new THREE.LineBasicMaterial({
        color: 0x66ddff,
        transparent: true,
        opacity: 0.5,
      });
      const tentacle = new THREE.Line(tentGeo, tentMat);
      tentacle.userData.basePoints = points.map(p => p.clone());
      group.add(tentacle);
    }

    // Point light for glow
    const glow = new THREE.PointLight(0x44aaff, 0.5, 4);
    glow.position.y = 0.3;
    group.add(glow);

    return group;
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.1 + ctx.pointerVelocity.length() * 0.8,
      0,
      1
    );

    this.burst = Math.max(ctx.tap, damp(this.burst, 0, 3.0, ctx.dt));

    // Animate jellyfish
    this.jellyfish.forEach((jelly, i) => {
      const baseScale =
        (jelly.userData.baseScale as THREE.Vector3 | undefined) ??
        new THREE.Vector3(0.8, 0.8, 0.8);
      const basePos =
        (jelly.userData.basePosition as THREE.Vector3 | undefined) ??
        new THREE.Vector3();

      // Pulsing motion
      const pulse = Math.sin(t * 1.5 + i * 2) * 0.1 + 1;
      jelly.scale.x = baseScale.x;
      jelly.scale.z = baseScale.z;
      jelly.scale.y = baseScale.y * pulse;

      // Gentle drift (stable around a base position)
      jelly.position.x = basePos.x + Math.cos(t * 0.25 + i * 1.2) * 0.35;
      jelly.position.y = basePos.y + Math.sin(t * 0.35 + i * 1.4) * 0.45;
      jelly.position.z = basePos.z + Math.sin(t * 0.18 + i) * 0.25;

      // Tentacle animation
      jelly.children.forEach((child, ci) => {
        if (child instanceof THREE.Line && child.userData.basePoints) {
          const geo = child.geometry as THREE.BufferGeometry;
          const posAttr = geo.getAttribute('position');
          const basePoints = child.userData.basePoints as THREE.Vector3[];
          for (let p = 0; p < basePoints.length; p++) {
            const bp = basePoints[p];
            const wave = Math.sin(t * 2 + p * 0.5 + ci) * (p * 0.03);
            posAttr.setXYZ(p, bp.x + wave, bp.y, bp.z + wave * 0.5);
          }
          posAttr.needsUpdate = true;
        }
      });

      // Glow intensity
      const glow = jelly.children.find(
        c => c instanceof THREE.PointLight
      ) as THREE.PointLight;
      if (glow) {
        glow.intensity =
          0.35 + Math.sin(t * 2 + i) * 0.2 + progress * 0.3 + this.burst * 0.8;
      }
    });

    // Animate plankton
    const planktonAttr = this.plankton.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const pointerX = (ctx.pointer.x - 0.5) * 15;
    const pointerY = (ctx.pointer.y - 0.5) * 10;

    for (let i = 0; i < this.planktonCount; i++) {
      const idx = i * 3;
      let x = this.planktonPositions[idx];
      let y = this.planktonPositions[idx + 1];
      let z = this.planktonPositions[idx + 2];

      // Attraction to pointer
      const dx = pointerX - x;
      const dy = pointerY - y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        const force = (1 - dist / 4) * 0.01 * (1 + impulse);
        this.planktonVelocities[idx] += dx * force;
        this.planktonVelocities[idx + 1] += dy * force;
      }

      // Apply velocity with damping
      this.planktonVelocities[idx] *= 0.98;
      this.planktonVelocities[idx + 1] *= 0.98;
      this.planktonVelocities[idx + 2] *= 0.98;

      x += this.planktonVelocities[idx];
      y += this.planktonVelocities[idx + 1];
      z += this.planktonVelocities[idx + 2];

      // Bounds
      if (Math.abs(x) > 10) x *= 0.99;
      if (Math.abs(y) > 6) y *= 0.99;
      if (Math.abs(z) > 10) z *= 0.99;

      this.planktonPositions[idx] = x;
      this.planktonPositions[idx + 1] = y;
      this.planktonPositions[idx + 2] = z;
    }
    planktonAttr.needsUpdate = true;

    // Update plankton shader uniforms
    const planktonMat = this.plankton.material as THREE.ShaderMaterial;
    planktonMat.uniforms.uTime.value = t;
    planktonMat.uniforms.uProgress.value = progress;
    planktonMat.uniforms.uBurst.value = this.burst;

    // Caustic animation
    const causticMat = this.causticPlane.material as THREE.ShaderMaterial;
    causticMat.uniforms.uTime.value = t;
    causticMat.uniforms.uBurst.value = this.burst;

    // Shafts
    this.shafts.forEach((shaft, i) => {
      shaft.rotation.y = t * 0.04 + i * 1.7;
      const mat = shaft.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uBurst.value = this.burst;
    });

    // Camera
    const cam = this.camera as THREE.PerspectiveCamera;
    const targetZ = (this.baseCameraZ - progress * 4) * this.aspectMult;
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 2, 3, ctx.dt);
    cam.position.y = damp(
      cam.position.y,
      ctx.pointer.y * 1.5 - progress * 2,
      3,
      ctx.dt
    );
    cam.position.z = damp(cam.position.z, targetZ, 3, ctx.dt);
    cam.lookAt(0, -1, -3);
  }
}

// ============================================================================
// SCENE 14 - HOLOGRAPHIC DATA ARCHITECTURE
// ============================================================================
class HolographicCityScene extends SceneBase {
  protected baseCameraZ = 16;

  private city: THREE.Group;
  private buildings: THREE.InstancedMesh;
  private windows: THREE.InstancedMesh;
  private buildingCount = 144;
  private windowCount = 0;

  private buildingCenters: THREE.Vector3[] = [];
  private buildingSizes: { w: number; h: number; d: number }[] = [];
  private dummy = new THREE.Object3D();

  private ground: THREE.Mesh;
  private streetLines: THREE.LineSegments;

  private dataStreams: THREE.Points;
  private streamPositions: Float32Array;
  private streamVelocities: Float32Array;
  private streamCount = 2600;

  private traffic: THREE.Points;
  private trafficPositions: Float32Array;
  private trafficSpeeds: Float32Array;
  private trafficCount = 900;

  private codeRain: THREE.Points;
  private codePositions: Float32Array;
  private codeCount = 1400;

  private overclock = 0;
  private lookTarget = new THREE.Vector3(0, 1.5, -8);

  constructor() {
    super('scene14');
    this.scene.background = new THREE.Color(0x020810);
    this.scene.fog = new THREE.FogExp2(0x020810, 0.025);

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 5, 15);

    // Cyberpunk lighting (more city-like: overhead haze + street neon)
    const ambient = new THREE.AmbientLight(0x0b1a2a, 0.55);
    const key = new THREE.DirectionalLight(0xaad0ff, 0.65);
    key.position.set(10, 18, 10);
    const neonPink = new THREE.PointLight(0xff1bb7, 2.0, 44, 2);
    neonPink.position.set(-12, 8, -4);
    const neonCyan = new THREE.PointLight(0x3dffff, 2.2, 44, 2);
    neonCyan.position.set(12, 7, -14);
    this.scene.add(ambient, key, neonPink, neonCyan);

    this.city = new THREE.Group();
    this.scene.add(this.city);

    // Ground plane (gives the city a "surface")
    const groundGeo = new THREE.PlaneGeometry(70, 70, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x040810,
      roughness: 0.95,
      metalness: 0.05,
      emissive: new THREE.Color(0x02060d),
      emissiveIntensity: 0.6,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -3.05;
    this.city.add(this.ground);

    // Street/grid lines (denser, with a stronger "avenue" emphasis)
    const gridSize = 64;
    const divisions = 64;
    const gridPoints: number[] = [];
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const pos = (i / divisions) * gridSize;
      gridPoints.push(-gridSize / 2, -3, pos, gridSize / 2, -3, pos);
      gridPoints.push(pos, -3, -gridSize / 2, pos, -3, gridSize / 2);
    }
    const streetGeo = new THREE.BufferGeometry();
    streetGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(gridPoints, 3)
    );
    const streetMat = new THREE.LineBasicMaterial({
      color: 0x0aa0ff,
      transparent: true,
      opacity: 0.22,
    });
    this.streetLines = new THREE.LineSegments(streetGeo, streetMat);
    this.city.add(this.streetLines);

    // Buildings (instanced boxes) + windows (instanced emissive quads)
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x071023,
      roughness: 0.55,
      metalness: 0.35,
      emissive: new THREE.Color(0x061a2e),
      emissiveIntensity: 0.35,
    });
    this.buildings = new THREE.InstancedMesh(
      bodyGeo,
      bodyMat,
      this.buildingCount
    );
    this.buildings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.city.add(this.buildings);

    const windowGeo = new THREE.PlaneGeometry(0.12, 0.085);
    const windowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    // Layout: a real "city" grid with an empty main avenue
    const spanX = 12;
    const spanZ = 12;
    const stepX = 2.4;
    const stepZ = 2.6;
    const centerZ = -8;

    // Precompute buildings, then create windows
    this.buildingCenters = [];
    this.buildingSizes = [];

    let bi = 0;
    for (let z = 0; z < spanZ && bi < this.buildingCount; z++) {
      for (let x = 0; x < spanX && bi < this.buildingCount; x++) {
        const gx = (x - (spanX - 1) / 2) * stepX;
        const gz = (z - (spanZ - 1) / 2) * stepZ + centerZ;

        // Main avenue gap + side streets
        const avenue = Math.abs(gx) < 1.2;
        const crossStreet = Math.abs(gz - centerZ) < 1.1;
        const streetSkip = avenue || (crossStreet && Math.random() < 0.65);
        if (streetSkip) continue;

        const dist = Math.hypot(gx * 0.8, (gz - centerZ) * 0.6);
        const downtown = Math.max(0, 1 - dist / 14);
        const h = 2.2 + Math.random() * 6.0 + downtown * 10.0;
        const w = 0.9 + Math.random() * 1.6;
        const d = 0.9 + Math.random() * 1.6;

        this.dummy.position.set(
          gx + (Math.random() - 0.5) * 0.35,
          -3 + h / 2,
          gz + (Math.random() - 0.5) * 0.35
        );
        this.dummy.rotation.y = (Math.random() - 0.5) * 0.25;
        this.dummy.scale.set(w, h, d);
        this.dummy.updateMatrix();
        this.buildings.setMatrixAt(bi, this.dummy.matrix);

        this.buildingCenters.push(this.dummy.position.clone());
        this.buildingSizes.push({ w, h, d });
        bi++;
      }
    }

    // If we skipped too many for streets, fill remaining with far silhouettes
    while (bi < this.buildingCount) {
      const gx = (Math.random() - 0.5) * 34;
      const gz = centerZ + (Math.random() - 0.5) * 34;
      const h = 2.0 + Math.random() * 14.0;
      const w = 0.8 + Math.random() * 1.8;
      const d = 0.8 + Math.random() * 1.8;
      this.dummy.position.set(gx, -3 + h / 2, gz);
      this.dummy.rotation.y = (Math.random() - 0.5) * 0.35;
      this.dummy.scale.set(w, h, d);
      this.dummy.updateMatrix();
      this.buildings.setMatrixAt(bi, this.dummy.matrix);
      this.buildingCenters.push(this.dummy.position.clone());
      this.buildingSizes.push({ w, h, d });
      bi++;
    }
    this.buildings.instanceMatrix.needsUpdate = true;

    // Windows: cap instance count to stay mobile-friendly
    const maxWindows = 6500;
    const winColors = [
      new THREE.Color(0x3dffff),
      new THREE.Color(0xffa340),
      new THREE.Color(0xff2bd6),
      new THREE.Color(0xa6ff3d),
    ];

    // Rough estimate; we will stop at maxWindows
    this.windows = new THREE.InstancedMesh(windowGeo, windowMat, maxWindows);
    this.windows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.windows.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(maxWindows * 3),
      3
    );
    this.city.add(this.windows);

    let wi = 0;
    for (let i = 0; i < this.buildingCenters.length && wi < maxWindows; i++) {
      const center = this.buildingCenters[i];
      const size = this.buildingSizes[i];
      const floors = clamp(Math.floor(size.h / 0.55), 4, 18);
      const cols = clamp(Math.floor((size.w + size.d) * 3.2), 3, 10);

      // Four faces: +Z, -Z, +X, -X
      const faces: Array<{
        nx: number;
        nz: number;
        rotY: number;
        span: number;
      }> = [
        { nx: 0, nz: 1, rotY: 0, span: size.w },
        { nx: 0, nz: -1, rotY: Math.PI, span: size.w },
        { nx: 1, nz: 0, rotY: -Math.PI / 2, span: size.d },
        { nx: -1, nz: 0, rotY: Math.PI / 2, span: size.d },
      ];

      for (const face of faces) {
        if (wi >= maxWindows) break;
        // Not every building face gets heavy windows (depth + variation)
        if (Math.random() < 0.15) continue;

        for (let fy = 0; fy < floors && wi < maxWindows; fy++) {
          const y = -3 + 0.35 + fy * (size.h / floors);
          for (let cx = 0; cx < cols && wi < maxWindows; cx++) {
            if (Math.random() < 0.35) continue; // sparsity
            const frac = (cx + 0.5) / cols;
            const offset = (frac - 0.5) * face.span * 0.85;

            const px =
              center.x +
              face.nx * (size.w / 2 + 0.02) +
              (face.nz !== 0 ? offset : 0);
            const pz =
              center.z +
              face.nz * (size.d / 2 + 0.02) +
              (face.nx !== 0 ? offset : 0);

            this.dummy.position.set(px, y, pz);
            this.dummy.rotation.set(0, face.rotY, 0);
            this.dummy.scale.setScalar(0.85 + Math.random() * 0.35);
            this.dummy.updateMatrix();
            this.windows.setMatrixAt(wi, this.dummy.matrix);

            const c = winColors[(i + fy + cx) % winColors.length];
            this.windows.setColorAt(wi, c);
            wi++;
          }
        }
      }
    }
    this.windowCount = wi;
    this.windows.count = this.windowCount;
    this.windows.instanceMatrix.needsUpdate = true;
    if (this.windows.instanceColor)
      this.windows.instanceColor.needsUpdate = true;

    // Data streams (rising packets around rooftops)
    this.streamPositions = new Float32Array(this.streamCount * 3);
    this.streamVelocities = new Float32Array(this.streamCount * 3);
    for (let i = 0; i < this.streamCount; i++) {
      const idx = i * 3;
      const b = this.buildingCenters[i % this.buildingCenters.length];
      this.streamPositions[idx] = b.x + (Math.random() - 0.5) * 1.6;
      this.streamPositions[idx + 1] = -2.8 + Math.random() * 14;
      this.streamPositions[idx + 2] = b.z + (Math.random() - 0.5) * 1.6;
      this.streamVelocities[idx] = (Math.random() - 0.5) * 0.02;
      this.streamVelocities[idx + 1] = 0.08 + Math.random() * 0.18;
      this.streamVelocities[idx + 2] = (Math.random() - 0.5) * 0.02;
    }

    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.streamPositions, 3)
    );

    // Enhanced data stream shader with trails
    const streamMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uOverclock: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uOverclock;
        varying float vGlow;
        varying float vColorPhase;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Pulse based on height
          float heightPulse = sin(uTime * 3.0 + position.y * 2.0) * 0.5 + 0.5;
          vGlow = heightPulse * (0.7 + uProgress * 0.5) * (1.0 + uOverclock * 0.9);
          vColorPhase = position.y * 0.1 + uTime * 0.5;

          float size = 5.0 + vGlow * 4.0;
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vGlow;
        varying float vColorPhase;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.1, dist) * vGlow;

          // Color cycles between orange and cyan
          vec3 orange = vec3(1.0, 0.4, 0.0);
          vec3 cyan = vec3(0.0, 0.8, 1.0);
          vec3 color = mix(orange, cyan, sin(vColorPhase) * 0.5 + 0.5);

          // Core brightness
          float core = smoothstep(0.15, 0.0, dist);
          color += vec3(1.0, 0.9, 0.8) * core * 0.5;

          gl_FragColor = vec4(color, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dataStreams = new THREE.Points(streamGeo, streamMat);
    this.scene.add(this.dataStreams);

    // Traffic (tiny moving lights along the street plane)
    this.trafficPositions = new Float32Array(this.trafficCount * 3);
    this.trafficSpeeds = new Float32Array(this.trafficCount);
    for (let i = 0; i < this.trafficCount; i++) {
      const idx = i * 3;
      const laneX = (Math.floor(Math.random() * 14) - 7) * 2.4;
      const laneZ = (Math.floor(Math.random() * 14) - 7) * 2.6 + centerZ;
      const alongX = Math.random() > 0.5;
      this.trafficPositions[idx] = alongX ? -32 + Math.random() * 64 : laneX;
      this.trafficPositions[idx + 1] = -2.98 + Math.random() * 0.12;
      this.trafficPositions[idx + 2] = alongX
        ? laneZ
        : -32 + Math.random() * 64 + centerZ;
      this.trafficSpeeds[i] = (alongX ? 1 : -1) * (0.18 + Math.random() * 0.28);
    }

    const trafficGeo = new THREE.BufferGeometry();
    trafficGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trafficPositions, 3)
    );
    const trafficMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOverclock: { value: 0 } },
      vertexShader: `
        uniform float uTime;
        uniform float uOverclock;
        varying float vGlow;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float flicker = sin(uTime * 12.0 + position.x * 0.7 + position.z * 0.6) * 0.5 + 0.5;
          vGlow = 0.55 + flicker * 0.55 + uOverclock * 0.6;
          gl_PointSize = (2.0 + vGlow * 3.0) * (210.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vGlow;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.1, d) * vGlow;
          vec3 col = mix(vec3(0.2, 0.9, 1.0), vec3(1.0, 0.5, 0.2), vGlow * 0.35);
          gl_FragColor = vec4(col, a * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.traffic = new THREE.Points(trafficGeo, trafficMat);
    this.scene.add(this.traffic);

    // Code rain (Matrix-style) - slightly reduced to keep focus on the city
    this.codePositions = new Float32Array(this.codeCount * 3);
    for (let i = 0; i < this.codeCount; i++) {
      const idx = i * 3;
      this.codePositions[idx] = (Math.random() - 0.5) * 40;
      this.codePositions[idx + 1] = Math.random() * 20;
      this.codePositions[idx + 2] = (Math.random() - 0.5) * 40 - 10;
    }

    const codeGeo = new THREE.BufferGeometry();
    codeGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.codePositions, 3)
    );

    // Matrix-style code rain shader
    const codeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        varying float vBrightness;
        varying float vFade;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Brightness based on fall position (brighter at top of trail)
          float yPhase = fract(position.y * 0.1 - uTime * 0.5);
          vBrightness = pow(yPhase, 0.5) * (0.6 + uProgress * 0.6);
          vFade = 1.0 - yPhase * 0.7;

          float size = 3.0 + vBrightness * 3.0;
          gl_PointSize = size * (180.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vBrightness;
        varying float vFade;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.1, dist) * vBrightness * vFade;

          // Green matrix color with white core
          vec3 green = vec3(0.0, 1.0, 0.5);
          float core = smoothstep(0.2, 0.0, dist);
          vec3 color = green + vec3(0.3, 0.2, 0.3) * core;

          gl_FragColor = vec4(color, alpha * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.codeRain = new THREE.Points(codeGeo, codeMat);
    this.scene.add(this.codeRain);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.2 + ctx.pointerVelocity.length() * 0.9,
      0,
      1
    );

    this.overclock = Math.max(ctx.tap, damp(this.overclock, 0, 3.5, ctx.dt));

    // Animate data streams (rising packets)
    const streamAttr = this.dataStreams.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    for (let i = 0; i < this.streamCount; i++) {
      const idx = i * 3;
      this.streamPositions[idx] +=
        this.streamVelocities[idx] * (1 + impulse * 0.5 + this.overclock * 1.2);
      this.streamPositions[idx + 1] +=
        this.streamVelocities[idx + 1] * (1 + this.overclock * 1.4);
      this.streamPositions[idx + 2] +=
        this.streamVelocities[idx + 2] *
        (1 + impulse * 0.5 + this.overclock * 1.2);

      // Drift toward center avenue a bit (reads as "flow")
      this.streamPositions[idx] *= 0.999;

      // Wrap: respawn near random rooftop
      if (this.streamPositions[idx + 1] > 16) {
        const b = this.buildingCenters[i % this.buildingCenters.length];
        this.streamPositions[idx] = b.x + (Math.random() - 0.5) * 1.6;
        this.streamPositions[idx + 1] = -2.8 + Math.random() * 6;
        this.streamPositions[idx + 2] = b.z + (Math.random() - 0.5) * 1.6;
      }
    }
    streamAttr.needsUpdate = true;

    // Update data stream shader uniforms
    const streamMat = this.dataStreams.material as THREE.ShaderMaterial;
    streamMat.uniforms.uTime.value = t;
    streamMat.uniforms.uProgress.value = progress;
    streamMat.uniforms.uOverclock.value = this.overclock;

    // Traffic motion
    const trafficAttr = this.traffic.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    for (let i = 0; i < this.trafficCount; i++) {
      const idx = i * 3;
      this.trafficPositions[idx] +=
        this.trafficSpeeds[i] * ctx.dt * (1 + this.overclock * 2.2);
      // Wrap across the city
      if (this.trafficPositions[idx] > 34) this.trafficPositions[idx] = -34;
      if (this.trafficPositions[idx] < -34) this.trafficPositions[idx] = 34;
    }
    trafficAttr.needsUpdate = true;
    const trafficMat = this.traffic.material as THREE.ShaderMaterial;
    trafficMat.uniforms.uTime.value = t;
    trafficMat.uniforms.uOverclock.value = this.overclock;

    // Animate code rain (falling)
    const codeAttr = this.codeRain.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    for (let i = 0; i < this.codeCount; i++) {
      const idx = i * 3;
      this.codePositions[idx + 1] -=
        0.075 * (1 + progress * 0.5 + this.overclock * 0.8);
      if (this.codePositions[idx + 1] < -5) {
        this.codePositions[idx + 1] = 20;
        this.codePositions[idx] = (Math.random() - 0.5) * 40;
      }
    }
    codeAttr.needsUpdate = true;

    // Update code rain shader uniforms
    const codeMat = this.codeRain.material as THREE.ShaderMaterial;
    codeMat.uniforms.uTime.value = t;
    codeMat.uniforms.uProgress.value = progress;

    // Streets pulse
    const streetMat = this.streetLines.material as THREE.LineBasicMaterial;
    streetMat.opacity =
      0.18 +
      Math.sin(t * 0.55) * 0.06 +
      progress * 0.18 +
      this.overclock * 0.12;

    // Windows shimmer (update material opacity only)
    const winMat = this.windows.material as THREE.MeshBasicMaterial;
    winMat.opacity = 0.75 + this.overclock * 0.25;

    // Camera
    const cam = this.camera as THREE.PerspectiveCamera;
    const targetZ = (this.baseCameraZ - progress * 9) * this.aspectMult;
    const targetY = 4.5 + progress * 3.5;
    const orbit =
      (ctx.pointer.x * 0.65 + (ctx.gyroActive ? ctx.gyro.x * 0.45 : 0)) *
      (1 + this.overclock * 0.5);
    const lift =
      ctx.pointer.y * 0.55 + (ctx.gyroActive ? ctx.gyro.y * 0.35 : 0);

    cam.position.x = damp(cam.position.x, orbit * 7.0, 2.6, ctx.dt);
    cam.position.y = damp(cam.position.y, targetY + lift * 3.0, 2.6, ctx.dt);
    cam.position.z = damp(cam.position.z, targetZ, 2.6, ctx.dt);

    this.lookTarget.x = damp(this.lookTarget.x, orbit * 1.2, 2.0, ctx.dt);
    this.lookTarget.y = damp(this.lookTarget.y, 1.6 + lift * 0.8, 2.0, ctx.dt);
    this.lookTarget.z = damp(this.lookTarget.z, -8 - progress * 5, 2.0, ctx.dt);
    cam.lookAt(this.lookTarget);
  }
}

// ============================================================================
// SCENE 15 - REALITY COLLAPSE FINALE
// ============================================================================
class RealityCollapseScene extends SceneBase {
  protected baseCameraZ = 14;
  private fragments: THREE.Group;
  private centralOrb: THREE.Mesh;
  private orbMaterial: THREE.ShaderMaterial;
  private particleRing: THREE.Points;
  private fragmentMeshes: THREE.Mesh[] = [];
  private fragmentBasePositions: THREE.Vector3[] = [];
  private burst = 0;

  constructor() {
    super('scene15');
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 14);

    // Dramatic lighting
    const ambient = new THREE.AmbientLight(0x111122, 0.2);
    const key = new THREE.PointLight(0xffffff, 2, 30);
    key.position.set(0, 5, 10);
    this.scene.add(ambient, key);

    this.fragments = new THREE.Group();
    this.scene.add(this.fragments);

    // Create fragments representing all previous scenes
    const fragmentGeometries = [
      new THREE.IcosahedronGeometry(0.5, 1), // Scene 00 - Core
      new THREE.TorusGeometry(0.4, 0.15, 8, 16), // Scene 01 - Relic
      new THREE.SphereGeometry(0.3, 8, 6), // Scene 02 - Fireflies
      new THREE.BoxGeometry(0.6, 0.8, 0.3), // Scene 03 - Typography
      new THREE.PlaneGeometry(0.7, 0.5), // Scene 04 - Aurora
      new THREE.SphereGeometry(0.35, 10, 8), // Scene 05 - Event Horizon
      new THREE.BoxGeometry(0.5, 0.5, 0.5), // Scene 06 - Blueprint
      new THREE.SphereGeometry(0.35, 6, 4), // Scene 07 - Ink
      new THREE.PlaneGeometry(0.8, 0.6), // Scene 08 - Cloth
      new THREE.DodecahedronGeometry(0.4, 0), // Scene 09 - Point Cloud
      new THREE.TetrahedronGeometry(0.5, 0), // Scene 10 - Fractal
      new THREE.IcosahedronGeometry(0.35, 0), // Scene 11 - Neural
      new THREE.BoxGeometry(0.4, 0.7, 0.4), // Scene 12 - Library
      new THREE.SphereGeometry(0.4, 12, 8), // Scene 13 - Bioluminescent
      new THREE.BoxGeometry(0.45, 0.85, 0.45), // Scene 14 - Data City
    ];

    const fragmentColors = [
      0x4488ff, // Core blue
      0xaaaaaa, // Metal gray
      0xffdd44, // Firefly gold
      0xffffff, // Typography white
      0x7affd6, // Aurora mint
      0xff8844, // Event Horizon warm
      0x44aaff, // Blueprint blue
      0x222222, // Ink dark
      0xff6644, // Cloth warm
      0x88ddff, // Point cloud
      0xff44aa, // Fractal pink
      0x44ff88, // Neural green
      0xffaa44, // Library amber
      0x44ffaa, // Bio teal
      0x00e5ff, // Data city cyan
    ];

    // Position fragments in a sphere around center
    for (let i = 0; i < fragmentGeometries.length; i++) {
      const geo = fragmentGeometries[i];
      const mat = new THREE.MeshStandardMaterial({
        color: fragmentColors[i],
        emissive: fragmentColors[i],
        emissiveIntensity: 0.3,
        metalness: 0.4,
        roughness: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Spherical distribution
      const phi = Math.acos(-1 + (2 * i) / fragmentGeometries.length);
      const theta = Math.sqrt(fragmentGeometries.length * Math.PI) * phi;
      const radius = 5 + Math.random() * 2;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      mesh.position.set(x, y, z);
      this.fragmentBasePositions.push(new THREE.Vector3(x, y, z));
      this.fragmentMeshes.push(mesh);
      this.fragments.add(mesh);
    }

    // Central orb (the singularity)
    const orbGeo = new THREE.SphereGeometry(1.2, 32, 24);
    this.orbMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normal;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          float pulse = sin(uTime * 2.0 + length(vPosition) * 3.0) * 0.5 + 0.5;

          vec3 color1 = vec3(0.2, 0.5, 1.0);
          vec3 color2 = vec3(1.0, 0.3, 0.6);
          vec3 color = mix(color1, color2, pulse * uProgress);

          float intensity = fresnel * (0.5 + uProgress * 0.5) + pulse * 0.3;
          gl_FragColor = vec4(color * intensity, 0.8 + uProgress * 0.2);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.centralOrb = new THREE.Mesh(orbGeo, this.orbMaterial);
    this.centralOrb.scale.setScalar(0.1);
    this.scene.add(this.centralOrb);

    // Particle ring around the collapse
    const ringCount = 2000;
    const ringPositions = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const radius = 4 + Math.random() * 0.5;
      const idx = i * 3;
      ringPositions[idx] = Math.cos(angle) * radius;
      ringPositions[idx + 1] = (Math.random() - 0.5) * 0.5;
      ringPositions[idx + 2] = Math.sin(angle) * radius;
    }

    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(ringPositions, 3)
    );

    // Enhanced particle ring with energy shader
    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uEnergy: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uEnergy;
        varying float vAngle;
        varying float vEnergy;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Calculate angle for color variation
          vAngle = atan(position.z, position.x);
          vEnergy = uEnergy;

          // Pulsing size with energy
          float pulse = 1.0 + 0.3 * sin(uTime * 4.0 + vAngle * 3.0);
          float size = 4.0 + uProgress * 3.0 + uEnergy * 4.0;

          gl_PointSize = size * pulse * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        varying float vAngle;
        varying float vEnergy;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.1, dist);

          // Rainbow effect based on angle and time
          float hue = fract(vAngle / 6.28318 + uTime * 0.1);
          vec3 color;
          if (hue < 0.166) color = mix(vec3(1,0,0), vec3(1,1,0), hue * 6.0);
          else if (hue < 0.333) color = mix(vec3(1,1,0), vec3(0,1,0), (hue-0.166) * 6.0);
          else if (hue < 0.5) color = mix(vec3(0,1,0), vec3(0,1,1), (hue-0.333) * 6.0);
          else if (hue < 0.666) color = mix(vec3(0,1,1), vec3(0,0,1), (hue-0.5) * 6.0);
          else if (hue < 0.833) color = mix(vec3(0,0,1), vec3(1,0,1), (hue-0.666) * 6.0);
          else color = mix(vec3(1,0,1), vec3(1,0,0), (hue-0.833) * 6.0);

          // White core
          float core = smoothstep(0.15, 0.0, dist);
          color = mix(color, vec3(1.0), core * 0.7);

          // Intensity based on energy
          float intensity = 0.7 + vEnergy * 0.5;

          gl_FragColor = vec4(color * intensity, alpha * (0.6 + uProgress * 0.4));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particleRing = new THREE.Points(ringGeo, ringMat);
    this.scene.add(this.particleRing);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    this.burst = Math.max(ctx.tap, damp(this.burst, 0, 3.2, ctx.dt));
    const impulse = clamp(
      Math.abs(ctx.scrollVelocity) * 1.5 +
        ctx.pointerVelocity.length() * 1.0 +
        this.burst * 1.1 +
        ctx.press * 0.35,
      0,
      1
    );

    // Stage 1: Gathering (0-20%)
    // Stage 2: Merge (20-40%)
    // Stage 3: Fusion (40-60%)
    // Stage 4: Collapse (60-80%)
    // Stage 5: Resolution (80-100%)

    const stage =
      progress < 0.2
        ? 1
        : progress < 0.4
          ? 2
          : progress < 0.6
            ? 3
            : progress < 0.8
              ? 4
              : 5;
    const stageProgress =
      progress < 0.2
        ? progress / 0.2
        : progress < 0.4
          ? (progress - 0.2) / 0.2
          : progress < 0.6
            ? (progress - 0.4) / 0.2
            : progress < 0.8
              ? (progress - 0.6) / 0.2
              : (progress - 0.8) / 0.2;

    // Animate fragments based on stage
    this.fragmentMeshes.forEach((mesh, i) => {
      const base = this.fragmentBasePositions[i];
      const mat = mesh.material as THREE.MeshStandardMaterial;

      const n = base.clone().normalize();
      const shock = this.burst * (1.2 + 0.4 * Math.sin(t * 10 + i));

      // Rotation
      mesh.rotation.x += ctx.dt * (0.3 + i * 0.05);
      mesh.rotation.y += ctx.dt * (0.4 + i * 0.03);

      let targetX = base.x;
      let targetY = base.y;
      let targetZ = base.z;
      let targetScale = 1;

      if (stage === 1) {
        // Gathering - fragments orbit slowly
        const orbitAngle = t * 0.2 + i * 0.4;
        targetX =
          base.x * Math.cos(orbitAngle * 0.1) -
          base.z * Math.sin(orbitAngle * 0.1);
        targetZ =
          base.x * Math.sin(orbitAngle * 0.1) +
          base.z * Math.cos(orbitAngle * 0.1);
        mat.emissiveIntensity = 0.2 + stageProgress * 0.2;
      } else if (stage === 2) {
        // Merge - fragments move closer
        const pullFactor = 1 - stageProgress * 0.5;
        targetX = base.x * pullFactor;
        targetY = base.y * pullFactor;
        targetZ = base.z * pullFactor;
        mat.emissiveIntensity = 0.4 + stageProgress * 0.3;
      } else if (stage === 3) {
        // Fusion - rapid orbit, getting closer
        const orbitSpeed = 2 + stageProgress * 3;
        const orbitAngle = t * orbitSpeed + i * 0.4;
        const pullFactor = 0.5 - stageProgress * 0.3;
        const dist = base.length() * pullFactor;
        targetX = Math.cos(orbitAngle + base.x) * dist;
        targetY = Math.sin(orbitAngle * 0.7 + base.y) * dist * 0.5;
        targetZ = Math.sin(orbitAngle + base.z) * dist;
        mat.emissiveIntensity = 0.7 + stageProgress * 0.3;
      } else if (stage === 4) {
        // Collapse - everything rushes to center
        const collapseFactor = 1 - stageProgress;
        targetX = base.x * 0.2 * collapseFactor;
        targetY = base.y * 0.2 * collapseFactor;
        targetZ = base.z * 0.2 * collapseFactor;
        targetScale = collapseFactor;
        mat.emissiveIntensity = 1.0;
      } else {
        // Resolution - fragments gone, orb remains
        targetScale = 0;
        mat.emissiveIntensity = 0;
      }

      // Tap shockwave: a brief radial push and glitter boost
      targetX += n.x * shock * 0.9;
      targetY += n.y * shock * 0.6;
      targetZ += n.z * shock * 0.9;
      mat.emissiveIntensity = Math.min(
        1.2,
        mat.emissiveIntensity + this.burst * 0.35
      );

      mesh.position.x = damp(mesh.position.x, targetX, 4, ctx.dt);
      mesh.position.y = damp(mesh.position.y, targetY, 4, ctx.dt);
      mesh.position.z = damp(mesh.position.z, targetZ, 4, ctx.dt);
      mesh.scale.setScalar(damp(mesh.scale.x, targetScale, 5, ctx.dt));
    });

    // Central orb animation
    const orbScale =
      stage < 3
        ? 0.1
        : stage === 3
          ? 0.1 + stageProgress * 0.5
          : stage === 4
            ? 0.6 + stageProgress * 1.4
            : 2.0;
    this.centralOrb.scale.setScalar(
      damp(
        this.centralOrb.scale.x,
        orbScale + this.burst * 0.5 + ctx.press * 0.25,
        3,
        ctx.dt
      )
    );
    this.orbMaterial.uniforms.uTime.value = t;
    this.orbMaterial.uniforms.uProgress.value = progress;

    // Particle ring
    this.particleRing.rotation.y = t * 0.3;
    this.particleRing.rotation.x = Math.sin(t * 0.2) * 0.2;
    const ringScale =
      stage < 4 ? 1 + progress * 0.5 : 1.5 - stageProgress * 1.5;
    this.particleRing.scale.setScalar(
      damp(this.particleRing.scale.x, Math.max(0.01, ringScale), 3, ctx.dt)
    );

    // Update particle ring shader
    const ringMat = this.particleRing.material as THREE.ShaderMaterial;
    ringMat.uniforms.uTime.value = t;
    ringMat.uniforms.uProgress.value = progress;
    ringMat.uniforms.uEnergy.value =
      impulse + (stage === 4 ? stageProgress : 0) + this.burst * 0.9;

    // Camera
    const cam = this.camera as THREE.PerspectiveCamera;
    const targetZ =
      stage < 4
        ? (this.baseCameraZ - progress * 4) * this.aspectMult
        : stage === 4
          ? (10 - stageProgress * 4) * this.aspectMult
          : 6 * this.aspectMult;
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 2, 3, ctx.dt);
    cam.position.y = damp(cam.position.y, ctx.pointer.y * 1.5, 3, ctx.dt);
    cam.position.z = damp(cam.position.z, targetZ, 3, ctx.dt);
    cam.lookAt(0, 0, 0);

    // Background and fog based on stage
    if (stage === 5) {
      const white = stageProgress * 0.3;
      this.scene.background = new THREE.Color(white, white, white);
    } else {
      // Tiny interactive flash on tap to feel responsive
      const flash = this.burst * 0.06;
      this.scene.background = new THREE.Color(flash, flash * 0.6, flash * 1.2);
    }
  }
}

// =============================================================================
// REMIX SHOWCASE SCENES (Higher-detail, feature-combined chapters)
// =============================================================================
type RemixPalette = {
  a: THREE.Color;
  b: THREE.Color;
  c: THREE.Color;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const paletteForMode = (mode: number): RemixPalette => {
  const palettes: Array<[number, number, number]> = [
    [0x22d3ee, 0x6366f1, 0xff3d81],
    [0xff3d81, 0xffa340, 0x22d3ee],
    [0xa6ff3d, 0x22d3ee, 0x7c3aed],
    [0xffa340, 0x00e5ff, 0xff1bb7],
    [0x7affd6, 0x3dffff, 0x1d4ed8],
    [0xff8844, 0x66ccff, 0xf472b6],
    [0x8b5cf6, 0x22d3ee, 0xf59e0b],
    [0x60a5fa, 0x34d399, 0xf472b6],
  ];
  const p = palettes[mode % palettes.length];
  return {
    a: new THREE.Color(p[0]),
    b: new THREE.Color(p[1]),
    c: new THREE.Color(p[2]),
  };
};

class RemixShowcaseScene extends SceneBase {
  protected baseCameraZ = 12;

  private mode: number;
  private seed: number;
  private rnd: () => number;
  private palette: RemixPalette;

  private group = new THREE.Group();
  private burst = 0;
  private hyper = 0;

  private backdrop: THREE.Mesh;
  private backdropMat: THREE.ShaderMaterial;

  private structures: THREE.InstancedMesh;
  private structureCount: number;
  private activeStructureCount: number;
  private structureBase: Array<{
    x: number;
    z: number;
    h: number;
    w: number;
    d: number;
    r: number;
  }> = [];
  private dummy = new THREE.Object3D();

  private particles: THREE.Points;
  private particleCount: number;
  private activeParticleCount: number;
  private particlePos: Float32Array;
  private particleVel: Float32Array;

  private core: THREE.Mesh;
  private coreMat: THREE.ShaderMaterial;
  private halo: THREE.Mesh;

  constructor(id: string, mode: number, seed: number) {
    super(id);
    this.mode = mode;
    this.seed = seed;
    this.rnd = mulberry32(seed);
    this.palette = paletteForMode(mode);

    // Camera framing varies a bit by mode
    this.baseCameraZ = 11 + (mode % 4) * 1.2;
    (this.camera as THREE.PerspectiveCamera).position.set(
      0,
      1.0,
      this.baseCameraZ
    );

    this.scene.background = new THREE.Color(0x040712);
    this.scene.fog = new THREE.FogExp2(0x050815, 0.04);
    this.scene.add(this.group);

    // Lighting (mix of studio + neon)
    const ambient = new THREE.AmbientLight(0x0b1224, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(7, 10, 6);
    const rim = new THREE.PointLight(this.palette.a, 1.4, 42, 2);
    rim.position.set(-10, 2, -10);
    const fill = new THREE.PointLight(this.palette.b, 1.2, 42, 2);
    fill.position.set(10, 3, -14);
    this.scene.add(ambient, key, rim, fill);

    // Shader backdrop (procedural nebula + scan energy)
    this.backdropMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBurst: { value: 0 },
        uHyper: { value: 0 },
        uMode: { value: mode },
        uSeed: { value: seed % 997 },
        uA: { value: this.palette.a.clone() },
        uB: { value: this.palette.b.clone() },
        uC: { value: this.palette.c.clone() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uBurst;
        uniform float uHyper;
        uniform float uMode;
        uniform float uSeed;
        uniform vec3 uA;
        uniform vec3 uB;
        uniform vec3 uC;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.55;
          mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = m * p;
            a *= 0.55;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5);
          p.x *= 1.2;

          float t = uTime * (0.08 + 0.12 * uHyper);
          float n = fbm(p * 3.2 + vec2(t, -t));
          float n2 = fbm(p * 6.8 + vec2(-t * 1.3, t * 0.9));

          float vign = smoothstep(0.95, 0.25, length(p));
          float scan = sin((uv.y + t * 0.6) * 120.0) * 0.5 + 0.5;

          vec3 col = mix(uA, uB, n);
          col = mix(col, uC, n2 * 0.7);

          // Mode shifts the spectral balance
          float m = fract(uMode * 0.173);
          col = mix(col, col.bgr, 0.15 + 0.35 * m);

          float burst = clamp(uBurst, 0.0, 1.0);
          float energy = (0.12 + 0.38 * scan) * (0.35 + 0.65 * vign);
          energy *= 0.9 + burst * 1.2;
          energy *= 0.85 + uHyper * 0.55;

          // Soft radial pulse on interaction
          float pulse = exp(-abs(length(p) - (0.22 + fract(uTime * 0.18) * 0.65)) * 22.0);
          col += uB * pulse * burst * 0.65;

          gl_FragColor = vec4(col * energy, 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 40),
      this.backdropMat
    );
    this.backdrop.renderOrder = -10;
    this.backdrop.position.set(0, 5, -40);
    this.group.add(this.backdrop);

    // Structures (instanced monoliths / city shards / pillars)
    this.structureCount = 140;
    this.activeStructureCount = this.structureCount;
    const structGeo = new THREE.BoxGeometry(1, 1, 1);
    const structMat = new THREE.MeshStandardMaterial({
      color: 0x071023,
      roughness: 0.5,
      metalness: 0.35,
      emissive: new THREE.Color(0x061a2e),
      emissiveIntensity: 0.45,
    });
    this.structures = new THREE.InstancedMesh(
      structGeo,
      structMat,
      this.structureCount
    );
    this.structures.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.structures);

    // Deterministic layout so each chapter feels intentional
    const spread = 18;
    for (let i = 0; i < this.structureCount; i++) {
      const ang = this.rnd() * Math.PI * 2;
      const rad = 3.5 + Math.pow(this.rnd(), 0.7) * spread;
      const x = Math.cos(ang) * rad + (this.rnd() - 0.5) * 1.25;
      const z = -10 + Math.sin(ang) * rad + (this.rnd() - 0.5) * 1.25;
      const downtown = Math.max(
        0,
        1 - Math.hypot(x * 0.6, (z + 10) * 0.5) / 12
      );
      const h = 1.4 + this.rnd() * 7.5 + downtown * 9.5;
      const w = 0.55 + this.rnd() * 1.6;
      const d = 0.55 + this.rnd() * 1.6;
      const r = (this.rnd() - 0.5) * 0.5;
      this.structureBase.push({ x, z, h, w, d, r });
    }

    // Particles (glowing dust + data packets)
    this.particleCount = 2200;
    this.activeParticleCount = this.particleCount;
    this.particlePos = new Float32Array(this.particleCount * 3);
    this.particleVel = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const rx = (this.rnd() - 0.5) * 28;
      const ry = (this.rnd() - 0.2) * 18;
      const rz = -10 + (this.rnd() - 0.5) * 28;
      this.particlePos[idx] = rx;
      this.particlePos[idx + 1] = ry;
      this.particlePos[idx + 2] = rz;

      const vx = (this.rnd() - 0.5) * 0.22;
      const vy = 0.05 + this.rnd() * 0.25;
      const vz = (this.rnd() - 0.5) * 0.22;
      this.particleVel[idx] = vx;
      this.particleVel[idx + 1] = vy;
      this.particleVel[idx + 2] = vz;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePos, 3)
    );
    pGeo.setDrawRange(0, this.particleCount);
    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBurst: { value: 0 },
        uHyper: { value: 0 },
        uA: { value: this.palette.a.clone() },
        uB: { value: this.palette.b.clone() },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBurst;
        uniform float uHyper;
        varying float vGlow;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float z = max(0.0001, -mv.z);
          float flick = sin(uTime * 2.4 + position.x * 0.7 + position.z * 0.6) * 0.5 + 0.5;
          vGlow = (0.35 + flick * 0.65) * (1.0 + uBurst * 1.1 + uHyper * 0.6);
          gl_PointSize = (1.6 + vGlow * 2.6) * (240.0 / z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uA;
        uniform vec3 uB;
        varying float vGlow;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float core = smoothstep(0.45, 0.0, d);
          float halo = smoothstep(0.5, 0.12, d);
          vec3 col = mix(uA, uB, core);
          gl_FragColor = vec4(col, (core * 0.9 + halo * 0.25) * vGlow * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);

    // Core object (shader-lit energy artifact)
    const coreGeo =
      mode % 3 === 0
        ? new THREE.TorusKnotGeometry(1.0, 0.32, 170, 16)
        : mode % 3 === 1
          ? new THREE.IcosahedronGeometry(1.1, 2)
          : new THREE.OctahedronGeometry(1.15, 2);

    this.coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBurst: { value: 0 },
        uHyper: { value: 0 },
        uA: { value: this.palette.a.clone() },
        uB: { value: this.palette.b.clone() },
        uC: { value: this.palette.c.clone() },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBurst;
        uniform float uHyper;
        varying vec3 vN;
        varying vec3 vP;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec3 p = position;
          float wob = sin(uTime * 1.2 + p.y * 2.0) * 0.03;
          p += vN * wob * (0.6 + uHyper * 0.8 + uBurst * 1.0);
          vP = p;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform float uBurst;
        uniform float uHyper;
        uniform vec3 uA;
        uniform vec3 uB;
        uniform vec3 uC;
        varying vec3 vN;
        varying vec3 vP;

        float fresnel(vec3 n, vec3 v) {
          return pow(1.0 - max(dot(n, v), 0.0), 3.0);
        }

        void main() {
          vec3 n = normalize(vN);
          vec3 v = normalize(vec3(0.0, 0.0, 1.0));
          float f = fresnel(n, v);
          float bands = sin((vP.y * 6.0 + uTime * (2.2 + uHyper * 1.2)) + vP.x * 2.0) * 0.5 + 0.5;
          float burst = clamp(uBurst, 0.0, 1.0);
          vec3 base = mix(uA, uB, bands);
          base = mix(base, uC, f);
          float glow = (0.25 + 0.85 * f) * (0.75 + 0.5 * bands);
          glow *= 1.0 + burst * 1.2 + uHyper * 0.8;
          gl_FragColor = vec4(base * glow, 1.0);
        }
      `,
      transparent: false,
    });

    this.core = new THREE.Mesh(coreGeo, this.coreMat);
    this.core.position.set(0, 1.2, -8);
    this.group.add(this.core);

    const haloGeo = new THREE.TorusGeometry(2.0, 0.06, 8, 96);
    const haloMat = new THREE.MeshBasicMaterial({
      color: this.palette.b,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.position.copy(this.core.position);
    this.halo.rotation.x = Math.PI / 2;
    this.group.add(this.halo);
  }

  init(ctx: SceneRuntime): void {
    // Mobile/perf caps: reduce draw counts while keeping the same look.
    const low = ctx.caps.coarsePointer;
    this.activeStructureCount = low ? 96 : this.structureCount;
    this.activeParticleCount = low ? 1200 : this.particleCount;

    this.structures.count = this.activeStructureCount;
    this.particles.geometry.setDrawRange(0, this.activeParticleCount);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    this.burst = Math.max(ctx.tap, damp(this.burst, 0, 3.6, ctx.dt));
    this.hyper = damp(this.hyper, ctx.press, 5, ctx.dt);

    // Backdrop
    this.backdropMat.uniforms.uTime.value = t;
    this.backdropMat.uniforms.uBurst.value = this.burst;
    this.backdropMat.uniforms.uHyper.value = this.hyper;

    // Structures (pulse + slight lean into motion)
    const impulse = clamp(
      ctx.pointerVelocity.length() * 0.25 +
        Math.abs(ctx.scrollVelocity) * 0.2 +
        this.burst * 0.9,
      0,
      1
    );

    for (let i = 0; i < this.activeStructureCount; i++) {
      const b = this.structureBase[i];
      const wob = Math.sin(t * (0.9 + i * 0.003) + b.x * 0.2 + b.z * 0.18);
      const lift = (0.15 + 0.85 * impulse) * wob;
      const h = b.h * (0.92 + 0.16 * wob + this.hyper * 0.22);

      this.dummy.position.set(
        b.x + ctx.pointer.x * 1.2,
        -2.6 + h * 0.5 + lift,
        b.z
      );
      this.dummy.rotation.set(0, b.r + ctx.pointer.x * 0.08, 0);
      this.dummy.scale.set(b.w, h, b.d);
      this.dummy.updateMatrix();
      this.structures.setMatrixAt(i, this.dummy.matrix);
    }
    this.structures.instanceMatrix.needsUpdate = true;

    // Particles (rising + gentle curl)
    const posAttr = this.particles.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    for (let i = 0; i < this.activeParticleCount; i++) {
      const idx = i * 3;
      const x = this.particlePos[idx];
      const y = this.particlePos[idx + 1];
      const z = this.particlePos[idx + 2];

      const curl = Math.sin(t * 0.6 + z * 0.08) * 0.12;
      this.particlePos[idx] =
        x + (this.particleVel[idx] + curl) * ctx.dt * (1 + this.hyper * 2.2);
      this.particlePos[idx + 1] =
        y +
        this.particleVel[idx + 1] *
          ctx.dt *
          (1 + this.hyper * 1.6 + this.burst * 1.2);
      this.particlePos[idx + 2] =
        z +
        (this.particleVel[idx + 2] - curl) * ctx.dt * (1 + this.hyper * 2.2);

      // Wrap volume
      if (this.particlePos[idx + 1] > 16) this.particlePos[idx + 1] = -6;
      if (this.particlePos[idx] > 16) this.particlePos[idx] = -16;
      if (this.particlePos[idx] < -16) this.particlePos[idx] = 16;
      if (this.particlePos[idx + 2] > 6) this.particlePos[idx + 2] = -26;
      if (this.particlePos[idx + 2] < -28) this.particlePos[idx + 2] = 8;
    }
    posAttr.needsUpdate = true;
    const pMat = this.particles.material as THREE.ShaderMaterial;
    pMat.uniforms.uTime.value = t;
    pMat.uniforms.uBurst.value = this.burst;
    pMat.uniforms.uHyper.value = this.hyper;

    // Core + halo
    this.core.rotation.x += ctx.dt * (0.25 + this.hyper * 0.65);
    this.core.rotation.y += ctx.dt * (0.35 + this.hyper * 0.85);
    this.coreMat.uniforms.uTime.value = t;
    this.coreMat.uniforms.uBurst.value = this.burst;
    this.coreMat.uniforms.uHyper.value = this.hyper;

    this.halo.rotation.z = t * (0.25 + this.hyper * 0.5);
    this.halo.scale.setScalar(1 + this.burst * 0.25 + this.hyper * 0.15);
    (this.halo.material as THREE.MeshBasicMaterial).opacity =
      0.55 + this.burst * 0.35;

    // Camera: cinematic orbit around the core + responsive framing
    const cam = this.camera as THREE.PerspectiveCamera;
    const orbitX = ctx.pointer.x * (3.8 + this.hyper * 2.2);
    const orbitY = 1.1 + ctx.pointer.y * (1.6 + this.hyper * 0.9);
    const push =
      (this.baseCameraZ - 2.2 * this.hyper - 0.9 * this.burst) *
      this.aspectMult;
    cam.position.x = damp(cam.position.x, orbitX, 2.8, ctx.dt);
    cam.position.y = damp(cam.position.y, orbitY, 2.8, ctx.dt);
    cam.position.z = damp(cam.position.z, push, 2.8, ctx.dt);
    cam.lookAt(0, 1.2, -8);
  }

  resize(ctx: SceneRuntime): void {
    super.resize(ctx);
    // Keep the backdrop filling the view even on extreme aspect ratios.
    const aspect = ctx.size.width / Math.max(1, ctx.size.height);
    this.backdrop.scale.setScalar(1 + Math.max(0, 1.0 - aspect) * 0.35);
  }
}

export const createScenes = (): TowerScene[] => {
  // Replace the previous "basic" chapter set with higher-detail remix scenes.
  // Each chapter gets a distinct seed + mode so it feels unique while reusing
  // a shared high-performance feature stack.
  return Array.from({ length: 16 }, (_, i) => {
    const id = `scene${String(i).padStart(2, '0')}`;
    return new RemixShowcaseScene(id, i, 1000 + i * 97);
  });
};

export const getSceneMeta = () => sceneMeta;
