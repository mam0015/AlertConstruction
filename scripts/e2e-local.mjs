// End-to-end check of the whole business workflow against a RUNNING copy of the app.
//   1. Put TEST credentials in .dev.vars (never real ones) and run: npm run dev
//   2. BASE=http://localhost:5173 OWNER_EMAIL=... OWNER_PASSWORD=... TEAM_CODE=... node scripts/e2e-local.mjs
// It creates one Admin, Manager, Estimator, Site Supervisor and Worker, approves them as the Owner, then walks one
// customer request all the way from submission to a customer-approved estimate, an active project, calendar plan,
// team messages, end-of-day report and Owner review.
const BASE = (process.env.BASE ?? "http://localhost:5173").replace(/\/$/, "");
const { OWNER_EMAIL, OWNER_PASSWORD, TEAM_CODE } = process.env;
if (!OWNER_EMAIL || !OWNER_PASSWORD || !TEAM_CODE) { console.error("Set OWNER_EMAIL, OWNER_PASSWORD and TEAM_CODE (test values)."); process.exit(2); }

const stamp = Date.now().toString(36);
const staffPassword = `Test!${stamp}Pw`;
let failures = 0;
const ok = (condition, label, extra = "") => { console.log(`${condition ? "  ✓" : "  ✗ FAIL"} ${label}${!condition && extra ? ` — ${extra}` : ""}`); if (!condition) failures += 1; };

