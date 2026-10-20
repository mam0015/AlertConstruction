import { runtimeBindings } from "../../../../db/runtime";
import { listPeople } from "../../../../db/team-store";
import { teamPeople } from "../../../../jarvis/executors";
import { describeBrains } from "../../../../jarvis/brains.mjs";
import { recentActions, recentSends } from "../../../../jarvis/audit.mjs";
import { runJarvis } from "../../../../jarvis/jarvis.mjs";
import { parseAccounts } from "../../../../jarvis/sources/company-email.mjs";
import { fail, headers, jarvisConfig, networkFetch, notAllowed, requireOwner } from "../../../../jarvis/server";

// The briefing. Only the Owner session may call it (Admin, Team and Customer sessions are refused), and it only reads.
// Asking Jarvis something is /ask; sending a reply the Owner approved is /send. This endpoint changes nothing.
export async function GET(request: Request) {
  const gate = await requireOwner(request, { write: false });
  if (!gate.owner) return gate.response;
  try {
    const env = await runtimeBindings();
    const config = jarvisConfig();
    const result = await runJarvis({ db: env.DB, params: new URL(request.url).searchParams, config, fetchImpl: networkFetch(), ownerEmail: gate.owner.email });
    const capabilities = {
      // `ai` / `model` describe the default brain (the one that answers when the Owner has not picked); `brains` lists both choices.
      ai: describeBrains(config).some((brain) => brain.available),
      model: describeBrains(config).find((brain) => brain.available)?.model ?? "",
      brains: describeBrains(config),
      replyMailboxes: parseAccounts(config.accounts).filter((account) => account.canReply).map((account) => account.label),
    };
    // Audit line (no content): who asked, what Jarvis was allowed to read, how much it returned.
    console.info(JSON.stringify({ jarvis: "read", scopes: result.scopes, items: result.items.length }));
    // The longer record text exists for the AI only; the screen gets the short preview.
    const items = result.items.map((item) => { const visible: Record<string, unknown> = { ...item }; delete visible.detail; return visible; });
    return Response.json({ ...result, items, capabilities, sent: await recentSends(env.DB, 10), actionsDone: await recentActions(env.DB, 10), team: await teamPeople(listPeople) }, { headers });
  } catch (error) {
    return fail(error, "Jarvis could not read the company records right now.");
  }
}

export const POST = notAllowed("GET");
export const PUT = notAllowed("GET");
export const PATCH = notAllowed("GET");
export const DELETE = notAllowed("GET");
