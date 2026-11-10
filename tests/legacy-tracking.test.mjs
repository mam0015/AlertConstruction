// Regression test for the October 2026 lead-engineer audit: the old tracking page's message form counted each reference separately,
// so it answered "valid / invalid" for every five-digit code without limit and let one visitor post unlimited messages to Admin.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("legacy");
const { request, json } = app;
const from = (init, address) => ({ ...init, headers: { ...init.headers, "cf-connecting-ip": address } });
const note = { subject: "Question", message: "When will someone call me back?" };

const form = new FormData();
for (const [key, value] of Object.entries({ service: "Kitchen Renovations", name: "Legacy Person", phone: "0400 111 222", email: "legacy@example.com", location: "Rowville", timeframe: "Soon", budget: "$25k", material: "Premium", details: "Please renovate the whole kitchen, this is a detailed enough description." })) form.set(key, value);
const created = await request("/api/requests", { method: "POST", body: form, headers: { "cf-connecting-ip": "203.0.113.50" } });
assert.equal(created.status, 201, await created.clone().text());
const { code } = await created.json();
const adminInbox = () => app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM team_messages WHERE recipient='Admin'").get().n;

test("legacy messages: trying many references is stopped, and a stopped visitor cannot reach a real reference either", async () => {
  const statuses = [];
  for (let guess = 0; guess < 15; guess += 1) {
    statuses.push((await request(`/api/track/ATP-2026-${String(20000 + guess)}/messages`, from(json(null, note), "198.51.100.20"))).status);
  }
  assert.ok(statuses.slice(0, 12).every((status) => status === 404), statuses.join(","));
  assert.ok(statuses.slice(12).every((status) => status === 429), "after 12 wrong references the visitor is blocked");
  assert.equal((await request(`/api/track/${code}/messages`, from(json(null, note), "198.51.100.20"))).status, 429, "no oracle once blocked");
  assert.equal((await request(`/api/track/${code}`, { headers: { "cf-connecting-ip": "198.51.100.20" } })).status, 429, "the lookup page shares the same budget");
});

test("legacy messages: a real customer can write, but one visitor cannot flood Admin's inbox", async () => {
  const before = adminInbox();
  const statuses = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    statuses.push((await request(`/api/track/${code}/messages`, from(json(null, note), "198.51.100.30"))).status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(201));
  assert.deepEqual(statuses.slice(10), [429, 429]);
  assert.equal(adminInbox() - before, 10);
});

test("legacy messages: many visitors together cannot flood one reference either", async () => {
  // The visitor above already sent 10 to this reference this hour; the reference accepts 20 an hour from everyone together.
  const before = adminInbox();
  const statuses = [];
  for (const visitor of ["198.51.100.40", "198.51.100.41"]) {
    for (let attempt = 0; attempt < 10; attempt += 1) statuses.push((await request(`/api/track/${code}/messages`, from(json(null, note), visitor))).status);
  }
  assert.equal(statuses.filter((status) => status === 201).length, 10, statuses.join(","));
  assert.equal(statuses.filter((status) => status === 429).length, 10);
  assert.equal(adminInbox() - before, 10);
});

test("legacy messages: an empty form is refused without using up the visitor's reference allowance", async () => {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    assert.equal((await request(`/api/track/ATP-2026-30000/messages`, from(json(null, { subject: "", message: "" }), "198.51.100.50"))).status, 400);
  }
  assert.equal((await request(`/api/track/ATP-2026-30001/messages`, from(json(null, note), "198.51.100.50"))).status, 404, "a real lookup is still allowed");
});

test("legacy tracking: a database outage is not counted as wrong guesses, so the visitor is not locked out afterwards", async () => {
  const { TestD1 } = await import("./helpers/test-d1.mjs");
  app.d1.prepare = (sql) => {
    if (!/FROM job_requests WHERE code=\?/.test(sql)) return TestD1.prototype.prepare.call(app.d1, sql);
    const boom = () => Promise.reject(new Error("D1_ERROR: injected outage"));
    const statement = { bind: () => statement, first: boom, run: boom, all: boom };
    return statement;
  };
  const during = [];
  try {
    for (let attempt = 0; attempt < 14; attempt += 1) {
      during.push((await request(`/api/track/${code}/messages`, from(json(null, note), "198.51.100.60"))).status);
      during.push((await request(`/api/track/${code}`, { headers: { "cf-connecting-ip": "198.51.100.60" } })).status);
    }
  } finally {
    delete app.d1.prepare;
  }
  assert.ok(during.every((status) => status === 503), during.join(","));
  assert.equal((await request(`/api/track/${code}`, { headers: { "cf-connecting-ip": "198.51.100.60" } })).status, 200, "after recovery the lookup works");
  assert.equal((await request(`/api/track/ATP-2026-40000/messages`, from(json(null, note), "198.51.100.60"))).status, 404, "and the visitor still has their wrong-guess allowance");
});
