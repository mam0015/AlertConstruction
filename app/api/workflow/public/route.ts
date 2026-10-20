import { createPublicWorkflowRequest, customerChangeDecision, customerEstimateDecision, getPublicWorkflow } from "../../../../db/workflow-store";
import { clientAddress, sha256Hex, throttleExceeded, throttleHit, tooManyRequests } from "../../../../db/throttle";
import { requestIsSameOrigin } from "../../../owner-auth";

const TRACK_WINDOW = 30 * 60 * 1000;
const CREATE_WINDOW = 60 * 60 * 1000;

function failed(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safe = /(?:required|too long|valid email|accept the Privacy Notice|current project stage|project was not found|no longer waiting for a decision)/i.test(message)
    ? message
    : "The request could not be completed.";
  return Response.json({ error: safe }, { status: 400 });
}

export async function GET(request: Request) {
  const key = await sha256Hex(`customer-track|${clientAddress(request)}`);
  const limit = await throttleExceeded(key, 12, TRACK_WINDOW);
  if (limit.exceeded) return tooManyRequests("Too many reference attempts. Try again later.", limit.retryAfterSeconds);
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return Response.json({ error: "Enter your project reference." }, { status: 400 });
  const data = await getPublicWorkflow(code);
  if (!data) {
    await throttleHit(key, 12, TRACK_WINDOW);
    return Response.json({ error: "We could not find that project reference." }, { status: 404 });
  }
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    // Five new requests per hour per visitor; typing mistakes that are refused do not count, and the count really expires.
    const key = await sha256Hex(`customer-create|${clientAddress(request)}`);
    const limit = await throttleExceeded(key, 5, CREATE_WINDOW);
    if (limit.exceeded) return tooManyRequests("Too many requests. Try again later.", limit.retryAfterSeconds);
    const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "The request could not be read." }, { status: 400 });
    const created = await createPublicWorkflowRequest(payload);
    await throttleHit(key, 5, CREATE_WINDOW);
    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}

export async function PATCH(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const body = await request.json().catch(() => null) as { code?: string; decision?: "accept" | "decline"; proposalId?: number; reply?: string } | null;
    if (!body || typeof body.code !== "string" || !body.code || !body.decision || !["accept", "decline"].includes(body.decision)) return Response.json({ error: "Invalid decision." }, { status: 400 });
    if (Number.isInteger(body.proposalId)) await customerChangeDecision(body.code, body.proposalId!, body.decision, body.reply ?? "");
    else await customerEstimateDecision(body.code, body.decision);
    return Response.json({ data: await getPublicWorkflow(body.code) });
  } catch (error) {
    return failed(error);
  }
}
