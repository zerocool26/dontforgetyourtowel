import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
  scrollVelocity: number;
  sceneId: string;
  sceneIndex: number;
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
    title: 'Non‑Euclidean Corridor',
    caption: 'Impossible geometry folding through portals.',
    hint: 'Scroll to warp',
  },
  {
    id: 'scene05',
    title: 'Crystal Refraction Garden',
    caption: 'Dangerous light bending through prisms.',
    hint: 'Tilt for caustics',
  },
  {
    id: 'scene06',
    title: 'Blueprint → Object Assembly',
    caption: 'Line truth inflates into solid reality.',
    hint: 'Scroll to build',
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
];

const findMeta = (id: string) =>
  sceneMeta.find(meta => meta.id === id) ?? sceneMeta[0];

abstract class SceneBase implements TowerScene {
  id: string;
  meta: SceneMeta;
  scene: THREE.Scene;
  camera: THREE.Camera;

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

  resize(ctx: SceneRuntime): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = ctx.size.width / Math.max(1, ctx.size.height);
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
  private group = new THREE.Group();
  private core: THREE.Mesh;
  private ring: THREE.Mesh;
  private shell: THREE.LineSegments;
  private particles: THREE.Points;
  private particlesBase: Float32Array;
  private hue = 210;
  private hue2 = 280;

