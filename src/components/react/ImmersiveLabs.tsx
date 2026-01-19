/** @jsxImportSource react */
/** @jsxRuntime automatic */
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Float,
  Sparkles,
  Stars,
  Text,
  useCursor,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  DepthOfField,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Leva, useControls } from 'leva';
import Theatre from '@theatre/core';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

type Panel = {
  title: string;
  body: string;
  chips: string[];
};

type RigValues = {
  twist: number;
  lift: number;
  pulse: number;
  hueShift: number;
  orbit: number;
};

const topPanels: Panel[] = [
  {
    title: 'Adaptive narrative layers',
    body: 'Panels react to scroll velocity, beat timing, and viewport size to keep the story dense without feeling heavy.',
    chips: ['Scroll intelligence', 'Adaptive density', 'Velocity aware'],
  },
  {
    title: 'Smart interaction zones',
    body: 'Live UI blocks respond to pointer energy, device tilt, and ambient motion while staying readable.',
    chips: ['Pointer energy', 'Mobile tilt', 'Focus safety'],
  },
];

const bottomPanels: Panel[] = [
  {
    title: 'Content that animates with intent',
    body: 'Framer Motion panels, GSAP scroll hooks, and Splitting-powered typography keep the story kinetic.',
    chips: ['Framer Motion', 'GSAP staging', 'Splitting text'],
  },
  {
    title: 'Performance-aware fidelity',
    body: 'Dynamic render targets, reduced post FX on mobile, and live tuning controls keep visuals sharp.',
    chips: ['Leva controls', 'GPU scaling', 'Mobile-safe'],
  },
];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 900);
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return isMobile;
};

