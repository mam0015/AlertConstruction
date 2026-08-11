import { adminSessionFromRequest } from "../../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../../owner-auth";
import { addWorkflowFile, getWorkflowFile, getWorkflowSnapshot } from "../../../../db/workflow-store";
import type { WorkflowRole } from "../../../workflow/types";

async function actor(request: Request): Promise<{ role: WorkflowRole; email: string } | null> {
  const owner = await ownerSessionFromRequest(request);
  if (owner) return { role: "owner", email: owner.email };
  const staff = await adminSessionFromRequest(request);
  if (staff?.role === "Admin") return { role: "admin", email: staff.email };
  if (staff?.role === "Site Supervisor") return { role: "supervisor", email: staff.email };
  if (process.env.NODE_ENV === "development") {
    const role = new URL(request.url).searchParams.get("previewRole") as WorkflowRole | null;
    if (role && ["owner", "admin", "supervisor"].includes(role)) return { role, email: role === "supervisor" ? "site.supervisor@alerttradiepro.demo" : `${role}@alerttradiepro.demo` };
  }
  return null;
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const identity = await actor(request);
  if (!identity) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const caseId = Number(form.get("caseId"));
    const category = String(form.get("category") ?? "");
    if (!(file instanceof File) || !Number.isInteger(caseId) || !["site_visit", "progress"].includes(category)) throw new Error("Choose a valid project photo.");
    if (!file.type.startsWith("image/")) throw new Error("Site uploads must be image files.");
    if (file.size > 12 * 1024 * 1024) throw new Error("Each photo must be 12 MB or smaller.");
    const snapshot = await getWorkflowSnapshot(identity.role, identity.email);
    const item = snapshot.cases.find((entry) => entry.id === caseId);
    if (!item) throw new Error("This project is not available to your role.");
    const { env } = await import("cloudflare:workers");
    if (!env.BUCKET) throw new Error("Project photo storage is not configured.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100);
    const prefix = item.projectFolder || `requests/${item.requestCode}`;
    const objectKey = `${prefix}/photos/${category}/${crypto.randomUUID()}-${safeName}`;
    await env.BUCKET.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { caseId: String(caseId), uploadedBy: identity.email, originalName: file.name } });
    const id = await addWorkflowFile(caseId, category, objectKey, file, identity.email);
    return Response.json({ data: { id, fileName: file.name, url: `/api/workflow/files?id=${id}` } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Photo upload failed." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid file." }, { status: 400 });
  const identity = await actor(request);
  const record = await getWorkflowFile(id, !identity);
  const { env } = await import("cloudflare:workers");
  if (!record || !env.BUCKET) return Response.json({ error: "File not found." }, { status: 404 });
  const object = await env.BUCKET.get(record.objectKey);
  if (!object) return Response.json({ error: "File not found." }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Disposition": `inline; filename="${record.fileName.replaceAll('"', '')}"`,
      "Cache-Control": identity ? "private, no-store" : "public, max-age=300",
    },
  });
}
