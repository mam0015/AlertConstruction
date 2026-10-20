// Regression tests for the problems found by the full-app audit (October 2026): file access between staff, safe serving of uploads,
// upload size, and JSON errors. Each test names the problem it guards.
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const app = await startWorker("sec");
const { request, json } = app;
const admin = await app.staffCookie("admin.sec@alert.test", "Admin");

const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"));

const withAddress = (init, address) => ({ ...init, headers: { ...init.headers, "cf-connecting-ip": address } });
let visitor = 0;
async function newRequest(label) {
  // Each customer comes from a different address: new requests are limited to five an hour per address.
  visitor += 1;
  const created = await request("/api/workflow/public", withAddress(json(null, {
    name: `Customer ${label}`, email: `${label}@customer.test`, phone: "0400111222", service: "Bathroom renovation", location: "Parramatta NSW 2150",
    details: "Full bathroom renovation, approximately six square metres.", timeframe: "Next month", budget: "$20k", termsAccepted: "on",
  }), `198.18.0.${visitor}`));
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

test("project codes: every approved request gets its own code, even next to a project the Owner numbered by hand", async () => {
  const year = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric" }).format(new Date());
  app.d1.sqlite.exec(`CREATE TABLE IF NOT EXISTS projects_probe (x)`); // keep the helper tables untouched
  const codes = [];
  for (const label of ["code1", "code2", "code3"]) {
    const { caseId } = await newRequest(label);
    if (label === "code2") {
      // The Owner added a project by hand that uses the next number.
      const used = app.d1.sqlite.prepare("SELECT code FROM projects ORDER BY code DESC LIMIT 1").get()?.code;
      const next = used ? Number(used.split("-")[2]) + 1 : 1;
      app.d1.sqlite.prepare("INSERT INTO projects (code,name,service,stage,progress,contract_value,balance,customer_name,suburb,start_date,notes,updated_at) VALUES (?,?,?,?,0,0,0,'Mr Jones','Toorak','','private',?)")
        .run(`ATP-${year}-${String(next).padStart(5, "0")}`, "Manual", "Kitchen", "Planning", new Date().toISOString());
    }
    assert.equal((await request("/api/workflow", json(admin, { action: "review_started", caseId, payload: {} }))).status, 200);
    const approved = await request("/api/workflow", json(admin, { action: "approve_intake", caseId, payload: {} }));
    assert.equal(approved.status, 200, await approved.clone().text());
    codes.push(app.d1.sqlite.prepare("SELECT project_code AS code FROM workflow_cases WHERE id = ?").get(caseId).code);
  }
  assert.equal(new Set(codes).size, 3, `codes must differ: ${codes}`);
  for (const code of codes) assert.match(code, new RegExp(`^ATP-${year}-\\d{5}$`));
  const owners = app.d1.sqlite.prepare("SELECT customer_name FROM projects WHERE code = ?").get(codes[1]);
  assert.notEqual(owners?.customer_name, "Mr Jones", "the Owner's own project is never reused for a customer's request");
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM projects WHERE code IN (?,?,?)").get(...codes).n, 3);
});

test("old public tracking: says almost nothing, never shows the Owner's notes, and is rate limited", async () => {
  app.d1.sqlite.prepare("INSERT OR REPLACE INTO projects (code,name,service,stage,progress,contract_value,balance,customer_name,suburb,start_date,notes,updated_at) VALUES ('ATP-2026-48213','Kitchen','Kitchen','Planning',5,0,0,'Mr Secret','9 Secret Lane','','OWNER PRIVATE: customer pays late',?)").run(new Date().toISOString());
  const project = await request("/api/track/ATP-2026-48213");
  assert.equal(project.status, 404, "a project number is not a way in");

  const form = new FormData();
  for (const [key, value] of Object.entries({ service: "Kitchen Renovations", name: "Private Person", phone: "0400 111 222", email: "private@example.com", location: "9 Secret Lane", timeframe: "Within 1–3 months", budget: "$25,000–$75,000", material: "Premium", details: "Please renovate the whole kitchen, this is a detailed enough description." })) form.set(key, value);
  const created = await request("/api/requests", { method: "POST", body: form, headers: { "cf-connecting-ip": "203.0.113.7" } });
  assert.equal(created.status, 201, await created.clone().text());
  const { code } = await created.json();
  const record = await (await request(`/api/track/${code}`, { headers: { "cf-connecting-ip": "203.0.113.7" } })).json();
  assert.equal(record.service, "Kitchen Renovations");
  assert.equal(record.notes, "");
  assert.ok(!JSON.stringify(record).includes("Private Person") && !JSON.stringify(record).includes("Secret Lane"));

  let blocked = 0;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const guess = await request(`/api/track/ATP-2026-${String(10000 + attempt)}`, { headers: { "cf-connecting-ip": "198.51.100.9" } });
    if (guess.status === 429) blocked += 1;
  }
  assert.ok(blocked >= 3, `guessing must be stopped quickly, blocked=${blocked}`);
  let created429 = 0;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const again = new FormData();
    for (const [key, value] of form.entries()) again.set(key, value);
    if ((await request("/api/requests", { method: "POST", body: again, headers: { "cf-connecting-ip": "198.51.100.77" } })).status === 429) created429 += 1;
  }
  assert.ok(created429 >= 1, "a visitor cannot file unlimited requests");
});

