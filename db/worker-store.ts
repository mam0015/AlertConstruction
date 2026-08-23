import { ensureWorkflowDatabase } from "./workflow-store";
import type { WorkerManagementSnapshot, WorkerSnapshot } from "../app/workers/types";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;
type Raw = Record<string, unknown>;

async function database(): Promise<D1> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("The Worker database is unavailable.");
  return env.DB;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function required(value: unknown, label: string) {
  const result = clean(value);
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function numeric(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("Choose a valid project record.");
  return parsed;
}

export function melbourneDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export async function ensureWorkerDatabase() {
  await ensureWorkflowDatabase();
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS worker_project_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT,case_id INTEGER NOT NULL,worker_email TEXT NOT NULL,trade_title TEXT NOT NULL DEFAULT 'Worker',status TEXT NOT NULL DEFAULT 'active',assigned_by TEXT NOT NULL,assigned_at TEXT NOT NULL,removed_at TEXT NOT NULL DEFAULT '',UNIQUE(case_id,worker_email))"),
    db.prepare("CREATE TABLE IF NOT EXISTS worker_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT,case_id INTEGER NOT NULL,worker_email TEXT NOT NULL,title TEXT NOT NULL,instructions TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'assigned',created_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE TABLE IF NOT EXISTS worker_file_access (id INTEGER PRIMARY KEY AUTOINCREMENT,file_id INTEGER NOT NULL,case_id INTEGER NOT NULL,worker_email TEXT NOT NULL,granted_by TEXT NOT NULL,granted_at TEXT NOT NULL,UNIQUE(file_id,worker_email))"),
    db.prepare("CREATE TABLE IF NOT EXISTS worker_attendance (id INTEGER PRIMARY KEY AUTOINCREMENT,worker_email TEXT NOT NULL,work_date TEXT NOT NULL,first_seen_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,UNIQUE(worker_email,work_date))"),
    db.prepare("CREATE TABLE IF NOT EXISTS worker_reports (id INTEGER PRIMARY KEY AUTOINCREMENT,case_id INTEGER NOT NULL,worker_email TEXT NOT NULL,work_date TEXT NOT NULL,completed_work TEXT NOT NULL,next_step TEXT NOT NULL,issues_delays TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'submitted',submitted_at TEXT NOT NULL,reviewed_by TEXT NOT NULL DEFAULT '',reviewed_at TEXT NOT NULL DEFAULT '',review_note TEXT NOT NULL DEFAULT '',UNIQUE(case_id,worker_email,work_date))"),
    db.prepare("CREATE INDEX IF NOT EXISTS worker_assignments_email_idx ON worker_project_assignments(worker_email,status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS worker_tasks_email_idx ON worker_tasks(worker_email,case_id,status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS worker_file_access_email_idx ON worker_file_access(worker_email,case_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS worker_reports_email_idx ON worker_reports(worker_email,work_date)"),
  ]);
}

async function workflowEvent(db: D1, caseId: number, actorRole: string, actorEmail: string, eventType: string, title: string, detail = "") {
  await db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,'internal',?)")
    .bind(caseId, actorRole, actorEmail, eventType, title, detail, new Date().toISOString()).run();
}

async function activeProject(db: D1, caseId: number) {
  const project = await db.prepare("SELECT id,project_code AS projectCode,suburb,service,project_folder AS projectFolder,stage FROM workflow_cases WHERE id=? LIMIT 1").bind(caseId).first<Raw>();
  if (!project) throw new Error("Project was not found.");
  if (project.stage !== "active_project") throw new Error("Workers can only be assigned after the customer-approved project becomes active.");
  return project;
}

