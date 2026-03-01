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

- Re-run `npm run build` after each cleanup wave.
- Confirm no imports point to archived files.
- Keep only current routes/components in top-level docs (`README.md`).

## Follow-up recommendation

If no rollback is needed after 1–2 release cycles, archive folders can be split into a separate long-term branch or external storage to further slim repository size.