  constructor() {
    super('scene00');

    this.scene.background = new THREE.Color(0x05070f);
    this.scene.fog = new THREE.FogExp2(0x070b18, 0.055);
    this.scene.add(this.group);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x070a12, 0.65);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 3);
    const fill = new THREE.PointLight(0xffffff, 0.8, 30, 2);
    fill.position.set(-6, -2, 7);
    this.scene.add(hemi, key, fill);

    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2, 2),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.6, 0.55, 0.18),
        emissive: new THREE.Color().setHSL(0.68, 0.85, 0.38),
        metalness: 0.45,
        roughness: 0.22,
      })
    );

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.04, 12, 90),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.62, 0.95, 0.62),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    this.ring.rotation.x = Math.PI / 2.4;

    this.shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.45, 1)),
      new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.55, 0.9, 0.62),
        transparent: true,
        opacity: 0.18,
      })
    );

    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 2.6 + Math.random() * 3.2;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.4;
      positions[idx] = Math.cos(a) * r;
      positions[idx + 1] = y;
      positions[idx + 2] = Math.sin(a) * r;
    }

    this.particlesBase = positions.slice();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color().setHSL(0.6, 0.85, 0.67),
      size: 0.03,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, mat);

    this.group.add(this.core, this.ring, this.shell, this.particles);

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 7.2);
    cam.lookAt(0, 0, 0);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const pointer = ctx.pointer;
    const local = ctx.localProgress;

    this.hue = damp(this.hue, 210 + Math.sin(t * 0.2) * 20, 1.5, ctx.dt);
    this.hue2 = damp(this.hue2, 280 + Math.cos(t * 0.3) * 18, 1.5, ctx.dt);

    this.group.rotation.y = t * 0.15 + pointer.x * 0.35;
    this.group.rotation.x = -0.12 + pointer.y * -0.22;

    this.core.rotation.y += ctx.dt * (0.35 + local * 0.3);
    this.core.rotation.x += ctx.dt * 0.2;
    const wobble = Math.sin(t * 1.1) * 0.06 * (0.6 + local);
    this.core.scale.setScalar(1 + wobble);

    this.ring.rotation.z = t * (0.25 + local * 0.35);
    this.ring.rotation.x = Math.PI / 2.4 + Math.sin(t * 0.6) * 0.04;

    this.shell.rotation.y = t * 0.2;

    const coreMat = this.core.material as THREE.MeshStandardMaterial;
    coreMat.color.setHSL(this.hue / 360, 0.6, 0.18);
    coreMat.emissive.setHSL(this.hue2 / 360, 0.9, 0.4);
    coreMat.emissiveIntensity = 0.45 + local * 0.35;

    const ringMat = this.ring.material as THREE.MeshBasicMaterial;
    ringMat.color.setHSL(this.hue2 / 360, 0.95, 0.62);
    ringMat.opacity = 0.16 + local * 0.25;

    const shellMat = this.shell.material as THREE.LineBasicMaterial;
    shellMat.color.setHSL(this.hue / 360, 0.9, 0.65);
    shellMat.opacity = 0.08 + local * 0.18;

    const pGeo = this.particles.geometry as THREE.BufferGeometry;
    const pAttr = pGeo.getAttribute('position') as THREE.BufferAttribute | null;
    if (pAttr?.array instanceof Float32Array) {
      const arr = pAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const bx = this.particlesBase[idx];
        const by = this.particlesBase[idx + 1];
        const bz = this.particlesBase[idx + 2];
        const w = t * 0.6 + i * 0.02;
        const bob = Math.sin(w + bx) * (0.05 + local * 0.08);
        const swirl = Math.cos(w * 0.72 + bz) * (0.04 + local * 0.08);
        const r = Math.hypot(bx, bz) || 1;
        const nx = bx / r;
        const nz = bz / r;
        arr[idx] = bx + nx * swirl;
        arr[idx + 1] = by + bob;
        arr[idx + 2] = bz + nz * swirl;
      }
      pAttr.needsUpdate = true;
    }

    const pMat = this.particles.material as THREE.PointsMaterial;
    pMat.color.setHSL(this.hue / 360, 0.85, 0.67);
    pMat.opacity = 0.2 + local * 0.26;
    pMat.size = 0.028 + local * 0.012;

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.x = damp(cam.position.x, pointer.x * 0.9, 5, ctx.dt);
    cam.position.y = damp(cam.position.y, pointer.y * 0.6, 5, ctx.dt);
    cam.position.z = damp(cam.position.z, 7.2 - local * 0.6, 4, ctx.dt);
    cam.lookAt(0, 0, 0);

    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.density = 0.05 + local * 0.02;
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
        uniform float uMode;

        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        float sdBox(vec3 p, vec3 b) {
          vec3 q = abs(p) - b;
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        float sdTorus(vec3 p, vec2 t) {
          vec2 q = vec2(length(p.xz) - t.x, p.y);
          return length(q) - t.y;
        }

        float opSmoothUnion(float d1, float d2, float k) {
          float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, d1, h) - k * h * (1.0 - h);
        }

        float mapBase(vec3 p) {
          float t = uProgress;
          float a = sdSphere(p, 1.05);
          float b = sdBox(p, vec3(0.9));
          float c = sdTorus(p, vec2(0.8, 0.25));
          float d = opSmoothUnion(a, b, 0.35);
          float e = opSmoothUnion(d, c, 0.3 + 0.2 * sin(uTime * 0.3));
          float morph = smoothstep(0.2, 0.8, t);
          return mix(d, e, morph);
        }

        float mapFractal(vec3 p) {
          vec3 z = p;
          float scale = 1.6;
          float dist = 0.0;
          for (int i = 0; i < 5; i++) {
            z = abs(z) / dot(z, z) - 0.9;
            dist += exp(-float(i) * 0.6) * length(z);
            z *= scale;
          }
          return dist * 0.18 - 0.6;
        }

        float mapVol(vec3 p) {
          float d = mapBase(p);
          float swirl = sin(p.x * 1.8 + uTime * 0.4) + cos(p.z * 1.6 - uTime * 0.3);
          return d + swirl * 0.1;
        }

        float mapScene(vec3 p) {
          if (uMode < 0.5) return mapBase(p);
          if (uMode < 1.5) return mapVol(p);
          return mapFractal(p);
        }

        vec3 getNormal(vec3 p) {
          vec2 e = vec2(0.0015, 0.0);
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
          vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
          float diff = clamp(dot(n, lightDir), 0.0, 1.0);
          float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.4);
          vec3 base = mix(vec3(0.1, 0.14, 0.2), vec3(0.5, 0.7, 1.0), diff);
          vec3 metal = mix(vec3(0.75, 0.82, 0.9), vec3(1.0, 0.4, 0.7), 0.35 + uProgress * 0.4);
          return mix(base, metal, 0.6) + rim * vec3(0.3, 0.5, 0.9);
        }

        void main() {
          vec2 uv = (vUv * 2.0 - 1.0);
          uv.x *= uResolution.x / max(1.0, uResolution.y);
          vec3 ro = vec3(0.0, 0.0, 3.2);
          ro.xy += uPointer * 0.35;
          vec3 rd = normalize(vec3(uv, -1.6));

          float t = 0.0;
          float hit = -1.0;
          for (int i = 0; i < 72; i++) {
            vec3 p = ro + rd * t;
            float d = mapScene(p);
            if (d < 0.001) {
              hit = t;
              break;
            }
            t += d * 0.75;
            if (t > 7.0) break;
          }

          vec3 col = vec3(0.02, 0.04, 0.08);
          if (hit > 0.0) {
            vec3 p = ro + rd * hit;
            col = shade(p, rd);
            float fog = exp(-hit * 0.35);
            col = mix(vec3(0.01, 0.02, 0.04), col, fog);
          }

          float vign = smoothstep(1.2, 0.2, length(uv));
          col *= 0.75 + vign * 0.35;
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
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
  }
}

