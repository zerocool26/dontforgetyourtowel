import * as THREE from 'three';
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
    id: 'feedback-forge',
    title: 'Feedback Forge',
    subtitle: 'Resonant Structures',
    index: 0,
  },
  {
    id: 'strange-attractor',
    title: 'Strange Attractors',
    subtitle: 'Chaotic Systems',
    index: 1,
  },
  {
    id: 'ribbon-field',
    title: 'Flow Fields',
    subtitle: 'Vector Calculus',
    index: 2,
  },
  {
    id: 'gyroid-cavern',
    title: 'Gyroid Cavern',
    subtitle: 'Minimal Surfaces',
    index: 3,
  },
  {
    id: 'magnetosphere',
    title: 'Magnetosphere',
    subtitle: 'Field Theory',
    index: 4,
  },
  {
    id: 'event-horizon',
    title: 'Event Horizon',
    subtitle: 'Singularity',
    index: 5,
  },
  {
    id: 'kaleido-glass',
    title: 'Kaleido Glass',
    subtitle: 'Refraction',
    index: 6,
  },
  {
    id: 'typo-sculpt',
    title: 'Data Sculpture',
    subtitle: 'Information',
    index: 7,
  },
  {
    id: 'orbit-mech',
    title: 'Orbital Mechanics',
    subtitle: 'Gravity',
    index: 8,
  },
  {
    id: 'voronoi',
    title: 'Voronoi Shards',
    subtitle: 'Tessellation',
    index: 9,
  },
  { id: 'moire', title: 'Moiré Patterns', subtitle: 'Interference', index: 10 },
  {
    id: 'neural',
    title: 'Neural Networks',
    subtitle: 'Deep Learning',
    index: 11,
  },
  { id: 'library', title: 'The Library', subtitle: 'Knowledge', index: 12 },
  {
    id: 'biolum',
    title: 'Bioluminescence',
    subtitle: 'Organic Light',
    index: 13,
  },
  {
    id: 'hologram',
    title: 'Holographic City',
    subtitle: 'Future State',
    index: 14,
  },
  { id: 'collapse', title: 'Reality Collapse', subtitle: 'Entropy', index: 15 },
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
    this.id = 'feedback-forge';
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
    this.id = 'strange-attractor';
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

// --- Scene 02: Quantum Ribbons (Data Flow) ---

class RibbonFieldScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 60;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'ribbon-field';
    this.contentRadius = 6.0;

    // A single strip geometry
    const geo = new THREE.PlaneGeometry(0.3, 16, 1, 64);

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
           float angle = aIndex * 0.3 + uTime * 0.1;
           float radius = 3.0 + sin(aIndex * 13.0) * 1.5;

           // Base position
           vec3 offset = vec3(cos(angle)*radius, 0.0, sin(angle)*radius);

           vec3 worldPos = vec3(offset.x, pos.y, offset.z);

           // Wave
           float wave = snoise(vec2(worldPos.x * 0.1, worldPos.y * 0.1 + uTime * 0.3));
           worldPos.x += wave * 2.0;
           worldPos.z += snoise(vec2(worldPos.z * 0.1, worldPos.y * 0.1 - uTime * 0.2)) * 2.0;

           // Interaction
           float d = distance(worldPos.xy, uPointer * 10.0);
           float repell = smoothstep(4.0, 0.0, d);
           worldPos.x += (worldPos.x - uPointer.x * 10.0) * repell * 0.5;

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
          float lines = step(0.9, fract(vUv.y * 20.0 + vIndex + uTime));

          vec3 c1 = vec3(0.1, 0.8, 1.0); // Cyan
          vec3 c2 = vec3(1.0, 0.2, 0.5); // Pink

          vec3 col = mix(c1, c2, sin(vIndex * 0.5 + vPos.y * 0.2) * 0.5 + 0.5);

          // Glow intensity
          float alpha = 0.3 + lines * 0.7;
          alpha *= smoothstep(8.0, 0.0, abs(vPos.y)); // Fade ends

          // Press effect: Whiteout
          col += vec3(1.0) * uPress;

          gl_FragColor = vec4(col, alpha);
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
      speeds[i] = 0.5 + Math.random();
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
    this.group.rotation.y = ctx.time * 0.05;

    // Camera
    const mx = ctx.pointer.x * 0.5;
    const my = ctx.pointer.y * 0.5;
    this.camera.position.x = damp(this.camera.position.x, mx * 5, 2, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, my * 5, 2, ctx.dt);
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 03: Gyroid Cavern (Bio-Structure) ---

