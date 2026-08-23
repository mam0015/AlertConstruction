import { adminSessionFromRequest } from "../../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../../owner-auth";
import { isWorkerRole } from "../../../staff-access";
import { addWorkerProjectFile, getWorkerFile, getWorkerManagementSnapshot } from "../../../../db/worker-store";

async function identity(request: Request) {
  const owner = await ownerSessionFromRequest(request);
  if (owner) return { management: true, role: "Owner" as const, email: owner.email };
  const staff = await adminSessionFromRequest(request);
  if (staff?.role === "Admin") return { management: true, role: "Admin" as const, email: staff.email };
  if (staff && isWorkerRole(staff.role)) return { management: false, role: staff.role, email: staff.email };
  if (process.env.NODE_ENV === "development") {
    const params = new URL(request.url).searchParams;
    if (params.get("previewWorker") === "1") return { management: false, role: "Electrician" as const, email: "electrician@alerttradiepro.demo" };
    const preview = params.get("previewRole");
    if (preview === "owner" || preview === "admin") return { management: true, role: preview === "owner" ? "Owner" as const : "Admin" as const, email: `${preview}@alerttradiepro.demo` };
  }
  return null;
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const actor = await identity(request);
  if (!actor?.management) return Response.json({ error: "Owner or Admin sign-in required." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const caseId = Number(form.get("caseId"));
    const workerEmails = JSON.parse(String(form.get("workerEmails") ?? "[]")) as string[];
    if (!(file instanceof File)) throw new Error("Choose a project file.");
    if (file.size <= 0 || file.size > 25 * 1024 * 1024) throw new Error("Project files must be 25 MB or smaller.");
    await addWorkerProjectFile(caseId, file, workerEmails, actor.role as "Owner" | "Admin", actor.email);
    return Response.json({ data: await getWorkerManagementSnapshot() }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The project file could not be uploaded." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const actor = await identity(request);
  if (!actor) return Response.json({ error: "Approved team sign-in required." }, { status: 401 });
  const fileId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(fileId)) return Response.json({ error: "Invalid file." }, { status: 400 });
  const record = await getWorkerFile(fileId, actor.email, actor.management);
  const { env } = await import("cloudflare:workers");
  if (!record || !env.BUCKET) return Response.json({ error: "File not found or not shared with this account." }, { status: 404 });
  const object = await env.BUCKET.get(record.objectKey);
  if (!object) return Response.json({ error: "File not found." }, { status: 404 });
  return new Response(object.body, { headers: {
    "Content-Type": record.mimeType,
    "Content-Disposition": `inline; filename="${record.fileName.replaceAll('"', '')}"`,
    "Cache-Control": "private, no-store",
  } });
}
