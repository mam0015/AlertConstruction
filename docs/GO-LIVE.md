# Put Alert Tradie Pro on the internet so the company can use it today

Persian version: [`GO-LIVE-FA.md`](GO-LIVE-FA.md).

## What you are setting up

| Piece | What it is | Where your information lives |
|---|---|---|
| The app | One Cloudflare **Worker** (website, Owner / Team / Customer pages, API, Jarvis) | Nothing is stored in the Worker itself |
| Database | Cloudflare **D1** (SQL) — requests, projects, finance, reports, messages, staff, Jarvis's send log | Cloudflare, in your account |
| Files | Cloudflare **R2** (private bucket) — uploaded photos and documents | Cloudflare, in your account |
| Your code | **GitHub** | Source only — never passwords or customer data |

There is no server to look after: no Linux machine, no patching, no database to install. Everything the company enters is saved
in D1 and R2 in **your** Cloudflare account. The database tables are created automatically the first time the app needs them.

You cannot run this on GitHub Pages (that only shows static pages) and it does not run on Supabase as it stands.

> **Plan:** start on the free Cloudflare plan to try it. For the company's real use choose **Workers Paid (about US$5 per month)**.
> The free plan limits how much work one request may do (CPU time and the number of outgoing requests). Sign-in uses strong
> password hashing and Jarvis talks to Google, so a busy day can hit those limits. If you ever see "Error 1102" or "Too many
> subrequests", upgrade the plan; nothing else needs to change.

## Before you start

