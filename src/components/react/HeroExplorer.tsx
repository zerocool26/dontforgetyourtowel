/** @jsxImportSource react */
/** @jsxRuntime automatic */
import type { CSSProperties, MutableRefObject } from 'react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Float,
  ScrollControls,
  Sparkles,
  Stars,
  Text,
  useScroll,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import '@/styles/hero-explorer.css';

type QualityTier = 'desktop' | 'mobile' | 'low';

type BurstRef = MutableRefObject<number>;

type Chapter = {
  id: string;
  title: string;
  copy: string;
  cam: { position: [number, number, number]; lookAt: [number, number, number] };
  hue: number;
};

const chapters: Chapter[] = [
  {
    id: 'lens',
    title: 'Portal Lens',
    copy: 'Intro pulse: refractive torus ignites, guiding the scroll into the core.',
    cam: { position: [0, 0, 7], lookAt: [0, 0, 0] },
    hue: 210,
  },
  {
    id: 'nebula',
    title: 'Data Nebula',
    copy: 'Volumetric noise field and glyph sprites drift around the portal.',
    cam: { position: [0.8, 0.2, 5.8], lookAt: [0, 0, 0] },
    hue: 248,
  },
  {
    id: 'field',
    title: 'Magnetic Field',
    copy: 'Ribbon lines react to tilt/scroll; chroma ramps up with intensity.',
    cam: { position: [-0.6, 0.25, 5.2], lookAt: [0, 0, 0] },
    hue: 190,
  },
  {
    id: 'afterglow',
    title: 'Afterglow Lab',
    copy: 'Scene opens to reveal discovery rail thumbnails and micro shaders.',
    cam: { position: [0, -0.2, 6.2], lookAt: [0, 0, 0] },
    hue: 310,
  },
  {
    id: 'prism',
    title: 'Prismatic Shards',
    copy: 'Glass fragments wake up and orbit; scroll increases shimmer and density.',
    cam: { position: [0.35, 0.25, 5.35], lookAt: [0, 0, 0] },
    hue: 285,
  },
  {
    id: 'lattice',
    title: 'Data Lattice',
    copy: 'A faint lattice grid emerges behind the portal, bending with depth.',
    cam: { position: [-0.55, -0.05, 5.7], lookAt: [0, 0, 0] },
    hue: 220,
  },
  {
    id: 'flare',
    title: 'Ion Flare',
    copy: 'Energy ring surges; particles accelerate and the bloom blooms harder.',
    cam: { position: [0.0, 0.15, 5.05], lookAt: [0, 0, 0] },
    hue: 185,
  },
  {
    id: 'horizon',
    title: 'Horizon Drift',
    copy: 'Long tail: the portal stabilizes into a calm field with subtle motion.',
    cam: { position: [0.0, -0.35, 6.75], lookAt: [0, 0, 0] },
    hue: 205,
  },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const chapterGate = (
  chapterId: string,
  idx: number,
  nextIdx: number,
  t: number
) => {
  const currentId = chapters[idx]?.id;
  const nextId = chapters[nextIdx]?.id;
  if (currentId === chapterId) return 1 - t;
  if (nextId === chapterId) return t;
  return 0;
};

const getChapterBlend = (offset: number, length: number) => {
  const total = Math.max(1, length - 1);
  const rawProgress = offset * total;
  const idx = Math.min(length - 1, Math.max(0, Math.floor(rawProgress)));
  const nextIdx = Math.min(length - 1, idx + 1);
  const t = clamp01(rawProgress - idx);
  return { idx, nextIdx, t };
};

const useQualityTier = (): QualityTier => {
  const [tier, setTier] = useState<QualityTier>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const deviceMemory =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const lowMem = deviceMemory <= 4;
    const lowThreads = (navigator as { hardwareConcurrency?: number })
      .hardwareConcurrency
      ? ((navigator as { hardwareConcurrency?: number }).hardwareConcurrency ??
          8) < 6
      : false;

    if (coarse || lowMem || lowThreads) {
      setTier('mobile');
      return;
    }
    if (ua.includes('android') || ua.includes('iphone')) {
      setTier('mobile');
      return;
    }
    setTier('desktop');
  }, []);

  useEffect(() => {
    const save = () => (document.documentElement.dataset.quality = tier);
    save();
    return () => {
      delete document.documentElement.dataset.quality;
    };
  }, [tier]);

  return tier;
};

