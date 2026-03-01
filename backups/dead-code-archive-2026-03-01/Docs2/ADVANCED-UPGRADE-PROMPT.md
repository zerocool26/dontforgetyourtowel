# Master Upgrade Prompt (Engineering-Grade) — dontforgetyourtowel

> This is a **high-rigor, repo-specific** prompt intended for a senior AI coding agent or senior engineer.
> It is not “generic advice”: it references this repo’s **real files, scripts, constraints, and existing components**.

**Role:** Principal Frontend Engineer + Creative Technologist (Astro specialist)

**Target:** GitHub Pages static hosting (SSG output only)

**Repo:** `tariqdude/dontforgetyourtowel` (main)

**Stack reality (as implemented here):**

- Astro (static output), MDX integration
- TypeScript strict config (`astro/tsconfigs/strict` + additional constraints)
- Tailwind CSS + custom utilities and keyframes (`tailwind.config.ts`)
- Islands via Preact + Solid integrations (`@astrojs/preact`, `@astrojs/solid-js`)
- Astro View Transitions (`astro:transitions`) already in use (`ClientRouter` in `src/components/BaseHead.astro`)
- PWA service worker and manifest exist (`public/sw.js`, `src/pages/manifest.webmanifest.ts`)
- A custom “error reviewer” static analysis CLI exists and is wired into npm scripts (`src/utils/error-reviewer-cli.ts`, `npm run error-review:*`)
- Playwright E2E suite exists and targets **base-path deployments** (`playwright.config.ts`)

**Non-negotiable constraints:**

- GitHub Pages = no server runtime, no long-lived APIs, no SSR-only features.
- All internal links must respect `base` and `site` derived via `config/deployment.js`.
- Use `withBasePath()` from `src/utils/helpers.ts` (back-compat barrel) / `src/utils/url.ts` (canonical).
- Core content must remain usable with JavaScript disabled. Interactivity layers must be progressive.
- Keep mobile/tablet UX first. Desktop enhancements must degrade gracefully.

---

## What “done” looks like (definition of victory)

This repo becomes:

1. Easier to develop (clean structure, clear conventions, stable CI).

2. Safer to deploy (deployment config respected everywhere; SW/cache aligns with real routes; base-path safe).

3. More functional (search/navigation improvements, better feature organization, better content systems).

4. More beautiful + creative (cinematic design, modern motion), **without** sacrificing performance/accessibility.

5. Includes **one new** “Demo Lab” page that contains the **maximum animation intensity** for this stack, isolated from the rest of the site.

---

## Ground truth: how this repository actually works

### Deployment + base-path handling (critical)

This repo intentionally supports GitHub Pages project sites where base path is `/${repo}/`.

- Base path and site URL are derived by `config/deployment.js`.
- Astro is configured to use those values in `astro.config.mjs`:
  - `base: basePath`
  - `site: siteUrl`

**Rule:** never hardcode `/something` for internal navigation without using `withBasePath()` unless it is truly correct (e.g., hashes, external URLs).

### Current “legacy routes” situation (critical)

Multiple showcase/demo pages exist but are currently disabled via `<LegacyRedirect />`:

- `src/pages/demo.astro`
- `src/pages/components.astro`
- `src/pages/showcase.astro`
- `src/pages/visual-showcase.astro`
- `src/pages/ultimate-3d-gallery.astro`
- `src/pages/utility-demo.astro`
- `src/pages/dashboard.astro`
- `src/pages/dashboard-v2.astro`
- `src/pages/error-dashboard.astro`

They are also excluded from:

- Sitemap generation (`astro.config.mjs` filter)
- Search engine crawling (`src/pages/robots.txt.ts` disallow list)
- ESLint checks (`eslint.config.js` ignores list)

**Interpretation:** the repo contains _advanced demo components_, but the routes were intentionally retired. We must not blindly “re-enable everything” (that would break SEO, SW caching assumptions, and quality policies). Instead we add **one** new page that is **not** legacy and becomes the official, curated “Demo Lab”.

---

## Critical fixes that must be addressed first (these are not optional)

> Fixing these early prevents chasing ghosts later.

### CF-01: Node version mismatch in CI

- `package.json` requires Node `>=24.0.0`.
- `.nvmrc` pins Node `24`.
- `deploy.yml` uses `node-version-file: .nvmrc` (good).
- `ci.yml` currently uses Node `20` (bad; can cause false failures).

**Requirement:** Update `.github/workflows/ci.yml` to use Node 24 (match `.nvmrc`).

### CF-02: Service worker route list doesn’t match reality

`public/sw.js` pre-caches routes including:

- `blog/`
- `demo/`
- `components/`

…but many of these are legacy-redirect routes and are disallowed in `robots.txt` and excluded from sitemap.

**Requirement:** Align SW pre-cache list to real, supported routes. Add the new demo route explicitly.

### CF-03: Sitemaps/robots are filtering legacy routes (by design)

We must keep legacy routes filtered, but ensure:

- The **new** demo lab route is **included** in sitemap.
- The **new** demo lab route is **not disallowed** in robots.

### CF-04: Internal navigation/search actions must match available pages

The command palette contains navigation commands like `Go to Blog` / `Go to Showcase`.
If those routes are legacy redirects, that is a UX lie.

**Requirement:** Either remove/feature-flag those commands, or route them to supported pages.

### CF-05: Animation correctness + standards compliance

Example: `src/components/ui/MatrixRain.astro` uses `random()` inside CSS (`animation-delay: ... random() ...`) which is not standard CSS and may be ignored.

**Requirement:** Remove invalid CSS and implement randomness via:

- Build-time inline styles (preferred), or
- A tiny JS progressive enhancement step (acceptable in demo lab only), or
- A deterministic pseudo-random generator seeded per column.

---

## Engineering operating rules (how to work in this repo)

### Quality gates that must stay green

