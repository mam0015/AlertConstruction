import { getOwnerAccountByEmail } from "../db/access-settings-store";
import { ownerSessionState, sessionLineOf } from "../db/session-store";
import { safeEqual, verifyPbkdf2 } from "./secret-utils";

const OWNER_COOKIE = "atp_owner_session";
const SESSION_SECONDS = 60 * 60 * 12;
export const REMEMBER_SESSION_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

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

function requiredSessionSecret() {
  const value = process.env.OWNER_SESSION_SECRET?.trim();
  if (!value) throw new Error("OWNER_SESSION_SECRET is not configured.");
  return value;
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requiredSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export async function isRegisteredOwnerEmail(email: string) {
  return Boolean(await getOwnerAccountByEmail(email.trim().toLowerCase()));
}

export async function ownerDisplayName(email: string) {
  return (await getOwnerAccountByEmail(email.trim().toLowerCase()))?.displayName ?? "Owner";
}

// What a session cookie is made from: the moment the sign-in was checked and the fingerprint of the exact password that was checked (see
// app/admin-auth.ts). A refreshed cookie also keeps the expiry of the session it replaces, so it is the same session, not a longer one.
// `sid` names the session line (see db/session-store.ts): new for every sign-in, kept when the cookie is refreshed.
export type OwnerSessionProof = { iat: number; v: string; sid?: string; expires?: number };

export async function ownerCredentialFingerprint(passwordHash: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`owner-session|${passwordHash}`)));
  return base64UrlEncode(digest.slice(0, 9));
}

// The proof of a correct sign-in, or null. Takes the same time whether or not the e-mail is the Owner's.
export async function verifyOwnerPassword(email: string, password: string): Promise<OwnerSessionProof | null> {
  const checkedAt = Date.now();
  const normalised = email.trim().toLowerCase();
  const account = await getOwnerAccountByEmail(normalised);
  const fallbackHash = process.env.OWNER_PASSWORD_HASH?.trim() ?? "";
  const valid = await verifyPbkdf2(password, account?.passwordHash ?? fallbackHash);
  if (!account || !valid) return null;
  return { iat: checkedAt, v: await ownerCredentialFingerprint(account.passwordHash), sid: base64UrlEncode(crypto.getRandomValues(new Uint8Array(16))) };
}

export async function createOwnerSession(email: string, proof: OwnerSessionProof, seconds = SESSION_SECONDS) {
  const payload = base64UrlEncode(JSON.stringify({
    email: email.toLowerCase(),
    v: proof.v,
    iat: proof.iat,
    sid: proof.sid,
    expires: proof.expires ?? Date.now() + seconds * 1000,
  }));
  return `${payload}.${base64UrlEncode(await hmac(payload))}`;
}

export async function verifyOwnerSession(token?: string | null) {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { email?: string; expires?: number; v?: string; iat?: number; sid?: string };
    if (!parsed.email || !parsed.expires || parsed.expires < Date.now()) return null;
    // Changing the Owner password changes the fingerprint and signs out every older session.
    const account = await getOwnerAccountByEmail(parsed.email.trim().toLowerCase());
    if (!account || !parsed.v || !safeEqual(encoder.encode(parsed.v), encoder.encode(await ownerCredentialFingerprint(account.passwordHash)))) return null;
    // Signing out (or "sign out everywhere") ends every session issued before it.
    if (!parsed.iat) return null;
    const state = await ownerSessionState(sessionLineOf({ sid: parsed.sid, iat: parsed.iat }));
    if (parsed.iat <= state.revokedBefore || state.lineEnded) return null;
    return { email: parsed.email.toLowerCase(), expires: parsed.expires, iat: parsed.iat, v: parsed.v, sid: parsed.sid };
  } catch {
    return null;
  }
}

// For sign-out: the Owner cookie, if it is genuine (signed here, not expired), and whether it is still current (made with the current
// password and e-mail, issued after the last sign-out). A database failure is thrown, never read as "signed out", so sign-out can say it failed.
export async function presentedOwnerCookie(token: string | null | undefined) {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  let parsed: { email?: string; expires?: number; v?: string; iat?: number; sid?: string };
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
  if (!parsed.email || !parsed.v || !parsed.iat || !parsed.expires || parsed.expires < Date.now()) return null;
  const line = sessionLineOf({ sid: parsed.sid, iat: parsed.iat });
  const account = await getOwnerAccountByEmail(parsed.email.trim().toLowerCase());
  const state = await ownerSessionState(line);
  const ended = state.lineEnded || parsed.iat <= state.revokedBefore;
  const current = Boolean(account) && !ended && safeEqual(encoder.encode(parsed.v), encoder.encode(await ownerCredentialFingerprint(account?.passwordHash ?? "")));
  return { iat: parsed.iat, current, line, ended };
}

export function ownerCookieName() { return OWNER_COOKIE; }
export function ownerSessionCookie(token: string, secure: boolean, seconds = SESSION_SECONDS) { return `${OWNER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure ? "; Secure" : ""}`; }
export function clearOwnerSessionCookie(secure: boolean) { return `${OWNER_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`; }

export function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export function requestIsSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(request.url).origin;
  // Browsers always send Origin on cross-site POSTs; with no Origin, accept only same-origin / direct navigation signals.
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

export async function ownerSessionFromRequest(request: Request) {
  return verifyOwnerSession(cookieValue(request, OWNER_COOKIE));
}
