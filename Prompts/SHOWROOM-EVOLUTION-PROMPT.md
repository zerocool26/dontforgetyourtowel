# Ultra-Advanced 3D Showroom Evolution (v4) — dontforgetyourtowel

> This is a high-rigor, engineering-grade prompt for an AI agent to push the existing Astro/Three.js car showroom into a "Grade-A" automotive configurator.

**Context:** The showroom currently supports v3 features: procedural wraps, glass modes, finish selection (matte/satin/gloss), clearcoat, adaptive FPS, command palette, and camera bookmarks. The goal is to move from "functional configurator" to "photorealistic experience."

---

## 1. Role & Objective

**Role:** Lead Creative Technologist & Shading Engineer.
**Objective:** Enhance realism, physics-based interactions, and interactive storytelling within `src/pages/car-showroom.astro` and `src/scripts/car-showroom-v3.ts`.

---

## 2. Enhancement Domains

### A. Material Photorealism (The "Triple-A" Look)

1.  **Compound Paint Shaders:** Implement "Flake" or "Pearlescent" effects using a secondary normal map or procedural noise on the clearcoat layer to simulate metallic grain.
2.  **Subsurface & Transparency:** Add `transmission` and `thickness` controls to light lenses and interior plastics to avoid "hollow" looks.
3.  **Tire & Rubber Physics:** Improve tire materials with micro-bump maps for sidewall text and high-roughness rubber that reacts correctly to light.
4.  **Real-time Reflections:** Implement "Screen Space Reflections" (SSR) or improved planar reflections for the floor to show the car's underside more realistically.

### B. Storytelling & Animation

1.  **Stateful Animations:** Use the `AnimationMixer` to map specific keys or UI buttons to "Open Doors," "Pop Hood," or "Deploy Spoiler."
2.  **Interior Mode:** Create a "Jump to Interior" camera preset that repositions the `OrbitControls` target and adjusts the near-clipping plane for tight cockpit viewing.
3.  **Localized Hotspots:** Implement a raycasting layer that detects "Part Markers." Clicking a wheel should zoom to it; clicking a headlight should toggle it.

### C. Environmental Interaction

1.  **Weather States:** Add a "Wet Mesh" mode that increases specularity and adds procedural "water droplets" (normal map offset) to the body.
2.  **Dirt/Wear Layer:** Implement a "Road Grime" slider that blends a dirt texture (via a second UV set or vertex colors) onto the lower panels.
3.  **Dynamic Shadows:** Upgrade to `ContactShadows` or high-resolution `PCSS` (Percentage Closer Soft Shadows) for a softer, more grounded contact patch.

### D. Advanced Personalization

1.  **License Plate Generator:** A dynamic `CanvasTexture` that takes user text and renders it onto the plate mesh.
2.  **Local Decal System:** Allow "Sticker" placement via raycast—letting users place logos on windows or doors without modifying the base UVs.
3.  **Part Swapping:** Implement a system to toggle visibility of `Object3D` groups (e.g., "Standard Wheels" vs "Performance Wheels").

---

## 3. Technical Implementation Rules

1.  **Data-SR Hooks only:** All UI control must be driven by `data-sr-*` hooks in the `.astro` file and queried in the `.ts` file. Do not use framework-specific state (React/Solid) for the core Three.js loop.
2.  **Safe Material Management:**
    - Always use `originalMaterialState` snapshots.
    - Ensure `dispose()` is called on all new textures (`CanvasTexture`, decals).
    - Maintain the "Keep original materials" toggle as a master bypass.
3.  **Adaptive Quality 2.0:**
    - If FPS drops below 30, automatically disable "SSR" or high-res shadows before lowering resolution.
    - Implement "Progressive Path Tracing" (if possible via additional libraries) for static screenshots.
4.  **CLI Compatibility:** Ensure all new attributes/functions are documented so the `error-reviewer-cli.ts` doesn't flag unused bindings.

---

## 4. Specific Feature: "The Cinematic Mode"

Create a toggle that:

1.  Hides the UI overlay (auto-hide).
2.  Enables a slow "Auto-Orbit/Cam-Shake."
3.  Increases UnrealBloomPass thresholds for a "Commercial" look.
4.  Sets a fixed aspect ratio (2.35:1) via a letterbox overlay.

---

## 5. Definition of Victory

- **The car looks "heavy":** Soft contact shadows and realistic reflections anchor it to the floor.
- **The materials feel "layered":** Paint has depth (flake), glass has thickness, and lights have glow.
- **The interaction is "meaningful":** Users aren't just changing colors; they are opening doors and exploring the build.
- **Performance is "locked":** 60fps on modern desktops, 30fps on mobile via the adaptive engine.
