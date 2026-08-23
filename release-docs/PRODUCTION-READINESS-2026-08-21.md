# Alert Tradie Pro — production readiness handoff

Release date: 21 August 2026

## What is working

- One responsive Owner/Team sign-in form with email, password and optional Team Code.
- Owner recognition by the one configured account; Team Code is not required for Owner.
- New staff request access once, wait for Owner approval, keep their assigned role and can later be reassigned.
- Owner Settings manages the Team Code, Owner profile/password and employee roles.
- Customer request creation stores real records, consent, material preference and Other-service details.
- Customer intake uploads store up to five signature-checked JPG, PNG, WebP or PDF files in private object storage.
- Customer tracking uses a non-enumerable 128-bit private request reference and exposes only approved customer information.
- Owner, Admin, Site Supervisor, Manager and Worker access is checked server-side.
- Owner dashboard metrics and finance charts calculate from saved records; production demo records are removed.

## Release blockers found and fixed

1. Production rejected PBKDF2 hashes above 100,000 iterations, causing valid sign-in requests to return HTTP 500 and Safari to display “The string did not match the expected pattern.” Hashing now uses the supported 100,000-iteration format and existing Owner/Team records migrate in place.
2. Login clients assumed every server response was JSON. Customer and Team sign-in now translate unreadable or unavailable responses into clear messages.
3. The customer file selector was visual only: files were discarded before the request reached the server. Selected files now upload to private storage and are registered against the saved request.
4. Material preference and the free-text Other service were collected but not saved. Both now become part of the durable request record.
5. Non-image workflow files could be opened inline. They now download as attachments while approved images can still be viewed inline.
6. The GitHub Pages demonstration exposed a direct Owner preview link and did not show Team Code. The link was removed and the three-field Team form now matches production while clearly refusing real credentials.
7. Customer sign-in was a small generic code box. It is now a full private-project access experience with clear privacy language, client validation and server verification before navigation.

## Verification completed

- Full production build: passed.
- Automated release, security, role, workflow, upload and rendered-worker tests: 32 passed, 0 failed.
- ESLint: passed with no warnings.
- GitHub Pages demonstration build: passed.
- Browser interaction check: public homepage, request controls, Team dialog, invalid Team response, Customer dialog and invalid customer-reference validation passed.
- The cloud test browser blocked its own navigation to the literal `/worker` path with `ERR_BLOCKED_BY_CLIENT`; the production build and Worker access contract tests still passed for that route. This was a browser-environment limitation, not an application build failure.

## Deployment model

### GitHub

The full source package can be committed to a private or public GitHub repository because it contains no live secrets. Keep `.env*`, generated credentials, customer exports and database backups out of Git.

- Use the repository source for the real full-stack deployment.
- Use only the generated `dist-github/` directory for an anonymous GitHub Pages demonstration.
- Never treat GitHub Pages as the Owner/Team production portal; it cannot protect private data or run the server routes.

### Current production backend

- Runtime: Cloudflare Workers-compatible Sites deployment.
- Structured data: D1 binding `DB`.
- Private files: R2 binding `BUCKET`.
- Secrets: host environment values listed in `ENVIRONMENT-TEMPLATE.txt`.

### Supabase

There is no tested Supabase runtime in this release. Uploading this ZIP to Supabase will not run it. A correct Supabase port needs these new files and tests:

1. `supabase/migrations/*.sql` translating every D1 table and index to PostgreSQL.
2. RLS policies for Owner, Admin, Supervisor, Manager, Worker and Customer reference access.
3. Supabase Storage buckets and policies replacing R2 object access.
4. A server adapter replacing every `cloudflare:workers` / D1 prepared-statement call in `db/`.
5. A session/auth decision: preserve the current app-owned sessions or replace them with Supabase Auth without changing the requested Owner/Team approval flow.
6. Integration tests proving no role, URL or API bypass and proving private file isolation.

Until that port is built and tested, use the included Cloudflare production backend. Supabase can be a future migration target, but it is not a drop-in upload destination.

## External launch tasks still requiring the company

- Configure a transactional email provider if Owner must receive staff-request emails. The in-app Owner approval queue works now; outbound email delivery is not configured in this repository.
- Complete independent penetration testing, encrypted backup/restore drills, monitoring/incident alerts and legal review of the Victorian terms before handling sensitive or high-value customer work at scale.
- Add real company records through the authenticated interface; the production database intentionally starts without invented portfolio or finance data.
