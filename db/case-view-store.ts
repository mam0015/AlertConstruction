// What the Owner and Admin decide about a project beyond the step-by-step workflow, and what the customer is allowed to see of it:
//  * the project stage, chosen from a ready-made list or typed freely ("Waiting for the planner", "Delayed — rain"), changeable at any time;
//  * the status shown to the customer, written as a draft and shown only when the Owner or Admin presses "Show to customer";
//  * notes for the customer, each optionally shown only from one date until another.
// The step-by-step workflow (site visit → estimate → active → complete) is untouched: these sit beside it and never unlock or skip a step.
import { memoizePerDatabase, runtimeBindings } from "./runtime";
import type { CaseStatusView } from "../app/workflow/types";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;
type Raw = Record<string, unknown>;
export type ManagingRole = "owner" | "admin";

// Ready-made stages; the Owner or Admin can type any other. Stages already used on other projects are offered too.
// Uses the same words as the Owner/Admin portfolio ("Admin review" … "Complete"), so a stage picked here reads the same on the dashboards,
// which count a project as finished only when its stage is exactly "Complete". Extra everyday stages sit between them; any other is typed freely.
export const projectStageOptions = [
  "Admin review",
  "Site inspection",
  "Waiting for planner",
  "Planning",
  "Design & drawings",
  "Permits & approvals",
  "Estimate",
  "Quote sent",
  "Customer approval",
  "Scheduled",
  "Construction",
  "Work in progress",
  "On hold",
  "Delayed",
  "Final inspection",
  "Handover",
  "Complete",
] as const;


async function database(): Promise<D1> {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The project workflow database is unavailable.");
  return env.DB;
}

export const ensureCaseViewTables = memoizePerDatabase(async () => {
  const db = await database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS case_status (
      case_id INTEGER PRIMARY KEY,
      origin TEXT NOT NULL DEFAULT 'website',
      status_label TEXT NOT NULL DEFAULT '',
      status_updated_at TEXT NOT NULL DEFAULT '',
      status_updated_by TEXT NOT NULL DEFAULT '',
      draft_title TEXT NOT NULL DEFAULT '',
      draft_detail TEXT NOT NULL DEFAULT '',
      draft_updated_at TEXT NOT NULL DEFAULT '',
      draft_updated_by TEXT NOT NULL DEFAULT '',
      shown_title TEXT NOT NULL DEFAULT '',
      shown_detail TEXT NOT NULL DEFAULT '',
      shown_at TEXT NOT NULL DEFAULT '',
      shown_by TEXT NOT NULL DEFAULT '',
      shown_token TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      show_from TEXT NOT NULL DEFAULT '',
      show_until TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      created_role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      removed_at TEXT NOT NULL DEFAULT '',
      removed_by TEXT NOT NULL DEFAULT '',
      removed_token TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS customer_notes_case_idx ON customer_notes(case_id, removed_at)"),
    // Every stage name the Owner or Admin has typed, so a custom stage is offered again on the next project.
    // The priced working behind an estimate (unit prices, margin, contingency): Owner and Admin only, kept with the estimate itself.
    db.prepare("CREATE TABLE IF NOT EXISTS estimate_workings (case_id INTEGER PRIMARY KEY, breakdown TEXT NOT NULL, saved_by TEXT NOT NULL DEFAULT '', saved_at TEXT NOT NULL DEFAULT '')"),
    // One row for the length of a single save: proves inside the batch that THIS portfolio save happened (see portfolioStageStatements).
    db.prepare("CREATE TABLE IF NOT EXISTS save_tokens (token TEXT PRIMARY KEY, created_at TEXT NOT NULL)"),
    // The version of the estimate draft, the site visit report and the quality inspection of each job: a new random value every time one
    // is saved again, written in the same batch. Screens name it when they save, send or approve, so two saves can never look the same
    // (a timestamp can repeat within one millisecond). Jobs saved before this existed fall back to their timestamp.
    db.prepare("CREATE TABLE IF NOT EXISTS record_revisions (kind TEXT NOT NULL, case_id INTEGER NOT NULL, revision TEXT NOT NULL, PRIMARY KEY(kind, case_id))"),
    db.prepare("CREATE TABLE IF NOT EXISTS custom_stage_labels (label TEXT PRIMARY KEY COLLATE NOCASE, last_used_at TEXT NOT NULL)"),
    // One row per message or note sent with a one-time key: sending the same thing again (a lost answer, a double press) is recognised.
    db.prepare("CREATE TABLE IF NOT EXISTS operation_keys (op_key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
  ]);
});

