import { requestIsSameOrigin } from "../../../owner-auth";
import { teamIdentityFromRequest } from "../../../team-identity";
import { createCalendarEntries, deleteCalendarEntry, listCalendar } from "../../../../db/team-store";

export async function GET(request: Request) {
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    return Response.json({ data: await listCalendar(me, params.get("from") ?? "", params.get("to") ?? "", params.get("person") ?? "") }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Calendar could not be loaded." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    const count = await createCalendarEntries(me, await request.json() as Record<string, unknown>);
    return Response.json({ data: { created: count } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The calendar entry could not be saved." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    const body = await request.json() as { id?: number };
    if (!Number.isInteger(body.id)) return Response.json({ error: "Invalid entry." }, { status: 400 });
    await deleteCalendarEntry(me, body.id!);
    return Response.json({ data: { ok: true } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The entry could not be removed." }, { status: 400 });
  }
}
