# Agent Guide

This is an Astro 5 static marketing site for Olive Global Systems, a Chicago-area managed IT, cybersecurity, Microsoft 365, cloud, backup, networking, and selective digital systems provider.

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
- Shared UI should prefer `src/components/ui/**`, `src/styles/global.css`, and existing tone utilities before new one-off CSS.
- Repeated marketing content belongs in `src/data/**` when it appears on more than one route.

## UX Rules

- Lead public pages with buyer problem, buyer fit, proof, and next action before deep capability detail.
- Keep mobile hierarchy calm: one primary CTA, one secondary CTA, no dense hero checklist walls.
- Tap targets should be at least 44px tall; use 48px for major actions.
- Preserve keyboard access, visible focus states, reduced-motion behavior, and existing `data-*` test hooks.
- Avoid generic AI or futurist positioning unless it is tied to governance, security, workflow, or measurable operating clarity.

## Validation Tiers

- Tiny docs/content edit: `npm run typecheck`
- Component or route edit: `npm run verify:fast`
- Layout, routing, dependency, or deployment edit: `npm run verify:full`
- Release candidate: `npm run deploy-ready`
- Dependency/security pass: `npm run deps:audit`

## Current Priorities

- Keep the Chicago MSP positioning practical and credible.
- Reduce false positives in local tooling so humans and agents trust the gates.
- Improve first-run developer experience and AI handoff context.
- Keep large 3D/debug surfaces lazy, route-contained, and out of the default homepage bundle.
