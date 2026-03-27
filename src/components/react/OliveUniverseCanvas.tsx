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
import { Sparkles, Stars } from '@react-three/drei';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import {
  SCENE_PALETTE,
  type QualityTier,
  type SceneProfile,
} from './olive-universe-config';

type OliveDebugWindow = Window & {
  __OLIVE_FORCE_STABILITY_ASSIST__?: boolean;
};

type PointerField = {
  target: THREE.Vector2;
  current: THREE.Vector2;
  down: boolean;
  burst: number;
  engagement: number;
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

function FirstFrameReadyReporter({ onReady }: { onReady?: () => void }) {
  const readyRef = useRef(false);

  useFrame(() => {
    if (readyRef.current) {
      return;
    }

    readyRef.current = true;
    onReady?.();
  });

  return null;
}

function AdaptiveDpr({ baseDpr }: { baseDpr: number }) {
  const current = useThree(state => state.performance.current);
  const setDpr = useThree(state => state.setDpr);

  useEffect(() => {
    const dpr = Math.max(
      1,
      Math.min(baseDpr, baseDpr * (0.78 + current * 0.22))
    );
    setDpr(Number(dpr.toFixed(2)));
  }, [baseDpr, current, setDpr]);

  return null;
}

function PerformanceBudgetGuard({
  enabled,
  onExceeded,
}: {
  enabled: boolean;
  onExceeded?: () => void;
}) {
  const consecutiveDropsRef = useRef(0);
  const hasTriggeredRef = useRef(false);

  useFrame((_, delta) => {
    if (!enabled || hasTriggeredRef.current) {
      return;
    }

    if (typeof window !== 'undefined') {
      const debugWindow = window as OliveDebugWindow;
      if (debugWindow.__OLIVE_FORCE_STABILITY_ASSIST__) {
        hasTriggeredRef.current = true;
        onExceeded?.();
        return;
      }
    }

    const fps = delta > 0 ? 1 / delta : 60;
    if (fps < 26) {
      consecutiveDropsRef.current += 1;
    } else {
      consecutiveDropsRef.current = Math.max(
        0,
        consecutiveDropsRef.current - 1
      );
    }

    if (consecutiveDropsRef.current > 40) {
      hasTriggeredRef.current = true;
      onExceeded?.();
    }
  });

  return null;
}

function CameraRig({
  pointerFieldRef,
  shouldAnimate,
  mobileOptimized,
  fieldStrength,
}: {
  pointerFieldRef: MutableRefObject<PointerField>;
  shouldAnimate: boolean;
  mobileOptimized: boolean;
  fieldStrength: number;
}) {
  const { camera } = useThree();
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredPosition = useMemo(() => new THREE.Vector3(0, 0, 7.8), []);

  useFrame((state, delta) => {
    const pointerField = pointerFieldRef.current;
    pointerField.current.lerp(pointerField.target, shouldAnimate ? 0.08 : 0.12);
    pointerField.burst = THREE.MathUtils.damp(
      pointerField.burst,
      0,
      2.8,
      delta
    );
    pointerField.engagement = THREE.MathUtils.damp(
      pointerField.engagement,
      pointerField.down ? 1 : 0.15,
      3.2,
      delta
    );

    const t = state.clock.elapsedTime;
    const orbitRadius = mobileOptimized ? 0.32 : 0.55;
    const orbitSpeed = shouldAnimate ? 0.12 : 0.04;
    const driftX = pointerField.current.x * fieldStrength;
    const driftY = pointerField.current.y * fieldStrength * 0.68;
    const pushIn = pointerField.burst * 0.48 + pointerField.engagement * 0.18;

    desiredPosition.set(
      Math.cos(t * orbitSpeed) * orbitRadius + driftX,
      0.25 + Math.sin(t * orbitSpeed * 0.85) * 0.18 + driftY,
      7.8 - pushIn
    );

    camera.position.lerp(desiredPosition, shouldAnimate ? 0.06 : 0.12);
    lookTarget.set(driftX * 0.5, driftY * 0.4, 0);
    camera.lookAt(lookTarget);
  });

  return null;
}

function PulseCore({
  pointerFieldRef,
  shouldAnimate,
  haloScale,
}: {
  pointerFieldRef: MutableRefObject<PointerField>;
  shouldAnimate: boolean;
  haloScale: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const shellMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const coreMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    const pointerField = pointerFieldRef.current;
    const pulse =
      1 + pointerField.burst * 0.08 + pointerField.engagement * 0.04;
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(t * 0.18) * 0.12;
      groupRef.current.rotation.y += delta * (shouldAnimate ? 0.22 : 0.08);
      groupRef.current.rotation.z = Math.cos(t * 0.14) * 0.08;
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, pulse, 4.2, delta)
      );
    }

    if (shellRef.current) {
      shellRef.current.rotation.y += delta * 0.14;
      shellRef.current.rotation.z -= delta * 0.06;
    }

    if (shellMaterialRef.current) {
      shellMaterialRef.current.emissiveIntensity = THREE.MathUtils.damp(
        shellMaterialRef.current.emissiveIntensity,
        1 + pointerField.burst * 1.2,
        4,
        delta
      );
    }

    if (coreMaterialRef.current) {
      coreMaterialRef.current.emissiveIntensity = THREE.MathUtils.damp(
        coreMaterialRef.current.emissiveIntensity,
        1.3 + pointerField.burst * 1.4,
        4,
        delta
      );
    }

    if (ringMaterialRef.current) {
      ringMaterialRef.current.opacity = THREE.MathUtils.damp(
        ringMaterialRef.current.opacity,
        0.18 + pointerField.burst * 0.28,
        3,
        delta
      );
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={shellRef} scale={haloScale}>
        <icosahedronGeometry args={[1.95, 3]} />
        <meshPhysicalMaterial
          ref={shellMaterialRef}
          color={SCENE_PALETTE.tertiary}
          emissive={SCENE_PALETTE.secondary}
          emissiveIntensity={1.2}
          roughness={0.04}
          metalness={0.32}
          transparent
          opacity={0.26}
          transmission={0.44}
          thickness={0.8}
          wireframe
        />
      </mesh>

      <mesh scale={0.9}>
        <octahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          ref={coreMaterialRef}
          color={SCENE_PALETTE.highlight}
          emissive={SCENE_PALETTE.accent}
          emissiveIntensity={1.6}
          roughness={0.18}
          metalness={0.22}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.8, 0.03, 16, 180]} />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color={SCENE_PALETTE.secondary}
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, Math.PI / 3, 0]}>
        <torusGeometry args={[3.35, 0.02, 16, 180]} />
        <meshBasicMaterial
          color={SCENE_PALETTE.accent}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function RibbonField({
  count,
  pointerFieldRef,
}: {
  count: number;
  pointerFieldRef: MutableRefObject<PointerField>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ribbons = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const radius = 2.4 + index * 0.35;
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 8 }, (_, pointIndex) => {
          const angle = (pointIndex / 8) * Math.PI * 2;
          return new THREE.Vector3(
            Math.cos(angle + index * 0.4) * radius,
            Math.sin(angle * 1.4 + index) * 0.9,
            Math.sin(angle + index * 0.7) * radius * 0.42
          );
        }),
        true
      );

      return {
        geometry: new THREE.TubeGeometry(
          curve,
          220,
          0.028 + index * 0.008,
          12,
          true
        ),
        color:
          index % 3 === 0
            ? SCENE_PALETTE.accent
            : index % 3 === 1
              ? SCENE_PALETTE.secondary
              : SCENE_PALETTE.tertiary,
        speed: 0.12 + index * 0.03,
      };
    });
  }, [count]);

  useEffect(() => {
    return () => {
      ribbons.forEach(ribbon => ribbon.geometry.dispose());
    };
  }, [ribbons]);

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }

    const burst = pointerFieldRef.current.burst;
    groupRef.current.rotation.y += delta * (0.08 + burst * 0.04);
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.12) * 0.18;
  });

  return (
    <group ref={groupRef}>
      {ribbons.map((ribbon, index) => (
        <mesh
          key={`ribbon-${index}`}
          geometry={ribbon.geometry}
          rotation={[index * 0.4, index * 0.2, index * 0.16]}
        >
          <meshBasicMaterial
            color={ribbon.color}
            transparent
            opacity={0.1 + index * 0.02}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function MonolithField({
  count,
  pointerFieldRef,
}: {
  count: number;
  pointerFieldRef: MutableRefObject<PointerField>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const monoliths = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        const radius = 4.2 + (index % 4) * 0.55;
        return {
          position: new THREE.Vector3(
            Math.cos(angle) * radius,
            -1.1 + (index % 5) * 0.65,
            Math.sin(angle) * radius
          ),
          rotation: [angle * 0.35, angle, Math.PI * 0.08] as const,
          scale: 0.42 + (index % 3) * 0.18,
        };
      }),
    [count]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }

    const pointerField = pointerFieldRef.current;
    groupRef.current.rotation.y += delta * (0.06 + pointerField.burst * 0.05);
    groupRef.current.position.x = THREE.MathUtils.damp(
      groupRef.current.position.x,
      pointerField.current.x * 0.25,
      3,
      delta
    );
    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      pointerField.current.y * 0.18,
      3,
      delta
    );
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.16) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {monoliths.map((monolith, index) => (
        <mesh
          key={`monolith-${index}`}
          position={monolith.position}
          rotation={monolith.rotation}
          scale={monolith.scale}
        >
          <boxGeometry args={[0.28, 1.8, 0.28]} />
          <meshPhysicalMaterial
            color={
              index % 2 === 0 ? SCENE_PALETTE.secondary : SCENE_PALETTE.tertiary
            }
            emissive={SCENE_PALETTE.accent}
            emissiveIntensity={0.4}
            roughness={0.12}
            metalness={0.42}
            transparent
            opacity={0.66}
          />
        </mesh>
      ))}
    </group>
  );
}