// The company works on Melbourne time, so "today" for a note's dates is the Melbourne date.
export function melbourneDay(at = new Date(Date.now())) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

function text(value: unknown, label: string, max: number, required = true) {
  const result = (typeof value === "string" ? value : "").trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} is too long (up to ${max} characters).`);
  return result;
}

function day(value: unknown, label: string) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`)) || new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result) {
    throw new Error(`${label} is not a real date.`);
  }
  return result;
}

function eventStatement(db: D1, caseId: number, role: ManagingRole, email: string, eventType: string, title: string, detail: string, audience: "internal" | "customer", now: string) {
  return db.prepare("INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(caseId, role === "owner" ? "Owner" : "Admin", email, eventType, title, detail, audience, now);
}

// A one-time key from the screen ("" when none or not well-formed), scoped to what it is for, so it can only ever protect that one thing.
export function operationKey(scope: string, value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9-]{16,64}$/.test(value) ? `${scope}:${value}` : "";
}

// A refused retry: the key was already used for something different. The screen makes a new key and the person sends again.
export class ConflictError extends Error {
  status = 409;
}

const staleEditor = "This project was changed in the meantime (for example its stage in Workflow). Close it and open it again to see the latest details.";
// A record exactly as the editor opened it: every field the save writes (in that order). Required — an editor that does not send it (a
// page opened before this check existed) must be reopened. The values are compared in the UPDATE / DELETE itself, null-safe (IS), so a
// change made meanwhile by anyone (another person, another tab, even within the same millisecond) refuses the save instead of being lost.
export function openedRecordValues(opened: unknown, fields: readonly string[], message: string) {
  if (!opened || typeof opened !== "object" || Array.isArray(opened)) throw new ConflictError(message);
  const row = opened as Record<string, unknown>;
  return fields.map((field) => {
    const value = row[field];
    if (value === null || typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) return value;
    throw new ConflictError(message);
  });
}
// The portfolio project: every field the save writes, then updatedAt.
export function openedProjectValues(opened: unknown, fields: readonly string[]) {
  return openedRecordValues(opened, [...fields, "updatedAt"], staleEditor);
}
export const staleProjectMessage = staleEditor;
export const staleRecordMessage = "This entry was changed by someone else after you opened it. Your changes were not saved: close it, open it again to see the latest, then make your change.";

// A fingerprint of exactly what is being sent (text, kind, dates…). A key only ever acknowledges the same content again.
export async function payloadFingerprint(parts: unknown[]) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(parts))));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Put first in the batch that saves the message or note: a repeat fails on this row and so saves nothing a second time (see isRepeat).
export function operationKeyStatement(db: D1, key: string, fingerprint: string, now: string) {
  return db.prepare("INSERT INTO operation_keys (op_key,fingerprint,created_at) VALUES (?,?,?)").bind(key, fingerprint, now);
}

// Whether this key was already used: "none", "same" (the same content is already saved) or "different" (refused: see ConflictError).
export async function priorOperation(key: string, fingerprint: string): Promise<"none" | "same" | "different"> {
  if (!key) return "none";
  await ensureCaseViewTables();
  const db = await database();
  const row = await db.prepare("SELECT fingerprint FROM operation_keys WHERE op_key=?").bind(key).first<{ fingerprint: string }>();
  return !row ? "none" : row.fingerprint === fingerprint ? "same" : "different";
}

// After a batch failed: true if it failed only because the same content was already saved with this key. A key reused for different
// content is refused with a ConflictError, never acknowledged.
export async function isRepeat(key: string, fingerprint: string, error: unknown) {
  if (!key || !/unique|constraint/i.test(error instanceof Error ? error.message : String(error))) return false;
  const prior = await priorOperation(key, fingerprint).catch(() => "none" as const);
  if (prior === "different") throw new ConflictError("This was already sent with different content. Please send it again.");
  return prior === "same";
}