This repo already provides a strong quality toolchain. Use it.

**Primary script:** `npm run pre-deploy`

It runs (in order):

- `npm run error-review:critical`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

**Rule:** no PR is “done” until `pre-deploy` is green.

### Use the error reviewer tool (it’s part of the product)

There is a custom analyzer CLI at `src/utils/error-reviewer-cli.ts`.

Use these for rapid feedback:

- `npm run health-check`
- `npm run error-review:deployment`
- `npm run error-review:security`

### Path aliases

`tsconfig.json` defines:

- `@/*` -> `src/*`
- `@/components/*`
- `@/layouts/*`
- `@/utils/*`
- `@/styles/*`
- `@/types/*`

**Rule:** prefer aliases over `../../..` imports.

### BaseHead is a global behavior hub

`src/components/BaseHead.astro`:

- imports `src/styles/global.css` (global)
- sets `ClientRouter` (view transitions)
- imports scripts:
  - `src/scripts/animations`
  - `src/scripts/magnetic-buttons`
  - `src/scripts/spotlight`

**Rule:** Avoid adding heavy global scripts. If advanced motion is needed, keep it inside the Demo Lab page.

---

## What you must build: ONE new Demo page, maximum animations (but isolated)

### New route requirement

Add exactly one new route. Do **not** resurrect the legacy demo/showcase routes.

**Recommended route name:** `src/pages/demo-lab.astro` (route `/demo-lab/`)

Reason:

- `/demo` is filtered/disallowed as legacy.
- `/demo-lab` is not filtered and can be allowed + indexed.

### Demo Lab purpose

This page is the “maximum capabilities playground” for:

- Cinematic UI effects
- Interaction-driven motion
- High-density animation components
- Progressive enhancement patterns
- Performance-safe techniques (pausing off-screen, content-visibility)

Everything wild goes here.

The rest of the site stays clean, calm, and conversion-focused.

---

## Reuse what already exists (do NOT re-invent)

### Existing UI animation/showcase components (already in repo)

These are available under `src/components/ui/`:

- `Advanced3DShowcase.astro` (carousel, flip cards, isometric city, 3D text, parallax layers)
- `ParticleVortex.astro` (interactive particle spiral modes)
- `InfinityTunnel.astro` (depth tunnel; speed controls)
- `MatrixRain.astro` (digital rain effect; needs CSS correctness cleanup)
- `DNAHelix.astro`
- `CubicMatrix.astro`
- `HolographicCards.astro`
- `FloatingIslands.astro`
- `ExplodingGrid.astro`
- `PrismaticSphere.astro`
- `CSS3DScene.astro`
- `BackgroundEffects.astro`
- `RevealOnScroll.astro`

Core design primitives already exist:

- `ModernButton.astro` (variants including `neon`)
- `ModernCard.astro`
- `Card.astro`
- `Grid.astro`
- `Tooltip.astro`
- `Badge.astro`

Business components already exist:

- `src/components/business/StickyCTA.astro`
- `src/components/business/MobileNav.astro`
- `src/components/business/LiveChat.tsx` (preact island)

Landing sections exist:

- `src/components/landing/*Section.astro`

**Demo Lab rule:** prefer composition of these components. Only add new components when the behavior cannot be expressed by composition.

---

## Mobile/tablet-first animation policy (strict)

All high-intensity demo effects must:

- Respect `prefers-reduced-motion: reduce`.
- Avoid continuous animation when off-screen.
- Avoid layout thrashing.
- Avoid large JS bundles.
- Provide touch equivalents for hover interactions.

### Required implementation patterns

- Use `content-visibility: auto` + `contain-intrinsic-size` on heavy sections (already used in several components).
- Use `IntersectionObserver` to:
  - start animations when in view
  - pause when out of view
- Use `Pointer Events` in a device-safe way:
  - pointer (mouse)
  - touch
  - keyboard
- Keep controls accessible:
  - `role="group"`, `aria-label`
  - `aria-pressed` for toggles

---

## Feature upgrades (functional improvements that fit static hosting)

> The goal is “static first, dynamic feel.”

### FU-01: Improve site-wide search without breaking base paths

This repo already has:

- a `search-index.json` route (`src/pages/search-index.json.ts`)
- a command palette that loads it (`src/components/CommandPalette.tsx`)
- a worker that offloads Fuse search (`src/components/command-search.worker.ts`)

**Requirement:** unify the experience:

- Ensure the search index covers **only supported routes**.
- Ensure the command palette’s navigation targets use `withBasePath()` or `astro:transitions/client` navigate with base-aware URLs.
- Add a visible search entry point if `SITE_CONFIG.nav.showSearchInHeader` is true.

### FU-02: Fix route truthfulness

If `/blog` and `/showcase` are legacy routes:

- remove those commands from the palette OR
- hide them behind a feature flag OR
- reroute to supported equivalents.

### FU-03: Demo Lab integration with analytics + vitals (optional)

MarketingLayout already includes:

- `WebVitals`
- `ErrorTracking`
- `PWARegistration`

**Requirement:** the demo page must not break these.

---

## Demo Lab page architecture (recommended)

### Layout

Use `MarketingLayout.astro` so global behaviors remain consistent.

### Structure (Acts)

Build the demo page as “Acts” with a table of contents that jumps to sections.

Act 0 — “Safety” panel

- toggles for:
  - pause all animations
  - reduce visual density
  - enable performance mode

Act 1 — “3D Showcase” (reuse)

- embed `Advanced3DShowcase.astro`

Act 2 — “Particle Physics” (reuse + minor fixes)

- embed `ParticleVortex.astro`

Act 3 — “Depth Tunnel” (reuse)

- embed `InfinityTunnel.astro`

Act 4 — “Typography Motion” (fix correctness)

- embed `MatrixRain.astro` after fixing CSS randomness

Act 5 — “Composition challenge” (new)

