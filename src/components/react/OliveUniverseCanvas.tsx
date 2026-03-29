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
import { Environment, Lightformer, Stars } from '@react-three/drei';
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

const CURATED_SPECTRUM = [
  SCENE_PALETTE.highlight,
  SCENE_PALETTE.secondary,
  SCENE_PALETTE.signal,
  SCENE_PALETTE.accent,
  SCENE_PALETTE.ember,
] as const;

function pickSpectrumColor(index: number) {
  return CURATED_SPECTRUM[index % CURATED_SPECTRUM.length];
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

function ArtDirectedEnvironment({ mobile }: { mobile: boolean }) {
  return (
    <Environment resolution={mobile ? 72 : 112} frames={1}>
      <color attach="background" args={[SCENE_PALETTE.backgroundFrom]} />
      <Lightformer
        form="ring"
        color={SCENE_PALETTE.highlight}
        intensity={1.5}
        position={[0, 0.6, 6]}
        scale={[2.4, 2.4, 1]}
      />
      <Lightformer
        form="rect"
        color={SCENE_PALETTE.secondary}
        intensity={1.1}
        position={[-5, 1.8, 3]}
        rotation={[0, Math.PI / 3, 0]}
        scale={[1.4, 8.5, 1]}
      />
      <Lightformer
        form="rect"
        color={SCENE_PALETTE.accent}
        intensity={0.8}
        position={[4.8, -1.6, 2]}
        rotation={[0, -Math.PI / 3.6, 0]}
        scale={[1.2, 6.5, 1]}
      />
      <Lightformer
        form="circle"
        color={SCENE_PALETTE.ember}
        intensity={0.7}
        position={[0, -4.6, -1]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[6.5, 6.5, 1]}
      />
      <Lightformer
        form="rect"
        color={SCENE_PALETTE.signal}
        intensity={0.45}
        position={[0, 6, -6]}
        rotation={[0, Math.PI, 0]}
        scale={[10, 5.5, 1]}
      />
    </Environment>
  );
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
  const mantleMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

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
      shellRef.current.rotation.x = Math.sin(t * 0.23) * 0.12;
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
        0.015 + p.burst * 0.04,
        4,
        delta
      );
      shellMatRef.current.opacity = THREE.MathUtils.damp(
        shellMatRef.current.opacity,
        0.18 + p.burst * 0.04,
        3,
        delta
      );
    }

    if (innerMatRef.current) {
      innerMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        innerMatRef.current.emissiveIntensity,
        0.04 + p.burst * 0.07 + Math.sin(t * 1.2) * 0.01,
        4,
        delta
      );
    }

    if (mantleMatRef.current) {
      mantleMatRef.current.opacity = THREE.MathUtils.damp(
        mantleMatRef.current.opacity,
        0.08 + p.burst * 0.025,
        3.5,
        delta
      );
      mantleMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        mantleMatRef.current.emissiveIntensity,
        0.01 + p.burst * 0.02,
        3.5,
        delta
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer shell — faceted glass body */}
      <mesh ref={shellRef} scale={[1.04, 0.96, 1.08]}>
        <icosahedronGeometry args={[2.2, coreDetail]} />
        <meshPhysicalMaterial
          ref={shellMatRef}
          color={SCENE_PALETTE.mist}
          emissive={SCENE_PALETTE.signal}
          emissiveIntensity={0.015}
          roughness={0.08}
          metalness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.04}
          iridescence={0.22}
          iridescenceIOR={1.5}
          reflectivity={0.86}
          transparent
          opacity={0.18}
          transmission={0.86}
          thickness={1.35}
          ior={1.42}
          attenuationDistance={3.8}
          attenuationColor={SCENE_PALETTE.secondary}
          envMapIntensity={1.45}
        />
      </mesh>

      <mesh scale={[1.09, 1.01, 0.95]} rotation={[0.1, 0.2, 0.35]}>
        <icosahedronGeometry args={[2.26, Math.max(1, coreDetail - 2)]} />
        <meshBasicMaterial
          color={SCENE_PALETTE.signal}
          transparent
          opacity={0.018}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Inner pearl core */}
      <mesh ref={innerRef} scale={0.72}>
        <icosahedronGeometry args={[1, innerDetail]} />
        <meshStandardMaterial
          ref={innerMatRef}
          color={SCENE_PALETTE.core}
          emissive={SCENE_PALETTE.accent}
          emissiveIntensity={0.04}
          roughness={0.26}
          metalness={0.22}
        />
      </mesh>

      {/* Secondary mantle for richer layered refraction */}
      <mesh scale={[1.46, 1.26, 1.34]} rotation={[0.45, 0.2, -0.1]}>
        <icosahedronGeometry args={[1, Math.max(1, coreDetail - 1)]} />
        <meshPhysicalMaterial
          ref={mantleMatRef}
          color={SCENE_PALETTE.signal}
          emissive={SCENE_PALETTE.secondary}
          emissiveIntensity={0.01}
          roughness={0.06}
          metalness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.08}
          iridescence={0.18}
          iridescenceIOR={1.35}
          transparent
          opacity={0.08}
          transmission={0.64}
          thickness={0.95}
          attenuationDistance={3.2}
          attenuationColor={SCENE_PALETTE.tertiary}
          envMapIntensity={1.2}
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
        baseOpacity: 0.04,
      },
      {
        radius: 3.8,
        tube: 0.018,
        tilt: [1.2, 0.5, 0] as const,
        color: SCENE_PALETTE.accent,
        baseOpacity: 0.028,
      },
      {
        radius: 4.5,
        tube: 0.014,
        tilt: [0.8, -0.3, 0.6] as const,
        color: SCENE_PALETTE.tertiary,
        baseOpacity: 0.018,
      },
      {
        radius: 5.4,
        tube: 0.01,
        tilt: [1.5, 1, 0.2] as const,
        color: SCENE_PALETTE.secondary,
        baseOpacity: 0.012,
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
        rings[i].baseOpacity + burst * 0.08,
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
      opacity: 0.12,
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
      0.12 + pf.current.burst * 0.1,
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
        0.08 + burst * 0.06,
        3,
        delta
      );
      matRef.current.size = THREE.MathUtils.damp(
        matRef.current.size,
        0.9 + burst * 0.2,
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
        opacity={0.08}
        size={0.9}
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
        opacity={0.05}
        size={0.3}
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
            opacity={0.05 - i * 0.01}
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
            emissiveIntensity={0.02}
            roughness={0.06}
            metalness={0.5}
            transparent
            opacity={0.3}
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
          opacity: 0.05,
        },
        { inner: 6.0, outer: 6.2, color: SCENE_PALETTE.accent, opacity: 0.03 },
        {
          inner: 7.8,
          outer: 7.92,
          color: SCENE_PALETTE.tertiary,
          opacity: 0.018,
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
      opacity: 0.02,
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
      0.02 + burst * 0.15,
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
            opacity={0.035 + (i % 3) * 0.008}
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
  const spectrumColors = useMemo(() => CURATED_SPECTRUM, []);

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
        const baseR = 6.3 + i * 0.3;
        const colorIdx = i % spectrumColors.length;
        return (
          <mesh
            key={`halo-${i}`}
            scale={[1 + i * 0.015, 0.76 + i * 0.02, 1]}
            rotation={[0, i * 0.18, i * 0.1]}
          >
            <torusGeometry args={[baseR, 0.008 + i * 0.0025, 8, 220]} />
            <meshBasicMaterial
              color={spectrumColors[colorIdx]}
              transparent
              opacity={Math.max(0.004, 0.014 - i * 0.0015)}
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
            opacity={0.02}
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
            opacity={0.014}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}

/* ── Event horizon — accretion disk with concentric rings ──── */

function EventHorizonDisc({
  pf,
  ringCount,
}: {
  pf: MutableRefObject<PointerField>;
  ringCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const rings = useMemo(() => {
    const result: {
      geometry: THREE.TorusGeometry;
      color: string;
      opacity: number;
      radius: number;
    }[] = [];
    const colors = [
      SCENE_PALETTE.warm,
      SCENE_PALETTE.accent,
      SCENE_PALETTE.secondary,
      SCENE_PALETTE.tertiary,
    ];
    for (let i = 0; i < ringCount; i++) {
      const t = i / ringCount;
      const r = 2.2 + t * 4.5;
      const tube = 0.015 + (1 - t) * 0.03;
      const geo = new THREE.TorusGeometry(r, tube, 6, 120);
      result.push({
        geometry: geo,
        color: colors[i % colors.length],
        opacity: 0.025 + (1 - t) * 0.04,
        radius: r,
      });
    }
    return result;
  }, [ringCount]);

  useEffect(() => () => rings.forEach(r => r.geometry.dispose()), [rings]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.rotation.z += delta * (0.035 + burst * 0.02);
    groupRef.current.rotation.x = -1.25 + Math.sin(t * 0.04) * 0.06;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.damp(groupRef.current.scale.x, 1 + burst * 0.08, 3, delta)
    );
  });

  return (
    <group ref={groupRef} rotation={[-1.25, 0.15, 0]}>
      {rings.map((ring, i) => (
        <mesh key={`eh-${i}`} geometry={ring.geometry}>
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Magnetic field lines — dipole curves from poles ─────────── */

function MagneticFieldLines({
  pf,
  lineCount,
}: {
  pf: MutableRefObject<PointerField>;
  lineCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const tubes = useMemo(() => {
    const result: { geometry: THREE.TubeGeometry; color: string }[] = [];
    const colors = [
      SCENE_PALETTE.secondary,
      SCENE_PALETTE.accent,
      SCENE_PALETTE.tertiary,
    ];
    for (let i = 0; i < lineCount; i++) {
      const phi = (i / lineCount) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      const segs = 48;
      for (let j = 0; j <= segs; j++) {
        const theta = (j / segs) * Math.PI;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);
        const r = 3.5 * sinT * sinT;
        pts.push(
          new THREE.Vector3(
            r * sinT * Math.cos(phi),
            r * cosT,
            r * sinT * Math.sin(phi)
          )
        );
      }
      const curve = new THREE.CatmullRomCurve3(pts, false);
      const geo = new THREE.TubeGeometry(curve, 32, 0.012, 4, false);
      result.push({ geometry: geo, color: colors[i % colors.length] });
    }
    return result;
  }, [lineCount]);

  useEffect(() => () => tubes.forEach(t => t.geometry.dispose()), [tubes]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.012 + burst * 0.018);
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.055) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {tubes.map((tube, i) => (
        <mesh key={`mfl-${i}`} geometry={tube.geometry}>
          <meshBasicMaterial
            color={tube.color}
            transparent
            opacity={0.07 + (i % 3) * 0.015}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Resonance waves — expanding sphere pulses ───────────────── */

function ResonanceWaves({
  pf,
  waveCount,
}: {
  pf: MutableRefObject<PointerField>;
  waveCount: number;
}) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const geometries = useMemo(() => {
    return Array.from(
      { length: waveCount },
      () => new THREE.SphereGeometry(1, 28, 28)
    );
  }, [waveCount]);

  useEffect(() => () => geometries.forEach(g => g.dispose()), [geometries]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    for (let i = 0; i < waveCount; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const phase =
        ((t * (0.15 + burst * 0.06) + (i / waveCount) * Math.PI * 2) %
          (Math.PI * 2)) /
        (Math.PI * 2);
      const radius = 0.5 + phase * 8;
      mesh.scale.setScalar(radius);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        Math.max(0, 0.03 * (1 - phase) + burst * 0.015),
        5,
        delta
      );
    }
  });

  return (
    <>
      {geometries.map((geo, i) => (
        <mesh
          key={`rw-${i}`}
          ref={el => {
            meshRefs.current[i] = el;
          }}
          geometry={geo}
        >
          <meshBasicMaterial
            color={SCENE_PALETTE.accent}
            transparent
            opacity={0.06}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── Cometary orbiters — bright particles with tails ─────────── */

function CometaryOrbiters({
  pf,
  count,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Group | null>(null);

  const orbits = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const inclination =
        (i / count) * Math.PI * 0.6 - 0.3 + (Math.random() - 0.5) * 0.25;
      const radius = 3.5 + (i % 5) * 0.9 + Math.random() * 0.6;
      const speed = 0.12 + (i % 4) * 0.04;
      const phase = (i / count) * Math.PI * 2;
      const tailLen = 6 + Math.floor(Math.random() * 5);
      return { inclination, radius, speed, phase, tailLen };
    });
  }, [count]);

  const { lineGeometries, lineMaterials, headGeometry } = useMemo(() => {
    const headGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const lineGeos: THREE.BufferGeometry[] = [];
    const lineMats: THREE.LineBasicMaterial[] = [];
    const colors = [
      SCENE_PALETTE.accent,
      SCENE_PALETTE.secondary,
      SCENE_PALETTE.warm,
    ];
    for (let i = 0; i < count; i++) {
      const positions = new Float32Array(orbits[i].tailLen * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      lineGeos.push(geo);
      lineMats.push(mat);
    }
    return {
      lineGeometries: lineGeos,
      lineMaterials: lineMats,
      headGeometry: headGeo,
    };
  }, [count, orbits]);

  useEffect(() => {
    if (!linesRef.current) return;
    const lines: THREE.Line[] = [];
    for (let i = 0; i < count; i++) {
      const line = new THREE.Line(lineGeometries[i], lineMaterials[i]);
      lines.push(line);
      linesRef.current.add(line);
    }
    return () => {
      lines.forEach(l => linesRef.current?.remove(l));
      lineGeometries.forEach(g => g.dispose());
      lineMaterials.forEach(m => m.dispose());
      headGeometry.dispose();
    };
  }, [lineGeometries, lineMaterials, headGeometry, count]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    const children = groupRef.current.children;
    for (let i = 0; i < count; i++) {
      const head = children[i] as THREE.Mesh | undefined;
      if (!head) continue;
      const orb = orbits[i];
      const angle = t * orb.speed + orb.phase + burst * 0.2;
      const cx = Math.cos(angle) * orb.radius;
      const cy =
        Math.sin(orb.inclination) * Math.sin(angle) * orb.radius * 0.35;
      const cz = Math.sin(angle) * orb.radius * Math.cos(orb.inclination);
      head.position.set(cx, cy, cz);

      const posAttr = lineGeometries[i].getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let j = orb.tailLen - 1; j > 0; j--) {
        arr[j * 3] = arr[(j - 1) * 3];
        arr[j * 3 + 1] = arr[(j - 1) * 3 + 1];
        arr[j * 3 + 2] = arr[(j - 1) * 3 + 2];
      }
      arr[0] = cx;
      arr[1] = cy;
      arr[2] = cz;
      posAttr.needsUpdate = true;
    }
    groupRef.current.rotation.y += delta * 0.003;
  });

  return (
    <>
      <group ref={groupRef}>
        {orbits.map((_, i) => (
          <mesh key={`comet-${i}`} geometry={headGeometry}>
            <meshBasicMaterial
              color={SCENE_PALETTE.highlight}
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <group ref={linesRef} />
    </>
  );
}

/* ── Volumetric rays — god-ray cones from core ───────────────── */

function VolumetricRays({
  pf,
  rayCount,
}: {
  pf: MutableRefObject<PointerField>;
  rayCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const cones = useMemo(() => {
    return Array.from({ length: rayCount }, (_, i) => {
      const angle = (i / rayCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const yAngle = (Math.random() - 0.5) * Math.PI * 0.4;
      const length = 5 + Math.random() * 4;
      const spread = 0.15 + Math.random() * 0.2;
      return { angle, yAngle, length, spread };
    });
  }, [rayCount]);

  const geometries = useMemo(() => {
    return cones.map(
      c => new THREE.ConeGeometry(c.spread, c.length, 8, 1, true)
    );
  }, [cones]);

  useEffect(() => () => geometries.forEach(g => g.dispose()), [geometries]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.005 + burst * 0.015);
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const mat = (children[i] as THREE.Mesh)
        .material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        0.006 + burst * 0.02,
        4,
        delta
      );
    }
  });

  const colors = [
    SCENE_PALETTE.accent,
    SCENE_PALETTE.secondary,
    SCENE_PALETTE.warm,
  ];

  return (
    <group ref={groupRef}>
      {cones.map((c, i) => {
        const rx = c.yAngle;
        const ry = 0;
        const rz = -c.angle + Math.PI / 2;
        const halfLen = c.length / 2;
        const px = Math.cos(c.angle) * Math.cos(c.yAngle) * halfLen;
        const py = Math.sin(c.yAngle) * halfLen;
        const pz = Math.sin(c.angle) * Math.cos(c.yAngle) * halfLen;
        return (
          <mesh
            key={`vr-${i}`}
            geometry={geometries[i]}
            position={[px, py, pz]}
            rotation={[rx, ry, rz]}
          >
            <meshBasicMaterial
              color={colors[i % colors.length]}
              transparent
              opacity={0.006}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Subspace grid — warped energy ground-plane ──────────────── */

function SubspaceGrid({ pf }: { pf: MutableRefObject<PointerField> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const positionsRef = useRef<Float32Array | null>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);

  const geometry = useMemo(() => {
    const size = 28;
    const segs = 48;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    const posArr = geo.getAttribute('position').array as Float32Array;
    positionsRef.current = posArr;
    basePositionsRef.current = new Float32Array(posArr);
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    if (!meshRef.current || !positionsRef.current || !basePositionsRef.current)
      return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    const arr = positionsRef.current;
    const base = basePositionsRef.current;
    const len = arr.length / 3;
    for (let i = 0; i < len; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const dist = Math.sqrt(bx * bx + by * by);
      const warp = Math.sin(dist * 0.6 - t * 0.4) * 0.35 * (1 + burst * 0.6);
      const radialPull = Math.max(0, 1 - dist / 8) * 0.25;
      arr[i * 3 + 2] = warp - radialPull * (1 + burst * 2);
    }
    geometry.getAttribute('position').needsUpdate = true;
    geometry.computeVertexNormals();
    meshRef.current.rotation.z += delta * 0.003;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, -5.5, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial
        color={SCENE_PALETTE.secondary}
        transparent
        opacity={0.01}
        wireframe
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Quantum flux — flowing ribbon streams through space ──────── */

function QuantumFlux({
  pf,
  strandCount,
}: {
  pf: MutableRefObject<PointerField>;
  strandCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const strands = useMemo(() => {
    const result: { geometry: THREE.TubeGeometry; color: string }[] = [];
    const colors = [
      SCENE_PALETTE.accent,
      SCENE_PALETTE.secondary,
      SCENE_PALETTE.tertiary,
      SCENE_PALETTE.warm,
    ];
    for (let s = 0; s < strandCount; s++) {
      const pts: THREE.Vector3[] = [];
      const baseAngle = (s / strandCount) * Math.PI * 2;
      const segs = 64;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const spiralR = 1.5 + t * 4;
        const angle = baseAngle + t * Math.PI * 3.5;
        const wave = Math.sin(t * Math.PI * 4 + s * 1.7) * 0.8;
        pts.push(
          new THREE.Vector3(
            Math.cos(angle) * spiralR,
            wave + (t - 0.5) * 3,
            Math.sin(angle) * spiralR
          )
        );
      }
      const curve = new THREE.CatmullRomCurve3(pts, false);
      const geo = new THREE.TubeGeometry(
        curve,
        48,
        0.008 + (s % 3) * 0.004,
        4,
        false
      );
      result.push({ geometry: geo, color: colors[s % colors.length] });
    }
    return result;
  }, [strandCount]);

  useEffect(() => () => strands.forEach(s => s.geometry.dispose()), [strands]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.02 + burst * 0.015);
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.05) * 0.06;
  });

  return (
    <group ref={groupRef}>
      {strands.map((strand, i) => (
        <mesh key={`qf-${i}`} geometry={strand.geometry}>
          <meshBasicMaterial
            color={strand.color}
            transparent
            opacity={0.02 + (i % 3) * 0.005}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Spark shower — cascading particle fountain from core ────── */

function SparkShower({
  pf,
  count,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.3) * Math.PI * 0.8;
      const speed = 0.02 + Math.random() * 0.04;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      vels[i * 3] = Math.cos(angle) * Math.cos(elev) * speed;
      vels[i * 3 + 1] = Math.sin(elev) * speed * 1.2;
      vels[i * 3 + 2] = Math.sin(angle) * Math.cos(elev) * speed;
    }
    velocitiesRef.current = vels;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !velocitiesRef.current) return;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const vels = velocitiesRef.current;
    const burst = pf.current.burst;
    const maxR = 7;

    for (let i = 0; i < count; i++) {
      arr[i * 3] += vels[i * 3] * (1 + burst * 2);
      arr[i * 3 + 1] += vels[i * 3 + 1] * (1 + burst * 2) - delta * 0.003;
      arr[i * 3 + 2] += vels[i * 3 + 2] * (1 + burst * 2);

      const dist = Math.sqrt(
        arr[i * 3] * arr[i * 3] +
          arr[i * 3 + 1] * arr[i * 3 + 1] +
          arr[i * 3 + 2] * arr[i * 3 + 2]
      );
      if (dist > maxR) {
        const angle = Math.random() * Math.PI * 2;
        const elev = (Math.random() - 0.3) * Math.PI * 0.8;
        const speed = 0.02 + Math.random() * 0.04;
        arr[i * 3] = 0;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = 0;
        vels[i * 3] = Math.cos(angle) * Math.cos(elev) * speed;
        vels[i * 3 + 1] = Math.sin(elev) * speed * 1.2;
        vels[i * 3 + 2] = Math.sin(angle) * Math.cos(elev) * speed;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={SCENE_PALETTE.accent}
        transparent
        opacity={0.08}
        size={0.2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Temporal echoes — ghostly lagging core afterimages ───────── */

function TemporalEchoes({
  pf,
  layerCount,
  coreSpeed,
}: {
  pf: MutableRefObject<PointerField>;
  layerCount: number;
  coreSpeed: number;
}) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const historyRef = useRef<{ rx: number; ry: number; rz: number }[]>([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const currentRY = t * coreSpeed;
    const currentRX = Math.sin(t * 0.14) * 0.15;
    const currentRZ = Math.cos(t * 0.11) * 0.1;

    historyRef.current.unshift({
      rx: currentRX,
      ry: currentRY,
      rz: currentRZ,
    });
    if (historyRef.current.length > layerCount * 12) {
      historyRef.current.length = layerCount * 12;
    }

    for (let i = 0; i < layerCount; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const delay = (i + 1) * 10;
      const entry =
        historyRef.current[Math.min(delay, historyRef.current.length - 1)];
      if (!entry) continue;
      mesh.rotation.set(entry.rx, entry.ry, entry.rz);
      const targetOpacity = Math.max(
        0.005,
        0.04 - i * 0.008 + pf.current.burst * 0.02
      );
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 4, delta);
      const s = 2.2 + i * 0.35;
      mesh.scale.setScalar(
        THREE.MathUtils.damp(
          mesh.scale.x,
          s + pf.current.burst * 0.15,
          3,
          delta
        )
      );
    }
  });

  const colors = [
    SCENE_PALETTE.accent,
    SCENE_PALETTE.secondary,
    SCENE_PALETTE.tertiary,
    SCENE_PALETTE.warm,
  ];

  return (
    <>
      {Array.from({ length: layerCount }, (_, i) => (
        <mesh
          key={`te-${i}`}
          ref={el => {
            meshRefs.current[i] = el;
          }}
          scale={2.2 + i * 0.35}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={colors[i % colors.length]}
            transparent
            opacity={0.03}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── Neural web — interconnected node constellation ──────────── */

function NeuralWeb({
  pf,
  nodeCount,
}: {
  pf: MutableRefObject<PointerField>;
  nodeCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const linesGroupRef = useRef<THREE.Group | null>(null);

  const { nodePositions, lineGeometry, lineMaterial } = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const r = 3 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      nodes.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        )
      );
    }

    const conns: [number, number][] = [];
    const maxDist = 3.8;
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodes[i].distanceTo(nodes[j]) < maxDist) {
          conns.push([i, j]);
        }
      }
    }

    const positions = new Float32Array(conns.length * 6);
    for (let c = 0; c < conns.length; c++) {
      const [a, b] = conns[c];
      positions[c * 6] = nodes[a].x;
      positions[c * 6 + 1] = nodes[a].y;
      positions[c * 6 + 2] = nodes[a].z;
      positions[c * 6 + 3] = nodes[b].x;
      positions[c * 6 + 4] = nodes[b].y;
      positions[c * 6 + 5] = nodes[b].z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: SCENE_PALETTE.secondary,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return {
      nodePositions: nodes,
      connections: conns,
      lineGeometry: geo,
      lineMaterial: mat,
    };
  }, [nodeCount]);

  useEffect(() => {
    if (!linesGroupRef.current) return;
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    linesGroupRef.current.add(lines);
    return () => {
      linesGroupRef.current?.remove(lines);
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [lineGeometry, lineMaterial]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.008 + burst * 0.01);
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.04) * 0.04;
    lineMaterial.opacity = THREE.MathUtils.damp(
      lineMaterial.opacity,
      0.015 + burst * 0.03,
      4,
      delta
    );
  });

  return (
    <group ref={groupRef}>
      {nodePositions.map((pos, i) => (
        <mesh key={`nw-${i}`} position={pos} scale={0.025 + (i % 4) * 0.008}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color={
              i % 3 === 0
                ? SCENE_PALETTE.accent
                : i % 3 === 1
                  ? SCENE_PALETTE.secondary
                  : SCENE_PALETTE.tertiary
            }
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      <group ref={linesGroupRef} />
    </group>
  );
}

/* ── Gravitational lens — refraction disc around core ────────── */

function GravitationalLens({ pf }: { pf: MutableRefObject<PointerField> }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    meshRef.current.rotation.z += delta * 0.01;
    meshRef.current.rotation.x = Math.sin(t * 0.035) * 0.08;
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = THREE.MathUtils.damp(
      mat.opacity,
      0.008 + burst * 0.012,
      4,
      delta
    );
    const s = 3.2 + Math.sin(t * 0.2) * 0.15 + burst * 0.3;
    meshRef.current.scale.setScalar(
      THREE.MathUtils.damp(meshRef.current.scale.x, s, 3, delta)
    );
  });

  return (
    <mesh ref={meshRef} scale={3.2}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshPhysicalMaterial
        color={SCENE_PALETTE.highlight}
        transparent
        opacity={0.02}
        transmission={0.68}
        thickness={0.3}
        ior={1.8}
        roughness={0.04}
        metalness={0}
        envMapIntensity={0.15}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Solar flare arcs ────────────────────────────────────────── */

function SolarFlareArcs({
  pf,
  flareCount,
}: {
  pf: MutableRefObject<PointerField>;
  flareCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const arcs = useMemo(() => {
    const result: {
      curve: THREE.CatmullRomCurve3;
      phase: number;
      tilt: number;
      height: number;
    }[] = [];
    for (let i = 0; i < flareCount; i++) {
      const angle = (i / flareCount) * Math.PI * 2 + Math.random() * 0.4;
      const height = 2.2 + Math.random() * 2.8;
      const baseR = 1.8;
      const pts: THREE.Vector3[] = [];
      const segments = 16;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const arcAngle = angle + (t - 0.5) * 0.8;
        const lift = Math.sin(t * Math.PI) * height;
        const r = baseR + Math.sin(t * Math.PI) * 1.2;
        pts.push(
          new THREE.Vector3(
            Math.cos(arcAngle) * r,
            lift,
            Math.sin(arcAngle) * r
          )
        );
      }
      result.push({
        curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5),
        phase: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 0.6,
        height,
      });
    }
    return result;
  }, [flareCount]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, i) => {
      const arc = arcs[i];
      if (!arc) return;
      const mesh = child as THREE.Mesh;
      const pulse = 0.7 + 0.3 * Math.sin(t * 1.2 + arc.phase);
      const scale = pulse + burst * 0.3;
      mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, scale, 4, delta));
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
        THREE.MathUtils.damp(
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity,
          0.03 + burst * 0.08 + Math.sin(t * 2.5 + arc.phase) * 0.01,
          5,
          delta
        );
    });
  });

  return (
    <group ref={groupRef}>
      {arcs.map((arc, i) => (
        <mesh key={i} rotation={[arc.tilt, 0, 0]}>
          <tubeGeometry
            args={[arc.curve, 48, 0.04 + (arc.height / 5) * 0.03, 8, false]}
          />
          <meshStandardMaterial
            color={SCENE_PALETTE.warm}
            emissive={SCENE_PALETTE.accent}
            emissiveIntensity={0.03}
            transparent
            opacity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Dark matter web ─────────────────────────────────────────── */

function DarkMatterWeb({
  pf,
  filamentCount,
}: {
  pf: MutableRefObject<PointerField>;
  filamentCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const filaments = useMemo(() => {
    const result: { curve: THREE.CatmullRomCurve3; phase: number }[] = [];
    const golden = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < filamentCount; i++) {
      const theta1 = Math.acos(1 - (2 * i) / filamentCount);
      const phi1 = (2 * Math.PI * i) / golden;
      const r1 = 8 + Math.random() * 4;
      const start = new THREE.Vector3(
        r1 * Math.sin(theta1) * Math.cos(phi1),
        r1 * Math.cos(theta1),
        r1 * Math.sin(theta1) * Math.sin(phi1)
      );
      const j = (i + Math.floor(filamentCount / 3)) % filamentCount;
      const theta2 = Math.acos(1 - (2 * j) / filamentCount);
      const phi2 = (2 * Math.PI * j) / golden;
      const r2 = 8 + Math.random() * 4;
      const end = new THREE.Vector3(
        r2 * Math.sin(theta2) * Math.cos(phi2),
        r2 * Math.cos(theta2),
        r2 * Math.sin(theta2) * Math.sin(phi2)
      );
      const mid = start
        .clone()
        .add(end)
        .multiplyScalar(0.5)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3
          )
        );
      result.push({
        curve: new THREE.CatmullRomCurve3(
          [start, mid, end],
          false,
          'centripetal',
          0.5
        ),
        phase: Math.random() * Math.PI * 2,
      });
    }
    return result;
  }, [filamentCount]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, i) => {
      const fil = filaments[i];
      if (!fil) return;
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        0.035 + 0.015 * Math.sin(t * 0.6 + fil.phase) + burst * 0.02,
        3,
        delta
      );
      mat.emissiveIntensity = THREE.MathUtils.damp(
        mat.emissiveIntensity,
        0.02 + burst * 0.06 + Math.sin(t * 0.8 + fil.phase) * 0.008,
        4,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {filaments.map((fil, i) => (
        <mesh key={i}>
          <tubeGeometry args={[fil.curve, 36, 0.015, 6, false]} />
          <meshStandardMaterial
            color={SCENE_PALETTE.tertiary}
            emissive={SCENE_PALETTE.secondary}
            emissiveIntensity={0.02}
            transparent
            opacity={0.035}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Pulsar beacons ──────────────────────────────────────────── */

function PulsarBeacons({
  pf,
  beaconCount,
}: {
  pf: MutableRefObject<PointerField>;
  beaconCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const beacons = useMemo(() => {
    const result: {
      position: THREE.Vector3;
      axis: THREE.Vector3;
      speed: number;
      phase: number;
    }[] = [];
    for (let i = 0; i < beaconCount; i++) {
      const theta = Math.acos(1 - (2 * (i + 0.5)) / beaconCount);
      const phi = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 5.5 + Math.random() * 2.5;
      result.push({
        position: new THREE.Vector3(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi)
        ),
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        speed: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return result;
  }, [beaconCount]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, i) => {
      const b = beacons[i];
      if (!b) return;
      const g = child as THREE.Group;
      const angle = t * b.speed + b.phase;
      g.rotation.set(b.axis.x * angle, b.axis.y * angle, b.axis.z * angle);
      const cone = g.children[0] as THREE.Mesh | undefined;
      if (cone) {
        const mat = cone.material as THREE.MeshStandardMaterial;
        mat.opacity = THREE.MathUtils.damp(
          mat.opacity,
          0.04 + 0.02 * Math.sin(t * 3 + b.phase) + burst * 0.03,
          4,
          delta
        );
        mat.emissiveIntensity = THREE.MathUtils.damp(
          mat.emissiveIntensity,
          0.03 + burst * 0.08 + Math.sin(t * 4 + b.phase) * 0.01,
          5,
          delta
        );
      }
    });
  });

  return (
    <group ref={groupRef}>
      {beacons.map((b, i) => (
        <group key={i} position={b.position}>
          <mesh>
            <coneGeometry args={[0.12, 6, 14, 1, true]} />
            <meshStandardMaterial
              color={SCENE_PALETTE.secondary}
              emissive={SCENE_PALETTE.accent}
              emissiveIntensity={0.03}
              transparent
              opacity={0.04}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.06, 20, 20]} />
            <meshStandardMaterial
              color={SCENE_PALETTE.highlight}
              emissive={SCENE_PALETTE.accent}
              emissiveIntensity={0.06}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Crystalline growth ──────────────────────────────────────── */

function CrystallineGrowth({
  pf,
  branchCount,
}: {
  pf: MutableRefObject<PointerField>;
  branchCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const branches = useMemo(() => {
    const result: {
      position: THREE.Vector3;
      rotation: THREE.Euler;
      length: number;
      width: number;
      phase: number;
    }[] = [];
    const seeds = 3;
    const perSeed = Math.ceil(branchCount / seeds);
    for (let s = 0; s < seeds; s++) {
      const seedAngle = (s / seeds) * Math.PI * 2;
      const seedR = 3.5 + s * 0.8;
      const seedPos = new THREE.Vector3(
        Math.cos(seedAngle) * seedR,
        (Math.random() - 0.5) * 2.5,
        Math.sin(seedAngle) * seedR
      );

      for (let b = 0; b < perSeed && result.length < branchCount; b++) {
        const spread = (b / perSeed) * Math.PI * 2;
        const upAngle = (Math.random() - 0.3) * 1.2;
        const outR = 0.3 + Math.random() * 1.8;
        const pos = seedPos
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(spread) * outR * Math.cos(upAngle),
              Math.sin(upAngle) * outR,
              Math.sin(spread) * outR * Math.cos(upAngle)
            )
          );
        result.push({
          position: pos,
          rotation: new THREE.Euler(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          ),
          length: 0.4 + Math.random() * 0.8,
          width: 0.02 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    return result;
  }, [branchCount]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, i) => {
      const br = branches[i];
      if (!br) return;
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.8 + br.phase);
      mesh.scale.y = THREE.MathUtils.damp(
        mesh.scale.y,
        pulse + burst * 0.2,
        4,
        delta
      );
      mat.emissiveIntensity = THREE.MathUtils.damp(
        mat.emissiveIntensity,
        0.03 + burst * 0.12 + Math.sin(t * 2.2 + br.phase) * 0.01,
        5,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {branches.map((br, i) => (
        <mesh key={i} position={br.position} rotation={br.rotation}>
          <octahedronGeometry args={[br.width, 0]} />
          <meshPhysicalMaterial
            color={SCENE_PALETTE.secondary}
            emissive={SCENE_PALETTE.tertiary}
            emissiveIntensity={0.03}
            transparent
            opacity={0.35}
            roughness={0.08}
            metalness={0.35}
            transmission={0.5}
            ior={1.6}
            thickness={br.length}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Cosmic string resonance ─────────────────────────────────── */

function CosmicStringResonance({ pf }: { pf: MutableRefObject<PointerField> }) {
  const groupRef = useRef<THREE.Group>(null);

  const strings = useMemo(() => {
    const count = 5;
    const result: {
      points: Float32Array;
      axis: THREE.Vector3;
      baseR: number;
      phase: number;
      freq: number;
    }[] = [];
    for (let s = 0; s < count; s++) {
      const angle = (s / count) * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 1.4;
      const segments = 80;
      const pts = new Float32Array(segments * 3);
      const baseR = 6 + Math.random() * 5;
      for (let i = 0; i < segments; i++) {
        const t = (i / (segments - 1)) * Math.PI * 2;
        pts[i * 3] = Math.cos(t + angle) * baseR;
        pts[i * 3 + 1] = Math.sin(t * 3 + tilt) * 0.5;
        pts[i * 3 + 2] = Math.sin(t + angle) * baseR;
      }
      result.push({
        points: pts,
        axis: new THREE.Vector3(
          Math.cos(angle),
          tilt,
          Math.sin(angle)
        ).normalize(),
        baseR,
        phase: Math.random() * Math.PI * 2,
        freq: 2 + Math.random() * 3,
      });
    }
    return result;
  }, []);

  useEffect(() => {
    return () => {
      if (!groupRef.current) return;
      groupRef.current.children.forEach(child => {
        const line = child as THREE.Line;
        line.geometry?.dispose();
        (line.material as THREE.Material)?.dispose();
      });
    };
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, si) => {
      const s = strings[si];
      if (!s) return;
      const line = child as THREE.Line;
      const posAttr = line.geometry.getAttribute('position');
      if (!posAttr) return;
      const arr = posAttr.array as Float32Array;
      const segments = arr.length / 3;
      for (let i = 0; i < segments; i++) {
        const frac = i / (segments - 1);
        const wave =
          Math.sin(frac * s.freq * Math.PI * 2 + t * 2.5 + s.phase) *
          (0.3 + burst * 0.4) *
          Math.sin(frac * Math.PI);
        arr[i * 3 + 1] = s.points[i * 3 + 1] + wave;
      }
      posAttr.needsUpdate = true;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.1 + 0.04 * Math.sin(t * 1.5 + s.phase) + burst * 0.06;
    });
  });

  useEffect(() => {
    if (!groupRef.current) return;
    // Imperatively build line geometries (avoids SVG <line> conflict)
    groupRef.current.clear();
    strings.forEach(s => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(s.points.slice(), 3)
      );
      const mat = new THREE.LineBasicMaterial({
        color: SCENE_PALETTE.accent,
        transparent: true,
        opacity: 0.1,
      });
      const line = new THREE.Line(geo, mat);
      groupRef.current!.add(line);
    });
  }, [strings]);

  return <group ref={groupRef} />;
}

/* ── Interference shells ────────────────────────────────────── */

function InterferenceShells({
  pf,
  shellCount,
}: {
  pf: MutableRefObject<PointerField>;
  shellCount: number;
}) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const baseScales = useMemo(
    () => Array.from({ length: shellCount }, (_, i) => 1.85 + i * 0.72),
    [shellCount]
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    baseScales.forEach((baseScale, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const phase = i * 0.65;
      const targetScale =
        baseScale +
        Math.sin(t * (0.35 + i * 0.08) + phase) * 0.08 +
        burst * 0.18;
      mesh.scale.setScalar(
        THREE.MathUtils.damp(mesh.scale.x, targetScale, 3.4, delta)
      );
      mesh.rotation.x += delta * (0.02 + i * 0.006);
      mesh.rotation.y -= delta * (0.025 + i * 0.008 + burst * 0.01);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        Math.max(0.008, 0.025 - i * 0.004) + burst * 0.01,
        4,
        delta
      );
    });
  });

  return (
    <>
      {baseScales.map((baseScale, i) => (
        <mesh
          key={`interference-shell-${i}`}
          ref={el => {
            meshRefs.current[i] = el;
          }}
          scale={baseScale}
          rotation={[i * 0.3, i * 0.45, i * 0.15]}
        >
          <sphereGeometry args={[1, 36, 36]} />
          <meshBasicMaterial
            color={
              i % 2 === 0 ? SCENE_PALETTE.secondary : SCENE_PALETTE.tertiary
            }
            transparent
            opacity={0.015}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── Void ripples ───────────────────────────────────────────── */

function VoidRipples({
  pf,
  rippleCount,
}: {
  pf: MutableRefObject<PointerField>;
  rippleCount: number;
}) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ripples = useMemo(
    () =>
      Array.from({ length: rippleCount }, (_, i) => ({
        radius: 2.6 + i * 0.55,
        tube: 0.018 + i * 0.004,
        rotation: [Math.PI / 2 + i * 0.24, i * 0.45, i * 0.2] as const,
        phase: i * 0.8,
      })),
    [rippleCount]
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    ripples.forEach((ripple, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const pulse = 1 + Math.sin(t * 0.8 + ripple.phase) * 0.06 + burst * 0.16;
      mesh.scale.setScalar(
        THREE.MathUtils.damp(mesh.scale.x, pulse, 3.6, delta)
      );
      mesh.rotation.z += delta * (0.02 + i * 0.01 + burst * 0.02);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        Math.max(0.006, 0.02 - i * 0.003) + burst * 0.02,
        4,
        delta
      );
    });
  });

  return (
    <>
      {ripples.map((ripple, i) => (
        <mesh
          key={`void-ripple-${i}`}
          ref={el => {
            meshRefs.current[i] = el;
          }}
          rotation={[
            ripple.rotation[0],
            ripple.rotation[1],
            ripple.rotation[2],
          ]}
        >
          <torusGeometry args={[ripple.radius, ripple.tube, 12, 256]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? SCENE_PALETTE.accent : SCENE_PALETTE.warm}
            transparent
            opacity={0.015}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── Photon bloom — orbiting luminous petals ───────────────── */

function PhotonBloom({
  pf,
  bloomCount,
}: {
  pf: MutableRefObject<PointerField>;
  bloomCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const blooms = useMemo(
    () =>
      Array.from({ length: bloomCount }, (_, i) => ({
        orbitRadius: 2.8 + (i % 6) * 0.42 + Math.random() * 0.35,
        height: (Math.random() - 0.5) * 3.2,
        speed: 0.18 + (i % 5) * 0.025,
        phase: (i / bloomCount) * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 1.1,
        scale: 0.09 + (i % 4) * 0.018,
      })),
    [bloomCount]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, i) => {
      const bloom = blooms[i];
      if (!bloom) return;
      const mesh = child as THREE.Mesh;
      const angle = t * bloom.speed + bloom.phase;
      mesh.position.set(
        Math.cos(angle) * bloom.orbitRadius,
        bloom.height + Math.sin(angle * 1.7 + bloom.tilt) * 0.35,
        Math.sin(angle) * bloom.orbitRadius
      );
      mesh.rotation.x += delta * (0.45 + bloom.speed);
      mesh.rotation.y -= delta * (0.32 + burst * 0.2);
      const scaleTarget = bloom.scale + burst * 0.03;
      mesh.scale.setScalar(
        THREE.MathUtils.damp(mesh.scale.x, scaleTarget, 5, delta)
      );
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.damp(
        mat.emissiveIntensity,
        0.03 + burst * 0.08 + Math.sin(t * 2.4 + bloom.phase) * 0.01,
        5,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {blooms.map((bloom, i) => (
        <mesh key={`photon-bloom-${i}`} scale={bloom.scale}>
          {i % 2 === 0 ? (
            <octahedronGeometry args={[1, 2]} />
          ) : (
            <icosahedronGeometry args={[0.8, 2]} />
          )}
          <meshStandardMaterial
            color={i % 3 === 0 ? SCENE_PALETTE.highlight : SCENE_PALETTE.core}
            emissive={
              i % 2 === 0 ? SCENE_PALETTE.accent : SCENE_PALETTE.secondary
            }
            emissiveIntensity={0.03}
            roughness={0.18}
            metalness={0.22}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Halo glyphs ────────────────────────────────────────────── */

function HaloGlyphs({
  pf,
  glyphCount,
}: {
  pf: MutableRefObject<PointerField>;
  glyphCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glyphs = useMemo(
    () =>
      Array.from({ length: glyphCount }, (_, i) => ({
        angle: (i / glyphCount) * Math.PI * 2,
        radius: 7.6 + (i % 4) * 0.45,
        y: ((i % 5) - 2) * 0.8,
        scale: 0.22 + (i % 3) * 0.05,
        spin: 0.2 + (i % 4) * 0.04,
      })),
    [glyphCount]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.01 + burst * 0.012);
    groupRef.current.children.forEach((child, i) => {
      const glyph = glyphs[i];
      if (!glyph) return;
      const mesh = child as THREE.Mesh;
      mesh.rotation.x += delta * glyph.spin;
      mesh.rotation.y -= delta * (glyph.spin * 0.8 + burst * 0.08);
      mesh.position.y = glyph.y + Math.sin(t * 0.9 + i) * 0.18;
    });
  });

  return (
    <group ref={groupRef}>
      {glyphs.map((glyph, i) => (
        <mesh
          key={`halo-glyph-${i}`}
          position={[
            Math.cos(glyph.angle) * glyph.radius,
            glyph.y,
            Math.sin(glyph.angle) * glyph.radius,
          ]}
          scale={glyph.scale}
          rotation={[glyph.angle * 0.3, glyph.angle, 0]}
        >
          {i % 2 === 0 ? (
            <torusKnotGeometry args={[1, 0.2, 96, 14, 2, 3]} />
          ) : (
            <dodecahedronGeometry args={[1, 1]} />
          )}
          <meshBasicMaterial
            color={
              i % 2 === 0 ? SCENE_PALETTE.tertiary : SCENE_PALETTE.secondary
            }
            transparent
            opacity={0.035}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Chroma torus field ─────────────────────────────────────── */

function ChromaTorusField({ pf }: { pf: MutableRefObject<PointerField> }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const defs = useMemo(
    () => [
      {
        scale: 3.3,
        rotation: [0.2, 0.4, 0.1] as const,
        color: SCENE_PALETTE.secondary,
      },
      {
        scale: 4.4,
        rotation: [0.9, -0.25, 0.35] as const,
        color: SCENE_PALETTE.accent,
      },
      {
        scale: 5.2,
        rotation: [1.1, 0.55, -0.2] as const,
        color: SCENE_PALETTE.tertiary,
      },
    ],
    []
  );

  useFrame((state, delta) => {
    const burst = pf.current.burst;
    const t = state.clock.elapsedTime;
    defs.forEach((def, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.rotation.x += delta * (0.05 + i * 0.02);
      mesh.rotation.y -= delta * (0.06 + i * 0.015 + burst * 0.03);
      mesh.rotation.z += delta * (0.03 + i * 0.01);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        0.008 + i * 0.003 + burst * 0.012 + Math.sin(t * 0.8 + i) * 0.002,
        4,
        delta
      );
    });
  });

  return (
    <>
      {defs.map((def, i) => (
        <mesh
          key={`chroma-torus-${i}`}
          ref={el => {
            meshRefs.current[i] = el;
          }}
          scale={def.scale}
          rotation={[def.rotation[0], def.rotation[1], def.rotation[2]]}
        >
          <torusKnotGeometry args={[1, 0.08, 240, 24, 3 + i, 5 + i]} />
          <meshBasicMaterial
            color={def.color}
            transparent
            opacity={0.01 + i * 0.003}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/* ── Crown spires ───────────────────────────────────────────── */

function CrownSpires({
  pf,
  spireCount,
}: {
  pf: MutableRefObject<PointerField>;
  spireCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spires = useMemo(
    () =>
      Array.from({ length: spireCount }, (_, i) => {
        const theta = Math.acos(1 - (2 * (i + 0.5)) / spireCount);
        const phi = Math.PI * (3 - Math.sqrt(5)) * i;
        const radius = 2.55 + (i % 3) * 0.28;
        const position = new THREE.Vector3(
          radius * Math.sin(theta) * Math.cos(phi),
          radius * Math.cos(theta),
          radius * Math.sin(theta) * Math.sin(phi)
        );
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          position.clone().normalize()
        );
        const euler = new THREE.Euler().setFromQuaternion(quat);
        return {
          position,
          rotation: [euler.x, euler.y, euler.z] as const,
          length: 0.85 + (i % 4) * 0.22,
          width: 0.09 + (i % 3) * 0.02,
          phase: i * 0.55,
        };
      }),
    [spireCount]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.025 + burst * 0.03);
    groupRef.current.children.forEach((child, i) => {
      const spire = spires[i];
      if (!spire) return;
      const mesh = child as THREE.Mesh;
      mesh.scale.y = THREE.MathUtils.damp(
        mesh.scale.y,
        1 + Math.sin(t * 1.8 + spire.phase) * 0.14 + burst * 0.28,
        4,
        delta
      );
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = THREE.MathUtils.damp(
        mat.emissiveIntensity,
        0.04 + burst * 0.12 + Math.sin(t * 2.3 + spire.phase) * 0.015,
        4,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {spires.map((spire, i) => (
        <mesh
          key={`crown-spire-${i}`}
          position={spire.position}
          rotation={[spire.rotation[0], spire.rotation[1], spire.rotation[2]]}
        >
          <coneGeometry args={[spire.width, spire.length, 12, 1, false]} />
          <meshPhysicalMaterial
            color={i % 2 === 0 ? SCENE_PALETTE.core : SCENE_PALETTE.secondary}
            emissive={i % 2 === 0 ? SCENE_PALETTE.accent : SCENE_PALETTE.warm}
            emissiveIntensity={0.04}
            roughness={0.06}
            metalness={0.45}
            transmission={0.35}
            transparent
            opacity={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Meridian arcs ──────────────────────────────────────────── */

function MeridianArcs({
  pf,
  arcCount,
}: {
  pf: MutableRefObject<PointerField>;
  arcCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const arcs = useMemo(() => {
    const result: { geometry: THREE.TubeGeometry; color: string }[] = [];
    for (let i = 0; i < arcCount; i++) {
      const phi = (i / arcCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const segments = 48;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const theta = t * Math.PI;
        const radius = 6.6 + Math.sin(theta * 4 + i) * 0.18;
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.cos(theta);
        const z = radius * Math.sin(theta) * Math.sin(phi);
        points.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(
        points,
        false,
        'centripetal',
        0.5
      );
      result.push({
        geometry: new THREE.TubeGeometry(
          curve,
          36,
          0.012 + (i % 3) * 0.003,
          4,
          false
        ),
        color: pickSpectrumColor(i + 1),
      });
    }
    return result;
  }, [arcCount]);

  useEffect(() => () => arcs.forEach(arc => arc.geometry.dispose()), [arcs]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.012 + burst * 0.016);
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.05) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {arcs.map((arc, i) => (
        <mesh key={`meridian-arc-${i}`} geometry={arc.geometry}>
          <meshBasicMaterial
            color={arc.color}
            transparent
            opacity={0.02 + (i % 3) * 0.004}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Relay satellites ───────────────────────────────────────── */

function RelaySatellites({
  pf,
  satelliteCount,
}: {
  pf: MutableRefObject<PointerField>;
  satelliteCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const satellites = useMemo(
    () =>
      Array.from({ length: satelliteCount }, (_, i) => ({
        radius: 8.4 + (i % 4) * 0.6,
        speed: 0.08 + (i % 5) * 0.018,
        phase: (i / satelliteCount) * Math.PI * 2,
        inclination: ((i % 6) - 2.5) * 0.16,
        scale: 0.16 + (i % 3) * 0.03,
      })),
    [satelliteCount]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, i) => {
      const sat = satellites[i];
      if (!sat) return;
      const group = child as THREE.Group;
      const angle = t * sat.speed + sat.phase;
      group.position.set(
        Math.cos(angle) * sat.radius,
        Math.sin(sat.inclination + angle * 1.3) * 2.4,
        Math.sin(angle) * sat.radius
      );
      group.rotation.x += delta * (0.4 + sat.speed);
      group.rotation.y -= delta * (0.35 + burst * 0.15);
      group.scale.setScalar(
        THREE.MathUtils.damp(group.scale.x, sat.scale + burst * 0.03, 4, delta)
      );
    });
  });

  return (
    <group ref={groupRef}>
      {satellites.map((sat, i) => (
        <group key={`relay-sat-${i}`} scale={sat.scale}>
          <mesh>
            <torusGeometry args={[0.9, 0.08, 14, 80]} />
            <meshBasicMaterial
              color={pickSpectrumColor(i + 2)}
              transparent
              opacity={0.02}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshStandardMaterial
              color={SCENE_PALETTE.highlight}
              emissive={pickSpectrumColor(i + 1)}
              emissiveIntensity={0.04}
              roughness={0.15}
              metalness={0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Petal field ────────────────────────────────────────────── */

function PetalField({
  pf,
  petalCount,
}: {
  pf: MutableRefObject<PointerField>;
  petalCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const petals = useMemo(
    () =>
      Array.from({ length: petalCount }, (_, i) => ({
        angle: (i / petalCount) * Math.PI * 2,
        radius: 1.8 + (i % 4) * 0.3,
        tilt: ((i % 6) - 3) * 0.16,
        scaleX: 0.34 + (i % 3) * 0.06,
        scaleY: 0.78 + (i % 4) * 0.08,
        phase: i * 0.4,
      })),
    [petalCount]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.02 + burst * 0.025);
    groupRef.current.children.forEach((child, i) => {
      const petal = petals[i];
      if (!petal) return;
      const mesh = child as THREE.Mesh;
      mesh.scale.x = THREE.MathUtils.damp(
        mesh.scale.x,
        petal.scaleX + Math.sin(t * 1.4 + petal.phase) * 0.03 + burst * 0.03,
        4,
        delta
      );
      mesh.scale.y = THREE.MathUtils.damp(
        mesh.scale.y,
        petal.scaleY + Math.cos(t * 1.1 + petal.phase) * 0.04 + burst * 0.08,
        4,
        delta
      );
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        0.01 + Math.sin(t * 1.6 + petal.phase) * 0.003 + burst * 0.008,
        4,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {petals.map((petal, i) => (
        <mesh
          key={`petal-field-${i}`}
          position={[
            Math.cos(petal.angle) * petal.radius,
            Math.sin(petal.phase) * 0.35,
            Math.sin(petal.angle) * petal.radius,
          ]}
          rotation={[Math.PI / 2 + petal.tilt, petal.angle, 0]}
          scale={[petal.scaleX, petal.scaleY, 1]}
        >
          <circleGeometry args={[1, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? SCENE_PALETTE.warm : SCENE_PALETTE.accent}
            transparent
            opacity={0.01}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Lit orbit cage ─────────────────────────────────────────── */

function LitOrbitCage({ pf }: { pf: MutableRefObject<PointerField> }) {
  const boxRefA = useRef<THREE.Mesh>(null);
  const boxRefB = useRef<THREE.Mesh>(null);
  const octaRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const burst = pf.current.burst;
    const t = state.clock.elapsedTime;
    if (boxRefA.current) {
      boxRefA.current.rotation.x += delta * 0.045;
      boxRefA.current.rotation.y -= delta * (0.04 + burst * 0.03);
      boxRefA.current.scale.setScalar(
        THREE.MathUtils.damp(
          boxRefA.current.scale.x,
          7.2 + burst * 0.2,
          4,
          delta
        )
      );
    }
    if (boxRefB.current) {
      boxRefB.current.rotation.y += delta * 0.035;
      boxRefB.current.rotation.z -= delta * (0.03 + burst * 0.025);
      boxRefB.current.scale.setScalar(
        THREE.MathUtils.damp(
          boxRefB.current.scale.x,
          8.1 + Math.sin(t * 0.4) * 0.08,
          4,
          delta
        )
      );
    }
    if (octaRef.current) {
      octaRef.current.rotation.x -= delta * 0.025;
      octaRef.current.rotation.z += delta * (0.028 + burst * 0.02);
    }
  });

  return (
    <>
      <mesh ref={boxRefA} scale={7.2} rotation={[0.5, 0.1, 0.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={SCENE_PALETTE.secondary}
          transparent
          opacity={0.008}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={boxRefB} scale={8.1} rotation={[0.2, 0.8, -0.35]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={SCENE_PALETTE.tertiary}
          transparent
          opacity={0.006}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={octaRef} scale={9.2} rotation={[0.15, 0.3, 0.55]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color={SCENE_PALETTE.accent}
          transparent
          opacity={0.006}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ── Light cards — cinematic luminous panels ───────────────── */

function LightCards({
  pf,
  cardCount,
}: {
  pf: MutableRefObject<PointerField>;
  cardCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const cards = useMemo(
    () =>
      Array.from({ length: cardCount }, (_, i) => ({
        angle: (i / cardCount) * Math.PI * 2,
        radius: 4.9 + (i % 4) * 0.55,
        y: ((i % 5) - 2) * 0.92,
        width: 0.28 + (i % 3) * 0.06,
        height: 1.9 + (i % 4) * 0.28,
        phase: i * 0.5,
      })),
    [cardCount]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.008 + burst * 0.015);
    groupRef.current.children.forEach((child, i) => {
      const card = cards[i];
      if (!card) return;
      const mesh = child as THREE.Mesh;
      mesh.position.y = card.y + Math.sin(t * 0.9 + card.phase) * 0.18;
      mesh.lookAt(0, 0, 6);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        0.004 + Math.sin(t * 1.6 + card.phase) * 0.002 + burst * 0.006,
        4,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {cards.map((card, i) => (
        <mesh
          key={`light-card-${i}`}
          position={[
            Math.cos(card.angle) * card.radius,
            card.y,
            Math.sin(card.angle) * card.radius,
          ]}
          rotation={[0, -card.angle + Math.PI / 2, 0]}
        >
          <planeGeometry args={[card.width, card.height]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? SCENE_PALETTE.highlight : SCENE_PALETTE.mist}
            transparent
            opacity={0.004}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Glass orbiters — refractive premium detail orbs ───────── */

function GlassOrbiters({
  pf,
  orbCount,
}: {
  pf: MutableRefObject<PointerField>;
  orbCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const orbiters = useMemo(
    () =>
      Array.from({ length: orbCount }, (_, i) => ({
        radius: 3.8 + (i % 4) * 0.55,
        speed: 0.16 + (i % 5) * 0.025,
        phase: (i / orbCount) * Math.PI * 2,
        yAmp: 0.55 + (i % 3) * 0.18,
        scale: 0.14 + (i % 4) * 0.03,
      })),
    [orbCount]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const burst = pf.current.burst;
    groupRef.current.children.forEach((child, i) => {
      const orb = orbiters[i];
      if (!orb) return;
      const mesh = child as THREE.Mesh;
      const angle = t * orb.speed + orb.phase;
      mesh.position.set(
        Math.cos(angle) * orb.radius,
        Math.sin(angle * 1.6 + orb.phase) * orb.yAmp,
        Math.sin(angle) * orb.radius
      );
      mesh.rotation.x += delta * (0.4 + orb.speed);
      mesh.rotation.y -= delta * (0.25 + burst * 0.1);
      mesh.scale.setScalar(
        THREE.MathUtils.damp(mesh.scale.x, orb.scale + burst * 0.02, 4, delta)
      );
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = THREE.MathUtils.damp(
        mat.emissiveIntensity,
        0.01 + burst * 0.04,
        4,
        delta
      );
    });
  });

  return (
    <group ref={groupRef}>
      {orbiters.map((orb, i) => (
        <mesh key={`glass-orb-${i}`} scale={orb.scale}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshPhysicalMaterial
            color={i % 2 === 0 ? SCENE_PALETTE.mist : SCENE_PALETTE.highlight}
            emissive={pickSpectrumColor(i + 1)}
            emissiveIntensity={0.01}
            roughness={0.03}
            metalness={0.06}
            clearcoat={1}
            clearcoatRoughness={0.06}
            iridescence={0.28}
            iridescenceIOR={1.25}
            transmission={0.9}
            thickness={0.78}
            ior={1.55}
            attenuationDistance={1.2}
            attenuationColor={SCENE_PALETTE.secondary}
            transparent
            opacity={0.56}
            envMapIntensity={1.3}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Caustic ribbons — premium optical sweeps ──────────────── */

function CausticRibbons({
  pf,
  ribbonCount,
}: {
  pf: MutableRefObject<PointerField>;
  ribbonCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ribbons = useMemo(() => {
    const result: { geometry: THREE.TubeGeometry; color: string }[] = [];
    const colors = [
      SCENE_PALETTE.highlight,
      SCENE_PALETTE.secondary,
      SCENE_PALETTE.accent,
    ];
    for (let i = 0; i < ribbonCount; i++) {
      const startAngle = (i / ribbonCount) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      const segs = 32;
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const angle = startAngle + t * Math.PI * (1.1 + (i % 3) * 0.18);
        const radius = 2.2 + t * 4.4;
        const y = Math.sin(t * Math.PI * 2 + i * 0.7) * 0.65;
        pts.push(
          new THREE.Vector3(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius
          )
        );
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      result.push({
        geometry: new THREE.TubeGeometry(
          curve,
          36,
          0.018 + (i % 3) * 0.004,
          6,
          false
        ),
        color: colors[i % colors.length],
      });
    }
    return result;
  }, [ribbonCount]);

  useEffect(
    () => () => ribbons.forEach(ribbon => ribbon.geometry.dispose()),
    [ribbons]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const burst = pf.current.burst;
    groupRef.current.rotation.y += delta * (0.014 + burst * 0.02);
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.07) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {ribbons.map((ribbon, i) => (
        <mesh key={`caustic-ribbon-${i}`} geometry={ribbon.geometry}>
          <meshPhysicalMaterial
            color={ribbon.color}
            emissive={ribbon.color}
            emissiveIntensity={0.01}
            roughness={0.1}
            metalness={0.08}
            clearcoat={1}
            clearcoatRoughness={0.12}
            iridescence={0.2}
            iridescenceIOR={1.3}
            transparent
            opacity={0.03}
            transmission={0.18}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Prism dust — larger cinematic sparkle field ───────────── */

function PrismDust({
  pf,
  count,
}: {
  pf: MutableRefObject<PointerField>;
  count: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const colorAttr = useMemo(() => new Float32Array(count * 3), [count]);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.65;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const color =
        i % 3 === 0
          ? new THREE.Color(SCENE_PALETTE.highlight)
          : i % 3 === 1
            ? new THREE.Color(SCENE_PALETTE.secondary)
            : new THREE.Color(SCENE_PALETTE.accent);
      colorAttr[i * 3] = color.r;
      colorAttr[i * 3 + 1] = color.g;
      colorAttr[i * 3 + 2] = color.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    return geo;
  }, [colorAttr, count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const burst = pf.current.burst;
    pointsRef.current.rotation.y += delta * (0.01 + burst * 0.012);
    pointsRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.03) * 0.05;
    pointsRef.current.position.z = THREE.MathUtils.damp(
      pointsRef.current.position.z,
      -burst * 0.45,
      3,
      delta
    );
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.03}
        size={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
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
        keyIntensity + burst * 1.4,
        3,
        delta
      );
    }
    if (rimRef.current) {
      rimRef.current.intensity = THREE.MathUtils.damp(
        rimRef.current.intensity,
        rimIntensity + burst * 0.9,
        3,
        delta
      );
    }
    if (accentRef.current) {
      accentRef.current.intensity = THREE.MathUtils.damp(
        accentRef.current.intensity,
        2.2 + burst * 1.2,
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
        intensity={0.34}
        groundColor={SCENE_PALETTE.deep}
        color={SCENE_PALETTE.signal}
      />
      <pointLight
        ref={keyRef}
        position={[0.5, 1.1, 5.8]}
        color={SCENE_PALETTE.highlight}
        intensity={keyIntensity}
        distance={30}
        decay={1.8}
      />
      <pointLight
        ref={rimRef}
        position={[-6.5, 4.5, -2.5]}
        color={SCENE_PALETTE.secondary}
        intensity={rimIntensity}
        distance={35}
        decay={2}
      />
      <pointLight
        ref={accentRef}
        position={[5.6, -2.4, 3.6]}
        color={SCENE_PALETTE.warm}
        intensity={2.2}
        distance={25}
        decay={2.2}
      />
      <directionalLight
        position={[3.5, 6.5, 4]}
        intensity={0.64}
        color={SCENE_PALETTE.mist}
      />
      <directionalLight
        position={[-4, -3, -5]}
        intensity={0.18}
        color={SCENE_PALETTE.signal}
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
      {profile.eventHorizonRings > 0 && (
        <EventHorizonDisc pf={pf} ringCount={profile.eventHorizonRings} />
      )}
      {profile.magneticFieldLines > 0 && (
        <MagneticFieldLines pf={pf} lineCount={profile.magneticFieldLines} />
      )}
      {profile.resonanceWaveCount > 0 && (
        <ResonanceWaves pf={pf} waveCount={profile.resonanceWaveCount} />
      )}
      {profile.cometaryOrbiterCount > 0 && (
        <CometaryOrbiters pf={pf} count={profile.cometaryOrbiterCount} />
      )}
      {profile.volumetricRayCount > 0 && (
        <VolumetricRays pf={pf} rayCount={profile.volumetricRayCount} />
      )}
      {profile.enableSubspaceGrid && <SubspaceGrid pf={pf} />}
      {profile.quantumFluxStrands > 0 && (
        <QuantumFlux pf={pf} strandCount={profile.quantumFluxStrands} />
      )}
      {profile.sparkShowerCount > 0 && (
        <SparkShower pf={pf} count={profile.sparkShowerCount} />
      )}
      {profile.temporalEchoLayers > 0 && (
        <TemporalEchoes
          pf={pf}
          layerCount={profile.temporalEchoLayers}
          coreSpeed={profile.coreSpeed}
        />
      )}
      {profile.neuralWebNodes > 0 && (
        <NeuralWeb pf={pf} nodeCount={profile.neuralWebNodes} />
      )}
      {profile.enableGravitationalLens && <GravitationalLens pf={pf} />}
      {profile.solarFlareCount > 0 && (
        <SolarFlareArcs pf={pf} flareCount={profile.solarFlareCount} />
      )}
      {profile.darkMatterFilaments > 0 && (
        <DarkMatterWeb pf={pf} filamentCount={profile.darkMatterFilaments} />
      )}
      {profile.pulsarBeaconCount > 0 && (
        <PulsarBeacons pf={pf} beaconCount={profile.pulsarBeaconCount} />
      )}
      {profile.crystallineGrowthBranches > 0 && (
        <CrystallineGrowth
          pf={pf}
          branchCount={profile.crystallineGrowthBranches}
        />
      )}
      {profile.enableCosmicStrings && <CosmicStringResonance pf={pf} />}
      {profile.interferenceShellCount > 0 && (
        <InterferenceShells
          pf={pf}
          shellCount={profile.interferenceShellCount}
        />
      )}
      {profile.voidRippleCount > 0 && (
        <VoidRipples pf={pf} rippleCount={profile.voidRippleCount} />
      )}
      {profile.photonBloomCount > 0 && (
        <PhotonBloom pf={pf} bloomCount={profile.photonBloomCount} />
      )}
      {profile.haloGlyphCount > 0 && (
        <HaloGlyphs pf={pf} glyphCount={profile.haloGlyphCount} />
      )}
      {profile.enableChromaTorusField && <ChromaTorusField pf={pf} />}
      {profile.crownSpireCount > 0 && (
        <CrownSpires pf={pf} spireCount={profile.crownSpireCount} />
      )}
      {profile.meridianArcCount > 0 && (
        <MeridianArcs pf={pf} arcCount={profile.meridianArcCount} />
      )}
      {profile.relaySatelliteCount > 0 && (
        <RelaySatellites pf={pf} satelliteCount={profile.relaySatelliteCount} />
      )}
      {profile.petalFieldCount > 0 && (
        <PetalField pf={pf} petalCount={profile.petalFieldCount} />
      )}
      {profile.enableLitOrbitCage && <LitOrbitCage pf={pf} />}
      {profile.lightCardCount > 0 && (
        <LightCards pf={pf} cardCount={profile.lightCardCount} />
      )}
      {profile.glassOrbCount > 0 && (
        <GlassOrbiters pf={pf} orbCount={profile.glassOrbCount} />
      )}
      {profile.causticRibbonCount > 0 && (
        <CausticRibbons pf={pf} ribbonCount={profile.causticRibbonCount} />
      )}
      {profile.prismDustCount > 0 && (
        <PrismDust pf={pf} count={profile.prismDustCount} />
      )}
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

  const commitBurst = useCallback((amount: number) => {
    pf.current.burst = Math.min(pf.current.burst + amount, 1.5);
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
  }, []);

  useEffect(() => {
    commitBurst(1.1);
  }, [commitBurst, interactionPulse]);

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
          quality === 'ultra' ? 0.92 : quality === 'high' ? 0.95 : 0.98;
        gl.domElement.dataset.heroCanvas = 'true';
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => onReady?.());
        } else {
          onReady?.();
        }
      }}
      onPointerMove={e => {
        updatePointer(e.clientX, e.clientY);
        setInteractionState(cur => (cur === 'burst' ? cur : 'engaged'));
      }}
      onPointerDown={e => {
        updatePointer(e.clientX, e.clientY);
        pf.current.down = true;
        commitBurst(0.9);
      }}
      onPointerUp={() => {
        pf.current.down = false;
        setInteractionState(cur => (cur === 'burst' ? cur : 'engaged'));
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
      <ArtDirectedEnvironment mobile={mobileOptimized} />
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
            luminanceSmoothing={0.12}
            mipmapBlur
          />
          <Bloom
            intensity={
              sceneProfile.enableDualBloom
                ? sceneProfile.bloomIntensity * 0.12
                : 0
            }
            luminanceThreshold={Math.max(
              0.72,
              sceneProfile.bloomThreshold + 0.08
            )}
            luminanceSmoothing={0.9}
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
