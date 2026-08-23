import { addCustomerRequestFile, getCustomerUploadTarget } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function signatureMatches(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (file.type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  return false;
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  let objectKey = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    const caseId = Number(form.get("caseId"));
    const code = String(form.get("code") ?? "").trim();
    if (!(file instanceof File) || !Number.isInteger(caseId) || caseId < 1 || !code) throw new Error("Choose a valid customer document.");
    if (!allowedTypes.has(file.type.toLowerCase())) throw new Error("Only JPG, PNG, WebP and PDF files are accepted.");
    if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("Each customer file must be 5 MB or smaller.");
    if (!await signatureMatches(file)) throw new Error("The uploaded file content does not match its file type.");

    const target = await getCustomerUploadTarget(caseId, code);
    const { env } = await import("cloudflare:workers");
    if (!env.BUCKET) throw new Error("Customer document storage is not configured.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "customer-file";
    const prefix = target.projectFolder || `requests/${target.requestCode}`;
    objectKey = `${prefix}/customer-intake/${crypto.randomUUID()}-${safeName}`;
    await env.BUCKET.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { caseId: String(caseId), uploadedBy: target.customerEmail, originalName: file.name },
    });
    const id = await addCustomerRequestFile(caseId, objectKey, file, target.customerEmail);
    return Response.json({ data: { id, fileName: file.name } }, { status: 201 });
  } catch (error) {
    if (objectKey) {
      const { env } = await import("cloudflare:workers");
      await env.BUCKET?.delete(objectKey).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Customer document upload failed.";
    const safe = /(?:valid customer document|only JPG|5 MB|file content|not found|maximum|no longer|not configured)/i.test(message)
      ? message
      : "Customer document upload failed.";
    return Response.json({ error: safe }, { status: 400 });
  }
}
