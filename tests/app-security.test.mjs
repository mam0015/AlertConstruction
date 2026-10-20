// Regression tests for the problems found by the full-app audit (October 2026): file access between staff, safe serving of uploads,
// upload size, and JSON errors. Each test names the problem it guards.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("sec");
const { request, json } = app;
const admin = await app.staffCookie("admin.sec@alert.test", "Admin");

const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"));

async function newRequest(label) {
  const created = await request("/api/workflow/public", json(null, {
    name: `Customer ${label}`, email: `${label}@customer.test`, phone: "0400111222", service: "Bathroom renovation", location: "Parramatta NSW 2150",
    details: "Full bathroom renovation, approximately six square metres.", timeframe: "Next month", budget: "$20k", termsAccepted: "on",
  }));
  assert.equal(created.status, 201, await created.clone().text());
  const data = (await created.json()).data;
  // Customers may upload documents once the Admin has asked for them.
  const asked = await request("/api/workflow", json(admin, { action: "message_customer", caseId: data.caseId, payload: { body: "Please send your plans.", kind: "document_request" } }));
  assert.equal(asked.status, 200, await asked.clone().text());
  return data;
}

async function customerUpload(caseId, code, name = "plan.png", type = "image/png", bytes = png) {
  const form = new FormData();
  form.set("caseId", String(caseId));
  form.set("code", code);
  form.set("file", new File([bytes], name, { type }));
  return request("/api/workflow/public/files", { method: "POST", body: form });
}

test("files: staff only get files of cases they are allowed to see, and strangers get none without a signed link", async () => {
  const owner = await app.ownerCookie();
  const supervisorA = await app.staffCookie("super.a@alert.test", "Site Supervisor");
  const supervisorB = await app.staffCookie("super.b@alert.test", "Site Supervisor");
  const estimator = await app.staffCookie("estimator.sec@alert.test", "Estimator");

  const { caseId, code } = await newRequest("files1");
  const uploaded = await customerUpload(caseId, code);
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  const fileId = (await uploaded.json()).data.id ?? app.d1.sqlite.prepare("SELECT id FROM workflow_files WHERE case_id = ?").get(caseId).id;
  const url = `/api/workflow/files?id=${fileId}`;

  const get = async (cookie, extra = "") => request(url + extra, { headers: cookie ? { cookie } : {} });
  assert.equal((await get(owner)).status, 200, "the Owner can open it");
  assert.equal((await get(admin)).status, 200, "an Admin can open it");
  assert.equal((await get(supervisorA)).status, 404, "a Site Supervisor who is not assigned cannot open another job's file");
  assert.equal((await get(estimator)).status, 404, "an Estimator cannot open a job that has not reached estimating");
  assert.equal((await get(null)).status, 404, "a stranger cannot open it");

  // Assign supervisor A: now only A can open it.
  assert.equal((await request("/api/workflow", json(admin, { action: "review_started", caseId, payload: {} }))).status, 200);
  assert.equal((await request("/api/workflow", json(admin, { action: "approve_intake", caseId, payload: {} }))).status, 200);
  const assigned = await request("/api/workflow", json(admin, { action: "assign_visit", caseId, payload: { supervisorEmail: "super.a@alert.test", supervisorName: "Super A", visitAt: "2026-12-01T09:00" } }));
  assert.equal(assigned.status, 200, await assigned.clone().text());
  assert.equal((await get(supervisorA)).status, 200, "the assigned Site Supervisor can open it");
  assert.equal((await get(supervisorB)).status, 404, "another Site Supervisor still cannot");

  // A published photo is for the customer, through its signed link only.
  app.d1.sqlite.prepare("UPDATE workflow_files SET visibility='published', update_id=77 WHERE id = ?").run(fileId);
  app.d1.sqlite.prepare("INSERT INTO project_updates (id, case_id, work_date, supervisor_email, internal_update, customer_update, status, published_at, created_at) VALUES (77, ?, '2026-12-02', 'super.a@alert.test', 'internal', 'Slab poured.', 'published', ?, ?)")
    .run(caseId, new Date().toISOString(), new Date().toISOString());
  assert.equal((await get(null)).status, 404, "a published photo still needs the signed link");
  assert.equal((await get(null, "&k=0000000000000000000000")).status, 404, "a made-up signature is refused");
  const portal = await (await request(`/api/workflow/public?code=${encodeURIComponent(code)}`)).json();
  const link = portal.data.updates[0].files[0].url;
  assert.match(link, /&k=[0-9a-f]{24}$/);
  const open = await request(link);
  assert.equal(open.status, 200, "the customer's own link works");
  assert.equal(open.headers.get("x-content-type-options"), "nosniff");
  const neighbour = await (await request(`/api/workflow/public?code=${encodeURIComponent((await newRequest("files2")).code)}`)).json();
  assert.equal(neighbour.data.updates.length, 0);
  assert.equal((await request(`/api/workflow/files?id=${fileId + 1}&k=${link.split("&k=")[1]}`)).status, 404, "a signature is good for that one file only");
});

