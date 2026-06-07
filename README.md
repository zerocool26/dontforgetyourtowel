## CHICAGOS #1 MSP Website

Astro static site for CHICAGOS #1 MSP with base-path-safe routing, managed IT
service content, trust/proof routes, Chicago service pages, and Playwright/Vitest
quality gates.

### Environment

- Node `>=22`
- Bun `1.3.8`
- Astro 6 static output
- Preact as the primary interactive UI layer for public-facing experiences

### Development workflow

- Install dependencies with `bun install`
- Start local development with `bun run dev`
- Use `bun run lint` and `bun run typecheck` for fast static validation
- Use `bun run test` for unit coverage and `bun run test:e2e` for browser flows
- Use `bun run verify:fast` before handing off route/component changes
- Use `bun run verify:full` before layout, dependency, routing, or deployment changes
- Use `bun run deploy-ready` before release-quality changes

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
- `/pricing/` Directional managed IT pricing and scope guidance
- `/trust-center/` Customer excellence, security, backup, and operating proof
- `/blog/` Practical managed IT, security, Microsoft 365, and recovery articles
- `/news/` News and podcast style advisory route
- `/photos/` Photo gallery route
- `/contact-hq/` Contact intake and recommendation handoff

RSS is active for current content. Legacy/development routes may still exist for
compatibility or internal demos, but active public navigation should stay focused
on the buyer routes above.

### Cleanup and archive policy

Dead code and stale docs are migrated to archive folders instead of being
hard-deleted from git history.

- Archive root: `backups/dead-code-archive-2026-03-01/`
- Cleanup notes: `docs/CODEBASE-CLEANUP-2026-03-01.md`

### Validation commands

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run test:e2e`
- `bun run build`
- `bun run verify:fast`
- `bun run verify:full`
- `bun run deps:audit`
- `bun run deploy-ready`
