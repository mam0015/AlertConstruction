// Jarvis's natural voice. The device voices in voice.mjs sound like a machine; this one is made on a server and played in the browser as one
// continuous stream. English: Cloudflare Workers AI (Deepgram Aura-1, a human-sounding voice, no extra key). Persian: Aura speaks English only, so
// Persian uses OpenAI's speech service when the Owner has added an OpenAI key (JARVIS_OPENAI_API_KEY); without it Persian is read by a Persian voice
// installed on the device. These are the plain, testable parts: which voices exist, how a text is cut into pieces that start fast and run on
// without gaps, what the server accepts, and how the audio comes back. The Owner's Offline mode never uses either: device voice only.

import { chunksFor, VOICE_LANGS } from "./voice.mjs";

export const NATURAL_MODEL = "@cf/deepgram/aura-1";
export const DEFAULT_SPEAKER = "zeus";
// The male voices of Aura-1, deepest first. (The female voices are left out: Jarvis is a man's voice.)
export const SPEAKERS = Object.freeze([
  { id: "zeus", label: "Zeus", note: "deep, steady, trustworthy" },
  { id: "orpheus", label: "Orpheus", note: "confident, professional" },
  { id: "orion", label: "Orion", note: "calm, polite" },
  { id: "arcas", label: "Arcas", note: "smooth, natural" },
  { id: "perseus", label: "Perseus", note: "clear, confident" },
  { id: "helios", label: "Helios", note: "clear, professional" },
  { id: "angus", label: "Angus", note: "warm, friendly" },
]);
export const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
export const PERSIAN_MODEL = "gpt-4o-mini-tts";
// OpenAI's male voices, deepest first. "onyx" is the deep, steady one.
export const PERSIAN_VOICES = Object.freeze(["onyx", "ash", "echo", "ballad", "verse", "alloy", "fable"]);
export const DEFAULT_PERSIAN_VOICE = "onyx";
const PERSIAN_INSTRUCTIONS = "Speak natural, clear Persian (Farsi) as spoken in Iran, in a deep, calm, confident adult male voice, at a steady pace without pauses between words. Say English words, names and project codes in English. Read exactly the text given; add and change nothing.";

// The Persian server voice is on only when the OpenAI key secret exists (and it is not switched off with JARVIS_PERSIAN_VOICE=off).
export function persianConfig(env = {}) {
  const key = String(env.JARVIS_OPENAI_API_KEY ?? "").trim();
  if (!key || String(env.JARVIS_PERSIAN_VOICE ?? "").trim().toLowerCase() === "off") return null;
  const wanted = String(env.JARVIS_OPENAI_VOICE ?? "").trim().toLowerCase();
  return { key, voice: PERSIAN_VOICES.includes(wanted) ? wanted : DEFAULT_PERSIAN_VOICE };
}
export const MAX_PIECE_CHARS = 600;
const FIRST_PIECE_CHARS = 150;
const NEXT_PIECE_CHARS = 420;

export const isSpeaker = (value) => typeof value === "string" && SPEAKERS.some((speaker) => speaker.id === value);

// What the server accepts: one piece of text, the language it is in ("en" by default, or "fa"), and a voice name.
export function parseSpeakInput(body) {
  const error = (message, status = 400) => Object.assign(new Error(message), { status });
  if (!body || typeof body !== "object" || Array.isArray(body)) throw error("Send the text as JSON.");
  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  if (!text) throw error("There is nothing to read.");
  if (text.length > MAX_PIECE_CHARS) throw error("That piece of text is too long to read in one go.", 413);
  if (body.speaker !== undefined && body.speaker !== "" && !isSpeaker(body.speaker)) throw error("Choose one of the listed voices.");
  if (body.lang !== undefined && body.lang !== "en" && body.lang !== "fa") throw error("The language must be English or Persian.");
  return { text, lang: body.lang === "fa" ? "fa" : "en", speaker: isSpeaker(body.speaker) ? body.speaker : DEFAULT_SPEAKER };
}

