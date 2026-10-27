import { createPublicRequest, type PublicRequestInput } from "../../../db/request-store";
import { requestIsSameOrigin } from "../../owner-auth";
import { isStorageFull } from "../../../db/storage-usage";
import { clientAddress, sha256Hex, throttleExceeded, throttleHit, throttleRefund, tooManyRequests } from "../../../db/throttle";

const allowedServices = new Set([
  "Kitchen Renovations", "Bathroom Renovations", "Home Renovations", "Home Extensions",
  "New Homes", "Building Inspections", "Maintenance & Repairs", "Engineering Services", "Other",
]);
const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/vnd.dwg", "application/acad", "application/octet-stream",
]);

function text(form: FormData, name: string, max = 500) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  // Five requests an hour per visitor (refused or invalid forms do not count).
  const limitKey = await sha256Hex(`legacy-request|${clientAddress(request)}`);
  const limit = await throttleExceeded(limitKey, 5, 60 * 60 * 1000);
  if (limit.exceeded) return tooManyRequests("Too many requests. Try again later.", limit.retryAfterSeconds);
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "The request form could not be read." }, { status: 400 });

  const input: PublicRequestInput = {
    service: text(form, "service", 80),
    customerName: text(form, "name", 120),
    phone: text(form, "phone", 40),
    email: text(form, "email", 180).toLowerCase(),
    location: text(form, "location", 180),
    timeframe: text(form, "timeframe", 80),
    budget: text(form, "budget", 80),
    material: text(form, "material", 80),
    otherService: text(form, "otherService", 600),
    details: text(form, "details", 4000),
  };

  if (!allowedServices.has(input.service) || !input.customerName || !input.phone || !input.location ||
      !input.timeframe || !input.budget || !input.material || !input.details ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
      (input.service === "Other" && input.otherService.length < 30)) {
    return Response.json({ error: "Please complete every required field with valid information." }, { status: 400 });
  }

  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > 5 || files.some((file) => file.size > 10 * 1024 * 1024) ||
      files.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024 ||
      files.some((file) => file.type && !allowedTypes.has(file.type))) {
    return Response.json({ error: "Upload up to 5 supported files, maximum 10 MB each and 25 MB total." }, { status: 400 });
  }

  // The slot is taken in ONE atomic statement before saving, so parallel requests cannot all pass the check above; a request that fails gives it back.
  const slot = await throttleHit(limitKey, 5, 60 * 60 * 1000);
  if (!slot.allowed) return tooManyRequests("Too many requests. Try again later.", slot.retryAfterSeconds);
  try {
    const result = await createPublicRequest(input, files);
    return Response.json({ ok: true, code: result.code, redirect: `/track/${encodeURIComponent(result.code)}` }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    await throttleRefund(limitKey).catch(() => undefined);
    // Nothing was saved. The customer is never told how full the company's storage is.
    if (isStorageFull(error)) return Response.json({ error: "Photos and files cannot be accepted right now. Please send your request without attachments, or contact the company directly." }, { status: 507 });
    return Response.json({ error: "We could not save your request. Please try again." }, { status: 500 });
  }
}
