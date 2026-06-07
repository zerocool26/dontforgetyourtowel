# Codebase Cleanup Report (2026-03-01)

## Scope

This cleanup pass focused on removing dead code/features from the active runtime tree while preserving recoverability through archival moves.

## What was archived

All archived assets were moved to:

- `backups/dead-code-archive-2026-03-01/`

### 1) Unused component files (22)

Moved out of `src/components/**` after reference scanning and manual verification.

- `src/components/AstroShowcase.astro`
- `src/components/CodeShowcase.astro`
- `src/components/FrameworkShowcase.astro`
- `src/components/SystemHighlights.astro`
- `src/components/business/PricingTier.astro`
- `src/components/business/TrustBadge.astro`
- `src/components/landing/ControlStackSection.astro`
- `src/components/landing/DemoCtaSection.astro`
- `src/components/landing/EngagementSection.astro`
- `src/components/landing/InsightSection.astro`
- `src/components/landing/PlaybookSection.astro`
- `src/components/landing/SignalGrid.astro`
- `src/components/landing/TestimonialsSection.astro`
- `src/components/react/HeroExplorerLazy.tsx`
- `src/components/solid/ReactiveCounter.tsx`
- `src/components/ui/BackgroundEffects.astro`
- `src/components/ui/LazyImage.astro`
- `src/components/ui/LoadingSpinner.astro`
- `src/components/ui/ResponsiveImage.astro`
- `src/components/ui/Skeleton.astro`
- `src/components/ui/TagCloud.astro`
- `src/components/ui/ThemeToggle.astro`

### 2) Legacy docs package

Moved all files from `Docs2/` to:

- `backups/dead-code-archive-2026-03-01/Docs2/`

These docs referenced deprecated routes/components and old upgrade prompts that no longer match the current runtime architecture.

## Rationale

- Keep `src/` and active docs focused on deployable, live features.
- Reduce maintenance cost and confusion from stale references.
- Preserve history without hard-deleting via archive-first migration.

## Verification checklist

- Re-run `bun run build` after each cleanup wave.
- Confirm no imports point to archived files.
- Keep only current routes/components in top-level docs (`README.md`).

## Follow-up recommendation

If no rollback is needed after 1–2 release cycles, archive folders can be split into a separate long-term branch or external storage to further slim repository size.

## Post-cleanup hardening (same day)

After the archive pass, additional reliability and feature-completion fixes were applied:

- Fixed inline script compatibility in `src/layouts/MarketingLayout.astro` by removing TypeScript-only assertion syntax from browser-executed code.
- Migrated the old demo-lab safety checks to the live portfolio experience in `src/pages/about.astro` by adding a testable safety status output (`data-demo-status`, `data-testid="demo-safety-status"`).
- Updated e2e coverage to current live routes:
  - `e2e/demo-lab.spec.ts` now validates `/about/` demo behavior.
  - `e2e/search.spec.ts` and `e2e/seo-deployment-coherence.spec.ts` were aligned with retired route policy.
- Removed stale discoverability/navigation links to retired pages:
  - `src/components/CommandPalette.tsx`
  - `src/pages/search-index.json.ts`
  - `src/pages/manifest.webmanifest.ts`
- Marked `/demo-lab` as legacy in `config/legacyRoutes.js` and aligned tests accordingly.

### Verification outcome

- `bun run lint` ✅
- `bun run build` ✅
- `runTests` (all) ✅

## Compatibility redirects added

To avoid hard 404s for old public links/bookmarks, lightweight legacy stubs were
reintroduced under `src/pages/` using `LegacyRedirect`:

- `components.astro`
- `demo.astro`
- `demo-lab.astro`
- `hero-lab.astro`
- `mobile-features-demo.astro`
- `shop-demo.astro`
- `showcase.astro`
- `ultimate-3d-gallery.astro`
- `utility-demo.astro`
- `visual-showcase.astro`

These routes now immediately redirect to maintained destinations while remaining
excluded by legacy route policy/robots controls.

`LegacyRedirect` was also enhanced to preserve incoming query-string and hash
fragments by default, so old shared URLs keep their context when forwarding.

Legacy dashboard routes were further simplified to redirect-only pages to remove
stale commented templates and unused frontmatter:

- `src/pages/dashboard.astro`
- `src/pages/dashboard-v2.astro`
- `src/pages/error-dashboard.astro`

The 404 experience now includes a base-path-aware legacy route fallback map so
known retired URLs are auto-forwarded to current destinations even if a direct
legacy stub is missed.

Legacy route destinations are now centralized in
`config/legacyRedirects.js` and reused by both route-policy logic and 404
fallback handling to avoid configuration drift.

## Maturity follow-up (telemetry, blog, and RSS)

Additional lifecycle hardening was applied to reduce operational ambiguity in
the static deployment profile:

- Telemetry is now explicit opt-in end-to-end (`PUBLIC_ENABLE_ANALYTICS` must
  be truthy for web vitals/error beaconing and utility tracker activity).
- Public blog routes were decommissioned and replaced with legacy redirects to
  active case-study content (`/services/#case-studies`).
- Search index generation no longer publishes blog entries.
- `rss.xml` now returns `410 Gone` to make feed retirement explicit to crawlers.
- Scaffolding was realigned from blog-post generation to case-study generation
  (`case-study <title>`), with `post <title>` retained as a deprecated alias.

## Wave 2 cleanup (orphan removal)

After decommission behavior stabilized, a follow-up pruning pass removed orphaned
blog-era code that no longer participates in runtime execution:

- Removed unused blog helper module: `src/utils/blog.ts`.
- Removed blog-related recommendation branch from
  `src/utils/related-content.ts` and kept case-study logic only.
- Pruned blog-only unit tests from `src/utils/related-content.test.ts`.
- Removed stale blog interfaces from `src/types/index.ts`.
- Removed stale skipped blog e2e suite: `e2e/blog.spec.ts`.
- Removed unused layout: `src/layouts/BlogPost.astro`.
- Updated route tests to assert current manifest shortcut behavior and RSS
  decommission contract (`410 Gone`).
