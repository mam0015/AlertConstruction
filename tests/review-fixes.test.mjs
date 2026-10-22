// Regression tests for the problems found by the independent review of the Jarvis, storage, deploy and voice work.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aiReply, baseConfig, createTables, fakeAi, gmailMessage, googleMock, seed } from "./helpers/jarvis-fixtures.mjs";
import { TestD1 } from "./helpers/test-d1.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";
import { AiError } from "../jarvis/ai.mjs";
import { askJarvis, parseAskInput, sendOwnerReply } from "../jarvis/assistant.mjs";
import { runJarvis } from "../jarvis/jarvis.mjs";
import { htmlToText } from "../jarvis/reply.mjs";
import { redact } from "../jarvis/text.mjs";
import { chunksFor, pickVoice, plansScript, speakable, voiceProblem } from "../jarvis/voice.mjs";
import { checkOpenJarvis, createOpenJarvisClient, fitsSchema } from "../jarvis/openjarvis.mjs";
import { wantsPersian } from "../jarvis/persian.mjs";
import { driftProblem, proofread, ruleCheck } from "../jarvis/proofread.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const owner = { email: "owner@alert.test", name: "Alex Owner" };
const GB = 1024 ** 3;
// Tests that change the file limit or patch the database restore both, whatever happens.
test.afterEach(() => { delete process.env.FILES_LIMIT_GB; });

function freshDb() {
  const d1 = new TestD1();
  createTables(d1);
  seed(d1);
  return d1;
}

// ---------------------------------------------------------------------------------------------------------------------
// Proofreading
test("proofread: ordinary English words that are also JavaScript object names are left alone and never crash", async () => {
  for (const text of ["The constructor arrives Monday.", "Constructor Pty Ltd will call.", "Please see toString, valueOf and hasOwnProperty.", "__proto__ is not a word."]) {
    for (const pass of [1, 2, 3]) assert.doesNotThrow(() => ruleCheck(text, pass), text);
    const report = await proofread(text);
    assert.equal(report.text, text, "text that needs no correction comes back identical");
    assert.ok(!report.text.includes("native code"));
  }
  assert.equal((await proofread("The constructor will recieve it.")).text, "The constructor will receive it.", "real slips next to such words are still fixed");
});

test("proofread: web addresses without a scheme, sub-domains and file names are never reformatted", () => {
  const text = "See vba.vic.gov.au or floorplan.dwg or drive.google.com/open?id=abc123 and info@alert.com.au";
  for (const pass of [1, 2, 3]) assert.equal(ruleCheck(text, pass).text, text, `pass ${pass}`);
  assert.equal(ruleCheck("We finished.thanks see floorplan.dwg", 2).text.includes("floorplan.dwg"), true);
});

test("proofread: swapping a day, a month or am/pm is a change of meaning and is refused", () => {
  assert.match(driftProblem("See you on Thursday at 9am.", "See you on Friday at 9am."), /day, month or am\/pm/);
  assert.match(driftProblem("The visit is in March.", "The visit is in April."), /day, month or am\/pm/);
  assert.match(driftProblem("Come at 9 am please.", "Come at 9 pm please."), /day, month or am\/pm/);
  assert.equal(driftProblem("see you thursday at 9am.", "See you Thursday at 9am."), "", "capital letters are corrections, not changes");
  assert.equal(driftProblem("Come at 9 am.", "Come at 9am."), "", "spacing around am/pm is not a change");
});

test("proofread: a short text with many slips gets all of them fixed by the rules, and is not reported clean when something was held back", async () => {
  const report = await proofread("dont recieve thier seperate calender");
  assert.equal(report.text, "Don't receive their separate calendar");
  assert.equal(report.clean, true, "the final read-through found nothing left");
  assert.ok(report.totalFixes >= 5);
  // An AI that rewrites too much is still held back, and the report no longer calls that "clean".
  const rewriting = fakeAi(() => aiReply({ text: "Completely different words here now.", fixes: [] }));
  const held = await proofread("Please come on Thursday at nine to measure the kitchen.", { client: rewriting.client, model: "m" });
  assert.equal(held.text, "Please come on Thursday at nine to measure the kitchen.");
  assert.equal(held.clean, false);
});

