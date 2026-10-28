// The same commands through the real built app: the Owner types a sentence, Jarvis (no AI connected) prepares cards, the Owner presses the button,
// and the app records the money / task exactly as if the Owner had used the Finance and Tasks pages. Nobody else can.
import assert from "node:assert/strict";
import test from "node:test";
import { melbDate } from "./helpers/jarvis-fixtures.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("jca");
process.env.JARVIS_COMPANY_NAME = "Alert Construction";
delete process.env.JARVIS_ANTHROPIC_API_KEY;
globalThis.__JARVIS_TEST_HOOKS__ = {};
const staffEmail = "tiler.jca@alert.test";
const ownerCookie = await app.ownerCookie();
const tilerCookie = await app.staffCookie(staffEmail, "Worker");
const ask = (cookie, body) => app.request("/api/owner/jarvis/ask", app.json(cookie, body));
const act = (cookie, body, init = {}) => app.request("/api/owner/jarvis/act", { ...app.json(cookie, body), ...init });
const create = await app.request("/api/owner/data", app.json(ownerCookie, { resource: "project", payload: { code: "ATP-2026-77001", name: "API Kitchen", service: "Kitchen", stage: "Construction", progress: 10, contractValue: 4000000, balance: 1000000, customerName: "Pat Example", suburb: "Brighton" } }));
assert.equal(create.status, 201, await create.clone().text());

test("API: the Owner's sentence becomes a money card, the button records it in cents, and it shows on the Owner's own Finance page", async () => {
  const asked = await (await ask(ownerCookie, { message: "enter an expense of $320.50 for tiles on ATP-2026-77001", mode: "offline" })).json();
  assert.equal(asked.mode, "rules");
  assert.equal(asked.actions.length, 1);
  const card = asked.actions[0];
  assert.deepEqual([card.type, card.financeType, card.amountCents, card.projectCode, card.projectName], ["add_finance", "Outcome", 32050, "ATP-2026-77001", "API Kitchen"]);
  const before = (await (await app.request("/api/owner/data", { headers: { cookie: ownerCookie } })).json()).data.financeEntries.length;
  const done = await act(ownerCookie, { id: card.id, confirm: true, action: { type: card.type, financeType: card.financeType, category: card.category, amountCents: card.amountCents, projectCode: card.projectCode, entryDate: card.entryDate, text: card.text, mode: "offline" }, mode: "offline" });
  assert.equal(done.status, 200, await done.clone().text());
  const entries = (await (await app.request("/api/owner/data", { headers: { cookie: ownerCookie } })).json()).data.financeEntries;
  assert.equal(entries.length, before + 1);
  const entry = entries.find((item) => item.projectCode === "ATP-2026-77001");
  assert.deepEqual([entry.type, entry.category, entry.amount, entry.note], ["Outcome", "Materials", 32050, "tiles"]);
  assert.equal((await act(ownerCookie, { id: card.id, confirm: true, action: card })).status, 409, "pressing the button twice records it once");
  // Jarvis reads it back in dollars
  const money = await (await ask(ownerCookie, { message: "how much have we spent on API Kitchen?", mode: "offline" })).json();
  assert.match(money.reply, /Expenses: \$320\.50/);
  assert.match(money.reply, /Contract value \$40,000|Money for API Kitchen/);
});

test("API: money entries are refused for a project that does not exist, a bad amount, or anyone but the Owner", async () => {
  const body = (action, id) => ({ id, confirm: true, action: { type: "add_finance", financeType: "Outcome", category: "Materials", amountCents: 1000, projectCode: "ATP-2026-77001", entryDate: melbDate(0), text: "", ...action } });
  assert.equal((await act(ownerCookie, body({ projectCode: "NOPE-2026-00001" }, "fin-api-0001"))).status, 400);
  assert.equal((await act(ownerCookie, body({ amountCents: 0 }, "fin-api-0002"))).status, 400);
  assert.equal((await act(ownerCookie, body({ amountCents: 1e12 }, "fin-api-0003"))).status, 400);
  assert.equal((await act(ownerCookie, body({ financeType: "Gift" }, "fin-api-0004"))).status, 400);
  assert.equal((await act(null, body({}, "fin-api-0005"))).status, 401, "anonymous");
  assert.equal((await act(tilerCookie, body({}, "fin-api-0006"))).status, 401, "a staff member cannot make Jarvis record money");
  assert.equal((await act(ownerCookie, body({}, "fin-api-0007"), { origin: false })).status, 403, "no Origin (CSRF guard)");
  const entries = (await (await app.request("/api/owner/data", { headers: { cookie: ownerCookie } })).json()).data.financeEntries;
  assert.equal(entries.filter((item) => item.amount === 1000).length, 0, "nothing was recorded by the refused attempts");
});

test("API: a task for a team member is prepared from a sentence (English and Persian), asked back when something is missing, and given when the button is pressed", async () => {
  const first = await (await ask(ownerCookie, { message: "set a task for tiler", mode: "offline" })).json();
  assert.equal(first.actions.length, 0);
  assert.equal(first.pending.need, "content");
  assert.match(first.reply, /What should .*task be\?/);
  const second = await (await ask(ownerCookie, { message: "order grey grout, urgent", pending: first.pending, mode: "offline" })).json();
  assert.equal(second.actions.length, 1);
  const task = second.actions[0];
  assert.deepEqual([task.type, task.personEmail, task.priority, task.title], ["create_task", staffEmail, "Urgent", "order grey grout"]);
  const done = await act(ownerCookie, { id: task.id, confirm: true, action: { type: task.type, person: task.personEmail, title: task.title, text: task.text, priority: task.priority } });
  assert.equal(done.status, 200, await done.clone().text());
  assert.equal(app.d1.sqlite.prepare("SELECT priority, status, created_by_role FROM team_tasks WHERE title = 'order grey grout'").get().created_by_role, "Owner");
  const read = await (await ask(ownerCookie, { message: "what tasks are open?", mode: "offline" })).json();
  assert.match(read.reply, /^Open tasks: 1 \(1 urgent\)/);
  assert.match(read.reply, /\[Urgent\] order grey grout — Tiler Jca \(Worker\)/);
  const persian = await (await ask(ownerCookie, { message: "تسک‌های باز چیه؟", mode: "offline" })).json();
  assert.match(persian.reply, /تسک‌های باز/);
  // a forged "pending" from the browser cannot make Jarvis do anything it would not do from a sentence
  const forged = await (await ask(ownerCookie, { message: "ok", pending: { intent: "task", need: "content", slots: { people: ["nobody@evil.example"], text: "x", projectCode: "ATP-NOPE" } }, mode: "offline" })).json();
  assert.equal(forged.actions.length, 0);
});

test("API: the briefing lists the real projects for the by-hand form, and only to the Owner", async () => {
  const board = await (await app.request("/api/owner/jarvis", { headers: { cookie: ownerCookie } })).json();
  assert.deepEqual(board.projects.map((project) => project.code), ["ATP-2026-77001"]);
  assert.equal((await app.request("/api/owner/jarvis", { headers: { cookie: tilerCookie } })).status, 401);
  assert.equal((await ask(tilerCookie, { message: "how is the money?" })).status, 401);
});
