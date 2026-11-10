// Regression test for the October 2026 lead-engineer audit: the Team hub's project picker used to send every project code and
// name to every signed-in team member, including Workers with no assignment.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("scope");
const { request } = app;

const owner = await app.ownerCookie();
const manager = await app.staffCookie("manager.scope@alert.test", "Manager");
const supervisor = await app.staffCookie("super.scope@alert.test", "Site Supervisor");
const worker = await app.staffCookie("sparky.scope@alert.test", "Electrician");
const otherWorker = await app.staffCookie("idle.scope@alert.test", "Plumber");
const estimator = await app.staffCookie("numbers.scope@alert.test", "Estimator");

// Make sure every table exists, then lay out three projects directly: one the Worker is on, one the Supervisor runs, one nobody junior touches.
assert.equal((await request("/api/worker/manage", { headers: { cookie: owner } })).status, 200);
const db = app.d1.sqlite;
const now = new Date().toISOString();
for (const [code, name] of [["ATP-2026-90001", "Worker job"], ["ATP-2026-90002", "Supervisor job"], ["ATP-2026-90003", "Private job"]]) {
  db.prepare("INSERT INTO projects (code,name,service,stage,updated_at) VALUES (?,?,?,?,?)").run(code, name, "Renovation", "Active", now);
}
const addCase = (requestCode, projectCode, stage, supervisorEmail = "") => Number(db.prepare("INSERT INTO workflow_cases (request_code,project_code,customer_name,service,stage,assigned_supervisor_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
  .run(requestCode, projectCode, "Customer", "Renovation", stage, supervisorEmail, now, now).lastInsertRowid);
const workerCase = addCase("REQ-SCOPE-1", "ATP-2026-90001", "active_project");
addCase("REQ-SCOPE-2", "ATP-2026-90002", "site_visit_scheduled", "super.scope@alert.test");
addCase("REQ-SCOPE-3", "ATP-2026-90003", "admin_review");
db.prepare("INSERT INTO worker_project_assignments (case_id,worker_email,trade_title,status,assigned_by,assigned_at,removed_at) VALUES (?,?,?,'active',?,?,'')")
  .run(workerCase, "sparky.scope@alert.test", "Electrician", app.ownerEmail, now);

async function codesFor(cookie) {
  const response = await request("/api/team/people", { headers: { cookie } });
  assert.equal(response.status, 200);
  return (await response.json()).data.projects.map((project) => project.code).sort();
}

test("project picker: management sees every project, everyone else only their own", async () => {
  const all = ["ATP-2026-90001", "ATP-2026-90002", "ATP-2026-90003"];
  assert.deepEqual(await codesFor(owner), all);
  assert.deepEqual(await codesFor(manager), all);
  assert.deepEqual(await codesFor(worker), ["ATP-2026-90001"], "a Worker only sees the job they are assigned to");
  assert.deepEqual(await codesFor(otherWorker), [], "an unassigned Worker sees no project names");
  assert.deepEqual(await codesFor(supervisor), ["ATP-2026-90002"], "a Site Supervisor only sees jobs assigned to them");
  assert.deepEqual(await codesFor(estimator), ["ATP-2026-90001"], "an Estimator only sees jobs at estimating stages or later");
});

test("project picker: removing a Worker from a project removes it from their list", async () => {
  db.prepare("UPDATE worker_project_assignments SET status='removed' WHERE worker_email='sparky.scope@alert.test'").run();
  assert.deepEqual(await codesFor(worker), []);
});
