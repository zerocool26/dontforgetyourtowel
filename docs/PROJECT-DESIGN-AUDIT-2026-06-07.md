# Project Design Audit - 2026-06-07

## Diagnosis

The project is not failing because it lacks components, effects, or content. It is failing because too many design eras are layered together: dark operations UI, muted B2B cards, neon remnants, 3D showcase language, ecommerce demo language, and generic MSP claims. The result feels controlled but lifeless.

The strongest next version should feel like an operating command center for Chicago business owners: immersive enough to be memorable, practical enough to be credible, and specific enough that every page helps a buyer make a better decision.

## Research Takeaways

- AI-assisted UI often lands as usable but conventional. The risk is competent screens without original product thinking, distinct visual memory, or longitudinal journey logic. See: [Usable but Conventional: An Empirical Study on the UX of AI-Generated Interface Prototypes](https://arxiv.org/abs/2605.15124).
- Mature visual design needs scale, hierarchy, balance, contrast, and gestalt discipline before novelty. See: [NN/g visual-design principles](https://media.nngroup.com/media/articles/attachments/Principles_Visual_Design-Letter.pdf).
- Corporate/B2B credibility depends on clarity, authenticity, realistic proof, and visible contact paths. See: [NN/g corporate website and About Us research](https://media.nngroup.com/media/reports/free/Presenting_Company_Information_on_Corporate_Websites_3rd_Edition.pdf).
- Accessibility is part of polish: focus visibility, target size, predictable help, and keyboard-safe sticky UI matter. See: [W3C WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).
- Performance is brand proof. LCP should stay at or under 2.5 seconds for most users, and INP requires attention to main-thread work and DOM size. See: [web.dev LCP](https://web.dev/articles/lcp) and [web.dev INP optimization](https://web.dev/articles/optimize-inp).
- Color systems need contrast, restrained accents, and accessible gradient checks. See: [IBM Design Language color guidance](https://www.ibm.com/design/language/color/).
- Where ecommerce or digital proof is shown, review steps, known costs, clear redirects, preserved input, and specific error recovery build trust. See: [Baymard checkout UX guidance](https://baymard.com/learn/checkout-flow-ux-optimization).

## What Was Wrong Locally

- Brand drift: the old business name appeared across config, routes, docs, tests, SEO titles, schema, and generated search content.
- Visual drift: `global.css` contains several generations of styles, including glow-heavy utilities, a restraint reset, premium utilities, and route-specific workbench styles.
- Generic AI smell: many sections use repeated card grids, abstract proof language, and muted dark surfaces without enough page-specific visual choreography.
- Claims risk: "CHICAGOS #1 MSP" is memorable, but any "#1" claim should eventually be backed by evidence or adjusted where legal/credibility review requires it.
- Homepage first viewport: the previous hero led with managed IT copy but did not clearly express the decision system: pressure, owner, evidence, next action.

## North Star

Make the site feel like a calm but high-stakes operations room:

- First screen: pressure point, proof, and next action.
- Services: diagnostic board before catalog.
- Pricing: scope drivers before numbers.
- Proof lab: interactive states tied to business decisions, not novelty.
- Trust center: restore proof, incident routing, security baseline, and vendor coordination.
- Blog/news/photos/gallery: support the buying journey, not side quests.

## Design System Direction

- Use a deeper ink base with high-contrast warm text, teal for operational clarity, and gold for executive decision energy.
- Reduce gray-on-gray panels by using clearer borders, subtle material lighting, and stronger content hierarchy.
- Keep cards at 8px radius and avoid card-in-card compositions.
- Use fewer repeated section patterns per page; each core page needs one distinctive interaction or visual grammar.
- Remove old neon lime remnants unless they serve a specific status or data role.

## Immediate Pass Completed

- Rebranded active text/code/docs/tests from the old name to `CHICAGOS #1 MSP`.
- Replaced stale `OC` marks with `#1` and updated PWA short name to `MSP`.
- Renamed internal storage/event/download identifiers away from the old brand.
- Renamed old brand-specific research fields to `proofRule` and `siteApplication`.
- Strengthened default color tokens and shared panel surfaces to reduce the flat prison-cell effect.
- Rewrote the homepage hero to lead with ownership, evidence, and next action.

## Next Redesign Moves

1. Split `global.css` into foundations, components, utilities, route surfaces, and legacy compatibility.
2. Build a real homepage "operations room" visual: owner map, evidence rail, pressure selector, and proof timeline.
3. Replace repeated card grids with page-specific layouts: service diagnostic, pricing approval brief, trust posture map, proof lab review board.
4. Add verified proof assets: certifications, review counts, partner status, anonymized outcomes, restore-test examples, screenshots, and onboarding deliverables.
5. Audit all raw hex/neon remnants and consolidate colors into semantic tokens.
6. Add focused Playwright visual smoke checks for desktop and mobile first viewports.
7. Run Lighthouse or equivalent route budgets after the visual system settles.
