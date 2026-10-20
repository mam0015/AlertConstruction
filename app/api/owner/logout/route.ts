import { revokeSessions } from "../../../../db/session-store";
import { clearOwnerSessionCookie, ownerSessionFromRequest, requestIsSameOrigin } from "../../../owner-auth";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  // Signing out ends this session for real (a copy of the cookie stops working), not just in this browser.
  const session = await ownerSessionFromRequest(request).catch(() => null);
  if (session) await revokeSessions(`owner:${session.email}`).catch(() => undefined);
  const secure = new URL(request.url).protocol === "https:";
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearOwnerSessionCookie(secure), "Cache-Control": "no-store" } });
}
