// Many customers and staff acting at the very same moment: nothing crashes, no reference or project code is given twice or mixed up, and the
// per-visitor limits hold even when the requests arrive together.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("cc");
const admin = await app.adminCookie("admin.cc@alert.test");
const owner = await app.ownerCookie();
const ip = (n) => ({ "cf-connecting-ip": `10.1.${Math.floor(n / 200)}.${(n % 200) + 1}` });
const counts = (list) => list.reduce((all, item) => ({ ...all, [item.status]: (all[item.status] ?? 0) + 1 }), {});
const form = (n, extra = {}) => ({ termsAccepted: "on", name: `Customer ${n}`, email: `c${n}@example.com`, phone: `04${10000000 + n}`, service: "Kitchen Renovations", location: `Suburb ${n}`, timeframe: "Soon", budget: "$20,000", material: "Stone", details: `Request ${n}`, ...extra });
const post = (n, body, address = ip(n)) => app.request("/api/workflow/public", { ...app.json(null, body), headers: { "content-type": "application/json", ...address } });
const flow = (action, caseId, payload = {}) => app.request("/api/workflow", app.json(admin, { action, caseId, payload }));

test("40 customers send a request at the same moment: all saved, every private reference different, each opens only its own request", async () => {
  const answers = await Promise.all(Array.from({ length: 40 }, (_, n) => post(n, form(n))));
  assert.deepEqual(counts(answers), { 201: 40 });
  const created = await Promise.all(answers.map(async (response) => (await response.json()).data));
  assert.equal(new Set(created.map((entry) => entry.code)).size, 40);
  assert.equal(new Set(created.map((entry) => entry.caseId)).size, 40);
  assert.ok(created.every((entry) => /^REQ-\d{4}-[0-9A-F]{32}$/.test(entry.code)));
  const pages = await Promise.all(created.map((entry, n) => app.request(`/api/workflow/public?code=${entry.code}`, { headers: ip(500 + n) })));
  for (const [n, page] of pages.entries()) {
    assert.equal(page.status, 200);
    const data = (await page.json()).data;
    assert.equal(data.requestCode, created[n].code);
    assert.equal(data.suburb, `Suburb ${n}`, "a reference opens its own customer's request and nobody else's");
  }
  const rows = app.d1.sqlite.prepare("SELECT (SELECT COUNT(*) FROM workflow_cases) AS cases, (SELECT COUNT(*) FROM request_consents) AS consents, (SELECT COUNT(*) FROM customer_contact_index) AS contacts").get();
  assert.equal(rows.cases, 40);
  assert.equal(rows.consents, 40, "every request has its consent record");
  assert.equal(rows.contacts, 80, "every request has its e-mail and phone lookup entries, nothing lost");
});

test("one visitor sending 25 requests at once gets at most 5 through (the hourly limit holds for a burst), and the rest are told to wait, not crashed", async () => {
  const same = { "cf-connecting-ip": "203.0.113.50" };
  const answers = await Promise.all(Array.from({ length: 25 }, (_, n) => post(n, form(9000 + n), same)));
  const tally = counts(answers);
  assert.ok((tally[201] ?? 0) <= 5, JSON.stringify(tally));
  assert.equal((tally[201] ?? 0) + (tally[429] ?? 0), 25, `only "saved" or "wait" answers: ${JSON.stringify(tally)}`);
  assert.ok(answers.filter((response) => response.status === 429).every((response) => Number(response.headers.get("retry-after")) > 0));
  // a request refused for a typing mistake does not use up the allowance
  const other = { "cf-connecting-ip": "203.0.113.51" };
  for (let n = 0; n < 8; n += 1) assert.equal((await post(n, form(9100 + n, { email: "not-an-email" }), other)).status, 400);
  assert.equal((await post(1, form(9200), other)).status, 201, "mistakes were given their slot back");
});