const CameraRig = ({ chapters }: { chapters: Chapter[] }) => {
  const scroll = useScroll();
  const { camera } = useThree();

  useFrame(() => {
    const { idx, nextIdx, t } = getChapterBlend(scroll.offset, chapters.length);

    const current = chapters[idx];
    const next = chapters[nextIdx];

    const pos = new THREE.Vector3().fromArray(current.cam.position);
    const posNext = new THREE.Vector3().fromArray(next.cam.position);
    pos.lerp(posNext, t);

    const look = new THREE.Vector3().fromArray(current.cam.lookAt);
    const lookNext = new THREE.Vector3().fromArray(next.cam.lookAt);
    look.lerp(lookNext, t);

    camera.position.lerp(pos, 0.08);
    camera.lookAt(look);
  });

  return null;
};

const NebulaField = ({ quality }: { quality: QualityTier }) => {
  const count =
    quality === 'desktop' ? 2200 : quality === 'mobile' ? 1100 : 700;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 6 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.35;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, [count]);

  return (
    <points rotation={[0.08, 0.18, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={quality === 'desktop' ? 0.06 : 0.08}
        sizeAttenuation
        color={new THREE.Color('#8dd8ff')}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
};

const RibbonField = ({ quality }: { quality: QualityTier }) => {
  const ribbonCount = quality === 'desktop' ? 18 : 10;
  const ribbonPoints = useMemo(
    () =>
      Array.from({ length: ribbonCount }).map(() => {
        const pts: THREE.Vector3[] = [];
        const base = (Math.random() - 0.5) * 1.4;
        for (let i = 0; i < 42; i += 1) {
          const t = i / 41;
          const radius = 1.8 + Math.sin(t * Math.PI * 2 + base) * 0.18;
          const y = (t - 0.5) * 2.2;
          const angle = t * Math.PI * 2 + base;
          pts.push(
            new THREE.Vector3(
              Math.cos(angle) * radius,
              y,
              Math.sin(angle) * radius
            )
          );
        }
        return pts;
      }),
    [ribbonCount]
  );

  return (
    <group rotation={[Math.PI / 2.4, 0, 0]}>
      {ribbonPoints.map((pts, i) => (
        <mesh key={i}>
          <tubeGeometry
            args={[new THREE.CatmullRomCurve3(pts), 120, 0.02, 6, false]}
          />
          <meshStandardMaterial
            color={new THREE.Color(`hsl(${180 + i * 8}, 68%, 64%)`)}
            emissive={new THREE.Color(`hsl(${190 + i * 7}, 82%, 40%)`)}
            emissiveIntensity={quality === 'desktop' ? 1.2 : 0.8}
            roughness={0.3}
            metalness={0.15}
            transparent
            opacity={0.65}
          />
        </mesh>
      ))}
    </group>
  );
};

const EnergyRing = ({ quality }: { quality: QualityTier }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const scroll = useScroll();

  useFrame(({ clock }) => {
    if (!ringRef.current || !matRef.current) return;
    const { idx, nextIdx, t } = getChapterBlend(scroll.offset, chapters.length);
    const hue = THREE.MathUtils.lerp(
      chapters[idx].hue,
      chapters[nextIdx].hue,
      t
    );

    const time = clock.getElapsedTime();
    const progress = scroll.offset;
    const swell = 0.08 + Math.sin(time * 1.4) * 0.02;
    const pulse =
      0.22 + Math.sin((progress * 10 + time * 0.75) * Math.PI * 2) * 0.08;
    const scale = 1 + swell + progress * 0.12;

    ringRef.current.rotation.z = time * 0.22 + progress * 1.15;
    ringRef.current.scale.setScalar(scale);
    matRef.current.opacity =
      quality === 'desktop' ? 0.22 + pulse : 0.14 + pulse * 0.6;
    matRef.current.color.setHSL(hue / 360, 0.85, 0.62);
  });

  return (
    <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.35, 2.75, quality === 'desktop' ? 240 : 160]} />
      <meshBasicMaterial
        ref={matRef}
        transparent
        opacity={0.18}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#22d3ee"
      />
    </mesh>
  );
};

