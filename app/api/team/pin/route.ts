import { clearLoginFailures, getLoginAttempt, recordLoginFailure } from "../../../../db/owner-store";
import { requestIsSameOrigin } from "../../../owner-auth";
import { verifyTeamPin } from "../../../team-pin";

async function pinAttemptKey(request: Request) {
  const input = `team-pin|${request.headers.get("cf-connecting-ip") ?? "local"}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const key = await pinAttemptKey(request);
    const attempt = await getLoginAttempt(key);
    if (attempt && attempt.lockedUntil > Date.now()) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });

    const payload = await request.json().catch(() => ({})) as { pin?: string };
    const ok = typeof payload.pin === "string" && await verifyTeamPin(payload.pin);
    if (!ok) {
      const failed = (attempt?.failedCount ?? 0) + 1;
      await recordLoginFailure(key, failed, failed >= 5 ? Date.now() + 30 * 60 * 1000 : 0);
      return Response.json({ error: "Incorrect PIN." }, { status: 401 });
    }
    await clearLoginFailures(key);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "This service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
