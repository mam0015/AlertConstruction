import { adminSessionFromRequest } from "../../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../../owner-auth";
import { createTeamCase, getWorkflowSnapshot } from "../../../../db/workflow-store";

// The Owner or Admin opens a project for a customer who did not use the website form. Answers with the customer's private code.
export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const owner = await ownerSessionFromRequest(request);
  const staff = owner ? null : await adminSessionFromRequest(request);
  const actor = owner ? { role: "owner" as const, email: owner.email } : staff?.role === "Admin" ? { role: "admin" as const, email: staff.email } : null;
  if (!actor) return Response.json({ error: "Owner or Admin sign-in required." }, { status: 401 });
  try {
    const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "The project details could not be read." }, { status: 400 });
    const created = await createTeamCase(actor.role, actor.email, payload);
    // The project exists now. If the fresh list cannot be read, the screen still gets the project (and reloads the list itself).
    const snapshot = await getWorkflowSnapshot(actor.role, actor.email).catch(() => null);
    return Response.json({ data: { created, snapshot } }, { status: created.repeated ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    return Response.json({ error: error instanceof Error ? error.message : "The project could not be created." }, { status: status === 409 || status === 403 ? status : 400 });
  }
}
