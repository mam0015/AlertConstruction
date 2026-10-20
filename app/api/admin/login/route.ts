import { loginGuard } from "../../../../db/throttle";
import { adminSessionCookie, createAdminSession, createPendingStaffSession, pendingStaffSessionCookie } from "../../../admin-auth";
import { requestIsSameOrigin } from "../../../owner-auth";
import { processStaffSignIn, staffRedirect } from "../../../staff-access";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const payload = await request.json().catch(() => ({})) as { email?: string; password?: string; teamCode?: string };
  const email = payload.email?.trim().toLowerCase() ?? "";
  const guard = await loginGuard(request, email, "admin");
  if (guard.blocked) return guard.blocked;

  const result = await processStaffSignIn(email, payload.password ?? "", payload.teamCode?.trim() ?? "").catch(() => ({ status: "invalid" as const }));
  if (result.status === "invalid") {
    await guard.failed();
    return Response.json({ error: "The email, password or Team Code is incorrect." }, { status: 401 });
  }
  await guard.passed();
  const secure = new URL(request.url).protocol === "https:";
  if (result.status === "rejected") return Response.json({ error: "This staff access request was not approved. Contact the Owner." }, { status: 403 });
  if (result.status === "pending") {
    const token = await createPendingStaffSession(email);
    return Response.json({ ok: true, status: "pending", redirect: "/team/pending" }, { status: 202, headers: { "Set-Cookie": pendingStaffSessionCookie(token, secure), "Cache-Control": "no-store" } });
  }
  const token = await createAdminSession(email, result.role);
  return Response.json({ ok: true, status: "approved", role: result.role, redirect: staffRedirect(result.role) }, { headers: { "Set-Cookie": adminSessionCookie(token, secure), "Cache-Control": "no-store" } });
}
