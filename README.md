# Alert Tradie Pro

Production-ready full-stack website for Alert Tradie Pro. The package includes:

- Public service homepage and persistent quote/request form
- Customer tracking pages, file attachments and messages
- Owner dashboard with finance, staff approvals and role assignment
- Role-restricted staff/Admin workspace
- Server-side sessions, password hashing and login rate limits
- Cloudflare D1 database and R2 file storage support

## Verify the release

Requirements: Node.js 22.13 or newer on Linux.

```bash
npm ci
npm run lint
npm test
```

`npm test` creates the production build and runs the full application-flow test suite.

## Deploy

Read [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) before uploading. This is a
full-stack Cloudflare Worker/Vinext application, not a static HTML or WordPress
theme ZIP. It requires a D1 database, an R2 bucket and the documented secrets.

Generate safe login settings interactively:

```bash
npm run setup:credentials
```

No production password or Team Code is included in this repository.

## Main routes

- `/` — public website and request form
- `/track/REQUEST-CODE` — customer request/project tracking
- `/owner` — Owner operation hub
- `/admin` — staff sign-in and role workspace
- `/team/pending` — approval waiting page

## Useful commands

- `npm run dev` — local development server
- `npm run build` — verified production build
- `npm run start` — run the built application
- `npm run lint` — source linting
- `npm test` — build plus integration tests
- `npm run db:generate` — generate Drizzle migrations
