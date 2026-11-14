import { createPublicWorkflowRequest, customerChangeDecision, customerEstimateDecision, getPublicWorkflow } from "../../../../db/workflow-store";
import { clientAddress, sha256Hex, throttleExceeded, throttleHit, throttleRefund, tooManyRequests } from "../../../../db/throttle";
import { requestIsSameOrigin } from "../../../owner-auth";

const TRACK_WINDOW = 30 * 60 * 1000;
const CREATE_WINDOW = 60 * 60 * 1000;

function failed(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safe = /(?:required|too long|valid email|accept the Privacy Notice|current project stage|project was not found|no longer waiting for a decision)/i.test(message)
    ? message
    : "The request could not be completed.";
  return Response.json({ error: safe }, { status: 400 });
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return Response.json({ error: "Enter your project reference." }, { status: 400 });
  // A correct private reference (128 random bits — it cannot be guessed) always opens the project, however many wrong ones were tried from the
  // same connection (an office or a phone network shares one address) and however often the page refreshes. Only wrong references are
  // counted: 12 per 30 minutes per connection, then "too many attempts".
  const wellFormed = /^REQ-\d{4}-[A-F0-9]{32}$/i.test(code);
  const data = wellFormed ? await getPublicWorkflow(code) : null;
  if (data) return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
  const key = await sha256Hex(`customer-track|${clientAddress(request)}`);
  const slot = await throttleHit(key, 12, TRACK_WINDOW);
  if (!slot.allowed) return tooManyRequests("Too many reference attempts. Try again later.", slot.retryAfterSeconds);
  return Response.json({ error: "We could not find that project reference." }, { status: 404 });
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    // Five new requests per hour per visitor. A cheap look first, then the slot is taken in ONE atomic statement before the request is saved, so a burst of
    // parallel requests cannot all slip in. A request refused for a typing mistake gives its slot back, and the count really expires.
    const key = await sha256Hex(`customer-create|${clientAddress(request)}`);
    const limit = await throttleExceeded(key, 5, CREATE_WINDOW);
    if (limit.exceeded) return tooManyRequests("Too many requests. Try again later.", limit.retryAfterSeconds);
    const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "The request could not be read." }, { status: 400 });
    const slot = await throttleHit(key, 5, CREATE_WINDOW);
    if (!slot.allowed) return tooManyRequests("Too many requests. Try again later.", slot.retryAfterSeconds);
    let created;
    try {
      created = await createPublicWorkflowRequest(payload);
    } catch (error) {
      await throttleRefund(key);
      throw error;
    }
    // 201 for a new request; 200 when it was recognised as one already sent (a duplicate is not saved again).
    return Response.json({ data: created }, { status: created.duplicate ? 200 : 201 });
  } catch (error) {
    return failed(error);
  }
}

export async function PATCH(request: Request) {
  if (!requestIsSameOrigin(request)) return Response.json({ error: "Request blocked." }, { status: 403 });
  try {
    const body = await request.json().catch(() => null) as { code?: string; decision?: "accept" | "decline"; proposalId?: number; reply?: string; estimateVersion?: string } | null;
    if (!body || typeof body.code !== "string" || !body.code || !body.decision || !["accept", "decline"].includes(body.decision)) return Response.json({ error: "Invalid decision." }, { status: 400 });
    // A page opened before this version of the site does not name the quote it shows (the live site's portal sent no version at all):
    // nothing is decided and the customer is asked to reload the page (an in-page refresh would keep the old page).
    if (!Number.isInteger(body.proposalId) && typeof body.estimateVersion !== "string") {
      return Response.json({ error: "This page has been updated. Please reload it with your browser's Refresh button, then check the estimate before deciding." }, { status: 409 });
    }
    if (Number.isInteger(body.proposalId)) await customerChangeDecision(body.code, body.proposalId!, body.decision, body.reply ?? "");
    else await customerEstimateDecision(body.code, body.decision, typeof body.estimateVersion === "string" ? body.estimateVersion : "");
    return Response.json({ data: await getPublicWorkflow(body.code) });
  } catch (error) {
    // The quote was revised after this screen was opened: the customer is asked to look at the new one.
    if ((error as { status?: number })?.status === 409) return Response.json({ error: (error as Error).message }, { status: 409 });
    return failed(error);
  }
}
