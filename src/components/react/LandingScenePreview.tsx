/** @jsxImportSource react */
/** @jsxRuntime automatic */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles, Stars } from '@react-three/drei';
import '@/styles/landing-scene-preview.css';

type PreviewVariant = 'nexus' | 'neural' | 'skyline' | 'storm';
type PreviewTempo = '0.8' | '1' | '1.35';
type PreviewZoom = '0' | '0.38';

type PointerSignal = {
  x: number;
  y: number;
  active: boolean;
};

type SceneProps = {
  speed: number;
  pointer: PointerSignal;
};

type SceneMeta = {
  label: string;
  shortLabel: string;
  note: string;
  colorA: string;
  colorB: string;
};

type TempoMeta = {
  label: string;
  note: string;
};

type ZoomMeta = {
  label: string;
  note: string;
};

const SCENE_OPTIONS: Record<PreviewVariant, SceneMeta> = {
  nexus: {
    label: 'Creative Nexus',
    shortLabel: 'Nexus',
    note: 'Dense, premium signal choreography with a brighter core and stronger orbit layers.',
    colorA: '#ccff00',
    colorB: '#38bdf8',
  },
  neural: {
    label: 'Neural Lattice',
    shortLabel: 'Neural',
    note: 'A clearer node mesh and cooler pulse make the network scene read instantly instead of disappearing into haze.',
    colorA: '#00d4ff',
    colorB: '#67e8f9',
  },
  skyline: {
    label: 'Skyline Pulse',
    shortLabel: 'Skyline',
    note: 'A modular skyline silhouette keeps the mid-page runway feeling architectural, luminous, and unmistakably alive.',
    colorA: '#7dd3fc',
    colorB: '#22d3ee',
  },
  storm: {
    label: 'Storm Field',
    shortLabel: 'Storm',
    note: 'Electric arcs and a denser atmospheric shell give the runway a more volatile, high-voltage posture.',
    colorA: '#a855f7',
    colorB: '#f97316',
  },
};

const TEMPO_OPTIONS: Record<PreviewTempo, TempoMeta> = {
  '0.8': {
    label: 'Calm',
    note: 'Slower drift with a more ambient rhythm.',
  },
  '1': {
    label: 'Live',
    note: 'Balanced runtime tuned for everyday landing-page playback.',
  },
  '1.35': {
    label: 'Surge',
    note: 'Push the scene harder for a charged cinematic pace.',
  },
};

