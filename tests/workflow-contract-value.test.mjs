// When Admin turns an accepted estimate into an active project, the price the customer accepted becomes the project's contract value
// (it used to stay at $0 / "TBC"). A value the Owner already typed in by hand is kept.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("cv");
const owner = await app.ownerCookie();
const admin = await app.staffCookie("admin.cv@alert.test", "Admin");
const supervisor = await app.staffCookie("sup.cv@alert.test", "Site Supervisor");
const estimator = await app.staffCookie("est.cv@alert.test", "Estimator");
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

const flow = (cookie, action, caseId, payload = {}) => app.request("/api/workflow", app.json(cookie, { action, caseId, payload }));

// A request taken as far as "estimate accepted by the customer", priced at `amount` dollars.
async function acceptedJob(name, amount) {
  const created = await (await app.request("/api/workflow/public", app.json(null, { termsAccepted: "on", name, email: `${name.split(" ")[0].toLowerCase()}@example.com`, phone: "0400 000 000", service: "Bathroom Renovations", location: "Kew", timeframe: "Soon", budget: "$30,000", material: "Tile", details: "Replace the bath with a shower." }))).json();
  const { caseId, code } = created.data;
  for (const [cookie, action, payload] of [
    [admin, "review_started"], [admin, "approve_intake"],
    [admin, "assign_visit", { supervisorEmail: "sup.cv@alert.test", supervisorName: "Sue", visitAt: "2026-11-02T10:00" }],
  ]) assert.equal((await flow(cookie, action, caseId, payload)).status, 200, action);
  const form = new FormData(); form.append("file", new Blob([PNG], { type: "image/png" }), "site.png"); form.append("caseId", String(caseId)); form.append("category", "site_visit");
  const photo = await app.request("/api/workflow/files", { method: "POST", headers: { cookie: supervisor }, body: form });
  assert.equal(photo.status, 201);
  const fileId = (await photo.json()).data.id;
  assert.equal((await flow(supervisor, "submit_site_visit", caseId, { visitDate: "2026-11-02", summary: "ok", findings: "ok", recommendations: "ok", fileIds: [fileId] })).status, 200);
  assert.equal((await flow(admin, "review_site_visit", caseId, { decision: "approved" })).status, 200);
  assert.equal((await flow(estimator, "save_estimate", caseId, { amount, scope: "Strip out and rebuild." })).status, 200);
  assert.equal((await flow(admin, "send_estimate", caseId)).status, 200);
  assert.equal((await app.request("/api/workflow/public", app.json(null, { code, decision: "accept" }, "PATCH"))).status, 200);
  const projectCode = (await (await app.request("/api/workflow", { headers: { cookie: admin } })).json()).data.cases.find((entry) => entry.id === caseId).projectCode;
  return { caseId, code, projectCode };
}
const project = async (code) => (await (await app.request("/api/owner/data", { headers: { cookie: owner } })).json()).data.projects.find((entry) => entry.code === code);

test("activating a job gives the project the price the customer accepted (in cents)", async () => {
  const job = await acceptedJob("Dana Whitaker", 31850.5);
  const before = await project(job.projectCode);
  assert.equal(before.contractValue, 0, "a new project starts without a contract value");
  assert.equal((await flow(admin, "activate_project", job.caseId)).status, 200);
  const after = await project(job.projectCode);
  assert.equal(after.contractValue, 3185050);
  assert.equal(after.stage, "Scheduled");
  assert.equal(after.progress, 5);
});

test("a contract value the Owner typed in earlier is never overwritten by activation", async () => {
  const job = await acceptedJob("Noor Rahimi", 40000);
  const mine = await project(job.projectCode);
  const edit = { code: mine.code, name: mine.name, service: mine.service, stage: mine.stage, progress: mine.progress, contractValue: 4200000, balance: 0, customerName: mine.customerName, suburb: mine.suburb, startDate: "", notes: "Agreed on the phone" };
  assert.equal((await app.request("/api/owner/data", app.json(owner, { resource: "project", id: mine.id, payload: edit }, "PATCH"))).status, 200);
  assert.equal((await flow(admin, "activate_project", job.caseId)).status, 200);
  assert.equal((await project(job.projectCode)).contractValue, 4200000, "the Owner's figure stays");
});

test("a job that is not accepted cannot be activated, and its contract value stays at zero", async () => {
  const created = await (await app.request("/api/workflow/public", app.json(null, { termsAccepted: "on", name: "Gary Okafor", email: "gary@example.com", phone: "0400 000 111", service: "Other", otherService: "A small repair job on the back fence line", location: "Essendon", timeframe: "Soon", budget: "$1,000", material: "Timber", details: "Repair the fence." }))).json();
  assert.equal((await flow(admin, "activate_project", created.data.caseId)).status, 400);
});
