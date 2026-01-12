# MEGA PROMPT — Remaining Work Only (dontforgetyourtowel)

**Last updated:** 2026-01-12

This is the **single source of truth** for what is **NOT DONE YET**.

It consolidates the best, repo-specific engineering guidance from the legacy prompt/docs bundle into one operational spec.

If a requirement is not in this file, treat it as **done, deprecated, or out of scope**.

---

## 0) Role + operating mode

You are a **Principal Frontend Engineer / Astro specialist**.

Your job is to:

- Ship improvements in **small PRs**.
- Keep **static hosting constraints** (GitHub Pages) non-negotiable.
- Preserve **progressive enhancement**: the site must remain readable and usable without JS.
- Maintain strict correctness for **base path deployments**.

### 0.1 Non-negotiables (hard rules)

1. **No server runtime assumptions.** Everything must be build-time or client-side.
2. **Base-path safe links everywhere.** Never hardcode internal absolute paths without base handling.
3. **No heavy global scripts.** Put advanced motion logic inside feature pages/modules.
4. **Accessibility first.** Semantic HTML before ARIA; keyboard + touch support.
5. **Motion safety.** Respect `prefers-reduced-motion` and demo-lab dataset flags.
6. **Quality gates stay green.** Never merge work that breaks checks.

---

## 1) Stack + repo reality (ground truth)

- Astro (static output), Tailwind, TypeScript
- Islands (Preact; some Solid)
- View transitions in `src/components/BaseHead.astro`
- PWA artifacts exist (`public/sw.js`, manifest route)
- Playwright e2e exists (base-path-aware)
- Custom “error reviewer” CLI exists and is part of quality workflow

### 1.1 Current quality workflow

**Definition of done for every PR:** `npm run pre-deploy` is green.

That includes:

- error reviewer (critical)
- typecheck
- lint
- unit tests
- build

---

## 2) What is already done (do not redo)

This section exists to prevent duplicate work.

- Demo Lab “Safety Console” state is centralized in `src/utils/demo-lab.ts`.
- Demo modules were refactored to rely on shared demo-lab helpers (pause/reduced/perf) rather than re-implementing dataset parsing.
- Unit tests exist for demo-lab utilities.

- Service worker precache list is guarded against legacy/disallowed routes via shared legacy-route matching and a unit test.
- Viewport meta tag includes `viewport-fit=cover` + `interactive-widget=resizes-content` (mobile keyboard-safe).
- Safe-area + mobile viewport utility classes exist in `src/styles/global.css`.

- Navigation + command palette truthfulness is enforced by filtering legacy/disallowed routes out of `search-index.json` and filtering again at the command palette ingestion layer.

- CI Node version alignment: GitHub Actions uses `.nvmrc` via `node-version-file`, and `.nvmrc` is pinned to Node 24.

- Build-time related content engine: blog post pages render a static “Related posts” section based on shared tags with recency fallback.

- Touch gesture foundation: `src/utils/gestures.ts` added (swipe/pinch/long-press) and Shop Demo quick-view gallery supports swipe left/right.

- Network-aware resource loading foundation: `src/utils/network-adapter.ts` added (quality bucketing + subscribe + hook) and global motion scripts are loaded conditionally via `src/scripts/ux-bootstrap.ts`.

---

## 3) Scope decision (avoid conflicting legacy docs)

Some legacy prompt docs described **removing blog pages, dashboards, demos, offline page, etc.**

That conflicts with the current repo direction (curated product + demo-lab + shop demo + content system).

**Therefore:**

- **Do NOT remove the blog/content system** as a default action.
- **Do NOT delete demo components**.
- Legacy “MSP business transformation” content is treated as **reference** (copywriting ideas, color palette inspiration), not an execution mandate.

If you explicitly want the “business-only MSP mode”, create a separate branch/plan and do it intentionally.

---

## 4) Highest priority unfinished work (ship-first)

_(No ship-first items currently listed here — proceed to shop-demo + mobile roadmap.)_

---

## 5) E-commerce demo: remaining work (shop-demo)

