# Upload Alert Tradie Pro V65 to GitHub Pages

## Safe overlay method

Do not delete legacy tool folders. V65 is designed to be copied over the existing repository so old estimating, analysis, builder, finance and project-tool files remain available for later menu work.

1. Open the extracted `GITHUB-PAGES-UPLOAD-V65` folder.
2. Copy everything inside it into the root of `mam0015/AlertConstruction`.
3. Allow replacement of matching frontend files such as `index.html`, `admin/index.html`, `owner/index.html`, `site-supervisor/index.html`, `track/index.html`, `assets/*`, `sw.js` and `force-update.html`.
4. Do not delete unrelated legacy tool folders already in the repository.
5. Commit and push the changed files.
6. Keep GitHub Pages set to `main` and `/(root)`.
7. After deployment, open `/force-update.html` once, then hard-refresh the homepage.

## Demo links

- `/admin/` — open Project workflow from the left navigation.
- `/site-supervisor/` — open Site Visit workflow.
- `/owner/` — open Project workflow for audit feed and final publication.
- `/track/?code=ATP-2026-00198` — customer view.

GitHub Pages stores this interactive demo in the current browser only. Real multi-user data, private photos, secure role sessions and cross-device synchronization require the Full-Stack source and private database/storage deployment.