- create a “Bento Morph Grid” using Tailwind + `ModernCard` where cards reflow and animate
- use `RevealOnScroll` for entrances

Act 6 — “Integration proof” (real site constraints)

- demonstrate `withBasePath()` correctness by showing computed links
- demonstrate `ClientRouter` transitions

---

## Repo-specific design system instructions (don’t fight the existing system)

### Tailwind tokens already exist

`tailwind.config.ts` includes:

- `colors.brand`, `colors.accent`, `colors.neutral`, etc
- custom animation keyframes (float, shimmer, gradient, glow, slide-up, etc)
- custom background images (`gradient-mesh`, `noise`, etc)
- utility classes: `.glass`, `.glass-dark`, `.text-gradient*`, patterns, etc

**Requirement:** use these tokens. Do not hardcode one-off RGB values in components unless necessary.

### global.css includes themes via `[data-theme]`

The root theme system uses:

- `data-theme="ops-center"` (default “dark-ish”)
- `data-theme="corporate"` (light)
- `data-theme="terminal"` (green)

**Requirement:** Demo Lab must work in all supported themes.

---

## Testing + verification requirements

### Unit + integration tests

- Keep existing Vitest tests green.
- Add tests when you change:
  - deployment config behavior
  - search index / routing
  - critical utilities

### E2E (Playwright)

Playwright is configured to run `build` then `preview` and uses base-path logic.

**Requirement:** Add an E2E test that ensures:

- `/demo-lab/` loads
- main heading renders
- the “pause animations” toggle works (progressive enhancement)

---

## Implementation order (do this sequence)

1. Fix CI Node version mismatch.

2. Add `/demo-lab/` page skeleton.

3. Add curated modules (reuse existing UI components).

4. Fix correctness/perf in reused demo components (only what is required).

5. Align SW cache list and search index with supported routes.

6. Add E2E test coverage for the new page.

7. Run `npm run pre-deploy` and ship.

---

## Mega checklist (quick scan)

### Deployment + routing

- [ ] All internal links use `withBasePath()` where appropriate.
- [ ] No hardcoded `/${repo}/` paths.
- [ ] Sitemaps include only supported pages.
- [ ] `robots.txt` disallows only legacy routes.
- [ ] SW pre-cache list aligns with supported routes.
- [ ] Playwright `E2E_BASE_PATH` still works.

### Performance

- [ ] Demo Lab sections use `content-visibility` where heavy.
- [ ] Off-screen animations pause.
- [ ] `prefers-reduced-motion` disables/softens heavy motion.
- [ ] No new heavy global scripts.
- [ ] JS islands are `client:visible` or `client:idle` when possible.

### Accessibility

- [ ] Keyboard navigation works across controls.
- [ ] Toggles have `aria-pressed`.
- [ ] Contrast is acceptable on mobile.
- [ ] Reduced motion support exists.
- [ ] Focus states visible.

### DX

- [ ] CI Node version matches `.nvmrc`.
- [ ] `npm run pre-deploy` is green.
- [ ] ESLint and TypeScript are clean.
- [ ] New code uses aliases.

---

## Repo map (what exists today, and what to touch)

### Pages (`src/pages/*`)

Supported core routes (non-legacy):

- `src/pages/index.astro` — home (marketing + modular landing sections)
- `src/pages/services.astro` — services
- `src/pages/pricing.astro` — pricing
- `src/pages/about.astro` — about
- `src/pages/contact.astro` — contact (static mailto flow)
- `src/pages/privacy.astro` — legal
- `src/pages/terms.astro` — legal
- `src/pages/404.astro` — not found
- `src/pages/offline.astro` — PWA offline
- `src/pages/manifest.webmanifest.ts` — PWA manifest
- `src/pages/robots.txt.ts` — robots rules + sitemap link
- `src/pages/search-index.json.ts` — search index consumed by command palette

Legacy/archived routes (currently redirect):

- `src/pages/demo.astro`
- `src/pages/components.astro`
- `src/pages/showcase.astro`
- `src/pages/visual-showcase.astro`
- `src/pages/ultimate-3d-gallery.astro`
- `src/pages/utility-demo.astro`
- `src/pages/dashboard.astro`
- `src/pages/dashboard-v2.astro`
- `src/pages/error-dashboard.astro`

**Rule:** do not remove legacy redirects unless you also remove all associated filters, robots disallows, SW cache entries, and command palette routes. Prefer adding `/demo-lab/`.

### Layouts (`src/layouts/*`)

- `src/layouts/MarketingLayout.astro` — default page skeleton
  - includes skip link
  - includes Header/Footer
  - includes StickyCTA/MobileNav
  - includes LiveChat island
  - includes PWARegistration/WebVitals/ErrorTracking
- `src/layouts/BlogPost.astro` — may exist for legacy blog systems (be careful; blog is currently treated as legacy in this repo)

### Global head + scripts

- `src/components/BaseHead.astro` — global metadata + fonts + transitions + global scripts
- `src/scripts/animations` — global animation hooks (keep lightweight)
- `src/scripts/magnetic-buttons` — global hover physics (be careful on touch)
- `src/scripts/spotlight` — global spotlight effect (ensure perf)

### UI components (`src/components/ui/*`)

Core primitives:

- `ModernButton.astro`
- `ModernCard.astro`
- `Card.astro`
- `Badge.astro`
- `Tooltip.astro`
- `ProgressBar.astro`
- `LoadingSpinner.astro`
- `LazyImage.astro` / `ResponsiveImage.astro`

Motion helpers:

- `RevealOnScroll.astro` (IntersectionObserver-based)
- `Animate.astro` / `ModernAnimate.astro` / `AdvancedAnimate.astro` / `UltraAnimate.astro`

High-intensity visuals (Demo Lab candidates):

