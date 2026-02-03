# Feature Gap Matrix (v3 → Pro Configurator)

This matrix compares the current 3D Car Showroom implementation (v3 runtime) against a “professional automotive configurator” bar, and ranks gaps by priority (MoSCoW) and effort.

Legend:

- **Value**: User impact (H/M/L)
- **Effort**: Engineering cost (S/M/L)
- **MoSCoW**: Must / Should / Could / Won’t (for current phase)

| Area     | Capability                            |      Current | Gap | Value | Effort | MoSCoW | Notes / Next step                                                            |
| -------- | ------------------------------------- | -----------: | --: | ----: | -----: | -----: | ---------------------------------------------------------------------------- |
| Model    | Model catalog + metadata              |           ❌ |  ✅ |     H |      M |  **S** | Add `models.json` + tags + thumbnails; drive UI select.                      |
| Model    | Drag-and-drop import                  |           ✅ |  ❌ |     H |      S |  **M** | Implemented: drop GLB/GLTF onto viewer to load.                              |
| Model    | LOD switching                         |           ❌ |  ✅ |     H |      L |  **C** | Needs per-model LOD assets + runtime selection.                              |
| Model    | Progressive texture/mesh streaming    |           ❌ |  ✅ |     M |      L |  **W** | Requires asset pipeline + partial loading strategy.                          |
| Model    | Asset versioning + cache invalidation |           ❌ |  ✅ |     M |      M |  **S** | Service worker cache keys + model manifest.                                  |
| Material | OEM paint swatches                    |           ❌ |  ✅ |     H |      M |  **S** | Curated palette JSON; map to UI and presets.                                 |
| Material | Per-part paint override               |   ✅ (basic) |  ✅ |     H |      M |  **S** | Already has part colors; make it “configurator-grade” with presets + resets. |
| Material | Custom wrap texture upload            |           ❌ |  ✅ |     M |      M |  **C** | Allow image upload and map to UV / triplanar; handle scaling.                |
| Lighting | HDRI upload                           |           ❌ |  ✅ |     M |      M |  **C** | Add file input for `.hdr` and PMREM conversion.                              |
| Lighting | Time-of-day slider                    |           ❌ |  ✅ |     M |      L |  **W** | Requires sun/sky model and physically-based setup.                           |
| Camera   | Focal length presets                  |     ✅ (FOV) |  ✅ |     H |      S |  **S** | Provide named presets + consistent framing.                                  |
| Camera   | Depth of field                        |           ❌ |  ✅ |     M |      M |  **C** | Postprocessing DoF pass; careful mobile gating.                              |
| Camera   | Rule-of-thirds overlay                |           ❌ |  ✅ |     M |      S |  **C** | Simple CSS overlay toggle.                                                   |
| Hotspots | Authoring workflow                    |           ❌ |  ✅ |     H |      M |  **S** | Save hotspot definitions to preset schema; allow edit mode.                  |
| Config   | Option packages                       | ✅ (presets) |  ✅ |     M |      S |  **S** | Curate presets into packages + description blocks.                           |
| Config   | Pricing integration                   |           ❌ |  ✅ |     M |      M |  **W** | Needs data model + currency/i18n.                                            |
| Anim     | Headlight/taillight toggle            |           ❌ |  ✅ |     M |      S |  **C** | Find emissive meshes; toggle intensity + bloom bias.                         |
| Perf     | GPU instancing/atlasing               |           ❌ |  ✅ |     M |      L |  **W** | Mostly asset-pipeline dependent.                                             |
| Perf     | Memory budget panel                   |   ✅ (stats) |  ✅ |     M |      M |  **C** | Add VRAM estimate + texture sizes; gated to dev.                             |
| Share    | Deep link full state                  |           ✅ |  ❌ |     H |      M |  **M** | Already has URL params; expand to include more UI + camera views.            |
| Export   | High-res supersample render           |           ❌ |  ✅ |     M |      M |  **C** | Render at higher DPR to offscreen canvas; beware memory.                     |
| A11y     | Reduced motion                        |           ✅ |  ❌ |     H |      S |  **M** | Implemented: disables autorotate + animation playback, removes shake.        |
| A11y     | Keyboard navigation                   | ✅ (partial) |  ✅ |     M |      M |  **S** | Audit focus order, add shortcuts to section toggles.                         |

## Quick Wins (High impact / Low effort)

- Drag-and-drop model import (done)
- Reduced motion behavior (done)
- Rule-of-thirds overlay toggle
- Headlight toggle (for compatible models)
- Stronger “reset per section” affordances
