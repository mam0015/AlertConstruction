import { getLoginAttempt, recordLoginFailure } from "../../../../../db/owner-store";
import { customerReplyMessage, getPublicWorkflow } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

async function throttleKey(request: Request, code: string) {
  const input = `customer-message|${code.toUpperCase()}|${request.headers.get("cf-connecting-ip") ?? "unknown"}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const body = await request.json() as { code?: string; body?: string };
    const code = body.code?.trim() ?? "";
    if (!/^REQ-\d{4}-[A-F0-9]{32}$/i.test(code)) return Response.json({ error: "Project reference is not valid." }, { status: 400 });
    const key = await throttleKey(request, code);
    const attempt = await getLoginAttempt(key);
    if (attempt && attempt.lockedUntil > Date.now()) return Response.json({ error: "Too many messages. Try again shortly." }, { status: 429 });
    await customerReplyMessage(code, body.body);
    // Allow 20 messages per hour per project and visitor.
    const count = (attempt?.failedCount ?? 0) + 1;
    if (count >= 20) await recordLoginFailure(key, 0, Date.now() + 60 * 60 * 1000);
    else await recordLoginFailure(key, count, 0);
    return Response.json({ data: await getPublicWorkflow(code) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ error: /(?:required|too long|not found|closed)/i.test(message) ? message : "Your message could not be sent." }, { status: 400 });
  }
}