async function approvedWorker(db: D1, emailInput: unknown) {
  const email = required(emailInput, "Worker").toLowerCase();
  const worker = await db.prepare("SELECT email,role,COALESCE(NULLIF(trade_title,''),role) AS tradeTitle FROM staff_access_requests WHERE LOWER(email)=? AND status='Approved' AND role IN ('Worker','Electrician','Plumber','Cleaner','Carpenter','Plasterer','Tiler') LIMIT 1").bind(email).first<Raw>();
  if (!worker) throw new Error("Choose an approved Worker account.");
  return { email, role: String(worker.role), tradeTitle: String(worker.tradeTitle || worker.role || "Worker") };
}

export async function markWorkerSignIn(workerEmail: string) {
  await ensureWorkerDatabase();
  const db = await database();
  const normalizedEmail = workerEmail.toLowerCase();
  const assigned = await db.prepare("SELECT assignment.id FROM worker_project_assignments assignment JOIN workflow_cases workflow ON workflow.id=assignment.case_id WHERE assignment.worker_email=? AND assignment.status='active' AND workflow.stage='active_project' LIMIT 1")
    .bind(normalizedEmail).first();
  if (!assigned) return;
  const now = new Date().toISOString();
  const today = melbourneDate();
  await db.prepare("INSERT INTO worker_attendance (worker_email,work_date,first_seen_at,last_seen_at) VALUES (?,?,?,?) ON CONFLICT(worker_email,work_date) DO UPDATE SET last_seen_at=excluded.last_seen_at")
    .bind(normalizedEmail, today, now, now).run();
}

export async function seedWorkerDevelopmentPreview() {
  if (process.env.NODE_ENV !== "development") return;
  await ensureWorkerDatabase();
  const db = await database();
  const now = new Date().toISOString();
  await db.prepare("INSERT OR IGNORE INTO staff_access_requests (email,password_hash,status,role,trade_title,requested_at,reviewed_at,last_seen_at) VALUES ('electrician@alerttradiepro.demo','preview-not-a-real-secret','Approved','Worker','Electrician',?,?,?)").bind(now, now, now).run();
  let project = await db.prepare("SELECT id FROM workflow_cases WHERE request_code='REQ-WORKER-PREVIEW' LIMIT 1").first<{ id?: number }>();
  if (!project?.id) {
    const created = await db.prepare("INSERT INTO workflow_cases (request_code,project_code,customer_name,customer_email,customer_phone,service,suburb,description,timeframe,budget,stage,project_folder,created_at,updated_at) VALUES ('REQ-WORKER-PREVIEW','ATP-2026-00198','Private customer','','','Home Renovation','Rowville','Private management scope','','','active_project','projects/ATP-2026-00198',?,?)").bind(now, now).run();
    project = { id: Number(created.meta.last_row_id) };
  }
  const caseId = Number(project.id);
  await db.prepare("INSERT INTO worker_project_assignments (case_id,worker_email,trade_title,status,assigned_by,assigned_at,removed_at) VALUES (?,'electrician@alerttradiepro.demo','Electrician','active','owner@alerttradiepro.demo',?,'') ON CONFLICT(case_id,worker_email) DO UPDATE SET status='active',trade_title='Electrician',removed_at='' ").bind(caseId, now).run();
  const taskCount = await db.prepare("SELECT COUNT(*) AS total FROM worker_tasks WHERE case_id=? AND worker_email='electrician@alerttradiepro.demo'").bind(caseId).first<{ total?: number }>();
  if (!Number(taskCount?.total ?? 0)) {
    await db.batch([
      db.prepare("INSERT INTO worker_tasks (case_id,worker_email,title,instructions,status,created_by,created_at,updated_at,completed_at) VALUES (?,'electrician@alerttradiepro.demo','Complete bedroom rough-in','Install the approved cabling shown on the shared electrical plan. Confirm switch and outlet positions with the Site Supervisor before closing the wall.','in_progress','owner@alerttradiepro.demo',?,?,'')").bind(caseId, now, now),
      db.prepare("INSERT INTO worker_tasks (case_id,worker_email,title,instructions,status,created_by,created_at,updated_at,completed_at) VALUES (?,'electrician@alerttradiepro.demo','Photograph completed cabling','Take clear evidence photos for the Site Supervisor before leaving the work area.','assigned','admin@alerttradiepro.demo',?,?,'')").bind(caseId, now, now),
    ]);
  }
}

