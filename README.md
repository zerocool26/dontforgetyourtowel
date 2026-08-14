# CHICAGOS #1 MSP Website

Astro 7 static marketing site for an integrated Chicago technology consulting,
custom software, cloud, cybersecurity, managed IT, data, and automation firm.

## Product surface

- `/` — buyer-first overview
- `/services/` — integrated advisory, engineering, security, and operations lanes
- `/software/` — custom software and product engineering approach
- `/pricing/` — engagement models, managed IT ranges, and scope drivers
- `/trust-center/` — access, source, data, security, recovery, and accountability posture
- `/about/` — operating principles and buyer fit
- `/blog/` — practical resources
- `/chicago/` — local consulting, software, cloud, security, and managed service pages
- `/contact-hq/` — direct inquiry handoff

Retired demos, dashboards, galleries, commerce prototypes, WebGL experiments,
theme modes, and legacy redirects were intentionally removed during the 2026
top-to-bottom redesign.

Market and positioning research for the integrated firm model lives in
`docs/research/2026-technology-services-market/`.

The shared visual language, semantic tokens, component contracts, and route
migration rules live in `docs/design-system.md`.

## Development

Requires Node 22+ and Bun 1.3.8.

```bash
bun install
bun run dev
```

## Validation

```bash
bun run verify:fast
bun run verify:full
bun run test:e2e
bun run deploy-ready
bun run deps:audit
```

Internal links must use `withBasePath()` from `src/utils/helpers.ts` so the site
works at both root domains and GitHub Pages project paths.
