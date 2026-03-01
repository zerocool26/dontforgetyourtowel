You are a world-class creative developer + award-winning web designer + realtime graphics engineer.

PROJECT CONTEXT

- Repo: Astro site.
- File: `src/pages/index.astro` currently contains a fullscreen WebGL/3D “hero” that reacts to scroll, but it feels like one layered scene going in/out.
- What I actually want: a fullscreen, scroll-driven “tower of floors” experience where each scroll section swaps the ENTIRE 3D world to a completely different, bespoke, 10/10 scene (not the same scene re-used with opacity/position changes).

GOAL (NON‑NEGOTIABLE)

- Keep the existing hero animation as Floor 0 (Scene00) with minimal changes besides integrating it into a proper scene system.
- After that, build 10 brand-new, completely original fullscreen 3D scenes (Scene01–Scene10).
- One fixed fullscreen canvas. The page scrolls; the canvas stays pinned. As the user hits each floor, the entire 3D scene changes.
- Scenes are NOT one big continuous world; they are separate “exhibits” that transition cinematically.
- This is a 3D art showcase. It must shock regular people, developers, and execs.

BENCHMARKS / RESEARCH (QUALITY BAR — DO NOT COPY, ONLY MEASURE AGAINST)

- “WebGL” collections on Awwwards (overall bar for craft + originality)
- Bruno Simon portfolio (interaction + polish bar)
- Garden award-winning experiences (story-driven + procedural bar)
- “The Deep Dive” (vertical scrollytelling descent vibe)
- Neal Agarwal “The Deep Sea” (scroll-as-depth metaphor done cleanly)
- GSAP ScrollTrigger patterns (pin/scrub/snap)
- Three.js postprocessing pipeline (composer + passes)
- glTF + KTX2/Basis pipeline (serious asset + performance pipeline)

DESIGN LANGUAGE (“SKYSCRAPER FLOORS” BUT ABSTRACT)

- Elevator/gallery descent: each floor is a self-contained exhibit with its own material language, lighting, mood, and hero moment.
- Minimal editorial overlay: floor index (01–10), title, 1-line caption, micro-interaction hint.
- The overlay should feel luxury + modern (not gamer UI). Let the 3D do the talking.
- Transitions feel like “doors opening”, “portal cuts”, “scanline wipes”, “ink reveals” — cinematic, not cheesy.

TECHNICAL REQUIREMENTS (HARD)

- Implement a `SceneDirector` (or similar) that manages:
  - Single renderer + single canvas
  - Multiple scene modules (init/enter/update/render/exit/dispose)
  - Scroll → (floorIndex + intraFloorProgress)
  - Cross-scene transitions using render targets + a custom blend shader (noise mask / portal / elevator wipe)
  - Asset caching + preload next scene + dispose previous scene GPU resources
- Performance:
  - Desktop target: 60fps when possible.
  - Mobile: aggressive quality scaling (particle counts, post FX off, lower DPR).
  - Respect `prefers-reduced-motion` (fallback to static poster + minimal movement).
- Engineering:
  - Clean, modular code; zero “everything in one file” spaghetti.
  - No template scenes (no generic starfield, no spinning logo, no basic cubes).

FIRST: ASK ME UP TO 6 QUESTIONS
Ask only what you need to lock art direction + constraints (brand vibe, device targets, ok to add audio, OK to ship heavy shaders, any existing 3D assets, any forbidden themes).

THEN: PROPOSE ARCHITECTURE

- Show the module layout you’ll create (Scene00…Scene10, director, utils, shaders).
- Explain how scroll mapping works (pinning, snap-to-floor, smoothing).
- Explain transitions (render target blend, easing, duration).

SCENE BRIEFS (IMPLEMENT ALL 10 AFTER THE EXISTING HERO)
Scene01 — “Liquid‑Metal SDF Relic”

- Hero: a raymarched liquid-metal artifact floating in filmic fog; morphs between 3 distinct forms as you scroll.
- Technique: SDF raymarch shader (analytic normals, soft shadows/AO-ish feel), temporal dithering, filmic tonemapping.
- Interaction: pointer creates dents/ripples; scroll changes “material memory” (viscosity / surface tension feel).