async function missingDates(db: D1, workerEmail: string, today: string) {
  const result = await db.prepare("SELECT attendance.work_date AS workDate FROM worker_attendance attendance WHERE attendance.worker_email=? AND attendance.work_date<? AND EXISTS (SELECT 1 FROM worker_project_assignments assignment JOIN workflow_cases workflow ON workflow.id=assignment.case_id WHERE assignment.worker_email=attendance.worker_email AND assignment.status='active' AND workflow.stage='active_project') AND NOT EXISTS (SELECT 1 FROM worker_reports report WHERE report.worker_email=attendance.worker_email AND report.work_date=attendance.work_date) ORDER BY attendance.work_date ASC LIMIT 14")
    .bind(workerEmail, today).all<{ workDate: string }>();
  return result.results.map((row) => row.workDate);
}

function workerFileRows(files: Raw[], access: Raw[]) {
  return files.map((file) => ({
    ...file,
    sharedWith: access.filter((item) => Number(item.fileId) === Number(file.id)).map((item) => String(item.workerEmail)),
    url: `/api/worker/files?id=${file.id}`,
  }));
}

export async function getWorkerSnapshot(workerEmailInput: string, role: string): Promise<WorkerSnapshot> {
  await ensureWorkerDatabase();
  const db = await database();
  const workerEmail = workerEmailInput.toLowerCase();
  await markWorkerSignIn(workerEmail);
  const today = melbourneDate();
  const results = await db.batch([
    db.prepare("SELECT assignment.case_id AS caseId,workflow.project_code AS projectCode,workflow.suburb AS siteLabel,assignment.trade_title AS tradeTitle,assignment.assigned_at AS assignedAt FROM worker_project_assignments assignment JOIN workflow_cases workflow ON workflow.id=assignment.case_id WHERE assignment.worker_email=? AND assignment.status='active' AND workflow.stage='active_project' ORDER BY assignment.assigned_at DESC").bind(workerEmail),
    db.prepare("SELECT task.id,task.case_id AS caseId,workflow.project_code AS projectCode,task.worker_email AS workerEmail,task.title,task.instructions,task.status,task.created_at AS createdAt,task.updated_at AS updatedAt,task.completed_at AS completedAt FROM worker_tasks task JOIN workflow_cases workflow ON workflow.id=task.case_id JOIN worker_project_assignments assignment ON assignment.case_id=task.case_id AND assignment.worker_email=task.worker_email AND assignment.status='active' WHERE task.worker_email=? ORDER BY CASE task.status WHEN 'assigned' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,task.updated_at DESC").bind(workerEmail),
    db.prepare("SELECT file.id,file.case_id AS caseId,workflow.project_code AS projectCode,file.file_name AS fileName,file.mime_type AS mimeType,file.size_bytes AS sizeBytes,file.uploaded_at AS uploadedAt FROM worker_file_access access JOIN workflow_files file ON file.id=access.file_id JOIN workflow_cases workflow ON workflow.id=file.case_id JOIN worker_project_assignments assignment ON assignment.case_id=access.case_id AND assignment.worker_email=access.worker_email AND assignment.status='active' WHERE access.worker_email=? AND file.category='worker_document' ORDER BY file.uploaded_at DESC").bind(workerEmail),
    db.prepare("SELECT report.id,report.case_id AS caseId,workflow.project_code AS projectCode,report.worker_email AS workerEmail,report.work_date AS workDate,report.completed_work AS completedWork,report.next_step AS nextStep,report.issues_delays AS issuesDelays,report.status,report.submitted_at AS submittedAt,report.reviewed_by AS reviewedBy,report.reviewed_at AS reviewedAt,report.review_note AS reviewNote FROM worker_reports report JOIN workflow_cases workflow ON workflow.id=report.case_id WHERE report.worker_email=? ORDER BY report.work_date DESC,report.submitted_at DESC LIMIT 60").bind(workerEmail),
    db.prepare("SELECT email,role,COALESCE(NULLIF(trade_title,''),role) AS tradeTitle FROM staff_access_requests WHERE LOWER(email)=? LIMIT 1").bind(workerEmail),
  ]);
  const projectIds = new Set((results[0].results as Raw[]).map((item) => Number(item.caseId)));
  const files = (results[2].results as Raw[]).filter((file) => projectIds.has(Number(file.caseId))).map((file) => ({ ...file, sharedWith: [workerEmail], url: `/api/worker/files?id=${file.id}` }));
  const profile = results[4].results[0] as Raw | undefined;
  return {
    identity: { email: workerEmail, role, tradeTitle: String(profile?.tradeTitle || role) },
    projects: results[0].results as WorkerSnapshot["projects"],
    tasks: (results[1].results as WorkerSnapshot["tasks"]).filter((task) => projectIds.has(Number(task.caseId))),
    files: files as WorkerSnapshot["files"],
    reports: results[3].results as WorkerSnapshot["reports"],
    missingReportDates: await missingDates(db, workerEmail, today),
    today,
  };
}