const Shockwave = ({ burstRef }: { burstRef: BurstRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const ageRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;

    if (burstRef.current > 0.001 && ageRef.current === 0) {
      // Arm on burst start.
      ageRef.current = 0.0001;
    }

    if (ageRef.current > 0) {
      ageRef.current += delta;
      const t = Math.min(1, ageRef.current / 1.15);
      const ease = 1 - Math.pow(1 - t, 3);
      meshRef.current.scale.setScalar(1 + ease * 2.2);
      matRef.current.opacity = (1 - ease) * 0.22;
      meshRef.current.rotation.z += delta * 0.35;
      if (t >= 1) ageRef.current = 0;
    } else {
      matRef.current.opacity = 0;
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.25, 2.55, 220]} />
      <meshBasicMaterial
        ref={matRef}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#60a5fa"
      />
    </mesh>
  );
};

const AuroraVeil = ({
  quality,
  burstRef,
}: {
  quality: QualityTier;
  burstRef: BurstRef;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const scroll = useScroll();

  useFrame(({ clock }, delta) => {
    if (!meshRef.current || !matRef.current) return;
    const t = clock.getElapsedTime();
    const progress = scroll.offset;
    const burst = burstRef.current;

    meshRef.current.rotation.z = t * 0.06 + progress * 0.35;
    meshRef.current.position.y = -0.2 + Math.sin(t * 0.35) * 0.12;
    meshRef.current.scale.setScalar(1.15 + progress * 0.25);

    const alphaBase = quality === 'desktop' ? 0.16 : 0.11;
    matRef.current.opacity = alphaBase + burst * 0.22;
    // Subtle hue drift: keep it filmic (no full rainbow).
    const hue = 205 + Math.sin(t * 0.12) * 18 + progress * 22;
    matRef.current.color.setHSL(hue / 360, 0.78, 0.62);

    // Decay burst here too so it still feels responsive even if other systems are off.
    burstRef.current = Math.max(0, burstRef.current - delta * 0.9);
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.15, -2.6]}
      rotation={[0, 0, 0.1]}
      frustumCulled={false}
    >
      <planeGeometry args={[10, 6, 1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        transparent
        opacity={0.14}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        color="#60a5fa"
      />
    </mesh>
  );
};

const PrismaticShards = ({ quality }: { quality: QualityTier }) => {
  const count = quality === 'desktop' ? 96 : quality === 'mobile' ? 56 : 40;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const scroll = useScroll();

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const r = 2.4 + Math.random() * 2.4;
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.35;
        const y = (Math.random() - 0.5) * 2.1;
        return {
          r,
          a,
          y,
          spin: 0.15 + Math.random() * 0.45,
          tilt: (Math.random() - 0.5) * 0.8,
          drift: (Math.random() - 0.5) * 0.18,
          s: 0.12 + Math.random() * 0.22,
        };
      }),
    [count]
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();
    const progress = scroll.offset;

    const { idx, nextIdx, t } = getChapterBlend(progress, chapters.length);
    const hue = THREE.MathUtils.lerp(
      chapters[idx].hue,
      chapters[nextIdx].hue,
      t
    );
    if (matRef.current) {
      matRef.current.emissive.setHSL(hue / 360, 0.65, 0.35);
      matRef.current.color.setHSL(hue / 360, 0.35, 0.62);
      matRef.current.opacity = quality === 'desktop' ? 0.42 : 0.32;
    }

    for (let i = 0; i < seeds.length; i += 1) {
      const s = seeds[i];
      const angle = s.a + time * s.spin + progress * 2.4;
      const wobble = Math.sin(time * 0.9 + i * 0.35) * 0.08;
      const rr = s.r + wobble + progress * 0.25;

      dummy.position.set(
        Math.cos(angle) * rr,
        s.y + Math.sin(time * 0.7 + i) * 0.08 + s.drift * (progress - 0.5),
        Math.sin(angle) * rr
      );

      dummy.rotation.set(
        s.tilt + time * (0.12 + i * 0.0009),
        time * (0.2 + i * 0.0011) + progress * 1.1,
        angle * 0.35
      );

      const scale = s.s * (1 + Math.sin(time + i * 0.2) * 0.15);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[0.18, 0]} />
      <meshStandardMaterial
        ref={matRef}
        transparent
        opacity={0.38}
        roughness={0.25}
        metalness={0.4}
        emissive={new THREE.Color('#1d4ed8')}
        emissiveIntensity={quality === 'desktop' ? 0.8 : 0.55}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

const ScrollAtmosphere = () => {
  const scroll = useScroll();
  const { gl, scene } = useThree();
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    hostRef.current = gl.domElement.closest(
      '.hero-explorer'
    ) as HTMLElement | null;
    return () => {
      if (!hostRef.current) return;
      hostRef.current.style.removeProperty('--hero-progress');
      hostRef.current.style.removeProperty('--hero-hue');
      hostRef.current.style.removeProperty('--hero-energy');
      hostRef.current.style.removeProperty('--hero-reveal');
      delete hostRef.current.dataset.heroEnd;
    };
  }, [gl]);

  useFrame(({ clock }) => {
    const host = hostRef.current;
    const time = clock.getElapsedTime();
    const progress = scroll.offset;

    const { idx, nextIdx, t } = getChapterBlend(progress, chapters.length);
    const hue = THREE.MathUtils.lerp(
      chapters[idx].hue,
      chapters[nextIdx].hue,
      t
    );

    const energy = clamp01(
      0.15 +
        Math.abs(Math.sin((progress * 1.15 + time * 0.12) * Math.PI * 2)) * 0.55
    );

    if (host) {
      host.style.setProperty('--hero-progress', progress.toFixed(4));
      host.style.setProperty('--hero-hue', hue.toFixed(1));
      host.style.setProperty('--hero-energy', energy.toFixed(4));

      // Reveal bottom info only near the end of the scroll.
      const reveal = clamp01((progress - 0.88) / 0.12);
      host.style.setProperty('--hero-reveal', reveal.toFixed(4));
      if (progress > 0.985) host.dataset.heroEnd = '1';
      else delete host.dataset.heroEnd;
    }

    if (scene.fog) {
      const fog = scene.fog as THREE.Fog;
      fog.color.setHSL(hue / 360, 0.35, 0.055);
    }
  });

  return null;
};

