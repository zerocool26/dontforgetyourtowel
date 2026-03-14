/** @jsxImportSource react */
/** @jsxRuntime automatic */
import {
  type ComponentProps,
  type MutableRefObject,
  useMemo,
  useRef,
} from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import type {
  BloomEffect,
  ChromaticAberrationEffect,
  NoiseEffect,
  VignetteEffect,
} from 'postprocessing';
import type { CanvasPointerSignal } from './OliveUniverseCanvas';

type BloomComponentRef = ComponentProps<typeof Bloom>['ref'];
type ChromaticAberrationComponentRef = ComponentProps<
  typeof ChromaticAberration
>['ref'];
type NoiseComponentRef = ComponentProps<typeof Noise>['ref'];
type VignetteComponentRef = ComponentProps<typeof Vignette>['ref'];

export interface OliveUniversePostFxProps {
  aberrationOffset: THREE.Vector2;
  bloomIntensity: number;
  noiseOpacity: number;
  pointerSignalRef: MutableRefObject<CanvasPointerSignal>;
  interactionBurstActive: boolean;
}

function getPostFxBudget(pointerSignal: CanvasPointerSignal) {
  const performanceFactor = THREE.MathUtils.clamp(
    Number.isFinite(pointerSignal.performanceFactor)
      ? pointerSignal.performanceFactor
      : 1,
    0.58,
    1.05
  );

  return {
    clarity: 0.64 + performanceFactor * 0.36,
    glow: 0.68 + performanceFactor * 0.32,
    drift: 0.7 + performanceFactor * 0.3,
  };
}

export default function OliveUniversePostFx({
  aberrationOffset,
  bloomIntensity,
  noiseOpacity,
  pointerSignalRef,
  interactionBurstActive,
}: OliveUniversePostFxProps) {
  const bloomRef = useRef<BloomEffect | null>(null);
  const aberrationRef = useRef<ChromaticAberrationEffect | null>(null);
  const noiseRef = useRef<NoiseEffect | null>(null);
  const vignetteRef = useRef<VignetteEffect | null>(null);
  const baseAberrationOffset = useMemo(
    () => aberrationOffset.clone(),
    [aberrationOffset]
  );

  useFrame((_, delta) => {
    const pointerSignal = pointerSignalRef.current;
    const budget = getPostFxBudget(pointerSignal);
    const interactionEnergy = THREE.MathUtils.clamp(
      Math.max(pointerSignal.energy, pointerSignal.fieldEnergy) +
        (interactionBurstActive ? 0.18 : 0),
      0,
      1.15
    );
    const motionBias = pointerSignal.coarse ? 1.2 : 1;

    if (bloomRef.current) {
      const targetBloomIntensity =
        bloomIntensity *
        THREE.MathUtils.clamp(
          budget.glow * (0.84 + interactionEnergy * 0.18),
          0.74,
          1.3
        );

      bloomRef.current.intensity = THREE.MathUtils.damp(
        bloomRef.current.intensity,
        targetBloomIntensity,
        4.8,
        delta
      );
    }

    if (aberrationRef.current) {
      const targetAberrationScale = THREE.MathUtils.clamp(
        0.76 + budget.drift * 0.24 + interactionEnergy * 0.14,
        0.72,
        1.2
      );
      const driftStrength =
        0.00014 * motionBias * (0.45 + interactionEnergy * 0.55) * budget.drift;
      const targetOffsetX =
        baseAberrationOffset.x * targetAberrationScale +
        pointerSignal.position.x * driftStrength;
      const targetOffsetY =
        baseAberrationOffset.y * targetAberrationScale +
        pointerSignal.position.y * driftStrength;

      aberrationRef.current.offset.set(
        THREE.MathUtils.damp(
          aberrationRef.current.offset.x,
          targetOffsetX,
          5.5,
          delta
        ),
        THREE.MathUtils.damp(
          aberrationRef.current.offset.y,
          targetOffsetY,
          5.5,
          delta
        )
      );
      aberrationRef.current.radialModulation =
        interactionBurstActive || interactionEnergy > 0.12;
      aberrationRef.current.modulationOffset = THREE.MathUtils.damp(
        aberrationRef.current.modulationOffset,
        interactionBurstActive ? 0.2 : pointerSignal.coarse ? 0.17 : 0.14,
        4.5,
        delta
      );
    }

    if (vignetteRef.current) {
      vignetteRef.current.darkness = THREE.MathUtils.damp(
        vignetteRef.current.darkness,
        THREE.MathUtils.clamp(
          0.58 + (1 - budget.clarity) * 0.08 - interactionEnergy * 0.05,
          0.49,
          0.65
        ),
        4.2,
        delta
      );
      vignetteRef.current.offset = THREE.MathUtils.damp(
        vignetteRef.current.offset,
        THREE.MathUtils.clamp(
          0.31 + interactionEnergy * 0.04 + (pointerSignal.coarse ? 0.018 : 0),
          0.28,
          0.38
        ),
        4.2,
        delta
      );
    }

    if (noiseRef.current) {
      const targetNoiseOpacity = THREE.MathUtils.clamp(
        noiseOpacity *
          THREE.MathUtils.clamp(
            0.82 + budget.clarity * 0.18 - interactionEnergy * 0.14,
            0.52,
            1
          ),
        0.001,
        Math.max(noiseOpacity, 0.001)
      );

      noiseRef.current.blendMode.setOpacity(
        THREE.MathUtils.damp(
          noiseRef.current.blendMode.getOpacity(),
          targetNoiseOpacity,
          4.6,
          delta
        )
      );
    }
  });

  return (
    <EffectComposer>
      <Bloom
        ref={bloomRef as unknown as BloomComponentRef}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.65}
        intensity={bloomIntensity}
        mipmapBlur
      />
      <ChromaticAberration
        ref={aberrationRef as unknown as ChromaticAberrationComponentRef}
        blendFunction={BlendFunction.NORMAL}
        offset={aberrationOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        ref={vignetteRef as unknown as VignetteComponentRef}
        offset={0.32}
        darkness={0.62}
      />
      <Noise
        ref={noiseRef as unknown as NoiseComponentRef}
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={noiseOpacity}
      />
    </EffectComposer>
  );
}
