import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createTables, seed, ago } from "./helpers/jarvis-fixtures.mjs";
import { TestD1, TestR2 } from "./helpers/test-d1.mjs";
import { buildBriefing, flagText, hasRealIssue, makeItem, searchItems } from "../jarvis/briefing.mjs";
import { runJarvis } from "../jarvis/jarvis.mjs";
import { assertScope, JARVIS_SCOPES, parseOptions } from "../jarvis/policy.mjs";
import { assertReadOnlySql, createReader } from "../jarvis/readonly-db.mjs";
import { parseAccounts, readCompanyEmail } from "../jarvis/sources/company-email.mjs";

function hash(value, saltText) {
  const salt = Buffer.from(saltText.padEnd(16, "0").slice(0, 16));
  return `pbkdf2$100000$${salt.toString("base64url")}$${pbkdf2Sync(value, salt, 100_000, 32, "sha256").toString("base64url")}`;
}

const ownerEmail = "owner.jarvis@alert.test";
const ownerPassword = "OwnerJarvis-2026!";
const staffPassword = "StaffJarvis-2026!";
const teamCode = "ATP-JARVIS-2026";
process.env.OWNER_EMAIL = ownerEmail;
process.env.OWNER_PASSWORD_HASH = hash(ownerPassword, "owner-jarvis-salt");
process.env.OWNER_SESSION_SECRET = "owner-session-secret-for-jarvis-verification";
process.env.ADMIN_TEAM_CODE_HASH = hash(teamCode, "team-code-salt");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-jarvis-verification";

// ---------------------------------------------------------------------------------------------------------------------
test("policy: exactly three sources, unknown ones refused, options validated", () => {
  assert.deepEqual([...JARVIS_SCOPES], ["company_email", "employee_updates", "client_comments"]);
  for (const forbidden of ["finance", "owner_accounts", "staff_access_requests", "team_chat", "passwords"]) {
    assert.throws(() => assertScope(forbidden), /no access/);
    assert.throws(() => parseOptions(new URLSearchParams({ scopes: forbidden })), (error) => error.status === 400);
  }
  assert.deepEqual(parseOptions(new URLSearchParams()).scopes, [...JARVIS_SCOPES]);
  assert.throws(() => parseOptions(new URLSearchParams({ hours: "0" })), (error) => error.status === 400);
  assert.throws(() => parseOptions(new URLSearchParams({ hours: "100000" })), (error) => error.status === 400);
  assert.throws(() => parseOptions(new URLSearchParams({ limit: "abc" })), (error) => error.status === 400);
});

test("read-only guard refuses writes, SELECT *, multiple statements and tables outside the allow-list", () => {
  const refused = [
    "INSERT INTO eod_reports (person) VALUES ('x')",
    "UPDATE eod_reports SET status='Approved'",
    "DELETE FROM eod_reports",
    "DROP TABLE eod_reports",
    "SELECT * FROM eod_reports",
    "SELECT e.* FROM eod_reports e",
    "SELECT id FROM eod_reports; DELETE FROM eod_reports",
    "SELECT id FROM finance_entries",
    "SELECT password_hash FROM owner_accounts",
    "SELECT email FROM staff_access_requests",
    "SELECT id FROM team_chat",
    "SELECT id FROM eod_reports WHERE id IN (SELECT id FROM projects)",
    "SELECT id FROM eod_reports JOIN login_attempts ON 1=1",
    "SELECT id FROM eod_reports -- comment",
    "PRAGMA table_info(eod_reports)",
    "WITH x AS (SELECT 1) SELECT 1",
  ];
  for (const sql of refused) assert.throws(() => assertReadOnlySql(sql), undefined, sql);
  assert.ok(assertReadOnlySql("SELECT id, person FROM eod_reports WHERE submitted_at >= ? ORDER BY submitted_at DESC LIMIT ?"));
  assert.ok(assertReadOnlySql("SELECT m.id AS id FROM customer_messages m LEFT JOIN workflow_cases c ON c.id = m.case_id WHERE m.sender = 'Customer' LIMIT ?"));
  assert.ok(assertReadOnlySql("SELECT id FROM team_messages WHERE sender LIKE 'Customer · %'"));
});

test("reader only ever executes guarded SELECTs", async () => {
  const d1 = new TestD1();
  createTables(d1);
  const reader = createReader(d1);
  assert.deepEqual(await reader.all("SELECT id FROM eod_reports LIMIT ?", 5), []);
  await assert.rejects(() => reader.all("DELETE FROM eod_reports"));
  assert.equal(Object.keys(reader).sort().join(), "all", "the reader exposes no run/exec/batch helpers");
});

