import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const store = await readFile(new URL("../db/worker-store.ts", import.meta.url), "utf8");
const workerApi = await readFile(new URL("../app/api/worker/route.ts", import.meta.url), "utf8");
const fileApi = await readFile(new URL("../app/api/worker/files/route.ts", import.meta.url), "utf8");
const portal = await readFile(new URL("../app/worker/WorkerDashboard.tsx", import.meta.url), "utf8");
const manager = await readFile(new URL("../app/workers/WorkerManagementPanel.tsx", import.meta.url), "utf8");
const access = await readFile(new URL("../app/staff-access.ts", import.meta.url), "utf8");

test("approved trade roles redirect into the dedicated Worker workspace", () => {
  assert.match(access, /isWorkerRole\(role\).*?return "\/worker"/s);
  assert.match(workerApi, /isWorkerRole\(session\.role\)/);
});

test("Worker snapshot is assignment-scoped and omits private customer and finance fields", () => {
  const snapshotSection = store.slice(store.indexOf("export async function getWorkerSnapshot"), store.indexOf("export async function submitWorkerReport"));
  assert.match(snapshotSection, /worker_project_assignments/);
  assert.match(snapshotSection, /assignment\.status='active'/);
  assert.doesNotMatch(snapshotSection, /customer_name|customer_email|customer_phone|budget|amount_cents|estimate/);
  assert.match(portal, /Customer history, budgets, quotes, margins and management notes are not available/);
});

test("Worker files require an explicit per-user access row", () => {
  assert.match(store, /JOIN worker_file_access access/);
  assert.match(store, /access\.worker_email=\?/);
  assert.match(store, /worker_project_assignments assignment/);
  assert.match(fileApi, /File not found or not shared with this account/);
  assert.match(manager, /Unticked Workers see nothing/);
  assert.match(manager, /Leave everyone unticked to store the file privately/);
  assert.doesNotMatch(store, /Select at least one Worker who may open this file/);
});

test("missed End-of-Day reports block later reports until caught up", () => {
  assert.match(store, /NOT EXISTS \(SELECT 1 FROM worker_reports/);
  assert.match(store, /Complete the missing report/);
  assert.match(portal, /previous work session has no End-of-Day report/);
  assert.match(portal, /Complete the missing report/);
  assert.match(store, /if \(!assigned\) return/);
  assert.match(store, /workflow\.stage='active_project'/);
});

test("Worker tasks have no due-date contract and reports require a next step", () => {
  assert.doesNotMatch(manager, /type="date"/);
  assert.doesNotMatch(store.slice(store.indexOf("CREATE TABLE IF NOT EXISTS worker_tasks"), store.indexOf("CREATE TABLE IF NOT EXISTS worker_file_access")), /due_date|task_date/);
  assert.match(store, /required\(payload\.nextStep, "Next step"\)/);
  assert.match(portal, /Do not enter a future date/);
});

test("Owner and Admin can assign tasks, share files and review reports", () => {
  for (const action of ["assign_worker", "create_task", "set_file_access", "review_report"]) {
    assert.match(store, new RegExp(`action === "${action}"`));
    assert.match(manager, new RegExp(`"${action}"`));
  }
});
