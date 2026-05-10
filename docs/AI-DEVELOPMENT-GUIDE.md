# AI Development Guide

Last updated: 2026-05-10

## Purpose

This guide gives future human and AI contributors a compact operating model for continuing the site without re-auditing the whole repo each time.

## Product Intent

Olive Chicago should read as a credible Chicago-area managed IT and security partner. The site can feel premium and modern, but the offer must stay practical: support ownership, security controls, Microsoft 365, cloud, network, backup, continuity, roadmap work, and selective digital systems.

Avoid promoting services that cannot be explained in one business sentence or that do not map to the market audit in `docs/CHICAGO-MSP-MARKET-AUDIT.md`.

## Active Surfaces

- `src/pages/index.astro`: homepage and primary buyer entry.
- `src/pages/services.astro`: service catalog and solution pathways.
- `src/pages/pricing.astro`: budget framing and plan comparison.
- `src/pages/company.astro`: positioning, operating model, and delivery story.
- `src/pages/contact-hq.astro`: intake flow and conversion route.
- `src/pages/build-studio.astro`: roadmap shaping experience.
- `src/pages/trades/**`: specialized route pages.
- `src/layouts/MarketingLayout.astro`: shared public page shell.
- `src/components/Header.astro` and `src/components/Footer.astro`: global navigation.
- `src/components/business/**`: reusable marketing/business widgets.
- `src/data/**`: reusable service, pricing, trade, testimonial, and gallery data.

## AI Editing Checklist

1. Confirm the route or component owner before editing.
2. Prefer data updates in `src/data/**` when the same content appears in multiple places.
3. Use `withBasePath()` for internal links and static route URLs.
4. Keep any route-specific CSS scoped inside the page unless it is clearly reusable.
5. Preserve `data-testid`, `data-*`, heading IDs, anchors, and route slugs.
6. Update tests when behavior, routing, or user-facing workflow changes.
7. Run the smallest useful validation tier before handing work back.

## Validation Map

- `npm run verify:fast`: typecheck, lint, and unit tests.
- `npm run verify:full`: fast checks, build, and critical health check.
- `npm run deploy-ready`: release-grade analyzer, typecheck, lint, tests, and build.
- `npm run deps:audit`: dependency audit at moderate severity or higher.
- `npm run test:e2e -- <spec>`: focused browser validation for a touched route.

## Design Guardrails

- Use existing tone utilities and CSS variables from `src/styles/global.css`.
- Keep mobile above-the-fold sections quiet and directional.
- Use proof, fit, timelines, and operational outcomes instead of decorative feature lists.
- Keep 3D/debug/showcase code route-contained so the default buyer path stays fast.
- Respect reduced motion and avoid hover-only meaning.

## Upgrade Policy

- Patch and minor updates within the current major are safe when validation passes.
- Major upgrades require a scoped migration branch and focused notes.
- Astro, official Astro integrations, Tailwind, React, Preact, Three.js, and Playwright should be upgraded together only when their migration guides have been checked.
- Do not use `npm audit fix --force` on this project without treating it as a major-framework migration.
