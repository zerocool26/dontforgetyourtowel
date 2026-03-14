/** @jsxImportSource react */
/** @jsxRuntime automatic */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import {
  CHAPTER_ATMOSPHERES,
  CAMERA_KF,
  CHAPTERS,
  type QualityTier,
  type SceneLensMode,
  type SceneProfile,
} from './olive-universe-config';

type OliveDebugWindow = Window & {
  __OLIVE_FORCE_STABILITY_ASSIST__?: boolean;
};

const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform vec2  uMouse;
  attribute vec3  aTarget;
  attribute float aSeed;

  vec3 hash3(float n) {
    vec3 p = fract(vec3(n, n * 1.61803, n * 2.71828) * vec3(127.1, 311.7, 74.7));
    p = p * 2.0 - 1.0;
    return p;
  }

  void main() {
    float phi   = aSeed * 6.28318 * 137.508;
    float theta = acos(1.0 - 2.0 * fract(aSeed * 0.61803));
    float r     = 4.5 + sin(aSeed * 7.3 + uTime * 0.2) * 2.0;

    vec3 chaos = vec3(
      sin(phi + uTime * 0.25) * sin(theta) * r,
      cos(theta + uTime * 0.18) * 2.2,
      cos(phi + uTime * 0.3)  * sin(theta) * r
    );

    vec3 pos = mix(chaos, aTarget, smoothstep(0.0, 1.0, uMorph));

    vec2 mw = uMouse * 5.2;
    vec2 d2 = pos.xy - mw;
    float md = length(d2);
    if (md < 2.2 && md > 0.01) {
      pos.xy += normalize(d2) * (2.2 - md) * (1.0 - uMorph * 0.4) * 0.9;
    }

    float breath = sin(uTime + aSeed * 3.14) * 0.045;
    pos += vec3(breath, cos(uTime * 0.8 + aSeed * 2.71) * 0.045, sin(uTime * 1.2 + aSeed) * 0.03) * uMorph;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float pulse = 1.0 + sin(uTime * 2.5 + aSeed * 6.28) * 0.22;
    gl_PointSize = clamp(pulse * 290.0 / -mvPos.z, 1.0, 7.0);
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform float uMorph;
  uniform float uVisibility;
  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    if (d > 0.5) discard;
    float soft  = 1.0 - smoothstep(0.22, 0.5, d);
    float glow  = (1.0 - d * 2.0) * uMorph * 0.8;
    float alpha = soft * (0.45 + uMorph * 0.55) * uVisibility;
    gl_FragColor = vec4(uColor + vec3(glow * 0.6 * uVisibility), alpha);
  }