test("12 requests approved at the same moment each get their own project code, one after another, and one project folder", async () => {
  const created = await Promise.all(Array.from({ length: 12 }, async (_, n) => (await (await post(2000 + n, form(2000 + n))).json()).data));
  await Promise.all(created.map((entry) => flow("review_started", entry.caseId)));
  const answers = await Promise.all(created.map((entry) => flow("approve_intake", entry.caseId)));
  assert.deepEqual(counts(answers), { 200: 12 }, JSON.stringify(await Promise.all(answers.filter((r) => r.status !== 200).map((r) => r.json()))));
  const cases = (await (await app.request("/api/workflow", { headers: { cookie: admin } })).json()).data.cases.filter((entry) => created.some((made) => made.caseId === entry.id));
  const codes = cases.map((entry) => entry.projectCode).sort();
  assert.equal(new Set(codes).size, 12, "no project code given twice");
  const numbers = codes.map((code) => Number(code.split("-")[2]));
  assert.ok(numbers.every((value, index) => index === 0 || value === numbers[index - 1] + 1), `one after another: ${numbers}`);
  assert.ok(cases.every((entry) => entry.projectFolder === `projects/${entry.projectCode}`));
  const projects = (await (await app.request("/api/owner/data", { headers: { cookie: owner } })).json()).data.projects;
  assert.equal(projects.filter((project) => codes.includes(project.code)).length, 12, "each project exists exactly once");
});

test("approving the same request twice at the same moment (a double click, two Admins) makes ONE project", async () => {
  const entry = (await (await post(3000, form(3000))).json()).data;
  await flow("review_started", entry.caseId);
  const before = (await (await app.request("/api/owner/data", { headers: { cookie: owner } })).json()).data.projects.length;
  const answers = await Promise.all([flow("approve_intake", entry.caseId), flow("approve_intake", entry.caseId), flow("approve_intake", entry.caseId)]);
  assert.deepEqual(counts(answers), { 200: 1, 400: 2 });
  const after = (await (await app.request("/api/owner/data", { headers: { cookie: owner } })).json()).data.projects;
  assert.equal(after.length - before, 1, "exactly one project was created; the losers took theirs back");
  const projectCode = (await (await app.request("/api/workflow", { headers: { cookie: admin } })).json()).data.cases.find((item) => item.id === entry.caseId).projectCode;
  assert.ok(after.some((project) => project.code === projectCode));
});

test("the older request form: 30 at once all saved with different private references that cannot be guessed, and each opens", async () => {
  const answers = await Promise.all(Array.from({ length: 30 }, (_, n) => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ service: "Bathroom Renovations", name: `Legacy ${n}`, phone: `0455${100000 + n}`, email: `legacy${n}@example.com`, location: `Town ${n}`, timeframe: "Soon", budget: "$10,000", material: "Tile", details: `Legacy ${n}` })) data.append(key, value);
    return app.request("/api/requests", { method: "POST", headers: ip(800 + n), body: data });
  }));
  assert.deepEqual(counts(answers), { 201: 30 });
  const codes = await Promise.all(answers.map(async (response) => (await response.json()).code));
  assert.equal(new Set(codes).size, 30);
  assert.ok(codes.every((code) => /^ATP-\d{4}-[A-HJ-NP-Z2-9]{12}$/.test(code)), "12 random letters and digits, not 5 guessable digits: " + codes[0]);
  const opened = await Promise.all(codes.map((code, n) => app.request(`/api/track/${code}`, { headers: ip(900 + n) })));
  assert.deepEqual(counts(opened), { 200: 30 });
});

test("guessing a customer's reference or contact details in a burst is stopped at the limit, and the right answer still works afterwards", async () => {
  const entry = (await (await post(4000, form(4000, { email: "victim@example.com", phone: "0412000111", location: "Kew East" }))).json()).data;
  const attacker = { "cf-connecting-ip": "198.51.100.200" };
  const lookup = (location, address = attacker) => app.request("/api/workflow/public/access", { ...app.json(null, { method: "email", contact: "victim@example.com", location }), headers: { "content-type": "application/json", ...address } });
  const wrong = await Promise.all(Array.from({ length: 40 }, (_, n) => lookup(`guess ${n} wrong`)));
  const tally = counts(wrong);
  assert.ok((tally[404] ?? 0) <= 10, `at most 10 wrong guesses are answered: ${JSON.stringify(tally)}`);
  assert.equal((tally[404] ?? 0) + (tally[429] ?? 0), 40);
  // the same burst against references
  const guesses = await Promise.all(Array.from({ length: 40 }, (_, n) => app.request(`/api/workflow/public?code=REQ-2026-${String(n).padStart(32, "0")}`, { headers: { "cf-connecting-ip": "198.51.100.201" } })));
  assert.ok(guesses.filter((response) => response.status === 404).length <= 12, JSON.stringify(counts(guesses)));
  // a different, honest visitor still gets in with the right details, and a right lookup does not use up the allowance
  for (let n = 0; n < 15; n += 1) assert.equal((await lookup("Kew East", { "cf-connecting-ip": "192.0.2.77" })).status, 200);
  assert.equal(entry.code.length > 20, true);
});
