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

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
    db.prepare(`CREATE TABLE IF NOT EXISTS workflow_events (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL, actor_role TEXT NOT NULL, actor_email TEXT NOT NULL DEFAULT '', event_type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', audience TEXT NOT NULL DEFAULT 'internal', created_at TEXT NOT NULL)`),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_cases_stage_idx ON workflow_cases(stage)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_cases_supervisor_idx ON workflow_cases(assigned_supervisor_email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_events_case_idx ON workflow_events(case_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS workflow_files_case_idx ON workflow_files(case_id, category)"),
    db.prepare("CREATE INDEX IF NOT EXISTS project_updates_case_idx ON project_updates(case_id, created_at)"),
  ]);
}

async function event(db: D1, caseId: number, role: string, email: string, eventType: string, title: string, detail = "", audience = "internal") {
  await db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(caseId, role, email, eventType, title, detail, audience, new Date().toISOString()).run();
}

async function seedWorkflow() {
  const db = await database();
  const existing = await db.prepare("SELECT COUNT(*) AS total FROM workflow_cases").first<{ total?: number }>();
  if (Number(existing?.total ?? 0) > 0) return;
  const now = new Date().toISOString();
  const first = await db.prepare("INSERT INTO workflow_cases (request_code,project_code,customer_name,customer_email,customer_phone,service,suburb,description,timeframe,budget,stage,assigned_supervisor_email,assigned_supervisor_name,site_visit_at,project_folder,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind("REQ-2026-0201", "ATP-2026-00201", "Demo Customer", "customer@example.com", "0400 000 201", "Home Extension", "Glen Waverley", "Ground-floor family room extension and internal reconfiguration.", "Within 1–3 months", "$150,000–$300,000", "site_visit_scheduled", "site.supervisor@alerttradiepro.demo", "Site Supervisor 01", "2026-08-12T09:30:00+10:00", "projects/ATP-2026-00201", now, now).run();
  const firstId = Number(first.meta.last_row_id);
  await event(db, firstId, "Customer", "customer@example.com", "request_submitted", "Customer submitted a project request", "Home Extension · Glen Waverley");
  await event(db, firstId, "Admin", "admin@alerttradiepro.demo", "project_folder_created", "Admin approved intake and created the project folder", "ATP-2026-00201");
  await event(db, firstId, "Admin", "admin@alerttradiepro.demo", "site_visit_assigned", "Site visit assigned to Site Supervisor 01", "12 August 2026 · 9:30 am");

  const second = await db.prepare("INSERT INTO workflow_cases (request_code,project_code,customer_name,customer_email,customer_phone,service,suburb,description,timeframe,budget,stage,assigned_supervisor_email,assigned_supervisor_name,site_visit_at,project_folder,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind("REQ-2026-0198", "ATP-2026-00198", "Demo Customer 198", "customer198@example.com", "0400 000 198", "Home Renovation", "Rowville", "Ground-floor renovation and service upgrades.", "Within 3–6 months", "$75,000–$150,000", "active_project", "site.supervisor@alerttradiepro.demo", "Site Supervisor 01", "2026-07-28T10:00:00+10:00", "projects/ATP-2026-00198", now, now).run();
  const secondId = Number(second.meta.last_row_id);
  await db.prepare("INSERT INTO workflow_estimates (case_id,amount_cents,scope,terms,status,created_by,created_at,sent_at,customer_decided_at,confirmed_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(secondId, 12850000, "Ground-floor renovation, plumbing and electrical upgrades, finishes and project management.", "Subject to final selections and contract.", "customer_accepted", "admin@alerttradiepro.demo", now, now, now, now).run();
  await db.prepare("INSERT INTO project_updates (case_id,work_date,supervisor_email,internal_update,customer_update,status,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(secondId, "2026-08-10", "site.supervisor@alerttradiepro.demo", "Framing dimensions checked. Plumbing set-out ready. No safety issues recorded.", "Framing checks are complete and the area is ready for the plumbing rough-in.", "pending_admin", now).run();
  await event(db, secondId, "Admin", "admin@alerttradiepro.demo", "project_activated", "Customer-approved estimate converted to an active project", "ATP-2026-00198");
  await event(db, secondId, "Site Supervisor", "site.supervisor@alerttradiepro.demo", "progress_update_submitted", "A progress update is waiting for Admin", "Customer copy remains hidden until Admin and Owner approve it.");
}

type Raw = Record<string, unknown>;

export async function getWorkflowSnapshot(role: WorkflowRole, actorEmail: string): Promise<WorkflowSnapshot> {
  await ensureWorkflowDatabase();
  await seedWorkflow();
  const db = await database();
  const statements = [
    role === "supervisor"
      ? db.prepare("SELECT id,request_code AS requestCode,project_code AS projectCode,customer_name AS customerName,customer_email AS customerEmail,customer_phone AS customerPhone,service,suburb,description,timeframe,budget,stage,assigned_supervisor_email AS assignedSupervisorEmail,assigned_supervisor_name AS assignedSupervisorName,site_visit_at AS siteVisitAt,project_folder AS projectFolder,created_at AS createdAt,updated_at AS updatedAt FROM workflow_cases WHERE assigned_supervisor_email=? ORDER BY updated_at DESC").bind(actorEmail.toLowerCase())
      : db.prepare("SELECT id,request_code AS requestCode,project_code AS projectCode,customer_name AS customerName,customer_email AS customerEmail,customer_phone AS customerPhone,service,suburb,description,timeframe,budget,stage,assigned_supervisor_email AS assignedSupervisorEmail,assigned_supervisor_name AS assignedSupervisorName,site_visit_at AS siteVisitAt,project_folder AS projectFolder,created_at AS createdAt,updated_at AS updatedAt FROM workflow_cases ORDER BY updated_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,supervisor_email AS supervisorEmail,visit_date AS visitDate,summary,findings,recommendations,internal_notes AS internalNotes,status,admin_note AS adminNote,submitted_at AS submittedAt,reviewed_at AS reviewedAt FROM site_visit_reports ORDER BY submitted_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,update_id AS updateId,category,file_name AS fileName,mime_type AS mimeType,size_bytes AS sizeBytes,uploaded_by AS uploadedBy,visibility,uploaded_at AS uploadedAt,published_at AS publishedAt FROM workflow_files ORDER BY uploaded_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,amount_cents AS amountCents,scope,terms,status,created_by AS createdBy,created_at AS createdAt,sent_at AS sentAt,customer_decided_at AS customerDecidedAt,confirmed_at AS confirmedAt FROM workflow_estimates"),
    db.prepare("SELECT id,case_id AS caseId,work_date AS workDate,supervisor_email AS supervisorEmail,internal_update AS internalUpdate,customer_update AS customerUpdate,status,admin_note AS adminNote,owner_note AS ownerNote,created_at AS createdAt,admin_reviewed_at AS adminReviewedAt,owner_reviewed_at AS ownerReviewedAt,published_at AS publishedAt FROM project_updates ORDER BY created_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,actor_role AS actorRole,actor_email AS actorEmail,event_type AS eventType,title,detail,audience,created_at AS createdAt FROM workflow_events ORDER BY created_at DESC,id DESC LIMIT 250"),
    db.prepare("SELECT email,COALESCE(NULLIF(trade_title,''),role) AS name FROM staff_access_requests WHERE status='Approved' AND role='Site Supervisor' ORDER BY email"),
  ];
  const result = await db.batch(statements);
  const cases = result[0].results as Raw[];
  const reports = result[1].results as Raw[];
  const files = (result[2].results as Raw[]).map((file) => ({ ...file, url: `/api/workflow/files?id=${file.id}` }));
  const estimates = result[3].results as Raw[];
  const updates = result[4].results as Raw[];
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
      estimate: role === "supervisor" ? null : estimates.find((estimate) => Number(estimate.caseId) === caseId) ?? null,
      files: caseFiles,
      updates: updates.filter((update) => Number(update.caseId) === caseId).map((update) => ({ ...update, files: caseFiles.filter((file) => Number(file.updateId) === Number(update.id)) })),
    };
  });
  const supervisors = (result[6].results as Raw[]).map((row) => ({ email: String(row.email), name: String(row.name) }));
  if (!supervisors.length) supervisors.push({ email: "site.supervisor@alerttradiepro.demo", name: "Site Supervisor 01" });
  return {
    cases: shaped as WorkflowSnapshot["cases"],
    events: (result[5].results as WorkflowSnapshot["events"]).filter((item) => allowedIds.has(Number(item.caseId))),
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
  const code = `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const created = await db.prepare("INSERT INTO workflow_cases (request_code,customer_name,customer_email,customer_phone,service,suburb,description,timeframe,budget,stage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'request_submitted',?,?)")
    .bind(code, required(payload.name, "Full name"), required(payload.email, "Email"), required(payload.phone, "Phone"), required(payload.service, "Service"), required(payload.location, "Project location"), required(payload.details, "Project details"), clean(payload.timeframe), clean(payload.budget), now, now).run();
  const caseId = Number(created.meta.last_row_id);
  await event(db, caseId, "Customer", clean(payload.email), "request_submitted", "Customer submitted a new project request", `${clean(payload.service)} · ${clean(payload.location)}`);
  return { caseId, code };
}

export async function getPublicWorkflow(code: string) {
  await ensureWorkflowDatabase();
  await seedWorkflow();
  const db = await database();
  const item = await db.prepare("SELECT id,request_code AS requestCode,project_code AS projectCode,service,suburb,stage,site_visit_at AS siteVisitAt,updated_at AS updatedAt FROM workflow_cases WHERE UPPER(request_code)=? OR UPPER(project_code)=? LIMIT 1")
    .bind(code.toUpperCase(), code.toUpperCase()).first<Raw>();
  if (!item) return null;
  const caseId = Number(item.id);
  const result = await db.batch([
    db.prepare("SELECT id,amount_cents AS amountCents,scope,terms,status,sent_at AS sentAt,customer_decided_at AS customerDecidedAt FROM workflow_estimates WHERE case_id=? AND status IN ('sent','customer_accepted','customer_declined') LIMIT 1").bind(caseId),
    db.prepare("SELECT id,work_date AS workDate,customer_update AS customerUpdate,published_at AS publishedAt FROM project_updates WHERE case_id=? AND status='published' ORDER BY published_at DESC").bind(caseId),
    db.prepare("SELECT id,update_id AS updateId,file_name AS fileName,mime_type AS mimeType,published_at AS publishedAt FROM workflow_files WHERE case_id=? AND visibility='published' ORDER BY published_at DESC").bind(caseId),
    db.prepare("SELECT title,detail,created_at AS createdAt FROM workflow_events WHERE case_id=? AND audience='customer' ORDER BY created_at DESC").bind(caseId),
  ]);
  const files = (result[2].results as Raw[]).map((file) => ({ ...file, url: `/api/workflow/files?id=${file.id}` }));
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
  const item = await db.prepare("SELECT id,stage,customer_email AS customerEmail FROM workflow_cases WHERE UPPER(request_code)=? OR UPPER(project_code)=? LIMIT 1").bind(code.toUpperCase(), code.toUpperCase()).first<Raw>();
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
  await event(db, caseId, uploadedBy.includes("@") ? "Site Supervisor" : "Team", uploadedBy, "photo_uploaded", `${category === "site_visit" ? "Site visit" : "Progress"} photo uploaded`, file.name);
  return Number(created.meta.last_row_id);
}

export async function getWorkflowFile(id: number, publicOnly: boolean) {
  await ensureWorkflowDatabase();
  const db = await database();
  const where = publicOnly ? "id=? AND visibility='published'" : "id=?";
  return db.prepare(`SELECT object_key AS objectKey,mime_type AS mimeType,file_name AS fileName FROM workflow_files WHERE ${where} LIMIT 1`).bind(id).first<{ objectKey: string; mimeType: string; fileName: string }>();
}
