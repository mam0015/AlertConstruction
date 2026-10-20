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

// `subject` is "owner:<email>" or "staff:<email>".
export async function sessionsRevokedBefore(subject: string) {
  await ensureSessionTable();
  const db = await database();
  const row = await db.prepare("SELECT revoked_before AS value FROM session_revocations WHERE subject = ?").bind(subject.toLowerCase()).first<{ value: number }>();
  return Number(row?.value ?? 0);
}

export async function revokeSessions(subject: string, now = Date.now()) {
  await ensureSessionTable();
  const db = await database();
  await db.prepare("INSERT INTO session_revocations (subject, revoked_before) VALUES (?1, ?2) ON CONFLICT(subject) DO UPDATE SET revoked_before = ?2")
    .bind(subject.toLowerCase(), now).run();
}
