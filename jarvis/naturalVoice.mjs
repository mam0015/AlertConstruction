// Jarvis's natural voice. The device voices in voice.mjs sound like a machine; this one is made by Cloudflare Workers AI (Deepgram Aura-1,
// a human-sounding English voice) and played in the browser as one continuous stream. These are the plain, testable parts: which voices
// exist, how a text is cut into pieces that start fast and run on without gaps, what the server accepts, and how the audio comes back.
// Aura-1 speaks English only. Persian (and the Owner's Offline mode) always use the device voice.

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
export const MAX_PIECE_CHARS = 600;
const FIRST_PIECE_CHARS = 150;
const NEXT_PIECE_CHARS = 420;

export const isSpeaker = (value) => typeof value === "string" && SPEAKERS.some((speaker) => speaker.id === value);

// What the server accepts: one piece of English text and a voice name.
export function parseSpeakInput(body) {
  const error = (message, status = 400) => Object.assign(new Error(message), { status });
  if (!body || typeof body !== "object" || Array.isArray(body)) throw error("Send the text as JSON.");
  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  if (!text) throw error("There is nothing to read.");
  if (text.length > MAX_PIECE_CHARS) throw error("That piece of text is too long to read in one go.", 413);
  if (body.speaker !== undefined && body.speaker !== "" && !isSpeaker(body.speaker)) throw error("Choose one of the listed voices.");
  return { text, speaker: isSpeaker(body.speaker) ? body.speaker : DEFAULT_SPEAKER };
}

// The text cut for natural speech. The first piece is short, so the voice starts after about a second; the rest are longer, so there are few
// requests and the voice runs on. `persian` says the text has Persian in it, and then the whole reading belongs to the device voice.
export function naturalPieces(text) {
  const sentences = chunksFor(text, { max: FIRST_PIECE_CHARS });
  const persian = sentences.some((chunk) => chunk.lang === VOICE_LANGS.fa);
  if (persian || !sentences.length) return { pieces: [], persian };
  const [first, ...rest] = sentences;
  const later = rest.length ? chunksFor(rest.map((chunk) => chunk.text).join(" "), { max: NEXT_PIECE_CHARS }) : [];
  return { pieces: [first.text, ...later.map((chunk) => chunk.text)], persian: false };
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