export async function submitWorkerReport(workerEmailInput: string, role: string, payload: Record<string, unknown>) {
  await ensureWorkerDatabase();
  const db = await database();
  const workerEmail = workerEmailInput.toLowerCase();
  const caseId = numeric(payload.caseId);
  const workDate = required(payload.workDate, "Work date");
  const today = melbourneDate();
  const missed = await missingDates(db, workerEmail, today);
  if (missed.length && workDate !== missed[0]) throw new Error(`Complete the missing report for ${missed[0]} before submitting another report.`);
  if (!missed.length && workDate !== today) throw new Error("The current report must be submitted for today.");
  const attendance = await db.prepare("SELECT id FROM worker_attendance WHERE worker_email=? AND work_date=? LIMIT 1").bind(workerEmail, workDate).first();
  if (!attendance) throw new Error("A report can only be submitted for a recorded Worker sign-in day.");
  const assignment = await db.prepare("SELECT trade_title AS tradeTitle FROM worker_project_assignments WHERE case_id=? AND worker_email=? AND status='active' LIMIT 1").bind(caseId, workerEmail).first<Raw>();
  if (!assignment) throw new Error("This project is not assigned to your account.");
  const completedWork = required(payload.completedWork, "Work completed");
  const nextStep = required(payload.nextStep, "Next step");
  const issuesDelays = clean(payload.issuesDelays);
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO worker_reports (case_id,worker_email,work_date,completed_work,next_step,issues_delays,status,submitted_at) VALUES (?,?,?,?,?,?,'submitted',?) ON CONFLICT(case_id,worker_email,work_date) DO UPDATE SET completed_work=excluded.completed_work,next_step=excluded.next_step,issues_delays=excluded.issues_delays,status='submitted',submitted_at=excluded.submitted_at,reviewed_by='',reviewed_at='',review_note='' ")
    .bind(caseId, workerEmail, workDate, completedWork, nextStep, issuesDelays, now).run();
  await workflowEvent(db, caseId, String(assignment.tradeTitle || role), workerEmail, "worker_eod_submitted", `End-of-day report submitted for ${workDate}`, `Completed: ${completedWork}\nNext step: ${nextStep}${issuesDelays ? `\nIssues: ${issuesDelays}` : ""}`);
}

