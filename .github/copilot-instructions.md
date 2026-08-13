# Project Guidelines

## Architecture

- Astro 7 static marketing site with Preact reserved for purposeful interactive UI.
- Public routes use `src/layouts/MarketingLayout.astro`.
- Shared copy and service data live in `src/data/site.ts`.
- Internal links use `withBasePath()` from `src/utils/helpers.ts`.
- Do not reintroduce retired demo, dashboard, gallery, WebGL, theme, command-palette, or legacy redirect surfaces.

## Design and content

- Follow the editorial system in `src/styles/global.css`: warm paper, deep navy, copper, fine rules, open layouts, and modest radii.
- Prefer open sections, ledgers, and ruled lists over cards, pills, badges, dashboards, and decorative chrome.
- Use direct buyer language about business outcomes, ownership, delivery, software, cloud, security, recovery, scope, and decisions.
- Do not publish invented metrics, testimonials, certifications, awards, partner claims, or guarantees.
- Keep mobile hierarchy calm and preserve visible focus, 44px minimum targets, and reduced-motion behavior.

## Validation

- Route or component work: `bun run verify:fast`
- Layout, routing, dependency, or deployment work: `bun run verify:full`
- Release candidate: `bun run deploy-ready`
- Dependency review: `bun run deps:audit`