class SwarmScene extends SceneBase {
  private points: THREE.Points;
  private velocities: Float32Array;
  private base: Float32Array;
  private color = new THREE.Color();

  constructor() {
    super('scene02');
    this.scene.fog = new THREE.FogExp2(0x04070f, 0.08);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 7.5);

    const count = 1800;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = Math.random() * 2.2 + 0.4;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 3.6;
      positions[idx] = Math.cos(a) * r;
      positions[idx + 1] = y;
      positions[idx + 2] = Math.sin(a) * r;
      velocities[idx] = (Math.random() - 0.5) * 0.2;
      velocities[idx + 1] = (Math.random() - 0.5) * 0.2;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0x8ef3ff),
      size: 0.028,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.velocities = velocities;
    this.base = positions.slice();
    this.scene.add(this.points);
  }

  update(ctx: SceneRuntime): void {
    const geo = this.points.geometry as THREE.BufferGeometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const count = arr.length / 3;
    const t = ctx.time;
    const pull = 0.35 + ctx.localProgress * 0.8;
    const swirl = 0.4 + ctx.localProgress * 1.1;
    const pointer = ctx.pointer;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const px = arr[idx];
      const py = arr[idx + 1];
      const pz = arr[idx + 2];

      const bx = this.base[idx];
      const by = this.base[idx + 1];
      const bz = this.base[idx + 2];

      const ax =
        Math.sin(t * 0.9 + py * 0.6) * swirl - px * 0.12 + pointer.x * 0.4;
      const ay = Math.cos(t * 0.7 + px * 0.8) * 0.4 - py * 0.08;
      const az =
        Math.cos(t * 0.8 + px * 0.5) * swirl - pz * 0.12 + pointer.y * 0.35;

      this.velocities[idx] =
        this.velocities[idx] * 0.92 + ax * 0.02 + (bx - px) * pull * 0.01;
      this.velocities[idx + 1] =
        this.velocities[idx + 1] * 0.92 + ay * 0.02 + (by - py) * pull * 0.008;
      this.velocities[idx + 2] =
        this.velocities[idx + 2] * 0.92 + az * 0.02 + (bz - pz) * pull * 0.01;

      arr[idx] += this.velocities[idx] * ctx.dt * 2.4;
      arr[idx + 1] += this.velocities[idx + 1] * ctx.dt * 2.4;
      arr[idx + 2] += this.velocities[idx + 2] * ctx.dt * 2.4;
    }

    attr.needsUpdate = true;

    const mat = this.points.material as THREE.PointsMaterial;
    this.color.setHSL(0.52 + ctx.localProgress * 0.18, 0.85, 0.65);
    mat.color.copy(this.color);
    mat.size = 0.02 + ctx.localProgress * 0.018;
    mat.opacity = 0.45 + ctx.localProgress * 0.45;
  }
}

