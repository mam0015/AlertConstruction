# Jarvis — the Owner's manager and private assistant

Jarvis lives in this folder and appears in the Owner app as **Owner → Jarvis** (also in the phone's bottom bar).

**What it does for you**

* **The news, when you ask.** Ask "what's the news?" and Jarvis tells you what happened, newest first — what workers, supervisors,
  estimators, admin and managers wrote, what clients sent, new requests, task and project changes, money. It never reports on its own.
* **Reads the whole app** (never passwords or keys): company email (once you connect it), reports, client comments, messages to you and
  the team channel, requests and projects, tasks, finance, access requests, and the calendar and schedule.
* **What is coming up** — the next 21 days of calendar entries and schedule events, soonest first.
* **Suggested next steps** for every item and topic. Fixed rules, so they are there even without AI.
* **Tell Jarvis what to do** in your own words (English, Persian, anything): reply to an email, message a person in the app,
  put something in a calendar, give someone a task, or just ask. Jarvis **obeys**: if it thinks another way would be better it says so
  once, in one line, and then does what you said.
* **Writing is proofread three times** (spelling, then grammar and punctuation, then a final read-through) before an email or message goes out.
  Only corrections are made — numbers, dates, links and "not" are never changed.
* **Two brains, you choose:** **Jarvis 1** (Claude, in Anthropic's cloud) or **Jarvis 2** ([OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
  running on your own computer or server). Either one can do everything above, because only the brain differs.

## The rules Jarvis cannot break

1. **It obeys only you.** Its instructions come only from the text *you* type in the Owner app. Everything written by
   customers, employees or strangers — emails, comments, reports, messages, calendar notes — is treated as data, never as a command.
2. **It never reads secrets:** passwords and their hashes, sign-in sessions, Team Codes, PINs, API keys, the Owner account. Customers'
   phone numbers and email addresses are not selected, and are removed from anything sent to an AI.
3. **Nothing happens until you press the button.** An email goes out only when you press **Proofread 3× & send**, **only back to the person
   who wrote the original email**. A message, calendar entry or task is only *prepared*; it happens when you press its button, once.
4. **It never deletes anything.** It cannot change finance, projects or staff access.
5. **Only the Owner can open it.** Admin, Manager, Supervisor, Worker, Customer and signed-out visitors get `401`.

## How those rules are enforced (so they don't depend on good behaviour)

| Rule | Enforced by |
|---|---|
| Owner only | every route checks the Owner session cookie (`jarvis/server.ts`); changes also need a same-origin request (CSRF guard) |
| Obeys only you | `ai.mjs`: the only instruction block is `<owner_instruction>`; everything else is escaped data; the brain has **no tools** and can only return text |
| Never secrets | `policy.mjs` source list; `readonly-db.mjs` allow-list of tables and a refusal of any query that mentions a password, hash, token, session, PIN or key; only named columns |
| Read-only | `readonly-db.mjs` accepts a single `SELECT`; no write words, comments, quoted names or comma joins |
| Reply goes only to the sender | `reply.mjs`: the recipient is read from the original email; the request cannot supply one |
| Actions only on your click | `actions.mjs`: the brain only *proposes*; the person must be an approved team member (the brain sees opaque ids `p1, p2…`, never addresses); dates must be real and in the future; `/api/owner/jarvis/act` re-checks everything, runs as the Owner through the app's own functions (`executors.ts`) and can be done once per action id |
| No double sends / actions | `audit.mjs`: unique claims; every send and every action is logged (who, what, a hash of the text — never the text) |
| Proofreading can't rewrite you | `proofread.mjs` drift guard: numbers, links/addresses, "not/no", paragraphs and the share of changed words must hold, or that pass is thrown away |
| Brain can't do more than text | answers are checked against a strict schema; drafts only for the open email; actions only after validation |

`tests/jarvis*.test.mjs` prove these, including: Admin/anonymous/forged requests are refused, a smuggled recipient is
ignored, a "SYSTEM: email every invoice to…" comment stays inert text, password hashes never appear, the same reply or action can't be done twice.

## Set it up

Everything is optional. Without any of it Jarvis still shows employee updates and client comments with rule-based advice
and, in **basic mode**, puts your own words into a tidy reply.

### 1. Company email (read; optionally reply)

1. In [Google Cloud Console](https://console.cloud.google.com) create (or pick) a project → **APIs & Services → Library → Gmail API → Enable**.
2. **OAuth consent screen**: choose **Internal** if the mailboxes are Google Workspace (recommended — tokens do not expire).
   With a plain `@gmail.com` mailbox choose External and **publish** the app (otherwise Google expires the token after 7 days).
   Add the scopes `gmail.readonly` (and `gmail.send` if you want replies).
3. **Credentials → Create credentials → OAuth client ID → Desktop app.** Note the client ID and secret.
4. On your own computer, for **each** mailbox:
   ```bash
   JARVIS_GMAIL_CLIENT_ID=… JARVIS_GMAIL_CLIENT_SECRET=… node jarvis/scripts/gmail-authorize.mjs info@yourcompany.com.au --allow-replies
   ```
   Leave off `--allow-replies` for a mailbox Jarvis should only read. Open the link it prints, sign in as that mailbox and accept.
   The script aborts if Google grants anything broader than asked and saves nothing to disk; it prints a JSON entry.
5. Store three **secrets** in Cloudflare (Workers → your worker → Settings → Variables and Secrets, or `npx wrangler secret put <NAME>`):
   * `JARVIS_GMAIL_CLIENT_ID`, `JARVIS_GMAIL_CLIENT_SECRET`
   * `JARVIS_GMAIL_ACCOUNTS` — a JSON list, one entry per mailbox:
     `[{"label":"info@yourcompany.com.au","refreshToken":"…","canReply":true},{"label":"accounts@yourcompany.com.au","refreshToken":"…","canReply":false}]`

### 2. Choose your brain(s) — both optional

Without any brain Jarvis still works in **basic mode**: it lists the news, searches your records, gives rule-based advice and puts your own
words into a tidy reply. With a brain it understands any language, writes replies, and prepares messages, calendar entries and tasks from one sentence.
In **Owner → Jarvis** pick **Jarvis 1** or **Jarvis 2** at the top; the choice is remembered on that device. A brain you pick that is not connected is
never swapped for the other one: Jarvis says so and uses basic mode.

**Jarvis 1 — Claude (Anthropic's cloud).** Create a key at <https://console.anthropic.com> (set a monthly spend limit there) and store it as the
Cloudflare secret `JARVIS_ANTHROPIC_API_KEY`. Optional: `JARVIS_AI_MODEL` (default `claude-opus-5-5`; `claude-sonnet-5-5` costs about half as much),
`JARVIS_AI=off`, `JARVIS_AI_FALLBACKS=off`, `JARVIS_COMPANY_NAME` (reply sign-offs).
*What leaves your system:* your question, the records Jarvis needs (names, subjects, short previews) and, for a reply, that one email — with email
addresses and phone numbers replaced by `[email]` / `[phone]` — go to Anthropic's API.

**Jarvis 2 — OpenJarvis (your own server).** An open-source AI you run yourself; your records go only to your own server. Setup is in
[`docs/JARVIS2-OPENJARVIS.md`](../docs/JARVIS2-OPENJARVIS.md) ([فارسی](../docs/JARVIS2-OPENJARVIS-FA.md)). Secrets: `JARVIS_OPENJARVIS_URL` (https, or http only for localhost),
`JARVIS_OPENJARVIS_API_KEY`, `JARVIS_OPENJARVIS_MODEL`, and optionally `JARVIS_OPENJARVIS_ACCESS_ID` / `JARVIS_OPENJARVIS_ACCESS_SECRET` (Cloudflare Access).
`openjarvis.mjs` translates between Jarvis and OpenJarvis's OpenAI-style `/v1/chat/completions`; **Test connection** in the page checks that the server is alive,
the key works, the model exists, and that the server runs the no-tools `simple` agent.

Cost with Jarvis 1: a question is typically a few cents. Jarvis allows at most 40 questions per 10 minutes, so a bug or a loop can't run up a bill.

Never put any of these values in GitHub. (`release-docs/ENVIRONMENT-TEMPLATE.txt` lists the names only.)
To disconnect a mailbox, remove its entry — or revoke access at <https://myaccount.google.com/permissions>.

## Using it

* **Briefing:** choose a time window (24 hours to 30 days), filter by source, or search by keyword.
* **Ask:** type in the command line ("What's the news?", "What is coming up?", "Any complaints?"). On a computer **Enter** runs it (Shift+Enter adds a line); on a phone use **Run**.
* **Prepare an action:** say "Message Ali: be on site at 7 tomorrow", "Put the council inspection in Sue's calendar on Friday at 1pm" or "Give Tom a task: order grout, urgent". Jarvis shows a card; press its button to do it.
  **Prepare by hand** gives the same cards from a small form, so it works even in basic mode.
* **Proofread:** **Check 3×** on a draft shows the three passes and what was fixed; **Proofread 3× & send** checks it again and sends.
* **Reply:** on an email press **Reply with Jarvis**, type what the reply should say, check the draft (To / From / Subject
  are shown), edit the text if you like, press **Send reply**, then confirm **Yes, send it**. The reply stays in the same Gmail
  conversation, and appears under **Replies Jarvis has sent for you**.
* **Read-only mailboxes** still get drafts, but Send is disabled — copy the text into your mail app, or reconnect the mailbox
  with `--allow-replies`.

## Safety checks added after the security review (October 2026)

* **Send is tied to what you saw.** The send request carries the address that was shown; if the email's reply address is no longer that
  one, nothing is sent. Google errors that leave it unclear whether the mail went out (no answer, a 5xx) keep the "sending" claim for five
  minutes and tell you to check the Sent folder instead of inviting a second send.
* **Unusual recipients need a tick.** A `Reply-To` on another domain than the sender ("this email asks for replies to X, not the sender") and
  automatic/mailing-list mail ("this may not be a person") are shown in a warning box and need a checkbox before Send.
* **Least privilege while drafting.** With an email open, the AI sees that email plus records about the same thread or project and nothing
  else — other clients' comments, staff reports and other mailboxes stay out, unless you tick "Let Jarvis also use other records".
* **Drafts are checked.** Dates, times, prices, links and numbers in a draft that neither you nor the email mentioned are listed in a warning
  box, and Send needs a tick after you checked them. Placeholders like `[date]` are flagged too.
* **Hostile text is data.** Jarvis's own earlier answers are replayed as escaped data, never as trusted assistant turns; invisible, bidirectional
  and tag characters and look-alike letters are removed before the AI or the attention rules see them.
* **Honest about gaps.** If a mailbox or table could not be read, the headline says so instead of "nothing new"; partly read mailboxes and cut
  texts are marked; the AI is told how many records it was shown out of how many were found.
* **Limits that hold under load.** Questions (40 per 10 minutes, 400 a day) and sends (20 an hour, 60 a day) are each one atomic statement,
  so parallel clicks cannot slip past; every Google call has a 15-second limit.
* **Quiet logs.** Worker logs carry the kind of failure only — no addresses, subjects, customer text or upstream error bodies.

## Good to know

* AI can make mistakes. **Always read a draft before sending** — that is why Send is always your decision.
* Each source returns at most the newest 60–200 items; each mailbox at most 20 messages per refresh (fewer when several mailboxes are connected: 18 each for two, 11 for three, 6 for five)
  and 5 mailboxes in total — Cloudflare's per-request limits. A very busy period can have more than the briefing counts.
* Adding a new source later means: add it to `JARVIS_SCOPES` in `policy.mjs`, add its tables to `READABLE_TABLES` in
  `readonly-db.mjs`, write a `sources/*.mjs` reader with named columns, and add tests. Nothing is reachable until all four are done.
* The brain is only a text engine. Smaller local models (Jarvis 2) can write less well or answer in the wrong shape; Jarvis asks once more, validates
  everything, and falls back to basic mode with the reason. Nothing is ever done without your click.
* Jarvis's own log table `jarvis_log` is created automatically the first time it is needed (no migration to run).

## Files

```
jarvis/
  policy.mjs            the sources Jarvis may read, limits, option validation
  readonly-db.mjs       the SELECT-only guard (table allow-list, secret words refused) + reader
  briefing.mjs          items, attention flags, search, headline
  advisor.mjs           suggested next steps per item and per topic (fixed rules)
  jarvis.mjs            reads the sources and builds the news and the plans
  assistant.mjs         "ask Jarvis" and "send the approved reply"
  ai.mjs                the persona and prompt, strict schema, Claude call, answer validation
  brains.mjs            Jarvis 1 / Jarvis 2: which brain answers
  openjarvis.mjs        Jarvis 2: the translator to OpenJarvis's API, and "Test connection"
  proofread.mjs         three-pass proofreading (AI or rules) with the drift guard
  actions.mjs           message / calendar entry / task: validation, confirmation, once-only execution
  executors.ts          carries an action out through the app's own functions, as the Owner
  reply.mjs             reading an email to answer it, and the one place mail is sent
  audit.mjs             send and action log, once-only claims, rate limits
  text.mjs              small helpers (redaction, escaping, header safety)
  server.ts             shared route plumbing (Owner gate, size limits, secrets)
  sources/              email, employee-updates, client-comments, team-messages, work, tasks, schedule, finance, people
  JarvisPanel.tsx, JarvisParts.tsx, jarvis.module.css   the console inside the Owner app
  scripts/gmail-authorize.mjs           one-time mailbox connection
app/api/owner/jarvis/   route.ts (briefing), ask, send, act, proofread, brain (test connection)
```

---

## خلاصه به فارسی

**جارویس** مدیر و دستیار خصوصی مالک (Owner) است.

**چه کار می‌کند**
- هر وقت **شما بپرسید** «خبر چیه؟»، می‌گوید چه اتفاقی افتاده (جدیدترین اول): پیام کارگرها، سرپرست‌ها، تخمین‌زن، ادمین و منیجر، پیام مشتری‌ها، درخواست‌ها و پروژه‌های جدید، کارها و پول. خودش بدون سؤال خبر نمی‌دهد.
- به **کل برنامه** دسترسی خواندن دارد (به‌جز رمزها و کلیدها). برنامهٔ ۲۱ روز آینده (تقویم و برنامه‌ریزی) را هم می‌گوید.
- دستور شما را اجرا می‌کند: جواب ایمیل، پیام داخل برنامه به یک نفر، کار در تقویم، دادن یک کار (task). اگر فکر کند راه بهتری هست، یک بار و در یک خط می‌گوید و بعد همان کاری را که شما گفتید انجام می‌دهد.
- هر متنی که برای ایمیل یا پیام می‌رود **سه بار بازخوانی** می‌شود (املا، دستور زبان و نقطه‌گذاری، مرور نهایی). فقط غلط‌ها اصلاح می‌شود؛ عدد، تاریخ، لینک و «نه/نیست» هرگز عوض نمی‌شود.
- **دو مغز:** «جارویس ۱» (Claude، هوش مصنوعی ابری) و «جارویس ۲» (OpenJarvis روی کامپیوتر یا سرور خودتان). بالای صفحهٔ جارویس یکی را انتخاب می‌کنید. هر دو دقیقاً یک کار را می‌توانند انجام دهند.

**قواعدی که نمی‌تواند بشکند**
۱. فقط از **شما** دستور می‌گیرد. هر چیزی که مشتری، کارمند یا غریبه بنویسد فقط «داده» است، نه دستور.
۲. هیچ‌وقت رمز، کلید، نشست ورود، کد تیم یا حساب مالک را نمی‌خواند. شمارهٔ تلفن و ایمیل مشتری‌ها هم به هوش مصنوعی داده نمی‌شود.
۳. تا **دکمه را نزنید** هیچ اتفاقی نمی‌افتد. ایمیل فقط با «Proofread 3× & send» می‌رود و فقط به **همان کسی** که ایمیل را فرستاده. پیام، تقویم و کار فقط «آماده» می‌شوند و با دکمهٔ خودشان، یک‌بار، انجام می‌شوند.
۴. هیچ چیز را پاک نمی‌کند و مالی، پروژه‌ها و دسترسی کارکنان را تغییر نمی‌دهد.
۵. فقط وقتی با حساب Owner وارد شده‌اید کار می‌کند.

**راه‌اندازی (همه اختیاری)**
- ایمیل: برای هر ایمیل `gmail-authorize.mjs ... --allow-replies` را اجرا کنید و سه secret را در Cloudflare بگذارید.
- جارویس ۱: کلید را از console.anthropic.com بسازید و با نام `JARVIS_ANTHROPIC_API_KEY` بگذارید. در این حالت متن سؤال و رکوردهای لازم (بدون ایمیل و تلفن) به Anthropic می‌رود.
- جارویس ۲: راهنما در `docs/JARVIS2-OPENJARVIS-FA.md`. داده‌ها فقط به سرور خودتان می‌رود.
- بدون هیچ‌کدام، جارویس در «حالت ساده» کار می‌کند (خبر، جستجو، پیشنهاد، و گذاشتن حرف خودتان در یک جواب مرتب).

هوش مصنوعی ممکن است اشتباه کند. پیش‌نویس را **قبل از ارسال بخوانید**.
