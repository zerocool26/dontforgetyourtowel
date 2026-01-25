import * as THREE from 'three';

// 2026-Era Physical Glass Material
// Uses Transmission for real-time background refraction
// Uses Dispersion for chromatic aberration within the volume
export function createDiamondMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,

    // Transmission (Glass)
    transmission: 1.0,
    thickness: 1.5, // Volume thickness for refraction
    ior: 2.4, // Diamond Index of Refraction

    // Dispersion (Prism effects)
    // Note: Dispersion is new in recent Three.js versions.
    // If getting type errors, ensure @types/three is updated or cast to any.
    // dispersion: 0.1, /// Commented out until we verify types, usually safe to add via Object.assign if missing in d.ts

    // Clearcoat
    clearcoat: 1.0,
    clearcoatRoughness: 0,

    // Environmental lighting is key
    envMapIntensity: 1.0,
  });

  // Inject dispersion property nicely in case TS complains
  // @ts-expect-error Dispersion not yet in types
  mat.dispersion = 0.05;

  return mat;
}

export function createFrostedGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xaaccff,
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.95,
    thickness: 0.5,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.0,
  });
}