class KineticTypeScene extends SceneBase {
  private mesh: THREE.InstancedMesh;
  private offsets: THREE.Vector3[] = [];
  private seeds: number[] = [];
  private color = new THREE.Color();

  constructor() {
    super('scene03');
    this.scene.fog = new THREE.FogExp2(0x05080f, 0.08);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 8);

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
          const px = (letterIndex - letters.length / 2) * spacing + x * 0.16;
          const py = (grid.length / 2 - y) * 0.2;
          pixels.push(new THREE.Vector3(px, py, 0));
        });
      });
    });

    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.7, 0.9),
      emissive: new THREE.Color(0.2, 0.3, 0.8),
      metalness: 0.45,
      roughness: 0.25,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, pixels.length);

    pixels.forEach((pos, i) => {
      this.offsets.push(pos);
      this.seeds.push(Math.random());
      const m = new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z);
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.mesh);

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(3, 6, 4);
    const fill = new THREE.PointLight(0xffffff, 0.9, 40, 2);
    fill.position.set(-4, -2, 6);
    this.scene.add(key, fill);
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    const t = ctx.time;
    const scatter = Math.sin(progress * Math.PI) * 1.6;

    for (let i = 0; i < this.offsets.length; i++) {
      const base = this.offsets[i];
      const seed = this.seeds[i];
      const drift = (seed - 0.5) * 2.0;
      const fracture = Math.sin(t * 1.4 + seed * 6.0) * scatter;
      const px = base.x + drift * scatter * 0.6;
      const py = base.y + fracture * 0.25;
      const pz = base.z + Math.cos(t * 1.1 + seed * 8.0) * scatter * 0.4;
      const scale = 0.85 + Math.sin(t + seed * 10.0) * 0.2;
      const m = new THREE.Matrix4()
        .makeTranslation(px, py, pz)
        .multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    this.color.setHSL(0.62 + progress * 0.2, 0.75, 0.6);
    mat.color.copy(this.color);
    mat.emissive.setHSL(0.62 + progress * 0.1, 0.9, 0.45);
  }
}

class CorridorScene extends SceneBase {
  private frames: THREE.InstancedMesh;
  private portal: THREE.Mesh;
  private color = new THREE.Color();
  private frameCount = 26;

  constructor() {
    super('scene04');
    this.scene.fog = new THREE.FogExp2(0x03060f, 0.12);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 4.5);

    const frameGeo = new THREE.BoxGeometry(4, 2.4, 0.06);
    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x6bd1ff),
      metalness: 0.2,
      roughness: 0.45,
      emissive: new THREE.Color(0.15, 0.25, 0.5),
    });
    this.frames = new THREE.InstancedMesh(frameGeo, frameMat, this.frameCount);

    for (let i = 0; i < this.frameCount; i++) {
      const z = -i * 1.4;
      const scale = 1 - i * 0.02;
      const m = new THREE.Matrix4()
        .makeTranslation(0, 0, z)
        .multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
      this.frames.setMatrixAt(i, m);
    }
    this.frames.instanceMatrix.needsUpdate = true;
    this.scene.add(this.frames);

    const portalGeo = new THREE.CircleGeometry(0.8, 64);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x8ad1ff,
      transparent: true,
      opacity: 0.6,
    });
    this.portal = new THREE.Mesh(portalGeo, portalMat);
    this.portal.position.z = -4.0;
    this.scene.add(this.portal);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 4, 6);
    this.scene.add(key);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.z = damp(cam.position.z, 4.5 - progress * 2.2, 3, ctx.dt);
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 0.4, 3, ctx.dt);
    cam.position.y = damp(cam.position.y, ctx.pointer.y * 0.25, 3, ctx.dt);
    cam.lookAt(0, 0, -6);

    this.portal.scale.setScalar(1 + Math.sin(t * 1.4) * 0.05 + progress * 0.25);
    const portalMat = this.portal.material as THREE.MeshBasicMaterial;
    portalMat.opacity = 0.45 + progress * 0.4;

    const frameMat = this.frames.material as THREE.MeshStandardMaterial;
    this.color.setHSL(0.55 + progress * 0.2, 0.85, 0.55);
    frameMat.color.copy(this.color);
    frameMat.emissive.setHSL(0.6 + progress * 0.1, 0.9, 0.4);
  }
}

