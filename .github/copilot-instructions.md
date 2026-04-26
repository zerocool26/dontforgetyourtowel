# Project Guidelines

## Architecture

- This workspace is an **Astro 5 static site** with **Preact** as the primary interactive UI layer.
- Keep **React** components inside `src/components/react/**` and **Solid** components inside `src/components/solid/**`; do not mix framework folders.
- Use `src/layouts/MarketingLayout.astro` for public-facing pages and prefer shared UI primitives like `src/components/ui/ModernButton.astro` and `src/components/ui/ModernCard.astro`.
- Internal links must use `withBasePath()` from `src/utils/helpers.ts` so GitHub Pages/project-site deployments keep working.

## Build and Test

- Required runtime: **Node >= 22** and **npm 11.6.1**.
- Use `npm run health-check` for fast critical analysis and `npm run error-review:deployment` before release-grade deployment changes.
- Primary validation commands:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run test:e2e`
  - `npm run build`
- For release-quality validation, use `npm run deploy-ready`.

## Conventions

- Prefer data-driven content under `src/data/**` so pricing, trust signals, and page sections stay consistent.
- Use the tone system (`tone-title`, `tone-body`, `tone-border`, `tone-surface`, `tone-elevated`) instead of inventing one-off visual styles.
- Public interactive components should stay mobile-first, keyboard-accessible, and hydration-aware (`client:visible` or `client:load` only where justified).
- Generated or archived folders such as `backups/`, `coverage/`, `playwright-report/`, and `test-results/` are not active product code.

## Deployment Notes

- Environment-derived site/base-path logic lives in `config/deployment.js` and is surfaced through `src/consts.ts`.
- Prefer `PUBLIC_*` environment variables for Astro/runtime config; keep `NEXT_PUBLIC_*` mirrors only when cross-stack compatibility is needed by `app/**` or `lib/**`.
- Keep `.env` placeholders blank until real deployment values are known; blank values are intentionally ignored by the deployment config.