- `Advanced3DShowcase.astro`
- `ParticleVortex.astro`
- `InfinityTunnel.astro`
- `MatrixRain.astro`
- `DNAHelix.astro`
- `CubicMatrix.astro`
- `HolographicCards.astro`
- `FloatingIslands.astro`
- `ExplodingGrid.astro`
- `PrismaticSphere.astro`
- `CSS3DScene.astro`
- `BackgroundEffects.astro`

### Business components (`src/components/business/*`)

- `MobileNav.astro` — mobile nav overlay
- `StickyCTA.astro` — persistent CTA
- `LiveChat.tsx` — Preact island
- `PricingCalculator.tsx` — island
- `ROICalculator.tsx` — island
- `ServicesQuiz.tsx` — island

### Utilities + correctness

- `src/utils/helpers.ts` is a back-compat barrel exporting from `src/utils/url.ts`
- Use `src/utils/validation.ts`, `src/utils/a11y.ts`, `src/utils/events.ts`, etc.

### Deployment + environment

- `config/deployment.js` controls base-path and site url
- `.nvmrc` pins Node 24
- `astro.config.mjs` uses `createDeploymentConfig()`

---

## The Demo Lab (exact spec to implement)

### Routing + indexing policy

- Route name: `/demo-lab/`
- File: `src/pages/demo-lab.astro`
- Include in sitemap (do not add to the legacy filter list in `astro.config.mjs`)
- Allow in robots (do not add to `legacyDisallow` in `src/pages/robots.txt.ts`)
- Include in SW precache list (replace legacy precaches)

### Navigation policy

- Header desktop nav: add “Demo Lab” after “About” OR as a subtle utility link.
- Mobile nav: include “Demo Lab”.
- Command palette:
  - add command: “Open Demo Lab”
  - remove/disable commands that target legacy routes

### Page content structure (recommended)

Top-of-page:

- Title: “Demo Lab”
- Subtitle: “Max animations, static-safe engineering”
- A “Safety Console” card with toggles:
  - Toggle: pause animations
  - Toggle: reduce visual density
  - Toggle: performance mode
  - Toggle: show FPS/Perf hints (optional)
  - Toggle: force reduced motion (simulate)

Safety Console requirements:

- Works without JS (show default explanation text)
- With JS:
  - stores preferences in localStorage
  - toggles a `data-demo-mode` attribute on `<html>` or `<body>`
  - animations use CSS selectors based on that attribute

Acts:

- Act 1: Advanced 3D
  - Component: `Advanced3DShowcase.astro`
  - Add a short “Engineering Notes” panel explaining CSS 3D techniques

- Act 2: Particle system
  - Component: `ParticleVortex.astro`
  - Require touch support:
    - if touch device: allow “tap to attract” or “drag to attract”

- Act 3: Tunnel
  - Component: `InfinityTunnel.astro`
  - Require a11y:
    - speed controls must be keyboard reachable
    - active state uses `aria-pressed`

- Act 4: Matrix / typography
  - Component: `MatrixRain.astro`
  - Fix correctness (remove `random()`)

- Act 5: Bento morph grid (new)
  - Build a responsive bento layout with `ModernCard`
  - Implement “filters” that rearrange cards
  - Prefer CSS transitions and `prefers-reduced-motion` fallbacks

- Act 6: System integration proof
  - Show:
    - base path derived from `BASE_PATH` (`src/consts.ts`)
    - a few computed `withBasePath()` examples
    - view transitions work (ClientRouter)

Page bottom:

- “Return to site” CTA
- “Perf notes” disclosure element

---

## Animation engineering bible (how to push limits safely)

### Baseline rules

- Never attach scroll listeners for animation.
- Never animate layout properties (width/height/top/left) if avoidable.
- Prefer transforms + opacity.
- Prefer `content-visibility: auto` for heavy sections.
- Prefer `contain: layout paint style` where appropriate.

### Off-screen pausing (required for Demo Lab)

For each heavy module:

- [ ] Create a wrapper element with `data-demo-module="X"`.
- [ ] Attach an `IntersectionObserver`.
- [ ] When not intersecting, add `data-paused="true"`.
- [ ] CSS: when paused, stop animations:
  - `animation-play-state: paused;`
  - reduce expensive filters

### Reduced motion (required)

Implement all three levels:

1. OS preference via `@media (prefers-reduced-motion: reduce)`.
2. Demo Lab toggle (simulated reduced motion via `data-demo-mode`).
3. Functional fallback (still readable and navigable).

Reduced motion checklist:

- [ ] No infinite animations for reduced motion.
- [ ] Replace with a single fade-in (or none).
- [ ] Remove parallax motion.
- [ ] Disable cursor-following effects.
- [ ] Keep focus ring + hover states.

### Touch + pointer correctness

Touch checklist:

- [ ] Any hover-only interaction has a tap/drag equivalent.
- [ ] Prevent scroll-jank: do not `preventDefault` on touchmove unless necessary.
- [ ] Use pointer events (PointerEvent) when possible.
- [ ] Use passive listeners where applicable.

Keyboard checklist:

- [ ] Controls reachable via Tab.
- [ ] Buttons are `<button>` not `<div>`.
- [ ] Toggles expose `aria-pressed`.
- [ ] Labels are meaningful.

### Performance budgets (align with `src/consts.ts`)

Budgets:

- JS bundle target: keep within `PERFORMANCE_BUDGETS.maxBundleSize`.
- Images: keep within `PERFORMANCE_BUDGETS.maxImageSize`.
- Fonts: keep within `PERFORMANCE_BUDGETS.maxFontSize`.

---

## CI/CD upgrades (project-ready)

### Required changes

- Update `CI` workflow Node version to match `.nvmrc`.

### Recommended additions

- Add a “pre-deploy parity” job that runs:
  - `npm run pre-deploy`

- Add Lighthouse CI + axe checks (keep thresholds realistic, then tighten).

- Add link checker (static) so we never ship broken internal links.

---

