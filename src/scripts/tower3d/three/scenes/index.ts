import * as THREE from 'three';
import { SimplePhysics } from '../physics/simple-physics';
import type { TowerCaps } from '../../core/caps';

// --- Types & Interfaces ---

export interface SceneRuntime {
  renderer: THREE.WebGLRenderer;
  root: HTMLElement; // Added
  size: { width: number; height: number; dpr: number };
  pointer: THREE.Vector2; // -1 to 1
  pointerVelocity: THREE.Vector2;
  scrollVelocity: number;
  dt: number;
  time: number;
  progress: number; // Added
  localProgress: number; // Added
  caps: TowerCaps;
  gyro: THREE.Vector3; // -1 to 1 based on beta/gamma
  gyroActive: boolean; // Added
  bgTheme: string; // 'dark' | 'glass'
  press: number; // 0 to 1
  tap: number; // transient 0->1 signal
  sceneId: string; // Added
  sceneIndex: number; // Added
}

export interface TowerScene {
  id: string; // Added
  group: THREE.Group;
  camera: THREE.Camera;
  bg?: THREE.Color; // optional override
  init(ctx: SceneRuntime): void;
  resize(ctx: SceneRuntime): void;
  update(ctx: SceneRuntime): void;
  render?(ctx: SceneRuntime): void; // Added
  dispose(): void;
  cleanup?(): void;
}

export interface SceneMeta {
  id: string;
  title: string;
  subtitle: string;
  index: number;
}

const sceneMeta: SceneMeta[] = [
  {
    id: 'scene00',
    title: 'Origin Core',
    subtitle: 'Resonant Structures',
    index: 0,
  },
  {
    id: 'scene01',
    title: 'Liquid Metal',
    subtitle: 'Chaotic Systems',
    index: 1,
  },
  {
    id: 'scene02',
    title: 'Million Fireflies',
    subtitle: 'Vector Calculus',
    index: 2,
  },
  {
    id: 'scene03',
    title: 'Quantum Ribbons',
    subtitle: 'Data Flow',
    index: 3,
  },
  {
    id: 'scene04',
    title: 'Aurora Field',
    subtitle: 'Magnetic Force',
    index: 4,
  },
  {
    id: 'scene05',
    title: 'Event Horizon',
    subtitle: 'Singularity',
    index: 5,
  },
  {
    id: 'scene06',
    title: 'Fractal Glass',
    subtitle: 'Refraction',
    index: 6,
  },
  {
    id: 'scene07',
    title: 'Data Stream',
    subtitle: 'Information Vortex',
    index: 7,
  },
  {
    id: 'scene08',
    title: 'Orbital Mechanics',
    subtitle: 'Gravity',
    index: 8,
  },
  {
    id: 'scene09',
    title: 'Crystal Glitch',
    subtitle: 'Tessellation',
    index: 9,
  },
  {
    id: 'scene10',
    title: 'Quantum Moiré',
    subtitle: 'Interference',
    index: 10,
  },
  {
    id: 'scene11',
    title: 'Neural Net',
    subtitle: 'Deep Learning',
    index: 11,
  },
  { id: 'scene12', title: 'The Library', subtitle: 'Knowledge', index: 12 },
  {
    id: 'scene13',
    title: 'Deep Abyss',
    subtitle: 'Organic Light',
    index: 13,
  },
  {
    id: 'scene14',
    title: 'Cyber City',
    subtitle: 'Future State',
    index: 14,
  },
  { id: 'scene15', title: 'Entropy Void', subtitle: 'Collapse', index: 15 },
];

// --- Math Helpers ---

const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

// --- Base Class (The "Centering" Fix) ---

abstract class SceneBase implements TowerScene {
  id: string = 'unknown'; // Added default
  group: THREE.Group;
  camera: THREE.PerspectiveCamera;

  // Design resolution reference
  protected baseFov = 45;
  protected baseDistance = 14;
  // This radius represents the "safe zone" of the scene content.
  // We ensure this radius is always visible.
  protected contentRadius = 4.5;

  constructor() {
    this.group = new THREE.Group();
    // Start with a standard setup
    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 100);
    this.camera.position.set(0, 0, this.baseDistance);
  }

  abstract init(ctx: SceneRuntime): void;
  abstract update(ctx: SceneRuntime): void;

  render(ctx: SceneRuntime): void {
    ctx.renderer.render(this.group, this.camera);
  }

  resize(ctx: SceneRuntime): void {
    const aspect = ctx.size.width / ctx.size.height;
    this.camera.aspect = aspect;

    // Responsive Logic:
    // We want to ensure 'this.contentRadius' is visible both vertically and horizontally.
    // Vertical FOV is fixed in THREE.PerspectiveCamera.
    // Visible Height at distance D:  H = 2 * D * tan(FOV/2).
    // Visible Width: W = H * aspect.

    // If aspect < 1 (Portrait), width is the limiting factor.
    // We want Visible Width >= contentRadius * 2.
    // W = 2 * D * tan(FOV/2) * aspect >= 2 * R
    // D * tan(FOV/2) * aspect >= R
    // D >= R / (tan(FOV/2) * aspect)

    // If aspect >= 1 (Landscape), height is usually limiting (or width is plentiful).
    // We want Visible Height >= contentRadius * 2.
    // 2 * D * tan(FOV/2) >= 2 * R
    // D >= R / tan(FOV/2)

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const tanHalf = Math.tan(fovRad / 2);

    let requiredDist = 0;
    if (aspect < 1.0) {
      // Portrait: Fit width
      requiredDist = (this.contentRadius * 1.05) / (tanHalf * aspect);
    } else {
      // Landscape: Fit height
      requiredDist = (this.contentRadius * 1.05) / tanHalf;
    }

    // Apply strict centering
    this.baseDistance = requiredDist;
    // Note: The update() loop typically interpolates camera.z to baseDistance.
    // If a scene overrides camera controls, it must respect this baseDistance.

    this.camera.updateProjectionMatrix();

    // Re-center any stray objects if needed (handled by scene implementations)
  }

  dispose(): void {
    // Basic cleanup traversal
    this.group.traverse(obj => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      // Materials might be shared, be careful.
      // For this project, we assume mostly unique materials or GC handles it.
    });
  }
}

// --- Scene 00: Feedback Forge (High Octane) ---

class FeedbackForgeScene extends SceneBase {
  private rings: THREE.Mesh[] = [];
  private core: THREE.Mesh;
  private particles: THREE.Points;
  private particleData: Float32Array;

