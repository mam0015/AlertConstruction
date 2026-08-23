import { adminSessionFromRequest } from "../../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../../owner-auth";
import { getWorkerManagementSnapshot, performWorkerManagementAction, seedWorkerDevelopmentPreview } from "../../../../db/worker-store";

async function manager(request: Request): Promise<{ role: "Owner" | "Admin"; email: string } | null> {
  const owner = await ownerSessionFromRequest(request);
  if (owner) return { role: "Owner", email: owner.email };
  const staff = await adminSessionFromRequest(request);
  if (staff?.role === "Admin") return { role: "Admin", email: staff.email };
  if (process.env.NODE_ENV === "development") {
    const preview = new URL(request.url).searchParams.get("previewRole");
    if (preview === "owner" || preview === "admin") return { role: preview === "owner" ? "Owner" : "Admin", email: `${preview}@alerttradiepro.demo` };
  }
  return null;
}

export async function GET(request: Request) {
  if (!await manager(request)) return Response.json({ error: "Owner or Admin sign-in required." }, { status: 401 });
  if (process.env.NODE_ENV === "development") await seedWorkerDevelopmentPreview();
  return Response.json({ data: await getWorkerManagementSnapshot() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const identity = await manager(request);
  if (!identity) return Response.json({ error: "Owner or Admin sign-in required." }, { status: 401 });
  if (process.env.NODE_ENV === "development") await seedWorkerDevelopmentPreview();
  try {
    const body = await request.json() as { action?: string; payload?: Record<string, unknown> };
    if (!body.action || !body.payload) return Response.json({ error: "Invalid Worker management action." }, { status: 400 });
    await performWorkerManagementAction(identity.role, identity.email, body.action, body.payload);
    return Response.json({ data: await getWorkerManagementSnapshot() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The Worker change could not be saved." }, { status: 400 });
  }
}