const Scene = ({ isMobile }: { isMobile: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const nodeGroup = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const pulseRingMat = useRef<THREE.MeshBasicMaterial>(null);
  const { camera, pointer } = useThree();
  const [hovered, setHovered] = useState<number | null>(null);
  const pulseRef = useRef(0);
  const hoverTarget = useRef(0);
  const hoverValue = useRef(0);

  useCursor(hovered !== null);

  const { bloom, chroma, noise, vignette, speed } = useControls('R3F', {
    bloom: { value: 0.85, min: 0.2, max: 2, step: 0.01 },
    chroma: { value: 0.0016, min: 0, max: 0.01, step: 0.0001 },
    noise: { value: 0.14, min: 0, max: 0.6, step: 0.01 },
    vignette: { value: 0.32, min: 0, max: 0.8, step: 0.01 },
    speed: { value: 0.6, min: 0.2, max: 1.4, step: 0.01 },
  });

  const theatre = useMemo(() => {
    const { getProject } = Theatre;
    const project = getProject('ImmersiveLabs');
    const sheet = project.sheet('Scene');
    const rig = sheet.object('Rig', {
      twist: 0.4,
      lift: 0.1,
      pulse: 0.3,
      hueShift: 0.12,
      orbit: 0.6,
    });
    return { sheet, rig };
  }, []);

  const rigValues = useRef<RigValues>(theatre.rig.value as RigValues);
  const chromaOffset = useMemo(
    () => new THREE.Vector2(chroma, chroma),
    [chroma]
  );

  const nodes = useMemo(() => {
    const count = isMobile ? 7 : 12;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      radius: 2.4 + (i % 3) * 0.5 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.6,
      height: (Math.random() - 0.5) * 1.6,
    }));
  }, [isMobile]);

  useEffect(() => {
    const unsubscribe = theatre.rig.onValuesChange(values => {
      rigValues.current = values as RigValues;
    });
    return () => unsubscribe();
  }, [theatre]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      theatre.sheet.sequence.position = progress * 6;
      raf = window.requestAnimationFrame(update);
    };
    update();
    return () => window.cancelAnimationFrame(raf);
  }, [theatre]);

  useFrame(({ clock }, dt) => {
    const time = clock.getElapsedTime() * speed;
    const rig = rigValues.current;

    const targetX = pointer.x * 0.6;
    const targetY = pointer.y * 0.4;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.lookAt(0, 0, 0);

    if (groupRef.current) {
      const rotationSpeed = hovered !== null ? time * 0.8 : time * 0.4;
      groupRef.current.rotation.y = rotationSpeed + rig.twist;
      groupRef.current.rotation.x = Math.sin(time * 0.4) * 0.2 + rig.lift;
      groupRef.current.position.y = Math.sin(time * 0.6) * 0.15;
    }

    if (coreRef.current) {
      coreRef.current.rotation.z += dt * 0.4;
    }

    if (coreMat.current) {
      coreMat.current.color.setHSL(0.62 + rig.hueShift, 0.8, 0.55);
      coreMat.current.emissive.setHSL(0.75 + rig.hueShift, 0.85, 0.25);
      coreMat.current.emissiveIntensity =
        0.7 + rig.pulse * 0.8 + hoverValue.current * 0.6;
    }

    if (nodeGroup.current) {
      nodeGroup.current.rotation.y = time * 0.2 + rig.orbit;
      nodeGroup.current.rotation.x = Math.sin(time * 0.3) * 0.1;

      nodeGroup.current.children.forEach((child, index) => {
        const node = nodes[index];
        if (!node) return;
        const angle = time * node.speed + node.offset;
        const wobble = Math.sin(time * 1.1 + node.offset) * 0.08;
        child.position.set(
          Math.cos(angle) * (node.radius + wobble),
          node.height + Math.sin(angle * 1.3) * 0.2,
          Math.sin(angle) * (node.radius + wobble)
        );
        const pulse = pulseRef.current;
        const isHovered = hovered === node.id;
        const scale = isHovered ? 1.35 + pulse * 0.2 : 1 + pulse * 0.1;
        child.scale.setScalar(scale);
      });
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += dt * 0.3;
      ringRef.current.scale.setScalar(1 + hoverValue.current * 0.08);
    }

    if (pulseRingRef.current && pulseRingMat.current) {
      const pulse = pulseRef.current;
      const scale = 1 + pulse * 0.55;
      pulseRingRef.current.scale.setScalar(scale);
      pulseRingMat.current.opacity = pulse * 0.5;
    }

    hoverValue.current += (hoverTarget.current - hoverValue.current) * 0.12;

    if (pulseRef.current > 0) {
      pulseRef.current = Math.max(0, pulseRef.current - dt * 0.8);
    }
  });

  return (
    <>
      <color attach="background" args={['#05070f']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 6, 4]} intensity={1.2} />
      <pointLight position={[-4, -3, 5]} intensity={1.1} />

      <group ref={groupRef}>
        <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.6}>
          <mesh ref={coreRef}>
            <icosahedronGeometry args={[1.35, 4]} />
            <meshPhysicalMaterial
              ref={coreMat}
              metalness={0.6}
              roughness={0.2}
              clearcoat={0.6}
              transmission={0.12}
              thickness={0.9}
            />
          </mesh>
        </Float>
        <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.5}>
          <mesh rotation={[0.4, 0, 0]}>
            <torusGeometry args={[2.2, 0.08, 24, 160]} />
            <meshStandardMaterial
              color={new THREE.Color(0.45, 0.6, 1)}
              emissive={new THREE.Color(0.2, 0.4, 0.9)}
              emissiveIntensity={0.6}
              roughness={0.4}
              metalness={0.4}
            />
          </mesh>
        </Float>
      </group>

      <group ref={nodeGroup}>
        {nodes.map(node => (
          <mesh
            key={node.id}
            onPointerOver={() => {
              setHovered(node.id);
              hoverTarget.current = 1;
            }}
            onPointerOut={() => {
              setHovered(null);
              hoverTarget.current = 0;
            }}
            onClick={() => {
              pulseRef.current = 1;
            }}
          >
            <sphereGeometry args={[0.12, 24, 24]} />
            <meshStandardMaterial
              color={new THREE.Color(0.4, 0.7, 1)}
              emissive={new THREE.Color(0.3, 0.5, 1)}
              emissiveIntensity={hovered === node.id ? 1.2 : 0.6}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>

      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.55, 120]} />
        <meshStandardMaterial
          color={new THREE.Color(0.25, 0.6, 1)}
          emissive={new THREE.Color(0.2, 0.4, 0.9)}
          emissiveIntensity={0.8}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={pulseRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.65, 2.72, 120]} />
        <meshBasicMaterial
          ref={pulseRingMat}
          color={new THREE.Color(0.3, 0.7, 1)}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <Sparkles
        count={isMobile ? 80 : 140}
        size={isMobile ? 2 : 3}
        speed={0.6}
        opacity={0.4}
        scale={6}
        color="#9bdbff"
      />
      {/* Warp Speed effect - denser and faster sparkles */}
      <Sparkles
        count={isMobile ? 120 : 220}
        size={isMobile ? 1.5 : 2.5}
        speed={1.8}
        opacity={0.6}
        scale={8}
        color="#ffffff"
      />
      <Stars radius={12} depth={8} count={isMobile ? 300 : 700} factor={2} />
      <Text
        position={[0, -1.9, 0]}
        fontSize={0.32}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
      >
        LIVE LAB
      </Text>

      <Environment preset="city" />

      <EffectComposer multisampling={isMobile ? 0 : 4}>
        <Bloom intensity={bloom} luminanceThreshold={0.3} />
        <ChromaticAberration
          offset={chromaOffset}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
        <DepthOfField
          focusDistance={0.02}
          focalLength={0.05}
          bokehScale={isMobile ? 0 : 2}
          blendFunction={isMobile ? BlendFunction.SKIP : BlendFunction.NORMAL}
        />
        <Noise opacity={noise} premultiply />
        <Vignette eskil={false} offset={0.2} darkness={vignette} />
      </EffectComposer>
    </>
  );
};

