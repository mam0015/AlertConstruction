// Fixes after the local test: Jarvis never says it did something it only prepared (6), basic mode says what it can do instead of an unrelated list (3),
// and the Owner's own messages to the team are not reported back to the Owner as news (4).
import assert from "node:assert/strict";
import test from "node:test";
import { removeFalseClaims } from "../jarvis/claims.mjs";
import { askJarvis, parseAskInput } from "../jarvis/assistant.mjs";
import { aiReply, baseConfig, createTables, fakeAi, FIXTURE_OWNER, googleMock, seed } from "./helpers/jarvis-fixtures.mjs";
import { TestD1 } from "./helpers/test-d1.mjs";

const owner = { email: FIXTURE_OWNER, name: "Alex" };
const freshDb = () => { const d1 = new TestD1(); createTables(d1); seed(d1); return d1; };
const people = [{ email: "tiler@alert.test", name: "tiler · Tiler", role: "Worker" }];

test("claims: a sentence saying the AI already did something is replaced by a true line; what others did and what will happen stay", () => {
  const prepared = (text) => removeFalseClaims(text, { prepared: true });
  assert.equal(prepared("Done, everything has been sent and deleted.").removed, 1);
  assert.match(prepared("Done, everything has been sent and deleted.").reply, /^Nothing has been done yet: what is prepared happens only when you press its button\.$/);
  assert.match(removeFalseClaims("All done.").reply, /^Nothing has been done: Jarvis only reads and prepares things\.$/);
  assert.equal(removeFalseClaims("I have emailed everyone and I have told the tiler.").removed, 1);
  assert.equal(removeFalseClaims("I've just messaged Ali. Message sent.").removed, 2);
  assert.equal(removeFalseClaims("I have created the task for Marcus.").removed, 1);

  for (const fine of [
    "I have prepared the message for Ali. It is sent when you press the button.",
    "Sue sent the report on Monday. The invoice was paid. Sam sent a message about the delay.",
    "The task has been created by Ali yesterday.",
    "I could not send it. Nothing has been sent.",
    "I have added the main points below.",
    "Sue says she has told the plumber.",
  ]) assert.deepEqual(removeFalseClaims(fine), { reply: fine, removed: 0 }, fine);

  // Persian: the same, in Persian
  assert.equal(removeFalseClaims("همه چیز انجام شد و پیام فرستاده شد.").removed, 1);
  assert.match(removeFalseClaims("همه چیز انجام شد.", { prepared: true }).reply, /هنوز هیچ کاری انجام نشده/);
  for (const fine of ["پیام برای علی آماده شد. با فشردن دکمه فرستاده می‌شود.", "هنوز چیزی فرستاده نشده است."]) assert.equal(removeFalseClaims(fine).removed, 0, fine);
});

test("assistant: when the AI says it already did it, the Owner sees a true line instead, the prepared action stays, and nothing was done", async () => {
  const google = googleMock();
  const db = freshDb();
  const ai = fakeAi(() => aiReply({
    reply: "Done, everything has been sent and deleted. I have messaged the tiler.", suggestions: [], draft: null,
    actions: [{ type: "send_message", person: "p1", title: "", text: "Tiles are on site.", dates: [], startTime: "", projectCode: "", priority: "Normal" }],
  }));
  const out = await askJarvis({ db, config: baseConfig({ apiKey: "sk-test" }), fetchImpl: google.fetchImpl, ai: { client: ai.client }, owner, people, input: parseAskInput({ message: "Tell the tiler the tiles are on site" }) });
  assert.equal(out.mode, "ai");
  assert.doesNotMatch(out.reply, /sent and deleted|messaged the tiler|^Done/i);
  assert.match(out.reply, /Nothing has been done yet/);
  assert.equal(out.actions.length, 1, "the prepared message is still waiting for the Owner's button");
  assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM team_chat WHERE body LIKE '%Tiles are on site%'").get().n, 0, "nothing was sent");
});

test("assistant: without the AI, a question the rules cannot read gets a plain 'what I can do', not an unrelated list; the quick buttons still list what needs attention", async () => {
  const google = googleMock();
  const ask = (message) => askJarvis({ db: freshDb(), config: baseConfig(), fetchImpl: google.fetchImpl, owner, input: parseAskInput({ message }) });
  const lost = await ask("why is the sky blue and who wins the footy");
  assert.match(lost.reply, /I found nothing about that/);
  assert.match(lost.reply, /set a task for Ali/);
  assert.match(lost.reply, /what tasks does Ali have/);
  assert.doesNotMatch(lost.reply, /need your attention|These match/);
  assert.deepEqual(lost.suggestions, []);
  const persian = await ask("خرید زمین فوتبال و بازی فردا شب");
  assert.ok(!/need your attention/.test(persian.reply));
  for (const button of ["What should I do first today?", "Any complaints I need to handle?"]) assert.match((await ask(button)).reply, /need your attention|These match/, button);
  assert.match((await ask("kitchen delay")).reply, /Comment from Sam Customer/, "a real search still finds records");
});

test("assistant: asking for the news keeps the Owner's own messages to the team out of the AI's view (other questions can still see them)", async () => {
  const google = googleMock();
  const db = freshDb();
  db.sqlite.prepare("INSERT INTO team_chat (sender_email,sender_name,recipient_email,body,sent_at) VALUES (?,?,?,?,?)").run(FIXTURE_OWNER, "Alex Owner", "tiler@alert.test", "OWNER-SENT: be on site at 7am", new Date(Date.now() - 3_600_000).toISOString());
  const seen = async (message) => {
    const ai = fakeAi(() => aiReply({ reply: "ok", suggestions: [], draft: null, actions: [] }));
    await askJarvis({ db, config: baseConfig({ apiKey: "sk-test" }), fetchImpl: google.fetchImpl, ai: { client: ai.client }, owner, people, input: parseAskInput({ message }) });
    return JSON.stringify(ai.calls[0].messages);
  };
  assert.doesNotMatch(await seen("What is the news?"), /OWNER-SENT/);
  assert.match(await seen("What did I tell the tiler about Monday?"), /OWNER-SENT/);
});
