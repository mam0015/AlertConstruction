// The construction workflow under real-life pressure (found by running the whole site locally, November 2026): slow or repeated actions,
// two people at once, old browser tabs, closed jobs, impossible dates, and who may see which documents.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";
import { asScreen, estimateDraft, estimateVersion, inspectionVersion, openedProject, visitVersion } from "./helpers/screen.mjs";

const app = await startWorker("guards");
const { request, json } = app;
const sql = app.d1.sqlite;
const owner = await app.ownerCookie();
const admin = await app.staffCookie("admin.guards@alert.test", "Admin");
const supervisor = await app.staffCookie("super.guards@alert.test", "Site Supervisor");
const estimator = await app.staffCookie("est.guards@alert.test", "Estimator");
await app.staffCookie("plumber.guards@alert.test", "Plumber"); // the trade the tasks and bookings below are for
const act = (cookie, caseId, action, payload = {}) => request("/api/workflow", json(cookie, { action, caseId, payload: asScreen(sql, caseId, action, payload) }));
const portal = async (code, ip = "198.18.60.1") => request(`/api/workflow/public?code=${encodeURIComponent(code)}`, { headers: { "cf-connecting-ip": ip } });
const decide = (code, body, ip = "198.18.60.2") => request("/api/workflow/public", { ...json(null, { code, ...body }, "PATCH"), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": ip } });
const job = { name: "Olivia Bennett", service: "Bathroom Renovations", location: "27 Kingsway, Glen Waverley VIC 3150", description: "Leaking shower", email: "olivia@example.com", phone: "0412 555 019" };
const newJob = async (entry = "underway") => (await (await request("/api/workflow/cases", json(owner, { ...job, entry }))).json()).data.created;
const stage = (caseId) => sql.prepare("SELECT stage FROM workflow_cases WHERE id=?").get(caseId).stage;
const setStage = (caseId, value) => sql.prepare("UPDATE workflow_cases SET stage=? WHERE id=?").run(value, caseId);
const estimate = (amount, scope = "Bathroom renovation.\n• Tiling — 24 m²\nTotal includes GST (10%) of $1,000.00.") => ({ amount, scope, terms: "Victorian law.", breakdown: "• Labour: Tiling — 24 m² × $100.00 = $2,400.00\nSubtotal … Margin $500.00" });

test("a slow estimate save can never replace a quote the customer has accepted, nor reopen a closed job", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  assert.equal((await act(estimator, created.caseId, "save_estimate", estimate("25000"))).status, 200);
  assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200);
  const shown = (await (await portal(created.requestCode)).json()).data.estimate.version;
  assert.equal((await decide(created.requestCode, { decision: "accept", estimateVersion: shown })).status, 200);
  assert.equal((await act(admin, created.caseId, "activate_project")).status, 200);
  const late = await act(estimator, created.caseId, "save_estimate", estimate("31000"));
  assert.equal(late.status, 400);
  assert.equal(stage(created.caseId), "active_project", "the job did not move backwards");
  assert.equal(sql.prepare("SELECT amount_cents AS cents, status FROM workflow_estimates WHERE case_id=?").get(created.caseId).cents, 2500000, "the accepted quote is untouched");
  assert.equal((await act(admin, created.caseId, "close_case", { note: "Customer withdrew" })).status, 200);
  assert.equal((await act(admin, created.caseId, "send_estimate")).status, 400, "nothing reopens a closed job");
  assert.equal(stage(created.caseId), "closed");
});

test("an old customer tab cannot accept a revised quote it never showed; a second decision changes nothing", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  await act(estimator, created.caseId, "save_estimate", estimate("25000"));
  await act(admin, created.caseId, "send_estimate");
  const firstVersion = (await (await portal(created.requestCode)).json()).data.estimate.version;
  assert.equal((await decide(created.requestCode, { decision: "decline", estimateVersion: firstVersion })).status, 200);
  await act(estimator, created.caseId, "save_estimate", estimate("32000"));
  await new Promise((resolve) => setTimeout(resolve, 5));
  await act(admin, created.caseId, "send_estimate");
  const stale = await decide(created.requestCode, { decision: "accept", estimateVersion: firstVersion });
  assert.equal(stale.status, 409, "the $25,000 tab cannot accept the $32,000 quote");
  assert.equal(stage(created.caseId), "estimate_sent");
  const current = (await (await portal(created.requestCode)).json()).data.estimate.version;
  assert.equal((await decide(created.requestCode, { decision: "accept", estimateVersion: current })).status, 200);
  assert.deepEqual({ ...sql.prepare("SELECT status, amount_cents AS cents FROM workflow_estimates WHERE case_id=?").get(created.caseId) }, { status: "customer_accepted", cents: 3200000 });
  assert.equal((await decide(created.requestCode, { decision: "decline", estimateVersion: current })).status, 400, "the decision is final");
});

test("the Admin & Owner project folder and internal progress notes stay with management", async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  await app.env.BUCKET.put("guards/invoice.pdf", "%PDF-1.4 supplier invoice margin", { httpMetadata: { contentType: "application/pdf" } });
  const invoice = Number(sql.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?)").run(created.caseId, "document", "guards/invoice.pdf", "supplier-invoice.pdf", "application/pdf", 30, "owner@x", new Date().toISOString()).lastInsertRowid);
  sql.prepare("INSERT INTO project_updates (case_id,work_date,supervisor_email,internal_update,customer_update,status,created_at) VALUES (?,?,?,?,?,'pending_admin',?)").run(created.caseId, "2026-11-20", "super.guards@alert.test", "Tiles cost us $4,100, margin thin", "Tiling has started", new Date().toISOString());
  setStage(created.caseId, "active_project");
  for (const [who, cookie] of [["Site Supervisor", supervisor], ["Estimator", estimator]]) {
    const boardText = await (await request("/api/workflow", { headers: { cookie } })).text();
    assert.ok(!boardText.includes("supplier-invoice.pdf"), `${who} is not sent the project folder`);
    assert.equal((await request(`/api/workflow/files?id=${invoice}`, { headers: { cookie } })).status, 404, `${who} cannot download it`);
  }
  assert.ok(!(await (await request("/api/workflow", { headers: { cookie: estimator } })).text()).includes("margin thin"), "the Estimator gets the customer copy of updates only");
  assert.equal((await request(`/api/workflow/files?id=${invoice}`, { headers: { cookie: admin } })).status, 200, "Admin can");
});

test("progress updates: one photo can back only one update; a returned update is sent again with its photos; only waiting updates can be returned; closed jobs take no new decisions", async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  const photo = Number(sql.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?)").run(created.caseId, "progress", `guards/p-${created.caseId}.jpg`, "membrane.jpg", "image/jpeg", 10, "super.guards@alert.test", new Date().toISOString()).lastInsertRowid);
  const update = (text) => act(supervisor, created.caseId, "submit_progress_update", { workDate: "2026-11-20", internalUpdate: text, customerUpdate: text, fileIds: [photo] });
  const both = await Promise.all([update("first"), update("second")]);
  assert.deepEqual(both.map((answer) => answer.status).sort(), [200, 400], "the same photo cannot back two updates");
  const updateId = Number(sql.prepare("SELECT id FROM project_updates WHERE case_id=?").get(created.caseId).id);
  assert.equal((await act(admin, created.caseId, "reject_update", { updateId, note: "Please reword" })).status, 200);
  const again = await act(supervisor, created.caseId, "submit_progress_update", { workDate: "2026-11-20", internalUpdate: "reworded", customerUpdate: "reworded", fileIds: [] });
  assert.equal(again.status, 200, "the returned update's photo is used again");
  const fresh = Number(sql.prepare("SELECT id FROM project_updates WHERE case_id=? AND status='pending_admin'").get(created.caseId).id);
  assert.equal((await act(admin, created.caseId, "admin_approve_update", { updateId: fresh })).status, 200);
  assert.equal((await act(owner, created.caseId, "owner_approve_update", { updateId: fresh })).status, 200);
  assert.equal((await act(admin, created.caseId, "reject_update", { updateId: fresh, note: "too late" })).status, 400, "a published update stays published");
  assert.equal((await act(admin, created.caseId, "reject_update", { updateId: 999999, note: "nothing" })).status, 400);
  assert.equal((await act(owner, created.caseId, "propose_change", { title: "Move the vanity 300 mm", detail: "Better clearance" })).status, 200);
  assert.equal((await act(owner, created.caseId, "propose_change", { title: "Move the vanity 300 mm", detail: "Better clearance" })).status, 200, "pressed twice");
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM change_proposals WHERE case_id=?").get(created.caseId).n, 1, "saved once");
  const proposalId = Number(sql.prepare("SELECT id FROM change_proposals WHERE case_id=?").get(created.caseId).id);
  assert.equal((await act(admin, created.caseId, "close_case", { note: "Cancelled" })).status, 200);
  assert.equal((await decide(created.requestCode, { decision: "accept", proposalId, reply: "ok" })).status, 400, "a closed job takes no new decisions");
  assert.equal(sql.prepare("SELECT stage FROM projects WHERE code=?").get(created.projectCode).stage, "Closed", "the portfolio shows it closed");
});

