/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, unknown>;

const ownerKey = "atp-v64-owner-demo";
const requestKey = "atp-v64-admin-requests-demo";

const projects = [
  { id: 1, code: "ATP-2026-00124", name: "Glen Waverley renovation", service: "Home Renovation", stage: "Construction", progress: 62, contractValue: 18400000, balance: 5520000, customerName: "Customer 124", suburb: "Glen Waverley", startDate: "2026-04-14", notes: "Framing and rough-in stage.", updatedAt: "2026-08-09T16:45:00+10:00" },
  { id: 2, code: "ATP-2026-00131", name: "Structural assessment 131", service: "Engineering", stage: "Site inspection", progress: 28, contractValue: 1860000, balance: 930000, customerName: "Customer 131", suburb: "Rowville", startDate: "2026-08-03", notes: "Engineering inspection and report.", updatedAt: "2026-08-09T15:30:00+10:00" },
  { id: 3, code: "ATP-2026-00136", name: "Bathroom renovation 136", service: "Bathroom Renovation", stage: "Estimate", progress: 18, contractValue: 4280000, balance: 4280000, customerName: "Customer 136", suburb: "Wantirna", startDate: "2026-08-12", notes: "Scope and supplier pricing in review.", updatedAt: "2026-08-09T14:20:00+10:00" },
  { id: 4, code: "ATP-2026-00141", name: "Home extension 141", service: "Home Extension", stage: "Admin review", progress: 8, contractValue: 0, balance: 0, customerName: "Customer 141", suburb: "Wheelers Hill", startDate: "", notes: "New request awaiting owner review.", updatedAt: "2026-08-09T13:10:00+10:00" },
];

const financeEntries = [
  { id: 1, type: "Income", category: "Progress payment", projectCode: "ATP-2026-00124", amount: 3680000, entryDate: "2026-08-08", note: "Deposit progress claim", createdAt: "2026-08-08T12:00:00+10:00" },
  { id: 2, type: "Outcome", category: "Plumbing", projectCode: "ATP-2026-00124", amount: 1240000, entryDate: "2026-08-07", note: "Rough-in invoice", createdAt: "2026-08-07T12:00:00+10:00" },
  { id: 3, type: "Outcome", category: "Materials", projectCode: "ATP-2026-00124", amount: 875000, entryDate: "2026-08-06", note: "Timber and fixings", createdAt: "2026-08-06T12:00:00+10:00" },
  { id: 4, type: "Income", category: "Engineering invoice", projectCode: "ATP-2026-00131", amount: 420000, entryDate: "2026-08-05", note: "Inspection payment", createdAt: "2026-08-05T12:00:00+10:00" },
  { id: 5, type: "Income", category: "Progress payment", projectCode: "ATP-2026-00124", amount: 5520000, entryDate: "2026-07-15", note: "Construction stage", createdAt: "2026-07-15T12:00:00+10:00" },
  { id: 6, type: "Outcome", category: "Labour", projectCode: "ATP-2026-00124", amount: 2310000, entryDate: "2026-07-12", note: "Site labour", createdAt: "2026-07-12T12:00:00+10:00" },
  { id: 7, type: "Income", category: "Progress payment", projectCode: "ATP-2026-00124", amount: 3680000, entryDate: "2026-06-18", note: "Demolition stage", createdAt: "2026-06-18T12:00:00+10:00" },
  { id: 8, type: "Outcome", category: "Demolition", projectCode: "ATP-2026-00124", amount: 1480000, entryDate: "2026-06-10", note: "Demolition contractor", createdAt: "2026-06-10T12:00:00+10:00" },
];

const scheduleEvents = [
  { id: 1, eventDate: "2026-08-10", startTime: "09:00", title: "Owner project review", assignee: "Ali Mobini", projectCode: "ATP-2026-00124", tone: "gold", notes: "Finance and schedule review" },
  { id: 2, eventDate: "2026-08-12", startTime: "07:30", title: "Plumbing rough-in", assignee: "Site Supervisor 01", projectCode: "ATP-2026-00124", tone: "blue", notes: "Confirm set-out before work" },
  { id: 3, eventDate: "2026-08-14", startTime: "10:00", title: "Framing inspection", assignee: "Site Supervisor 01", projectCode: "ATP-2026-00124", tone: "green", notes: "Upload inspection photos" },
  { id: 4, eventDate: "2026-08-17", startTime: "07:30", title: "Electrical rough-in", assignee: "Electrician", projectCode: "ATP-2026-00124", tone: "orange", notes: "Rebooked" },
  { id: 5, eventDate: "2026-08-20", startTime: "08:00", title: "Wall lining begins", assignee: "Construction team", projectCode: "ATP-2026-00124", tone: "blue", notes: "" },
];

