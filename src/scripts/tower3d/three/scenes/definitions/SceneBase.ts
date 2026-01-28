import * as THREE from 'three';
import type { SceneRuntime, TowerScene } from './types';

export abstract class SceneBase implements TowerScene {
  id: string = 'unknown';
  group: THREE.Group;
  camera: THREE.PerspectiveCamera;
  bg?: THREE.Color;

  // Design resolution reference
  protected baseFov = 45;
  protected baseDistance = 14;
  // This radius represents the "safe zone" of the scene content.
  // We ensure this radius is always visible.
  protected contentRadius = 4.5;

  constructor() {
    this.group = new THREE.Group();
    // Start with a standard setup
    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 100);
    this.camera.position.set(0, 0, this.baseDistance);
  }

  abstract init(ctx: SceneRuntime): void;
  abstract update(ctx: SceneRuntime): void;

  render(ctx: SceneRuntime): void {
    ctx.renderer.render(this.group, this.camera);
  }

  resize(ctx: SceneRuntime): void {
    const aspect = ctx.size.width / ctx.size.height;
    this.camera.aspect = aspect;

    // Responsive Logic:
    // We want to ensure 'this.contentRadius' is visible both vertically and horizontally.
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const tanHalf = Math.tan(fovRad / 2);

    let requiredDist = 0;
    if (aspect < 1.0) {
      // Portrait: Fit width
      requiredDist = (this.contentRadius * 1.05) / (tanHalf * aspect);
    } else {
      // Landscape: Fit height
      requiredDist = (this.contentRadius * 1.05) / tanHalf;
    }

    // Apply strict centering
    this.baseDistance = requiredDist;
    // Note: The update() loop typically interpolates camera.z to baseDistance.

    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    const disposeMaterial = (material: THREE.Material) => {
      // Dispose any textures attached to common material slots.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyMat = material as any;
      for (const key of Object.keys(anyMat)) {
        const value = anyMat[key];
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      }
      material.dispose();
    };

    this.group.traverse(obj => {
      // Geometry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyObj = obj as any;
      const geometry = anyObj.geometry as THREE.BufferGeometry | undefined;
      geometry?.dispose?.();

      // Materials (Mesh / Points / Line)
      const material = anyObj.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;
      if (Array.isArray(material)) {
        material.forEach(m => disposeMaterial(m));
      } else if (material) {
        disposeMaterial(material);
      }
    });
  }
}
