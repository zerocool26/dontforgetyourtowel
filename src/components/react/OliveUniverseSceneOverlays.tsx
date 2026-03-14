/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  CHAPTER_ATMOSPHERES,
  CHAPTERS,
  type SceneLensMode,
  type SceneProfile,
} from './olive-universe-config';
import { SCENE_LENS_CAMERA_SETTINGS } from './olive-universe-scene-lens';
import type { CanvasPointerSignal } from './OliveUniverseCanvas';

type PointerSignalRef = MutableRefObject<CanvasPointerSignal>;

function getOverlayPerformanceBudget(pointerSignal: CanvasPointerSignal) {
  const performanceFactor = THREE.MathUtils.clamp(
    Number.isFinite(pointerSignal.performanceFactor)
      ? pointerSignal.performanceFactor
      : 1,
    0.62,
    1
  );

  return {
    motion: 0.74 + performanceFactor * 0.26,
    glow: 0.68 + performanceFactor * 0.32,
  };
}

function SceneSignatureLayer({
  activeChapterIndex,
  profile,
  sceneLens,
  pointerSignalRef,
}: {
  activeChapterIndex: number;
  profile: SceneProfile;
  sceneLens: SceneLensMode;
  pointerSignalRef: PointerSignalRef;
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
    const pointerSignal = pointerSignalRef.current;
    const performanceBudget = getOverlayPerformanceBudget(pointerSignal);
    const pointerMomentum = pointerSignal.momentum;
    const pointerVelocityX =
      pointerSignal.velocity.x *
      (pointerSignal.coarse ? 0.32 : 0.22) *
      performanceBudget.motion;
    const pointerVelocityY =
      pointerSignal.velocity.y *
      (pointerSignal.coarse ? 0.24 : 0.16) *
      performanceBudget.motion;
    const pointerX =
      pointerSignal.position.x *
      (pointerSignal.coarse ? 0.52 : 0.3) *
      performanceBudget.motion;
    const pointerY =
      pointerSignal.position.y *
      (pointerSignal.coarse ? 0.36 : 0.22) *
      performanceBudget.motion;
    const fieldEnergy = pointerSignal.fieldEnergy;
    const primaryOpacityTarget = Math.min(
      0.38,
      (chapterId === 'signal' ? 0.18 : 0.24) *
        lensConfig.signatureGain *
        performanceBudget.glow +
        fieldEnergy * 0.04 +
        pointerMomentum * 0.04
    );
    const secondaryOpacityTarget = Math.min(
      0.42,
      (chapterId === 'singularity' ? 0.34 : 0.22) *
        lensConfig.signatureGain *
        performanceBudget.glow +
        fieldEnergy * 0.05 +
        pointerMomentum * 0.05
    );
    const coreOpacityTarget = Math.min(
      0.26,
      (chapterId === 'signal' ? 0.1 : 0.16) *
        (0.9 + lensConfig.signatureGain * 0.18) *
        performanceBudget.glow +
        fieldEnergy * 0.03 +
        pointerMomentum * 0.03
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
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        pointerX * 0.9 + pointerVelocityX * 0.34,
        0.06
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        pointerY * 0.68 + pointerVelocityY * 0.28,
        0.06
      );
      groupRef.current.rotation.y =
        clock.elapsedTime *
          (0.05 + atmosphere.starDriftSpeed * 0.09) *
          performanceBudget.motion +
        pointerX * 0.16 +
        pointerVelocityX * 0.08;
      groupRef.current.rotation.x =
        Math.sin(clock.elapsedTime * 0.14 * performanceBudget.motion) * 0.06 +
        pointerY * 0.12 +
        pointerVelocityY * 0.08;
    }

    if (pulseRef.current) {
      const targetScale =
        1 +
        Math.sin(
          clock.elapsedTime *
            (0.65 + atmosphere.starDriftSpeed) *
            performanceBudget.motion
        ) *
          0.05 +
        lensConfig.orbitRadius * 0.18 +
        fieldEnergy * 0.08 * performanceBudget.motion +
        pointerMomentum * 0.12 * performanceBudget.motion;
      pulseRef.current.scale.setScalar(
        THREE.MathUtils.lerp(pulseRef.current.scale.x, targetScale, 0.08)
      );
    }

    if (sweepRef.current) {
      sweepRef.current.position.x = THREE.MathUtils.lerp(
        sweepRef.current.position.x,
        pointerX * 0.42 + pointerVelocityX * 0.24,
        0.08
      );
      sweepRef.current.position.y =
        Math.sin(clock.elapsedTime * 0.8 * performanceBudget.motion) * 0.55 +
        pointerY * 0.44 +
        pointerVelocityY * 0.22;
      sweepRef.current.rotation.z =
        clock.elapsedTime *
          (0.16 + lensConfig.orbitSpeed * 0.2) *
          performanceBudget.motion +
        pointerX * 0.18 +
        pointerVelocityX * 0.12;
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
  pointerSignalRef,
}: {
  activeChapterIndex: number;
  profile: SceneProfile;
  sceneLens: SceneLensMode;
  interactionBurstActive: boolean;
  pointerSignalRef: PointerSignalRef;
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
    const pointerSignal = pointerSignalRef.current;
    const performanceBudget = getOverlayPerformanceBudget(pointerSignal);
    const pointerMomentum = pointerSignal.momentum;
    const pointerVelocityX =
      pointerSignal.velocity.x *
      (pointerSignal.coarse ? 0.34 : 0.24) *
      performanceBudget.motion;
    const pointerVelocityY =
      pointerSignal.velocity.y *
      (pointerSignal.coarse ? 0.26 : 0.18) *
      performanceBudget.motion;
    const pointerX =
      pointerSignal.position.x *
      (pointerSignal.coarse ? 0.54 : 0.32) *
      performanceBudget.motion;
    const pointerY =
      pointerSignal.position.y *
      (pointerSignal.coarse ? 0.38 : 0.22) *
      performanceBudget.motion;
    const fieldSupport = pointerSignal.fieldEnergy * 0.12;

    burstLevelRef.current = THREE.MathUtils.lerp(
      burstLevelRef.current,
      interactionBurstActive ? 1 : 0,
      interactionBurstActive ? 0.18 * lensConfig.burstGain : 0.11
    );

    const burst = Math.min(
      1.35,
      (burstLevelRef.current + fieldSupport) *
        lensConfig.burstGain *
        performanceBudget.glow +
        pointerMomentum * 0.12
    );

    primaryMat.opacity = burst * 0.38;
    secondaryMat.opacity = burst * 0.28;
    coreMat.opacity = burst * 0.18;
    coreMat.emissiveIntensity = burst * 3.2;

    if (groupRef.current) {
      groupRef.current.visible = burst > 0.02;
      if (!groupRef.current.visible) {
        return;
      }

      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        pointerX * 0.82 + pointerVelocityX * 0.32,
        0.08
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        pointerY * 0.58 + pointerVelocityY * 0.24,
        0.08
      );
      groupRef.current.rotation.y +=
        (0.008 +
          atmosphere.starDriftSpeed * 0.01 +
          lensConfig.orbitSpeed * 0.01) *
        burst *
        performanceBudget.motion;
      groupRef.current.rotation.x =
        Math.sin(
          clock.elapsedTime *
            (0.8 + atmosphere.starDriftSpeed * 0.4) *
            performanceBudget.motion
        ) *
          0.08 *
          burst +
        pointerY * 0.14 +
        pointerVelocityY * 0.08;
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        pointerX * 0.2 + pointerVelocityX * 0.12,
        0.08
      );
    }

    if (pulseRef.current) {
      const scale =
        1 +
        burst * 0.42 +
        Math.sin(
          clock.elapsedTime *
            (4 + atmosphere.starDriftSpeed * 2) *
            performanceBudget.motion
        ) *
          0.06 *
          burst +
        lensConfig.pushIn * 0.16 +
        pointerSignal.fieldEnergy * 0.08 +
        pointerMomentum * 0.12;
      pulseRef.current.scale.setScalar(scale);
    }

    if (sweepRef.current) {
      sweepRef.current.position.x = THREE.MathUtils.lerp(
        sweepRef.current.position.x,
        pointerX * 0.52 + pointerVelocityX * 0.26,
        0.08
      );
      sweepRef.current.rotation.z =
        clock.elapsedTime *
        (0.3 + atmosphere.starDriftSpeed * 0.2 + lensConfig.orbitSpeed * 0.3) *
        performanceBudget.motion;
      sweepRef.current.position.y =
        Math.sin(clock.elapsedTime * 1.2 * performanceBudget.motion) *
          0.4 *
          burst +
        pointerY * 0.36 +
        pointerVelocityY * 0.2;
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

function TouchPulseField({
  activeChapterIndex,
  interactionBurstActive,
  pointerSignalRef,
}: {
  activeChapterIndex: number;
  interactionBurstActive: boolean;
  pointerSignalRef: PointerSignalRef;
}) {
  const chapterId = CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id;
  const atmosphere = CHAPTER_ATMOSPHERES[chapterId];
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const burstRef = useRef(0);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const ringMat = useMemo(
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
  const haloMat = useMemo(
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
        metalness: 0.16,
        transparent: true,
        opacity: 0,
      }),
    [atmosphere.hazeColor, atmosphere.keyLightColor]
  );

  useFrame(({ clock }) => {
    const pointerSignal = pointerSignalRef.current;
    const pointerMomentum = pointerSignal.momentum;
    const performanceFactor = THREE.MathUtils.clamp(
      Number.isFinite(pointerSignal.performanceFactor)
        ? pointerSignal.performanceFactor
        : 1,
      0.62,
      1
    );
    const motionBudget = 0.74 + performanceFactor * 0.26;
    const glowBudget = 0.68 + performanceFactor * 0.32;

    burstRef.current = THREE.MathUtils.lerp(
      burstRef.current,
      interactionBurstActive ? 1 : 0,
      interactionBurstActive ? 0.16 : 0.08
    );

    const glow = Math.min(
      1.18,
      (pointerSignal.fieldEnergy * 0.92 +
        burstRef.current * 0.38 +
        pointerMomentum * 0.26) *
        glowBudget
    );

    ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, glow * 0.24, 0.12);
    haloMat.opacity = THREE.MathUtils.lerp(haloMat.opacity, glow * 0.18, 0.12);
    coreMat.opacity = THREE.MathUtils.lerp(coreMat.opacity, glow * 0.14, 0.12);
    coreMat.emissiveIntensity = THREE.MathUtils.lerp(
      coreMat.emissiveIntensity,
      0.8 + glow * 2.4,
      0.12
    );

    if (!groupRef.current) {
      return;
    }

    groupRef.current.visible = glow > 0.03;

    if (!groupRef.current.visible) {
      return;
    }

    targetPosition.set(
      pointerSignal.position.x *
        (pointerSignal.coarse ? 4.6 : 3.4) *
        motionBudget +
        pointerSignal.velocity.x * 0.85,
      pointerSignal.position.y *
        (pointerSignal.coarse ? 2.8 : 2.1) *
        motionBudget +
        pointerSignal.velocity.y * 0.55,
      -1.8
    );
    groupRef.current.position.lerp(
      targetPosition,
      (pointerSignal.coarse ? 0.18 : 0.12) * motionBudget
    );
    groupRef.current.rotation.z = clock.elapsedTime * 0.25 * motionBudget;

    if (ringRef.current) {
      const scale =
        0.82 +
        glow * 0.55 +
        pointerMomentum * 0.18 +
        Math.sin(clock.elapsedTime * 4.2 * motionBudget) * 0.05 * glow;
      ringRef.current.scale.setScalar(scale);
    }

    if (haloRef.current) {
      haloRef.current.scale.x = THREE.MathUtils.lerp(
        haloRef.current.scale.x,
        1 + glow * 0.8 * motionBudget,
        0.12
      );
      haloRef.current.scale.y = THREE.MathUtils.lerp(
        haloRef.current.scale.y,
        Math.max(0.84, 1 - glow * 0.18),
        0.12
      );
      haloRef.current.rotation.z = clock.elapsedTime * 0.42 * motionBudget;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]} material={haloMat}>
        <ringGeometry args={[0.18, 0.44, 48]} />
      </mesh>
      <mesh ref={ringRef} material={ringMat}>
        <torusGeometry args={[0.34, 0.03, 10, 56]} />
      </mesh>
      <mesh material={coreMat}>
        <sphereGeometry args={[0.12, 18, 18]} />
      </mesh>
    </group>
  );
}

