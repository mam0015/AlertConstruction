import { revokeSessions } from "../../../../db/session-store";
import { adminSessionFromRequest, clearAdminSessionCookie } from "../../../admin-auth";
import { requestIsSameOrigin } from "../../../owner-auth";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const session = await adminSessionFromRequest(request).catch(() => null);
  if (session) await revokeSessions(`staff:${session.email}`).catch(() => undefined);
  const secure = new URL(request.url).protocol === "https:";
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearAdminSessionCookie(secure), "Cache-Control": "no-store" } });
}