export async function getWorkerManagementSnapshot(): Promise<WorkerManagementSnapshot> {
  await ensureWorkerDatabase();
  const db = await database();
  const results = await db.batch([
    db.prepare("SELECT id AS caseId,project_code AS projectCode,suburb AS siteLabel,service FROM workflow_cases WHERE stage='active_project' ORDER BY updated_at DESC"),
    db.prepare("SELECT email,role,COALESCE(NULLIF(trade_title,''),role) AS tradeTitle FROM staff_access_requests WHERE status='Approved' AND role IN ('Worker','Electrician','Plumber','Cleaner','Carpenter','Plasterer','Tiler') ORDER BY email"),
    db.prepare("SELECT assignment.id,assignment.case_id AS caseId,workflow.project_code AS projectCode,assignment.worker_email AS workerEmail,assignment.trade_title AS tradeTitle,assignment.status,assignment.assigned_at AS assignedAt FROM worker_project_assignments assignment JOIN workflow_cases workflow ON workflow.id=assignment.case_id ORDER BY assignment.assigned_at DESC"),
    db.prepare("SELECT task.id,task.case_id AS caseId,workflow.project_code AS projectCode,task.worker_email AS workerEmail,task.title,task.instructions,task.status,task.created_at AS createdAt,task.updated_at AS updatedAt,task.completed_at AS completedAt FROM worker_tasks task JOIN workflow_cases workflow ON workflow.id=task.case_id ORDER BY task.updated_at DESC"),
    db.prepare("SELECT id,case_id AS caseId,file_name AS fileName,mime_type AS mimeType,size_bytes AS sizeBytes,uploaded_at AS uploadedAt FROM workflow_files WHERE category='worker_document' ORDER BY uploaded_at DESC"),
    db.prepare("SELECT file_id AS fileId,worker_email AS workerEmail FROM worker_file_access ORDER BY granted_at"),
    db.prepare("SELECT report.id,report.case_id AS caseId,workflow.project_code AS projectCode,report.worker_email AS workerEmail,report.work_date AS workDate,report.completed_work AS completedWork,report.next_step AS nextStep,report.issues_delays AS issuesDelays,report.status,report.submitted_at AS submittedAt,report.reviewed_by AS reviewedBy,report.reviewed_at AS reviewedAt,report.review_note AS reviewNote FROM worker_reports report JOIN workflow_cases workflow ON workflow.id=report.case_id ORDER BY report.work_date DESC,report.submitted_at DESC LIMIT 200"),
  ]);
  return {
    projects: results[0].results as WorkerManagementSnapshot["projects"],
    workers: results[1].results as WorkerManagementSnapshot["workers"],
    assignments: results[2].results as WorkerManagementSnapshot["assignments"],
    tasks: results[3].results as WorkerManagementSnapshot["tasks"],
    files: workerFileRows(results[4].results as Raw[], results[5].results as Raw[]) as WorkerManagementSnapshot["files"],
    reports: results[6].results as WorkerManagementSnapshot["reports"],
  };
}