class CrystalScene extends SceneBase {
  private crystals: THREE.Mesh[] = [];
  private env: THREE.Texture | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;

  constructor() {
    super('scene05');
    this.scene.background = new THREE.Color(0x02050a);
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.08);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0.5, 6);
  }

  init(ctx: SceneRuntime): void {
    this.pmrem = new THREE.PMREMGenerator(ctx.renderer);
    this.env = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.env;

    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.9, 0.95, 1),
      roughness: 0.05,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.9,
      ior: 1.45,
      transparent: true,
      envMapIntensity: 1.2,
    });

    const shapes = [
      new THREE.OctahedronGeometry(0.7, 2),
      new THREE.IcosahedronGeometry(0.55, 1),
      new THREE.DodecahedronGeometry(0.6, 0),
    ];

    for (let i = 0; i < 12; i++) {
      const geo = shapes[i % shapes.length];
      const mesh = new THREE.Mesh(geo, crystalMat.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.5) * 2.5
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.scene.add(mesh);
      this.crystals.push(mesh);
    }

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 6, 5);
    this.scene.add(key);
  }

  update(ctx: SceneRuntime): void {
    const t = ctx.time;
    const progress = ctx.localProgress;
    this.crystals.forEach((mesh, i) => {
      mesh.rotation.x += ctx.dt * (0.2 + i * 0.01);
      mesh.rotation.y += ctx.dt * (0.25 + i * 0.015);
      mesh.position.y += Math.sin(t * 0.6 + i) * 0.0008;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.ior = 1.35 + progress * 0.4;
      mat.transmission = 0.9 + progress * 0.1;
    });

    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.x = damp(cam.position.x, ctx.pointer.x * 0.4, 4, ctx.dt);
    cam.position.y = damp(
      cam.position.y,
      0.4 + ctx.pointer.y * 0.25,
      4,
      ctx.dt
    );
    cam.lookAt(0, 0, 0);
  }

  dispose(): void {
    super.dispose();
    this.env?.dispose();
    this.pmrem?.dispose();
  }
}

class BlueprintScene extends SceneBase {
  private lines: THREE.LineSegments[] = [];
  private hue = 205;

  constructor() {
    super('scene06');
    this.scene.fog = new THREE.FogExp2(0x030912, 0.12);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 6.5);

    const geometries = [
      new THREE.BoxGeometry(1.6, 0.8, 1.0, 4, 2, 2),
      new THREE.ConeGeometry(0.8, 1.6, 8, 2),
      new THREE.CylinderGeometry(0.4, 0.6, 1.2, 10, 2),
    ];