// The row every case gets the first time something is decided about it (website requests have none until then).
function ensureRowStatement(db: D1, caseId: number) {
  return db.prepare("INSERT INTO case_status (case_id) VALUES (?) ON CONFLICT(case_id) DO NOTHING").bind(caseId);
}

// The Owner can switch off project access for Admin (Owner → permissions). Creating projects and deciding stages, customer status and notes
// are project work, so they follow that switch; the Owner always has access.
// The Owner's "Projects & customer requests" switch for Admin. Off: Admin can neither see nor change customer projects (board, private codes,
// notes, messages, files, conversations), exactly as the portfolio already hides itself. The Owner is never limited. No permission row yet
// (or no table on a fresh database) means the default, which is on. Any other read failure refuses rather than guessing.
export class ProjectAccessError extends Error {
  status = 403;
  constructor() { super("Project access has been disabled by Owner."); }
}
export class ScheduleAccessError extends Error {
  status = 403;
  constructor() { super("Schedule access has been disabled by Owner."); }
}
// One of the Owner's switches for Admin ("projects" or "schedule"). Every caller passes its own role spelling ("admin" in the workflow,
// "Admin" in the team stores); both mean the Admin. Anyone else is never limited.
async function adminSwitchOn(role: string, column: "projects" | "schedule") {
  if (String(role).toLowerCase() !== "admin") return true;
  const db = await database();
  const row = await db.prepare(`SELECT ${column} AS value FROM role_permissions WHERE role='Admin' LIMIT 1`).first<{ value: number }>().catch((error: unknown) => {
    if (String((error as Error)?.message ?? error).includes("no such table")) return null;
    throw error;
  });
  return !row || Boolean(Number(row.value));
}
export async function assertProjectAccess(role: string) {
  if (!await adminSwitchOn(role, "projects")) throw new ProjectAccessError();
}
export async function hasScheduleAccess(role: string) {
  return adminSwitchOn(role, "schedule");
}
// For screens that keep their general (non-project) records when the switch is off: false only when the Owner switched it off.
export async function hasProjectAccess(role: string) {
  try { await assertProjectAccess(role); return true; }
  catch (error) { if (error instanceof ProjectAccessError) return false; throw error; }
}

// When a project is completed or a request closed, the status the customer was shown (e.g. "Work starts Monday") stops showing: the portal says
// Complete / Closed, and the Owner or Admin can still show a final status afterwards.
export function finishedStatusStatement(db: D1, caseId: number, token?: string) {
  if (token) return db.prepare("UPDATE case_status SET shown_title='',shown_detail='',shown_at='',shown_by='' WHERE case_id=? AND EXISTS (SELECT 1 FROM save_tokens WHERE token=?)").bind(caseId, token);
  return db.prepare("UPDATE case_status SET shown_title='',shown_detail='',shown_at='',shown_by='' WHERE case_id=?").bind(caseId);
}

export const caseViewActions = new Set(["set_status_label", "save_customer_status", "show_customer_status", "hide_customer_status", "add_customer_note", "remove_customer_note"]);

