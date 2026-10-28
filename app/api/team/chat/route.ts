import { requestIsSameOrigin } from "../../../owner-auth";
import { teamIdentityFromRequest } from "../../../team-identity";
import { getThread, getUnread, sendChat } from "../../../../db/team-store";
import { runtimeBindings } from "../../../../db/runtime";
import { assertStorageRoom } from "../../../../db/storage-usage";
import { fileSignatureMatches } from "../../../file-safety";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function GET(request: Request) {
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  const peer = new URL(request.url).searchParams.get("with");
  const data = peer ? { messages: await getThread(me, peer) } : { unread: await getUnread(me) };
  return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  let objectKey = "";
  try {
    const form = await request.formData();
    const to = String(form.get("to") ?? "");
    const attached = form.get("file");
    let file: { key: string; name: string; mime: string; size: number } | undefined;
    if (attached instanceof File && attached.size > 0) {
      if (!allowedTypes.has(attached.type.toLowerCase())) throw new Error("Only JPG, PNG, WebP and PDF files can be sent.");
      if (attached.size > 8 * 1024 * 1024) throw new Error("Files must be 8 MB or smaller.");
      if (!await fileSignatureMatches(attached)) throw new Error("The file content does not match its type.");
      const env = await runtimeBindings();
      if (!env.BUCKET) throw new Error("File storage is not configured.");
      await assertStorageRoom(attached.size);
      const safeName = attached.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "file";
      objectKey = `team-chat/${crypto.randomUUID()}-${safeName}`;
      await env.BUCKET.put(objectKey, attached.stream(), { httpMetadata: { contentType: attached.type }, customMetadata: { sender: me.email, originalName: attached.name } });
      file = { key: objectKey, name: attached.name.slice(0, 120), mime: attached.type, size: attached.size };
    }
    await sendChat(me, to, form.get("body"), file);
    objectKey = ""; // the message is saved: from here a failure must not delete the file it points to
    return Response.json({ data: { messages: await getThread(me, to) } }, { status: 201 });
  } catch (error) {
    if (objectKey) {
      const env = await runtimeBindings();
      await env.BUCKET?.delete(objectKey).catch(() => undefined);
    }
    return Response.json({ error: error instanceof Error ? error.message : "The message could not be sent." }, { status: 400 });
  }
}
