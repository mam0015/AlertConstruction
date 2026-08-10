import { adminSessionCookie, clearPendingStaffSessionCookie, cookieValue, createAdminSession, pendingStaffCookieName, verifyPendingStaffSession } from "../../../admin-auth";
import { getStaffAccessRequest } from "../../../../db/staff-store";
import { staffRedirect } from "../../../staff-access";

export async function GET(request: Request) {
  const pending = await verifyPendingStaffSession(cookieValue(request, pendingStaffCookieName()));
  if (!pending) return Response.json({ error: "Staff approval session expired." }, { status: 401 });
  const record = await getStaffAccessRequest(pending.email);
  if (!record) return Response.json({ error: "Staff request not found." }, { status: 404 });
  if (record.status !== "Approved" || record.role === "Unassigned") {
    return Response.json({ status: record.status, email: record.email }, { headers: { "Cache-Control": "no-store" } });
  }
  const secure = new URL(request.url).protocol === "https:";
  const session = await createAdminSession(record.email, record.role);
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", adminSessionCookie(session, secure));
  headers.append("Set-Cookie", clearPendingStaffSessionCookie(secure));
  return Response.json({ status: "Approved", email: record.email, role: record.role, tradeTitle: record.tradeTitle, redirect: staffRedirect(record.role) }, { headers });
}
