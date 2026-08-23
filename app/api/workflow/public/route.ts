import { createPublicWorkflowRequest, customerEstimateDecision, getPublicWorkflow } from "../../../../db/workflow-store";
import { clearLoginFailures, getLoginAttempt, recordLoginFailure } from "../../../../db/owner-store";
import { requestIsSameOrigin } from "../../../owner-auth";

async function throttleKey(request: Request, purpose: string) {
  const input = `${purpose}|${request.headers.get("cf-connecting-ip") ?? "local"}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function blocked(key: string) {
  const attempt = await getLoginAttempt(key);
  return { attempt, isBlocked: Boolean(attempt && attempt.lockedUntil > Date.now()) };
}

function failed(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safe = /(?:required|too long|valid email|accept the Privacy Notice|current project stage|project was not found)/i.test(message)
    ? message
    : "The request could not be completed.";
  return Response.json({ error: safe }, { status: 400 });
}

export async function GET(request: Request) {
  const key = await throttleKey(request, "customer-track");
  const limit = await blocked(key);
  if (limit.isBlocked) return Response.json({ error: "Too many reference attempts. Try again later." }, { status: 429 });
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return Response.json({ error: "Enter your project reference." }, { status: 400 });
  const data = await getPublicWorkflow(code);
  if (!data) {
    const count = (limit.attempt?.failedCount ?? 0) + 1;
    await recordLoginFailure(key, count, count >= 12 ? Date.now() + 30 * 60 * 1000 : 0);
    return Response.json({ error: "We could not find that project reference." }, { status: 404 });
  }
  await clearLoginFailures(key);
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const key = await throttleKey(request, "customer-create");
    const limit = await blocked(key);
    if (limit.isBlocked) return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });
    const payload = await request.json() as Record<string, unknown>;
    const created = await createPublicWorkflowRequest(payload);
    const count = (limit.attempt?.failedCount ?? 0) + 1;
    await recordLoginFailure(key, count, count >= 5 ? Date.now() + 60 * 60 * 1000 : 0);
    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}

export async function PATCH(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const body = await request.json() as { code?: string; decision?: "accept" | "decline" };
    if (!body.code || !body.decision || !["accept", "decline"].includes(body.decision)) return Response.json({ error: "Invalid estimate decision." }, { status: 400 });
    await customerEstimateDecision(body.code, body.decision);
    return Response.json({ data: await getPublicWorkflow(body.code) });
  } catch (error) {
    return failed(error);
  }
}
