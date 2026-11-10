import { adminSessionCookie, clearPendingStaffSessionCookie, cookieValue, createAdminSession, pendingStaffCookieName, STAFF_SESSION_SECONDS, verifyPendingStaffSession } from "../../../admin-auth";
import { getStaffAccessRequest } from "../../../../db/staff-store";
import { staffRedirect } from "../../../staff-access";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  let pending: Awaited<ReturnType<typeof verifyPendingStaffSession>>;
  let record: Awaited<ReturnType<typeof getStaffAccessRequest>>;
  try {
    pending = await verifyPendingStaffSession(cookieValue(request, pendingStaffCookieName()));
    if (!pending) return Response.json({ error: "Staff approval session expired." }, { status: 401, headers: noStore });
    record = await getStaffAccessRequest(pending.email);
  } catch {
    // The database did not answer. That says nothing about the person's access, so the waiting page simply checks again.
    return Response.json({ error: "This service is temporarily unavailable. Please try again." }, { status: 503, headers: noStore });
  }
  if (!record) return Response.json({ error: "Staff request not found." }, { status: 404, headers: noStore });
  if (record.status !== "Approved" || record.role === "Unassigned") {
    return Response.json({ status: record.status, email: record.email }, { headers: noStore });
  }
  // The session is the waiting cookie grown up: it keeps that cookie's proof (issue time and password fingerprint), so a sign-out racing
  // this answer still ends it, and it never outlives the waiting cookie, so it cannot be revived after the waiting cookie has expired.
  const seconds = Math.min(STAFF_SESSION_SECONDS, Math.floor((pending.expires - Date.now()) / 1000));
  if (seconds < 1) return Response.json({ error: "Staff approval session expired." }, { status: 401, headers: noStore });
  const secure = new URL(request.url).protocol === "https:";
  const session = await createAdminSession(record.email, record.role, { iat: pending.iat, v: pending.v, sid: pending.sid }, seconds);
  const headers = new Headers(noStore);
  headers.append("Set-Cookie", adminSessionCookie(session, secure, seconds));
  headers.append("Set-Cookie", clearPendingStaffSessionCookie(secure));
  return Response.json({ status: "Approved", email: record.email, role: record.role, tradeTitle: record.tradeTitle, redirect: staffRedirect(record.role) }, { headers });
}
