import { adminSessionFromRequest, type StaffRole } from "../../admin-auth";
import { requestIsSameOrigin } from "../../owner-auth";
import { getPersonalTaskSnapshot, seedTaskDevelopmentPreview, setPersonalTaskStatus } from "../../../db/task-store";

const previewIdentity: Record<string, { email: string; role: StaffRole }> = {
  Admin: { email: "admin@alerttradiepro.demo", role: "Admin" },
  Manager: { email: "manager@alerttradiepro.demo", role: "Manager" },
  "Site Supervisor": { email: "supervisor@alerttradiepro.demo", role: "Site Supervisor" },
  Worker: { email: "electrician@alerttradiepro.demo", role: "Electrician" },
  Electrician: { email: "electrician@alerttradiepro.demo", role: "Electrician" },
};

async function assignee(request: Request) {
  const session = await adminSessionFromRequest(request);
  if (session) return session;
  if (process.env.NODE_ENV === "development") {
    const preview = new URL(request.url).searchParams.get("previewRole") ?? "";
    const identity = previewIdentity[preview];
    if (identity) return { ...identity, expires: Date.now() + 60_000 };
  }
  return null;
}

export async function GET(request: Request) {
  const identity = await assignee(request);
  if (!identity) return Response.json({ error: "Approved team sign-in required." }, { status: 401 });
  if (process.env.NODE_ENV === "development") await seedTaskDevelopmentPreview();
  return Response.json({ data: await getPersonalTaskSnapshot(identity.email, identity.role) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const identity = await assignee(request);
  if (!identity) return Response.json({ error: "Approved team sign-in required." }, { status: 401 });
  if (process.env.NODE_ENV === "development") await seedTaskDevelopmentPreview();
  try {
    const body = await request.json() as { action?: string; payload?: Record<string, unknown> };
    if (body.action !== "set_status" || !body.payload) return Response.json({ error: "Invalid task action." }, { status: 400 });
    await setPersonalTaskStatus(identity.email, body.payload.taskId, body.payload.status);
    return Response.json({ data: await getPersonalTaskSnapshot(identity.email, identity.role) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The task could not be updated." }, { status: 400 });
  }
}
