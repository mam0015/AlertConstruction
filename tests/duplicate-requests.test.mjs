// The same e-mail sending the same request in the same words (same service, same address) is ONE request. Any difference at all makes two.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("dup");
const admin = await app.adminCookie("admin.dup@alert.test");
let counter = 0;
const send = (body, address = `10.2.0.${(counter += 1)}`) => app.request("/api/workflow/public", { ...app.json(null, body), headers: { "content-type": "application/json", "cf-connecting-ip": address } });
const base = (extra = {}) => ({ termsAccepted: "on", name: "Dana Whitaker", email: "dana@example.com", phone: "0412345678", service: "Bathroom Renovations", location: "12 Smith St, Kew", timeframe: "Soon", budget: "$30,000", material: "Tile", details: "Replace the bath with a walk-in shower and a new vanity.", ...extra });
const cases = () => app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_cases").get().n;
const fresh = (n) => ({ email: `person${n}@example.com` }); // a different customer for each test, so tests never see each other's requests

test("the same e-mail, address and words sent twice: only one request is saved, and a quick retry gets the same reference back", async () => {
  const body = base(fresh(1));
  const first = await send(body);
  assert.equal(first.status, 201);
  const a = (await first.json()).data;
  const before = cases();
  const second = await send(body);
  assert.equal(second.status, 200, "recognised, not an error");
  const b = (await second.json()).data;
  assert.equal(b.duplicate, true);
  assert.equal(b.code, a.code);
  assert.equal(b.caseId, a.caseId);
  assert.equal(cases(), before, "nothing new was saved");
  const rows = app.d1.sqlite.prepare("SELECT (SELECT COUNT(*) FROM request_consents WHERE case_id=?) AS c, (SELECT COUNT(*) FROM customer_contact_index WHERE case_id=?) AS i").get(a.caseId, a.caseId);
  assert.deepEqual({ ...rows }, { c: 1, i: 2 });
});

test("capitals, extra spaces and line breaks do not make a request different", async () => {
  const first = await send(base(fresh(2)));
  const a = (await first.json()).data;
  const again = await send(base({ ...fresh(2), email: "PERSON2@Example.com ", details: "  REPLACE the bath with a   walk-in shower\nand a new vanity.  ", location: "12 smith st,  kew" }));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).data.caseId, a.caseId);
});

test("any difference makes a separate request: another word, another address, another service, another e-mail", async () => {
  const body = base(fresh(3));
  const first = (await (await send(body)).json()).data;
  const before = cases();
  const variants = [
    { details: "Replace the bath with a walk-in shower and a new vanity unit." },
    { location: "14 Smith St, Kew" },
    { service: "Home Renovations" },
    { email: "someone.else@example.com" },
  ];
  const codes = new Set([first.code]);
  for (const variant of variants) {
    const response = await send({ ...body, ...variant });
    assert.equal(response.status, 201, JSON.stringify(variant));
    const made = (await response.json()).data;
    assert.ok(!made.duplicate && made.code && !codes.has(made.code));
    codes.add(made.code);
  }
  assert.equal(cases() - before, 4);
  // a different budget, timeframe, material or phone with the same words is still the same job
  const same = await send({ ...body, budget: "$99,999", timeframe: "Next year", material: "Stone", phone: "0499999999" });
  assert.equal(same.status, 200);
  assert.equal((await same.json()).data.caseId, first.caseId);
});

test("later on, a duplicate is still not saved, but the private reference is NOT handed back (e-mail and wording alone do not prove who is asking)", async () => {
  const body = base(fresh(4));
  const first = (await (await send(body)).json()).data;
  app.d1.sqlite.prepare("UPDATE workflow_cases SET created_at=? WHERE id=?").run(new Date(Date.now() - 10 * 60_000).toISOString(), first.caseId);
  const before = cases();
  const late = await send(body);
  assert.equal(late.status, 200);
  const answer = (await late.json()).data;
  assert.deepEqual(answer, { duplicate: true }, "no code, no case number, nothing about the earlier request");
  assert.equal(cases(), before);
  // the same holds once the request has been worked on, even within minutes
  const worked = (await (await send(base(fresh(5)))).json()).data;
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='admin_review' WHERE id=?").run(worked.caseId);
  assert.deepEqual((await (await send(base(fresh(5)))).json()).data, { duplicate: true });
});

test("a request that is closed or complete never blocks a new one", async () => {
  const body = base(fresh(6));
  const first = (await (await send(body)).json()).data;
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='closed' WHERE id=?").run(first.caseId);
  const again = await send(body);
  assert.equal(again.status, 201);
  assert.notEqual((await again.json()).data.caseId, first.caseId);
});

test("ten identical requests at the same moment leave exactly one, and everyone is told the same thing", async () => {
  const body = base(fresh(7));
  const before = cases();
  const answers = await Promise.all(Array.from({ length: 10 }, () => send(body)));
  const data = await Promise.all(answers.map(async (response) => ({ status: response.status, ...(await response.json()).data })));
  assert.equal(cases() - before, 1, "one request saved");
  const winners = data.filter((item) => !item.duplicate);
  assert.equal(winners.length, 1, JSON.stringify(data.map((item) => [item.status, item.duplicate])));
  assert.ok(data.filter((item) => item.duplicate).every((item) => item.code === winners[0].code && item.caseId === winners[0].caseId), "every retry gets the one reference");
  const rows = app.d1.sqlite.prepare("SELECT (SELECT COUNT(*) FROM request_consents) AS c, (SELECT COUNT(*) FROM customer_contact_index) AS i, (SELECT COUNT(*) FROM request_fingerprints) AS f, (SELECT COUNT(*) FROM workflow_cases) AS w").get();
  assert.equal(rows.c, rows.w, "no orphan consent rows left by the losers");
  assert.equal(rows.i, rows.w * 2);
  assert.equal(rows.f, rows.w);
});

test("Admin sees one request, and the audit trail has the customer's submission once", async () => {
  const body = base(fresh(8));
  await Promise.all([send(body), send(body), send(body)]);
  const mine = (await (await app.request("/api/workflow", { headers: { cookie: admin } })).json()).data.cases.filter((entry) => entry.customerEmail === "person8@example.com");
  assert.equal(mine.length, 1);
  const events = (await (await app.request("/api/workflow", { headers: { cookie: admin } })).json()).data.events.filter((entry) => entry.caseId === mine[0].id && entry.eventType === "request_submitted");
  assert.equal(events.length, 1);
});
