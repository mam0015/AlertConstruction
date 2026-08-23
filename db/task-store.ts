import { workerStaffRoles } from "../app/staff-access";
import type { PersonalTaskSnapshot, TaskManagementSnapshot, TaskPerson, TeamTask } from "../app/tasks/types";
import { ensureWorkflowDatabase } from "./workflow-store";
import { ensureStaffAccessTable } from "./staff-store";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;
type Raw = Record<string, unknown>;

const operationalRoles = new Set<string>(["Site Supervisor", ...workerStaffRoles]);
const managementRoles = new Set<string>(["Admin", "Manager"]);
const allowedPriorities = new Set(["Normal", "High", "Urgent"]);
const allowedStatuses = new Set(["assigned", "in_progress", "completed"]);

async function database(): Promise<D1> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("The task database is unavailable.");
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

function taskId(value: unknown) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new Error("Choose a valid task.");
  return result;
}

function projectId(value: unknown) {
  const result = Number(value ?? 0);
  if (!Number.isInteger(result) || result < 0) throw new Error("Choose a valid project.");
  return result;
}

export function taskGroup(role: string): TaskPerson["group"] | null {
  if (operationalRoles.has(role)) return "operations";
  if (managementRoles.has(role)) return "management";
  return null;
}

export async function ensureTaskDatabase() {
  await ensureWorkflowDatabase();
  await ensureStaffAccessTable();
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS team_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT,case_id INTEGER NOT NULL DEFAULT 0,assignee_email TEXT NOT NULL,assignee_role TEXT NOT NULL,assignee_title TEXT NOT NULL,title TEXT NOT NULL,instructions TEXT NOT NULL DEFAULT '',priority TEXT NOT NULL DEFAULT 'Normal',status TEXT NOT NULL DEFAULT 'assigned',created_by_role TEXT NOT NULL,created_by_email TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE INDEX IF NOT EXISTS team_tasks_assignee_idx ON team_tasks(assignee_email,status,updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS team_tasks_case_idx ON team_tasks(case_id,status)"),
  ]);
}

function mapTask(row: Raw): TeamTask {
  return {
    id: Number(row.id),
    caseId: Number(row.caseId ?? 0),
    projectCode: String(row.projectCode || "Business / General"),
    siteLabel: String(row.siteLabel || "Company operations"),
    assigneeEmail: String(row.assigneeEmail || ""),
    assigneeRole: String(row.assigneeRole || ""),
    assigneeTitle: String(row.assigneeTitle || row.assigneeRole || "Team member"),
    title: String(row.title || ""),
    instructions: String(row.instructions || ""),
    priority: String(row.priority || "Normal") as TeamTask["priority"],
    status: String(row.status || "assigned") as TeamTask["status"],
    createdByRole: String(row.createdByRole || "Owner") as TeamTask["createdByRole"],
    createdByEmail: String(row.createdByEmail || ""),
    createdAt: String(row.createdAt || ""),
    updatedAt: String(row.updatedAt || ""),
    completedAt: String(row.completedAt || ""),
  };
}

async function people(db: D1) {
  const result = await db.prepare("SELECT email,role,COALESCE(NULLIF(trade_title,''),role) AS title FROM staff_access_requests WHERE status='Approved' AND role!='Unassigned' ORDER BY CASE role WHEN 'Admin' THEN 0 WHEN 'Manager' THEN 1 WHEN 'Site Supervisor' THEN 2 ELSE 3 END,email").all<Raw>();
  const rows = result.results.map((row) => ({ email: String(row.email).toLowerCase(), role: String(row.role), title: String(row.title || row.role) }));
  return rows.map((row) => ({ ...row, group: taskGroup(row.role) })).filter((row): row is TaskPerson => Boolean(row.group));
}

async function projects(db: D1) {
  const result = await db.prepare("SELECT id AS caseId,project_code AS projectCode,suburb AS siteLabel FROM workflow_cases WHERE stage='active_project' ORDER BY updated_at DESC").all<Raw>();
  return result.results.map((row) => ({ caseId: Number(row.caseId), projectCode: String(row.projectCode), siteLabel: String(row.siteLabel || "Active project") }));
}

async function tasks(db: D1, where = "", bindings: unknown[] = []) {
  const result = await db.prepare(`SELECT task.id,task.case_id AS caseId,COALESCE(workflow.project_code,'Business / General') AS projectCode,COALESCE(NULLIF(workflow.suburb,''),'Company operations') AS siteLabel,task.assignee_email AS assigneeEmail,task.assignee_role AS assigneeRole,task.assignee_title AS assigneeTitle,task.title,task.instructions,task.priority,task.status,task.created_by_role AS createdByRole,task.created_by_email AS createdByEmail,task.created_at AS createdAt,task.updated_at AS updatedAt,task.completed_at AS completedAt FROM team_tasks task LEFT JOIN workflow_cases workflow ON workflow.id=task.case_id ${where} ORDER BY CASE task.status WHEN 'assigned' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,CASE task.priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,task.updated_at DESC`).bind(...bindings).all<Raw>();
  return result.results.map(mapTask);
}

