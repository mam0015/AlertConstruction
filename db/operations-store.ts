import type { FollowUpItem, OperationsProject, OperationsRole, OperationsSnapshot, SiteIssue } from "../app/operations/types";
import { ensureOwnerDatabase } from "./owner-store";
import { ensureWorkflowDatabase } from "./workflow-store";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;
type Raw = Record<string, unknown>;

const followUpStatuses = new Set(["open", "completed", "cancelled"]);
const severities = new Set(["Normal", "High", "Critical"]);

async function database(): Promise<D1> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("The operations database is unavailable.");
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

function positiveId(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new Error(`Choose a valid ${label}.`);
  return result;
}

function melbourneDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function ensureOperationsDatabase() {
  await ensureOwnerDatabase();
  await ensureWorkflowDatabase();
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS site_issue_reports (id INTEGER PRIMARY KEY AUTOINCREMENT,case_id INTEGER NOT NULL,project_code TEXT NOT NULL,project_name TEXT NOT NULL DEFAULT '',site_location TEXT NOT NULL,affected_trade TEXT NOT NULL,issue_type TEXT NOT NULL,severity TEXT NOT NULL DEFAULT 'High',summary TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',impact TEXT NOT NULL DEFAULT '',contacted_person TEXT NOT NULL DEFAULT '',contacted_at TEXT NOT NULL DEFAULT '',expected_date TEXT NOT NULL DEFAULT '',reporter_email TEXT NOT NULL,reporter_name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'reported',admin_action TEXT NOT NULL DEFAULT '',rescheduled_date TEXT NOT NULL DEFAULT '',rescheduled_time TEXT NOT NULL DEFAULT '',rescheduled_assignee TEXT NOT NULL DEFAULT '',admin_email TEXT NOT NULL DEFAULT '',admin_reviewed_at TEXT NOT NULL DEFAULT '',owner_note TEXT NOT NULL DEFAULT '',reported_at TEXT NOT NULL,updated_at TEXT NOT NULL,resolved_at TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE INDEX IF NOT EXISTS site_issue_reports_status_idx ON site_issue_reports(status,severity,reported_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS site_issue_reports_case_idx ON site_issue_reports(case_id,status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS site_issue_reports_reporter_idx ON site_issue_reports(reporter_email,status)"),
    db.prepare("CREATE TABLE IF NOT EXISTS follow_up_items (id INTEGER PRIMARY KEY AUTOINCREMENT,person_email TEXT NOT NULL,person_role TEXT NOT NULL,person_name TEXT NOT NULL,project_code TEXT NOT NULL DEFAULT 'Business / General',title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',target_date TEXT NOT NULL,source TEXT NOT NULL DEFAULT 'manual',dedupe_key TEXT UNIQUE,status TEXT NOT NULL DEFAULT 'open',created_by_email TEXT NOT NULL,created_by_role TEXT NOT NULL,work_date TEXT NOT NULL DEFAULT '',clocked_out_at TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE INDEX IF NOT EXISTS follow_up_items_person_idx ON follow_up_items(person_email,status,target_date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS follow_up_items_target_idx ON follow_up_items(target_date,status)"),
  ]);
}

function mapProject(row: Raw): OperationsProject {
  return {
    caseId: Number(row.caseId),
    projectCode: String(row.projectCode || row.requestCode || ""),
    projectName: String(row.projectName || `${row.service || "Project"} · ${row.suburb || "Site"}`),
    siteLocation: String(row.siteLocation || row.suburb || "Location to be confirmed"),
  };
}

function mapIssue(row: Raw): SiteIssue {
  return {
    id: Number(row.id), caseId: Number(row.caseId), projectCode: String(row.projectCode || ""), projectName: String(row.projectName || ""), siteLocation: String(row.siteLocation || ""),
    affectedTrade: String(row.affectedTrade || "Other"), issueType: String(row.issueType || "Delay"), severity: String(row.severity || "High") as SiteIssue["severity"],
    summary: String(row.summary || ""), details: String(row.details || ""), impact: String(row.impact || ""), contactedPerson: String(row.contactedPerson || ""), contactedAt: String(row.contactedAt || ""), expectedDate: String(row.expectedDate || ""),
    reporterEmail: String(row.reporterEmail || ""), reporterName: String(row.reporterName || "Site Supervisor"), status: String(row.status || "reported") as SiteIssue["status"],
    adminAction: String(row.adminAction || ""), rescheduledDate: String(row.rescheduledDate || ""), rescheduledTime: String(row.rescheduledTime || ""), rescheduledAssignee: String(row.rescheduledAssignee || ""), adminEmail: String(row.adminEmail || ""), adminReviewedAt: String(row.adminReviewedAt || ""), ownerNote: String(row.ownerNote || ""),
    reportedAt: String(row.reportedAt || ""), updatedAt: String(row.updatedAt || ""), resolvedAt: String(row.resolvedAt || ""),
  };
}

