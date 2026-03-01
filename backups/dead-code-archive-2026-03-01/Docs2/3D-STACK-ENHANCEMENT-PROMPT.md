# 3D Stack Enhancement Prompt (Landing Tower)

## Role

You are a senior creative technologist. Improve the entire landing-page 3D stack: scenes, transitions, output, and scroll pacing. Prioritize cinematic quality, technical correctness, performance discipline, and clean teardown.

## Non‑negotiables

- **Landing page only**: All tower/3D-stack upgrades apply ONLY to `/` (the landing).
- **No text overlays on the 3D tower**: No headings/copy/CTAs over the pinned canvas while scrolling. Any copy/CTAs remain **after** the tower section.
- **Reduced motion**: Respect `prefers-reduced-motion`. Transitions should shorten and heavy effects should downshift.
- **Performance & cleanup**: No leaks. Dispose geometries/materials/textures/RTs, remove listeners, and stop RAF on unmount.
- **No “immersive” terminology anywhere**: Avoid reintroducing that word in UI, routes, or docs.

## Current Architecture (assumptions)

- Tower lives under `src/scripts/tower3d/**`.
- Single pinned canvas; scenes swap as user scrolls across chapter blocks.
- A director (likely `SceneDirector`) handles:
  - Scroll → scene index mapping
  - RenderTarget A/B blending transitions
  - Pointer + scroll velocity inputs
  - `destroy()` cleanup for Astro navigation

## Goals (ship quality)

### 1) Better transitions (10/10)

Use **GSAP** to drive easing and timing (not just linear interpolation). Transitions should feel like camera choreography:

- Noise/displacement wipe with art-directed edge
- Mild chromatic separation + exposure ramp
- Optional subtle zoom drift / parallax shift
- Consistent black levels (no washed transitions)
- Reduced motion: crossfade or near-instant cut

### 2) Better output (global look)

Add a lightweight global post look that improves every scene:

- Vignette, grain, gentle chromatic
- Optional: subtle bloom/glow (if within performance budget)
- Stable color management (SRGB output, sane tone mapping)

### 3) Better scenes (design + variety)

Make each of Scene01–Scene10 feel like a distinct world with its own identity:

- Lighting: strong key/fill/rim choices; use environment maps when appropriate
- Material language per world: metal/glass/ink/cloth/point cloud should not look interchangeable
- Composition: readable silhouettes, intentional negative space, controlled palettes
- Interaction: pointer/velocity affects world in subtle but satisfying ways
- Mobile: degrade gracefully (fewer particles, lower RT resolution, fewer lights)

### 4) Longer scroll per chapter

Give each scene more time:

- Increase physical scroll distance per chapter (e.g., `vh` height)
- Optionally support per-chapter weights (`data-weight`) to tune pacing without changing layout

## Implementation Checklist

- Improve transition shader(s) and route the output through a consistent post pipeline.
- Use GSAP easing (`power3.inOut`, etc.) for transition progress.
- Keep an eye on:
  - RenderTarget sizes (respect DPR caps)
  - Renderer state resets (targets, clears)
  - `resize()` correctness
  - `destroy()` disposing everything created
- Verify:
  - Scrolling swaps scenes reliably
  - No console errors
  - CPU/GPU reasonable on mid-tier devices

## Deliverables

- Code changes that visibly improve transitions + output + pacing.
- If you change visuals, include a brief `IMPLEMENTATION-SUMMARY` update describing what changed and how to tune it.

## Constraints for creativity

Push the limits of **Three.js + GSAP** while staying shippable:

- Prefer art-directed math/shaders over huge geometry counts.
- Prefer 2–3 strong effects over 10 subtle ones.
- Keep scenes distinct: silhouette, palette, motion language, and interaction should differ.
