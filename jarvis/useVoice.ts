"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { chunksFor, listenProblem, pickVoice, voiceProblem, VOICE_LANGS } from "./voice.mjs";

// Jarvis's ears and voice. Both belong to the Owner's own browser (Web Speech API): reading aloud uses the voices installed on the device,
// and voice typing uses the browser's own online speech service. This code never sends anything to the Jarvis server by itself; what is
// heard only ends up in the command box, and the Owner still presses Run (unless they chose "run when I stop talking").

export type VoiceLang = "en" | "fa";
export type VoicePrefs = { lang: VoiceLang; speakAnswers: boolean; autoRun: boolean };
const KEY = "jarvis.voice";
const DEFAULTS: VoicePrefs = { lang: "en", speakAnswers: false, autoRun: false };

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;
const recognitionConstructor = (): RecognitionConstructor | null => {
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
};

// The Owner's choices live in this browser only. A tiny store keeps every part of the screen in step, and falls back to memory when the
// browser refuses to store anything (private mode).
const listeners = new Set<() => void>();
let memory: VoicePrefs | null = null;
let rawSaved: string | null | undefined;
let parsed: VoicePrefs = DEFAULTS;
function readPrefs(): VoicePrefs {
  if (memory) return memory;
  let raw: string | null;
  try { raw = window.localStorage.getItem(KEY); } catch { return parsed; }
  if (raw !== rawSaved) {
    rawSaved = raw;
    try {
      const saved = JSON.parse(raw ?? "null") as Partial<VoicePrefs> | null;
      parsed = saved ? { lang: saved.lang === "fa" ? "fa" : "en", speakAnswers: saved.speakAnswers === true, autoRun: saved.autoRun === true } : DEFAULTS;
    } catch { parsed = DEFAULTS; }
  }
  return parsed;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}
const never = () => () => undefined;

export function useVoice() {
  const prefs = useSyncExternalStore(subscribe, readPrefs, () => DEFAULTS);
  const canSpeak = useSyncExternalStore(never, () => typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined", () => false);
  const canListen = useSyncExternalStore(never, () => Boolean(recognitionConstructor()), () => false);
  const [speakingId, setSpeakingId] = useState("");
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  // The language the microphone was actually started in (the choice may be changed while it listens).
  const [listenLang, setListenLang] = useState<VoiceLang>("en");
  const [note, setNote] = useState("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  // Identifies the reading that is current, so the "finished" event of an older, cancelled reading cannot clear a newer one.
  const readingRef = useRef(0);
  // False once the panel is gone: an answer that arrives late must not start reading aloud with nothing on screen to stop it.
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const synth = typeof window.speechSynthesis === "undefined" ? null : window.speechSynthesis;
    if (!synth) return () => { aliveRef.current = false; };
    // Browsers load their voice list a moment after the page opens, and announce it with this event.
    const refresh = () => { voicesRef.current = synth.getVoices(); };
    refresh();
    synth.addEventListener?.("voiceschanged", refresh);
    return () => {
      aliveRef.current = false;
      synth.removeEventListener?.("voiceschanged", refresh);
      readingRef.current += 1;
      synth.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const update = useCallback((patch: Partial<VoicePrefs>) => {
    const next = { ...readPrefs(), ...patch };
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { memory = next; /* not remembered after this visit */ }
    listeners.forEach((listener) => listener());
  }, []);

  const stopReading = useCallback(() => {
    readingRef.current += 1;
    if (typeof window.speechSynthesis !== "undefined") window.speechSynthesis.cancel();
    setSpeakingId("");
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Reads the text aloud, piece by piece. Pressing it again for the same thing stops it.
  const speak = useCallback((id: string, text: string) => {
    if (!aliveRef.current) return;
    if (typeof window.speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") {
      setNote("This browser cannot read aloud. Try Chrome, Edge or Safari.");
      return;
    }
    const synth = window.speechSynthesis;
    stopReading();
    recognitionRef.current?.abort();
    const chunks = chunksFor(text, { prefer: prefs.lang });
    if (!chunks.length) return;
    const voices = synth.getVoices().length ? synth.getVoices() : voicesRef.current;
    voicesRef.current = voices;
    setNote(voiceProblem(chunks, voices));
    // A Persian piece is only read by a Persian voice; an English voice would only produce nonsense.
    const playable = chunks.filter((chunk) => chunk.lang !== VOICE_LANGS.fa || pickVoice(voices, VOICE_LANGS.fa));
    if (!voices.length || !playable.length) return;
    const token = readingRef.current;
    setSpeakingId(id);
    playable.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.lang = chunk.lang;
      const voice = pickVoice(voices, chunk.lang);
      if (voice) utterance.voice = voice;
      if (index === playable.length - 1) {
        const done = () => { if (readingRef.current === token) setSpeakingId(""); };
        utterance.onend = done;
        utterance.onerror = done;
      }
      synth.speak(utterance);
    });
  }, [prefs.lang, stopReading]);

  // Listens once. What is heard fills in live; when the speaker stops, onDone gets the finished sentence.
  const listen = useCallback((onDone: (said: string) => void) => {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setNote("Voice typing is not available in this browser. Chrome, Edge and Safari have it. You can still type.");
      return;
    }
    stopReading();
    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.lang = VOICE_LANGS[prefs.lang];
    setListenLang(prefs.lang);
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    finalRef.current = "";
    setHeard("");
    setNote("");
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalRef.current = `${finalRef.current} ${result[0].transcript}`.trim();
        else interim += result[0].transcript;
      }
      setHeard(`${finalRef.current} ${interim}`.trim());
    };
    recognition.onerror = (event) => { if (event.error !== "aborted") setNote(listenProblem(event.error)); };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
      setHeard("");
      const said = finalRef.current.trim();
      finalRef.current = "";
      if (said) onDone(said);
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setNote(listenProblem(""));
    }
  }, [prefs.lang, stopReading]);

  return { prefs, update, canSpeak, canListen, speakingId, listening, listenLang, heard, note, setNote, speak, stopReading, listen, stopListening };
}

export type VoiceApi = ReturnType<typeof useVoice>;
