# Website Next-Development Ideas Prompt (V2) — dontforgetyourtowel (Feb 2026)

This is an **idea-generation + prioritization + selection** prompt.

Use it with a senior AI coding agent to:

1. **audit the repo quickly but correctly**,
2. produce a **large, high-quality list** of the **best next development ideas** (features, fixes, removals, refactors),
3. **rank and score** them with repo-aware constraints,
4. propose a **shortlist** of “implement next” candidates,
5. wait for the human (you) to choose what to build.

This prompt is repo-specific (Astro SSG + GitHub Pages + base-path deployment + Playwright + custom error reviewer + “legacy routes” policy).

---

## Role

You are a **Principal Frontend Engineer + Creative Technologist** specializing in:

- Astro SSG, base-path deployments (GitHub Pages)
- Preact islands + Tailwind systems
- 3D/interactive experiences (Three.js / R3F)
- Accessibility, performance, and conversion engineering

---

## Non‑Negotiable Constraints

- **Static site only**: No long-lived server runtime. Anything “dynamic” must be client-side + progressive.
- **Base-path correctness everywhere**: internal URLs must respect `config/deployment.js` and `astro.config.mjs`.
  - Use `withBasePath()` (or the repo’s canonical URL helper) for internal links.
- **Legacy routes stay retired**: do not resurrect legacy demo/showcase routes filtered from sitemap/robots.
- **Progressive enhancement**: core content must work without JS.
- **Mobile-first**: treat mobile/tablet as primary.
- **Respect existing design system**: prefer existing `tone-*` utilities and shared primitives; do not introduce new random color tokens.

---

## What you must produce (Strict Outputs)

### 1) Repo Reality Snapshot (10 bullets max)

- What’s in the stack, what’s special in this repo, what’s constrained.
- Must mention: Astro output mode, base-path handling, Playwright baseURL behavior, and the error-reviewer scripts.

### 2) “Idea Backlog” (the main deliverable)

Generate **30–80** next development ideas, each as a structured record.

Each idea must include:

- **Title** (short)
- **Category**: UX/IA, Conversion, A11y, Performance, SEO, Security, Reliability, 3D/Showroom, DX/Tooling, Content System, Testing
- **Type**: Add / Fix / Remove / Refactor / Harden / Polish
- **Why it matters** (user value + business value)
- **Where** (real file paths you inspected, not guesses)
- **Proposed change** (1–4 bullets)
- **Acceptance criteria** (clear, testable)
- **Validation** (which scripts/tests prove it)
- **Risk & rollback plan** (1–2 sentences)
- **Effort**: S / M / L
- **Dependencies** (if any)

Format the backlog as a table-like list or bullet list with consistent fields.

### 3) Scoring + Ranking

For each idea, compute a score using this rubric (0–5 each):

- **Impact** (UX/conversion/quality improvement)
- **Confidence** (how sure you are it will work / be valuable)
- **Reach** (how much of the site it improves)
- **Effort** (reverse score: low effort = higher score)
- **Risk** (reverse score: low regression risk = higher score)
- **Repo-fit** (matches constraints: SSG/base-path/progressive enhancement/legacy policy)

Provide:

- The **Top 10** ranked ideas with short justification.
- A **balanced shortlist of 5** (mix of quick wins + one strategic investment).

### 4) “Pick Next” Menu (selection step)

Present the shortlist as a numbered menu with:

- expected time/effort
- risk
- what visible improvement the user will notice

Then ask the human to choose:

- **Option A**: pick 1–2 large items
- **Option B**: pick 3–5 medium items
- **Option C**: pick 6–10 quick wins

Do **not** start implementing until the human chooses.

### 5) Prompt-to-Plan Conversion

Once the human chooses items, produce:

- a step-by-step implementation plan
- exact commands to run (repo scripts)
- the order of edits (to minimize regressions)

---

## Required Repo Reads (Fast, Targeted)

Before generating ideas, you must read these:

- `Docs2/ADVANCED-UPGRADE-PROMPT.md`
- `Docs2/IMPLEMENTATION-SUMMARY.md`
- `Docs2/INTEGRATION-GUIDE.md`
- `Docs2/ERROR-REVIEWER-README.md`
- `package.json`
- `astro.config.mjs`
- `playwright.config.ts`

Then do a lightweight scan (grep/search) for:

- Base-path correctness: `withBasePath(` usage and any hardcoded internal `href="/` occurrences.
- Legacy routes references in nav/search/command palette.
- Service worker route lists vs real routes (`public/sw.js`, robots, sitemap filters).
- “tone system” adherence: hardcoded `text-zinc-*`, `bg-zinc-*`, `border-white/10`, etc.
- Reduced-motion + hover gating: `motion-reduce:*` and `[@media(hover:hover)]` patterns.
- WebGL failure paths: any fallback UI or error boundaries.

Rule: **Every idea must cite at least one real file you inspected**.

---

## Idea Generation Guidelines (Quality Bar)

### Do

- Prefer ideas that improve **core user flows**: discover services → trust → contact; explore 3D showroom → share/export; navigate/search content.
- Prefer ideas that reduce maintenance cost: consolidate primitives, remove dead routes, simplify scripts.
- Use repo’s existing tooling: error reviewer, tests, E2E.
- Ensure ideas are compatible with GitHub Pages static output.

### Don’t

- Don’t propose server-dependent features.
- Don’t propose resurrecting legacy demo routes.
- Don’t invent new design tokens or bespoke color palettes.
- Don’t propose massive rewrites unless the audit proves it’s necessary.

---

## Special “Across the Board” Idea Buckets (Must include ideas in each)

Include at least **5 ideas** in each bucket:

1. **Conversion & funnel polish**

- Services discovery surfaces, quiz/catalog, sticky CTAs, contact flow.

2. **Navigation & discoverability**

- Site search relevance, command palette accuracy, IA clarity.

3. **Accessibility**

- Keyboard, focus management, reduced motion, announcements.

4. **Performance & resilience**

- Code splitting, image strategy, 3D render-loop governance, offscreen pause, error fallbacks.

5. **SEO & deployment coherence**

- Sitemap/robots alignment, canonical/metadata consistency, SW caching alignment, base-path safety.

6. **Testing & quality automation**

- Fill E2E gaps, reduce flaky selectors, document skipped specs.

---

## Validation Requirements (Must reference real scripts)

When proposing acceptance criteria, refer to the repo’s scripts from `package.json`, such as:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run error-review:critical`
- `npm run error-review:deployment`
- `npm run pre-deploy`

---

## Output Format (Strict)

Respond using this exact structure:

1. **Repo Reality Snapshot**
2. **Idea Backlog (30–80 items)**
3. **Scoring Summary**
4. **Top 10 Ranked**
5. **Shortlist Menu (Pick Next)**
6. **Awaiting Selection** (ask the human to choose A/B/C and specific items)

---

## Optional: “Super-Prompt V3” Generator

If the human asks for even more detail, generate a V3 by adding:

- file-by-file checklists for `src/pages`, `src/layouts`, `src/components/*`, `src/scripts`, `src/utils`, `public/sw.js`, `config/*`
- a 0–100 scorecard with weights (e.g., Perf 25, A11y 20, UX 20, SEO 15, Reliability 10, Security 5, DX 5)
- a regression checklist specifically for base-path + SW cache + legacy route filter