test("a customer's reply with conditions is saved in full, or refused when too long — never cut short", async () => {
  const created = await newJob("underway");
  await act(owner, created.caseId, "propose_change", { title: "Extra power point", detail: "Next to the vanity" });
  const proposalId = Number(sql.prepare("SELECT id FROM change_proposals WHERE case_id=?").get(created.caseId).id);
  const long = `${"I agree, ".repeat(70)}but only if it costs under $300.`;
  assert.equal((await decide(created.requestCode, { decision: "accept", proposalId, reply: "x".repeat(2001) })).status, 400);
  assert.equal((await decide(created.requestCode, { decision: "accept", proposalId, reply: long })).status, 200);
  assert.equal(sql.prepare("SELECT customer_reply AS reply FROM change_proposals WHERE id=?").get(proposalId).reply, long.trim());
});

test("double presses and retries save tasks and calendar bookings once; impossible dates and times are refused", async () => {
  const created = await newJob("underway");
  const workerTask = () => request("/api/worker/manage", json(admin, { action: "create_task", payload: { caseId: created.caseId, workerEmail: "plumber.guards@alert.test", title: "Rough-in", instructions: "Monday 7am" } }));
  assert.equal((await request("/api/worker/manage", json(admin, { action: "assign_worker", payload: { caseId: created.caseId, workerEmail: "plumber.guards@alert.test" } }))).status, 200);
  await Promise.all([workerTask(), workerTask()]);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM worker_tasks WHERE case_id=? AND title='Rough-in'").get(created.caseId).n, 1);
  const teamTask = () => request("/api/tasks/manage", json(owner, { action: "create_task", payload: { assigneeEmail: "admin.guards@alert.test", caseId: created.caseId, title: "Call Olivia", instructions: "Today" } }));
  await Promise.all([teamTask(), teamTask()]);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM team_tasks WHERE title='Call Olivia'").get().n, 1);
  const book = (dates, startTime = "07:00") => request("/api/team/calendar", json(admin, { assigneeEmail: "plumber.guards@alert.test", title: "Rough-in at Glen Waverley", startTime, projectCode: created.projectCode, dates }));
  await Promise.all([book(["2026-11-23"]), book(["2026-11-23"])]);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM calendar_entries WHERE title='Rough-in at Glen Waverley'").get().n, 1);
  assert.equal((await book(["2026-02-30"])).status, 400, "30 February does not exist");
  assert.equal((await book(["2026-11-24"], "99:99")).status, 400);
  const visit = await newJob("site_visit");
  const assign = await act(admin, visit.caseId, "assign_visit", { supervisorEmail: "super.guards@alert.test", supervisorName: "Site Supervisor", visitAt: "2026-02-30T29:99" });
  assert.equal(assign.status, 400);
});

test("an enquiry can have a follow-up task; a project number used by a customer workflow cannot be renamed", async () => {
  const enquiry = await newJob("new");
  assert.equal((await request("/api/tasks/manage", json(owner, { action: "create_task", payload: { assigneeEmail: "admin.guards@alert.test", caseId: enquiry.caseId, title: "Call about the enquiry", instructions: "Today" } }))).status, 200);
  const active = await newJob("underway");
  const row = sql.prepare("SELECT id, updated_at AS updatedAt FROM projects WHERE code=?").get(active.projectCode);
  const rename = await request("/api/owner/data", json(owner, { resource: "project", id: row.id, payload: { code: "ATP-2026-99999", name: "Kitchen", service: "Bathroom Renovations", stage: "Scheduled", progress: 5, contractValue: 0, balance: 0, opened: openedProject(sql, row.id) } }, "PATCH"));
  assert.equal(rename.status, 400);
  assert.match((await rename.json()).error, /cannot be changed/);
});

test("a correct project code always opens the project, even after wrong guesses from the same connection; malformed lookups are refused politely", async () => {
  const created = await newJob("underway");
  for (let index = 0; index < 13; index += 1) await portal(`REQ-2026-${"0".repeat(31)}${(index % 10)}`, "198.18.61.1");
  assert.equal((await portal("REQ-2026-00000000000000000000000000000000", "198.18.61.1")).status, 429, "wrong guesses are limited");
  assert.equal((await portal(created.requestCode, "198.18.61.1")).status, 200, "the right code still works");
  const reads = await Promise.all(Array.from({ length: 24 }, () => portal(created.requestCode, "198.18.61.2")));
  assert.ok(reads.every((answer) => answer.status === 200), "a customer refreshing many times is never locked out");
  for (const body of [null, { method: "email", contact: 12345, location: "Glen Waverley" }]) {
    const answer = await request("/api/workflow/public/access", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", origin: "http://localhost", "cf-connecting-ip": "198.18.61.3" } });
    assert.equal(answer.status, 400);
  }
});

test("screens: the Estimator can price a declined estimate again; a priced line must be named; the customer's support link goes to support", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const board = await read("app/workflow/WorkflowBoard.tsx");
  assert.match(board, /\["site_visit_approved", "estimate_ready", "estimate_declined"\]\.includes\(selected\.stage\) \? <>/);
  const calculator = await read("app/workflow/EstimateCalculator.tsx");
  assert.match(calculator, /const ready = totals\.total > 0 && !unnamedPriced &&/);
  assert.match(calculator, /lines\.filter\(\(line\) => line\.description\.trim\(\)\)\.reduce/);
  const track = await read("app/track/[code]/page.tsx");
  assert.ok(!track.includes('href="/#request">Secure support') && track.includes('href="/support">Secure support'));
});

// ---- Codex run-the-site review, round 15 (November 2026): every approve / send / accept names the exact version on screen ----
const photoFor = (caseId, category) => Number(sql.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?)").run(caseId, category, `guards/${category}-${caseId}-${Math.random()}.jpg`, `${category}.jpg`, "image/jpeg", 10, "super.guards@alert.test", new Date().toISOString()).lastInsertRowid);
const raw = (cookie, caseId, action, payload = {}) => request("/api/workflow", json(cookie, { action, caseId, payload }));
const tickMs = () => new Promise((resolve) => setTimeout(resolve, 5));
const events = (caseId, type) => sql.prepare("SELECT actor_role AS role, title, detail FROM workflow_events WHERE case_id=? AND event_type=? ORDER BY id").all(caseId, type).map((row) => ({ ...row }));

test("a decision on the estimate must say which estimate it is: without the version nothing changes", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  await act(estimator, created.caseId, "save_estimate", estimate("25000"));
  assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200);
  for (const body of [{ decision: "accept" }, { decision: "accept", estimateVersion: "" }, { decision: "decline", estimateVersion: 12 }, { decision: "accept", sentAt: "anything" }]) {
    assert.equal((await decide(created.requestCode, body)).status, 409, JSON.stringify(body));
  }
  assert.equal(stage(created.caseId), "estimate_sent");
  assert.equal(sql.prepare("SELECT status FROM workflow_estimates WHERE case_id=?").get(created.caseId).status, "sent");
});

test("a slow approval never approves a site report or quality inspection that was sent again since; approvals without a version are refused", async () => {
  const created = await newJob("site_visit");
  assert.equal((await act(admin, created.caseId, "assign_visit", { supervisorEmail: "super.guards@alert.test", supervisorName: "Site Supervisor", visitAt: "2026-11-19T10:00" })).status, 200);
  const report = (summary) => act(supervisor, created.caseId, "submit_site_visit", { visitDate: "2026-11-19", summary, findings: "Leak behind the shower", recommendations: "Strip and re-waterproof", fileIds: [photoFor(created.caseId, "site_visit")] });
  assert.equal((await report("First visit")).status, 200);
  const first = visitVersion(sql, created.caseId);
  assert.equal((await act(admin, created.caseId, "review_site_visit", { decision: "changes_requested", note: "Add the moisture readings", revision: first })).status, 200);
  await tickMs();
  assert.equal((await report("Second visit with moisture readings")).status, 200);
  const slow = await act(admin, created.caseId, "review_site_visit", { decision: "approved", note: "", revision: first });
  assert.equal(slow.status, 400, "the approval of the first report does not approve the second");
  assert.equal(stage(created.caseId), "site_visit_submitted");
  assert.equal((await raw(admin, created.caseId, "review_site_visit", { decision: "approved", note: "" })).status, 409, "no version: refused");
  assert.equal(stage(created.caseId), "site_visit_submitted");
  assert.equal((await act(admin, created.caseId, "review_site_visit", { decision: "approved", note: "" })).status, 200, "the version on screen now");
  assert.equal(stage(created.caseId), "site_visit_approved");

  const active = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(active.caseId);
  setStage(active.caseId, "active_project");
  const inspect = (summary) => act(supervisor, active.caseId, "submit_quality_inspection", { inspectedAt: "2026-12-01", summary, defects: "", fileIds: [photoFor(active.caseId, "quality")] });
  assert.equal((await inspect("First inspection")).status, 200);
  const v1 = inspectionVersion(sql, active.caseId);
  assert.equal((await act(admin, active.caseId, "review_quality_inspection", { decision: "changes_requested", note: "Silicone gap at the screen", revision: v1 })).status, 200);
  await tickMs();
  assert.equal((await inspect("Second inspection")).status, 200);
  assert.equal((await act(admin, active.caseId, "review_quality_inspection", { decision: "approved", note: "", revision: v1 })).status, 400);
  assert.equal((await raw(admin, active.caseId, "review_quality_inspection", { decision: "approved", note: "" })).status, 409);
  assert.equal(stage(active.caseId), "quality_inspection");
});