export async function performCaseViewAction(role: string, actorEmail: string, action: string, caseId: number, payload: Record<string, unknown>) {
  if (role !== "owner" && role !== "admin") throw new Error("Owner or Admin access is required for this action.");
  await assertProjectAccess(role);
  await ensureCaseViewTables();
  const db = await database();
  const item = await db.prepare("SELECT id,project_code AS projectCode FROM workflow_cases WHERE id=? LIMIT 1").bind(caseId).first<Raw>();
  if (!item) throw new Error("Project workflow was not found.");
  const now = new Date().toISOString();
  const who = role === "owner" ? "Owner" : "Admin";

  if (action === "set_status_label") {
    const label = text(payload.label, "Stage", 80);
    // The form names the stage it was opened on (exactly as shown; "" when none was set; required): a stage someone else set meanwhile
    // (another person, the portfolio, a Workflow milestone) is never replaced unseen.
    if (typeof payload.openedLabel !== "string") throw new ConflictError("This page is out of date. Refresh to see the latest before saving the stage.");
    const token = crypto.randomUUID();
    const ifSaved = "EXISTS (SELECT 1 FROM save_tokens WHERE token=?)";
    const results = await db.batch([
      ensureRowStatement(db, caseId),
      db.prepare("UPDATE case_status SET status_label=?,status_updated_at=?,status_updated_by=? WHERE case_id=? AND status_label=?").bind(label, now, actorEmail, caseId, payload.openedLabel),
      markPortfolioSaved(db, token, now),
      db.prepare(`INSERT INTO custom_stage_labels (label,last_used_at) SELECT ?,? WHERE ${ifSaved} ON CONFLICT(label) DO UPDATE SET last_used_at=excluded.last_used_at`).bind(label, now, token),
      db.prepare(`INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at) SELECT ?,?,?,?,?,'','internal',? WHERE ${ifSaved}`).bind(caseId, who, actorEmail, action, `${who} set the project stage to "${label}"`, now, token),
      // The portfolio row of the same project shows the same stage, so the two lists never disagree. The project is looked up inside the
      // same batch, so a project created at the same moment (intake approval) is found or, if it comes later, copies this stage itself.
      db.prepare(`UPDATE projects SET stage=?,updated_at=? WHERE code=(SELECT project_code FROM workflow_cases WHERE id=?) AND code<>'' AND ${ifSaved}`).bind(label, now, caseId, token),
      clearPortfolioSaved(db, token),
    ]);
    if (!Number((results[1] as { meta?: { changes?: number } }).meta?.changes ?? 0)) throw new ConflictError("The stage was changed by someone else after you opened this page. Your stage was not saved: check the current stage, then choose whether to replace it.");
    return;
  }
  if (action === "save_customer_status") {
    const title = text(payload.title, "Status for the customer", 120);
    const detail = text(payload.detail, "Status details", 1000, false);
    // The form names the draft it was opened on (exactly as shown; "" when there was none; required): a draft someone else saved meanwhile
    // is never replaced unseen.
    if (typeof payload.openedTitle !== "string" || typeof payload.openedDetail !== "string") throw new ConflictError("This page is out of date. Refresh to see the latest before saving the status.");
    const results = await db.batch([
      ensureRowStatement(db, caseId),
      db.prepare("UPDATE case_status SET draft_title=?,draft_detail=?,draft_updated_at=?,draft_updated_by=? WHERE case_id=? AND draft_title=? AND draft_detail=?").bind(title, detail, now, actorEmail, caseId, payload.openedTitle, payload.openedDetail),
    ]);
    if (!Number((results[1] as { meta?: { changes?: number } }).meta?.changes ?? 0)) throw new ConflictError("The customer status draft was changed by someone else after you opened this page. Your text was not saved: check the current draft, then choose whether to replace it.");
    return;
  }
  if (action === "show_customer_status") {
    // The screen sends the exact text the person read in the confirmation; only that text is shown. If someone saved a different draft
    // meanwhile, nothing is shown and the person is asked to check again.
    const title = typeof payload.title === "string" ? payload.title : "";
    const detail = typeof payload.detail === "string" ? payload.detail : "";
    if (!title.trim()) throw new Error("Save the status for the customer first, then show it.");
    // The guard sits in the statement: what is shown is exactly the draft that was confirmed. This attempt's own token is written only by
    // that guarded update, and the customer's history line only if the token is there — so a refused attempt (even one in the same
    // millisecond as a successful one) never reaches the customer's history. Same batch: both happen or neither.
    const token = crypto.randomUUID();
    const shown = await db.batch([
      db.prepare("UPDATE case_status SET shown_title=draft_title,shown_detail=draft_detail,shown_at=?,shown_by=?,shown_token=? WHERE case_id=? AND draft_title=? AND draft_detail=?").bind(now, actorEmail, token, caseId, title, detail),
      db.prepare(`INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at)
        SELECT ?,?,?,?,?,?,'customer',? WHERE EXISTS (SELECT 1 FROM case_status WHERE case_id=? AND shown_token=?)`)
        .bind(caseId, who, actorEmail, action, `Project status: ${title}`, detail, now, caseId, token),
    ]);
    if (!Number((shown[0] as { meta?: { changes?: number } }).meta?.changes ?? 0)) throw new Error("The draft was changed meanwhile (perhaps by someone else). Nothing was shown. Check the draft and press Show again.");
    return;
  }
  if (action === "hide_customer_status") {
    await db.batch([
      ensureRowStatement(db, caseId),
      db.prepare("UPDATE case_status SET shown_title='',shown_detail='',shown_at='',shown_by='' WHERE case_id=?").bind(caseId),
      eventStatement(db, caseId, role, actorEmail, action, `${who} stopped showing the project status to the customer`, "", "internal", now),
    ]);
    return;
  }
  if (action === "add_customer_note") {
    const body = text(payload.body, "Note", 1000);
    const showFrom = day(payload.showFrom, "Show from");
    const showUntil = day(payload.showUntil, "Show until");
    if (showFrom && showUntil && showUntil < showFrom) throw new Error("The end date is before the start date.");
    if (showUntil && showUntil < melbourneDay()) throw new Error("The end date has already passed, so the customer would never see this note.");
    const key = operationKey(`note:${caseId}`, payload.clientKey);
    const fingerprint = await payloadFingerprint([body, showFrom, showUntil]);
    try {
    await db.batch([
      ...(key ? [operationKeyStatement(db, key, fingerprint, now)] : []),
      db.prepare("INSERT INTO customer_notes (case_id,body,show_from,show_until,created_by,created_role,created_at) VALUES (?,?,?,?,?,?,?)").bind(caseId, body, showFrom, showUntil, actorEmail, who, now),
      // The text stays in the note list (Owner and Admin only); the activity history, which other staff read, only records that it happened.
      eventStatement(db, caseId, role, actorEmail, action, `${who} added a note for the customer`, showFrom || showUntil ? `Shown ${showFrom || "now"} to ${showUntil || "no end date"}` : "", "internal", now),
    ]);
    } catch (error) {
      if (await isRepeat(key, fingerprint, error)) return; // the same note was already saved by an earlier press
      throw error;
    }
    return;
  }
  if (action === "remove_customer_note") {
    const noteId = Number(payload.noteId);
    if (!Number.isInteger(noteId) || noteId < 1) throw new Error("Choose a valid note.");
    // Removing hides the note from the customer; the record and who removed it are kept.
    const token = crypto.randomUUID();
    const removed = await db.batch([
      db.prepare("UPDATE customer_notes SET removed_at=?,removed_by=?,removed_token=? WHERE id=? AND case_id=? AND removed_at=''").bind(now, actorEmail, token, noteId, caseId),
      // The note's text is not copied into the activity history (other staff read that); Owner and Admin see it in the note list.
      db.prepare(`INSERT INTO workflow_events (case_id,actor_role,actor_email,event_type,title,detail,audience,created_at)
        SELECT ?,?,?,?,?,'','internal',? WHERE EXISTS (SELECT 1 FROM customer_notes WHERE id=? AND removed_token=?)`)
        .bind(caseId, who, actorEmail, action, `${who} removed a customer note`, now, noteId, token),
    ]);
    if (!Number((removed[0] as { meta?: { changes?: number } }).meta?.changes ?? 0)) throw new Error("That note was not found or is already removed.");
    return;
  }
  throw new Error("Unknown workflow action.");
}

