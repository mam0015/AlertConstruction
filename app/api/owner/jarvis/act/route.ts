import { runtimeBindings } from "../../../../../db/runtime";
import { listPeople } from "../../../../../db/team-store";
import { performAction } from "../../../../../jarvis/actions.mjs";
import { parseBrain, resolveBrain } from "../../../../../jarvis/brains.mjs";
import { melbourneDate } from "../../../../../jarvis/jarvis.mjs";
import { summariseProofread } from "../../../../../jarvis/assistant.mjs";
import { executorsFor, teamPeople } from "../../../../../jarvis/executors";
import { JarvisAccessError } from "../../../../../jarvis/policy.mjs";
import { fail, headers, hooks, jarvisConfig, networkFetch, notAllowed, readJson, requireOwner } from "../../../../../jarvis/server";

// Does ONE thing the Owner has just confirmed on screen: an in-app message, a calendar entry or a task. Owner session only, same-origin
// only. The action is checked again here against the real team list, runs as the Owner through the app's own rules, and happens once.
export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    const env = await runtimeBindings();
    const config = jarvisConfig();
    const input = await readJson(request) as { brain?: unknown };
    const chosen = parseBrain(input?.brain);
    if (chosen === null) throw new JarvisAccessError("Choose Jarvis 1 or Jarvis 2.", 400);
    const brain = resolveBrain(config, chosen, { testClient: hooks().aiClient ?? null, fetchImpl: networkFetch() });
    const result = await performAction({
      db: env.DB, owner: gate.owner, input: input as never,
      people: await teamPeople(listPeople), today: melbourneDate(Date.now()), executors: executorsFor(gate.owner),
      proofreadWith: { client: brain.enabled ? brain.client : null, model: brain.model },
    });
    console.info(JSON.stringify({ jarvis: "act", type: result.type }));
    return Response.json({ ...result, proofread: result.proofread ? summariseProofread(result.proofread) : null }, { headers });
  } catch (error) {
    return fail(error, "Jarvis could not do that. Nothing was changed.");
  }
}

export const GET = notAllowed("POST");
export const PUT = notAllowed("POST");
export const PATCH = notAllowed("POST");
export const DELETE = notAllowed("POST");