test("Send estimate sends only the draft on screen: a newer draft saved meanwhile is not sent unseen", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  await act(estimator, created.caseId, "save_estimate", estimate("25000"));
  const onScreen = estimateDraft(sql, created.caseId);
  await tickMs();
  await act(estimator, created.caseId, "save_estimate", estimate("38000", "Bigger scope.\n• Tiling — 40 m²"));
  assert.equal((await raw(admin, created.caseId, "send_estimate", onScreen)).status, 400, "the $25,000 screen cannot send the $38,000 draft");
  assert.equal((await raw(admin, created.caseId, "send_estimate", {})).status, 409, "no version: refused");
  assert.equal(stage(created.caseId), "estimate_ready");
  assert.equal(events(created.caseId, "send_estimate").length, 0, "nothing in the history for a send that did not happen");
  assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200, "the draft on screen now");
  assert.deepEqual({ ...sql.prepare("SELECT status, amount_cents AS cents FROM workflow_estimates WHERE case_id=?").get(created.caseId) }, { status: "sent", cents: 3800000 });
  assert.equal(events(created.caseId, "send_estimate").length, 1);
});

test("a history line is saved in the same transaction as the step it describes", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  await act(estimator, created.caseId, "save_estimate", estimate("25000"));
  const batches = [];
  const original = app.d1.batch;
  app.d1.batch = async (statements) => { batches.push(statements.map((statement) => statement.sql ?? "")); return original.call(app.d1, statements); };
  try {
    assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200);
    assert.equal((await act(admin, created.caseId, "close_case", { note: "Customer went elsewhere" })).status, 200);
  } finally { app.d1.batch = original; }
  for (const marker of [/stage='estimate_sent'/, /stage='closed'/]) {
    const batch = batches.find((sqls) => sqls.some((text) => marker.test(text)));
    assert.ok(batch && batch.some((text) => /INSERT INTO workflow_events/.test(text)), `the history line for ${marker} is in the same batch`);
  }
});

test("the Owner cannot delete a project a customer's workflow uses; an unlinked project can still be deleted", async () => {
  const linked = await newJob("underway");
  const row = sql.prepare("SELECT id FROM projects WHERE code=?").get(linked.projectCode);
  const refused = await request("/api/owner/data", json(owner, { resource: "project", id: row.id }, "DELETE"));
  assert.equal(refused.status, 400);
  assert.match((await refused.json()).error, /linked to a customer's request/);
  assert.ok(sql.prepare("SELECT 1 FROM projects WHERE id=?").get(row.id), "the project is still there");
  assert.equal((await request("/api/owner/data", json(owner, { resource: "project", payload: { code: "ATP-2026-55501", name: "Office fit-out", service: "Commercial", stage: "Planning", progress: 0, contractValue: 0, balance: 0 } }))).status, 201);
  const loose = sql.prepare("SELECT id FROM projects WHERE code='ATP-2026-55501'").get();
  assert.equal((await request("/api/owner/data", json(owner, { resource: "project", id: loose.id }, "DELETE"))).status, 200);
  assert.equal(sql.prepare("SELECT 1 FROM projects WHERE id=?").get(loose.id), undefined);
});

test("calendar: a booking for another project or with other notes is a separate booking; a real double press is saved once and reported", async () => {
  const one = await newJob("underway");
  const two = await newJob("underway");
  const book = (projectCode, notes) => request("/api/team/calendar", json(owner, { assigneeEmail: "plumber.guards@alert.test", title: "Rough-in", startTime: "07:00", projectCode, notes, dates: ["2026-12-02"] }));
  const first = await book(one.projectCode, "Bring the long drill");
  assert.equal(first.status, 201);
  assert.deepEqual((await first.json()).data, { created: 1, alreadySaved: 0 });
  assert.equal((await book(two.projectCode, "Bring the long drill")).status, 201, "another project");
  assert.equal((await book(one.projectCode, "Gas fitter attends too")).status, 201, "other notes");
  const repeat = await book(one.projectCode, "Bring the long drill");
  assert.equal(repeat.status, 200);
  assert.deepEqual((await repeat.json()).data, { created: 0, alreadySaved: 1 });
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM calendar_entries WHERE title='Rough-in' AND entry_date='2026-12-02'").get().n, 3);
  assert.equal((await request("/api/team/calendar", json(owner, { assigneeEmail: "plumber.guards@alert.test", title: "Long notes", startTime: "07:00", projectCode: one.projectCode, notes: "x".repeat(1001), dates: ["2026-12-03"] }))).status, 400, "too long is refused, never cut");
});

test("management's return notes to the Site Supervisor are not shown to the Estimator", async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  setStage(created.caseId, "active_project");
  assert.equal((await act(supervisor, created.caseId, "submit_progress_update", { workDate: "2026-11-20", internalUpdate: "Membrane down", customerUpdate: "Waterproofing done", fileIds: [photoFor(created.caseId, "progress")] })).status, 200);
  const updateId = Number(sql.prepare("SELECT id FROM project_updates WHERE case_id=?").get(created.caseId).id);
  assert.equal((await act(admin, created.caseId, "reject_update", { updateId, note: "Customer is difficult, keep it vague" })).status, 200);
  const text = async (cookie) => (await request("/api/workflow", { headers: { cookie } })).text();
  assert.ok(!(await text(estimator)).includes("keep it vague"), "the Estimator does not get the return note");
  assert.ok((await text(supervisor)).includes("keep it vague"), "the Site Supervisor it was written for does");
});

test("a progress update from a Site Supervisor who was replaced meanwhile is refused (the hand-over happens between the check and the save)", async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  setStage(created.caseId, "active_project");
  const original = app.d1.batch;
  app.d1.batch = async (statements) => {
    if (statements.some((statement) => /INSERT INTO project_updates/.test(statement.sql ?? ""))) sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='someone.else@alert.test' WHERE id=?").run(created.caseId);
    return original.call(app.d1, statements);
  };
  let answer;
  try {
    answer = await act(supervisor, created.caseId, "submit_progress_update", { workDate: "2026-11-20", internalUpdate: "late", customerUpdate: "late", fileIds: [photoFor(created.caseId, "progress")] });
  } finally { app.d1.batch = original; }
  assert.equal(answer.status, 400);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM project_updates WHERE case_id=?").get(created.caseId).n, 0, "nothing was saved for the former supervisor");
  assert.equal(events(created.caseId, "submit_progress_update").length, 0);
});

test("the Owner standing in for Admin is recorded as the Owner; closing a job with a stage name shows Closed", async () => {
  const fresh = await newJob("new");
  assert.equal((await act(owner, fresh.caseId, "customer_contacted", { note: "Called Olivia, site visit Thursday suits" })).status, 200);
  assert.deepEqual(events(fresh.caseId, "customer_contacted").map((line) => [line.role, line.title]), [["Owner", "Owner contacted the customer"]]);
  const created = (await (await request("/api/workflow/cases", json(owner, { ...job, entry: "underway", statusLabel: "Planning" }))).json()).data.created;
  assert.equal((await act(owner, created.caseId, "close_case", { note: "Customer moved interstate" })).status, 200);
  assert.deepEqual(events(created.caseId, "close_case").map((line) => line.role), ["Owner"]);
  assert.equal(sql.prepare("SELECT status_label AS label FROM case_status WHERE case_id=?").get(created.caseId).label, "Closed");
  assert.equal(sql.prepare("SELECT stage FROM projects WHERE code=?").get(created.projectCode).stage, "Closed");
});

test("screens (round 15): the portal offers decisions only while one is really waiting; a withdrawn change says so; the board sends the versions; Admin's schedule says milestones", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const portalSource = await read("app/workflow/CustomerWorkflowPanel.tsx");
  assert.match(portalSource, /data\.estimate\.status === "sent" && data\.stage === "estimate_sent" \?/);
  assert.match(portalSource, /proposal\.status === "sent" && data\.stage === "active_project" \?/);
  assert.match(portalSource, /Withdrawn — no decision is needed for this change\./);
  const board = await read("app/workflow/WorkflowBoard.tsx");
  assert.match(board, /action\("send_estimate", \{ revision: selected\.estimate\?\.revision \?\? "", amountCents: selected\.estimate\?\.amountCents \?\? 0, scope: selected\.estimate\?\.scope \?\? "" \}/);
  const adminScreen = await read("app/admin/AdminDashboard.tsx");
  assert.ok(adminScreen.includes("＋ Add milestone") && !adminScreen.includes("Send time & task") && adminScreen.includes('href="/team/hub"'));
  assert.match(adminScreen, /opened: projectModal === "new" \? undefined : projectModal/);
  assert.match(await read("app/owner/OwnerDashboard.tsx"), /opened:projectModal==="new"\?undefined:projectModal/);
});