// For the Owner/Admin board: everything about each case, including drafts and every note (removed ones are marked, never lost).
// Other roles get the stage and what the customer currently sees, without drafts or the note history.
export async function readCaseViews(caseIds: number[], forManagement: boolean): Promise<Map<number, CaseStatusView>> {
  await ensureCaseViewTables();
  const views = new Map<number, CaseStatusView>();
  if (!caseIds.length) return views;
  const db = await database();
  const [statusRows, noteRows] = await db.batch([
    db.prepare("SELECT case_id AS caseId,origin,status_label AS statusLabel,status_updated_at AS statusUpdatedAt,draft_title AS draftTitle,draft_detail AS draftDetail,draft_updated_at AS draftUpdatedAt,shown_title AS shownTitle,shown_detail AS shownDetail,shown_at AS shownAt FROM case_status"),
    db.prepare("SELECT id,case_id AS caseId,body,show_from AS showFrom,show_until AS showUntil,created_by AS createdBy,created_at AS createdAt,removed_at AS removedAt FROM customer_notes ORDER BY id DESC"),
  ]);
  const wanted = new Set(caseIds);
  for (const id of caseIds) views.set(id, { origin: "website", statusLabel: "", statusUpdatedAt: "", customerStatus: null, draft: null, notes: [] });
  for (const row of statusRows.results as Raw[]) {
    const id = Number(row.caseId);
    if (!wanted.has(id)) continue;
    views.set(id, {
      origin: row.origin === "team" ? "team" : "website",
      statusLabel: String(row.statusLabel ?? ""),
      statusUpdatedAt: String(row.statusUpdatedAt ?? ""),
      customerStatus: row.shownTitle ? { title: String(row.shownTitle), detail: String(row.shownDetail ?? ""), shownAt: String(row.shownAt ?? "") } : null,
      draft: forManagement && row.draftTitle ? { title: String(row.draftTitle), detail: String(row.draftDetail ?? ""), updatedAt: String(row.draftUpdatedAt ?? "") } : null,
      notes: [],
    });
  }
  if (forManagement) {
    for (const row of noteRows.results as Raw[]) {
      const view = views.get(Number(row.caseId));
      if (view) view.notes.push({ id: Number(row.id), body: String(row.body), showFrom: String(row.showFrom), showUntil: String(row.showUntil), createdBy: String(row.createdBy), createdAt: String(row.createdAt), removedAt: String(row.removedAt) });
    }
  }
  return views;
}

