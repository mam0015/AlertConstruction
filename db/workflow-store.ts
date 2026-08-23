import type { WorkflowRole, WorkflowSnapshot, WorkflowStage } from "../app/workflow/types";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;

async function database(): Promise<D1> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("The project workflow database is unavailable.");
  return env.DB;
}

function clean(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function required(value: unknown, label: string) {
  const result = clean(value);
  if (!result) throw new Error(`${label} is required.`);
  return result;
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

async function customerContactHash(kind: CustomerContactKind, value: string) {
  const normalised = normaliseCustomerContact(kind, value);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${kind}:${normalised}`)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ensureWorkflowDatabase() {
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
    db.prepare(`CREATE TABLE IF NOT EXISTS workflow_events (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, actor_role TEXT NOT NULL, actor_email TEXT NOT NULL DEFAULT '', event_type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', audience TEXT NOT NULL DEFAULT 'internal', created_at TEXT NOT NULL)`),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_cases_stage_idx ON workflow_cases(stage)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_cases_supervisor_idx ON workflow_cases(assigned_supervisor_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_events_case_idx ON workflow_events(case_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_files_case_idx ON workflow_files(case_id, category)"),
    db.prepare("CREATE INDEX IF NOT EXISTS project_updates_case_idx ON project_updates(case_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS quality_inspections_case_idx ON quality_inspections(case_id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS request_consents (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL UNIQUE, terms_version TEXT NOT NULL, accepted_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_contact_index (
      case_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('email','phone')),
      contact_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (case_id, kind)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS customer_contact_lookup_idx ON customer_contact_index(kind, contact_hash)"),
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
}

async function event(db: D1, caseId: number, role: string, email: string, eventType: string, title: string, detail = "", audience = "internal") {
  await db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(caseId, role, email, eventType, title, detail, audience, new Date().toISOString()).run();
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
    db.prepare("INSERT INTO app_migrations (migration_key,applied_at) VALUES (?,?)")
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

export async function findCustomerProjectsByContact(kind: CustomerContactKind, value: string): Promise<CustomerProjectAccess[]> {
  await ensureWorkflowDatabase();
  await removeLegacyWorkflowDemo();
  const normalised = normaliseCustomerContact(kind, value);
  if (!normalised) return [];
  const db = await database();
  const hash = await customerContactHash(kind, normalised);
  const result = await db.prepare(`SELECT wc.request_code AS requestCode,wc.service,wc.suburb,wc.updated_at AS updatedAt
    FROM customer_contact_index ci
    INNER JOIN workflow_cases wc ON wc.id=ci.case_id
    WHERE ci.kind=? AND ci.contact_hash=?
    ORDER BY wc.updated_at DESC,wc.id DESC LIMIT 5`).bind(kind, hash).all<CustomerProjectAccess>();
  return result.results;
}

export async function getWorkflowSnapshot(role: WorkflowRole, actorEmail: string): Promise<WorkflowSnapshot> {
  await ensureWorkflowDatabase();
  await removeLegacyWorkflowDemo();
  const db = await database();
  const statements = [
    role === "supervisor"
      ? db.prepare("SELECT wc.id,wc.request_code AS requestCode,wc.project_code AS projectCode,wc.customer_name AS customerName,wc.customer_email AS customerEmail,wc.customer_phone AS customerPhone,wc.service,wc.suburb,wc.description,wc.timeframe,wc.budget,wc.stage,wc.assigned_supervisor_email AS assignedSupervisorEmail,wc.assigned_supervisor_name AS assignedSupervisorName,wc.site_visit_at AS siteVisitAt,wc.project_folder AS projectFolder,wc.created_at AS createdAt,wc.updated_at AS updatedAt,COALESCE((SELECT p.progress FROM projects p WHERE p.code=wc.project_code LIMIT 1),0) AS progress FROM workflow_cases wc WHERE LOWER(wc.assigned_supervisor_email)=? ORDER BY wc.updated_at DESC").bind(actorEmail.toLowerCase())
      : db.prepare("SELECT wc.id,wc.request_code AS requestCode,wc.project_code AS projectCode,wc.customer_name AS customerName,wc.customer_email AS customerEmail,wc.customer_phone AS customerPhone,wc.service,wc.suburb,wc.description,wc.timeframe,wc.budget,wc.stage,wc.assigned_supervisor_email AS assignedSupervisorEmail,wc.assigned_supervisor_name AS assignedSupervisorName,wc.site_visit_at AS siteVisitAt,wc.project_folder AS projectFolder,wc.created_at AS createdAt,wc.updated_at AS updatedAt,COALESCE((SELECT p.progress FROM projects p WHERE p.code=wc.project_code LIMIT 1),0) AS progress FROM workflow_cases wc ORDER BY wc.updated_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,supervisor_email AS supervisorEmail,visit_date AS visitDate,summary,findings,recommendations,internal_notes AS internalNotes,status,admin_note AS adminNote,submitted_at AS submittedAt,reviewed_at AS reviewedAt FROM site_visit_reports ORDER BY submitted_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,update_id AS updateId,category,file_name AS fileName,mime_type AS mimeType,size_bytes AS sizeBytes,uploaded_by AS uploadedBy,visibility,uploaded_at AS uploadedAt,published_at AS publishedAt FROM workflow_files ORDER BY uploaded_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,amount_cents AS amountCents,scope,terms,status,created_by AS createdBy,created_at AS createdAt,sent_at AS sentAt,customer_decided_at AS customerDecidedAt,confirmed_at AS confirmedAt FROM workflow_estimates"),
    db.prepare("SELECT id,case_id AS caseId,work_date AS workDate,supervisor_email AS supervisorEmail,internal_update AS internalUpdate,customer_update AS customerUpdate,status,admin_note AS adminNote,owner_note AS ownerNote,created_at AS createdAt,admin_reviewed_at AS adminReviewedAt,owner_reviewed_at AS ownerReviewedAt,published_at AS publishedAt FROM project_updates ORDER BY created_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,supervisor_email AS supervisorEmail,inspected_at AS inspectedAt,summary,defects,status,admin_note AS adminNote,owner_note AS ownerNote,submitted_at AS submittedAt,reviewed_at AS reviewedAt,completed_at AS completedAt FROM quality_inspections"),
    db.prepare("SELECT id,case_id AS caseId,actor_role AS actorRole,actor_email AS actorEmail,event_type AS eventType,title,detail,audience,created_at AS createdAt FROM workflow_events ORDER BY created_at DESC,id DESC LIMIT 250"),
    db.prepare("SELECT email,COALESCE(NULLIF(trade_title,''),role) AS name FROM staff_access_requests WHERE status='Approved' AND role='Site Supervisor' ORDER BY email"),
  ];
  const result = await db.batch(statements);
  const cases = result[0].results as Raw[];
  const reports = result[1].results as Raw[];
  const files = (result[2].results as Raw[]).map((file): Raw & { url: string } => ({ ...file, url: `/api/workflow/files?id=${file.id}` }));
  const estimates = result[3].results as Raw[];
  const updates = result[4].results as Raw[];
  const inspections = result[5].results as Raw[];
  const allowedIds = new Set(cases.map((item) => Number(item.id)));
  const shaped = cases.map((item) => {
    const caseId = Number(item.id);
    const caseFiles = files.filter((file) => Number(file.caseId) === caseId);
    const safe = { ...item };
    if (role === "supervisor") {
      safe.customerEmail = "";
      safe.customerPhone = "";
      safe.budget = "";
    }
    return {
      ...safe,
      visitReport: reports.find((report) => Number(report.caseId) === caseId) ?? null,
      qualityInspection: inspections.find((inspection) => Number(inspection.caseId) === caseId) ?? null,
      estimate: role === "supervisor" ? null : estimates.find((estimate) => Number(estimate.caseId) === caseId) ?? null,
      files: caseFiles,
      updates: updates.filter((update) => Number(update.caseId) === caseId).map((update) => ({ ...update, files: caseFiles.filter((file) => Number(file.updateId) === Number(update.id)) })),
    };
  });
  const supervisors = (result[7].results as Raw[]).map((row) => ({ email: String(row.email), name: String(row.name) }));
  if (!supervisors.length && (process.env.NODE_ENV === "development" || process.env.ATP_DEMO_SEED === "true")) supervisors.push({ email: "supervisor.preview@example.invalid", name: "Site Supervisor Preview" });
  return {
    cases: shaped as WorkflowSnapshot["cases"],
    events: (result[6].results as WorkflowSnapshot["events"]).filter((item) => allowedIds.has(Number(item.caseId))).map((item) => role === "supervisor" ? { ...item, actorEmail: "" } : item),
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

function allow(role: WorkflowRole, expected: WorkflowRole) {
  if (role !== expected) throw new Error(`${expected === "supervisor" ? "Site Supervisor" : expected} access is required for this action.`);
}

function requireStage(current: unknown, allowed: WorkflowStage[]) {
  if (!allowed.includes(String(current) as WorkflowStage)) throw new Error("This action is not available at the current project stage.");
}

function projectCodeFrom(requestCode: string) {
  const digits = requestCode.match(/(\d{3,})$/)?.[1] ?? String(Date.now()).slice(-5);
  return `ATP-${new Date().getFullYear()}-${digits.padStart(5, "0")}`;
}

function privateRequestCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `REQ-${new Date().getFullYear()}-${token}`;
}

export async function performWorkflowAction(role: WorkflowRole, actorEmail: string, action: string, caseId: number, payload: Record<string, unknown>) {
  await ensureWorkflowDatabase();
  const db = await database();
  const item = await oneCase(caseId);
  const now = new Date().toISOString();
  const stage = String(item.stage) as WorkflowStage;

  if (action === "review_started") {
    allow(role, "admin"); requireStage(stage, ["request_submitted"]);
    await db.prepare("UPDATE workflow_cases SET stage='admin_review',updated_at=? WHERE id=?").bind(now, caseId).run();
    await event(db, caseId, "Admin", actorEmail, action, "Admin started reviewing the customer request");
  } else if (action === "customer_contacted") {
    allow(role, "admin"); requireStage(stage, ["request_submitted", "admin_review"]);
    const note = required(payload.note, "Contact note");
    await db.prepare("UPDATE workflow_cases SET stage='customer_contacted',updated_at=? WHERE id=?").bind(now, caseId).run();
    await event(db, caseId, "Admin", actorEmail, action, "Admin contacted the customer", note);
  } else if (action === "approve_intake") {
    allow(role, "admin"); requireStage(stage, ["admin_review", "customer_contacted"]);
    const projectCode = projectCodeFrom(String(item.requestCode));
    const folder = `projects/${projectCode}`;
    await db.batch([
      db.prepare("UPDATE workflow_cases SET stage='site_visit_ready',project_code=?,project_folder=?,updated_at=? WHERE id=?").bind(projectCode, folder, now, caseId),
      db.prepare("INSERT OR IGNORE INTO projects (code,name,service,stage,progress,contract_value,balance,customer_name,suburb,start_date,notes,updated_at) VALUES (?,?,?,?,0,0,0,?,?,?,'Created from approved customer request.',?)").bind(projectCode, `${item.service} · ${item.suburb}`, item.service, "Site inspection", item.customerName, item.suburb, "", now),
    ]);
    await event(db, caseId, "Admin", actorEmail, action, "Admin approved intake and created the project folder", folder);
  } else if (action === "assign_visit") {
    allow(role, "admin"); requireStage(stage, ["site_visit_ready", "site_visit_scheduled", "visit_changes_requested"]);
    const supervisorEmail = required(payload.supervisorEmail, "Site Supervisor").toLowerCase();
    const supervisorName = required(payload.supervisorName, "Site Supervisor name");
    const visitAt = required(payload.visitAt, "Site visit date and time");
    await db.prepare("UPDATE workflow_cases SET stage='site_visit_scheduled',assigned_supervisor_email=?,assigned_supervisor_name=?,site_visit_at=?,updated_at=? WHERE id=?")
      .bind(supervisorEmail, supervisorName, visitAt, now, caseId).run();
    await event(db, caseId, "Admin", actorEmail, action, `Site visit assigned to ${supervisorName}`, visitAt);
  } else if (action === "submit_site_visit") {
    allow(role, "supervisor"); requireStage(stage, ["site_visit_scheduled", "visit_changes_requested"]);
    if (String(item.assignedSupervisorEmail).toLowerCase() !== actorEmail.toLowerCase()) throw new Error("This project is not assigned to your account.");
    const fileIds = Array.isArray(payload.fileIds) ? payload.fileIds.map(Number).filter(Number.isInteger) : [];
    if (!fileIds.length) throw new Error("At least one site photo is required before the visit report can be submitted.");
    const values = [caseId, actorEmail, required(payload.visitDate, "Visit date"), required(payload.summary, "Visit summary"), required(payload.findings, "Findings"), required(payload.recommendations, "Recommendations"), clean(payload.internalNotes), "submitted", "", now, ""];
    const previous = await db.prepare("SELECT id FROM site_visit_reports WHERE case_id=? ORDER BY id DESC LIMIT 1").bind(caseId).first<{ id?: number }>();
    if (previous?.id) {
      await db.prepare("UPDATE site_visit_reports SET supervisor_email=?,visit_date=?,summary=?,findings=?,recommendations=?,internal_notes=?,status='submitted',admin_note='',submitted_at=?,reviewed_at='' WHERE id=?")
        .bind(actorEmail, values[2], values[3], values[4], values[5], values[6], now, previous.id).run();
    } else {
      await db.prepare("INSERT INTO site_visit_reports (case_id,supervisor_email,visit_date,summary,findings,recommendations,internal_notes,status,admin_note,submitted_at,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(...values).run();
    }
    await db.prepare("UPDATE workflow_cases SET stage='site_visit_submitted',updated_at=? WHERE id=?").bind(now, caseId).run();
    await event(db, caseId, "Site Supervisor", actorEmail, action, "Site visit report and photos submitted to Admin", `${fileIds.length} photo(s) attached.`);
  } else if (action === "review_site_visit") {
    allow(role, "admin"); requireStage(stage, ["site_visit_submitted"]);
    const decision = clean(payload.decision);
    if (!['approved', 'changes_requested'].includes(decision)) throw new Error("Choose approve or request changes.");
    const note = clean(payload.note);
    if (decision === "changes_requested" && !note) throw new Error("Explain what the Site Supervisor must change.");
    const nextStage = decision === "approved" ? "site_visit_approved" : "visit_changes_requested";
    await db.batch([
      db.prepare("UPDATE site_visit_reports SET status=?,admin_note=?,reviewed_at=? WHERE case_id=?").bind(decision, note, now, caseId),
      db.prepare("UPDATE workflow_cases SET stage=?,updated_at=? WHERE id=?").bind(nextStage, now, caseId),
    ]);
    await event(db, caseId, "Admin", actorEmail, action, decision === "approved" ? "Admin approved the site visit report" : "Admin returned the site visit report", note);
  } else if (action === "save_estimate") {
    allow(role, "admin"); requireStage(stage, ["site_visit_approved", "estimate_ready"]);
    const amountCents = Math.round(number(payload.amount) * 100);
    if (amountCents <= 0) throw new Error("Enter a valid estimate amount.");
    const scope = required(payload.scope, "Estimate scope");
    const terms = clean(payload.terms);
    await db.batch([
      db.prepare("INSERT INTO workflow_estimates (case_id,amount_cents,scope,terms,status,created_by,created_at,sent_at,customer_decided_at,confirmed_at) VALUES (?,?,?,?, 'draft', ?, ?, '', '', '') ON CONFLICT(case_id) DO UPDATE SET amount_cents=excluded.amount_cents,scope=excluded.scope,terms=excluded.terms,status='draft',created_by=excluded.created_by,created_at=excluded.created_at,sent_at='',customer_decided_at='',confirmed_at='' ").bind(caseId, amountCents, scope, terms, actorEmail, now),
      db.prepare("UPDATE workflow_cases SET stage='estimate_ready',updated_at=? WHERE id=?").bind(now, caseId),
    ]);
    await event(db, caseId, "Admin", actorEmail, action, "Admin prepared the estimate", "Estimate is internal until sent to the customer.");
  } else if (action === "send_estimate") {
    allow(role, "admin"); requireStage(stage, ["estimate_ready"]);
    await db.batch([
      db.prepare("UPDATE workflow_estimates SET status='sent',sent_at=? WHERE case_id=?").bind(now, caseId),
      db.prepare("UPDATE workflow_cases SET stage='estimate_sent',updated_at=? WHERE id=?").bind(now, caseId),
    ]);
    await event(db, caseId, "Admin", actorEmail, action, "Estimate sent to the customer", "Customer approval is now required.", "customer");
  } else if (action === "activate_project") {
    allow(role, "admin"); requireStage(stage, ["customer_approved"]);
    const estimate = await db.prepare("SELECT status FROM workflow_estimates WHERE case_id=?").bind(caseId).first<{ status?: string }>();
    if (estimate?.status !== "customer_accepted") throw new Error("The customer must accept the estimate first.");
    await db.batch([
      db.prepare("UPDATE workflow_estimates SET confirmed_at=? WHERE case_id=?").bind(now, caseId),
      db.prepare("UPDATE workflow_cases SET stage='active_project',updated_at=? WHERE id=?").bind(now, caseId),
      db.prepare("UPDATE projects SET stage='Scheduled',progress=5,updated_at=? WHERE code=?").bind(now, item.projectCode),
    ]);
    await event(db, caseId, "Admin", actorEmail, action, "Customer-approved work converted to an active project", String(item.projectCode));
  } else if (action === "submit_progress_update") {
    allow(role, "supervisor"); requireStage(stage, ["active_project"]);
    if (String(item.assignedSupervisorEmail).toLowerCase() !== actorEmail.toLowerCase()) throw new Error("This project is not assigned to your account.");
    const fileIds = Array.isArray(payload.fileIds) ? payload.fileIds.map(Number).filter(Number.isInteger) : [];
    if (!fileIds.length) throw new Error("At least one progress photo is required for the daily update.");
    const created = await db.prepare("INSERT INTO project_updates (case_id,work_date,supervisor_email,internal_update,customer_update,status,created_at) VALUES (?,?,?,?,?,'pending_admin',?)")
      .bind(caseId, required(payload.workDate, "Work date"), actorEmail, required(payload.internalUpdate, "Internal team update"), required(payload.customerUpdate, "Customer update"), now).run();
    const updateId = Number(created.meta.last_row_id);
    const placeholders = fileIds.map(() => "?").join(",");
    await db.prepare(`UPDATE workflow_files SET update_id=? WHERE case_id=? AND id IN (${placeholders})`).bind(updateId, caseId, ...fileIds).run();
    await event(db, caseId, "Site Supervisor", actorEmail, action, "Daily update submitted to Admin", "Internal notes are visible to management. Customer copy remains hidden.");
  } else if (action === "submit_quality_inspection") {
    allow(role, "supervisor"); requireStage(stage, ["active_project"]);
    if (String(item.assignedSupervisorEmail).toLowerCase() !== actorEmail.toLowerCase()) throw new Error("This project is not assigned to your account.");
    const fileIds = Array.isArray(payload.fileIds) ? payload.fileIds.map(Number).filter(Number.isInteger) : [];
    if (!fileIds.length) throw new Error("At least one completion photo is required for quality inspection.");
    const inspectedAt = required(payload.inspectedAt, "Inspection date");
    const summary = required(payload.summary, "Quality inspection summary");
    const defects = clean(payload.defects);
    await db.batch([
      db.prepare("INSERT INTO quality_inspections (case_id,supervisor_email,inspected_at,summary,defects,status,submitted_at) VALUES (?,?,?,?,?,'submitted',?) ON CONFLICT(case_id) DO UPDATE SET supervisor_email=excluded.supervisor_email,inspected_at=excluded.inspected_at,summary=excluded.summary,defects=excluded.defects,status='submitted',admin_note='',owner_note='',submitted_at=excluded.submitted_at,reviewed_at='',completed_at='' ").bind(caseId, actorEmail, inspectedAt, summary, defects, now),
      db.prepare("UPDATE workflow_cases SET stage='quality_inspection',updated_at=? WHERE id=?").bind(now, caseId),
    ]);
    await event(db, caseId, "Site Supervisor", actorEmail, action, "Quality inspection submitted to Admin", `${fileIds.length} completion photo(s) attached.`);
  } else if (action === "review_quality_inspection") {
    allow(role, "admin"); requireStage(stage, ["quality_inspection"]);
    const decision = clean(payload.decision);
    if (!["approved", "changes_requested"].includes(decision)) throw new Error("Choose approve or request rectification.");
    const note = clean(payload.note);
    if (decision === "changes_requested" && !note) throw new Error("Explain the rectification required.");
    const nextStage = decision === "approved" ? "completion_ready" : "active_project";
    await db.batch([
      db.prepare("UPDATE quality_inspections SET status=?,admin_note=?,reviewed_at=? WHERE case_id=?").bind(decision, note, now, caseId),
      db.prepare("UPDATE workflow_cases SET stage=?,updated_at=? WHERE id=?").bind(nextStage, now, caseId),
    ]);
    await event(db, caseId, "Admin", actorEmail, action, decision === "approved" ? "Quality inspection approved for Owner completion" : "Rectification requested after quality inspection", note);
  } else if (action === "complete_project") {
    allow(role, "owner"); requireStage(stage, ["completion_ready"]);
    const note = clean(payload.note);
    await db.batch([
      db.prepare("UPDATE quality_inspections SET status='completed',owner_note=?,completed_at=? WHERE case_id=?").bind(note, now, caseId),
      db.prepare("UPDATE workflow_cases SET stage='complete',updated_at=? WHERE id=?").bind(now, caseId),
      db.prepare("UPDATE projects SET stage='Complete',progress=100,updated_at=? WHERE code=?").bind(now, item.projectCode),
    ]);
    await event(db, caseId, "Owner", actorEmail, action, "Owner marked the project complete", note, "customer");
  } else if (action === "admin_approve_update") {
    allow(role, "admin");
    const updateId = number(payload.updateId);
    const update = await db.prepare("SELECT status FROM project_updates WHERE id=? AND case_id=?").bind(updateId, caseId).first<{ status?: string }>();
    if (update?.status !== "pending_admin") throw new Error("This update is not waiting for Admin approval.");
    await db.prepare("UPDATE project_updates SET status='pending_owner',admin_note=?,admin_reviewed_at=? WHERE id=?").bind(clean(payload.note), now, updateId).run();
    await event(db, caseId, "Admin", actorEmail, action, "Admin approved the customer update", "Owner approval is still required.");
  } else if (action === "owner_approve_update") {
    allow(role, "owner");
    const updateId = number(payload.updateId);
    const update = await db.prepare("SELECT status FROM project_updates WHERE id=? AND case_id=?").bind(updateId, caseId).first<{ status?: string }>();
    if (update?.status !== "pending_owner") throw new Error("Admin approval is required before Owner approval.");
    await db.batch([
      db.prepare("UPDATE project_updates SET status='published',owner_note=?,owner_reviewed_at=?,published_at=? WHERE id=?").bind(clean(payload.note), now, now, updateId),
      db.prepare("UPDATE workflow_files SET visibility='published',published_at=? WHERE case_id=? AND update_id=?").bind(now, caseId, updateId),
    ]);
    await event(db, caseId, "Owner", actorEmail, action, "Owner approved and published the customer update", "The approved text and photos are now visible to the customer.", "customer");
  } else if (action === "reject_update") {
    if (!['admin', 'owner'].includes(role)) throw new Error("Management access is required.");
    const updateId = number(payload.updateId);
    const note = required(payload.note, "Return note");
    await db.prepare("UPDATE project_updates SET status='changes_requested',admin_note=?,owner_note=?,admin_reviewed_at=?,owner_reviewed_at=? WHERE id=? AND case_id=?")
      .bind(role === "admin" ? note : "", role === "owner" ? note : "", role === "admin" ? now : "", role === "owner" ? now : "", updateId, caseId).run();
    await event(db, caseId, role === "owner" ? "Owner" : "Admin", actorEmail, action, "Customer update returned to Site Supervisor", note);
  } else {
    throw new Error("Unknown workflow action.");
  }
}

export async function createPublicWorkflowRequest(payload: Record<string, unknown>) {
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
  const created = await db.prepare("INSERT INTO workflow_cases (request_code,customer_name,customer_email,customer_phone,service,suburb,description,timeframe,budget,stage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'request_submitted',?,?)")
    .bind(code, bounded(payload.name, "Full name", 120), email, phone, service, bounded(payload.location, "Project location", 240), description, clean(payload.timeframe).slice(0, 120), clean(payload.budget).slice(0, 120), now, now).run();
  const caseId = Number(created.meta.last_row_id);
  await db.batch([
    db.prepare("INSERT INTO request_consents (case_id,terms_version,accepted_at) VALUES (?,?,?)").bind(caseId, "VIC-2026-08-17", now),
    db.prepare("INSERT INTO customer_contact_index (case_id,kind,contact_hash,created_at) VALUES (?,'email',?,?)").bind(caseId, await customerContactHash("email", email), now),
    db.prepare("INSERT INTO customer_contact_index (case_id,kind,contact_hash,created_at) VALUES (?,'phone',?,?)").bind(caseId, await customerContactHash("phone", phone), now),
  ]);
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
  if (!["request_submitted", "admin_review", "customer_contacted"].includes(String(item.stage))) {
    throw new Error("Customer documents can no longer be added to this request.");
  }
  if (Number(item.fileCount) >= 5) throw new Error("This request already has the maximum of five customer files.");
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
  const created = await db.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,visibility,uploaded_at) VALUES (?,'customer_request',?,?,?,?,?,'internal',?)")
    .bind(caseId, objectKey, file.name, file.type, file.size, customerEmail, new Date().toISOString()).run();
  await event(db, caseId, "Customer", customerEmail, "customer_file_uploaded", "Customer supplied an intake document", file.name);
  return Number(created.meta.last_row_id);
}

export async function getPublicWorkflow(code: string) {
  await ensureWorkflowDatabase();
  await removeLegacyWorkflowDemo();
  const db = await database();
  const item = await db.prepare("SELECT wc.id,wc.request_code AS requestCode,wc.project_code AS projectCode,wc.service,wc.suburb,wc.stage,wc.site_visit_at AS siteVisitAt,wc.updated_at AS updatedAt,COALESCE((SELECT p.progress FROM projects p WHERE p.code=wc.project_code LIMIT 1),0) AS progress FROM workflow_cases wc WHERE UPPER(wc.request_code)=? LIMIT 1")
    .bind(code.toUpperCase()).first<Raw>();
  if (!item) return null;
  const caseId = Number(item.id);
  const result = await db.batch([
    db.prepare("SELECT id,amount_cents AS amountCents,scope,terms,status,sent_at AS sentAt,customer_decided_at AS customerDecidedAt FROM workflow_estimates WHERE case_id=? AND status IN ('sent','customer_accepted','customer_declined') LIMIT 1").bind(caseId),
    db.prepare("SELECT id,work_date AS workDate,customer_update AS customerUpdate,published_at AS publishedAt FROM project_updates WHERE case_id=? AND status='published' ORDER BY published_at DESC").bind(caseId),
    db.prepare("SELECT id,update_id AS updateId,file_name AS fileName,mime_type AS mimeType,published_at AS publishedAt FROM workflow_files WHERE case_id=? AND visibility='published' ORDER BY published_at DESC").bind(caseId),
    db.prepare("SELECT title,detail,created_at AS createdAt FROM workflow_events WHERE case_id=? AND audience='customer' ORDER BY created_at DESC").bind(caseId),
  ]);
  const files = (result[2].results as Raw[]).map((file): Raw & { url: string } => ({ ...file, url: `/api/workflow/files?id=${file.id}` }));
  return {
    ...item,
    estimate: result[0].results[0] ?? null,
    updates: (result[1].results as Raw[]).map((update) => ({ ...update, files: files.filter((file) => Number(file.updateId) === Number(update.id)) })),
    activity: result[3].results,
  };
}

export async function customerEstimateDecision(code: string, decision: "accept" | "decline") {
  await ensureWorkflowDatabase();
  const db = await database();
  const item = await db.prepare("SELECT id,stage,customer_email AS customerEmail FROM workflow_cases WHERE UPPER(request_code)=? LIMIT 1").bind(code.toUpperCase()).first<Raw>();
  if (!item) throw new Error("Project was not found.");
  requireStage(item.stage, ["estimate_sent"]);
  const caseId = Number(item.id);
  const now = new Date().toISOString();
  const accepted = decision === "accept";
  await db.batch([
    db.prepare("UPDATE workflow_estimates SET status=?,customer_decided_at=? WHERE case_id=? AND status='sent'").bind(accepted ? "customer_accepted" : "customer_declined", now, caseId),
    db.prepare("UPDATE workflow_cases SET stage=?,updated_at=? WHERE id=?").bind(accepted ? "customer_approved" : "estimate_declined", now, caseId),
  ]);
  await event(db, caseId, "Customer", String(item.customerEmail), "customer_estimate_decision", accepted ? "Customer accepted the estimate" : "Customer declined the estimate", "", "customer");
}

export async function addWorkflowFile(caseId: number, category: string, objectKey: string, file: File, uploadedBy: string) {
  await ensureWorkflowDatabase();
  const db = await database();
  const created = await db.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,visibility,uploaded_at) VALUES (?,?,?,?,?,?,?,'internal',?)")
    .bind(caseId, category, objectKey, file.name, file.type, file.size, uploadedBy, new Date().toISOString()).run();
  const label = category === "site_visit" ? "Site visit" : category === "quality" ? "Quality inspection" : "Progress";
  await event(db, caseId, uploadedBy.includes("@") ? "Site Supervisor" : "Team", uploadedBy, "photo_uploaded", `${label} photo uploaded`, file.name);
  return Number(created.meta.last_row_id);
}

export async function getWorkflowFile(id: number, publicOnly: boolean) {
  await ensureWorkflowDatabase();
  const db = await database();
  const where = publicOnly ? "id=? AND visibility='published'" : "id=?";
  return db.prepare(`SELECT object_key AS objectKey,mime_type AS mimeType,file_name AS fileName FROM workflow_files WHERE ${where} LIMIT 1`).bind(id).first<{ objectKey: string; mimeType: string; fileName: string }>();
}