// ---- Codex run-the-site review, round 16 (November 2026) ----
test("two Site Supervisor tabs: a delayed report from the older tab is refused, so the job always has one current report that Admin can review", async () => {
  const created = await newJob("site_visit");
  assert.equal((await act(admin, created.caseId, "assign_visit", { supervisorEmail: "super.guards@alert.test", supervisorName: "Site Supervisor", visitAt: "2026-11-19T10:00" })).status, 200);
  const send = (summary, replacing) => raw(supervisor, created.caseId, "submit_site_visit", { visitDate: "2026-11-19", summary, findings: "Leak", recommendations: "Re-waterproof", fileIds: [photoFor(created.caseId, "site_visit")], replacing });
  assert.equal((await send("Tab B report", "")).status, 200, "the first report");
  const bVersion = visitVersion(sql, created.caseId);
  assert.equal((await act(admin, created.caseId, "review_site_visit", { decision: "changes_requested", note: "Add moisture readings", revision: bVersion })).status, 200);
  const late = await send("Tab A report, opened before B was sent", "");
  assert.equal(late.status, 409, "the older tab is refused");
  assert.match((await late.json()).error, /newer site visit report/);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM site_visit_reports WHERE case_id=?").get(created.caseId).n, 1, "still one report");
  assert.equal((await raw(supervisor, created.caseId, "submit_site_visit", { visitDate: "2026-11-19", summary: "x", findings: "x", recommendations: "x", fileIds: [photoFor(created.caseId, "site_visit")] })).status, 409, "a report that does not say what it replaces is refused");
  await tickMs();
  assert.equal((await send("Corrected report with moisture readings", bVersion)).status, 200, "the corrected report from the current screen");
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM site_visit_reports WHERE case_id=?").get(created.caseId).n, 1, "it replaced the returned one");
  const shown = (await (await request("/api/workflow", { headers: { cookie: admin } })).json()).data.cases.find((item) => item.id === created.caseId).visitReport;
  assert.equal(shown.summary, "Corrected report with moisture readings", "the board shows the current report");
  assert.equal((await act(admin, created.caseId, "review_site_visit", { decision: "approved", note: "", revision: shown.revision })).status, 200, "and Admin can approve it");
  assert.equal(stage(created.caseId), "site_visit_approved");
});

test("an older calculator never silently replaces a newer estimate; after its own save it keeps working on what it saved", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  const save = (amount, scope, replacing) => raw(estimator, created.caseId, "save_estimate", { ...estimate(amount, scope), replacing });
  const first = await save("26000", "Base bathroom", "");
  assert.equal(first.status, 200);
  const firstRevision = (await first.json()).revision;
  assert.equal(firstRevision, estimateVersion(sql, created.caseId), "the answer names the saved version");
  await tickMs();
  assert.equal((await raw(owner, created.caseId, "save_estimate", { ...estimate("39000", "Latest agreed structural scope"), replacing: firstRevision })).status, 200, "the Owner saves a newer estimate");
  const stale = await save("26500", "Old tab: base bathroom plus tap", firstRevision);
  assert.equal(stale.status, 409);
  assert.match((await stale.json()).error, /newer estimate/);
  assert.deepEqual({ ...sql.prepare("SELECT amount_cents AS cents, scope FROM workflow_estimates WHERE case_id=?").get(created.caseId) }, { cents: 3900000, scope: "Latest agreed structural scope" }, "the newer estimate is kept");
  assert.equal((await save("1000", "first save on a job that already has one", "")).status, 409, "\"no estimate yet\" is checked too");
  assert.equal((await raw(estimator, created.caseId, "save_estimate", estimate("1000"))).status, 409, "a save that does not say what it replaces is refused");
  const latest = estimateVersion(sql, created.caseId);
  assert.equal((await save("41000", "Replaced on purpose after checking", latest)).status, 200, "replacing the newer one on purpose works");
});

test("the Estimator does not receive management's notes inside the site report and the quality inspection", async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  sql.prepare("INSERT INTO site_visit_reports (case_id,supervisor_email,visit_date,summary,findings,recommendations,internal_notes,status,admin_note,submitted_at,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(created.caseId, "super.guards@alert.test", "2026-11-19", "Visit", "Leak", "Fix", "", "approved", "VISIT_PRIVATE supplier margin 19%", new Date().toISOString(), new Date().toISOString());
  setStage(created.caseId, "active_project");
  assert.equal((await act(supervisor, created.caseId, "submit_quality_inspection", { inspectedAt: "2026-12-01", summary: "Finished", defects: "", fileIds: [photoFor(created.caseId, "quality")] })).status, 200);
  assert.equal((await act(admin, created.caseId, "review_quality_inspection", { decision: "approved", note: "ADMIN_PRIVATE supplier cost $8123" })).status, 200);
  assert.equal((await act(owner, created.caseId, "complete_project", { note: "OWNER_PRIVATE final profit $4222" })).status, 200);
  const forEstimator = await (await request("/api/workflow", { headers: { cookie: estimator } })).text();
  for (const secret of ["VISIT_PRIVATE", "ADMIN_PRIVATE", "OWNER_PRIVATE"]) assert.ok(!forEstimator.includes(secret), `${secret} is not sent to the Estimator`);
  assert.ok((await (await request("/api/workflow", { headers: { cookie: admin } })).text()).includes("ADMIN_PRIVATE"), "management still has it");
});

test("a change still waiting for the customer is on hold (not 'withdrawn') during the final inspection, and is withdrawn when the job is completed", async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  assert.equal((await act(owner, created.caseId, "propose_change", { title: "Optional heated towel rail", detail: "$150 extra" })).status, 200);
  const proposalId = Number(sql.prepare("SELECT id FROM change_proposals WHERE case_id=?").get(created.caseId).id);
  assert.equal((await act(supervisor, created.caseId, "submit_quality_inspection", { inspectedAt: "2026-12-01", summary: "Finished", defects: "", fileIds: [photoFor(created.caseId, "quality")] })).status, 200);
  assert.equal(sql.prepare("SELECT status FROM change_proposals WHERE id=?").get(proposalId).status, "sent", "still waiting during the inspection");
  assert.equal((await act(admin, created.caseId, "review_quality_inspection", { decision: "approved", note: "" })).status, 200);
  assert.equal((await act(owner, created.caseId, "complete_project", { note: "" })).status, 200);
  assert.equal(sql.prepare("SELECT status FROM change_proposals WHERE id=?").get(proposalId).status, "withdrawn", "completing withdraws it");
  assert.equal((await decide(created.requestCode, { decision: "accept", proposalId, reply: "" })).status, 400);
  const { readFile } = await import("node:fs/promises");
  const portalSource = await readFile(new URL("../app/workflow/CustomerWorkflowPanel.tsx", import.meta.url), "utf8");
  assert.match(portalSource, /proposal\.status === "withdrawn" \? "Withdrawn — no decision is needed for this change\."/, "Withdrawn only for a withdrawn change");
  assert.match(portalSource, /proposal\.status === "sent" && \["quality_inspection", "completion_ready"\]\.includes\(data\.stage\) \? "On hold while we inspect the finished work/);
});

// ---- Codex run-the-site review, round 17 (November 2026): versions are unique and compared exactly ----
const frozenClock = () => {
  const RealDate = Date;
  const frozen = RealDate.now() + 7_200_000;
  globalThis.Date = class extends RealDate { constructor(...args) { if (args.length) super(...args); else super(frozen); } static now() { return frozen; } };
  return () => { globalThis.Date = RealDate; };
};

test("every save gets its own version, so a stale calculator or an old review screen is refused even when everything happens in the same millisecond", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  const thaw = frozenClock();
  try {
    const first = await raw(estimator, created.caseId, "save_estimate", { ...estimate("25000"), replacing: "" });
    const opened = (await first.json()).revision;
    assert.equal((await raw(owner, created.caseId, "save_estimate", { ...estimate("39000", "Latest agreed structural scope"), replacing: opened })).status, 200);
    const stale = await raw(estimator, created.caseId, "save_estimate", { ...estimate("26000", "Old tab"), replacing: opened });
    assert.equal(stale.status, 409, "same millisecond, different versions");
    assert.equal(sql.prepare("SELECT amount_cents AS c FROM workflow_estimates WHERE case_id=?").get(created.caseId).c, 3900000);
  } finally { thaw(); }

  const visit = await newJob("site_visit");
  assert.equal((await act(admin, visit.caseId, "assign_visit", { supervisorEmail: "super.guards@alert.test", supervisorName: "Site Supervisor", visitAt: "2026-11-19T10:00" })).status, 200);
  const thawAgain = frozenClock();
  try {
    const report = (summary) => act(supervisor, visit.caseId, "submit_site_visit", { visitDate: "2026-11-19", summary, findings: "x", recommendations: "x", fileIds: [photoFor(visit.caseId, "site_visit")] });
    assert.equal((await report("FIRST report")).status, 200);
    const oldScreen = visitVersion(sql, visit.caseId);
    assert.equal((await act(admin, visit.caseId, "review_site_visit", { decision: "changes_requested", note: "Redo", revision: oldScreen })).status, 200);
    assert.equal((await report("SECOND report the old Admin screen never showed")).status, 200);
    assert.equal((await act(admin, visit.caseId, "review_site_visit", { decision: "approved", note: "", revision: oldScreen })).status, 400, "the old screen cannot approve the second report");
    assert.equal(stage(visit.caseId), "site_visit_submitted");
  } finally { thawAgain(); }
});

