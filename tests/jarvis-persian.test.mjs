// Jarvis's basic mode (no AI connected) answers in Persian when the Owner writes Persian, and keeps records exactly as they were written.
import assert from "node:assert/strict";
import test from "node:test";
import { baseConfig, createTables, googleMock, seed } from "./helpers/jarvis-fixtures.mjs";
import { TestD1 } from "./helpers/test-d1.mjs";
import { askJarvis, newsText, parseAskInput, plansText } from "../jarvis/assistant.mjs";
import { FA, hasPersianLetters, isolate, persianWhen, wantsPersian } from "../jarvis/persian.mjs";

const owner = { email: "owner@alert.test", name: "Alex Owner" };
const FSI = "⁨";
const PDI = "⁩";

function freshDb() {
  const d1 = new TestD1();
  createTables(d1);
  seed(d1);
  return d1;
}
const ask = (message) => askJarvis({ db: freshDb(), config: baseConfig(), fetchImpl: googleMock().fetchImpl, owner, input: parseAskInput({ message }) });

test("persian: the language check reads Persian letters and a few Latin-letter words, and nothing else", () => {
  for (const text of ["اخبار چیه؟", "برنامه فردا", "what is the news و برنامه", "khabar chie", "barname ye farda"]) assert.ok(wantsPersian(text), text);
  for (const text of ["What's the news?", "any updates", "schedule for tomorrow", "", null, undefined]) assert.ok(!wantsPersian(text), String(text));
  assert.ok(hasPersianLetters("سلام") && !hasPersianLetters("salam"));
});

test("persian: isolate wraps text so it cannot reorder the sentence around it, and ignores empty text", () => {
  assert.equal(isolate("Kitchen delay"), `${FSI}Kitchen delay${PDI}`);
  assert.equal(isolate("  "), "");
  assert.equal(isolate(null), "");
});

test("persian: the news question in Persian gets a Persian answer with the records untouched", async () => {
  const out = await ask("اخبار چیه؟");
  assert.equal(out.mode, "rules");
  assert.ok(out.reply.includes(FA.basicLead.trim()));
  assert.ok(out.reply.includes(FA.newsHeader));
  assert.ok(!/Here is what has happened|Basic mode/.test(out.reply), "no English sentences from Jarvis");
  // The real records appear exactly as written, each one isolated.
  assert.ok(out.reply.includes(`${FSI}Roof leak${PDI}`), "a seeded record title is shown, isolated");
  assert.match(out.reply, /⁨[^⁩]+⁩/);
  assert.ok(/[؀-ۿ]/.test(out.reply.split("\n")[0]));
});

test("persian: Latin-letter Persian (Finglish) also gets a Persian answer", async () => {
  const out = await ask("khabar chie?");
  assert.ok(out.reply.includes(FA.newsHeader));
});

test("persian: plans and the 'what needs me' fallback are Persian too, and English stays English", async () => {
  const plans = await ask("برنامه‌های پیش رو چیه؟");
  assert.ok(plans.reply.includes(FA.plansHeader) || plans.reply.includes(FA.plansNone(7)) || /برنامه‌ای ثبت نشده/.test(plans.reply), plans.reply);
  const search = await ask("کابینت تاخیر");
  assert.ok(/[؀-ۿ]/.test(search.reply));
  assert.ok(!/These match|These need your attention|I found nothing/.test(search.reply));
  const english = await ask("What's the news?");
  assert.match(english.reply, /Here is what has happened, newest first:/);
  assert.ok(!/[؀-ۿ]/.test(english.reply), "an English question never gets Persian back");
});

test("persian: the text helpers produce Persian headings and Persian dates", () => {
  const item = { source: "team_messages", kind: "team_message", at: new Date().toISOString(), title: "Tiles arrive Thursday", who: "Ali Worker", preview: "تایل‌ها پنجشنبه می‌رسد" };
  const news = newsText([item], { persian: true });
  assert.ok(news.startsWith(`${FA.areas.team_messages}:`));
  assert.ok(news.includes(`${FSI}Tiles arrive Thursday${PDI}`));
  assert.ok(news.includes("\nتایل‌ها پنجشنبه می‌رسد"), "the preview is on its own line so it picks its own direction");
  assert.ok(!/Team messages/.test(news));
  assert.match(plansText([{ title: "Council inspection", who: "Sue", project: "ATP-2026-00124" }], 5, { persian: true }), /•\s⁨Council inspection⁩ — ⁨Sue⁩ \[ATP-2026-00124\]/);
  assert.match(persianWhen("2026-10-21T07:09:00Z"), /[؀-ۿ]/);
  assert.equal(persianWhen("not a date"), "not a date");
  // English output is unchanged
  assert.ok(newsText([item]).startsWith("Team messages:"));
});
