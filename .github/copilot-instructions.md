# Project Guidelines

## Architecture

- Astro 7 static marketing site with Preact reserved for purposeful interactive UI.
- Public routes use `src/layouts/MarketingLayout.astro`.
- Shared copy and service data live in `src/data/site.ts`.
- Internal links use `withBasePath()` from `src/utils/helpers.ts`.
- Do not reintroduce retired demo, dashboard, gallery, WebGL, theme, command-palette, or legacy redirect surfaces.

## Design and content

- Follow the editorial system in `src/styles/global.css`: white, near-black, electric blue, large Manrope headlines, restrained serif emphasis, fine rules, open layouts, and square actions.
- Use `PageHero.astro`, `EditorialBand.astro`, `MediaInterlude.astro`, and `CtaBand.astro` for matching page patterns so system changes propagate across routes.
- Select shared photography through `src/data/visuals.ts` rather than importing images or repeating crop and alt-text decisions in routes.
- Prefer open sections, ledgers, and ruled lists over cards, pills, badges, dashboards, and decorative chrome.
- Use direct buyer language about business outcomes, ownership, delivery, software, cloud, security, recovery, scope, and decisions.
- Do not publish invented metrics, testimonials, certifications, awards, partner claims, or guarantees.
- Keep mobile hierarchy calm and preserve visible focus, 44px minimum targets, and reduced-motion behavior.

## Validation

- Route or component work: `bun run verify:fast`
- Layout, routing, dependency, or deployment work: `bun run verify:full`
- Release candidate: `bun run deploy-ready`
- Dependency review: `bun run deps:audit`
