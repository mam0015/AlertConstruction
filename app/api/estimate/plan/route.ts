import { comparePlans, parsePlanInput } from "../../../estimate-tools/ai.mjs";
import { aiFailure, aiGate, json, readBody } from "../../../estimate-tools/server";

// AI plan estimator: compares the Existing and Proposed drawings of one trade and returns what was added, removed or moved, with evidence.
// The AI never sees a price. The screen prices the quantities from the company price list, and a person checks every line.
export async function POST(request: Request) {
  const gate = await aiGate(request);
  if ("response" in gate) return gate.response;
  try {
    const input = parsePlanInput(await readBody(request));
    const result = await comparePlans({ client: gate.client, model: gate.model, input, useFallbacks: gate.useFallbacks });
    console.info(JSON.stringify({ estimate: "plan", trade: input.trade.id, mode: input.scanMode, status: result.analysis.status, items: result.analysis.items?.length ?? 0, usage: result.usage }));
    return json({ analysis: result.analysis, model: result.model });
  } catch (error) {
    return aiFailure(error);
  }
}

const notAllowed = () => Response.json({ error: "That method is not allowed here." }, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
