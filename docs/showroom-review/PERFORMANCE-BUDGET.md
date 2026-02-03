# Performance Budget (Targets)

These targets assume a marketing/demo environment, not a full AAA configurator.

## Baseline targets

| Metric                              | Target (Desktop) | Target (Mobile) | Notes                             |
| ----------------------------------- | ---------------: | --------------: | --------------------------------- |
| First interaction (controls usable) |           < 2.5s |          < 3.5s | Separate from full model load.    |
| Model load (default)                |             < 4s |            < 6s | Depends on network + cache.       |
| Steady FPS (Balanced)               |            55–60 |           45–60 | Adaptive quality already present. |
| VRAM est. (default model)           |          < 700MB |         < 450MB | Texture formats matter a lot.     |
| Draw calls (typical)                |            < 250 |           < 180 | Model-dependent.                  |
| Triangle count                      |           < 1.5M |          < 900k | LOD recommended for mobile.       |

## Quality strategy

- Prefer disabling expensive features before dropping resolution:
  1. Floor reflections
  2. High-quality shadows
  3. Lower dynamic resolution

## Instrumentation suggestions

- Add a “Performance HUD (dev)” section for:
  - Estimated VRAM (textures + render targets)
  - Render target sizes / pixel ratio
  - Draw calls, triangles, shader count
- Add a persistent “Load phases” timeline:
  - fetch → decode → upload → first frame
