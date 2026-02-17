## Github Pages 2026 Demo

Astro static site with base-path-safe routing, interactive demo modules, and
Playwright/Vitest quality gates.

### Key routes

- `/` Home
- `/services/` Service catalog and engagement flow
- `/contact-hq/` Contact intake and recommendation handoff
- `/demo-lab/` Interactive module sandbox with Safety Console controls

### Demo Lab safety controls

The Safety Console on `/demo-lab/` exposes three runtime toggles backed by
`data-demo-*` attributes on `<html>` and module containers:

- `paused`
- `reduced` (reduced motion override)
- `perf` (performance mode)

Interactive modules observe these flags to pause off-screen work and reduce
motion/CPU load when requested.

### Validation commands

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`


