## Github Pages 2026 Demo

Astro static site with base-path-safe routing, premium marketing UI, and
Playwright/Vitest quality gates.

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
