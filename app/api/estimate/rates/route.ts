import { requestIsSameOrigin } from "../../../owner-auth";
import { estimateActor } from "../../../estimate-tools/access";
import { aiEnabled } from "../../../../jarvis/ai.mjs";
import { hooks, jarvisConfig } from "../../../../jarvis/server";
import { getEstimatePrices, parseMargin, parseRateChanges, saveEstimatePrices } from "../../../../db/estimate-store";

// The company price list used by the estimate tools. Read: the Owner and the Admin, Manager and Estimator roles. Change: the Owner and Admin only.
// The price list is internal (it is what the work costs the company), so nobody else — including customers and the other trades — can read it.
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const actor = await estimateActor(request);
  if (!actor) return Response.json({ error: "Sign in to use the estimate tools." }, { status: 401, headers });
  return Response.json({ ...(await getEstimatePrices()), canEdit: actor.canEdit, ai: Boolean(hooks().aiClient) || aiEnabled(jarvisConfig()) }, { headers });
}

export async function PUT(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403, headers });
  const actor = await estimateActor(request);
  if (!actor) return Response.json({ error: "Sign in to use the estimate tools." }, { status: 401, headers });
  if (!actor.canEdit) return Response.json({ error: "Only the Owner and Admin can change the price list." }, { status: 403, headers });
  try {
    const text = await request.text();
    if (text.length > 60_000) return Response.json({ error: "That request is too large." }, { status: 413, headers });
    const body = JSON.parse(text) as { rates?: unknown; margin?: unknown };
    if (body.rates === undefined && body.margin === undefined) throw new Error("There is nothing to save.");
    const prices = await saveEstimatePrices(actor.email, {
      ...(body.rates === undefined ? {} : { rates: parseRateChanges(body.rates) }),
      ...(body.margin === undefined ? {} : { margin: parseMargin(body.margin) }),
    });
    return Response.json({ ...prices, canEdit: true }, { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Send the request as JSON." }, { status: 400, headers });
    return Response.json({ error: error instanceof Error ? error.message : "The price list could not be saved." }, { status: 400, headers });
  }
}

const notAllowed = () => Response.json({ error: "That method is not allowed here." }, { status: 405, headers: { ...headers, Allow: "GET, PUT" } });
export const POST = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