test("versions are compared exactly as the screen received them (older records whose timestamps contain spaces still work)", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "estimate_declined");
  sql.prepare("INSERT INTO workflow_estimates (case_id,amount_cents,scope,terms,status,created_by,created_at,sent_at,customer_decided_at,confirmed_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(created.caseId, 100000, "Old", "", "customer_declined", "old@x", " 2026-10-01T00:00:00.000Z ", "2026-10-01", "2026-10-02", "");
  const shown = (await (await request("/api/workflow", { headers: { cookie: estimator } })).json()).data.cases.find((item) => item.id === created.caseId).estimate.revision;
  assert.equal(shown, " 2026-10-01T00:00:00.000Z ", "the board shows the stored value as it is");
  assert.equal((await raw(estimator, created.caseId, "save_estimate", { ...estimate("1200"), replacing: shown })).status, 200, "and saving with it works");

  const visit = await newJob("site_visit");
  sql.prepare("UPDATE workflow_cases SET stage='visit_changes_requested', assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(visit.caseId);
  sql.prepare("INSERT INTO site_visit_reports (case_id,supervisor_email,visit_date,summary,findings,recommendations,internal_notes,status,admin_note,submitted_at,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(visit.caseId, "super.guards@alert.test", "2026-10-01", "Old", "Old", "Old", "", "changes_requested", "Redo", " ", "2026-10-02");
  const report = (await (await request("/api/workflow", { headers: { cookie: supervisor } })).json()).data.cases.find((item) => item.id === visit.caseId).visitReport;
  const resent = await raw(supervisor, visit.caseId, "submit_site_visit", { visitDate: "2026-11-19", summary: "Corrected", findings: "x", recommendations: "x", fileIds: [photoFor(visit.caseId, "site_visit")], replacing: report.revision });
  assert.equal(resent.status, 200, await resent.clone().text());
  assert.ok((await resent.json()).revision, "the answer names the new version");
});

test("screens (round 17): the site report form keeps the version it was opened on and asks before replacing a newer report; staff see a withdrawn change as withdrawn", async () => {
  const { readFile } = await import("node:fs/promises");
  const board = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
  assert.match(board, /replacing: visitOpened \}/, "the form sends the version it was opened on, not the refreshed one");
  assert.match(board, /if \(sent && sent\.revision\) setVisitOpened\(sent\.revision\);/, "it moves on only with its own successful send");
  assert.match(board, /setVisitOpened\(selected\.visitReport\?\.revision \?\? ""\);\n/, "captured when the job is opened");
  assert.match(board, /Replace it with my report/);
  assert.match(board, /proposal\.status === "withdrawn" \? "Withdrawn \(no customer decision\)"/);
  assert.ok(!board.includes(': "Customer declined"}</span>'), "not every other status is called declined");
});

test("an older quality-inspection form cannot overwrite an inspection sent since; the same screen can correct after a rectification request", async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  setStage(created.caseId, "active_project");
  const inspect = (summary, replacing) => raw(supervisor, created.caseId, "submit_quality_inspection", { inspectedAt: "2026-12-01", summary, defects: "", fileIds: [photoFor(created.caseId, "quality")], replacing });
  const first = await inspect("NEW inspection: screen gap 3 mm", "");
  assert.equal(first.status, 200);
  const sent = (await first.json()).revision;
  assert.equal(sent, inspectionVersion(sql, created.caseId), "the answer names the new version");
  assert.equal((await act(admin, created.caseId, "review_quality_inspection", { decision: "changes_requested", note: "Fix the screen gap" })).status, 200);
  const old = await inspect("OLD unsent form: no defects", "");
  assert.equal(old.status, 409, "the older form is refused");
  assert.match((await old.json()).error, /newer quality inspection/);
  assert.equal(sql.prepare("SELECT summary FROM quality_inspections WHERE case_id=?").get(created.caseId).summary, "NEW inspection: screen gap 3 mm");
  assert.equal((await raw(supervisor, created.caseId, "submit_quality_inspection", { inspectedAt: "2026-12-01", summary: "x", defects: "", fileIds: [photoFor(created.caseId, "quality")] })).status, 409, "no version: refused");
  assert.equal((await inspect("Corrected: screen re-sealed", sent)).status, 200, "the same screen corrects after the rectification request");
  assert.equal(stage(created.caseId), "quality_inspection");
  const { readFile } = await import("node:fs/promises");
  const board = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
  assert.match(board, /replacing: qualityOpened \}/);
  assert.match(board, /if \(sent && sent\.revision\) setQualityOpened\(sent\.revision\);/);
});

test("each sent quote has its own decision key: an old customer tab cannot accept a re-priced quote even when both were sent in the same millisecond; the key is the customer's only", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  const thaw = frozenClock();
  try {
    await act(estimator, created.caseId, "save_estimate", estimate("25000"));
    assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200);
    const oldTab = (await (await portal(created.requestCode)).json()).data.estimate;
    assert.equal((await decide(created.requestCode, { decision: "decline", estimateVersion: oldTab.version })).status, 200, "declined from another tab");
    await act(estimator, created.caseId, "save_estimate", estimate("39000", "Re-priced"));
    assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200);
    const newTab = (await (await portal(created.requestCode)).json()).data.estimate;
    assert.equal(newTab.sentAt, oldTab.sentAt, "same send time (frozen clock)");
    assert.notEqual(newTab.version, oldTab.version, "but a different decision key");
    assert.equal((await decide(created.requestCode, { decision: "accept", estimateVersion: oldTab.version })).status, 409, "the $25,000 tab cannot accept the $39,000 quote");
    assert.equal(stage(created.caseId), "estimate_sent");
    assert.equal((await decide(created.requestCode, { decision: "accept", estimateVersion: newTab.version })).status, 200);
  } finally { thaw(); }
  const staffBoard = await (await request("/api/workflow", { headers: { cookie: admin } })).text();
  const keys = sql.prepare("SELECT revision FROM record_revisions WHERE case_id=? AND kind<>'sent'").all(created.caseId).map((row) => row.revision);
  const portalText = JSON.stringify((await (await portal(created.requestCode)).json()).data);
  assert.ok(keys.length && keys.every((key) => !portalText.includes(key)), "staff versions never reach the customer portal");
  assert.ok(staffBoard.length > 0);
});

// ---- Codex run-the-site review, round 19 (November 2026): no older screen silently overwrites a newer save, anywhere ----
const ownerRow = (table, id) => {
  const columns = table === "finance_entries"
    ? "type,category,project_code AS projectCode,amount,entry_date AS entryDate,note"
    : "event_date AS eventDate,start_time AS startTime,title,assignee,project_code AS projectCode,tone,notes";
  return { ...sql.prepare(`SELECT ${columns} FROM ${table} WHERE id=?`).get(id) };
};

test("finance entries: an older editor cannot restore an old amount, nor delete an entry someone corrected", async () => {
  const save = (payload) => request("/api/owner/data", json(owner, { resource: "finance", payload }));
  assert.equal((await save({ type: "Income", category: "Progress payment", projectCode: "Business / General", amount: 100000, entryDate: "2026-11-10", note: "Deposit" })).status, 201);
  const id = Number(sql.prepare("SELECT id FROM finance_entries WHERE note='Deposit' ORDER BY id DESC LIMIT 1").get().id);
  const tabA = ownerRow("finance_entries", id);
  const edit = (opened, changes) => request("/api/owner/data", json(owner, { resource: "finance", id, payload: { ...opened, ...changes, opened } }, "PATCH"));
  assert.equal((await edit(tabA, { amount: 150000 })).status, 200, "tab B reconciles it to $1,500");
  const stale = await edit(tabA, { note: "OLD tab reference" });
  assert.equal(stale.status, 400);
  assert.match((await stale.json()).error, /changed by someone else/);
  assert.deepEqual({ ...sql.prepare("SELECT amount, note FROM finance_entries WHERE id=?").get(id) }, { amount: 150000, note: "Deposit" }, "the correction is kept");
  assert.equal((await request("/api/owner/data", json(owner, { resource: "finance", id, payload: { opened: tabA } }, "DELETE"))).status, 400, "an old screen cannot delete it");
  assert.equal((await request("/api/owner/data", json(owner, { resource: "finance", id, payload: {} }, "DELETE"))).status, 400, "a delete that does not say what it removes is refused");
  assert.equal((await request("/api/owner/data", json(owner, { resource: "finance", id, payload: { opened: ownerRow("finance_entries", id) } }, "DELETE"))).status, 200, "the current screen can");
});

