# Alert Tradie Pro — complete production package

This is the complete full-stack application source, not a demo. Extract the ZIP and upload the contents of this folder to the root of a GitHub repository.

## Required runtime

- Node.js 22.13 or newer
- Cloudflare Workers-compatible deployment
- D1 database binding named `DB`
- Private R2 bucket binding named `BUCKET`
- Environment secrets copied from `release-docs/ENVIRONMENT-TEMPLATE.txt`

GitHub is the source repository. GitHub Pages alone cannot run the server routes, D1 database, R2 files or authenticated portals.

## Verify before deployment

```bash
npm ci
npm test
npm run lint
```

`npm test` performs the production Worker build and all authentication, workflow, permission, upload and rendered-output contract tests.

## Sign-in rules

- Owner and Team use the same form.
- The single configured Owner account enters email and password only.
- A new Team member enters email, password and Team Code once, then waits for Owner approval.
- An approved Team member returns with email and password; the saved role controls the workspace.
- Customer project code opens the portal immediately.
- Exact email or phone lookup opens the saved project directly. It sends no email or SMS and needs no Resend/Twilio configuration. If the same contact owns several projects, the customer chooses from the matching project cards.

## Production data

The package contains no live passwords, Team Code, customer database, uploads or invented business figures. Owner summary cards and Finance charts calculate only from records stored in D1. Add real projects and finance entries through the authenticated Owner interface.

## Secrets

Never commit `.env` files or plaintext credentials. Generate supported PBKDF2 hashes and session secrets with:

```bash
node scripts/security-setup.mjs
```

Store generated values in the hosting secret manager. The Owner password is intentionally absent from the GitHub source.

## WordPress destination

Do not upload this TypeScript ZIP into the WordPress plugin/theme uploader: WordPress cannot execute the Worker, D1 and R2 modules. The recommended production arrangement is WordPress on the main domain and this full-stack portal on a branded subdomain such as `app.alertconstruction.com.au`, linked from the WordPress menu. See `release-docs/WORDPRESS-AND-LIVE-DEPLOYMENT-STEP-BY-STEP-FA.md`.
