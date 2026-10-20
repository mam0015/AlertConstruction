import { loginGuard } from "../../../../db/throttle";
import { adminSessionCookie, clearPendingStaffSessionCookie, createAdminSession, createPendingStaffSession, pendingStaffSessionCookie } from "../../../admin-auth";
import { createOwnerSession, isRegisteredOwnerEmail, ownerSessionCookie, REMEMBER_SESSION_SECONDS, requestIsSameOrigin, verifyOwnerPassword } from "../../../owner-auth";
import { processStaffSignIn, staffRedirect } from "../../../staff-access";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
  const payload = await request.json().catch(() => ({})) as { email?: string; password?: string; teamCode?: string; remember?: boolean };
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  const teamCode = payload.teamCode?.trim() ?? "";
  const sessionSeconds = payload.remember === true ? REMEMBER_SESSION_SECONDS : undefined;
  const guard = await loginGuard(request, email, "team");
  if (guard.blocked) return guard.blocked;

  if (await isRegisteredOwnerEmail(email)) {
    if (!await verifyOwnerPassword(email, password)) {
      await guard.failed();
      return Response.json({ error: "Username or password is incorrect." }, { status: 401 });
    }
    await guard.passed();
    const secure = new URL(request.url).protocol === "https:";
    const token = await createOwnerSession(email, sessionSeconds);
    return Response.json({ ok: true, role: "Owner", redirect: "/owner" }, {
      headers: { "Set-Cookie": ownerSessionCookie(token, secure, sessionSeconds), "Cache-Control": "no-store" },
    });
  }

  const result = await processStaffSignIn(email, password, teamCode).catch(() => ({ status: "invalid" as const }));
  if (result.status === "invalid") {
    await guard.failed();
    return Response.json({ error: "Username, password or Team Code is incorrect." }, { status: 401 });
  }
  await guard.passed();
  const secure = new URL(request.url).protocol === "https:";
  if (result.status === "rejected") return Response.json({ error: "This access request was not approved. Contact the Owner." }, { status: 403 });
  if (result.status === "pending") {
    const token = await createPendingStaffSession(email);
    return Response.json({ ok: true, status: "pending", redirect: "/team/pending" }, {
      status: 202,
      headers: { "Set-Cookie": pendingStaffSessionCookie(token, secure), "Cache-Control": "no-store" },
    });
  }
  const token = await createAdminSession(email, result.role, sessionSeconds);
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", adminSessionCookie(token, secure, sessionSeconds));
  headers.append("Set-Cookie", clearPendingStaffSessionCookie(secure));
  return Response.json({ ok: true, role: result.role, redirect: staffRedirect(result.role) }, { headers });
  } catch (error) {
    console.error("Team sign-in failed:", error instanceof Error ? error.message : error);
    const setup = error instanceof Error && /not configured|unavailable/i.test(error.message);
    return Response.json({ error: setup ? "Sign-in is not fully set up on the server yet (missing configuration). Please tell the Owner." : "Sign-in service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
