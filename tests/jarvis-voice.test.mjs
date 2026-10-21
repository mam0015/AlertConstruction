// Jarvis reads aloud and listens in English and Persian. The browser does the speaking; these are the parts that decide what is said, in which
// language, with which voice, and what is told to the Owner when something is not available.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chunksFor, joinSpoken, listenProblem, newsScript, pickVoice, plansScript, scriptOf, speakable, voiceProblem, VOICE_LANGS } from "../jarvis/voice.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("voice: each piece of text is read in the language it is written in", () => {
  assert.equal(scriptOf("Roof leak at the Kew house"), "en");
  assert.equal(scriptOf("سقف خانه نشت می‌کند"), "fa");
  assert.equal(scriptOf("12 345 $"), "none");
  assert.equal(scriptOf("پیام از Ali"), "fa", "a tie goes to Persian: one English name does not make a Persian sentence English");
  assert.equal(scriptOf("Message from علی"), "en");
  assert.equal(scriptOf(null), "none");
});

test("voice: what is read aloud has no bullets, markup, arrows, links or hidden marks, and codes are spaced out", () => {
  const raw = "• **Roof leak** — Jo\n- ATP-2026-00124 → Kitchen\n1. See https://example.com/x?y=1 now\n⁨Ali⁩ wrote at ali@example.com\n### Heading";
  const text = speakable(raw);
  assert.ok(!/[•*#]|https?:|→|[⁦-⁩]/.test(text), text);
  assert.ok(text.includes("ATP 2026 00124 to Kitchen"));
  assert.ok(text.includes("See link now"));
  assert.ok(text.includes("ali at example.com"));
  for (const line of text.split("\n")) assert.match(line, /[.!?؟:;،,…]$/, `each line ends with a pause: ${line}`);
  assert.equal(speakable(""), "");
  assert.equal(speakable(null), "");
});

test("voice: long text is cut into short pieces, each marked English or Persian, and nothing is lost", () => {
  const long = "This is a long sentence about the kitchen delay and the supplier. ".repeat(12);
  const english = chunksFor(long, { max: 120 });
  assert.ok(english.length > 3);
  assert.ok(english.every((chunk) => chunk.text.length <= 120 && chunk.lang === "en-AU"));
  assert.equal(english.map((chunk) => chunk.text).join(" ").replace(/\s+/g, " "), speakable(long).replace(/\s+/g, " "));

  const mixed = chunksFor("The tiles arrive Thursday.\nکاشی‌ها پنجشنبه می‌رسد.\n42", { prefer: "fa", max: 200 });
  assert.deepEqual(mixed.map((chunk) => chunk.lang), ["en-AU", "fa-IR"]);
  assert.ok(mixed[1].text.includes("42"), "digits stay with the neighbour in the same language");
  assert.deepEqual(chunksFor("   "), []);
  const numbersOnly = chunksFor("12 345", { prefer: "fa" });
  assert.equal(numbersOnly[0].lang, "fa-IR", "text with no letters uses the chosen language");
  const noSpace = chunksFor("x".repeat(500), { max: 100 });
  assert.ok(noSpace.every((chunk) => chunk.text.length <= 101) && noSpace.length >= 5, "an unbroken run is still cut");
});

test("voice: the best installed voice is chosen, and Persian is never read by an English voice", () => {
  const voices = [
    { name: "Daniel", lang: "en_GB", localService: true },
    { name: "Karen", lang: "en-AU", localService: false },
    { name: "Karen Offline", lang: "en-AU", localService: true },
    { name: "Samantha", lang: "en-US", localService: true },
    { name: "Dariush", lang: "fa_IR", localService: true },
  ];
  assert.equal(pickVoice(voices, VOICE_LANGS.en).name, "Karen Offline", "exact language, installed on the device first");
  assert.equal(pickVoice(voices, VOICE_LANGS.fa).name, "Dariush", "underscores in the voice language are understood");
  assert.equal(pickVoice(voices.filter((voice) => !voice.lang.startsWith("en-AU")), VOICE_LANGS.en).name, "Daniel", "British before American");
  assert.equal(pickVoice(voices.filter((voice) => !voice.lang.startsWith("fa")), VOICE_LANGS.fa), null, "no Persian voice means none, not an English one");
  assert.equal(pickVoice([], VOICE_LANGS.en), null);
  assert.equal(pickVoice(undefined, VOICE_LANGS.en), null);
});

test("voice: when reading is not possible the Owner is told why, in plain words", () => {
  const persian = chunksFor("سلام");
  const english = chunksFor("Hello");
  assert.match(voiceProblem(english, []), /no voices/i);
  assert.match(voiceProblem(persian, [{ lang: "en-AU" }]), /No Persian voice/);
  assert.equal(voiceProblem(english, [{ lang: "en-AU" }]), "", "English parts are fine without a Persian voice");
  assert.equal(voiceProblem(persian, [{ lang: "fa-IR" }]), "");
});

test("voice: 'read the news' reads every record newest first, never the Owner's own messages, in the chosen language", () => {
  const items = [
    { kind: "email_received", title: "Roof leak", who: "Jo Client <jo@example.com>", preview: "Please come urgently." },
    { kind: "message_from_owner", title: "Be on site at 7", who: "You", preview: "" },
    { kind: "customer_message", title: "Comment from Sam", who: "Sam", preview: "Not happy with the delay." },
  ];
  const english = newsScript(items);
  assert.ok(english.startsWith("Here is the news, newest first."));
  assert.ok(english.indexOf("Roof leak") < english.indexOf("Comment from Sam"), "the order of the screen is kept");
  assert.ok(!english.includes("Be on site at 7"), "the Owner's own words are not news");
  assert.ok(!english.includes("<jo@example.com>"), "markup is removed");
  assert.ok(english.trimEnd().endsWith("That is everything."));
  const persian = newsScript(items, { lang: "fa" });
  assert.ok(persian.startsWith("این اخبار است"));
  assert.ok(persian.trimEnd().endsWith("اخبار تمام شد."));
  assert.equal(newsScript([], { lang: "en" }), "There is nothing new in this period.");
  assert.equal(newsScript([{ kind: "message_from_owner", title: "x" }], { lang: "fa" }), "در این بازه چیز تازه‌ای نیست.");
  const many = newsScript(Array.from({ length: 5 }, (_, n) => ({ kind: "x", title: `T${n}` })), { max: 3 });
  assert.match(many, /2 more are on the screen\./);
  assert.match(plansScript([{ title: "Council inspection", who: "Sue", project: "ATP-2026-00124" }]), /Council inspection\. Sue\. ATP-2026-00124/);
  assert.equal(plansScript([], { lang: "fa" }), "در این بازه برنامه‌ای ثبت نشده است.");
});

test("voice: spoken words are added to what is already typed, and every microphone problem has a plain-language message", () => {
  assert.equal(joinSpoken("", "  message   Ali  "), "message Ali");
  assert.equal(joinSpoken("Tell Sue", "to call me"), "Tell Sue to call me");
  assert.equal(joinSpoken("Tell Sue  ", ""), "Tell Sue  ");
  assert.equal(joinSpoken(null, null), "");
  assert.equal(joinSpoken("Hello", "سلام‏"), "Hello سلام");
  for (const code of ["not-allowed", "no-speech", "audio-capture", "network", "language-not-supported", "aborted-for-some-reason"]) assert.ok(listenProblem(code).length > 20, code);
  assert.match(listenProblem("network"), /internet/);
});

test("voice: the screen offers reading and listening in both languages, honestly, and typing still goes to Jarvis", () => {
  const panel = read("jarvis/JarvisPanel.tsx");
  const bar = read("jarvis/VoiceBar.tsx");
  const hook = read("jarvis/useVoice.ts");
  assert.match(panel, /<VoiceBar/);
  assert.match(panel, /void ask\(text\)/, "typed instructions are still sent");
  assert.match(bar, /Read the news/);
  for (const needle of ["Persian", "فارسی", "English"]) assert.ok(bar.includes(needle), `${needle} is offered`);
  assert.match(hook, /SpeechRecognition/);
  assert.match(hook, /speechSynthesis/);
  assert.match(hook, /voiceschanged/);
  assert.match(bar, /own speech service|speech service/i, "the privacy note about voice typing is shown");
  // Nothing is stored on the server and nothing leaves the device except through the browser's own speech service.
  assert.ok(!/fetch\(/.test(hook), "the voice code never calls the network itself");
  // Choices are remembered on this device only, and safely when storage is unavailable.
  assert.match(hook, /localStorage[\s\S]*catch/);
});
