/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { useMemo, useRef } from 'react';
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

export interface OliveUniverseSceneOverlaysProps {
  activeChapterIndex: number;
  profile: SceneProfile;
  sceneLens: SceneLensMode;
  interactionBurstActive: boolean;
  interactionBurstCycle: number;
}

export default function OliveUniverseSceneOverlays({
  activeChapterIndex,
  profile,
  sceneLens,
  interactionBurstActive,
  interactionBurstCycle,
}: OliveUniverseSceneOverlaysProps) {
  const activeChapterId = CHAPTERS[activeChapterIndex]?.id ?? CHAPTERS[0].id;

  return (
    <>
      <SceneSignatureLayer
        key={`signature-${activeChapterId}`}
        activeChapterIndex={activeChapterIndex}
        profile={profile}
        sceneLens={sceneLens}
      />
      <InteractionBurstLayer
        key={`burst-${interactionBurstCycle}-${activeChapterId}`}
        activeChapterIndex={activeChapterIndex}
        profile={profile}
        sceneLens={sceneLens}
        interactionBurstActive={interactionBurstActive}
      />
    </>
  );
}
