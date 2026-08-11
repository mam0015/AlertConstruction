import { createPublicWorkflowRequest, customerEstimateDecision, getPublicWorkflow } from "../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../owner-auth";

function failed(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : "The request could not be completed." }, { status: 400 });
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return Response.json({ error: "Enter your project reference." }, { status: 400 });
  const data = await getPublicWorkflow(code);
  if (!data) return Response.json({ error: "We could not find that project reference." }, { status: 404 });
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const created = await createPublicWorkflowRequest(payload);
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