test("briefing helpers flag what needs attention and search by keywords", () => {
  assert.ok(flagText("The customer is not happy and wants a refund").includes("complaint"));
  assert.ok(flagText("Unsafe trench").includes("safety"));
  assert.deepEqual(flagText("Framing finished on level one"), []);
  assert.equal(hasRealIssue("None"), false);
  assert.equal(hasRealIssue("n/a"), false);
  assert.equal(hasRealIssue("Supplier delay"), true);
  const items = [
    makeItem({ id: 1, source: "client_comments", kind: "customer_message", at: ago(1), title: "Comment from Sam", who: "Sam", body: "Not happy about the delay" }),
    makeItem({ id: 2, source: "employee_updates", kind: "end_of_day", at: ago(2), title: "EOD — Ali", who: "Ali", body: "Framing done" }),
  ];
  assert.equal(searchItems(items, "framing ali").length, 1);
  assert.equal(searchItems(items, "nothing like this").length, 0);
  const briefing = buildBriefing(items, { hours: 72 });
  assert.match(briefing.headline, /2 new items in the last 3 days — 1 needs your attention/);
  assert.equal(buildBriefing([], { hours: 24 }).headline, "Nothing new in the last 24 hours.");
  assert.equal(makeItem({ id: 3, source: "x", kind: "y", at: ago(1), title: "t", body: "x".repeat(2000) }).preview.length, 280);
});

test("employee updates and client comments are read-only, scoped and exclude private chat and admin replies", async () => {
  const d1 = new TestD1();
  createTables(d1);
  seed(d1);
  const result = await runJarvis({ db: d1, params: new URLSearchParams() });
  assert.equal(result.mode, "read-only");
  assert.equal(result.audience, "owner");
  assert.equal(result.sources.company_email.status, "not_connected");
  assert.equal(result.sources.employee_updates.status, "ok");
  assert.equal(result.sources.client_comments.status, "ok");

  const titles = result.items.map((item) => item.title);
  assert.ok(titles.some((title) => title.startsWith("End-of-day report — Ali Worker")));
  assert.ok(titles.some((title) => title.startsWith("Worker report — tiler@alert.test")));
  assert.ok(titles.some((title) => title.startsWith("Supervisor update")));
  assert.ok(titles.some((title) => title.startsWith("Site visit")));
  assert.ok(titles.some((title) => title.startsWith("Site issue")));
  assert.ok(titles.some((title) => title === "Comment from Sam Customer"));
  assert.ok(titles.some((title) => title.startsWith("Comment: Question about quote")));
  assert.ok(!titles.some((title) => /Ancient|Old Timer/.test(title)), "reports outside the time window are excluded");

  const everything = JSON.stringify(result);
  assert.ok(!everything.includes("PRIVATE STAFF CHAT"), "private staff chat must never be read");
  assert.ok(!everything.includes("ADMIN-ONLY"), "admin replies are not client comments");
  assert.ok(!everything.includes("sam.private@example.com") && !everything.includes("0400 000 000"), "customer contact details are not selected");

  const flagged = result.briefing.attention.map((item) => item.title);
  assert.ok(flagged.includes("Comment from Sam Customer"), "an unhappy customer is flagged");
  assert.ok(flagged.some((title) => title.startsWith("Site issue")), "an open site issue is flagged");
  assert.ok(flagged.some((title) => title.startsWith("Worker report — tiler@alert.test")), "a worker-reported issue is flagged");
  assert.ok(!flagged.some((title) => title.startsWith("Worker report — plumber@alert.test")), "'None' under issues is not flagged");

  const times = result.items.map((item) => Date.parse(item.at));
  assert.deepEqual(times, [...times].sort((a, b) => b - a), "newest first");

  const clientsOnly = await runJarvis({ db: d1, params: new URLSearchParams({ scopes: "client_comments" }) });
  assert.ok(clientsOnly.items.length > 0 && clientsOnly.items.every((item) => item.source === "client_comments"));
  assert.equal(clientsOnly.sources.employee_updates, undefined);

  const searched = await runJarvis({ db: d1, params: new URLSearchParams({ q: "framing" }) });
  assert.equal(searched.items.length, 1);

  const shortWindow = await runJarvis({ db: d1, params: new URLSearchParams({ hours: "3" }) });
  assert.ok(shortWindow.items.every((item) => Date.now() - Date.parse(item.at) <= 3.1 * 3_600_000));
});

