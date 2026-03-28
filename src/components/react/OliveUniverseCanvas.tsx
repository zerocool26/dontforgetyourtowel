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
import { Stars } from '@react-three/drei';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  DepthOfField,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import {
  SCENE_PALETTE,
  type QualityTier,
  type SceneProfile,
} from './olive-universe-config';

/* ── Types ───────────────────────────────────────────────────── */

type OliveDebugWindow = Window & {
  __OLIVE_FORCE_STABILITY_ASSIST__?: boolean;
};

type PointerField = {
  target: THREE.Vector2;
  current: THREE.Vector2;
  down: boolean;
  burst: number;
  engagement: number;
  velocity: THREE.Vector2;
  prev: THREE.Vector2;
};

export interface OliveUniverseCanvasProps {
  quality: QualityTier;
  sceneProfile: SceneProfile;
  shouldAnimate: boolean;
  mobileOptimized: boolean;
  stabilityAssistActive: boolean;
  interactionPulse: number;
  onInteractionStateChange?: (state: 'idle' | 'engaged' | 'burst') => void;
  onPerformanceBudgetExceeded?: () => void;
  onReady?: () => void;
}

/* ── Utility: Lorenz attractor points ────────────────────────── */

function computeAttractorTrail(len: number): Float32Array {
  const positions = new Float32Array(len * 3);
  let x = 0.1;
  let y = 0;
  let z = 0;
  const dt = 0.005;
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const scale = 0.12;

  for (let i = 0; i < len; i++) {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    positions[i * 3] = x * scale;
    positions[i * 3 + 1] = y * scale - 1;
    positions[i * 3 + 2] = (z - 25) * scale;
  }
  return positions;
}

/* ── Utility: Fibonacci sphere distribution ─────────────────── */

function fibSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y) * radius;
    const theta = golden * i;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r;
  }
  return positions;
}

/* ── Internal components ─────────────────────────────────────── */

function FirstFrameReporter({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

function AdaptiveDpr({ baseDpr }: { baseDpr: number }) {
  const perf = useThree(s => s.performance.current);
  const setDpr = useThree(s => s.setDpr);
  useEffect(() => {
    setDpr(Math.max(1, Math.min(baseDpr, baseDpr * (0.75 + perf * 0.25))));
  }, [baseDpr, perf, setDpr]);
  return null;
}

function PerformanceBudgetGuard({
  enabled,
  onExceeded,
}: {
  enabled: boolean;
  onExceeded?: () => void;
}) {
  const drops = useRef(0);
  const fired = useRef(false);

  useFrame((_, delta) => {
    if (!enabled || fired.current) return;

    if (typeof window !== 'undefined') {
      const w = window as OliveDebugWindow;
      if (w.__OLIVE_FORCE_STABILITY_ASSIST__) {
        fired.current = true;
        onExceeded?.();
        return;
      }
    }

    const fps = delta > 0 ? 1 / delta : 60;
    drops.current =
      fps < 24 ? drops.current + 1 : Math.max(0, drops.current - 1);
    if (drops.current > 45) {
      fired.current = true;
      onExceeded?.();
    }
  });

  return null;
}

/* ── Camera rig with inertia + parallax ──────────────────────── */

function CameraRig({
  pf,
  shouldAnimate,
  mobile,
  parallax,
  fieldStrength,
}: {
  pf: MutableRefObject<PointerField>;
  shouldAnimate: boolean;
  mobile: boolean;
  parallax: number;
  fieldStrength: number;
}) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(0, 0, 8.5), []);

  useFrame((state, delta) => {
    const p = pf.current;
    p.velocity.set(
      (p.target.x - p.prev.x) * 0.5,
      (p.target.y - p.prev.y) * 0.5
    );
    p.prev.copy(p.target);
    p.current.lerp(p.target, shouldAnimate ? 0.07 : 0.14);
    p.burst = THREE.MathUtils.damp(p.burst, 0, 2.6, delta);
    p.engagement = THREE.MathUtils.damp(
      p.engagement,
      p.down ? 1 : 0.12,
      3.4,
      delta
    );

    const t = state.clock.elapsedTime;
    const orbit = mobile ? 0.28 : 0.48;
    const speed = shouldAnimate ? 0.1 : 0.03;
    const dx = p.current.x * fieldStrength;
    const dy = p.current.y * fieldStrength * 0.65;
    const push = p.burst * 0.55 + p.engagement * 0.2;

    desired.set(
      Math.cos(t * speed) * orbit + dx * parallax,
      0.2 + Math.sin(t * speed * 0.72) * 0.22 + dy * parallax,
      8.5 - push
    );

    camera.position.lerp(desired, shouldAnimate ? 0.05 : 0.1);
    target.set(dx * 0.45, dy * 0.35, 0);
    camera.lookAt(target);
  });

  return null;
}

