// Jarvis's natural voice: the text is cut so the voice starts fast and runs on, the server turns one piece into audio with Workers AI (faked
// here), only the signed-in Owner may use it, a daily limit protects the Cloudflare allowance, and without the AI binding the app says so
// (the browser then uses the device voice).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEFAULT_PERSIAN_VOICE, DEFAULT_SPEAKER, MAX_PIECE_CHARS, NATURAL_MODEL, naturalPieces, OPENAI_SPEECH_URL, parseSpeakInput, persianConfig, PERSIAN_MODEL, SPEAKERS, synthesize, synthesizePersian } from "../jarvis/naturalVoice.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 0xff, 0xfb, 0x90, 0x64]);

test("natural voice: a deep male voice is the default and only male voices are offered", () => {
  assert.equal(DEFAULT_SPEAKER, "zeus");
  assert.equal(SPEAKERS[0].id, "zeus");
  assert.ok(SPEAKERS.length >= 5);
  assert.ok(!SPEAKERS.some((speaker) => ["asteria", "luna", "stella", "athena", "hera"].includes(speaker.id)));
});

test("natural voice: the first piece is short so speech starts quickly, and nothing is lost", () => {
  const text = "Good morning. Three jobs started today and the tiles arrived early. The council inspection moved to Thursday at nine. Please call the supplier about the delayed windows because the install date depends on it. That is everything for now.";
  const { pieces, hasPersian, hasEnglish } = naturalPieces(text);
  assert.deepEqual([hasPersian, hasEnglish], [false, true]);
  assert.ok(pieces.length >= 2);
  assert.ok(pieces[0].text.length <= 150, "the first piece is short");
  assert.ok(pieces.every((piece) => piece.text.length <= 420 && piece.lang === "en"));
  assert.equal(pieces.map((piece) => piece.text).join(" ").replace(/\s+/g, " "), text.replace(/\s+/g, " "));
  assert.deepEqual(naturalPieces("   "), { pieces: [], hasPersian: false, hasEnglish: false });
});

test("natural voice: English and Persian pieces are kept apart, each in its own language, in order", () => {
  const result = naturalPieces("The tiles arrive Thursday.\nکاشی‌ها پنجشنبه می‌رسد.\nPlease confirm the order.");
  assert.deepEqual([result.hasPersian, result.hasEnglish], [true, true]);
  assert.deepEqual(result.pieces.map((piece) => piece.lang), ["en", "fa", "en"]);
  assert.ok(result.pieces[1].text.includes("کاشی"));
  const onlyPersian = naturalPieces("این اخبار است، از تازه‌ترین.");
  assert.deepEqual([onlyPersian.hasPersian, onlyPersian.hasEnglish], [true, false]);
});

test("natural voice: the server accepts one short piece, its language and a listed voice, and nothing else", () => {
  assert.deepEqual(parseSpeakInput({ text: "  Hello   there. " }), { text: "Hello there.", lang: "en", speaker: "zeus" });
  assert.equal(parseSpeakInput({ text: "Hi", speaker: "orion" }).speaker, "orion");
  assert.equal(parseSpeakInput({ text: "سلام", lang: "fa" }).lang, "fa");
  for (const bad of [null, [], "text", {}, { text: "" }, { text: 5 }, { text: "x".repeat(MAX_PIECE_CHARS + 1) }, { text: "Hi", speaker: "asteria" }, { text: "Hi", speaker: "../x" }, { text: "Hi", lang: "de" }]) {
    assert.throws(() => parseSpeakInput(bad), (error) => error instanceof Error && [400, 413].includes(error.status), JSON.stringify(bad));
  }
});