`;

const NEURAL_VERT = /* glsl */ `
  attribute float aP;
  varying float vP;
  void main() {
    vP = aP;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEURAL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uColor;
  varying float vP;
  void main() {
    float pulse = fract(vP - uTime * 0.4);
    float i = exp(-pulse * 5.5) * 0.9 + 0.1;
    gl_FragColor = vec4(uColor * i, i * 0.88);
  }
`;

const SHIELD_VERT = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHIELD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3  uColor;
  varying vec3  vW;
  varying vec3  vN;
  void main() {
    float dist   = length(vW);
    float r1 = sin(dist * 4.0 - uTime * 1.6) * 0.5 + 0.5;
    float r2 = sin(dist * 7.2 - uTime * 2.3 + 1.1) * 0.5 + 0.5;
    float rings  = max(r1 * 0.65, r2 * 0.45);
    vec3  vd     = normalize(cameraPosition - vW);
    float fresnel= pow(1.0 - abs(dot(vN, vd)), 2.6);
    float c      = rings * 0.35 + fresnel * 0.65;
    vec3  col    = mix(uColor, vec3(1.0), fresnel * 0.45);
    gl_FragColor = vec4(col, c * 0.62);
  }
`;

const DATA_VERT = /* glsl */ `
  attribute float aI;
  uniform float uTime;
  varying float vH;
  void main() {
    float col = mod(aI, 12.0);
    float row = floor(aI / 12.0);
    float h = (sin(uTime * 1.8 + col * 0.6 + row * 0.8) * 0.5 + 0.5)
            * (cos(uTime * 1.2 + col * 0.4) * 0.5 + 0.5) * 2.8 + 0.12;
    vec3 pos = position;
    pos.y = pos.y * h + h * 0.5 - 1.0;
    vH = h;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const DATA_FRAG = /* glsl */ `
  uniform vec3  uColor;
  varying float vH;
  void main() {
    vec3 col = mix(uColor * 0.3, uColor, vH * 0.5);
    col += vec3(vH * 0.25);
    gl_FragColor = vec4(col, 0.88);
  }
`;

function sampleText(text: string, count: number): Float32Array {
  if (typeof document === 'undefined') return new Float32Array(count * 3);
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 128;
  const ctx = cvs.getContext('2d');
  if (!ctx) return new Float32Array(count * 3);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 60px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const { data } = ctx.getImageData(0, 0, 512, 128);
  const pts: [number, number][] = [];
  for (let y = 0; y < 128; y += 2)
    for (let x = 0; x < 512; x += 2)
      if (data[(y * 512 + x) * 4 + 3] > 100) pts.push([x, y]);
  const out = new Float32Array(count * 3);
  const stride = Math.max(1, Math.floor(pts.length / count));
  for (let i = 0; i < count; i++) {
    const p = pts[Math.min(i * stride, pts.length - 1)];
    if (p) {
      out[i * 3] = (p[0] / 512 - 0.5) * 10.5;
      out[i * 3 + 1] = -(p[1] / 128 - 0.5) * 2.6;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
  }
  return out;
}

function camAtT(t: number) {
  const kf = CAMERA_KF;
  if (t <= kf[0].t) return { pos: kf[0].pos, look: kf[0].look };
  if (t >= kf[kf.length - 1].t) {
    const last = kf[kf.length - 1];
    return { pos: last.pos, look: last.look };
  }
  for (let i = 0; i < kf.length - 1; i++) {
    if (t >= kf[i].t && t <= kf[i + 1].t) {
      const local = (t - kf[i].t) / (kf[i + 1].t - kf[i].t);
      const eased =
        local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      const lerp3 = (
        a: readonly [number, number, number],
        b: readonly [number, number, number],
        value: number
      ) =>
        [
          a[0] + (b[0] - a[0]) * value,
          a[1] + (b[1] - a[1]) * value,
          a[2] + (b[2] - a[2]) * value,
        ] as [number, number, number];
      return {
        pos: lerp3(kf[i].pos, kf[i + 1].pos, eased),
        look: lerp3(kf[i].look, kf[i + 1].look, eased),
      };
    }
  }
  return { pos: kf[0].pos, look: kf[0].look };
}

function mergeSceneIndices(
  current: number[],
  candidates: number[],
  totalCount: number
) {
  const next = new Set(current);

  for (const candidate of candidates) {
    if (candidate >= 0 && candidate < totalCount) {
      next.add(candidate);
    }
  }

  return Array.from(next).sort((a, b) => a - b);
}

function getSceneWarmPriority(centerIndex: number, totalCount: number) {
  const order: number[] = [];
  const seen = new Set<number>();

  const push = (index: number) => {
    if (index < 0 || index >= totalCount || seen.has(index)) {
      return;
    }

    seen.add(index);
    order.push(index);
  };

  push(centerIndex);
  push(centerIndex - 1);
  push(centerIndex + 1);

  for (let offset = 2; offset < totalCount; offset += 1) {
    push(centerIndex + offset);
    push(centerIndex - offset);
  }

  return order;
}

function getSceneNeighborhood(
  centerIndex: number,
  totalCount: number,
  radius = 1
) {
  const indices: number[] = [];

  for (let offset = -radius; offset <= radius; offset += 1) {
    const sceneIndex = centerIndex + offset;

    if (sceneIndex >= 0 && sceneIndex < totalCount) {
      indices.push(sceneIndex);
    }
  }

  return indices;
}

function getSceneJumpCorridor(
  fromIndex: number,
  toIndex: number,
  totalCount: number
) {
  const indices: number[] = [];
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);

  for (let sceneIndex = start; sceneIndex <= end; sceneIndex += 1) {
    if (sceneIndex >= 0 && sceneIndex < totalCount) {
      indices.push(sceneIndex);
    }
  }

  return indices;
}

function getImmediateSceneWindow(
  activeChapterIndex: number,
  previousChapterIndex: number,
  totalCount: number
) {
  return mergeSceneIndices(
    getSceneNeighborhood(previousChapterIndex, totalCount),
    getSceneNeighborhood(activeChapterIndex, totalCount),
    totalCount
  );
}

function getCanvasDprCap(quality: QualityTier, profile: SceneProfile) {
  if (quality === 'low') {
    return 1;
  }

  if (!profile.enablePostFx) {
    return 1.15;
  }

  if (!profile.pointerParallax) {
    return quality === 'high' ? 1.3 : 1.2;
  }

  return quality === 'high' ? 1.85 : 1.45;
}

function getWarmStepMs(enablePostFx: boolean, shouldAnimate: boolean) {
  if (!shouldAnimate) {
    return enablePostFx ? 180 : 120;
  }

  return enablePostFx ? 240 : 160;
}

function getWarmBatchSize(enablePostFx: boolean, shouldAnimate: boolean) {
  if (!shouldAnimate) {
    return 3;
  }

  return enablePostFx ? 1 : 2;
}

function getTransitionCarryMs(
  enablePostFx: boolean,
  jumpDistance: number,
  shouldAnimate: boolean
) {
  if (!shouldAnimate) {
    return jumpDistance > 1 ? 320 : 220;
  }

  if (!enablePostFx) {
    return jumpDistance > 1 ? 520 : 320;
  }

  return jumpDistance > 1 ? 780 : 460;
}

const SCENE_LENS_CAMERA_SETTINGS: Record<
  SceneLensMode,
  {
    driftMultiplier: number;
    orbitRadius: number;
    orbitSpeed: number;
    lookBias: number;
    pushIn: number;
    lerp: number;
    signatureGain: number;
    burstGain: number;
  }
> = {
  glide: {
    driftMultiplier: 0.82,
    orbitRadius: 0.12,
    orbitSpeed: 0.14,
    lookBias: 0.16,
    pushIn: 0.08,
    lerp: 0.034,
    signatureGain: 0.88,
    burstGain: 0.92,
  },
  orbit: {
    driftMultiplier: 1,
    orbitRadius: 0.34,
    orbitSpeed: 0.2,
    lookBias: 0.22,
    pushIn: 0.16,
    lerp: 0.04,
    signatureGain: 1.02,
    burstGain: 1,
  },
  surge: {
    driftMultiplier: 1.22,
    orbitRadius: 0.2,
    orbitSpeed: 0.28,
    lookBias: 0.28,
    pushIn: 0.28,
    lerp: 0.048,
    signatureGain: 1.18,
    burstGain: 1.22,
  },
};

function ParticleGalaxy({
  isLive,
  progressRef,
  profile,
}: {
  isLive: boolean;
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const visibilityRef = useRef(0);
  const count = profile.particleCount;

  const geo = useMemo(() => {
    const seeds = new Float32Array(count);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const seed = i / count;
      seeds[i] = seed;
      const phi = seed * Math.PI * 2 * 137.508;
      const radius = Math.sqrt(seed) * 6.5;
      pos[i * 3] = Math.cos(phi) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
      pos[i * 3 + 2] = Math.sin(phi) * radius;
    }
    const targets = sampleText('OLIVE', count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return geometry;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 0 },
          uVisibility: { value: 0 },
          uMouse: { value: new THREE.Vector2() },
          uColor: { value: new THREE.Color('#ccff00') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useEffect(() => {
    if (!profile.pointerParallax) return;

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [profile.pointerParallax]);

  useEffect(() => {
    matRef.current = material;
  }, [material]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[0].range;
    const visible =
      isLive && progress >= start - 0.08 && progress <= end + 0.08;
    const local = visible
      ? Math.max(0, Math.min(1, (progress - start) / (end - start)))
      : 0;

    visibilityRef.current = THREE.MathUtils.lerp(
      visibilityRef.current,
      visible ? 1 : 0,
      0.05
    );

    matRef.current.uniforms.uTime.value = clock.elapsedTime;
    matRef.current.uniforms.uMorph.value = THREE.MathUtils.lerp(
      matRef.current.uniforms.uMorph.value,
      local * 1.2,
      0.025
    );
    matRef.current.uniforms.uVisibility.value = visibilityRef.current;
    matRef.current.uniforms.uMouse.value.lerp(mouseRef.current, 0.06);

    if (pointsRef.current) {
      pointsRef.current.visible = visible || visibilityRef.current > 0.02;
    }
  });

  return <points ref={pointsRef} geometry={geo} material={material} />;
}

function NeuralCortex({
  isLive,
  progressRef,
  profile,
}: {
  isLive: boolean;
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const visibilityRef = useRef(0);
  const nodeCount = profile.neuralNodeCount;

  const { nodePos, lineGeo, lineMat } = useMemo(() => {
    const nodePos: THREE.Vector3[] = Array.from(
      { length: nodeCount },
      () =>
        new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 3.5
        )
    );

    const verts: number[] = [];
    const progressValues: number[] = [];

    for (let a = 0; a < nodeCount; a++)
      for (let b = a + 1; b < nodeCount; b++) {
        if (nodePos[a].distanceTo(nodePos[b]) > 3.8) continue;
        for (let step = 0; step <= 10; step++) {
          const t = step / 10;
          const point = new THREE.Vector3().lerpVectors(
            nodePos[a],
            nodePos[b],
            t
          );
          verts.push(point.x, point.y, point.z);
          progressValues.push(t);
        }
      }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(verts), 3)
    );
    geometry.setAttribute(
      'aP',
      new THREE.BufferAttribute(new Float32Array(progressValues), 1)
    );

    const material = new THREE.ShaderMaterial({
      vertexShader: NEURAL_VERT,
      fragmentShader: NEURAL_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#00d4ff') },
      },
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { nodePos, lineGeo: geometry, lineMat: material };
  }, [nodeCount]);

  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.055, 8, 8), []);
  const nodeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#00d4ff',
        emissive: '#00d4ff',
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const coreMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0f172a',
        emissive: '#67e8f9',
        emissiveIntensity: 0,
        roughness: 0.08,
        metalness: 0.26,
        transmission: 0.42,
        thickness: 0.8,
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const orbitMats = useMemo(
    () =>
      [2.05, 2.8].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#67e8f9',
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
      ),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[1].range;
    const visible =
      isLive && progress >= start - 0.08 && progress <= end + 0.08;
    visibilityRef.current = THREE.MathUtils.lerp(
      visibilityRef.current,
      visible ? 1 : 0,
      0.04
    );
    lineMat.opacity = visibilityRef.current * 0.82;
    nodeMat.opacity = visibilityRef.current;
    coreMat.opacity = visibilityRef.current * 0.42;
    coreMat.emissiveIntensity = THREE.MathUtils.lerp(
      coreMat.emissiveIntensity,
      visible ? 1.8 : 0,
      0.06
    );
    orbitMats.forEach((material, index) => {
      material.opacity = visibilityRef.current * (0.32 - index * 0.08);
    });

    groupRef.current.visible = visibilityRef.current > 0.02;
    if (!groupRef.current.visible) {
      return;
    }

    lineMat.uniforms.uTime.value = clock.elapsedTime;
    groupRef.current.rotation.y = clock.elapsedTime * 0.045;
  });

  return (
    <group ref={groupRef}>
      <mesh material={coreMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusKnotGeometry args={[0.94, 0.16, 150, 18]} />
      </mesh>
      {[2.05, 2.8].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[Math.PI / 2 + index * 0.44, index * 0.72, 0]}
          material={orbitMats[index]}
        >
          <torusGeometry args={[radius, 0.028, 10, 72]} />
        </mesh>
      ))}
      <lineSegments geometry={lineGeo} material={lineMat} />
      {nodePos.map((pos, index) => (
        <mesh
          key={index}
          position={pos}
          geometry={nodeGeo}
          material={nodeMat}
        />
      ))}
      <Sparkles
        count={Math.max(12, Math.round(profile.cloudSparkles * 0.4))}
        scale={6.8}
        size={1.8}
        speed={0.45}
        color="#67e8f9"
        opacity={0.34}
      />
      <pointLight color="#00d4ff" intensity={2.5} distance={14} decay={2} />
    </group>
  );
}

function CrystalFortress({
  isLive,
  progressRef,
}: {
  isLive: boolean;
  progressRef: MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const shieldMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SHIELD_VERT,
        fragmentShader: SHIELD_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#a855f7') },
        },
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const crystalMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#6d28d9',
        emissive: '#a855f7',
        emissiveIntensity: 0.6,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.55,
        thickness: 1.2,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const wireMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c084fc',
        wireframe: true,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const ringMats = useMemo(
    () =>
      [2.2, 2.8, 3.5].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#a855f7',
            transparent: true,
            opacity: 0,
          })
      ),
    []
  );
  const scanRef = useRef<THREE.Mesh>(null);
  const scanMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#d8b4fe',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const sentinelMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e9d5ff',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[2].range;
    const visible =
      isLive && progress >= start - 0.08 && progress <= end + 0.08;
    const elapsed = clock.elapsedTime;
    const alpha = THREE.MathUtils.lerp(
      crystalMat.opacity,
      visible ? 0.82 : 0,
      0.04
    );
    crystalMat.opacity = alpha;
    wireMat.opacity = alpha * 0.35;
    ringMats.forEach((material, index) => {
      material.opacity = alpha * (0.45 - index * 0.08);
    });
    shieldMat.uniforms.uTime.value = elapsed;
    shieldMat.opacity = alpha;
    scanMat.opacity = alpha * 0.22;
    sentinelMat.opacity = alpha * 0.34;

    groupRef.current.visible = alpha > 0.02;
    if (!groupRef.current.visible) {
      return;
    }

    groupRef.current.rotation.y = elapsed * 0.11;
    groupRef.current.rotation.x = Math.sin(elapsed * 0.07) * 0.14;

    if (scanRef.current) {
      scanRef.current.rotation.z = elapsed * 0.36;
      scanRef.current.scale.setScalar(1 + Math.sin(elapsed * 1.1) * 0.04);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh material={crystalMat}>
        <icosahedronGeometry args={[1.5, 1]} />
      </mesh>
      <mesh material={wireMat}>
        <icosahedronGeometry args={[1.52, 1]} />
      </mesh>
      <mesh material={shieldMat}>
        <sphereGeometry args={[3.2, 32, 32]} />
      </mesh>
      {[2.2, 2.8, 3.5].map((radius, index) => (
        <mesh
          key={index}
          rotation={[Math.PI / 2 + index * 0.55, index * 0.9, 0]}
          material={ringMats[index]}
        >
          <torusGeometry args={[radius, 0.018, 8, 64]} />
        </mesh>
      ))}
      <mesh ref={scanRef} material={scanMat} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.85, 3.15, 72]} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2;

        return (
          <mesh
            key={`sentinel-${index}`}
            position={[
              Math.cos(angle) * 2.7,
              Math.sin(angle * 1.6) * 0.72,
              Math.sin(angle) * 2.7,
            ]}
            rotation={[angle, angle, Math.PI / 4]}
            material={sentinelMat}
          >
            <octahedronGeometry args={[0.2, 0]} />
          </mesh>
        );
      })}
      <pointLight color="#a855f7" intensity={3} distance={11} decay={2} />
    </group>
  );
}

function CloudConstellation({
  isLive,
  progressRef,
  profile,
}: {
  isLive: boolean;
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const nodeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const orbitMats = useMemo(
    () =>
      [2.3, 3.5, 4.7].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#7dd3fc',
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
      ),
    []
  );
  const gatewayMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0f172a',
        emissive: '#38bdf8',
        emissiveIntensity: 0,
        roughness: 0.12,
        metalness: 0.18,
        transmission: 0.5,
        thickness: 0.9,
        transparent: true,
        opacity: 0,
      }),
    []
  );

  const { nodes, edgeGeos } = useMemo(() => {
    const layers = [
      { count: 4, y: -2.2, r: 4.0 },
      { count: 6, y: 0, r: 3.5 },
      { count: 4, y: 2.2, r: 2.5 },
      { count: 2, y: 3.8, r: 1.0 },
    ];
    const nodes: THREE.Vector3[] = [];
    for (const { count, y, r } of layers)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        nodes.push(
          new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r)
        );
      }

    const edgeGeos: THREE.BufferGeometry[] = [];
    let base = 0;
    for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
      const layerCountA = layers[layerIndex].count;
      const layerCountB = layers[layerIndex + 1].count;
      const baseA = base;
      const baseB = base + layerCountA;
      for (let a = 0; a < layerCountA; a++)
        for (let b = 0; b < layerCountB; b++)
          if (Math.random() > 0.35) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
              nodes[baseA + a],
              nodes[baseB + b],
            ]);
            edgeGeos.push(geometry);
          }
      base += layerCountA;
    }
    return { nodes, edgeGeos };
  }, []);

  const nodeGeo = useMemo(() => new THREE.SphereGeometry(0.11, 10, 10), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[3].range;
    const visible =
      isLive && progress >= start - 0.08 && progress <= end + 0.08;
    const alpha = THREE.MathUtils.lerp(
      lineMat.opacity,
      visible ? 0.45 : 0,
      0.04
    );
    lineMat.opacity = alpha;
    nodeMat.opacity = THREE.MathUtils.lerp(
      nodeMat.opacity,
      visible ? 0.9 : 0,
      0.04
    );
    gatewayMat.opacity = THREE.MathUtils.lerp(
      gatewayMat.opacity,
      visible ? 0.34 : 0,
      0.04
    );
    gatewayMat.emissiveIntensity = THREE.MathUtils.lerp(
      gatewayMat.emissiveIntensity,
      visible ? 1.4 : 0,
      0.06
    );
    orbitMats.forEach((material, index) => {
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        visible ? 0.24 - index * 0.04 : 0,
        0.04
      );
    });

    groupRef.current.visible = alpha > 0.02 || (nodeMat.opacity ?? 0) > 0.02;
    if (!groupRef.current.visible) {
      return;
    }

    groupRef.current.rotation.y = clock.elapsedTime * 0.055;
  });

  return (
    <group ref={groupRef}>
      {[2.3, 3.5, 4.7].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[Math.PI / 2 + index * 0.22, index * 0.5, 0]}
          position={[0, (index - 1) * 0.75, -0.5]}
          material={orbitMats[index]}
        >
          <torusGeometry args={[radius, 0.026, 10, 72]} />
        </mesh>
      ))}
      <mesh material={gatewayMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.18, 16, 48]} />
      </mesh>
      {edgeGeos.map((geometry, index) => (
        <lineSegments key={index} geometry={geometry} material={lineMat} />
      ))}
      {nodes.map((pos, index) => (
        <mesh
          key={index}
          position={pos}
          geometry={nodeGeo}
          material={nodeMat}
        />
      ))}
      <Sparkles
        count={profile.cloudSparkles}
        scale={8}
        size={2}
        speed={0.3}
        color="#38bdf8"
        opacity={0.5}
      />
      <pointLight color="#38bdf8" intensity={2} distance={13} decay={2} />
    </group>
  );
}

function SignalMatrix({
  isLive,
  progressRef,
  profile,
}: {
  isLive: boolean;
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const gridSize = profile.signalGridSize;
  const count = gridSize * gridSize;

  const { barMesh, mat } = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.14, 1, 0.14);
    const barIdx = new Float32Array(count);
    for (let i = 0; i < count; i++) barIdx[i] = i;
    geometry.setAttribute('aI', new THREE.BufferAttribute(barIdx, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: DATA_VERT,
      fragmentShader: DATA_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#22c55e') },
      },
      transparent: true,
      opacity: 0,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        ((i % gridSize) - gridSize / 2) * 0.6,
        0,
        (Math.floor(i / gridSize) - gridSize / 2) * 0.6
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return { barMesh: mesh, mat: material };
  }, [count, gridSize]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scanDiscRef = useRef<THREE.Mesh>(null);
  const scanMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#4ade80',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#bef264',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start, end] = CHAPTERS[4].range;
    const visible =
      isLive && progress >= start - 0.08 && progress <= end + 0.08;
    mat.opacity = THREE.MathUtils.lerp(
      mat.opacity ?? 1,
      visible ? 0.88 : 0,
      0.04
    );
    scanMat.opacity = THREE.MathUtils.lerp(
      scanMat.opacity,
      visible ? 0.13 : 0,
      0.04
    );
    ringMat.opacity = THREE.MathUtils.lerp(
      ringMat.opacity,
      visible ? 0.24 : 0,
      0.04
    );

    groupRef.current.visible = (mat.opacity ?? 0) > 0.02;
    if (!groupRef.current.visible) {
      return;
    }

    mat.uniforms.uTime.value = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const col = i % gridSize;
      const row = Math.floor(i / gridSize);
      const height =
        (Math.sin(clock.elapsedTime * 1.8 + col * 0.6 + row * 0.8) * 0.5 +
          0.5) *
          (Math.cos(clock.elapsedTime * 1.2 + col * 0.4) * 0.5 + 0.5) *
          2.8 +
        0.12;
      dummy.position.set(
        (col - gridSize / 2) * 0.6,
        height * 0.5 - 1,
        (row - gridSize / 2) * 0.6
      );
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      barMesh.setMatrixAt(i, dummy.matrix);
    }
    barMesh.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.25;

    if (scanDiscRef.current) {
      scanDiscRef.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.55;
      scanDiscRef.current.rotation.z = clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={scanDiscRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.8, 0]}
        material={scanMat}
      >
        <circleGeometry args={[3.25, 48]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.95, 0]}
        material={ringMat}
      >
        <ringGeometry args={[3.05, 3.24, 64]} />
      </mesh>
      <primitive object={barMesh} />
      <Sparkles
        count={profile.signalSparkles}
        scale={7}
        size={3}
        speed={0.35}
        color="#22c55e"
        opacity={0.5}
      />
      <pointLight color="#22c55e" intensity={2.2} distance={14} decay={2} />
    </group>
  );
}

function SingularityCore({
  isLive,
  progressRef,
  profile,
}: {
  isLive: boolean;
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ccff00',
        emissive: '#ccff00',
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0,
      }),
    []
  );
  const ringMats = useMemo(
    () =>
      [1.6, 2.1, 2.7, 3.4].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#ccff00',
            transparent: true,
            opacity: 0,
          })
      ),
    []
  );
  const beamRef = useRef<THREE.Mesh>(null);
  const beamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fef08a',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const spokeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ccff00',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const progress = progressRef.current ?? 0;
    const [start] = CHAPTERS[5].range;
    const visible = isLive && progress >= start - 0.06;
    const elapsed = clock.elapsedTime;
    const alpha = THREE.MathUtils.lerp(
      coreMat.opacity,
      visible ? 0.95 : 0,
      0.04
    );
    coreMat.opacity = alpha;
    coreMat.emissiveIntensity = 7 * alpha;
    ringMats.forEach((material, index) => {
      material.opacity = alpha * (0.5 - index * 0.09);
    });
    beamMat.opacity = alpha * 0.18;
    spokeMat.opacity = alpha * 0.34;

    groupRef.current.visible = alpha > 0.02;
    if (!groupRef.current.visible) {
      return;
    }

    if (coreRef.current) {
      const scale = 1 + Math.sin(elapsed * 2.2) * 0.12;
      coreRef.current.scale.setScalar(
        THREE.MathUtils.lerp(coreRef.current.scale.x, scale, 0.1)
      );
    }
    if (beamRef.current) {
      beamRef.current.scale.y = THREE.MathUtils.lerp(
        beamRef.current.scale.y,
        1 + Math.sin(elapsed * 1.4) * 0.08,
        0.08
      );
    }
    groupRef.current.rotation.z = elapsed * 0.18;
    groupRef.current.rotation.x = Math.sin(elapsed * 0.12) * 0.1;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={beamRef} material={beamMat}>
        <cylinderGeometry args={[0.18, 0.66, 7.2, 24, 1, true]} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh
          key={`spoke-${index}`}
          rotation={[0, 0, (index / 6) * Math.PI * 2]}
          material={spokeMat}
        >
          <boxGeometry args={[0.05, 6.2, 0.05]} />
        </mesh>
      ))}
      <mesh ref={coreRef} material={coreMat}>
        <sphereGeometry args={[0.42, 32, 32]} />
      </mesh>
      {[1.6, 2.1, 2.7, 3.4].map((radius, index) => (
        <mesh
          key={index}
          rotation={[index * 0.7, index * 1.1, 0]}
          material={ringMats[index]}
        >
          <torusGeometry args={[radius, 0.016, 8, 64]} />
        </mesh>
      ))}
      <Sparkles
        count={profile.singularitySparkles}
        scale={7}
        size={profile.singularitySparkleSize}
        speed={0.9}
        color="#ccff00"
        opacity={0.85}
      />
      <pointLight color="#ccff00" intensity={7} distance={18} decay={2} />
    </group>
  );
}

function AtmosphereRig({
  activeChapterIndex,
  profile,
}: {
  activeChapterIndex: number;
  profile: SceneProfile;
}) {
  const shellRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const shellMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const keyLightRef = useRef<THREE.PointLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);
  const atmosphere = useMemo(
    () =>
      CHAPTER_ATMOSPHERES[CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id],
    [activeChapterIndex]
  );
  const currentFogColor = useRef(new THREE.Color(atmosphere.fogColor));
  const currentHazeColor = useRef(new THREE.Color(atmosphere.hazeColor));
  const currentKeyLightColor = useRef(
    new THREE.Color(atmosphere.keyLightColor)
  );
  const currentRimLightColor = useRef(
    new THREE.Color(atmosphere.rimLightColor)
  );
  const targetFogColor = useMemo(
    () => new THREE.Color(atmosphere.fogColor),
    [atmosphere.fogColor]
  );
  const targetHazeColor = useMemo(
    () => new THREE.Color(atmosphere.hazeColor),
    [atmosphere.hazeColor]
  );
  const targetKeyLightColor = useMemo(
    () => new THREE.Color(atmosphere.keyLightColor),
    [atmosphere.keyLightColor]
  );
  const targetRimLightColor = useMemo(
    () => new THREE.Color(atmosphere.rimLightColor),
    [atmosphere.rimLightColor]
  );

  useFrame(({ clock, scene }) => {
    currentFogColor.current.lerp(targetFogColor, 0.04);
    currentHazeColor.current.lerp(targetHazeColor, 0.04);
    currentKeyLightColor.current.lerp(targetKeyLightColor, 0.05);
    currentRimLightColor.current.lerp(targetRimLightColor, 0.05);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(currentFogColor.current);
    }

    if (shellMaterialRef.current) {
      shellMaterialRef.current.color.copy(currentHazeColor.current);
      shellMaterialRef.current.opacity = THREE.MathUtils.lerp(
        shellMaterialRef.current.opacity,
        atmosphere.hazeOpacity,
        0.06
      );
    }

    if (haloMaterialRef.current) {
      haloMaterialRef.current.color.copy(currentKeyLightColor.current);
      haloMaterialRef.current.opacity = THREE.MathUtils.lerp(
        haloMaterialRef.current.opacity,
        atmosphere.haloOpacity +
          Math.sin(clock.elapsedTime * (0.55 + atmosphere.starDriftSpeed)) *
            0.025,
        0.08
      );
    }

    if (shellRef.current) {
      shellRef.current.rotation.y += 0.0009;
      shellRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.08) * 0.04;
    }

    if (haloRef.current) {
      const targetScale =
        atmosphere.haloScale +
        Math.sin(clock.elapsedTime * (0.42 + atmosphere.starDriftSpeed * 0.4)) *
          0.03;
      haloRef.current.scale.setScalar(
        THREE.MathUtils.lerp(haloRef.current.scale.x, targetScale, 0.08)
      );
      haloRef.current.rotation.z =
        clock.elapsedTime * (0.03 + atmosphere.starDriftSpeed * 0.08);
    }

    if (hemiLightRef.current) {
      hemiLightRef.current.color.copy(currentKeyLightColor.current);
      hemiLightRef.current.groundColor.copy(currentFogColor.current);
      hemiLightRef.current.intensity = THREE.MathUtils.lerp(
        hemiLightRef.current.intensity,
        Math.min(1.4, profile.ambientLight + atmosphere.ambientBoost),
        0.06
      );
    }

    if (keyLightRef.current) {
      keyLightRef.current.color.copy(currentKeyLightColor.current);
      keyLightRef.current.intensity = THREE.MathUtils.lerp(
        keyLightRef.current.intensity,
        atmosphere.keyLightIntensity,
        0.06
      );
    }

    if (rimLightRef.current) {
      rimLightRef.current.color.copy(currentRimLightColor.current);
      rimLightRef.current.intensity = THREE.MathUtils.lerp(
        rimLightRef.current.intensity,
        atmosphere.rimLightIntensity,
        0.06
      );
    }
  });

  return (
    <>
      <mesh ref={shellRef} renderOrder={-3}>
        <sphereGeometry args={[34, 40, 40]} />
        <meshBasicMaterial
          ref={shellMaterialRef}
          transparent
          opacity={0}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={haloRef}
        position={[0, 0, -10]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={-2}
      >
        <ringGeometry args={[4.8, 18, 96]} />
        <meshBasicMaterial
          ref={haloMaterialRef}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <hemisphereLight
        ref={hemiLightRef}
        color={atmosphere.keyLightColor}
        groundColor={atmosphere.fogColor}
        intensity={profile.ambientLight}
      />
      <pointLight
        ref={keyLightRef}
        color={atmosphere.keyLightColor}
        position={[4, 5, 11]}
        intensity={atmosphere.keyLightIntensity}
        distance={28}
        decay={2}
      />
      <pointLight
        ref={rimLightRef}
        color={atmosphere.rimLightColor}
        position={[-8, -1.5, -14]}
        intensity={atmosphere.rimLightIntensity}
        distance={28}
        decay={2}
      />
    </>
  );
}

function Background({
  activeChapterIndex,
  profile,
}: {
  activeChapterIndex: number;
  profile: SceneProfile;
}) {
  const atmosphere =
    CHAPTER_ATMOSPHERES[CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id];

  return (
    <>
      <Stars
        radius={90}
        depth={55}
        count={profile.starCount}
        factor={profile.starFactor}
        saturation={0}
        fade
        speed={atmosphere.starDriftSpeed}
      />
      <fog
        attach="fog"
        color={atmosphere.fogColor}
        near={35}
        far={profile.fogFar}
      />
      <AtmosphereRig
        activeChapterIndex={activeChapterIndex}
        profile={profile}
      />
    </>
  );
}

function SceneSignatureLayer({
  activeChapterIndex,
  profile,
  sceneLens,
}: {
  activeChapterIndex: number;
  profile: SceneProfile;
  sceneLens: SceneLensMode;
}) {
  const chapterId = CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id;
  const atmosphere = CHAPTER_ATMOSPHERES[chapterId];
  const lensConfig = SCENE_LENS_CAMERA_SETTINGS[sceneLens];
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const primaryMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: atmosphere.keyLightColor,
        transparent: true,
        opacity: 0,
        wireframe: chapterId === 'neural' || chapterId === 'vault',
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [atmosphere.keyLightColor, chapterId]
  );
  const secondaryMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: atmosphere.rimLightColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [atmosphere.rimLightColor]
  );
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: atmosphere.hazeColor,
        emissive: atmosphere.keyLightColor,
        emissiveIntensity: 0.9,
        roughness: 0.16,
        metalness: 0.2,
        transparent: true,
        opacity: 0,
      }),
    [atmosphere.hazeColor, atmosphere.keyLightColor]
  );
  const sparkleCount = useMemo(
    () => Math.max(18, Math.round(profile.cloudSparkles * 0.85)),
    [profile.cloudSparkles]
  );

  useFrame(({ clock }) => {
    const primaryOpacityTarget = Math.min(
      0.38,
      (chapterId === 'signal' ? 0.18 : 0.24) * lensConfig.signatureGain
    );
    const secondaryOpacityTarget = Math.min(
      0.42,
      (chapterId === 'singularity' ? 0.34 : 0.22) * lensConfig.signatureGain
    );
    const coreOpacityTarget = Math.min(
      0.26,
      (chapterId === 'signal' ? 0.1 : 0.16) *
        (0.9 + lensConfig.signatureGain * 0.18)
    );

    primaryMat.opacity = THREE.MathUtils.lerp(
      primaryMat.opacity,
      primaryOpacityTarget,
      0.08
    );
    secondaryMat.opacity = THREE.MathUtils.lerp(
      secondaryMat.opacity,
      secondaryOpacityTarget,
      0.08
    );
    coreMat.opacity = THREE.MathUtils.lerp(
      coreMat.opacity,
      coreOpacityTarget,
      0.08
    );
    coreMat.emissiveIntensity = THREE.MathUtils.lerp(
      coreMat.emissiveIntensity,
      1.2 + atmosphere.haloOpacity * 3,
      0.08
    );

    if (groupRef.current) {
      groupRef.current.rotation.y =
        clock.elapsedTime * (0.05 + atmosphere.starDriftSpeed * 0.09);
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.14) * 0.06;
    }

    if (pulseRef.current) {
      const targetScale =
        1 +
        Math.sin(clock.elapsedTime * (0.65 + atmosphere.starDriftSpeed)) *
          0.05 +
        lensConfig.orbitRadius * 0.18;
      pulseRef.current.scale.setScalar(
        THREE.MathUtils.lerp(pulseRef.current.scale.x, targetScale, 0.08)
      );
    }

    if (sweepRef.current) {
      sweepRef.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.55;
      sweepRef.current.rotation.z =
        clock.elapsedTime * (0.16 + lensConfig.orbitSpeed * 0.2);
    }
  });

  switch (chapterId) {
    case 'genesis':
      return (
        <group ref={groupRef}>
          <mesh ref={pulseRef} material={coreMat} position={[0, 0, -1.2]}>
            <sphereGeometry args={[1.18, 28, 28]} />
          </mesh>
          {[4.6, 6.1, 7.4].map((radius, index) => (
            <mesh
              key={radius}
              rotation={[Math.PI / 2 + index * 0.35, index * 0.55, 0]}
              material={index === 1 ? secondaryMat : primaryMat}
            >
              <torusGeometry args={[radius, 0.024, 10, 72]} />
            </mesh>
          ))}
          <Sparkles
            count={sparkleCount}
            scale={10}
            size={2.3}
            speed={0.32}
            color={atmosphere.hazeColor}
            opacity={0.52}
          />
        </group>
      );
    case 'neural':
      return (
        <group ref={groupRef}>
          <mesh ref={pulseRef} material={primaryMat}>
            <torusKnotGeometry args={[2.15, 0.24, 132, 18]} />
          </mesh>
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            material={secondaryMat}
            position={[0, 0, -0.8]}
          >
            <torusGeometry args={[4.3, 0.028, 10, 90]} />
          </mesh>
          <Sparkles
            count={sparkleCount}
            scale={8.5}
            size={2.1}
            speed={0.5}
            color={atmosphere.keyLightColor}
            opacity={0.42}
          />
        </group>
      );
    case 'vault':
      return (
        <group ref={groupRef}>
          <mesh ref={pulseRef} material={coreMat}>
            <octahedronGeometry args={[1.45, 1]} />
          </mesh>
          <mesh material={primaryMat}>
            <octahedronGeometry args={[2.55, 1]} />
          </mesh>
          {Array.from({ length: 6 }, (_, index) => {
            const angle = (index / 6) * Math.PI * 2;

            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * 2.5,
                  Math.sin(index * 1.7) * 0.35,
                  Math.sin(angle) * 2.5,
                ]}
                rotation={[0, angle, Math.PI / 4]}
                material={secondaryMat}
              >
                <octahedronGeometry args={[0.34, 0]} />
              </mesh>
            );
          })}
        </group>
      );
    case 'cloud':
      return (
        <group ref={groupRef}>
          {[2.4, 3.4, 4.6].map((radius, index) => (
            <mesh
              key={radius}
              position={[0, (index - 1) * 1.25, -0.8]}
              rotation={[Math.PI / 2, 0, 0]}
              material={index === 1 ? secondaryMat : primaryMat}
            >
              <torusGeometry args={[radius, 0.028, 10, 72]} />
            </mesh>
          ))}
          {Array.from({ length: 4 }, (_, index) => {
            const angle = (index / 4) * Math.PI * 2;

            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * 3.3,
                  Math.sin(angle * 1.4) * 0.9,
                  Math.sin(angle) * 3.3,
                ]}
                material={coreMat}
              >
                <sphereGeometry args={[0.26, 20, 20]} />
              </mesh>
            );
          })}
          <Sparkles
            count={sparkleCount}
            scale={9.5}
            size={2.1}
            speed={0.34}
            color={atmosphere.hazeColor}
            opacity={0.45}
          />
        </group>
      );
    case 'signal':
      return (
        <group ref={groupRef}>
          <mesh
            ref={sweepRef}
            position={[0, -0.8, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={primaryMat}
          >
            <circleGeometry args={[4.8, 64]} />
          </mesh>
          {[2.8, 4.6].map(radius => (
            <mesh
              key={radius}
              rotation={[Math.PI / 2, 0, 0]}
              material={secondaryMat}
            >
              <ringGeometry args={[radius - 0.16, radius, 64]} />
            </mesh>
          ))}
          {[-1.8, 0, 1.8].map(positionX => (
            <mesh
              key={positionX}
              position={[positionX, 0.2, 0]}
              material={coreMat}
            >
              <boxGeometry args={[0.22, 3.4, 0.22]} />
            </mesh>
          ))}
        </group>
      );
    case 'singularity':
      return (
        <group ref={groupRef}>
          <mesh ref={pulseRef} material={coreMat}>
            <icosahedronGeometry args={[0.86, 1]} />
          </mesh>
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index / 12) * Math.PI * 2;

            return (
              <mesh
                key={index}
                rotation={[0, 0, angle]}
                material={secondaryMat}
              >
                <boxGeometry args={[0.05, 6.5, 0.05]} />
              </mesh>
            );
          })}
          <mesh material={primaryMat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3.8, 0.032, 10, 84]} />
          </mesh>
          <Sparkles
            count={Math.max(24, Math.round(profile.singularitySparkles * 0.45))}
            scale={9.5}
            size={2.5}
            speed={0.7}
            color={atmosphere.keyLightColor}
            opacity={0.56}
          />
        </group>
      );
    default:
      return null;
  }
}

function InteractionBurstLayer({
  activeChapterIndex,
  profile,
  sceneLens,
  interactionBurstActive,
}: {
  activeChapterIndex: number;
  profile: SceneProfile;
  sceneLens: SceneLensMode;
  interactionBurstActive: boolean;
}) {
  const chapterId = CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id;
  const atmosphere = CHAPTER_ATMOSPHERES[chapterId];
  const lensConfig = SCENE_LENS_CAMERA_SETTINGS[sceneLens];
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const burstLevelRef = useRef(0);
  const primaryMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: atmosphere.keyLightColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [atmosphere.keyLightColor]
  );
  const secondaryMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: atmosphere.rimLightColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [atmosphere.rimLightColor]
  );
  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: atmosphere.hazeColor,
        emissive: atmosphere.keyLightColor,
        emissiveIntensity: 0,
        roughness: 0.14,
        metalness: 0.22,
        transparent: true,
        opacity: 0,
      }),
    [atmosphere.hazeColor, atmosphere.keyLightColor]
  );
  const sparkleCount = useMemo(
    () =>
      Math.max(
        12,
        Math.round((profile.cloudSparkles + profile.signalSparkles) * 0.65)
      ),
    [profile.cloudSparkles, profile.signalSparkles]
  );

  useFrame(({ clock }) => {
    burstLevelRef.current = THREE.MathUtils.lerp(
      burstLevelRef.current,
      interactionBurstActive ? 1 : 0,
      interactionBurstActive ? 0.18 * lensConfig.burstGain : 0.11
    );

    const burst = Math.min(1.35, burstLevelRef.current * lensConfig.burstGain);

    primaryMat.opacity = burst * 0.38;
    secondaryMat.opacity = burst * 0.28;
    coreMat.opacity = burst * 0.18;
    coreMat.emissiveIntensity = burst * 3.2;

    if (groupRef.current) {
      groupRef.current.visible = burst > 0.02;
      if (!groupRef.current.visible) {
        return;
      }

      groupRef.current.rotation.y +=
        (0.008 +
          atmosphere.starDriftSpeed * 0.01 +
          lensConfig.orbitSpeed * 0.01) *
        burst;
      groupRef.current.rotation.x =
        Math.sin(clock.elapsedTime * (0.8 + atmosphere.starDriftSpeed * 0.4)) *
        0.08 *
        burst;
    }

    if (pulseRef.current) {
      const scale =
        1 +
        burst * 0.42 +
        Math.sin(clock.elapsedTime * (4 + atmosphere.starDriftSpeed * 2)) *
          0.06 *
          burst +
        lensConfig.pushIn * 0.16;
      pulseRef.current.scale.setScalar(scale);
    }

    if (sweepRef.current) {
      sweepRef.current.rotation.z =
        clock.elapsedTime *
        (0.3 + atmosphere.starDriftSpeed * 0.2 + lensConfig.orbitSpeed * 0.3);
      sweepRef.current.position.y =
        Math.sin(clock.elapsedTime * 1.2) * 0.4 * burst;
    }
  });

  switch (chapterId) {
    case 'genesis':
      return (
        <group ref={groupRef} visible={false}>
          <mesh ref={pulseRef} material={coreMat} position={[0, 0, -1.1]}>
            <sphereGeometry args={[1.36, 28, 28]} />
          </mesh>
          {[4.4, 5.8].map((radius, index) => (
            <mesh
              key={radius}
              rotation={[Math.PI / 2 + index * 0.2, index * 0.55, 0]}
              material={index === 0 ? primaryMat : secondaryMat}
            >
              <torusGeometry args={[radius, 0.05, 12, 96]} />
            </mesh>
          ))}
          <Sparkles
            count={sparkleCount}
            scale={11}
            size={2.8}
            speed={0.65}
            color={atmosphere.keyLightColor}
            opacity={0.7}
          />
        </group>
      );
    case 'neural':
      return (
        <group ref={groupRef} visible={false}>
          <mesh ref={pulseRef} material={primaryMat}>
            <torusKnotGeometry args={[2.4, 0.18, 150, 22]} />
          </mesh>
          {[-2.2, -0.7, 0.7, 2.2].map(positionX => (
            <mesh
              key={positionX}
              position={[positionX, 0, 0]}
              rotation={[0.2, Math.PI / 4, Math.PI / 2]}
              material={secondaryMat}
            >
              <boxGeometry args={[0.08, 4.6, 0.08]} />
            </mesh>
          ))}
          <Sparkles
            count={sparkleCount}
            scale={9}
            size={2.4}
            speed={0.82}
            color={atmosphere.keyLightColor}
            opacity={0.74}
          />
        </group>
      );
    case 'vault':
      return (
        <group ref={groupRef} visible={false}>
          <mesh ref={pulseRef} material={primaryMat}>
            <sphereGeometry args={[3.4, 28, 28]} />
          </mesh>
          <mesh material={coreMat}>
            <octahedronGeometry args={[1.6, 1]} />
          </mesh>
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (index / 8) * Math.PI * 2;

            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * 3.1,
                  Math.sin(angle * 1.5) * 0.6,
                  Math.sin(angle) * 3.1,
                ]}
                rotation={[angle, angle, Math.PI / 4]}
                material={secondaryMat}
              >
                <octahedronGeometry args={[0.22, 0]} />
              </mesh>
            );
          })}
        </group>
      );
    case 'cloud':
      return (
        <group ref={groupRef} visible={false}>
          {[2.2, 3.3, 4.5].map((radius, index) => (
            <mesh
              key={radius}
              position={[0, (index - 1) * 0.7, -0.8]}
              rotation={[Math.PI / 2, index * 0.35, 0]}
              material={index === 1 ? primaryMat : secondaryMat}
            >
              <torusGeometry args={[radius, 0.045, 12, 84]} />
            </mesh>
          ))}
          <mesh
            ref={pulseRef}
            material={coreMat}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[1.2, 0.26, 18, 64]} />
          </mesh>
          <Sparkles
            count={sparkleCount}
            scale={10}
            size={2.5}
            speed={0.58}
            color={atmosphere.hazeColor}
            opacity={0.68}
          />
        </group>
      );
    case 'signal':
      return (
        <group ref={groupRef} visible={false}>
          <mesh
            ref={sweepRef}
            position={[0, -0.85, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={primaryMat}
          >
            <ringGeometry args={[1.8, 4.9, 96]} />
          </mesh>
          {[-2.4, -0.8, 0.8, 2.4].map(positionX => (
            <mesh
              key={positionX}
              position={[positionX, 0.2, 0]}
              material={secondaryMat}
            >
              <boxGeometry args={[0.16, 3.9, 0.16]} />
            </mesh>
          ))}
          <mesh ref={pulseRef} material={coreMat} position={[0, -0.3, 0]}>
            <boxGeometry args={[0.4, 1.8, 0.4]} />
          </mesh>
        </group>
      );
    case 'singularity':
      return (
        <group ref={groupRef} visible={false}>
          <mesh ref={sweepRef} material={primaryMat}>
            <cylinderGeometry args={[0.28, 0.82, 8.2, 28, 1, true]} />
          </mesh>
          {Array.from({ length: 8 }, (_, index) => (
            <mesh
              key={index}
              rotation={[0, 0, (index / 8) * Math.PI * 2]}
              material={secondaryMat}
            >
              <boxGeometry args={[0.06, 7.2, 0.06]} />
            </mesh>
          ))}
          <mesh ref={pulseRef} material={coreMat}>
            <icosahedronGeometry args={[0.98, 1]} />
          </mesh>
          <Sparkles
            count={Math.max(22, Math.round(profile.singularitySparkles * 0.35))}
            scale={9.8}
            size={2.8}
            speed={0.9}
            color={atmosphere.keyLightColor}
            opacity={0.78}
          />
        </group>
      );
    default:
      return null;
  }
}

function Scene({
  activeChapterIndex,
  progressRef,
  profile,
  sceneLens,
  primeSceneIndices,
  renderSceneIndices,
  interactionBurstActive,
  interactionBurstCycle,
}: {
  activeChapterIndex: number;
  progressRef: MutableRefObject<number>;
  profile: SceneProfile;
  sceneLens: SceneLensMode;
  primeSceneIndices: number[];
  renderSceneIndices: number[];
  interactionBurstActive: boolean;
  interactionBurstCycle: number;
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 0, 9));
  const camLook = useRef(new THREE.Vector3(0, 0, 0));
  const nextPos = useRef(new THREE.Vector3(0, 0, 9));
  const nextLook = useRef(new THREE.Vector3(0, 0, 0));
  const burstLevelRef = useRef(0);
  const primeSceneSet = useMemo(
    () => new Set(primeSceneIndices),
    [primeSceneIndices]
  );
  const renderSceneSet = useMemo(
    () => new Set(renderSceneIndices),
    [renderSceneIndices]
  );
  const activeAtmosphere = useMemo(
    () =>
      CHAPTER_ATMOSPHERES[CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id],
    [activeChapterIndex]
  );
  const lensConfig = useMemo(
    () => SCENE_LENS_CAMERA_SETTINGS[sceneLens],
    [sceneLens]
  );
  const shouldPrimeScene = useCallback(
    (sceneIndex: number) => primeSceneSet.has(sceneIndex),
    [primeSceneSet]
  );
  const shouldRenderScene = useCallback(
    (sceneIndex: number) => renderSceneSet.has(sceneIndex),
    [renderSceneSet]
  );

  useFrame(({ clock }) => {
    const progress = progressRef.current ?? 0;
    const keyframe = camAtT(progress);
    burstLevelRef.current = THREE.MathUtils.lerp(
      burstLevelRef.current,
      interactionBurstActive ? 1 : 0,
      interactionBurstActive ? 0.16 : 0.1
    );
    const burst = burstLevelRef.current;
    const driftStrength =
      (0.06 + activeAtmosphere.haloOpacity * 0.32 + burst * 0.08) *
      lensConfig.driftMultiplier;
    const driftTime =
      clock.elapsedTime * (0.22 + activeAtmosphere.starDriftSpeed * 0.16);
    const driftX =
      Math.sin(driftTime + activeChapterIndex * 0.9) * driftStrength;
    const driftY =
      Math.cos(driftTime * 1.1 + activeChapterIndex * 0.45) *
      driftStrength *
      0.52;
    const driftZ =
      Math.sin(driftTime * 0.7 + activeChapterIndex) * driftStrength * 0.2;
    const orbitPhase =
      clock.elapsedTime * lensConfig.orbitSpeed + activeChapterIndex * 0.72;
    const orbitRadius =
      lensConfig.orbitRadius * (0.8 + activeAtmosphere.haloOpacity * 1.4);
    const orbitX = Math.cos(orbitPhase) * orbitRadius;
    const orbitY = Math.sin(orbitPhase * 0.82) * orbitRadius * 0.34;
    const orbitZ = Math.sin(orbitPhase * 0.58) * orbitRadius * 0.18;

    nextPos.current.set(
      keyframe.pos[0] + driftX + orbitX,
      keyframe.pos[1] + driftY + orbitY,
      keyframe.pos[2] + driftZ + orbitZ - burst * lensConfig.pushIn
    );
    nextLook.current.set(
      keyframe.look[0] + driftX * lensConfig.lookBias + orbitX * 0.22,
      keyframe.look[1] + driftY * (lensConfig.lookBias + 0.06) + orbitY * 0.28,
      keyframe.look[2] + burst * (0.08 + lensConfig.pushIn * 0.32)
    );
    camPos.current.lerp(nextPos.current, lensConfig.lerp);
    camLook.current.lerp(nextLook.current, lensConfig.lerp);
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return (
    <>
      <Background activeChapterIndex={activeChapterIndex} profile={profile} />
      <SceneSignatureLayer
        key={`signature-${CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id}`}
        activeChapterIndex={activeChapterIndex}
        profile={profile}
        sceneLens={sceneLens}
      />
      <InteractionBurstLayer
        key={`burst-${interactionBurstCycle}-${CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id}`}
        activeChapterIndex={activeChapterIndex}
        profile={profile}
        sceneLens={sceneLens}
        interactionBurstActive={interactionBurstActive}
      />
      {shouldPrimeScene(0) && (
        <ParticleGalaxy
          isLive={shouldRenderScene(0)}
          progressRef={progressRef}
          profile={profile}
        />
      )}
      {shouldPrimeScene(1) && (
        <NeuralCortex
          isLive={shouldRenderScene(1)}
          progressRef={progressRef}
          profile={profile}
        />
      )}
      {shouldPrimeScene(2) && (
        <CrystalFortress
          isLive={shouldRenderScene(2)}
          progressRef={progressRef}
        />
      )}
      {shouldPrimeScene(3) && (
        <CloudConstellation
          isLive={shouldRenderScene(3)}
          progressRef={progressRef}
          profile={profile}
        />
      )}
      {shouldPrimeScene(4) && (
        <SignalMatrix
          isLive={shouldRenderScene(4)}
          progressRef={progressRef}
          profile={profile}
        />
      )}
      {shouldPrimeScene(5) && (
        <SingularityCore
          isLive={shouldRenderScene(5)}
          progressRef={progressRef}
          profile={profile}
        />
      )}
    </>
  );
}

function PerformanceBudgetGuard({
  enabled,
  stabilityAssistActive,
  onBudgetExceeded,
}: {
  enabled: boolean;
  stabilityAssistActive: boolean;
  onBudgetExceeded?: () => void;
}) {
  const lowFpsScoreRef = useRef(0);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!enabled || stabilityAssistActive) {
      lowFpsScoreRef.current = 0;
    }
  }, [enabled, stabilityAssistActive]);

  useEffect(() => {
    if (!stabilityAssistActive) {
      notifiedRef.current = false;
    }
  }, [stabilityAssistActive]);

  useEffect(() => {
    if (
      !enabled ||
      stabilityAssistActive ||
      notifiedRef.current ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const debugWindow = window as OliveDebugWindow;
    if (!debugWindow.__OLIVE_FORCE_STABILITY_ASSIST__) {
      return;
    }

    debugWindow.__OLIVE_FORCE_STABILITY_ASSIST__ = false;
    notifiedRef.current = true;
    onBudgetExceeded?.();
  }, [enabled, onBudgetExceeded, stabilityAssistActive]);

  useFrame(({ clock }, delta) => {
    if (
      !enabled ||
      stabilityAssistActive ||
      notifiedRef.current ||
      clock.elapsedTime < 1.5
    ) {
      return;
    }

    lowFpsScoreRef.current =
      delta > 1 / 26
        ? lowFpsScoreRef.current + 1
        : Math.max(0, lowFpsScoreRef.current - 0.5);

    if (lowFpsScoreRef.current < 18) {
      return;
    }

    notifiedRef.current = true;
    lowFpsScoreRef.current = 0;
    onBudgetExceeded?.();
  });

  return null;
}

export interface OliveUniverseCanvasProps {
  activeChapterIndex: number;
  progressRef: MutableRefObject<number>;
  quality: QualityTier;
  sceneProfile: SceneProfile;
  shouldAnimate: boolean;
  stabilityAssistActive: boolean;
  sceneLens: SceneLensMode;
  interactionBurstActive: boolean;
  interactionBurstCycle: number;
  onPerformanceBudgetExceeded?: () => void;
  onWarmCountChange?: (count: number) => void;
  onReady?: () => void;
}

export default function OliveUniverseCanvas({
  activeChapterIndex,
  progressRef,
  quality,
  sceneProfile,
  shouldAnimate,
  stabilityAssistActive,
  sceneLens,
  interactionBurstActive,
  interactionBurstCycle,
  onPerformanceBudgetExceeded,
  onWarmCountChange,
  onReady,
}: OliveUniverseCanvasProps) {
  const previousActiveChapterIndexRef = useRef(activeChapterIndex);
  const [warmedSceneIndices, setWarmedSceneIndices] = useState<number[]>(() =>
    getSceneNeighborhood(activeChapterIndex, CHAPTERS.length)
  );
  const [transitionRenderSceneIndices, setTransitionRenderSceneIndices] =
    useState<number[]>(() =>
      getSceneNeighborhood(activeChapterIndex, CHAPTERS.length)
    );
  const immediateSceneWindow = getImmediateSceneWindow(
    activeChapterIndex,
    previousActiveChapterIndexRef.current,
    CHAPTERS.length
  );
  const primeSceneIndices = mergeSceneIndices(
    warmedSceneIndices,
    immediateSceneWindow,
    CHAPTERS.length
  );
  const renderSceneIndices = mergeSceneIndices(
    transitionRenderSceneIndices,
    immediateSceneWindow,
    CHAPTERS.length
  );
  const pendingWarmSceneIndices = getSceneWarmPriority(
    activeChapterIndex,
    CHAPTERS.length
  ).filter(sceneIndex => !primeSceneIndices.includes(sceneIndex));
  const pendingWarmSceneKey = pendingWarmSceneIndices.join(',');
  const aberrationOffset = useMemo(
    () =>
      new THREE.Vector2(
        sceneProfile.aberrationOffset,
        sceneProfile.aberrationOffset
      ),
    [sceneProfile.aberrationOffset]
  );
  const canvasDprCap = useMemo(
    () => getCanvasDprCap(quality, sceneProfile),
    [quality, sceneProfile]
  );
  const antialiasEnabled = quality !== 'low' && sceneProfile.enablePostFx;
  const warmStepMs = useMemo(
    () => getWarmStepMs(sceneProfile.enablePostFx, shouldAnimate),
    [sceneProfile.enablePostFx, shouldAnimate]
  );
  const warmBatchSize = useMemo(
    () => getWarmBatchSize(sceneProfile.enablePostFx, shouldAnimate),
    [sceneProfile.enablePostFx, shouldAnimate]
  );

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      previousActiveChapterIndexRef.current = activeChapterIndex;
      return;
    }

    const previousActiveChapterIndex = previousActiveChapterIndexRef.current;
    const jumpDistance = Math.abs(
      activeChapterIndex - previousActiveChapterIndex
    );
    const nextSceneWindow = getImmediateSceneWindow(
      activeChapterIndex,
      previousActiveChapterIndex,
      CHAPTERS.length
    );
    const jumpCorridor =
      jumpDistance > 1
        ? getSceneJumpCorridor(
            previousActiveChapterIndex,
            activeChapterIndex,
            CHAPTERS.length
          )
        : [];

    setWarmedSceneIndices(current =>
      mergeSceneIndices(
        current,
        [...nextSceneWindow, ...jumpCorridor],
        CHAPTERS.length
      )
    );
    setTransitionRenderSceneIndices(nextSceneWindow);
    previousActiveChapterIndexRef.current = activeChapterIndex;

    if (jumpDistance === 0) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        setTransitionRenderSceneIndices(
          getSceneNeighborhood(activeChapterIndex, CHAPTERS.length)
        );
      },
      getTransitionCarryMs(
        sceneProfile.enablePostFx,
        jumpDistance,
        shouldAnimate
      )
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeChapterIndex, sceneProfile.enablePostFx, shouldAnimate]);

  useEffect(() => {
    onWarmCountChange?.(primeSceneIndices.length);
  }, [onWarmCountChange, primeSceneIndices.length]);

  useEffect(() => {
    if (typeof window === 'undefined' || pendingWarmSceneKey.length === 0) {
      return;
    }

    const nextBatch = pendingWarmSceneKey
      .split(',')
      .filter(Boolean)
      .slice(0, warmBatchSize)
      .map(sceneIndex => Number(sceneIndex));

    const timeoutId = window.setTimeout(() => {
      setWarmedSceneIndices(current =>
        mergeSceneIndices(current, nextBatch, CHAPTERS.length)
      );
    }, warmStepMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pendingWarmSceneKey, warmBatchSize, warmStepMs]);

  return (
    <div className="universe-canvas" aria-hidden="true">
      <Canvas
        frameloop={shouldAnimate ? 'always' : 'demand'}
        camera={{ position: [0, 0, 9], fov: 60, near: 0.1, far: 200 }}
        dpr={
          typeof window === 'undefined'
            ? 1
            : Math.min(window.devicePixelRatio || 1, canvasDprCap)
        }
        gl={{
          antialias: antialiasEnabled,
          alpha: false,
          powerPreference: sceneProfile.enablePostFx
            ? 'high-performance'
            : 'default',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        style={{ position: 'absolute', inset: 0, background: '#000' }}
      >
        <PerformanceBudgetGuard
          enabled={shouldAnimate}
          stabilityAssistActive={stabilityAssistActive}
          onBudgetExceeded={onPerformanceBudgetExceeded}
        />
        <Scene
          activeChapterIndex={activeChapterIndex}
          progressRef={progressRef}
          profile={sceneProfile}
          sceneLens={sceneLens}
          primeSceneIndices={primeSceneIndices}
          renderSceneIndices={renderSceneIndices}
          interactionBurstActive={interactionBurstActive}
          interactionBurstCycle={interactionBurstCycle}
        />
        {sceneProfile.enablePostFx && (
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.18}
              luminanceSmoothing={0.65}
              intensity={sceneProfile.bloomIntensity}
              mipmapBlur
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={aberrationOffset}
              radialModulation={false}
              modulationOffset={0}
            />
            <Vignette offset={0.32} darkness={0.62} />
            <Noise
              premultiply
              blendFunction={BlendFunction.ADD}
              opacity={sceneProfile.noiseOpacity}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