// ---------------------------------------------------------------------------------------------------------------------
// Jarvis 2 (OpenJarvis)
const jarvis2Config = { openJarvis: { url: "https://jarvis.example.com", apiKey: "key-123", model: "m1", accessId: "access-id", accessSecret: "access-secret" } };
const chatBody = (content) => new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }], usage: {}, model: "m1" }), { status: 200, headers: { "content-type": "application/json" } });
const SCHEMA = { type: "object", properties: { reply: { type: "string" }, suggestions: { type: "array" } }, required: ["reply", "suggestions"] };

test("jarvis 2: a redirect is refused, so the company's records and the access key never go to another address", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url: String(url), init }); return new Response(null, { status: 302, headers: { location: "http://evil.example/steal" } }); };
  const client = createOpenJarvisClient(jarvis2Config, { fetchImpl });
  await assert.rejects(() => client.beta.messages.create({ system: "s", messages: [{ role: "user", content: "records" }], max_tokens: 100 }), (error) => error instanceof AiError && /redirect/i.test(error.message));
  assert.equal(calls.length, 1, "no second request was made");
  assert.equal(calls[0].init.redirect, "manual");
  assert.ok(calls.every((call) => call.url.startsWith("https://jarvis.example.com/")));
  const check = await checkOpenJarvis(jarvis2Config, { fetchImpl });
  assert.equal(check.ok, false);
  assert.match(check.message, /redirect/i);
});

test("jarvis 2: an answer that is only a fragment of the JSON is not accepted as the answer; it is asked for again", async () => {
  assert.equal(fitsSchema({ reply: "hi", suggestions: [] }, SCHEMA), true);
  assert.equal(fitsSchema({ title: "x" }, SCHEMA), false);
  assert.equal(fitsSchema([], SCHEMA), false);
  assert.equal(fitsSchema(null, SCHEMA), false);

  const answers = ['{"reply": "Hello", "suggestions": [ {"title": "x"} ', '{"reply": "Fixed", "suggestions": []}'];
  const fetchImpl = async () => chatBody(answers.shift());
  const client = createOpenJarvisClient(jarvis2Config, { fetchImpl });
  const result = await client.beta.messages.create({ system: "s", messages: [{ role: "user", content: "q" }], max_tokens: 100, output_config: { format: { schema: SCHEMA } } });
  assert.equal(JSON.parse(result.content[0].text).reply, "Fixed");

  const broken = async () => chatBody('{"reply": "Hello", "suggestions": [ {"title": "x"} ');
  await assert.rejects(() => createOpenJarvisClient(jarvis2Config, { fetchImpl: broken }).beta.messages.create({ system: "s", messages: [{ role: "user", content: "q" }], max_tokens: 100, output_config: { format: { schema: SCHEMA } } }), /unexpected format/i);
});

// ---------------------------------------------------------------------------------------------------------------------
// What the AI may see while drafting a reply
const ROOF = { mailbox: "info@alert.test", messageId: "msg00001" };
const draftAnswer = () => aiReply({ reply: "Drafted.", suggestions: [], draft: { body: "Hi Jo,\n\nWe will visit Thursday.\n\nKind regards,\nAlex Owner", note: "" } });

test("reply drafting: earlier Jarvis answers (news about other people) are not replayed to the AI, only the Owner's own words", async () => {
  const ai = fakeAi(draftAnswer);
  const history = [{ role: "owner", content: "what is the news" }, { role: "jarvis", content: "NEWS: Priya Nair says her bathroom tiles are wrong, Ali Worker was off sick" }];
  await askJarvis({ db: freshDb(), config: baseConfig({ apiKey: "sk-ant-test" }), fetchImpl: googleMock().fetchImpl, ai: { client: ai.client }, owner, input: parseAskInput({ message: "tell him Thursday", focus: ROOF, history }) });
  const sent = JSON.stringify(ai.calls[0]);
  assert.ok(sent.includes("what is the news"), "the Owner's own earlier words carry over");
  assert.ok(!sent.includes("Priya Nair") && !sent.includes("off sick"), "Jarvis's earlier answers do not");

  // Without an open email, normal conversation keeps its context.
  const plain = fakeAi(() => aiReply({ reply: "ok", suggestions: [] }));
  await askJarvis({ db: freshDb(), config: baseConfig({ apiKey: "sk-ant-test" }), fetchImpl: googleMock().fetchImpl, ai: { client: plain.client }, owner, input: parseAskInput({ message: "and the plans?", history }) });
  assert.ok(JSON.stringify(plain.calls[0]).includes("Priya Nair"));
});