export async function seedTaskDevelopmentPreview() {
  if (process.env.NODE_ENV !== "development") return;
  await ensureTaskDatabase();
  const db = await database();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO staff_access_requests (email,password_hash,status,role,trade_title,requested_at,reviewed_at,last_seen_at) VALUES ('electrician@alerttradiepro.demo','preview','Approved','Electrician','Electrician',?,?,?)").bind(now, now, now),
    db.prepare("INSERT OR IGNORE INTO staff_access_requests (email,password_hash,status,role,trade_title,requested_at,reviewed_at,last_seen_at) VALUES ('supervisor@alerttradiepro.demo','preview','Approved','Site Supervisor','Site Supervisor',?,?,?)").bind(now, now, now),
    db.prepare("INSERT OR IGNORE INTO staff_access_requests (email,password_hash,status,role,trade_title,requested_at,reviewed_at,last_seen_at) VALUES ('manager@alerttradiepro.demo','preview','Approved','Manager','Project Manager',?,?,?)").bind(now, now, now),
    db.prepare("INSERT OR IGNORE INTO staff_access_requests (email,password_hash,status,role,trade_title,requested_at,reviewed_at,last_seen_at) VALUES ('admin@alerttradiepro.demo','preview','Approved','Admin','Admin 01',?,?,?)").bind(now, now, now),
  ]);
  const count = await db.prepare("SELECT COUNT(*) AS total FROM team_tasks").first<{ total?: number }>();
  if (Number(count?.total ?? 0)) return;
  const project = await db.prepare("SELECT id FROM workflow_cases WHERE stage='active_project' ORDER BY id LIMIT 1").first<{ id?: number }>();
  await db.batch([
    db.prepare("INSERT INTO team_tasks (case_id,assignee_email,assignee_role,assignee_title,title,instructions,priority,status,created_by_role,created_by_email,created_at,updated_at,completed_at) VALUES (?,'supervisor@alerttradiepro.demo','Site Supervisor','Site Supervisor','Confirm plumbing set-out','Check the marked-up drawing on site, photograph the set-out and report any conflict before rough-in starts.','High','in_progress','Admin','admin@alerttradiepro.demo',?,?,'')").bind(Number(project?.id ?? 0), now, now),
    db.prepare("INSERT INTO team_tasks (case_id,assignee_email,assignee_role,assignee_title,title,instructions,priority,status,created_by_role,created_by_email,created_at,updated_at,completed_at) VALUES (?,'electrician@alerttradiepro.demo','Electrician','Electrician','Complete switchboard labelling','Label the new circuits against the approved electrical plan and confirm the final list with the Site Supervisor.','Normal','assigned','Admin','admin@alerttradiepro.demo',?,?,'')").bind(Number(project?.id ?? 0), now, now),
    db.prepare("INSERT INTO team_tasks (case_id,assignee_email,assignee_role,assignee_title,title,instructions,priority,status,created_by_role,created_by_email,created_at,updated_at,completed_at) VALUES (0,'admin@alerttradiepro.demo','Admin','Admin 01','Review customer estimate pack','Check the scope, exclusions and approval history before the estimate is released.','Urgent','assigned','Owner','owner@alerttradiepro.demo',?,?,'')").bind(now, now),
    db.prepare("INSERT INTO team_tasks (case_id,assignee_email,assignee_role,assignee_title,title,instructions,priority,status,created_by_role,created_by_email,created_at,updated_at,completed_at) VALUES (0,'manager@alerttradiepro.demo','Manager','Project Manager','Confirm next-week trade capacity','Review active projects and confirm the required trade coverage with Admin.','Normal','assigned','Owner','owner@alerttradiepro.demo',?,?,'')").bind(now, now),
  ]);
}

export async function getTaskManagementSnapshot(viewerRole: "Owner" | "Admin"): Promise<TaskManagementSnapshot> {
  await ensureTaskDatabase();
  const db = await database();
  const [allPeople, allProjects, allTasks] = await Promise.all([people(db), projects(db), tasks(db)]);
  const visiblePeople = viewerRole === "Owner" ? allPeople : allPeople.filter((person) => person.group === "operations");
  const visibleEmails = new Set(visiblePeople.map((person) => person.email));
  return { viewerRole, people: visiblePeople, projects: allProjects, tasks: allTasks.filter((task) => visibleEmails.has(task.assigneeEmail)) };
}

async function approvedAssignee(db: D1, emailInput: unknown) {
  const email = required(emailInput, "Assignee").toLowerCase();
  const allPeople = await people(db);
  const person = allPeople.find((item) => item.email === email);
  if (!person) throw new Error("Choose an approved team member.");
  return person;
}

