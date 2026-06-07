# AGENTS.md

## Workspace contract

- This repo is an Astro 6 static marketing site with Preact as the primary interactive layer.
- Keep React components in `src/components/react/**` and Solid components in `src/components/solid/**`.
- Use `src/layouts/MarketingLayout.astro` for public routes.
- Prefer shared primitives like `src/components/ui/ModernButton.astro`, `src/components/ui/ModernCard.astro`, and utilities from `src/styles/global.css` before introducing one-off styles.
- Internal links must use `withBasePath()` from `src/utils/helpers.ts` so project-site deployments keep working.

## Design and content rules

- Optimize public pages for calm mobile hierarchy: one primary CTA, one secondary CTA, minimal competing chrome above the fold.
- Prefer tone utilities (`tone-*`) and creative shell utilities (`creative-*`) over raw hex colors in shared components or marketing pages.
- Keep public interactions keyboard-accessible, touch-friendly, and reduced-motion aware.
- Preserve existing `data-*` hooks used by Playwright or other validation.
- Prefer data-driven content in `src/data/**` when the same messaging or structure appears in multiple routes.

## Environment and deployment

- Required runtime: Node >= 22 and Bun 1.3.8.
- Deployment-derived base-path logic lives in `config/deployment.js` and is surfaced via `src/consts.ts`.
- Prefer `PUBLIC_*` environment variables for Astro/runtime config; keep `NEXT_PUBLIC_*` mirrors only when `app/**` or `lib/**` still needs cross-stack compatibility.
- Keep `.env` placeholders blank until real values are known; blank values are intentionally ignored.
- Do not break GitHub Pages/project-site compatibility when editing URLs, assets, or navigation.

## Validation

Run the relevant checks after edits:

- `bun run lint`
- `bun run typecheck`
- `bun run health-check`
- `bun run test`
- `bun run test:e2e`
- `bun run build`
- `bun run error-review:deployment`
- `bun run deploy-ready`

## Ignore as product code

- `backups/`
- `coverage/`
- `playwright-report/`
- `test-results/`

## Related instruction files

- `.github/copilot-instructions.md`
- `.github/instructions/design-system.instructions.md`
- `.github/instructions/marketing-pages.instructions.md`
