import { sessionLineOf, staffSessionState } from "../db/session-store";
import { getStaffAccessRequest } from "../db/staff-store";
import { verifyCurrentTeamCode } from "../db/access-settings-store";
import { hashPbkdf2, safeEqual, verifyPbkdf2 } from "./secret-utils";

const TEAM_COOKIE = "atp_team_session";
const PENDING_COOKIE = "atp_staff_pending";
const SESSION_SECONDS = 60 * 60 * 12;
export const STAFF_SESSION_SECONDS = SESSION_SECONDS;
const PENDING_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export const staffRoles = ["Admin", "Manager", "Estimator", "Site Supervisor", "Worker", "Electrician", "Plumber", "Cleaner", "Carpenter", "Plasterer", "Tiler"] as const;
export type StaffRole = typeof staffRoles[number];

function base64UrlEncode(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(input: string) {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  // A tampered or truncated cookie is simply "not signed in", never a server error.
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
}

function requiredTeamSessionSecret() {
  const value = process.env.TEAM_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (value) return value;
  // Team sign-in must never be the only thing broken by a missing variable: derive a separate team key from the Owner session secret.
  const owner = process.env.OWNER_SESSION_SECRET?.trim();
  if (owner) return `${owner}|team-sessions`;
  throw new Error("TEAM_SESSION_SECRET is not configured.");
}

export const verifyStoredSecret = verifyPbkdf2;
export const hashStaffPassword = hashPbkdf2;
export const verifyCompanyTeamCode = verifyCurrentTeamCode;

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requiredTeamSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function credentialFingerprint(passwordHash: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`staff-session|${passwordHash}`)));
  return base64UrlEncode(digest.slice(0, 9));
}

// What a session cookie is made from: the moment the sign-in was checked and the fingerprint of the exact password that was checked.
// A cookie never looks the password up again when it is issued, so a sign-in still in flight when the password is replaced (an Owner
// reset, someone re-joining with that e-mail) produces a cookie for the OLD password, which does not work.
// `sid` names the session line (see db/session-store.ts): it is new for every sign-in and carried over when a waiting cookie is promoted.
export type StaffSessionProof = { iat: number; v: string; sid?: string };

export function newSessionId() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

export async function staffSessionProof(passwordHash: string, checkedAt: number): Promise<StaffSessionProof> {
  return { iat: checkedAt, v: await credentialFingerprint(passwordHash), sid: newSessionId() };
}

export async function createAdminSession(email: string, role: StaffRole, proof: StaffSessionProof, seconds = SESSION_SECONDS) {
  const payload = base64UrlEncode(JSON.stringify({
    email: email.toLowerCase(),
    v: proof.v,
    role,
    iat: proof.iat,
    sid: proof.sid,
    expires: Date.now() + seconds * 1000,
  }));
  return `${payload}.${base64UrlEncode(await hmac(payload))}`;
}

export async function verifyAdminSession(token?: string | null) {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { email?: string; role?: string; expires?: number; v?: string; iat?: number; sid?: string };
    if (!parsed.email || !staffRoles.includes(parsed.role as StaffRole) || !parsed.expires || parsed.expires < Date.now()) return null;
    const current = await getStaffAccessRequest(parsed.email);
    if (!current || current.status !== "Approved" || current.role === "Unassigned") return null;
    if (!parsed.v || !safeEqual(encoder.encode(parsed.v), encoder.encode(await credentialFingerprint(current.passwordHash)))) return null;
    if (!parsed.iat) return null;
    const state = await staffSessionState(current.email, sessionLineOf({ sid: parsed.sid, iat: parsed.iat }));
    if (parsed.iat <= state.revokedBefore || state.lineEnded) return null;
    return { email: current.email.toLowerCase(), role: current.role, expires: parsed.expires };
  } catch {
    return null;
  }
}

// The "waiting for approval" cookie turns into a full staff session once the Owner approves, so it is held to the same rules as one:
// it carries the proof of the sign-in (a reset or a new password ends it), and signing out or the Owner removing the request ends it.
export async function createPendingStaffSession(email: string, proof: StaffSessionProof) {
  const payload = base64UrlEncode(JSON.stringify({
    email: email.toLowerCase(),
    purpose: "staff-approval",
    v: proof.v,
    iat: proof.iat,
    sid: proof.sid,
    expires: Date.now() + PENDING_SECONDS * 1000,
  }));
  return `${payload}.${base64UrlEncode(await hmac(payload))}`;
}

export async function verifyPendingStaffSession(token?: string | null) {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  let parsed: { email?: string; purpose?: string; expires?: number; v?: string; iat?: number; sid?: string };
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
  if (!parsed.email || parsed.purpose !== "staff-approval" || !parsed.expires || parsed.expires < Date.now()) return null;
  // From here a database failure is thrown, not read as "signed out": the waiting page then keeps checking instead of giving up.
  const current = await getStaffAccessRequest(parsed.email);
  if (!current) return null;
  if (!parsed.v || !safeEqual(encoder.encode(parsed.v), encoder.encode(await credentialFingerprint(current.passwordHash)))) return null;
  if (!parsed.iat) return null;
  const state = await staffSessionState(current.email, sessionLineOf({ sid: parsed.sid, iat: parsed.iat }));
  if (parsed.iat <= state.revokedBefore || state.lineEnded) return null;
  return { email: current.email.toLowerCase(), expires: parsed.expires, iat: parsed.iat, v: parsed.v, sid: parsed.sid };
}

// For sign-out: whose cookie this is, if it is genuine (signed by this server, not expired) and whether it was made with the person's
// current password. Unlike the checks above, a database failure here is NOT read as "signed out": it is thrown, so sign-out can say it failed.
export async function presentedStaffCookie(token: string | null | undefined, kind: "session" | "pending") {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  let parsed: { email?: string; purpose?: string; expires?: number; v?: string; iat?: number; sid?: string };
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
  if (!parsed.email || !parsed.v || !parsed.iat || !parsed.expires || parsed.expires < Date.now()) return null;
  if ((kind === "pending") !== (parsed.purpose === "staff-approval")) return null;
  const line = sessionLineOf({ sid: parsed.sid, iat: parsed.iat });
  const account = await getStaffAccessRequest(parsed.email);
  const state = await staffSessionState(parsed.email, line);
  const ended = state.lineEnded || parsed.iat <= state.revokedBefore;
  const current = Boolean(account) && !ended && safeEqual(encoder.encode(parsed.v), encoder.encode(await credentialFingerprint(account?.passwordHash ?? "")));
  return { email: parsed.email.toLowerCase(), iat: parsed.iat, current, line, ended };
}

export function adminCookieName() { return TEAM_COOKIE; }
export function adminSessionCookie(token: string, secure: boolean, seconds = SESSION_SECONDS) { return `${TEAM_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? "; Secure" : ""}`; }
export function clearAdminSessionCookie(secure: boolean) { return `${TEAM_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`; }
export function pendingStaffCookieName() { return PENDING_COOKIE; }
export function pendingStaffSessionCookie(token: string, secure: boolean) { return `${PENDING_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${PENDING_SECONDS}${secure ? "; Secure" : ""}`; }
export function clearPendingStaffSessionCookie(secure: boolean) { return `${PENDING_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`; }

export function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export async function adminSessionFromRequest(request: Request) {
  return verifyAdminSession(cookieValue(request, TEAM_COOKIE));
}