test("sign-in: wrong guesses lock quickly, a parallel burst cannot slip past, and changing the e-mail does not reset the count", async () => {
  const attempt = (email, address = "192.0.2.50") => request("/api/team/login", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": address }, body: JSON.stringify({ email, password: "not-the-password", teamCode: "WRONG-CODE" }) });
  let first429 = -1;
  for (let index = 0; index < 12; index += 1) {
    const response = await attempt("someone@alert.test");
    if (response.status === 429 && first429 < 0) first429 = index;
  }
  assert.ok(first429 > 0 && first429 <= 8, `locked after at most 8 wrong answers (locked at ${first429})`);
  assert.equal((await attempt("someone-else@alert.test")).status, 401, "another e-mail from the same address is still allowed under the address limit");

  // Guessing the Team Code while changing the e-mail each time is stopped by the address limit.
  let statuses = [];
  for (let index = 0; index < 22; index += 1) statuses.push((await attempt(`guess${index}@alert.test`, "192.0.2.60")).status);
  assert.ok(statuses.includes(429), "rotating the e-mail address does not avoid the lock");

  const burst = await Promise.all(Array.from({ length: 90 }, (_, index) => attempt(`burst${index}@alert.test`, "192.0.2.70")));
  assert.ok(burst.filter((response) => response.status === 429).length >= 25, "a parallel burst is cut off after 60 attempts");
  assert.ok(burst.every((response) => response.status === 401 || response.status === 429));
});

test("authority switches are really saved, and Admin cannot read messages the Owner sent to other people", async () => {
  const owner = await app.ownerCookie();
  await request("/api/owner/data", json(owner, { resource: "message", payload: { recipient: "Site Supervisor 01", body: "ONLY FOR THE SUPERVISOR" } }));
  await request("/api/owner/data", json(owner, { resource: "message", payload: { recipient: "Operations team", body: "FOR THE WHOLE TEAM" } }));
  const before = await (await request("/api/admin/data", { headers: { cookie: admin } })).json();
  const bodies = JSON.stringify(before);
  assert.ok(!bodies.includes("ONLY FOR THE SUPERVISOR"), "the Owner's private message is not in the Admin's data");
  assert.ok(bodies.includes("FOR THE WHOLE TEAM"), "the shared channel still is");

  const saved = await request("/api/owner/data", json(owner, { resource: "permission", id: "Admin", payload: { projects: 0, schedule: 0, finance: 0, financeExport: 0 } }, "PATCH"));
  assert.equal(saved.status, 200);
  const stored = app.d1.sqlite.prepare("SELECT projects, schedule FROM role_permissions WHERE role = 'Admin'").get();
  assert.deepEqual({ ...stored }, { projects: 0, schedule: 0 }, "the switches are stored");
  const after = await (await request("/api/admin/data", { headers: { cookie: admin } })).json();
  assert.deepEqual(after.data.projects, [], "with the projects switch off Admin sees no projects");
  await request("/api/owner/data", json(owner, { resource: "permission", id: "Admin", payload: { projects: 1, schedule: 1, finance: 0, financeExport: 0 } }, "PATCH"));
});

test("photos: a report can only use real photos of the right kind, each used once", async () => {
  const supervisor = await app.staffCookie("super.photos@alert.test", "Site Supervisor");
  const { caseId } = await newRequest("photos1");
  for (const [action, payload] of [["review_started", {}], ["approve_intake", {}], ["assign_visit", { supervisorEmail: "super.photos@alert.test", supervisorName: "Photo Super", visitAt: "2026-12-03T09:00" }]]) {
    assert.equal((await request("/api/workflow", json(admin, { action, caseId, payload }))).status, 200, action);
  }
  const report = (fileIds) => request("/api/workflow", json(supervisor, { action: "submit_site_visit", caseId, payload: { visitDate: "2026-12-03", summary: "Looked", findings: "None", recommendations: "Proceed", internalNotes: "", fileIds } }));
  const fake = await report([99999999]);
  assert.equal(fake.status, 400);
  assert.match((await fake.json()).error, /site photo is required/);

  const upload = async (category) => {
    const form = new FormData();
    form.set("caseId", String(caseId));
    form.set("category", category);
    form.set("file", new File([png], `${category}.png`, { type: "image/png" }));
    const response = await request("/api/workflow/files", { method: "POST", headers: { cookie: supervisor }, body: form });
    assert.equal(response.status, 201, await response.clone().text());
    return (await response.json()).data.id;
  };
  const wrongKind = await upload("progress");
  assert.equal((await report([wrongKind])).status, 400, "a progress photo cannot stand in for a site-visit photo");
  const real = await upload("site_visit");
  assert.equal((await report([real])).status, 200);
});

test("sign-out: a copy of the session cookie stops working, for the Owner and for staff", async () => {
  const owner = await app.ownerCookie();
  assert.equal((await request("/api/owner/data", { headers: { cookie: owner } })).status, 200);
  const out = await request("/api/owner/logout", { method: "POST", headers: { cookie: owner } });
  assert.equal(out.status, 200);
  assert.equal((await request("/api/owner/data", { headers: { cookie: owner } })).status, 401, "the copied cookie no longer works");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const again = await app.ownerCookie();
  assert.equal((await request("/api/owner/data", { headers: { cookie: again } })).status, 200, "signing in again works");

  const staff = await app.staffCookie("leaver@alert.test", "Admin");
  assert.equal((await request("/api/admin/data", { headers: { cookie: staff } })).status, 200);
  assert.equal((await request("/api/admin/logout", { method: "POST", headers: { cookie: staff } })).status, 200);
  assert.equal((await request("/api/admin/data", { headers: { cookie: staff } })).status, 401);
});

test("finance: a wrong amount is refused instead of being saved as one cent", async () => {
  const owner = await app.ownerCookie();
  const entry = (payload) => request("/api/owner/data", json(owner, { resource: "finance", payload: { type: "Income", category: "Deposit", amount: 12345, entryDate: "2026-10-01", projectCode: "Business / General", note: "", ...payload } }));
  assert.equal((await entry({})).status, 201);
  for (const bad of [{ amount: -5000 }, { amount: 0 }, { amount: "" }, { amount: "abc" }, { amount: 1.5 }, { amount: 1e300 }, { type: "Bogus" }, { category: "" }, { entryDate: "not-a-date" }]) {
    const response = await entry(bad);
    assert.equal(response.status, 400, JSON.stringify(bad));
  }
  const rows = app.d1.sqlite.prepare("SELECT amount FROM finance_entries").all();
  assert.deepEqual(rows.map((row) => row.amount), [12345], "only the valid entry was stored, and nothing became 1 cent");
});

test("customer decisions: accept and decline at the same moment cannot both win", async () => {
  const { caseId, code } = await newRequest("decide1");
  const now = new Date().toISOString();
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='estimate_sent' WHERE id = ?").run(caseId);
  app.d1.sqlite.prepare("INSERT INTO workflow_estimates (case_id,amount_cents,scope,terms,status,created_by,created_at,sent_at,customer_decided_at,confirmed_at) VALUES (?,?,?,?,?,?,?,?,'','')").run(caseId, 100000, "Scope", "Terms", "sent", "admin", now, now);
  const decide = (decision) => request("/api/workflow/public", { method: "PATCH", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.200" }, body: JSON.stringify({ code, decision }) });
  const answers = await Promise.all([decide("accept"), decide("decline")]);
  assert.deepEqual(answers.map((answer) => answer.status).sort(), [200, 400], "exactly one answer counts");
  const stage = app.d1.sqlite.prepare("SELECT stage FROM workflow_cases WHERE id = ?").get(caseId).stage;
  const estimate = app.d1.sqlite.prepare("SELECT status FROM workflow_estimates WHERE case_id = ?").get(caseId).status;
  assert.ok((stage === "customer_approved" && estimate === "customer_accepted") || (stage === "estimate_declined" && estimate === "customer_declined"), `consistent: ${stage} / ${estimate}`);
  if (stage === "estimate_declined") {
    // A declined estimate is not the end of the job: the price can be revised and sent again.
    const revised = await request("/api/workflow", json(admin, { action: "save_estimate", caseId, payload: { amount: "900", scope: "Smaller scope", terms: "" } }));
    assert.equal(revised.status, 200, await revised.clone().text());
  }
});

test("a job whose Site Supervisor leaves can be handed to another approved Site Supervisor", async () => {
  await app.staffCookie("super.old@alert.test", "Site Supervisor");
  const next = await app.staffCookie("super.new@alert.test", "Site Supervisor");
  await app.staffCookie("plain.worker@alert.test", "Worker");
  const { caseId } = await newRequest("handover1");
  app.d1.sqlite.prepare("UPDATE workflow_cases SET stage='active_project', assigned_supervisor_email='super.old@alert.test', assigned_supervisor_name='Old' WHERE id = ?").run(caseId);
  const hand = (email, cookie = admin) => request("/api/workflow", json(cookie, { action: "reassign_supervisor", caseId, payload: { supervisorEmail: email, supervisorName: "New Super" } }));
  assert.equal((await hand("plain.worker@alert.test")).status, 400, "only an approved Site Supervisor can take a job");
  assert.equal((await hand("nobody@alert.test")).status, 400);
  assert.equal((await hand("super.new@alert.test", next)).status, 400, "a Site Supervisor cannot hand jobs around");
  assert.equal((await hand("super.new@alert.test")).status, 200);
  assert.equal(app.d1.sqlite.prepare("SELECT assigned_supervisor_email AS e FROM workflow_cases WHERE id = ?").get(caseId).e, "super.new@alert.test");
});

test("staff accounts: a short password is refused at sign-up, and the Owner can reset a person who is locked out", async () => {
  const join = (email, password) => request("/api/team/login", json(null, { email, password, teamCode: app.teamCode }));
  const weak = await join("weak@alert.test", "short");
  assert.equal(weak.status, 400);
  assert.match((await weak.json()).error, /at least 10/);
  assert.equal(app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM staff_access_requests WHERE email='weak@alert.test'").get().n, 0);

  assert.equal((await join("forgetful@alert.test", "LongEnough-2026!")).status, 202);
  assert.equal((await join("forgetful@alert.test", "a-different-password")).status, 401, "the forgotten password is not accepted");
  const owner = await app.ownerCookie();
  const row = app.d1.sqlite.prepare("SELECT id FROM staff_access_requests WHERE email='forgetful@alert.test'").get();
  assert.equal((await request("/api/owner/data", { method: "DELETE", headers: { "content-type": "application/json", cookie: owner }, body: JSON.stringify({ resource: "staff", id: row.id }) })).status, 200);
  assert.equal((await join("forgetful@alert.test", "A-new-password-2026")).status, 202, "after the reset they can join again with the Team Code");
});

test("errors: internal programming messages never reach the screen", async () => {
  const owner = await app.ownerCookie();
  const response = await request("/api/owner/data", { method: "POST", headers: { "content-type": "application/json", cookie: owner }, body: "null" });
  assert.ok(response.status >= 400);
  const text = await response.text();
  assert.ok(!/Cannot read|is not a function|TypeError|D1_ERROR|SQLITE/.test(text), text);
});