// The text cut for natural speech, each piece in one language. The first piece is short, so the voice starts after about a second; the rest are
// longer, so there are few requests and the voice runs on. hasPersian / hasEnglish say which server voices the reading needs.
export function naturalPieces(text) {
  const sentences = chunksFor(text, { max: FIRST_PIECE_CHARS }).map((chunk) => ({ text: chunk.text, lang: chunk.lang === VOICE_LANGS.fa ? "fa" : "en" }));
  if (!sentences.length) return { pieces: [], hasPersian: false, hasEnglish: false };
  const [first, ...rest] = sentences;
  const pieces = [first];
  for (const sentence of rest) {
    const last = pieces.at(-1);
    // Neighbours in the same language are joined into longer pieces (never the first, which stays short for a fast start).
    if (pieces.length > 1 && last.lang === sentence.lang && last.text.length + sentence.text.length + 1 <= NEXT_PIECE_CHARS) last.text = `${last.text} ${sentence.text}`;
    else pieces.push({ ...sentence });
  }
  return { pieces, hasPersian: pieces.some((piece) => piece.lang === "fa"), hasEnglish: pieces.some((piece) => piece.lang === "en") };
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

// Asks Workers AI for the audio of one piece. Returns { body, type } ready to put in a Response.
export async function synthesize(ai, { text, speaker }) {
  if (!ai || typeof ai.run !== "function") throw Object.assign(new Error("Natural voice is not switched on for this app."), { status: 503 });
  const result = await ai.run(NATURAL_MODEL, { text, speaker, encoding: "mp3" }, { returnRawResponse: true });
  if (result && typeof result === "object" && "body" in result && typeof result.arrayBuffer === "function") {
    if (result.ok === false) throw Object.assign(new Error("The voice service refused."), { status: 502 });
    return { body: result.body, type: "audio/mpeg" };
  }
  if (result instanceof ReadableStream || result instanceof ArrayBuffer || ArrayBuffer.isView(result)) return { body: result, type: "audio/mpeg" };
  if (result && typeof result.audio === "string") return { body: fromBase64(result.audio), type: "audio/mpeg" };
  throw Object.assign(new Error("The voice service answered in a way I do not understand."), { status: 502 });
}

export const voiceNaturalNote = "Natural voice makes the speech on Cloudflare's AI, so the text that is read aloud is sent to Cloudflare to turn into sound. It uses a free daily allowance (roughly five to eight minutes of speech) and then a small fee per character if the account has paid usage. It speaks English only: Persian, and Offline mode, always use the voice installed on this device.";

// Asks OpenAI's speech service for the audio of one Persian piece. Only the piece's text is sent. Returns { body, type }.
export async function synthesizePersian(config, { text }, fetchImpl = globalThis.fetch) {
  if (!config?.key) throw Object.assign(new Error("The Persian voice is not switched on for this app."), { status: 503 });
  let response;
  try {
    response = await fetchImpl(OPENAI_SPEECH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: PERSIAN_MODEL, voice: config.voice, input: text, instructions: PERSIAN_INSTRUCTIONS, response_format: "mp3" }),
    });
  } catch {
    throw Object.assign(new Error("The Persian voice service could not be reached."), { status: 502 });
  }
  if (response.status === 401 || response.status === 403) throw Object.assign(new Error("The OpenAI key was rejected."), { status: 503 });
  if (response.status === 429) throw Object.assign(new Error("The Persian voice service is busy."), { status: 429 });
  if (!response.ok || !response.body) throw Object.assign(new Error("The Persian voice service refused."), { status: 502 });
  return { body: response.body, type: "audio/mpeg" };
}

// What the screen says when this device cannot read Persian and there is no server voice either.
export const persianHelp = "This device has no Persian voice, so Persian is shown on screen but not read aloud. Add one: Windows — Settings › Time & language › Speech › Add voices › Persian (Microsoft Edge also has online Persian voices); Android — Settings › Text-to-speech › Google › install Persian; iPhone or Mac — Settings › Accessibility › Spoken Content › Voices, if Persian is listed. Or add an OpenAI key (the JARVIS_OPENAI_API_KEY secret) and Jarvis reads Persian with a server voice on every device.";
export const persianNote = "Persian is read by OpenAI's speech service, so the Persian text that is read aloud is sent to OpenAI to turn into sound. Switch to Offline mode, or the Device voice, to keep it on this device.";
