# Agent Guide

This is an Astro 7 static marketing site for CHICAGOS #1 MSP, an integrated Chicago technology consulting, software engineering, cloud, cybersecurity, managed IT, data, and automation firm.

## First Moves

- Run `git status --short --branch` before editing.
- Read `README.md`, `.github/copilot-instructions.md`, and any matching `.github/instructions/*.instructions.md` file for the files you touch.
- Treat `backups/`, `coverage/`, `dist/`, `out/`, `playwright-report/`, and `test-results/` as generated or archive material, not active product code.
- Keep internal links base-path safe with `withBasePath()` from `src/utils/helpers.ts`.

## Architecture Rules

- Public routes live in `src/pages/**` and should use `src/layouts/MarketingLayout.astro`.
- Preact is the primary interactive layer for public UI in `src/components/**/*.tsx`.
- React-only components stay in `src/components/react/**`.
- Solid-only components stay in `src/components/solid/**`.
- Shared UI should prefer `src/components/**`, `src/styles/global.css`, and the editorial primitives documented in `docs/design-system.md` before new one-off CSS.
- Repeated marketing content belongs in `src/data/**` when it appears on more than one route.
- Numbered ordinal ledgers are one reading shape, not the only one. Give each route a distinct combination of the structural primitives in `docs/design-system.md`; the `every route carries a distinct section shape` e2e test fails if two routes match. Their content lives in `src/data/model.ts`.
- Shared Chicago photography, alt text, captions, and crop positions belong in `src/data/visuals.ts`; routes select a `mediaKey` instead of importing those assets directly.

## UX Rules

- Lead public pages with buyer problem, buyer fit, proof, and next action before deep capability detail.
- Keep mobile hierarchy calm: one primary CTA, one secondary CTA, no dense hero checklist walls.
- Tap targets should be at least 44px tall; use 48px for major actions.
- Preserve keyboard access, visible focus states, reduced-motion behavior, and existing `data-*` test hooks.
- Avoid generic AI or futurist positioning unless it is tied to governance, security, workflow, or measurable operating clarity.
- Preserve the white, near-black, electric-blue editorial system: large Manrope headlines, restrained serif emphasis, fine rules, square actions, open ledgers, and real Chicago photography.
- Use image-aware `PageHero` variants and at most one `MediaInterlude` to create depth on long buyer routes; keep legal and utility routes quieter.

## Validation Tiers

- Tiny docs/content edit: `bun run typecheck`
- Component or route edit: `bun run verify:fast`
- Layout, routing, dependency, or deployment edit: `bun run verify:full`
- Release candidate: `bun run deploy-ready`
- Dependency/security pass: `bun run deps:audit`

## Current Priorities

- Keep the integrated Chicago technology-firm positioning practical and credible.
- Reduce false positives in local tooling so humans and agents trust the gates.
- Improve first-run developer experience and AI handoff context.
- Keep large 3D/debug surfaces lazy, route-contained, and out of the default homepage bundle.
