// Found by the security review of a local copy of the app: empty "photos", racing limits, and build folders shown to visitors.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("sh");
const admin = await app.adminCookie("admin.sh@alert.test");
const supervisor = await app.staffCookie("sup.sh@alert.test", "Site Supervisor");
const worker = await app.staffCookie("worker.sh@alert.test", "Worker");
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const ip = (n) => ({ "cf-connecting-ip": `10.9.${Math.floor(n / 250)}.${(n % 250) + 1}` });
let counter = 0;
const nextIp = () => ip((counter += 1));
const counts = (list) => list.reduce((all, item) => ({ ...all, [item.status]: (all[item.status] ?? 0) + 1 }), {});
const multipart = (fields, file) => { const form = new FormData(); for (const [key, value] of Object.entries(fields)) form.append(key, value); if (file) form.append("file", new Blob([file.bytes], { type: file.type }), file.name); return form; };
const post = (path, form, cookie = "", address = nextIp()) => app.request(path, { method: "POST", headers: { ...(cookie ? { cookie } : {}), ...address }, body: form });
const create = async (name) => (await (await app.request("/api/workflow/public", { ...app.json(null, { termsAccepted: "on", name, email: `${name.toLowerCase().replace(/\W+/g, ".")}@example.com`, phone: "0400111222", service: "Kitchen Renovations", location: `${name} Street`, timeframe: "x", budget: "x", material: "x", details: `Details ${name} ${Math.random()}` }), headers: { "content-type": "application/json", ...nextIp() } })).json()).data;

test("an empty or cut-off file is never accepted as a photo or a PDF (staff photo, team chat, customer upload)", async () => {
  const job = await create("Empty Photo");
  await app.request("/api/workflow", app.json(admin, { action: "review_started", caseId: job.caseId, payload: {} }));
  await app.request("/api/workflow", app.json(admin, { action: "approve_intake", caseId: job.caseId, payload: {} }));
  await app.request("/api/workflow", app.json(admin, { action: "assign_visit", caseId: job.caseId, payload: { supervisorEmail: "sup.sh@alert.test", supervisorName: "Sue", visitAt: "2026-11-02T10:00" } }));
  for (const bytes of [new Uint8Array(), Uint8Array.of(0x89), PNG.slice(0, 8), PNG.slice(0, 11)]) {
    const staff = await post("/api/workflow/files", multipart({ caseId: job.caseId, category: "site_visit" }, { bytes, type: "image/png", name: "x.png" }), supervisor);
    assert.equal(staff.status, 400, `staff photo of ${bytes.length} bytes`);
    const chat = await post("/api/team/chat", multipart({ to: "*", body: "x" }, { bytes, type: "image/png", name: "x.png" }), worker);
    // An empty file box means "no picture": the message goes as text only. Anything with bytes must really be a picture.
    assert.equal(chat.status, bytes.length === 0 ? 201 : 400, `chat picture of ${bytes.length} bytes`);
    const customer = await post("/api/workflow/public/files", multipart({ caseId: job.caseId, code: job.code }, { bytes, type: "image/png", name: "x.png" }));
    assert.equal(customer.status, 400, `customer file of ${bytes.length} bytes`);
  }
  assert.equal((await post("/api/workflow/public/files", multipart({ caseId: job.caseId, code: job.code }, { bytes: new TextEncoder().encode("%PDF-"), type: "application/pdf", name: "x.pdf" }))).status, 400, "a PDF that is only its first five letters");
  assert.equal((await post("/api/workflow/files", multipart({ caseId: job.caseId, category: "site_visit" }, { bytes: PNG, type: "image/png", name: "real.png" }), supervisor)).status, 201, "a real picture still works");
  assert.equal((await post("/api/workflow/public/files", multipart({ caseId: job.caseId, code: job.code }, { bytes: PNG, type: "image/png", name: "real.png" }))).status, 201);
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_files WHERE size_bytes < 12").get().n, 0, "no tiny file was recorded");
});

test("a request can hold at most 20 customer files, even when the uploads arrive at the same moment", async () => {
  const job = await create("Twenty Files");
  const answers = await Promise.all(Array.from({ length: 34 }, () => post("/api/workflow/public/files", multipart({ caseId: job.caseId, code: job.code }, { bytes: PNG, type: "image/png", name: "p.png" }))));
  const tally = counts(answers);
  assert.equal(tally[201], 20, JSON.stringify(tally));
  assert.equal(tally[400], 14);
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_files WHERE case_id=? AND category='customer_request'").get(job.caseId).n, 20);
  const stored = [...app.env.BUCKET.objects.keys()].filter((key) => key.includes(job.code) && key.includes("customer-intake")).length;
  assert.equal(stored, 20, "the 14 refused uploads left nothing behind in storage");
});

test("a stranger's upload attempts are limited per address (60 an hour), taken before anything is read", async () => {
  const same = ip(9999);
  const answers = await Promise.all(Array.from({ length: 70 }, () => post("/api/workflow/public/files", multipart({ caseId: 1, code: "REQ-2026-" + "A".repeat(32) }, { bytes: PNG, type: "image/png", name: "p.png" }), "", same)));
  const tally = counts(answers);
  assert.equal(tally[429], 10, JSON.stringify(tally));
  assert.equal((tally[400] ?? 0) + (tally[429] ?? 0), 70);
  assert.equal((await post("/api/workflow/public/files", multipart({ caseId: 1, code: "x" }, { bytes: PNG, type: "image/png", name: "p.png" }), "", ip(9998))).status, 400, "another address is not affected");
});

