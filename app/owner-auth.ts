import { getOwnerAccountByEmail } from "../db/access-settings-store";
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
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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

export async function verifyOwnerPassword(email: string, password: string) {
  const normalised = email.trim().toLowerCase();
  const account = await getOwnerAccountByEmail(normalised);
  const fallbackHash = process.env.OWNER_PASSWORD_HASH?.trim() ?? "";
  const valid = await verifyPbkdf2(password, account?.passwordHash ?? fallbackHash);
  return Boolean(account && valid);
}

async function credentialFingerprint(passwordHash: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`owner-session|${passwordHash}`)));
  return base64UrlEncode(digest.slice(0, 9));
}

export async function createOwnerSession(email: string, seconds = SESSION_SECONDS) {
  const account = await getOwnerAccountByEmail(email.trim().toLowerCase());
  const payload = base64UrlEncode(JSON.stringify({
    email: email.toLowerCase(),
    v: await credentialFingerprint(account?.passwordHash ?? ""),
    expires: Date.now() + seconds * 1000,
  }));
  return `${payload}.${base64UrlEncode(await hmac(payload))}`;
}

export async function verifyOwnerSession(token?: string | null) {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { email?: string; expires?: number; v?: string };
    if (!parsed.email || !parsed.expires || parsed.expires < Date.now()) return null;
    // Changing the Owner password changes the fingerprint and signs out every older session.
    const account = await getOwnerAccountByEmail(parsed.email.trim().toLowerCase());
    if (!account || !parsed.v || !safeEqual(encoder.encode(parsed.v), encoder.encode(await credentialFingerprint(account.passwordHash)))) return null;
    return { email: parsed.email.toLowerCase(), expires: parsed.expires };
  } catch {
    return null;
  }
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