test("milestones: an older Owner or Admin editor cannot undo a newer date and time", async () => {
  for (const [who, cookie, route] of [["Owner", owner, "/api/owner/data"], ["Admin", admin, "/api/admin/data"]]) {
    assert.equal((await request(route, json(cookie, { resource: "schedule", payload: { eventDate: "2026-11-20", startTime: "08:00", title: `${who} slab pour`, assignee: "Site Supervisor 01", projectCode: "Business / General", tone: "gold", notes: "" } }))).status, 201);
    const id = Number(sql.prepare("SELECT id FROM schedule_events WHERE title=? ORDER BY id DESC LIMIT 1").get(`${who} slab pour`).id);
    const tabA = ownerRow("schedule_events", id);
    const edit = (opened, changes) => request(route, json(cookie, { resource: "schedule", id, payload: { ...opened, ...changes, opened } }, "PATCH"));
    assert.equal((await edit(tabA, { eventDate: "2026-11-24", startTime: "13:30" })).status, 200, `${who}: moved`);
    const stale = await edit(tabA, { title: `${who} slab pour (corrected title)` });
    assert.equal(stale.status, 400, `${who}: the old editor is refused`);
    assert.deepEqual({ ...sql.prepare("SELECT event_date AS d, start_time AS t FROM schedule_events WHERE id=?").get(id) }, { d: "2026-11-24", t: "13:30" }, `${who}: the new date stays`);
    assert.equal((await request(route, json(cookie, { resource: "schedule", id, payload: { opened: tabA } }, "DELETE"))).status, 400, `${who}: an old screen cannot delete it`);
  }
});

test("a trade's end-of-day report: an older form cannot overwrite a newer report, and the Owner cannot mark a replaced report reviewed unseen", async () => {
  const tiler = await app.staffCookie("tiler.guards@alert.test", "Tiler");
  const created = await newJob("underway");
  assert.equal((await request("/api/worker/manage", json(owner, { action: "assign_worker", payload: { caseId: created.caseId, workerEmail: "tiler.guards@alert.test" } }))).status, 200);
  const today = (await (await request("/api/worker", { headers: { cookie: tiler } })).json()).data.today;
  const send = (completedWork, issuesDelays, replacing) => request("/api/worker", json(tiler, { action: "submit_report", payload: { caseId: created.caseId, workDate: today, completedWork, nextStep: "Grout tomorrow", issuesDelays, replacing } }));
  const reportRow = () => ({ ...sql.prepare("SELECT r.id, r.completed_work AS completedWork, r.next_step AS nextStep, r.issues_delays AS issuesDelays, r.submitted_at AS submittedAt, r.status, r.review_note AS reviewNote, COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='worker_report:' || r.worker_email || ':' || r.work_date AND rv.case_id=r.case_id), r.submitted_at) AS revision FROM worker_reports r WHERE r.case_id=? AND r.work_date=?").get(created.caseId, today) });
  assert.equal((await send("Wall tiles 60% done", "Valve leaking behind the vanity", "")).status, 200, "tab B reports a leak");
  const sent = reportRow();
  const review = (shown, note) => request("/api/worker/manage", json(owner, { action: "review_report", payload: { reportId: shown.id, note, revision: shown.revision, completedWork: shown.completedWork, nextStep: shown.nextStep, issuesDelays: shown.issuesDelays } }));
  assert.equal((await review(sent, "Plumber booked for 7am")).status, 200);
  const old = await send("All good, no issues", "", "");
  assert.equal(old.status, 409, "tab A's older form is refused");
  assert.match((await old.json()).error, /already sent from another screen/);
  assert.deepEqual([reportRow().issuesDelays, reportRow().status, reportRow().reviewNote], ["Valve leaking behind the vanity", "reviewed", "Plumber booked for 7am"], "the newer report and its review are kept");
  // The Owner opened the report; the trade then replaces it (on purpose, from the current screen); the Owner's old button is refused.
  const ownerScreen = reportRow();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal((await send("Test corrected: pressure test failed", "Exposed pipe leaking", ownerScreen.revision)).status, 200);
  const unseen = await review(ownerScreen, "Looks fine");
  assert.equal(unseen.status, 409, "the replaced report is not marked reviewed unseen");
  assert.equal(reportRow().status, "submitted");
  assert.equal((await review(reportRow(), "Seen the failed test")).status, 200, "reviewing the version on screen works");
});

test("creating a task never leaves a task without its history line; a retry saves exactly one task and one line", async () => {
  const created = await newJob("underway");
  assert.equal((await request("/api/worker/manage", json(admin, { action: "assign_worker", payload: { caseId: created.caseId, workerEmail: "plumber.guards@alert.test" } }))).status, 200);
  for (const [type, makeTask, table, title] of [
    ["team_task_created", () => request("/api/tasks/manage", json(owner, { action: "create_task", payload: { assigneeEmail: "admin.guards@alert.test", caseId: created.caseId, title: "Order tapware", instructions: "Today" } })), "team_tasks", "Order tapware"],
    ["worker_task_created", () => request("/api/worker/manage", json(admin, { action: "create_task", payload: { caseId: created.caseId, workerEmail: "plumber.guards@alert.test", title: "Cap the old valve", instructions: "First thing" } })), "worker_tasks", "Cap the old valve"],
  ]) {
    sql.exec(`CREATE TRIGGER fail_${type} BEFORE INSERT ON workflow_events WHEN NEW.event_type='${type}' BEGIN SELECT RAISE(ABORT, 'history unavailable'); END;`);
    try {
      assert.equal((await makeTask()).status, 400, `${type}: the failure is reported`);
      assert.equal(sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE title=?`).get(title).n, 0, `${type}: no task without its history line`);
    } finally { sql.exec(`DROP TRIGGER fail_${type}`); }
    assert.equal((await makeTask()).status, 200, `${type}: the retry works`);
    assert.equal(sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE title=?`).get(title).n, 1);
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM workflow_events WHERE case_id=? AND event_type=?").get(created.caseId, type).n, 1, `${type}: exactly one history line`);
  }
});

test("project controls: an older stage or customer-status form never replaces a newer one unseen; replacing on purpose works", async () => {
  const created = (await (await request("/api/workflow/cases", json(owner, { ...job, entry: "underway", statusLabel: "Planning" }))).json()).data.created;
  assert.equal((await raw(owner, created.caseId, "set_status_label", { label: "Delayed — safety review", openedLabel: "Planning" })).status, 200, "the Owner puts it on hold");
  const stale = await raw(admin, created.caseId, "set_status_label", { label: "Construction", openedLabel: "Planning" });
  assert.equal(stale.status, 409, "the older Admin form is refused");
  assert.equal(sql.prepare("SELECT stage FROM projects WHERE code=?").get(created.projectCode).stage, "Delayed — safety review", "the portfolio keeps the hold");
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM workflow_events WHERE case_id=? AND title LIKE '%Construction%'").get(created.caseId).n, 0, "no history line for a refused change");
  assert.equal((await raw(admin, created.caseId, "set_status_label", { label: "Construction" })).status, 409, "a form that does not say what it replaces is refused");
  assert.equal((await raw(admin, created.caseId, "set_status_label", { label: "Construction", openedLabel: "Delayed — safety review" })).status, 200, "replacing on purpose works");
  assert.equal((await raw(owner, created.caseId, "save_customer_status", { title: "Delivery Wednesday 1:30pm", detail: "Latest customer agreement", openedTitle: "", openedDetail: "" })).status, 200);
  assert.equal((await raw(admin, created.caseId, "save_customer_status", { title: "Delivery Monday 8am", detail: "Old tab plan", openedTitle: "", openedDetail: "" })).status, 409, "the older draft form is refused");
  assert.equal(sql.prepare("SELECT draft_title AS t FROM case_status WHERE case_id=?").get(created.caseId).t, "Delivery Wednesday 1:30pm");
  const { readFile } = await import("node:fs/promises");
  const controls = await readFile(new URL("../app/workflow/ProjectControls.tsx", import.meta.url), "utf8");
  assert.match(controls, /\{ label: stage, openedLabel \}/);
  assert.match(controls, /openedTitle: openedDraft\.title, openedDetail: openedDraft\.detail/);
  assert.match(controls, /Replace it with my stage/);
});

test("pressing Start on an old card never reopens a task someone completed", async () => {
  assert.equal((await request("/api/tasks/manage", json(owner, { action: "create_task", payload: { assigneeEmail: "admin.guards@alert.test", caseId: 0, title: "Check the skip bin", instructions: "Today" } }))).status, 200);
  const id = Number(sql.prepare("SELECT id FROM team_tasks WHERE title='Check the skip bin'").get().id);
  assert.equal((await request("/api/tasks/manage", json(owner, { action: "set_status", payload: { taskId: id, status: "completed", from: "assigned" } }))).status, 200, "the Owner completes it");
  const late = await request("/api/tasks", json(admin, { action: "set_status", payload: { taskId: id, status: "in_progress", from: "assigned" } }));
  assert.equal(late.status, 409);
  assert.equal(sql.prepare("SELECT status FROM team_tasks WHERE id=?").get(id).status, "completed", "it stays completed");
  assert.equal((await request("/api/tasks", json(admin, { action: "set_status", payload: { taskId: id, status: "in_progress" } }))).status, 409, "a change that does not say what it replaces is refused");
});

