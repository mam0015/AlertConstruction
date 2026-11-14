// The Owner/Admin open projects for customers who did not use the website form, set stages freely, decide what the customer sees (status
// and dated notes), and every customer conversation stays complete and readable by Owner, Admin and Manager (November 2026 request).
import assert from "node:assert/strict";
import test from "node:test";
import { TestD1 } from "./helpers/test-d1.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";
import { asScreen, openedProject } from "./helpers/screen.mjs";

const app = await startWorker("team");
const { request, json } = app;
const owner = await app.ownerCookie();
const admin = await app.staffCookie("admin.team@alert.test", "Admin");
const manager = await app.staffCookie("manager.team@alert.test", "Manager");
const supervisor = await app.staffCookie("super.team@alert.test", "Site Supervisor");
const worker = await app.staffCookie("worker.team@alert.test", "Electrician");
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

const create = (cookie, payload) => request("/api/workflow/cases", json(cookie, payload));
const act = (cookie, caseId, action, payload = {}) => request("/api/workflow", json(cookie, { action, caseId, payload: asScreen(app.d1.sqlite, caseId, action, payload) }));
const board = async (cookie) => (await (await request("/api/workflow", { headers: { cookie } })).json()).data;
const portal = async (code) => (await (await request(`/api/workflow/public?code=${encodeURIComponent(code)}`, { headers: { "cf-connecting-ip": "198.18.40.1" } })).json()).data;
const customerSays = (code, body, ip = "198.18.40.2") => request("/api/workflow/public/messages", { ...json(null, { code, body }), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": ip } });
const melbourneDay = (offset = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offset * 86_400_000));

const project = { name: "Sam Customer", service: "Bathroom renovation", location: "12 Smith Street, Glen Waverley", description: "Customer called the office; job agreed on site.", email: "sam@customer.test", phone: "0400 123 456" };

test("the Owner opens a project for a customer who called: private code, project number, stage, and the customer portal works", async () => {
  const response = await create(owner, { ...project, entry: "underway", statusLabel: "Waiting for planner" });
  assert.equal(response.status, 201, await response.clone().text());
  const { created, snapshot } = (await response.json()).data;
  assert.match(created.requestCode, /^REQ-\d{4}-[A-F0-9]{32}$/, "the customer code is as private as a website request's");
  assert.match(created.projectCode, /^ATP-\d{4}-\d{5}$/);
  const item = snapshot.cases.find((entry) => entry.id === created.caseId);
  assert.equal(item.stage, "active_project");
  assert.equal(item.view.origin, "team");
  assert.equal(item.view.statusLabel, "Waiting for planner");
  assert.ok(snapshot.stageOptions.includes("Waiting for planner") && snapshot.stageOptions.includes("Delayed"));
  const portfolio = app.d1.sqlite.prepare("SELECT stage, progress, customer_name AS customerName FROM projects WHERE code=?").get(created.projectCode);
  assert.deepEqual({ ...portfolio }, { stage: "Waiting for planner", progress: 5, customerName: "Sam Customer" }, "the portfolio shows the same project");
  const customer = await portal(created.requestCode);
  assert.equal(customer.service, "Bathroom renovation");
  assert.ok(customer.activity.some((line) => line.title === "Your project has been opened"));
  assert.equal(customer.customerStatus, null, "nothing is shown to the customer until the Owner or Admin decides");
  const found = await request("/api/workflow/public/access", { ...json(null, { method: "email", contact: "sam@customer.test", location: "Glen Waverley" }), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": "198.18.40.3" } });
  assert.equal(found.status, 200, "the customer can also find it by e-mail and suburb");
  assert.ok((await found.json()).projects.some((entry) => entry.requestCode === created.requestCode));
});

test("every starting point works, contact details are optional, and the Admin can open projects too", async () => {
  const fresh = await create(admin, { name: "No Contact", service: "Deck", location: "Rowville", entry: "new" });
  assert.equal(fresh.status, 201, await fresh.clone().text());
  const { created } = (await fresh.json()).data;
  assert.equal(created.projectCode, "", "a new enquiry gets its project number when Admin approves intake, as before");
  const approved = await act(admin, created.caseId, "approve_intake");
  assert.equal(approved.status, 200, await approved.clone().text());
  assert.match((await board(admin)).cases.find((entry) => entry.id === created.caseId).projectCode, /^ATP-/);
  const visit = await create(owner, { name: "Visit Ready", service: "Extension", location: "Wantirna", entry: "site_visit" });
  const visitCase = (await visit.json()).data.created;
  assert.equal((await board(owner)).cases.find((entry) => entry.id === visitCase.caseId).stage, "site_visit_ready");
});

test("project creation is refused for every other role and checks its input", async () => {
  for (const [cookie, label] of [[manager, "Manager"], [supervisor, "Site Supervisor"], [worker, "Worker"], [null, "anonymous"]]) {
    assert.equal((await create(cookie, { ...project, entry: "new" })).status, 401, label);
  }
  assert.equal((await request("/api/workflow/cases", { ...json(owner, { ...project, entry: "new" }), headers: { "content-type": "application/json", cookie: owner, origin: "https://evil.example" } })).status, 403, "cross-site");
  for (const [payload, message] of [
    [{ ...project, entry: "new", name: "" }, /Customer name is required/],
    [{ ...project, entry: "new", email: "not-an-email" }, /valid email/],
    [{ ...project, entry: "launch" }, /where the project starts/],
    [{ ...project, entry: "new", statusLabel: "x".repeat(81) }, /Stage is too long/],
  ]) {
    const refused = await create(owner, payload);
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, message);
  }
});

test("Owner and Admin set any stage at any time, ready-made or their own words; the portfolio follows; nobody else can", async () => {
  const { created } = (await (await create(owner, { ...project, entry: "underway" })).json()).data;
  for (const [cookie, label] of [[owner, "Delayed — rain"], [admin, "Planner visiting tomorrow"], [owner, "Planning"]]) {
    const saved = await act(cookie, created.caseId, "set_status_label", { label });
    assert.equal(saved.status, 200, await saved.clone().text());
    assert.equal((await board(owner)).cases.find((entry) => entry.id === created.caseId).view.statusLabel, label);
    assert.equal(app.d1.sqlite.prepare("SELECT stage FROM projects WHERE code=?").get(created.projectCode).stage, label);
  }
  assert.ok((await board(admin)).stageOptions.includes("Delayed — rain"), "custom stages are offered again later");
  assert.equal((await board(supervisor)).stageOptions.length, 0);
  for (const cookie of [supervisor]) assert.equal((await act(cookie, created.caseId, "set_status_label", { label: "Done" })).status, 400);
  // The step-by-step workflow is not moved by a stage name.
  assert.equal((await board(owner)).cases.find((entry) => entry.id === created.caseId).stage, "active_project");
});

test("a stage typed on the portfolio row becomes the workflow stage of the same project", async () => {
  const { created } = (await (await create(owner, { ...project, entry: "site_visit" })).json()).data;
  const row = app.d1.sqlite.prepare("SELECT * FROM projects WHERE code=?").get(created.projectCode);
  const edited = await request("/api/owner/data", json(owner, { resource: "project", id: row.id, payload: { code: row.code, name: row.name, service: row.service, stage: "Permits & approvals", progress: 10, contractValue: 0, balance: 0, customerName: row.customer_name, suburb: row.suburb, startDate: "", notes: "", opened: openedProject(app.d1.sqlite, row.id) } }, "PATCH"));
  assert.equal(edited.status, 200, await edited.clone().text());
  assert.equal((await board(owner)).cases.find((entry) => entry.id === created.caseId).view.statusLabel, "Permits & approvals");
});

test("the customer sees a status only after the Owner or Admin confirms it, and it can be taken down again", async () => {
  const { created } = (await (await create(owner, { ...project, entry: "underway" })).json()).data;
  assert.equal((await act(admin, created.caseId, "save_customer_status", { title: "Planner visiting Thursday", detail: "The planner will check the drawings on site." })).status, 200);
  assert.equal((await portal(created.requestCode)).customerStatus, null, "a draft is not shown");
  const draft = (await board(owner)).cases.find((entry) => entry.id === created.caseId).view;
  assert.equal(draft.draft.title, "Planner visiting Thursday");
  assert.equal(draft.customerStatus, null);
  assert.equal((await board(supervisor)).cases.length >= 0, true);
  assert.equal((await act(owner, created.caseId, "show_customer_status", { title: draft.draft.title, detail: draft.draft.detail })).status, 200);
  const shown = await portal(created.requestCode);
  assert.equal(shown.customerStatus.title, "Planner visiting Thursday");
  assert.equal(shown.customerStatus.detail, "The planner will check the drawings on site.");
  assert.ok(shown.activity.some((line) => line.title === "Project status: Planner visiting Thursday"), "the customer's history keeps every status");
  assert.equal((await act(admin, created.caseId, "save_customer_status", { title: "Delayed by rain" })).status, 200);
  assert.equal((await portal(created.requestCode)).customerStatus.title, "Planner visiting Thursday", "a new draft does not replace what is shown until confirmed");
  assert.equal((await act(admin, created.caseId, "hide_customer_status")).status, 200);
  assert.equal((await portal(created.requestCode)).customerStatus, null);
  assert.equal((await act(supervisor, created.caseId, "show_customer_status", { title: "Delayed by rain", detail: "" })).status, 400, "only Owner and Admin decide");
  const noDraft = (await (await create(owner, { ...project, entry: "new" })).json()).data.created;
  const refused = await act(owner, noDraft.caseId, "show_customer_status");
  assert.equal(refused.status, 400);
  assert.match((await refused.json()).error, /Save the status/);
});

test("customer notes appear only between their dates, can be removed, and are never lost from the Owner/Admin history", async () => {
  const { created } = (await (await create(owner, { ...project, entry: "underway" })).json()).data;
  const add = (cookie, body, showFrom = "", showUntil = "") => act(cookie, created.caseId, "add_customer_note", { body, showFrom, showUntil });
  assert.equal((await add(owner, "Always visible note")).status, 200);
  assert.equal((await add(admin, "Visible this week", melbourneDay(-1), melbourneDay(6))).status, 200);
  assert.equal((await add(owner, "Starts next month", melbourneDay(30), melbourneDay(40))).status, 200);
  assert.equal((await add(owner, "Only today", melbourneDay(0), melbourneDay(0))).status, 200);
  for (const [from, until, message] of [[melbourneDay(-5), melbourneDay(-2), /already passed/], [melbourneDay(5), melbourneDay(1), /before the start/], ["2026-02-30", "", /not a real date/]]) {
    const refused = await add(owner, "Bad dates", from, until);
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).error, message);
  }
  const visible = (await portal(created.requestCode)).notes.map((note) => note.body).sort();
  assert.deepEqual(visible, ["Always visible note", "Only today", "Visible this week"]);
  const all = (await board(owner)).cases.find((entry) => entry.id === created.caseId).view.notes;
  assert.equal(all.length, 4, "Owner/Admin see every note, including scheduled ones");
  const weekNote = all.find((note) => note.body === "Visible this week");
  assert.equal((await act(admin, created.caseId, "remove_customer_note", { noteId: weekNote.id })).status, 200);
  assert.ok(!(await portal(created.requestCode)).notes.some((note) => note.body === "Visible this week"));
  const after = (await board(owner)).cases.find((entry) => entry.id === created.caseId).view.notes.find((note) => note.id === weekNote.id);
  assert.ok(after.removedAt, "a removed note stays in the history, marked as removed");
  assert.equal((await act(admin, created.caseId, "remove_customer_note", { noteId: weekNote.id })).status, 400, "removing twice says so");
  const supervisorView = (await board(supervisor)).cases.find((entry) => entry.id === created.caseId);
  if (supervisorView) assert.equal(supervisorView.view.notes.length, 0, "only Owner and Admin see the note history");
  // A future note becomes visible on its day (the portal follows Melbourne dates).
  const realNow = Date.now;
  Date.now = () => realNow() + 31 * 86_400_000;
  try {
    assert.ok((await portal(created.requestCode)).notes.some((note) => note.body === "Starts next month"));
  } finally {
    Date.now = realNow;
  }
});

