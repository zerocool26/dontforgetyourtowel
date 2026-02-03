# Implementation Roadmap

## Phase 0 (Now) — Mobile UX + A11y (High impact / Low effort)

- ✅ Quick actions + pressed state + better bottom-sheet drag
- ✅ Quick jump navigation
- ✅ Drag-and-drop model import
- ✅ Reduced motion preference support
- Next:
  - Rule-of-thirds overlay toggle
  - Section-level reset buttons (Look/Camera/Env)

## Phase 1 (Next) — “Configurator-grade” data + presets

- Model catalog JSON with thumbnails + tags
- Curated paint swatches (OEM-like palettes)
- Packages (preset bundles with descriptions)
- Enhanced share state (camera views + more UI)

## Phase 2 (Later) — Visual realism upgrades

- HDRI upload + studio rigs
- Optional SSAO / DoF (mobile-gated)
- Headlight/taillight toggle for compatible models

## Phase 3 (Platform) — Architecture refactor

- Extract modules (PanelController/ShareService/AdaptiveQuality)
- Centralize selectors/constants
- Introduce internal event emitter for cross-module communication

## Non-goals (for now)

- Real pricing/commerce
- Full asset streaming pipeline
- WebXR/AR export
