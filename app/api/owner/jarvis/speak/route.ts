import { runtimeBindings } from "../../../../../db/runtime";
import { throttleHit, tooManyRequests } from "../../../../../db/throttle";
import { DEFAULT_SPEAKER, parseSpeakInput, SPEAKERS, synthesize } from "../../../../../jarvis/naturalVoice.mjs";
import { JarvisAccessError } from "../../../../../jarvis/policy.mjs";
import { fail, headers, notAllowed, readJson, requireOwner } from "../../../../../jarvis/server";

// Jarvis's natural voice. Owner session only. GET says whether it is switched on (the AI binding exists) and which voices there are;
// POST turns ONE short piece of English text into spoken audio (mp3) with Cloudflare Workers AI. Nothing is stored. A daily limit keeps
// a stuck page or a runaway loop from using up the Cloudflare AI allowance.
type SpeechAi = { run: (model: string, input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown> };
const aiOf = async () => (await runtimeBindings() as unknown as { AI?: SpeechAi }).AI;
const DAY = 86_400_000;
const DAILY_PIECES = 400;

export async function GET(request: Request) {
  const gate = await requireOwner(request, { write: false });
  if (!gate.owner) return gate.response;
  return Response.json({ available: Boolean(await aiOf()), speakers: SPEAKERS, speaker: DEFAULT_SPEAKER, dailyPieces: DAILY_PIECES }, { headers });
}

export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    let input: { text: string; speaker: string };
    try {
      input = parseSpeakInput(await readJson(request, 4_000));
    } catch (problem) {
      const status = (problem as { status?: number }).status;
      if (problem instanceof JarvisAccessError || !status) throw problem;
      throw new JarvisAccessError((problem as Error).message, status);
    }
    const ai = await aiOf();
    if (!ai) return Response.json({ error: "Natural voice is not switched on for this app yet, so Jarvis uses the voice on this device.", code: "unavailable" }, { status: 503, headers });
    const used = await throttleHit(`jarvis-speak:${gate.owner.email}`, DAILY_PIECES, DAY);
    if (!used.allowed) return tooManyRequests("Today's natural-voice allowance is used up, so Jarvis uses the voice on this device until tomorrow.", used.retryAfterSeconds);
    let audio: Awaited<ReturnType<typeof synthesize>>;
    try {
      audio = await synthesize(ai, input);
    } catch (problem) {
      console.error("Jarvis voice failed:", problem instanceof Error ? problem.name : "unknown", (problem as { status?: number })?.status ?? "");
      return Response.json({ error: "The natural voice did not answer, so Jarvis uses the voice on this device.", code: "failed" }, { status: 502, headers });
    }
    return new Response(audio.body as BodyInit, { headers: { ...headers, "Content-Type": audio.type } });
  } catch (error) {
    return fail(error, "Jarvis could not speak right now.");
  }
}

export const PUT = notAllowed("GET, POST");
export const PATCH = notAllowed("GET, POST");
export const DELETE = notAllowed("GET, POST");
