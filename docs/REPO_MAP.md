# Repository map

This repository grew by drag-and-drop uploads, so several generations of the app live side by side in the root folder.
This page says what each part is, so nothing gets deleted or edited by mistake.

> `CLAUDE.md` talks about `PUBLIC-WEBSITE/` and `PRIVATE-SUPABASE/`. Those are the names of the folders on the owner's own
> computer. In this GitHub repository their contents sit directly in the root: `PUBLIC-WEBSITE/builder/…` is `builder/…`,
> `PRIVATE-SUPABASE/supabase/migrations/…` is `supabase/migrations/…`.

## What is what

| Part | Folders / files | What it is | Where it runs |
|---|---|---|---|
| **Full-stack app** | `app/` `db/` `drizzle/` `worker/` `build/` `public/` `scripts/` `tests/` `vite.config.ts` `package.json` | Owner, Admin, Manager, Site Supervisor, Worker and Customer portals, D1 database, R2 files | Cloudflare Worker (`release-docs/DEPLOY-GITHUB-TO-CLOUDFLARE-FA.md`) |
| **Jarvis** | `jarvis/` (+ `app/api/owner/jarvis/`) | The Owner's private assistant (reads three sources, suggests next steps, drafts replies sent only on the Owner's click) — see `jarvis/README.md` | Inside the full-stack app, Owner only |
| **GitHub Pages site (source)** | `github-pages-spa/` `github-pages.vite.config.ts` | React preview/front-end that is built for GitHub Pages | built → `dist-github/` |
| **GitHub Pages site (published copy)** | `index.html` `assets/` `images/` `owner/` `admin/` `team/` `site-supervisor/` `track/` `customer/` `worker/` `reset-password/` `manifest.webmanifest` `sw.js` `offline.html` `force-update.html` | The *built output* of the Pages site, uploaded to the root because Pages serves the root | `https://mam0015.github.io/AlertConstruction/` |
| **Older static site (Supabase era)** | `about/` `access-status/` `builder/` `catalogue/` `checklist/` `cladding/` `customer-login/` `customer-portal/` `electrical/` `invoice/` `legal/` `login/` `management/` `permit-checklist/` `plan-ai/` `plumbing/` `project-status/` `projects/` `property-estimate/` `quote-analysis/` `renovation-budget/` `request-a-job/` `request-form/` `request-job/` `sample-plans/` `shared/` `team-login/` `worker-update/` `supabase/` `vendor/` `tools/` `AC_Luxury_Builder_Preview.html` | The original multi-page vanilla HTML/JS site and its Supabase migrations | GitHub Pages (same root) |
| **Docs** | `README.md` `START-HERE-PRODUCTION.md` `DEPLOYMENT-GUIDE.md` `release-docs/` `docs/` | `docs/archive/` holds the old upload guides, changelogs and checksum lists (moved, not deleted) | — |
| **Team rules** | `CLAUDE.md` `MASTER_PROMPT.md` | How the multi-agent work is split | — |

Old release checks, the previous changelog and obsolete guides were moved (not deleted) to `docs/archive/` in October 2026, each with an OBSOLETE banner.
The `examples/` starter sample, unused starter icons and a few scripts nothing referenced were removed (git history keeps them).

## Duplicates removed, and what still waits for the owner's OK

**Done (785 files, October 2026):** every file that was a byte-for-byte copy of something that stays was removed with `git rm`
(they all remain in git history):

* 759 copies of npm packages (`@babel/*`: `traverse/`, `generator/`, `parser/`, `config/`, `validators/`, `helper-*`, hundreds of
  `*.js` / `*.js.map` files that sat in the root, plus `@alloc/quick-lru/`). `npm ci` installs the real ones.
* 26 images in the old root `client/` folder that are identical to the copies in `images/` and `public/images/`.

**Also removed, with the owner's OK (October 2026):** the other 77 files of the old root `client/` and `server/` build output, 8 old hashed bundles in `assets/`,
`tsconfig.tsbuildinfo`, and the tracked `dist/` (every build recreates `dist/`; it is simply no longer committed).

**Copies that look like duplicates but are not:** `images/`, `public/images/` and `github-pages-spa/public/images/` hold the same pictures
because three different things publish them (the Pages site in the root, the Cloudflare app, and the Pages source). Likewise
`force-update.html`, `manifest.webmanifest`, and `.github/workflows/deploy.yml` / `docs/deploy-workflow.yml`. Removing any of them would break one of the three.

The root `LICENSE` is Babel's licence text, not yours; it was left alone.

## Known traps

* **`npm run dev` shows the wrong pages.** In the dev server, any `*.html` in the repo root (the Pages copy above) is served
  before the app's own routes, so `/`, `/owner`, `/admin`… load the Pages shell. Use `npm run preview:local` instead
  (see `docs/UPDATE-ON-MY-COMPUTER.md`). The permanent fix is to move the Pages copy out of the root (for example into `docs/`
  and switch Settings → Pages to the `/docs` folder) — a change to make together with the Pages setting, so it was not done blindly.
* **Hidden folders are dropped by browser uploads.** `.openai/`, `.github/` and `.nojekyll` never arrive when files are dragged onto
  GitHub's upload page. The build no longer depends on `.openai/hosting.json` (it falls back to the standard `DB` / `BUCKET`
  bindings). The deploy workflow (`.github/workflows/deploy.yml`) is now in the
  repository, with an identical visible copy at `docs/deploy-workflow.yml` to paste through GitHub's "Add file → Create new file" screen
  if the hidden folder is dropped again (`tests/release-files.test.mjs` fails if the two copies differ). Full steps: `docs/GO-LIVE.md`.
* **`npm run lint` checks the app** (`app/ db/ jarvis/ tests/ scripts/ worker/`); `npm run verify` = lint + `npm run typecheck` + build + all tests. The minified vendor libraries, the published Pages bundle,
  the Supabase edge function and the older static-site scripts are not linted — they produced thousands of irrelevant warnings.
* **Shell scripts lose their "executable" flag on upload.** The build scripts now call each other through `bash`, so this no longer breaks `npm run build`.
* **`drizzle/` has two `0003_*` and two `0004_*` migrations.** Left untouched on purpose — database history is not tidied without a backup.

## Kept on purpose although it does not work with the new app

The owner chose to leave these alone for now (nothing in them was changed):

* **The older Supabase-era static site** — `builder/`, `management/`, `customer-portal/`, `request-job/`, `request-a-job/`, `request-form/`, `customer/`,
  `customer-login/`, `login/`, `team-login/`, `shared/`, `supabase/`, `vendor/` … They load, but they need a Supabase project and server functions that are
  not in this repository, and nothing in the live app links to them.
* **The GitHub Pages copy and its demo pages** — `team/`, `reset-password/`, `worker/`, `site-supervisor/`, `project-status/`, `worker-update/` and the
  published `index.html`/`assets/`. They show demonstration dashboards without sign-in; they cannot reach the real app's data. Do not publish
  real information through them. (Turning GitHub Pages off in the repository settings is the simplest way to stop showing them.)
* `release/wordpress/` (the WordPress bridge): two of its buttons point at pages the app does not have.
* `drizzle/` has two `0003_*` and two `0004_*` files and the deploy never applies it (tables are created by the app); left untouched on purpose.
* `LICENSE` is Babel's licence text, not the company's.
