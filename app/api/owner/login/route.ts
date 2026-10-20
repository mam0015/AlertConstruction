import { loginGuard } from "../../../../db/throttle";
import { createOwnerSession, ownerSessionCookie, isRegisteredOwnerEmail, requestIsSameOrigin, verifyOwnerPassword } from "../../../owner-auth";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const payload = await request.json().catch(() => ({})) as { email?: unknown; password?: unknown };
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const guard = await loginGuard(request, email, "owner");
  if (guard.blocked) return guard.blocked;
  // verifyOwnerPassword runs the full password check even for an unknown e-mail, so the answer takes the same time either way.
  const registered = await isRegisteredOwnerEmail(email);
  const correct = await verifyOwnerPassword(email, password);
  if (!password.length || !registered || !correct) {
    await guard.failed();
    return Response.json({ error: "The email or password is incorrect." }, { status: 401 });
  }
  await guard.passed();
  const token = await createOwnerSession(email);
  const secure = new URL(request.url).protocol === "https:";
  return Response.json({ ok: true }, { headers: { "Set-Cookie": ownerSessionCookie(token, secure), "Cache-Control": "no-store" } });
}
