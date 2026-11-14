import { estimatorStages, type WorkflowRole, type WorkflowSnapshot, type WorkflowStage } from "../app/workflow/types";
import { memoizePerDatabase, runtimeBindings } from "./runtime";
import { assertProjectAccess, clearPortfolioSaved, markPortfolioSaved, caseViewActions, ConflictError, customerSafeScope, ensureCaseViewTables, finishedStatusStatement, isRepeat, milestoneStageStatement, operationKey, operationKeyStatement, payloadFingerprint, performCaseViewAction, priorOperation, readCaseViews, readCustomerView, stageOptions } from "./case-view-store";
import { sha256Hex } from "./throttle";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;

async function database(): Promise<D1> {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The project workflow database is unavailable.");
  return env.DB;
}

// No free-text field needs more than this; without a limit one account could fill the database with megabytes per note.
const MAX_TEXT = 10_000;

function clean(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : fallback;
}

function required(value: unknown, label: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) throw new Error(`${label} is required.`);
  if (raw.length > MAX_TEXT) throw new Error(`${label} is too long.`);
  return raw;
}

function bounded(value: unknown, label: string, max: number) {
  const result = required(value, label).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (result.length > max) throw new Error(`${label} is too long.`);
  return result;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type CustomerContactKind = "email" | "phone";

export function normaliseCustomerContact(kind: CustomerContactKind, value: string) {
  if (kind === "email") return value.trim().toLowerCase();
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("001161")) digits = digits.slice(4);
  if (digits.startsWith("61") && digits.length === 11) digits = `0${digits.slice(2)}`;
  return digits;
}

function requiredContactHashSecret() {
  const value = process.env.CUSTOMER_CONTACT_HASH_SECRET?.trim();
  if (!value) throw new Error("CUSTOMER_CONTACT_HASH_SECRET is not configured.");
  return value;
}

// Customers see published photos through links that carry a signature, so a photo id cannot simply be counted up by a stranger.
async function fileLinkSignature(id: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`${requiredContactHashSecret()}|file-link`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`file:${id}`)));
  return Array.from(bytes.slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function customerFileLink(id: number) {
  return `/api/workflow/files?id=${id}&k=${await fileLinkSignature(id)}`;
}

export async function validCustomerFileLink(id: number, signature: string) {
  const expected = await fileLinkSignature(id);
  if (signature.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}

async function customerContactHash(kind: CustomerContactKind, value: string) {
  const normalised = normaliseCustomerContact(kind, value);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requiredContactHashSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${kind}:${normalised}`)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureWorkflowDatabaseOnce() {
  const db = await database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, service TEXT NOT NULL, stage TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, contract_value INTEGER NOT NULL DEFAULT 0, balance INTEGER NOT NULL DEFAULT 0, customer_name TEXT NOT NULL DEFAULT '', suburb TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS staff_access_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', role TEXT NOT NULL DEFAULT 'Unassigned', trade_title TEXT NOT NULL DEFAULT '', requested_at TEXT NOT NULL, reviewed_at TEXT NOT NULL DEFAULT '', last_seen_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS workflow_cases (id INTEGER PRIMARY KEY AUTOINCREMENT, request_code TEXT NOT NULL UNIQUE, project_code TEXT NOT NULL DEFAULT '', customer_name TEXT NOT NULL, customer_email TEXT NOT NULL DEFAULT '', customer_phone TEXT NOT NULL DEFAULT '', service TEXT NOT NULL, suburb TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', timeframe TEXT NOT NULL DEFAULT '', budget TEXT NOT NULL DEFAULT '', stage TEXT NOT NULL DEFAULT 'request_submitted', assigned_supervisor_email TEXT NOT NULL DEFAULT '', assigned_supervisor_name TEXT NOT NULL DEFAULT '', site_visit_at TEXT NOT NULL DEFAULT '', project_folder TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS site_visit_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, supervisor_email TEXT NOT NULL, visit_date TEXT NOT NULL, summary TEXT NOT NULL, findings TEXT NOT NULL, recommendations TEXT NOT NULL, internal_notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'submitted', admin_note TEXT NOT NULL DEFAULT '', submitted_at TEXT NOT NULL, reviewed_at TEXT NOT NULL DEFAULT '')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS workflow_files (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, update_id INTEGER NOT NULL DEFAULT 0, category TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, uploaded_by TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'internal', uploaded_at TEXT NOT NULL, published_at TEXT NOT NULL DEFAULT '')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS workflow_estimates (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL UNIQUE, amount_cents INTEGER NOT NULL, scope TEXT NOT NULL, terms TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', created_by TEXT NOT NULL, created_at TEXT NOT NULL, sent_at TEXT NOT NULL DEFAULT '', customer_decided_at TEXT NOT NULL DEFAULT '', confirmed_at TEXT NOT NULL DEFAULT '')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS project_updates (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, work_date TEXT NOT NULL, supervisor_email TEXT NOT NULL, internal_update TEXT NOT NULL, customer_update TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending_admin', admin_note TEXT NOT NULL DEFAULT '', owner_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, admin_reviewed_at TEXT NOT NULL DEFAULT '', owner_reviewed_at TEXT NOT NULL DEFAULT '', published_at TEXT NOT NULL DEFAULT '')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS quality_inspections (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL UNIQUE, supervisor_email TEXT NOT NULL, inspected_at TEXT NOT NULL, summary TEXT NOT NULL, defects TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'submitted', admin_note TEXT NOT NULL DEFAULT '', owner_note TEXT NOT NULL DEFAULT '', submitted_at TEXT NOT NULL, reviewed_at TEXT NOT NULL DEFAULT '', completed_at TEXT NOT NULL DEFAULT '')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS change_proposals (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'sent', created_by TEXT NOT NULL, created_at TEXT NOT NULL, customer_reply TEXT NOT NULL DEFAULT '', decided_at TEXT NOT NULL DEFAULT '')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS workflow_events (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, actor_role TEXT NOT NULL, actor_email TEXT NOT NULL DEFAULT '', event_type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', audience TEXT NOT NULL DEFAULT 'internal', created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, sender TEXT NOT NULL, sender_label TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'message', created_at TEXT NOT NULL)`),
    db.prepare("CREATE INDEX IF NOT EXISTS customer_messages_case_idx ON customer_messages(case_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_cases_stage_idx ON workflow_cases(stage)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_cases_supervisor_idx ON workflow_cases(assigned_supervisor_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_events_case_idx ON workflow_events(case_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_files_case_idx ON workflow_files(case_id, category)"),
    db.prepare("CREATE INDEX IF NOT EXISTS project_updates_case_idx ON project_updates(case_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS quality_inspections_case_idx ON quality_inspections(case_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS change_proposals_case_idx ON change_proposals(case_id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS request_consents (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL UNIQUE, terms_version TEXT NOT NULL, accepted_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_contact_index (
      case_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('email','phone')),
      contact_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (case_id, kind)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS customer_contact_lookup_idx ON customer_contact_index(kind, contact_hash)"),
    // One row per request: a fingerprint of "who asked for what, where", so the same request sent twice is recognised (see createPublicWorkflowRequest).
    db.prepare("CREATE TABLE IF NOT EXISTS request_fingerprints (case_id INTEGER PRIMARY KEY, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL)"),
    // One row per "Create project" press (the screen sends the same key when it retries), so a retry never makes a second project.
    db.prepare("CREATE TABLE IF NOT EXISTS team_project_keys (client_key TEXT PRIMARY KEY, case_id INTEGER NOT NULL DEFAULT 0, fingerprint TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS request_fingerprints_idx ON request_fingerprints(fingerprint)"),
  ]);

  const missing = await db.prepare(`SELECT wc.id,wc.customer_email AS customerEmail,wc.customer_phone AS customerPhone,wc.created_at AS createdAt
    FROM workflow_cases wc
    WHERE NOT EXISTS (SELECT 1 FROM customer_contact_index ci WHERE ci.case_id=wc.id AND ci.kind='email')
       OR NOT EXISTS (SELECT 1 FROM customer_contact_index ci WHERE ci.case_id=wc.id AND ci.kind='phone')
    ORDER BY wc.id DESC LIMIT 100`).all<Record<string, unknown>>();
  const backfill = [];
  for (const row of missing.results) {
    const caseId = Number(row.id);
    const createdAt = String(row.createdAt || new Date().toISOString());
    const email = normaliseCustomerContact("email", String(row.customerEmail || ""));
    const phone = normaliseCustomerContact("phone", String(row.customerPhone || ""));
    if (email) backfill.push(db.prepare("INSERT OR IGNORE INTO customer_contact_index (case_id,kind,contact_hash,created_at) VALUES (?,'email',?,?)").bind(caseId, await customerContactHash("email", email), createdAt));
    if (phone) backfill.push(db.prepare("INSERT OR IGNORE INTO customer_contact_index (case_id,kind,contact_hash,created_at) VALUES (?,'phone',?,?)").bind(caseId, await customerContactHash("phone", phone), createdAt));
  }
  if (backfill.length) await db.batch(backfill);
  // Two workflows can never share a project number. Created only when the existing data already satisfies it (older data is never touched).
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS workflow_cases_project_code_unique ON workflow_cases(project_code) WHERE project_code<>''").run().catch(() => undefined);
}

function eventStatement(db: D1, caseId: number, role: string, email: string, eventType: string, title: string, detail = "", audience = "internal") {
  return db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(caseId, role, email, eventType, title, detail, audience, new Date().toISOString());
}

// The same history line, written only if the change with this token happened in the same batch.
function eventStatementIf(db: D1, caseId: number, role: string, email: string, eventType: string, title: string, detail: string, audience: string, now: string, token: string) {
  return db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM save_tokens WHERE token=?)")
    .bind(caseId, role, email, eventType, title, detail, audience, now, token);
}

// The same history line, written only if the statement just before it in the batch changed a row (SQLite changes()).
function eventStatementIfChanged(db: D1, caseId: number, role: string, email: string, eventType: string, title: string, detail: string, audience: string, now: string) {
  return db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) SELECT ?,?,?,?,?,?,?,? WHERE changes() > 0")
    .bind(caseId, role, email, eventType, title, detail, audience, now);
}

// A decision about something that can be sent again (a report, an inspection, an estimate draft) must name the exact version on screen;
// a request that does not (an old page, a hand-made request) is refused instead of guessing. The version is compared exactly as the
// screen received it (never trimmed or reshaped), so a version shown on screen always matches itself.
function requiredVersion(value: unknown, what = "deciding") {
  if (typeof value !== "string") throw new ConflictError(`This page is out of date. Refresh to see the latest before ${what}.`);
  return value;
}

// The current version of a job's estimate / site visit report / quality inspection, as SQL (see record_revisions in case-view-store):
// the saved revision, or — for jobs saved before revisions existed — the record's own timestamp, or "" when there is no record yet.
// "sent" is the customer's decision key of the quote that was sent: a new random value on every Send, shown only on that customer's portal.
type RevisionKind = "estimate" | "site_visit" | "quality" | "sent";
const revisionFallback: Record<RevisionKind, string> = {
  sent: "(SELECT e.sent_at FROM workflow_estimates e WHERE e.case_id=workflow_cases.id)",
  estimate: "(SELECT e.created_at FROM workflow_estimates e WHERE e.case_id=workflow_cases.id)",
  site_visit: "(SELECT r.submitted_at FROM site_visit_reports r WHERE r.case_id=workflow_cases.id ORDER BY r.id DESC LIMIT 1)",
  quality: "(SELECT q.submitted_at FROM quality_inspections q WHERE q.case_id=workflow_cases.id)",
};
const currentRevision = (kind: RevisionKind) => `COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='${kind}' AND rv.case_id=workflow_cases.id), ${revisionFallback[kind]}, '')`;
// A new version for a record saved again in this batch (only if the move with this token happened).
function newRevisionStatement(db: D1, kind: RevisionKind, caseId: number, revision: string, token: string) {
  return db.prepare("INSERT INTO record_revisions (kind,case_id,revision) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM save_tokens WHERE token=?) ON CONFLICT(kind,case_id) DO UPDATE SET revision=excluded.revision")
    .bind(kind, caseId, revision, token);
}