export async function performWorkerManagementAction(actorRole: "Owner" | "Admin", actorEmail: string, action: string, payload: Record<string, unknown>) {
  await ensureWorkerDatabase();
  const db = await database();
  const now = new Date().toISOString();
  if (action === "assign_worker") {
    const caseId = numeric(payload.caseId);
    const project = await activeProject(db, caseId);
    const worker = await approvedWorker(db, payload.workerEmail);
    const tradeTitle = clean(payload.tradeTitle) || worker.tradeTitle;
    await db.prepare("INSERT INTO worker_project_assignments (case_id,worker_email,trade_title,status,assigned_by,assigned_at,removed_at) VALUES (?,?,?,'active',?,?, '') ON CONFLICT(case_id,worker_email) DO UPDATE SET trade_title=excluded.trade_title,status='active',assigned_by=excluded.assigned_by,assigned_at=excluded.assigned_at,removed_at='' ")
      .bind(caseId, worker.email, tradeTitle, actorEmail, now).run();
    await workflowEvent(db, caseId, actorRole, actorEmail, "worker_assigned", `${tradeTitle} assigned to ${project.projectCode}`, worker.email);
  } else if (action === "unassign_worker") {
    const caseId = numeric(payload.caseId);
    const worker = await approvedWorker(db, payload.workerEmail);
    await db.prepare("UPDATE worker_project_assignments SET status='removed',removed_at=? WHERE case_id=? AND worker_email=?").bind(now, caseId, worker.email).run();
    await workflowEvent(db, caseId, actorRole, actorEmail, "worker_unassigned", "Worker access removed from project", worker.email);
  } else if (action === "create_task") {
    const caseId = numeric(payload.caseId);
    await activeProject(db, caseId);
    const worker = await approvedWorker(db, payload.workerEmail);
    const assigned = await db.prepare("SELECT id FROM worker_project_assignments WHERE case_id=? AND worker_email=? AND status='active' LIMIT 1").bind(caseId, worker.email).first();
    if (!assigned) throw new Error("Assign this Worker to the project before creating a task.");
    const title = required(payload.title, "Task");
    const instructions = required(payload.instructions, "Task instructions");
    await db.prepare("INSERT INTO worker_tasks (case_id,worker_email,title,instructions,status,created_by,created_at,updated_at) VALUES (?,?,?,?,'assigned',?,?,?)")
      .bind(caseId, worker.email, title, instructions, actorEmail, now, now).run();
    await workflowEvent(db, caseId, actorRole, actorEmail, "worker_task_created", `Task assigned to ${worker.email}`, title);
  } else if (action === "set_task_status") {
    const taskId = numeric(payload.taskId);
    const status = clean(payload.status);
    if (!['assigned', 'in_progress', 'completed'].includes(status)) throw new Error("Choose a valid task status.");
    const task = await db.prepare("SELECT case_id AS caseId,title FROM worker_tasks WHERE id=? LIMIT 1").bind(taskId).first<Raw>();
    if (!task) throw new Error("Task was not found.");
    await db.prepare("UPDATE worker_tasks SET status=?,updated_at=?,completed_at=? WHERE id=?").bind(status, now, status === "completed" ? now : "", taskId).run();
    await workflowEvent(db, Number(task.caseId), actorRole, actorEmail, "worker_task_status", `Task marked ${status.replaceAll('_', ' ')}`, String(task.title));
  } else if (action === "delete_task") {
    const taskId = numeric(payload.taskId);
    const task = await db.prepare("SELECT case_id AS caseId,title FROM worker_tasks WHERE id=? LIMIT 1").bind(taskId).first<Raw>();
    if (!task) throw new Error("Task was not found.");
    await db.prepare("DELETE FROM worker_tasks WHERE id=?").bind(taskId).run();
    await workflowEvent(db, Number(task.caseId), actorRole, actorEmail, "worker_task_deleted", "Worker task removed", String(task.title));
  } else if (action === "set_file_access") {
    const fileId = numeric(payload.fileId);
    const worker = await approvedWorker(db, payload.workerEmail);
    const granted = Boolean(payload.granted);
    const file = await db.prepare("SELECT id,case_id AS caseId,file_name AS fileName FROM workflow_files WHERE id=? AND category='worker_document' LIMIT 1").bind(fileId).first<Raw>();
    if (!file) throw new Error("Worker file was not found.");
    const assigned = await db.prepare("SELECT id FROM worker_project_assignments WHERE case_id=? AND worker_email=? AND status='active' LIMIT 1").bind(Number(file.caseId), worker.email).first();
    if (granted && !assigned) throw new Error("Assign this Worker to the project before sharing a file.");
    if (granted) await db.prepare("INSERT INTO worker_file_access (file_id,case_id,worker_email,granted_by,granted_at) VALUES (?,?,?,?,?) ON CONFLICT(file_id,worker_email) DO UPDATE SET granted_by=excluded.granted_by,granted_at=excluded.granted_at")
      .bind(fileId, Number(file.caseId), worker.email, actorEmail, now).run();
    else await db.prepare("DELETE FROM worker_file_access WHERE file_id=? AND worker_email=?").bind(fileId, worker.email).run();
    await workflowEvent(db, Number(file.caseId), actorRole, actorEmail, granted ? "worker_file_shared" : "worker_file_revoked", granted ? `File shared with ${worker.email}` : `File access removed for ${worker.email}`, String(file.fileName));
  } else if (action === "review_report") {
    const reportId = numeric(payload.reportId);
    const note = clean(payload.note);
    const report = await db.prepare("SELECT case_id AS caseId FROM worker_reports WHERE id=? LIMIT 1").bind(reportId).first<Raw>();
    if (!report) throw new Error("Worker report was not found.");
    await db.prepare("UPDATE worker_reports SET status='reviewed',reviewed_by=?,reviewed_at=?,review_note=? WHERE id=?").bind(actorEmail, now, note, reportId).run();
    await workflowEvent(db, Number(report.caseId), actorRole, actorEmail, "worker_report_reviewed", "Worker end-of-day report reviewed", note);
  } else {
    throw new Error("Unknown Worker management action.");
  }
}

