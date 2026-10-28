import { clientAddress, sha256Hex, throttleHit, throttleRefund, tooManyRequests } from "../../../../../db/throttle";
import { distinctivePlaceWords, findCustomerProjectsByContact, normaliseCustomerContact, type CustomerContactKind } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

// Wrong guesses are limited per visitor address (10 an hour) and, more loosely, per targeted contact (12 an hour and 30 a day), so one person
// guessing cannot be stopped by an address change, and one person cannot easily lock a real customer out of their own project.
const WINDOW = 60 * 60 * 1000;
async function limits(request: Request, kind: CustomerContactKind, contact: string): Promise<Array<{ key: string; limit: number; window?: number }>> {
  return [
    { key: await sha256Hex(`customer-access|${kind}|${clientAddress(request)}`), limit: 10 },
    { key: await sha256Hex(`customer-access-target|${kind}|${contact}`), limit: 12 },
    { key: await sha256Hex(`customer-access-target-day|${kind}|${contact}`), limit: 30, window: 24 * 60 * 60 * 1000 },
  ];
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
  if (!distinctivePlaceWords(location).length) return Response.json({ error: "Enter the suburb or street name you gave us, not only a word like “street”, “road” or “Melbourne”." }, { status: 400 });

  // Every attempt takes its slots first, in single atomic statements, so a burst of parallel guesses cannot all pass a "not over the limit yet" check.
  // The visitor's own address is charged first: a visitor who is already over their limit never uses up the TARGET's allowance, so one person cannot
  // lock a real customer out by hammering their e-mail address. A lookup that finds the project gives its slots back: only wrong guesses use them up.
  const [byAddress, byTarget, byTargetDay] = await limits(request, kind, contact);
  const mine = await throttleHit(byAddress.key, byAddress.limit, WINDOW);
  if (!mine.allowed) return tooManyRequests("Too many lookup attempts. Try again later.", mine.retryAfterSeconds);
  const theirs = await throttleHit(byTarget.key, byTarget.limit, WINDOW);
  const theirsToday = theirs.allowed ? await throttleHit(byTargetDay.key, byTargetDay.limit, byTargetDay.window ?? 24 * 60 * 60 * 1000) : null;
  if (!theirs.allowed || !theirsToday?.allowed) {
    await throttleRefund(byAddress.key);
    if (theirs.allowed) await throttleRefund(byTarget.key);
    return tooManyRequests("Too many lookup attempts. Try again later.", Math.max(theirs.retryAfterSeconds, theirsToday?.retryAfterSeconds ?? 0));
  }

  const projects = await findCustomerProjectsByContact(kind, contact, location);
  if (!projects.length) return Response.json({ error: "No project matches those details." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  await Promise.all([throttleRefund(byAddress.key), throttleRefund(byTarget.key), throttleRefund(byTargetDay.key)]);
  return Response.json({ ok: true, projects }, { headers: { "Cache-Control": "no-store" } });
}