async function event(db: D1, caseId: number, role: string, email: string, eventType: string, title: string, detail = "", audience = "internal") {
  await eventStatement(db, caseId, role, email, eventType, title, detail, audience).run();
}

async function removeLegacyWorkflowDemo() {
  if (process.env.NODE_ENV === "development") return;
  const db = await database();
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_migrations (
    migration_key TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`).run();
  const applied = await db.prepare("SELECT migration_key FROM app_migrations WHERE migration_key=?")
    .bind("remove_workflow_demo_v72").first<{ migration_key: string }>();
  if (applied) return;
  const demoCases = "SELECT id FROM workflow_cases WHERE request_code IN ('REQ-2026-0201','REQ-2026-0198') AND customer_email LIKE '%@example.com'";
  await db.batch([
    db.prepare(`DELETE FROM request_consents WHERE case_id IN (${demoCases})`),
    db.prepare(`DELETE FROM quality_inspections WHERE case_id IN (${demoCases})`),
    db.prepare(`DELETE FROM project_updates WHERE case_id IN (${demoCases})`),
    db.prepare(`DELETE FROM workflow_estimates WHERE case_id IN (${demoCases})`),
    db.prepare(`DELETE FROM workflow_files WHERE case_id IN (${demoCases})`),
    db.prepare(`DELETE FROM site_visit_reports WHERE case_id IN (${demoCases})`),
    db.prepare(`DELETE FROM workflow_events WHERE case_id IN (${demoCases})`),
    db.prepare(`DELETE FROM workflow_cases WHERE id IN (${demoCases})`),
    db.prepare("INSERT OR IGNORE INTO app_migrations (migration_key,applied_at) VALUES (?,?)")
      .bind("remove_workflow_demo_v72", new Date().toISOString()),
  ]);
}
type Raw = Record<string, unknown>;

export type CustomerProjectAccess = {
  requestCode: string;
  service: string;
  suburb: string;
  updatedAt: string;
};

// Words that say nothing about WHERE a place is (street types, directions, "Melbourne"): typing only these is not a second proof of who you are.
const GENERIC_PLACE_WORDS = new Set(["street", "st", "road", "rd", "avenue", "ave", "drive", "dr", "court", "ct", "place", "pl", "lane", "ln", "crescent", "cres", "close", "cl", "parade", "pde", "boulevard", "blvd", "highway", "hwy", "way", "terrace", "tce", "circuit", "cct", "grove", "gr", "unit", "apt", "apartment", "suite", "level", "the", "and", "north", "south", "east", "west", "nth", "sth", "melbourne", "victoria", "vic", "australia", "aus"]);
const placeWords = (text: string) => String(text ?? "").normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
// The words of a typed address that really identify it: not street types or directions, at least three letters.
export function distinctivePlaceWords(text: string) {
  return [...new Set(placeWords(text).filter((word) => word.length >= 3 && !GENERIC_PLACE_WORDS.has(word)))];
}

// The second proof when a customer looks a project up by e-mail or phone: every distinctive word they typed must be a whole word of the address
// they gave us (a few letters such as "stre", or only "road" or "Melbourne", prove nothing and match nobody).
export async function findCustomerProjectsByContact(kind: CustomerContactKind, value: string, location: string): Promise<CustomerProjectAccess[]> {
  await ensureWorkflowDatabase();
  await removeLegacyWorkflowDemo();
  const normalised = normaliseCustomerContact(kind, value);
  const wanted = distinctivePlaceWords(location);
  if (!normalised || !wanted.length) return [];
  const db = await database();
  const hash = await customerContactHash(kind, normalised);
  const result = await db.prepare(`SELECT wc.request_code AS requestCode,wc.service,wc.suburb,wc.updated_at AS updatedAt
    FROM customer_contact_index ci
    INNER JOIN workflow_cases wc ON wc.id=ci.case_id
    WHERE ci.kind=? AND ci.contact_hash=?
    ORDER BY wc.updated_at DESC,wc.id DESC LIMIT 50`).bind(kind, hash).all<CustomerProjectAccess>();
  return result.results.filter((row) => { const words = new Set(placeWords(row.suburb)); return wanted.every((word) => words.has(word)); }).slice(0, 5);
}

export async function getWorkflowSnapshot(role: WorkflowRole, actorEmail: string): Promise<WorkflowSnapshot> {
  await ensureWorkflowDatabase();
  await assertProjectAccess(role);
  await ensureCaseViewTables();
  await removeLegacyWorkflowDemo();
  const db = await database();
  const statements = [
    role === "estimator"
      ? db.prepare("SELECT wc.id,wc.request_code AS requestCode,wc.project_code AS projectCode,wc.customer_name AS customerName,wc.customer_email AS customerEmail,wc.customer_phone AS customerPhone,wc.service,wc.suburb,wc.description,wc.timeframe,wc.budget,wc.stage,wc.assigned_supervisor_email AS assignedSupervisorEmail,wc.assigned_supervisor_name AS assignedSupervisorName,wc.site_visit_at AS siteVisitAt,wc.project_folder AS projectFolder,wc.created_at AS createdAt,wc.updated_at AS updatedAt,COALESCE((SELECT p.progress FROM projects p WHERE p.code=wc.project_code LIMIT 1),0) AS progress FROM workflow_cases wc WHERE wc.stage IN ("+estimatorStages.map((value) => `'${value}'`).join(",")+") ORDER BY wc.updated_at DESC")
      : role === "supervisor"
      ? db.prepare("SELECT wc.id,wc.request_code AS requestCode,wc.project_code AS projectCode,wc.customer_name AS customerName,wc.customer_email AS customerEmail,wc.customer_phone AS customerPhone,wc.service,wc.suburb,wc.description,wc.timeframe,wc.budget,wc.stage,wc.assigned_supervisor_email AS assignedSupervisorEmail,wc.assigned_supervisor_name AS assignedSupervisorName,wc.site_visit_at AS siteVisitAt,wc.project_folder AS projectFolder,wc.created_at AS createdAt,wc.updated_at AS updatedAt,COALESCE((SELECT p.progress FROM projects p WHERE p.code=wc.project_code LIMIT 1),0) AS progress FROM workflow_cases wc WHERE LOWER(wc.assigned_supervisor_email)=? ORDER BY wc.updated_at DESC").bind(actorEmail.toLowerCase())
      : db.prepare("SELECT wc.id,wc.request_code AS requestCode,wc.project_code AS projectCode,wc.customer_name AS customerName,wc.customer_email AS customerEmail,wc.customer_phone AS customerPhone,wc.service,wc.suburb,wc.description,wc.timeframe,wc.budget,wc.stage,wc.assigned_supervisor_email AS assignedSupervisorEmail,wc.assigned_supervisor_name AS assignedSupervisorName,wc.site_visit_at AS siteVisitAt,wc.project_folder AS projectFolder,wc.created_at AS createdAt,wc.updated_at AS updatedAt,COALESCE((SELECT p.progress FROM projects p WHERE p.code=wc.project_code LIMIT 1),0) AS progress FROM workflow_cases wc ORDER BY wc.updated_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,supervisor_email AS supervisorEmail,visit_date AS visitDate,summary,findings,recommendations,internal_notes AS internalNotes,status,admin_note AS adminNote,submitted_at AS submittedAt,reviewed_at AS reviewedAt,COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='site_visit' AND rv.case_id=site_visit_reports.case_id),submitted_at) AS revision FROM site_visit_reports ORDER BY id DESC"),
    db.prepare("SELECT id,case_id AS caseId,update_id AS updateId,category,file_name AS fileName,mime_type AS mimeType,size_bytes AS sizeBytes,uploaded_by AS uploadedBy,visibility,uploaded_at AS uploadedAt,published_at AS publishedAt FROM workflow_files ORDER BY uploaded_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,amount_cents AS amountCents,scope,terms,status,created_by AS createdBy,created_at AS createdAt,sent_at AS sentAt,customer_decided_at AS customerDecidedAt,confirmed_at AS confirmedAt,COALESCE((SELECT w.breakdown FROM estimate_workings w WHERE w.case_id=workflow_estimates.case_id),'') AS breakdown,COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='estimate' AND rv.case_id=workflow_estimates.case_id),created_at) AS revision FROM workflow_estimates"),
    db.prepare("SELECT id,case_id AS caseId,work_date AS workDate,supervisor_email AS supervisorEmail,internal_update AS internalUpdate,customer_update AS customerUpdate,status,admin_note AS adminNote,owner_note AS ownerNote,created_at AS createdAt,admin_reviewed_at AS adminReviewedAt,owner_reviewed_at AS ownerReviewedAt,published_at AS publishedAt FROM project_updates ORDER BY created_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,supervisor_email AS supervisorEmail,inspected_at AS inspectedAt,summary,defects,status,admin_note AS adminNote,owner_note AS ownerNote,submitted_at AS submittedAt,reviewed_at AS reviewedAt,completed_at AS completedAt,COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='quality' AND rv.case_id=quality_inspections.case_id),submitted_at) AS revision FROM quality_inspections"),
    // The newest 60 events of EACH project (one company-wide limit of 250 used to empty the timeline of older jobs).
    db.prepare("SELECT id,caseId,actorRole,actorEmail,eventType,title,detail,audience,createdAt FROM (SELECT id,case_id AS caseId,actor_role AS actorRole,actor_email AS actorEmail,event_type AS eventType,title,detail,audience,created_at AS createdAt,ROW_NUMBER() OVER (PARTITION BY case_id ORDER BY created_at DESC,id DESC) AS position FROM workflow_events) WHERE position<=60 ORDER BY createdAt DESC,id DESC"),
    db.prepare("SELECT email,COALESCE(NULLIF(trade_title,''),role) AS name FROM staff_access_requests WHERE status='Approved' AND role='Site Supervisor' ORDER BY email"),
    db.prepare("SELECT id,case_id AS caseId,title,detail,status,created_by AS createdBy,created_at AS createdAt,customer_reply AS customerReply,decided_at AS decidedAt FROM change_proposals ORDER BY created_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,sender,sender_label AS senderLabel,body,kind,created_at AS createdAt FROM customer_messages ORDER BY created_at,id"),
  ];
  const result = await db.batch(statements);
  const cases = result[0].results as Raw[];
  const reports = result[1].results as Raw[];
  const files = (result[2].results as Raw[]).map((file): Raw & { url: string } => ({ ...file, url: `/api/workflow/files?id=${file.id}` }));
  const estimates = result[3].results as Raw[];
  const updates = result[4].results as Raw[];
  const inspections = result[5].results as Raw[];
  const proposals = result[8].results as Raw[];
  const messages = result[9].results as Raw[];
  const allowedIds = new Set(cases.map((item) => Number(item.id)));
  const management = role === "owner" || role === "admin";
  const shaped = cases.map((item) => {
    const caseId = Number(item.id);
    // The project folder ("Admin & Owner only": invoices, quotes, supplier documents) is not sent to the Site Supervisor or the Estimator.
    const caseFiles = files.filter((file) => Number(file.caseId) === caseId && (management || String(file.category) !== "document"));
    const safe = { ...item };
    if (role === "supervisor" || role === "estimator") {
      // The private customer code opens the customer's portal (read messages, write as the customer, accept estimates): only the Owner and
      // Admin, who hand it to the customer, ever receive it.
      safe.requestCode = "";
      safe.customerEmail = "";
      safe.customerPhone = "";
      if (role === "supervisor") safe.budget = "";
    }
    return {
      ...safe,
      // The current report is the newest one (the same one Admin reviews). Management's notes inside it (the review of the visit report,
      // the quality review and the Owner's completion note) are not sent to the Estimator.
      visitReport: (() => {
        const report = reports.find((entry) => Number(entry.caseId) === caseId);
        return report ? (role === "estimator" ? { ...report, adminNote: "" } : report) : null;
      })(),
      qualityInspection: (() => {
        const inspection = inspections.find((entry) => Number(entry.caseId) === caseId);
        return inspection ? (role === "estimator" ? { ...inspection, adminNote: "", ownerNote: "" } : inspection) : null;
      })(),
      // Owner/Admin get the estimate with its priced working; the Estimator gets it as the customer reads it; the Site Supervisor gets none.
      estimate: role === "supervisor" ? null : (() => {
        const estimate = estimates.find((entry) => Number(entry.caseId) === caseId);
        if (!estimate) return null;
        return role === "estimator" ? { ...estimate, scope: customerSafeScope(String(estimate.scope)), breakdown: "" } : estimate;
      })(),
      files: caseFiles,
      // The Estimator sees the customer copy of each update only: the internal update and the management review notes stay with management
      // (and the Site Supervisor who wrote them).
      updates: updates.filter((update) => Number(update.caseId) === caseId).map((update) => ({ ...update, ...(role === "estimator" ? { internalUpdate: "", adminNote: "", ownerNote: "" } : {}), files: caseFiles.filter((file) => Number(file.updateId) === Number(update.id)) })),
      proposals: role === "supervisor" || role === "estimator" ? [] : proposals.filter((proposal) => Number(proposal.caseId) === caseId),
      messages: role === "supervisor" || role === "estimator" ? [] : messages.filter((message) => Number(message.caseId) === caseId),
    };
  });
  const supervisors = (result[7].results as Raw[]).map((row) => ({ email: String(row.email), name: String(row.name) }));
  if (!supervisors.length && (process.env.NODE_ENV === "development" || process.env.ATP_DEMO_SEED === "true")) supervisors.push({ email: "supervisor.preview@example.invalid", name: "Site Supervisor Preview" });
  // The stage the Owner/Admin chose and what the customer currently sees; drafts and the note history only for Owner and Admin.
  const views = await readCaseViews([...allowedIds], management);
  return {
    cases: shaped.map((item) => ({ ...item, view: views.get(Number((item as Raw).id)) })) as WorkflowSnapshot["cases"],
    stageOptions: management ? await stageOptions() : [],
    // Customer conversations and customer notes are for Owner and Admin: Supervisors and Estimators see that they happened, not what was said.
    events: (result[6].results as WorkflowSnapshot["events"]).filter((item) => allowedIds.has(Number(item.caseId))).map((item) => role === "supervisor" || role === "estimator" ? { ...item, actorEmail: "", detail: privateEventTypes.has(String(item.eventType)) || (role === "estimator" && estimatorPrivateEventTypes.has(String(item.eventType))) ? "" : item.detail } : item),
    supervisors,
    role,
  };
}

async function oneCase(caseId: number) {
  const db = await database();
  const row = await db.prepare("SELECT id,stage,project_code AS projectCode,request_code AS requestCode,service,suburb,customer_name AS customerName,assigned_supervisor_email AS assignedSupervisorEmail,assigned_supervisor_name AS assignedSupervisorName FROM workflow_cases WHERE id=? LIMIT 1").bind(caseId).first<Raw>();
  if (!row) throw new Error("Project workflow was not found.");
  return row;
}

// Event details the Site Supervisor and Estimator never receive: customer conversations and notes, and the priced estimate working.
const privateEventTypes = new Set(["message_customer", "customer_message", "add_customer_note", "remove_customer_note", "save_estimate", "customer_change_decision"]);
// And details the Estimator never receives: management's review and return notes to the Site Supervisor, the Owner's completion note and
// Admin's notes about contacting the customer (the Estimator prices the approved site report, not management's conversations).
const estimatorPrivateEventTypes = new Set(["customer_contacted", "review_site_visit", "reject_update", "admin_approve_update", "review_quality_inspection", "completion_note", "close_case"]);

// Owner has no restrictions on management actions; only Site Supervisor submissions stay with the assigned supervisor.
function allow(role: WorkflowRole, expected: WorkflowRole) {
  if (role === "owner" && expected !== "supervisor") return;
  if (role !== expected) throw new Error(`${expected === "supervisor" ? "Site Supervisor" : expected[0].toUpperCase() + expected.slice(1)} access is required for this action.`);
}

// "2026-11-19T10:00" from the date-and-time picker, written as people read it ("Thursday 19 November 2026 at 10:00 am"). The picker's value is
// already Melbourne wall-clock time, so it is formatted as is, without converting time zones.
function readableVisit(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])));
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

type Statement = ReturnType<D1["prepare"]>;
const STALE_STAGE = "This action is not available at the current project stage. Refresh to see the latest.";
// One protected stage change. The case moves ONLY if it is still at one of the allowed stages at the moment the write runs, so a slow
// request, a second person or an old browser tab can never move a job backwards, reopen it, or overwrite a later decision. Everything that
// belongs to the move goes in the same batch and runs only if the move happened: a one-off token is written right after the move (SQLite
// changes()), and each dependent statement requires it — put `ifMoved` in its WHERE and bind the token last. Nothing is left half-done.
async function moveStage(db: D1, caseId: number, stages: readonly string[], assignments: string, values: unknown[],
  dependents: (ifMoved: string, token: string) => Statement[] = () => [], options: { notIn?: boolean; where?: string; whereValues?: unknown[] } = {}) {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const list = stages.map(() => "?").join(",");
  const where = `id=? AND stage ${options.notIn ? "NOT IN" : "IN"} (${list})${options.where ? ` AND ${options.where}` : ""}`;
  const results = await db.batch([
    db.prepare(`UPDATE workflow_cases SET ${assignments} WHERE ${where}`).bind(...values, caseId, ...stages, ...(options.whereValues ?? [])),
    markPortfolioSaved(db, token, now),
    ...dependents("EXISTS (SELECT 1 FROM save_tokens WHERE token=?)", token),
    clearPortfolioSaved(db, token),
  ]);
  if (Number((results[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) throw new Error(STALE_STAGE);
}

// A real calendar date (2026-02-30 is refused) and, optionally, a real time of day (99:99 is refused).
export function realDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}
export function realTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function requireStage(current: unknown, allowed: WorkflowStage[]) {
  if (!allowed.includes(String(current) as WorkflowStage)) throw new Error("This action is not available at the current project stage.");
}

// The company works on Melbourne time, so the year in a code is the Melbourne year (not UTC).
function businessYear() {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", year: "numeric" }).format(new Date());
}

function privateRequestCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `REQ-${businessYear()}-${token}`;
}

// The photo numbers a screen sends are only a request: keep the ones that really are this job's photos of the right kind (and, for
// daily updates, not already used by another update), and insist on at least one. `unclaimedOnly` is for photos that belong to
// exactly one update.
async function realPhotos(db: D1, caseId: number, input: unknown, category: string, message: string, unclaimedOnly = false) {
  const wanted = [...new Set((Array.isArray(input) ? input : []).map(Number).filter((value) => Number.isInteger(value) && value > 0))].slice(0, 60);
  if (!wanted.length) throw new Error(message);
  const marks = wanted.map(() => "?").join(",");
  const found = await db.prepare(`SELECT id FROM workflow_files WHERE case_id=? AND category=? ${unclaimedOnly ? "AND (update_id=0 OR update_id IN (SELECT id FROM project_updates WHERE case_id=? AND status='changes_requested'))" : ""} AND id IN (${marks})`)
    .bind(caseId, category, ...(unclaimedOnly ? [caseId] : []), ...wanted).all<{ id: number }>();
  const ids = found.results.map((row) => Number(row.id));
  if (!ids.length) throw new Error(message);
  return ids;
}

async function requireApprovedSupervisor(db: D1, email: string) {
  const row = await db.prepare("SELECT email FROM staff_access_requests WHERE LOWER(email)=? AND status='Approved' AND role='Site Supervisor' LIMIT 1").bind(email.toLowerCase()).first();
  if (!row) throw new Error("Choose an approved Site Supervisor account.");
}

export async function performWorkflowAction(role: WorkflowRole, actorEmail: string, action: string, caseId: number, payload: Record<string, unknown>) {
  await ensureWorkflowDatabase();
  await assertProjectAccess(role);
  await ensureCaseViewTables();
  // Stage, customer status and customer notes sit beside the step-by-step workflow and never move it (db/case-view-store.ts).
  if (caseViewActions.has(action)) return performCaseViewAction(role, actorEmail, action, caseId, payload);
  const db = await database();
  const item = await oneCase(caseId);
  const now = new Date().toISOString();
  const stage = String(item.stage) as WorkflowStage;
  // Who did it, as the history shows it: the Owner standing in for Admin is recorded as the Owner.
  const who = role === "owner" ? "Owner" : role === "estimator" ? "Estimator" : role === "supervisor" ? "Site Supervisor" : "Admin";
  // A history line saved in the same batch as the change, and only if the change happened (see moveStage): never a line for something
  // that did not happen, never a change without its line.
  const logged = (token: string, title: string, detail = "", audience = "internal") => eventStatementIf(db, caseId, who, actorEmail, action, title, detail, audience, now, token);

  if (action === "review_started") {
    allow(role, "admin"); requireStage(stage, ["request_submitted"]);
    await moveStage(db, caseId, ["request_submitted"], "stage='admin_review',updated_at=?", [now], (_ifMoved, token) => [logged(token, `${who} started reviewing the customer request`)]);
  } else if (action === "customer_contacted") {
    allow(role, "admin"); requireStage(stage, ["request_submitted", "admin_review"]);
    const note = required(payload.note, "Contact note");
    await moveStage(db, caseId, ["request_submitted", "admin_review"], "stage='customer_contacted',updated_at=?", [now], (_ifMoved, token) => [logged(token, `${who} contacted the customer`, note)]);
  } else if (action === "approve_intake") {
    allow(role, "admin"); requireStage(stage, ["admin_review", "customer_contacted"]);
    // ONE batch (one transaction on D1): move the case on, give it the next free project number (counted over projects AND cases, so two
    // approvals at the same moment never share a number and a deleted project's number is not reused), and create its portfolio row with
    // the stage name the Owner or Admin chose — read inside the same transaction, so a stage saved at the same moment can never be lost
    // or split between the two lists. Only the first of two approvals (a double click, two Admins) changes anything.
    const prefix = `ATP-${businessYear()}-`;
    await ensureCaseViewTables();
    const results = await db.batch([
      db.prepare(`UPDATE workflow_cases SET stage='site_visit_ready',updated_at=?4,project_code = ${nextProjectCode}
        WHERE id=?5 AND stage IN ('admin_review','customer_contacted')`).bind(prefix, prefix.length + 1, `${prefix}%`, now, caseId),
      db.prepare("UPDATE workflow_cases SET project_folder='projects/' || project_code WHERE id=? AND project_code<>'' AND project_folder=''").bind(caseId),
      db.prepare(`INSERT INTO projects (code,name,service,stage,progress,contract_value,balance,customer_name,suburb,start_date,notes,updated_at)
        SELECT wc.project_code, wc.service || ' · ' || wc.suburb, wc.service, COALESCE(NULLIF((SELECT cs.status_label FROM case_status cs WHERE cs.case_id=wc.id), ''), 'Site inspection'),
          0, 0, 0, wc.customer_name, wc.suburb, '', 'Created from approved customer request.', ?
        FROM workflow_cases wc WHERE wc.id=? AND wc.project_code<>'' AND wc.stage='site_visit_ready' AND wc.updated_at=?`).bind(now, caseId, now),
      db.prepare(`INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at)
        SELECT id,?,?,?,?,project_folder,'internal',? FROM workflow_cases WHERE id=? AND project_code<>'' AND stage='site_visit_ready' AND updated_at=?`)
        .bind(who, actorEmail, action, `${who} approved intake and created the project folder`, now, caseId, now),
    ]).catch((error) => {
      // A project number that is already taken (for example typed by hand on the portfolio) cancels the whole approval: a new customer is
      // never linked to someone else's project. Pressing approve again picks the next free number.
      if (noNumbersLeft(error)) throw new Error(noNumbersMessage);
      if (/unique|constraint/i.test(error instanceof Error ? error.message : String(error))) throw new Error("That project number was just taken. Please approve again.");
      throw error;
    });
    if (Number((results[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) throw new Error("This action is not available at the current project stage.");
  } else if (action === "assign_visit") {
    allow(role, "admin"); requireStage(stage, ["site_visit_ready", "site_visit_scheduled", "visit_changes_requested"]);
    const supervisorEmail = required(payload.supervisorEmail, "Site Supervisor").toLowerCase();
    await requireApprovedSupervisor(db, supervisorEmail);
    const supervisorName = required(payload.supervisorName, "Site Supervisor name");
    const visitAt = required(payload.visitAt, "Site visit date and time");
    if (!realDate(visitAt.slice(0, 10)) || visitAt[10] !== "T" || !realTime(visitAt.slice(11, 16)) || visitAt.length !== 16) throw new Error("Choose a real date and time for the site visit.");
    await moveStage(db, caseId, ["site_visit_ready", "site_visit_scheduled", "visit_changes_requested"], "stage='site_visit_scheduled',assigned_supervisor_email=?,assigned_supervisor_name=?,site_visit_at=?,updated_at=?", [supervisorEmail, supervisorName, visitAt, now],
      (_ifMoved, token) => [logged(token, `Site visit assigned to ${supervisorName}`, readableVisit(visitAt))]);
  } else if (action === "reassign_supervisor") {
    // When a Site Supervisor leaves or is unavailable, Admin or the Owner can hand the job to another approved Site Supervisor.
    if (role !== "admin" && role !== "owner") throw new Error("Admin or Owner access is required for this action.");
    requireStage(stage, ["site_visit_scheduled", "visit_changes_requested", "active_project", "quality_inspection"]);
    const supervisorEmail = required(payload.supervisorEmail, "Site Supervisor").toLowerCase();
    await requireApprovedSupervisor(db, supervisorEmail);
    const supervisorName = required(payload.supervisorName, "Site Supervisor name");
    await moveStage(db, caseId, ["site_visit_scheduled", "visit_changes_requested", "active_project", "quality_inspection"], "assigned_supervisor_email=?,assigned_supervisor_name=?,updated_at=?", [supervisorEmail, supervisorName, now],
      (_ifMoved, token) => [logged(token, `Site Supervisor changed to ${supervisorName}`, `Previously ${String(item.assignedSupervisorName || item.assignedSupervisorEmail)}.`)]);
  } else if (action === "submit_site_visit") {
    allow(role, "supervisor"); requireStage(stage, ["site_visit_scheduled", "visit_changes_requested"]);
    if (String(item.assignedSupervisorEmail).toLowerCase() !== actorEmail.toLowerCase()) throw new Error("This project is not assigned to your account.");
    const fileIds = await realPhotos(db, caseId, payload.fileIds, "site_visit", "At least one site photo is required before the visit report can be submitted.");
    const values = [caseId, actorEmail, required(payload.visitDate, "Visit date"), required(payload.summary, "Visit summary"), required(payload.findings, "Findings"), required(payload.recommendations, "Recommendations"), clean(payload.internalNotes), "submitted", "", now, ""];
    // The form names the report it replaces (the returned report's submittedAt, or "" for the first one; required). A form opened before
    // another report was sent (a second tab, a slow connection) is refused instead of adding a second report. Whether the report is new
    // or replaces the current one is decided inside the same write, so there is only ever one current report per job.
    const replacing = requiredVersion(payload.replacing, "sending the report");
    const revision = crypto.randomUUID();
    const current = "(SELECT MAX(m.id) FROM site_visit_reports m WHERE m.case_id=?)";
    await moveStage(db, caseId, ["site_visit_scheduled", "visit_changes_requested"], "stage='site_visit_submitted',updated_at=?", [now], (ifMoved, token) => [
      db.prepare(`UPDATE site_visit_reports SET supervisor_email=?,visit_date=?,summary=?,findings=?,recommendations=?,internal_notes=?,status='submitted',admin_note='',submitted_at=?,reviewed_at='' WHERE id=${current} AND ${ifMoved}`)
        .bind(actorEmail, values[2], values[3], values[4], values[5], values[6], now, caseId, token),
      db.prepare(`INSERT INTO site_visit_reports (case_id,supervisor_email,visit_date,summary,findings,recommendations,internal_notes,status,admin_note,submitted_at,reviewed_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM site_visit_reports WHERE case_id=?) AND ${ifMoved}`).bind(...values, caseId, token),
      newRevisionStatement(db, "site_visit", caseId, revision, token),
      logged(token, "Site visit report and photos submitted to Admin", `${fileIds.length} photo(s) attached.`)],
      { where: `LOWER(assigned_supervisor_email)=? AND ${currentRevision("site_visit")}=?`, whereValues: [actorEmail.toLowerCase(), replacing] })
      .catch(async (error) => {
        if (error instanceof Error && error.message === STALE_STAGE && await db.prepare("SELECT 1 FROM workflow_cases WHERE id=? AND stage IN ('site_visit_scheduled','visit_changes_requested') AND LOWER(assigned_supervisor_email)=?").bind(caseId, actorEmail.toLowerCase()).first()) {
          throw new ConflictError("A newer site visit report was sent for this job from another screen. Your text is still on screen: check the newer report first, then choose whether to replace it.");
        }
        throw error;
      });
    // The version just saved: the report form names it the next time it sends (a correction after Admin returns the report).
    return { revision };
  } else if (action === "review_site_visit") {
    allow(role, "admin"); requireStage(stage, ["site_visit_submitted"]);
    const decision = clean(payload.decision);
    if (!['approved', 'changes_requested'].includes(decision)) throw new Error("Choose approve or request changes.");
    const note = clean(payload.note);
    if (decision === "changes_requested" && !note) throw new Error("Explain what the Site Supervisor must change.");
    const nextStage = decision === "approved" ? "site_visit_approved" : "visit_changes_requested";
    // The decision names the report version on screen (required): a slow click can never approve a report resubmitted since.
    const version = requiredVersion(payload.revision);
    await moveStage(db, caseId, ["site_visit_submitted"], "stage=?,updated_at=?", [nextStage, now], (ifMoved, token) => [
      db.prepare(`UPDATE site_visit_reports SET status=?,admin_note=?,reviewed_at=? WHERE id=(SELECT MAX(m.id) FROM site_visit_reports m WHERE m.case_id=?) AND ${ifMoved}`).bind(decision, note, now, caseId, token),
      logged(token, decision === "approved" ? `${who} approved the site visit report` : `${who} returned the site visit report`, note),
    ], { where: `EXISTS (SELECT 1 FROM site_visit_reports r WHERE r.case_id=workflow_cases.id) AND ${currentRevision("site_visit")}=?`, whereValues: [version] });
  } else if (action === "save_estimate") {
    if (role !== "estimator" && role !== "admin" && role !== "owner") throw new Error("Estimator access is required for this action.");
    requireStage(stage, ["site_visit_approved", "estimate_ready", "estimate_declined"]);
    const amountCents = Math.round(number(payload.amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 10_000_000_000) throw new Error("Enter a valid estimate amount (more than $0 and under $100,000,000).");
    const scope = required(payload.scope, "Estimate scope");
    const terms = clean(payload.terms);
    // The priced working (unit prices, margin, contingency) is stored with the estimate, in the same batch, for the Owner and Admin only;
    // the customer gets the scope. Too long is refused, never cut short.
    const breakdown = typeof payload.breakdown === "string" ? payload.breakdown.trim() : "";
    if (breakdown.length > 30000) throw new Error("The priced breakdown is too long to save (more than 30,000 characters). Split the estimate into fewer lines.");
    // The calculator names the estimate it was opened on (its createdAt, or "" when there was none; required): a calculator left open
    // while someone else saved a newer estimate is refused instead of silently replacing it.
    const replacing = requiredVersion(payload.replacing, "saving the estimate");
    const revision = crypto.randomUUID();
    await ensureCaseViewTables();
    // Only while the job is still waiting for an estimate: a slow save can never replace a quote the customer has since accepted, or reopen a closed job.
    await moveStage(db, caseId, ["site_visit_approved", "estimate_ready", "estimate_declined"], "stage='estimate_ready',updated_at=?", [now], (ifMoved, token) => [
      db.prepare(`INSERT INTO workflow_estimates (case_id,amount_cents,scope,terms,status,created_by,created_at,sent_at,customer_decided_at,confirmed_at) SELECT ?,?,?,?,'draft',?,?,'','','' WHERE ${ifMoved} ON CONFLICT(case_id) DO UPDATE SET amount_cents=excluded.amount_cents,scope=excluded.scope,terms=excluded.terms,status='draft',created_by=excluded.created_by,created_at=excluded.created_at,sent_at='',customer_decided_at='',confirmed_at=''`).bind(caseId, amountCents, scope, terms, actorEmail, now, token),
      breakdown
        ? db.prepare(`INSERT INTO estimate_workings (case_id,breakdown,saved_by,saved_at) SELECT ?,?,?,? WHERE ${ifMoved} ON CONFLICT(case_id) DO UPDATE SET breakdown=excluded.breakdown,saved_by=excluded.saved_by,saved_at=excluded.saved_at`).bind(caseId, breakdown, actorEmail, now, token)
        : db.prepare(`DELETE FROM estimate_workings WHERE case_id=? AND ${ifMoved}`).bind(caseId, token),
      newRevisionStatement(db, "estimate", caseId, revision, token),
      logged(token, `${who} approved the estimate and sent it to Admin`, "Estimate is internal until Admin sends it to the customer."),
    ], { where: `${currentRevision("estimate")}=?`, whereValues: [replacing] })
      .catch(async (error) => {
        if (error instanceof Error && error.message === STALE_STAGE && await db.prepare("SELECT 1 FROM workflow_cases WHERE id=? AND stage IN ('site_visit_approved','estimate_ready','estimate_declined')").bind(caseId).first()) {
          throw new ConflictError("Someone saved a newer estimate for this job after you opened the calculator. Your lines are still on screen: check the newer estimate first, then choose whether to replace it.");
        }
        throw error;
      });
    // The version just saved: the calculator names it the next time it saves.
    return { revision };
  } else if (action === "send_estimate") {
    allow(role, "admin"); requireStage(stage, ["estimate_ready"]);
    // Send names the draft on screen (its version, amount and scope, all required): a newer draft saved meanwhile is never sent
    // unseen. sent_at is then this version's identity: the customer's decision must name it (an old tab can never accept a later quote).
    const draft = requiredVersion(payload.revision);
    const draftCents = Number(payload.amountCents);
    if (!Number.isSafeInteger(draftCents) || typeof payload.scope !== "string") throw new ConflictError("This page is out of date. Refresh to see the latest before deciding.");
    await moveStage(db, caseId, ["estimate_ready"], "stage='estimate_sent',updated_at=?", [now], (ifMoved, token) => [
      db.prepare(`UPDATE workflow_estimates SET status='sent',sent_at=? WHERE case_id=? AND ${ifMoved}`).bind(now, caseId, token),
      newRevisionStatement(db, "sent", caseId, crypto.randomUUID(), token),
      logged(token, "Estimate sent to the customer", "Customer approval is now required.", "customer"),
    ], { where: `EXISTS (SELECT 1 FROM workflow_estimates e WHERE e.case_id=workflow_cases.id AND e.status='draft' AND e.amount_cents=? AND e.scope=?) AND ${currentRevision("estimate")}=?`, whereValues: [draftCents, payload.scope, draft] });
  } else if (action === "activate_project") {
    allow(role, "admin"); requireStage(stage, ["customer_approved"]);
    const estimate = await db.prepare("SELECT status,amount_cents AS amountCents FROM workflow_estimates WHERE case_id=?").bind(caseId).first<{ status?: string; amountCents?: number }>();
    if (estimate?.status !== "customer_accepted") throw new Error("The customer must accept the estimate first.");
    await ensureCaseViewTables();
    await moveStage(db, caseId, ["customer_approved"], "stage='active_project',updated_at=?", [now], (ifMoved, token) => [
      milestoneStageStatement(db, caseId, "Scheduled", actorEmail, now, token),
      db.prepare(`UPDATE workflow_estimates SET confirmed_at=? WHERE case_id=? AND ${ifMoved}`).bind(now, caseId, token),
      // The price the customer accepted is the project's contract value (in cents). A value the Owner already typed in by hand is never overwritten.
      db.prepare(`UPDATE projects SET stage='Scheduled',progress=5,contract_value=CASE WHEN contract_value=0 THEN ? ELSE contract_value END,updated_at=? WHERE code=? AND ${ifMoved}`).bind(Number(estimate.amountCents) || 0, now, item.projectCode, token),
      logged(token, "Customer-approved work converted to an active project", String(item.projectCode)),
    ], { where: "EXISTS (SELECT 1 FROM workflow_estimates e WHERE e.case_id=workflow_cases.id AND e.status='customer_accepted')" });
  } else if (action === "submit_progress_update") {
    allow(role, "supervisor"); requireStage(stage, ["active_project"]);
    if (String(item.assignedSupervisorEmail).toLowerCase() !== actorEmail.toLowerCase()) throw new Error("This project is not assigned to your account.");
    // Photos that are free, or belong to an update that was returned for changes (it is corrected and sent again with the same evidence).
    // With no photo chosen on screen, the photos of this supervisor's returned update are used again.
    const usable = "(update_id=0 OR update_id IN (SELECT id FROM project_updates WHERE case_id=? AND status='changes_requested'))";
    const chosen = Array.isArray(payload.fileIds) && payload.fileIds.length ? payload.fileIds
      : (await db.prepare(`SELECT id FROM workflow_files WHERE case_id=? AND category='progress' AND update_id IN (SELECT id FROM project_updates WHERE case_id=? AND status='changes_requested' AND LOWER(supervisor_email)=?)`).bind(caseId, caseId, actorEmail.toLowerCase()).all<{ id: number }>()).results.map((row) => row.id);
    const fileIds = await realPhotos(db, caseId, chosen, "progress", "At least one progress photo is required for the daily update.", true);
    const placeholders = fileIds.map(() => "?").join(",");
    const workDate = required(payload.workDate, "Work date");
    if (!realDate(workDate)) throw new Error("Choose a real work date.");
    // The update is created and its photos claimed in ONE batch, and only if at least one of the photos is still usable and the job is still
    // this Site Supervisor's (a slow send from a supervisor who was replaced meanwhile is refused): two submissions at the same moment can
    // never both use the same photo (one of them is refused for lack of evidence). The history line is written only if the photos were claimed.
    const results = await db.batch([
      db.prepare(`INSERT INTO project_updates (case_id,work_date,supervisor_email,internal_update,customer_update,status,created_at) SELECT ?,?,?,?,?,'pending_admin',?
        WHERE EXISTS (SELECT 1 FROM workflow_cases WHERE id=? AND stage='active_project' AND LOWER(assigned_supervisor_email)=?) AND EXISTS (SELECT 1 FROM workflow_files WHERE case_id=? AND category='progress' AND ${usable} AND id IN (${placeholders}))`)
        .bind(caseId, workDate, actorEmail, required(payload.internalUpdate, "Internal team update"), required(payload.customerUpdate, "Customer update"), now, caseId, actorEmail.toLowerCase(), caseId, caseId, ...fileIds),
      db.prepare(`UPDATE workflow_files SET update_id=last_insert_rowid() WHERE changes() > 0 AND case_id=? AND category='progress' AND ${usable} AND id IN (${placeholders})`).bind(caseId, caseId, ...fileIds),
      eventStatementIfChanged(db, caseId, who, actorEmail, action, "Daily update submitted to Admin", "Internal notes are visible to management. Customer copy remains hidden.", "internal", now),
    ]);
    if (Number((results[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) {
      const still = await db.prepare("SELECT 1 FROM workflow_cases WHERE id=? AND stage='active_project' AND LOWER(assigned_supervisor_email)=?").bind(caseId, actorEmail.toLowerCase()).first();
      if (!still) throw new Error("This project is no longer assigned to your account, or is no longer active. Refresh to see the latest.");
      throw new Error("At least one progress photo is required for the daily update (the photos chosen were already used). Add a new photo and send again.");
    }
  } else if (action === "submit_quality_inspection") {
    allow(role, "supervisor"); requireStage(stage, ["active_project"]);
    if (String(item.assignedSupervisorEmail).toLowerCase() !== actorEmail.toLowerCase()) throw new Error("This project is not assigned to your account.");
    const fileIds = await realPhotos(db, caseId, payload.fileIds, "quality", "At least one completion photo is required for quality inspection.");
    const inspectedAt = required(payload.inspectedAt, "Inspection date");
    const summary = required(payload.summary, "Quality inspection summary");
    const defects = clean(payload.defects);
    // Like the site visit report: the form names the inspection it replaces ("" for the first; required), so an inspection sent from an
    // older screen never overwrites one sent since (for example after a rectification request).
    const replacing = requiredVersion(payload.replacing, "sending the inspection");
    const revision = crypto.randomUUID();
    await moveStage(db, caseId, ["active_project"], "stage='quality_inspection',updated_at=?", [now], (ifMoved, token) => [
      db.prepare(`INSERT INTO quality_inspections (case_id,supervisor_email,inspected_at,summary,defects,status,submitted_at) SELECT ?,?,?,?,?,'submitted',? WHERE ${ifMoved} ON CONFLICT(case_id) DO UPDATE SET supervisor_email=excluded.supervisor_email,inspected_at=excluded.inspected_at,summary=excluded.summary,defects=excluded.defects,status='submitted',admin_note='',owner_note='',submitted_at=excluded.submitted_at,reviewed_at='',completed_at=''`).bind(caseId, actorEmail, inspectedAt, summary, defects, now, token),
      newRevisionStatement(db, "quality", caseId, revision, token),
      logged(token, "Quality inspection submitted to Admin", `${fileIds.length} completion photo(s) attached.`),
    ], { where: `LOWER(assigned_supervisor_email)=? AND ${currentRevision("quality")}=?`, whereValues: [actorEmail.toLowerCase(), replacing] })
      .catch(async (error) => {
        if (error instanceof Error && error.message === STALE_STAGE && await db.prepare("SELECT 1 FROM workflow_cases WHERE id=? AND stage='active_project' AND LOWER(assigned_supervisor_email)=?").bind(caseId, actorEmail.toLowerCase()).first()) {
          throw new ConflictError("A newer quality inspection was sent for this job from another screen. Your text is still on screen: check the newer inspection first, then choose whether to replace it.");
        }
        throw error;
      });
    return { revision };
  } else if (action === "review_quality_inspection") {
    allow(role, "admin"); requireStage(stage, ["quality_inspection"]);
    const decision = clean(payload.decision);
    if (!["approved", "changes_requested"].includes(decision)) throw new Error("Choose approve or request rectification.");
    const note = clean(payload.note);
    if (decision === "changes_requested" && !note) throw new Error("Explain the rectification required.");
    const nextStage = decision === "approved" ? "completion_ready" : "active_project";
    // The decision names the inspection version on screen (required): a slow click can never approve a resubmitted inspection.
    const version = requiredVersion(payload.revision);
    await moveStage(db, caseId, ["quality_inspection"], "stage=?,updated_at=?", [nextStage, now], (ifMoved, token) => [
      db.prepare(`UPDATE quality_inspections SET status=?,admin_note=?,reviewed_at=? WHERE case_id=? AND ${ifMoved}`).bind(decision, note, now, caseId, token),
      logged(token, decision === "approved" ? "Quality inspection approved for Owner completion" : "Rectification requested after quality inspection", note),
    ], { where: `EXISTS (SELECT 1 FROM quality_inspections q WHERE q.case_id=workflow_cases.id) AND ${currentRevision("quality")}=?`, whereValues: [version] });
  } else if (action === "complete_project") {
    allow(role, "owner"); requireStage(stage, ["completion_ready"]);
    const note = clean(payload.note);
    await ensureCaseViewTables();
    await moveStage(db, caseId, ["completion_ready"], "stage='complete',updated_at=?", [now], (ifMoved, token) => [
      milestoneStageStatement(db, caseId, "Complete", actorEmail, now, token),
      finishedStatusStatement(db, caseId, token),
      db.prepare(`UPDATE quality_inspections SET status='completed',owner_note=?,completed_at=? WHERE case_id=? AND ${ifMoved}`).bind(note, now, caseId, token),
      db.prepare(`UPDATE projects SET stage='Complete',progress=100,updated_at=? WHERE code=? AND ${ifMoved}`).bind(now, item.projectCode, token),
      // A change the customer never answered is withdrawn when the job is completed (it can no longer be decided).
      db.prepare(`UPDATE change_proposals SET status='withdrawn',decided_at=? WHERE case_id=? AND status='sent' AND ${ifMoved}`).bind(now, caseId, token),
      logged(token, "Owner marked the project complete", "", "customer"),
      ...(note ? [eventStatementIf(db, caseId, who, actorEmail, "completion_note", "Owner's completion note", note, "internal", now, token)] : []),
    ]);
  } else if (action === "admin_approve_update") {
    allow(role, "admin");
    const updateId = number(payload.updateId);
    const approved = await db.batch([
      db.prepare("UPDATE project_updates SET status='pending_owner',admin_note=?,admin_reviewed_at=? WHERE id=? AND case_id=? AND status='pending_admin' AND EXISTS (SELECT 1 FROM workflow_cases WHERE id=? AND stage NOT IN ('closed','complete'))")
        .bind(clean(payload.note), now, updateId, caseId, caseId),
      eventStatementIfChanged(db, caseId, who, actorEmail, action, `${who} approved the customer update`, "Owner approval is still required.", "internal", now),
    ]);
    if (Number((approved[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) throw new Error("This update is not waiting for Admin approval.");
  } else if (action === "owner_approve_update") {
    allow(role, "owner");
    const updateId = number(payload.updateId);
    const token = crypto.randomUUID();
    const published = await db.batch([
      db.prepare("UPDATE project_updates SET status='published',owner_note=?,owner_reviewed_at=?,published_at=? WHERE id=? AND case_id=? AND status='pending_owner' AND EXISTS (SELECT 1 FROM workflow_cases WHERE id=? AND stage NOT IN ('closed','complete'))")
        .bind(clean(payload.note), now, now, updateId, caseId, caseId),
      markPortfolioSaved(db, token, now),
      db.prepare("UPDATE workflow_files SET visibility='published',published_at=? WHERE case_id=? AND update_id=? AND EXISTS (SELECT 1 FROM save_tokens WHERE token=?)").bind(now, caseId, updateId, token),
      logged(token, "Owner approved and published the customer update", "The approved text and photos are now visible to the customer.", "customer"),
      clearPortfolioSaved(db, token),
    ]);
    if (Number((published[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) throw new Error("Admin approval is required before Owner approval.");
  } else if (action === "propose_change") {
    if (!["admin", "owner"].includes(role)) throw new Error("Admin or Owner access is required to propose a change.");
    requireStage(stage, ["active_project"]);
    const title = required(payload.title, "Change title");
    const detail = required(payload.detail, "Change detail");
    const proposed = await db.batch([
      db.prepare(`INSERT INTO change_proposals (case_id,title,detail,status,created_by,created_at) SELECT ?,?,?,'sent',?,?
        WHERE EXISTS (SELECT 1 FROM workflow_cases WHERE id=? AND stage='active_project') AND NOT EXISTS (SELECT 1 FROM change_proposals WHERE case_id=? AND title=? AND detail=? AND status='sent')`)
        .bind(caseId, title, detail, actorEmail, now, caseId, caseId, title, detail),
      eventStatementIfChanged(db, caseId, who, actorEmail, action, "Proposed a change to the customer", title, "customer", now),
    ]);
    if (Number((proposed[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) {
      // Pressed twice (or a retry after a lost answer): the same change is already waiting for the customer.
      if (await db.prepare("SELECT 1 FROM change_proposals WHERE case_id=? AND title=? AND detail=? AND status='sent'").bind(caseId, title, detail).first()) return;
      throw new Error(STALE_STAGE);
    }
  } else if (action === "message_customer") {
    if (!["admin", "owner"].includes(role)) throw new Error("Admin or Owner access is required to message the customer.");
    if (stage === "closed") throw new Error("This request is closed.");
    const body = bounded(payload.body, "Message", 2000);
    const kind = payload.kind === "document_request" ? "document_request" : "message";
    // The message and its history line are saved together: a failure never leaves a message that was reported as not sent. With a one-time
    // key from the screen, sending the same message again (a lost answer, a double press) does not save it twice.
    const key = operationKey(`staff-message:${caseId}`, payload.clientKey);
    const fingerprint = await payloadFingerprint([body, kind]);
    await ensureCaseViewTables();
    await db.batch([
      ...(key ? [operationKeyStatement(db, key, fingerprint, now)] : []),
      db.prepare("INSERT INTO customer_messages (case_id,sender,sender_label,body,kind,created_at) VALUES (?,'Admin',?,?,?,?)").bind(caseId, role === "owner" ? "Owner" : "Alert Tradie Pro", body, kind, now),
      eventStatement(db, caseId, who, actorEmail, action, kind === "document_request" ? (role === "owner" ? "The Owner asked you for documents" : "We asked you for documents") : (role === "owner" ? "New message from the Owner" : "New message from our team"), body, "customer"),
    ]).catch(async (error) => { if (!await isRepeat(key, fingerprint, error)) throw error; });
  } else if (action === "close_case") {
    if (!["admin", "owner"].includes(role)) throw new Error("Admin or Owner access is required to close a request.");
    if (["complete", "closed"].includes(stage)) throw new Error("This request is already finished.");
    const note = required(payload.note, "Closing reason");
    await ensureCaseViewTables();
    // Closing ends everything that was still open for this job: the portfolio row says Closed (not counted as active), a change waiting for
    // the customer's decision is withdrawn, and the status the customer was shown stops showing.
    await moveStage(db, caseId, ["complete", "closed"], "stage='closed',updated_at=?", [now], (ifMoved, token) => [
      finishedStatusStatement(db, caseId, token),
      db.prepare(`UPDATE projects SET stage='Closed',updated_at=? WHERE code<>'' AND code=(SELECT project_code FROM workflow_cases WHERE id=?) AND ${ifMoved}`).bind(now, caseId, token),
      db.prepare(`UPDATE change_proposals SET status='withdrawn',decided_at=? WHERE case_id=? AND status='sent' AND ${ifMoved}`).bind(now, caseId, token),
      // A case that uses stage names reads "Closed" too (the board and the portfolio agree).
      milestoneStageStatement(db, caseId, "Closed", actorEmail, now, token),
      logged(token, "Request closed", note, "customer"),
    ], { notIn: true });
  } else if (action === "reject_update") {
    if (!['admin', 'owner'].includes(role)) throw new Error("Management access is required.");
    const updateId = number(payload.updateId);
    const note = required(payload.note, "Return note");
    // Only an update still waiting for approval can be returned (a published one stays published, with its photos).
    const returned = await db.batch([
      db.prepare("UPDATE project_updates SET status='changes_requested',admin_note=?,owner_note=?,admin_reviewed_at=?,owner_reviewed_at=? WHERE id=? AND case_id=? AND status IN ('pending_admin','pending_owner')")
        .bind(role === "admin" ? note : "", role === "owner" ? note : "", role === "admin" ? now : "", role === "owner" ? now : "", updateId, caseId),
      eventStatementIfChanged(db, caseId, who, actorEmail, action, "Customer update returned to Site Supervisor", note, "internal", now),
    ]);
    if (Number((returned[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) throw new Error("This update is no longer waiting for approval.");
  } else {
    throw new Error("Unknown workflow action.");
  }
}

// The same words, however they were typed: capitals, spacing and invisible characters do not make a request different.
function sameWording(value: unknown) {
  return String(value ?? "").normalize("NFKC").replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// An earlier request that is still open and was sent by the same e-mail address for the same service, at the same place, in the same words.
// A request that is closed or complete never blocks a new one, and any difference at all (another word, another address) makes a separate request.
async function earlierOpenRequest(db: D1, fingerprint: string) {
  return db.prepare(`SELECT wc.id,wc.request_code AS code,wc.stage,wc.created_at AS createdAt
    FROM request_fingerprints f INNER JOIN workflow_cases wc ON wc.id=f.case_id
    WHERE f.fingerprint=? AND wc.stage NOT IN ('closed','complete') ORDER BY wc.id ASC LIMIT 1`).bind(fingerprint).first<{ id: number; code: string; stage: string; createdAt: string }>();
}

// What the customer is told about a duplicate. The private reference of the earlier request is handed back ONLY to a sender who is plainly the same person
// retrying (a double click or a refresh: within three minutes, and nothing has happened to the request yet). Later, e-mail and wording alone are not proof of
// who is asking, so nothing is revealed: the customer is pointed to the sign-in that asks for e-mail and address.
const DUPLICATE_RETRY_MS = 3 * 60_000;
function duplicateAnswer(earlier: { id: number; code: string; stage: string; createdAt: string }) {
  const recent = Date.now() - new Date(earlier.createdAt).getTime() <= DUPLICATE_RETRY_MS;
  return recent && earlier.stage === "request_submitted" ? { duplicate: true as const, caseId: Number(earlier.id), code: String(earlier.code) } : { duplicate: true as const };
}

export type PublicRequestResult = { duplicate?: false; caseId: number; code: string } | { duplicate: true; caseId?: number; code?: string };

export async function createPublicWorkflowRequest(payload: Record<string, unknown>): Promise<PublicRequestResult> {
  await ensureWorkflowDatabase();
  const db = await database();
  const now = new Date().toISOString();
  const accepted = clean(payload.termsAccepted);
  if (!["on", "true", "accepted"].includes(accepted.toLowerCase())) throw new Error("Please accept the Privacy Notice and Request Terms before submitting.");
  const code = privateRequestCode();
  const email = bounded(payload.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  const requestedService = bounded(payload.service, "Service", 120);
  const otherService = clean(payload.otherService).slice(0, 1000);
  const service = requestedService === "Other" && otherService
    ? `Other — ${otherService}`.slice(0, 120)
    : requestedService;
  const material = clean(payload.material).slice(0, 120);
  const details = bounded(payload.details, "Project details", 6000);
  const description = material ? `${details}\n\nMaterial preference: ${material}`.slice(0, 6000) : details;
  const phone = bounded(payload.phone, "Phone", 40);
  const name = bounded(payload.name, "Full name", 120);
  const location = bounded(payload.location, "Project location", 240);

  // The same e-mail, service, address and words as a request that is still open: one request, not two.
  const fingerprint = await sha256Hex(["request-v1", email, sameWording(service), sameWording(location), sameWording(details)].join("\n"));
  const already = await earlierOpenRequest(db, fingerprint);
  if (already) return duplicateAnswer(already);

  // The request and its fingerprint are saved in ONE step. If the fingerprint came a moment later, a twin saved in that gap would not see this request,
  // keep itself, and both would survive. Saved together, the request numbered later always finds the earlier one below.
  const emailHash = await customerContactHash("email", email);
  const phoneHash = await customerContactHash("phone", phone);
  await db.batch([
    db.prepare("INSERT INTO workflow_cases (request_code,customer_name,customer_email,customer_phone,service,suburb,description,timeframe,budget,stage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'request_submitted',?,?)")
      .bind(code, name, email, phone, service, location, description, clean(payload.timeframe).slice(0, 120), clean(payload.budget).slice(0, 120), now, now),
    db.prepare(`INSERT INTO request_consents (case_id,terms_version,accepted_at) SELECT id,?,? FROM workflow_cases WHERE request_code=?`).bind("VIC-2026-08-17", now, code),
    db.prepare(`INSERT INTO customer_contact_index (case_id,kind,contact_hash,created_at) SELECT id,'email',?,? FROM workflow_cases WHERE request_code=?`).bind(emailHash, now, code),
    db.prepare(`INSERT INTO customer_contact_index (case_id,kind,contact_hash,created_at) SELECT id,'phone',?,? FROM workflow_cases WHERE request_code=?`).bind(phoneHash, now, code),
    db.prepare(`INSERT INTO request_fingerprints (case_id,fingerprint,created_at) SELECT id,?,? FROM workflow_cases WHERE request_code=?`).bind(fingerprint, now, code),
  ]);
  const saved = await db.prepare("SELECT id FROM workflow_cases WHERE request_code=?").bind(code).first<{ id: number }>();
  if (!saved) throw new Error("The request could not be saved. Please try again.");
  const caseId = Number(saved.id);
  // Two identical requests that arrive at the same moment both pass the look above. Now that both are saved, the one with the lowest number stays and
  // every other takes its own rows back, so the answer is the same however the race went.
  const first = await earlierOpenRequest(db, fingerprint);
  if (first && Number(first.id) !== caseId) {
    await db.batch([
      db.prepare("DELETE FROM request_fingerprints WHERE case_id=?").bind(caseId),
      db.prepare("DELETE FROM customer_contact_index WHERE case_id=?").bind(caseId),
      db.prepare("DELETE FROM request_consents WHERE case_id=?").bind(caseId),
      db.prepare("DELETE FROM workflow_cases WHERE id=?").bind(caseId),
    ]);
    return duplicateAnswer(first);
  }
  await event(db, caseId, "Customer", clean(payload.email), "request_submitted", "Customer submitted a new project request", `${clean(payload.service)} · ${clean(payload.location)}`);
  return { caseId, code };
}

export async function getCustomerUploadTarget(caseId: number, code: string) {
  await ensureWorkflowDatabase();
  const db = await database();
  const item = await db.prepare(`SELECT id,request_code AS requestCode,customer_email AS customerEmail,
      project_folder AS projectFolder,stage,
      (SELECT COUNT(*) FROM workflow_files WHERE case_id=workflow_cases.id AND category='customer_request') AS fileCount
    FROM workflow_cases WHERE id=? AND UPPER(request_code)=UPPER(?) LIMIT 1`)
    .bind(caseId, code.trim()).first<Raw>();
  if (!item) throw new Error("The customer request was not found.");
  if (["closed", "complete"].includes(String(item.stage))) {
    throw new Error("Customer documents can no longer be added to this request.");
  }
  if (Number(item.fileCount) >= 20) throw new Error("This request already has the maximum of twenty customer files.");
  return {
    caseId: Number(item.id),
    requestCode: String(item.requestCode),
    customerEmail: String(item.customerEmail),
    projectFolder: String(item.projectFolder || ""),
  };
}

export async function addCustomerRequestFile(caseId: number, objectKey: string, file: File, customerEmail: string) {
  await ensureWorkflowDatabase();
  const db = await database();
  // The limit of twenty is part of the saving statement itself, so a burst of parallel uploads cannot all pass a "fewer than twenty so far" look.
  const created = await db.prepare(`INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,visibility,uploaded_at)
    SELECT ?1,'customer_request',?2,?3,?4,?5,?6,'internal',?7
    WHERE (SELECT COUNT(*) FROM workflow_files WHERE case_id=?1 AND category='customer_request') < 20`)
    .bind(caseId, objectKey, file.name, file.type, file.size, customerEmail, new Date().toISOString()).run();
  if (Number(created.meta.changes) !== 1) throw new Error("This request already has the maximum of twenty customer files.");
  const id = Number(created.meta.last_row_id);
  try {
    await event(db, caseId, "Customer", customerEmail, "customer_file_uploaded", "Customer supplied an intake document", file.name);
  } catch (error) {
    // Both halves or neither: the caller removes the stored file when this throws, so the record must go too (a record without a file is listed, counted and cannot be opened).
    await db.prepare("DELETE FROM workflow_files WHERE id=?").bind(id).run().catch(() => undefined);
    throw error;
  }
  return id;
}

export async function getPublicWorkflow(code: string) {
  await ensureWorkflowDatabase();
  await removeLegacyWorkflowDemo();
  await ensureCaseViewTables();
  const db = await database();
  const item = await db.prepare("SELECT wc.id,wc.request_code AS requestCode,wc.project_code AS projectCode,wc.service,wc.suburb,wc.stage,wc.site_visit_at AS siteVisitAt,wc.updated_at AS updatedAt,COALESCE((SELECT p.progress FROM projects p WHERE p.code=wc.project_code LIMIT 1),0) AS progress FROM workflow_cases wc WHERE UPPER(wc.request_code)=? LIMIT 1")
    .bind(code.toUpperCase()).first<Raw>();
  if (!item) return null;
  const caseId = Number(item.id);
  const result = await db.batch([
    db.prepare("SELECT id,amount_cents AS amountCents,scope,terms,status,sent_at AS sentAt,customer_decided_at AS customerDecidedAt,COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='sent' AND rv.case_id=workflow_estimates.case_id),sent_at) AS version FROM workflow_estimates WHERE case_id=? AND status IN ('sent','customer_accepted','customer_declined') LIMIT 1").bind(caseId),
    db.prepare("SELECT id,work_date AS workDate,customer_update AS customerUpdate,published_at AS publishedAt FROM project_updates WHERE case_id=? AND status='published' ORDER BY published_at DESC").bind(caseId),
    db.prepare("SELECT id,update_id AS updateId,file_name AS fileName,mime_type AS mimeType,published_at AS publishedAt FROM workflow_files WHERE case_id=? AND visibility='published' ORDER BY published_at DESC").bind(caseId),
    db.prepare("SELECT title,detail,created_at AS createdAt FROM workflow_events WHERE case_id=? AND audience='customer' ORDER BY created_at DESC").bind(caseId),
    db.prepare("SELECT id,title,detail,status,created_at AS createdAt,customer_reply AS customerReply,decided_at AS decidedAt FROM change_proposals WHERE case_id=? ORDER BY created_at DESC").bind(caseId),
    db.prepare("SELECT id,sender,sender_label AS senderLabel,body,kind,created_at AS createdAt FROM customer_messages WHERE case_id=? ORDER BY created_at,id").bind(caseId),
  ]);
  const files = await Promise.all((result[2].results as Raw[]).map(async (file): Promise<Raw & { url: string }> => ({ ...file, url: await customerFileLink(Number(file.id)) })));
  const view = await readCustomerView(caseId);
  return {
    ...item,
    customerStatus: view.customerStatus,
    notes: view.notes,
    // The customer reads the scope only; older estimates had the priced working in it, which is removed here.
    estimate: result[0].results[0] ? { ...(result[0].results[0] as Raw), scope: customerSafeScope(String((result[0].results[0] as Raw).scope)) } : null,
    updates: (result[1].results as Raw[]).map((update) => ({ ...update, files: files.filter((file) => Number(file.updateId) === Number(update.id)) })),
    activity: result[3].results,
    proposals: result[4].results,
    messages: result[5].results,
  };
}

// sentAt names the version the customer is looking at: deciding on an older screen after a revised quote was sent is refused (409), so a
// customer can never accept a price they have not seen. The stage move, the estimate decision and the history line are one batch.
export async function customerEstimateDecision(code: string, decision: "accept" | "decline", estimateVersion: string) {
  await ensureWorkflowDatabase();
  const db = await database();
  const item = await db.prepare("SELECT id,stage,customer_email AS customerEmail FROM workflow_cases WHERE UPPER(request_code)=? LIMIT 1").bind(code.toUpperCase()).first<Raw>();
  if (!item) throw new Error("Project was not found.");
  requireStage(item.stage, ["estimate_sent"]);
  const caseId = Number(item.id);
  const now = new Date().toISOString();
  const accepted = decision === "accept";
  // Required: a decision that does not say which estimate it is about (an old page, a hand-made request) is never applied. Compared
  // exactly as the portal received it.
  // The version is the decision key of the quote on the customer's screen (a new random value on every Send; the send time for quotes
  // sent before keys existed), so two sends can never be mistaken for each other.
  await ensureCaseViewTables();
  const version = typeof estimateVersion === "string" ? estimateVersion : "";
  const current = await db.prepare("SELECT COALESCE((SELECT rv.revision FROM record_revisions rv WHERE rv.kind='sent' AND rv.case_id=e.case_id),e.sent_at) AS version FROM workflow_estimates e WHERE e.case_id=? LIMIT 1").bind(caseId).first<{ version?: string }>();
  if (typeof estimateVersion !== "string" || !current || current.version !== version) throw new ConflictError("This estimate was updated. Please review the latest estimate before deciding.");
  const token = crypto.randomUUID();
  // The guard is in the statements themselves: if Accept and Decline arrive together, or the quote was revised meanwhile, only one thing happens.
  const results = await db.batch([
    db.prepare(`UPDATE workflow_cases SET stage=?,updated_at=? WHERE id=? AND stage='estimate_sent' AND EXISTS (SELECT 1 FROM workflow_estimates e WHERE e.case_id=workflow_cases.id AND e.status='sent') AND ${currentRevision("sent")}=?`)
      .bind(accepted ? "customer_approved" : "estimate_declined", now, caseId, version),
    markPortfolioSaved(db, token, now),
    db.prepare("UPDATE workflow_estimates SET status=?,customer_decided_at=? WHERE case_id=? AND status='sent' AND EXISTS (SELECT 1 FROM save_tokens WHERE token=?)").bind(accepted ? "customer_accepted" : "customer_declined", now, caseId, token),
    eventStatementIf(db, caseId, "Customer", String(item.customerEmail), "customer_estimate_decision", accepted ? "Customer accepted the estimate" : "Customer declined the estimate", "", "customer", now, token),
    clearPortfolioSaved(db, token),
  ]);
  if (Number((results[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) throw new Error("This estimate is no longer waiting for a decision.");
}

// The exact text a customer message is saved as (trimmed, control characters removed). Used both for the "already sent?" check and for saving,
// so an identical retry is always recognised as the same message.
export function canonicalCustomerMessage(value: unknown) {
  return (typeof value === "string" ? value.trim() : "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

// Whether this customer message (same key) was already saved: "same" content, "different" content (refused), or "none".
export async function customerMessagePrior(code: string, bodyInput: unknown, clientKey: unknown) {
  await ensureWorkflowDatabase();
  const db = await database();
  const item = await db.prepare("SELECT id FROM workflow_cases WHERE UPPER(request_code)=? LIMIT 1").bind(code.trim().toUpperCase()).first<Raw>();
  const key = item ? operationKey(`customer-message:${Number(item.id)}`, clientKey) : "";
  if (!key) return "none" as const;
  return priorOperation(key, await payloadFingerprint([canonicalCustomerMessage(bodyInput)]));
}

// Returns "repeated" when the same message (same one-time key) was already saved, so the caller does not count it again.
export async function customerReplyMessage(code: string, bodyInput: unknown, clientKey?: unknown) {
  await ensureWorkflowDatabase();
  const db = await database();
  const item = await db.prepare("SELECT id,stage,customer_name AS customerName,customer_email AS customerEmail FROM workflow_cases WHERE UPPER(request_code)=? LIMIT 1").bind(code.trim().toUpperCase()).first<Raw>();
  if (!item) throw new Error("Project was not found.");
  if (item.stage === "closed") throw new Error("This request is closed.");
  const body = bounded(bodyInput, "Message", 2000);
  const caseId = Number(item.id);
  // Saved together with its history line: a failure never leaves a message behind that the customer was told did not send. With a one-time
  // key, sending the same message again (a lost answer, a double press) does not save it twice.
  const key = operationKey(`customer-message:${caseId}`, clientKey);
  const fingerprint = await payloadFingerprint([body]);
  await ensureCaseViewTables();
  try {
    await db.batch([
      ...(key ? [operationKeyStatement(db, key, fingerprint, new Date().toISOString())] : []),
      db.prepare("INSERT INTO customer_messages (case_id,sender,sender_label,body,kind,created_at) VALUES (?,'Customer',?,?,'message',?)").bind(caseId, String(item.customerName), body, new Date().toISOString()),
      eventStatement(db, caseId, "Customer", String(item.customerEmail), "customer_message", "Customer sent a message", body),
    ]);
  } catch (error) {
    if (await isRepeat(key, fingerprint, error)) return "repeated" as const;
    throw error;
  }
  return "saved" as const;
}

export async function customerChangeDecision(code: string, proposalId: number, decision: "accept" | "decline", reply: string) {
  await ensureWorkflowDatabase();
  const db = await database();
  const item = await db.prepare("SELECT id,customer_email AS customerEmail FROM workflow_cases WHERE UPPER(request_code)=? LIMIT 1").bind(code.toUpperCase()).first<Raw>();
  if (!item) throw new Error("Project was not found.");
  const caseId = Number(item.id);
  const proposal = await db.prepare("SELECT id,status,title FROM change_proposals WHERE id=? AND case_id=?").bind(proposalId, caseId).first<Raw>();
  if (!proposal || proposal.status !== "sent") throw new Error("This change request is no longer waiting for a decision.");
  const now = new Date().toISOString();
  const accepted = decision === "accept";
  // The customer's reply may hold conditions ("only if it costs under $300"): it is saved in full or refused, never cut short.
  const safeReply = (typeof reply === "string" ? reply.trim() : "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (safeReply.length > 2000) throw new Error("Your reply is too long (2,000 characters at most). Please shorten it and send again.");
  const decided = await db.batch([
    db.prepare("UPDATE change_proposals SET status=?,customer_reply=?,decided_at=? WHERE id=? AND status='sent' AND EXISTS (SELECT 1 FROM workflow_cases WHERE id=? AND stage='active_project')").bind(accepted ? "accepted" : "declined", safeReply, now, proposalId, caseId),
    eventStatementIfChanged(db, caseId, "Customer", String(item.customerEmail), "customer_change_decision", accepted ? `Customer approved the change: ${proposal.title}` : `Customer declined the change: ${proposal.title}`, safeReply, "customer", now),
  ]);
  if (Number((decided[0] as { meta?: { changes?: number } }).meta?.changes ?? 0) !== 1) throw new Error("This change request is no longer waiting for a decision.");
}

export async function addWorkflowFile(caseId: number, category: string, objectKey: string, file: File, uploadedBy: string) {
  await ensureWorkflowDatabase();
  const db = await database();
  const created = await db.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,visibility,uploaded_at) VALUES (?,?,?,?,?,?,?,'internal',?)")
    .bind(caseId, category, objectKey, file.name, file.type, file.size, uploadedBy, new Date().toISOString()).run();
  const label = category === "site_visit" ? "Site visit" : category === "quality" ? "Quality inspection" : category === "document" ? "Project folder" : "Progress";
  const verb = category === "document" ? "file added" : "photo uploaded";
  const id = Number(created.meta.last_row_id);
  try {
    await event(db, caseId, uploadedBy.includes("@") ? "Site Supervisor" : "Team", uploadedBy, "photo_uploaded", `${label} ${verb}`, file.name);
  } catch (error) {
    // Both halves or neither (the route removes the stored file when this throws).
    await db.prepare("DELETE FROM workflow_files WHERE id=?").bind(id).run().catch(() => undefined);
    throw error;
  }
  return id;
}

export async function getWorkflowFile(id: number, publicOnly: boolean) {
  await ensureWorkflowDatabase();
  const db = await database();
  const where = publicOnly ? "id=? AND visibility='published'" : "id=?";
  return db.prepare(`SELECT case_id AS caseId,category,object_key AS objectKey,mime_type AS mimeType,file_name AS fileName FROM workflow_files WHERE ${where} LIMIT 1`).bind(id).first<{ caseId: number; category: string; objectKey: string; mimeType: string; fileName: string }>();
}

// The same visibility rules as getWorkflowSnapshot: Owner/Admin see every case, an Estimator the cases at estimating stages,
// a Site Supervisor only the cases assigned to them.
export async function canAccessWorkflowCase(role: WorkflowRole, actorEmail: string, caseId: number) {
  if (role === "owner") return true;
  if (role === "admin") return assertProjectAccess(role).then(() => true, () => false);
  await ensureWorkflowDatabase();
  const db = await database();
  const row = await db.prepare("SELECT stage,assigned_supervisor_email AS supervisor FROM workflow_cases WHERE id=? LIMIT 1").bind(caseId).first<{ stage: string; supervisor: string }>();
  if (!row) return false;
  if (role === "supervisor") return String(row.supervisor).toLowerCase() === actorEmail.toLowerCase();
  if (role === "estimator") return (estimatorStages as readonly string[]).includes(row.stage);
  return false;
}

// The next project number of the year (?1 = "ATP-YYYY-", ?2 = its length + 1, ?3 = "ATP-YYYY-%"), counted over the portfolio AND the cases.
// Only numbers of 1 to 9 digits count, and a new number never goes past 9 digits: every number handed out is counted next time, and a code
// typed by hand with a giant number cannot push numbering off the end. Past 999999999 the result is empty, the save stops (NOT NULL) and
// nothing is changed; noNumbersLeft() turns that into a clear message.
const nextProjectCode = `(SELECT CASE WHEN nextNumber <= 999999999 THEN ?1 || printf('%05d', nextNumber) END FROM (SELECT COALESCE(MAX(CAST(substr(code, ?2) AS INTEGER)), 0) + 1 AS nextNumber
    FROM (SELECT code FROM projects WHERE code LIKE ?3 UNION ALL SELECT project_code AS code FROM workflow_cases WHERE project_code LIKE ?3)
    WHERE length(substr(code, ?2)) BETWEEN 1 AND 9 AND substr(code, ?2) NOT GLOB '*[^0-9]*'))`;
const noNumbersLeft = (error: unknown) => /NOT NULL constraint failed: workflow_cases\.project_code/i.test(error instanceof Error ? error.message : String(error));
const noNumbersMessage = "No project numbers are left for this year (a project code with a very large number exists). Please ask the Owner to check the portfolio codes.";

// Where a project the Owner or Admin opens for a customer (a job that did not come through the website form) starts in the step-by-step workflow.
// Only starting points that every later step can build on are offered; the stage name itself is free (see db/case-view-store.ts).
const teamProjectEntries = {
  new: { stage: "admin_review", portfolioStage: "", progress: 0, title: "New enquiry — start with Admin review" },
  site_visit: { stage: "site_visit_ready", portfolioStage: "Site inspection", progress: 0, title: "Ready for a site visit" },
  underway: { stage: "active_project", portfolioStage: "Work in progress", progress: 5, title: "Work already underway" },
} as const;
export type TeamProjectEntry = keyof typeof teamProjectEntries;

// The Owner or Admin opens a project for a customer: it gets the same private, unguessable customer code as a website request (so the
// customer uses the same portal, messages and files), a project number when it starts past intake, and the stage the Owner/Admin chose.
export async function createTeamCase(role: WorkflowRole, actorEmail: string, payload: Record<string, unknown>) {
  if (role !== "owner" && role !== "admin") throw new Error("Owner or Admin access is required to create a project.");
  await assertProjectAccess(role);
  await ensureWorkflowDatabase();
  const db = await database();
  const name = bounded(payload.name, "Customer name", 120);
  const service = bounded(payload.service, "Type of work", 120);
  const location = bounded(payload.location, "Project location", 240);
  const description = clean(payload.description).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (description.length > 6000) throw new Error("Project details is too long.");
  const email = clean(payload.email).toLowerCase();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Enter a valid email address, or leave it empty.");
  const phone = clean(payload.phone);
  if (phone.length > 40) throw new Error("Phone is too long.");
  const statusLabel = clean(payload.statusLabel).replace(/[\u0000-\u001F\u007F]/g, "");
  if (statusLabel.length > 80) throw new Error("Stage is too long (up to 80 characters).");
  const entryKey = typeof payload.entry === "string" && Object.hasOwn(teamProjectEntries, payload.entry) ? payload.entry as TeamProjectEntry : null;
  if (!entryKey) throw new Error("Choose where the project starts.");
  const entry = teamProjectEntries[entryKey];
  const who = role === "owner" ? "Owner" : "Admin";
  const now = new Date().toISOString();
  // The screen sends one key per press of "Create"; pressing again after a lost answer returns the project already made, never a second one.
  const clientKey = typeof payload.clientKey === "string" && /^[A-Za-z0-9-]{16,64}$/.test(payload.clientKey) ? payload.clientKey : "";
  // The key only ever returns the project made from exactly this form; a key reused for a different customer or details is refused.
  const fingerprint = await payloadFingerprint([name, email, phone, service, location, description, entryKey, statusLabel]);
  const earlierProject = async () => {
    if (!clientKey) return null;
    const earlier = await db.prepare("SELECT k.case_id AS caseId,k.fingerprint AS fingerprint,wc.request_code AS requestCode,wc.project_code AS projectCode FROM team_project_keys k JOIN workflow_cases wc ON wc.id=k.case_id WHERE k.client_key=?").bind(clientKey).first<Raw>();
    if (!earlier?.requestCode) return null;
    if (earlier.fingerprint !== fingerprint) throw new ConflictError("This form was already used to create a different project. Close it and open a new one.");
    return { caseId: Number(earlier.caseId), requestCode: String(earlier.requestCode), projectCode: String(earlier.projectCode ?? ""), repeated: true };
  };
  const repeated = await earlierProject();
  if (repeated) return repeated;

  // Everything is saved in ONE batch (a D1 batch is one transaction): the retry key, the case, its project number and portfolio row, the
  // stage, the contact lookup and the history. If anything fails, nothing at all is kept — no half-made project, no released key.
  // Later statements find the new case by its unique private code instead of by a number not known yet.
  const code = privateRequestCode();
  const caseByCode = "(SELECT id FROM workflow_cases WHERE request_code=?)";
  const prefix = `ATP-${businessYear()}-`;
  await ensureCaseViewTables();
  const emailHash = email ? await customerContactHash("email", email) : "";
  const phoneHash = normaliseCustomerContact("phone", phone) ? await customerContactHash("phone", phone) : "";
  const statements = [
    ...(clientKey ? [db.prepare("INSERT INTO team_project_keys (client_key,case_id,fingerprint,created_at) VALUES (?,0,?,?)").bind(clientKey, fingerprint, now)] : []),
    db.prepare("INSERT INTO workflow_cases (request_code,customer_name,customer_email,customer_phone,service,suburb,description,timeframe,budget,stage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'','',?,?,?)")
      .bind(code, name, email, phone, service, location, description, entry.stage, now, now),
    ...(entry.portfolioStage ? [
      // The next free project number, counted over projects AND cases (the same rule as approve_intake), given to the case and its portfolio row.
      db.prepare(`UPDATE workflow_cases SET project_code = ${nextProjectCode}
        WHERE request_code = ?4`).bind(prefix, prefix.length + 1, `${prefix}%`, code),
      db.prepare("UPDATE workflow_cases SET project_folder = 'projects/' || project_code WHERE request_code=?").bind(code),
      db.prepare(`INSERT INTO projects (code,name,service,stage,progress,contract_value,balance,customer_name,suburb,start_date,notes,updated_at)
        SELECT project_code, service || ' · ' || suburb, service, ?, ?, 0, 0, customer_name, suburb, '', ?, ? FROM workflow_cases WHERE request_code=?`)
        .bind(statusLabel || entry.portfolioStage, entry.progress, `Opened by the ${who} for a customer who contacted the company directly.`, now, code),
    ] : []),
    db.prepare(`INSERT INTO case_status (case_id,origin,status_label,status_updated_at,status_updated_by) SELECT id,'team',?,?,? FROM workflow_cases WHERE request_code=?`)
      .bind(statusLabel, statusLabel ? now : "", statusLabel ? actorEmail : "", code),
    ...(statusLabel ? [db.prepare("INSERT INTO custom_stage_labels (label,last_used_at) VALUES (?,?) ON CONFLICT(label) DO UPDATE SET last_used_at=excluded.last_used_at").bind(statusLabel, now)] : []),
    ...(emailHash ? [db.prepare(`INSERT INTO customer_contact_index (case_id,kind,contact_hash,created_at) SELECT id,'email',?,? FROM workflow_cases WHERE request_code=?`).bind(emailHash, now, code)] : []),
    ...(phoneHash ? [db.prepare(`INSERT INTO customer_contact_index (case_id,kind,contact_hash,created_at) SELECT id,'phone',?,? FROM workflow_cases WHERE request_code=?`).bind(phoneHash, now, code)] : []),
    db.prepare(`INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) SELECT id,?,?,'team_project_created',?,?,'internal',? FROM workflow_cases WHERE request_code=?`)
      .bind(who, actorEmail, `${who} opened this project for a customer who contacted us directly`, `${entry.title}${statusLabel ? ` · stage "${statusLabel}"` : ""}`, now, code),
    db.prepare(`INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) SELECT id,?,?,'project_opened','Your project has been opened',?,'customer',? FROM workflow_cases WHERE request_code=?`)
      .bind(who, actorEmail, `${service} · ${location}`, now, code),
    ...(clientKey ? [db.prepare(`UPDATE team_project_keys SET case_id=${caseByCode} WHERE client_key=?`).bind(code, clientKey)] : []),
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    // Two presses of the same Create at the same moment: the second one's batch stops at the key and changes nothing.
    const earlier = await earlierProject().catch((lookup) => { if (lookup instanceof ConflictError) throw lookup; return null; });
    if (earlier) return earlier;
    if (noNumbersLeft(error)) throw new Error(noNumbersMessage);
    if (clientKey && /unique|constraint/i.test(error instanceof Error ? error.message : String(error))) throw new Error("This project is already being created. Wait a moment, then refresh the list.");
    throw error;
  }
  const saved = await db.prepare("SELECT id,project_code AS projectCode FROM workflow_cases WHERE request_code=?").bind(code).first<Raw>();
  if (!saved) throw new Error("The project could not be created. Please try again.");
  return { caseId: Number(saved.id), requestCode: code, projectCode: String(saved.projectCode ?? ""), repeated: false };
}

// Customer conversations for the Owner, Admin and Manager (the Manager reads them; only Owner and Admin write to customers). The private customer
// code is never included: it is the customer's key to their portal.
export async function getCustomerConversations(role: "owner" | "admin" | "manager") {
  await ensureWorkflowDatabase();
  await assertProjectAccess(role);
  await removeLegacyWorkflowDemo();
  const db = await database();
  const [cases, messages] = await db.batch([
    db.prepare("SELECT id,project_code AS projectCode,customer_name AS customerName,service,suburb,stage,updated_at AS updatedAt FROM workflow_cases ORDER BY updated_at DESC,id DESC"),
    db.prepare("SELECT id,case_id AS caseId,sender,sender_label AS senderLabel,body,kind,created_at AS createdAt FROM customer_messages ORDER BY created_at,id"),
  ]);
  const caseRows = cases.results as Raw[];
  const views = await readCaseViews(caseRows.map((row) => Number(row.id)), false);
  const byCase = new Map<number, Raw[]>();
  for (const message of messages.results as Raw[]) {
    const list = byCase.get(Number(message.caseId)) ?? [];
    list.push(message);
    byCase.set(Number(message.caseId), list);
  }
  return caseRows.map((row) => {
    const view = views.get(Number(row.id));
    return { ...row, statusLabel: view?.statusLabel ?? "", customerStatus: view?.customerStatus ?? null, messages: byCase.get(Number(row.id)) ?? [] };
  });
}

export const ensureWorkflowDatabase = memoizePerDatabase(ensureWorkflowDatabaseOnce);