class GyroidCavernScene extends SceneBase {
  private mesh: THREE.Mesh;

  constructor() {
    super();
    this.id = 'gyroid-cavern';
    this.contentRadius = 6;

    // A box that acts as the bounds for our raymarcher
    const geo = new THREE.BoxGeometry(10, 10, 10);
    const mat = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uCut: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
        uCamPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
            varying vec3 vPos;
            varying vec3 vWorldPos;
            void main() {
                vPos = position;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
      fragmentShader: `
            varying vec3 vPos;
            varying vec3 vWorldPos;
            uniform float uTime;
            uniform float uCut;
            uniform vec3 uCamPos;
            uniform vec2 uMouse;

            // SDF Logic
            float smin(float a, float b, float k) {
                float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
                return mix(b, a, h) - k*h*(1.0-h);
            }

            float gyroid(vec3 p, float scale) {
                return dot(sin(p*scale), cos(p.zxy*scale));
            }

            float map(vec3 p) {
                // Sphere bound
                float d = length(p) - 4.5;

                // Animated Gyroid
                float scale = 1.8;
                float shift = uTime * 0.5;
                float g = gyroid(p + vec3(shift, shift * 0.5, 0), scale);

                // Shell thickness varies with click
                float thick = 0.15 + uCut * 0.5;
                float structure = abs(g) - thick;

                // Intersection: structure MUST be inside sphere
                float dist = max(d, structure);

                // Add inner pulsing nucleus
                float core = length(p) - (1.2 + sin(uTime * 2.0)*0.2);
                dist = smin(dist, core, 0.8);

                return dist * 0.5; // Safe marching step
            }

            vec3 calcNormal(vec3 p) {
                vec2 e = vec2(0.005, 0.0);
                return normalize(vec3(
                    map(p+e.xyy)-map(p-e.xyy),
                    map(p+e.yxy)-map(p-e.yxy),
                    map(p+e.yyx)-map(p-e.yyx)
                ));
            }

            void main() {
                vec3 ro = uCamPos; // Camera is origin
                vec3 rd = normalize(vWorldPos - ro); // Ray thru pixel

                // Start marching from the surface of the box to save steps?
                // Or easier: just start from vWorldPos (which is on box surface).
                // Distance from camera to box surface
                float t = distance(ro, vWorldPos);
                vec3 p = vWorldPos;

                float tMax = 20.0;
                int hits = 0;
                float d = 0.0;

                for(int i=0; i<64; i++) {
                    d = map(p);
                    if(d < 0.01) {
                        hits = 1;
                        break;
                    }
                    if(t > tMax) break;

                    p += rd * d;
                    t += d;
                }

                if (hits == 0) discard;

                // Lighting
                vec3 normal = calcNormal(p);
                vec3 lightPos = vec3(10.0, 10.0, 10.0);
                vec3 lightDir = normalize(lightPos - p);

                float diff = max(dot(normal, lightDir), 0.0);
                float fresnel = pow(1.0 - max(dot(normal, -rd), 0.0), 3.0);

                // Iridescent coloring
                vec3 col = 0.5 + 0.5*cos(uTime * 0.2 + p.xyx * 0.5 + vec3(0,2,4));
                col = col * (diff * 0.8 + 0.2) + vec3(0.8)*fresnel;

                // Falloff for depth illusion
                float fog = smoothstep(10.0, 0.0, t);

                gl_FragColor = vec4(col, fog);
            }
        `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = ctx.time;
    mat.uniforms.uCut.value = ctx.press;
    mat.uniforms.uCamPos.value.copy(this.camera.position);

    // Group rotate
    this.group.rotation.y = ctx.pointer.x * 0.2;
    this.group.rotation.x = ctx.pointer.y * 0.2;
    this.group.rotation.z = ctx.time * 0.05;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 04: Magnetosphere (Shield) ---

class MagnetosphereScene extends SceneBase {
  private field: THREE.LineSegments;
  private particles: THREE.Points;

  constructor() {
    super();
    this.id = 'magnetosphere';
    this.contentRadius = 5.0;

    // 1. Magnetic Field Lines (Dipole)
    // r = L * sin^2(theta)
    const linesPoints = [];
    const colors = [];
    const L_shells = [2, 2.5, 3, 3.5, 4, 5, 6];

    const colorInside = new THREE.Color(0x0088ff);
    const colorOutside = new THREE.Color(0xff0088);

    for (let L of L_shells) {
      const segments = 64;
      const longitudes = 16;
      for (let lon = 0; lon < longitudes; lon++) {
        const phi = (lon / longitudes) * Math.PI * 2;

        let prev: THREE.Vector3 | null = null;

        // Theta from 0 to PI (pole to pole)
        for (let s = 0; s <= segments; s++) {
          const t = s / segments;
          const theta = t * Math.PI;
          if (theta < 0.1 || theta > Math.PI - 0.1) continue; // Skip near poles (singularity)

          const r = L * Math.pow(Math.sin(theta), 2);

          const x = r * Math.sin(theta) * Math.cos(phi);
          const z = r * Math.sin(theta) * Math.sin(phi);
          const y = r * Math.cos(theta);

          const v = new THREE.Vector3(x, y, z);

          if (prev) {
            linesPoints.push(prev.x, prev.y, prev.z);
            linesPoints.push(v.x, v.y, v.z);

            const c = colorInside.clone().lerp(colorOutside, (L - 2) / 4);
            colors.push(c.r, c.g, c.b);
            colors.push(c.r, c.g, c.b);
          }
          prev = v;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linesPoints, 3)
    );
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    this.field = new THREE.LineSegments(geo, mat);
    this.group.add(this.field);

    // 2. Solar Wind Particles
    const pCount = 1000;
    const pPos = new Float32Array(pCount * 3);
    const pGeo = new THREE.BufferGeometry();
    const pMat = new THREE.PointsMaterial({
      color: 0xffcc00,
      size: 0.1,
      transparent: true,
    });

    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 15; // x
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 15; // y
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 15; // z
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.particles = new THREE.Points(pGeo, pMat);
    this.group.add(this.particles);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    this.group.rotation.y += 0.002;

    // Animate field pulse
    const pulse = 1 + Math.sin(ctx.time * 2) * 0.1 * ctx.press;
    this.field.scale.setScalar(pulse);

    // Simulate wind interaction
    const positions = (
      this.particles.geometry.attributes.position as THREE.BufferAttribute
    ).array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      let x = positions[i];
      let y = positions[i + 1];
      let z = positions[i + 2];

      // Move in Z direction (solar wind)
      z += 5 * ctx.dt * (1 + ctx.press * 5);
      if (z > 10) z = -10;

      // Deflection logic (Magnetosphere)
      const dist = Math.sqrt(x * x + y * y + z * z);
      if (dist < 4.5 && z < 0) {
        // Hitting bow shock
        // Push outward
        const angle = Math.atan2(y, x);
        const force = (4.5 - dist) * 2.0;
        x += Math.cos(angle) * force * ctx.dt;
        y += Math.sin(angle) * force * ctx.dt;
      }

      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // Camera
    const mx = ctx.pointer.x * 0.5 + ctx.gyro.y * 0.5;
    const my = ctx.pointer.y * 0.5 + ctx.gyro.x * 0.5;
    this.camera.position.x = damp(this.camera.position.x, mx * 5, 2, ctx.dt);
    this.camera.position.y = damp(this.camera.position.y, my * 5, 2, ctx.dt);
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      4,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 05: Event Horizon (Cosmic Horror) ---

class EventHorizonScene extends SceneBase {
  private disk: THREE.Mesh;
  private upperDisk: THREE.Mesh;
  private blackHole: THREE.Mesh;

  constructor() {
    super();
    this.id = 'event-horizon';
    this.contentRadius = 4.0;

    // Base Shader for Accretion Disk
    const createDiskMaterial = (side: THREE.Side) =>
      new THREE.ShaderMaterial({
        side: side,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(0xff4400) }, // Orange
          uColorB: { value: new THREE.Color(0xffaa88) }, // White/Blue
        },
        vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;

        // Gradient noise
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f*f*(3.0-2.0*f);
            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), f.x),
                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
        }

        void main() {
            float r = length(vPos.xy);
            if (r < 1.0) discard; // Innermost stable orbit

            float angle = atan(vPos.y, vPos.x);
            float speed = 2.0 / r; // Kepler rotation

            float val = noise(vec2(angle * 4.0 - uTime * speed, r * 2.0));
            val += noise(vec2(angle * 8.0 - uTime * speed * 1.5, r * 10.0)) * 0.5;

            vec3 col = mix(uColorA, uColorB, val * r * 0.2);
            col += vec3(1.0) * pow(val, 3.0); // Hot spots

            // Soft edges
            float alpha = smoothstep(1.0, 1.2, r) * smoothstep(3.5, 2.5, r);

            gl_FragColor = vec4(col * 2.5, alpha * 0.8);
        }
      `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

    // 1. Main Flat Disk
    const geo = new THREE.RingGeometry(1.0, 3.5, 64, 8);
    this.disk = new THREE.Mesh(geo, createDiskMaterial(THREE.DoubleSide));
    this.disk.rotation.x = Math.PI / 2.2; // View from angle
    this.group.add(this.disk);

    // 2. Relativistic Lensing (The "Halo" bent over the top)
    // We approximate this by placing a similar disk that stands vertical but is bent or masked
    // Actually, simple way: Just a vertical ring behind, bent forward?
    // Let's just add a vertical halo ring to simulate the "over the top" light
    const haloGeo = new THREE.RingGeometry(1.2, 1.8, 64, 2);
    this.upperDisk = new THREE.Mesh(
      haloGeo,
      createDiskMaterial(THREE.DoubleSide)
    );
    this.upperDisk.position.y = 0.5;
    this.upperDisk.scale.y = 0.8;
    this.upperDisk.lookAt(0, 0, 100); // Face camera roughly
    // This is a hack, proper lensing requires raymarching, but this adds the "Interstellar" shape complexity
    this.group.add(this.upperDisk);

    // 3. The Shadow
    const bhGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.blackHole = new THREE.Mesh(bhGeo, bhMat);
    this.group.add(this.blackHole);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    (this.disk.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (this.upperDisk.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Wobble
    this.group.rotation.z = Math.sin(t * 0.2) * 0.1;
    this.group.rotation.x = ctx.pointer.y * 0.2;
    this.group.rotation.y = ctx.pointer.x * 0.2;

    // Press to dilate time? (Speed up visuals)
    (this.disk.material as THREE.ShaderMaterial).uniforms.uTime.value +=
      ctx.press * 5;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 06: Kaleido Glass (Refraction / Optics) ---

class KaleidoGlassScene extends SceneBase {
  private crystal: THREE.Group;
  private shards: THREE.Mesh[];

  constructor() {
    super();
    this.id = 'kaleido-glass';
    this.contentRadius = 4.0;
    this.crystal = new THREE.Group();
    this.shards = [];

    // Create a cluster of "glass" shards
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.9, // Glass
      thickness: 1.5,
      ior: 1.5,
      clearcoat: 1.0,
      attenuationColor: new THREE.Color(0xcc00ff),
      attenuationDistance: 0.5,
    });

    const geoms = [
      new THREE.OctahedronGeometry(1),
      new THREE.ConeGeometry(0.5, 2, 4),
      new THREE.TetrahedronGeometry(1),
    ];

    for (let i = 0; i < 15; i++) {
      const geo = geoms[i % geoms.length];
      const mesh = new THREE.Mesh(geo, mat);

      // Random placement in sphere
      const r = 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      mesh.lookAt(0, 0, 0);
      mesh.scale.setScalar(0.5 + Math.random());

      this.crystal.add(mesh);
      this.shards.push(mesh);
    }
    this.group.add(this.crystal);

    // Add some background "lights" (bright meshes) to be refracted
    const lightGeo = new THREE.IcosahedronGeometry(0.2, 0);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(lightGeo, lightMat);
      mesh.position.set(
        Math.sin(i * 1.0) * 4,
        Math.cos(i * 1.0) * 4,
        (Math.random() - 0.5) * 4
      );
      this.group.add(mesh);
    }
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;

    // Rotate cluster
    this.crystal.rotation.x = t * 0.1;
    this.crystal.rotation.z = t * 0.15;

    // Pulse expansion
    const s = 1.0 + Math.sin(t) * 0.1 + ctx.press * 0.2;
    this.crystal.scale.setScalar(s);

    // Individual shard rotation
    this.shards.forEach((s, i) => {
      s.rotation.y = t * 0.5 + i;
    });

    // Interactive tilt
    this.group.rotation.y = ctx.pointer.x + ctx.gyro.y;
    this.group.rotation.x = ctx.pointer.y + ctx.gyro.x;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 07: Typo Sculpt (Data Stream) ---

class TypographicSculptureScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private count = 1000;
  private dummy = new THREE.Object3D();

  constructor() {
    super();
    this.id = 'typo-sculpt';
    this.contentRadius = 6.0;

    // Generate texture with chars
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 40px monospace';
    const chars = '01XYZ<>/';
    // Grid of chars
    const cols = 8;
    const rows = 8;
    const cell = size / cols;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x * cell + 10, y * cell + 40);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);

    const geo = new THREE.PlaneGeometry(0.5, 0.5);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.8,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;

    for (let i = 0; i < this.count; i++) {
      // Torus Knot formation
      const u = (i / this.count) * Math.PI * 4 + t * 0.2;

      // Knot formula
      const p = 2;
      const q = 3;
      const rKnot = 2 + Math.cos((q * u) / p);

      let x = rKnot * Math.cos(u);
      let y = rKnot * Math.sin(u);
      let z = -Math.sin((q * u) / p);

      // Add chaos
      const v = i * 0.1; // Re-add v definition
      const chaos = ctx.press * 2.0;
      x += Math.sin(v + t) * chaos;
      y += Math.cos(v + t) * chaos;
      z += Math.sin(v * 2 + t) * chaos;

      this.dummy.position.set(x, y, z);
      this.dummy.lookAt(0, 0, 0);
      this.dummy.scale.setScalar(1.0 + Math.sin(i + t * 5) * 0.5);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    this.group.rotation.y = ctx.pointer.x * 0.5;
    this.group.rotation.x = ctx.pointer.y * 0.5;

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

  constructor() {
    super();
    this.id = 'orbit-mech';
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
    const dGeo = new THREE.DodecahedronGeometry(0.05);
    const dMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      roughness: 0.4,
    });
    this.debris = new THREE.InstancedMesh(dGeo, dMat, this.count);
    this.group.add(this.debris);

    // Init positions data
    const data = new Float32Array(this.count * 3); // angle, dist, speed
    for (let i = 0; i < this.count; i++) {
      data[i * 3] = Math.random() * Math.PI * 2; // angle
      data[i * 3 + 1] = 3.0 + Math.random() * 5.0; // dist
      data[i * 3 + 2] = 0.5 + Math.random() * 0.5; // speed base
    }
    this.debris.userData.orbits = data;
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    const t = ctx.time;
    const data = this.debris.userData.orbits;

    for (let i = 0; i < this.count; i++) {
      const angle0 = data[i * 3];
      const dist = data[i * 3 + 1];
      const speed = data[i * 3 + 2];

      // Kepler-ish: closer is faster
      const currentAngle = angle0 + t * (speed * (10 / dist));

      const x = Math.cos(currentAngle) * dist;
      const z = Math.sin(currentAngle) * dist;
      // Inclination
      const y = Math.sin(currentAngle * 2 + i) * 0.2 * (dist - 2);

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(x, y, z); // Tumble
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(i, this.dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;

    // Interactive tilt
    this.group.rotation.x = 0.4 + ctx.pointer.y * 0.2 + ctx.gyro.x * 0.5;
    this.group.rotation.z = 0.2 + ctx.pointer.x * 0.2;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 09: Voronoi Shards (Tessellation) ---

class VoronoiShardsScene extends SceneBase {
  private shards: THREE.Mesh[] = [];

  constructor() {
    super();
    this.id = 'voronoi';
    this.contentRadius = 4.0;

    // Fake voronoi by scaling polyhedrons packed together
    const colors = [0xffaa00, 0xff4400, 0x222222];
    const geo = new THREE.DodecahedronGeometry(0.8, 0); // Low poly

    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % 3],
        flatShading: true,
        metalness: 0.5,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Random sphere pack
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1.5; // sphere radius

      mesh.userData = {
        home: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ),
        rotSettings: new THREE.Vector3(
          Math.random(),
          Math.random(),
          Math.random()
        ),
      };
      mesh.position.copy(mesh.userData.home);
      mesh.lookAt(0, 0, 0);

      this.shards.push(mesh);
      this.group.add(mesh);
    }

    // Inner light
    const light = new THREE.PointLight(0xffaa00, 5, 10);
    this.group.add(light);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    // Explode
    const explode = Math.sin(ctx.time) * 0.5 + 0.5 + ctx.press;

    this.shards.forEach(s => {
      const target = s.userData.home
        .clone()
        .multiplyScalar(1.0 + explode * 2.0);
      s.position.lerp(target, 0.1);
      s.rotation.x += ctx.dt * s.userData.rotSettings.x;
      s.rotation.y += ctx.dt * s.userData.rotSettings.y;
    });

    this.group.rotation.y = ctx.pointer.x;
    this.group.rotation.x = ctx.pointer.y;

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 10: Moire Interference ---

class MoireInterferenceScene extends SceneBase {
  private s1: THREE.Mesh;
  private s2: THREE.Mesh;

  constructor() {
    super();
    this.id = 'moire';
    this.contentRadius = 4.0;

    // Wireframe spheres
    const g1 = new THREE.IcosahedronGeometry(2.5, 2);
    const m1 = new THREE.MeshBasicMaterial({
      color: 0xccff00,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    this.s1 = new THREE.Mesh(g1, m1);

    const g2 = new THREE.IcosahedronGeometry(2.4, 2);
    const m2 = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    this.s2 = new THREE.Mesh(g2, m2);

    this.group.add(this.s1);
    this.group.add(this.s2);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    // Counter rotate
    this.s1.rotation.y = ctx.time * 0.1;
    this.s2.rotation.y = -ctx.time * 0.12;

    this.s1.rotation.x = ctx.time * 0.05;
    this.s2.rotation.x = -ctx.time * 0.05;

    // Scale pulse offset
    this.s2.scale.setScalar(0.95 + Math.sin(ctx.time * 2) * 0.05 * ctx.press);

    this.group.rotation.x = ctx.pointer.y + ctx.gyro.x;
    this.group.rotation.y = ctx.pointer.x + ctx.gyro.y;

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
    this.id = 'neural';
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
    this.id = 'library';
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

// --- Scene 13: Bioluminescence (Organic) ---

class BioluminescentScene extends SceneBase {
  private spores: THREE.Points;

  constructor() {
    super();
    this.id = 'biolum';
    this.contentRadius = 4.0;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(500 * 3);
    const randoms = new Float32Array(500 * 3);

    for (let i = 0; i < 500; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = Math.random();
      randoms[i * 3 + 2] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(randoms, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00ffaa) },
      },
      vertexShader: `
                uniform float uTime;
                attribute vec3 aRnd;
                varying float vAlpha;
                void main() {
                    vec3 p = position;
                    // Float up
                    p.y += sin(uTime + aRnd.x * 10.0) * 0.5;
                    p.x += cos(uTime * 0.5 + aRnd.y * 10.0) * 0.5;

                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    gl_PointSize = (10.0 * aRnd.z + 5.0) / -mv.z;
                    gl_Position = projectionMatrix * mv;

                    vAlpha = 0.5 + 0.5 * sin(uTime * 2.0 + aRnd.z * 10.0);
                }
            `,
      fragmentShader: `
                uniform vec3 uColor;
                varying float vAlpha;
                void main() {
                    float d = length(gl_PointCoord - 0.5);
                    if (d > 0.5) discard;
                    float glow = 1.0 - d * 2.0;
                    gl_FragColor = vec4(uColor, glow * vAlpha);
                }
            `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.spores = new THREE.Points(geo, mat);
    this.group.add(this.spores);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    (this.spores.material as THREE.ShaderMaterial).uniforms.uTime.value =
      ctx.time;
    this.group.rotation.x = ctx.pointer.y * 0.1;
    this.group.rotation.y = ctx.pointer.x * 0.1;
    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
  }
}

// --- Scene 14: Holographic City (Future) ---

class HolographicCityScene extends SceneBase {
  private city: THREE.Group;

  constructor() {
    super();
    this.id = 'hologram';
    this.contentRadius = 6.0;
    this.city = new THREE.Group();

    const mat = new THREE.MeshBasicMaterial({
      color: 0x5500ff,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });

    const geo = new THREE.BoxGeometry(1, 1, 1);

    // Grid of buildings
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        if (Math.random() > 0.7) continue;
        const h = 0.5 + Math.random() * 3.0;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x * 1.5, h / 2 - 2, z * 1.5);
        mesh.scale.set(1, h, 1);
        this.city.add(mesh);
      }
    }
    this.group.add(this.city);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    this.group.rotation.y = ctx.time * 0.1;

    // Scanline effect simulated by opacity pulse
    this.city.children.forEach(c => {
      const mesh = c as THREE.Mesh;
      if (mesh.material) {
        (mesh.material as THREE.Material).opacity =
          0.1 + Math.abs(Math.sin(ctx.time + mesh.position.y));
      }
    });

    this.camera.position.z = damp(
      this.camera.position.z,
      this.baseDistance,
      3,
      ctx.dt
    );
    this.camera.lookAt(0, 0, 0);
    this.camera.position.y = 2; // Look down slightly
  }
}

// --- Scene 15: Reality Collapse (Entropy) ---

class RealityCollapseScene extends SceneBase {
  private mesh: THREE.Mesh;

  constructor() {
    super();
    this.id = 'collapse';
    this.contentRadius = 3.0;

    const geo = new THREE.IcosahedronGeometry(2, 4);
    const mat = new THREE.ShaderMaterial({
      wireframe: true,
      uniforms: {
        uTime: { value: 0 },
        uCollapse: { value: 0 },
      },
      vertexShader: `
                uniform float uTime;
                uniform float uCollapse;
                varying vec3 vPos;

                // Simplex noise (same as ribbon)
                // ... assuming noise function unavailable, use sine approximation
                float noise(vec3 p) {
                    return sin(p.x*10.0) * sin(p.y*13.0) * sin(p.z*7.0);
                }

                void main() {
                    vPos = position;
                    vec3 p = position;

                    float n = noise(p + uTime);
                    // Displace outwards heavily based on collapse
                    p += normal * n * (0.1 + uCollapse * 2.0);

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                }
            `,
      fragmentShader: `
                varying vec3 vPos;
                void main() {
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }
            `,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);
  }

  init(_ctx: SceneRuntime) {}

  update(ctx: SceneRuntime) {
    (this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value =
      ctx.time;
    (this.mesh.material as THREE.ShaderMaterial).uniforms.uCollapse.value =
      Math.sin(ctx.time) * 0.5 + 0.5 + ctx.press;

    this.mesh.rotation.x = ctx.time;
    this.mesh.rotation.y = ctx.time * 0.8;

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
  new RibbonFieldScene(),
  new GyroidCavernScene(),
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
