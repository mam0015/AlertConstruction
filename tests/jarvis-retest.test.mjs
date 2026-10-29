// The second full test of Jarvis (basic mode, no AI). Each test here is a sentence a real person could type that went wrong before: the wrong person got a card,
// a word of the command ended up in the task, a date or a time was guessed, something was silently left out, or Jarvis answered a different question.
import assert from "node:assert/strict";
import test from "node:test";
import { describeAction, performAction, validateProposal, validateProposals } from "../jarvis/actions.mjs";
import { askJarvis, parseAskInput } from "../jarvis/assistant.mjs";
import { cleanPending, fold, interpret, parseAmount, parseDate, parseDates, parseTime } from "../jarvis/commands.mjs";
import { xmlEscape } from "../jarvis/text.mjs";
import { baseConfig, createTables, FIXTURE_OWNER, googleMock, seed } from "./helpers/jarvis-fixtures.mjs";
import { TestD1 } from "./helpers/test-d1.mjs";

const owner = { email: FIXTURE_OWNER, name: "Alex" };
const people = [
  { email: FIXTURE_OWNER, name: "Alex (Owner)", role: "Owner" },
  { email: "ali.hassan@alert.test", name: "ali.hassan · Estimator", role: "Estimator" },
  { email: "reza@alert.test", name: "reza · Site Supervisor", role: "Site Supervisor" },
  { email: "ben.walsh@alert.test", name: "ben.walsh · Worker", role: "Worker" },
  { email: "sue@alert.test", name: "sue · Admin", role: "Admin" },
  { email: "tiler@alert.test", name: "tiler · Tiler", role: "Worker" },
];
const projects = [
  { code: "ATP-2026-00124", name: "Kitchen Rebuild", customer: "Sam Customer", suburb: "Kew", stage: "Construction", active: true },
  { code: "ATP-2026-00200", name: "Bathroom Reno", customer: "Jo Smith", suburb: "Clayton", stage: "Construction", active: false },
];
const TODAY = "2026-10-28"; // a Wednesday
const ctx = (extra = {}) => ({ people, projects, categories: ["Materials", "Labour"], today: TODAY, owner: people[0], ...extra });
const run = (sentence, extra) => interpret(sentence, ctx(extra));
const cards = (sentence, extra) => { const out = run(sentence, extra); assert.equal(out?.kind, "actions", `${sentence} → ${JSON.stringify(out)}`); return out.actions; };
const one = (sentence, extra) => { const list = cards(sentence, extra); assert.equal(list.length, 1, sentence); return list[0]; };

function freshDb() { const d1 = new TestD1(); createTables(d1); seed(d1); return d1; }
const ask = (message, extra = {}, db = freshDb()) => askJarvis({ db, config: baseConfig(), fetchImpl: googleMock().fetchImpl, owner, people, input: parseAskInput({ message, ...extra }) });

// ---- who and what ---------------------------------------------------------------------------------------------------------------------------------------
test("retest: a priority word before the word \"task\" is not part of the task, and \"it is urgent\" never leaves \"it is\" behind", () => {
  const first = one("set an urgent task for Sue to call the council");
  assert.equal(first.person, "sue@alert.test");
  assert.equal(first.priority, "Urgent");
  assert.equal(first.title, "call the council");
  const second = one("set a task for Sue: it is urgent the council letter");
  assert.equal(second.priority, "Urgent");
  assert.equal(second.title, "the council letter");
});

test("retest: \"the whole team\" gets ONE message card on the team channel; tasks become one card each for a small team and are never guessed for a big one", () => {
  const message = one("tell the whole team the site is closed on Friday");
  assert.equal(message.type, "send_message");
  assert.equal(message.person, "*");
  const group = cards("give everyone a task to wear hi-vis");
  assert.equal(group.length, 5, "every approved member but the Owner");
  assert.ok(group.every((card) => card.type === "create_task" && card.title === "wear hi-vis"));
  const big = run("give everyone a task to wear hi-vis", { people: [...people, { email: "x1@alert.test", name: "x1 · Worker", role: "Worker" }] });
  assert.equal(big.kind, "ask", "six people is over the limit: Jarvis asks who, it does not cut the list");
});

