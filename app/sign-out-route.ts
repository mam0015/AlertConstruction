import { endSessionsForCookie, OWNER_SESSION_SUBJECT } from "../db/session-store";
import { adminCookieName, clearAdminSessionCookie, clearPendingStaffSessionCookie, pendingStaffCookieName, presentedStaffCookie } from "./admin-auth";
import { clearOwnerSessionCookie, cookieValue, ownerCookieName, presentedOwnerCookie, requestIsSameOrigin } from "./owner-auth";

// The one sign-out behind both /api/owner/logout and /api/admin/logout. A browser can hold an Owner session, a staff session and a
// "waiting for approval" cookie at the same time (several people on one computer, or the Owner signing in over a staff member), so
// whichever button is pressed, every identity presented is signed out and every cookie is cleared. A stale copy of a cookie (already
// signed out, or from before a new password) only ends its own session line, so it cannot be used to sign anyone else out.
export async function signOutEveryIdentity(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const owner = await presentedOwnerCookie(cookieValue(request, ownerCookieName()));
    const staff = [
      await presentedStaffCookie(cookieValue(request, adminCookieName()), "session"),
      await presentedStaffCookie(cookieValue(request, pendingStaffCookieName()), "pending"),
    ];
    if (owner) await endSessionsForCookie(OWNER_SESSION_SUBJECT, owner);
    for (const cookie of staff) if (cookie) await endSessionsForCookie(`staff:${cookie.email}`, cookie);
  } catch (error) {
    // Nothing is cleared here on purpose: the person is still signed in on this device and can press Sign out again to finish it.
    console.error("Sign-out could not end the session on the server:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Sign-out did not complete, so you are still signed in on this device. Please try again in a moment." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const secure = new URL(request.url).protocol === "https:";
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", clearOwnerSessionCookie(secure));
  headers.append("Set-Cookie", clearAdminSessionCookie(secure));
  headers.append("Set-Cookie", clearPendingStaffSessionCookie(secure));
  return Response.json({ ok: true }, { headers });
}
