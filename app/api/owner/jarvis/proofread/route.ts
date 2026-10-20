import { parseBrain, resolveBrain } from "../../../../../jarvis/brains.mjs";
import { summariseProofread } from "../../../../../jarvis/assistant.mjs";
import { proofread } from "../../../../../jarvis/proofread.mjs";
import { MAX_REPLY_CHARS } from "../../../../../jarvis/reply.mjs";
import { fail, headers, hooks, jarvisConfig, networkFetch, notAllowed, readJson, requireOwner } from "../../../../../jarvis/server";
import { JarvisAccessError } from "../../../../../jarvis/policy.mjs";

// "Check 3×": proofreads a text the Owner is looking at (spelling, then grammar, then a final read-through) and returns the corrected
// text with what was fixed. It changes nothing and sends nothing; the Owner decides whether to use it.
export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    const body = await readJson(request) as { text?: unknown; brain?: unknown };
    if (typeof body?.text !== "string" || body.text.trim().length < 2) throw new JarvisAccessError("Write something to check first.", 400);
    const config = jarvisConfig();
    const chosen = parseBrain(body.brain);
    if (chosen === null) throw new JarvisAccessError("Choose Jarvis 1 or Jarvis 2.", 400);
    const brain = resolveBrain(config, chosen, { testClient: hooks().aiClient ?? null, fetchImpl: networkFetch() });
    const report = await proofread(body.text, { client: brain.enabled ? brain.client : null, model: brain.model, maxChars: MAX_REPLY_CHARS });
    return Response.json({ text: report.text, ...summariseProofread(report) }, { headers });
  } catch (error) {
    return fail(error, "Jarvis could not check that right now.");
  }
}

export const GET = notAllowed("POST");
export const PUT = notAllowed("POST");
export const PATCH = notAllowed("POST");
export const DELETE = notAllowed("POST");