## Backlog: work packages (extensive, concrete)

> Each work package is meant to be independently testable.

### WP-001 — Node version parity

- [ ] Update `.github/workflows/ci.yml` to Node 24.
- [ ] Ensure caches still work.
- [ ] Verify CI passes.

### WP-002 — New route: Demo Lab skeleton

- [ ] Create `src/pages/demo-lab.astro`.
- [ ] Use `MarketingLayout`.
- [ ] Add TOC and anchors.
- [ ] Add Safety Console.

### WP-003 — Curate visual modules

- [ ] Add `Advanced3DShowcase` section.
- [ ] Add `ParticleVortex` section.
- [ ] Add `InfinityTunnel` section.
- [ ] Add `MatrixRain` section (after correctness fix).

### WP-004 — Fix CSS correctness in MatrixRain

- [ ] Remove invalid `random()` usage.
- [ ] Ensure columns have deterministic delays.
- [ ] Ensure mobile styles remain.

### WP-005 — Pause off-screen animations

- [ ] Add shared module-pauser helper (Demo Lab only).
- [ ] Each module responds to pause state.

### WP-006 — Reduced motion compliance

- [ ] Ensure `prefers-reduced-motion` disables heavy animations.
- [ ] Demo toggle can simulate reduced motion.

### WP-007 — Base-path correctness demonstration

- [ ] Add a “Base-path console” section.
- [ ] Print `BASE_PATH`.
- [ ] Show sample `withBasePath()` outputs.

### WP-008 — Command palette truthfulness

- [ ] Add command “Open Demo Lab”.
- [ ] Remove/flag commands pointing to legacy routes.
- [ ] Verify base-path navigation.

### WP-009 — Search index route alignment

- [ ] Ensure `search-index.json` does not include legacy pages.
- [ ] Ensure any demo-lab entry is included.

### WP-010 — Service worker alignment

- [ ] Update `public/sw.js` precache list:
  - remove legacy routes
  - add `/demo-lab/`
- [ ] Verify offline route works.

### WP-011 — E2E coverage for demo lab

- [ ] Add `e2e/demo-lab.spec.ts`.
- [ ] Verify load + heading.
- [ ] Verify Safety Console toggles affect DOM.

### WP-012 — Documentation update

- [ ] Update `README.md` to mention demo lab route.
- [ ] Document performance policies.

---

## Expanded checklists (these exist to increase quality, not bureaucracy)

### Static-hosting checklist

- [ ] No server-only features.
- [ ] No runtime secrets.
- [ ] No dependency on external APIs for rendering core content.
- [ ] All core content renders without JS.
- [ ] Any client-side fetch has an offline-safe UX.

### Base-path checklist

- [ ] Internal links use `withBasePath()`.
- [ ] Assets referenced using `import.meta.env.BASE_URL` or `withBasePath()`.
- [ ] Service worker uses derived base path correctly.
- [ ] Playwright baseURL works for `/dontforgetyourtowel/`.

### SEO checklist

- [ ] `BaseHead` has correct canonical URLs.
- [ ] OG image path resolves under base path.
- [ ] Demo lab page has title + description.
- [ ] Sitemaps include demo lab.
- [ ] robots allow demo lab.

### A11y checklist

- [ ] Skip link present (MarketingLayout already).
- [ ] All buttons have accessible names.
- [ ] Controls in demo lab have labels.
- [ ] No keyboard traps.
- [ ] Focus is visible.
- [ ] Reduced motion respected.

### Motion safety checklist

- [ ] No seizure-risk strobing.
- [ ] Avoid extreme flashing.
- [ ] Provide pause.
- [ ] Provide reduced motion.

### CSS correctness checklist

- [ ] No invalid CSS functions.
- [ ] No relying on undefined behavior.
- [ ] Prefer standards-based selectors.
- [ ] Keep CSS contained per component.

---

## Prompt usage instructions (for AI agents)

When executing this prompt:

- Prefer small, incremental commits.
- After each work package:
  - run unit tests
  - run lint
  - run typecheck
  - run build
- Keep a running CHANGELOG in `IMPROVEMENTS-LOG.md`.
- Do not resurrect legacy routes unless explicitly requested.

If information is missing:

- Search the repo before inventing solutions.
- Prefer aligning with existing patterns (e.g., MarketingLayout, withBasePath, error-review scripts).

---

## PR-by-PR execution plan (explicit and testable)

> This breaks the work into small, mergeable slices.
> Each PR must keep `npm run pre-deploy` green (or explain why and fix immediately).

### PR-01 — CI Node parity

- [ ] Change `.github/workflows/ci.yml` to use Node 24.
- [ ] Ensure cache works.
- [ ] Confirm CI passes on PR.

### PR-02 — Add Demo Lab route scaffold

- [ ] Create `src/pages/demo-lab.astro`.
- [ ] Use `MarketingLayout`.
- [ ] Add H1 + meta description.
- [ ] Add TOC with anchors.
- [ ] Add “Safety Console” card (static HTML).

### PR-03 — Demo Lab Safety Console (progressive enhancement)

- [ ] Add small client script to handle toggles.
- [ ] Persist settings in localStorage.
- [ ] Apply `data-demo-mode` attribute.
- [ ] Add CSS hooks for pause/reduced motion.

### PR-04 — Add Advanced3DShowcase section

- [ ] Import `src/components/ui/Advanced3DShowcase.astro`.
- [ ] Wrap in section with `content-visibility`.
- [ ] Add “Engineering Notes” details element.

### PR-05 — Add ParticleVortex section

- [ ] Import `src/components/ui/ParticleVortex.astro`.
- [ ] Confirm buttons are accessible.
- [ ] Add touch interaction fallback.

### PR-06 — Add InfinityTunnel section

- [ ] Import `src/components/ui/InfinityTunnel.astro`.
- [ ] Ensure speed toggles are keyboard reachable.
- [ ] Add `aria-pressed` state syncing.

