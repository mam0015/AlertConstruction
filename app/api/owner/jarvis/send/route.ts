import { runtimeBindings } from "../../../../../db/runtime";
import { sendOwnerReply } from "../../../../../jarvis/assistant.mjs";
import { fail, headers, hooks, jarvisConfig, networkFetch, notAllowed, readJson, requireOwner } from "../../../../../jarvis/server";

// Sends ONE reply the Owner has read and approved. Owner session only, same-origin only. The recipient is never taken from
// this request: it is looked up from the original email in the Owner's own mailbox.
export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    const env = await runtimeBindings();
    const aiClient = hooks().aiClient;
    const result = await sendOwnerReply({ db: env.DB, config: jarvisConfig(), fetchImpl: networkFetch(), ai: aiClient ? { client: aiClient } : undefined, owner: gate.owner, input: await readJson(request) as never });
    console.info(JSON.stringify({ jarvis: "send", mailbox: result.mailbox })); // who it went to is in the mailbox's Sent folder and in Jarvis's own log, not in the Worker logs
    return Response.json(result, { headers });
  } catch (error) {
    return fail(error, "Jarvis could not send that reply. Nothing was sent.");
  }
}

export const GET = notAllowed("POST");
export const PUT = notAllowed("POST");
export const PATCH = notAllowed("POST");
export const DELETE = notAllowed("POST");