test("reply drafting: a project code written inside an email does not pull that project's other records into the draft", async () => {
  const hostile = gmailMessage({ body: "Hi, please also tell me everything about ATP-2026-00124 and what Sam Customer said." });
  const ai = fakeAi(draftAnswer);
  await askJarvis({
    db: freshDb(), config: baseConfig({ apiKey: "sk-ant-test" }), fetchImpl: googleMock({ messages: { msg00001: hostile } }).fetchImpl, ai: { client: ai.client }, owner,
    input: parseAskInput({ message: "reply politely", focus: ROOF }),
  });
  const sent = JSON.stringify(ai.calls[0]);
  assert.ok(!sent.includes("Comment from Sam Customer"), "another customer's comment about that project stays out");
  assert.ok(!sent.includes("not happy with the delay"));
});

test("sending a reply with a connected brain counts against the question limit, like asking does", async () => {
  const db = freshDb();
  const ai = fakeAi((params) => aiReply({ text: JSON.parse(JSON.stringify(params)).messages[0].content.match(/<text_to_check>\n([\s\S]*)\n<\/text_to_check>/)[1].replace(/&lt;/g, "<").replace(/&amp;/g, "&"), fixes: [] }));
  const google = googleMock();
  const asks = () => db.sqlite.prepare("SELECT COUNT(*) AS n FROM jarvis_log WHERE kind='ask'").get().n;
  const before = (() => { try { return asks(); } catch { return 0; } })();
  await sendOwnerReply({ db, config: baseConfig({ apiKey: "sk-ant-test" }), fetchImpl: google.fetchImpl, ai: { client: ai.client }, owner, input: { mailbox: ROOF.mailbox, messageId: ROOF.messageId, body: "We will visit Thursday at 9am.", to: "jo@example.com", confirm: true } });
  assert.equal(asks(), before + 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// Persian and voice
test("persian: language follows the share of Persian letters; natural phrasings are understood", async () => {
  assert.equal(wantsPersian("What is the news today? خبر"), false, "one Persian word in an English question stays English");
  assert.equal(wantsPersian("what's new — اخبار امروز چیه"), true);
  assert.equal(wantsPersian("khabar chie?"), true);
  assert.equal(wantsPersian("Please quote the Khabar Street project: pergola, deck, three bedrooms, new kitchen and a long list of other building work"), false);
  const db = freshDb();
  const fa = (message) => askJarvis({ db, config: baseConfig(), fetchImpl: googleMock().fetchImpl, owner, input: parseAskInput({ message }) });
  assert.match((await fa("چه اتفاقی افتاد؟")).reply, /این اتفاق‌ها افتاده است|هیچ اتفاق تازه/, "a natural way to ask for the news");
  assert.match((await fa("فردا چه برنامه‌ای داریم؟")).reply, /برنامه/, "tomorrow's plans");
  assert.match((await fa("akhbar")).reply, /این اتفاق‌ها افتاده است|هیچ اتفاق تازه/);
});

test("voice: digits are read in the language of the text before them, device voices are preferred, and long blank runs are cheap", () => {
  const withNumbers = chunksFor("Il costo is the total. 42. Next.", { prefer: "fa" });
  assert.ok(withNumbers.every((chunk) => chunk.lang === "en-AU"), "a number after English text is English, not the chosen Persian");
  const voices = [
    { name: "Cloud GB", lang: "en-GB", localService: false },
    { name: "Local GB", lang: "en_GB", localService: true },
  ];
  assert.equal(pickVoice(voices, "en-AU").name, "Local GB", "when no Australian voice exists, a voice on the device beats a cloud one");
  const hostile = `a${" ".repeat(200_000)}->${" ".repeat(200_000)}@b`;
  const started = Date.now();
  assert.ok(speakable(hostile).length < 40);
  assert.ok(Date.now() - started < 1_000, "linear time");
});

test("voice: Persian words inside an English sentence go to the Persian voice, English words inside Persian to the English voice", () => {
  const mixed = chunksFor("Message from علی about tiles. پیام از Ali درباره کاشی 42.", { prefer: "en" });
  assert.deepEqual(mixed.map((chunk) => [chunk.lang, chunk.text]), [
    ["en-AU", "Message from"], ["fa-IR", "علی"], ["en-AU", "about tiles."], ["fa-IR", "پیام از"], ["en-AU", "Ali"], ["fa-IR", "درباره کاشی 42."],
  ]);
  assert.ok(!mixed.some((chunk) => chunk.lang === "en-AU" && /[\u0600-\u06FF]/.test(chunk.text)), "an English voice never gets Persian letters");
  assert.deepEqual(chunksFor("12 345", { prefer: "fa" }).map((chunk) => chunk.lang), ["fa-IR"], "text with no letters uses the chosen language");
  assert.ok(chunksFor("x ".repeat(2000), { max: 100 }).every((chunk) => chunk.text.length <= 100));
});

test("persian: a source that could not be read is named in Persian when the Owner writes Persian", async () => {
  const google = googleMock({ messages: {} });
  const down = async (url, init) => (String(url).includes("googleapis.com/gmail") ? new Response("{}", { status: 500 }) : google.fetchImpl(url, init));
  const out = await askJarvis({ db: freshDb(), config: baseConfig(), fetchImpl: down, owner, input: parseAskInput({ message: "اخبار چیه؟" }) });
  assert.ok(!/I could not fully read|Note:/.test(out.reply), out.reply);
  assert.match(out.reply, /نتوانستم .+ را کامل بخوانم/, "the warning is there, in Persian");
});

test("voice screen: toggles use aria-pressed with fixed names, a mounted-only reader, and valid font declarations", () => {
  const hook = read("jarvis/useVoice.ts");
  const bar = read("jarvis/VoiceBar.tsx");
  const panel = read("jarvis/JarvisPanel.tsx");
  const css = read("jarvis/jarvis.module.css");
  assert.match(hook, /aliveRef/);
  assert.match(hook, /listenLang/);
  assert.ok(!/role="radio"/.test(bar) && /aria-pressed=\{voice\.prefs\.lang/.test(bar));
  assert.match(bar, /role="status" aria-live="polite"/);
  assert.ok(!/aria-label=\{voice\.listening/.test(panel), "the microphone keeps one name; its state is aria-pressed");
  assert.deepEqual(css.match(/font:[^;}]*\binherit\b/g)?.filter((declaration) => declaration !== "font:inherit") ?? [], [], "no font shorthand with the invalid 'inherit' family anywhere in the file");
});

// ---------------------------------------------------------------------------------------------------------------------
// Storage, deploy, legacy cleanup
const pdf = (name, size) => new File([`%PDF-1.4\n${"x".repeat(size - 10)}\n`], name, { type: "application/pdf" });

test("storage: customers stop at 80% so staff keep room, a database error never looks like zero use, and the limit cannot be switched off", async () => {
  const app = await startWorker("fixes");
  const owner2 = await app.ownerCookie();
  const tiler = await app.staffCookie("tiler.fixes@alert.test", "Worker");
  const settings = async () => (await (await app.request("/api/owner/settings", { headers: { cookie: owner2 } })).json()).data;

  // 1000-byte limit: a customer file of 900 bytes is refused (80% = 800), a staff chat file of 900 bytes is accepted.
  process.env.FILES_LIMIT_GB = String(1000 / GB);
  const form = new FormData();
  for (const [key, value] of Object.entries({ service: "Kitchen Renovations", name: "Fix Customer", phone: "0400 111 222", email: "fix.customer@example.com", location: "Kew", timeframe: "Within 1–3 months", budget: "$25,000–$75,000", material: "Premium", details: "Checking the staff reserve is kept free for site photos and documents." })) form.set(key, value);
  form.append("files", new File([`%PDF-1.4\n${"x".repeat(890)}\n`], "big.pdf", { type: "application/pdf" }));
  assert.equal((await app.request("/api/requests", { method: "POST", body: form, headers: { "x-forwarded-for": "198.51.100.88" } })).status, 507);
  const chat = new FormData();
  chat.set("to", app.ownerEmail);
  chat.set("body", "photo");
  chat.set("file", pdf("staff.pdf", 900));
  assert.equal((await app.request("/api/team/chat", { method: "POST", headers: { cookie: tiler }, body: chat })).status, 201, "staff can use the reserve");

  // A database error while counting is an error, not "0 bytes used".
  process.env.FILES_LIMIT_GB = "8";
  const realPrepare = app.env.DB.prepare.bind(app.env.DB);
  app.env.DB.prepare = (sql) => (/SUM\(file_size\)/.test(sql) ? { first: async () => { throw new Error("D1_ERROR: temporarily unavailable"); } } : realPrepare(sql));
  const again = new FormData();
  again.set("to", app.ownerEmail);
  again.set("body", "photo 2");
  again.set("file", pdf("two.pdf", 600));
  const objects = app.env.BUCKET.objects.size;
  assert.equal((await app.request("/api/team/chat", { method: "POST", headers: { cookie: tiler }, body: again })).status, 400, "the upload is refused, not waved through");
  assert.equal(app.env.BUCKET.objects.size, objects);
  const whileBroken = await settings();
  assert.ok(whileBroken.account && whileBroken.storage === undefined, "Settings still loads when the meter cannot be read");
  app.env.DB.prepare = realPrepare;

  // An absurd limit is capped instead of becoming "no limit".
  process.env.FILES_LIMIT_GB = "1e308";
  const capped = (await settings()).storage;
  assert.ok(Number.isFinite(capped.limitBytes) && capped.limitBytes <= 100_000 * GB);
  delete process.env.FILES_LIMIT_GB;
  assert.match((await settings()).storage.message, /of 8\.00 GB/);
});

test("deploy script: finds its resources file from any folder, never creates a named bucket, and reads the table list only when wrangler succeeded", () => {
  const deploy = read("scripts/deploy-cloudflare.mjs");
  assert.match(deploy, /fileURLToPath\(new URL\("\.\.\/cloudflare\.resources\.json", import\.meta\.url\)\)/);
  assert.match(deploy, /if \(!NAMED_BUCKET\) \{\s*const bucket = wrangler\(\["r2", "bucket", "create"/);
  assert.match(deploy, /peek\.status === 0 \? JSON\.parse/);
  assert.ok(!/existsSync\("cloudflare\.resources\.json"\)/.test(deploy));
});

test("legacy demo cleanup only touches rows from the old seed's own minute, never a whole day of real messages", async () => {
  const source = read("db/owner-store.ts");
  assert.ok(!/DELETE FROM team_messages\s+WHERE sent_at LIKE '2026-08-09%'\s*`\)/.test(source), "no day-wide delete: the old seed's own people are named too");
  assert.match(source, /sender IN \('Site Supervisor 01'/);
  const app = await startWorker("legacy");
  // The tables exist before the migration runs; plant one old seed row and two real rows from the same day.
  app.d1.sqlite.exec("CREATE TABLE IF NOT EXISTS team_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, sent_at TEXT NOT NULL)");
  const put = app.d1.sqlite.prepare("INSERT INTO team_messages (sender,recipient,body,sent_at) VALUES (?,?,?,?)");
  put.run("Admin 01", "Site Supervisor 01", "old demo seed", "2026-08-09T12:00:36.421Z");
  put.run("Site Supervisor 01", "Owner", "old demo seed (original timestamp style)", "2026-08-09T10:36:00+10:00");
  put.run("Ali Worker", "Owner", "REAL message in the morning", "2026-08-09T09:15:00.000Z");
  put.run("Sue Supervisor", "Owner", "REAL message in the evening", "2026-08-09T18:40:00.000Z");
  app.d1.sqlite.exec("CREATE TABLE IF NOT EXISTS eod_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, person TEXT NOT NULL, role TEXT NOT NULL, project_code TEXT NOT NULL, summary TEXT NOT NULL, submitted_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', owner_note TEXT NOT NULL DEFAULT '')");
  const report = app.d1.sqlite.prepare("INSERT INTO eod_reports (person,role,project_code,summary,submitted_at) VALUES (?,?,?,?,?)");
  report.run("Site Supervisor 01", "Site Supervisor", "ATP-2026-00124", "old demo seed report", "2026-08-09T16:42:00+10:00");
  report.run("Ali Worker", "Worker", "ATP-2026-00124", "REAL report from the same day", "2026-08-09T16:50:00+10:00");
  const owner3 = await app.ownerCookie();
  assert.equal((await app.request("/api/owner/data", { headers: { cookie: owner3 } })).status, 200);
  const left = app.d1.sqlite.prepare("SELECT body FROM team_messages ORDER BY id").all().map((row) => row.body);
  assert.deepEqual(left, ["REAL message in the morning", "REAL message in the evening"]);
  assert.deepEqual(app.d1.sqlite.prepare("SELECT summary FROM eod_reports").all().map((row) => row.summary), ["REAL report from the same day"]);
});

// ---------------------------------------------------------------------------------------------------------------------
// Second round of review findings
test("earlier Jarvis answers that listed records as they were (addresses, phones) are redacted before they are replayed to an AI", async () => {
  const ai = fakeAi(() => aiReply({ reply: "ok", suggestions: [] }));
  const history = [{ role: "owner", content: "what is the news" }, { role: "jarvis", content: "Sam: ring me on 0412 345 678 or sam.work@bigco.com.au. Staff: tiler@alert.test said the tiles are late. ۰۴۱۲ ۳۴۵ ۶۷۸" }];
  await askJarvis({ db: freshDb(), config: baseConfig({ apiKey: "sk-ant-test" }), fetchImpl: googleMock().fetchImpl, ai: { client: ai.client }, owner, input: parseAskInput({ message: "try again", history }) });
  const sent = JSON.stringify(ai.calls[0]);
  for (const secret of ["0412 345 678", "sam.work@bigco.com.au", "tiler@alert.test", "۰۴۱۲"]) assert.ok(!sent.includes(secret), `${secret} must not reach the AI`);
  assert.ok(sent.includes("[phone]") && sent.includes("[email]"));
});

test("a customer's own email address (recorded as the actor of their events) is never read by Jarvis", async () => {
  const db = freshDb();
  db.sqlite.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (1,'Customer','sam.private@example.com','estimate_accepted','Customer accepted the estimate','Looks good','internal',?)").run(new Date(Date.now() - 3_600_000).toISOString());
  const out = await runJarvis({ db, config: baseConfig(), fetchImpl: googleMock().fetchImpl, params: { hours: "72", limit: "100" } });
  const event = out.items.find((item) => item.title.startsWith("Customer accepted the estimate"));
  assert.ok(event, "the event is still there");
  assert.equal(event.who, "Sam Customer");
  assert.ok(!JSON.stringify(out).includes("sam.private@example.com"));
});

test("redaction also catches phone numbers written in Persian or Arabic-Indic digits, and addresses hidden behind numeric entities", () => {
  for (const text of ["call ۰۴۱۲ ۳۴۵ ۶۷۸ now", "call ٠٤١٢٣٤٥٦٧٨ now", "call 0412 345 678 now"]) assert.equal(redact(text), "call [phone] now", text);
  assert.equal(htmlToText("<p>write to sam&#64;example&#x2E;com&nbsp;please</p>").trim(), "write to sam@example.com please");
  assert.equal(redact(htmlToText("sam&#64;example&#x2E;com")), "[email]");
  assert.equal(htmlToText("a&#0;b&#1114112;c&#55357;d"), "a b c d".replace(/ /g, " "), "impossible code points are dropped, never thrown on");
});

test("proofread: numbers written in Persian digits are protected like any other number, and real place and family names are left alone", async () => {
  assert.match(driftProblem("قیمت ۲۴۰۰ دلار است.", "قیمت ۲۵۰۰ دلار است."), /number or date/);
  assert.equal(driftProblem("قیمت ۲۴۰۰ دلار است.", "قیمت ۲۴۰۰ دلار است!"), "");
  for (const text of ["We drove to Wagga Wagga and Woy Woy.", "Mrs Plummer will call on Monday."]) assert.equal((await proofread(text)).text, text, text);
});

test("test connection: an address that merely answers 200 is not accepted as OpenJarvis, and a missing settings page is flagged", async () => {
  const route = (handlers) => async (url) => { const path = new URL(url).pathname; const make = handlers[path]; return make ? make() : new Response("{}", { status: 404 }); };
  const json = (body) => () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  const config = { openJarvis: { url: "https://jarvis.example.com", model: "m1" } };
  const web = await checkOpenJarvis(config, { fetchImpl: route({ "/health": json({}), "/v1/models": () => new Response("<html>Sign in</html>", { status: 200 }) }) });
  assert.equal(web.ok, false);
  assert.match(web.message, /does not look like an OpenJarvis server/);
  const noInfo = await checkOpenJarvis(config, { fetchImpl: route({ "/health": json({}), "/v1/models": json({ data: [{ id: "m1" }] }) }) });
  assert.equal(noInfo.ok, true);
  assert.ok(noInfo.warnings.some((warning) => /\/v1\/info/.test(warning)), "the skipped safety check is said out loud");
});

test("jarvis screen: the other-records tick resets for every email, a late draft is not shown on another email, the plans list survives a bad date, and the box stays focusable", () => {
  const panel = read("jarvis/JarvisPanel.tsx");
  const parts = read("jarvis/JarvisParts.tsx");
  assert.ok((panel.match(/setUseOther\(false\)/g) ?? []).length >= 3, "reset on a new email, on send and on stop");
  assert.match(panel, /askedAbout/);
  assert.match(panel, /readOnly=\{asking\}/);
  const textarea = panel.match(/<textarea id="jarvis-input"[\s\S]*?\/>/)[0];
  assert.ok(!/disabled=\{asking\}/.test(textarea) && /readOnly=\{asking\}/.test(textarea), "a disabled box would drop keyboard focus after every run");
  assert.match(parts, /Number\.isNaN\(date\.getTime\(\)\) \? day/);
  assert.ok(!/dayStamp\.format\(new Date\(`\$\{day\}T12:00:00`\)\)/.test(parts), "no unguarded date formatting");
});

test("proofread: repeated capitalised words (names), dotted abbreviations, addresses and file names are left alone; real slips are still fixed", async () => {
  for (const text of ["We start at Nar Nar Goon on Monday.", "Bli Bli and Gin Gin are close.", "Use the flat roof i.e. the porch.", "Send logo.svg and house.skp and site.mp3 to john.smith, see mysite.app or portal.dev."]) {
    assert.equal((await proofread(text)).text, text, text);
  }
  assert.equal((await proofread("Please see the the plan, and we will call. thanks for your email.we will come")).text, "Please see the plan, and we will call. Thanks for your email. We will come");
});

test("proofread: abbreviated days and months are watched too, and a short text still gets its rule corrections when an AI is connected but changed nothing", async () => {
  assert.match(driftProblem("See you Fri at 9.", "See you Thu at 9."), /day, month or am\/pm/);
  assert.match(driftProblem("Start 15 Mar.", "Start 15 May."), /day, month or am\/pm/);
  assert.match(driftProblem("Back in Sept.", "Back in Oct."), /day, month or am\/pm/);
  const echo = fakeAi((params) => aiReply({ text: params.messages[0].content.match(/<text_to_check>\n([\s\S]*)\n<\/text_to_check>/)[1], fixes: [] }));
  const report = await proofread("dont recieve thier seperate calender", { client: echo.client, model: "m" });
  assert.equal(report.text, "Don't receive their separate calendar", "the exact rules still apply with an AI that only echoed the text");
  assert.equal(report.clean, true);
});

test("reply mode: the AI is told how many records exist, and the Owner is told when some are kept out", async () => {
  const ai = fakeAi(() => aiReply({ reply: "Nothing else is new.", suggestions: [] }));
  const out = await askJarvis({ db: freshDb(), config: baseConfig({ apiKey: "sk-ant-test" }), fetchImpl: googleMock().fetchImpl, ai: { client: ai.client }, owner, input: parseAskInput({ message: "what's the news?", focus: ROOF }) });
  const header = ai.calls[0].messages.at(-1).content.match(/<records[^>]*>/)[0];
  const shown = Number(header.match(/shown="(\d+)"/)[1]);
  const total = Number(header.match(/total_found="(\d+)"/)[1]);
  assert.ok(total > shown, `total_found (${total}) counts every record, shown (${shown}) only the open email's thread`);
  assert.match(out.reply, /other records? (is|are) kept out while this email is open/);
});

test("persian: when an AI notice is shown, the reply does not also claim that no AI is connected", async () => {
  const failing = fakeAi(() => { const error = new Error("busy"); error.status = 529; throw error; });
  const out = await askJarvis({ db: freshDb(), config: baseConfig({ apiKey: "sk-ant-test" }), fetchImpl: googleMock().fetchImpl, ai: { client: failing.client }, owner, input: parseAskInput({ message: "جواب بده: پنجشنبه می‌آییم", focus: ROOF }) });
  assert.equal(out.mode, "rules");
  assert.ok(!out.reply.includes("هوش مصنوعی وصل نیست"), out.reply);
});

test("deploy: wrangler may not provision anything, the account in the file is the one used, and the docs name the real resources", () => {
  const deploy = read("scripts/deploy-cloudflare.mjs");
  assert.match(deploy, /"--experimental-provision=false", "--experimental-auto-create=false"/);
  assert.match(deploy, /\["r2", "bucket", "list"\]/);
  assert.match(deploy, /process\.env\.CLOUDFLARE_ACCOUNT_ID = resources\.accountId/);
  for (const file of ["docs/GO-LIVE.md", "docs/GO-LIVE-FA.md"]) {
    const text = read(file);
    assert.ok(!text.includes("alert-tradie-pro-db") && !text.includes("alert-tradie-pro-files"), `${file} must not name resources that are not the company's`);
    assert.ok(text.includes("<database-name>") && text.includes("test-at"));
  }
  assert.equal(read(".github/workflows/deploy.yml"), read("docs/deploy-workflow.yml"));
});

test("a file record whose event cannot be written is removed again, so no record is left without its file", async () => {
  const app = await startWorker("rollback");
  const owner4 = await app.ownerCookie();
  // A project (case) to attach a document to.
  const created = await app.request("/api/workflow/public", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.99" }, body: JSON.stringify({ name: "Customer Rollback", email: "rollback@customer.test", phone: "0400111222", service: "Bathroom renovation", location: "Parramatta NSW 2150", details: "Full bathroom renovation, approximately six square metres.", timeframe: "Next month", budget: "$20k", termsAccepted: "on" }) });
  assert.equal(created.status, 201, await created.clone().text());
  const cases = (await (await app.request("/api/workflow", { headers: { cookie: owner4 } })).json()).data.cases;
  assert.ok(cases.length >= 1);
  const realPrepare = app.env.DB.prepare.bind(app.env.DB);
  app.env.DB.prepare = (sql) => (/INSERT INTO workflow_events/.test(sql) ? { bind: () => ({ run: async () => { throw new Error("D1_ERROR: events unavailable"); } }) } : realPrepare(sql));
  const form = new FormData();
  form.set("caseId", String(cases[0].id));
  form.set("category", "document");
  form.set("file", new File([`%PDF-1.4\n${"x".repeat(300)}\n`], "plan.pdf", { type: "application/pdf" }));
  const objectsBefore = app.env.BUCKET.objects.size;
  const response = await app.request("/api/workflow/files", { method: "POST", headers: { cookie: owner4 }, body: form });
  app.env.DB.prepare = realPrepare;
  assert.equal(response.status, 400);
  assert.equal(app.env.BUCKET.objects.size, objectsBefore, "the stored file was removed");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_files").get().n, 0, "and so was its record");
});

test("voice: a Persian ending glued to a Latin word goes to the Persian voice, device voices beat online ones, online voices are flagged, plans are spoken as days", () => {
  const glued = chunksFor("فایل PDF\u200cها را ببینید. Check ATP\u200cها now.", { prefer: "en" });
  assert.ok(!glued.some((chunk) => chunk.lang === "en-AU" && /[\u0600-\u06FF]/.test(chunk.text)), JSON.stringify(glued));
  assert.equal(chunksFor("Check the supplier. Next.").map((chunk) => chunk.text).join(" "), "Check the supplier. Next.", "punctuation stays attached to its word");

  const online = { name: "Google UK English Female", lang: "en-GB", localService: false };
  const local = { name: "Microsoft David", lang: "en-US", localService: true };
  assert.equal(pickVoice([online, local], "en-AU").name, "Microsoft David", "a voice on the device wins over an online one of a closer language variant");
  assert.equal(pickVoice([online], "en-AU").name, "Google UK English Female", "with nothing else, the online voice is used");
  assert.match(voiceProblem(chunksFor("Hello there"), [online]), /online voice.*sent to the company/);
  assert.equal(voiceProblem(chunksFor("Hello there"), [online, local]), "");

  const script = plansScript([{ title: "2026-10-21 09:00 — Council inspection", who: "Sue", project: "ATP-2026-00124" }, { title: "2026-10-22 — Site meeting", who: "", project: "" }]);
  assert.match(script, /Wednesday 21 October\. 09:00\. Council inspection\. Sue\. ATP-2026-00124/);
  assert.match(script, /Thursday 22 October\. Site meeting/);
  assert.ok(!script.includes("2026-10-21"), "no ISO date is read out");
  assert.match(plansScript(Array.from({ length: 25 }, (_, n) => ({ title: `Plan ${n}` }))), /5 more are not read aloud\./);
});

test("the microphone is allowed on the Owner app only, so Jarvis's voice typing can work there and nowhere else", async () => {
  const app = await startWorker("mic");
  const policy = async (path) => (await app.request(path)).headers.get("permissions-policy");
  assert.match(await policy("/owner"), /microphone=\(self\)/);
  assert.match(await policy("/owner/"), /microphone=\(self\)/);
  for (const path of ["/", "/request-a-job", "/api/owner/data", "/admin", "/owner-login-help"]) assert.match(await policy(path), /microphone=\(\)/, path);
  assert.match(await policy("/owner"), /camera=\(\)/, "everything else stays off");
});