* A **GitHub** account with this repository, and a **Cloudflare** account (<https://dash.cloudflare.com>).
* On your computer: **Node.js 22.13 or newer** (<https://nodejs.org>).
* About 30 minutes.

## Step 1 — Check the project on your computer (5 minutes)

```bash
npm ci
npm run verify      # lint + type check + build + all tests; the last lines must say "# fail 0"
```

If this does not finish cleanly, stop and fix that first. `npm run preview:local` runs the real app on your computer
(see `docs/UPDATE-ON-MY-COMPUTER.md`).

## Step 2 — Cloudflare account

1. Sign up / log in at <https://dash.cloudflare.com>.
2. Left menu → **R2 Object Storage** → press **Get started / Enable R2** once (it may ask for a card; the free allowance covers a small company).
3. Left menu → **Workers & Pages**: copy your **Account ID** (right-hand side).
4. Top-right profile → **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"** template, and add two permissions:
   `Account · D1 · Edit` and `Account · Workers R2 Storage · Edit`. Create the token and copy it (shown once).

## Step 3 — Create the company's private settings (on your computer)

```bash
node scripts/security-setup.mjs
```

Choose `all`. It asks for the Owner's email, name and a password (at least 10 characters, typed invisibly) and prints
lines like `OWNER_EMAIL=…`. **Only you know that password; it is stored as a one-way hash.** Keep the output in a password manager.

## Step 4 — Give GitHub the settings

Repository → **Settings → Secrets and variables → Actions → New repository secret**. One secret per line (Name = before `=`, Value = after).

**Required (the deploy refuses to run without them):**

| Name | Where it comes from |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | Step 2 |
| `OWNER_EMAIL` | Step 3 |
| `OWNER_PASSWORD_HASH` | Step 3 |
| `OWNER_SESSION_SECRET` | Step 3 |
| `CUSTOMER_CONTACT_HASH_SECRET` | Step 3 |

**Recommended:** `OWNER_DISPLAY_NAME`, `TEAM_SESSION_SECRET` (both printed in Step 3).

**Optional:**

| Name | Purpose |
|---|---|
| `TEAM_CODE`, `TEAM_CODE_HASH` | Pick your own Team Code (`node scripts/security-setup.mjs`, choose `team`). Without them one is generated on first start and shown in **Owner → Settings**. |
| `RESEND_API_KEY`, `TEAM_NOTIFICATION_EMAIL_FROM` | Email the Owner when someone asks for access |
| `JARVIS_GMAIL_CLIENT_ID`, `JARVIS_GMAIL_CLIENT_SECRET`, `JARVIS_GMAIL_ACCOUNTS` | Let Jarvis read (and, if you allow it, reply from) company email — see Step 7 |
| `JARVIS_ANTHROPIC_API_KEY` | Jarvis "Smart mode" (answers in plain language, writes replies) — see Step 7 |
| `JARVIS_OPENJARVIS_URL`, `JARVIS_OPENJARVIS_API_KEY`, `JARVIS_OPENJARVIS_MODEL` (and `…_ACCESS_ID`, `…_ACCESS_SECRET`) | "Jarvis 2": your own OpenJarvis server as Jarvis's brain — see `JARVIS2-OPENJARVIS.md` |
| `JARVIS_AI_MODEL`, `JARVIS_AI`, `JARVIS_AI_FALLBACKS`, `JARVIS_COMPANY_NAME` | Fine tuning; leave out unless you need them |

## Step 5 — Make sure the deploy file is in the repository

The automatic deploy is the file **`.github/workflows/deploy.yml`**. Folders that start with a dot are often skipped by
drag-and-drop uploads, so check on GitHub that the file exists. If not: **Add file → Create new file**, type the name
`.github/workflows/deploy.yml`, and paste the contents of `docs/deploy-workflow.yml` (an identical, visible copy).

Then bring this work onto the `main` branch (the deploy runs when `main` changes): open a pull request from
`claude/quirky-archimedes-j36ll5` into `main` on GitHub and merge it.

## Step 6 — Deploy

Repository → **Actions → "Deploy Alert Tradie Pro" → Run workflow** (it also runs by itself whenever `main` changes).
It installs, builds, **runs every test (nothing is deployed if one fails)**, creates the database and the private file bucket
the first time, deploys, and stores your settings as Worker secrets. After 3–5 minutes the log ends with
`Live at https://alert-tradie-pro.<your-name>.workers.dev`.

Prefer to deploy from your own computer without GitHub Actions? Set the same names as environment variables, then:

```bash
npm test && node scripts/deploy-cloudflare.mjs
```

### First-day checklist

1. Open the address → **Team Sign In** → sign in with the **Owner** email and password (leave Team Code empty).
2. **Owner → Settings:** read the company **Team Code**. Give it to staff privately.
3. Each staff member opens the address, chooses Team Sign In, enters email + password + Team Code once.
   You approve them and choose their position in **Owner → Access requests**.
4. Send a test request from the public request form, follow it through Admin → Site Supervisor → Estimator → customer, then use real data.
5. Open **Owner → Jarvis**: employee updates and client comments appear; email shows "not connected" until Step 7.
6. Do your first backup (below) and put a reminder in your calendar to repeat it.
7. Add your own domain (below) and tell staff the new address.

### Your own domain, e.g. `app.alertconstruction.com.au`

Add the domain to Cloudflare (**Websites → Add a site**, then change the name servers at your registrar), then
**Workers & Pages → alert-tradie-pro → Settings → Domains & Routes → Add → Custom domain**. HTTPS is automatic.

## Step 7 — Turn on Jarvis (optional, can be done later)

Full instructions: [`jarvis/README.md`](../jarvis/README.md). In short:

1. **Email:** create a Google Cloud OAuth client (Desktop app), then for each mailbox run
   `JARVIS_GMAIL_CLIENT_ID=… JARVIS_GMAIL_CLIENT_SECRET=… node jarvis/scripts/gmail-authorize.mjs info@yourcompany.com.au --allow-replies`
   (leave off `--allow-replies` for a mailbox Jarvis may only read). Save the client ID, the client secret and the mailbox list it prints as the GitHub secrets
   `JARVIS_GMAIL_CLIENT_ID`, `JARVIS_GMAIL_CLIENT_SECRET` and `JARVIS_GMAIL_ACCOUNTS`.
2. **Smart mode:** create a key at <https://console.anthropic.com> (set a monthly spend limit there) and save it as the GitHub
   secret `JARVIS_ANTHROPIC_API_KEY`. Without it Jarvis still works in Simple mode and nothing leaves your system.
3. **Optional — Jarvis 2:** instead of (or next to) Anthropic's cloud AI you can run the open-source [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) on your own
   computer or server and choose it in **Owner → Jarvis**. Setup: [`JARVIS2-OPENJARVIS.md`](JARVIS2-OPENJARVIS.md). Secrets: `JARVIS_OPENJARVIS_URL`, `JARVIS_OPENJARVIS_API_KEY`, `JARVIS_OPENJARVIS_MODEL`.
4. Run the deploy again (**Actions → Run workflow**) so the new secrets reach the Worker. Open **Owner → Jarvis** to check.

Jarvis only works inside the Owner area and only for the signed-in Owner. It can read the whole app (never passwords or keys), tells you the news only when you ask,
and does nothing — sends an email, messages someone, adds a calendar entry — until you press its button. Either brain (Jarvis 1 or Jarvis 2) can do all of it.

## If the Owner forgets the password

Run `node scripts/security-setup.mjs` (choose `owner`), put the new `OWNER_PASSWORD_HASH` (and, if the address changes, `OWNER_EMAIL`) into the
GitHub secrets, then **Actions → Run workflow**. After the deploy the new password works and the old one stops; everyone is signed out.
(A password changed inside the app, in **Owner → Settings**, is kept for as long as these secrets stay the same.)
A staff member who forgot their password: **Owner → Access requests → Reset access**, then they join again with the Team Code.

## Backups and recovery

Your data lives only in Cloudflare, so back it up.

* **Database, any time** (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your terminal, or `npx wrangler login`):
  ```bash
  npx wrangler d1 export alert-tradie-pro-db --remote --output=backup-$(date +%F).sql
  ```
  Do this weekly (daily is better). The file contains customer details: keep it somewhere private, **never** in GitHub.
* **Short-term undo:** D1 keeps a recent history you can rewind to: `npx wrangler d1 time-travel info alert-tradie-pro-db`
  (how far back depends on your plan).
* **Files:** the R2 bucket `alert-tradie-pro-files` can be copied with Cloudflare's **R2 → Manage API tokens** plus a tool such as `rclone`.
* **Bad update?** Fix forward by reverting the change on `main` (it redeploys by itself), or in Cloudflare
  **Workers & Pages → alert-tradie-pro → Deployments → Rollback**.

## Updating later

Change the code (or ask Claude to), merge to `main`, and the same workflow tests and publishes it. Your data and settings
are untouched. New secrets: add them in GitHub, then **Run workflow** once.

## If something goes wrong

| What you see | What it means |
|---|---|
| Deploy says "Missing GitHub secrets" | A required secret in Step 4 is missing or has a typo in its name |
| Deploy fails at "Build and test" | A check failed; nothing was deployed. Open the log, fix, push again |
| "Sign-in is not fully set up on the server" | `OWNER_EMAIL`, `OWNER_PASSWORD_HASH` or `OWNER_SESSION_SECRET` is missing; add it and run the workflow |
| R2 error during deploy | R2 was not enabled in Step 2 (item 2) |
| "Error 1102" / "Too many subrequests" | Free plan limits; upgrade to Workers Paid |
| Jarvis says a mailbox needs reconnecting | Run `gmail-authorize.mjs` for it again and update `JARVIS_GMAIL_ACCOUNTS` |
| Anything else | Cloudflare → **Workers & Pages → alert-tradie-pro → Logs** shows the exact error |

Before telling staff it is live, run `npm run verify` once more on the exact files you deployed.
