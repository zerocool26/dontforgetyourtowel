---
description: "Use when editing shared UI, business, and showcase components. Enforce design-token consistency, accessibility, reduced-motion awareness, and reusable mobile-first component behavior."
applyTo: "src/components/**"
---

# Shared component standards

- Build reusable component behavior first; avoid baking page-specific copy or route assumptions into shared components.
- Prefer CSS variables, tone utilities, and shared classes from `src/styles/global.css` over repeating raw color literals in component classes.
- Default to accessible, mobile-first interaction patterns: visible focus states, keyboard reachability, and touch-friendly sizing.
- Treat reduced motion and performance mode as first-class requirements for public interactive components.
- Keep hover motion subtle and never rely on hover for critical meaning.
- If a component appears on multiple public routes, optimize for consistency and scanability before adding extra flourish.
- Preserve or improve existing test hooks (`data-testid`, `data-*`) used by unit or Playwright coverage.
