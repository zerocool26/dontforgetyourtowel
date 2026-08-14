# Editorial design system

The homepage is the visual source of truth for every public route. The system
uses a white canvas, near-black typography, electric-blue emphasis, fine rules,
square actions, open ledgers, and real Chicago photography. It should feel
direct, architectural, and accountable—not like a card-based SaaS template.

## Source of truth

- Semantic color and type tokens live at the top of `src/styles/global.css`.
- `MarketingLayout.astro` applies `editorial-site` and `editorial-page` by
  default, so every public page inherits the system automatically.
- Legacy token names such as `--paper` and `--copper` are compatibility aliases
  to the semantic tokens. New work should use `--color-*` tokens.
- Internal links must continue to use `withBasePath()`.

## Shared primitives

### `PageHero.astro`

Use for standard marketing, location, contact, resource, and compact legal
heroes. Keep one direct title, an optional serif-blue `accent`, concise copy,
one primary action, and at most one secondary action. Use the named `aside`
slot only for real buyer context or contact information. Add `mediaKey` for
major buyer routes; the component owns the responsive architectural crop,
caption, loading priority, overlap, and mobile composition.

### `EditorialBand.astro`

Use for repeated four-stage processes, ownership standards, operating records,
and other numbered sequences. Supply structured `items` with `number`, `title`,
and optional `copy`; do not duplicate the band markup in a route.

### `MediaInterlude.astro`

Use when a process or ownership sequence needs a major photographic chapter.
It combines an editorial heading, optional four-step rail, a full-width angled
image aperture, and a caption rail. Keep it to one instance per long route so
photography creates rhythm instead of visual noise.

When the next section needs a stronger chapter break, use the shared
`.section--ink` variant. It owns the inverse text and ruled-list treatment; do
not restyle each child for dark mode inside the route.

### `CtaBand.astro`

Use as the closing action on public marketing routes. Its Chicago photograph,
responsive image generation, type treatment, and action layout are shared so a
single update propagates to every route. It also accepts the same optional
`mediaKey` as the hero and media chapter when a route needs a different close.

### `src/data/visuals.ts`

All shared Chicago imagery, alternative text, crop positions, and captions
live in the visual catalog. Routes select a semantic `mediaKey`; they should not
import shared photographs or repeat alt text directly. Update the catalog to
propagate a crop, caption, or asset change across every matching page.

### Existing structured patterns

Use `.section-heading`, `.route-index__rows`, `.boundary-list`, `.faq-list`, and
the service/trust ledgers for open, ruled content. Do not wrap them in cards or
add decorative pills.

## Typography

- Display and UI: Manrope.
- Body: Inter.
- Editorial emphasis: Georgia / Times fallback, used sparingly through `em`.
- Headings use tight tracking and compact line-height; body copy stays readable
  at roughly 1.6–1.75 line-height.

## Responsive rules

- Major actions remain at least 48px tall.
- Desktop image heroes collapse into a stepped text → image → aside composition
  below 900px.
- Four-column bands become two columns, then one column below 520px.
- Mobile heroes retain one primary and one secondary action with calm spacing.
- Photographic chapters keep a stable crop and convert the four-step rail to a
  single ruled list below 520px.
- Motion must respect `prefers-reduced-motion`.

## Adding or changing a route

1. Start with `MarketingLayout`.
2. Use `PageHero` unless the route is the homepage or a long-form article.
3. Pull repeated content from `src/data/site.ts`.
4. Use shared ledgers, `EditorialBand`, or one `MediaInterlude` before creating
   route-specific CSS.
5. Select photography through `src/data/visuals.ts`.
6. End marketing routes with `CtaBand`.
7. Run `bun run verify:fast` for route work and `bun run deploy-ready` before
   release.
