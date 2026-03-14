/** @jsxImportSource react */
/** @jsxRuntime automatic */
import * as THREE from 'three';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export interface OliveUniversePostFxProps {
  aberrationOffset: THREE.Vector2;
  bloomIntensity: number;
  noiseOpacity: number;
}

export default function OliveUniversePostFx({
  aberrationOffset,
  bloomIntensity,
  noiseOpacity,
}: OliveUniversePostFxProps) {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.18}
        luminanceSmoothing={0.65}
        intensity={bloomIntensity}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={aberrationOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette offset={0.32} darkness={0.62} />
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={noiseOpacity}
      />
    </EffectComposer>
  );
}