test("missing tables are reported as empty, not as a failure", async () => {
  const result = await runJarvis({ db: new TestD1(), params: new URLSearchParams({ scopes: "employee_updates,client_comments" }) });
  assert.equal(result.sources.employee_updates.status, "empty");
  assert.equal(result.sources.client_comments.status, "empty");
  assert.equal(result.items.length, 0);
});

// ---------------------------------------------------------------------------------------------------------------------
function googleMock() {
  const calls = [];
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetchImpl = async (url, init = {}) => {
    const href = String(url);
    calls.push({ href, method: init.method ?? "GET", body: init.body ? String(init.body) : "" });
    if (href.startsWith("https://oauth2.googleapis.com/token")) {
      return String(init.body).includes("refresh_token=bad-token") ? json({ error: "invalid_grant" }, 400) : json({ access_token: "access-123" });
    }
    if (/\/users\/me\/messages\?/.test(href)) return json({ messages: [{ id: "m1" }, { id: "m2" }] });
    if (href.includes("/users/me/messages/m1")) {
      return json({ id: "m1", internalDate: String(Date.now() - 3_600_000), labelIds: ["INBOX"], snippet: "It&#39;s URGENT: the roof is leaking again",
        payload: { headers: [{ name: "From", value: "Jo Client <jo@example.com>" }, { name: "Subject", value: "Roof leak" }] } });
    }
    if (href.includes("/users/me/messages/m2")) {
      return json({ id: "m2", internalDate: String(Date.now() - 7_200_000), labelIds: ["SENT"], snippet: "Thanks, we will visit tomorrow.",
        payload: { headers: [{ name: "To", value: "jo@example.com" }, { name: "Subject", value: "Re: Roof leak" }] } });
    }
    return json({ error: "unexpected" }, 404);
  };
  return { calls, fetchImpl };
}

