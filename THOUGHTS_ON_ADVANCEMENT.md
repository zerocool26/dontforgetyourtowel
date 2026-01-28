# High-Level 3D Advancement Notes (2026)

This file stays intentionally high level: it captures the best “next steps” without over-scoping.

## What’s Already Here (Baseline)

- **Post pipeline**: Composer-based output with bloom/DOF/AA and a consistent tone-mapped look.
- **PBR environment**: Shared environment lighting for coherent reflections.
- **Interactive inputs**: Pointer/press/scroll velocity are part of the runtime model.
- **Instancing-first scenes**: Most chapters are GPU-friendly by default.

## Next Best Ideas (High Value, Low Drama)

### 1) Adaptive Quality Ladder

- Per-tier budgets for: DPR caps, RT resolution, max instance counts, and optional post passes.
- Default to “clean” on mobile/coarse pointer; let high-tier devices earn the extra gloss.

### 2) Chapter Identity Discipline

- Treat each chapter like a poster: one strong silhouette + one signature effect.
- Avoid stacking bloom + DOF + trails everywhere; save them for moments.

### 3) Transitions That Feel Designed

- Prefer 1–2 art-directed masks (portal iris / liquid wipe) over many random variants.
- Reduced-motion path: short crossfade or near-cut, keeping readability and comfort.

### 4) Performance Hygiene

- Strict disposal of geometries/materials/textures/RTs on switches.
- Hard guardrails for particle counts and dynamic buffers.

### 5) Optional Audio Reactivity (Subtle)

- If enabled, map **low/mid/high** to small parameter nudges (intensity, emission, turbulence) rather than full-on “music visualizer” behavior.
