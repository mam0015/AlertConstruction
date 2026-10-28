import { addCustomerRequestFile, getCustomerUploadTarget } from "../../../../../db/workflow-store";
import { requestIsSameOrigin } from "../../../../owner-auth";
import { runtimeBindings } from "../../../../../db/runtime";
import { assertStorageRoom, isStorageFull } from "../../../../../db/storage-usage";
import { fileSignatureMatches } from "../../../../file-safety";
import { clientAddress, sha256Hex, throttleHit, tooManyRequests } from "../../../../../db/throttle";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  // A stranger can send a file here without signing in, so each address has an hourly allowance (taken in one atomic statement before anything is read).
  const slot = await throttleHit(await sha256Hex(`customer-upload|${clientAddress(request)}`), 60, 60 * 60 * 1000);
  if (!slot.allowed) return tooManyRequests("Too many uploads. Try again later.", slot.retryAfterSeconds);
  let objectKey = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    const caseId = Number(form.get("caseId"));
    const code = String(form.get("code") ?? "").trim();
    if (!(file instanceof File) || !Number.isInteger(caseId) || caseId < 1 || !code) throw new Error("Choose a valid customer document.");
    if (!allowedTypes.has(file.type.toLowerCase())) throw new Error("Only JPG, PNG, WebP and PDF files are accepted.");
    if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("Each customer file must be 5 MB or smaller.");
    if (!await fileSignatureMatches(file)) throw new Error("The uploaded file content does not match its file type.");

    const target = await getCustomerUploadTarget(caseId, code);
    const env = await runtimeBindings();
    if (!env.BUCKET) throw new Error("Customer document storage is not configured.");
    await assertStorageRoom(file.size, { publicUpload: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "customer-file";
    const prefix = target.projectFolder || `requests/${target.requestCode}`;
    objectKey = `${prefix}/customer-intake/${crypto.randomUUID()}-${safeName}`;
    await env.BUCKET.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { caseId: String(caseId), uploadedBy: target.customerEmail, originalName: file.name },
    });
    const id = await addCustomerRequestFile(caseId, objectKey, file, target.customerEmail);
    objectKey = ""; // the record is saved: the file must stay
    return Response.json({ data: { id, fileName: file.name } }, { status: 201 });
  } catch (error) {
    if (objectKey) {
      const env = await runtimeBindings();
      await env.BUCKET?.delete(objectKey).catch(() => undefined);
    }
    // A customer is never told how full the company's storage is.
    if (isStorageFull(error)) return Response.json({ error: "Uploads are not available right now. Please contact the company directly." }, { status: 507 });
    const message = error instanceof Error ? error.message : "Customer document upload failed.";
    const safe = /(?:valid customer document|only JPG|5 MB|file content|not found|maximum|no longer|not configured)/i.test(message)
      ? message
      : "Customer document upload failed.";
    return Response.json({ error: safe }, { status: 400 });
  }
}
