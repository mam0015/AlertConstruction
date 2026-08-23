import { getStaffAccessRequest } from "../db/staff-store";
import { verifyCurrentTeamCode } from "../db/access-settings-store";
import { hashPbkdf2, safeEqual, verifyPbkdf2 } from "./secret-utils";

const TEAM_COOKIE = "atp_team_session";
const PENDING_COOKIE = "atp_staff_pending";
const SESSION_SECONDS = 60 * 60 * 12;
const PENDING_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export const staffRoles = ["Admin", "Manager", "Site Supervisor", "Worker", "Electrician", "Plumber", "Cleaner", "Carpenter", "Plasterer", "Tiler"] as const;
export type StaffRole = typeof staffRoles[number];

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

function requiredTeamSessionSecret() {
  const value = process.env.TEAM_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!value) throw new Error("TEAM_SESSION_SECRET is not configured.");
  return value;
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

export async function createAdminSession(email: string, role: StaffRole) {
  const payload = base64UrlEncode(JSON.stringify({
    email: email.toLowerCase(),
    role,
    expires: Date.now() + SESSION_SECONDS * 1000,
  }));
  return `${payload}.${base64UrlEncode(await hmac(payload))}`;
}

export async function verifyAdminSession(token?: string | null) {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { email?: string; role?: string; expires?: number };
    if (!parsed.email || !staffRoles.includes(parsed.role as StaffRole) || !parsed.expires || parsed.expires < Date.now()) return null;
    const current = await getStaffAccessRequest(parsed.email);
    if (!current || current.status !== "Approved" || current.role === "Unassigned") return null;
    return { email: current.email.toLowerCase(), role: current.role, expires: parsed.expires };
  } catch {
    return null;
  }
}

export async function createPendingStaffSession(email: string) {
  const payload = base64UrlEncode(JSON.stringify({
    email: email.toLowerCase(),
    purpose: "staff-approval",
    expires: Date.now() + PENDING_SECONDS * 1000,
  }));
  return `${payload}.${base64UrlEncode(await hmac(payload))}`;
}

export async function verifyPendingStaffSession(token?: string | null) {
  if (!token) return null;
  const [payload, signatureText, extra] = token.split(".");
  if (!payload || !signatureText || extra) return null;
  if (!safeEqual(await hmac(payload), base64UrlDecode(signatureText))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { email?: string; purpose?: string; expires?: number };
    if (!parsed.email || parsed.purpose !== "staff-approval" || !parsed.expires || parsed.expires < Date.now()) return null;
    return { email: parsed.email.toLowerCase(), expires: parsed.expires };
  } catch {
    return null;
  }
}

export function adminCookieName() { return TEAM_COOKIE; }
export function adminSessionCookie(token: string, secure: boolean) { return `${TEAM_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`; }
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