### PR-07 — Fix MatrixRain CSS correctness

- [ ] Remove invalid CSS `random()` usage.
- [ ] Replace with deterministic delays (inline style variables).
- [ ] Verify visuals still look good.

### PR-08 — Add MatrixRain section

- [ ] Import `src/components/ui/MatrixRain.astro`.
- [ ] Ensure reduced motion disables continuous falling.

### PR-09 — Off-screen pause infrastructure (Demo Lab only)

- [ ] Implement a tiny pauser utility for demo modules.
- [ ] Add `data-paused` toggling to module roots.
- [ ] Ensure pause stops animations.

### PR-10 — Performance mode

- [ ] Define performance mode in `data-demo-mode`.
- [ ] In perf mode:
  - [ ] reduce particle count
  - [ ] reduce blur intensity
  - [ ] reduce animation durations
  - [ ] pause background gradients

### PR-11 — Bento morph grid (new component)

- [ ] Create `src/components/ui/DemoBentoLab.astro` (or similar).
- [ ] Use `ModernCard` + existing tokens.
- [ ] Provide filters and smooth layout changes.
- [ ] Provide reduced motion fallback.

### PR-12 — Base-path console section

- [ ] Print `BASE_PATH` and `SITE_URL` safely.
- [ ] Show computed `withBasePath()` examples.
- [ ] Confirm correct output on GH Pages base path.

### PR-13 — Header/mobile nav link to Demo Lab

- [ ] Add “Demo Lab” link to `src/components/Header.astro`.
- [ ] Add to `MobileNav.astro`.
- [ ] Ensure it uses `withBasePath('demo-lab/')`.

### PR-14 — Command palette: add Demo Lab

- [ ] Add command “Open Demo Lab”.
- [ ] Ensure navigation respects base path.

### PR-15 — Command palette: remove legacy commands

- [ ] Remove “Go to Blog” if `/blog` is legacy.
- [ ] Remove “Go to Showcase” if `/showcase` is legacy.
- [ ] Alternatively gate behind a feature flag.

### PR-16 — Search index alignment

- [ ] Ensure `src/pages/search-index.json.ts` only indexes supported routes.
- [ ] Add demo-lab entry.

### PR-17 — Service worker precache alignment

- [ ] Remove legacy routes from `public/sw.js` precache list.
- [ ] Add `/demo-lab/`.
- [ ] Verify offline page still works.

### PR-18 — E2E: demo lab loads

- [ ] Add Playwright test for `/demo-lab/`.
- [ ] Verify H1 visible.

### PR-19 — E2E: demo toggles

- [ ] Toggle pause mode.
- [ ] Assert DOM attribute changes.

### PR-20 — Docs update

- [ ] Update `README.md` to mention `/demo-lab/`.
- [ ] Add short “Demo Lab rules” paragraph.

### PR-21+ — Optional enhancements (only after core is stable)

- [ ] Lighthouse CI
- [ ] Axe gates
- [ ] Visual regression
- [ ] Link checker

---

## Component hardening checklist (targeted, repo-specific)

> Use this as a guided punch list for demo-capable components.

### `src/components/ui/Advanced3DShowcase.astro`

- [ ] Ensure mobile breakpoints look good.
- [ ] Ensure hover-only features have touch equivalents.
- [ ] Ensure parallax uses pointer events safely.
- [ ] Ensure reduced motion disables continuous movement.

### `src/components/ui/ParticleVortex.astro`

- [ ] Ensure `role="group"` controls are correct.
- [ ] Ensure active state uses `aria-pressed` correctly.
- [ ] In perf mode:
  - [ ] reduce `Array.from({ length: 120 })` to a smaller value
  - [ ] reduce glow blur intensity

### `src/components/ui/InfinityTunnel.astro`

- [ ] Ensure speed toggles update active classes and ARIA.
- [ ] In reduced motion, stop rotation and show static tunnel.

### `src/components/ui/MatrixRain.astro`

- [ ] Remove invalid CSS.
- [ ] Ensure columns are deterministic.
- [ ] In reduced motion, freeze or drastically slow falling.

### `src/components/ui/BackgroundEffects.astro`

- [ ] Confirm `pointer-events: none` for purely decorative layers.
- [ ] In perf mode, disable heavy variants.

### `src/components/ui/RevealOnScroll.astro`

- [ ] Consider deduplicating observers (currently creates per-element observers).
- [ ] Ensure it doesn’t animate when reduced motion requested.

---

## Reference snapshots (these are part of the repo’s truth)

### Snapshot: `.nvmrc`

```text
24
```

### Snapshot: `astro.config.mjs` legacy filtering

```js
// legacyPrefixes includes: /blog, /components, /dashboard, /demo, /showcase, /ultimate-3d-gallery, /utility-demo, /visual-showcase
// Demo Lab must NOT be included in this filter.
```

### Snapshot: `src/pages/robots.txt.ts` legacy disallow

```ts
// legacyDisallow includes: /blog, /components, /dashboard, /demo, /showcase, /ultimate-3d-gallery, /utility-demo, /visual-showcase
// Demo Lab must NOT be added to this list.
```

### Snapshot: GitHub Actions workflows

`CI` currently pins Node 20 and must be updated to Node 24.

`Deploy` uses `.nvmrc` (correct).

---

## Ultra-detailed “Definition of Done” checklist (long form)

### Code quality

- [ ] No new `any` types.
- [ ] No new unused exports.
- [ ] No new unreachable routes.
- [ ] No global side effects added without justification.
- [ ] No new heavy dependencies unless justified.

### UX quality

- [ ] Demo Lab is impressive on desktop.
- [ ] Demo Lab is usable on mobile.
- [ ] Demo Lab doesn’t melt laptops (pause/perf mode).
- [ ] Core pages remain calm and fast.

### Deployment correctness

