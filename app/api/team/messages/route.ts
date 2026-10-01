import { adminSessionFromRequest } from "../../../admin-auth";
import { requestIsSameOrigin } from "../../../owner-auth";
import { getStaffAccessRequest } from "../../../../db/staff-store";
import { getTeamMessagesFor, sendTeamMessage } from "../../../../db/admin-store";

async function staffLabel(request: Request) {
  const staff = await adminSessionFromRequest(request);
  if (!staff || staff.role === "Admin") return null;
  const record = await getStaffAccessRequest(staff.email);
  return record?.tradeTitle?.trim() || staff.role;
}

export async function GET(request: Request) {
  const label = await staffLabel(request);
  if (!label) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  return Response.json({ data: await getTeamMessagesFor(label) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const label = await staffLabel(request);
  if (!label) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    const payload = await request.json() as { body?: string };
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!body) throw new Error("Message cannot be empty.");
    if (body.length > 2000) throw new Error("Message is too long.");
    await sendTeamMessage(label, "Admin", body);
    return Response.json({ data: await getTeamMessagesFor(label) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Message could not be sent." }, { status: 400 });
  }
}