test("wrong sign-in answers are limited in a burst: at most 15 guesses per address, then a lock; correct sign-ins do not use up the allowance", async () => {
  const attacker = ip(7777);
  const wrong = (address) => app.request("/api/owner/login", { ...app.json(null, { email: app.ownerEmail, password: `wrong-${Math.random()}` }), headers: { "content-type": "application/json", ...address } });
  const tally = counts(await Promise.all(Array.from({ length: 50 }, () => wrong(attacker))));
  assert.equal(tally[401], 8, `8 wrong answers per address and e-mail: ${JSON.stringify(tally)}`);
  assert.equal(tally[429], 42);
  // changing the e-mail does not help: 15 wrong answers per address in all
  const roaming = ip(7780);
  const many = counts(await Promise.all(Array.from({ length: 50 }, (_, n) => app.request("/api/owner/login", { ...app.json(null, { email: `person${n}@example.com`, password: "wrong-password" }), headers: { "content-type": "application/json", ...roaming } }))));
  assert.equal(many[401], 15, JSON.stringify(many));
  assert.equal(many[429], 35);
  const right = (address) => app.request("/api/owner/login", { ...app.json(null, { email: app.ownerEmail, password: app.ownerPassword }), headers: { "content-type": "application/json", ...address } });
  assert.equal((await right(attacker)).status, 429, "the locked address is locked, even with the right password");
  const honest = ip(7778);
  for (let n = 0; n < 12; n += 1) assert.equal((await right(honest)).status, 200, `correct sign-in number ${n + 1} from another address`);
  assert.equal((await wrong(honest)).status, 401, "…and a slip afterwards is just a slip");
});

test("pages and headers never show folders of the machine that built the site", async () => {
  for (const path of ["/", "/owner", "/no-such-page"]) {
    const response = await app.request(path, { headers: nextIp() });
    const body = await response.text();
    assert.doesNotMatch(response.headers.get("link") ?? "", /\/home\/|\/runner\/|\.vinext|\.woff2/, path);
    assert.doesNotMatch(body, /\/home\/|\/runner\/work|\.vinext\/|\.woff2/, path);
  }
});

test("files served straight from the asset store (scripts, styles, images) carry the security headers too, and hashed assets stay cacheable for a year", async () => {
  const headers = await readFile(new URL("../dist/client/_headers", import.meta.url), "utf8");
  for (const line of ["X-Content-Type-Options: nosniff", "X-Frame-Options: DENY", "Referrer-Policy: no-referrer", "Strict-Transport-Security: max-age=31536000"]) assert.ok(headers.includes(line), line);
  assert.match(headers, /\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});

test("looking a project up by e-mail needs a real piece of the address: 'street', 'road', 'Melbourne' or a few letters prove nothing", async () => {
  const mk = async (name, email, location) => (await (await app.request("/api/workflow/public", { ...app.json(null, { termsAccepted: "on", name, email, phone: "0400222333", service: "Kitchen Renovations", location, timeframe: "x", budget: "x", material: "x", details: `Lookup test ${name}` }), headers: { "content-type": "application/json", ...nextIp() } })).json()).data;
  const owner = await mk("Lookup Owner", "lookup.owner@example.com", "Unit 5/12 Smith Street, Kew East, Melbourne");
  const ask = (location, address = nextIp()) => app.request("/api/workflow/public/access", { ...app.json(null, { method: "email", contact: "lookup.owner@example.com", location }), headers: { "content-type": "application/json", ...address } });
  for (const weak of ["Street", "stre", "road", "Melbourne", "Victoria Australia", "east", "12 st", "unit 5"]) {
    const response = await ask(weak);
    assert.ok([400, 404].includes(response.status), `${weak} → ${response.status}`);
    assert.notEqual(response.status, 200, `"${weak}" must not open the project`);
  }
  for (const right of ["Smith", "smith st", "Kew East", "Kew", "12 Smith Street", "Unit 5/12 Smith Street, Kew East"]) {
    const response = await ask(right.length < 4 ? right + " East" : right);
    assert.equal(response.status, 200, right);
    assert.equal((await response.json()).projects[0].requestCode, owner.code);
  }
  assert.equal((await ask("Smi")).status, 400, "three letters of a word are not enough");
  assert.equal((await ask("Smit")).status, 404, "half a word does not match");
  assert.equal((await ask("Brunswick")).status, 404, "a place that is not in the address does not match");
});

test("each customer's e-mail can be guessed at only 12 times an hour and 30 times a day, however many addresses the guesser uses", async () => {
  const target = "guess.target@example.com";
  await app.request("/api/workflow/public", { ...app.json(null, { termsAccepted: "on", name: "Guess Target", email: target, phone: "0400555666", service: "Kitchen Renovations", location: "77 Wattle Road, Hawthorn", timeframe: "x", budget: "x", material: "x", details: "guess target" }), headers: { "content-type": "application/json", ...nextIp() } });
  const guess = (n) => app.request("/api/workflow/public/access", { ...app.json(null, { method: "email", contact: target, location: `Guess${n} Place` }), headers: { "content-type": "application/json", ...nextIp() } });
  const answers = [];
  for (let n = 0; n < 20; n += 1) answers.push(await guess(n));
  const tally = counts(answers);
  assert.equal(tally[404], 12, JSON.stringify(tally));
  assert.equal(tally[429], 8);
});