test("company email: Gmail is read with GET only, snippets only, per mailbox", async () => {
  const { calls, fetchImpl } = googleMock();
  const config = { clientId: "id", clientSecret: "secret", accounts: JSON.stringify([{ label: "info@alert.test", refreshToken: "good-token" }]) };
  const result = await readCompanyEmail({ config, sinceMs: Date.now() - 86_400_000, limit: 20, fetchImpl });
  assert.equal(result.status, "ok");
  assert.equal(result.items.length, 2);
  const received = result.items.find((item) => item.kind === "email_received");
  assert.equal(received.title, "Roof leak");
  assert.equal(received.mailbox, "info@alert.test");
  assert.match(received.preview, /It's URGENT/);
  assert.ok(received.flags.includes("urgent") && received.flags.includes("damage"));
  assert.match(result.items.find((item) => item.kind === "email_sent").who, /^To: jo@example\.com/);

  const gmailCalls = calls.filter((call) => call.href.startsWith("https://gmail.googleapis.com/"));
  assert.ok(gmailCalls.length >= 3);
  assert.ok(gmailCalls.every((call) => call.method === "GET"), "Jarvis never writes to Gmail");
  assert.ok(gmailCalls.every((call) => /\/gmail\/v1\/users\/me\/messages(\/[\w-]+)?(\?|$)/.test(call.href)), "only message reads");
  assert.ok(gmailCalls.some((call) => call.href.includes("format=metadata")) && !gmailCalls.some((call) => call.href.includes("format=full")), "headers/snippet only, never full bodies");
  assert.deepEqual(calls.filter((call) => call.method !== "GET").map((call) => call.href), ["https://oauth2.googleapis.com/token"], "the only POST is the token refresh");
});

test("company email: one broken mailbox does not hide the others; unconfigured is reported honestly", async () => {
  const { fetchImpl } = googleMock();
  const accounts = JSON.stringify([{ label: "info@alert.test", refreshToken: "good-token" }, { label: "accounts@alert.test", refreshToken: "bad-token" }]);
  const partial = await readCompanyEmail({ config: { clientId: "id", clientSecret: "secret", accounts }, sinceMs: Date.now() - 86_400_000, limit: 20, fetchImpl });
  assert.equal(partial.status, "partial");
  assert.deepEqual(partial.accounts.map((account) => account.status), ["ok", "error"]);
  assert.equal(partial.items.length, 2);

  assert.equal((await readCompanyEmail({ config: {}, sinceMs: 0, limit: 5, fetchImpl })).status, "not_connected");
  assert.deepEqual(parseAccounts("not json"), []);
  assert.deepEqual(parseAccounts(JSON.stringify([{ label: "", refreshToken: "x" }, { label: "ok@x", refreshToken: "t" }])), [{ label: "ok@x", refreshToken: "t", canReply: false }]);
});

test("mailbox authorisation helper asks Google for read-only access only and rejects a forged callback", async () => {
  const script = fileURLToPath(new URL("../jarvis/scripts/gmail-authorize.mjs", import.meta.url));
  const env = { ...process.env, JARVIS_GMAIL_CLIENT_ID: "client-id", JARVIS_GMAIL_CLIENT_SECRET: "client-secret" };

  const usage = spawn(process.execPath, [script], { env: { ...env, JARVIS_GMAIL_CLIENT_ID: "" }, stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(await new Promise((resolve) => usage.on("exit", resolve)), 1, "refuses to run without a mailbox and client settings");

  const child = spawn(process.execPath, [script, "info@alert.test"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  const exited = new Promise((resolve) => child.on("exit", resolve));
  const link = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("authorisation link was not printed")), 5000);
    child.stdout.on("data", () => { const found = output.match(/https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?\S+/); if (found) { clearTimeout(timer); resolve(found[0]); } });
  });
  const auth = new URL(link);
  assert.equal(auth.searchParams.get("scope"), "https://www.googleapis.com/auth/gmail.readonly", "by default only the read-only Gmail scope is requested");
  assert.equal(auth.searchParams.get("access_type"), "offline");
  assert.equal(auth.searchParams.get("login_hint"), "info@alert.test");
  const callback = await fetch(`${auth.searchParams.get("redirect_uri")}/?code=forged&state=wrong`);
  assert.equal(callback.status, 400, "a callback with the wrong state is rejected");
  assert.equal(await exited, 1);
});

test("mailbox authorisation helper asks for 'send' only when --allow-replies is given, and never anything broader", async () => {
  const script = fileURLToPath(new URL("../jarvis/scripts/gmail-authorize.mjs", import.meta.url));
  const env = { ...process.env, JARVIS_GMAIL_CLIENT_ID: "client-id", JARVIS_GMAIL_CLIENT_SECRET: "client-secret" };
  const child = spawn(process.execPath, [script, "info@alert.test", "--allow-replies"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  const exited = new Promise((resolve) => child.on("exit", resolve));
  const link = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("authorisation link was not printed")), 5000);
    child.stdout.on("data", () => { const found = output.match(/https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?\S+/); if (found) { clearTimeout(timer); resolve(found[0]); } });
  });
  const auth = new URL(link);
  assert.equal(auth.searchParams.get("scope"), "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send");
  assert.ok(!/gmail\.modify|mail\.google\.com|gmail\.compose|gmail\.settings/.test(link), "no broader Gmail scope is ever requested");
  assert.equal((await fetch(`${auth.searchParams.get("redirect_uri")}/?code=forged&state=wrong`)).status, 400);
  assert.equal(await exited, 1);
});

// ---------------------------------------------------------------------------------------------------------------------
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("jarvis-test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const d1 = new TestD1();
const env = { DB: d1, BUCKET: new TestR2(), ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
globalThis.__ATP_TEST_BINDINGS__ = env;
const ctx = { waitUntil() {}, passThroughOnException() {} };

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method) && !headers.has("origin")) headers.set("origin", "http://localhost");
  return worker.fetch(new Request(`http://localhost${path}`, { ...init, headers }), env, ctx);
}

function cookieFrom(response, name) {
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie") ?? ""];
  const match = cookies.join(";").match(new RegExp(`(?:^|[;,]\\s*)${name}=([^;]+)`));
  assert.ok(match, `Expected ${name} cookie`);
  return `${name}=${match[1]}`;
}

