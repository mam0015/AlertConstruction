import Anthropic from "@anthropic-ai/sdk";
import { throttleHit, tooManyRequests } from "../../db/throttle";
import { DEFAULT_MODEL, aiEnabled, friendlyAiError } from "../../jarvis/ai.mjs";
import { hooks, jarvisConfig } from "../../jarvis/server";
import { requestIsSameOrigin } from "../owner-auth";
import { EstimateAiError } from "./ai.mjs";
import { estimateActor, type EstimateActor } from "./access";

// The shared gate of the two AI estimate routes: same-site request, a signed-in estimate role, the Claude key present, a per-person hourly limit.
// What is read here (drawings, a quote) is sent to Anthropic to be read; the screen says so before anything is uploaded.
const headers = { "Cache-Control": "no-store" };
const HOUR = 3_600_000;
export const AI_REQUESTS_PER_HOUR = 20;
const MAX_BODY_BYTES = 26 * 1024 * 1024;

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

export async function aiGate(request: Request): Promise<{ actor: EstimateActor; client: Anthropic; model: string; useFallbacks: boolean } | { response: Response }> {
  if (!requestIsSameOrigin(request)) return { response: json({ error: "Request blocked." }, 403) };
  const actor = await estimateActor(request);
  if (!actor) return { response: json({ error: "Sign in to use the estimate tools." }, 401) };
  const config = jarvisConfig();
  const injected = hooks().aiClient as Anthropic | undefined;
  if (!injected && !aiEnabled(config)) {
    return { response: json({ error: "The AI is not connected yet. It uses the same Claude key as Jarvis 1: add the JARVIS_ANTHROPIC_API_KEY secret (see the Jarvis setup guide), then deploy again.", code: "not_connected" }, 503) };
  }
  const used = await throttleHit(`estimate-ai:${actor.email}`, AI_REQUESTS_PER_HOUR, HOUR);
  if (!used.allowed) return { response: tooManyRequests(`You have used ${AI_REQUESTS_PER_HOUR} AI readings this hour. Try again in a few minutes.`, used.retryAfterSeconds) };
  // Reading drawings takes longer than a chat answer, so this client waits up to ~3 minutes and does not retry on its own.
  const client = injected ?? new Anthropic({ apiKey: config.apiKey, timeout: 170_000, maxRetries: 0 });
  return { actor, client, model: config.model || DEFAULT_MODEL, useFallbacks: config.aiFallbacks !== "off" };
}

export async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw new EstimateAiError("Those files are too large to send together.", 413);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new EstimateAiError("Those files are too large to send together.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new EstimateAiError("Send the request as JSON.");
  }
}

export function aiFailure(error: unknown) {
  if (error instanceof EstimateAiError) return json({ error: error.message }, error.status);
  console.error("Estimate AI failed:", error instanceof Error ? error.name : "unknown", (error as { status?: number })?.status ?? "");
  return json({ error: friendlyAiError(error) }, 503);
}