Goal: make the e-commerce demo feel like a real product, while staying demo-safe and static.

### 5.1 Catalog scalability

- Expand to 60–100 products with richer attributes.
- Keep filtering/search fast.

### 5.2 Faceted filtering + pills

- Facets (brand/category/price/rating/stock/etc.)
- Active filter pills with clear/remove all
- Helpful empty states

### 5.3 Pagination modes

- Page-based pagination and/or infinite loading (demo-safe)
- Stable URLs if paging changes route state

### 5.4 PDP upgrade

- Gallery
- Tabs/accordions
- Reviews (demo)

### 5.5 Cart intelligence

- Free-shipping progress bar
- Save-for-later
- Undo actions

### 5.6 A11y + perf requirements

- No new axe violations
- No console warnings
- Reduced motion honored
- Demo-lab pause/perf modes respected

---

## 6) Mobile-first excellence (unfinished roadmap)

Implement the following in a staged, testable way:

### Phase 1 (foundation)

- Implement mobile-first spacing system
- Create touch-optimized button components
- Set up mobile navigation system
- Configure critical CSS inlining
- Optimize font loading strategy
- Implement image lazy loading
- Set up Playwright mobile tests

### Phase 2 (core experience)

- Build mobile-optimized forms
- Implement swipe gestures (only where it improves UX)
- Add PWA install prompt (demo-safe)
- Implement share API integration (optional)
- Optimize service worker caching
- Implement safe area handling

### Phase 3 (advanced)

- Skeleton loading states
- Optimistic UI updates
- Offline functionality polish
- Performance monitoring (privacy-first)

### Phase 4 (polish/testing)

- Comprehensive mobile testing
- Accessibility audit
- Cross-browser testing
- Documentation + launch prep

---

## 7) Site-wide productization checklist (unfinished)

### 7.1 Global page checklist (apply to every route)

- Correct landmarks (`header`, `main`, `footer`)
- Skip link visible on focus
- Unique title + meta description
- Canonical URL base-path safe
- OG/Twitter tags correct
- Structured data where appropriate
- Explicit image dimensions (avoid CLS)
- No blocking JS; islands only where needed
- Reduced motion honored
- Keyboard navigation verified
- Mobile safe-area verified

### 7.2 Header/Footer hardening

- Header: sticky behavior without jank, keyboard/focus-visible correctness
- Footer: production-ready structure (support/legal/social/newsletter demo), accessible link groups, trust badges

### 7.3 PWA + offline UX

- SW registration does not break navigation
- Provide a SW update UI
- Offline route is accurate and helpful

---

## 8) Ops maturity (unfinished)

### 8.1 CI quality gates

- Lighthouse CI + Axe checks on PRs (fail if regression)
- Broken link checker
- Visual regression snapshots for critical views

### 8.2 Observability (demo-safe)

- Never log PII
- Redact errors
- Prefer aggregates over raw logs

---

## 9) Execution protocol (how to ship)

### 9.1 PR rules

- Small PRs only
- Include acceptance checklist
- Include at least one: screenshot pair, lighthouse snapshot, or e2e assertion
- `npm run pre-deploy` must be green

### 9.2 Recommended order

1. CI Node alignment + SW route correctness
2. Navigation/command palette truthfulness
3. Search/related content/OG images
4. E-commerce upgrades
5. Mobile-first roadmap execution
6. Ops maturity (CI gates, visual regression, link checking)

---

## 10) Repo anchors (start here)

- Demo Lab controller script: `src/scripts/demo-lab.ts`
- Demo Lab utilities: `src/utils/demo-lab.ts`
- Demo Lab page: `src/pages/demo-lab.astro`
- Shop demo page: `src/pages/shop-demo.astro`
- E-commerce component: `src/components/demo-lab/EcommerceShowcase.tsx`
- Deployment config: `config/deployment.js`
- Astro config: `astro.config.mjs`

---

## 11) Output requirements

When implementing work from this mega prompt:

- Update this file by moving completed items into the “already done” section (keep it short).
- Do not re-add legacy prompt files.
- Keep changes base-path safe.