Scene02 — “Million Fireflies (GPGPU Swarm + Trails)”

- Hero: a dense swarm that coheres into a symbol, then detonates into a flow-field storm.
- Technique: ping-pong FBO sim (pos/vel), instanced points, accumulation buffer for trails.
- Interaction: scroll rewires attractor graph; pointer spawns local vortex.

Scene03 — “Kinetic Typography Monolith (Editorial, Violent Assembly)”

- Hero: brutalist 3D typography built from thousands of fragments; text assembles, fractures, reassembles into new phrases per floor progress.
- Technique: instancing + GPU-driven offsets; text via SDF glyphs (Troika or custom); fracture mask in shader.
- Interaction: hover reveals hidden second-layer microcopy through depth parallax and lighting shift.

Scene04 — “Non‑Euclidean Corridor (Portal Cut)”

- Hero: an impossible corridor where space folds; one portal cut and the world rules change completely.
- Technique: portal masking (stencil/depth), procedural corridor geometry, “cut” transition is the portal itself.
- Interaction: subtle pointer parallax changes the fold angle; scroll drives “room topology” swap.

Scene05 — “Crystal Refraction Garden (Premium, Dangerous Light)”

- Hero: floating refractive crystals with controlled dispersion; light splits, blooms, and smears cinematically.
- Technique: transmission/refraction + env maps + custom dispersion/chromatic split (not a generic CA slider); selective bloom.
- Interaction: scroll changes IOR + dispersion amount; pointer steers key light like a studio gaffer.

Scene06 — “Blueprint → Object Assembly (Line Truth to Solid Reality)”

- Hero: blueprint lines draw themselves, then inflate into solid objects; repeat with distinct object families (mechanical → organic).
- Technique: custom line material, edge-reveal shader, procedural extrusion + normal smoothing.
- Interaction: scrubbing reveals construction stages; snap labels land with perfect timing.

Scene07 — “Volumetric Ink Reveal Chamber”

- Hero: monochrome fog volume; ink clouds carve negative space to reveal a hidden sculpture, then swallow it again.
- Technique: volumetric raymarch in a box, noise advection feel, depth-aware compositing + dither.
- Interaction: pointer “stirs” the volume; scroll controls density, reveal threshold, and silhouette sharpness.

Scene08 — “Cloth & Light (Physics Banner Wrap)”

- Hero: a colossal fabric banner wraps past camera like an elevator curtain; projected patterns slide across folds.
- Technique: cloth sim (verlet or GPU), projected texture, shadow catcher, physically believable damping.
- Interaction: scroll drives wind profile; pointer acts like a hand push creating local fold waves.

Scene09 — “Sculpted Point Cloud / Scan Re-lighting”

- Hero: a point-cloud sculpture that re-lights dramatically; points reorganize into a new figure with a hard scene-cut transition.
- Technique: point sprites with depth attenuation, custom shading + color grading; optional gaussian-splat-like look if feasible.
- Interaction: scroll cycles lighting rigs (rim, top, underlight); pointer controls focus plane/DOF.

Scene10 — “Fractal Finale (Mic Drop)”

- Hero: plunge into an infinite procedural world; at the peak moment it collapses into a clean mark/CTA with perfect editorial timing.
- Technique: raymarched fractal or procedural SDF world, filmic grade, selective DOF.
- Interaction: scroll controls zoom/iteration depth; final snap resolves to CTA.

DELIVERABLES

- Code changes that integrate Scene00 (existing) + implement Scene01–Scene10 with the director + scroll floors UI.
- Update `src/pages/index.astro` so the canvas is fixed fullscreen and the “floors” are real scroll sections.
- Add docs: how to add a new scene, performance tiers, and where to tweak transitions.

QUALITY BAR (NO COMPROMISE)

- Every scene must look like a different studio’s signature demo.
- If any scene feels generic, replace it with something bolder.
- Wow first, but engineered: clean teardown, no memory leaks, progressive enhancement.