test("customer and Owner/Admin chat both ways; the Manager reads every conversation; nothing disappears after signing out and back in", async () => {
  const { created } = (await (await create(owner, { ...project, entry: "underway" })).json()).data;
  assert.equal((await act(owner, created.caseId, "message_customer", { body: "Hello Sam, this is the Owner." })).status, 200);
  assert.equal((await customerSays(created.requestCode, "Hi! When does the planner come?")).status, 201);
  assert.equal((await act(admin, created.caseId, "message_customer", { body: "Thursday at 10." })).status, 200);
  const expected = ["Hello Sam, this is the Owner.", "Hi! When does the planner come?", "Thursday at 10."];
  assert.deepEqual((await portal(created.requestCode)).messages.map((message) => message.body), expected);
  const conversations = await request("/api/workflow/conversations", { headers: { cookie: manager } });
  assert.equal(conversations.status, 200);
  const list = (await conversations.json()).data;
  const thread = list.find((entry) => entry.projectCode === created.projectCode);
  assert.deepEqual(thread.messages.map((message) => message.body), expected, "the Manager reads the whole conversation");
  assert.ok(!JSON.stringify(list).includes(created.requestCode), "the customer's private code is never sent to the Manager");
  for (const [cookie, label] of [[worker, "Worker"], [supervisor, "Site Supervisor"], [null, "anonymous"]]) {
    assert.equal((await request("/api/workflow/conversations", { headers: cookie ? { cookie } : {} })).status, 401, label);
  }
  assert.equal((await act(manager, created.caseId, "message_customer", { body: "Manager here" })).status, 401, "the Manager reads but does not write");
  // Everyone signs out and comes back: the history is complete.
  assert.equal((await request("/api/owner/logout", { method: "POST", headers: { cookie: owner } })).status, 200);
  await tick();
  const back = await app.ownerCookie();
  const ownerThread = (await board(back)).cases.find((entry) => entry.id === created.caseId).messages.map((message) => message.body);
  assert.deepEqual(ownerThread, expected);
  assert.deepEqual((await portal(created.requestCode)).messages.map((message) => message.body), expected);
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM customer_messages WHERE case_id=?").get(created.caseId).n, 3);
});

test("a message that fails to save is reported as not sent and leaves nothing behind (no duplicates on retry)", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const breakEvents = () => {
    app.d1.prepare = (sql) => {
      const statement = TestD1.prototype.prepare.call(app.d1, sql);
      if (!/INSERT INTO workflow_events/.test(sql)) return statement;
      return { bind: () => ({ batchResult: () => { throw new Error("D1_ERROR: injected"); }, run: () => Promise.reject(new Error("D1_ERROR: injected")), first: () => Promise.reject(new Error("D1_ERROR: injected")), all: () => Promise.reject(new Error("D1_ERROR: injected")) }) };
    };
    return () => { delete app.d1.prepare; };
  };
  const count = () => app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM customer_messages WHERE case_id=?").get(created.caseId).n;
  let restore = breakEvents();
  let customer, team;
  try {
    customer = await customerSays(created.requestCode, "Retry me", "198.18.40.9");
    team = await act(back, created.caseId, "message_customer", { body: "Retry me too" });
  } finally { restore(); }
  assert.equal(customer.status, 400);
  assert.equal(team.status, 400);
  assert.equal(count(), 0, "nothing was saved");
  assert.equal((await customerSays(created.requestCode, "Retry me", "198.18.40.9")).status, 201);
  assert.equal((await act(back, created.caseId, "message_customer", { body: "Retry me too" })).status, 200);
  assert.equal(count(), 2, "each message exactly once");
});

test("a customer's refused messages do not use up their allowance, and a closed project keeps its history but takes no new messages", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  for (let attempt = 0; attempt < 45; attempt += 1) assert.equal((await customerSays(created.requestCode, "   ", "198.18.41.1")).status, 400);
  assert.equal((await customerSays(created.requestCode, "x".repeat(2001), "198.18.41.1")).status, 400);
  assert.equal((await customerSays(created.requestCode, "A real message after typos", "198.18.41.1")).status, 201, "typing mistakes never lock a customer out");
  assert.equal((await act(back, created.caseId, "close_case", { note: "Customer withdrew" })).status, 200);
  const closed = await customerSays(created.requestCode, "Are you there?", "198.18.41.1");
  assert.equal(closed.status, 400);
  assert.match((await closed.json()).error, /closed/);
  assert.deepEqual((await portal(created.requestCode)).messages.map((message) => message.body), ["A real message after typos"], "the history is still there");
});

test("screens: Owner/Admin get the new-project form, stage panel and customer link; customers see status and notes; chats refresh", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const board = await read("app/workflow/WorkflowBoard.tsx");
  assert.match(board, /management && !newProject && !accessOff && <button[\s\S]*?>\+ New project for a customer</);
  assert.match(board, /management && <CopyCustomerLink/);
  assert.match(board, /management && <StageAndCustomerPanel key=\{selected\.id\}/);
  assert.match(board, /if \(!sent\) return;/, "the Owner's message is only cleared after it was really sent");
  assert.match(board, /maxLength=\{2000\}/);
  assert.match(board, /setInterval\([\s\S]*?30_000\)/, "the board refreshes itself");
  const portal = await read("app/workflow/CustomerWorkflowPanel.tsx");
  assert.match(portal, /data\.customerStatus && <section[^>]*aria-label="Project status"/);
  assert.match(portal, /aria-label="Notes from our team"/);
  assert.match(portal, /data\.stage === "closed" \? <p>This request is closed/, "a closed project offers no send button that would fail");
  assert.match(portal, /data\.stage !== "complete" && <label/, "a completed project offers no upload that would fail");
  assert.match(portal, /setInterval\([\s\S]*?20_000\)/, "the customer's page refreshes itself");
  const manager = await read("app/manager/page.tsx");
  assert.match(manager, /<CustomerConversations \/>/);
});

// ---- Codex review 1 (November 2026) ----

test("staff other than Owner/Admin never receive a customer's private code (board, operations), so they cannot act as the customer", async () => {
  const back = await app.ownerCookie();
  const estimator = await app.staffCookie("estimator.team@alert.test", "Estimator");
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  assert.equal((await act(back, created.caseId, "reassign_supervisor", { supervisorEmail: "super.team@alert.test", supervisorName: "Super" })).status, 200);
  for (const [cookie, label] of [[supervisor, "Site Supervisor"], [estimator, "Estimator"]]) {
    const view = await board(cookie);
    assert.ok(view.cases.some((entry) => entry.id === created.caseId), `${label} sees the project`);
    assert.ok(!JSON.stringify(view).includes(created.requestCode), `${label} board has no private code`);
  }
  const operations = await request("/api/operations", { headers: { cookie: supervisor } });
  assert.equal(operations.status, 200);
  assert.ok(!(await operations.text()).includes(created.requestCode), "operations list has no private code");
  assert.ok(JSON.stringify(await board(back)).includes(created.requestCode), "the Owner still has it, to give to the customer");
});

test("Show to customer publishes only the exact draft the person confirmed; a draft changed meanwhile is not shown", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  assert.equal((await act(back, created.caseId, "save_customer_status", { title: "Draft A", detail: "A" })).status, 200);
  assert.equal((await act(admin, created.caseId, "save_customer_status", { title: "Draft B", detail: "B" })).status, 200);
  const conflict = await act(back, created.caseId, "show_customer_status", { title: "Draft A", detail: "A" }); // the Owner confirmed A
  assert.equal(conflict.status, 400);
  assert.match((await conflict.json()).error, /changed meanwhile/);
  assert.equal((await portal(created.requestCode)).customerStatus, null, "B, which nobody confirmed, is not shown");
  assert.equal((await act(back, created.caseId, "show_customer_status", { title: "Draft B", detail: "B" })).status, 200);
  assert.equal((await portal(created.requestCode)).customerStatus.title, "Draft B");
  const history = app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_events WHERE case_id=? AND event_type='show_customer_status'").get(created.caseId).n;
  assert.equal(history, 1, "the refused attempt left no history line");
});

test("pressing Create again after a lost answer returns the same project instead of making a second one", async () => {
  const back = await app.ownerCookie();
  const clientKey = "c0ffee00-1111-4222-8333-444455556666";
  const projectCount = () => app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_cases WHERE customer_name='Retry Customer'").get().n;
  // The project is saved but reading the fresh list fails: the answer still reports the created project.
  const realPrepare = app.d1.prepare;
  app.d1.prepare = (sql) => {
    if (/FROM workflow_estimates$/.test(sql.trim())) throw new Error("D1_ERROR: injected read failure");
    return TestD1.prototype.prepare.call(app.d1, sql);
  };
  let first;
  try { first = await create(back, { ...project, name: "Retry Customer", entry: "site_visit", clientKey }); } finally { app.d1.prepare = realPrepare; delete app.d1.prepare; }
  assert.equal(first.status, 201, await first.clone().text());
  const firstData = (await first.json()).data;
  assert.equal(firstData.snapshot, null);
  assert.match(firstData.created.requestCode, /^REQ-/);
  const again = await create(back, { ...project, name: "Retry Customer", entry: "site_visit", clientKey });
  assert.equal(again.status, 200);
  const againData = (await again.json()).data;
  assert.equal(againData.created.caseId, firstData.created.caseId);
  assert.equal(againData.created.requestCode, firstData.created.requestCode);
  assert.equal(projectCount(), 1, "exactly one project");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM projects WHERE customer_name='Retry Customer'").get().n, 1, "exactly one project number");
  // A refused attempt (bad input) does not use up the key.
  const freshKey = "c0ffee00-9999-4222-8333-444455556666";
  assert.equal((await create(back, { ...project, name: "", entry: "new", clientKey: freshKey })).status, 400);
  assert.equal((await create(back, { ...project, name: "Second Try", entry: "new", clientKey: freshKey })).status, 201);
});

test("workflow milestones keep the stage name in step: intake keeps it, activation and completion update board and portfolio together", async () => {
  const back = await app.ownerCookie();
  const intake = (await (await create(back, { ...project, entry: "new", statusLabel: "Waiting for planner" })).json()).data.created;
  assert.equal((await act(admin, intake.caseId, "approve_intake")).status, 200);
  const afterIntake = (await board(back)).cases.find((entry) => entry.id === intake.caseId);
  assert.equal(afterIntake.view.statusLabel, "Waiting for planner");
  assert.equal(app.d1.sqlite.prepare("SELECT stage FROM projects WHERE code=?").get(afterIntake.projectCode).stage, "Waiting for planner", "the new portfolio row keeps the chosen name");

  const toActivate = (await (await create(back, { ...project, entry: "site_visit", statusLabel: "Permits & approvals" })).json()).data.created;
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='customer_approved' WHERE id=?").run(toActivate.caseId);
  app.d1.sqlite.prepare("INSERT INTO workflow_estimates (case_id,amount_cents,scope,terms,status,created_by,created_at,sent_at,customer_decided_at,confirmed_at) VALUES (?,1000000,'Scope','', 'customer_accepted','admin','now','now','now','')").run(toActivate.caseId);
  assert.equal((await act(admin, toActivate.caseId, "activate_project")).status, 200);
  assert.equal((await board(back)).cases.find((entry) => entry.id === toActivate.caseId).view.statusLabel, "Scheduled");
  assert.equal(app.d1.sqlite.prepare("SELECT stage FROM projects WHERE code=?").get(toActivate.projectCode).stage, "Scheduled");

  const toComplete = (await (await create(back, { ...project, entry: "underway", statusLabel: "Final inspection" })).json()).data.created;
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='completion_ready' WHERE id=?").run(toComplete.caseId);
  assert.equal((await act(back, toComplete.caseId, "complete_project", { note: "Done" })).status, 200);
  assert.equal((await board(back)).cases.find((entry) => entry.id === toComplete.caseId).view.statusLabel, "Complete");
  assert.equal(app.d1.sqlite.prepare("SELECT stage FROM projects WHERE code=?").get(toComplete.projectCode).stage, "Complete");

  // A website request that never used stage names keeps showing the workflow step, as before.
  const noLabel = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='completion_ready' WHERE id=?").run(noLabel.caseId);
  assert.equal((await act(back, noLabel.caseId, "complete_project", { note: "" })).status, 200);
  assert.equal((await board(back)).cases.find((entry) => entry.id === noLabel.caseId).view.statusLabel, "");
});

