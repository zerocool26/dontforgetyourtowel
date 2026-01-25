// src/scripts/tower3d/three/physics/simple-physics.ts
import * as THREE from 'three';

/**
 * A lightweight Verlet integration physics system.
 * Optimized for visual effects (particles/debris) rather than simulation accuracy.
 * Runs on the main thread but uses spatial hashing for performance.
 */
export class SimplePhysics {
  public positions: Float32Array;
  public oldPositions: Float32Array; // For Verlet velocity derivation
  public radii: Float32Array;
  public count: number;

  // Bounds for containment
  public bounds = new THREE.Vector3(10, 10, 5);
  public friction = 0.98;
  public restitution = 0.6; // Bounciness

  // Spatial Hash
  private grid: Map<string, number[]> = new Map();
  private cellSize = 1.0;

  constructor(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.oldPositions = new Float32Array(count * 3);
    this.radii = new Float32Array(count);
  }

  public initParticle(index: number, pos: THREE.Vector3, radius: number) {
    if (index >= this.count) return;

    this.positions[index * 3] = pos.x;
    this.positions[index * 3 + 1] = pos.y;
    this.positions[index * 3 + 2] = pos.z;

    this.oldPositions[index * 3] = pos.x;
    this.oldPositions[index * 3 + 1] = pos.y;
    this.oldPositions[index * 3 + 2] = pos.z;

    this.radii[index] = radius;
  }

  public update(
    dt: number,
    pointerPos?: THREE.Vector3,
    pointerRadius: number = 2.0
  ) {
    // 1. Integrate
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = this.positions[idx];
      const y = this.positions[idx + 1];
      const z = this.positions[idx + 2];

      const ox = this.oldPositions[idx];
      const oy = this.oldPositions[idx + 1];
      const oz = this.oldPositions[idx + 2];

      const vx = (x - ox) * this.friction;
      const vy = (y - oy) * this.friction;
      const vz = (z - oz) * this.friction;

      this.oldPositions[idx] = x;
      this.oldPositions[idx + 1] = y;
      this.oldPositions[idx + 2] = z;

      this.positions[idx] = x + vx;
      this.positions[idx + 1] = y + vy;
      this.positions[idx + 2] = z + vz;

      // Gravity-ish pull to center (optional, keeps scene contained)
      // this.positions[idx] = this.positions[idx] * 0.999;
    }

    // 2. Constraints (Box Container)
    const bx = this.bounds.x;
    const by = this.bounds.y;
    const bz = this.bounds.z;

    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const r = this.radii[i];

      if (this.positions[idx] > bx - r) {
        this.positions[idx] = bx - r;
        this.oldPositions[idx] =
          this.positions[idx] +
          (this.positions[idx] - this.oldPositions[idx]) * this.restitution;
      } else if (this.positions[idx] < -bx + r) {
        this.positions[idx] = -bx + r;
        this.oldPositions[idx] =
          this.positions[idx] +
          (this.positions[idx] - this.oldPositions[idx]) * this.restitution;
      }

      if (this.positions[idx + 1] > by - r) {
        this.positions[idx + 1] = by - r;
        this.oldPositions[idx + 1] =
          this.positions[idx + 1] +
          (this.positions[idx + 1] - this.oldPositions[idx + 1]) *
            this.restitution;
      } else if (this.positions[idx + 1] < -by + r) {
        this.positions[idx + 1] = -by + r;
        this.oldPositions[idx + 1] =
          this.positions[idx + 1] +
          (this.positions[idx + 1] - this.oldPositions[idx + 1]) *
            this.restitution;
      }