export async function addWorkerProjectFile(caseIdInput: number, file: File, workerEmails: string[], actorRole: "Owner" | "Admin", actorEmail: string) {
  await ensureWorkerDatabase();
  const db = await database();
  const caseId = numeric(caseIdInput);
  const project = await activeProject(db, caseId);
  const uniqueWorkers = [...new Set(workerEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  for (const email of uniqueWorkers) {
    await approvedWorker(db, email);
    const assigned = await db.prepare("SELECT id FROM worker_project_assignments WHERE case_id=? AND worker_email=? AND status='active' LIMIT 1").bind(caseId, email).first();
    if (!assigned) throw new Error(`${email} must be assigned to this project before receiving a file.`);
  }
  const { env } = await import("cloudflare:workers");
  if (!env.BUCKET) throw new Error("Private project file storage is not configured.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "project-file";
  const prefix = String(project.projectFolder || `projects/${project.projectCode}`);
  const objectKey = `${prefix}/worker-files/${crypto.randomUUID()}-${safeName}`;
  await env.BUCKET.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { caseId: String(caseId), uploadedBy: actorEmail, originalName: file.name } });
  const now = new Date().toISOString();
  try {
    const created = await db.prepare("INSERT INTO workflow_files (case_id,category,object_key,file_name,mime_type,size_bytes,uploaded_by,visibility,uploaded_at) VALUES (?,'worker_document',?,?,?,?,?,'internal',?)")
      .bind(caseId, objectKey, file.name, file.type || "application/octet-stream", file.size, actorEmail, now).run();
    const fileId = Number(created.meta.last_row_id);
    await db.batch(uniqueWorkers.map((email) => db.prepare("INSERT INTO worker_file_access (file_id,case_id,worker_email,granted_by,granted_at) VALUES (?,?,?,?,?)").bind(fileId, caseId, email, actorEmail, now)));
    await workflowEvent(db, caseId, actorRole, actorEmail, "worker_file_uploaded", `Project file shared with ${uniqueWorkers.length} Worker account(s)`, file.name);
    return fileId;
  } catch (error) {
    await env.BUCKET.delete(objectKey);
    throw error;
  }
}

export async function getWorkerFile(fileId: number, workerEmail?: string, management = false) {
  await ensureWorkerDatabase();
  const db = await database();
  if (management) return db.prepare("SELECT object_key AS objectKey,mime_type AS mimeType,file_name AS fileName FROM workflow_files WHERE id=? AND category='worker_document' LIMIT 1").bind(fileId).first<{ objectKey: string; mimeType: string; fileName: string }>();
  if (!workerEmail) return null;
  return db.prepare("SELECT file.object_key AS objectKey,file.mime_type AS mimeType,file.file_name AS fileName FROM workflow_files file JOIN worker_file_access access ON access.file_id=file.id JOIN worker_project_assignments assignment ON assignment.case_id=access.case_id AND assignment.worker_email=access.worker_email AND assignment.status='active' WHERE file.id=? AND file.category='worker_document' AND access.worker_email=? LIMIT 1")
    .bind(fileId, workerEmail.toLowerCase()).first<{ objectKey: string; mimeType: string; fileName: string }>();
}
