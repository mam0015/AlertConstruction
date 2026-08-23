import { clearLoginFailures, getLoginAttempt, recordLoginFailure } from "../../../../db/owner-store";
import { adminSessionCookie, clearPendingStaffSessionCookie, createAdminSession, createPendingStaffSession, pendingStaffSessionCookie } from "../../../admin-auth";
import { createOwnerSession, isRegisteredOwnerEmail, ownerSessionCookie, requestIsSameOrigin, verifyOwnerPassword } from "../../../owner-auth";
import { processStaffSignIn, staffRedirect } from "../../../staff-access";

async function loginKey(email: string, request: Request) {
  const input = `${email.toLowerCase()}|team|${request.headers.get("cf-connecting-ip") ?? "local"}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
  const payload = await request.json().catch(() => ({})) as { email?: string; password?: string; teamCode?: string };
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  const teamCode = payload.teamCode?.trim() ?? "";
  const key = await loginKey(email, request);
  const attempts = await getLoginAttempt(key);
  const now = Date.now();
  if (attempts && attempts.lockedUntil > now) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  if (await isRegisteredOwnerEmail(email)) {
    if (!await verifyOwnerPassword(email, password)) {
      const failed = (attempts?.failedCount ?? 0) + 1;
      await recordLoginFailure(key, failed, failed >= 5 ? now + 15 * 60 * 1000 : 0);
      return Response.json({ error: "Username or password is incorrect." }, { status: 401 });
    }
    await clearLoginFailures(key);
    const secure = new URL(request.url).protocol === "https:";
    const token = await createOwnerSession(email);
    return Response.json({ ok: true, role: "Owner", redirect: "/owner" }, {
      headers: { "Set-Cookie": ownerSessionCookie(token, secure), "Cache-Control": "no-store" },
    });
  }

  const result = await processStaffSignIn(email, password, teamCode).catch(() => ({ status: "invalid" as const }));
  if (result.status === "invalid") {
    const failed = (attempts?.failedCount ?? 0) + 1;
    await recordLoginFailure(key, failed, failed >= 5 ? now + 15 * 60 * 1000 : 0);
    return Response.json({ error: "Username, password or Team Code is incorrect." }, { status: 401 });
  }
  await clearLoginFailures(key);
  const secure = new URL(request.url).protocol === "https:";
  if (result.status === "rejected") return Response.json({ error: "This access request was not approved. Contact the Owner." }, { status: 403 });
  if (result.status === "pending") {
    const token = await createPendingStaffSession(email);
    return Response.json({ ok: true, status: "pending", redirect: "/team/pending" }, {
      status: 202,
      headers: { "Set-Cookie": pendingStaffSessionCookie(token, secure), "Cache-Control": "no-store" },
    });
  }
  const token = await createAdminSession(email, result.role);
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", adminSessionCookie(token, secure));
  headers.append("Set-Cookie", clearPendingStaffSessionCookie(secure));
  return Response.json({ ok: true, role: result.role, redirect: staffRedirect(result.role) }, { headers });
  } catch {
    return Response.json({ error: "Sign-in service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