/* ── Crystalline core: refractive icosahedron shell + glowing inner sphere ── */

function CrystallineCore({
  pf,
  shouldAnimate,
  coreDetail,
  innerDetail,
  coreSpeed,
}: {
  pf: MutableRefObject<PointerField>;
  shouldAnimate: boolean;
  coreDetail: number;
  innerDetail: number;
  coreSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const shellMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const innerMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const p = pf.current;
    const pulse = 1 + p.burst * 0.12 + p.engagement * 0.05;
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(t * 0.14) * 0.15;
      groupRef.current.rotation.y +=
        delta * (shouldAnimate ? coreSpeed : coreSpeed * 0.3);
      groupRef.current.rotation.z = Math.cos(t * 0.11) * 0.1;
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, pulse, 3.8, delta)
      );
    }

    if (shellRef.current) {
      shellRef.current.rotation.y -= delta * 0.12;
      shellRef.current.rotation.z += delta * 0.06;
    }

    if (innerRef.current) {
      innerRef.current.rotation.y += delta * 0.08;
      const breathe = 0.72 + Math.sin(t * 0.6) * 0.06 + p.burst * 0.08;
      innerRef.current.scale.setScalar(
        THREE.MathUtils.damp(innerRef.current.scale.x, breathe, 4, delta)
      );
    }

    if (shellMatRef.current) {
      shellMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        shellMatRef.current.emissiveIntensity,
        0.8 + p.burst * 2,
        4,
        delta
      );
      shellMatRef.current.opacity = THREE.MathUtils.damp(
        shellMatRef.current.opacity,
        0.18 + p.burst * 0.12,
        3,
        delta
      );
    }

    if (innerMatRef.current) {
      innerMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        innerMatRef.current.emissiveIntensity,
        1.8 + p.burst * 2.4 + Math.sin(t * 1.2) * 0.3,
        4,
        delta
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer shell — refractive wireframe icosahedron */}
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[2.2, coreDetail]} />
        <meshPhysicalMaterial
          ref={shellMatRef}
          color={SCENE_PALETTE.secondary}
          emissive={SCENE_PALETTE.accent}
          emissiveIntensity={1}
          roughness={0.02}
          metalness={0.35}
          transparent
          opacity={0.2}
          transmission={0.55}
          thickness={1.2}
          ior={1.45}
          wireframe
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh ref={innerRef} scale={0.72}>
        <icosahedronGeometry args={[1, innerDetail]} />
        <meshStandardMaterial
          ref={innerMatRef}
          color={SCENE_PALETTE.core}
          emissive={SCENE_PALETTE.accent}
          emissiveIntensity={2}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>

      {/* Glass mantle between shell and inner */}
      <mesh scale={1.4}>
        <icosahedronGeometry args={[1, Math.max(1, coreDetail - 1)]} />
        <meshPhysicalMaterial
          color={SCENE_PALETTE.tertiary}
          emissive={SCENE_PALETTE.tertiary}
          emissiveIntensity={0.3}
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.06}
          transmission={0.7}
          thickness={0.6}
        />
      </mesh>
    </group>
  );
}

/* ── Orbital rings with varying tilt ─────────────────────────── */