test("a customer page from before this update (no quote version) is asked to reload instead of deciding", async () => {
  const created = await newJob("site_visit");
  setStage(created.caseId, "site_visit_approved");
  await act(estimator, created.caseId, "save_estimate", estimate("25000"));
  assert.equal((await act(admin, created.caseId, "send_estimate")).status, 200);
  for (const body of [{ decision: "accept" }, { decision: "accept", sentAt: "2026-11-14T00:00:00.000Z" }]) {
    const answer = await decide(created.requestCode, body);
    assert.equal(answer.status, 409);
    assert.match((await answer.json()).error, /reload it with your browser's Refresh button/);
  }
  assert.equal(stage(created.caseId), "estimate_sent");
});

// ---- Codex run-the-site review, round 20 (November 2026) ----
test("trade reports: every send gets its own version, handed back to the form that sent it; a second Owner review never replaces the first", async () => {
  const carpenter = await app.staffCookie("carpenter.guards@alert.test", "Carpenter");
  const created = await newJob("underway");
  assert.equal((await request("/api/worker/manage", json(owner, { action: "assign_worker", payload: { caseId: created.caseId, workerEmail: "carpenter.guards@alert.test" } }))).status, 200);
  const today = (await (await request("/api/worker", { headers: { cookie: carpenter } })).json()).data.today;
  const send = (completedWork, replacing) => request("/api/worker", json(carpenter, { action: "submit_report", payload: { caseId: created.caseId, workDate: today, completedWork, nextStep: "Frame the niche", issuesDelays: "", replacing } }));
  const thaw = frozenClock();
  let first;
  try {
    first = await send("Studs in", "");
    assert.equal(first.status, 200);
    const mine = (await first.json()).revision;
    const shown = (await (await request("/api/worker", { headers: { cookie: carpenter } })).json()).data.reports.find((report) => report.caseId === created.caseId);
    assert.equal(shown.revision, mine, "the answer names the version just sent");
    assert.equal((await send("Studs in, noggings done", mine)).status, 200, "a correction from the same form");
    assert.equal((await send("Old tab: studs in", mine)).status, 409, "the same millisecond, but the version moved on: the old form is refused");
  } finally { thaw(); }
  const management = (await (await request("/api/worker/manage", { headers: { cookie: owner } })).json()).data.reports.find((report) => report.caseId === created.caseId);
  const review = (note) => request("/api/worker/manage", json(owner, { action: "review_report", payload: { reportId: management.id, note, revision: management.revision, completedWork: management.completedWork, nextStep: management.nextStep, issuesDelays: management.issuesDelays } }));
  assert.equal((await review("Plumber booked for 7am; isolate the valve")).status, 200, "Owner screen B");
  assert.equal((await review("OLD tab: all good")).status, 409, "Owner screen A cannot replace B's review");
  assert.equal(sql.prepare("SELECT review_note AS n FROM worker_reports WHERE id=?").get(management.id).n, "Plumber booked for 7am; isolate the valve");
});

test("screens (round 20): one draft per project and day keeps its own version; typing during a slow save is kept; refused edits re-read the lists; general codes are read the same way everywhere", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const worker = await read("app/worker/WorkerDashboard.tsx");
  assert.match(worker, /const \[drafts, setDrafts\] = useState<Record<string, \{ completedWork: string; nextStep: string; issuesDelays: string; opened: string \}>>/);
  assert.match(worker, /replacing: draft\.opened/);
  assert.match(worker, /const revision = typeof result\.revision === "string" \? result\.revision : "";/, "the form adopts only the version its own send returned");
  assert.match(worker, /opened: revision \}/);
  const controls = await read("app/workflow/ProjectControls.tsx");
  assert.match(controls, /if \(ok\) \{ setOpenedLabel\(sent\); if \(stageEdits\.current === edits\) setStageTyped\(false\); \}/);
  assert.match(controls, /if \(ok\) \{ setOpenedDraft\(sent\); if \(draftEdits\.current === edits\) setDraftTyped\(false\); \}/);
  assert.match(await read("app/owner/OwnerDashboard.tsx"), /return false\}finally\{setWorking\(false\)\}\}/);
  assert.match(await read("app/owner/OwnerDashboard.tsx"), /void refreshQuietly\(\);return false\}/);
  assert.match(await read("app/admin/AdminDashboard.tsx"), /void refreshQuietly\(\);\n      return false;/);
});

test("Admin with project access off can still edit a general milestone stored with NULL, tabs or line breaks around its code", async () => {
  const setPermission = (projects) => request("/api/owner/data", json(owner, { resource: "permission", id: "Admin", payload: { projects, schedule: 1, finance: 0, financeExport: 0 } }, "PATCH"));
  const id = Number(sql.prepare("INSERT INTO schedule_events (event_date,start_time,title,assignee,project_code,tone,notes) VALUES (?,?,?,?,?,?,?)").run("2026-11-26", "07:00", "Toolbox talk (imported)", "Site Supervisor 01", "\tBusiness / General\n", "gold", "").lastInsertRowid);
  assert.equal((await setPermission(0)).status, 200);
  try {
    const opened = { ...sql.prepare("SELECT event_date AS eventDate,start_time AS startTime,title,assignee,project_code AS projectCode,tone,notes FROM schedule_events WHERE id=?").get(id) };
    const saved = await request("/api/admin/data", json(admin, { resource: "schedule", id, payload: { ...opened, title: "Toolbox talk", projectCode: "Business / General", opened } }, "PATCH"));
    assert.equal(saved.status, 200, await saved.clone().text());
  } finally { assert.equal((await setPermission(1)).status, 200); }
});

// ---- Codex run-the-site review, round 21 (November 2026): Operations and Daily approvals ----
const issueVersion = (id) => sql.prepare("SELECT COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='site_issue:' || i.id AND rv.case_id=i.case_id), i.updated_at) AS v FROM site_issue_reports i WHERE i.id=?").get(id).v;
const newIssue = async () => {
  const created = await newJob("underway");
  sql.prepare("UPDATE workflow_cases SET assigned_supervisor_email='super.guards@alert.test', assigned_supervisor_name='Site Supervisor' WHERE id=?").run(created.caseId);
  assert.equal((await request("/api/operations", json(supervisor, { action: "create_issue", payload: { caseId: created.caseId, siteLocation: "Ensuite", affectedTrade: "Plumber", issueType: "Defect", severity: "High", summary: "Valve leaking", details: "", impact: "" } }))).status, 200);
  return { created, id: Number(sql.prepare("SELECT id FROM site_issue_reports WHERE case_id=? ORDER BY id DESC LIMIT 1").get(created.caseId).id) };
};
const ops = (cookie, action, payload) => request("/api/operations", json(cookie, { action, payload }));

test("Operations: an older screen cannot reopen a resolved issue or replace the Owner's newer direction; each change and its history line are saved together", async () => {
  const { created, id } = await newIssue();
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM workflow_events WHERE case_id=? AND event_type='site_issue_reported'").get(created.caseId).n, 1);
  const screenA = issueVersion(id);
  assert.equal((await ops(admin, "review_issue", { issueId: id, revision: screenA, adminAction: "Calling the plumber" })).status, 200, "screen B reviews");
  const resolved = await ops(admin, "resolve_issue", { issueId: id, revision: issueVersion(id), adminAction: "Repair test passed" });
  assert.equal(resolved.status, 200, "screen B resolves");
  const bookingsBefore = sql.prepare("SELECT COUNT(*) AS n FROM schedule_events").get().n;
  const stale = await ops(admin, "reschedule_issue", { issueId: id, revision: screenA, adminAction: "Old screen: move to Friday", rescheduledDate: "2026-11-27", rescheduledTime: "07:30", rescheduledAssignee: "Site Supervisor 01" });
  assert.equal(stale.status, 409, "the old screen is refused");
  assert.deepEqual({ ...sql.prepare("SELECT status, admin_action AS a FROM site_issue_reports WHERE id=?").get(id) }, { status: "resolved", a: "Repair test passed" });
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM schedule_events").get().n, bookingsBefore, "no booking from a refused change");
  assert.equal((await ops(admin, "review_issue", { issueId: id, revision: issueVersion(id), adminAction: "again" })).status, 409, "a resolved issue cannot be reviewed again");
  const ownerA = issueVersion(id);
  assert.equal((await ops(owner, "owner_note", { issueId: id, revision: ownerA, ownerNote: "Keep isolated; plumber 7am" })).status, 200);
  assert.equal((await ops(owner, "owner_note", { issueId: id, revision: ownerA, ownerNote: "OLD screen: all clear" })).status, 409);
  assert.equal(sql.prepare("SELECT owner_note AS n FROM site_issue_reports WHERE id=?").get(id).n, "Keep isolated; plumber 7am");
  assert.equal((await ops(owner, "owner_note", { issueId: id, ownerNote: "no version" })).status, 409, "a change that does not say what it replaces is refused");
});