test("persian voice: only with the OpenAI key, never by default, and the key never goes anywhere but OpenAI", async () => {
  assert.equal(persianConfig({}), null);
  assert.equal(persianConfig({ JARVIS_OPENAI_API_KEY: "  " }), null);
  assert.equal(persianConfig({ JARVIS_OPENAI_API_KEY: "sk-x", JARVIS_PERSIAN_VOICE: "off" }), null, "can be switched off");
  assert.deepEqual(persianConfig({ JARVIS_OPENAI_API_KEY: " sk-x " }), { key: "sk-x", voice: DEFAULT_PERSIAN_VOICE });
  assert.equal(persianConfig({ JARVIS_OPENAI_API_KEY: "sk-x", JARVIS_OPENAI_VOICE: "ASH" }).voice, "ash");
  assert.equal(persianConfig({ JARVIS_OPENAI_API_KEY: "sk-x", JARVIS_OPENAI_VOICE: "nonsense" }).voice, "onyx", "an unknown voice name falls back to the deep one");

  const calls = [];
  const ok = async (url, init) => { calls.push({ url, init }); return new Response(MP3, { headers: { "content-type": "audio/mpeg" } }); };
  const audio = await synthesizePersian({ key: "sk-x", voice: "onyx" }, { text: "سلام، این اخبار است." }, ok);
  assert.deepEqual([...new Uint8Array(await new Response(audio.body).arrayBuffer())], [...MP3]);
  assert.equal(calls[0].url, OPENAI_SPEECH_URL);
  assert.equal(calls[0].init.headers.Authorization, "Bearer sk-x");
  const sent = JSON.parse(calls[0].init.body);
  assert.deepEqual([sent.model, sent.voice, sent.input, sent.response_format], [PERSIAN_MODEL, "onyx", "سلام، این اخبار است.", "mp3"]);
  assert.match(sent.instructions, /Persian/);
  const refuse = (status) => async () => new Response("no", { status });
  await assert.rejects(() => synthesizePersian({ key: "sk-x", voice: "onyx" }, { text: "x" }, refuse(401)), (error) => error.status === 503, "a rejected key is the Owner's to fix");
  await assert.rejects(() => synthesizePersian({ key: "sk-x", voice: "onyx" }, { text: "x" }, refuse(429)), (error) => error.status === 429);
  await assert.rejects(() => synthesizePersian({ key: "sk-x", voice: "onyx" }, { text: "x" }, refuse(500)), (error) => error.status === 502);
  await assert.rejects(() => synthesizePersian({ key: "sk-x", voice: "onyx" }, { text: "x" }, async () => { throw new Error("offline"); }), (error) => error.status === 502);
  await assert.rejects(() => synthesizePersian(null, { text: "x" }, ok), (error) => error.status === 503);
});

test("natural voice: audio comes back from every shape Workers AI can answer in, and failures are explained", async () => {
  const calls = [];
  const ai = (result) => ({ run: async (...args) => { calls.push(args); return result; } });
  const bytes = async (audio) => new Uint8Array(await new Response(audio.body).arrayBuffer());

  const raw = await synthesize(ai(new Response(MP3, { headers: { "content-type": "audio/mpeg" } })), { text: "Hello", speaker: "zeus" });
  assert.deepEqual([...await bytes(raw)], [...MP3]);
  assert.equal(raw.type, "audio/mpeg");
  assert.deepEqual(calls[0], [NATURAL_MODEL, { text: "Hello", speaker: "zeus", encoding: "mp3" }, { returnRawResponse: true }]);
  assert.deepEqual([...await bytes(await synthesize(ai(MP3.buffer), { text: "Hi", speaker: "zeus" }))], [...MP3]);
  assert.deepEqual([...await bytes(await synthesize(ai({ audio: Buffer.from(MP3).toString("base64") }), { text: "Hi", speaker: "zeus" }))], [...MP3]);

  await assert.rejects(() => synthesize(null, { text: "Hi", speaker: "zeus" }), (error) => error.status === 503);
  await assert.rejects(() => synthesize(ai({ nope: true }), { text: "Hi", speaker: "zeus" }), (error) => error.status === 502);
  await assert.rejects(() => synthesize(ai(new Response("busy", { status: 500 })), { text: "Hi", speaker: "zeus" }), (error) => error.status === 502);
});