async function requireTaskScope(db: D1, actorRole: "Owner" | "Admin", id: number) {
  const task = await db.prepare("SELECT id,case_id AS caseId,assignee_email AS assigneeEmail,assignee_role AS assigneeRole,title FROM team_tasks WHERE id=? LIMIT 1").bind(id).first<Raw>();
  if (!task) throw new Error("Task was not found.");
  if (actorRole === "Admin" && taskGroup(String(task.assigneeRole)) !== "operations") throw new Error("Only Owner can control Admin and Manager tasks.");
  return task;
}

async function taskEvent(db: D1, task: { caseId: number; title: string }, actorRole: string, actorEmail: string, eventType: string, detail: string) {
  if (!task.caseId) return;
  await db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,'internal',?)")
    .bind(task.caseId, actorRole, actorEmail, eventType, task.title, detail, new Date().toISOString()).run();
}

export async function performTaskManagementAction(actorRole: "Owner" | "Admin", actorEmail: string, action: string, payload: Record<string, unknown>) {
  await ensureTaskDatabase();
  const db = await database();
  const now = new Date().toISOString();
  if (action === "create_task") {
    const assignee = await approvedAssignee(db, payload.assigneeEmail);
    if (actorRole === "Admin" && assignee.group !== "operations") throw new Error("Admin can assign tasks only to Site Supervisors and trade Workers.");
    const caseId = projectId(payload.caseId);
    if (caseId) {
      const project = await db.prepare("SELECT id FROM workflow_cases WHERE id=? AND stage='active_project' LIMIT 1").bind(caseId).first();
      if (!project) throw new Error("Choose an active project or Business / General.");
    }
    const title = required(payload.title, "Task");
    const instructions = required(payload.instructions, "Instructions");
    const priority = clean(payload.priority) || "Normal";
    if (!allowedPriorities.has(priority)) throw new Error("Choose a valid priority.");
    await db.prepare("INSERT INTO team_tasks (case_id,assignee_email,assignee_role,assignee_title,title,instructions,priority,status,created_by_role,created_by_email,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,'assigned',?,?,?,?, '')")
      .bind(caseId, assignee.email, assignee.role, assignee.title, title, instructions, priority, actorRole, actorEmail, now, now).run();
    await taskEvent(db, { caseId, title }, actorRole, actorEmail, "team_task_created", `Assigned to ${assignee.title} (${assignee.email})`);
  } else if (action === "set_status") {
    const id = taskId(payload.taskId);
    const task = await requireTaskScope(db, actorRole, id);
    const status = required(payload.status, "Status");
    if (!allowedStatuses.has(status)) throw new Error("Choose a valid task status.");
    await db.prepare("UPDATE team_tasks SET status=?,updated_at=?,completed_at=? WHERE id=?").bind(status, now, status === "completed" ? now : "", id).run();
    await taskEvent(db, { caseId: Number(task.caseId), title: String(task.title) }, actorRole, actorEmail, "team_task_status", `Marked ${status.replaceAll("_", " ")}`);
  } else if (action === "delete_task") {
    const id = taskId(payload.taskId);
    const task = await requireTaskScope(db, actorRole, id);
    await db.prepare("DELETE FROM team_tasks WHERE id=?").bind(id).run();
    await taskEvent(db, { caseId: Number(task.caseId), title: String(task.title) }, actorRole, actorEmail, "team_task_deleted", `Removed from ${String(task.assigneeEmail)}`);
  } else {
    throw new Error("Unknown task action.");
  }
}

export async function getPersonalTaskSnapshot(emailInput: string, role: string): Promise<PersonalTaskSnapshot> {
  await ensureTaskDatabase();
  const db = await database();
  const email = emailInput.toLowerCase();
  const allPeople = await people(db);
  const person = allPeople.find((item) => item.email === email);
  return {
    identity: { email, role, title: person?.title || role },
    tasks: await tasks(db, "WHERE LOWER(task.assignee_email)=?", [email]),
  };
}

export async function setPersonalTaskStatus(emailInput: string, taskIdInput: unknown, statusInput: unknown) {
  await ensureTaskDatabase();
  const db = await database();
  const email = emailInput.toLowerCase();
  const id = taskId(taskIdInput);
  const status = required(statusInput, "Status");
  if (!allowedStatuses.has(status)) throw new Error("Choose a valid task status.");
  const task = await db.prepare("SELECT case_id AS caseId,title FROM team_tasks WHERE id=? AND LOWER(assignee_email)=? LIMIT 1").bind(id, email).first<Raw>();
  if (!task) throw new Error("This task is not assigned to your account.");
  const now = new Date().toISOString();
  await db.prepare("UPDATE team_tasks SET status=?,updated_at=?,completed_at=? WHERE id=? AND LOWER(assignee_email)=?").bind(status, now, status === "completed" ? now : "", id, email).run();
  await taskEvent(db, { caseId: Number(task.caseId), title: String(task.title) }, "Assignee", email, "team_task_self_status", `Marked ${status.replaceAll("_", " ")}`);
}
