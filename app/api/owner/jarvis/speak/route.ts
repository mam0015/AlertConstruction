import { runtimeBindings } from "../../../../../db/runtime";
import { throttleHit, tooManyRequests } from "../../../../../db/throttle";
import { DEFAULT_SPEAKER, parseSpeakInput, persianConfig, SPEAKERS, synthesize, synthesizePersian } from "../../../../../jarvis/naturalVoice.mjs";
import { JarvisAccessError } from "../../../../../jarvis/policy.mjs";
import { fail, headers, networkFetch, notAllowed, readJson, requireOwner } from "../../../../../jarvis/server";

// Jarvis's natural voice. Owner session only. GET says whether it is switched on (the AI binding exists; for Persian, the OpenAI key) and which
// voices there are; POST turns ONE short piece of text into spoken audio (mp3): English with Cloudflare Workers AI, Persian with OpenAI's speech
// service (only when its key secret exists). Nothing is stored. A daily limit keeps a stuck page or a runaway loop from using up the allowance.
type SpeechAi = { run: (model: string, input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown> };
const aiOf = async () => (await runtimeBindings() as unknown as { AI?: SpeechAi }).AI;
const DAY = 86_400_000;
const DAILY_PIECES = 400;

export async function GET(request: Request) {
  const gate = await requireOwner(request, { write: false });
  if (!gate.owner) return gate.response;
  return Response.json({ available: Boolean(await aiOf()), persian: Boolean(persianConfig(process.env)), speakers: SPEAKERS, speaker: DEFAULT_SPEAKER, dailyPieces: DAILY_PIECES }, { headers });
}

export async function POST(request: Request) {
  const gate = await requireOwner(request, { write: true });
  if (!gate.owner) return gate.response;
  try {
    let input: { text: string; speaker: string; lang: string };
    try {
      input = parseSpeakInput(await readJson(request, 4_000));
    } catch (problem) {
      const status = (problem as { status?: number }).status;
      if (problem instanceof JarvisAccessError || !status) throw problem;
      throw new JarvisAccessError((problem as Error).message, status);
    }
    const persian = input.lang === "fa" ? persianConfig(process.env) : null;
    const ai = input.lang === "fa" ? null : await aiOf();
    if (input.lang === "fa" ? !persian : !ai) {
      return Response.json({ error: input.lang === "fa" ? "The Persian voice is not switched on for this app yet, so Jarvis uses a Persian voice on this device." : "Natural voice is not switched on for this app yet, so Jarvis uses the voice on this device.", code: "unavailable" }, { status: 503, headers });
    }
    const used = await throttleHit(`jarvis-speak:${gate.owner.email}`, DAILY_PIECES, DAY);
    if (!used.allowed) return tooManyRequests("Today's natural-voice allowance is used up, so Jarvis uses the voice on this device until tomorrow.", used.retryAfterSeconds);
    let audio: Awaited<ReturnType<typeof synthesize>>;
    try {
      audio = input.lang === "fa" ? await synthesizePersian(persian, input, networkFetch()) : await synthesize(ai, input);
    } catch (problem) {
      const failure = (problem as { status?: number })?.status;
      console.error("Jarvis voice failed:", problem instanceof Error ? problem.name : "unknown", failure ?? "");
      // A rejected key is the Owner's to fix; anything else is a passing failure.
      return Response.json({ error: failure === 503 ? "The Persian voice key was not accepted, so Jarvis uses a voice on this device." : "The natural voice did not answer, so Jarvis uses the voice on this device.", code: failure === 503 ? "unavailable" : "failed" }, { status: failure === 503 ? 503 : 502, headers });
    }
    return new Response(audio.body as BodyInit, { headers: { ...headers, "Content-Type": audio.type } });
  } catch (error) {
    return fail(error, "Jarvis could not speak right now.");
  }
}

export const PUT = notAllowed("GET, POST");
export const PATCH = notAllowed("GET, POST");
export const DELETE = notAllowed("GET, POST");
