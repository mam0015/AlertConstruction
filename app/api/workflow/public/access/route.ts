import { clearLoginFailures, getLoginAttempt, recordLoginFailure } from "../../../../../db/owner-store";
import { findCustomerProjectsByContact, normaliseCustomerContact, type CustomerContactKind } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

async function requestKey(request: Request, kind: CustomerContactKind) {
  const input = `customer-access|${kind}|${request.headers.get("cf-connecting-ip") ?? "local"}`;
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { method?: string; contact?: string };
  const kind = body.method === "email" || body.method === "phone" ? body.method : null;
  if (!kind) return Response.json({ error: "Choose email or phone access." }, { status: 400 });

  const contact = normaliseCustomerContact(kind, body.contact ?? "");
  const valid = kind === "email"
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && contact.length <= 254
    : /^0\d{9}$/.test(contact);
  if (!valid) return Response.json({ error: kind === "email" ? "Enter a valid email address." : "Enter a valid Australian phone number." }, { status: 400 });
  const key = await requestKey(request, kind);
  const attempt = await getLoginAttempt(key);
  if (attempt && attempt.lockedUntil > Date.now()) return Response.json({ error: "Too many lookup attempts. Try again later." }, { status: 429 });

  const projects = await findCustomerProjectsByContact(kind, contact);
  if (!projects.length) {
    const count = (attempt?.failedCount ?? 0) + 1;
    await recordLoginFailure(key, count, count >= 5 ? Date.now() + 60 * 60 * 1000 : 0);
    return Response.json({ error: "No project matches that saved email or phone number." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  await clearLoginFailures(key);
  return Response.json({ ok: true, projects }, { headers: { "Cache-Control": "no-store" } });
}