const PortalTorus = ({ quality }: { quality: QualityTier }) => {
  const torusRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!torusRef.current) return;
    torusRef.current.rotation.x = Math.sin(t * 0.34) * 0.22 + Math.PI / 2.2;
    torusRef.current.rotation.y = t * 0.18;
  });

  return (
    <Float speed={0.65} rotationIntensity={0.35} floatIntensity={0.6}>
      <mesh ref={torusRef} castShadow receiveShadow>
        <torusGeometry args={[2.05, 0.32, 64, 180]} />
        <meshPhysicalMaterial
          transparent
          transmission={quality === 'desktop' ? 0.9 : 0.7}
          thickness={1.4}
          roughness={0.1}
          metalness={0.25}
          clearcoat={0.8}
          clearcoatRoughness={0.12}
          color={new THREE.Color('#5ee3ff')}
          emissive={new THREE.Color('#5ac8ff')}
          emissiveIntensity={0.4}
          ior={1.35}
        />
      </mesh>
    </Float>
  );
};

const LatticePlane = ({ quality }: { quality: QualityTier }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const scroll = useScroll();

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    const { idx, nextIdx, t } = getChapterBlend(scroll.offset, chapters.length);
    const gate = chapterGate('lattice', idx, nextIdx, t);
    const time = clock.getElapsedTime();

    const hue = THREE.MathUtils.lerp(
      chapters[idx].hue,
      chapters[nextIdx].hue,
      t
    );
    meshRef.current.rotation.x = Math.PI / 2.1 + Math.sin(time * 0.18) * 0.08;
    meshRef.current.rotation.z = time * 0.06;
    meshRef.current.position.z = -3.2;
    meshRef.current.scale.setScalar(1.0 + scroll.offset * 0.25);

    const base = quality === 'desktop' ? 0.22 : 0.14;
    matRef.current.opacity = gate * base;
    matRef.current.color.setHSL(hue / 360, 0.55, 0.62);
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry
        args={[
          12,
          12,
          quality === 'desktop' ? 64 : 32,
          quality === 'desktop' ? 64 : 32,
        ]}
      />
      <meshBasicMaterial
        ref={matRef}
        transparent
        opacity={0}
        wireframe
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#22d3ee"
      />
    </mesh>
  );
};