      if (this.positions[idx + 2] > bz - r) {
        this.positions[idx + 2] = bz - r;
        this.oldPositions[idx + 2] =
          this.positions[idx + 2] +
          (this.positions[idx + 2] - this.oldPositions[idx + 2]) *
            this.restitution;
      } else if (this.positions[idx + 2] < -bz + r) {
        this.positions[idx + 2] = -bz + r;
        this.oldPositions[idx + 2] =
          this.positions[idx + 2] +
          (this.positions[idx + 2] - this.oldPositions[idx + 2]) *
            this.restitution;
      }
    }

    // 3. Interaction (Pointer Repel)
    if (pointerPos) {
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3;
        const dx = this.positions[idx] - pointerPos.x;
        const dy = this.positions[idx + 1] - pointerPos.y;
        const dz = this.positions[idx + 2] - pointerPos.z;

        const distSq = dx * dx + dy * dy + dz * dz;
        const radSum = this.radii[i] + pointerRadius;

        if (distSq < radSum * radSum && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = radSum - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Push away
          const force = overlap * 0.5; // Stiff response
          this.positions[idx] += nx * force;
          this.positions[idx + 1] += ny * force;
          this.positions[idx + 2] += nz * force;
        }
      }
    }

    // 4. Collisions (Solver Iterations)
    // Simplified: No spatial hash for < 100 particles, but O(N^2) sucks for 1000.
    // Let's implement a quick brute force for neighbors if count is low, or Grid if high.
    // For 1000 particles, Grid is mandatory.

    this.updateGrid();
    this.solveCollisions();
  }

  private updateGrid() {
    this.grid.clear();
    for (let i = 0; i < this.count; i++) {
      const x = Math.floor(this.positions[i * 3] / this.cellSize);
      const y = Math.floor(this.positions[i * 3 + 1] / this.cellSize);
      const z = Math.floor(this.positions[i * 3 + 2] / this.cellSize);
      const key = `${x},${y},${z}`;

      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push(i);
    }
  }

  private solveCollisions() {
    // Check neighbor cells
    for (const [key, indices] of this.grid) {
      const [cx, cy, cz] = key.split(',').map(Number);

      // Check self cell
      this.checkCell(indices, indices);

      // Check neighbors (only half to avoid double checks)
      // +X
      this.checkNeighbor(indices, cx + 1, cy, cz);
      // +Y
      this.checkNeighbor(indices, cx, cy + 1, cz);
      this.checkNeighbor(indices, cx + 1, cy + 1, cz);
      this.checkNeighbor(indices, cx - 1, cy + 1, cz);
      // +Z (9 neighbors)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          this.checkNeighbor(indices, cx + dx, cy + dy, cz + 1);
        }
      }
    }
  }

  private checkNeighbor(
    indicesA: number[],
    cx: number,
    cy: number,
    cz: number
  ) {
    const key = `${cx},${cy},${cz}`;
    const indicesB = this.grid.get(key);
    if (indicesB) {
      this.checkCell(indicesA, indicesB);
    }
  }

  private checkCell(indicesA: number[], indicesB: number[]) {
    for (let i = 0; i < indicesA.length; i++) {
      const idxA = indicesA[i];
      // If checking same cell, start j from i+1
      const startJ = indicesA === indicesB ? i + 1 : 0;

      for (let j = startJ; j < indicesB.length; j++) {
        const idxB = indicesB[j];

        // Collision check
        const x1 = this.positions[idxA * 3];
        const y1 = this.positions[idxA * 3 + 1];
        const z1 = this.positions[idxA * 3 + 2];

        const x2 = this.positions[idxB * 3];
        const y2 = this.positions[idxB * 3 + 1];
        const z2 = this.positions[idxB * 3 + 2];

        const dx = x1 - x2;
        const dy = y1 - y2;
        const dz = z1 - z2;

        const distSq = dx * dx + dy * dy + dz * dz;
        const radSum = this.radii[idxA] + this.radii[idxB];

        if (distSq < radSum * radSum && distSq > 0.000001) {
          const dist = Math.sqrt(distSq);
          const overlap = radSum - dist;
          const factor = overlap * 0.5; // Split the move

          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Displace A
          this.positions[idxA * 3] += nx * factor;
          this.positions[idxA * 3 + 1] += ny * factor;
          this.positions[idxA * 3 + 2] += nz * factor;

          // Displace B
          this.positions[idxB * 3] -= nx * factor;
          this.positions[idxB * 3 + 1] -= ny * factor;
          this.positions[idxB * 3 + 2] -= nz * factor;
        }
      }
    }
  }
}
