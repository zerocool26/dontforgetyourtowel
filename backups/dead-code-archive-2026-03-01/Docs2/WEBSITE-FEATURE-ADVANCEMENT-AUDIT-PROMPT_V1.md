# Website Feature Advancement Audit Prompt (V1) — dontforgetyourtowel (Feb 2026)

Use this prompt with a senior AI coding agent to **audit this repo end-to-end**, find gaps, and ship improvements that make the website **better across the board** (UX, performance, accessibility, SEO, conversion, maintainability, 3D/showroom quality, and reliability) while respecting the repo’s real constraints.

This prompt is intentionally “advanced but not maximal.” It is designed to produce a **much more detailed Prompt V2** afterward.

---

## Role

You are a **Principal Frontend Engineer + Creative Technologist** specializing in **Astro SSG**, **Preact islands**, Tailwind systems, and **Three.js/R3F** experiences.

## Hard Constraints (Non‑negotiable)

- **Static hosting reality**: GitHub Pages / static output only. No long-lived server APIs, no SSR-only dependencies.
- **Base path correctness**: All internal navigation must respect `base` and `site` derived via `config/deployment.js` and used in `astro.config.mjs`.
  - Prefer `withBasePath()` from `src/utils/helpers.ts` (or the canonical URL helper if present) for internal links.
- **Progressive enhancement**: Core content must remain usable with JavaScript disabled. Interactivity must degrade gracefully.
- **Mobile-first**: Ship improvements with mobile/tablet as the primary target.
- **Keep quality gates green**: Before declaring “done”, the repo’s quality scripts must pass.

## Repo Reality (Assume these are true unless you verify otherwise)

- Astro + MDX + Tailwind, islands via Preact; repo also contains React and Solid integrations with directory-scoped includes/excludes.
- Playwright E2E suite is configured to test with base path (GitHub Pages-style).
- A custom “error reviewer” static analysis CLI exists and is wired into npm scripts.
- There are intentionally “legacy routes” that redirect and are filtered from sitemap/robots (do not blindly resurrect them).

---

## What you must deliver (Outputs)

### A) Audit Report (actionable, repo-specific)

Produce a report with:

1. **Top 15 improvements** (ranked) with:
   - Impact (User value / conversion / quality)
   - Risk (regression likelihood)
   - Effort (S/M/L)
   - Exact target locations (file paths + what to change)
2. **Gap inventory** by category:
   - UX & IA (navigation, wayfinding, CTA consistency)
   - Accessibility (keyboard paths, focus, reduced motion, screen reader behavior)
   - Performance (Core Web Vitals, bundle splits, image strategy, 3D perf)
   - SEO (metadata, sitemap/robots alignment, canonical URLs)
   - Security & safety (sanitization, CSP/headers generation, unsafe DOM patterns)
   - Reliability (error boundaries, WebGL fallbacks, offline/PWA coherency)
   - Codebase health (dead code, duplication, inconsistent patterns)
   - Testing gaps (missing E2E coverage, skipped suites rationale)
3. **“Truth table” list**: where the repo’s docs/prompts disagree with current code.

### B) Shipped Improvements

Implement a **cohesive batch** of improvements (not micro-edits):

- 5–10 small-to-medium changes, or
- 1–3 larger integrated changes

Each change must include:

- A short rationale
- The exact files touched
- Validation steps executed

### C) Validation Proof