const IonJets = ({ quality }: { quality: QualityTier }) => {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const scroll = useScroll();

  useFrame(({ clock }) => {
    if (!groupRef.current || !matRef.current) return;
    const { idx, nextIdx, t } = getChapterBlend(scroll.offset, chapters.length);
    const gate = chapterGate('flare', idx, nextIdx, t);
    const time = clock.getElapsedTime();

    groupRef.current.rotation.y = time * 0.32 + scroll.offset * 1.2;
    groupRef.current.rotation.z = Math.sin(time * 0.22) * 0.2;

    const hue = THREE.MathUtils.lerp(
      chapters[idx].hue,
      chapters[nextIdx].hue,
      t
    );
    matRef.current.color.setHSL(hue / 360, 0.9, 0.62);
    matRef.current.opacity = gate * (quality === 'desktop' ? 0.22 : 0.14);
  });

  const jets = Array.from({ length: quality === 'desktop' ? 8 : 6 }).map(
    (_, i) => {
      const a = (i / (quality === 'desktop' ? 8 : 6)) * Math.PI * 2;
      return { i, a };
    }
  );

  return (
    <group ref={groupRef} position={[0, 0.05, 0]}>
      {jets.map(jet => (
        <mesh
          key={jet.i}
          position={[Math.cos(jet.a) * 1.35, 0.0, Math.sin(jet.a) * 1.35]}
          rotation={[Math.PI / 2, 0, jet.a]}
        >
          <coneGeometry args={[0.12, 1.9, 18, 1, true]} />
          <meshBasicMaterial
            ref={matRef}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color="#22d3ee"
          />
        </mesh>
      ))}
    </group>
  );
};

const HorizonHalo = ({ quality }: { quality: QualityTier }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const scroll = useScroll();

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    const { idx, nextIdx, t } = getChapterBlend(scroll.offset, chapters.length);
    const gate = chapterGate('horizon', idx, nextIdx, t);
    const time = clock.getElapsedTime();
    const hue = THREE.MathUtils.lerp(
      chapters[idx].hue,
      chapters[nextIdx].hue,
      t
    );

    meshRef.current.rotation.z = time * 0.08;
    meshRef.current.scale.setScalar(1.25 + Math.sin(time * 0.24) * 0.03);
    matRef.current.opacity = gate * (quality === 'desktop' ? 0.16 : 0.12);
    matRef.current.color.setHSL(hue / 360, 0.65, 0.6);
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.15, -0.8]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[3.1, 3.55, quality === 'desktop' ? 240 : 160]} />
      <meshBasicMaterial
        ref={matRef}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#60a5fa"
      />
    </mesh>
  );
};

