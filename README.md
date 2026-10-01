# Alert Tradie Pro

Secure construction request, project delivery and role-based operations portal for Owner, Admin, Site Supervisor, Manager and field Workers.

## Production status

This repository contains the working full-stack application used by the hosted Alert Tradie Pro site. It includes the public website, customer request and tracking portal, unified Owner/Team sign-in, Owner approval and role assignment, Admin/Supervisor/Worker workspaces, D1 records and private R2 files.

No real credential, Team Code, session secret or customer record belongs in GitHub. Production secrets are configured in the host environment only.

## Production source

- `app/` — production Vinext/Cloudflare full-stack application
- `db/` and `drizzle/` — D1 schema and protected data access
- `release/wordpress/` — WordPress secure portal bridge
- `release-docs/` — Persian installation, environment and security guides
- `scripts/security-setup.mjs` — local password-hash and session-secret generator
- `tests/` — release, access-control and workflow checks

The production delivery ZIP intentionally excludes all demonstration/preview folders, generated output, secrets and local dependencies.

## Local verification

Requires Node.js 22.13 or newer.

```bash
npm ci
npm test
```

For local interface development, run `npm run dev`. The production application uses Cloudflare Workers-compatible hosting, D1 and R2. GitHub stores the complete source; GitHub Pages cannot run this private full-stack application.

## Sign-in behavior

- Owner and Team use one form.
- Owner enters the configured email and password and leaves Team Code blank.
- A new Team member enters email, password and Team Code once, then waits for Owner approval and role assignment.
- Approved Team members return with email and password only. Owner can change their role later.
- Customers can open a project with the private 128-bit request reference issued after a successful request.
- If the reference is lost, the customer enters the exact email or Australian phone number saved with the original request. A single match opens directly; multiple matches are shown as customer-visible project cards. No email or SMS is sent and no delivery-provider key is required.

## Hosting and Supabase

Uploading this repository to GitHub is suitable for source control and deployment automation.

The working backend is Cloudflare D1/R2, not Supabase. Supabase cannot run this package by simply uploading the files. A Supabase migration requires PostgreSQL migrations, Row Level Security policies, Storage policies and replacement server adapters for the current D1/R2 modules; the web application still needs a compatible server host. See `release-docs/PRODUCTION-READINESS-2026-08-21.md` for the exact handoff.

## Secret setup

Run this only in a private local terminal:

```bash
node scripts/security-setup.mjs
```

Copy generated values directly to the hosting secret manager. Never commit generated passwords, hashes, TOTP secrets, session secrets, `.env` files or customer data.

Start with `START-HERE-PRODUCTION.md`, then review `release-docs/SECURITY-RELEASE-CHECKLIST-FA.md` before launch.
For the recommended WordPress/domain setup, follow `release-docs/WORDPRESS-AND-LIVE-DEPLOYMENT-STEP-BY-STEP-FA.md`.