function mapFollowUp(row: Raw): FollowUpItem {
  return {
    id: Number(row.id), personEmail: String(row.personEmail || ""), personRole: String(row.personRole || ""), personName: String(row.personName || ""), projectCode: String(row.projectCode || "Business / General"), title: String(row.title || ""), details: String(row.details || ""), targetDate: String(row.targetDate || ""), source: String(row.source || "manual") as FollowUpItem["source"], status: String(row.status || "open") as FollowUpItem["status"], createdByEmail: String(row.createdByEmail || ""), createdByRole: String(row.createdByRole || ""), workDate: String(row.workDate || ""), clockedOutAt: String(row.clockedOutAt || ""), createdAt: String(row.createdAt || ""), updatedAt: String(row.updatedAt || ""), completedAt: String(row.completedAt || ""),
  };
}

async function projectRows(db: D1, identity: { email: string; role: OperationsRole }) {
  const base = "SELECT id AS caseId,request_code AS requestCode,project_code AS projectCode,service,suburb,(CASE WHEN project_code='' THEN service || ' request' ELSE service || ' · ' || suburb END) AS projectName,suburb AS siteLocation FROM workflow_cases";
  const result = identity.role === "Site Supervisor"
    ? await db.prepare(`${base} WHERE LOWER(assigned_supervisor_email)=? AND stage IN ('site_visit_scheduled','site_visit_submitted','site_visit_approved','estimate_ready','estimate_sent','customer_approved','active_project') ORDER BY updated_at DESC`).bind(identity.email.toLowerCase()).all<Raw>()
    : await db.prepare(`${base} WHERE project_code!='' ORDER BY updated_at DESC`).all<Raw>();
  return result.results.map(mapProject);
}

async function issueRows(db: D1, identity: { email: string; role: OperationsRole }) {
  const where = identity.role === "Site Supervisor" ? "WHERE LOWER(reporter_email)=?" : "";
  const bindings = identity.role === "Site Supervisor" ? [identity.email.toLowerCase()] : [];
  const result = await db.prepare(`SELECT id,case_id AS caseId,project_code AS projectCode,project_name AS projectName,site_location AS siteLocation,affected_trade AS affectedTrade,issue_type AS issueType,severity,summary,details,impact,contacted_person AS contactedPerson,contacted_at AS contactedAt,expected_date AS expectedDate,reporter_email AS reporterEmail,reporter_name AS reporterName,status,admin_action AS adminAction,rescheduled_date AS rescheduledDate,rescheduled_time AS rescheduledTime,rescheduled_assignee AS rescheduledAssignee,admin_email AS adminEmail,admin_reviewed_at AS adminReviewedAt,owner_note AS ownerNote,reported_at AS reportedAt,updated_at AS updatedAt,resolved_at AS resolvedAt FROM site_issue_reports ${where} ORDER BY CASE status WHEN 'reported' THEN 0 WHEN 'under_review' THEN 1 WHEN 'rescheduled' THEN 2 WHEN 'monitoring' THEN 3 ELSE 4 END,CASE severity WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,reported_at DESC`).bind(...bindings).all<Raw>();
  return result.results.map(mapIssue);
}

async function followUpRows(db: D1, identity: { email: string; role: OperationsRole }) {
  const where = identity.role === "Site Supervisor" ? "WHERE LOWER(person_email)=?" : "";
  const bindings = identity.role === "Site Supervisor" ? [identity.email.toLowerCase()] : [];
  const result = await db.prepare(`SELECT id,person_email AS personEmail,person_role AS personRole,person_name AS personName,project_code AS projectCode,title,details,target_date AS targetDate,source,status,created_by_email AS createdByEmail,created_by_role AS createdByRole,work_date AS workDate,clocked_out_at AS clockedOutAt,created_at AS createdAt,updated_at AS updatedAt,completed_at AS completedAt FROM follow_up_items ${where} ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END,target_date,id DESC`).bind(...bindings).all<Raw>();
  return result.results.map(mapFollowUp);
}

async function addWorkflowEvent(db: D1, caseId: number, actorRole: string, actorEmail: string, eventType: string, title: string, detail: string) {
  if (!caseId) return;
  await db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,'internal',?)")
    .bind(caseId, actorRole, actorEmail, eventType, title, detail, new Date().toISOString()).run();
}