test("Operations: a reschedule whose history line fails saves nothing, and its retry books exactly once", async () => {
  const { created, id } = await newIssue();
  const bookings = () => sql.prepare("SELECT COUNT(*) AS n FROM schedule_events WHERE title='Follow up Plumber delay'").get().n;
  const followUps = () => sql.prepare("SELECT COUNT(*) AS n FROM follow_up_items WHERE title='Follow up Plumber delay' AND project_code=?").get(created.projectCode).n;
  const before = [bookings(), followUps()];
  const screen = issueVersion(id);
  const reschedule = () => ops(admin, "reschedule_issue", { issueId: id, revision: screen, adminAction: "Plumber Friday 7:30", rescheduledDate: "2026-11-27", rescheduledTime: "07:30", rescheduledAssignee: "Site Supervisor 01" });
  sql.exec("CREATE TRIGGER fail_reschedule_history BEFORE INSERT ON workflow_events WHEN NEW.event_type='site_issue_rescheduled' BEGIN SELECT RAISE(ABORT, 'history unavailable'); END;");
  try {
    assert.equal((await reschedule()).status, 400);
    assert.equal(sql.prepare("SELECT status FROM site_issue_reports WHERE id=?").get(id).status, "reported", "nothing changed");
    assert.deepEqual([bookings(), followUps()], before, "no booking, no follow-up");
  } finally { sql.exec("DROP TRIGGER fail_reschedule_history"); }
  assert.equal((await reschedule()).status, 200, "the same form's retry works");
  assert.equal((await reschedule()).status, 409, "and pressing it again does not book twice");
  assert.deepEqual([bookings(), followUps()], [before[0] + 1, before[1] + 1]);
});

test("Daily approvals: Save note never reverses a newer decision; an older screen cannot change a report someone else decided", async () => {
  const staffReport = await request("/api/team/eod", json(admin, { projectCode: "Business / General", summary: "Ordered the shower screen" }));
  assert.ok([200, 201].includes(staffReport.status), await staffReport.clone().text());
  const report = () => ({ ...sql.prepare("SELECT id, status, owner_note AS ownerNote, submitted_at AS submittedAt, summary FROM eod_reports ORDER BY id DESC LIMIT 1").get() });
  const decide = (shown, status, ownerNote, noteOnly = false) => request("/api/owner/data", json(owner, { resource: "report", id: shown.id, payload: { status, ownerNote, noteOnly, opened: { status: shown.status, ownerNote: shown.ownerNote, submittedAt: shown.submittedAt, summary: shown.summary } } }, "PATCH"));
  assert.equal((await decide(report(), "Approved", "")).status, 200);
  const screenA = report();
  assert.equal((await decide(screenA, "Rejected", "Repair proof still missing")).status, 200, "screen B rejects it");
  const stale = await decide(screenA, screenA.status, "A old note only", true);
  assert.equal(stale.status, 400, "screen A's Save note is refused");
  assert.deepEqual([report().status, report().ownerNote], ["Rejected", "Repair proof still missing"]);
  assert.equal((await decide(report(), "Approved", "Thanks, photo received", true)).status, 200, "Save note from the current screen");
  assert.deepEqual([report().status, report().ownerNote], ["Rejected", "Thanks, photo received"], "Save note changes only the note");
});

// ---- Codex run-the-site review, round 23 (November 2026): the Site Supervisor's daily report and messages ----
test("the old shared staff channel (keyed by job title) is closed: nobody can read or post there; private messages stay between two people", async () => {
  const second = await app.staffCookie("super2.guards@alert.test", "Site Supervisor");
  const before = sql.prepare("SELECT COUNT(*) AS n FROM team_messages").get()?.n ?? 0;
  for (const cookie of [supervisor, second]) {
    assert.equal((await request("/api/team/messages", { headers: { cookie } })).status, 410, "reading is closed");
    assert.equal((await request("/api/team/messages", json(cookie, { body: "Private note about my job" }))).status, 410, "posting is closed");
  }
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM team_messages").get()?.n ?? 0, before, "nothing was saved");
  // The private channel: Supervisor 1 → Admin; Supervisor 2 cannot read it.
  const form = new FormData(); form.set("to", "admin.guards@alert.test"); form.set("body", "Supervisor 1: private note about job A");
  const sent = await request("/api/team/chat", { method: "POST", headers: { cookie: supervisor, origin: "http://localhost" }, body: form });
  assert.ok([200, 201].includes(sent.status), await sent.clone().text());
  const adminView = await (await request("/api/team/chat?with=super.guards@alert.test", { headers: { cookie: admin } })).text();
  assert.ok(adminView.includes("private note about job A"), "Admin receives it");
  const otherView = await (await request("/api/team/chat?with=admin.guards@alert.test", { headers: { cookie: second } })).text();
  assert.ok(!otherView.includes("private note about job A"), "the other Site Supervisor does not");
});

test("screens (round 23): the Site Supervisor's daily report and messages open the working Team hub pages; nothing claims 'submitted' without saving", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const supervisorScreen = await read("app/site-supervisor/SiteSupervisor.tsx");
  assert.ok(!supervisorScreen.includes("setReportSent") && !supervisorScreen.includes("/api/team/messages"), "the fake report and the shared channel are gone");
  assert.match(supervisorScreen, /href="\/team\/hub\?tab=report"/);
  assert.match(supervisorScreen, /href="\/team\/hub\?tab=messages"/);
  const hubPage = await read("app/team/hub/page.tsx");
  assert.match(hubPage, /const initialTab = wanted === "messages" \|\| \(wanted === "report" && me\.role !== "Owner"\) \? wanted : "calendar";/);
  assert.match(await read("app/team/hub/TeamHub.tsx"), /useState<Tab>\(initialTab\)/);
  const adminScreen = await read("app/admin/AdminDashboard.tsx");
  assert.match(adminScreen, /\{recipient === "Owner" \? <form onSubmit=\{sendMessage\}>/, "Admin only writes in the Owner channel; staff are messaged privately");
});

// ---- Codex run-the-site review, round 24 (November 2026): Team hub forms keep what is typed while sending ----
test("screens (round 24): the Team hub report, messages and calendar clear only what was sent; a send answer never shows under another person", async () => {
  const { readFile } = await import("node:fs/promises");
  const hub = await readFile(new URL("../app/team/hub/TeamHub.tsx", import.meta.url), "utf8");
  assert.match(hub, /setForm\(\(value\) => value\.title === sent\.title && value\.notes === sent\.notes && value\.untilDate === sent\.untilDate \? \{ \.\.\.value, title: "", notes: "", untilDate: "" \} : value\);/);
  assert.match(hub, /setText\(\(current\) => current === sentText \? "" : current\);/);
  assert.match(hub, /setFile\(\(current\) => current === sentFile \? null : current\);/);
  assert.match(hub, /setSummary\(\(current\) => current === sentSummary \? "" : current\)/);
  assert.match(hub, /const messages = thread\.peer === peer \? thread\.messages : \[\];/);
  assert.match(hub, /setThread\(\(current\) => current\.peer === sentPeer \? \{ peer: sentPeer, messages: data\.messages \} : current\);/);
});

// ---- Codex run-the-site review, round 25 (November 2026) ----
test("screens (round 25): the trade's end-of-day form keeps text typed while sending; a person's Message button opens that person's private chat; Enter cannot send twice", async () => {
  const { readFile } = await import("node:fs/promises");
  const worker = await readFile(new URL("../app/worker/WorkerDashboard.tsx", import.meta.url), "utf8");
  assert.match(worker, /return \{ \.\.\.all, \[sentKey\]: same \? \{ completedWork: "", nextStep: "", issuesDelays: "", opened: revision \} : \{ \.\.\.current, opened: revision \} \};/);
  assert.match(worker, /if \(untouched && !result\.data\.missingReportDates\.length\) setView\("work"\);/);
  const hub = await readFile(new URL("../app/team/hub/TeamHub.tsx", import.meta.url), "utf8");
  assert.match(hub, /onClick=\{\(\) => \{ setChatWith\(person\.email\); setTab\("messages"\); \}\}>Message<\/button>/);
  assert.match(hub, /<MessagesTab key=\{chatWith\} initialPeer=\{chatWith\}/);
  assert.match(hub, /const \[peer, setPeer\] = useState\(initialPeer\);/);
  assert.match(hub, /if \(sending\.current \|\| \(!text\.trim\(\) && !file\)\) return;\n    sending\.current = true;/);
  assert.match(hub, /finally \{ sending\.current = false; setBusy\(false\); \}/);
});

test("screens (round 26): the trade's end-of-day fields and project choice are locked while a report is sending (a catch-up report moves on to the next day afterwards)", async () => {
  const { readFile } = await import("node:fs/promises");
  const worker = await readFile(new URL("../app/worker/WorkerDashboard.tsx", import.meta.url), "utf8");
  for (const field of ["completedWork", "nextStep", "issuesDelays"]) assert.match(worker, new RegExp(`<textarea value=\\{${field}\\} disabled=\\{working\\}`), field);
  assert.match(worker, /setProjectId\(Number\(event\.target\.value\)\)\} required disabled=\{working\}>/);
  assert.match(worker, /if \(working\) return;\n    if \(!selectedProject\)/);
});
