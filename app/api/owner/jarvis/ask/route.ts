import { runtimeBindings } from "../../../../../db/runtime";
import { askJarvis, parseAskInput } from "../../../../../jarvis/assistant.mjs";
import { fail, headers, hooks, jarvisConfig, networkFetch, notAllowed, readJson, requireOwner } from "../../../../../jarvis/server";

// "Ask Jarvis": the Owner's instruction in, an answer + suggestions (+ an email draft) out. Owner session only.
// Nothing is sent from here — a draft is returned for the Owner to read; sending is /api/owner/jarvis/send.
export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    const input = parseAskInput(await readJson(request));
    const env = await runtimeBindings();
    const aiClient = hooks().aiClient;
    const result = await askJarvis({
      db: env.DB, config: jarvisConfig(), fetchImpl: networkFetch(), owner: gate.owner, input,
      ai: aiClient ? { client: aiClient } : undefined,
    });
    // Audit line (no content): who asked, how it was answered, whether a draft came back, what the AI call used.
    console.info(JSON.stringify({ jarvis: "ask", mode: result.mode, draft: Boolean(result.draft), model: result.model, usage: result.usage }));
    return Response.json(result, { headers });
  } catch (error) {
    return fail(error, "Jarvis could not answer right now.");
  }
}

export const GET = notAllowed("POST");
export const PUT = notAllowed("POST");
export const PATCH = notAllowed("POST");
export const DELETE = notAllowed("POST");