// Stages to offer in the picker: the ready-made list first, then the custom ones already used (most recent first).
export async function stageOptions() {
  await ensureCaseViewTables();
  const db = await database();
  const used = await db.prepare("SELECT label FROM custom_stage_labels ORDER BY last_used_at DESC LIMIT 40").all<{ label: string }>();
  const all: string[] = [...projectStageOptions];
  for (const row of used.results) if (!all.some((option) => option.toLowerCase() === row.label.toLowerCase())) all.push(row.label);
  return all;
}

// For the customer portal: only what the Owner or Admin chose to show, and only the notes whose dates include today (Melbourne).
export async function readCustomerView(caseId: number, today = melbourneDay()) {
  await ensureCaseViewTables();
  const db = await database();
  const [statusRows, noteRows] = await db.batch([
    db.prepare("SELECT shown_title AS title,shown_detail AS detail,shown_at AS shownAt FROM case_status WHERE case_id=? AND shown_title<>''").bind(caseId),
    db.prepare("SELECT id,body,show_from AS showFrom,show_until AS showUntil,created_at AS createdAt FROM customer_notes WHERE case_id=? AND removed_at='' AND (show_from='' OR show_from<=?) AND (show_until='' OR show_until>=?) ORDER BY id DESC").bind(caseId, today, today),
  ]);
  const status = (statusRows.results as Raw[])[0];
  return {
    customerStatus: status ? { title: String(status.title), detail: String(status.detail ?? ""), shownAt: String(status.shownAt ?? "") } : null,
    notes: (noteRows.results as Raw[]).map((row) => ({ id: Number(row.id), body: String(row.body), showFrom: String(row.showFrom), showUntil: String(row.showUntil), createdAt: String(row.createdAt) })),
  };
}

