// Rate limiting with a real time window. Counts live in D1 so every Worker instance shares them, and every count is changed by
// ONE atomic statement, so a burst of parallel requests cannot all read "0 so far" and slip through (the old check-then-write
// counters let hundreds of guesses through at once, and never forgot old failures).
import { runtimeBindings } from "./runtime";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;

let ready: Promise<void> | null = null;

async function database(): Promise<D1> {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The rate limit store is unavailable.");
  const db = env.DB;
  ready ??= db.prepare("CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, hits INTEGER NOT NULL)").run().then(() => undefined, (error) => { ready = null; throw error; });
  await ready;
  return db;
}

export async function sha256Hex(input: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type Throttle = { allowed: boolean; hits: number; retryAfterSeconds: number };

// Counts one more event for `key` in a window of `windowMs` and says whether it is still within `limit`.
export async function throttleHit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<Throttle> {
  const db = await database();
  const row = await db.prepare(`INSERT INTO rate_limits (key, window_start, hits) VALUES (?1, ?2, 1)
    ON CONFLICT(key) DO UPDATE SET
      hits = CASE WHEN window_start <= ?3 THEN 1 ELSE hits + 1 END,
      window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END
    RETURNING hits, window_start AS windowStart`).bind(key, now, now - windowMs).first<{ hits: number; windowStart: number }>();
  const hits = Number(row?.hits ?? 1);
  const windowStart = Number(row?.windowStart ?? now);
  if (Math.random() < 0.02) await db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(now - 2 * 86_400_000).run().catch(() => undefined);
  return { allowed: hits <= limit, hits, retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)) };
}

// Looks without counting: true while `key` has already used up `limit` events in its current window.
export async function throttleExceeded(key: string, limit: number, windowMs: number, now = Date.now()) {
  const db = await database();
  const row = await db.prepare("SELECT hits, window_start AS windowStart FROM rate_limits WHERE key = ?").bind(key).first<{ hits: number; windowStart: number }>();
  if (!row || Number(row.windowStart) <= now - windowMs) return { exceeded: false, retryAfterSeconds: 0 };
  return { exceeded: Number(row.hits) >= limit, retryAfterSeconds: Math.max(1, Math.ceil((Number(row.windowStart) + windowMs - now) / 1000)) };
}

// Gives one slot back, for an attempt that should not count after all (a right reference, a form refused for a typing mistake). Never goes below zero.
export async function throttleRefund(key: string) {
  const db = await database();
  await db.prepare("UPDATE rate_limits SET hits = CASE WHEN hits > 0 THEN hits - 1 ELSE 0 END WHERE key = ?").bind(key).run();
}

export async function throttleReset(key: string) {
  const db = await database();
  await db.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
}

export function clientAddress(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? "local";
}

export function tooManyRequests(message: string, retryAfterSeconds: number) {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } });
}

const LOGIN_WINDOW = 15 * 60 * 1000;

// Sign-in guard shared by the Owner, Team and Admin sign-in routes:
//  * at most 60 attempts per address per 15 minutes, counted BEFORE the password is checked (a parallel burst cannot beat it);
//  * at most 15 wrong answers per address per 15 minutes, whatever e-mail address is typed (so changing the e-mail while
//    guessing the Team Code does not help);
//  * at most 8 wrong answers per address and e-mail per 15 minutes.
// A correct sign-in clears only the per-e-mail count, so someone with one valid account cannot reset the counters that guard others.
export async function loginGuard(request: Request, email: string, scope: string) {
  const address = clientAddress(request);
  const attemptKey = await sha256Hex(`login-attempts|${address}`);
  const addressFailKey = await sha256Hex(`login-fail-address|${address}`);
  const emailFailKey = await sha256Hex(`login-fail|${scope}|${email.toLowerCase()}|${address}`);
  const attempt = await throttleHit(attemptKey, 60, LOGIN_WINDOW);
  if (!attempt.allowed) return { blocked: tooManyRequests("Too many attempts. Try again in 15 minutes.", attempt.retryAfterSeconds), failed: async () => undefined, passed: async () => undefined };
  // Every attempt takes its slot in the failure counters FIRST (one atomic statement each), so a burst of parallel guesses cannot all pass a
  // "not over the limit yet" look. A correct sign-in gives its slot back, so only wrong answers use up the allowance.
  const [byAddress, byEmail] = await Promise.all([throttleHit(addressFailKey, 15, LOGIN_WINDOW), throttleHit(emailFailKey, 8, LOGIN_WINDOW)]);
  if (!byAddress.allowed || !byEmail.allowed) {
    return { blocked: tooManyRequests("Too many attempts. Try again in 15 minutes.", Math.max(byAddress.retryAfterSeconds, byEmail.retryAfterSeconds)), failed: async () => undefined, passed: async () => undefined };
  }
  return {
    blocked: null as Response | null,
    failed: async () => undefined, // already counted above
    passed: async () => { await Promise.all([throttleRefund(addressFailKey), throttleReset(emailFailKey)]); },
  };
}
