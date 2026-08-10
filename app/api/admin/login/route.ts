import { clearLoginFailures, getLoginAttempt, recordLoginFailure } from "../../../../db/owner-store";
import { adminSessionCookie, createAdminSession, createPendingStaffSession, pendingStaffSessionCookie } from "../../../admin-auth";
import { requestIsSameOrigin } from "../../../owner-auth";
import { processStaffSignIn, staffRedirect } from "../../../staff-access";

async function loginKey(email: string, request: Request) {
  const input = `${email.toLowerCase()}|admin|${request.headers.get("cf-connecting-ip") ?? "local"}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const payload = await request.json().catch(() => ({})) as { email?: string; password?: string; teamCode?: string };
  const email = payload.email?.trim().toLowerCase() ?? "";
  const key = await loginKey(email, request);
  const attempts = await getLoginAttempt(key);
  const now = Date.now();
  if (attempts && attempts.lockedUntil > now) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  const result = await processStaffSignIn(email, payload.password ?? "", payload.teamCode?.trim() ?? "").catch(() => ({ status: "invalid" as const }));
  if (result.status === "invalid") {
    const failed = (attempts?.failedCount ?? 0) + 1;
    await recordLoginFailure(key, failed, failed >= 5 ? now + 15 * 60 * 1000 : 0);
    return Response.json({ error: "The email, password or Team Code is incorrect." }, { status: 401 });
  }
  await clearLoginFailures(key);
  const secure = new URL(request.url).protocol === "https:";
  if (result.status === "rejected") return Response.json({ error: "This staff access request was not approved. Contact the Owner." }, { status: 403 });
  if (result.status === "pending") {
    const token = await createPendingStaffSession(email);
    return Response.json({ ok: true, status: "pending", redirect: "/team/pending" }, { status: 202, headers: { "Set-Cookie": pendingStaffSessionCookie(token, secure), "Cache-Control": "no-store" } });
  }
  const token = await createAdminSession(email, result.role);
  return Response.json({ ok: true, status: "approved", role: result.role, redirect: staffRedirect(result.role) }, { headers: { "Set-Cookie": adminSessionCookie(token, secure), "Cache-Control": "no-store" } });
}
