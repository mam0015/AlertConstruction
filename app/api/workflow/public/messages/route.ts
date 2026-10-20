import { clientAddress, sha256Hex, throttleHit, tooManyRequests } from "../../../../../db/throttle";
import { customerReplyMessage, getPublicWorkflow } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const body = (await request.json().catch(() => null) ?? {}) as { code?: unknown; body?: string };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^REQ-\d{4}-[A-F0-9]{32}$/i.test(code)) return Response.json({ error: "Project reference is not valid." }, { status: 400 });
    // Twenty messages per hour per project and visitor.
    const sent = await throttleHit(await sha256Hex(`customer-message|${code.toUpperCase()}|${clientAddress(request)}`), 20, 60 * 60 * 1000);
    if (!sent.allowed) return tooManyRequests("Too many messages. Try again shortly.", sent.retryAfterSeconds);
    await customerReplyMessage(code, body.body);
    return Response.json({ data: await getPublicWorkflow(code) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ error: /(?:required|too long|not found|closed)/i.test(message) ? message : "Your message could not be sent." }, { status: 400 });
  }
}
