import { clearLoginFailures, getLoginAttempt, recordLoginFailure } from "../../../../../db/owner-store";
import { findCustomerProjectsByContact, normaliseCustomerContact, type CustomerContactKind } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

async function sha256Hex(input: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Throttle per visitor IP and, separately, per targeted contact, so guessing is limited even when many IPs are used or the IP header is absent.
async function requestKeys(request: Request, kind: CustomerContactKind, contact: string) {
  const ip = request.headers.get("cf-connecting-ip");
  const keys = [await sha256Hex(`customer-access-target|${kind}|${contact}`)];
  if (ip) keys.push(await sha256Hex(`customer-access|${kind}|${ip}`));
  return keys;
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { method?: string; contact?: string; location?: string };
  const kind = body.method === "email" || body.method === "phone" ? body.method : null;
  if (!kind) return Response.json({ error: "Choose email or phone access." }, { status: 400 });

  const contact = normaliseCustomerContact(kind, body.contact ?? "");
  const location = (body.location ?? "").trim().slice(0, 120);
  const valid = kind === "email"
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && contact.length <= 254
    : /^0\d{9}$/.test(contact);
  if (!valid) return Response.json({ error: kind === "email" ? "Enter a valid email address." : "Enter a valid Australian phone number." }, { status: 400 });
  if (location.length < 4) return Response.json({ error: "Enter the site address or suburb you gave us (at least 4 characters)." }, { status: 400 });

  const keys = await requestKeys(request, kind, contact);
  const attempts = await Promise.all(keys.map((key) => getLoginAttempt(key)));
  if (attempts.some((attempt) => attempt && attempt.lockedUntil > Date.now())) return Response.json({ error: "Too many lookup attempts. Try again later." }, { status: 429 });

  const projects = await findCustomerProjectsByContact(kind, contact, location);
  if (!projects.length) {
    await Promise.all(keys.map((key, index) => {
      const count = (attempts[index]?.failedCount ?? 0) + 1;
      return recordLoginFailure(key, count, count >= 5 ? Date.now() + 60 * 60 * 1000 : 0);
    }));
    return Response.json({ error: "No project matches those details." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  await Promise.all(keys.map((key) => clearLoginFailures(key)));
  return Response.json({ ok: true, projects }, { headers: { "Cache-Control": "no-store" } });
}
