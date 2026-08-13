# Workspace Contract

- This is an Astro 7 static marketing site for an integrated Chicago technology consulting, software engineering, cloud, cybersecurity, and managed services firm.
- Use `src/layouts/MarketingLayout.astro` for public routes.
- Use Preact only when local state materially improves a buyer task.
- Keep repeated service, pricing, trust, and local-route content in `src/data/site.ts`.
- Keep all internal links base-path safe with `withBasePath()`.
- Preserve the premium editorial system in `src/styles/global.css`.
- Do not reintroduce deleted prototypes, galleries, dashboards, 3D assets, theme modes, search chrome, or fake proof.
- Run `bun run verify:full` after site-wide changes and `bun run deploy-ready` for release candidates.
