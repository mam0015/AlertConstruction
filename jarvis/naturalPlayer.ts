"use client";
// Plays Jarvis's natural voice. Each piece of text is fetched as audio from /api/owner/jarvis/speak (a few at a time, ahead of the one that
// is playing), decoded, and laid end to end on the audio clock, so one piece runs straight into the next with no gap, no clicking and no
// waiting. Nothing is kept: the audio exists only in memory while it plays.

type Controller = { stop: () => void; done: Promise<void> };
export type NaturalFailure = Error & { status?: number; code?: string };

const AHEAD = 3; // how many pieces are asked for before the first one has finished playing
const OVERLAP = 0.035; // seconds: the encoder's silent tail of one piece is laid over the start of the next, so speech runs on

let context: AudioContext | null = null;
function audioContext(): AudioContext {
  if (!context) {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    context = new Context();
  }
  return context;
}

export const naturalSupported = () => typeof window !== "undefined" && Boolean(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

async function fetchPiece(text: string, speaker: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch("/api/owner/jarvis/speak", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, speaker }), cache: "no-store", signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; code?: string };
    throw Object.assign(new Error(body.error ?? "The natural voice is not available."), { status: response.status, code: body.code }) as NaturalFailure;
  }
  return response.arrayBuffer();
}

// Starts reading `pieces`. `onStart` runs when the first sound begins; `done` settles when the last one ends (resolves) or when the voice
// fails (rejects with the failure; `started` says whether anything had been heard yet, so the caller can fall back to the device voice).
export function playNatural(pieces: string[], speaker: string, { onStart }: { onStart?: () => void } = {}): Controller & { started: () => boolean } {
  const audio = audioContext();
  const abort = new AbortController();
  const sources: AudioBufferSourceNode[] = [];
  let began = false;
  let stopped = false;
  let nextAt = 0;

  const requests = new Map<number, Promise<AudioBuffer>>();
  const request = (index: number) => {
    if (index >= pieces.length || requests.has(index)) return;
    const pending = fetchPiece(pieces[index], speaker, abort.signal).then((bytes) => audio.decodeAudioData(bytes));
    pending.catch(() => undefined); // the loop below reports it; this keeps a failure of a later piece from being "unhandled" while an earlier one plays
    requests.set(index, pending);
  };

  const done = (async () => {
    if (audio.state !== "running") await audio.resume().catch(() => undefined);
    if (audio.state !== "running") throw Object.assign(new Error("The browser did not allow sound to start. Press a button on the page and try again."), { status: 0, code: "blocked" }) as NaturalFailure;
    for (let index = 0; index < Math.min(AHEAD, pieces.length); index += 1) request(index);
    for (let index = 0; index < pieces.length; index += 1) {
      const buffer = await requests.get(index)!;
      if (stopped) return;
      request(index + AHEAD);
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(audio.destination);
      const startAt = Math.max(nextAt - OVERLAP, audio.currentTime + 0.02);
      source.start(startAt);
      nextAt = startAt + buffer.duration;
      sources.push(source);
      if (!began) { began = true; onStart?.(); }
      source.onended = () => { sources.splice(sources.indexOf(source), 1); };
    }
    // Everything is scheduled; wait for the last sound to finish.
    await new Promise<void>((resolve) => {
      const wait = () => { if (stopped || audio.currentTime >= nextAt - 0.01) resolve(); else window.setTimeout(wait, 60); };
      wait();
    });
  })();

  return {
    started: () => began,
    done,
    stop: () => {
      stopped = true;
      abort.abort();
      for (const source of sources.splice(0)) { try { source.stop(); } catch { /* already finished */ } }
    },
  };
}
