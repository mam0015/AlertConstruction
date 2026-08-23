import {
  getPrimaryOwnerAccount,
  getTeamAccessSettings,
  rotateTeamCode,
  updateOwnerPassword,
  updateOwnerProfile,
  verifyStoredOwnerPassword,
} from "../../../../db/access-settings-store";
import {
  createOwnerSession,
  ownerSessionCookie,
  ownerSessionFromRequest,
  requestIsSameOrigin,
} from "../../../owner-auth";

async function settingsPayload() {
  const [account, team] = await Promise.all([getPrimaryOwnerAccount(), getTeamAccessSettings()]);
  if (!account || !team) throw new Error("Owner settings are unavailable.");
  return {
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

    if (body.action === "password") {
      if (!body.newPassword || body.newPassword.length < 10) {
        return Response.json({ error: "New password must be at least 10 characters." }, { status: 400 });
      }
      await updateOwnerPassword(session.email, body.newPassword);
      return Response.json({ data: await settingsPayload(), message: "Owner password updated." });
    }

    if (body.action === "profile") {
      const email = body.email?.trim().toLowerCase() ?? "";
      if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter a valid Owner email." }, { status: 400 });
      const account = await updateOwnerProfile(session.email, email, body.displayName ?? "Owner");
      if (!account) throw new Error("Owner profile could not be updated.");
      const secure = new URL(request.url).protocol === "https:";
      const token = await createOwnerSession(account.email);
      return Response.json({ data: await settingsPayload(), message: "Owner account updated." }, {
        headers: { "Set-Cookie": ownerSessionCookie(token, secure), "Cache-Control": "no-store" },
      });
    }

    return Response.json({ error: "Invalid settings action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Settings could not be saved." }, { status: 400 });
  }
}