const GlyphOrbit = ({ quality }: { quality: QualityTier }) => {
  const glyphs = useMemo(
    () =>
      Array.from({ length: quality === 'desktop' ? 32 : 18 }).map((_, i) => ({
        id: i,
        radius: 2.6 + Math.random() * 0.6,
        speed: 0.25 + Math.random() * 0.25,
        offset: Math.random() * Math.PI * 2,
        char: ['∆', 'Σ', 'λ', 'Ω', 'Φ', 'Ψ'][i % 6],
      })),
    [quality]
  );

  return (
    <group>
      {glyphs.map(glyph => (
        <Text
          key={glyph.id}
          position={[
            Math.cos(glyph.offset) * glyph.radius,
            0.2 + Math.sin(glyph.offset * 1.5) * 0.6,
            Math.sin(glyph.offset) * glyph.radius,
          ]}
          fontSize={quality === 'desktop' ? 0.32 : 0.26}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          rotation={[Math.PI / 2, 0, 0]}
        >
          {glyph.char}
        </Text>
      ))}
    </group>
  );
};

const Scene = ({ quality }: { quality: QualityTier }) => {
  const burstRef = useRef(0);
  const bloomRef = useRef<any>(null);
  const chromaRef = useRef<any>(null);
  const noiseRef = useRef<any>(null);
  const scroll = useScroll();

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const onBurst = () => {
      burstRef.current = 1;
    };
    window.addEventListener('hero:burst', onBurst as EventListener);
    return () =>
      window.removeEventListener('hero:burst', onBurst as EventListener);
  }, []);

  useFrame((_, delta) => {
    const burst = burstRef.current;
    const progress = scroll.offset;
    const energy = 0.25 + progress * 0.55 + burst * 0.85;

    // Mutate post FX live for “smart” responsiveness.
    if (bloomRef.current) {
      bloomRef.current.intensity =
        (quality === 'desktop' ? 0.95 : 0.55) +
        energy * (quality === 'desktop' ? 0.55 : 0.35);
    }
    if (chromaRef.current) {
      const amt = quality === 'desktop' ? 0.0014 : 0.001;
      chromaRef.current.offset?.set(
        amt + burst * 0.0022,
        amt * 0.7 + burst * 0.0016
      );
    }
    if (noiseRef.current) {
      noiseRef.current.opacity =
        (quality === 'desktop' ? 0.04 : 0.025) + burst * 0.055;
    }

    // If reduced motion is on, keep bursts extremely subtle.
    if (reducedMotion) {
      burstRef.current = Math.max(0, burstRef.current - delta * 1.8);
    }
  });

  return (
    <>
      <ScrollAtmosphere />
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 8, 28]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 8, 6]}
        intensity={1.2}
        color={new THREE.Color('#dbeafe')}
      />
      <pointLight position={[-6, -2, 5]} intensity={1.1} color="#60a5fa" />
      <CameraRig chapters={chapters} />

      <Sparkles
        count={quality === 'desktop' ? 120 : 80}
        size={quality === 'desktop' ? 3 : 2.4}
        speed={0.35}
        opacity={0.32}
        scale={8}
        color="#8dd8ff"
      />

      <Stars
        radius={16}
        depth={18}
        count={quality === 'desktop' ? 1200 : 700}
        factor={2.4}
        saturation={0.18}
        fade
      />

      <PortalTorus quality={quality} />
      {!reducedMotion && <EnergyRing quality={quality} />}
      {!reducedMotion && <AuroraVeil quality={quality} burstRef={burstRef} />}
      {!reducedMotion && <Shockwave burstRef={burstRef} />}
      {!reducedMotion && <LatticePlane quality={quality} />}
      {!reducedMotion && <IonJets quality={quality} />}
      {!reducedMotion && <HorizonHalo quality={quality} />}
      <GlyphOrbit quality={quality} />
      <NebulaField quality={quality} />
      {!reducedMotion && <PrismaticShards quality={quality} />}
      {!reducedMotion && <RibbonField quality={quality} />}

      <Environment preset="city" />

      {!reducedMotion && (
        <EffectComposer multisampling={quality === 'desktop' ? 4 : 0}>
          <Bloom
            ref={bloomRef}
            intensity={quality === 'desktop' ? 1.05 : 0.55}
            luminanceThreshold={0.35}
          />
          <ChromaticAberration
            ref={chromaRef}
            offset={new THREE.Vector2(0.0016, 0.0012)}
            blendFunction={BlendFunction.NORMAL}
            radialModulation={false}
            modulationOffset={0}
          />
          <Noise
            ref={noiseRef}
            opacity={quality === 'desktop' ? 0.045 : 0.025}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.68} />
        </EffectComposer>
      )}
    </>
  );
};

