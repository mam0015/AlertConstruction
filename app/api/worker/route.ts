import { adminSessionFromRequest } from "../../admin-auth";
import { requestIsSameOrigin } from "../../owner-auth";
import { isWorkerRole } from "../../staff-access";
import { getWorkerSnapshot, seedWorkerDevelopmentPreview, submitWorkerReport } from "../../../db/worker-store";

async function worker(request: Request) {
  const session = await adminSessionFromRequest(request);
  if (session && isWorkerRole(session.role)) return session;
  if (process.env.NODE_ENV === "development" && new URL(request.url).searchParams.get("previewWorker") === "1") {
    return { email: "electrician@alerttradiepro.demo", role: "Electrician" as const, expires: Date.now() + 60_000 };
  }
  return null;
}

export async function GET(request: Request) {
  const session = await worker(request);
  if (!session) return Response.json({ error: "Approved Worker sign-in required." }, { status: 401 });
  if (new URL(request.url).searchParams.get("previewWorker") === "1") await seedWorkerDevelopmentPreview();
  return Response.json({ data: await getWorkerSnapshot(session.email, session.role) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const session = await worker(request);
  if (!session) return Response.json({ error: "Approved Worker sign-in required." }, { status: 401 });
  if (new URL(request.url).searchParams.get("previewWorker") === "1") await seedWorkerDevelopmentPreview();
  try {
    const body = await request.json() as { action?: string; payload?: Record<string, unknown> };
    if (body.action !== "submit_report" || !body.payload) return Response.json({ error: "Invalid Worker action." }, { status: 400 });
    await submitWorkerReport(session.email, session.role, body.payload);
    return Response.json({ data: await getWorkerSnapshot(session.email, session.role) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The report could not be submitted." }, { status: 400 });
  }
}
