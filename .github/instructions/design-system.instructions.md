---
description: 'Use when editing shared UI and business components. Enforce the premium editorial system, accessibility, and reusable mobile-first behavior.'
applyTo: 'src/components/**'
---

# Shared component standards

- Reuse tokens and component classes from `src/styles/global.css`.
- Preserve the white, near-black, electric-blue, fine-rule, square-action system defined in `docs/design-system.md`.
- Reuse `PageHero.astro`, `EditorialBand.astro`, `MediaInterlude.astro`, and `CtaBand.astro` before introducing route-specific versions of those patterns.
- Keep shared image sources, alt text, captions, and crop positions in `src/data/visuals.ts`.
- Prefer open layouts and ledgers over generic cards, pills, badges, and dashboard panels.
- Keep focus states visible, controls keyboard-accessible, and major actions at least 48px tall.
- Respect reduced motion and avoid hover-dependent meaning.
- Keep shared components free of page-specific assumptions.
