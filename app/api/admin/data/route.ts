import { createAdminRecord, deleteAdminRecord, getAdminSnapshot, updateAdminRecord } from "../../../../db/admin-store";
import { adminSessionFromRequest } from "../../../admin-auth";
import { ownerSessionFromRequest, requestIsSameOrigin } from "../../../owner-auth";

type Resource = "project" | "request" | "schedule" | "message";
const valid = (value: unknown): value is Resource => ["project", "request", "schedule", "message"].includes(String(value));
const authorised = async (request: Request) => {
  const admin = await adminSessionFromRequest(request);
  return Boolean((admin && admin.role === "Admin") || await ownerSessionFromRequest(request));
};
const errorResponse = (error: unknown) => Response.json({ error: error instanceof Error ? (error.message.includes("UNIQUE") ? "That code already exists." : error.message) : "The change could not be saved." }, { status: 400 });
const developmentPreview = (request: Request) => process.env.NODE_ENV === "development" && (request.headers.get("referer") ?? "").includes("preview=operation-hub");
const emptyPreview = {
  projects: [], requests: [], scheduleEvents: [], messages: [],
  permissions: { role: "Admin", projects: 1, schedule: 1, finance: 0, financeExport: 0 },
};

export async function GET(request: Request) {
  if (!developmentPreview(request) && !await authorised(request)) return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  if (developmentPreview(request)) return Response.json({ data: emptyPreview }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ data: await getAdminSnapshot() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  if (!await authorised(request)) return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const body = await request.json() as { resource?: unknown; payload?: Record<string, unknown> };
    if (!valid(body.resource) || !body.payload) return Response.json({ error: "Invalid record." }, { status: 400 });
    await createAdminRecord(body.resource, body.payload);
    return Response.json({ data: await getAdminSnapshot() }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  if (!await authorised(request)) return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const body = await request.json() as { resource?: unknown; id?: number; payload?: Record<string, unknown> };
    if (!valid(body.resource) || !Number.isInteger(body.id) || !body.payload) return Response.json({ error: "Invalid record." }, { status: 400 });
    await updateAdminRecord(body.resource, body.id!, body.payload);
    return Response.json({ data: await getAdminSnapshot() });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  if (!await authorised(request)) return Response.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const body = await request.json() as { resource?: unknown; id?: number };
    if (!valid(body.resource) || !Number.isInteger(body.id)) return Response.json({ error: "Invalid record." }, { status: 400 });
    await deleteAdminRecord(body.resource, body.id!);
    return Response.json({ data: await getAdminSnapshot() });
  } catch (error) { return errorResponse(error); }
}
