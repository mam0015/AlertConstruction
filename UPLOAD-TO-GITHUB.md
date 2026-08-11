# Alert Tradie Pro V6 — Upload Guide

This package contains the corrected full website source. The public homepage is unchanged. The internal `/owner` and `/admin` pages use the black, white and gold Operation Hub design.

## Important: upload the contents to the repository root

1. Download and extract the ZIP on your computer.
2. Open the extracted folder.
3. Upload the files and folders inside it directly to the root of your GitHub repository.
4. Do not upload only the ZIP file.
5. Do not put the extracted project inside another folder in the repository.

At the GitHub repository root you should be able to see:

- `package.json`
- `app/operation-hub.css`
- `app/owner/`
- `app/admin/`
- `public/`
- `db/`

If `package.json` is still the previous version or `app/operation-hub.css` is missing, the old website files are still being deployed.

## Deployment

This is a full-stack website with secure sign-in, server routes and database-backed records. GitHub stores the source, but GitHub Pages by itself cannot run the Owner/Admin authentication and database features. Deploy the repository through the same full-stack hosting setup used for the current Alert Tradie Pro site.

After the host finishes the new deployment, open `/owner` and `/admin` and hard-refresh the browser once so an older cached stylesheet is not displayed.

## Security

Do not add real passwords, password hashes or session secrets to GitHub. Keep these values in the hosting environment settings:

- `OWNER_EMAIL`
- `OWNER_PASSWORD_HASH`
- `OWNER_SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_TEAM_CODE_HASH`
- `ADMIN_SESSION_SECRET`

The owner email is configured through `OWNER_EMAIL`. Passwords are verified on the server and are not stored in the public frontend source.