  constructor() {
    super();
    this.id = 'scene00';
    this.contentRadius = 5.0; // Keeps the forge visible

    // 1. Core Energy Source (Volumetric Shader look via layers)
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 30); // Higher poly for smooth noise
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#ff2a00') },
        uColorB: { value: new THREE.Color('#ffaa00') },
        uPulse: { value: 0 },
      },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vP;
        uniform float uTime;
        uniform float uPulse;

        // Curl noise approximation
        vec3 hash( vec3 p ) {
            p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
                      dot(p,vec3(269.5,183.3,246.1)),
                      dot(p,vec3(113.5,271.9,124.6)));
            return -1.0 + 2.0*fract(sin(p)*43758.5453123);
        }

        void main() {
          vN = normal;
          // Turbulent displacement
          float t = uTime * 1.5;
          vec3 n1 = hash(position * 2.0 + t);
          vec3 n2 = hash(position * 4.0 - t * 0.5);

          float displacement = (n1.x + n2.y * 0.5) * (0.2 + uPulse * 0.4);
          vec3 pos = position + normal * displacement;
          vP = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vN;
        varying vec3 vP;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uPulse;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vP);
          float fresnel = pow(1.0 - dot(vN, viewDir), 2.0);

          // Plasma pattern
          float noise = sin(vP.x * 10.0 + uTime * 3.0)
                      * cos(vP.y * 10.0 + uTime * 2.5)
                      * sin(vP.z * 10.0 + uTime * 2.0);

          vec3 col = mix(uColorA, uColorB, noise * 0.5 + 0.5 + fresnel);

          // Hot core
          col += vec3(1.0, 0.8, 0.5) * width(noise - 0.8) * 10.0;
          col *= (1.2 + uPulse * 2.0);

          gl_FragColor = vec4(col, 1.0);
        }

        float width(float v) {
            return step(0.0, v);
        }
      `,
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.core);

    // 2. Orbital Rings (Industrial)
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      metalness: 1.0,
      roughness: 0.1,
      emissive: 0xff4400,
      emissiveIntensity: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    // Add point light for the rings to catch
    const light = new THREE.PointLight(0xff6600, 5, 20);
    this.group.add(light);

    for (let i = 0; i < 4; i++) {
      const r = 2.8 + i * 1.5;
      // Hexagonal rings for more sci-fi look
      const geo = new THREE.TorusGeometry(r, 0.08 + i * 0.02, 6, 100);
      const mesh = new THREE.Mesh(geo, ringMat.clone());
      mesh.userData = {
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        speed: (0.1 + Math.random() * 0.4) * (i % 2 == 0 ? 1 : -1),
      };
      this.rings.push(mesh);
      this.group.add(mesh);
    }

    // 3. Sparks / Embers
    const pCount = 1200;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    this.particleData = new Float32Array(pCount * 4); // x,y,z, speed

    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 6.0;
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);

      this.particleData[i * 4] = pPos[i * 3];
      this.particleData[i * 4 + 1] = pPos[i * 3 + 1];
      this.particleData[i * 4 + 2] = pPos[i * 3 + 2];
      this.particleData[i * 4 + 3] = 0.5 + Math.random();
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      map: this.createSparkTexture(), // Create procedural texture
    });
    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);
  }

  // Helper for nice soft particles
  createSparkTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 32;
    cvs.height = 32;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,200,100,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(cvs);
    return tex;
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;

    // Core Pulse
    (this.core.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (this.core.material as THREE.ShaderMaterial).uniforms.uPulse.value =
      ctx.press;

    // Rings
    this.rings.forEach((r, i) => {
      const u = r.userData;
      // Add gyro tilt to ring axis
      const axis = u.axis
        .clone()
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), ctx.gyro.x)
        .normalize();
      r.rotateOnAxis(axis, u.speed * ctx.dt * (1 + ctx.press * 4));

      (r.material as THREE.MeshPhysicalMaterial).emissiveIntensity =
        0.5 + Math.sin(t * 3 + i) * 0.3 + ctx.press * 2;
    });

    // Particle orbit
    const pos = this.particles.geometry.attributes.position
      .array as Float32Array;
    for (
      let i = 0;
      i < this.particles.geometry.attributes.position.count;
      i++
    ) {
      const idx = i * 3;
      const speed = this.particleData[i * 4 + 3];
      // Vortex motion
      const x = pos[idx];
      const z = pos[idx + 2];
      const angle = speed * ctx.dt * (1 + ctx.press);

      pos[idx] = x * Math.cos(angle) - z * Math.sin(angle);
      pos[idx + 2] = x * Math.sin(angle) + z * Math.cos(angle);

      // Rise
      pos[idx + 1] += speed * ctx.dt;
      if (pos[idx + 1] > 6) pos[idx + 1] = -6;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // Camera Orbit
    const mx = ctx.pointer.x * 0.5 + ctx.gyro.y * 0.5;
    const my = ctx.pointer.y * 0.5 + ctx.gyro.x * 0.5;

    this.camera.position.x = damp(this.camera.position.x, mx * 3, 4, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, my * 3, 4, ctx.dt);
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      4,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);

    this.group.rotation.y = t * 0.05;
  }
}

// --- Scene 01: Strange Attractor ---

class StrangeAttractorScene extends SceneBase {
  private line: THREE.Line;
  private head: THREE.Mesh;
  private points: THREE.Vector3[] = [];
  private maxPoints = 5000; // Longer trail
  private currentPos: THREE.Vector3;
  private hue = 0;

  constructor() {
    super();
    this.id = 'scene01';
    this.contentRadius = 6.0;

    // Aizawa Attractor parameters
    this.currentPos = new THREE.Vector3(0.1, 0, 0);

    // Geometry
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.maxPoints * 3);
    const colors = new Float32Array(this.maxPoints * 3);

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Shader material for glowing gradient line
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
            attribute vec3 color;
            varying vec3 vColor;
            void main() {
                vColor = color;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    });

    this.line = new THREE.Line(geo, mat);
    this.line.frustumCulled = false;
    this.group.add(this.line);

    // Head marker
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.group.add(this.head);

    // Pre-fill
    for (let i = 0; i < 100; i++) this.step(0.01);
  }

  // Aizawa Attractor Math
  step(dt: number) {
    const p = this.currentPos;
    const x = p.x;
    const y = p.y;
    const z = p.z;

    const a = 0.95;
    const b = 0.7;
    const c = 0.6;
    const d = 3.5;
    const e = 0.25;
    const f = 0.1;

    const dx = (z - b) * x - d * y;
    const dy = d * x + (z - b) * y;
    const dz =
      c +
      a * z -
      (z * z * z) / 3 -
      (x * x + y * y) * (1 + e * z) +
      f * z * x * x * x;

    p.x += dx * dt;
    p.y += dy * dt;
    p.z += dz * dt;

    this.points.push(p.clone());
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
    return p;
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const steps = 3 + Math.floor(ctx.press * 5);
    for (let i = 0; i < steps; i++) {
      this.step(0.015);
    }

    // Update Geometry
    const positions = (
      this.line.geometry.attributes.position as THREE.BufferAttribute
    ).array as Float32Array;
    const colors = (
      this.line.geometry.attributes.color as THREE.BufferAttribute
    ).array as Float32Array;

    this.hue = (ctx.time * 0.1) % 1;
    const baseColor = new THREE.Color().setHSL(this.hue, 0.8, 0.5);
    const secondColor = new THREE.Color().setHSL(
      (this.hue + 0.5) % 1,
      0.8,
      0.5
    );

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      const pct = i / this.maxPoints;
      const c = baseColor.clone().lerp(secondColor, pct);
      const alpha = Math.pow(pct, 3);

      colors[i * 3] = c.r * alpha;
      colors[i * 3 + 1] = c.g * alpha;
      colors[i * 3 + 2] = c.b * alpha;
    }

    this.line.geometry.setDrawRange(0, this.points.length);
    this.line.geometry.attributes.position.needsUpdate = true;
    this.line.geometry.attributes.color.needsUpdate = true;

    this.head.position.copy(this.currentPos);

    this.group.rotation.y = ctx.time * 0.1;
    this.group.rotation.x = Math.sin(ctx.time * 0.05) * 0.2;

    const mx = ctx.pointer.x * 0.4;
    const my = ctx.pointer.y * 0.4;
    this.camera.position.x = damp(this.camera.position.x, mx * 10, 2, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, my * 10, 2, ctx.dt);

    const targetDist = this.baseDistance - ctx.press * 3;
    this.camera.position.z = damp(
      this.camera.position.z,
      targetDist,
      4,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 03: Quantum Ribbons (Data Flow) ---

class RibbonFieldScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 1500; // INCREASED
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene03';
    this.contentRadius = 6.0;

    // A single strip geometry - thinner and longer
    const geo = new THREE.PlaneGeometry(0.1, 24, 1, 128);

    // Custom shader
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
        uPress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vIndex;
        varying vec3 vPos;

        uniform float uTime;
        uniform vec2 uPointer;
        uniform float uPress;

        attribute float aIndex;
        attribute float aSpeed;

        // Simplex Noise (internal)
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec2 v){
           const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
           vec2 i  = floor(v + dot(v, C.yy) );
           vec2 x0 = v -   i + dot(i, C.xx);
           vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
           vec4 x12 = x0.xyxy + C.xxzz;
           x12.xy -= i1;
           i = mod(i, 289.0);
           vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
           vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
           m = m*m; m = m*m;
           vec3 x = 2.0 * fract(p * C.www) - 1.0;
           vec3 h = abs(x) - 0.5;
           vec3 ox = floor(x + 0.5);
           vec3 a0 = x - ox;
           m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
           vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
           return 130.0 * dot(m, g);
        }

        void main() {
           vUv = uv;
           vIndex = aIndex;

           vec3 pos = position;

           // Procedural placement
           float angle = aIndex * 0.1 + uTime * 0.05;
           float radius = 2.0 + sin(aIndex * 43.0) * 3.5;

           // Base position
           vec3 offset = vec3(cos(angle)*radius, 0.0, sin(angle)*radius);

           vec3 worldPos = vec3(offset.x, pos.y, offset.z);

           // Complex wave motion
           float t = uTime * 0.5 * aSpeed;
           float wave = snoise(vec2(worldPos.x * 0.2, worldPos.y * 0.1 + t));
           worldPos.x += wave * 3.0;
           worldPos.z += snoise(vec2(worldPos.z * 0.2, worldPos.y * 0.1 - t)) * 3.0;

           // Twist
           float twist = worldPos.y * 0.2 + t;
           float tx = worldPos.x * cos(twist) - worldPos.z * sin(twist);
           float tz = worldPos.x * sin(twist) + worldPos.z * cos(twist);
           worldPos.x = tx;
           worldPos.z = tz;

           // Interaction
           float d = distance(worldPos.xy, uPointer * 10.0);
           float repell = smoothstep(5.0, 0.0, d);
           worldPos.x += (worldPos.x - uPointer.x * 10.0) * repell * 1.5;

           vPos = worldPos;
           gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vIndex;
        varying vec3 vPos;
        uniform float uTime;
        uniform float uPress;

        void main() {
          // Texture pattern
          float lines = step(0.9, fract(vUv.y * 40.0 + vIndex + uTime * 2.0));

          vec3 c1 = vec3(0.0, 1.0, 0.8); // Cyan
          vec3 c2 = vec3(0.8, 0.0, 1.0); // Violet
          vec3 c3 = vec3(1.0, 0.8, 0.2); // Gold

          float mixer = sin(vIndex * 0.1 + vPos.y * 0.1 + uTime);
          vec3 col = mix(c1, c2, mixer * 0.5 + 0.5);
          col = mix(col, c3, clamp(sin(vPos.z * 0.2), 0.0, 1.0));

          // Glow intensity
          float alpha = 0.6 + lines * 0.4;
          alpha *= smoothstep(12.0, 0.0, abs(vPos.y)); // Fade ends

          // Press effect: Whiteout
          col += vec3(1.0) * uPress * 0.8;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(col * 2.0, alpha); // Boost brightness
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
    this.mesh.frustumCulled = false;

    // Set instance data
    const indices = new Float32Array(this.count);
    const speeds = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      this.dummy.position.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix); // Required to initialize
      indices[i] = i;
      speeds[i] = 0.5 + Math.random() * 0.8;
    }

    this.mesh.geometry.setAttribute(
      'aIndex',
      new THREE.InstancedBufferAttribute(indices, 1)
    );
    this.mesh.geometry.setAttribute(
      'aSpeed',
      new THREE.InstancedBufferAttribute(speeds, 1)
    );

    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    // Normalized pointer for shader (-1 to 1 is screen, but here we cover world space roughly)
    const px = ctx.pointer.x; // -1 to 1
    const py = ctx.pointer.y; // -1 to 1
    mat.uniforms.uPointer.value.set(px, py);

    // Rotate whole group
    this.group.rotation.y = ctx.time * 0.1;

    // Camera
    const mx = ctx.pointer.x * 0.5;
    const my = ctx.pointer.y * 0.5;
    this.camera.position.x = damp(this.camera.position.x, mx * 5, 2, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, my * 5, 2, ctx.dt);

    // Zoom in/out based on press
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance - ctx.press * 5,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 02: Million Fireflies (Vector Calculus) ---

class MillionFirefliesScene extends SceneBase {
  private particles: THREE.Points;
  private count = 50000;

  constructor() {
    super();
    this.id = 'scene02';
    this.contentRadius = 6.0;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    const data = new Float32Array(this.count * 3); // phase, speed, size

    for (let i = 0; i < this.count; i++) {
      const r = Math.pow(Math.random(), 0.5) * 10.0;
      const theta = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 5.0 * (1.0 - r / 10.0);

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = r * Math.sin(theta);

      data[i * 3] = Math.random() * Math.PI * 2;
      data[i * 3 + 1] = 0.5 + Math.random();
      data[i * 3 + 2] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0xffcc00) },
      },
      vertexShader: `
            uniform float uTime;
            uniform float uPress;
            attribute vec3 aData;
            varying float vAlpha;

            void main() {
                vec3 p = position;
                float t = uTime * aData.y * 0.2;

                float angle = t + length(p.xz) * 0.5;
                float ca = cos(angle * 0.1);
                float sa = sin(angle * 0.1);

                float x = p.x * ca - p.z * sa;
                float z = p.x * sa + p.z * ca;
                p.x = x; p.z = z;

                p.y += sin(t * 5.0 + aData.x) * 0.2;
                p += normalize(p) * uPress * 5.0;

                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;

                gl_PointSize = (2.0 + aData.z * 3.0) * (20.0 / -mv.z);

                vAlpha = 0.5 + 0.5 * sin(uTime * 3.0 + aData.x);
            }
        `,
      fragmentShader: `
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;
                gl_FragColor = vec4(uColor, vAlpha);
            }
        `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.particles.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    // Group rotate
    this.group.rotation.y = ctx.time * 0.05;
    this.group.rotation.x = Math.sin(ctx.time * 0.1) * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 04: Aurora Field (Ethereal) ---

class MagnetosphereScene extends SceneBase {
  private particles: THREE.Points;
  private count = 50000; // Increased density

  constructor() {
    super();
    this.id = 'scene04';
    this.contentRadius = 7.0;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    const data = new Float32Array(this.count * 4); // x/z anchor, speed, phase, y-offset

    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 8;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      data[i * 4] = x;
      data[i * 4 + 1] = z;
      data[i * 4 + 2] = 0.2 + Math.random() * 0.8;
      data[i * 4 + 3] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 4));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
      },
      vertexShader: `
            uniform float uTime;
            uniform float uPress;
            uniform vec2 uPointer;
            attribute vec4 aData;
            varying float vAlpha;
            varying vec3 vColor;

            // Simple noise
            float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f*f*(3.0-2.0*f);
                return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), f.x),
                           mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
            }

            void main() {
                vec3 pos = position;
                float px = aData.x;
                float pz = aData.y;

                // Flow field motion
                float t = uTime * 0.5;
                float n = noise(vec2(px * 0.1 + t, pos.y * 0.1));

                pos.x = px + sin(pos.y * 0.5 + t) * 2.0;
                pos.z = pz + cos(pos.y * 0.5 + t) * 1.0;
                pos.y += sin(t + aData.w) * 0.5;

                // Mouse repel
                vec3 interaction = vec3(uPointer.x * 15.0, 0.0, uPointer.y * 15.0);
                float d = distance(pos.xz, interaction.xz);
                float f = smoothstep(5.0, 0.0, d);
                pos.y += f * 3.0 * uPress;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

                // Scale based on depth
                gl_PointSize = (4.0 + f * 10.0) * (30.0 / -gl_Position.z);

                // Aurora Colors
                vec3 c1 = vec3(0.0, 1.0, 0.8); // Cyan
                vec3 c2 = vec3(0.5, 0.0, 1.0); // Purple
                vec3 c3 = vec3(0.0, 1.0, 0.2); // Green

                float h = smoothstep(-4.0, 4.0, pos.y);
                vColor = mix(c3, c2, h);
                vColor = mix(vColor, c1, step(0.8, h));

                vAlpha = smoothstep(0.0, 0.2, h) * (1.0 - smoothstep(0.8, 1.0, h));
                vAlpha *= 0.8;
            }
      `,
      fragmentShader: `
            varying float vAlpha;
            varying vec3 vColor;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;
                float glow = 1.0 - d * 2.0;
                gl_FragColor = vec4(vColor * 2.0, vAlpha * glow);
            }
      `,
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    this.group.rotation.y = ctx.time * 0.02; // Slow drift
    const mat = this.particles.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;
    mat.uniforms.uPointer.value.set(ctx.pointer.x, ctx.pointer.y);

    const mx = ctx.pointer.x * 0.5;
    const my = ctx.pointer.y * 0.2;
    this.camera.position.x = damp(this.camera.position.x, mx * 5, 2, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, my * 2, 2, ctx.dt);
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 05: Event Horizon (Cosmic Horror) ---

class EventHorizonScene extends SceneBase {
  private disk: THREE.Mesh;
  private glow: THREE.Mesh;

  constructor() {
    super();
    this.id = 'scene05';
    this.contentRadius = 6.0;

    // 1. Bright Accretion Disk
    const geo = new THREE.RingGeometry(1.5, 6.0, 128, 1);
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0xff3300) }, // Deep Orange
        uColorB: { value: new THREE.Color(0xffddaa) }, // Hot White
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f*f*(3.0-2.0*f);
            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), f.x),
                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
        }

        void main() {
            // Polar coordinates
            vec2 centered = vUv * 2.0 - 1.0;

            float angle = atan(centered.y, centered.x);
            float len = length(centered);

            // Flow
            float speed = 2.0;
            float turb = noise(vec2(angle * 6.0 - uTime * speed, len * 10.0));

            // Brightness gradient
            float core = smoothstep(0.0, 1.0, turb);
            vec3 col = mix(uColorA, uColorB, core * 2.0); // Super bright

            float alpha = smoothstep(0.2, 0.4, len) * (1.0 - smoothstep(0.9, 1.0, len));

            gl_FragColor = vec4(col * 4.0, 1.0); // Intensity 4.0
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.disk = new THREE.Mesh(geo, mat);
    this.disk.rotation.x = Math.PI * 0.4;
    this.group.add(this.disk);

    // 2. Black Hole Center (The Void)
    const bhGeo = new THREE.SphereGeometry(1.4, 64, 64);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bh = new THREE.Mesh(bhGeo, bhMat);
    this.group.add(bh);

    // 3. Corona Glow
    const shineGeo = new THREE.PlaneGeometry(12, 12);
    const shineMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
      fragmentShader: `
            varying vec2 vUv;
            void main() {
                float d = distance(vUv, vec2(0.5));
                float a = 1.0 / (d * 8.0) - 0.2;
                a = clamp(a, 0.0, 1.0);
                gl_FragColor = vec4(1.0, 0.5, 0.2, a * 0.5);
            }
        `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(shineGeo, shineMat);
    // Always face camera
    this.group.add(this.glow);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    (this.disk.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Wobble disk
    this.disk.rotation.z = t * 0.1;
    this.disk.rotation.x = Math.PI * 0.35 + Math.sin(t * 0.5) * 0.1;

    // Camera LookAt
    this.glow.lookAt(this.camera.position);

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 06: Kaleido Glass (Fractal Refraction) ---

class KaleidoGlassScene extends SceneBase {
  private shapes: THREE.InstancedMesh;
  private count = 300;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene06';
    this.contentRadius = 5.0;

    // Prism Geometry
    const geo = new THREE.ConeGeometry(0.5, 1.5, 4);

    // High-end glass material
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x220033,
      metalness: 0.1,
      roughness: 0.0,
      transmission: 1.0,
      thickness: 2.0,
      ior: 1.6,
      dispersion: 1.0, // Enable if recent Three.js supports it, else ignored
      clearcoat: 1.0,
      attenuationColor: new THREE.Color(0xff00aa),
      attenuationDistance: 1.0,
    });

    this.shapes = new THREE.InstancedMesh(geo, mat, this.count);

    // Arrange in a Fractal Sphere pattern
    for (let i = 0; i < this.count; i++) {
      // Golden Angle distribution
      const phi = Math.acos(-1 + (2 * i) / this.count);
      const theta = Math.sqrt(this.count * Math.PI) * phi;

      const r = 3.5;
      this.dummy.position.setFromSphericalCoords(r, phi, theta);
      this.dummy.lookAt(0, 0, 0); // Point inward

      // Random scale variation
      const s = 0.5 + Math.random() * 1.0;
      this.dummy.scale.set(s, s * 2.0, s);

      this.dummy.updateMatrix();
      this.shapes.setMatrixAt(i, this.dummy.matrix);
    }

    this.group.add(this.shapes);

    // Inner Light to refract
    const light = new THREE.PointLight(0xffffff, 5, 10);
    this.group.add(light);

    const wireGeo = new THREE.IcosahedronGeometry(2.0, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
    });
    this.group.add(new THREE.Mesh(wireGeo, wireMat));
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    this.shapes.rotation.y = t * 0.1;
    this.shapes.rotation.z = t * 0.05;

    // Interactive
    this.group.rotation.x = ctx.pointer.y + ctx.gyro.x;
    this.group.rotation.y = ctx.pointer.x + ctx.gyro.y;

    // Pulse scale of the whole group?
    const s = 1.0 + Math.sin(t) * 0.05;
    this.shapes.scale.setScalar(s);

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 07: Data Sculpture (Matrix Vortex) ---

class TypographicSculptureScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 2000;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'scene07';
    this.contentRadius = 6.0;

    // Texture generation (Binary code)
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 64;
    const c = cvs.getContext('2d')!;
    c.fillStyle = '#000';
    c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#0f0';
    c.font = 'bold 30px monospace';
    c.fillText('0 1 1 0 1 0 1 1', 10, 40);
    const tex = new THREE.CanvasTexture(cvs);

    const geo = new THREE.PlaneGeometry(0.5, 0.15);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      color: 0x00ff00,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const press = ctx.press;

    // Vortex Math
    for (let i = 0; i < this.count; i++) {
      // Spiral down a tunnel
      const progress = (i / this.count + t * 0.2) % 1.0;
      const angle = progress * Math.PI * 20.0;
      const radius = 2.0 + Math.pow(progress, 2.0) * 8.0;
      const y = (1.0 - progress) * 10.0 - 5.0;

      this.dummy.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );

      // Look at center axis
      this.dummy.lookAt(0, y, 0);
      this.dummy.rotateY(Math.PI / 2); // Align text along flow

      // Chaos on press
      if (press > 0.01) {
        this.dummy.position.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * press,
            (Math.random() - 0.5) * press,
            (Math.random() - 0.5) * press
          )
        );
      }

      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    this.group.rotation.x = ctx.pointer.y * 0.2;
    this.group.rotation.z = ctx.pointer.x * 0.2;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 08: Orbital Mechanics (Gravity) ---

class OrbitalMechanicsScene extends SceneBase {
  private debris: THREE.InstancedMesh;
  private planet: THREE.Mesh;
  private count = 1500;
  private dummy = new THREE.Object3D();
  private physics: SimplePhysics;
  private pointerPos = new THREE.Vector3();

  constructor() {
    super();
    this.id = 'scene08';
    this.contentRadius = 8.0;

    // Planet
    const pGeo = new THREE.SphereGeometry(2, 32, 32);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      emissive: 0x111111,
    });
    this.planet = new THREE.Mesh(pGeo, pMat);
    this.group.add(this.planet);

    // Debris Ring
    const dGeo = new THREE.DodecahedronGeometry(0.08); // Slightly larger for visibility
    const dMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.4,
    });
    this.debris = new THREE.InstancedMesh(dGeo, dMat, this.count);
    this.group.add(this.debris);

    // Init Physics
    this.physics = new SimplePhysics(this.count);
    this.physics.bounds.set(20, 20, 20); // Large bounds
    this.physics.friction = 0.99; // Low friction for space

    // Init positions data
    for (let i = 0; i < this.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.5 + Math.random() * 4.5;
      const y = (Math.random() - 0.5) * 0.5; // Flat disk

      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      this.physics.initParticle(i, new THREE.Vector3(x, y, z), 0.1);

      // Give initial orbital velocity
      // Tangent vector
      const tx = -z;
      const tz = x;
      const len = Math.sqrt(tx * tx + tz * tz);
      const speed = 0.05 + Math.random() * 0.02; // Arbitrary orbital speed

      // Hack: Set 'previous' position slightly behind to create velocity
      this.physics.oldPositions[i * 3] = x - (tx / len) * speed;
      this.physics.oldPositions[i * 3 + 1] = y;
      this.physics.oldPositions[i * 3 + 2] = z - (tz / len) * speed;

      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const dt = Math.min(ctx.dt, 1 / 30);

    // Pointer to world
    this.pointerPos.set(ctx.pointer.x * 12.0, ctx.pointer.y * 12.0, 0);

    // 1. Apply Central Gravity
    // F = G * m1 * m2 / r^2
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = this.physics.positions[idx];
      const y = this.physics.positions[idx + 1];
      const z = this.physics.positions[idx + 2];

      // Distance to center
      const dx = -x;
      const dy = -y;
      const dz = -z;
      const distSq = dx * dx + dy * dy + dz * dz + 0.1;
      const dist = Math.sqrt(distSq);

      // Gravity force strength (tuned for visual feel)
      const g = 0.005 / distSq;

      this.physics.positions[idx] += (dx / dist) * g;
      this.physics.positions[idx + 1] += (dy / dist) * g;
      this.physics.positions[idx + 2] += (dz / dist) * g;
    }

    // 2. Physics Step
    this.physics.update(dt, this.pointerPos, 3.0);

    // 3. Sync
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = this.physics.positions[idx];
      const y = this.physics.positions[idx + 1];
      const z = this.physics.positions[idx + 2];

      this.dummy.position.set(x, y, z);

      // Align to velocity
      const vx = x - this.physics.oldPositions[idx];
      const vy = y - this.physics.oldPositions[idx + 1];
      const vz = z - this.physics.oldPositions[idx + 2];

      if (Math.abs(vx) + Math.abs(vz) > 0.0001) {
        this.dummy.lookAt(x + vx, y + vy, z + vz);
      }

      this.dummy.scale.setScalar(1.0);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;

    // Interactive tilt
    this.group.rotation.x = 0.4 + ctx.pointer.y * 0.2;
    this.group.rotation.z = 0.2 + ctx.pointer.x * 0.2;

    // Planet rotates
    this.planet.rotation.y = t * 0.05;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 09: Crystal Fracture (Glitch) ---

class VoronoiShardsScene extends SceneBase {
  private shards: THREE.InstancedMesh;
  private count = 1000;
  private dummy = new THREE.Object3D();
  private physics: SimplePhysics;
  private pointerPos = new THREE.Vector3();

  constructor() {
    super();
    this.id = 'scene09';
    this.contentRadius = 6.0;

    // 2026 Upgrade: Physical Glass Material + Instanced Geometry
    // We import directly (relying on hoisted imports or dynamic if needed, but here we assume top-level import was added or we inline for safety if the tool failed nicely)
    // Inline material for robustness during edit:
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1.0,
      thickness: 1.0,
      roughness: 0,
      metalness: 0,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0,
      envMapIntensity: 1.5,
    });
    // @ts-expect-error Dispersion not yet in types
    mat.dispersion = 0.05;

    // Use crystal shards (Octahedrons)
    const geo = new THREE.OctahedronGeometry(0.2, 0);

    this.shards = new THREE.InstancedMesh(geo, mat, this.count);
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.shards);

    // Init Physics
    this.physics = new SimplePhysics(this.count);
    this.physics.bounds.set(8, 8, 8); // Wider loose bounds
    this.physics.friction = 0.96; // Floatier

    // Init data
    const data = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) {
      // Random volume
      const x = (Math.random() - 0.5) * 8.0;
      const y = (Math.random() - 0.5) * 12.0;
      const z = (Math.random() - 0.5) * 8.0;

      data[i * 4 + 3] = Math.random(); // phase

      this.physics.initParticle(i, new THREE.Vector3(x, y, z), 0.25);

      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);
    }
    this.shards.userData.origins = data;
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const dt = Math.min(ctx.dt, 1 / 30); // Cap dt

    // Map pointer to world (approximate plane at z=0)
    // Assuming camera is at z=20 looking at 0, fov ~50
    // Visible height at z=0 is approx 20 * tan(25deg)*2 ~= 18
    this.pointerPos.set(ctx.pointer.x * 9.0, ctx.pointer.y * 9.0, 0);

    // Run Physics
    this.physics.update(dt, this.pointerPos, 2.5);

    const data = this.shards.userData.origins;

    for (let i = 0; i < this.count; i++) {
      const p = data[i * 4 + 3];

      // Read physics p
      const px = this.physics.positions[i * 3];
      const py = this.physics.positions[i * 3 + 1];
      const pz = this.physics.positions[i * 3 + 2];

      this.dummy.position.set(px, py, pz);

      // Tumble
      this.dummy.rotation.set(t * 0.5 + p, t * 0.3 + p, t * 0.1);

      // Glitch scale
      const glitchTrigger = Math.sin(t * 3.0 + p * 10.0);
      const glitchOffset = glitchTrigger > 0.9 ? 0.3 : 0.0;
      this.dummy.scale.setScalar((0.8 + p * 0.4) * (1.0 + glitchOffset));

      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);
    }
    this.shards.instanceMatrix.needsUpdate = true;

    this.group.rotation.y = t * 0.05;
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 10: Moiré Patterns (Interference) ---

class MoireInterferenceScene extends SceneBase {
  private sphereA: THREE.Points;
  private sphereB: THREE.Points;

  constructor() {
    super();
    this.id = 'scene10';
    this.contentRadius = 5.0;

    const count = 10000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Fibonacci Sphere (Uniform distribution)
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const r = 3.0;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x00ffcc,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
    });

    this.sphereA = new THREE.Points(geo, mat);
    this.sphereB = new THREE.Points(geo, mat.clone());
    (this.sphereB.material as THREE.PointsMaterial).color.setHex(0xff00cc);

    this.group.add(this.sphereA);
    this.group.add(this.sphereB);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    // Rotate counter to create interference
    this.sphereA.rotation.y = t * 0.1;
    this.sphereB.rotation.y = t * 0.11; // Slight diff to create beating pattern

    this.sphereA.scale.setScalar(1.0);
    this.sphereB.scale.setScalar(1.01 + Math.sin(t * 10.0) * 0.02 * ctx.press);

    this.group.rotation.x = ctx.pointer.y;
    this.group.rotation.y = ctx.pointer.x;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 11: Neural Network (Deep Learning) ---

class NeuralNetworkScene extends SceneBase {
  private points: THREE.InstancedMesh;
  private lines: THREE.LineSegments;
  private count = 100;

  constructor() {
    super();
    this.id = 'scene11';
    this.contentRadius = 5.0;

    // Nodes
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    this.points = new THREE.InstancedMesh(geo, mat, this.count);

    const pos = [];
    const helper = new THREE.Object3D();

    // Layered random positions
    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 4;
      helper.position.set(x, y, z);
      helper.updateMatrix();
      this.points.setMatrixAt(i, helper.matrix);
      pos.push(new THREE.Vector3(x, y, z));
    }
    this.group.add(this.points);

    // Connections (Nearest neighbors)
    const linePos = [];
    for (let i = 0; i < this.count; i++) {
      const p1 = pos[i];
      // Connect to 3 nearest
      let distances = pos.map((p2, idx) => ({ d: p1.distanceTo(p2), id: idx }));
      distances.sort((a, b) => a.d - b.d);

      for (let k = 1; k < 4; k++) {
        const p2 = pos[distances[k].id];
        linePos.push(p1.x, p1.y, p1.z);
        linePos.push(p2.x, p2.y, p2.z);
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePos, 3)
    );

    // Pulse shader for lines
    const lineMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xff0055) },
      },
      vertexShader: `
                varying vec3 vPos;
                void main() {
                    vPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
      fragmentShader: `
                varying vec3 vPos;
                uniform float uTime;
                uniform vec3 uColor;
                void main() {
                    // Packet moving
                    float dist = length(vPos); // Simple metric
                    float pulse = smoothstep(0.1, 0.0, abs(fract(dist * 0.5 - uTime) - 0.5));

                    float alpha = 0.1 + pulse * 0.9;
                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.lines = new THREE.LineSegments(lineGeo, lineMat);
    this.group.add(this.lines);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    (this.lines.material as THREE.ShaderMaterial).uniforms.uTime.value =
      ctx.time;

    this.group.rotation.y = ctx.time * 0.1;
    this.group.rotation.x = ctx.pointer.y * 0.2;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 12: Library (Knowledge) ---

class LibraryScene extends SceneBase {
  private books: THREE.InstancedMesh;
  private count = 400;

  constructor() {
    super();
    this.id = 'scene12';
    this.contentRadius = 6.0;

    const geo = new THREE.BoxGeometry(0.2, 1.0, 0.7);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.6,
    });
    this.books = new THREE.InstancedMesh(geo, mat, this.count);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.count; i++) {
      // Spiral
      const angle = i * 0.1;
      const r = 2 + i * 0.01;
      const h = (i - this.count / 2) * 0.05;

      dummy.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      dummy.lookAt(0, h, 0);
      dummy.updateMatrix();
      this.books.setMatrixAt(i, dummy.matrix);

      // Random color per book
      this.books.setColorAt(
        i,
        new THREE.Color().setHSL(Math.random(), 0.6, 0.5)
      );
    }
    this.group.add(this.books);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    this.group.rotation.y = ctx.time * 0.05 + ctx.pointer.x; // Slow scroll
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 13: Deep Abyss (Underworld) ---

class BioluminescentScene extends SceneBase {
  private particles: THREE.Points;
  private count = 2000;

  constructor() {
    super();
    this.id = 'scene13';
    this.contentRadius = 6.0;

    // Organic debris / plankton
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    const data = new Float32Array(this.count * 3); // phase, speed, size

    for (let i = 0; i < this.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.0 + Math.random() * 8.0;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      data[i * 3] = Math.random() * Math.PI * 2;
      data[i * 3 + 1] = 0.2 + Math.random() * 0.5;
      data[i * 3 + 2] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uColor: { value: new THREE.Color(0x00ff88) },
      },
      vertexShader: `
            uniform float uTime;
            uniform float uPress;
            attribute vec3 aData;
            varying float vAlpha;

            // Gradient noise
            vec3 hash( vec3 p ) {
                p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
                          dot(p,vec3(269.5,183.3,246.1)),
                          dot(p,vec3(113.5,271.9,124.6)));
                return -1.0 + 2.0*fract(sin(p)*43758.5453123);
            }
            float noise( in vec3 p ) {
                vec3 i = floor( p );
                vec3 f = fract( p );
                vec3 u = f*f*(3.0-2.0*f);
                return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ),
                                      dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                                 mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ),
                                      dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                            mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ),
                                      dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                                 mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ),
                                      dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
            }

            void main() {
                vec3 p = position;
                float t = uTime * aData.y * 0.5;

                // Turbulent water flow
                p.x += noise(vec3(p.xy * 0.5, t)) * 2.0;
                p.y += noise(vec3(p.yz * 0.5, t + 10.0)) * 2.0;
                p.z += noise(vec3(p.xz * 0.5, t + 20.0)) * 2.0;

                // Press to disperse
                vec3 dir = normalize(p);
                p += dir * uPress * 10.0;

                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = (4.0 + aData.z * 10.0) * (10.0 / -mv.z);

                vAlpha = 0.5 + 0.5 * sin(uTime * 3.0 + aData.x);
            }
        `,
      fragmentShader: `
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
                vec2 uv = gl_PointCoord - 0.5;
                float d = length(uv);
                if (d > 0.5) discard;

                // Soft hoop
                float glow = smoothstep(0.5, 0.3, d);
                // Center dot
                float core = smoothstep(0.1, 0.0, d);

                vec3 c = mix(uColor, vec3(1.0), core);
                gl_FragColor = vec4(c * 2.0, glow * vAlpha);
            }
        `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);

    // Dark foggy background object (optional, but let's just use particles for now to keep it clean)
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.particles.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;

    // Slow deep rotation
    this.group.rotation.x = Math.sin(ctx.time * 0.1) * 0.2;
    this.group.rotation.y = ctx.time * 0.05;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 14: Cyber City (Network) ---

class HolographicCityScene extends SceneBase {
  private city: THREE.Group;
  private traffic: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private trafficCount = 4000;

  constructor() {
    super();
    this.id = 'scene14';
    this.contentRadius = 8.0;
    this.city = new THREE.Group();

    // 1. Buildings (Instanced Grid)
    const bGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
    // Move pivot to bottom
    bGeo.translate(0, 0.5, 0);

    const bMat = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const buildings = new THREE.InstancedMesh(bGeo, bMat, 1000);

    let idx = 0;
    for (let x = -15; x <= 15; x++) {
      for (let z = -15; z <= 15; z++) {
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue; // Clear center for camera
        if (Math.random() > 0.3) continue; // Sparse
        if (idx >= 1000) break;

        const h = 2.0 + Math.pow(Math.random(), 3.0) * 15.0; // Exponential height dist
        this.dummy.position.set(x * 2.0, -5, z * 2.0);
        this.dummy.scale.set(1, h, 1);
        this.dummy.updateMatrix();
        buildings.setMatrixAt(idx++, this.dummy.matrix);
      }
    }
    this.city.add(buildings);

    // 2. Traffic (Flying cars / Data packets)
    const tGeo = new THREE.BoxGeometry(0.05, 0.05, 0.8);
    const tMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
    this.traffic = new THREE.InstancedMesh(tGeo, tMat, this.trafficCount);

    const tData = new Float32Array(this.trafficCount * 4); // x, y, z, axis(0=x, 1=z)

    for (let i = 0; i < this.trafficCount; i++) {
      const axis = Math.random() > 0.5 ? 0 : 1;
      // Align to grid
      const lane = Math.floor((Math.random() - 0.5) * 30) * 2.0;
      const height = -4.0 + Math.random() * 10.0;
      const offset = (Math.random() - 0.5) * 60.0;

      tData[i * 4] = lane; // Fixed coordinate
      tData[i * 4 + 1] = height; // Y
      tData[i * 4 + 2] = offset; // Moving coordinate
      tData[i * 4 + 3] = axis; // Direction
    }
    this.traffic.geometry.setAttribute(
      'aDat',
      new THREE.InstancedBufferAttribute(tData, 4)
    );
    this.city.add(this.traffic);

    this.group.add(this.city);

    // Grid Floor
    const grid = new THREE.GridHelper(60, 60, 0x0044ff, 0x001133);
    grid.position.y = -5;
    this.group.add(grid);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    this.group.rotation.y = ctx.time * 0.05;

    // Traffic Flow
    const tData = (
      this.traffic.geometry.getAttribute(
        'aDat'
      ) as THREE.InstancedBufferAttribute
    ).array;

    for (let i = 0; i < this.trafficCount; i++) {
      const lane = tData[i * 4];
      const h = tData[i * 4 + 1];
      let pos = tData[i * 4 + 2];
      const axis = tData[i * 4 + 3];

      // Move
      const speed = 15.0 * ctx.dt * (1.0 + ctx.press * 4.0);
      pos += speed * (i % 2 == 0 ? 1 : -1);

      // Wrap
      if (pos > 30) pos -= 60;
      if (pos < -30) pos += 60;

      tData[i * 4 + 2] = pos;

      if (axis === 0) {
        this.dummy.position.set(pos, h, lane);
        this.dummy.rotation.set(0, Math.PI / 2, 0);
      } else {
        this.dummy.position.set(lane, h, pos);
        this.dummy.rotation.set(0, 0, 0);
      }
      this.dummy.updateMatrix();
      this.traffic.setMatrixAt(i, this.dummy.matrix);
    }
    this.traffic.instanceMatrix.needsUpdate = true;

    // Camera Flyover
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.position.y = damp(
      this.camera.position.y,
      4 + ctx.press * 10,
      2,
      ctx.dt
    );
    this.camera.lookAt(0, -2, 0);
  }
}

// --- Scene 15: Reality Collapse (Entropy) ---

class RealityCollapseScene extends SceneBase {
  private points: THREE.Points;
  private count = 30000;

  constructor() {
    super();
    this.id = 'scene15';
    this.contentRadius = 6.0;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    const data = new Float32Array(this.count * 3); // initial_radius, theta, phi

    for (let i = 0; i < this.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3.0; // Surface of sphere

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      data[i * 3] = r;
      data[i * 3 + 1] = theta;
      data[i * 3 + 2] = phi;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(data, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPress: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
      },
      vertexShader: `
            uniform float uTime;
            uniform float uPress;
            uniform vec2 uPointer;
            attribute vec3 aData;
            varying float vGlow;

            // Simplex noise
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m; m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                float r = aData.x;
                float theta = aData.y;
                float phi = aData.z;

                // Base position
                vec3 p = position;

                // Chaos field
                float noise = snoise(vec2(theta * 5.0 + uTime, phi * 5.0));

                // Explode outwards
                float displacement = noise * 2.0 * (0.1 + uPress * 3.0);

                // Pointer interaction (Repel)
                float d = distance(p.xy, uPointer * 10.0);
                displacement += smoothstep(5.0, 0.0, d) * 3.0;

                p += normalize(p) * displacement;

                // Add some rotation turbulence
                float t = uTime * 0.5;
                float x = p.x; float z = p.z;
                p.x = x * cos(t) - z * sin(t);
                p.z = x * sin(t) + z * cos(t);

                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = (3.0 + displacement * 5.0) * (20.0 / -mv.z);

                vGlow = 0.5 + noise * 0.5;
            }
        `,
      fragmentShader: `
            varying float vGlow;
            void main() {
                if(length(gl_PointCoord - 0.5) > 0.5) discard;
                gl_FragColor = vec4(1.0, 0.2, 0.1, vGlow); // Red-Orange-Void
            }
        `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.points.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uPress.value = ctx.press;
    mat.uniforms.uPointer.value.set(ctx.pointer.x, ctx.pointer.y);

    this.group.rotation.y = ctx.time * 0.1;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Factory ---

export const createScenes = (): TowerScene[] => [
  new FeedbackForgeScene(),
  new StrangeAttractorScene(),
  new MillionFirefliesScene(),
  new RibbonFieldScene(),
  new MagnetosphereScene(),
  new EventHorizonScene(),
  new KaleidoGlassScene(),
  new TypographicSculptureScene(),
  new OrbitalMechanicsScene(),
  new VoronoiShardsScene(),
  new MoireInterferenceScene(),
  new NeuralNetworkScene(),
  new LibraryScene(),
  new BioluminescentScene(),
  new HolographicCityScene(),
  new RealityCollapseScene(),
];

export const getSceneMeta = () => sceneMeta;