const PanelCard = ({ panel }: { panel: Panel }) => {
  const reduceMotion = useReducedMotion();
  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: 'easeOut' },
        viewport: { once: true, amount: 0.35 },
      };

  return (
    <motion.article className="ih-panel" data-ih-panel {...motionProps}>
      <h3 className="ih-title ih-split" data-split>
        {panel.title}
      </h3>
      <p className="ih-lede">{panel.body}</p>
      <div className="ih-pill-row">
        {panel.chips.map(chip => (
          <span className="ih-pill" key={chip}>
            {chip}
          </span>
        ))}
      </div>
    </motion.article>
  );
};

const ImmersiveLabs = () => {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const showControls = import.meta.env.DEV;

  const sceneMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 36 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.9, ease: 'easeOut' },
        viewport: { once: true, amount: 0.25 },
      };

  return (
    <div className="ih-labs">
      <div className="ih-labs-grid">
        {topPanels.map(panel => (
          <PanelCard key={panel.title} panel={panel} />
        ))}
      </div>

      <motion.section
        className="ih-panel ih-labs-scene"
        data-ih-panel
        {...sceneMotion}
      >
        <div className="ih-labs-canvas">
          <Canvas
            className="ih-r3f-canvas"
            dpr={isMobile ? 1 : [1, 2]}
            gl={{ antialias: !isMobile, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 6], fov: 48 }}
          >
            <Scene isMobile={isMobile} />
          </Canvas>
        </div>
        <div className="ih-labs-copy">
          <span className="ih-labs-tag">R3F LAB</span>
          <h3 className="ih-title ih-split" data-split>
            Theatre-driven 3D modules that evolve with the scroll
          </h3>
          <p className="ih-lede">
            The lab scene blends R3F, Drei, and postprocessing, while Theatre
            feeds the animation state from the live scroll to keep the geometry
            reactive.
          </p>
          <ul className="ih-labs-list">
            <li>Scroll-linked rig values and choreography</li>
            <li>Postprocessed glow with adaptive sampling</li>
            <li>Interactive constellation nodes with pulse feedback</li>
            <li>Mobile-tuned sparkles + reduced DPR</li>
          </ul>
        </div>
      </motion.section>

      <div className="ih-labs-grid">
        {bottomPanels.map(panel => (
          <PanelCard key={panel.title} panel={panel} />
        ))}
      </div>

      <Leva hidden={!showControls} collapsed />
    </div>
  );
};

export default ImmersiveLabs;
