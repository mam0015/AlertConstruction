import { adminSessionFromRequest } from "../../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../../owner-auth";
import { addWorkflowFile, getWorkflowFile, getWorkflowSnapshot } from "../../../../db/workflow-store";
import type { WorkflowRole } from "../../../workflow/types";

async function imageSignatureMatches(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (file.type === "image/heic" || file.type === "image/heif") return new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
  if (file.type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  return false;
}

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
    if (!(file instanceof File) || !Number.isInteger(caseId) || !["site_visit", "progress", "quality", "document"].includes(category)) throw new Error("Choose a valid project photo.");
    if (category === "document" && !["admin", "owner"].includes(identity.role)) throw new Error("Only Admin or Owner can add documents to the project folder.");
    const safeImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
    const safeTypes = category === "document" ? new Set([...safeImageTypes, "application/pdf"]) : safeImageTypes;
    if (!safeTypes.has(file.type.toLowerCase())) throw new Error(category === "document" ? "Only JPEG, PNG, WebP, HEIC or PDF files are accepted." : "Only JPEG, PNG, WebP or HEIC site photos are accepted.");
    if (!await imageSignatureMatches(file)) throw new Error("The uploaded file content does not match its file type.");
    const maxSize = category === "document" ? 20 * 1024 * 1024 : 12 * 1024 * 1024;
    if (file.size > maxSize) throw new Error(`Each file must be ${category === "document" ? 20 : 12} MB or smaller.`);
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
  const disposition = record.mimeType.startsWith("image/") ? "inline" : "attachment";
  return new Response(object.body, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Disposition": `${disposition}; filename="${record.fileName.replace(/[\r\n"\\]/g, "").slice(-100)}"`,
      "Cache-Control": identity ? "private, no-store" : "public, max-age=300",
    },
  });
}
