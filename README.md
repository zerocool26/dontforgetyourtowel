# dontforgetyourtowel

Astro + Tailwind static site intended for GitHub Pages.

- Live: https://tariqdude.github.io/dontforgetyourtowel/
- Repo: https://github.com/tariqdude/dontforgetyourtowel

The deployment config in `config/deployment.js` auto-derives `site` + `base` from the repo slug (so renames/forks keep working).

## Local setup

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm run typecheck
npm run lint
npm run test
npm run test:e2e
```

## Environment variables

Copy `.env.example` to `.env` as needed.

- `SITE_URL` (optional): canonical site URL
- `BASE_PATH` (optional): force a subpath; otherwise derived from `SITE_URL` or repo name
- `PUBLIC_ENABLE_ANALYTICS` (optional): `true` to enable analytics
- `PUBLIC_CONTACT_EMAIL` (optional): used for the static `mailto:` contact flow (defaults to `hello@example.com`)

## Notes

- This project outputs static HTML. The “contact form” triggers a `mailto:` link (no server-side form handling).
- For GitHub Pages project sites, your base path is typically `/${repo}/`.
- The high-intensity animation playground lives at `/demo-lab/` (isolated from core pages).

## Deployment (GitHub Pages)

This repo is designed for GitHub Pages **project** sites (base path like `/${repo}/`).

Before deploying, run the repo’s full quality gate:

- `npm run pre-deploy`

Local verification:

- `npm run build`
- `npm run preview`

Base path + canonical URL handling:

- `config/deployment.js` derives `site` + `base` automatically.
- Optional overrides via environment variables:
  - `SITE_URL`
  - `BASE_PATH`