const eodReports = [
  { id: 1, person: "Site Supervisor 01", role: "Site Supervisor", projectCode: "ATP-2026-00124", summary: "Checked framing dimensions, uploaded 8 site photos and confirmed plumbing set-out.", submittedAt: "2026-08-09T16:42:00+10:00", status: "Pending", ownerNote: "" },
  { id: 2, person: "Admin 01", role: "Admin", projectCode: "ATP-2026-00136", summary: "Reviewed customer brief, prepared scope notes and requested two supplier prices.", submittedAt: "2026-08-09T16:18:00+10:00", status: "Pending", ownerNote: "" },
  { id: 3, person: "Worker 01", role: "Worker", projectCode: "ATP-2026-00124", summary: "Completed demolition clean-up and separated waste for collection.", submittedAt: "2026-08-09T16:05:00+10:00", status: "Approved", ownerNote: "Good work. Keep the waste docket with the project." },
];

const messages = [
  { id: 1, sender: "Site Supervisor 01", recipient: "Owner", body: "Morning Ali, the framing dimensions are checked and the plumbing set-out is ready.", sentAt: "2026-08-09T10:36:00+10:00" },
  { id: 2, sender: "Owner", recipient: "Site Supervisor 01", body: "Great. Please upload the marked-up photos to Project 124 before the EOD report.", sentAt: "2026-08-09T10:40:00+10:00" },
  { id: 3, sender: "Site Supervisor 01", recipient: "Owner", body: "Done — 8 photos are now attached to the project.", sentAt: "2026-08-09T10:44:00+10:00" },
];

const staffRequests = [
  { id: 1, email: "new.admin@alerttradiepro.demo", status: "Pending", role: "Unassigned", tradeTitle: "", requestedAt: "2026-08-10T08:22:00+10:00", reviewedAt: "", lastSeenAt: "2026-08-10T08:22:00+10:00" },
];

const jobRequests = [
  { id: 1, code: "REQ-2026-0148", requestType: "Project Request", customerName: "Customer 148", contact: "0400 000 148", service: "Home Extension", suburb: "Glen Waverley", submittedAt: "2026-08-09T08:42:00+10:00", status: "New", priority: "High", summary: "Ground-floor extension, new family area and internal reconfiguration.", assignedTo: "Admin 01", updatedAt: "2026-08-09T11:00:00+10:00" },
  { id: 2, code: "JOB-2026-0221", requestType: "Job Request", customerName: "Customer 221", contact: "customer221@example.com", service: "Building Inspection", suburb: "Rowville", submittedAt: "2026-08-09T09:18:00+10:00", status: "Contacted", priority: "Normal", summary: "Pre-purchase building inspection requested for this week.", assignedTo: "Admin 01", updatedAt: "2026-08-09T11:10:00+10:00" },
  { id: 3, code: "REQ-2026-0151", requestType: "Project Request", customerName: "Customer 151", contact: "0400 000 151", service: "Engineering", suburb: "Wantirna", submittedAt: "2026-08-09T10:06:00+10:00", status: "Needs review", priority: "Urgent", summary: "Structural advice required after movement was noticed near the rear opening.", assignedTo: "Site Supervisor 01", updatedAt: "2026-08-09T11:20:00+10:00" },
  { id: 4, code: "JOB-2026-0224", requestType: "Job Request", customerName: "Customer 224", contact: "customer224@example.com", service: "Bathroom Renovation", suburb: "Wheelers Hill", submittedAt: "2026-08-09T10:34:00+10:00", status: "New", priority: "Normal", summary: "Bathroom renovation enquiry with photos ready to upload.", assignedTo: "Unassigned", updatedAt: "2026-08-09T11:30:00+10:00" },
];

