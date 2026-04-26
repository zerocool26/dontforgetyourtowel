---
description: "Use when editing public-facing Astro marketing routes such as home, services, pricing, company, contact, about, gallery, build-studio, and trades. Enforce mobile-first buyer intent, token reuse, progressive disclosure, and route-safe validation."
applyTo: "src/pages/**/*.astro"
---

# Marketing route standards

- Lead with customer problem, buyer fit, proof, and next step before capability detail.
- Keep mobile hierarchy calm: one primary action, one secondary action, and minimal competing chrome above the fold.
- Prefer data-driven content from `src/data/**` over hard-coded repeated messaging whenever the same idea appears in multiple routes.
- Prefer shared primitives (`MarketingLayout`, `ModernButton`, `ModernCard`) and tone/token utilities (`tone-*`, `creative-*`) over one-off visual treatments.
- Reuse project color tokens and global utility classes instead of introducing raw hex colors in route markup unless there is a route-specific art-direction reason.
- Preserve existing `data-*` hooks, anchors, and headings that are covered by tests or route-to-route deep links.
- Keep primary mobile tap targets at least 44px tall; 48px is preferred for major CTAs.
- When changing route behavior or interactions, validate with `npm run lint`, `npm run typecheck`, `npm run build`, and the most relevant focused Playwright spec.
