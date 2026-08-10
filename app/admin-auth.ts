const ADMIN_COOKIE = "atp_admin_session";
const PENDING_COOKIE = "atp_staff_pending";
const SESSION_SECONDS = 60 * 60 * 8;
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

function safeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function required(name: "ADMIN_EMAIL" | "ADMIN_PASSWORD_HASH" | "ADMIN_TEAM_CODE_HASH" | "ADMIN_SESSION_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function verifyStoredSecret(value: string, storedHash: string) {
  const [algorithm, iterationsText, saltText, expectedText] = storedHash.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2" || iterations !== 100_000 || !saltText || !expectedText) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(value), "PBKDF2", false, ["deriveBits"]);
  const expected = base64UrlDecode(expectedText);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64UrlDecode(saltText), iterations }, key, expected.length * 8));
  return safeEqual(actual, expected);
}

export async function hashStaffPassword(value: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(value), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256));
  return `pbkdf2$100000$${base64UrlEncode(salt)}$${base64UrlEncode(bits)}`;
}

export function verifyCompanyTeamCode(teamCode: string) {
  return verifyStoredSecret(teamCode.trim().toUpperCase(), required("ADMIN_TEAM_CODE_HASH"));
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(required("ADMIN_SESSION_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function registeredAdminEmail() {
  return required("ADMIN_EMAIL").toLowerCase();
}

export async function verifyAdminCredentials(password: string, teamCode: string) {
  return Boolean(password && teamCode && await verifyStoredSecret(password, required("ADMIN_PASSWORD_HASH")) && await verifyCompanyTeamCode(teamCode));
}

export async function createAdminSession(email: string, role: StaffRole = "Admin") {
  const payload = base64UrlEncode(JSON.stringify({ email: email.toLowerCase(), role, expires: Date.now() + SESSION_SECONDS * 1000 }));
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
    return { email: parsed.email.toLowerCase(), role: parsed.role as StaffRole, expires: parsed.expires };
  } catch {
    return null;
  }
}

export async function createPendingStaffSession(email: string) {
  const payload = base64UrlEncode(JSON.stringify({ email: email.toLowerCase(), purpose: "staff-approval", expires: Date.now() + PENDING_SECONDS * 1000 }));
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
  } catch { return null; }
}

export function adminCookieName() { return ADMIN_COOKIE; }
export function adminSessionCookie(token: string, secure: boolean) { return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`; }
export function clearAdminSessionCookie(secure: boolean) { return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`; }
export function pendingStaffCookieName() { return PENDING_COOKIE; }
export function pendingStaffSessionCookie(token: string, secure: boolean) { return `${PENDING_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${PENDING_SECONDS}${secure ? "; Secure" : ""}`; }
export function clearPendingStaffSessionCookie(secure: boolean) { return `${PENDING_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`; }
export function cookieValue(request: Request, name: string) { const cookies = request.headers.get("cookie") ?? ""; for (const part of cookies.split(";")) { const [key, ...value] = part.trim().split("="); if (key === name) return value.join("="); } return null; }
export async function adminSessionFromRequest(request: Request) { return verifyAdminSession(cookieValue(request, ADMIN_COOKIE)); }