const json = (cookie, body, method = "POST") => ({ method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

test("Jarvis API: only the Owner session can use it, it is GET-only and returns the three sources", async () => {
  assert.equal((await request("/api/owner/jarvis")).status, 401, "anonymous visitors are refused");
  assert.equal((await request("/api/owner/jarvis", { headers: { cookie: "atp_owner_session=forged.value" } })).status, 401);

  const login = await request("/api/owner/login", json(null, { email: ownerEmail, password: ownerPassword }));
  assert.equal(login.status, 200);
  const ownerCookie = cookieFrom(login, "atp_owner_session");

  // Let the app create its own tables, then add the rest with the app's real definitions and seed them.
  assert.equal((await request("/api/owner/data", { headers: { cookie: ownerCookie } })).status, 200);
  createTables(d1);
  seed(d1);

  const response = await request("/api/owner/jarvis", { headers: { cookie: ownerCookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const body = await response.json();
  assert.equal(body.mode, "read-only");
  assert.equal(body.audience, "owner");
  assert.deepEqual(body.scopes, [...JARVIS_SCOPES]);
  assert.equal(body.sources.company_email.status, "not_connected");
  assert.ok(body.items.length >= 7);
  assert.ok(body.briefing.counts.urgent >= 3);
  assert.ok(!JSON.stringify(body).includes("PRIVATE STAFF CHAT"));

  const clientOnly = await (await request("/api/owner/jarvis?scopes=client_comments&q=quote", { headers: { cookie: ownerCookie } })).json();
  assert.equal(clientOnly.items.length, 1);

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const refused = await request("/api/owner/jarvis", { method, headers: { cookie: ownerCookie, "content-type": "application/json" }, body: "{}" });
    assert.equal(refused.status, 405, `${method} must be refused`);
    assert.equal(refused.headers.get("allow"), "GET");
  }
  for (const query of ["scopes=finance", "scopes=owner_accounts", "hours=0", "limit=100000"]) {
    assert.equal((await request(`/api/owner/jarvis?${query}`, { headers: { cookie: ownerCookie } })).status, 400, query);
  }
});

test("Jarvis API: an approved Admin (a different signed-in role) is refused", async () => {
  const staffEmail = "admin.jarvis@alert.test";
  const first = await request("/api/team/login", json(null, { email: staffEmail, password: staffPassword, teamCode }));
  assert.equal(first.status, 202);
  const pendingCookie = cookieFrom(first, "atp_staff_pending");
  assert.equal((await request("/api/owner/jarvis", { headers: { cookie: pendingCookie } })).status, 401, "a pending staff session is refused");

  const ownerCookie = cookieFrom(await request("/api/owner/login", json(null, { email: ownerEmail, password: ownerPassword })), "atp_owner_session");
  const staff = (await (await request("/api/owner/data", { headers: { cookie: ownerCookie } })).json()).data.staffRequests.find((item) => item.email === staffEmail);
  assert.ok(staff);
  assert.equal((await request("/api/owner/data", json(ownerCookie, { resource: "staff", id: staff.id, payload: { status: "Approved", role: "Admin", tradeTitle: "Admin" } }, "PATCH"))).status, 200);

  const approved = await request("/api/staff/status", { headers: { cookie: pendingCookie } });
  assert.equal(approved.status, 200);
  const adminCookie = cookieFrom(approved, "atp_team_session");
  assert.equal((await request("/api/admin/data", { headers: { cookie: adminCookie } })).status, 200, "the Admin session itself is valid");
  assert.equal((await request("/api/owner/jarvis", { headers: { cookie: adminCookie } })).status, 401, "…but Jarvis is for the Owner only");
});

test("Jarvis shows a comment a customer sends from the real tracking page (the app's own writer feeds Jarvis's reader)", async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    service: "Kitchen Renovations", name: "Jarvis Customer", phone: "0400 222 333", email: "jarvis.customer@example.com",
    location: "Test Suburb", timeframe: "Within 1–3 months", budget: "$25,000–$75,000", material: "Premium",
    details: "Request created by the Jarvis end-to-end test to prove customer comments reach the Owner.",
  })) form.set(key, value);
  const created = await request("/api/requests", { method: "POST", body: form });
  assert.equal(created.status, 201);
  const { code } = await created.json();

  const sent = await request(`/api/track/${code}/messages`, json(null, { subject: "Leak in the ceiling", message: "Water is coming through the ceiling, please call urgently." }));
  assert.equal(sent.status, 201);

  const ownerCookie = cookieFrom(await request("/api/owner/login", json(null, { email: ownerEmail, password: ownerPassword })), "atp_owner_session");
  const body = await (await request("/api/owner/jarvis?scopes=client_comments&q=ceiling", { headers: { cookie: ownerCookie } })).json();
  assert.equal(body.items.length, 1);
  const [item] = body.items;
  assert.equal(item.title, "Comment: Leak in the ceiling");
  assert.equal(item.project, code);
  assert.match(item.preview, /Water is coming through the ceiling/);
  assert.ok(item.urgent && item.flags.includes("urgent") && item.flags.includes("damage"));
  const everything = JSON.stringify(body);
  assert.ok(!everything.includes("jarvis.customer@example.com") && !everything.includes("0400 222 333"), "the customer's contact details never reach Jarvis");
});
