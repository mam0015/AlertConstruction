import { runtimeBindings } from "../../../../db/runtime";
import { aiEnabled, DEFAULT_MODEL } from "../../../../jarvis/ai.mjs";
import { recentSends } from "../../../../jarvis/audit.mjs";
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
    const result = await runJarvis({ db: env.DB, params: new URL(request.url).searchParams, config, fetchImpl: networkFetch() });
    const capabilities = {
      ai: aiEnabled(config),
      model: aiEnabled(config) ? config.model || DEFAULT_MODEL : "",
      replyMailboxes: parseAccounts(config.accounts).filter((account) => account.canReply).map((account) => account.label),
    };
    // Audit line (no content): who asked, what Jarvis was allowed to read, how much it returned.
    console.info(JSON.stringify({ jarvis: "read", owner: gate.owner.email, scopes: result.scopes, items: result.items.length }));
    return Response.json({ ...result, capabilities, sent: await recentSends(env.DB, 10) }, { headers });
  } catch (error) {
    return fail(error, "Jarvis could not read the company records right now.");
  }
}

export const POST = notAllowed("GET");
export const PUT = notAllowed("GET");
export const PATCH = notAllowed("GET");
export const DELETE = notAllowed("GET");