const DiscoveryRail = ({ onBurst }: { onBurst: () => void }) => {
  const items = [
    {
      id: 'shaders',
      title: 'Shader Lab',
      desc: 'On-demand mini shaders; swap palettes per chapter.',
    },
    {
      id: 'physics',
      title: 'Physics Toys',
      desc: 'GPU particles with curl noise; single tap to detonate.',
    },
    {
      id: 'portals',
      title: 'Portal Variants',
      desc: 'Refraction presets for lens, ripple, and prismatic glass.',
    },
    {
      id: 'aurora',
      title: 'Aurora Veil',
      desc: 'Scroll-synced hue grading + low-noise fog veil for depth.',
    },
    {
      id: 'shards',
      title: 'Prism Shards',
      desc: 'Instanced prismatic fragments orbit and shimmer as you scroll.',
    },
  ];

  return (
    <div className="hero-explorer__rail" aria-label="Discovery rail">
      {items.map(item => (
        <article key={item.id} className="hero-explorer__rail-card">
          <div className="hero-explorer__rail-pill">{item.title}</div>
          <p>{item.desc}</p>
          <button
            type="button"
            className="hero-explorer__rail-btn"
            onClick={onBurst}
            aria-label={`${item.title}: trigger burst demo`}
          >
            Trigger burst
          </button>
        </article>
      ))}
    </div>
  );
};

const HeroExplorer = () => {
  const quality = useQualityTier();

  const dpr = useMemo(() => {
    const target =
      quality === 'desktop' ? 1.75 : quality === 'mobile' ? 1.35 : 1;
    return Math.min(
      target,
      typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1.5) : 1.25
    );
  }, [quality]);

  const pages = chapters.length + 0.8;

  const heroPagesForCss = useMemo(() => {
    // Slightly longer than ScrollControls pages so the sticky + rail feels spacious.
    const target = Math.max(6, Math.round(pages * 1.15));
    return String(target);
  }, [pages]);

  return (
    <section
      className="hero-explorer"
      data-hero-quality={quality}
      style={{ '--hero-pages': heroPagesForCss } as CSSProperties}
    >
      <div className="hero-explorer__sticky">
        <Canvas
          onPointerDown={() => {
            window.dispatchEvent(new CustomEvent('hero:burst'));
          }}
          dpr={dpr}
          gl={{
            antialias: quality === 'desktop',
            powerPreference: 'high-performance',
          }}
          camera={{ position: [0, 0, 7], fov: 46 }}
        >
          <Suspense fallback={null}>
            <ScrollControls pages={pages} damping={0.18}>
              <Scene quality={quality} />
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>

      <div className="hero-explorer__post" aria-label="Portal details">
        <div className="hero-explorer__post-inner">
          <div className="hero-explorer__post-head">
            <p className="hero-explorer__post-kicker">Portal Index</p>
            <h2 className="hero-explorer__post-title">
              Advanced motion showcase
            </h2>
            <p className="hero-explorer__post-sub">
              The 3D scene stays clean while you scroll. These notes and demos
              appear only at the end.
            </p>
          </div>

          <div className="hero-explorer__chapters" aria-label="Chapters">
            {chapters.map((ch, idx) => (
              <article key={ch.id} className="hero-explorer__chapter">
                <div className="hero-explorer__chapter-num">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="hero-explorer__chapter-body">
                  <h3>{ch.title}</h3>
                  <p>{ch.copy}</p>
                </div>
              </article>
            ))}
          </div>

          <DiscoveryRail
            onBurst={() => {
              window.dispatchEvent(new CustomEvent('hero:burst'));
            }}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroExplorer;
