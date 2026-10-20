import { teamIdentityFromRequest } from "../../../../team-identity";
import { getChatFile } from "../../../../../db/team-store";
import { runtimeBindings } from "../../../../../db/runtime";
import { downloadHeaders } from "../../../../file-safety";

export async function GET(request: Request) {
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  const row = Number.isInteger(id) ? await getChatFile(me, id) : null;
  if (!row) return Response.json({ error: "File not found." }, { status: 404 });
  const env = await runtimeBindings();
  const object = await env.BUCKET?.get(row.key);
  if (!object) return Response.json({ error: "File not found." }, { status: 404 });
  return new Response(object.body, { headers: downloadHeaders(row.mime || "application/octet-stream", row.name, { inlinePdf: true }) });
}
