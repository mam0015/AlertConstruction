import { createCustomerMessage } from "../../../../../db/request-store";
import { requestIsSameOrigin } from "../../../../owner-auth";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const { code } = await context.params;
  const payload = await request.json().catch(() => ({})) as { subject?: string; message?: string };
  const subject = payload.subject?.trim().slice(0, 180) ?? "";
  const message = payload.message?.trim().slice(0, 4000) ?? "";
  if (!subject || !message) return Response.json({ error: "Enter a subject and message." }, { status: 400 });
  try {
    await createCustomerMessage(decodeURIComponent(code), subject, message);
    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The message could not be saved." }, { status: 400 });
  }
}
