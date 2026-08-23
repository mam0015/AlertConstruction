import { adminSessionFromRequest } from "../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../owner-auth";
import type { OperationsRole } from "../../operations/types";
import { getOperationsSnapshot, performOperationsAction } from "../../../db/operations-store";

type Identity = { email: string; role: OperationsRole; name: string };

const previews: Record<string, Identity> = {
  owner: { email: "owner.preview@example.invalid", role: "Owner", name: "Owner Preview" },
  admin: { email: "admin.preview@example.invalid", role: "Admin", name: "Admin Preview" },
  supervisor: { email: "supervisor.preview@example.invalid", role: "Site Supervisor", name: "Site Supervisor Preview" },
};

async function identity(request: Request): Promise<Identity | null> {
  const owner = await ownerSessionFromRequest(request);
  if (owner) return { email: owner.email, role: "Owner", name: "Owner" };
  const staff = await adminSessionFromRequest(request);
  if (staff?.role === "Admin") return { email: staff.email, role: "Admin", name: "Admin 01" };
  if (staff?.role === "Site Supervisor") return { email: staff.email, role: "Site Supervisor", name: "Site Supervisor 01" };
  if (process.env.NODE_ENV === "development") return previews[new URL(request.url).searchParams.get("previewRole") ?? ""] ?? null;
  return null;
}

export async function GET(request: Request) {
  const viewer = await identity(request);
  if (!viewer) return Response.json({ error: "Owner, Admin or Site Supervisor sign-in required." }, { status: 401 });
  return Response.json({ data: await getOperationsSnapshot(viewer) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const viewer = await identity(request);
  if (!viewer) return Response.json({ error: "Owner, Admin or Site Supervisor sign-in required." }, { status: 401 });
  try {
    const body = await request.json() as { action?: string; payload?: Record<string, unknown> };
    if (!body.action || !body.payload) return Response.json({ error: "Invalid operations action." }, { status: 400 });
    await performOperationsAction(viewer, body.action, body.payload);
    return Response.json({ data: await getOperationsSnapshot(viewer) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The operation could not be saved." }, { status: 400 });
  }
}