const initialOwner = { projects, financeEntries, scheduleEvents, eodReports, messages, permissions: { role: "Admin", projects: 1, schedule: 1, finance: 0, financeExport: 0 }, staffRequests };

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function load<T>(key: string, fallback: T): T {
  try { const saved = window.localStorage.getItem(key); return saved ? JSON.parse(saved) as T : clone(fallback); }
  catch { return clone(fallback); }
}
function save(key: string, value: unknown) { window.localStorage.setItem(key, JSON.stringify(value)); }
function nextId(rows: Array<{ id: number }>) { return Math.max(0, ...rows.map((row) => row.id)) + 1; }
function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }); }

function ownerSnapshot() { return load(ownerKey, initialOwner); }
function adminSnapshot() {
  const owner = ownerSnapshot();
  const requests = load(requestKey, jobRequests);
  return { projects: owner.projects.map((project) => {
    const visibleProject: Json = { ...project };
    delete visibleProject.contractValue;
    delete visibleProject.balance;
    return visibleProject;
  }), requests, scheduleEvents: owner.scheduleEvents, messages: owner.messages, permissions: owner.permissions };
}

function ownerMutation(method: string, body: Json) {
  const snapshot = ownerSnapshot() as any;
  const resource = String(body.resource ?? "");
  const payload = (body.payload ?? {}) as Json;
  const id = Number(body.id ?? 0);
  const map: Record<string, string> = { project: "projects", finance: "financeEntries", schedule: "scheduleEvents", report: "eodReports", message: "messages", staff: "staffRequests" };
  const listName = map[resource];
  if (resource === "permission") snapshot.permissions = { ...snapshot.permissions, ...payload };
  else if (method === "POST" && listName) snapshot[listName].push({ id: nextId(snapshot[listName]), ...payload, createdAt: new Date().toISOString(), sentAt: new Date().toISOString(), sender: resource === "message" ? "Owner" : undefined });
  else if (method === "PATCH" && listName) snapshot[listName] = snapshot[listName].map((row: Json) => Number(row.id) === id ? { ...row, ...payload, updatedAt: new Date().toISOString() } : row);
  else if (method === "DELETE" && listName) snapshot[listName] = snapshot[listName].filter((row: Json) => Number(row.id) !== id);
  save(ownerKey, snapshot);
  return snapshot;
}

function adminMutation(method: string, body: Json) {
  const resource = String(body.resource ?? "");
  const payload = (body.payload ?? {}) as Json;
  const id = Number(body.id ?? 0);
  const owner = ownerSnapshot() as any;
  const requests = load(requestKey, jobRequests) as any[];
  if (resource === "request") {
    const updated = method === "POST" ? [...requests, { id: nextId(requests), ...payload }] : requests.map((row) => row.id === id ? { ...row, ...payload } : row);
    save(requestKey, updated);
  } else {
    const listName = resource === "project" ? "projects" : resource === "schedule" ? "scheduleEvents" : "messages";
    if (method === "POST") owner[listName].push({ id: nextId(owner[listName]), ...payload, sentAt: new Date().toISOString(), sender: resource === "message" ? "Admin" : undefined, contractValue: 0, balance: 0 });
    else if (method === "PATCH") owner[listName] = owner[listName].map((row: Json) => Number(row.id) === id ? { ...row, ...payload } : row);
    else if (method === "DELETE") owner[listName] = owner[listName].filter((row: Json) => Number(row.id) !== id);
    save(ownerKey, owner);
  }
  return adminSnapshot();
}

export function installMockApi() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    const method = (init.method ?? "GET").toUpperCase();
    let body: Json = {};
    if (init.body && typeof init.body === "string") { try { body = JSON.parse(init.body) as Json; } catch { body = {}; } }

    if (url.pathname.endsWith("/api/owner/data")) return response({ data: method === "GET" ? ownerSnapshot() : ownerMutation(method, body) });
    if (url.pathname.endsWith("/api/admin/data")) return response({ data: method === "GET" ? adminSnapshot() : adminMutation(method, body) });
    if (url.pathname.endsWith("/api/owner/logout") || url.pathname.endsWith("/api/admin/logout")) return response({ ok: true });
    if (url.pathname.endsWith("/api/team/login")) return response({ error: "Secure Owner and staff sign-in requires the Full-Stack deployment. Use the Owner or Admin demo links in the upload guide to review these pages on GitHub Pages." }, 400);
    return nativeFetch(input, init);
  };
}

export function resetDemoData() {
  window.localStorage.removeItem(ownerKey);
  window.localStorage.removeItem(requestKey);
  window.location.reload();
}
