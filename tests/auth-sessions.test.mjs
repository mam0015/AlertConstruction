// Regression tests for the sign-in session findings of the October 2026 lead-engineer audit: the "waiting for approval" cookie,
// sign-out on a shared computer, and the Owner changing the password in the app.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TestD1 } from "./helpers/test-d1.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("auth");
const { request, json, cookieFrom } = app;

const join = (email, password = app.staffPassword) => request("/api/team/login", json(null, { email, password, teamCode: app.teamCode }));
const status = (cookie) => request("/api/staff/status", { headers: { cookie } });
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

// Signs a staff cookie payload exactly as the server does, so a test can change ONE field and still pass the signature check.
function signed(name, payload) {
  const key = process.env.TEAM_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${name}=${body}.${createHmac("sha256", key).update(body).digest("base64url")}`;
}
const payloadOf = (cookie) => JSON.parse(Buffer.from(cookie.split("=")[1].split(".")[0], "base64url").toString());

// Runs the FIRST database read whose SQL matches, then holds its answer until release() is called (to replay a race deterministically:
// the read sees the database as it was, and something else happens before the caller continues).
function pauseFirst(match) {
  let reached, release;
  const hit = new Promise((resolve) => { reached = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  let used = false;
  app.d1.prepare = (sql) => {
    const statement = TestD1.prototype.prepare.call(app.d1, sql);
    if (used || !match.test(sql)) return statement;
    used = true;
    return { bind: (...params) => { const bound = statement.bind(...params); return { first: async (column) => { const row = await bound.first(column); reached(); await gate; return row; }, run: () => bound.run(), all: () => bound.all() }; } };
  };
  return { hit, release: () => { delete app.d1.prepare; release(); } };
}

// Holds the FIRST write whose SQL matches until release() is called, before it is applied.
function pauseBeforeWrite(match) {
  let reached, release;
  const hit = new Promise((resolve) => { reached = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  let used = false;
  app.d1.prepare = (sql) => {
    const statement = TestD1.prototype.prepare.call(app.d1, sql);
    if (used || !match.test(sql)) return statement;
    used = true;
    return { bind: (...params) => { const bound = statement.bind(...params); return { run: async () => { reached(); await gate; return bound.run(); }, first: (column) => bound.first(column), all: () => bound.all() }; } };
  };
  return { hit, release: () => { delete app.d1.prepare; release(); } };
}

// Makes every database statement whose SQL matches fail, until the returned function is called.
function failing(match) {
  app.d1.prepare = (sql) => {
    if (!match.test(sql)) return TestD1.prototype.prepare.call(app.d1, sql);
    const boom = () => Promise.reject(new Error("D1_ERROR: injected outage"));
    const statement = { bind: () => statement, first: boom, run: boom, all: boom, batchResult: () => { throw new Error("D1_ERROR: injected outage"); } };
    return statement;
  };
  return () => { delete app.d1.prepare; };
}

async function approve(email, role = "Worker") {
  const owner = await app.ownerCookie();
  const row = app.d1.sqlite.prepare("SELECT id FROM staff_access_requests WHERE email=?").get(email);
  const saved = await request("/api/owner/data", json(owner, { resource: "staff", id: row.id, payload: { status: "Approved", role, tradeTitle: role } }, "PATCH"));
  assert.equal(saved.status, 200);
  return { owner, id: row.id };
}

test("pending cookie: signing out on a shared computer stops it from opening the workspace after approval", async () => {
  const first = await join("shared.pc@alert.test");
  assert.equal(first.status, 202);
  const pending = cookieFrom(first, "atp_staff_pending");
  assert.equal((await status(pending)).status, 200, "the waiting page works before sign-out");

  const out = await request("/api/admin/logout", { method: "POST", headers: { cookie: pending } });
  assert.equal(out.status, 200);
  assert.match(out.headers.getSetCookie().join(";"), /atp_staff_pending=;/, "the waiting cookie is cleared in the browser");

  await approve("shared.pc@alert.test");
  const after = await status(pending);
  assert.equal(after.status, 401, "a copy of the old waiting cookie is refused");
  assert.equal(after.headers.getSetCookie().length, 0, "and no staff session is handed out");

  await tick();
  const back = await join("shared.pc@alert.test");
  assert.equal(back.status, 200, "the real person can still sign in with their password");
  assert.equal((await back.json()).redirect, "/worker");
});

test("pending cookie: an Owner reset (removing the request) ends it, and someone re-joining with that e-mail does not inherit it", async () => {
  const first = await join("reset.me@alert.test");
  const pending = cookieFrom(first, "atp_staff_pending");
  const owner = await app.ownerCookie();
  const row = app.d1.sqlite.prepare("SELECT id FROM staff_access_requests WHERE email='reset.me@alert.test'").get();
  assert.equal((await request("/api/owner/data", json(owner, { resource: "staff", id: row.id }, "DELETE"))).status, 200);
  assert.equal((await status(pending)).status, 401, "the removed request's cookie stops working");

  await tick();
  assert.equal((await join("reset.me@alert.test", "Another-Person-2026!")).status, 202, "the e-mail can join again with a new password");
  await approve("reset.me@alert.test");
  const stale = await status(pending);
  assert.equal(stale.status, 401, "the old cookie (old password) never turns into the new account's session");
});

test("pending cookie: a correctly signed cookie from before the fix (no password fingerprint, no issue time) is refused", async () => {
  const first = await join("old.cookie@alert.test");
  const pending = cookieFrom(first, "atp_staff_pending");
  assert.equal((await status(pending)).status, 200, "the real cookie works");
  const current = payloadOf(pending);
  assert.equal((await status(signed("atp_staff_pending", current))).status, 200, "re-signing an unchanged payload is accepted, so the checks below test the fields, not the signature");
  const { v, iat, ...preFix } = current;
  assert.ok(v && iat);
  assert.equal((await status(signed("atp_staff_pending", preFix))).status, 401, "the pre-fix cookie shape is refused");
  assert.equal((await status(signed("atp_staff_pending", { ...current, v: "AAAAAAAAAAAA" }))).status, 401, "a wrong password fingerprint is refused");
  assert.equal((await status(signed("atp_staff_pending", { ...current, iat: undefined }))).status, 401, "a missing issue time is refused");
});

test("pending cookie: a sign-out that lands while an approval poll is in flight still ends the session that poll produces", async () => {
  const first = await join("race.poll@alert.test");
  const pending = cookieFrom(first, "atp_staff_pending");
  await approve("race.poll@alert.test");
  // The poll reads "not signed out" and is held there; the person signs out; then the poll carries on and mints a session.
  const pause = pauseFirst(/SELECT revoked_before/);
  const poll = status(pending);
  await pause.hit;
  await tick();
  const out = await request("/api/admin/logout", { method: "POST", headers: { cookie: pending } });
  assert.equal(out.status, 200);
  pause.release();
  const promoted = await poll;
  assert.equal(promoted.status, 200, "the in-flight poll had already passed its check");
  const team = cookieFrom(promoted, "atp_team_session");
  assert.equal((await request("/api/worker", { headers: { cookie: team } })).status, 401, "but the session it minted is already ended by the sign-out");
  assert.equal((await status(pending)).status, 401);
});

test("sign-out with one person's staff session and ANOTHER person's waiting cookie ends both", async () => {
  const staffA = await app.staffCookie("person.a@alert.test", "Worker");
  await tick();
  const firstB = await join("person.b@alert.test");
  const pendingB = cookieFrom(firstB, "atp_staff_pending");
  const out = await request("/api/admin/logout", { method: "POST", headers: { cookie: `${staffA}; ${pendingB}` } });
  assert.equal(out.status, 200);
  assert.equal((await request("/api/worker", { headers: { cookie: staffA } })).status, 401, "A's session copy is ended");
  await approve("person.b@alert.test");
  const replay = await status(pendingB);
  assert.equal(replay.status, 401, "B's waiting cookie copy cannot be promoted after approval");
  assert.equal(replay.headers.getSetCookie().length, 0);
});

test("sign-out reports a failure honestly, keeps the person signed in on this device, and a retry really finishes it", async () => {
  const first = await join("outage.out@alert.test");
  const pending = cookieFrom(first, "atp_staff_pending");
  const restore = failing(/INSERT INTO session_revocations/);
  let out;
  try {
    out = await request("/api/admin/logout", { method: "POST", headers: { cookie: pending } });
  } finally {
    restore();
  }
  assert.equal(out.status, 503);
  assert.match((await out.json()).error, /still signed in on this device/);
  assert.equal(out.headers.getSetCookie().length, 0, "the cookies stay, so pressing Sign out again can finish the job");
  const retry = await request("/api/admin/logout", { method: "POST", headers: { cookie: pending } });
  assert.equal(retry.status, 200);
  assert.match(retry.headers.getSetCookie().join(";"), /atp_staff_pending=;/);
  await approve("outage.out@alert.test");
  assert.equal((await status(pending)).status, 401, "after the successful retry a copy of the cookie no longer works");

  const readFailure = failing(/FROM staff_access_requests/);
  let unreadable;
  try {
    unreadable = await request("/api/admin/logout", { method: "POST", headers: { cookie: pending } });
  } finally {
    readFailure();
  }
  assert.equal(unreadable.status, 503, "a database read failure is reported too, never as a successful sign-out");
});

test("a waiting page whose cookie stopped working tells the person to sign in again instead of waiting forever", async () => {
  const page = await readFile(new URL("../app/team/pending/PendingAccess.tsx", import.meta.url), "utf8");
  assert.match(page, /response\.status === 401 \|\| response\.status === 404/, "the page reacts when the waiting session is refused");
  assert.match(page, /setStatus\("Ended"\)/);
  assert.match(page, /href="\/#team-sign-in"/, "and offers sign-in");
  // The server answers 401 for every way such a cookie stops working, which is what the page listens for.
  const pending = cookieFrom(await join("ended.page@alert.test"), "atp_staff_pending");
  assert.equal((await request("/api/admin/logout", { method: "POST", headers: { cookie: pending } })).status, 200);
  assert.equal((await status(pending)).status, 401);
  assert.equal((await status(signed("atp_staff_pending", { email: "ended.page@alert.test", purpose: "staff-approval", expires: Date.now() + 60_000 }))).status, 401, "a cookie from before this update");
});

test("a waiting cookie promoted to a staff session keeps its session id, and each sign-in gets a new one", async () => {
  const pending = cookieFrom(await join("line.keep@alert.test"), "atp_staff_pending");
  await approve("line.keep@alert.test");
  const promoted = cookieFrom(await status(pending), "atp_team_session");
  assert.match(payloadOf(pending).sid, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(payloadOf(promoted).sid, payloadOf(pending).sid);
  await tick();
  const again = cookieFrom(await request("/api/team/login", json(null, { email: "line.keep@alert.test", password: app.staffPassword })), "atp_team_session");
  assert.notEqual(payloadOf(again).sid, payloadOf(promoted).sid);
});

test("an approval check still in flight when the waiting cookie expires cannot produce a session that outlives the sign-out", async () => {
  const pending = cookieFrom(await join("expiry.race@alert.test"), "atp_staff_pending");
  await approve("expiry.race@alert.test");
  const { expires } = payloadOf(pending);
  const realNow = Date.now;
  const pause = pauseFirst(/SELECT revoked_before/);
  const poll = status(pending);
  await pause.hit; // the check has already accepted the cookie …
  Date.now = () => expires + 1000; // … and the waiting cookie expires before it finishes
  let promoted;
  try {
    const out = await request("/api/admin/logout", { method: "POST", headers: { cookie: pending } });
    assert.equal(out.status, 200, "signing out with the now-expired cookie answers normally");
    pause.release();
    promoted = await poll;
  } finally {
    Date.now = realNow;
  }
  const team = promoted.headers.getSetCookie().join(";").match(/atp_team_session=([^;]+)/)?.[1];
  if (team) {
    assert.ok(payloadOf(`atp_team_session=${team}`).expires <= expires, "a promoted session never outlives the waiting cookie");
    Date.now = () => expires + 2000;
    try {
      assert.equal((await request("/api/worker", { headers: { cookie: `atp_team_session=${team}` } })).status, 401);
    } finally {
      Date.now = realNow;
    }
  } else {
    assert.equal(promoted.status, 401, "the expired waiting cookie is not promoted");
  }
});

test("a promoted session never lasts longer than the waiting cookie it came from", async () => {
  const pending = cookieFrom(await join("short.left@alert.test"), "atp_staff_pending");
  await approve("short.left@alert.test");
  const { expires } = payloadOf(pending);
  const realNow = Date.now;
  Date.now = () => expires - 60_000; // one minute of the waiting cookie left
  let promoted;
  try { promoted = await status(pending); } finally { Date.now = realNow; }
  assert.equal(promoted.status, 200);
  const team = cookieFrom(promoted, "atp_team_session");
  assert.equal(payloadOf(team).expires, expires - 60_000 + 60_000, "the session ends when the waiting cookie would have");
  assert.match(promoted.headers.getSetCookie().join(";"), /atp_team_session=[^;]+;[^,]*Max-Age=60/);
});

test("a momentary database failure while waiting is reported as 'try again', not as an ended session", async () => {
  const pending = cookieFrom(await join("blip.wait@alert.test"), "atp_staff_pending");
  assert.equal((await status(pending)).status, 200);
  let failures = 1;
  app.d1.prepare = (sql) => {
    if (failures > 0 && /FROM staff_access_requests/.test(sql)) {
      failures -= 1;
      const boom = () => Promise.reject(new Error("D1_ERROR: injected blip"));
      const statement = { bind: () => statement, first: boom, run: boom, all: boom };
      return statement;
    }
    return TestD1.prototype.prepare.call(app.d1, sql);
  };
  let during;
  try { during = await status(pending); } finally { delete app.d1.prepare; }
  assert.equal(during.status, 503, "the page is told to try again (it keeps polling on anything but 401/404)");
  assert.equal((await status(pending)).status, 200, "and the same cookie works again once the database answers");
});

test("every staff Sign out button only leaves the page after the server confirms the sign-out", async () => {
  for (const file of ["app/team/pending/PendingAccess.tsx", "app/team/StaffShell.tsx", "app/team/hub/TeamHub.tsx", "app/admin/AdminDashboard.tsx"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /requestSignOut\(/, `${file} uses the shared sign-out`);
    assert.doesNotMatch(source, /fetch\([^)]*\/api\/(admin|owner)\/logout/, `${file} does not call a sign-out endpoint directly and ignore the answer`);
  }
  const helper = await readFile(new URL("../app/team/sign-out.ts", import.meta.url), "utf8");
  assert.match(helper, /if \(response\.ok\) return "";/);
});

test("an old, already signed-out copy of a staff cookie cannot sign the person out of their newer sessions", async () => {
  const oldSession = await app.staffCookie("stale.copy@alert.test", "Worker");
  assert.equal((await request("/api/admin/logout", { method: "POST", headers: { cookie: oldSession } })).status, 200);
  await tick();
  const fresh = await request("/api/team/login", json(null, { email: "stale.copy@alert.test", password: app.staffPassword }));
  assert.equal(fresh.status, 200);
  const newSession = cookieFrom(fresh, "atp_team_session");
  assert.equal((await request("/api/admin/logout", { method: "POST", headers: { cookie: oldSession } })).status, 200, "replaying the old cookie answers normally");
  assert.equal((await request("/api/worker", { headers: { cookie: newSession } })).status, 200, "but the newer session keeps working");
});

test("a waiting cookie from before an Owner reset cannot sign out the account that re-joined with that e-mail", async () => {
  const first = await join("rejoin.stale@alert.test");
  const oldPending = cookieFrom(first, "atp_staff_pending");
  const owner = await app.ownerCookie();
  const row = app.d1.sqlite.prepare("SELECT id FROM staff_access_requests WHERE email='rejoin.stale@alert.test'").get();
  assert.equal((await request("/api/owner/data", json(owner, { resource: "staff", id: row.id }, "DELETE"))).status, 200);
  await tick();
  const rejoined = await join("rejoin.stale@alert.test", "Second-Person-Pass-2026!");
  const newPending = cookieFrom(rejoined, "atp_staff_pending");
  await approve("rejoin.stale@alert.test");
  assert.equal((await request("/api/admin/logout", { method: "POST", headers: { cookie: oldPending } })).status, 200);
  const promoted = await status(newPending);
  assert.equal(promoted.status, 200, "the new account's waiting cookie still works");
  assert.equal((await request("/api/worker", { headers: { cookie: cookieFrom(promoted, "atp_team_session") } })).status, 200);
});

test("a staff sign-in still in flight when the account is reset and re-joined gets nothing from the new account (waiting cookie)", async () => {
  assert.equal((await join("inflight.pending@alert.test")).status, 202);
  await tick();
  // The old password has been checked; the Owner resets the account and someone re-joins with that e-mail and another password.
  const pause = pauseBeforeWrite(/UPDATE staff_access_requests SET last_seen_at/);
  const login = request("/api/team/login", json(null, { email: "inflight.pending@alert.test", password: app.staffPassword }));
  await pause.hit;
  delete app.d1.prepare;
  const owner = await app.ownerCookie();
  const row = app.d1.sqlite.prepare("SELECT id FROM staff_access_requests WHERE email='inflight.pending@alert.test'").get();
  assert.equal((await request("/api/owner/data", json(owner, { resource: "staff", id: row.id }, "DELETE"))).status, 200);
  await tick();
  const rejoined = await join("inflight.pending@alert.test", "Replacement-Person-2026!");
  assert.equal(rejoined.status, 202);
  pause.release();
  const answered = await login;
  assert.equal(answered.status, 202);
  const stale = cookieFrom(answered, "atp_staff_pending");
  await approve("inflight.pending@alert.test");
  assert.equal((await status(stale)).status, 401, "the old password's cookie is not promoted into the new account");
  const real = await status(cookieFrom(rejoined, "atp_staff_pending"));
  assert.equal(real.status, 200, "the person who re-joined is fine");
  assert.equal((await request("/api/worker", { headers: { cookie: cookieFrom(real, "atp_team_session") } })).status, 200);
});

test("a staff sign-in still in flight when the account is reset and re-joined gets nothing from the new account (full session)", async () => {
  await app.staffCookie("inflight.full@alert.test", "Worker");
  await tick();
  const pause = pauseBeforeWrite(/UPDATE staff_access_requests SET last_seen_at/);
  const login = request("/api/team/login", json(null, { email: "inflight.full@alert.test", password: app.staffPassword }));
  await pause.hit;
  delete app.d1.prepare;
  const owner = await app.ownerCookie();
  const row = app.d1.sqlite.prepare("SELECT id FROM staff_access_requests WHERE email='inflight.full@alert.test'").get();
  assert.equal((await request("/api/owner/data", json(owner, { resource: "staff", id: row.id }, "DELETE"))).status, 200);
  await tick();
  assert.equal((await join("inflight.full@alert.test", "Replacement-Person-2026!")).status, 202);
  await approve("inflight.full@alert.test");
  pause.release();
  const answered = await login;
  assert.equal(answered.status, 200);
  assert.equal((await request("/api/worker", { headers: { cookie: cookieFrom(answered, "atp_team_session") } })).status, 401, "the old password's session does not work on the new account");
});

test("two people joining with one e-mail at the same moment cannot replace each other's password", async () => {
  const pause = pauseBeforeWrite(/INSERT INTO staff_access_requests/);
  const slower = join("same.moment@alert.test", "Slower-Person-Pass-2026!");
  await pause.hit;
  delete app.d1.prepare;
  const faster = await join("same.moment@alert.test", "Faster-Person-Pass-2026!");
  assert.equal(faster.status, 202);
  pause.release();
  assert.equal((await slower).status, 401, "the slower join is refused and changes nothing");
  await approve("same.moment@alert.test");
  const signIn = (password) => request("/api/team/login", json(null, { email: "same.moment@alert.test", password }));
  assert.equal((await signIn("Slower-Person-Pass-2026!")).status, 401);
  assert.equal((await signIn("Faster-Person-Pass-2026!")).status, 200);
  assert.equal((await status(cookieFrom(faster, "atp_staff_pending"))).status, 200, "the winner's waiting cookie still works");
});

test("a staff sign-in still in flight when the person signs out does not survive the sign-out", async () => {
  const staff = await app.staffCookie("inflight.out@alert.test", "Worker");
  await tick();
  const pause = pauseBeforeWrite(/UPDATE staff_access_requests SET last_seen_at/);
  const login = request("/api/team/login", json(null, { email: "inflight.out@alert.test", password: app.staffPassword }));
  await pause.hit;
  delete app.d1.prepare;
  await tick();
  assert.equal((await request("/api/admin/logout", { method: "POST", headers: { cookie: staff } })).status, 200);
  await tick(); // the sign-in finishes strictly after the sign-out, so a cookie dated at the end of the sign-in would be newer than it
  pause.release();
  const answered = await login;
  assert.equal((await request("/api/worker", { headers: { cookie: cookieFrom(answered, "atp_team_session") } })).status, 401);
});

test("the old staff sign-in form also clears a leftover waiting cookie", async () => {
  assert.equal((await join("old.form@alert.test")).status, 202);
  await approve("old.form@alert.test");
  const answered = await request("/api/admin/login", json(null, { email: "old.form@alert.test", password: app.staffPassword }));
  assert.equal(answered.status, 200);
  const cookies = answered.headers.getSetCookie().join(";");
  assert.match(cookies, /atp_team_session=[^;]+/);
  assert.match(cookies, /atp_staff_pending=;/);
});

test("Owner password change keeps this browser signed in and signs out every other device", async () => {
  const thisBrowser = await app.ownerCookie();
  const otherDevice = await app.ownerCookie();
  const newPassword = "Owner-Changed-In-App-2026!";
  const changed = await request("/api/owner/settings", json(thisBrowser, { action: "password", currentPassword: app.ownerPassword, newPassword }, "PATCH"));
  assert.equal(changed.status, 200, await changed.clone().text());
  const fresh = cookieFrom(changed, "atp_owner_session");
  assert.equal((await request("/api/owner/data", { headers: { cookie: fresh } })).status, 200, "the Owner stays signed in after the change");
  assert.equal((await request("/api/owner/data", { headers: { cookie: otherDevice } })).status, 401, "other devices are signed out");
  assert.equal((await request("/api/owner/data", { headers: { cookie: thisBrowser } })).status, 401, "the pre-change cookie is no longer valid");
  const login = await request("/api/owner/login", json(null, { email: app.ownerEmail, password: newPassword }));
  assert.equal(login.status, 200, "the new password signs in");
});
