# Alert Tradie Pro deployment guide

## Hosting requirements

Alert Tradie Pro is a full-stack Vinext application for the Cloudflare Worker
runtime. Your host must provide:

- Node.js 22.13 or newer during build
- A Cloudflare D1 binding named `DB`
- A Cloudflare R2 binding named `BUCKET`
- HTTPS in production

Uploading this ZIP directly into WordPress or a basic `public_html` directory
will not run the authentication, database, uploads or tracking features.

## 1. Create credentials

On a trusted computer, open a terminal in the extracted project and run:

```bash
npm run setup:credentials
```

The Owner email defaults to `mamobiniali@gmail.com`. Enter the Owner password,
the Admin email and password, and a private Team Code. Passwords are hidden
while typing. Copy the generated environment-variable block into the
hosting provider's encrypted secrets/settings panel. Do not put it in source
control or upload it as a public file.

The required variables are:

```text
OWNER_EMAIL
OWNER_PASSWORD_HASH
OWNER_SESSION_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
ADMIN_TEAM_CODE_HASH
ADMIN_SESSION_SECRET
```

The Team Code allows a staff member to request access; it does not grant a role.
The initial Admin credentials also create a pending staff request on first use.
The Owner must approve the member and assign their role from `/owner` before the
Admin workspace opens.

## 2. Configure storage

Create and bind:

- D1 database as `DB`
- R2 bucket as `BUCKET`

The app safely creates any missing tables and indexes on first use. SQL migration
files are also included under `drizzle/` for managed migration workflows.

## 3. Build and verify

```bash
npm ci
npm run lint
npm test
```

A successful test run reports five passing tests and creates `dist/`. To build
without rerunning the tests, use `npm run build`.

## 4. Deploy

Use the hosting provider's Cloudflare Worker/Vinext deployment workflow and the
generated `dist/` artifact. Keep the `DB` and `BUCKET` binding names unchanged.

After deployment, verify:

1. Submit a small test request on `/` and keep its tracking code.
2. Open `/track/CODE`, confirm the request appears, and send a test message.
3. Sign in at `/owner` and confirm the request is visible.
4. Register a test staff account at `/admin` using the Team Code.
5. Approve it in `/owner`, assign a role, and confirm its restricted workspace.
6. Remove any test records you no longer need.

## Security checklist

- Use fresh credentials that have never been shared in chat or email.
- Store only the generated hashes and random session secrets on the host.
- Never upload `.dev.vars`, `.env`, private keys, or production database exports.
- Keep HTTPS enabled and rotate credentials after any suspected exposure.
- Back up D1 and define an R2 retention policy appropriate for customer files.
