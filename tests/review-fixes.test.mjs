// Regression tests for the problems found by the independent review of the Jarvis, storage, deploy and voice work.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aiReply, baseConfig, createTables, fakeAi, gmailMessage, googleMock, seed } from "./helpers/jarvis-fixtures.mjs";
import { TestD1 } from "./helpers/test-d1.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";
import { AiError } from "../jarvis/ai.mjs";
import { askJarvis, parseAskInput, sendOwnerReply } from "../jarvis/assistant.mjs";
import { chunksFor, pickVoice, speakable } from "../jarvis/voice.mjs";
import { checkOpenJarvis, createOpenJarvisClient, fitsSchema } from "../jarvis/openjarvis.mjs";
import { wantsPersian } from "../jarvis/persian.mjs";
import { driftProblem, proofread, ruleCheck } from "../jarvis/proofread.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const owner = { email: "owner@alert.test", name: "Alex Owner" };
const GB = 1024 ** 3;

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
  assert.ok(!/font:[^;}]*\binherit\b/.test(css.split("/* generated */")[0].slice(css.indexOf(".voiceBar"))), "no font shorthand with the invalid 'inherit' family");
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
  assert.ok(!/LIKE '2026-08-09%'/.test(source), "no day-wide delete");
  const app = await startWorker("legacy");
  // The tables exist before the migration runs; plant one old seed row and two real rows from the same day.
  app.d1.sqlite.exec("CREATE TABLE IF NOT EXISTS team_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, sent_at TEXT NOT NULL)");
  const put = app.d1.sqlite.prepare("INSERT INTO team_messages (sender,recipient,body,sent_at) VALUES (?,?,?,?)");
  put.run("Admin 01", "Site Supervisor 01", "old demo seed", "2026-08-09T12:00:36.421Z");
  put.run("Ali Worker", "Owner", "REAL message in the morning", "2026-08-09T09:15:00.000Z");
  put.run("Sue Supervisor", "Owner", "REAL message in the evening", "2026-08-09T18:40:00.000Z");
  const owner3 = await app.ownerCookie();
  assert.equal((await app.request("/api/owner/data", { headers: { cookie: owner3 } })).status, 200);
  const left = app.d1.sqlite.prepare("SELECT body FROM team_messages ORDER BY id").all().map((row) => row.body);
  assert.deepEqual(left, ["REAL message in the morning", "REAL message in the evening"]);
});