Run and report results for the relevant gates (at minimum):

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e` (or targeted Playwright projects/specs when appropriate)
- If applicable: `npm run error-review:critical` and `npm run error-review:deployment`

### D) Create Prompt V2 (meta-output)

After completing A–C, generate a **Prompt V2** that is 2–4× more detailed, tailored to what you learned from this audit.

---

## Required First Steps (Context Loading)

Before proposing changes, read and summarize the repo’s “source of truth” docs:

- `Docs2/ADVANCED-UPGRADE-PROMPT.md` (existing master prompt; align with it, don’t fight it)
- `Docs2/IMPLEMENTATION-SUMMARY.md` (what features already exist)
- `Docs2/INTEGRATION-GUIDE.md` (integration patterns)
- `Docs2/ERROR-REVIEWER-README.md` (how the analyzer works)
- `astro.config.mjs`, `playwright.config.ts`, `package.json`

Then do **fast discovery scans** (lightweight, not exhaustive):

- Search for hardcoded internal links that may ignore base path.
- Search for “legacy route” references that still appear in nav/command palette/search.
- Search for hardcoded color classes that bypass the repo’s `tone-*` system.
- Search for long-running global scripts in `BaseHead` and evaluate cost.

---

## Audit Playbook (What to look for)

### 1) Product / UX Upgrades (Across-the-board)

Find gaps in:

- Navigation clarity: consistent CTAs, breadcrumbing where needed, “what’s next” pathways.
- Discoverability: site search quality (Fuse.js), command palette accuracy, content taxonomy.
- Conversion funnel quality: services → proof → contact; remove friction.
- Consistency: shared primitives (buttons/cards/forms) behave identically across pages.

### 2) Accessibility & Inclusive Motion

- Focus-visible rings, tab order, skip links, landmark structure.
- ARIA where necessary; avoid ARIA where semantic HTML is enough.
- Respect `prefers-reduced-motion` across animated UI and 3D experiences.
- Gate hover-only effects via `[@media(hover:hover)]` to prevent “stuck hover” on touch devices.

### 3) Performance & 3D/Showroom Excellence

- Verify code splitting for heavy 3D/animation modules and pages.
- Confirm texture/model compression strategy (Basis/Draco directories exist).
- Ensure render loops are efficient; pause when offscreen; reduce work when tab hidden.
- Add WebGL failure fallbacks (informative, branded) and degraded rendering modes.

### 4) SEO, Routing, PWA/Service Worker Coherency

- Sitemap/robots alignment with actual supported routes.
- Canonical URLs and base-path-safe internal linking.
- Service worker precache list matches real routes (no precaching legacy redirects).

### 5) Security / Hardening

- Validate form inputs; sanitize any HTML rendering; no unsafe `innerHTML`.
- Use the existing security utilities (CSP builder, headers generators) if present.
- Verify that sharing utilities and user-controlled strings are properly sanitized.

### 6) Testing & Quality Culture

- Identify why tests are skipped; ensure “skips” are intentional and documented.
- Add targeted tests for anything you modify if a test harness already exists.

---

## Implementation Rules (How you ship changes)

- Make changes in **coherent batches** (a feature/funnel/surface at a time).
- Don’t introduce new design tokens or random one-off colors; prefer the repo’s existing tone utilities.
- Avoid adding global scripts unless strictly necessary; prefer per-page progressive enhancements.
- Keep diffs minimal and consistent with existing style.
- If you detect “docs drift” (docs say X, code does Y), either update docs or update code—don’t ignore it.

---

## “Advanced” Deliverable Format (strict)

When you answer, use this structure:

1. **Repo Reality Snapshot** (5–10 bullets: what’s present, what’s constrained)
2. **Top Gaps** (ranked list, with file pointers)
3. **Work Plan** (3–7 steps, test gates included)
4. **Changes Shipped** (bullets grouped by feature surface)
5. **Validation Results** (commands + pass/fail)
6. **Prompt V2** (fully copy/paste ready)

---

## META: Generate Prompt V2 (How to expand this prompt)

After the audit and shipping improvements, produce Prompt V2 that:

- Adds a **file-by-file checklist** (pages, layouts, shared components, scripts, configs)
- Adds a **scoring rubric** (0–100) per category (UX, A11y, Perf, SEO, Security, Reliability, DX)
- Adds **acceptance criteria** for each improvement (what “done” means)
- Adds a **regression checklist** for base-path, legacy routes, SW cache, view transitions
- Adds **“don’t do” rules** to prevent scope creep
- Adds a **prioritized backlog** (Now / Next / Later) with measurable metrics

V2 must be repo-specific: reference real scripts from `package.json` and real file locations. Do not include generic advice without mapping it to where it applies in this repo.