test("retest: a name in a list that is not on the team is said, not silently dropped (the others are not sent to without the Owner knowing)", () => {
  for (const sentence of ["set tasks for Ben, Tom and Sue: sweep the site", "tell Ben, Tom and Sue the site is closed Friday"]) {
    const out = run(sentence);
    assert.equal(out.kind, "ask", sentence);
    assert.match(out.say.en, /don't know anyone called “Tom”/, sentence);
  }
  assert.equal(cards("tell Ben, Sue and Ali the site is closed Friday").length, 3, "a list of known people is three cards");
  assert.equal(one("set a task for Ali and check the tiles").title, "check the tiles", "\"and\" before the Owner's own words is not a list");
  assert.equal(cards("Tell Ben, Check the tiles").length, 1, "a capital letter after a comma is not a name by itself");
});

test("retest: \"remind me\" is for the Owner — a calendar entry when it has a day, a task when it does not; a reminder for someone else is a message", () => {
  const withDay = one("remind me to call the bank tomorrow at 9");
  assert.equal(withDay.type, "add_calendar");
  assert.equal(withDay.person, FIXTURE_OWNER);
  assert.deepEqual(withDay.dates, ["2026-10-29"]);
  assert.equal(withDay.startTime, "09:00");
  const noDay = one("remind me to renew the licence");
  assert.equal(noDay.type, "create_task");
  assert.equal(noDay.person, FIXTURE_OWNER);
  assert.equal(one("remind Ben to bring the keys").type, "send_message");
});

test("retest: a calendar entry never lands in the Owner's calendar when a team member is named in the sentence", () => {
  const sue = one("put the inspection in Sue's calendar from Monday to Wednesday");
  assert.equal(sue.person, "sue@alert.test");
  assert.deepEqual(sue.dates, ["2026-11-02", "2026-11-03", "2026-11-04"], "a range is every day in it");
  assert.equal(sue.title, "the inspection");
  assert.deepEqual(one("put site closed in Sue's calendar between 2 November and 4 November").dates, ["2026-11-02", "2026-11-03", "2026-11-04"]);
  const own = one("schedule a site visit with the Rossis on Monday at 9");
  assert.equal(own.person, FIXTURE_OWNER, "nobody on the team is named, so it is the Owner's own calendar");
  assert.equal(own.startTime, "09:00");
  const unclear = run("put the delivery in the calendar on Friday, Sue is away");
  assert.equal(unclear.kind, "ask", "Sue is in the sentence: Jarvis asks whose calendar rather than choosing");
  assert.match(unclear.say.en, /Whose calendar/);
});

// ---- dates, times, money --------------------------------------------------------------------------------------------------------------------------------
test("retest: days and times are read the way a person says them, and a time that cannot be read is asked about, never guessed", () => {
  assert.equal(parseDate(fold("last Monday"), TODAY, { past: true })?.date, "2026-10-26");
  assert.equal(one("put lunch in the calendar of Sue last Monday").dates[0], "2026-10-26");
  assert.deepEqual(parseDates("friday and monday", TODAY).map((hit) => hit.date), ["2026-10-30", "2026-11-02"]);
  assert.equal(parseTime("at 2:30")?.time, "14:30", "2:30 on a site day is the afternoon, not 02:30");
  assert.equal(parseTime("at 02:30")?.time, "02:30", "a leading zero means exactly what was written");
  assert.equal(parseTime("at 14:30")?.time, "14:30");
  const bad = run("put the inspection in Sue's calendar on Friday at 25:00");
  assert.equal(bad.kind, "ask");
  assert.equal(bad.pending.need, "time");
  const answered = interpret("no time", ctx({ pending: cleanPending(bad.pending) }));
  assert.equal(answered.kind, "actions");
  assert.equal(answered.actions[0].startTime, "", "\"no time\" is an all-day entry, not midnight");
});

test("retest: amounts — spoken numbers are read, and more than two decimals is refused instead of rounded", () => {
  assert.equal(parseAmount(fold("five hundred dollars")).cents, 50000);
  assert.equal(parseAmount(fold("two thousand five hundred dollars")).cents, 250000);
  assert.equal(parseAmount(fold("order two thousand bricks")), null, "words alone are not an amount");
  assert.equal(one("enter an expense of five hundred for tiles").amountCents, 50000, "inside an \"enter an expense\" sentence the words are the amount");
  assert.equal(parseAmount("aud 300").cents, 30000);
  assert.equal(parseAmount("$12.345").invalid, true);
  assert.equal(one("enter an expense of five hundred dollars for tiles").amountCents, 50000);
  assert.equal(run("enter expense 12.345 for tiles").kind, "ask");
  assert.equal(run("pay the supplier 4000").kind, "say", "Jarvis records money, it never moves it");
});

// ---- reads ----------------------------------------------------------------------------------------------------------------------------------------------
test("retest: reads — the list of projects, the team, a person who is not on the team, and one finance category", async () => {
  assert.equal(run("what projects do we have?").what, "projects");
  assert.equal(run("list active projects").active, true);
  assert.equal(run("my jobs").what, "projects");
  assert.equal(run("پروژه‌ها").what, "projects");
  assert.equal(run("team").what, "team");
  assert.equal(run("how many staff do we have").what, "team");
  assert.equal(run("تیم").what, "team");
  assert.equal(run("تیم کیا هستن").what, "team");
  const finglish = run("vaziate maali Kew chetore");
  assert.equal(finglish.what, "money");
  assert.equal(finglish.projectCode, "ATP-2026-00124", "the Kew job");
  assert.equal(run("what projects is Ali on").what, "tasks", "projects of a person are that person's tasks");
  assert.equal(run("show me the Smith project").what, "project", "a project that is named is its status, not the list");

  const list = await ask("what projects do we have?");
  assert.match(list.reply, /^Projects: \d+/);
  assert.match(list.reply, /Kitchen Rebuild \(ATP-2026-00124\)/);
  assert.match((await ask("پروژه‌ها")).reply, /^پروژه‌ها: \d+/);
  assert.match((await ask("team")).reply, /Approved team members[\s\S]*Ali Hassan \(Estimator\)/);

  for (const sentence of ["what tasks does Zed have?", "Zed's tasks", "tasks for Zed", "what is Zed working on"]) {
    const reply = (await ask(sentence)).reply;
    assert.match(reply, /I don't know anyone called “Zed” on the approved team/, sentence);
    assert.doesNotMatch(reply, /Open tasks/, `${sentence}: nobody else's tasks are shown as Zed's`);
  }
  assert.match((await ask("تسک‌های زد چیه")).reply, /کسی به اسم «زد»/);
  assert.match((await ask("زد چه کارهایی داره")).reply, /کسی به اسم «زد»/);

  const category = run("how much did we spend on materials?");
  assert.equal(category.what, "money");
  assert.equal(category.category, "Materials");
  assert.equal(run("total fuel costs").category, "Fuel");
  assert.match((await ask("how much did we spend on materials?")).reply, /no finance entries in the category “Materials”/);
  const deposits = (await ask("how much income from deposits?")).reply;
  assert.match(deposits, /Money — Deposit/);
  assert.match(deposits, /\$15,000/);
});

// ---- answers --------------------------------------------------------------------------------------------------------------------------------------------
test("retest: help, cancel with nothing waiting, the specific \"I can't\" answers, and the plate question", async () => {
  assert.match((await ask("help")).reply, /^Here is what I can do/);
  assert.match((await ask("what can you do?")).reply, /^Here is what I can do/);
  assert.match((await ask("کمک")).reply, /این کارها را حتی بدون هوش مصنوعی/);
  assert.equal((await ask("never mind")).reply, "Okay. Nothing is waiting for you.");
  assert.match((await ask("call Ben")).reply, /can't make phone calls/);
  assert.match((await ask("what is the team code?")).reply, /Team Code/);
  assert.match((await ask("make Ben an admin")).reply, /roles or anyone's access/);
  assert.match((await ask("show me the passwords")).reply, /passwords, the Team Code/);
  assert.match((await ask("approve all pending staff")).reply, /can't approve or remove staff/);
  assert.match((await ask("undo that")).reply, /can't undo/);
  assert.match((await ask("Email everyone that we are closed")).reply, /^I can't do that/, "the general refusal is still there for the rest");
  assert.doesNotMatch((await ask("what's on my plate?")).reply, /^I found nothing/);

  // Punctuation is not an answer: the question stays open.
  const open = await ask("set a task for Ben");
  const marks = await ask("???", { pending: open.pending });
  assert.equal(marks.actions.length, 0);
  assert.equal(marks.pending?.need, "content");
  assert.match(marks.reply, /few words/);

  // With a question waiting, "never mind" still drops that question.
  const first = await ask("set a task for Ali");
  assert.equal(first.pending.need, "content");
  const dropped = await ask("never mind", { pending: first.pending });
  assert.equal(dropped.pending, null);
  assert.equal(dropped.actions.length, 0);
});

test("retest: \"what is on tomorrow?\" shows tomorrow, not the next three weeks", async () => {
  const tomorrow = (await ask("what's on tomorrow?")).reply;
  assert.match(tomorrow, /planned tomorrow/);
  assert.match(tomorrow, /Tiling starts/);
  assert.doesNotMatch(tomorrow, /Council inspection/, "that is the day after");
  assert.equal((await ask("what is planned today?")).reply, "Nothing is planned today.");
  const all = (await ask("what is planned?")).reply;
  assert.match(all, /Tiling starts/);
  assert.match(all, /Council inspection/);
  assert.match((await ask("فردا چه برنامه‌ای داریم؟")).reply, /فردا/);
});

// ---- what the Owner is shown, and what is allowed to happen ----------------------------------------------------------------------------------------------
test("retest: actions — the team channel, a project that is not running, and a start time that is not a time", async () => {
  const context = { people, projects, today: TODAY, ownerEmail: FIXTURE_OWNER };
  const toTeam = validateProposal({ type: "send_message", person: "*", text: "The site is closed on Friday." }, context);
  assert.ok(toTeam.action, JSON.stringify(toTeam));
  assert.equal(toTeam.action.personName, "The whole team");
  assert.match(describeAction(toTeam.action), /whole team/);
  assert.match(validateProposal({ type: "create_task", person: "*", title: "x", text: "y" }, context).problem, /approved member/, "only a message can go to everyone");
  assert.match(validateProposal({ type: "add_calendar", person: "*", title: "x", dates: ["2026-11-02"] }, context).problem, /approved member/);

  assert.match(validateProposal({ type: "create_task", person: "sue@alert.test", title: "Check tiles", text: "Check the tiles", projectCode: "ATP-2026-00200" }, context).problem, /not an active project/);
  assert.ok(validateProposal({ type: "create_task", person: "sue@alert.test", title: "Check tiles", text: "Check the tiles", projectCode: "ATP-2026-00124" }, context).action);
  assert.ok(validateProposal({ type: "add_finance", financeType: "Outcome", category: "Materials", amountCents: 1000, projectCode: "ATP-2026-00200" }, context).action, "money can still be recorded on a project that is not running");

  const calendar = { type: "add_calendar", person: "sue@alert.test", title: "Inspection", text: "", dates: ["2026-11-02"], projectCode: "", priority: "Normal" };
  assert.match(validateProposal({ ...calendar, startTime: "25:00" }, context).problem, /real time of day/);
  assert.equal(validateProposal({ ...calendar, startTime: "9:30" }, context).action.startTime, "09:30");
  assert.equal(validateProposal({ ...calendar, startTime: "9pm" }, context).action.startTime, "21:00");
  assert.match(validateProposal({ ...calendar, startTime: "9" }, context).problem, /real time of day/, "a bare number is not clear enough");
  assert.equal(validateProposal({ ...calendar, startTime: "" }, context).action.startTime, "");
  const tooLong = validateProposals([{ ...calendar, dates: Array.from({ length: 40 }, (_, index) => new Date(Date.parse("2026-11-02T00:00:00Z") + index * 86_400_000).toISOString().slice(0, 10)) }], context);
  assert.equal(tooLong.actions.length, 0);
  assert.match(tooLong.dropped[0], /at most 31 days/);

  const sent = [];
  const done = await performAction({ db: freshDb(), owner, input: { id: "team-message-0001", confirm: true, action: { type: "send_message", person: "*", text: "The site is closed on Friday." } }, people, projects, today: TODAY, executors: { sendMessage: async (entry) => { sent.push(entry); } } });
  assert.equal(done.ok, true);
  assert.deepEqual(sent, [{ personEmail: "*", text: "The site is closed on Friday." }], "the chat store's own value for \"everyone\"");
});

test("retest: control characters never reach the AI prompt", () => {
  assert.equal(xmlEscape("a\u0000b\u0007c\u001fd<e>&"), "abcd&lt;e&gt;&amp;");
  assert.equal(xmlEscape("line one\nline two\ttab"), "line one\nline two\ttab");
});