// When the step-by-step workflow reaches a milestone that names the project's stage (activated → "Scheduled", completed → "Complete"), a
// case that uses stage names gets the same name, so the board and the portfolio never disagree. Call ensureCaseViewTables() first.
// token: when given, the statement runs only if the stage move with that token happened in the same batch (see moveStage in workflow-store).
export function milestoneStageStatement(db: D1, caseId: number, label: string, actorEmail: string, now: string, token?: string) {
  if (token) return db.prepare("UPDATE case_status SET status_label=?,status_updated_at=?,status_updated_by=? WHERE case_id=? AND status_label<>'' AND status_label<>? AND EXISTS (SELECT 1 FROM save_tokens WHERE token=?)").bind(label, now, actorEmail, caseId, label, token);
  return db.prepare("UPDATE case_status SET status_label=?,status_updated_at=?,status_updated_by=? WHERE case_id=? AND status_label<>'' AND status_label<>?").bind(label, now, actorEmail, caseId, label);
}

// The portfolio (Owner/Admin "Projects" list) and the workflow board show the same stage: a stage typed on the portfolio row of a project
// that has a customer workflow becomes that workflow's stage too. These statements go in the SAME batch as the portfolio update, so two
// edits at the same moment can never leave the two lists disagreeing. Call ensureCaseViewTables() first.
// The workflow stage follows a portfolio save only if THAT save happened. The batch is: the portfolio UPDATE, markPortfolioSaved (writes a
// one-off token only when the UPDATE just changed a row: SQLite changes()), these statements (each requires the token), clearPortfolioSaved.
// A save refused because its editor was out of date writes no token, so it can never move the stage, even in the same millisecond as another save.
export function markPortfolioSaved(db: D1, token: string, now: string) {
  return db.prepare("INSERT INTO save_tokens (token,created_at) SELECT ?,? WHERE changes() > 0").bind(token, now);
}
export function clearPortfolioSaved(db: D1, token: string) {
  return db.prepare("DELETE FROM save_tokens WHERE token=?").bind(token);
}
export function portfolioStageStatements(db: D1, projectCode: string, stage: string, actorEmail: string, now: string, token: string) {
  const code = projectCode.trim().toUpperCase();
  const label = stage.trim().slice(0, 80);
  if (!code || !label) return [];
  const saved = "EXISTS (SELECT 1 FROM save_tokens WHERE token=?)";
  return [
    db.prepare(`INSERT INTO case_status (case_id) SELECT id FROM workflow_cases WHERE project_code=? AND ${saved} ON CONFLICT(case_id) DO NOTHING`).bind(code, token),
    db.prepare(`UPDATE case_status SET status_label=?,status_updated_at=?,status_updated_by=? WHERE case_id IN (SELECT id FROM workflow_cases WHERE project_code=?) AND status_label<>? AND ${saved}`).bind(label, now, actorEmail, code, label, token),
    db.prepare(`INSERT INTO custom_stage_labels (label,last_used_at) SELECT ?,? WHERE ${saved} ON CONFLICT(label) DO UPDATE SET last_used_at=excluded.last_used_at`).bind(label, now, token),
  ];
}

// What a customer (or anyone outside Owner/Admin) may read of an estimate's scope. Scopes written by the current calculator are already
// customer-safe and pass unchanged. Older ones (written before November 2026) carried the priced working; it is removed line by line:
// "• Labour: Tiling — 40 hours × $75.00 = $3,000.00" → "• Tiling — 40 hours", and the "Subtotal … Margin … GST" line → the GST only.
export function customerSafeScope(scope: string) {
  const money = String.raw`\$[\d,]+(?:\.\d+)?`;
  const priced = new RegExp(String.raw`^\s*•\s*(?:(?:Materials|Labour|Subcontractor|Other):\s*)?(.*?)\s+—\s+(.+?)\s+×\s+${money}\s+=\s+${money}\s*$`);
  return String(scope ?? "").split("\n").map((line) => {
    const item = priced.exec(line);
    if (item) return `• ${item[1]} — ${item[2]}`;
    if (/^\s*Subtotal \$/.test(line)) {
      const gst = new RegExp(String.raw`GST \(10%\) (${money})`).exec(line);
      return gst ? `Total includes GST (10%) of ${gst[1]}.` : /GST not included/.test(line) ? "Prices exclude GST." : null;
    }
    if (new RegExp(String.raw`\b(?:margin|contingency|markup)\b[^\n]*${money}`, "i").test(line)) return null;
    return line;
  }).filter((line): line is string => line !== null).join("\n");
}
