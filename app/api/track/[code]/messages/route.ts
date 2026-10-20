import { createCustomerMessage } from "../../../../../db/request-store";
import { requestIsSameOrigin } from "../../../../owner-auth";
import { clientAddress, sha256Hex, throttleHit, tooManyRequests } from "../../../../../db/throttle";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const { code } = await context.params;
  const payload = (await request.json().catch(() => null) ?? {}) as { subject?: unknown; message?: unknown };
  const subject = typeof payload.subject === "string" ? payload.subject.trim().slice(0, 180) : "";
  const message = typeof payload.message === "string" ? payload.message.trim().slice(0, 4000) : "";
  if (!subject || !message) return Response.json({ error: "Enter a subject and message." }, { status: 400 });
  // Ten messages an hour per visitor and reference: the old reference is only five digits, so this door must not be a megaphone.
  const sent = await throttleHit(await sha256Hex(`legacy-track-message|${code.toUpperCase()}|${clientAddress(request)}`), 10, 60 * 60 * 1000);
  if (!sent.allowed) return tooManyRequests("Too many messages. Try again later.", sent.retryAfterSeconds);
  try {
    await createCustomerMessage(decodeURIComponent(code), subject, message);
    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The message could not be saved." }, { status: 400 });
  }
}
