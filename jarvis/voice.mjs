// Jarvis can read aloud and listen, in English and Persian. The speaking and listening themselves are done by the Owner's own browser
// (Web Speech API); this file holds the plain, testable parts: which language a piece of text is in, what to strip so it sounds natural,
// how to cut it into pieces the browser reads reliably, which installed voice to use, and how the news is turned into something to read.

export const VOICE_LANGS = { en: "en-AU", fa: "fa-IR" };

const PERSIAN_LETTERS = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN_LETTERS = /[A-Za-z]/g;

// "fa" or "en" by whichever script has more letters ("none" for digits and symbols only). A tie goes to Persian, because a Persian sentence
// with one English name in it is still a Persian sentence.
export function scriptOf(text) {
  const value = String(text ?? "");
  const persian = (value.match(PERSIAN_LETTERS) ?? []).length;
  const latin = (value.match(LATIN_LETTERS) ?? []).length;
  if (!persian && !latin) return "none";
  return persian >= latin ? "fa" : "en";
}

const BIDI_MARKS = /[‎‏‪-‮⁦-⁩]/g;

// What a voice should actually say: no bullets, markdown, arrows, web addresses or hidden direction marks, and project codes spaced out.
export function speakable(text) {
  return String(text ?? "")
    .replace(BIDI_MARKS, "")
    .split(/\r?\n/)
    .map((line) => line
      // Whitespace first, so the patterns below never have long runs of spaces to work through.
      .replace(/\s+/g, " ")
      .replace(/^\s*(?:[•·▪◦*+\-–—]|#{1,6}|\d{1,3}[.)])\s+/, "")
      .replace(/https?:\/\/\S+/gi, "link")
      .replace(/[*_`~]+/g, "")
      .replace(/\s*(?:→|->|=>)\s*/g, " to ")
      .replace(/\b([A-Z]{2,5})-(\d{4})-([A-Z0-9]{3,})\b/g, "$1 $2 $3")
      .replace(/\s*@\s*/g, " at ")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean)
    // A line that ends without punctuation gets a full stop, so the voice pauses between list items instead of running them together.
    .map((line) => (/[.!?؟:;،,…]$/.test(line) ? line : `${line}.`))
    .join("\n");
}

// Pieces of about `max` characters, cut at sentence ends (or at a space when a sentence is very long), each marked with the language of
// its script. Browsers stop reading very long text part-way, so nothing longer than a short paragraph is ever handed over at once.
export function chunksFor(text, { prefer = "en", max = 170 } = {}) {
  const fallback = prefer === "fa" ? "fa" : "en";
  const pieces = [];
  for (const line of speakable(text).split("\n")) {
    for (const sentence of line.split(/(?<=[.!?؟…:;])\s+/)) {
      let rest = sentence.trim();
      while (rest.length > max) {
        const cut = rest.lastIndexOf(" ", max);
        const at = cut > max * 0.4 ? cut : max;
        pieces.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      if (rest) pieces.push(rest);
    }
  }
  // Every sentence is cut into runs of words in one script: a Persian word inside an English sentence goes to the Persian voice, and an English
  // word inside a Persian sentence to the English voice. Words with no letters (numbers) stay with the words next to them, and text that has no
  // letters at all is read in the language of what came before it (or the chosen language at the very start).
  const chunks = [];
  const push = (text, lang) => {
    const last = chunks.at(-1);
    // Neighbours in the same language are joined up to the length limit, so speech is not cut into tiny pieces.
    if (last && last.lang === lang && last.text.length + text.length + 1 <= max) last.text = `${last.text} ${text}`;
    else chunks.push({ text, lang });
  };
  for (const piece of pieces) {
    let current = null;
    const flush = () => {
      if (current) push(current.text, current.lang ?? chunks.at(-1)?.lang ?? VOICE_LANGS[fallback]);
      current = null;
    };
    // Words are cut where the script changes (PDF‌ها is "PDF" in English and "ها" in Persian), so no Persian letter is ever handed to an English voice.
    // The pieces of one word are glued back together without a space when they stay in the same chunk.
    const words = piece.split(" ").flatMap((word) => (word.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u200C]+|[A-Za-z]+|[^A-Za-z\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u200C]+/g) ?? []).map((part, index) => ({ part, glue: index > 0 })));
    for (const { part, glue } of words) {
      const script = scriptOf(part);
      const lang = script === "none" ? null : VOICE_LANGS[script];
      const joiner = glue ? "" : " ";
      if (!current) current = { text: part, lang };
      else if (lang === null || current.lang === null || lang === current.lang) { current.text = `${current.text}${joiner}${part}`; current.lang ??= lang; }
      else { flush(); current = { text: part, lang }; }
    }
    flush();
  }
  return chunks;
}

const normalise = (lang) => String(lang ?? "").replace(/_/g, "-").toLowerCase();

// The best installed voice for a language, or null. English prefers Australian, then British, then any other English. Persian is only
// ever read by a Persian voice: an English voice reading Persian letters is gibberish, so no voice means the text is not spoken.
export function pickVoice(voices, lang) {
  const list = (voices ?? []).filter((voice) => voice && voice.lang);
  const want = normalise(lang);
  const primary = want.split("-")[0];
  const order = primary === "en" ? ["en-gb", "en-us", "en-nz", "en-ie", "en-ca"] : [];
  const groups = (voicesOfKind) => [
    voicesOfKind.filter((voice) => normalise(voice.lang) === want),
    ...order.map((tag) => voicesOfKind.filter((voice) => normalise(voice.lang) === tag)),
    voicesOfKind.filter((voice) => normalise(voice.lang).split("-")[0] === primary),
  ];
  // Voices on the device come first, in every variant of the language (so text stays on the device); an online voice is used only when there is no other.
  for (const group of [...groups(list.filter((voice) => voice.localService)), ...groups(list.filter((voice) => !voice.localService))]) {
    if (group.length) return group[0];
  }
  return null;
}

export function voiceProblem(chunks, voices) {
  if (!(voices ?? []).length) return "This browser has no voices to read with. Try Chrome, Edge or Safari.";
  const needsPersian = chunks.some((chunk) => chunk.lang === VOICE_LANGS.fa);
  if (needsPersian && !pickVoice(voices, VOICE_LANGS.fa)) return "No Persian voice is installed on this device, so the Persian parts are not read aloud. Add one in your device's language or speech settings, or read them on screen.";
  // An online voice sends the text it reads to the voice provider (for example Google or Microsoft). The Owner is told.
  const online = [...new Set(chunks.map((chunk) => chunk.lang))].map((lang) => pickVoice(voices, lang)).filter((voice) => voice && voice.localService === false);
  if (online.length) return "This device only has an online voice for this language, so the text that is read aloud is sent to the company that provides the voice (for example Google or Microsoft). Choose a voice installed on the device in its speech settings to keep it private.";
  return "";
}

const INTRO = {
  en: { news: "Here is the news, newest first.", plans: "Here is what is coming up, soonest first.", none: "There is nothing new in this period.", nonePlans: "Nothing is planned in this period.", end: "That is everything.", more: (n) => `${n} more are not read aloud.` },
  fa: { news: "این اخبار است، از تازه‌ترین.", plans: "این برنامه‌های پیش رو است، از نزدیک‌ترین.", none: "در این بازه چیز تازه‌ای نیست.", nonePlans: "در این بازه برنامه‌ای ثبت نشده است.", end: "اخبار تمام شد.", more: (n) => `${n} مورد دیگر خوانده نمی‌شود.` },
};

// What "Read the news" says: every record from the screen, newest first (the Owner's own messages are not news to the Owner).
export function newsScript(items, { lang = "en", max = 100 } = {}) {
  const words = INTRO[lang === "fa" ? "fa" : "en"];
  const list = (items ?? []).filter((item) => item && item.kind !== "message_from_owner");
  if (!list.length) return words.none;
  const shown = list.slice(0, max);
  const lines = shown.map((item) => {
    const who = String(item.who ?? "").replace(/<[^>]*>/g, "").trim();
    return [item.title, who && !String(item.title).includes(who) ? who : "", item.preview].filter(Boolean).join(". ");
  });
  const more = list.length - shown.length;
  return [words.news, ...lines, more > 0 ? words.more(more) : "", words.end].filter(Boolean).join("\n");
}

const dayWords = {
  en: new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }),
  fa: new Intl.DateTimeFormat("fa-u-ca-gregory-nu-latn", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }),
};

// Each plan is read with its day and time spoken as words ("Wednesday 21 October. 09:00. Council inspection."), not as an ISO code.
export function plansScript(plans, { lang = "en", max = 20 } = {}) {
  const words = INTRO[lang === "fa" ? "fa" : "en"];
  const list = plans ?? [];
  if (!list.length) return words.nonePlans;
  const lines = list.slice(0, max).map((plan) => {
    const match = String(plan.title ?? "").match(/^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))? — /);
    const day = match && !Number.isNaN(Date.parse(`${match[1]}T12:00:00Z`)) ? dayWords[lang === "fa" ? "fa" : "en"].format(new Date(`${match[1]}T12:00:00Z`)) : "";
    const title = String(plan.title ?? "").replace(/^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})? — /, "");
    return [day, match?.[2] ?? "", title, plan.who, plan.project].filter(Boolean).join(". ");
  });
  const more = list.length - Math.min(list.length, max);
  return [words.plans, ...lines, more > 0 ? words.more(more) : "", words.end].filter(Boolean).join("\n");
}

// What the Owner's own microphone said, joined into the box without doubling spaces. A Persian sentence after an English one is fine.
export function joinSpoken(existing, spoken) {
  const added = String(spoken ?? "").replace(BIDI_MARKS, "").replace(/\s+/g, " ").trim();
  if (!added) return String(existing ?? "");
  const before = String(existing ?? "").trimEnd();
  return before ? `${before} ${added}` : added;
}

const LISTEN_PROBLEMS = {
  "not-allowed": "The microphone is blocked. Allow the microphone for this site in your browser, then try again.",
  "service-not-allowed": "The microphone is blocked. Allow the microphone for this site in your browser, then try again.",
  "no-speech": "I did not hear anything. Press the microphone and speak again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice typing needs an internet connection: your browser turns your voice into text with its own speech service.",
  "language-not-supported": "This browser cannot listen in that language. Choose the other language, or type instead.",
};
export const listenProblem = (code) => LISTEN_PROBLEMS[code] ?? "Voice typing stopped. Press the microphone to try again.";
