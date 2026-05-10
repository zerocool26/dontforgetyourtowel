## Github Pages 2026 Demo

Astro static site with base-path-safe routing, premium marketing UI, and
Playwright/Vitest quality gates.

### Environment

- Node `>=22`
- npm `11.6.1`
- Astro 5 static output
- Preact as the primary interactive UI layer for public-facing experiences

### Development workflow

- Install dependencies with `npm install`
- Start local development with `npm run dev`
- Use `npm run lint` and `npm run typecheck` for fast static validation
- Use `npm test` for unit coverage and `npm run test:e2e` for browser flows
- Use `npm run verify:fast` before handing off route/component changes
- Use `npm run verify:full` before layout, dependency, routing, or deployment changes
- Use `npm run deploy-ready` before release-quality changes

### Workspace instruction system

- Cross-agent project guidance lives in `AGENTS.md`
- Base project guidance lives in `.github/copilot-instructions.md`
- Route-specific guidance lives in `.github/instructions/marketing-pages.instructions.md`
- Shared-component guidance lives in `.github/instructions/design-system.instructions.md`
- AI continuation guidance lives in `docs/AI-DEVELOPMENT-GUIDE.md`

These workspace instruction files are intended to reduce drift between human edits, Copilot-assisted edits, and future agent passes.

### Key routes

- `/` Home
- `/services/` Service catalog and engagement flow
- `/about/` Portfolio + interactive commerce showcase
- `/contact-hq/` Contact intake and recommendation handoff

Legacy content routes such as `/blog/*` and `/rss.xml` are retired and now redirect
or return decommissioned responses.

### Cleanup and archive policy

Dead code and stale docs are migrated to archive folders instead of being
hard-deleted from git history.

- Archive root: `backups/dead-code-archive-2026-03-01/`
- Cleanup notes: `docs/CODEBASE-CLEANUP-2026-03-01.md`

### Validation commands

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run build`
- `npm run verify:fast`
- `npm run verify:full`
- `npm run deps:audit`
- `npm run deploy-ready`