export async function getOperationsSnapshot(identity: { email: string; role: OperationsRole; name: string }): Promise<OperationsSnapshot> {
  await ensureOperationsDatabase();
  const db = await database();
  const [projects, issues, followUps] = await Promise.all([projectRows(db, identity), issueRows(db, identity), followUpRows(db, identity)]);
  const today = melbourneDate();
  return {
    viewer: identity,
    today,
    tomorrow: melbourneDate(1),
    projects,
    issues,
    followUps,
    metrics: {
      openIssues: issues.filter((issue) => issue.status !== "resolved").length,
      criticalIssues: issues.filter((issue) => issue.status !== "resolved" && issue.severity === "Critical").length,
      dueToday: followUps.filter((item) => item.status === "open" && item.targetDate === today).length,
      overdue: followUps.filter((item) => item.status === "open" && item.targetDate < today).length,
    },
  };
}

export async function performOperationsAction(identity: { email: string; role: OperationsRole; name: string }, action: string, payload: Record<string, unknown>) {
  await ensureOperationsDatabase();
  const db = await database();
  const now = new Date().toISOString();

  if (action === "create_issue") {
    if (identity.role !== "Site Supervisor") throw new Error("Only the assigned Site Supervisor can submit a site issue.");
    const caseId = positiveId(payload.caseId, "project");
    const project = await db.prepare("SELECT id,project_code AS projectCode,service,suburb FROM workflow_cases WHERE id=? AND LOWER(assigned_supervisor_email)=? LIMIT 1").bind(caseId, identity.email.toLowerCase()).first<Raw>();
    if (!project) throw new Error("This project is not assigned to your Site Supervisor account.");
    const projectCode = String(project.projectCode || "");
    const affectedTrade = required(payload.affectedTrade, "Affected trade");
    const severity = clean(payload.severity) || "High";
    if (!severities.has(severity)) throw new Error("Choose a valid severity.");
    const summary = required(payload.summary, "Problem summary");
    const siteLocation = required(payload.siteLocation, "Project location");
    await db.prepare("INSERT INTO site_issue_reports (case_id,project_code,project_name,site_location,affected_trade,issue_type,severity,summary,details,impact,contacted_person,contacted_at,expected_date,reporter_email,reporter_name,status,reported_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'reported',?,?)")
      .bind(caseId, projectCode, `${String(project.service || "Project")} · ${String(project.suburb || "Site")}`, siteLocation, affectedTrade, required(payload.issueType, "Issue type"), severity, summary, clean(payload.details), clean(payload.impact), clean(payload.contactedPerson), clean(payload.contactedAt), clean(payload.expectedDate), identity.email, identity.name, now, now).run();
    await addWorkflowEvent(db, caseId, identity.role, identity.email, "site_issue_reported", `${affectedTrade} ${clean(payload.issueType).toLowerCase() || "issue"}`, `${siteLocation}: ${summary}. Severity: ${severity}.`);
    return;
  }

  if (["review_issue", "reschedule_issue", "resolve_issue", "owner_note"].includes(action)) {
    if (identity.role === "Site Supervisor") throw new Error("Admin or Owner review is required.");
    const issueId = positiveId(payload.issueId, "issue");
    const issue = await db.prepare("SELECT id,case_id AS caseId,project_code AS projectCode,affected_trade AS affectedTrade,reporter_email AS reporterEmail,reporter_name AS reporterName,summary FROM site_issue_reports WHERE id=? LIMIT 1").bind(issueId).first<Raw>();
    if (!issue) throw new Error("The site issue was not found.");
    if (action === "owner_note") {
      if (identity.role !== "Owner") throw new Error("Only Owner can add the Owner direction.");
      await db.prepare("UPDATE site_issue_reports SET owner_note=?,updated_at=? WHERE id=?").bind(required(payload.ownerNote, "Owner direction"), now, issueId).run();
      await addWorkflowEvent(db, Number(issue.caseId), identity.role, identity.email, "site_issue_owner_direction", `Owner direction: ${String(issue.affectedTrade)}`, clean(payload.ownerNote));
      return;
    }
    if (action === "review_issue") {
      await db.prepare("UPDATE site_issue_reports SET status='under_review',admin_action=?,admin_email=?,admin_reviewed_at=?,updated_at=? WHERE id=?").bind(required(payload.adminAction, "Review action"), identity.email, now, now, issueId).run();
      await addWorkflowEvent(db, Number(issue.caseId), identity.role, identity.email, "site_issue_reviewed", `Reviewing ${String(issue.affectedTrade)} issue`, clean(payload.adminAction));
      return;
    }
    if (action === "reschedule_issue") {
      const rescheduledDate = required(payload.rescheduledDate, "New date");
      const rescheduledTime = required(payload.rescheduledTime, "New time");
      const assignee = required(payload.rescheduledAssignee, "Site Supervisor assignee");
      const actionNote = required(payload.adminAction, "Reschedule direction");
      await db.batch([
        db.prepare("UPDATE site_issue_reports SET status='rescheduled',admin_action=?,rescheduled_date=?,rescheduled_time=?,rescheduled_assignee=?,admin_email=?,admin_reviewed_at=?,updated_at=? WHERE id=?").bind(actionNote, rescheduledDate, rescheduledTime, assignee, identity.email, now, now, issueId),
        db.prepare("INSERT INTO schedule_events (event_date,start_time,title,assignee,project_code,tone,notes) VALUES (?,?,?,?,?,'orange',?)").bind(rescheduledDate, rescheduledTime, `Follow up ${String(issue.affectedTrade)} delay`, assignee, String(issue.projectCode || "Business / General"), actionNote),
        db.prepare("INSERT INTO follow_up_items (person_email,person_role,person_name,project_code,title,details,target_date,source,dedupe_key,status,created_by_email,created_by_role,work_date,clocked_out_at,created_at,updated_at,completed_at) VALUES (?,'Site Supervisor',?,?,?,?,?,'site_issue',NULL,'open',?,?,?,'',?,?,'')")
          .bind(String(issue.reporterEmail), String(issue.reporterName), String(issue.projectCode || "Business / General"), `Follow up ${String(issue.affectedTrade)} delay`, actionNote, rescheduledDate, identity.email, identity.role, melbourneDate(), now, now),
      ]);
      await addWorkflowEvent(db, Number(issue.caseId), identity.role, identity.email, "site_issue_rescheduled", `${String(issue.affectedTrade)} follow-up rescheduled`, `${rescheduledDate} ${rescheduledTime} · ${assignee}. ${actionNote}`);
      return;
    }
    await db.prepare("UPDATE site_issue_reports SET status='resolved',admin_action=?,admin_email=?,admin_reviewed_at=?,resolved_at=?,updated_at=? WHERE id=?").bind(required(payload.adminAction, "Resolution"), identity.email, now, now, now, issueId).run();
    await addWorkflowEvent(db, Number(issue.caseId), identity.role, identity.email, "site_issue_resolved", `${String(issue.affectedTrade)} issue resolved`, clean(payload.adminAction));
    return;
  }

  if (action === "create_follow_up" || action === "clock_out_follow_up") {
    const targetDate = required(payload.targetDate, "Follow-up date");
    const title = required(payload.title, "Follow-up task");
    const source = action === "clock_out_follow_up" ? "clock_out" : "manual";
    const workDate = melbourneDate();
    const clockedOutAt = source === "clock_out" ? now : "";
    const dedupeKey = source === "clock_out" ? `${identity.email.toLowerCase()}|${workDate}|clock_out` : null;
    await db.prepare("INSERT INTO follow_up_items (person_email,person_role,person_name,project_code,title,details,target_date,source,dedupe_key,status,created_by_email,created_by_role,work_date,clocked_out_at,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,'open',?,?,?,?,?,?, '') ON CONFLICT(dedupe_key) DO UPDATE SET project_code=excluded.project_code,title=excluded.title,details=excluded.details,target_date=excluded.target_date,clocked_out_at=excluded.clocked_out_at,updated_at=excluded.updated_at,status='open',completed_at=''")
      .bind(identity.email, identity.role, identity.name, clean(payload.projectCode) || "Business / General", title, clean(payload.details), targetDate, source, dedupeKey, identity.email, identity.role, workDate, clockedOutAt, now, now).run();
    return;
  }

  if (action === "set_follow_up_status") {
    const id = positiveId(payload.followUpId, "follow-up");
    const status = required(payload.status, "Status");
    if (!followUpStatuses.has(status)) throw new Error("Choose a valid follow-up status.");
    const ownership = identity.role === "Site Supervisor" ? " AND LOWER(person_email)=?" : "";
    const bindings = identity.role === "Site Supervisor" ? [status, now, status === "completed" ? now : "", id, identity.email.toLowerCase()] : [status, now, status === "completed" ? now : "", id];
    const result = await db.prepare(`UPDATE follow_up_items SET status=?,updated_at=?,completed_at=? WHERE id=?${ownership}`).bind(...bindings).run();
    if (!result.meta.changes) throw new Error("The follow-up was not found or is not assigned to you.");
    return;
  }

  throw new Error("Unknown operations action.");
}