const ZOOM_OPTIONS: Record<PreviewZoom, ZoomMeta> = {
  '0': {
    label: 'Wide',
    note: 'Keep the broader scene silhouette and room tone.',
  },
  '0.38': {
    label: 'Focused',
    note: 'Tighten the frame and bring the hero geometry forward.',
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function drawPreviewFallback(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  {
    variant,
    speed,
    zoom,
    pointer,
    palette,
    time,
  }: {
    variant: PreviewVariant;
    speed: number;
    zoom: number;
    pointer: PointerSignal;
    palette: SceneMeta;
    time: number;
  }
) {
  const centerX = width * (0.5 + pointer.x * 0.045);
  const centerY = height * (0.48 - pointer.y * 0.04);
  const minSide = Math.min(width, height);

  const backdrop = ctx.createRadialGradient(
    centerX,
    centerY,
    minSide * 0.04,
    centerX,
    centerY,
    minSide * 0.78
  );
  backdrop.addColorStop(0, 'rgba(10, 18, 34, 0.96)');
  backdrop.addColorStop(0.38, 'rgba(4, 9, 20, 0.92)');
  backdrop.addColorStop(1, 'rgba(2, 4, 9, 1)');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(
    centerX,
    centerY,
    minSide * 0.06,
    centerX,
    centerY,
    minSide * 0.5
  );
  halo.addColorStop(0, `${palette.colorA}aa`);
  halo.addColorStop(0.42, `${palette.colorB}26`);
  halo.addColorStop(1, '#00000000');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  const gridSize = Math.max(28, Math.round(minSide * 0.1));
  const drift = (time * 18 * speed) % gridSize;
  for (let x = -gridSize; x <= width + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x + drift, height);
    ctx.stroke();
  }
  for (let y = -gridSize; y <= height + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + drift * 0.45);
    ctx.lineTo(width, y + drift * 0.45);
    ctx.stroke();
  }
  ctx.restore();

  const orbitBase = minSide * (0.18 + zoom * 0.08);
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(time * 0.08 * speed);
  ctx.strokeStyle = `${palette.colorA}55`;
  ctx.lineWidth = 1.5;
  for (const radius of [orbitBase, orbitBase * 1.42, orbitBase * 1.88]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.45, radius, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (variant === 'nexus') {
    const ringRadius = orbitBase * 0.96;
    for (let index = 0; index < 42; index += 1) {
      const angle = (index / 42) * Math.PI * 2 + time * 0.55 * speed;
      const radius =
        ringRadius + Math.sin(time * speed + index) * minSide * 0.012;
      const x = centerX + Math.cos(angle) * radius * 1.22;
      const y = centerY + Math.sin(angle) * radius * 0.8;
      ctx.fillStyle = index % 3 === 0 ? palette.colorB : palette.colorA;
      ctx.beginPath();
      ctx.arc(x, y, minSide * 0.008, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = palette.colorA;
    ctx.shadowBlur = 28;
    ctx.shadowColor = palette.colorA;
    ctx.beginPath();
    ctx.arc(centerX, centerY, minSide * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else if (variant === 'neural') {
    const nodes = Array.from({ length: 14 }, (_, index) => {
      const angle = (index / 14) * Math.PI * 2 + time * 0.2 * speed;
      const radius =
        orbitBase * (index % 3 === 0 ? 1.34 : index % 2 === 0 ? 1.02 : 0.7);
      return {
        x: centerX + Math.cos(angle) * radius * 1.18,
        y: centerY + Math.sin(angle * 1.2) * radius * 0.52,
      };
    });

    ctx.strokeStyle = `${palette.colorB}66`;
    ctx.lineWidth = 1.15;
    nodes.forEach((from, fromIndex) => {
      nodes.forEach((to, toIndex) => {
        if (toIndex <= fromIndex) return;
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const distance = Math.hypot(dx, dy);
        if (distance > minSide * 0.24) return;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });
    });

    nodes.forEach((node, index) => {
      ctx.fillStyle = index % 2 === 0 ? palette.colorA : palette.colorB;
      ctx.beginPath();
      ctx.arc(node.x, node.y, minSide * 0.012, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (variant === 'skyline') {
    const baseY = height * 0.7;
    for (let index = 0; index < 18; index += 1) {
      const columnWidth = width * 0.028 + (index % 3) * width * 0.008;
      const columnHeight = minSide * (0.18 + ((index * 7) % 6) * 0.045);
      const x = width * 0.18 + index * width * 0.036;
      const pulse = 0.88 + Math.sin(time * speed * 1.4 + index) * 0.12;
      ctx.fillStyle =
        index % 2 === 0 ? `${palette.colorA}bb` : `${palette.colorB}bb`;
      ctx.fillRect(
        x,
        baseY - columnHeight * pulse,
        columnWidth,
        columnHeight * pulse
      );
    }

    ctx.strokeStyle = `${palette.colorB}55`;
    ctx.lineWidth = 1.4;
    for (const radius of [orbitBase * 1.1, orbitBase * 1.5]) {
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        baseY - minSide * 0.05,
        radius * 1.6,
        radius * 0.35,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = `${palette.colorB}aa`;
    ctx.lineWidth = 2;
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath();
      ctx.moveTo(width * (0.18 + index * 0.06), height * (0.68 - index * 0.08));
      ctx.bezierCurveTo(
        width * (0.32 + index * 0.05),
        height * (0.18 + index * 0.04),
        width * (0.56 + index * 0.03),
        height * (0.82 - index * 0.05),
        width * (0.78 + index * 0.04),
        height * (0.28 + index * 0.03)
      );
      ctx.stroke();
    }

    ctx.strokeStyle = `${palette.colorA}55`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbitBase * 0.84, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2 + time * 0.12 * speed;
    const radius = orbitBase * (1.15 + (index % 4) * 0.12);
    const x = centerX + Math.cos(angle) * radius * 1.3;
    const y = centerY + Math.sin(angle) * radius * 0.72;
    ctx.fillStyle =
      index % 2 === 0 ? `${palette.colorA}88` : `${palette.colorB}78`;
    ctx.beginPath();
    ctx.arc(x, y, minSide * 0.0065, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function PreviewCameraRig({
  speed,
  zoom,
  pointer,
}: {
  speed: number;
  zoom: number;
  pointer: PointerSignal;
}) {
  const camera = useThree(state => state.camera);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime * speed;
    const pointerInfluence = pointer.active ? 1 : 0.58;
    const orbitX = Math.sin(time * 0.24) * 0.42;
    const orbitY = Math.cos(time * 0.18) * 0.26;
    const focusDepth = THREE.MathUtils.lerp(10.4, 8.1, zoom);

    target.set(
      orbitX + pointer.x * 1.05 * pointerInfluence,
      orbitY + pointer.y * 0.74 * pointerInfluence,
      focusDepth - Math.abs(pointer.x) * 0.22
    );

    camera.position.lerp(target, 0.06);
    camera.lookAt(pointer.x * 0.56, pointer.y * 0.42, 0);
  });

  return null;
}

function PreviewBackdrop({
  colorA,
  colorB,
  speed,
  pointer,
}: {
  colorA: string;
  colorB: string;
  speed: number;
  pointer: PointerSignal;
}) {
  const shellRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime * speed;
    const haloScale =
      1.02 + Math.sin(time * 0.42) * 0.04 + (pointer.active ? 0.06 : 0);

    if (shellRef.current) {
      shellRef.current.rotation.y = time * 0.04;
      shellRef.current.rotation.x = pointer.y * 0.08;
    }

    if (haloRef.current) {
      haloRef.current.scale.setScalar(haloScale + Math.abs(pointer.x) * 0.04);
      haloRef.current.rotation.z = time * 0.08;
    }
  });

  return (
    <>
      <color attach="background" args={['#03060c']} />
      <fog attach="fog" args={['#02050b', 18, 34]} />
      <ambientLight intensity={0.92} color={colorA} />
      <hemisphereLight intensity={0.9} color={colorB} groundColor="#02050b" />
      <pointLight
        position={[5, 4, 8]}
        color={colorA}
        intensity={9}
        distance={34}
      />
      <pointLight
        position={[-6, -3, -2]}
        color={colorB}
        intensity={5.4}
        distance={26}
      />
      <mesh ref={shellRef} renderOrder={-3}>
        <sphereGeometry args={[18, 40, 40]} />
        <meshBasicMaterial
          color={colorA}
          side={THREE.BackSide}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={haloRef}
        position={[0, 0, -7]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={-2}
      >
        <ringGeometry args={[2.8, 9.5, 96]} />
        <meshBasicMaterial
          color={colorB}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Stars
        radius={56}
        depth={22}
        count={900}
        factor={2.8}
        saturation={0}
        fade
        speed={0.55 * speed}
      />
    </>
  );
}

function NexusScene({ speed, pointer }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRefs = useRef([
    { current: null as THREE.Mesh | null },
    { current: null as THREE.Mesh | null },
    { current: null as THREE.Mesh | null },
  ]);
  const particlePositions = useMemo(() => {
    const count = 1600;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const t = Math.random() * Math.PI * 2;
      const r = 3.4 + Math.random() * 1.8;
      const spread = 0.5 + Math.random() * 0.7;
      positions[index * 3] = Math.cos(t) * r;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 3.8 * spread;
      positions[index * 3 + 2] = Math.sin(t) * r;
    }
    return positions;
  }, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime * speed;
    const pointerPushX = pointer.x * 0.44;
    const pointerPushY = pointer.y * 0.32;

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.2 + pointerPushX * 0.2;
      groupRef.current.rotation.x = pointerPushY * 0.18;
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        pointerPushX,
        0.06
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        pointerPushY,
        0.06
      );
    }

    if (coreRef.current) {
      const pulse =
        1 + Math.sin(time * 1.6) * 0.08 + (pointer.active ? 0.04 : 0);
      coreRef.current.scale.setScalar(pulse);
      coreRef.current.rotation.y = time * 0.48;
      coreRef.current.rotation.x = time * 0.22;
    }

    ringRefs.current.forEach((ringRef, index) => {
      if (!ringRef.current) return;
      ringRef.current.rotation.x = time * (0.14 + index * 0.06);
      ringRef.current.rotation.y = time * (0.1 + index * 0.04) + index;
      ringRef.current.rotation.z = time * (0.08 + index * 0.03);
    });
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
            count={particlePositions.length / 3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ccff00"
          size={0.12}
          sizeAttenuation
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial
          color="#d9ff4a"
          emissive="#ccff00"
          emissiveIntensity={1.8}
          roughness={0.2}
          metalness={0.18}
        />
      </mesh>

      {[2.7, 3.8, 5.1].map((radius, index) => (
        <mesh
          key={radius}
          ref={ringRefs.current[index]}
          rotation={[Math.PI / 2, index * 0.4, 0]}
        >
          <torusGeometry args={[radius, 0.045, 12, 96]} />
          <meshBasicMaterial
            color={index === 1 ? '#38bdf8' : '#ccff00'}
            transparent
            opacity={0.42 - index * 0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      <Sparkles
        count={54}
        scale={9}
        size={2.2}
        speed={0.48 * speed}
        color="#f8ff9f"
        opacity={0.65}
      />
    </group>
  );
}

function NeuralScene({ speed, pointer }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nodeGeometry = useMemo(
    () => new THREE.SphereGeometry(0.12, 12, 12),
    []
  );
  const nodes = useMemo(() => {
    const positions = Array.from({ length: 18 }, (_, index) => {
      const angle = (index / 18) * Math.PI * 2;
      const radius = index % 3 === 0 ? 3.1 : index % 2 === 0 ? 2.2 : 1.4;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(index * 1.4) * 1.4,
        Math.sin(angle) * radius
      );
    });

    const linePositions: number[] = [];
    positions.forEach((from, fromIndex) => {
      positions.forEach((to, toIndex) => {
        if (toIndex <= fromIndex || from.distanceTo(to) > 2.8) return;
        linePositions.push(from.x, from.y, from.z, to.x, to.y, to.z);
      });
    });

    return {
      positions,
      linePositions: new Float32Array(linePositions),
    };
  }, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime * speed;
    if (!groupRef.current) return;

    groupRef.current.rotation.y = time * 0.28 + pointer.x * 0.22;
    groupRef.current.rotation.x = pointer.y * 0.18;
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      pointer.x * 0.52,
      0.06
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      pointer.y * 0.38,
      0.06
    );
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[nodes.linePositions, 3]}
            count={nodes.linePositions.length / 3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#67e8f9" transparent opacity={0.64} />
      </lineSegments>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusKnotGeometry args={[1.1, 0.2, 120, 18]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#00d4ff"
          emissiveIntensity={1.4}
          roughness={0.16}
          metalness={0.24}
        />
      </mesh>

      {nodes.positions.map((position, index) => (
        <mesh key={index} position={position} geometry={nodeGeometry}>
          <meshStandardMaterial
            color="#9ff8ff"
            emissive="#00d4ff"
            emissiveIntensity={2.1}
            roughness={0.1}
            metalness={0.18}
          />
        </mesh>
      ))}

      <Sparkles
        count={42}
        scale={8.5}
        size={2}
        speed={0.42 * speed}
        color="#baf6ff"
        opacity={0.58}
      />
    </group>
  );
}

function SkylineScene({ speed, pointer }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const towerLayout = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const column = index % 6;
        const row = Math.floor(index / 6);
        return {
          x: (column - 2.5) * 0.95,
          z: (row - 1) * 1.2,
          height: 1.2 + ((index * 7) % 5) * 0.55,
          width: 0.44 + (index % 3) * 0.08,
        };
      }),
    []
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime * speed;
    if (!groupRef.current) return;

    groupRef.current.rotation.y =
      Math.sin(time * 0.18) * 0.18 + pointer.x * 0.2;
    groupRef.current.rotation.x = pointer.y * 0.08;
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      pointer.x * 0.6,
      0.06
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      pointer.y * 0.34,
      0.06
    );
  });

  return (
    <group ref={groupRef} position={[0, -0.75, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.76, 0]}>
        <circleGeometry args={[5.6, 80]} />
        <meshBasicMaterial color="#0b1623" transparent opacity={0.55} />
      </mesh>

      {towerLayout.map((tower, index) => (
        <mesh
          key={index}
          position={[tower.x, tower.height / 2, tower.z]}
          scale={[1, 1 + Math.sin(index + speed) * 0.02, 1]}
        >
          <boxGeometry args={[tower.width, tower.height, tower.width]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? '#7dd3fc' : '#38bdf8'}
            emissive={index % 2 === 0 ? '#67e8f9' : '#38bdf8'}
            emissiveIntensity={1.35}
            roughness={0.14}
            metalness={0.28}
          />
        </mesh>
      ))}

      {[2.4, 3.6, 4.8].map((radius, index) => (
        <mesh
          key={radius}
          position={[0, index * 0.34 + 0.2, -0.8]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[radius, 0.035, 10, 84]} />
          <meshBasicMaterial
            color={index === 1 ? '#7dd3fc' : '#22d3ee'}
            transparent
            opacity={0.3 - index * 0.05}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      <Sparkles
        count={38}
        scale={10}
        size={2.2}
        speed={0.32 * speed}
        color="#bae6fd"
        opacity={0.54}
      />
    </group>
  );
}

function StormScene({ speed, pointer }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const arcCurves = useMemo(() => {
    const makeArc = (offset: number) =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.4 + offset, -1.2, -0.8),
        new THREE.Vector3(-1.4 + offset, 1.8, 0.3),
        new THREE.Vector3(0.4 + offset, -0.9, 0.6),
        new THREE.Vector3(2.6 + offset, 1.5, -0.2),
      ]);

    return [makeArc(-0.5), makeArc(0), makeArc(0.65)];
  }, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime * speed;
    if (!groupRef.current) return;

    groupRef.current.rotation.y = time * 0.22 + pointer.x * 0.18;
    groupRef.current.rotation.x = pointer.y * 0.16;
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      pointer.x * 0.42,
      0.06
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      pointer.y * 0.36,
      0.06
    );
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1.22, 2]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#a855f7"
          emissiveIntensity={1.7}
          roughness={0.14}
          metalness={0.22}
          wireframe
        />
      </mesh>

      {arcCurves.map((curve, index) => (
        <mesh key={index} rotation={[0, index * 0.55, index * 0.18]}>
          <tubeGeometry args={[curve, 72, 0.045, 10, false]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? '#f97316' : '#d8b4fe'}
            transparent
            opacity={0.84}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {[2.2, 3.4].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[Math.PI / 2 + index * 0.44, 0, index * 0.7]}
        >
          <torusGeometry args={[radius, 0.05, 10, 84]} />
          <meshBasicMaterial
            color={index === 0 ? '#a855f7' : '#f97316'}
            transparent
            opacity={0.24}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      <Sparkles
        count={52}
        scale={9.8}
        size={2.5}
        speed={0.72 * speed}
        color="#fde68a"
        opacity={0.7}
      />
    </group>
  );
}

function PreviewScene({
  variant,
  speed,
  zoom,
  pointer,
}: {
  variant: PreviewVariant;
  speed: number;
  zoom: number;
  pointer: PointerSignal;
}) {
  const palette = SCENE_OPTIONS[variant];

  return (
    <>
      <PreviewBackdrop
        colorA={palette.colorA}
        colorB={palette.colorB}
        speed={speed}
        pointer={pointer}
      />
      <PreviewCameraRig speed={speed} zoom={zoom} pointer={pointer} />

      {variant === 'nexus' && <NexusScene speed={speed} pointer={pointer} />}
      {variant === 'neural' && <NeuralScene speed={speed} pointer={pointer} />}
      {variant === 'skyline' && (
        <SkylineScene speed={speed} pointer={pointer} />
      )}
      {variant === 'storm' && <StormScene speed={speed} pointer={pointer} />}
    </>
  );
}

export default function LandingScenePreview() {
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const [variant, setVariant] = useState<PreviewVariant>('nexus');
  const [tempo, setTempo] = useState<PreviewTempo>('1');
  const [zoom, setZoom] = useState<PreviewZoom>('0');
  const [pointer, setPointer] = useState<PointerSignal>({
    x: 0,
    y: 0,
    active: false,
  });

  const sceneMeta = SCENE_OPTIONS[variant];
  const tempoMeta = TEMPO_OPTIONS[tempo];
  const zoomMeta = ZOOM_OPTIONS[zoom];
  const numericTempo = Number.parseFloat(tempo);
  const numericZoom = Number.parseFloat(zoom);

  useEffect(() => {
    if (typeof window === 'undefined' || !fallbackCanvasRef.current) {
      return;
    }

    const canvas = fallbackCanvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    let frameId = 0;

    const render = () => {
      const parent = canvas.parentElement;
      if (!parent) {
        frameId = window.requestAnimationFrame(render);
        return;
      }

      const nextWidth = Math.max(1, Math.round(parent.clientWidth));
      const nextHeight = Math.max(1, Math.round(parent.clientHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        canvas.width !== Math.round(nextWidth * dpr) ||
        canvas.height !== Math.round(nextHeight * dpr)
      ) {
        canvas.width = Math.round(nextWidth * dpr);
        canvas.height = Math.round(nextHeight * dpr);
        canvas.style.width = `${nextWidth}px`;
        canvas.style.height = `${nextHeight}px`;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, nextWidth, nextHeight);
      drawPreviewFallback(context, nextWidth, nextHeight, {
        variant,
        speed: numericTempo,
        zoom: numericZoom,
        pointer,
        palette: sceneMeta,
        time: performance.now() / 1000,
      });

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [numericTempo, numericZoom, pointer, sceneMeta, variant]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    setPointer({
      x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      y: clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -1, 1),
      active: true,
    });
  };

  const resetPointer = () => {
    setPointer(currentPointer => ({
      x: currentPointer.x * 0.35,
      y: currentPointer.y * 0.35,
      active: false,
    }));
  };

  const resetPreview = () => {
    setVariant('nexus');
    setTempo('1');
    setZoom('0');
    setPointer({ x: 0, y: 0, active: false });
  };

  const previewStatus = `${sceneMeta.label} scene active · ${tempoMeta.label} tempo · ${zoomMeta.label} framing.`;

  const handleCanvasCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    const { domElement } = gl;
    const host = domElement.parentElement;

    gl.setClearColor('#03060c');
    domElement.dataset.heroCanvas = 'true';
    domElement.style.width = '100%';
    domElement.style.height = '100%';

    if (host) {
      gl.setSize(host.clientWidth, host.clientHeight, false);
    }
  };

  return (
    <div className="landing-scene-preview">
      <div
        className="landing-scene-preview-stage"
        data-landing-3d-preview-shell
        data-landing-3d-preview
        data-hero-canvas-shell
        data-preview-variant={variant}
        style={
          {
            '--landing-preview-accent': sceneMeta.colorA,
            '--landing-preview-secondary': sceneMeta.colorB,
          } as CSSProperties
        }
      >
        <div
          className="landing-scene-preview-root"
          data-hero-root
          data-hero-variant={variant}
          data-hero-speed={tempo}
          data-hero-zoom={zoom}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
          onPointerUp={resetPointer}
        >
          <Canvas
            className="landing-scene-preview-canvas"
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 10.4], fov: 48, near: 0.1, far: 100 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
            }}
            style={{ position: 'absolute', inset: 0, background: '#03060c' }}
            onCreated={handleCanvasCreated}
          >
            <PreviewScene
              variant={variant}
              speed={numericTempo}
              zoom={numericZoom}
              pointer={pointer}
            />
          </Canvas>

          <canvas
            ref={fallbackCanvasRef}
            className="landing-scene-preview-fallback"
            data-hero-canvas
            aria-hidden="true"
          />

          <div className="landing-scene-preview-shell" aria-hidden="true">
            <div className="landing-scene-preview-shell__grid" />
            <div className="landing-scene-preview-shell__glow" />
            <div className="landing-scene-preview-shell__core" />
            <div className="landing-scene-preview-shell__ring landing-scene-preview-shell__ring--outer" />
            <div className="landing-scene-preview-shell__ring landing-scene-preview-shell__ring--inner" />
            <div className="landing-scene-preview-shell__beam" />
            <div className="landing-scene-preview-shell__stack" />
          </div>
        </div>

        <div className="landing-scene-preview-overlay" aria-hidden="true">
          <div className="landing-scene-preview-wash" />
          <div className="landing-scene-preview-card">
            <div className="landing-scene-preview-card__copy">
              <p className="creative-stack-eyebrow">
                Live scene follow-through
              </p>
              <p
                className="tone-title mt-2 text-lg font-semibold text-white"
                data-landing-3d-scene-label
              >
                {sceneMeta.label}
              </p>
              <p
                className="tone-body mt-2 max-w-xl text-sm text-white/60"
                data-landing-3d-scene-note
              >
                {sceneMeta.note}
              </p>
            </div>
            <div className="landing-3d-status-stack">
              <span className="creative-pill" data-landing-3d-tempo-label>
                Tempo · {tempoMeta.label}
              </span>
              <span className="creative-pill" data-landing-3d-camera-label>
                Camera · {zoomMeta.label}
              </span>
            </div>
            <p className="landing-scene-preview-status" data-landing-3d-status>
              {previewStatus}
            </p>
          </div>
        </div>
      </div>

      <div
        className="landing-3d-control-panel creative-panel p-5"
        data-landing-3d-controls
      >
        <div className="landing-3d-control-group">
          <div className="landing-3d-control-copy">
            <p className="creative-stack-eyebrow">Scene personality</p>
            <p className="tone-body text-white/62 text-sm">
              Switch the active runway scene without remount drama or
              mystery-black frames.
            </p>
          </div>
          <div
            className="landing-3d-control-grid"
            role="group"
            aria-label="Choose a mid-page 3D scene"
          >
            {(
              Object.entries(SCENE_OPTIONS) as Array<
                [PreviewVariant, SceneMeta]
              >
            ).map(([value, option]) => (
              <button
                key={value}
                type="button"
                className={`landing-3d-control-button ${variant === value ? 'is-active' : ''}`}
                data-landing-3d-control="scene"
                data-scene-value={value}
                data-scene-label={option.label}
                data-scene-note={option.note}
                aria-pressed={variant === value}
                onClick={() => setVariant(value)}
              >
                <span>{option.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="landing-3d-control-group">
          <div className="landing-3d-control-copy">
            <p className="creative-stack-eyebrow">Runtime tempo</p>
            <p className="tone-body text-white/62 text-sm">
              Tune the pacing while keeping the scene stable and visibly alive.
            </p>
          </div>
          <div
            className="landing-3d-control-grid landing-3d-control-grid--compact"
            role="group"
            aria-label="Choose a mid-page 3D tempo"
          >
            {(
              Object.entries(TEMPO_OPTIONS) as Array<[PreviewTempo, TempoMeta]>
            ).map(([value, option]) => (
              <button
                key={value}
                type="button"
                className={`landing-3d-control-button ${tempo === value ? 'is-active' : ''}`}
                data-landing-3d-control="speed"
                data-speed-value={value}
                data-speed-label={option.label}
                aria-pressed={tempo === value}
                onClick={() => setTempo(value)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="landing-3d-control-group">
          <div className="landing-3d-control-copy">
            <p className="creative-stack-eyebrow">Camera framing</p>
            <p className="tone-body text-white/62 text-sm">
              Keep the runway wide or tighten the framing without losing the
              scene silhouette.
            </p>
          </div>
          <div
            className="landing-3d-control-grid landing-3d-control-grid--compact"
            role="group"
            aria-label="Choose a mid-page 3D camera mode"
          >
            {(
              Object.entries(ZOOM_OPTIONS) as Array<[PreviewZoom, ZoomMeta]>
            ).map(([value, option]) => (
              <button
                key={value}
                type="button"
                className={`landing-3d-control-button ${zoom === value ? 'is-active' : ''}`}
                data-landing-3d-control="zoom"
                data-zoom-value={value}
                data-zoom-label={option.label}
                aria-pressed={zoom === value}
                onClick={() => setZoom(value)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="landing-3d-control-footer">
          <p
            className="landing-3d-control-status"
            role="status"
            aria-live="polite"
          >
            {previewStatus}
          </p>

          <button
            type="button"
            className="landing-3d-reset-button"
            data-landing-3d-control="reset"
            onClick={resetPreview}
          >
            Reset preview
          </button>
        </div>
      </div>
    </div>
  );
}