    geometries.forEach((geo, i) => {
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.58, 0.8, 0.6),
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.LineSegments(edges, mat);
      line.position.set((i - 1) * 1.6, 0, -i * 1.2);
      this.scene.add(line);
      this.lines.push(line);
    });

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 5, 4);
    this.scene.add(key);
  }

  update(ctx: SceneRuntime): void {
    const progress = ctx.localProgress;
    this.hue = damp(this.hue, 200 + progress * 40, 2, ctx.dt);
    this.lines.forEach((line, i) => {
      line.rotation.y += ctx.dt * (0.2 + i * 0.08);
      line.rotation.x += ctx.dt * 0.1;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.setHSL(this.hue / 360, 0.85, 0.65);
      mat.opacity = 0.2 + progress * 0.75;
    });
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

        void main() {
          vec2 uv = vUv;
          vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
          float t = uTime * 0.2;
          float n = noise(p * 2.2 + t);
          float ink = smoothstep(0.15 + uProgress * 0.2, 0.75, n);
          float reveal = smoothstep(0.2, 0.8, uProgress);
          float silhouette = smoothstep(0.25, 0.5, length(p + uPointer * 0.2));
          float fog = mix(ink, silhouette, reveal);
          vec3 col = mix(vec3(0.02, 0.02, 0.03), vec3(0.7, 0.75, 0.9), fog);
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
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uPointer.value.copy(ctx.pointer);
  }

  resize(ctx: SceneRuntime): void {
    this.material.uniforms.uResolution.value.set(
      ctx.size.width,
      ctx.size.height
    );
  }
}

class ClothScene extends SceneBase {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    super('scene08');
    const geo = new THREE.PlaneGeometry(5, 3.2, 90, 60);
    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uWind: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uProgress;
        uniform float uWind;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin((pos.x + uTime * 1.2) * 2.0) * 0.08;
          float ripple = cos((pos.y + uTime * 1.6) * 3.0) * 0.05;
          float gust = sin(uTime * 0.7 + pos.x * 1.5) * 0.12 * uWind;
          pos.z += wave + ripple + gust;
          pos.x += sin(uTime + pos.y * 1.2) * 0.05 * uProgress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec3 base = mix(vec3(0.05, 0.08, 0.12), vec3(0.4, 0.5, 0.7), vUv.x);
          float sheen = smoothstep(0.2, 0.8, vUv.y) * 0.35;
          gl_FragColor = vec4(base + sheen, 1.0);
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
    this.material.uniforms.uTime.value = ctx.time;
    this.material.uniforms.uProgress.value = ctx.localProgress;
    this.material.uniforms.uWind.value = clamp(
      ctx.localProgress + Math.abs(ctx.pointer.x) * 0.6,
      0,
      1
    );
    this.mesh.rotation.y = ctx.pointer.x * 0.2;
    this.mesh.rotation.x = ctx.pointer.y * 0.1;
  }
}

class PointCloudScene extends SceneBase {
  private points: THREE.Points;
  private base: Float32Array;
  private target: Float32Array;
  private color = new THREE.Color();

  constructor() {
    super('scene09');
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.08);
    const cam = this.camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 7);

    const geoA = new THREE.TorusKnotGeometry(1.2, 0.35, 260, 20);
    const geoB = new THREE.SphereGeometry(1.4, 28, 20);
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
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0x8bd8ff),
      size: 0.02,
      transparent: true,
      opacity: 0.7,
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
    const geo = this.points.geometry as THREE.BufferGeometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i++) {
      arr[i] = lerp(this.base[i], this.target[i], progress);
    }
    attr.needsUpdate = true;

    const mat = this.points.material as THREE.PointsMaterial;
    this.color.setHSL(0.55 + progress * 0.2, 0.85, 0.65);
    mat.color.copy(this.color);
    mat.size = 0.016 + progress * 0.018;
  }
}

class FractalScene extends RaymarchScene {
  constructor() {
    super('scene10', 2);
  }
}

export const createScenes = (): TowerScene[] => [
  new CoreScene(),
  new RaymarchScene('scene01', 0),
  new SwarmScene(),
  new KineticTypeScene(),
  new CorridorScene(),
  new CrystalScene(),
  new BlueprintScene(),
  new InkScene(),
  new ClothScene(),
  new PointCloudScene(),
  new FractalScene(),
];

export const getSceneMeta = () => sceneMeta;
