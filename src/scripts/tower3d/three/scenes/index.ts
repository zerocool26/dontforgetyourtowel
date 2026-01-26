import * as THREE from 'three';
import { SceneBase } from './definitions/SceneBase';
import { FeedbackForgeScene } from './definitions/FeedbackForgeScene';
import { LiquidMetalScene } from './definitions/LiquidMetalScene';
import { MillionFirefliesScene } from './definitions/MillionFirefliesScene';
import { RibbonFieldScene } from './definitions/RibbonFieldScene';
import { AuroraCurtainScene } from './definitions/AuroraCurtainScene';
import { EventHorizonScene } from './definitions/EventHorizonScene';
import { KaleidoGlassScene } from './definitions/KaleidoGlassScene';
import { MatrixRainScene } from './definitions/MatrixRainScene';
import { OrbitalMechanicsScene } from './definitions/OrbitalMechanicsScene';
import { VoronoiShardsScene } from './definitions/VoronoiShardsScene';
import { MoireInterferenceScene } from './definitions/MoireInterferenceScene';
import { NeuralNetworkScene } from './definitions/NeuralNetworkScene';
import { LibraryScene } from './definitions/LibraryScene';
import { BioluminescentScene } from './definitions/BioluminescentScene';
import { HolographicCityScene } from './definitions/HolographicCityScene';
import { RealityCollapseScene } from './definitions/RealityCollapseScene';
import { ElectricStormScene } from './definitions/ElectricStormScene';

// Re-export shared types/bases for consumer compatibility
export * from './definitions/types';
export * from './definitions/SceneBase';
export * from './definitions/SceneUtils';

/**
 * Factory function to instantiate all available scenes.
 * Returns an array of SceneBase instances, ordered by scene ID/logic.
 */
export function createScenes(camera?: THREE.PerspectiveCamera): SceneBase[] {
  const sharedCamera =
    camera ||
    new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

  const scenes: SceneBase[] = [
    new FeedbackForgeScene(), // 00
    new LiquidMetalScene(), // 01
    new MillionFirefliesScene(), // 02
    new RibbonFieldScene(), // 03
    new AuroraCurtainScene(), // 04
    new EventHorizonScene(), // 05
    new KaleidoGlassScene(), // 06
    new MatrixRainScene(), // 07
    new OrbitalMechanicsScene(), // 08
    new VoronoiShardsScene(), // 09
    new MoireInterferenceScene(), // 10
    new NeuralNetworkScene(), // 11
    new LibraryScene(), // 12
    new BioluminescentScene(), // 13
    new HolographicCityScene(), // 14
    new RealityCollapseScene(), // 15
    new ElectricStormScene(), // 16
  ];

  // Initialize all scenes with the shared camera
  scenes.forEach(scene => {
    scene.camera = sharedCamera;
  });

  return scenes;
}
