import { clientAddress, sha256Hex, throttleHit, throttleRefund, tooManyRequests } from "../../../../../db/throttle";
import { customerMessagePrior, customerReplyMessage, getPublicWorkflow } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

const HOUR = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const body = (await request.json().catch(() => null) ?? {}) as { code?: unknown; body?: unknown; clientKey?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^REQ-\d{4}-[A-F0-9]{32}$/i.test(code)) return Response.json({ error: "Project reference is not valid." }, { status: 400 });
    // An empty or too-long message is refused before it is counted, so a customer correcting a typing mistake is never locked out.
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) return Response.json({ error: "Message is required." }, { status: 400 });
    if (text.length > 2000) return Response.json({ error: "Message is too long (up to 2000 characters)." }, { status: 400 });
    // The same message sent again with its key (a lost answer) is acknowledged without counting, even at the hourly limit.
    const prior = await customerMessagePrior(code, text, body.clientKey);
    if (prior === "same") return Response.json({ data: await getPublicWorkflow(code).catch(() => null), saved: true }, { status: 201 });
    if (prior === "different") return Response.json({ error: "This was already sent with different text. Please send it again." }, { status: 409 });
    // Forty messages per hour per project and visitor: enough for a real conversation, not enough to flood the team.
    const key = await sha256Hex(`customer-message|${code.toUpperCase()}|${clientAddress(request)}`);
    const sent = await throttleHit(key, 40, HOUR);
    if (!sent.allowed) return tooManyRequests("Too many messages. Try again shortly.", sent.retryAfterSeconds);
    let saved: "saved" | "repeated";
    try {
      saved = await customerReplyMessage(code, text, body.clientKey);
    } catch (error) {
      await throttleRefund(key).catch(() => undefined); // a message that was not saved does not count
      throw error;
    }
    if (saved === "repeated") await throttleRefund(key).catch(() => undefined); // the same message sent again is not counted twice
    // The message is saved. If the fresh page cannot be read right now, the customer is still told it was sent (and the page reloads itself).
    const data = await getPublicWorkflow(code).catch(() => null);
    return Response.json({ data, saved: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if ((error as { status?: number })?.status === 409) return Response.json({ error: message }, { status: 409 });
    return Response.json({ error: /(?:required|too long|not found|closed)/i.test(message) ? message : "Your message could not be sent." }, { status: 400 });
  }
}
