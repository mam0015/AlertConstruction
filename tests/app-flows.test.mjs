import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

function hash(value, saltText) {
  const salt = Buffer.from(saltText.padEnd(16, "0").slice(0, 16));
  return `pbkdf2$100000$${salt.toString("base64url")}$${pbkdf2Sync(value, salt, 100_000, 32, "sha256").toString("base64url")}`;
}

const ownerEmail = "owner.qa@alert.test";
const ownerPassword = "OwnerQA-2026!";
const staffPassword = "StaffQA-2026!";
const teamCode = "ATP-QA-2026";

process.env.OWNER_EMAIL = ownerEmail;
process.env.OWNER_PASSWORD_HASH = hash(ownerPassword, "owner-test-salt");
process.env.OWNER_SESSION_SECRET = "owner-session-secret-for-automated-verification";
process.env.ADMIN_TEAM_CODE_HASH = hash(teamCode, "team-code-salt");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-automated-verification";

class PreparedStatement {
  constructor(db, sql, params = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...params) { return new PreparedStatement(this.db, this.sql, params); }
  run() {
    const result = this.db.prepare(this.sql).run(...this.params);
    return Promise.resolve({ success: true, meta: { changes: Number(result.changes ?? 0), last_row_id: Number(result.lastInsertRowid ?? 0) } });
  }
  first(column) {
    const row = this.db.prepare(this.sql).get(...this.params) ?? null;
    return Promise.resolve(column && row ? row[column] ?? null : row);
  }
  all() { return Promise.resolve({ success: true, results: this.db.prepare(this.sql).all(...this.params) }); }
  batchResult() {
    const statement = this.db.prepare(this.sql);
    if (/^\s*(select|pragma|with)\b/i.test(this.sql)) return { success: true, results: statement.all(...this.params) };
    const result = statement.run(...this.params);
    return { success: true, results: [], meta: { changes: Number(result.changes ?? 0), last_row_id: Number(result.lastInsertRowid ?? 0) } };
  }
}

class TestD1 {
  constructor() { this.sqlite = new DatabaseSync(":memory:"); }
  prepare(sql) { return new PreparedStatement(this.sqlite, sql); }
  async batch(statements) { return statements.map((statement) => statement.batchResult()); }
  close() { this.sqlite.close(); }
}

class TestR2 {
  constructor() { this.objects = new Map(); }
  async put(key, value, options) { this.objects.set(key, { value: Buffer.from(value), options }); }
  async delete(key) { this.objects.delete(key); }
}

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("flow-test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const db = new TestD1();
const bucket = new TestR2();
const env = {
  DB: db,
  BUCKET: bucket,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
globalThis.__ATP_TEST_BINDINGS__ = env;
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function request(path, init = {}) {
  return worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);
}

function cookieFrom(response, name) {
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie") ?? ""];
  const match = cookies.join(";").match(new RegExp(`(?:^|[;,]\\s*)${name}=([^;]+)`));
  assert.ok(match, `Expected ${name} cookie`);
  return `${name}=${match[1]}`;
}

test("protected Owner and Admin APIs reject anonymous access", async () => {
  assert.equal((await request("/api/owner/data")).status, 401);
  assert.equal((await request("/api/admin/data")).status, 401);
});

test("Owner login, finance persistence and server-side session protection work", async () => {
  const wrong = await request("/api/owner/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: ownerEmail, password: "wrong" }) });
  assert.equal(wrong.status, 401);

  const login = await request("/api/owner/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: ownerEmail, password: ownerPassword }) });
  assert.equal(login.status, 200);
  const ownerCookie = cookieFrom(login, "atp_owner_session");

  const create = await request("/api/owner/data", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ownerCookie },
    body: JSON.stringify({ resource: "finance", payload: { type: "Income", category: "QA invoice", projectCode: "Business / General", amount: 12345, entryDate: "2026-08-10", note: "Automated verification" } }),
  });
  assert.equal(create.status, 201);
  const payload = await create.json();
  assert.ok(payload.data.financeEntries.some((entry) => entry.category === "QA invoice" && Number(entry.amount) === 12345));
});

test("public request, file upload, tracking and customer message persist", async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    service: "Kitchen Renovations", name: "QA Customer", phone: "0400 111 222",
    email: "qa.customer@example.com", location: "Test Suburb", timeframe: "Within 1–3 months",
    budget: "$25,000–$75,000", material: "Premium", details: "Automated request verifying persistent intake, tracking and secure attachment storage.",
  })) form.set(key, value);
  form.append("files", new File(["test attachment"], "qa-plan.pdf", { type: "application/pdf" }));

  const response = await request("/api/requests", { method: "POST", body: form });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.match(created.code, /^ATP-\d{4}-(?:\d{5}|[A-F0-9-]+)$/);
  assert.equal(bucket.objects.size, 1);

  const tracking = await request(`/api/track/${created.code}`);
  assert.equal(tracking.status, 200);
  const tracked = await tracking.json();
  assert.equal(tracked.recordType, "request");
  assert.equal(tracked.attachmentCount, 1);
  assert.equal(tracked.service, "Kitchen Renovations");

  const message = await request(`/api/track/${created.code}/messages`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ subject: "QA follow-up", message: "Please confirm that this message is attached to the request." }),
  });
  assert.equal(message.status, 201);
});

test("new staff remains pending until Owner assigns Admin, then receives restricted data", async () => {
  const staffEmail = "new.admin.qa@alert.test";
  const firstLogin = await request("/api/team/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: staffEmail, password: staffPassword, teamCode }),
  });
  assert.equal(firstLogin.status, 202);
  const pendingCookie = cookieFrom(firstLogin, "atp_staff_pending");
  const pending = await request("/api/staff/status", { headers: { cookie: pendingCookie } });
  assert.equal((await pending.json()).status, "Pending");

  const ownerLogin = await request("/api/owner/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: ownerEmail, password: ownerPassword }) });
  const ownerCookie = cookieFrom(ownerLogin, "atp_owner_session");
  const ownerData = await request("/api/owner/data", { headers: { cookie: ownerCookie } });
  const snapshot = (await ownerData.json()).data;
  const staff = snapshot.staffRequests.find((item) => item.email === staffEmail);
  assert.ok(staff);

  const approval = await request("/api/owner/data", {
    method: "PATCH", headers: { "content-type": "application/json", cookie: ownerCookie },
    body: JSON.stringify({ resource: "staff", id: staff.id, payload: { status: "Approved", role: "Admin", tradeTitle: "Admin QA" } }),
  });
  assert.equal(approval.status, 200);

  const approved = await request("/api/staff/status", { headers: { cookie: pendingCookie } });
  assert.equal(approved.status, 200);
  const approvedBody = await approved.json();
  assert.equal(approvedBody.redirect, "/admin");
  const adminCookie = cookieFrom(approved, "atp_admin_session");

  const adminData = await request("/api/admin/data", { headers: { cookie: adminCookie } });
  assert.equal(adminData.status, 200);
  const adminSnapshot = (await adminData.json()).data;
  assert.equal("financeEntries" in adminSnapshot, false);
  assert.equal(Number(adminSnapshot.permissions.finance), 0);
  assert.ok(adminSnapshot.requests.some((item) => item.customerName === "QA Customer" && Number(item.attachmentCount) === 1));

  const financeAttempt = await request("/api/admin/data", {
    method: "POST", headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ resource: "finance", payload: { amount: 1 } }),
  });
  assert.equal(financeAttempt.status, 400);
});

test.after(() => { delete globalThis.__ATP_TEST_BINDINGS__; db.close(); });
