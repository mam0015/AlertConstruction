# Alert Tradie Pro V64 — exact GitHub Pages upload

## Why the website did not change

The repository contained two different website formats at the same time:

1. GitHub Pages kept publishing the old root `index.html` from V52/V60.
2. The new Homepage, Owner and Admin pages were placed in `app/*.tsx` as a full-stack application.

GitHub Pages does not build or run those `app/*.tsx` files, server API routes, authentication code or databases. It simply served the old `index.html`. The earlier service worker could also keep a previously cached page open after a successful upload.

V64 fixes this by providing a real, pre-built GitHub Pages website with `index.html`, compiled CSS/JavaScript and every new route in the correct folder.

## Use the correct folder

After extracting the master ZIP, open:

`GITHUB-PAGES-UPLOAD`

Upload the **contents inside that folder** to the repository root. Do not upload the master ZIP. Do not upload the folder itself as another nested folder. Do not use `FULL-STACK-SOURCE` as the GitHub Pages root.

The repository root must contain:

- `index.html`
- `.nojekyll`
- `sw.js`
- `manifest.webmanifest`
- `assets/`
- `images/`
- `owner/`
- `admin/`
- `site-supervisor/`
- `track/`
- all preserved legacy tool folders such as `electrical/`, `plumbing/`, `plan-ai/`, `quote-analysis/`, `builder/`, `projects/`, `invoice/` and the other V60 folders

## Recommended Mac workflow — GitHub Desktop

This avoids GitHub's browser upload limits and prevents another nested-folder mistake.

1. Open GitHub Desktop and clone `mam0015/AlertConstruction`.
2. Choose **Repository → Show in Finder**.
3. In Finder, remove the current visible repository contents. Do not delete the repository folder itself. The `.git` history remains and makes this change recoverable.
4. Copy everything **inside** `GITHUB-PAGES-UPLOAD` into that repository folder.
5. Return to GitHub Desktop. Review the changed files.
6. Use the commit message: `Deploy Alert Tradie Pro V64 integrated GitHub Pages build`.
7. Click **Commit to main**, then **Push origin**.
8. On GitHub, open **Settings → Pages**.
9. Set **Source** to `Deploy from a branch`, branch `main`, folder `/(root)`.
10. Wait for the Pages deployment to finish.
11. Open the one-time update link below. It removes the older service worker and cached V52/V60 files:

`https://mam0015.github.io/AlertConstruction/force-update.html`

12. Then open the Homepage:

`https://mam0015.github.io/AlertConstruction/`

## Pages to verify

- Homepage: `/AlertConstruction/`
- Owner visual demo: `/AlertConstruction/owner/`
- Admin visual demo: `/AlertConstruction/admin/`
- Site Supervisor visual demo: `/AlertConstruction/site-supervisor/`
- Customer portal demo: `/AlertConstruction/customer/?code=ATP-2026-00124`
- Pending staff page: `/AlertConstruction/team/pending/`

## What is preserved

The previous tools were not deleted. They remain in their original folders, including:

- Electrical, Plumbing and Cladding estimators
- Renovation Budget Planner
- Quote Price Analysis
- AI Plan Estimator
- Property Value Guide
- Site and Permit Checklists
- Projects and Schedule
- Invoice Generator
- Company Pricing Catalogue
- Operation Hub / Builder tools
- Finance, Team Management, Photo Timeline, Reports and shared runtime files

They are intentionally not shown in the new public navigation. Their code remains available for future Owner, Admin, Estimator or Site Supervisor menus.

## Important security boundary

GitHub Pages is static hosting. The Owner/Admin pages in `GITHUB-PAGES-UPLOAD` are visual demos with browser-local demo data. GitHub Pages cannot safely verify passwords, protect private Finance data, run Owner approval, store files or operate a database.

No Owner password is stored in the public package. Use `FULL-STACK-SOURCE` for real secure authentication, database storage, staff approval and protected role access.
