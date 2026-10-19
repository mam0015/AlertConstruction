# Jarvis — the Owner's private, read-only assistant

Jarvis lives in this folder and shows up in the Owner app as **Owner → Jarvis** (also in the phone's bottom bar).
It gives the Owner one briefing of what is happening in the company, from exactly **three** sources:

| Source | What Jarvis reads | Where it comes from |
|---|---|---|
| **Company email** | sender, subject and Google's short snippet of each message (no full bodies, no attachments) | the Gmail mailboxes you connect, with Google's read-only permission |
| **Employee updates** | end-of-day reports, worker reports, supervisor updates, site-visit reports, site-issue reports | the app database (`eod_reports`, `worker_reports`, `project_updates`, `site_visit_reports`, `site_issue_reports`) |
| **Client comments** | messages customers send about their request or project | `customer_messages` and the tracking-page messages in `team_messages` |

It flags what needs attention (complaints, urgent words, safety, delays, refunds/disputes, cancellations, legal words,
damage/leaks, open site issues, issues a worker reported), lists who is reporting, which clients commented, and lets the
Owner search with plain keywords ("leak", "refund", a client's name, a project code).

## What Jarvis can never do

* **Write anything.** No sending email, no replying, no deleting, no labelling, no editing records. There is no endpoint for it.
* **See anything else.** Not finance, not passwords or sessions, not staff access requests, not private team chat,
  not admin replies, not customers' email addresses or phone numbers.
* **Work for anyone but the Owner.** Admin, Manager, Supervisor, Worker, Customer and signed-out visitors all get `401`.

## How that is enforced (so it does not rely on good behaviour)

1. **Owner session only** — `app/api/owner/jarvis/route.ts` checks the Owner session cookie. It exports `GET` only;
   `POST/PUT/PATCH/DELETE` return `405`.
2. **One allow-list** — `policy.mjs` names the three sources. Asking for any other source is refused with an error
   (it is never silently ignored).
3. **Guarded database reads** — every query goes through `readonly-db.mjs`: a single `SELECT`, no write/DDL words,
   no `SELECT *`, and only tables on the allow-list. A query touching `finance_entries`, `owner_accounts`,
   `staff_access_requests`, `team_chat` … is rejected before it reaches the database. Queries select named columns only,
   so customer contact details and password hashes are never even fetched.
4. **Read-only email** — `sources/company-email.mjs` only issues `GET …/users/me/messages[/id]`, asks for headers + snippet,
   and the mailbox is connected with Google's `gmail.readonly` scope, which Google itself limits to reading.
5. **Fixed output shape** — `briefing.mjs` turns every row/email into the same small item (title, who, project,
   280-character preview, flags). Extra columns cannot leak into the response.
6. **Audit line** — each briefing logs `{jarvis:"read", owner, scopes, items}` (never the content) to the Worker logs.

`tests/jarvis.test.mjs` proves all of this (including: a signed-in Admin is refused, writes are refused with `405`, the
guard rejects write/finance/`SELECT *` queries, private staff chat and admin replies never appear, and Gmail is only
ever called with `GET`).

## Connect company email (one time per mailbox)

Without this, Jarvis still works for employee updates and client comments and shows **Company email: Not connected**.

1. In [Google Cloud Console](https://console.cloud.google.com) create (or pick) a project → **APIs & Services → Library → Gmail API → Enable**.
2. **OAuth consent screen**: choose **Internal** if the mailboxes are Google Workspace (recommended — tokens do not expire).
   With a plain `@gmail.com` mailbox choose External and **publish** the app (otherwise Google expires the token after 7 days).
   Add only the scope `…/auth/gmail.readonly`.
3. **Credentials → Create credentials → OAuth client ID → Desktop app.** Note the client ID and secret.
4. On your own computer, for **each** mailbox:
   ```bash
   JARVIS_GMAIL_CLIENT_ID=… JARVIS_GMAIL_CLIENT_SECRET=… node jarvis/scripts/gmail-authorize.mjs info@yourcompany.com.au
   ```
   Open the link it prints, sign in as that mailbox, accept the read-only permission. The script prints a JSON entry;
   it refuses to continue if Google granted anything broader than read-only, and it saves nothing to disk.
5. Put the secrets in Cloudflare (Workers → your worker → Settings → Variables and Secrets, or `npx wrangler secret put <NAME>`):
   * `JARVIS_GMAIL_CLIENT_ID`
   * `JARVIS_GMAIL_CLIENT_SECRET`
   * `JARVIS_GMAIL_ACCOUNTS` — a JSON list, one entry per mailbox:
     `[{"label":"info@yourcompany.com.au","refreshToken":"…"},{"label":"accounts@yourcompany.com.au","refreshToken":"…"}]`

Never put these values in GitHub. (`release-docs/ENVIRONMENT-TEMPLATE.txt` lists the names only.)
To disconnect a mailbox, remove its entry — or revoke access at <https://myaccount.google.com/permissions>.

## Good to know

* Jarvis uses plain keyword rules, **not an AI model**, so no company data is sent to any AI service. If you ever want
  AI summaries, that is a separate decision because it would send company emails to an outside service.
* Each source returns at most `limit` rows (default 60, max 200) and each mailbox at most 20 messages per refresh;
  a very busy period can have more than the briefing counts.
* Email is limited to 5 mailboxes and 20 messages per mailbox per refresh to stay inside Cloudflare's per-request limits.
* Adding a new source later means: add it to `JARVIS_SCOPES` in `policy.mjs`, add its tables to `READABLE_TABLES` in
  `readonly-db.mjs`, write a `sources/*.mjs` reader with named columns, and add tests. Nothing is reachable until all four are done.

## Files

```
jarvis/
  policy.mjs                 the allow-list, limits, option validation
  readonly-db.mjs            the SELECT-only guard + reader
  briefing.mjs               items, attention flags, search, headline
  jarvis.mjs                 reads the sources and builds the briefing
  sources/employee-updates.mjs
  sources/client-comments.mjs
  sources/company-email.mjs  Gmail, read-only
  JarvisPanel.tsx + jarvis.module.css   the screen inside the Owner app
  scripts/gmail-authorize.mjs           one-time mailbox connection
```

---

## خلاصه به فارسی

**جارویس** دستیار خصوصی مالک (Owner) است و فقط می‌تواند **بخواند**؛ هیچ‌چیز را نمی‌فرستد، تغییر نمی‌دهد و پاک نمی‌کند.
فقط به این سه چیز دسترسی دارد:

1. **ایمیل‌های شرکت** — فقط با دسترسی «فقط‌خواندنی» گوگل (فرستنده، موضوع و چند کلمهٔ اول؛ نه متن کامل و نه فایل پیوست).
2. **گزارش‌های کارمندان** — گزارش پایان روز، گزارش کارگر، گزارش سرپرست، بازدید سایت و مشکلات سایت.
3. **نظرها و پیام‌های مشتریان** دربارهٔ درخواست یا پروژه‌شان.

به هیچ چیز دیگری (مالی، رمزها، چت خصوصی تیم، ایمیل و تلفن مشتری) دسترسی ندارد، و فقط وقتی با حساب **Owner** وارد شده‌اید کار می‌کند
(Admin، کارمندان، مشتریان و بازدیدکنندگان بدون ورود، خطای ۴۰۱ می‌گیرند). از منوی Owner ← **Jarvis** باز می‌شود (در موبایل در نوار پایین).

**وصل کردن ایمیل شرکت:** مراحل بالا (Gmail API ← OAuth ← اجرای `gmail-authorize.mjs` برای هر ایمیل ← ذخیرهٔ سه secret در Cloudflare).
تا ایمیل وصل نشود، جارویس گزارش کارمندان و نظرات مشتریان را نشان می‌دهد و کنار «Company email» می‌نویسد «Not connected».
