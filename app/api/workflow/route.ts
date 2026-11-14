import { adminSessionFromRequest } from "../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../owner-auth";
import { getWorkflowSnapshot, performWorkflowAction } from "../../../db/workflow-store";
import type { WorkflowRole } from "../../workflow/types";

async function actor(request: Request): Promise<{ role: WorkflowRole; email: string } | null> {
  const owner = await ownerSessionFromRequest(request);
  if (owner) return { role: "owner", email: owner.email };
  const staff = await adminSessionFromRequest(request);
  if (staff?.role === "Admin") return { role: "admin", email: staff.email };
  if (staff?.role === "Site Supervisor") return { role: "supervisor", email: staff.email };
  if (staff?.role === "Estimator") return { role: "estimator", email: staff.email };
  if (process.env.NODE_ENV === "development") {
    const previewRole = new URL(request.url).searchParams.get("previewRole") as WorkflowRole | null;
    if (previewRole && ["owner", "admin", "supervisor", "estimator"].includes(previewRole)) {
      return { role: previewRole, email: previewRole === "supervisor" ? "site.supervisor@alerttradiepro.demo" : `${previewRole}@alerttradiepro.demo` };
    }
  }
  return null;
}

function failed(error: unknown) {
  const status = (error as { status?: number })?.status;
  return Response.json({ error: error instanceof Error ? error.message : "The workflow action could not be completed." }, { status: status === 409 || status === 403 ? status : 400 });
}

export async function GET(request: Request) {
  const identity = await actor(request);
  if (!identity) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    return Response.json({ data: await getWorkflowSnapshot(identity.role, identity.email) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Only the Owner's switch is reported as such; any other failure keeps its usual server error.
    if ((error as { status?: number })?.status === 403) return failed(error);
    throw error;
  }
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const identity = await actor(request);
  if (!identity) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    const body = await request.json() as { action?: string; caseId?: number; payload?: Record<string, unknown> };
    if (!body.action || !Number.isInteger(body.caseId)) return Response.json({ error: "Invalid workflow action." }, { status: 400 });
    const outcome = await performWorkflowAction(identity.role, identity.email, body.action, body.caseId!, body.payload ?? {});
    const revision = (outcome as { revision?: unknown } | undefined)?.revision;
    // The change is saved. If the fresh board cannot be read right now, the screen is still told it worked (and reloads the board itself),
    // so nobody presses again and saves it twice.
    const data = await getWorkflowSnapshot(identity.role, identity.email).catch(() => null);
    return Response.json({ data, saved: true, ...(typeof revision === "string" ? { revision } : {}) });
  } catch (error) {
    return failed(error);
  }
}