function OrbitalRings({
  pf,
  ringSegments,
}: {
  pf: MutableRefObject<PointerField>;
  ringSegments: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([
    null,
    null,
    null,
    null,
  ]);

  const rings = useMemo(
    () => [
      {
        radius: 3.0,
        tube: 0.025,
        tilt: [Math.PI / 2, 0, 0] as const,
        color: SCENE_PALETTE.secondary,
        baseOpacity: 0.22,
      },
      {
        radius: 3.8,
        tube: 0.018,
        tilt: [1.2, 0.5, 0] as const,
        color: SCENE_PALETTE.accent,
        baseOpacity: 0.16,
      },
      {
        radius: 4.5,
        tube: 0.014,
        tilt: [0.8, -0.3, 0.6] as const,
        color: SCENE_PALETTE.tertiary,
        baseOpacity: 0.12,
      },
      {
        radius: 5.4,
        tube: 0.01,
        tilt: [1.5, 1, 0.2] as const,
        color: SCENE_PALETTE.secondary,
        baseOpacity: 0.08,
      },
    ],
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.03 + burst * 0.02);

    matRefs.current.forEach((mat, i) => {
      if (!mat) return;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        rings[i].baseOpacity + burst * 0.18,
        3,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh
          key={`ring-${i}`}
          rotation={[ring.tilt[0], ring.tilt[1], ring.tilt[2]]}
        >
          <torusGeometry args={[ring.radius, ring.tube, 16, ringSegments]} />
          <meshBasicMaterial
            ref={el => {
              matRefs.current[i] = el;
            }}
            color={ring.color}
            transparent
            opacity={ring.baseOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Lorenz attractor trail ─────────────────────────────────── */

function AttractorTrail({
  pf,
  len,
  speed,
}: {
  pf: MutableRefObject<PointerField>;
  len: number;
  speed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lineObjRef = useRef<THREE.Line | null>(null);

  const { geometry, material } = useMemo(() => {
    const positions = computeAttractorTrail(len);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: SCENE_PALETTE.accent,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { geometry: geo, material: mat };
  }, [len]);

  useEffect(() => {
    if (!groupRef.current) return;
    const lineObj = new THREE.Line(geometry, material);
    lineObjRef.current = lineObj;
    groupRef.current.add(lineObj);
    return () => {
      groupRef.current?.remove(lineObj);
      geometry.dispose();
      material.dispose();
      lineObjRef.current = null;
    };
  }, [geometry, material]);

  useFrame((state, delta) => {
    const obj = lineObjRef.current;
    if (!obj) return;
    const t = state.clock.elapsedTime;
    obj.rotation.y += delta * speed * (1 + pf.current.burst * 0.4);
    obj.rotation.x = Math.sin(t * 0.08) * 0.2;
    obj.rotation.z = Math.cos(t * 0.06) * 0.15;
    (obj.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.damp(
      (obj.material as THREE.LineBasicMaterial).opacity,
      0.35 + pf.current.burst * 0.25,
      3,
      delta
    );
  });

  return <group ref={groupRef} />;
}

/* ── Nebula particle cloud with Fibonacci distribution ───────── */

function NebulaCloud({
  pf,
  count,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => {
    const positions = fibSphere(count, 6);
    // Add random scatter
    for (let i = 0; i < positions.length; i++) {
      positions[i] += (Math.random() - 0.5) * 2.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Per-particle random sizes via custom attribute
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sizes[i] = 0.8 + Math.random() * 2.2;
    }
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    pointsRef.current.rotation.y += delta * (0.012 + burst * 0.008);
    pointsRef.current.rotation.x = Math.sin(t * 0.04) * 0.06;

    if (matRef.current) {
      matRef.current.opacity = THREE.MathUtils.damp(
        matRef.current.opacity,
        0.2 + burst * 0.15,
        3,
        delta
      );
      matRef.current.size = THREE.MathUtils.damp(
        matRef.current.size,
        1.6 + burst * 0.4,
        3,
        delta
      );
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        color={SCENE_PALETTE.secondary}
        transparent
        opacity={0.2}
        size={1.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Cosmic dust — tiny dim particles filling the space ──────── */

function CosmicDust({
  pf,
  count,
  drift,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
  drift: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // uniform volume distribution
      const r = Math.cbrt(Math.random()) * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * drift;
    pointsRef.current.rotation.x += delta * drift * 0.3;
    pointsRef.current.position.z = pf.current.burst * -0.2;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={SCENE_PALETTE.highlight}
        transparent
        opacity={0.12}
        size={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Aurora bands — sinusoidal ribbon tubes ──────────────────── */

function AuroraBands({
  pf,
  segments,
  amplitude,
}: {
  pf: MutableRefObject<PointerField>;
  segments: number;
  amplitude: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const bands = useMemo(() => {
    const result: {
      geometry: THREE.TubeGeometry;
      color: string;
      yOffset: number;
    }[] = [];
    const bandCount = 3;

    for (let b = 0; b < bandCount; b++) {
      const pts: THREE.Vector3[] = [];
      const yBase = -2.5 + b * 1.2;
      const spread = 8 + b * 2;

      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = (t / (Math.PI * 2) - 0.5) * spread;
        const y =
          yBase + Math.sin(t * 2.5 + b * 1.4) * amplitude * (0.6 + b * 0.2);
        const z = Math.cos(t * 1.8 + b * 0.9) * 2.5 - 3;
        pts.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(pts, false);
      const tubeGeo = new THREE.TubeGeometry(
        curve,
        Math.max(20, segments),
        0.04 - b * 0.008,
        8,
        false
      );

      const colors = [
        SCENE_PALETTE.accent,
        SCENE_PALETTE.secondary,
        SCENE_PALETTE.tertiary,
      ];
      result.push({ geometry: tubeGeo, color: colors[b], yOffset: yBase });
    }
    return result;
  }, [segments, amplitude]);

  useEffect(() => () => bands.forEach(b => b.geometry.dispose()), [bands]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.15) * 0.3;
    groupRef.current.rotation.y += delta * (0.015 + pf.current.burst * 0.01);
  });

  return (
    <group ref={groupRef}>
      {bands.map((band, i) => (
        <mesh key={`aurora-${i}`} geometry={band.geometry}>
          <meshBasicMaterial
            color={band.color}
            transparent
            opacity={0.14 - i * 0.02}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Floating orbital shards ─────────────────────────────────── */

function OrbitalShards({
  pf,
  count,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const shards = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const r = 4 + (i % 5) * 0.6;
        const ySpread = ((i % 7) - 3) * 0.55;
        return {
          position: [
            Math.cos(angle) * r,
            ySpread,
            Math.sin(angle) * r,
          ] as const,
          rotation: [angle * 0.7, i * 0.4, i * 0.25] as const,
          scale: 0.15 + (i % 4) * 0.08,
          geoType: i % 3, // 0 = tetra, 1 = octa, 2 = box
        };
      }),
    [count]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y -= delta * (0.025 + pf.current.burst * 0.03);
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.08) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {shards.map((s, i) => (
        <mesh
          key={`shard-${i}`}
          position={s.position}
          rotation={[s.rotation[0], s.rotation[1], s.rotation[2]]}
          scale={s.scale}
        >
          {s.geoType === 0 && <tetrahedronGeometry args={[1, 0]} />}
          {s.geoType === 1 && <octahedronGeometry args={[0.8, 0]} />}
          {s.geoType === 2 && <boxGeometry args={[0.5, 1.4, 0.5]} />}
          <meshPhysicalMaterial
            color={
              i % 2 === 0 ? SCENE_PALETTE.secondary : SCENE_PALETTE.tertiary
            }
            emissive={SCENE_PALETTE.accent}
            emissiveIntensity={0.3 + (i % 3) * 0.1}
            roughness={0.08}
            metalness={0.45}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Energy floor – concentric ground rings ──────────────────── */

function EnergyFloor({ pf }: { pf: MutableRefObject<PointerField> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.06) * 0.04;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.damp(
        groupRef.current.scale.x,
        1 + pf.current.burst * 0.06,
        3,
        delta
      )
    );
  });

  return (
    <group
      ref={groupRef}
      position={[0, -3.8, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {[
        {
          inner: 4.5,
          outer: 4.8,
          color: SCENE_PALETTE.secondary,
          opacity: 0.14,
        },
        { inner: 6.0, outer: 6.2, color: SCENE_PALETTE.accent, opacity: 0.08 },
        {
          inner: 7.8,
          outer: 7.92,
          color: SCENE_PALETTE.tertiary,
          opacity: 0.05,
        },
      ].map((ring, i) => (
        <mesh key={`floor-${i}`} rotation={[0, 0, i * 0.3]}>
          <ringGeometry args={[ring.inner, ring.outer, 140]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Warp streaks — radial lines that surge on interaction ────── */

function WarpStreaks({
  pf,
  count,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const yAngle = (Math.random() - 0.5) * Math.PI * 0.65;
      const innerR = 2.8 + Math.random() * 0.5;
      const outerR = innerR + 0.5 + Math.random() * 2;
      const cy = Math.cos(yAngle);
      const sy = Math.sin(yAngle);
      positions[i * 6] = Math.cos(angle) * innerR * cy;
      positions[i * 6 + 1] = sy * innerR;
      positions[i * 6 + 2] = Math.sin(angle) * innerR * cy;
      positions[i * 6 + 3] = Math.cos(angle) * outerR * cy;
      positions[i * 6 + 4] = sy * outerR;
      positions[i * 6 + 5] = Math.sin(angle) * outerR * cy;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: SCENE_PALETTE.accent,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { geometry: geo, material: mat };
  }, [count]);

  useEffect(() => {
    if (!groupRef.current) return;
    const lines = new THREE.LineSegments(geometry, material);
    linesRef.current = lines;
    groupRef.current.add(lines);
    return () => {
      groupRef.current?.remove(lines);
      geometry.dispose();
      material.dispose();
      linesRef.current = null;
    };
  }, [geometry, material]);

  useFrame((state, delta) => {
    const obj = linesRef.current;
    if (!obj) return;
    const burst = pf.current.burst;
    obj.rotation.y += delta * (0.006 + burst * 0.03);
    obj.rotation.z = Math.sin(state.clock.elapsedTime * 0.04) * 0.02;
    const s = 1 + burst * 1.8;
    obj.scale.setScalar(THREE.MathUtils.damp(obj.scale.x, s, 3.5, delta));
    (obj.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.damp(
      (obj.material as THREE.LineBasicMaterial).opacity,
      0.06 + burst * 0.45,
      4,
      delta
    );
  });

  return <group ref={groupRef} />;
}

/* ── Plasma veins — energy conduits radiating from core ──────── */

function PlasmaVeins({
  pf,
  count,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const veins = useMemo(() => {
    const result: { geometry: THREE.TubeGeometry; color: string }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const endR = 3.8 + (i % 3) * 0.7;
      const yEnd = ((i % 5) - 2) * 0.55;
      const start = new THREE.Vector3(0, 0, 0);
      const mid = new THREE.Vector3(
        Math.cos(angle + 0.35) * endR * 0.45,
        yEnd * 0.4 + Math.sin(angle * 2.5) * 0.7,
        Math.sin(angle + 0.35) * endR * 0.45
      );
      const end = new THREE.Vector3(
        Math.cos(angle) * endR,
        yEnd,
        Math.sin(angle) * endR
      );
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geo = new THREE.TubeGeometry(
        curve,
        20,
        0.012 + (i % 3) * 0.004,
        5,
        false
      );
      const colors = [
        SCENE_PALETTE.accent,
        SCENE_PALETTE.secondary,
        SCENE_PALETTE.tertiary,
      ];
      result.push({ geometry: geo, color: colors[i % 3] });
    }
    return result;
  }, [count]);

  useEffect(() => () => veins.forEach(v => v.geometry.dispose()), [veins]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.018 + burst * 0.012);
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.09) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {veins.map((vein, i) => (
        <mesh key={`vein-${i}`} geometry={vein.geometry}>
          <meshBasicMaterial
            color={vein.color}
            transparent
            opacity={0.1 + (i % 3) * 0.025}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Prismatic halo — spectral outer ring decomposition ──────── */

function PrismaticHalo({
  pf,
  ringCount,
}: {
  pf: MutableRefObject<PointerField>;
  ringCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spectrumColors = useMemo(
    () => [
      '#ff3355',
      '#ff8833',
      '#ffdd33',
      '#33ff88',
      '#33ddff',
      '#5533ff',
      '#cc33ff',
    ],
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.rotation.z += delta * (0.018 + burst * 0.035);
    groupRef.current.rotation.x = Math.sin(t * 0.065) * 0.14 + Math.PI / 2.3;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.damp(groupRef.current.scale.x, 1 + burst * 0.12, 3, delta)
    );
  });

  return (
    <group ref={groupRef} position={[0, 0.15, 0]}>
      {Array.from({ length: ringCount }, (_, i) => {
        const baseR = 6.5 + i * 0.22;
        const colorIdx = i % spectrumColors.length;
        return (
          <mesh key={`halo-${i}`}>
            <torusGeometry args={[baseR, 0.01 + i * 0.003, 6, 180]} />
            <meshBasicMaterial
              color={spectrumColors[colorIdx]}
              transparent
              opacity={Math.max(0.01, 0.065 - i * 0.008)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Core shell overlays — geometric wireframe cages ─────────── */

function CoreShellOverlays({
  pf,
  shellCount,
  coreSpeed,
}: {
  pf: MutableRefObject<PointerField>;
  shellCount: number;
  coreSpeed: number;
}) {
  const dodecRef = useRef<THREE.Mesh>(null);
  const octaRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + pf.current.burst * 0.1;

    if (dodecRef.current) {
      dodecRef.current.rotation.y -= delta * coreSpeed * 0.7;
      dodecRef.current.rotation.x = Math.cos(t * 0.11) * 0.18;
      dodecRef.current.rotation.z += delta * 0.035;
      dodecRef.current.scale.setScalar(
        THREE.MathUtils.damp(dodecRef.current.scale.x, 1.8 * pulse, 3.2, delta)
      );
    }

    if (octaRef.current) {
      octaRef.current.rotation.y += delta * coreSpeed * 0.45;
      octaRef.current.rotation.z = Math.sin(t * 0.08) * 0.22;
      octaRef.current.scale.setScalar(
        THREE.MathUtils.damp(octaRef.current.scale.x, 2.6 * pulse, 3.2, delta)
      );
    }
  });

  return (
    <>
      {shellCount >= 3 && (
        <mesh ref={dodecRef} scale={1.8} rotation={[0.25, 0, 0.35]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={SCENE_PALETTE.accent}
            transparent
            opacity={0.05}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      {shellCount >= 4 && (
        <mesh ref={octaRef} scale={2.6} rotation={[0.55, 0.3, 0]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={SCENE_PALETTE.secondary}
            transparent
            opacity={0.035}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}

/* ── Scene lighting ──────────────────────────────────────────── */

function SceneLighting({
  pf,
  keyIntensity,
  rimIntensity,
  ambientIntensity,
}: {
  pf: MutableRefObject<PointerField>;
  keyIntensity: number;
  rimIntensity: number;
  ambientIntensity: number;
}) {
  const keyRef = useRef<THREE.PointLight>(null);
  const rimRef = useRef<THREE.PointLight>(null);
  const accentRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const burst = pf.current.burst;
    if (keyRef.current) {
      keyRef.current.intensity = THREE.MathUtils.damp(
        keyRef.current.intensity,
        keyIntensity + burst * 8,
        3,
        delta
      );
    }
    if (rimRef.current) {
      rimRef.current.intensity = THREE.MathUtils.damp(
        rimRef.current.intensity,
        rimIntensity + burst * 4,
        3,
        delta
      );
    }
    if (accentRef.current) {
      accentRef.current.intensity = THREE.MathUtils.damp(
        accentRef.current.intensity,
        6 + burst * 5,
        3,
        delta
      );
    }
  });

  return (
    <>
      <ambientLight
        intensity={ambientIntensity}
        color={SCENE_PALETTE.highlight}
      />
      <hemisphereLight
        intensity={0.6}
        groundColor={SCENE_PALETTE.deep}
        color={SCENE_PALETTE.secondary}
      />
      <pointLight
        ref={keyRef}
        position={[0, 0.5, 5.5]}
        color={SCENE_PALETTE.accent}
        intensity={keyIntensity}
        distance={30}
        decay={1.8}
      />
      <pointLight
        ref={rimRef}
        position={[-6, 5, -3]}
        color={SCENE_PALETTE.tertiary}
        intensity={rimIntensity}
        distance={35}
        decay={2}
      />
      <pointLight
        ref={accentRef}
        position={[5, -2, 4]}
        color={SCENE_PALETTE.warm}
        intensity={6}
        distance={25}
        decay={2.2}
      />
      <directionalLight
        position={[3, 7, 3]}
        intensity={1.6}
        color={SCENE_PALETTE.highlight}
      />
      <directionalLight
        position={[-4, -3, -5]}
        intensity={0.6}
        color={SCENE_PALETTE.secondary}
      />
    </>
  );
}

/* ── Full scene assembly ─────────────────────────────────────── */

function HeroScene({
  pf,
  profile,
  shouldAnimate,
  mobile,
}: {
  pf: MutableRefObject<PointerField>;
  profile: SceneProfile;
  shouldAnimate: boolean;
  mobile: boolean;
}) {
  const sceneRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!sceneRef.current) return;
    const p = pf.current;
    sceneRef.current.rotation.y += delta * (shouldAnimate ? 0.008 : 0.003);
    sceneRef.current.position.x = THREE.MathUtils.damp(
      sceneRef.current.position.x,
      p.current.x * 0.14,
      2,
      delta
    );
    sceneRef.current.position.y = THREE.MathUtils.damp(
      sceneRef.current.position.y,
      p.current.y * 0.1,
      2,
      delta
    );
    sceneRef.current.scale.setScalar(
      THREE.MathUtils.damp(
        sceneRef.current.scale.x,
        mobile ? 0.92 + p.burst * 0.025 : 1 + p.burst * 0.035,
        3,
        delta
      )
    );
    sceneRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.06) * 0.03;
  });

  return (
    <group ref={sceneRef}>
      <CrystallineCore
        pf={pf}
        shouldAnimate={shouldAnimate}
        coreDetail={profile.coreDetail}
        innerDetail={profile.innerDetail}
        coreSpeed={profile.coreSpeed}
      />
      <OrbitalRings pf={pf} ringSegments={profile.ringSegments} />
      <AttractorTrail
        pf={pf}
        len={profile.attractorTrailLen}
        speed={profile.attractorSpeed}
      />
      <NebulaCloud pf={pf} count={profile.nebulaCount} />
      <CosmicDust pf={pf} count={profile.dustCount} drift={profile.dustDrift} />
      <AuroraBands
        pf={pf}
        segments={profile.auroraSegments}
        amplitude={profile.auroraAmplitude}
      />
      <OrbitalShards pf={pf} count={profile.orbitalCount} />
      <EnergyFloor pf={pf} />
      <Stars
        radius={profile.starRadius}
        depth={50}
        count={profile.starCount}
        factor={mobile ? 2.2 : 3.4}
        saturation={0}
        fade
        speed={0.25}
      />
      {profile.warpStreakCount > 0 && (
        <WarpStreaks pf={pf} count={profile.warpStreakCount} />
      )}
      {profile.plasmaVeinCount > 0 && (
        <PlasmaVeins pf={pf} count={profile.plasmaVeinCount} />
      )}
      {profile.haloRingCount > 0 && (
        <PrismaticHalo pf={pf} ringCount={profile.haloRingCount} />
      )}
      <CoreShellOverlays
        pf={pf}
        shellCount={profile.coreShellCount}
        coreSpeed={profile.coreSpeed}
      />
      {profile.attractorTrailLen > 60 && (
        <group rotation={[0.4, Math.PI / 3, 0.2]}>
          <AttractorTrail
            pf={pf}
            len={Math.floor(profile.attractorTrailLen * 0.6)}
            speed={profile.attractorSpeed * 0.65}
          />
        </group>
      )}
    </group>
  );
}

/* ── Main canvas export ──────────────────────────────────────── */

export default function OliveUniverseCanvas({
  quality,
  sceneProfile,
  shouldAnimate,
  mobileOptimized,
  stabilityAssistActive,
  interactionPulse,
  onInteractionStateChange,
  onPerformanceBudgetExceeded,
  onReady,
}: OliveUniverseCanvasProps) {
  const pf = useRef<PointerField>({
    target: new THREE.Vector2(),
    current: new THREE.Vector2(),
    down: false,
    burst: 0,
    engagement: 0,
    velocity: new THREE.Vector2(),
    prev: new THREE.Vector2(),
  });
  const interactionTimeout = useRef<number | null>(null);
  const [interactionState, setInteractionState] = useState<
    'idle' | 'engaged' | 'burst'
  >('idle');

  useEffect(() => {
    onInteractionStateChange?.(interactionState);
  }, [interactionState, onInteractionStateChange]);

  useEffect(
    () => () => {
      if (
        interactionTimeout.current !== null &&
        typeof window !== 'undefined'
      ) {
        window.clearTimeout(interactionTimeout.current);
      }
    },
    []
  );

  useEffect(() => {
    pf.current.burst = Math.min(pf.current.burst + 1.1, 1.5);
    setInteractionState('burst');

    if (interactionTimeout.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(interactionTimeout.current);
    }
    if (typeof window !== 'undefined') {
      interactionTimeout.current = window.setTimeout(() => {
        setInteractionState(pf.current.down ? 'engaged' : 'idle');
        interactionTimeout.current = null;
      }, 560);
    }
  }, [interactionPulse]);

  const updatePointer = useCallback((cx: number, cy: number) => {
    if (typeof window === 'undefined') return;
    pf.current.target.set(
      (cx / window.innerWidth) * 2 - 1,
      -((cy / window.innerHeight) * 2 - 1)
    );
  }, []);

  const releasePointer = useCallback(() => {
    pf.current.down = false;
    pf.current.target.set(0, 0);
    if (typeof window !== 'undefined') {
      if (interactionTimeout.current !== null)
        window.clearTimeout(interactionTimeout.current);
      interactionTimeout.current = window.setTimeout(() => {
        setInteractionState('idle');
        interactionTimeout.current = null;
      }, 420);
    }
  }, []);

  const chromaOffset = useMemo(
    () =>
      new THREE.Vector2(
        sceneProfile.chromaticOffset,
        sceneProfile.chromaticOffset * 0.4
      ),
    [sceneProfile.chromaticOffset]
  );

  return (
    <Canvas
      className="universe-canvas"
      dpr={sceneProfile.dprCap}
      performance={{ min: 0.5 }}
      gl={{
        antialias: !mobileOptimized,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      camera={{
        position: [0, 0, 8.5],
        fov: mobileOptimized ? 44 : 36,
        near: 0.1,
        far: 200,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(SCENE_PALETTE.backgroundFrom, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure =
          quality === 'ultra' ? 1.12 : quality === 'high' ? 1.06 : 1;
        gl.domElement.dataset.heroCanvas = 'true';
      }}
      onPointerMove={e => {
        updatePointer(e.clientX, e.clientY);
        setInteractionState(cur => (cur === 'burst' ? cur : 'engaged'));
      }}
      onPointerDown={e => {
        updatePointer(e.clientX, e.clientY);
        pf.current.down = true;
        pf.current.burst = Math.min(pf.current.burst + 0.9, 1.5);
        setInteractionState('burst');
      }}
      onPointerUp={() => {
        pf.current.down = false;
        setInteractionState('engaged');
      }}
      onPointerLeave={releasePointer}
      onPointerCancel={releasePointer}
    >
      <color attach="background" args={[SCENE_PALETTE.backgroundFrom]} />
      <fog attach="fog" args={[SCENE_PALETTE.backgroundTo, 12, 45]} />

      <AdaptiveDpr baseDpr={sceneProfile.dprCap} />
      <FirstFrameReporter onReady={onReady} />
      <PerformanceBudgetGuard
        enabled={
          sceneProfile.enablePostFx &&
          !mobileOptimized &&
          !stabilityAssistActive
        }
        onExceeded={onPerformanceBudgetExceeded}
      />
      <CameraRig
        pf={pf}
        shouldAnimate={shouldAnimate}
        mobile={mobileOptimized}
        parallax={sceneProfile.parallaxDepth}
        fieldStrength={sceneProfile.fieldStrength}
      />
      <SceneLighting
        pf={pf}
        keyIntensity={sceneProfile.keyIntensity}
        rimIntensity={sceneProfile.rimIntensity}
        ambientIntensity={sceneProfile.ambientIntensity}
      />
      <HeroScene
        pf={pf}
        profile={sceneProfile}
        shouldAnimate={shouldAnimate}
        mobile={mobileOptimized}
      />

      {sceneProfile.enablePostFx && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={sceneProfile.bloomIntensity}
            luminanceThreshold={sceneProfile.bloomThreshold}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
          <ChromaticAberration
            offset={chromaOffset}
            radialModulation
            modulationOffset={0.35}
          />
          <Noise
            opacity={sceneProfile.noiseOpacity}
            premultiply
            blendFunction={BlendFunction.SCREEN}
          />
          <DepthOfField
            focusDistance={
              sceneProfile.enableDepthOfField
                ? sceneProfile.dofFocusDistance
                : 0
            }
            focalLength={sceneProfile.enableDepthOfField ? 0.025 : 0}
            bokehScale={
              sceneProfile.enableDepthOfField ? sceneProfile.dofBokehScale : 0
            }
            height={480}
          />
          <Vignette
            eskil={false}
            offset={0.22}
            darkness={sceneProfile.vignetteStrength}
          />
        </EffectComposer>
      )}
    </Canvas>
  );
}
