# 3D Chapter Update (Jan 2026)

This log tracks **chapter-facing** refinements (naming + presentation) alongside the most meaningful technical upgrades.

## 1) Chapter Names (Tasteful, Cohesive)

The gallery/tower chapters now use a unified naming style: short, readable titles with a technical-but-poetic subtheme.

- **00** — Genesis Forge
- **01** — Liquid‑Metal Relic
- **02** — Million Fireflies
- **03** — Quantum Ribbons
- **04** — Aurora Curtains
- **05** — Event Horizon
- **06** — Kaleido Glass
- **07** — Matrix Rain
- **08** — Orbital Mechanics
- **09** — Voronoi Shards
- **10** — Quantum Moiré
- **11** — Neural Constellation
- **12** — The Library
- **13** — Bioluminescent Abyss
- **14** — Neon Metropolis
- **15** — Digital Decay
- **16** — Ethereal Storm
- **17** — Cyber Porsche

## 2) Core System Upgrades (What Actually Moves the Needle)

- **Scene foundation**: `SceneBase` ensures consistent framing across mobile portrait and desktop landscape.
- **Input language**: `ctx.pointer` + `ctx.press` are standardized so each chapter can respond subtly (without becoming a gimmick).
- **Modern output**: Composer-based rendering enables bloom/DOF/AA and a stable global look.

## 3) Recent Visual Upgrades (Highlights)

- **Neon Metropolis (14)**: Procedural city language + dense instancing + animated traffic.
- **Homepage hero**: Now renders **Neural Constellation (11)** as the above-the-fold chapter, with responsive framing + reduced-motion fallbacks.
- **Digital Decay (15)**: High-density voxel world with “controlled collapse” interaction.
- **Ethereal Storm (16)**: Volumetric storm pass verified and restored as a first-class chapter.
- **Cyber Porsche (17)**: High-fidelity hero asset chapter.

## 4) Next Best Ideas (Shippable, Not Noisy)

- **Adaptive quality ladder**: cap DPR, reduce RT sizes, and lower counts on coarse pointer / low-tier GPUs.
- **Reduced motion**: shorten transitions + downshift trails/afterimage; preserve composition.
- **“One hero effect” per chapter**: avoid stacking bloom + DOF + trails simultaneously unless the scene earns it.
- **Tidy teardown**: dispose geometry/materials/textures/RTs on chapter switch and on route unmount.
