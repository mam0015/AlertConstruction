import { requestIsSameOrigin } from "../../../owner-auth";
import { teamIdentityFromRequest } from "../../../team-identity";
import { listOwnStaffReports, submitStaffReport } from "../../../../db/team-store";

export async function GET(request: Request) {
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  return Response.json({ data: await listOwnStaffReports(me) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    await submitStaffReport(me, await request.json() as Record<string, unknown>);
    return Response.json({ data: await listOwnStaffReports(me) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The report could not be submitted." }, { status: 400 });
  }
}