function HaloParticles({
  count,
  particleSize,
  pointerFieldRef,
}: {
  count: number;
  particleSize: number;
  pointerFieldRef: MutableRefObject<PointerField>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);
      const radius = 3.4 + Math.sin(index * 0.37) * 0.45;
      positions[index * 3] = Math.cos(theta) * Math.sin(phi) * radius;
      positions[index * 3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
      positions[index * 3 + 2] = Math.cos(phi) * radius;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    return nextGeometry;
  }, [count]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) {
      return;
    }

    const pointerField = pointerFieldRef.current;
    pointsRef.current.rotation.y += delta * (0.06 + pointerField.burst * 0.04);
    pointsRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.18) * 0.2;
    materialRef.current.opacity = THREE.MathUtils.damp(
      materialRef.current.opacity,
      0.3 + pointerField.burst * 0.2,
      4,
      delta
    );
    materialRef.current.size = THREE.MathUtils.damp(
      materialRef.current.size,
      particleSize + pointerField.burst * 0.55,
      4,
      delta
    );
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        color={SCENE_PALETTE.highlight}
        transparent
        opacity={0.34}
        size={particleSize}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function FloatingShards({
  count,
  pointerFieldRef,
}: {
  count: number;
  pointerFieldRef: MutableRefObject<PointerField>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shards = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        return {
          position: [
            Math.cos(angle) * (2.4 + (index % 4) * 0.65),
            -2 + (index % 6) * 0.76,
            Math.sin(angle * 1.4) * (2.1 + (index % 5) * 0.36),
          ] as const,
          scale: 0.22 + (index % 3) * 0.12,
        };
      }),
    [count]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.rotation.y -=
      delta * (0.04 + pointerFieldRef.current.burst * 0.04);
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.22) * 0.16;
  });

  return (
    <group ref={groupRef}>
      {shards.map((shard, index) => (
        <mesh
          key={`shard-${index}`}
          position={shard.position}
          scale={shard.scale}
          rotation={[index * 0.3, index * 0.5, index * 0.18]}
        >
          <tetrahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={
              index % 2 === 0 ? SCENE_PALETTE.accent : SCENE_PALETTE.secondary
            }
            transparent
            opacity={0.22}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function EnergyFloor({
  pointerFieldRef,
}: {
  pointerFieldRef: MutableRefObject<PointerField>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }

    const pointerField = pointerFieldRef.current;
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.08) * 0.04;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.damp(
        groupRef.current.scale.x,
        1 + pointerField.burst * 0.05,
        3.2,
        delta
      )
    );
  });

  return (
    <group
      ref={groupRef}
      position={[0, -3.35, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <mesh>
        <ringGeometry args={[3.8, 4.2, 120]} />
        <meshBasicMaterial
          color={SCENE_PALETTE.secondary}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 5]}>
        <ringGeometry args={[5.2, 5.34, 140]} />
        <meshBasicMaterial
          color={SCENE_PALETTE.accent}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function SceneLighting({
  pointerFieldRef,
}: {
  pointerFieldRef: MutableRefObject<PointerField>;
}) {
  const keyLightRef = useRef<THREE.PointLight>(null);
  const fillLightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const burst = pointerFieldRef.current.burst;

    if (keyLightRef.current) {
      keyLightRef.current.intensity = THREE.MathUtils.damp(
        keyLightRef.current.intensity,
        16 + burst * 6,
        3,
        delta
      );
    }

    if (fillLightRef.current) {
      fillLightRef.current.intensity = THREE.MathUtils.damp(
        fillLightRef.current.intensity,
        8 + burst * 3,
        3,
        delta
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.9} color={SCENE_PALETTE.highlight} />
      <hemisphereLight
        intensity={0.7}
        groundColor={SCENE_PALETTE.backgroundTo}
        color={SCENE_PALETTE.secondary}
      />
      <pointLight
        ref={keyLightRef}
        position={[0, 0.6, 4.8]}
        color={SCENE_PALETTE.accent}
        intensity={16}
        distance={26}
        decay={1.8}
      />
      <pointLight
        ref={fillLightRef}
        position={[-5.5, 4, -2.5]}
        color={SCENE_PALETTE.tertiary}
        intensity={8}
        distance={32}
        decay={2}
      />
      <directionalLight
        position={[4.5, 6, 3]}
        intensity={1.8}
        color={SCENE_PALETTE.highlight}
      />
    </>
  );
}

function HeroScene({
  pointerFieldRef,
  sceneProfile,
  shouldAnimate,
  mobileOptimized,
}: {
  pointerFieldRef: MutableRefObject<PointerField>;
  sceneProfile: SceneProfile;
  shouldAnimate: boolean;
  mobileOptimized: boolean;
}) {
  const sceneRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!sceneRef.current) {
      return;
    }

    const pointerField = pointerFieldRef.current;
    sceneRef.current.rotation.y += delta * (shouldAnimate ? 0.02 : 0.006);
    sceneRef.current.position.x = THREE.MathUtils.damp(
      sceneRef.current.position.x,
      pointerField.current.x * 0.18,
      2.4,
      delta
    );
    sceneRef.current.position.y = THREE.MathUtils.damp(
      sceneRef.current.position.y,
      pointerField.current.y * 0.12,
      2.4,
      delta
    );
    sceneRef.current.scale.setScalar(
      THREE.MathUtils.damp(
        sceneRef.current.scale.x,
        mobileOptimized
          ? 0.94 + pointerField.burst * 0.02
          : 1 + pointerField.burst * 0.03,
        3.2,
        delta
      )
    );
    sceneRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
  });

  return (
    <group ref={sceneRef}>
      <PulseCore
        pointerFieldRef={pointerFieldRef}
        shouldAnimate={shouldAnimate}
        haloScale={sceneProfile.haloScale}
      />
      <RibbonField
        count={sceneProfile.ribbonCount}
        pointerFieldRef={pointerFieldRef}
      />
      <MonolithField
        count={sceneProfile.monolithCount}
        pointerFieldRef={pointerFieldRef}
      />
      <FloatingShards
        count={sceneProfile.shardCount}
        pointerFieldRef={pointerFieldRef}
      />
      <HaloParticles
        count={sceneProfile.haloCount}
        particleSize={sceneProfile.particleSize}
        pointerFieldRef={pointerFieldRef}
      />
      <EnergyFloor pointerFieldRef={pointerFieldRef} />
      <Sparkles
        count={sceneProfile.sparkleCount}
        scale={12}
        size={mobileOptimized ? 2.2 : 3.1}
        speed={0.18}
        color={SCENE_PALETTE.secondary}
        opacity={0.7}
      />
      <Stars
        radius={sceneProfile.starRadius}
        depth={42}
        count={sceneProfile.starCount}
        factor={mobileOptimized ? 2.4 : 3.2}
        saturation={0}
        fade
        speed={0.32}
      />
    </group>
  );
}

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
  const pointerFieldRef = useRef<PointerField>({
    target: new THREE.Vector2(),
    current: new THREE.Vector2(),
    down: false,
    burst: 0,
    engagement: 0,
  });
  const interactionTimeoutRef = useRef<number | null>(null);
  const [interactionState, setInteractionState] = useState<
    'idle' | 'engaged' | 'burst'
  >('idle');

  useEffect(() => {
    onInteractionStateChange?.(interactionState);
  }, [interactionState, onInteractionStateChange]);

  useEffect(() => {
    return () => {
      if (
        interactionTimeoutRef.current !== null &&
        typeof window !== 'undefined'
      ) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    pointerFieldRef.current.burst = Math.min(
      pointerFieldRef.current.burst + 1.1,
      1.4
    );
    setInteractionState('burst');

    if (
      interactionTimeoutRef.current !== null &&
      typeof window !== 'undefined'
    ) {
      window.clearTimeout(interactionTimeoutRef.current);
    }

    if (typeof window !== 'undefined') {
      interactionTimeoutRef.current = window.setTimeout(() => {
        setInteractionState(pointerFieldRef.current.down ? 'engaged' : 'idle');
        interactionTimeoutRef.current = null;
      }, 560);
    }
  }, [interactionPulse]);

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    const x = (clientX / window.innerWidth) * 2 - 1;
    const y = -((clientY / window.innerHeight) * 2 - 1);
    pointerFieldRef.current.target.set(x, y);
  }, []);

  const releasePointer = useCallback(() => {
    pointerFieldRef.current.down = false;
    pointerFieldRef.current.target.set(0, 0);

    if (typeof window !== 'undefined') {
      if (interactionTimeoutRef.current !== null) {
        window.clearTimeout(interactionTimeoutRef.current);
      }

      interactionTimeoutRef.current = window.setTimeout(() => {
        setInteractionState('idle');
        interactionTimeoutRef.current = null;
      }, 420);
    }
  }, []);

  const postFxOffset = useMemo(
    () =>
      new THREE.Vector2(
        sceneProfile.aberrationOffset,
        sceneProfile.aberrationOffset * 0.4
      ),
    [sceneProfile.aberrationOffset]
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
      }}
      camera={{
        position: [0, 0, 7.8],
        fov: mobileOptimized ? 42 : 38,
        near: 0.1,
        far: 180,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(SCENE_PALETTE.backgroundFrom, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = quality === 'high' ? 1.08 : 1;
        gl.domElement.dataset.heroCanvas = 'true';
      }}
      onPointerMove={event => {
        updatePointer(event.clientX, event.clientY);
        setInteractionState(current =>
          current === 'burst' ? current : 'engaged'
        );
      }}
      onPointerDown={event => {
        updatePointer(event.clientX, event.clientY);
        pointerFieldRef.current.down = true;
        pointerFieldRef.current.burst = Math.min(
          pointerFieldRef.current.burst + 0.8,
          1.4
        );
        setInteractionState('burst');
      }}
      onPointerUp={() => {
        pointerFieldRef.current.down = false;
        setInteractionState('engaged');
      }}
      onPointerLeave={releasePointer}
      onPointerCancel={releasePointer}
    >
      <color attach="background" args={[SCENE_PALETTE.backgroundFrom]} />
      <fog attach="fog" args={[SCENE_PALETTE.backgroundTo, 10, 40]} />

      <AdaptiveDpr baseDpr={sceneProfile.dprCap} />
      <FirstFrameReadyReporter onReady={onReady} />
      <PerformanceBudgetGuard
        enabled={
          sceneProfile.enablePostFx &&
          !mobileOptimized &&
          !stabilityAssistActive
        }
        onExceeded={onPerformanceBudgetExceeded}
      />
      <CameraRig
        pointerFieldRef={pointerFieldRef}
        shouldAnimate={shouldAnimate}
        mobileOptimized={mobileOptimized}
        fieldStrength={sceneProfile.fieldStrength}
      />
      <SceneLighting pointerFieldRef={pointerFieldRef} />
      <HeroScene
        pointerFieldRef={pointerFieldRef}
        sceneProfile={sceneProfile}
        shouldAnimate={shouldAnimate}
        mobileOptimized={mobileOptimized}
      />

      {sceneProfile.enablePostFx ? (
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom
            intensity={sceneProfile.bloomIntensity}
            luminanceThreshold={0.16}
            luminanceSmoothing={0.32}
            mipmapBlur
          />
          <ChromaticAberration
            offset={postFxOffset}
            radialModulation
            modulationOffset={0.35}
          />
          <Noise
            opacity={sceneProfile.noiseOpacity}
            premultiply
            blendFunction={BlendFunction.SCREEN}
          />
          <Vignette eskil={false} offset={0.26} darkness={0.88} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