class Session {
  jar = new Map();
  async call(path, { method = "GET", json, form } = {}) {
    const headers = { Origin: BASE, Cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ") };
    let body;
    if (json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
    if (form) body = form;
    const response = await fetch(BASE + path, { method, headers, body, redirect: "manual" });
    for (const cookie of response.headers.getSetCookie?.() ?? []) { const [pair] = cookie.split(";"); const [k, ...v] = pair.split("="); if (/Max-Age=0/i.test(cookie)) this.jar.delete(k); else this.jar.set(k, v.join("=")); }
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
    return { ...data, status: response.status };
  }
}

const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

async function main() {
  const owner = new Session();
  console.log("Owner");
  let r = await owner.call("/api/team/login", { method: "POST", json: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  ok(r.status === 200 && r.redirect === "/owner", "Owner signs in with email + password only", JSON.stringify(r));
  r = await new Session().call("/api/team/login", { method: "POST", json: { email: OWNER_EMAIL, password: "wrong-password" } });
  ok(r.status === 401, "Wrong Owner password is refused");

  console.log("Team sign-up and Owner approval");
  const roles = { admin: "Admin", manager: "Manager", estimator: "Estimator", supervisor: "Site Supervisor", worker: "Worker" };
  const staff = {};
  for (const key of Object.keys(roles)) {
    const email = `${key}.${stamp}@test.localhost`;
    const s = new Session();
    const noCode = await s.call("/api/team/login", { method: "POST", json: { email, password: staffPassword } });
    ok(noCode.status === 401, `${roles[key]}: new account without Team Code is refused`);
    const requested = await s.call("/api/team/login", { method: "POST", json: { email, password: staffPassword, teamCode: TEAM_CODE } });
    ok(requested.status === 202 && requested.redirect === "/team/pending", `${roles[key]}: Team Code request goes to Waiting Approval`, JSON.stringify(requested));
    staff[key] = { email, session: s };
  }
  const snapshot = await owner.call("/api/owner/data");
  for (const key of Object.keys(roles)) {
    const row = snapshot.data.staffRequests.find((item) => item.email === staff[key].email);
    const approved = await owner.call("/api/owner/data", { method: "PATCH", json: { resource: "staff", id: row.id, payload: { status: "Approved", role: roles[key], tradeTitle: "" } } });
    ok(approved.status === 200, `Owner approves ${staff[key].email} as ${roles[key]}`, JSON.stringify(approved));
    const again = await staff[key].session.call("/api/team/login", { method: "POST", json: { email: staff[key].email, password: staffPassword, remember: true } });
    const homes = { admin: "/admin", manager: "/manager", estimator: "/estimator", supervisor: "/site-supervisor", worker: "/worker" };
    ok(again.status === 200 && again.redirect === homes[key], `${roles[key]} signs in again and lands on ${homes[key]}`, JSON.stringify(again));
  }

  console.log("Customer request → Admin");
  const customer = new Session();
  const phone = `04${String(Date.now()).slice(-8)}`;
  const location = "Parramatta NSW 2150";
  const created = await customer.call("/api/workflow/public", { method: "POST", json: { name: "Casey Customer", email: `casey.${stamp}@test.localhost`, phone, service: "Bathroom renovation", location, details: "Full bathroom renovation, approx 6 square metres.", timeframe: "Next month", budget: "$20k", termsAccepted: "on" } });
  ok(created.status === 201 && created.data?.code, "Customer submits a request and receives a private reference", JSON.stringify(created));
  const { caseId, code } = created.data;
  const lookupWithout = await new Session().call("/api/workflow/public/access", { method: "POST", json: { method: "phone", contact: phone } });
  ok(lookupWithout.status === 400, "Customer phone lookup needs the site address as well");
  const lookup = await new Session().call("/api/workflow/public/access", { method: "POST", json: { method: "phone", contact: phone, location: "Parramatta" } });
  ok(lookup.status === 200 && lookup.projects?.length >= 1, "Customer finds the project with phone + suburb");

  const act = (session, action, payload = {}) => session.call("/api/workflow", { method: "POST", json: { action, caseId, payload } });
  const stageOf = async (session) => (await session.call("/api/workflow")).data.cases.find((c) => c.id === caseId)?.stage;
  const admin = staff.admin.session; const supervisor = staff.supervisor.session; const estimator = staff.estimator.session;

  r = await act(admin, "message_customer", { body: "Please send any plans or photos of the bathroom.", kind: "document_request" });
  ok(r.status === 200, "Admin messages the customer and requests documents", JSON.stringify(r));
  const reply = await customer.call("/api/workflow/public/messages", { method: "POST", json: { code, body: "Photos attached, plan to follow." } });
  ok(reply.status === 201 && reply.data.messages.length === 2, "Customer replies in the portal", JSON.stringify(reply));
  const form = new FormData(); form.set("caseId", String(caseId)); form.set("code", code); form.set("file", new File([png], "bathroom.png", { type: "image/png" }));
  r = await customer.call("/api/workflow/public/files", { method: "POST", form });
  ok(r.status === 201, "Customer uploads a document when Admin asks for it", JSON.stringify(r));

  for (const [action, payload] of [["review_started", {}], ["customer_contacted", { note: "Called customer, confirmed scope." }], ["approve_intake", {}]]) {
    r = await act(admin, action, payload); ok(r.status === 200, `Admin: ${action}`, JSON.stringify(r));
  }
  r = await act(admin, "assign_visit", { supervisorEmail: staff.supervisor.email, supervisorName: "Site Supervisor", visitAt: "2026-12-01T09:00" });
  ok(r.status === 200, "Admin assigns the Site Supervisor", JSON.stringify(r));

  const photo = new FormData(); photo.set("caseId", String(caseId)); photo.set("category", "site_visit"); photo.set("file", new File([png], "site.png", { type: "image/png" }));
  const uploaded = await supervisor.call("/api/workflow/files", { method: "POST", form: photo });
  ok(uploaded.status === 201, "Site Supervisor uploads site photos", JSON.stringify(uploaded));
  r = await act(supervisor, "submit_site_visit", { visitDate: "2026-12-01", summary: "Bathroom 2.4 x 2.5m", findings: "Wet area needs waterproofing", recommendations: "Strip and rebuild", internalNotes: "", fileIds: [uploaded.data.id] });
  ok(r.status === 200, "Site Supervisor submits the visit report to Admin", JSON.stringify(r));
  r = await act(admin, "review_site_visit", { decision: "approved", note: "" });
  ok(r.status === 200 && await stageOf(estimator) === "site_visit_approved", "Admin approves the visit; the job appears for the Estimator", JSON.stringify(r));

  if (process.env.STOP_AT_ESTIMATOR) { console.log(`\nStopped with a job waiting for the Estimator (${stamp}). Accounts: *.${stamp}@test.localhost`); process.exit(failures ? 1 : 0); }
  const estimatorView = await estimator.call("/api/workflow");
  const seen = estimatorView.data.cases.find((c) => c.id === caseId);
  ok(seen && seen.customerEmail === "" && seen.customerPhone === "", "Estimator sees the job but not the customer's contact details");
  ok(seen?.files.some((f) => f.category === "site_visit"), "Estimator can see the Site Supervisor's photos");
  r = await act(admin, "save_estimate", { amount: "1", scope: "x" });
  ok(r.status === 200, "Admin can still price as a fallback (no Estimator available)");
  r = await act(estimator, "save_estimate", { amount: "12650.00", scope: "• Labour: 40 hours × $90\n• Materials: $6,000\nGST (10%) $1,150", terms: "Per signed contract" });
  ok(r.status === 200 && await stageOf(admin) === "estimate_ready", "Estimator approves the estimate; it returns to Admin", JSON.stringify(r));
  r = await act(admin, "send_estimate"); ok(r.status === 200, "Admin sends the estimate to the customer", JSON.stringify(r));
  r = await customer.call("/api/workflow/public", { method: "PATCH", json: { code, decision: "accept" } });
  ok(r.status === 200, "Customer accepts the estimate", JSON.stringify(r));
  r = await act(admin, "activate_project"); ok(r.status === 200 && await stageOf(admin) === "active_project", "Admin activates the project", JSON.stringify(r));
  r = await act(owner, "message_customer", { body: "Work starts Monday.", kind: "message" }); ok(r.status === 200, "Owner has full control too (can message the customer)", JSON.stringify(r));

  console.log("Calendar plan");
  const people = (await owner.call("/api/team/people")).data.people;
  const workerPerson = people.find((p) => p.email === staff.worker.email);
  ok(Boolean(workerPerson), "Approved team members appear in the directory");
  const dates = Array.from({ length: 10 }, (_, i) => new Date(Date.UTC(2026, 11, 1 + i)).toISOString().slice(0, 10));
  r = await admin.call("/api/team/calendar", { method: "POST", json: { assigneeEmail: staff.worker.email, title: "Demolition at Parramatta", dates, startTime: "07:00", notes: "Bring skip bin" } });
  ok(r.status === 201 && r.data.created === 10, "Admin plans 10 days for a worker", JSON.stringify(r));
  r = await staff.worker.session.call("/api/team/calendar?from=2026-12-01&to=2026-12-31");
  ok(r.status === 200 && r.data.length === 10 && r.data[0].createdByRole === "Admin", "Worker's own calendar shows the work and who assigned it", JSON.stringify(r).slice(0, 200));
  r = await staff.estimator.session.call("/api/team/calendar?from=2026-12-01&to=2026-12-31");
  ok(r.status === 200 && r.data.length === 0, "Other staff do not see someone else's calendar");
  r = await staff.worker.session.call("/api/team/calendar", { method: "POST", json: { assigneeEmail: staff.worker.email, title: "x", dates: ["2026-12-01"] } });
  ok(r.status === 400, "A worker cannot assign calendar work");
  r = await staff.manager.session.call("/api/team/calendar", { method: "POST", json: { assigneeEmail: staff.supervisor.email, title: "Site check", dates: ["2026-12-02"] } });
  ok(r.status === 201, "Manager can plan work for team members");

  console.log("Team messages");
  const msg = new FormData(); msg.set("to", staff.worker.email); msg.set("body", "Please start at 7am."); msg.set("file", new File([png], "plan.png", { type: "image/png" }));
  r = await staff.manager.session.call("/api/team/chat", { method: "POST", form: msg });
  ok(r.status === 201 && r.data.messages.at(-1).fileName === "plan.png", "Manager sends a message with a file to a worker", JSON.stringify(r).slice(0, 200));
  r = await staff.worker.session.call("/api/team/chat");
  ok(r.data.unread[staff.manager.email] === 1, "Worker sees the unread message");
  r = await staff.worker.session.call(`/api/team/chat?with=${encodeURIComponent(staff.manager.email)}`);
  ok(r.data.messages.length === 1, "Worker opens the conversation");
  const fileUrl = r.data.messages[0].fileUrl;
  const fileResponse = await fetch(BASE + fileUrl, { headers: { Cookie: [...staff.worker.session.jar].map(([k, v]) => `${k}=${v}`).join("; ") } });
  ok(fileResponse.status === 200, "Worker can open the attached file");
  const outsider = await fetch(BASE + fileUrl, { headers: { Cookie: [...staff.estimator.session.jar].map(([k, v]) => `${k}=${v}`).join("; ") } });
  ok(outsider.status === 404, "A third person cannot open a private file");
  const broadcast = new FormData(); broadcast.set("to", "*"); broadcast.set("body", "Team meeting Friday.");
  r = await owner.call("/api/team/chat", { method: "POST", form: broadcast });
  ok(r.status === 201, "Owner posts to the whole-team channel");
  r = await staff.estimator.session.call("/api/team/chat?with=*");
  ok(r.data.messages.some((m) => m.body === "Team meeting Friday."), "Everyone sees the team channel");

  console.log("End-of-day reports (Owner reviews)");
  r = await staff.estimator.session.call("/api/team/eod", { method: "POST", json: { summary: "Priced the bathroom job.", projectCode: "" } });
  ok(r.status === 201, "Estimator submits an end-of-day report", JSON.stringify(r));
  r = await owner.call("/api/team/eod", { method: "POST", json: { summary: "x" } });
  ok(r.status === 400, "Owner does not submit reports");
  const reports = (await owner.call("/api/owner/data")).data.eodReports;
  const mine = reports.find((report) => report.person === staff.estimator.email);
  ok(Boolean(mine), "Report reaches the Owner's review queue");
  r = await owner.call("/api/owner/data", { method: "PATCH", json: { resource: "report", id: mine.id, payload: { status: "Approved", ownerNote: "Good work." } } });
  ok(r.status === 200, "Owner approves the report with a note");
  r = await staff.estimator.session.call("/api/team/eod");
  ok(r.data[0].status === "Approved" && r.data[0].ownerNote === "Good work.", "Staff member sees the Owner's decision and note");

  console.log("Security");
  r = await estimator.call("/api/workflow", { method: "POST", json: { action: "approve_intake", caseId, payload: {} } });
  ok(r.status === 400, "Estimator cannot perform Admin actions");
  r = await staff.worker.session.call("/api/workflow");
  ok(r.status === 401, "Worker cannot read the project workflow");
  r = await new Session().call("/api/team/people");
  ok(r.status === 401, "Team directory needs sign-in");

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed ✔");
  process.exit(failures ? 1 : 0);
}
main().catch((error) => { console.error(error); process.exit(1); });