- [ ] Works on `localhost:4321/`.
- [ ] Works on `https://{user}.github.io/{repo}/`.
- [ ] All internal navigation respects base path.
- [ ] Service worker scope is correct.

### Testing

- [ ] Unit tests pass.
- [ ] E2E tests pass.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Build passes.

---

## Appendix A — Existing Design Improvements (from `DESIGN-IMPROVEMENTS.md`)

> Included verbatim for reference and to ensure upgrades align with already-delivered work.

````markdown
# Design Improvements Summary

## Overview

Comprehensive modern design system upgrade with glassmorphism, animations, and refined visual effects.

## Changes Made

### 1. Enhanced Color System & Glassmorphism

**File:** `tailwind.config.ts`

- Added custom glassmorphism utilities (`.glass`, `.glass-dark`)
- Created text gradient utilities (`.text-gradient`, `.text-gradient-blue`, `.text-gradient-purple`)
- Implemented pattern utilities (`.pattern-dots`, `.pattern-grid`)
- Added perspective and transform-3D utilities
- Enhanced with 8+ keyframe animations (float, shimmer, gradient, glow, etc.)
- Added 6 background image utilities (gradient-radial, gradient-conic, mesh, shine, noise)

### 2. Typography & Visual Effects

**File:** `src/styles/global.css`

- Animated text gradients with smooth transitions
- Multiple gradient variants (purple, blue, shine with shimmer effect)
- Grid patterns for visual depth (`.grid-highlight`, `.grid-dots`)
- Glow effects (subtle and strong variants)
- Glassmorphism styles (`.glass-panel`, `.glass-card`)
- Animated backgrounds (`.bg-animated`, `.bg-mesh`)
- Custom scrollbars for better UX
- Keyframe animations for smooth motion

### 3. Modern Component Animations

**New Component:** `src/components/ui/RevealOnScroll.astro`

- Intersection Observer-based scroll animations
- 7 animation types: fade, slide-up/down/left/right, scale, flip
- Configurable duration, delay, and threshold
- Stagger support for child elements
- Performance-optimized with `will-change`
- Responsive to viewport visibility

### 4. Enhanced ModernButton Component

**File:** `src/components/ui/ModernButton.astro`

- Glassmorphism effects on all variants
- Enhanced shadow system with color-specific glows
- Ripple effect on click interaction
- Improved hover states with scale and translate
- Shimmer effect on hover
- Better focus states with ring indicators
- Gradient animation for gradient variant
- Neon variant with strong glow effect
- Added `ease-smooth` timing function
- Brightness transitions on hover

### 5. Enhanced ModernCard Component

**File:** `src/components/ui/ModernCard.astro`

- Upgraded to `rounded-2xl` for softer corners
- Glassmorphism variants (`glass-card`, `glass-panel`)
- Enhanced shadow system with depth
- Animated background patterns (3 floating orbs)
- Shimmer effect on hover
- Grid pattern overlay for glass variant
- Noise texture for added depth
- Improved glow effects with gradient borders
- Better hover interactions with rotation
- Multiple animated elements with stagger timing

### 6. Background Effects Component

**New Component:** `src/components/ui/BackgroundEffects.astro`

- 6 variants: mesh, orbs, grid, noise, particles, waves
- Mesh gradients with 4 floating colored orbs
- Pulsing orb effects with gradients
- Subtle grid patterns
- Particle system with 20 floating particles
- Animated wave SVG patterns
- Configurable intensity (subtle, medium, strong)
- Adjustable blur levels
- Animation toggle support
- Fixed positioning for background use

### 7. Spacing & Layout Optimization

**File:** `tailwind.config.ts`

- Extended spacing scale: 18, 72, 84, 96, 128
- New line-height variants: extra-loose (2.5), super-loose (3)
- Extended max-width: 8xl (88rem), 9xl (96rem)
- Better visual rhythm with consistent spacing
- Improved grid layouts with extended spacing

## Key Features

### Glassmorphism

- Backdrop blur effects
- Transparent backgrounds with borders
- Layered depth with shadows
- Works in light and dark modes

### Animations

- Smooth cubic-bezier timing
- Hardware-accelerated transforms
- Multiple keyframe animations
- Stagger effects for sequences
- Scroll-triggered reveals

### Visual Effects

- Mesh gradients for backgrounds
- Glow effects with color-specific shadows
- Shimmer overlays on hover
- Noise textures for depth
- Pattern overlays (dots, grids)
- Floating particle systems

### Interactions

- Ripple effects on click
- Scale and translate on hover
- Brightness adjustments
- Smooth focus states
- Animated borders and gradients

## Usage Examples

### RevealOnScroll Animation

```astro
<RevealOnScroll animation="slide-up" duration={600} threshold={0.1}>
  <h2>This will slide up when visible</h2>
</RevealOnScroll>
```

### ModernButton with Effects

```astro
<ModernButton variant="gradient" size="lg" shadow="xl"> Click Me </ModernButton>
```

### ModernCard with Glow

```astro
<ModernCard variant="glass" glow animated>
  <h3>Card Content</h3>
  <p>Beautiful glassmorphic card with glow effect</p>
</ModernCard>
```

### Background Effects

```astro
<BackgroundEffects variant="mesh" intensity="medium" animated blur="xl" />
```

## Performance Considerations

- Used `will-change` for animated elements
- Hardware-accelerated transforms with `transform-gpu`
- Intersection Observer for scroll animations (no scroll listeners)
- Pointer-events: none on decorative layers
- Optimized backdrop-blur usage
- Efficient CSS animations with GPU acceleration

## Browser Support

- Modern browsers with backdrop-filter support
- Graceful degradation for older browsers
- CSS custom properties for theming
- Intersection Observer API (with polyfill option)

## Next Steps

To apply these improvements site-wide:

1. Use `RevealOnScroll` wrapper on page sections
2. Replace old buttons with enhanced `ModernButton`
3. Update card components to use new `ModernCard`
4. Add `BackgroundEffects` to page layouts
5. Apply text gradient classes to headings
6. Use glassmorphism utilities in navigation/modals

All changes are production-ready with no breaking changes to existing code.
````

---

## Appendix B — Existing Code Improvements (from `CODE-IMPROVEMENTS.md`)

> Included verbatim for reference and to ensure we build on the existing engineering work.

````markdown
# Code Improvements Summary

## Overview

This document outlines the comprehensive improvements made to the codebase to enhance code quality, security, performance, and maintainability.

## 🎯 Key Improvements

### 1. Enhanced Error Handling (`src/core/analyzer.ts`)

**What Changed:**

- Added comprehensive error handling with detailed error messages
- Implemented backup creation before file modifications
- Added validation for missing file paths and suggestions
- Improved error propagation with proper error types
- Added JSDoc comments for better code documentation

**Benefits:**

- Safer auto-fix operations with backup protection
- Better debugging with detailed error context
- Graceful degradation when errors occur
- Clearer error messages for developers

**Code Example:**

```typescript
// Before
await this.applyFix(issue);

// After
try {
  await this.applyFix(issue);
  fixed.push(issue);
  logger.debug(`Fixed: ${issue.title} in ${issue.file}`);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  failed.push({ issue, reason: errorMessage });
  logger.warn(`Failed to fix: ${issue.title} - ${errorMessage}`);
}
```

---

### 2. Input Validation Utilities (`src/utils/validation.ts`)

**What Changed:**

- Created comprehensive validation schemas using Zod
- Added sanitization functions for HTML, user input, and file names
- Implemented type guards for runtime type checking
- Added custom ValidationError class
- Created security-focused validation patterns

**Features:**

- ✅ Email validation
- ✅ URL validation
- ✅ File path sanitization (prevents directory traversal)
- ✅ HTML sanitization (removes XSS vectors)
- ✅ Safe JSON parsing
- ✅ Required field validation
- ✅ File size and extension validation

**Usage Example:**

```typescript
import {
  emailSchema,
  sanitizeHtml,
  validateRequiredFields,
} from './utils/validation';

// Validate email
emailSchema.parse('user@example.com'); // ✓ passes

// Sanitize HTML
const safe = sanitizeHtml('<script>alert("xss")</script>'); // Removes script tags

// Validate required fields
validateRequiredFields(userData, ['name', 'email']); // Throws if missing
```

---

### 3. Security Headers Configuration (`src/config/security.ts`)

**What Changed:**

- Defined production-ready security headers
- Created CSP (Content Security Policy) builder
- Added configuration generators for Netlify/Vercel
- Included security best practices checklist

**Security Headers Included:**

- **Content-Security-Policy**: Prevents XSS attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Strict-Transport-Security**: Forces HTTPS
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Controls browser features

**Usage Example:**

```typescript
import { CSPBuilder, generateNetlifyHeaders } from './config/security';

// Build custom CSP
const csp = new CSPBuilder()
  .allowScriptFrom('https://cdn.example.com')
  .allowStyleFrom('https://fonts.googleapis.com')
  .build();

// Generate _headers file for Netlify
const headers = generateNetlifyHeaders();
```

---

### 4. Performance Budgets (`src/config/performance-budgets.ts`)

**What Changed:**

- Defined performance budgets for JS, CSS, images, and fonts
- Added Core Web Vitals thresholds
- Created performance monitoring utilities
- Implemented recommendation engine

**Performance Budgets:**

- JavaScript: 500 KB total
- CSS: 100 KB total
- Images: 200 KB per image
- Fonts: 300 KB total
- Page Weight: 1-1.5 MB

**Core Web Vitals Targets:**

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

---

### 7. Utility Refactoring (Technical Debt)

**What Changed:**

- Modularized monolithic utility files (`helpers.ts`, `index.ts`) into focused modules
- Created specialized modules: `math.ts`, `storage.ts`, `color.ts`, `api.ts`, `date.ts`, `array.ts`, `string.ts`, `url.ts`, `validation.ts`, `function.ts`
- Updated `index.ts` to re-export from new modules
- Converted `helpers.ts` to a backward-compatible barrel file

---

**Last Updated:** November 3, 2025
````

---

## Appendix C — Technical debt tracking (from `TECHNICAL-DEBT.md`)

```markdown
# Technical Debt: Utility Function Consolidation

## Overview

This document tracks known technical debt related to duplicate utility functions across the codebase. These are areas that work correctly but could be improved for maintainability.

## Duplicate Utilities

### 1. Date Formatting Functions (RESOLVED)

**Status:** Resolved. Consolidated into `src/utils/date.ts`.

### 2. Array Utilities (RESOLVED)

**Status:** Resolved. Consolidated into `src/utils/array.ts`.

### 3. String Utilities (RESOLVED)

**Status:** Resolved. Consolidated into `src/utils/string.ts`.

### 4. Debounce/Throttle (RESOLVED)

**Status:** Resolved. Moved to `src/utils/function.ts`.

### 5. URL Utilities (RESOLVED)

**Status:** Resolved. Consolidated into `src/utils/url.ts`.

### 6. Validation Functions (RESOLVED)

**Status:** Resolved. Consolidated into `src/utils/validation.ts`.
```

---

## Appendix D — Phase 2 roadmap (from `NEXT-PHASE-PROMPT.md`)

```markdown
# Strategic Development Roadmap: Phase 2 (Static Ops Maturity)

**Core Philosophy:** "Static First, Dynamic Feel"

### 1. The "Intelligent" Static Content Layer

- Implement client-side search (Pagefind or Fuse)
- Automated OG images at build time
- Related-content engine at build time

### 3. Operational Rigor & CI/CD

- Lighthouse + a11y gates in GitHub Actions
- Visual regression testing
- Broken link checker
```
