// Drives the built Worker (dist/server/index.js) end to end in Node with an in-memory D1/R2 and real sign-in cookies.
import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { TestD1, TestR2 } from "./test-d1.mjs";

function hash(value, saltText) {
  const salt = Buffer.from(saltText.padEnd(16, "0").slice(0, 16));
  return `pbkdf2$100000$${salt.toString("base64url")}$${pbkdf2Sync(value, salt, 100_000, 32, "sha256").toString("base64url")}`;
}

export async function startWorker(tag) {
  const credentials = {
    ownerEmail: `owner.${tag}@alert.test`,
    ownerPassword: `Owner-${tag}-2026!`,
    staffPassword: `Staff-${tag}-2026!`,
    teamCode: `ATP-${tag.toUpperCase()}-2026`,
  };
  process.env.OWNER_EMAIL = credentials.ownerEmail;
  process.env.OWNER_PASSWORD_HASH = hash(credentials.ownerPassword, `owner-${tag}-salt`);
  process.env.OWNER_SESSION_SECRET = `owner-session-secret-for-${tag}-verification`;
  process.env.ADMIN_TEAM_CODE_HASH = hash(credentials.teamCode, "team-code-salt");
  process.env.ADMIN_SESSION_SECRET = `admin-session-secret-for-${tag}-verification`;

  const workerUrl = new URL("../../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(tag, `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const d1 = new TestD1();
  const env = { DB: d1, BUCKET: new TestR2(), ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  globalThis.__ATP_TEST_BINDINGS__ = env;
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  // Browsers always send Origin on state-changing requests and the app rejects those without one (CSRF guard).
  async function request(path, init = {}) {
    const headers = new Headers(init.headers);
    const method = (init.method ?? "GET").toUpperCase();
    if (!["GET", "HEAD"].includes(method) && !headers.has("origin") && init.origin !== false) headers.set("origin", "http://localhost");
    const { origin: _ignored, ...rest } = init;
    return worker.fetch(new Request(`http://localhost${path}`, { ...rest, headers }), env, ctx);
  }

  function cookieFrom(response, name) {
    const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie") ?? ""];
    const match = cookies.join(";").match(new RegExp(`(?:^|[;,]\\s*)${name}=([^;]+)`));
    assert.ok(match, `Expected ${name} cookie`);
    return `${name}=${match[1]}`;
  }

  const json = (cookie, body, method = "POST") => ({ method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

  async function ownerCookie() {
    const login = await request("/api/owner/login", json(null, { email: credentials.ownerEmail, password: credentials.ownerPassword }));
    assert.equal(login.status, 200);
    return cookieFrom(login, "atp_owner_session");
  }

  // A signed-in Admin (a different role) — used to prove Jarvis is Owner-only.
  async function adminCookie(email) {
    const first = await request("/api/team/login", json(null, { email, password: credentials.staffPassword, teamCode: credentials.teamCode }));
    assert.equal(first.status, 202);
    const pending = cookieFrom(first, "atp_staff_pending");
    const owner = await ownerCookie();
    const staff = (await (await request("/api/owner/data", { headers: { cookie: owner } })).json()).data.staffRequests.find((item) => item.email === email);
    assert.ok(staff);
    assert.equal((await request("/api/owner/data", json(owner, { resource: "staff", id: staff.id, payload: { status: "Approved", role: "Admin", tradeTitle: "Admin" } }, "PATCH"))).status, 200);
    const approved = await request("/api/staff/status", { headers: { cookie: pending } });
    assert.equal(approved.status, 200);
    return cookieFrom(approved, "atp_team_session");
  }

  return { ...credentials, request, cookieFrom, json, ownerCookie, adminCookie, d1, env };
}
