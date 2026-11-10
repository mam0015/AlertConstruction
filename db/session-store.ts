// Signing out must really end a session. Session cookies are signed tokens that carry no server state, so "sign out" used to just
// delete the cookie in the browser while a copy of the token (taken from a shared computer, a log, a proxy) stayed valid for up to
// 12 hours (30 days with "remember me"). Now sign-out records the time, and every token issued before that time is refused.
import { memoizePerDatabase, runtimeBindings } from "./runtime";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;

async function database(): Promise<D1> {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The session database is unavailable.");
  return env.DB;
}

const ensureSessionTable = memoizePerDatabase(async () => {
  const db = await database();
  await db.prepare("CREATE TABLE IF NOT EXISTS session_revocations (subject TEXT PRIMARY KEY, revoked_before INTEGER NOT NULL)").run();
});

// There is exactly one Owner account, so its sign-outs are recorded under one name that does not depend on the e-mail: changing or
// recovering the Owner e-mail can never step around a sign-out.
export const OWNER_SESSION_SUBJECT = "owner:account";

// A session line is one sign-in and everything carried forward from it (an Owner cookie refreshed after a password change, a waiting
// cookie promoted to a staff session). Its id is the random `sid` in the cookie, or the issue time for cookies made before session ids
// existed. Ending a line ends exactly those cookies, nothing else; the row name never starts with "owner:" or "staff:".
export function sessionLineOf(cookie: { sid?: unknown; iat: number }) {
  return typeof cookie.sid === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(cookie.sid) ? cookie.sid : `iat:${cookie.iat}`;
}
const lineSubject = (subject: string, line: string) => `line:${subject.toLowerCase()}:${line}`;

// No cookie lives longer than 30 days ("remember me"; a refreshed or promoted cookie never outlives the one it came from), so a line ended
// more than 31 days ago has no cookie left that it could stop, and its row is removed. Row names are compared as ranges ("line:" up to
// "line;", the next character), which the primary key index answers without reading the rest of the table.
const LINE_ROWS_KEPT_MS = 31 * 86_400_000;

export type SessionState = { revokedBefore: number; lineEnded: boolean };

// The Owner's cutoff counts every Owner sign-out ever recorded, including older rows saved as "owner:<e-mail>" under any e-mail the account
// has had, plus whether this cookie's own line was ended. One round trip.
export async function ownerSessionState(line: string): Promise<SessionState> {
  await ensureSessionTable();
  const db = await database();
  const row = await db.prepare(`SELECT (SELECT MAX(revoked_before) FROM session_revocations WHERE subject >= 'owner:' AND subject < 'owner;') AS cutoff,
    EXISTS (SELECT 1 FROM session_revocations WHERE subject = ?) AS ended`).bind(lineSubject(OWNER_SESSION_SUBJECT, line)).first<{ cutoff: number | null; ended: number }>();
  return { revokedBefore: Number(row?.cutoff ?? 0), lineEnded: Number(row?.ended ?? 0) === 1 };
}

export async function staffSessionState(email: string, line: string): Promise<SessionState> {
  await ensureSessionTable();
  const db = await database();
  const subject = `staff:${email.toLowerCase()}`;
  const row = await db.prepare(`SELECT (SELECT revoked_before FROM session_revocations WHERE subject = ?1) AS cutoff,
    EXISTS (SELECT 1 FROM session_revocations WHERE subject = ?2) AS ended`).bind(subject, lineSubject(subject, line)).first<{ cutoff: number | null; ended: number }>();
  return { revokedBefore: Number(row?.cutoff ?? 0), lineEnded: Number(row?.ended ?? 0) === 1 };
}

// `subject` is OWNER_SESSION_SUBJECT or "staff:<email>".
export async function sessionsRevokedBefore(subject: string) {
  await ensureSessionTable();
  const db = await database();
  const row = await db.prepare("SELECT revoked_before AS value FROM session_revocations WHERE subject = ?").bind(subject.toLowerCase()).first<{ value: number }>();
  return Number(row?.value ?? 0);
}

// Sign-out on behalf of one presented cookie.
//  * A live cookie (current password, its line not ended, issued after the last sign-out) ends every session of `subject` issued up to now.
//    The "issued after the last sign-out" check is part of the one statement, so an old, already signed-out copy can never end newer sessions.
//  * Any other genuine cookie (from before a new password or e-mail, or already signed out) ends only its own line. That catches a refreshed
//    cookie still on its way back from a password change, and it cannot touch any other sign-in, on this computer or another.
//  * A cookie that is already ended (its line, or a sign-out after it was issued) changes nothing and adds no row.
export async function endSessionsForCookie(subject: string, cookie: { iat: number; current: boolean; line: string; ended: boolean }, now = Date.now()) {
  await ensureSessionTable();
  const db = await database();
  const prune = db.prepare("DELETE FROM session_revocations WHERE subject >= 'line:' AND subject < 'line;' AND revoked_before < ?").bind(now - LINE_ROWS_KEPT_MS);
  if (cookie.current) {
    await db.batch([
      db.prepare(`INSERT INTO session_revocations (subject, revoked_before) VALUES (?1, MAX(?2, ?3))
        ON CONFLICT(subject) DO UPDATE SET revoked_before = MAX(?2, ?3) WHERE session_revocations.revoked_before < ?3`)
        .bind(subject.toLowerCase(), now, cookie.iat),
      prune,
    ]);
    return;
  }
  if (cookie.ended) return;
  await db.batch([
    db.prepare("INSERT INTO session_revocations (subject, revoked_before) VALUES (?1, ?2) ON CONFLICT(subject) DO NOTHING").bind(lineSubject(subject, cookie.line), now),
    prune,
  ]);
}

export async function revokeSessions(subject: string, now = Date.now()) {
  await ensureSessionTable();
  const db = await database();
  await db.prepare("INSERT INTO session_revocations (subject, revoked_before) VALUES (?1, ?2) ON CONFLICT(subject) DO UPDATE SET revoked_before = MAX(session_revocations.revoked_before, ?2)")
    .bind(subject.toLowerCase(), now).run();
}