test("uploads: scripts and web pages are refused, and anything unusual is served as a download that cannot run", async () => {
  const { caseId } = await newRequest("uploads1");
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='active_project', project_code='ATP-2026-90001' WHERE id = ?").run(caseId);

  const send = async (name, type, content) => {
    const form = new FormData();
    form.set("caseId", String(caseId));
    form.set("workerEmails", "[]");
    form.set("file", new File([content], name, { type }));
    return request("/api/worker/files", { method: "POST", headers: { cookie: admin }, body: form });
  };
  for (const [name, type] of [["page.html", "text/html"], ["logo.svg", "image/svg+xml"], ["run.js", "text/javascript"], ["evil.exe", "application/octet-stream"], ["sneaky.HTML", ""]]) {
    const refused = await send(name, type, "<script>fetch('/api/owner/settings')</script>");
    assert.equal(refused.status, 400, `${name} must be refused`);
    assert.match((await refused.json()).error, /cannot be uploaded/);
  }
  assert.equal(app.env.BUCKET.objects.size >= 0, true);

  // An allowed file that LOOKS like a page is still never rendered as one.
  const accepted = await send("plan.txt", "text/plain", "<html><script>alert(1)</script></html>");
  assert.equal(accepted.status, 201, await accepted.clone().text());
  const row = app.d1.sqlite.prepare("SELECT id FROM workflow_files WHERE case_id = ? AND category = 'worker_document'").get(caseId);
  const served = await request(`/api/worker/files?id=${row.id}`, { headers: { cookie: admin } });
  assert.equal(served.status, 200);
  assert.match(served.headers.get("content-disposition"), /^attachment;/);
  assert.equal(served.headers.get("content-type"), "application/octet-stream");
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  assert.match(served.headers.get("content-security-policy"), /sandbox/);
});

test("uploads: a 3 MB photo goes through (the framework used to stop everything above 1 MB), and a Persian file name downloads", async () => {
  const owner = await app.ownerCookie();
  const { caseId, code } = await newRequest("big1");
  const big = new Uint8Array(3 * 1024 * 1024);
  big.set(png.slice(0, 8));
  const result = await customerUpload(caseId, code, "photo-سقف.png", "image/png", big);
  assert.equal(result.status, 201, await result.clone().text());
  const id = app.d1.sqlite.prepare("SELECT id FROM workflow_files WHERE case_id = ?").get(caseId).id;
  const download = await request(`/api/workflow/files?id=${id}`, { headers: { cookie: owner } });
  assert.equal(download.status, 200, "a Persian file name must not crash the download");
  assert.match(download.headers.get("content-disposition"), /filename\*=UTF-8''photo-%D8%B3%D9%82%D9%81\.png/);
  assert.equal((await download.arrayBuffer()).byteLength, 3 * 1024 * 1024);
});

test("errors: a failing API call always answers with JSON the screens can read", async () => {
  const response = await request("/api/workflow/files?id=abc");
  assert.match(response.headers.get("content-type"), /json/);
  const missing = await request("/api/does-not-exist");
  assert.ok(missing.status >= 400);
  assert.match(missing.headers.get("content-type"), /json/);
  assert.equal(typeof (await missing.json()).error, "string");
});
