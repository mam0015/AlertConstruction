import { checkClaude } from "../../../../../jarvis/ai.mjs";
import { parseBrain } from "../../../../../jarvis/brains.mjs";
import { checkOpenJarvis } from "../../../../../jarvis/openjarvis.mjs";
import { JarvisAccessError } from "../../../../../jarvis/policy.mjs";
import { fail, headers, hooks, jarvisConfig, networkFetch, notAllowed, readJson, requireOwner } from "../../../../../jarvis/server";

// "Test connection" for a brain. Owner session only. Jarvis 2 (the default): asks the OpenJarvis server whether it is alive, which model it has and
// which agent it runs. Jarvis 1 ({"brain":"jarvis1"}): one tiny real request to Claude, so the Owner sees that the key reached the app and works.
// Neither sends any of the company's data, and neither changes anything.
export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    const body = await readJson(request).catch(() => ({})) as { brain?: unknown } | null;
    const brain = parseBrain(body && typeof body === "object" ? body.brain : undefined);
    if (brain === null) throw new JarvisAccessError("Choose Jarvis 1 or Jarvis 2.", 400);
    const result = brain === "jarvis1"
      ? await checkClaude(jarvisConfig(), { client: (hooks().aiClient as never) ?? null })
      : await checkOpenJarvis(jarvisConfig(), { fetchImpl: networkFetch() });
    return Response.json(result, { headers });
  } catch (error) {
    return fail(error, "Jarvis could not test the connection.");
  }
}

export const GET = notAllowed("POST");
export const PUT = notAllowed("POST");
export const PATCH = notAllowed("POST");
export const DELETE = notAllowed("POST");
