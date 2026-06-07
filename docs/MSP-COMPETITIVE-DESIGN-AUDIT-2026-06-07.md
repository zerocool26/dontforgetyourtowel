# MSP Competitive Design Audit - 2026-06-07

## Competitive Read

Reviewed current Chicago MSP positioning and page patterns from Datastrive, LeadingIT, SafePoint IT, CTI Technology, Onward Technologies, and Genuity IT.

Common winning patterns:

- Clear local fit above the fold: Chicago, Chicagoland, onsite or local team.
- Direct CTA: free assessment, book a call, talk to a local expert, or get started.
- Simple proof: review counts, response targets, guarantees, awards, partner badges, years in market.
- Simple offer language: flat-rate support, unlimited support, fixed-price proposal, cybersecurity bundled in, Microsoft 365/cloud/backup.
- Simple process: schedule call, review environment, receive plan or proposal.

Common weaknesses:

- Many competitors still use long service grids and generic IT stock language.
- Proof is often present but not always tied to what the buyer should do next.
- Several pages are text-heavy after the first two sections.

## Local Diagnosis

The project had enough content, but the homepage felt like an internal operating memo:

- 11 homepage sections and about 12,000 rendered text characters.
- Three competing hero CTAs on mobile.
- Too many repeated cards and route choices before emotional relief.
- Header had search, but no visible desktop contact action.
- "Solutions" was less direct than "Services" for an MSP buyer.
- The previous 3D-style hero added atmosphere, but not a clear support story.

## Changes Made

- Rebuilt `src/pages/index.astro` as a tighter conversion page with 7 sections.
- Replaced the abstract hero with a concrete "support ownership board" visual canvas.
- Changed the hero around one primary action: `Start fit check`.
- Kept `See pricing` as the secondary action and moved `View services` into a quieter text-link role.
- Reduced rendered homepage text from about 12,082 characters to about 6,401.
- Preserved key buyer hooks: service lanes, operating standard, decision handoff, trust path, and canvas smoke test.
- Renamed public nav from `Solutions` to `Services`.
- Added a desktop header CTA: `Start fit check`.
- Updated focused Playwright tests to match the new buyer language.

## Verification Notes

- `bun run typecheck`: passed.
- `bun run build`: passed.
- Static `dist/` Playwright check: no asset failures, no horizontal overflow, canvas nonblank on desktop and mobile.
- Desktop and mobile first viewport now show the next section beginning, so the hero does not feel like a dead-end wall.

## Next Expert Moves

1. Add real proof assets: Google review count, client quotes, partner badges, certification badges, sample restore-test proof, and anonymized outcomes.
2. Simplify `services`, `pricing`, and `contact-hq` with the same discipline: fewer jump chips, fewer cards, stronger first action.
3. Split `src/styles/global.css` into foundations, components, route surfaces, and legacy utilities.
4. Replace vague claims with verifiable statements where possible, especially around the `#1` positioning.
5. Add route-level screenshot checks for home, services, pricing, trust center, and contact.
