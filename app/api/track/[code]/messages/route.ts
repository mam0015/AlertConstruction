import { createCustomerMessage, getTrackingRecord } from "../../../../../db/request-store";
import { requestIsSameOrigin } from "../../../../owner-auth";
import { clientAddress, sha256Hex, throttleHit, throttleRefund, tooManyRequests } from "../../../../../db/throttle";

// Older references were only five digits and many are still in use. A wrong reference here uses the SAME allowance as the lookup page
// (12 per 30 minutes per visitor, counted before the lookup in one atomic statement; a right reference gives its slot back), so this
// form cannot be used to try every code. Real messages are limited per visitor across ALL references (10 an hour) and per reference
// across all visitors (20 an hour), so nobody can flood Admin's inbox, or Jarvis, which reads these messages.
const LOOKUP_WINDOW = 30 * 60 * 1000;
const SEND_WINDOW = 60 * 60 * 1000;

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const { code } = await context.params;
  const payload = (await request.json().catch(() => null) ?? {}) as { subject?: unknown; message?: unknown };
  const subject = typeof payload.subject === "string" ? payload.subject.trim().slice(0, 180) : "";
  const message = typeof payload.message === "string" ? payload.message.trim().slice(0, 4000) : "";
  if (!subject || !message) return Response.json({ error: "Enter a subject and message." }, { status: 400 });

  const address = clientAddress(request);
  const lookupKey = await sha256Hex(`legacy-track|${address}`);
  const slot = await throttleHit(lookupKey, 12, LOOKUP_WINDOW);
  if (!slot.allowed) return tooManyRequests("Too many reference attempts. Try again later.", slot.retryAfterSeconds);
  let decoded = "";
  try { decoded = decodeURIComponent(code); } catch { /* a malformed escape is simply an unknown reference */ }
  let record: Awaited<ReturnType<typeof getTrackingRecord>> = null;
  try {
    record = decoded ? await getTrackingRecord(decoded) : null;
  } catch {
    // The database did not answer: that is not a wrong guess, so it must not use up the visitor's allowance.
    await throttleRefund(lookupKey).catch(() => undefined);
    return Response.json({ error: "This service is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!record) return Response.json({ error: "Project reference not found." }, { status: 404 });
  await throttleRefund(lookupKey);

  const visitorKey = await sha256Hex(`legacy-track-message|${address}`);
  const referenceKey = await sha256Hex(`legacy-track-message-ref|${record.code}`);
  const byVisitor = await throttleHit(visitorKey, 10, SEND_WINDOW);
  if (!byVisitor.allowed) return tooManyRequests("Too many messages. Try again later.", byVisitor.retryAfterSeconds);
  const byReference = await throttleHit(referenceKey, 20, SEND_WINDOW);
  if (!byReference.allowed) {
    await throttleRefund(visitorKey);
    return tooManyRequests("Too many messages for this project. Try again later.", byReference.retryAfterSeconds);
  }
  try {
    await createCustomerMessage(record.code, subject, message);
    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    await Promise.all([throttleRefund(visitorKey), throttleRefund(referenceKey)]);
    return Response.json({ error: "The message could not be saved." }, { status: 400 });
  }
}
