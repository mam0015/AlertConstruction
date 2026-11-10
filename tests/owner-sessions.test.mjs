// Regression tests for the Owner side of sign-out (lead-engineer audit, October 2026, Codex review round 3): Owner sign-out must report a
// failure honestly, a password or e-mail change racing a sign-out must not bring the session back, and signing out must end every
// identity on a shared computer (Owner, staff session and "waiting for approval" cookie) whichever Sign out button is pressed.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TestD1 } from "./helpers/test-d1.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("owner");
const { request, json, cookieFrom } = app;
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const ownerData = (cookie) => request("/api/owner/data", { headers: { cookie } });
const signOut = (endpoint, cookie) => request(endpoint, { method: "POST", headers: cookie ? { cookie } : {} });
const join = (email) => request("/api/team/login", json(null, { email, password: app.staffPassword, teamCode: app.teamCode }));

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

// Holds the FIRST write whose SQL matches until release() is called, before it is applied (replays a race deterministically: the request
// has already been authenticated, and something else happens before it continues).
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

// Same, but the write is applied first and the answer is held: the database already has the new value when something else happens.
function pauseAfterWrite(match) {
  let reached, release;
  const hit = new Promise((resolve) => { reached = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  let used = false;
  app.d1.prepare = (sql) => {
    const statement = TestD1.prototype.prepare.call(app.d1, sql);
    if (used || !match.test(sql)) return statement;
    used = true;
    return { bind: (...params) => { const bound = statement.bind(...params); return { run: async () => { const result = await bound.run(); reached(); await gate; return result; }, first: (column) => bound.first(column), all: () => bound.all() }; } };
  };
  return { hit, release: () => { delete app.d1.prepare; release(); } };
}

const payloadOf = (cookie) => JSON.parse(Buffer.from(cookie.split("=")[1].split(".")[0], "base64url").toString());

test("Owner sign-out reports a failure honestly, keeps the Owner signed in on this device, and a retry really finishes it", async () => {
  const owner = await app.ownerCookie();
  const restore = failing(/INSERT INTO session_revocations/);
  let out;
  try { out = await signOut("/api/owner/logout", owner); } finally { restore(); }
  assert.equal(out.status, 503);
  assert.match((await out.json()).error, /still signed in on this device/);
  assert.equal(out.headers.getSetCookie().length, 0, "the cookie stays so the retry can finish the job");
  const retry = await signOut("/api/owner/logout", owner);
  assert.equal(retry.status, 200);
  assert.equal((await ownerData(owner)).status, 401, "after the retry a copy of the cookie no longer works");

  const again = await app.ownerCookie();
  const readFailure = failing(/FROM owner_accounts/);
  let unreadable;
  try { unreadable = await signOut("/api/owner/logout", again); } finally { readFailure(); }
  assert.equal(unreadable.status, 503, "a database read failure is reported too, never as a successful sign-out");
  assert.equal((await ownerData(again)).status, 200, "and nothing was signed out by the failed attempt");
});

test("an Owner password change that is still in flight when the Owner signs out does not bring the session back", async () => {
  const owner = await app.ownerCookie();
  const pause = pauseBeforeWrite(/UPDATE owner_accounts SET password_hash/);
  const change = request("/api/owner/settings", json(owner, { action: "password", currentPassword: app.ownerPassword, newPassword: "Raced-Owner-Pass-2026!" }, "PATCH"));
  await pause.hit;
  await tick();
  // The change has been authenticated but not saved yet; meanwhile the Owner signs out with the same cookie.
  assert.equal((await signOut("/api/owner/logout", owner)).status, 200);
  await tick(); // the change finishes strictly after the sign-out, so a freshly issued cookie would be newer than it
  pause.release();
  const changed = await change;
  assert.equal(changed.status, 200);
  const refreshed = cookieFrom(changed, "atp_owner_session");
  assert.equal((await ownerData(refreshed)).status, 401, "the refreshed cookie from the in-flight change is ended by the sign-out");
  // put the password back for the other tests
  const back = cookieFrom(await request("/api/owner/login", json(null, { email: app.ownerEmail, password: "Raced-Owner-Pass-2026!" })), "atp_owner_session");
  assert.equal((await request("/api/owner/settings", json(back, { action: "password", currentPassword: "Raced-Owner-Pass-2026!", newPassword: app.ownerPassword }, "PATCH"))).status, 200);
});

test("an Owner e-mail change that is still in flight when the Owner signs out does not bring the session back under the new e-mail", async () => {
  const owner = await app.ownerCookie();
  const pause = pauseBeforeWrite(/UPDATE owner_accounts SET email/);
  const change = request("/api/owner/settings", json(owner, { action: "profile", currentPassword: app.ownerPassword, email: "owner.moved@alert.test", displayName: "Owner" }, "PATCH"));
  await pause.hit;
  await tick();
  // Signed out under the OLD e-mail while the change to the new e-mail is in flight.
  assert.equal((await signOut("/api/owner/logout", owner)).status, 200);
  await tick(); // the change finishes strictly after the sign-out, so a freshly issued cookie would be newer than it
  pause.release();
  const changed = await change;
  assert.equal(changed.status, 200);
  assert.equal((await ownerData(cookieFrom(changed, "atp_owner_session"))).status, 401, "the e-mail change cannot step around the sign-out");
  await tick();
  const back = cookieFrom(await request("/api/owner/login", json(null, { email: "owner.moved@alert.test", password: app.ownerPassword })), "atp_owner_session");
  assert.equal((await request("/api/owner/settings", json(back, { action: "profile", currentPassword: app.ownerPassword, email: app.ownerEmail, displayName: "Owner" }, "PATCH"))).status, 200);
});

test("Sign out AFTER a new password is saved but before its answer arrives: the refreshed cookie does not bring the session back", async () => {
  await tick();
  const owner = await app.ownerCookie();
  const iat = payloadOf(owner).iat;
  const pause = pauseAfterWrite(/UPDATE owner_accounts SET password_hash/);
  const change = request("/api/owner/settings", json(owner, { action: "password", currentPassword: app.ownerPassword, newPassword: "Committed-Owner-Pass-2026!" }, "PATCH"));
  await pause.hit;
  // The password is saved, so this browser's cookie is now out of date, and this is still the same person pressing Sign out.
  const out = await signOut("/api/owner/logout", owner);
  assert.equal(out.status, 200);
  const line = payloadOf(owner).sid;
  assert.ok(app.d1.sqlite.prepare("SELECT 1 FROM session_revocations WHERE subject = ?").get(`line:owner:account:${line}`), "the sign-out ends this cookie's own session line even though the cookie is out of date");
  assert.ok(iat > 0);
  pause.release();
  const changed = await change;
  assert.equal(changed.status, 200);
  assert.equal((await ownerData(cookieFrom(changed, "atp_owner_session"))).status, 401, "the refreshed cookie arriving after the sign-out does not work");
  await tick();
  const back = cookieFrom(await request("/api/owner/login", json(null, { email: app.ownerEmail, password: "Committed-Owner-Pass-2026!" })), "atp_owner_session");
  assert.equal((await ownerData(back)).status, 200, "signing in afterwards works");
  assert.equal((await request("/api/owner/settings", json(back, { action: "password", currentPassword: "Committed-Owner-Pass-2026!", newPassword: app.ownerPassword }, "PATCH"))).status, 200);
});

test("Sign out AFTER a new e-mail is saved but before its answer arrives: the refreshed cookie does not bring the session back", async () => {
  await tick();
  const owner = await app.ownerCookie();
  const pause = pauseAfterWrite(/UPDATE owner_accounts SET email/);
  const change = request("/api/owner/settings", json(owner, { action: "profile", currentPassword: app.ownerPassword, email: "owner.committed@alert.test", displayName: "Owner" }, "PATCH"));
  await pause.hit;
  assert.equal((await signOut("/api/owner/logout", owner)).status, 200);
  pause.release();
  const changed = await change;
  assert.equal(changed.status, 200);
  assert.equal((await ownerData(cookieFrom(changed, "atp_owner_session"))).status, 401);
  await tick();
  const back = cookieFrom(await request("/api/owner/login", json(null, { email: "owner.committed@alert.test", password: app.ownerPassword })), "atp_owner_session");
  assert.equal((await request("/api/owner/settings", json(back, { action: "profile", currentPassword: app.ownerPassword, email: app.ownerEmail, displayName: "Owner" }, "PATCH"))).status, 200);
});

test("an out-of-date Owner cookie only ends its own line: a later login survives it, however often it is replayed", async () => {
  await tick();
  const original = await app.ownerCookie();
  const changed = await request("/api/owner/settings", json(original, { action: "password", currentPassword: app.ownerPassword, newPassword: "Line-Owner-Pass-2026!" }, "PATCH"));
  assert.equal(changed.status, 200);
  await tick();
  const later = cookieFrom(await request("/api/owner/login", json(null, { email: app.ownerEmail, password: "Line-Owner-Pass-2026!" })), "atp_owner_session");
  for (let replay = 0; replay < 3; replay += 1) {
    assert.equal((await signOut("/api/owner/logout", original)).status, 200);
    assert.equal((await ownerData(later)).status, 200, "the later login keeps working");
  }
  assert.equal((await request("/api/owner/settings", json(later, { action: "password", currentPassword: "Line-Owner-Pass-2026!", newPassword: app.ownerPassword }, "PATCH"))).status, 200);
});

test("an Owner cookie made invalid by a password change cannot sign out a DIFFERENT, earlier sign-in that stayed signed in", async () => {
  await tick();
  const first = await app.ownerCookie(); // A signs in first …
  await tick();
  const second = await app.ownerCookie(); // … then B
  const changed = await request("/api/owner/settings", json(first, { action: "password", currentPassword: app.ownerPassword, newPassword: "Earlier-Session-Pass-2026!" }, "PATCH"));
  assert.equal(changed.status, 200);
  const refreshed = cookieFrom(changed, "atp_owner_session");
  assert.equal((await ownerData(refreshed)).status, 200, "A stays signed in after changing the password");
  assert.equal((await ownerData(second)).status, 401, "B's cookie is out of date");
  for (const endpoint of ["/api/owner/logout", "/api/admin/logout"]) {
    assert.equal((await signOut(endpoint, second)).status, 200);
    assert.equal((await ownerData(refreshed)).status, 200, `B's invalid cookie at ${endpoint} cannot sign A out`);
  }
  assert.equal((await request("/api/owner/settings", json(refreshed, { action: "password", currentPassword: "Earlier-Session-Pass-2026!", newPassword: app.ownerPassword }, "PATCH"))).status, 200);
});

test("Owner cookies issued before session ids existed keep working, and their own line can still be ended", async () => {
  await tick();
  const modern = await app.ownerCookie();
  const { sid, ...withoutSid } = payloadOf(modern);
  assert.ok(sid, "new cookies carry a session id");
  const body = Buffer.from(JSON.stringify(withoutSid)).toString("base64url");
  const legacy = `atp_owner_session=${body}.${createHmac("sha256", process.env.OWNER_SESSION_SECRET).update(body).digest("base64url")}`;
  assert.equal((await ownerData(legacy)).status, 200, "a cookie from before this update still works");
  const pause = pauseAfterWrite(/UPDATE owner_accounts SET password_hash/);
  const change = request("/api/owner/settings", json(legacy, { action: "password", currentPassword: app.ownerPassword, newPassword: "Legacy-Line-Pass-2026!" }, "PATCH"));
  await pause.hit;
  assert.equal((await signOut("/api/owner/logout", legacy)).status, 200);
  pause.release();
  const changed = await change;
  assert.equal(changed.status, 200);
  const refreshed = cookieFrom(changed, "atp_owner_session");
  assert.equal(payloadOf(refreshed).sid, undefined, "the refreshed cookie stays on the same (issue-time) line");
  assert.equal((await ownerData(refreshed)).status, 401, "and that line was ended by the sign-out");
  await tick();
  const back = cookieFrom(await request("/api/owner/login", json(null, { email: app.ownerEmail, password: "Legacy-Line-Pass-2026!" })), "atp_owner_session");
  assert.equal((await ownerData(modern)).status, 401, "the password change signed out the other cookie too");
  assert.equal((await request("/api/owner/settings", json(back, { action: "password", currentPassword: "Legacy-Line-Pass-2026!", newPassword: app.ownerPassword }, "PATCH"))).status, 200);
});

test("session-line rows stay bounded: replays add nothing, and rows older than any cookie can live are removed", async () => {
  const lineRows = () => app.d1.sqlite.prepare("SELECT subject FROM session_revocations WHERE subject >= 'line:' AND subject < 'line;'").all().length;
  const login = async (password) => cookieFrom(await request("/api/owner/login", json(null, { email: app.ownerEmail, password })), "atp_owner_session");
  const changePassword = (cookie, from, to) => request("/api/owner/settings", json(cookie, { action: "password", currentPassword: from, newPassword: to }, "PATCH"));
  const before = lineRows();
  await tick();
  // A proper sign-out with a current cookie sets the cutoff and adds no line row; replaying it adds nothing either.
  const current = await app.ownerCookie();
  for (let press = 0; press < 5; press += 1) assert.equal((await signOut("/api/owner/logout", current)).status, 200);
  assert.equal(lineRows(), before, "proper sign-outs and their replays add no line rows");
  // An out-of-date cookie that was never signed out ends its own line exactly once.
  await tick();
  const outOfDate = await app.ownerCookie();
  assert.equal((await changePassword(outOfDate, app.ownerPassword, "Bounded-Rows-Pass-2026!")).status, 200);
  for (let press = 0; press < 3; press += 1) assert.equal((await signOut("/api/owner/logout", outOfDate)).status, 200);
  assert.equal(lineRows(), before + 1, "one row for that line, however often it is replayed");
  await tick();
  const restore = await login("Bounded-Rows-Pass-2026!");
  assert.equal((await changePassword(restore, "Bounded-Rows-Pass-2026!", app.ownerPassword)).status, 200);
  // Line rows older than any cookie can live (30 days + a day's margin) are removed by the next sign-out; newer ones and all cutoffs stay.
  const day = 86_400_000;
  const insert = app.d1.sqlite.prepare("INSERT INTO session_revocations (subject, revoked_before) VALUES (?, ?)");
  insert.run("line:owner:account:OldLineOldLineOld01", Date.now() - 40 * day);
  insert.run("line:staff:someone@alert.test:OldLineOldLineOld02", Date.now() - 32 * day);
  insert.run("line:owner:account:RecentLineRecent03", Date.now() - 29 * day);
  const cutoffRows = app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM session_revocations WHERE NOT (subject >= 'line:' AND subject < 'line;')").get().n;
  await tick();
  const any = await app.ownerCookie();
  assert.equal((await signOut("/api/owner/logout", any)).status, 200);
  const remaining = app.d1.sqlite.prepare("SELECT subject FROM session_revocations WHERE subject >= 'line:' AND subject < 'line;'").all().map((row) => row.subject);
  assert.ok(!remaining.some((subject) => subject.includes("OldLineOldLine")), "rows older than any cookie can live are removed");
  assert.ok(remaining.includes("line:owner:account:RecentLineRecent03"), "a line that could still have a live cookie is kept");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM session_revocations WHERE NOT (subject >= 'line:' AND subject < 'line;')").get().n, cutoffRows, "Owner and staff cutoff rows are all kept");
});

test("the Owner check and the clean-up read only their own rows (index range, not a table scan)", async () => {
  const source = await readFile(new URL("../db/session-store.ts", import.meta.url), "utf8");
  assert.match(source, /subject >= 'owner:' AND subject < 'owner;'/);
  assert.match(source, /subject >= 'line:' AND subject < 'line;'/);
  const plan = (sql) => app.d1.sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all().map((row) => row.detail).join(" | ");
  assert.match(plan("SELECT MAX(revoked_before) FROM session_revocations WHERE subject >= 'owner:' AND subject < 'owner;'"), /SEARCH .*USING INDEX/);
  assert.match(plan("DELETE FROM session_revocations WHERE subject >= 'line:' AND subject < 'line;' AND revoked_before < 1"), /SEARCH .*USING INDEX/);
});

test("every new sign-in gets its own session id, and a refresh keeps it", async () => {
  await tick();
  const one = payloadOf(await app.ownerCookie());
  await tick();
  const twoCookie = await app.ownerCookie();
  const two = payloadOf(twoCookie);
  assert.match(one.sid, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(one.sid, two.sid);
  const changed = await request("/api/owner/settings", json(twoCookie, { action: "profile", currentPassword: app.ownerPassword, email: app.ownerEmail, displayName: "Owner" }, "PATCH"));
  assert.equal(payloadOf(cookieFrom(changed, "atp_owner_session")).sid, two.sid);
});

test("a refreshed Owner cookie is the same session: same issue time and expiry, never a longer one", async () => {
  await tick();
  const owner = await app.ownerCookie();
  const before = payloadOf(owner);
  await tick();
  const changed = await request("/api/owner/settings", json(owner, { action: "password", currentPassword: app.ownerPassword, newPassword: "Same-Session-Pass-2026!" }, "PATCH"));
  const refreshed = cookieFrom(changed, "atp_owner_session");
  const after = payloadOf(refreshed);
  assert.equal(after.iat, before.iat);
  assert.equal(after.expires, before.expires);
  assert.notEqual(after.v, before.v, "but it is tied to the new password");
  const again = await request("/api/owner/settings", json(refreshed, { action: "password", currentPassword: "Same-Session-Pass-2026!", newPassword: app.ownerPassword }, "PATCH"));
  assert.equal(again.status, 200);
  assert.equal((await ownerData(cookieFrom(again, "atp_owner_session"))).status, 200);
});

test("an Owner sign-in still in flight when the password changes produces a cookie that does not work", async () => {
  for (const [path, label] of [["/api/owner/login", "Owner form"], ["/api/team/login", "shared form"]]) {
    await tick();
    const session = await app.ownerCookie();
    // The old password has been checked; the cookie is about to be issued; the password is changed in the meantime.
    const pause = pauseBeforeWrite(/DELETE FROM rate_limits WHERE key/);
    const login = request(path, json(null, { email: app.ownerEmail, password: app.ownerPassword }));
    await pause.hit;
    delete app.d1.prepare;
    const changed = await request("/api/owner/settings", json(session, { action: "password", currentPassword: app.ownerPassword, newPassword: "In-Flight-Owner-2026!" }, "PATCH"));
    assert.equal(changed.status, 200);
    pause.release();
    const answered = await login;
    assert.equal(answered.status, 200);
    assert.equal((await ownerData(cookieFrom(answered, "atp_owner_session"))).status, 401, `${label}: the old password's sign-in does not get a working cookie`);
    assert.equal((await ownerData(cookieFrom(changed, "atp_owner_session"))).status, 200, `${label}: the person who changed it stays signed in`);
    assert.equal((await request("/api/owner/settings", json(cookieFrom(changed, "atp_owner_session"), { action: "password", currentPassword: "In-Flight-Owner-2026!", newPassword: app.ownerPassword }, "PATCH"))).status, 200);
  }
});

test("an Owner sign-in still in flight when the Owner signs out does not survive the sign-out", async () => {
  await tick();
  const session = await app.ownerCookie();
  await tick();
  const pause = pauseBeforeWrite(/DELETE FROM rate_limits WHERE key/);
  const login = request("/api/owner/login", json(null, { email: app.ownerEmail, password: app.ownerPassword }));
  await pause.hit;
  delete app.d1.prepare;
  await tick();
  assert.equal((await signOut("/api/owner/logout", session)).status, 200);
  await tick(); // the sign-in finishes strictly after the sign-out, so a cookie dated at the end of the sign-in would be newer than it
  pause.release();
  const answered = await login;
  assert.equal((await ownerData(cookieFrom(answered, "atp_owner_session"))).status, 401);
});

test("Owner and a Worker signed in on one computer: the Owner's Sign out ends both", async () => {
  const worker = await app.staffCookie("shared.worker@alert.test", "Worker");
  await tick();
  const owner = await app.ownerCookie();
  const out = await signOut("/api/owner/logout", `${owner}; ${worker}`);
  assert.equal(out.status, 200);
  const cleared = out.headers.getSetCookie().join(";");
  assert.match(cleared, /atp_owner_session=;/); assert.match(cleared, /atp_team_session=;/); assert.match(cleared, /atp_staff_pending=;/);
  assert.equal((await ownerData(owner)).status, 401);
  assert.equal((await request("/api/worker", { headers: { cookie: worker } })).status, 401, "the Worker left signed in behind the Owner is signed out too");
});

test("Owner and a waiting cookie on one computer: the staff Sign out (waiting page) ends both", async () => {
  await tick();
  const owner = await app.ownerCookie();
  const pending = cookieFrom(await join("shared.waiting@alert.test"), "atp_staff_pending");
  const out = await signOut("/api/admin/logout", `${owner}; ${pending}`);
  assert.equal(out.status, 200);
  assert.equal((await ownerData(owner)).status, 401, "the Owner session is not left behind");
  assert.equal((await request("/api/staff/status", { headers: { cookie: pending } })).status, 401);
});

test("an old, already signed-out copy of the Owner cookie cannot sign the Owner out of a newer session", async () => {
  await tick();
  const old = await app.ownerCookie();
  assert.equal((await signOut("/api/owner/logout", old)).status, 200);
  await tick();
  const current = await app.ownerCookie();
  assert.equal((await signOut("/api/owner/logout", old)).status, 200, "replaying the old cookie answers normally");
  assert.equal((await ownerData(current)).status, 200, "but the newer session keeps working");
  assert.equal((await signOut("/api/admin/logout", old)).status, 200);
  assert.equal((await ownerData(current)).status, 200, "also through the staff Sign out");
});

test("sign-outs recorded the old way (under the Owner e-mail) are still honoured, and such an old cookie ends nothing", async () => {
  await tick();
  const before = await app.ownerCookie();
  await tick();
  app.d1.sqlite.prepare("INSERT INTO session_revocations (subject, revoked_before) VALUES (?, ?) ON CONFLICT(subject) DO UPDATE SET revoked_before=excluded.revoked_before").run(`owner:${app.ownerEmail}`, Date.now());
  assert.equal((await ownerData(before)).status, 401, "a cookie issued before an e-mail-based sign-out stays ended");
  await tick();
  const after = await app.ownerCookie();
  assert.equal((await signOut("/api/owner/logout", before)).status, 200);
  assert.equal((await ownerData(after)).status, 200, "the old cookie cannot end the newer session");
});

test("an older Owner sign-out counts whichever e-mail it was saved under (e-mail changes and private-settings recovery cannot bring a session back)", async () => {
  await tick();
  const before = await app.ownerCookie();
  assert.equal((await ownerData(before)).status, 200);
  await tick();
  app.d1.sqlite.prepare("INSERT INTO session_revocations (subject, revoked_before) VALUES (?, ?)").run("owner:an.earlier.address@alert.test", Date.now());
  assert.equal((await ownerData(before)).status, 401, "signed out under another e-mail the account once had");
  await tick();
  const after = await app.ownerCookie();
  assert.equal((await ownerData(after)).status, 200, "a later sign-in is not affected");
  assert.equal((await signOut("/api/owner/logout", before)).status, 200);
  assert.equal((await ownerData(after)).status, 200);
});

test("staff sign-out rows never count against the Owner, and Owner rows never count against staff", async () => {
  await tick();
  const owner = await app.ownerCookie();
  const staff = await app.staffCookie("independent@alert.test", "Worker");
  await tick();
  app.d1.sqlite.prepare("INSERT INTO session_revocations (subject, revoked_before) VALUES (?, ?)").run("staff:someone.else@alert.test", Date.now());
  assert.equal((await ownerData(owner)).status, 200);
  assert.equal((await signOut("/api/admin/logout", staff)).status, 200);
  assert.equal((await ownerData(owner)).status, 200, "a staff member's sign-out leaves the Owner on another computer alone");
});

test("the Owner dashboard Sign out also only leaves after the server confirms it", async () => {
  const source = await readFile(new URL("../app/owner/OwnerDashboard.tsx", import.meta.url), "utf8");
  assert.match(source, /requestSignOut\("\/api\/owner\/logout"\)/);
  assert.doesNotMatch(source, /fetch\("\/api\/owner\/logout"/);
});