test("API: the voice is Owner-only, says when it is not switched on, speaks when it is, and has a daily limit", async () => {
  const app = await startWorker("voice");
  const owner = await app.ownerCookie();
  const staff = await app.adminCookie("voice.admin@alert.test");
  const get = (cookie) => app.request("/api/owner/jarvis/speak", { headers: cookie ? { cookie } : {} });
  const post = (cookie, body, init = {}) => app.request("/api/owner/jarvis/speak", { ...app.json(cookie, body), ...init });

  assert.equal((await get(null)).status, 401);
  assert.equal((await get(staff)).status, 401, "staff cannot use Jarvis's voice");
  assert.equal((await post(null, { text: "Hi" })).status, 401);
  assert.equal((await post(staff, { text: "Hi" })).status, 401);
  assert.equal((await post(owner, { text: "Hi" }, { origin: false })).status, 403, "other websites cannot make Jarvis speak");
  for (const method of ["PUT", "PATCH", "DELETE"]) assert.equal((await app.request("/api/owner/jarvis/speak", { method, headers: { cookie: owner } })).status, 405, method);

  // Not switched on (no AI binding): the page learns it, and a request is answered with a clear 503 the browser turns into the device voice.
  const off = await (await get(owner)).json();
  assert.equal(off.available, false);
  assert.equal(off.speaker, "zeus");
  const refused = await post(owner, { text: "Hello there." });
  assert.equal(refused.status, 503);
  assert.equal((await refused.json()).code, "unavailable");

  // Switched on.
  const calls = [];
  app.env.AI = { run: async (model, input, options) => { calls.push({ model, input, options }); return new Response(MP3, { headers: { "content-type": "audio/mpeg" } }); } };
  const on = await (await get(owner)).json();
  assert.equal(on.available, true);
  assert.deepEqual(on.speakers.map((speaker) => speaker.id), SPEAKERS.map((speaker) => speaker.id));

  const spoken = await post(owner, { text: "Good morning. The tiles arrived.", speaker: "orion" });
  assert.equal(spoken.status, 200);
  assert.equal(spoken.headers.get("content-type"), "audio/mpeg");
  assert.match(spoken.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual([...new Uint8Array(await spoken.arrayBuffer())], [...MP3]);
  assert.deepEqual(calls[0], { model: NATURAL_MODEL, input: { text: "Good morning. The tiles arrived.", speaker: "orion", encoding: "mp3" }, options: { returnRawResponse: true } });

  assert.equal((await post(owner, { text: "Hi", speaker: "asteria" })).status, 400);
  assert.equal((await post(owner, { text: "x".repeat(MAX_PIECE_CHARS + 1) })).status, 413);
  assert.equal(calls.length, 1, "refused requests never reach the AI");

  // The AI itself failing is explained, not leaked.
  app.env.AI = { run: async () => { throw new Error("secret upstream detail 12345"); } };
  const broken = await post(owner, { text: "Hello again." });
  assert.equal(broken.status, 502);
  const brokenBody = await broken.text();
  assert.ok(!brokenBody.includes("secret upstream detail"), "upstream error text is not passed on");
  assert.match(brokenBody, /failed/);

  // Persian: Aura is English only, so Persian needs the OpenAI key; without it the page is told and the device voice is used.
  assert.equal((await (await get(owner)).json()).persian, false);
  const noPersian = await post(owner, { text: "سلام، این اخبار است.", lang: "fa" });
  assert.equal(noPersian.status, 503);
  assert.equal((await noPersian.json()).code, "unavailable");
  const english = calls.length;
  process.env.JARVIS_OPENAI_API_KEY = "sk-test-persian";
  const speech = [];
  globalThis.__JARVIS_TEST_HOOKS__ = { fetchImpl: async (url, init) => { speech.push({ url: String(url), init }); return new Response(MP3, { headers: { "content-type": "audio/mpeg" } }); } };
  try {
    assert.equal((await (await get(owner)).json()).persian, true);
    const fa = await post(owner, { text: "سلام، این اخبار است.", lang: "fa" });
    assert.equal(fa.status, 200, await fa.clone().text());
    assert.equal(fa.headers.get("content-type"), "audio/mpeg");
    assert.deepEqual([...new Uint8Array(await fa.arrayBuffer())], [...MP3]);
    assert.equal(speech.length, 1);
    assert.equal(speech[0].url, "https://api.openai.com/v1/audio/speech");
    assert.equal(calls.length, english, "Persian never goes through Cloudflare's English voice");
    assert.equal((await post(staff, { text: "سلام", lang: "fa" })).status, 401);
    assert.equal((await post(owner, { text: "Hi", lang: "de" })).status, 400);
    globalThis.__JARVIS_TEST_HOOKS__ = { fetchImpl: async () => new Response("denied", { status: 401 }) };
    const rejected = await post(owner, { text: "سلام", lang: "fa" });
    assert.equal(rejected.status, 503);
    assert.ok(!(await rejected.text()).includes("sk-test-persian"), "the key is never echoed");
  } finally {
    delete process.env.JARVIS_OPENAI_API_KEY;
    delete globalThis.__JARVIS_TEST_HOOKS__;
  }

  // The daily limit: once it is used up, the browser is told to use the device voice until tomorrow.
  app.env.AI = { run: async () => new Response(MP3) };
  app.d1.sqlite.prepare("UPDATE rate_limits SET hits = 400 WHERE key LIKE 'jarvis-speak:%'").run();
  const limited = await post(owner, { text: "One more." });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.match((await limited.json()).error, /allowance/);
});

test("deploy and screen: the AI binding is added with a safe fallback, the device voice stays the fallback, Offline mode never uses the natural voice", () => {
  const deploy = read("scripts/deploy-cloudflare.mjs");
  assert.match(deploy, /config\.ai = \{ binding: "AI" \}/);
  assert.match(deploy, /delete config\.ai/, "if Cloudflare refuses the AI binding the deploy is repeated without it");
  const hook = read("jarvis/useVoice.ts");
  assert.match(hook, /!offlineRef\.current/, "Offline mode: only the device voice");
  assert.match(hook, /speakOnDevice\(id, text, why\.trim\(\)\)/, "a natural-voice failure falls back to the device voice");
  assert.match(read("jarvis/naturalPlayer.ts"), /createBufferSource/, "pieces are scheduled end to end on the audio clock");
});
