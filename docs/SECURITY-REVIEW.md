# Security review (October 2026)

What was checked, what was found, what was fixed, and what is still worth doing. Everything below was tested on a local copy of the app (the public site was never attacked), plus a read of the code and the build.

## How it was tested
- **Who can reach what:** every API route × every method × every kind of visitor (not signed in, Worker, Manager, Estimator, Site Supervisor, Admin, Owner).
- **Attacks:** forged and tampered sign-in cookies, reuse after sign-out, password guessing in bursts, requests from another website (CSRF), development shortcuts in the production build, 6 MB bodies, SQL tricks in every field, uploads of web pages / SVG / programs / pictures with a script hidden inside, hostile file names, "wrong customer" attempts, other people's chat and project files, files left on the site (source, config, secrets), CORS, odd HTTP methods.
- **Planted code:** script-like text typed into every input (request form, customer messages, chat, tasks, reports, calendar, Owner messages, a staff e-mail address), then every screen opened in a real browser as every role. Nothing ran; it is all shown as plain text.
- **Many people at once:** 100 customers, bursts of guesses, 30 simultaneous approvals, double clicks.
- **Packages:** `npm audit`. **Secrets:** a scan of the whole git history. **Deploy:** the GitHub Actions workflow.

## Found and fixed
| # | Finding | Fix |
|---|---|---|
| 1 | A burst of requests slipped past per-visitor limits (the limit was read, then counted). | One atomic statement takes the slot *before* the work: new requests, the older request form, reference lookups, customer lookups, **sign-in guesses** (15 per address, 8 per address and e-mail, per 15 minutes), customer uploads (60 an hour). |
| 2 | The customer lookup by e-mail/phone accepted a few letters of the address ("stre", "road", "Melbourne") as the second proof, and each customer's e-mail could be guessed at 40 times an hour. | The typed address must contain a real, whole word of the address (street types, directions and city names do not count); 12 guesses an hour and 30 a day per customer. |
| 3 | An empty or cut-off file counted as "a photo" (so a photo-required rule could be satisfied with nothing). | One strict signature check for every upload route (staff photos, team chat, customer files). |
| 4 | A request could hold more than 20 customer files when uploads arrived together. | The limit is part of the saving statement. |
| 5 | The page and its headers showed folders of the build machine (`/home/runner/...`), and the web fonts pointed there so they never loaded. | Removed; the site is drawn exactly as before (the device's sans-serif). |
| 6 | Files served straight from the asset store (scripts, styles, images) had none of the security headers. | `public/_headers` adds them (nosniff, frame, referrer, HSTS), keeping the one-year cache for hashed assets. |
| 7 | Project codes: many approvals at once failed, and approving one request twice made two projects. | Next number chosen and saved in one statement; only the first approval moves a request on. |
| 8 | The older request form made 5-digit tracking references (guessable, could collide). | 12 random letters and digits. |
| 9 | Packages: `next` (critical advisories, mostly for Next's own server, which this app does not run), `zod`, `nanoid`, `source-map-js`, `postcss`. | Updated; `npm audit` for production packages: **0 vulnerabilities**. |

## Checked and fine
Role walls on every route; forged / edited / renamed / signed-out cookies refused; sign-in cookies are HttpOnly + SameSite=Strict (+ Secure on https); wrong password and unknown e-mail look the same; no development shortcut exists in the production build; CSRF refused on every state-changing route; huge bodies handled quickly; SQL tricks stored as plain text; uploaded files are never run as pages (download headers, sandbox policy, nosniff); a hostile file name cannot add a header; private chat pictures open only for the two people; shared plans only for the named workers; no source, config or secret file can be downloaded; no CORS allowance; no secrets in the git history of this branch; the deploy workflow has read-only permissions and no pull-request trigger.

## Still worth doing (not changed)
1. **Content-Security-Policy still allows inline scripts** (`'unsafe-inline'`), because the framework needs them. Safe today (everything is escaped, tested above), but a nonce-based policy would be a second wall.
2. **Customer photo links never expire** (they are signed, and only for published photos).
3. **GitHub and Cloudflare accounts are the real keys:** turn on two-step sign-in for both, protect the `main` branch (anything pushed there is deployed), give the Cloudflare API token only the permissions the deploy needs.
4. **Backups:** export the D1 database on a schedule (Cloudflare's own time-travel is short); R2 has no versions.
5. **A custom domain behind Cloudflare** would allow WAF and rate-limit rules and alerts; the free `workers.dev` address cannot.
6. **Estimators can add site photos to any job they can see** (by design today; tighten if not wanted).
7. Another branch (`claude/nifty-curie-7z2hfa`) holds a large library of security notes that is not part of the site and is not deployed.