test("screens: a message being typed belongs to its project, and every other form starts empty on another project", async () => {
  const { readFile } = await import("node:fs/promises");
  const boardSource = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
  assert.match(boardSource, /messageDrafts\[draftKey\]\?\.body/, "message drafts are kept per project");
  assert.doesNotMatch(boardSource, /const \[customerMessage, setCustomerMessage\] = useState/, "no single shared message box");
  assert.match(boardSource, /if \(selected && selected\.id !== formsFor\) \{[\s\S]*?setCloseNote\(""\);[\s\S]*?setChangeForm\(\{ title: "", detail: "" \}\)/, "other forms reset when the project changes");
  const controls = await readFile(new URL("../app/workflow/ProjectControls.tsx", import.meta.url), "utf8");
  assert.match(controls, /show_customer_status", \{ title: view\.draft\?\.title/, "Show sends the exact draft that was confirmed");
  assert.match(controls, /JSON\.stringify\(\{ \.\.\.form, clientKey \}\)/, "Create sends its retry key");
});

// ---- Codex review 2 (November 2026) ----

test("two Show presses at the same moment: only the confirmed text reaches the customer, and a refused one leaves no history line", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  for (let round = 0; round < 5; round += 1) {
    const current = `Current text ${round}`;
    assert.equal((await act(back, created.caseId, "save_customer_status", { title: current, detail: "" })).status, 200);
    const [fresh, stale] = await Promise.all([
      act(back, created.caseId, "show_customer_status", { title: current, detail: "" }),
      act(back, created.caseId, "show_customer_status", { title: `Old text ${round}`, detail: "" }),
    ]);
    assert.equal(fresh.status, 200);
    assert.equal(stale.status, 400);
  }
  const activity = (await portal(created.requestCode)).activity.map((line) => line.title);
  assert.ok(!activity.some((title) => title.includes("Old text")), activity.join(" | "));
  assert.equal(activity.filter((title) => title.startsWith("Project status: Current text")).length, 5);
});

test("creating a project is all-or-nothing: a failure leaves no case, no project number and no used key, and the retry makes exactly one", async () => {
  const back = await app.ownerCookie();
  const clientKey = "badbatch-1111-4222-8333-444455556666";
  const cases = () => app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_cases WHERE customer_name='Atomic Customer'").get().n;
  const before = { projects: app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM projects").get().n };
  app.d1.prepare = (sql) => {
    const statement = TestD1.prototype.prepare.call(app.d1, sql);
    if (!/project_opened/.test(sql)) return statement;
    return { bind: () => ({ batchResult: () => { throw new Error("D1_ERROR: injected"); }, run: () => Promise.reject(new Error("D1_ERROR: injected")), first: () => Promise.reject(new Error("D1_ERROR: injected")), all: () => Promise.reject(new Error("D1_ERROR: injected")) }) };
  };
  let failed;
  try { failed = await create(back, { ...project, name: "Atomic Customer", entry: "underway", clientKey }); } finally { delete app.d1.prepare; }
  assert.equal(failed.status, 400);
  assert.equal(cases(), 0, "no half-made case");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM projects").get().n, before.projects, "no project number used");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM team_project_keys WHERE client_key=?").get(clientKey).n, 0, "the key is free again");
  const retry = await create(back, { ...project, name: "Atomic Customer", entry: "underway", clientKey });
  assert.equal(retry.status, 201, await retry.clone().text());
  assert.equal((await create(back, { ...project, name: "Atomic Customer", entry: "underway", clientKey })).status, 200);
  assert.equal(cases(), 1);
  const [one, two] = await Promise.all([1, 2].map(() => create(back, { ...project, name: "Parallel Customer", entry: "site_visit", clientKey: "parallel-1111-4222-8333-444455556666" })));
  assert.deepEqual([one.status, two.status].sort(), [200, 201], "two presses at the same moment make one project");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_cases WHERE customer_name='Parallel Customer'").get().n, 1);
  assert.equal((await create(back, { ...project, entry: "toString" })).status, 400, "only real starting points are accepted");
});

test("Supervisors and Estimators see that messages and notes happened, never their text", async () => {
  const back = await app.ownerCookie();
  const estimator = await app.staffCookie("estimator2.team@alert.test", "Estimator");
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  assert.equal((await act(back, created.caseId, "reassign_supervisor", { supervisorEmail: "super.team@alert.test", supervisorName: "Super" })).status, 200);
  assert.equal((await act(back, created.caseId, "add_customer_note", { body: "SECRET-NOTE-2099", showFrom: "2099-01-01" })).status, 200);
  const note = (await board(back)).cases.find((entry) => entry.id === created.caseId).view.notes[0];
  assert.equal((await act(back, created.caseId, "remove_customer_note", { noteId: note.id })).status, 200);
  assert.equal((await act(back, created.caseId, "message_customer", { body: "SECRET-OWNER-MESSAGE" })).status, 200);
  assert.equal((await customerSays(created.requestCode, "SECRET-CUSTOMER-MESSAGE", "198.18.42.1")).status, 201);
  for (const [cookie, label] of [[supervisor, "Site Supervisor"], [estimator, "Estimator"]]) {
    const text = JSON.stringify(await board(cookie));
    assert.ok(text.includes(String(created.caseId)), `${label} sees the project`);
    for (const secret of ["SECRET-NOTE-2099", "SECRET-OWNER-MESSAGE", "SECRET-CUSTOMER-MESSAGE"]) assert.ok(!text.includes(secret), `${label} does not see ${secret}`);
  }
  const ownerText = JSON.stringify(await board(back));
  for (const secret of ["SECRET-NOTE-2099", "SECRET-OWNER-MESSAGE", "SECRET-CUSTOMER-MESSAGE"]) assert.ok(ownerText.includes(secret), `the Owner still sees ${secret}`);
});

test("screens: an older refresh never replaces newer data, and a new project's link comes from the server's own answer", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
  assert.match(source, /const startedAt = generation\.current;[\s\S]*?if \(fresh && generation\.current === startedAt && epoch === accessEpoch\.current\)/, "stale refreshes are dropped");
  assert.match(source, /\?\? \(selectedId \? null : data\.cases\[0\] \?\? null\)/, "a chosen project is never silently swapped for another");
  assert.match(source, /<CopyCustomerLink requestCode=\{justCreated\.requestCode\} \/>/, "the new project's link is the one the server returned");
});

// ---- Codex review 3 (November 2026) ----

test("stage edits from the portfolio and from the workflow at the same moment always leave both lists showing the same stage", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "site_visit" })).json()).data;
  const row = app.d1.sqlite.prepare("SELECT * FROM projects WHERE code=?").get(created.projectCode);
  // Each editor was opened just now (the project as it is at that moment); saved at the same moment, the first wins and the others are told
  // the project changed meanwhile — never a silent overwrite.
  const portfolioEdit = (cookie, stage) => request("/api/owner/data", json(cookie, { resource: "project", id: row.id, payload: { code: row.code, name: row.name, service: row.service, stage, progress: 10, contractValue: 0, balance: 0, customerName: row.customer_name, suburb: row.suburb, startDate: "", notes: "", opened: openedProject(app.d1.sqlite, row.id) } }, "PATCH"));
  const adminPortfolioEdit = (stage) => request("/api/admin/data", json(admin, { resource: "project", id: row.id, payload: { code: row.code, name: row.name, service: row.service, stage, progress: 10, customerName: row.customer_name, suburb: row.suburb, startDate: "", notes: "", opened: openedProject(app.d1.sqlite, row.id) } }, "PATCH"));
  for (let round = 0; round < 6; round += 1) {
    const results = await Promise.all([
      portfolioEdit(back, `Portfolio ${round}`),
      act(admin, created.caseId, "set_status_label", { label: `Workflow ${round}` }),
      adminPortfolioEdit(`Admin portfolio ${round}`),
    ]);
    assert.ok(results.some((response) => response.status === 200), "one of them is saved");
    for (const response of results) {
      if (response.status !== 200) assert.match((await response.json()).error, /changed in the meantime|changed by someone else/, "a save that lost the race is refused, not lost silently");
    }
    const portfolio = app.d1.sqlite.prepare("SELECT stage FROM projects WHERE code=?").get(created.projectCode).stage;
    const workflow = app.d1.sqlite.prepare("SELECT status_label AS label FROM case_status WHERE case_id=?").get(created.caseId).label;
    assert.equal(portfolio, workflow, `round ${round}: both lists agree`);
  }
  // The guarantee behind it: the portfolio row and the workflow stage are written in ONE batch (one transaction on D1), from both screens.
  const batches = [];
  app.d1.batch = async (statements) => { batches.push(statements.map((statement) => statement.sql ?? "")); return TestD1.prototype.batch.call(app.d1, statements); };
  try {
    assert.equal((await portfolioEdit(back, "Owner single batch")).status, 200);
    assert.equal((await adminPortfolioEdit("Admin single batch")).status, 200);
  } finally { delete app.d1.batch; }
  const together = batches.filter((sqls) => sqls.some((sql) => /UPDATE projects SET code/.test(sql)) && sqls.some((sql) => /UPDATE case_status SET status_label/.test(sql)));
  assert.equal(together.length, 2, "Owner and Admin portfolio edits each update both in the same batch");
});

