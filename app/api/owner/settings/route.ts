import {
  getPrimaryOwnerAccount,
  getTeamAccessSettings,
  rotateTeamCode,
  updateOwnerPassword,
  updateOwnerProfile,
  verifyStoredOwnerPassword,
} from "../../../../db/access-settings-store";
import { storageSummary } from "../../../../db/storage-usage";
import {
  createOwnerSession,
  ownerCredentialFingerprint,
  ownerSessionCookie,
  ownerSessionFromRequest,
  requestIsSameOrigin,
} from "../../../owner-auth";

async function settingsPayload() {
  // The meter is a convenience: if it cannot be read, the rest of Settings still loads.
  const [account, team, storage] = await Promise.all([getPrimaryOwnerAccount(), getTeamAccessSettings(), storageSummary().catch(() => undefined)]);
  if (!account || !team) throw new Error("Owner settings are unavailable.");
  return {
    storage,
    account: { email: account.email, displayName: account.displayName, updatedAt: account.updatedAt },
    teamCode: team.teamCode,
    teamCodeUpdatedAt: team.updatedAt,
  };
}

export async function GET(request: Request) {
  if (!await ownerSessionFromRequest(request)) return Response.json({ error: "Owner sign-in required." }, { status: 401 });
  return Response.json({ data: await settingsPayload() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const session = await ownerSessionFromRequest(request);
  if (!session) return Response.json({ error: "Owner sign-in required." }, { status: 401 });

  try {
    const body = await request.json() as {
      action?: "profile" | "password" | "team-code";
      email?: string;
      displayName?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (body.action === "team-code") {
      await rotateTeamCode();
      return Response.json({ data: await settingsPayload(), message: "A new Team Code is active." });
    }

    if (!body.currentPassword || !await verifyStoredOwnerPassword(session.email, body.currentPassword)) {
      return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    // The new password changes the session fingerprint, which signs out every other device. This browser gets a refreshed cookie for the
    // same session, so the Owner is not silently signed out by the next click. It keeps the original issue time and expiry, so a sign-out
    // that lands while this change is in flight still ends it, and it never lasts longer than the session it replaces.
    const secure = new URL(request.url).protocol === "https:";
    const remainingSeconds = Math.max(1, Math.floor((session.expires - Date.now()) / 1000));
    const sameSession = { iat: session.iat, sid: session.sid, expires: session.expires };

    if (body.action === "password") {
      if (!body.newPassword || body.newPassword.length < 10) {
        return Response.json({ error: "New password must be at least 10 characters." }, { status: 400 });
      }
      const passwordHash = await updateOwnerPassword(session.email, body.newPassword);
      const token = await createOwnerSession(session.email, { ...sameSession, v: await ownerCredentialFingerprint(passwordHash) });
      return Response.json({ data: await settingsPayload(), message: "Owner password updated. Other devices have been signed out." }, {
        headers: { "Set-Cookie": ownerSessionCookie(token, secure, remainingSeconds), "Cache-Control": "no-store" },
      });
    }

    if (body.action === "profile") {
      const email = body.email?.trim().toLowerCase() ?? "";
      if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter a valid Owner email." }, { status: 400 });
      const account = await updateOwnerProfile(session.email, email, body.displayName ?? "Owner");
      if (!account) throw new Error("Owner profile could not be updated.");
      const token = await createOwnerSession(account.email, { ...sameSession, v: session.v });
      return Response.json({ data: await settingsPayload(), message: "Owner account updated." }, {
        headers: { "Set-Cookie": ownerSessionCookie(token, secure, remainingSeconds), "Cache-Control": "no-store" },
      });
    }

    return Response.json({ error: "Invalid settings action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Settings could not be saved." }, { status: 400 });
  }
}