export interface OliveUniverseSceneOverlaysProps {
  activeChapterIndex: number;
  profile: SceneProfile;
  sceneLens: SceneLensMode;
  interactionBurstActive: boolean;
  interactionBurstCycle: number;
  pointerSignalRef: PointerSignalRef;
}

export default function OliveUniverseSceneOverlays({
  activeChapterIndex,
  profile,
  sceneLens,
  interactionBurstActive,
  interactionBurstCycle,
  pointerSignalRef,
}: OliveUniverseSceneOverlaysProps) {
  const activeChapterId = CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id;

  return (
    <>
      <SceneSignatureLayer
        key={`signature-${activeChapterId}`}
        activeChapterIndex={activeChapterIndex}
        profile={profile}
        sceneLens={sceneLens}
        pointerSignalRef={pointerSignalRef}
      />
      <InteractionBurstLayer
        key={`burst-${interactionBurstCycle}-${activeChapterId}`}
        activeChapterIndex={activeChapterIndex}
        profile={profile}
        sceneLens={sceneLens}
        interactionBurstActive={interactionBurstActive}
        pointerSignalRef={pointerSignalRef}
      />
      <TouchPulseField
        activeChapterIndex={activeChapterIndex}
        interactionBurstActive={interactionBurstActive}
        pointerSignalRef={pointerSignalRef}
      />
    </>
  );
}
