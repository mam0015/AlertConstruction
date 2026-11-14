// A brand-new database: editing a portfolio project works before anyone has opened the project workflow (November 2026 review).
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";
import { openedProject } from "./helpers/screen.mjs";

const app = await startWorker("freshdb");
const { request, json } = app;

test("Owner and Admin can create and edit portfolio projects on a fresh database before the workflow tables exist", async () => {
  const owner = await app.ownerCookie();
  const payload = (stage) => ({ code: "ATP-2026-77777", name: "Fresh project", service: "Kitchen", stage, progress: 10, contractValue: 0, balance: 0, customerName: "Fresh Customer", suburb: "Rowville", startDate: "", notes: "" });
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='workflow_cases'").get().n, 0, "no workflow table yet");
  const created = await request("/api/owner/data", json(owner, { resource: "project", payload: payload("Admin review") }));
  assert.equal(created.status, 201, await created.clone().text());
  const row = app.d1.sqlite.prepare("SELECT id FROM projects WHERE code='ATP-2026-77777'").get();
  const edited = await request("/api/owner/data", json(owner, { resource: "project", id: row.id, payload: { ...payload("Planning"), opened: openedProject(app.d1.sqlite, row.id) } }, "PATCH"));
  assert.equal(edited.status, 200, await edited.clone().text());
  const admin = await app.staffCookie("admin.fresh@alert.test", "Admin");
  const adminEdit = await request("/api/admin/data", json(admin, { resource: "project", id: row.id, payload: { ...payload("Scheduled"), contractValue: undefined, balance: undefined, opened: openedProject(app.d1.sqlite, row.id) } }, "PATCH"));
  assert.equal(adminEdit.status, 200, await adminEdit.clone().text());
  assert.equal(app.d1.sqlite.prepare("SELECT stage FROM projects WHERE id=?").get(row.id).stage, "Scheduled");
});
