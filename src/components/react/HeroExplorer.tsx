/** @jsxImportSource react */
/** @jsxRuntime automatic */
import type { CSSProperties } from 'react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Float,
  Scroll,
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
];

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
    const save = () => document.documentElement.dataset.quality = tier;
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
    const total = Math.max(1, chapters.length - 1);
    const rawProgress = scroll.offset * total;
    const idx = Math.min(chapters.length - 1, Math.max(0, Math.floor(rawProgress)));
    const nextIdx = Math.min(chapters.length - 1, idx + 1);
    const t = Math.min(1, Math.max(0, rawProgress - idx));

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
  const count = quality === 'desktop' ? 2200 : quality === 'mobile' ? 1100 : 700;
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
          <tubeGeometry args={[new THREE.CatmullRomCurve3(pts), 120, 0.02, 6, false]} />
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
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
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
      <GlyphOrbit quality={quality} />
      <NebulaField quality={quality} />
      {!reducedMotion && <RibbonField quality={quality} />}

      <Scroll html>
        <div className="hero-explorer__labels">
          {chapters.map((ch, idx) => (
            <div
              key={ch.id}
              className="hero-explorer__label"
              style={{ '--i': idx } as CSSProperties}
            >
              <p className="hero-explorer__kicker">{String(idx + 1).padStart(2, '0')}</p>
              <h3>{ch.title}</h3>
              <p>{ch.copy}</p>
            </div>
          ))}
        </div>
      </Scroll>

      <Environment preset="city" />

      {!reducedMotion && (
        <EffectComposer multisampling={quality === 'desktop' ? 4 : 0}>
          <Bloom intensity={quality === 'desktop' ? 1.05 : 0.55} luminanceThreshold={0.35} />
          <ChromaticAberration
            offset={new THREE.Vector2(0.0016, 0.0012)}
            blendFunction={BlendFunction.NORMAL}
            radialModulation={false}
            modulationOffset={0}
          />
          <Noise opacity={quality === 'desktop' ? 0.045 : 0.025} />
          <Vignette eskil={false} offset={0.22} darkness={0.68} />
        </EffectComposer>
      )}
    </>
  );
};

const DiscoveryRail = () => {
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
  ];

  return (
    <div className="hero-explorer__rail" aria-label="Discovery rail">
      {items.map(item => (
        <article key={item.id} className="hero-explorer__rail-card">
          <div className="hero-explorer__rail-pill">{item.title}</div>
          <p>{item.desc}</p>
          <button type="button" className="hero-explorer__rail-btn">
            Load on demand
          </button>
        </article>
      ))}
    </div>
  );
};

const HeroExplorer = () => {
  const quality = useQualityTier();
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setIntroDone(true), 2400);
    return () => window.clearTimeout(t);
  }, []);

  const dpr = useMemo(() => {
    const target = quality === 'desktop' ? 1.75 : quality === 'mobile' ? 1.35 : 1;
    return Math.min(target, typeof window !== 'undefined' ? window.devicePixelRatio ?? 1.5 : 1.25);
  }, [quality]);

  const pages = chapters.length + 0.8;

  return (
    <section className="hero-explorer" data-hero-quality={quality}>
      <div className="hero-explorer__sticky">
        <Canvas
          dpr={dpr}
          gl={{ antialias: quality === 'desktop', powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 7], fov: 46 }}
        >
          <Suspense fallback={null}>
            <ScrollControls pages={pages} damping={0.18}>
              <Scene quality={quality} />
            </ScrollControls>
          </Suspense>
        </Canvas>
        {!introDone && (
          <div className="hero-explorer__intro">
            <p className="hero-explorer__intro-kicker">Immersive hero v2</p>
            <h2>Scrolling reveals the layers.</h2>
            <p>2–3s cinematic intro, then the scene hands off to scroll.</p>
          </div>
        )}
      </div>

      <DiscoveryRail />
    </section>
  );
};

export default HeroExplorer;