test("a note or message that was saved is reported as saved even if the fresh page cannot be read, and a retry never saves it twice", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const breakReads = () => {
    app.d1.prepare = (sql) => {
      if (/^SELECT id,case_id AS caseId,amount_cents AS amountCents/.test(sql.trim()) || /FROM workflow_estimates WHERE case_id=\? AND status IN/.test(sql)) throw new Error("D1_ERROR: injected read failure");
      return TestD1.prototype.prepare.call(app.d1, sql);
    };
    return () => { delete app.d1.prepare; };
  };
  const count = (table) => app.d1.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE case_id=?`).get(created.caseId).n;
  const noteKey = "note0000-1111-4222-8333-444455556666";
  const staffKey = "staff000-1111-4222-8333-444455556666";
  const customerKey = "cust0000-1111-4222-8333-444455556666";
  let restore = breakReads();
  let note, staff, customer;
  try {
    note = await act(back, created.caseId, "add_customer_note", { body: "Saved once", clientKey: noteKey });
    staff = await act(back, created.caseId, "message_customer", { body: "Saved once too", clientKey: staffKey });
    customer = await request("/api/workflow/public/messages", { ...json(null, { code: created.requestCode, body: "Customer once", clientKey: customerKey }), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": "198.18.43.1" } });
  } finally { restore(); }
  for (const [response, label] of [[note, "note"], [staff, "Owner message"]]) {
    assert.equal(response.status, 200, label);
    const answer = await response.json();
    assert.equal(answer.saved, true);
    assert.equal(answer.data, null, `${label}: no board, but reported as saved`);
  }
  assert.equal(customer.status, 201);
  assert.equal((await customer.json()).data, null);
  // The screens retry with the same keys (a lost answer, a double press): nothing is saved twice.
  assert.equal((await act(back, created.caseId, "add_customer_note", { body: "Saved once", clientKey: noteKey })).status, 200);
  assert.equal((await act(back, created.caseId, "message_customer", { body: "Saved once too", clientKey: staffKey })).status, 200);
  const again = await request("/api/workflow/public/messages", { ...json(null, { code: created.requestCode, body: "Customer once", clientKey: customerKey }), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": "198.18.43.1" } });
  assert.equal(again.status, 201);
  assert.equal(count("customer_notes"), 1);
  assert.equal(count("customer_messages"), 2);
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_events WHERE case_id=? AND event_type IN ('message_customer','customer_message','add_customer_note')").get(created.caseId).n, 3, "one history line each");
  // A new key is a new message.
  assert.equal((await act(back, created.caseId, "message_customer", { body: "Saved once too", clientKey: "staff111-1111-4222-8333-444455556666" })).status, 200);
  assert.equal(count("customer_messages"), 3);
  // A key used for one project protects nothing on another.
  const other = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
  assert.equal((await act(back, other.caseId, "message_customer", { body: "Other project", clientKey: staffKey })).status, 200);
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM customer_messages WHERE case_id=?").get(other.caseId).n, 1);
});

test("screens: the estimate calculator starts fresh per project; finishing a send never clears text typed meanwhile; every send has its key", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const boardSource = await read("app/workflow/WorkflowBoard.tsx");
  assert.match(boardSource, /<EstimateCalculator key=\{selected\.id\}/);
  assert.match(boardSource, /current && current\.body === body && \(current\.docs \?\? false\) === docs \? \{ body: "", docs: false, key: newClientKey\(\) \}/, "the board clears only the text that was sent");
  assert.match(boardSource, /clientKey: key/);
  assert.match(boardSource, /const newest = generation\.current === startedGen;\s*generation\.current \+= 1;\s*if \(result\.data && newest\) setData\(result\.data\); else refreshQuietly\(\);/, "a saved change without a fresh board, or answered after something newer, re-reads quietly instead of replacing newer data");
  assert.match(boardSource, /const newest = generation\.current === createStartedAt\.current;\s*generation\.current \+= 1;\s*if \(snapshot && newest\) setData\(snapshot\); else refreshQuietly\(\);/, "the same for a project just created");
  const portalSource = await read("app/workflow/CustomerWorkflowPanel.tsx");
  assert.match(portalSource, /setMessageText\(\(current\) => current === sentText \? "" : current\)/);
  assert.match(portalSource, /clientKey: messageKey/);
  const controls = await read("app/workflow/ProjectControls.tsx");
  assert.match(controls, /current\.body === sent\.body && current\.showFrom === sent\.showFrom && current\.showUntil === sent\.showUntil \?/);
  assert.match(controls, /clientKey: noteKey/);
});

// ---- Codex review 4 (November 2026) ----

test("a one-time key only ever acknowledges the same content: reused for something different it is refused (409), never answered with the earlier result", async () => {
  const back = await app.ownerCookie();
  const key = "samekey0-1111-4222-8333-444455556666";
  const first = await create(back, { ...project, name: "Customer A", entry: "underway", clientKey: key });
  assert.equal(first.status, 201);
  const codeA = (await first.json()).data.created.requestCode;
  const other = await create(back, { ...project, name: "Customer B", entry: "underway", clientKey: key });
  assert.equal(other.status, 409);
  const otherText = await other.text();
  assert.ok(!otherText.includes(codeA), "customer A's code is never handed out for customer B");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM workflow_cases WHERE customer_name='Customer B'").get().n, 0);
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const noteKey = "notekey0-1111-4222-8333-444455556666";
  assert.equal((await act(back, created.caseId, "add_customer_note", { body: "First note", clientKey: noteKey })).status, 200);
  assert.equal((await act(back, created.caseId, "add_customer_note", { body: "First note", clientKey: noteKey })).status, 200, "the same note again is acknowledged");
  assert.equal((await act(back, created.caseId, "add_customer_note", { body: "Changed note", clientKey: noteKey })).status, 409);
  assert.equal((await act(back, created.caseId, "add_customer_note", { body: "First note", showUntil: "2099-01-01", clientKey: noteKey })).status, 409, "different dates are different content");
  const staffKey = "msgkey00-1111-4222-8333-444455556666";
  assert.equal((await act(back, created.caseId, "message_customer", { body: "Hello", clientKey: staffKey })).status, 200);
  assert.equal((await act(back, created.caseId, "message_customer", { body: "Hello", kind: "document_request", clientKey: staffKey })).status, 409, "a different kind is different content");
  const customerKey = "custkey0-1111-4222-8333-444455556666";
  const send = (body) => request("/api/workflow/public/messages", { ...json(null, { code: created.requestCode, body, clientKey: customerKey }), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": "198.18.44.1" } });
  assert.equal((await send("From the customer")).status, 201);
  assert.equal((await send("From the customer")).status, 201);
  assert.equal((await send("Something else")).status, 409);
  const stored = app.d1.sqlite.prepare("SELECT body FROM customer_messages WHERE case_id=? ORDER BY id").all(created.caseId).map((row) => row.body);
  assert.deepEqual(stored, ["Hello", "From the customer"]);
  assert.deepEqual(app.d1.sqlite.prepare("SELECT body FROM customer_notes WHERE case_id=?").all(created.caseId).map((row) => row.body), ["First note"]);
});

test("intake approval and a stage change at the same moment always leave the portfolio and the workflow with the same stage", async () => {
  const back = await app.ownerCookie();
  for (let round = 0; round < 5; round += 1) {
    const { created } = (await (await create(back, { ...project, entry: "new", statusLabel: `Old stage ${round}` })).json()).data;
    const [approved, labelled] = await Promise.all([act(admin, created.caseId, "approve_intake"), act(back, created.caseId, "set_status_label", { label: `New stage ${round}` })]);
    assert.equal(approved.status, 200);
    assert.equal(labelled.status, 200);
    const linked = app.d1.sqlite.prepare("SELECT project_code AS code FROM workflow_cases WHERE id=?").get(created.caseId).code;
    const portfolio = app.d1.sqlite.prepare("SELECT stage FROM projects WHERE code=?").get(linked).stage;
    const workflow = app.d1.sqlite.prepare("SELECT status_label AS label FROM case_status WHERE case_id=?").get(created.caseId).label;
    assert.equal(portfolio, workflow, `round ${round}`);
  }
  // The guarantee behind it: approval numbers, links and copies the stage in ONE batch; the stage setter finds the project inside its own batch.
  const batches = [];
  app.d1.batch = async (statements) => { batches.push(statements.map((statement) => statement.sql ?? "")); return TestD1.prototype.batch.call(app.d1, statements); };
  const { created } = (await (await create(back, { ...project, entry: "new" })).json()).data;
  try {
    assert.equal((await act(admin, created.caseId, "approve_intake")).status, 200);
    assert.equal((await act(back, created.caseId, "set_status_label", { label: "Checked" })).status, 200);
  } finally { delete app.d1.batch; }
  assert.ok(batches.some((sqls) => sqls.some((sql) => /UPDATE workflow_cases SET stage='site_visit_ready'/.test(sql)) && sqls.some((sql) => /INSERT INTO projects/.test(sql) && /case_status/.test(sql))), "approval is one batch that reads the stage name");
  assert.ok(batches.some((sqls) => sqls.some((sql) => /UPDATE projects SET stage=\?,updated_at=\? WHERE code=\(SELECT project_code FROM workflow_cases/.test(sql))), "the stage setter looks the project up inside its batch");
  // Double approval still moves on once and makes one project.
  const twice = (await (await create(back, { ...project, name: "Twice Approved", entry: "new" })).json()).data.created;
  const [one, two] = await Promise.all([act(admin, twice.caseId, "approve_intake"), act(back, twice.caseId, "approve_intake")]);
  assert.deepEqual([one.status, two.status].sort(), [200, 400]);
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM projects WHERE customer_name='Twice Approved'").get().n, 1);
});

test("a customer retrying an already-saved message at the hourly limit is told it was sent, and only genuinely new messages count", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const send = (body, clientKey) => request("/api/workflow/public/messages", { ...json(null, { code: created.requestCode, body, clientKey }), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": "198.18.45.1" } });
  let lastKey = "";
  for (let index = 0; index < 40; index += 1) {
    lastKey = `limit000-1111-4222-8333-${String(index).padStart(12, "0")}`;
    assert.equal((await send(`Message ${index}`, lastKey)).status, 201, `message ${index}`);
  }
  assert.equal((await send("Message 39", lastKey)).status, 201, "the 40th, retried with its key at the limit, is acknowledged");
  assert.equal((await send("Message 40", "limit000-1111-4222-8333-999999999999")).status, 429, "a genuinely new 41st message is limited");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM customer_messages WHERE case_id=?").get(created.caseId).n, 40);
});

// ---- Codex review 5 (November 2026) ----

test("a huge hand-typed project number never makes a new customer share someone else's project", async () => {
  const back = await app.ownerCookie();
  const year = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric" }).format(new Date());
  const huge = `ATP-${year}-9223372036854775807`;
  const typed = await request("/api/owner/data", json(back, { resource: "project", payload: { code: huge, name: "Existing customer", service: "Roof", stage: "Construction", progress: 92, contractValue: 0, balance: 0, customerName: "Existing Customer", suburb: "Kew", startDate: "", notes: "" } }));
  assert.equal(typed.status, 201, await typed.clone().text());
  const enquiry = (await (await create(back, { ...project, name: "New Enquiry", entry: "new" })).json()).data.created;
  assert.equal((await act(admin, enquiry.caseId, "approve_intake")).status, 200);
  const linked = app.d1.sqlite.prepare("SELECT project_code AS code FROM workflow_cases WHERE id=?").get(enquiry.caseId).code;
  assert.notEqual(linked, huge);
  assert.match(linked, new RegExp(`^ATP-${year}-\\d{5,15}$`));
  assert.equal(app.d1.sqlite.prepare("SELECT customer_name AS name FROM projects WHERE code=?").get(linked).name, "New Enquiry", "the new customer has their own project row");
  assert.equal(app.d1.sqlite.prepare("SELECT progress FROM projects WHERE code=?").get(huge).progress, 92, "the existing project is untouched");
  assert.equal((await portal(enquiry.requestCode)).progress, 0, "the new customer does not see the existing project's progress");
  const direct = (await (await create(back, { ...project, name: "Direct Project", entry: "underway" })).json()).data.created;
  assert.notEqual(direct.projectCode, huge);
  // If a number is taken anyway, the approval is cancelled as a whole and nothing is linked.
  const clash = (await (await create(back, { ...project, name: "Clash Enquiry", entry: "new" })).json()).data.created;
  app.d1.prepare = (sql) => {
    const statement = TestD1.prototype.prepare.call(app.d1, sql);
    if (!/INSERT INTO projects/.test(sql) || !/Created from approved customer request/.test(sql)) return statement;
    return { bind: () => ({ batchResult: () => { throw new Error("D1_ERROR: UNIQUE constraint failed: projects.code"); } }) };
  };
  let refused;
  try { refused = await act(admin, clash.caseId, "approve_intake"); } finally { delete app.d1.prepare; }
  assert.equal(refused.status, 400);
  assert.match((await refused.json()).error, /just taken/);
  const after = app.d1.sqlite.prepare("SELECT stage, project_code AS code FROM workflow_cases WHERE id=?").get(clash.caseId);
  assert.deepEqual({ ...after }, { stage: "admin_review", code: "" }, "nothing changed");
  assert.equal((await act(admin, clash.caseId, "approve_intake")).status, 200, "approving again works");
});

test("when the Owner switches off Admin project access, Admin can neither see nor change customer projects; the Owner and Manager are unaffected", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  assert.equal((await customerSays(created.requestCode, "Hello from the customer", "198.18.47.1")).status, 201);
  // One project file, so file access can be checked too.
  const objectKey = `projects/${created.projectCode}/photos/document/permission-check.pdf`;
  await app.env.BUCKET.put(objectKey, "%PDF-1.4 permission check", { httpMetadata: { contentType: "application/pdf" } });
  const fileId = Number(app.d1.sqlite.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(created.caseId, "document", objectKey, "permission-check.pdf", "application/pdf", 25, "owner@test", new Date().toISOString()).lastInsertRowid);
  const fileAs = (cookie) => request(`/api/workflow/files?id=${fileId}`, { headers: { cookie } });
  const conversationsAs = (cookie) => request("/api/workflow/conversations", { headers: { cookie } });
  assert.equal((await fileAs(admin)).status, 200, "switched on, Admin opens project files");
  assert.equal((await conversationsAs(admin)).status, 200);
  const setPermission = (projects) => request("/api/owner/data", json(back, { resource: "permission", id: "Admin", payload: { projects, schedule: 1, finance: 0, financeExport: 0 } }, "PATCH"));
  assert.equal((await setPermission(0)).status, 200);
  try {
    const blocked = await create(admin, { ...project, entry: "underway" });
    assert.equal(blocked.status, 403);
    assert.match((await blocked.json()).error, /disabled by Owner/);
    const hidden = await request("/api/workflow", { headers: { cookie: admin } });
    assert.equal(hidden.status, 403, "the board (private customer codes, notes, messages) is not sent");
    const hiddenText = await hidden.text();
    assert.match(hiddenText, /disabled by Owner/);
    assert.ok(!hiddenText.includes(created.requestCode) && !hiddenText.includes("Hello from the customer"));
    for (const [action, payload] of [["set_status_label", { label: "X" }], ["save_customer_status", { title: "X" }], ["add_customer_note", { body: "X" }], ["message_customer", { body: "Admin message", kind: "message" }], ["review_started", {}]]) {
      const refused = await act(admin, created.caseId, action, payload);
      assert.equal(refused.status, 403, action);
      assert.match((await refused.json()).error, /disabled by Owner/);
    }
    const conversations = await conversationsAs(admin);
    assert.equal(conversations.status, 403, "customer conversations are not sent either");
    assert.ok(!(await conversations.text()).includes("Hello from the customer"));
    assert.equal((await fileAs(admin)).status, 404, "nor project files");
    assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM customer_messages WHERE case_id=? AND body='Admin message'").get(created.caseId).n, 0);
    // The Owner is never limited, and the Manager (a separate role) keeps reading conversations.
    assert.equal((await create(back, { ...project, entry: "underway" })).status, 201, "the Owner is never limited");
    assert.equal((await act(back, created.caseId, "set_status_label", { label: "Owner only" })).status, 200);
    assert.equal((await request("/api/workflow", { headers: { cookie: back } })).status, 200);
    assert.equal((await fileAs(back)).status, 200);
    assert.equal((await conversationsAs(manager)).status, 200);
  } finally {
    assert.equal((await setPermission(1)).status, 200);
  }
  assert.equal((await create(admin, { ...project, entry: "underway" })).status, 201, "switched back on, Admin can again");
  assert.equal((await request("/api/workflow", { headers: { cookie: admin } })).status, 200);
  assert.equal((await fileAs(admin)).status, 200);
  assert.equal((await conversationsAs(admin)).status, 200);
});

test("Jarvis never sends a customer's e-mail or phone to an AI, even when someone typed them into a stage name", async () => {
  const { buildUserContent } = await import("../jarvis/ai.mjs");
  const content = buildUserContent({ message: "How are the projects going?", records: [], projects: [{ code: "ATP-2026-00001", stage: "Waiting for sam.private@customer.test / 0400 123 456", progress: 10, contractValue: 0, balance: 0, name: "Kitchen", customerName: "Sam", suburb: "Kew", notes: "" }] });
  const text = typeof content === "string" ? content : JSON.stringify(content);
  assert.ok(!text.includes("sam.private@customer.test"), "no e-mail");
  assert.ok(!/0400\s?123\s?456/.test(text), "no phone");
  assert.match(text, /ATP-2026-00001/);
});

test("an identical customer message retry is always recognised, even with invisible control characters in it", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const send = (body) => request("/api/workflow/public/messages", { ...json(null, { code: created.requestCode, body, clientKey: "ctrlkey0-1111-4222-8333-444455556666" }), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": "198.18.46.1" } });
  assert.equal((await send("A\u0000B")).status, 201);
  assert.equal((await send("A\u0000B")).status, 201, "the identical retry is acknowledged");
  assert.equal((await send("AB")).status, 201, "it is the same saved text");
  assert.equal((await send("A different message")).status, 409);
  assert.deepEqual(app.d1.sqlite.prepare("SELECT body FROM customer_messages WHERE case_id=?").all(created.caseId).map((row) => row.body), ["AB"]);
});

test("the stage list speaks the dashboards' language: every portfolio stage is offered, finished is \"Complete\", and a custom stage stays visible when editing", async () => {
  const { readFile } = await import("node:fs/promises");
  const options = (await board(await app.ownerCookie())).stageOptions;
  for (const file of ["app/owner/OwnerDashboard.tsx", "app/admin/AdminDashboard.tsx"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const listed = JSON.parse(`[${source.match(/const stages\s*=\s*\[([^\]]+)\]/)[1]}]`);
    for (const stage of listed) assert.ok(options.includes(stage), `${file}: "${stage}" is offered`);
    assert.match(source, /stages\.includes\((pf|projectForm)\.stage\)\s*\?\s*stages\s*:\s*\[\.\.\.stages,\s*(pf|projectForm)\.stage\]/, `${file}: the project editor keeps a custom stage visible`);
    assert.match(source, /services\.includes\((pf|projectForm)\.service\)\s*\?\s*services\s*:\s*\[\.\.\.services,\s*(pf|projectForm)\.service\]/, `${file}: the project editor keeps a typed service visible`);
  }
  assert.ok(options.includes("Complete") && !options.includes("Completed"), "the dashboards count only \"Complete\" as finished");
});

test("with Admin project access off, the older Admin pages hold back every project record (operations, tasks, worker assignments, project files, legacy requests); general records stay; the Owner is unaffected", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const caseId = created.caseId;
  const get = (cookie, path) => request(path, { headers: { cookie } });
  const post = (cookie, path, action, payload) => request(path, json(cookie, { action, payload }));
  for (const path of ["/api/operations", "/api/tasks/manage", "/api/worker/manage"]) assert.equal((await get(back, path)).status, 200, path);
  // One record of each kind: project-tied and general.
  const now = new Date().toISOString();
  const sql = app.d1.sqlite;
  const issueId = Number(sql.prepare("INSERT INTO site_issue_reports (case_id,project_code,site_location,affected_trade,issue_type,summary,reporter_email,reporter_name,reported_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(caseId, created.projectCode, "Kew", "Plumber", "Delay", "Pipe delivery is late", "super.team@alert.test", "Site Supervisor", now, now).lastInsertRowid);
  const tomorrow = melbourneDay(1);
  assert.equal((await post(back, "/api/operations", "create_follow_up", { projectCode: created.projectCode, title: "Project follow-up", targetDate: tomorrow })).status, 200);
  assert.equal((await post(back, "/api/operations", "create_follow_up", { projectCode: "Business / General", title: "General follow-up", targetDate: tomorrow })).status, 200);
  const followUp = (title) => Number(sql.prepare("SELECT id FROM follow_up_items WHERE title=? ORDER BY id DESC LIMIT 1").get(title).id);
  assert.equal((await post(back, "/api/tasks/manage", "create_task", { assigneeEmail: "super.team@alert.test", caseId, title: "Project task", instructions: "On site" })).status, 200);
  assert.equal((await post(back, "/api/tasks/manage", "create_task", { assigneeEmail: "super.team@alert.test", caseId: 0, title: "General task", instructions: "In the office" })).status, 200);
  const task = (title) => Number(sql.prepare("SELECT id FROM team_tasks WHERE title=? ORDER BY id DESC LIMIT 1").get(title).id);
  const objectKey = `projects/${created.projectCode}/worker/private-plan.pdf`;
  await app.env.BUCKET.put(objectKey, "%PDF-1.4 private plan", { httpMetadata: { contentType: "application/pdf" } });
  const fileId = Number(sql.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(caseId, "worker_document", objectKey, "private-plan.pdf", "application/pdf", 21, "owner@test", now).lastInsertRowid);
  assert.equal((await get(admin, `/api/worker/files?id=${fileId}`)).status, 200, "switched on, Admin opens project files");
  const legacyId = Number(sql.prepare("INSERT INTO job_requests (code,request_type,customer_name,contact,service,suburb,submitted_at,summary,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(`JOB-LEGACY-${caseId}`, "Job Request", "Legacy Customer", "legacy@customer.test", "Kitchen Renovation", "Kew", now, "Old website request", now).lastInsertRowid);
  assert.ok((await (await get(admin, "/api/admin/data")).json()).data.requests.some((item) => item.id === legacyId), "switched on, Admin sees the older requests");
  const workerFiles = () => sql.prepare("SELECT COUNT(*) AS n FROM workflow_files WHERE case_id=? AND category='worker_document'").get(caseId).n;

  const setPermission = (projects) => request("/api/owner/data", json(back, { resource: "permission", id: "Admin", payload: { projects, schedule: 1, finance: 0, financeExport: 0 } }, "PATCH"));
  assert.equal((await setPermission(0)).status, 200);
  try {
    // Operations: no projects or site problems; only the general follow-up.
    const operations = (await (await get(admin, "/api/operations")).json()).data;
    assert.deepEqual([operations.projects.length, operations.issues.length], [0, 0]);
    assert.deepEqual(operations.followUps.map((item) => item.title), ["General follow-up"]);
    assert.ok(!JSON.stringify(operations).includes(created.projectCode));
    assert.equal((await post(admin, "/api/operations", "review_issue", { issueId, adminAction: "Calling the supplier" })).status, 403);
    assert.equal((await post(admin, "/api/operations", "create_follow_up", { projectCode: created.projectCode, title: "Sneaky", targetDate: tomorrow })).status, 403);
    assert.equal((await post(admin, "/api/operations", "set_follow_up_status", { followUpId: followUp("Project follow-up"), status: "completed" })).status, 403);
    assert.equal((await post(admin, "/api/operations", "set_follow_up_status", { followUpId: followUp("General follow-up"), status: "completed" })).status, 200, "general follow-ups still work");
    assert.equal((await post(admin, "/api/operations", "create_follow_up", { projectCode: "Business / General", title: "Another general", targetDate: tomorrow })).status, 200);
    // Team tasks: only the general task, no project list; project tasks cannot be created or changed.
    const tasks = (await (await get(admin, "/api/tasks/manage")).json()).data;
    assert.deepEqual(tasks.tasks.map((item) => item.title), ["General task"]);
    assert.equal(tasks.projects.length, 0);
    assert.equal((await post(admin, "/api/tasks/manage", "create_task", { assigneeEmail: "super.team@alert.test", caseId, title: "Sneaky", instructions: "x" })).status, 403);
    assert.equal((await post(admin, "/api/tasks/manage", "set_status", { taskId: task("Project task"), status: "completed" })).status, 403);
    assert.equal((await post(admin, "/api/tasks/manage", "delete_task", { taskId: task("Project task") })).status, 403);
    assert.equal((await post(admin, "/api/tasks/manage", "set_status", { taskId: task("General task"), status: "in_progress", from: "assigned" })).status, 200, "general tasks still work");
    // Worker assignments and project files: refused entirely.
    assert.equal((await get(admin, "/api/worker/manage")).status, 403);
    assert.equal((await post(admin, "/api/worker/manage", "assign_worker", { caseId, workerEmail: "worker.team@alert.test" })).status, 403);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM worker_project_assignments WHERE case_id=?").get(caseId).n, 0, "no Worker was assigned");
    assert.equal((await get(admin, `/api/worker/files?id=${fileId}`)).status, 404, "the private project file is not sent");
    const upload = new FormData();
    upload.set("caseId", String(caseId)); upload.set("workerEmails", "[]"); upload.set("file", new File(["%PDF-1.4 x"], "x.pdf", { type: "application/pdf" }));
    assert.equal((await request("/api/worker/files", { method: "POST", body: upload, headers: { cookie: admin, origin: "http://localhost" } })).status, 403);
    assert.equal(workerFiles(), 1, "no project file was stored");
    // The Admin dashboard's older "New requests" list is part of the same switch.
    assert.deepEqual((await (await get(admin, "/api/admin/data")).json()).data.requests, []);
    const legacyEdit = await request("/api/admin/data", json(admin, { resource: "request", id: legacyId, payload: { status: "Contacted", priority: "Normal", assignedTo: "Admin", summary: "Changed" } }, "PATCH"));
    assert.equal(legacyEdit.status, 400);
    assert.match((await legacyEdit.json()).error, /disabled by Owner/);
    assert.equal(sql.prepare("SELECT summary FROM job_requests WHERE id=?").get(legacyId).summary, "Old website request");
    // The Owner sees and does everything.
    const ownerOperations = (await (await get(back, "/api/operations")).json()).data;
    assert.ok(ownerOperations.issues.some((item) => item.id === issueId));
    assert.equal((await get(back, "/api/worker/manage")).status, 200);
    assert.equal((await get(back, `/api/worker/files?id=${fileId}`)).status, 200);
    assert.equal((await post(back, "/api/tasks/manage", "set_status", { taskId: task("Project task"), status: "in_progress", from: sql.prepare("SELECT status FROM team_tasks WHERE id=?").get(task("Project task")).status })).status, 200);
  } finally {
    assert.equal((await setPermission(1)).status, 200);
  }
  // Switched back on: everything returns.
  const restored = (await (await get(admin, "/api/operations")).json()).data;
  assert.ok(restored.issues.some((item) => item.id === issueId) && restored.followUps.some((item) => item.title === "Project follow-up"));
  assert.ok((await (await get(admin, "/api/tasks/manage")).json()).data.tasks.some((item) => item.title === "Project task"));
  assert.equal((await get(admin, "/api/worker/manage")).status, 200);
  assert.equal((await get(admin, `/api/worker/files?id=${fileId}`)).status, 200);
});

test("a locked Admin board throws away answers to requests sent before the lock (slow saves, a project being created, reloads)", async () => {
  const { readFile } = await import("node:fs/promises");
  const board = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
  assert.match(board, /const lockedOut = useCallback\(\(message\?: string, signedOut = false\) => \{\s*accessEpoch\.current \+= 1;[\s\S]*?setJustCreated\(null\); setMessageDrafts\(\{\}\);/, "the lock clears the creation panel and drafts");
  for (const where of ["async function load\\(\\)", "async function action\\(", "async function upload\\("]) {
    assert.match(board, new RegExp(`${where}[\\s\\S]*?const epoch = accessEpoch\\.current;[\\s\\S]*?if \\(epoch !== accessEpoch\\.current\\) return`), where);
  }
  assert.match(board, /onCreated=\{\(created, snapshot\) => \{[\s\S]*?if \(newProjectEpoch\.current !== accessEpoch\.current\) return;/);
  assert.match(board, /management && justCreated && !accessOff && <section/);
});

test("Admin switches also hold in personal tasks, the Team hub (projects and calendar), older customer messages and clock-out notes", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const sql = app.d1.sqlite;
  const get = (cookie, path) => request(path, { headers: { cookie } });
  const send = (cookie, path, body, method = "POST") => request(path, json(cookie, body, method));
  const setPermission = (projects, schedule = 1) => send(back, "/api/owner/data", { resource: "permission", id: "Admin", payload: { projects, schedule, finance: 0, financeExport: 0 } }, "PATCH");
  const range = `/api/team/calendar?from=${melbourneDay(-1)}&to=${melbourneDay(30)}`;
  // Records made while everything is on.
  assert.equal((await send(back, "/api/tasks/manage", { action: "create_task", payload: { assigneeEmail: "admin.team@alert.test", caseId: created.caseId, title: "Admin project task", instructions: "Check the plans" } })).status, 200);
  assert.equal((await send(back, "/api/tasks/manage", { action: "create_task", payload: { assigneeEmail: "admin.team@alert.test", caseId: 0, title: "Admin general task", instructions: "Order stationery" } })).status, 200);
  const taskId = (title) => Number(sql.prepare("SELECT id FROM team_tasks WHERE title=? ORDER BY id DESC LIMIT 1").get(title).id);
  const plan = (cookie, title, assigneeEmail, projectCode) => send(cookie, "/api/team/calendar", { assigneeEmail, title, projectCode, dates: [melbourneDay(2)] });
  assert.equal((await plan(back, "Supervisor on project", "super.team@alert.test", created.projectCode)).status, 201);
  assert.equal((await plan(back, "Admin on project", "admin.team@alert.test", created.projectCode)).status, 201);
  assert.equal((await plan(back, "General meeting", "super.team@alert.test", "")).status, 201);
  assert.equal((await plan(admin, "Admin planned project visit", "super.team@alert.test", created.projectCode)).status, 201);
  assert.equal((await plan(admin, "Admin planned general", "super.team@alert.test", "")).status, 201);
  const entryId = (title) => Number(sql.prepare("SELECT id FROM calendar_entries WHERE title=? ORDER BY id DESC LIMIT 1").get(title).id);
  sql.prepare("INSERT INTO team_messages (sender,recipient,body,sent_at) VALUES (?,?,?,?)").run("Customer · ATP-2026-LEGACY1", "Admin", "Old site question\nPlease call me about the deck", new Date().toISOString());
  assert.ok((await (await get(admin, "/api/admin/data")).json()).data.messages.some((item) => item.body.includes("Please call me about the deck")));
  assert.equal((await send(admin, "/api/operations", { action: "clock_out_follow_up", payload: { projectCode: created.projectCode, title: "Project clock-out", targetDate: melbourneDay(1) } })).status, 200);
  assert.ok((await (await get(admin, "/api/team/people")).json()).data.projects.some((item) => item.code === created.projectCode));

  assert.equal((await setPermission(0)).status, 200);
  try {
    // Personal tasks: only the general one; the project task cannot be changed.
    const mine = (await (await get(admin, "/api/tasks")).json()).data.tasks.map((item) => item.title);
    assert.ok(mine.includes("Admin general task") && !mine.includes("Admin project task"));
    assert.equal((await send(admin, "/api/tasks", { action: "set_status", payload: { taskId: taskId("Admin project task"), status: "completed" } })).status, 403);
    assert.equal(sql.prepare("SELECT status FROM team_tasks WHERE id=?").get(taskId("Admin project task")).status, "assigned");
    assert.equal((await send(admin, "/api/tasks", { action: "set_status", payload: { taskId: taskId("Admin general task"), status: "completed", from: "assigned" } })).status, 200);
    // Team hub: no project list; calendar keeps general entries and the Admin's own work, nothing else project-linked.
    const hub = (await (await get(admin, "/api/team/people")).json()).data;
    assert.deepEqual(hub.projects, []);
    const seen = (await (await get(admin, range)).json()).data.map((item) => item.title);
    assert.ok(seen.includes("General meeting") && seen.includes("Admin on project") && seen.includes("Admin planned general"));
    assert.ok(!seen.includes("Supervisor on project") && !seen.includes("Admin planned project visit"));
    assert.equal((await plan(admin, "Sneaky project plan", "super.team@alert.test", created.projectCode)).status, 403);
    assert.equal((await plan(admin, "Allowed general plan", "super.team@alert.test", "")).status, 201);
    assert.equal((await send(admin, "/api/team/calendar", { id: entryId("Admin planned project visit") }, "DELETE")).status, 403);
    // Older customer messages are hidden, and Admin cannot write to a customer thread.
    const legacy = (await (await get(admin, "/api/admin/data")).json()).data.messages;
    assert.ok(!legacy.some((item) => item.body.includes("Please call me about the deck") || item.sender.startsWith("Customer · ")));
    assert.equal((await send(admin, "/api/admin/data", { resource: "message", payload: { recipient: "Customer · ATP-2026-LEGACY1", body: "Hello" } })).status, 400);
    // A general clock-out note cannot overwrite the day's project follow-up.
    assert.equal((await send(admin, "/api/operations", { action: "clock_out_follow_up", payload: { projectCode: "", title: "General clock-out", targetDate: melbourneDay(1) } })).status, 403);
    assert.equal(sql.prepare("SELECT project_code AS code FROM follow_up_items WHERE title='Project clock-out'").get().code, created.projectCode);
    // "Master schedule" off as well: Admin only sees their own calendar work and cannot plan or remove.
    assert.equal((await setPermission(0, 0)).status, 200);
    const own = (await (await get(admin, `${range}&person=super.team@alert.test`)).json()).data;
    assert.ok(own.length > 0 && own.every((item) => item.assigneeEmail === "admin.team@alert.test"), "only the Admin's own work");
    assert.equal((await plan(admin, "Blocked general plan", "super.team@alert.test", "")).status, 403);
    assert.equal((await send(admin, "/api/team/calendar", { id: entryId("Admin planned general") }, "DELETE")).status, 403);
    // The Owner and the Manager are never limited by Admin's switches.
    assert.ok((await (await get(manager, range)).json()).data.some((item) => item.title === "Supervisor on project"));
    assert.ok((await (await get(manager, "/api/team/people")).json()).data.projects.length > 0);
    assert.equal((await plan(back, "Owner plan", "super.team@alert.test", created.projectCode)).status, 201);
  } finally {
    assert.equal((await setPermission(1, 1)).status, 200);
  }
  assert.ok((await (await get(admin, "/api/tasks")).json()).data.tasks.some((item) => item.title === "Admin project task"), "switched back on, everything returns");
  assert.ok((await (await get(admin, range)).json()).data.some((item) => item.title === "Supervisor on project"));
});

test("the Admin dashboard reloads its records on every section change, and an older reload never overwrites a newer save", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../app/admin/AdminDashboard.tsx", import.meta.url), "utf8");
  assert.match(source, /function choose\(next: View\) \{.*void refreshQuietly\(\); \}/);
  assert.match(source, /const started = \+\+freshness\.current;[\s\S]*?freshness\.current === started\) accept\(result\.data, startedLock\)/);
  assert.match(source, /freshness\.current \+= 1;\s*if \(!accept\(result\.data, startedLock\)\) void refreshQuietly\(\);/);
  assert.match(source, /function accept\(snapshot: Snapshot, startedLock: number\) \{\s*if \(startedLock !== lockEpoch\.current\) return false;/, "answers to requests sent before a lock are never applied");
});

test("the Admin switches also hold for the older master schedule, issue rescheduling and daily reports", async () => {
  const back = await app.ownerCookie();
  const { created } = (await (await create(back, { ...project, entry: "underway" })).json()).data;
  const sql = app.d1.sqlite;
  const get = (cookie, path) => request(path, { headers: { cookie } });
  const send = (cookie, path, body, method = "POST") => request(path, json(cookie, body, method));
  const setPermission = (projects, schedule) => send(back, "/api/owner/data", { resource: "permission", id: "Admin", payload: { projects, schedule, finance: 0, financeExport: 0 } }, "PATCH");
  const event = (title, projectCode) => send(admin, "/api/admin/data", { resource: "schedule", payload: { eventDate: melbourneDay(3), startTime: "08:00", title, assignee: "Site Supervisor 01", projectCode, notes: `${title} notes` } });
  assert.equal((await event("Project pour", created.projectCode)).status, 201);
  assert.equal((await event("General toolbox talk", "Business / General")).status, 201);
  const eventId = (title) => Number(sql.prepare("SELECT id FROM schedule_events WHERE title=? ORDER BY id DESC LIMIT 1").get(title).id);
  const openedEvent = (id) => ({ ...sql.prepare("SELECT event_date AS eventDate,start_time AS startTime,title,assignee,project_code AS projectCode,tone,notes FROM schedule_events WHERE id=?").get(id) });
  const edit = (id, title, projectCode) => send(admin, "/api/admin/data", { resource: "schedule", id, payload: { opened: openedEvent(id), eventDate: melbourneDay(4), startTime: "09:00", title, assignee: "Site Supervisor 01", projectCode, notes: "changed" } }, "PATCH");
  const issueId = Number(sql.prepare("INSERT INTO site_issue_reports (case_id,project_code,site_location,affected_trade,issue_type,summary,reporter_email,reporter_name,reported_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(created.caseId, created.projectCode, "Kew", "Tiler", "Delay", "Tiles late", "super.team@alert.test", "Site Supervisor", new Date().toISOString(), new Date().toISOString()).lastInsertRowid);
  assert.equal((await send(admin, "/api/team/eod", { projectCode: created.projectCode, summary: "Project report" })).status, 201);
  assert.equal((await send(admin, "/api/team/eod", { projectCode: "", summary: "General report" })).status, 201);
  sql.prepare("UPDATE eod_reports SET owner_note='Owner direction for the project' WHERE summary='Project report'").run();
  try {
    // Project access off, schedule on: only general schedule entries, and none can be turned into (or out of) a project entry.
    assert.equal((await setPermission(0, 1)).status, 200);
    const shown = (await (await get(admin, "/api/admin/data")).json()).data.scheduleEvents.map((item) => item.title);
    assert.ok(shown.includes("General toolbox talk") && !shown.includes("Project pour"));
    assert.equal((await event("Sneaky project event", created.projectCode)).status, 400);
    assert.equal((await edit(eventId("Project pour"), "Now general", "Business / General")).status, 400, "a project entry cannot be edited out of the project");
    assert.equal((await edit(eventId("General toolbox talk"), "Into a project", created.projectCode)).status, 400, "a general entry cannot be moved into a project");
    assert.equal(sql.prepare("SELECT title FROM schedule_events WHERE id=?").get(eventId("Project pour")).title, "Project pour");
    assert.equal((await edit(eventId("General toolbox talk"), "General toolbox talk", "Business / General")).status, 200);
    const refusedDelete = await send(admin, "/api/admin/data", { resource: "schedule", id: eventId("Project pour"), payload: { opened: openedEvent(eventId("Project pour")) } }, "DELETE");
    assert.equal(refusedDelete.status, 400);
    assert.match((await refusedDelete.json()).error, /Project access has been disabled/, "refused for the access switch, not for being out of date");
    assert.ok(sql.prepare("SELECT 1 FROM schedule_events WHERE title='Project pour'").get(), "the project entry is still there");
    // Daily reports: only the general one; no new project report.
    const reports = (await (await get(admin, "/api/team/eod")).json()).data;
    assert.deepEqual(reports.map((item) => item.summary), ["General report"]);
    assert.ok(!JSON.stringify(reports).includes("Owner direction for the project"));
    assert.equal((await send(admin, "/api/team/eod", { projectCode: created.projectCode, summary: "Sneaky report" })).status, 403);
    assert.equal((await send(admin, "/api/team/eod", { projectCode: "", summary: "Another general report" })).status, 201);
    // Project access on, schedule off: rescheduling a site problem would write to the master schedule, so it is refused and nothing changes.
    assert.equal((await setPermission(1, 0)).status, 200);
    const before = sql.prepare("SELECT COUNT(*) AS n FROM schedule_events").get().n;
    const refused = await send(admin, "/api/operations", { action: "reschedule_issue", payload: { issueId, rescheduledDate: melbourneDay(5), rescheduledTime: "07:30", rescheduledAssignee: "Site Supervisor 01", adminAction: "Move to Friday" } });
    assert.equal(refused.status, 403);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM schedule_events").get().n, before);
    assert.equal(sql.prepare("SELECT status FROM site_issue_reports WHERE id=?").get(issueId).status, "reported");
    // The Owner is not limited (the screen names the version of the issue it shows).
    const issueVersion = sql.prepare("SELECT COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='site_issue:' || i.id AND rv.case_id=i.case_id), i.updated_at) AS v FROM site_issue_reports i WHERE i.id=?").get(issueId).v;
    assert.equal((await send(back, "/api/operations", { action: "reschedule_issue", payload: { issueId, revision: issueVersion, rescheduledDate: melbourneDay(5), rescheduledTime: "07:30", rescheduledAssignee: "Site Supervisor 01", adminAction: "Move to Friday" } })).status, 200);
  } finally {
    assert.equal((await setPermission(1, 1)).status, 200);
  }
  const restored = (await (await get(admin, "/api/admin/data")).json()).data.scheduleEvents.map((item) => item.title);
  assert.ok(restored.includes("Project pour"));
  assert.ok((await (await get(admin, "/api/team/eod")).json()).data.some((item) => item.summary === "Project report"));
});

test("project numbering cannot be pushed off the end: a giant hand-typed code is ignored, and if the year really runs out the save is refused cleanly", async () => {
  const back = await app.ownerCookie();
  const sql = app.d1.sqlite;
  const first = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
  const prefix = first.projectCode.slice(0, first.projectCode.lastIndexOf("-") + 1);
  const portfolio = (code) => request("/api/owner/data", json(back, { resource: "project", payload: { code, name: `Hand-typed ${code}`, service: "Home Renovation", stage: "Admin review", progress: 0 } }));
  const giant = `${prefix}999999999999999`;
  assert.equal((await portfolio(giant)).status, 201);
  try {
    const a = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
    const b = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
    assert.match(a.projectCode, /^ATP-\d{4}-\d{5}$/, "an ordinary number, not one after the giant code");
    assert.equal(Number(b.projectCode.slice(prefix.length)), Number(a.projectCode.slice(prefix.length)) + 1, "and numbering keeps going");
    // The last 9-digit number taken by hand: the next one would not fit, so creating and approving are refused and nothing is saved.
    const last = `${prefix}999999999`;
    assert.equal((await portfolio(last)).status, 201);
    try {
      const casesBefore = sql.prepare("SELECT COUNT(*) AS n FROM workflow_cases").get().n;
      const refused = await create(back, { ...project, name: "Too Many", entry: "underway" });
      assert.equal(refused.status, 400);
      assert.match((await refused.json()).error, /No project numbers are left/);
      assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM workflow_cases").get().n, casesBefore, "nothing was saved");
      const enquiry = (await (await create(back, { ...project, name: "Waiting Enquiry", entry: "new" })).json()).data.created;
      const approval = await act(admin, enquiry.caseId, "approve_intake");
      assert.equal(approval.status, 400);
      assert.match((await approval.json()).error, /No project numbers are left/);
      assert.deepEqual({ ...sql.prepare("SELECT stage, project_code AS code FROM workflow_cases WHERE id=?").get(enquiry.caseId) }, { stage: "admin_review", code: "" });
    } finally {
      sql.prepare("DELETE FROM projects WHERE code=?").run(last);
    }
  } finally {
    sql.prepare("DELETE FROM projects WHERE code=?").run(giant);
  }
  const after = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
  assert.match(after.projectCode, /^ATP-\d{4}-\d{5}$/);
});

test("a message turned into a document request gets a new one-time key; the Manager page clears itself when access ends and ignores late answers", async () => {
  const { readFile } = await import("node:fs/promises");
  const board = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
  assert.match(board, /const setRequestDocs = \(docs: boolean\) => setMessageDrafts\(\(all\) => \(\{ \.\.\.all, \[draftKey\]: \{ \.\.\.all\[draftKey\], body: all\[draftKey\]\?\.body \?\? "", docs, key: \(all\[draftKey\]\?\.docs \?\? false\) === docs \? all\[draftKey\]\?\.key : undefined \} \}\)\);/);
  assert.match(board, /current && current\.body === body && \(current\.docs \?\? false\) === docs \?/, "only the exact message sent (text and kind) is cleared");
  const manager = await readFile(new URL("../app/manager/CustomerConversations.tsx", import.meta.url), "utf8");
  assert.match(manager, /if \(response\.status === 401 \|\| response\.status === 403\) \{\s*refused\.current = true;\s*setItems\(\[\]\); setOpen\(0\);/);
  assert.match(manager, /if \(mine !== latest\.current\) return;/, "an older read never replaces a newer one");
  assert.match(manager, /if \(!active \|\| refused\.current\) return;/, "nothing is shown again after access ended");
});

test("a portfolio editor opened before a Workflow stage change cannot put the old stage back (Owner and Admin); a fresh editor saves normally", async () => {
  const back = await app.ownerCookie();
  const sql = app.d1.sqlite;
  const { created } = (await (await create(back, { ...project, entry: "underway", statusLabel: "Planning" })).json()).data;
  const row = () => ({ ...sql.prepare("SELECT id, stage, contract_value AS contract, updated_at AS updatedAt FROM projects WHERE code=?").get(created.projectCode) });
  const label = () => sql.prepare("SELECT status_label AS label FROM case_status WHERE case_id=?").get(created.caseId).label;
  const opened = row();
  const openedEditor = openedProject(sql, opened.id);
  await tick();
  assert.equal((await act(back, created.caseId, "set_status_label", { label: "Delayed" })).status, 200);
  const base = { code: created.projectCode, name: "Kitchen", service: "Bathroom renovation", stage: "Planning", progress: 5, customerName: "Sam Customer", suburb: "Glen Waverley", startDate: "", notes: "" };
  const ownerSave = (extra) => request("/api/owner/data", json(back, { resource: "project", id: opened.id, payload: { ...base, contractValue: 5000000, balance: 0, ...extra } }, "PATCH"));
  const adminSave = (extra) => request("/api/admin/data", json(admin, { resource: "project", id: opened.id, payload: { ...base, ...extra } }, "PATCH"));
  for (const [who, save] of [["Owner", ownerSave], ["Admin", adminSave]]) {
    const stale = await save({ opened: openedEditor });
    assert.equal(stale.status, 400, who);
    assert.match((await stale.json()).error, /changed in the meantime/, who);
    assert.equal(row().stage, "Delayed", `${who}: the portfolio keeps the Workflow stage`);
    assert.equal(label(), "Delayed", `${who}: the Workflow stage is not reverted`);
    assert.equal(row().contract, 0, `${who}: nothing from the stale editor was saved`);
  }
  // Opened again: the save goes through, and its stage is the one the editor now shows.
  assert.equal((await ownerSave({ stage: "Delayed", opened: openedProject(sql, opened.id) })).status, 200);
  assert.deepEqual([row().stage, row().contract, label()], ["Delayed", 5000000, "Delayed"]);
  // An editor that does not say what it opened (a page from before this check) must be reopened; nothing is saved.
  for (const [who, save] of [["Owner", ownerSave], ["Admin", adminSave]]) {
    const blind = await save({ stage: "Construction" });
    assert.equal(blind.status, 400, who);
    assert.match((await blind.json()).error, /Close it and open it again/, who);
  }
  assert.deepEqual([row().stage, label()], ["Delayed", "Delayed"]);
});

test("a board whose sign-in ended (401) clears itself like a lock and re-checks the sign-in", async () => {
  const { readFile } = await import("node:fs/promises");
  const board = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
  assert.match(board, /const refused = \(status: number\) => status === 401 \|\| status === 403;/);
  assert.match(board, /if \(signedOut\) router\.refresh\(\);/);
  assert.equal((board.match(/if \(refused\(response\.status\)\) \{ lockedOut\(/g) ?? []).length, 4, "quiet refresh, load, action and upload all clear on 401/403");
});

test("an estimate's priced working (unit prices, margin) stays inside the company: stored with the estimate for Owner/Admin; Site Supervisor, Estimator and the customer never get it; older priced scopes are cleaned; too long is refused; visit times read like dates", async () => {
  const back = await app.ownerCookie();
  const estimator = await app.staffCookie("est.team@alert.test", "Estimator");
  const sql = app.d1.sqlite;
  const { created } = (await (await create(back, { ...project, entry: "site_visit" })).json()).data;
  const assigned = await act(admin, created.caseId, "assign_visit", { supervisorEmail: "super.team@alert.test", supervisorName: "Site Supervisor", visitAt: "2026-11-19T10:00" });
  assert.equal(assigned.status, 200, await assigned.clone().text());
  assert.equal(sql.prepare("SELECT detail FROM workflow_events WHERE case_id=? AND event_type='assign_visit'").get(created.caseId).detail, "Thursday 19 November 2026 at 10:00 am");
  sql.prepare("UPDATE workflow_cases SET stage='site_visit_approved' WHERE id=?").run(created.caseId);
  const scope = "Full bathroom renovation.\n• Waterproofing to AS 3740 — 1 lot\nTotal includes GST (10%) of $2,258.40.";
  const lines = Array.from({ length: 100 }, (_, index) => `• Labour: Item ${index + 1} with a long description of the work — 1 lot × $100.00 = $100.00`);
  const breakdown = [...lines, "Subtotal $18,820.00 · Margin $3,764.00 · GST (10%) $2,258.40 · Total $24,842.40"].join("\n");
  assert.ok(breakdown.length > 8000, "a 100-line quote");
  assert.equal((await act(estimator, created.caseId, "save_estimate", { amount: "24842.40", scope, terms: "Victorian law.", breakdown })).status, 200);
  const estimateFor = async (cookie) => ((await board(cookie))?.cases ?? []).find((item) => item.id === created.caseId)?.estimate ?? null;
  // Many later events do not push it out of sight: it is stored with the estimate.
  const many = sql.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,?,?)");
  for (let index = 0; index < 70; index += 1) many.run(created.caseId, "Admin", "a@x", "note", `Later event ${index}`, "", "internal", new Date().toISOString());
  for (const cookie of [admin, await app.ownerCookie()]) {
    const estimate = await estimateFor(cookie);
    assert.equal(estimate.breakdown, breakdown, "Owner and Admin get the whole priced working, including the last line and the margin");
  }
  assert.equal(await estimateFor(supervisor), null, "the Site Supervisor gets no estimate at all");
  const forEstimator = await estimateFor(estimator);
  assert.equal(forEstimator.breakdown, "");
  assert.doesNotMatch(JSON.stringify(forEstimator), /Margin/);
  assert.ok(!((await board(admin)).events ?? []).some((item) => /Margin \$3,764/.test(item.detail)), "the activity feed carries no prices");
  assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200);
  const customerView = JSON.stringify(await portal(created.requestCode));
  assert.ok(customerView.includes("Waterproofing to AS 3740"), "the customer reads the scope");
  assert.ok(!/Margin|\$1,450|Subcontractor|× \$/.test(customerView), "but no unit prices, cost groups or margin");
  // Too long is refused outright, and nothing changes.
  sql.prepare("UPDATE workflow_cases SET stage='estimate_declined' WHERE id=?").run(created.caseId);
  const tooLong = await act(estimator, created.caseId, "save_estimate", { amount: "1000", scope: "x", terms: "", breakdown: "y".repeat(30001) });
  assert.equal(tooLong.status, 400);
  assert.match((await tooLong.json()).error, /too long/);
  assert.equal(sql.prepare("SELECT stage FROM workflow_cases WHERE id=?").get(created.caseId).stage, "estimate_declined");
  assert.equal(sql.prepare("SELECT breakdown FROM estimate_workings WHERE case_id=?").get(created.caseId).breakdown, breakdown, "the earlier working is untouched");
});

test("an estimate written by the older calculator (prices and margin inside the scope) reaches the customer and the Estimator without them", async () => {
  const back = await app.ownerCookie();
  const estimator = await app.staffCookie("est2.team@alert.test", "Estimator");
  const sql = app.d1.sqlite;
  const { created } = (await (await create(back, { ...project, entry: "site_visit" })).json()).data;
  const legacy = [
    "Full main-bathroom renovation.",
    "• Subcontractor: Bathroom Rough-In Package — 1 each × $2,850.00 = $2,850.00",
    "• Labour: Tiling — floor-to-ceiling, 24 m² (tiler) — 40 hours × $75.00 = $3,000.00",
    "Subtotal $18,820.00 · Margin $3,764.00 · GST (10%) $2,258.40",
  ].join("\n");
  sql.prepare("INSERT INTO workflow_estimates (case_id,amount_cents,scope,terms,status,created_by,created_at,sent_at,customer_decided_at,confirmed_at) VALUES (?,?,?,?,'sent','old@x',?,?,'','')").run(created.caseId, 2484240, legacy, "Victorian law.", new Date().toISOString(), new Date().toISOString());
  sql.prepare("UPDATE workflow_cases SET stage='estimate_sent' WHERE id=?").run(created.caseId);
  const customer = await portal(created.requestCode);
  assert.equal(customer.estimate.scope, ["Full main-bathroom renovation.", "• Bathroom Rough-In Package — 1 each", "• Tiling — floor-to-ceiling, 24 m² (tiler) — 40 hours", "Total includes GST (10%) of $2,258.40."].join("\n"));
  sql.prepare("UPDATE workflow_cases SET stage='site_visit_approved' WHERE id=?").run(created.caseId);
  const forEstimator = ((await board(estimator))?.cases ?? []).find((item) => item.id === created.caseId)?.estimate;
  assert.ok(forEstimator && !/Margin|× \$|\$2,850/.test(forEstimator.scope), "the Estimator's board shows it as the customer reads it");
  const forAdmin = ((await board(admin))?.cases ?? []).find((item) => item.id === created.caseId)?.estimate;
  assert.match(forAdmin.scope, /Margin \$3,764\.00/, "Owner and Admin still have the old priced text");
});

test("a stale portfolio save can never move the workflow stage, even when another save lands in the same millisecond (Owner and Admin)", async () => {
  const back = await app.ownerCookie();
  const sql = app.d1.sqlite;
  const RealDate = Date;
  const frozen = RealDate.now() + 3_600_000;
  const freeze = () => { globalThis.Date = class extends RealDate { constructor(...args) { if (args.length) super(...args); else super(frozen); } static now() { return frozen; } }; };
  const thaw = () => { globalThis.Date = RealDate; };
  for (const [who, save] of [
    ["Owner", (id, payload) => request("/api/owner/data", json(back, { resource: "project", id, payload: { ...payload, contractValue: 0, balance: 0 } }, "PATCH"))],
    ["Admin", (id, payload) => request("/api/admin/data", json(admin, { resource: "project", id, payload }, "PATCH"))],
  ]) {
    const { created } = (await (await create(back, { ...project, entry: "underway", statusLabel: "Planning" })).json()).data;
    const row = sql.prepare("SELECT id, updated_at AS updatedAt FROM projects WHERE code=?").get(created.projectCode);
    const base = { code: created.projectCode, name: "Kitchen", service: "Bathroom renovation", progress: 5, customerName: "Sam", suburb: "Kew", startDate: "", notes: "" };
    freeze();
    try {
      // Two editors opened at the same moment; both saves land in the same millisecond.
      const opened = openedProject(sql, row.id);
      assert.equal((await save(row.id, { ...base, stage: "Delayed", opened })).status, 200, `${who}: the fresh save`);
      const stale = await save(row.id, { ...base, stage: "Construction", opened });
      assert.equal(stale.status, 400, `${who}: the stale save in the same millisecond is refused`);
      // Not only the stage: a stale save that would overwrite a note saved in the same millisecond is refused too.
      const again = openedProject(sql, row.id);
      assert.equal((await save(row.id, { ...base, stage: "Delayed", notes: "Tiles arrive Tuesday", opened: again })).status, 200, `${who}: a note is saved`);
      const staleName = await save(row.id, { ...base, stage: "Delayed", name: "Renamed by an old editor", opened: again });
      assert.equal(staleName.status, 400, `${who}: the same-millisecond stale save of another field is refused`);
      assert.deepEqual({ ...sql.prepare("SELECT name, notes FROM projects WHERE id=?").get(row.id) }, { name: "Kitchen", notes: "Tiles arrive Tuesday" }, `${who}: the note is kept`);
    } finally { thaw(); }
    assert.equal(sql.prepare("SELECT stage FROM projects WHERE id=?").get(row.id).stage, "Delayed");
    assert.equal(sql.prepare("SELECT status_label AS label FROM case_status WHERE case_id=?").get(created.caseId).label, "Delayed", `${who}: the workflow stage did not move`);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM save_tokens").get().n, 0, "no token is left behind");
  }
});

test("customer-facing wording: the estimate calculator writes the customer's scope without prices or margin; amounts keep their cents; the badge is the real stage; Workers are not told 'No task assigned' when they have project tasks", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const calculator = await read("app/workflow/EstimateCalculator.tsx");
  const scope = calculator.slice(calculator.indexOf("function buildScope"), calculator.indexOf("function buildBreakdown"));
  assert.ok(scope.length > 50 && !/Margin|unitPrice|line\.group|Contingency/.test(scope), "the customer's scope has no prices, groups, margin or contingency");
  assert.match(calculator, /onSubmit\(\{ amount: totals\.total\.toFixed\(2\), scope: buildScope\(\), terms, breakdown: buildBreakdown\(\), replacing: opened \}\)/);
  const portalSource = await read("app/workflow/CustomerWorkflowPanel.tsx");
  assert.match(portalSource, /minimumFractionDigits: cents % 100 === 0 \? 0 : 2/, "$24,842.40, never $24,842.4");
  assert.match(portalSource, /<b>\{stageLabels\[data\.stage\]\}\{Number\(data\.progress\) > 0 \?/, "the badge shows the real stage (and a percentage only once work has started); the Owner/Admin status has its own card");
  assert.match(portalSource, /data\.activity\.length === 0 && <p/, "an empty activity list explains itself");
  const worker = await read("app/worker/WorkerDashboard.tsx");
  assert.match(worker, /emptyText=\{data\.tasks\.length \? \{ title: "No other directions\."/);
});

test("when a project is completed or a request closed, the customer no longer sees the old working status (a new one can still be shown)", async () => {
  const back = await app.ownerCookie();
  const sql = app.d1.sqlite;
  const showStatus = async (caseId, title) => {
    assert.equal((await act(back, caseId, "save_customer_status", { title, detail: "" })).status, 200);
    assert.equal((await act(back, caseId, "show_customer_status", { title, detail: "" })).status, 200);
  };
  const done = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
  await showStatus(done.caseId, "Work starts Monday");
  assert.equal((await portal(done.requestCode)).customerStatus.title, "Work starts Monday");
  sql.prepare("UPDATE workflow_cases SET stage='completion_ready' WHERE id=?").run(done.caseId);
  assert.equal((await act(back, done.caseId, "complete_project", { note: "Handover done" })).status, 200);
  const completed = await portal(done.requestCode);
  assert.equal(completed.stage, "complete");
  assert.equal(completed.customerStatus, null, "the old status is gone at completion");
  await showStatus(done.caseId, "Thank you — enjoy your new bathroom");
  assert.equal((await portal(done.requestCode)).customerStatus.title, "Thank you — enjoy your new bathroom", "a final status can still be shown");
  const closed = (await (await create(back, { ...project, entry: "underway" })).json()).data.created;
  await showStatus(closed.caseId, "Waiting for the planner");
  assert.equal((await act(admin, closed.caseId, "close_case", { note: "Customer withdrew" })).status, 200);
  assert.equal((await portal(closed.requestCode)).customerStatus, null, "and when a request is closed");
});

test("the Team hub works out 'today' in Melbourne time, so the server (UTC) and the browser draw the same day before 11am", async () => {
  const { readFile } = await import("node:fs/promises");
  const hub = await readFile(new URL("../app/team/hub/TeamHub.tsx", import.meta.url), "utf8");
  assert.match(hub, /const today = new Intl\.DateTimeFormat\("en-CA", \{ timeZone: "Australia\/Melbourne"/);
  assert.doesNotMatch(hub, /const today = iso\(new Date\(\)\)/);
});
