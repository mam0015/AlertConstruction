import type { TeamIdentity } from "../app/team-identity";
import { staffName } from "../app/team-identity";
import { ensureOwnerDatabase } from "./owner-store";
import { getPrimaryOwnerAccount } from "./access-settings-store";
import { ensureStaffAccessTable, listStaffAccessRequests } from "./staff-store";

type D1 = NonNullable<(typeof import("cloudflare:workers"))["env"]["DB"]>;
type Raw = Record<string, unknown>;

export type TeamPerson = { email: string; name: string; role: string };
export type CalendarEntry = {
  id: number; entryDate: string; startTime: string; title: string; notes: string; projectCode: string;
  assigneeEmail: string; assigneeName: string; createdByEmail: string; createdByName: string; createdByRole: string; createdAt: string;
};
export type ChatMessage = {
  id: number; senderEmail: string; senderName: string; recipientEmail: string; body: string;
  fileName: string; fileMime: string; fileSize: number; sentAt: string; fileUrl: string;
};
export type StaffReport = { id: number; projectCode: string; summary: string; submittedAt: string; status: string; ownerNote: string };

const CHANNEL = "*";
const canPlan = new Set(["Owner", "Admin", "Manager"]);

async function database(): Promise<D1> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("The team database is unavailable.");
  return env.DB;
}

function clean(value: unknown) { return typeof value === "string" ? value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") : ""; }
function bounded(value: unknown, label: string, max: number) {
  const result = clean(value);
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} is too long.`);
  return result;
}

export async function ensureTeamTables() {
  await ensureOwnerDatabase();
  await ensureStaffAccessTable();
  const db = await database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS calendar_entries (id INTEGER PRIMARY KEY AUTOINCREMENT,entry_date TEXT NOT NULL,start_time TEXT NOT NULL DEFAULT '',title TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',project_code TEXT NOT NULL DEFAULT '',assignee_email TEXT NOT NULL,assignee_name TEXT NOT NULL DEFAULT '',created_by_email TEXT NOT NULL,created_by_name TEXT NOT NULL DEFAULT '',created_by_role TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS calendar_entries_assignee_idx ON calendar_entries(assignee_email,entry_date)"),
    db.prepare("CREATE TABLE IF NOT EXISTS team_chat (id INTEGER PRIMARY KEY AUTOINCREMENT,sender_email TEXT NOT NULL,sender_name TEXT NOT NULL DEFAULT '',recipient_email TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',file_key TEXT NOT NULL DEFAULT '',file_name TEXT NOT NULL DEFAULT '',file_mime TEXT NOT NULL DEFAULT '',file_size INTEGER NOT NULL DEFAULT 0,sent_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS team_chat_pair_idx ON team_chat(sender_email,recipient_email,id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS team_chat_reads (email TEXT NOT NULL,peer TEXT NOT NULL,last_id INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(email,peer))"),
  ]);
}

export async function listPeople(): Promise<TeamPerson[]> {
  await ensureTeamTables();
  const owner = await getPrimaryOwnerAccount();
  const staff = (await listStaffAccessRequests()).filter((row) => row.status === "Approved" && row.role !== "Unassigned");
  const people: TeamPerson[] = [];
  if (owner) people.push({ email: owner.email.toLowerCase(), name: `${owner.displayName || "Owner"} (Owner)`, role: "Owner" });
  for (const row of staff) people.push({ email: row.email.toLowerCase(), name: staffName(row.email, row.tradeTitle, row.role), role: row.role });
  return people;
}

// ---------- Calendar ----------
const dateOk = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export async function listCalendar(identity: TeamIdentity, from: string, to: string, person = ""): Promise<CalendarEntry[]> {
  await ensureTeamTables();
  if (!dateOk(from) || !dateOk(to)) throw new Error("Choose a valid date range.");
  const db = await database();
  const columns = "id,entry_date AS entryDate,start_time AS startTime,title,notes,project_code AS projectCode,assignee_email AS assigneeEmail,assignee_name AS assigneeName,created_by_email AS createdByEmail,created_by_name AS createdByName,created_by_role AS createdByRole,created_at AS createdAt";
  const seesAll = canPlan.has(identity.role);
  const target = seesAll ? person.trim().toLowerCase() : identity.email.toLowerCase();
  const result = target
    ? await db.prepare(`SELECT ${columns} FROM calendar_entries WHERE entry_date>=? AND entry_date<=? AND assignee_email=? ORDER BY entry_date,start_time,id`).bind(from, to, target).all<Raw>()
    : await db.prepare(`SELECT ${columns} FROM calendar_entries WHERE entry_date>=? AND entry_date<=? ORDER BY entry_date,start_time,id`).bind(from, to).all<Raw>();
  return result.results as unknown as CalendarEntry[];
}

export async function createCalendarEntries(identity: TeamIdentity, payload: Record<string, unknown>) {
  if (!canPlan.has(identity.role)) throw new Error("Only Owner, Admin or Manager can assign calendar work.");
  await ensureTeamTables();
  const people = await listPeople();
  const assignee = people.find((person) => person.email === clean(payload.assigneeEmail).toLowerCase());
  if (!assignee) throw new Error("Choose an approved team member.");
  const title = bounded(payload.title, "Title", 160);
  const notes = clean(payload.notes).slice(0, 1000);
  const projectCode = clean(payload.projectCode).slice(0, 60);
  const startTime = /^\d{2}:\d{2}$/.test(clean(payload.startTime)) ? clean(payload.startTime) : "";
  const dates = Array.isArray(payload.dates) ? payload.dates.map((value) => clean(value)).filter(dateOk) : [];
  const unique = [...new Set(dates)].sort();
  if (!unique.length) throw new Error("Choose at least one valid date.");
  if (unique.length > 62) throw new Error("A plan can contain at most 62 days at a time.");
  const db = await database();
  const now = new Date().toISOString();
  await db.batch(unique.map((date) => db.prepare("INSERT INTO calendar_entries (entry_date,start_time,title,notes,project_code,assignee_email,assignee_name,created_by_email,created_by_name,created_by_role,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .bind(date, startTime, title, notes, projectCode, assignee.email, assignee.name, identity.email.toLowerCase(), identity.name, identity.role, now)));
  return unique.length;
}

export async function deleteCalendarEntry(identity: TeamIdentity, id: number) {
  await ensureTeamTables();
  const db = await database();
  const row = await db.prepare("SELECT created_by_email AS createdBy FROM calendar_entries WHERE id=?").bind(id).first<{ createdBy: string }>();
  if (!row) throw new Error("Entry not found.");
  if (identity.role !== "Owner" && !(canPlan.has(identity.role) && row.createdBy === identity.email.toLowerCase())) throw new Error("Only the person who created this entry (or the Owner) can remove it.");
  await db.prepare("DELETE FROM calendar_entries WHERE id=?").bind(id).run();
}

// ---------- Chat ----------
function mapMessage(row: Raw): ChatMessage {
  return { id: Number(row.id), senderEmail: String(row.senderEmail), senderName: String(row.senderName), recipientEmail: String(row.recipientEmail), body: String(row.body), fileName: String(row.fileName), fileMime: String(row.fileMime), fileSize: Number(row.fileSize), sentAt: String(row.sentAt), fileUrl: row.fileName ? `/api/team/chat/file?id=${row.id}` : "" };
}
const chatColumns = "id,sender_email AS senderEmail,sender_name AS senderName,recipient_email AS recipientEmail,body,file_name AS fileName,file_mime AS fileMime,file_size AS fileSize,sent_at AS sentAt";

export async function getThread(identity: TeamIdentity, withEmail: string) {
  await ensureTeamTables();
  const db = await database();
  const me = identity.email.toLowerCase();
  const peer = withEmail === CHANNEL ? CHANNEL : withEmail.trim().toLowerCase();
  const rows = peer === CHANNEL
    ? await db.prepare(`SELECT ${chatColumns} FROM team_chat WHERE recipient_email='*' ORDER BY id DESC LIMIT 200`).all<Raw>()
    : await db.prepare(`SELECT ${chatColumns} FROM team_chat WHERE (sender_email=? AND recipient_email=?) OR (sender_email=? AND recipient_email=?) ORDER BY id DESC LIMIT 200`).bind(me, peer, peer, me).all<Raw>();
  const messages = rows.results.map(mapMessage).reverse();
  const last = messages.at(-1)?.id ?? 0;
  await db.prepare("INSERT INTO team_chat_reads (email,peer,last_id) VALUES (?,?,?) ON CONFLICT(email,peer) DO UPDATE SET last_id=MAX(last_id,excluded.last_id)").bind(me, peer, last).run();
  return messages;
}

export async function getUnread(identity: TeamIdentity): Promise<Record<string, number>> {
  await ensureTeamTables();
  const db = await database();
  const me = identity.email.toLowerCase();
  const direct = await db.prepare("SELECT c.sender_email AS peer,COUNT(*) AS n FROM team_chat c LEFT JOIN team_chat_reads r ON r.email=? AND r.peer=c.sender_email WHERE c.recipient_email=? AND c.id>COALESCE(r.last_id,0) GROUP BY c.sender_email").bind(me, me).all<{ peer: string; n: number }>();
  const channel = await db.prepare("SELECT COUNT(*) AS n FROM team_chat c LEFT JOIN team_chat_reads r ON r.email=? AND r.peer='*' WHERE c.recipient_email='*' AND c.sender_email!=? AND c.id>COALESCE(r.last_id,0)").bind(me, me).first<{ n: number }>();
  const result: Record<string, number> = {};
  for (const row of direct.results) result[row.peer] = Number(row.n);
  if (channel?.n) result[CHANNEL] = Number(channel.n);
  return result;
}

export async function sendChat(identity: TeamIdentity, recipientInput: string, bodyInput: unknown, file?: { key: string; name: string; mime: string; size: number }) {
  await ensureTeamTables();
  const recipient = recipientInput === CHANNEL ? CHANNEL : recipientInput.trim().toLowerCase();
  if (recipient !== CHANNEL) {
    const people = await listPeople();
    if (!people.some((person) => person.email === recipient)) throw new Error("Choose an approved team member.");
    if (recipient === identity.email.toLowerCase()) throw new Error("Choose someone else to message.");
  }
  const body = clean(bodyInput).slice(0, 2000);
  if (!body && !file) throw new Error("Write a message or attach a file.");
  const db = await database();
  const created = await db.prepare("INSERT INTO team_chat (sender_email,sender_name,recipient_email,body,file_key,file_name,file_mime,file_size,sent_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(identity.email.toLowerCase(), identity.name, recipient, body, file?.key ?? "", file?.name ?? "", file?.mime ?? "", file?.size ?? 0, new Date().toISOString()).run();
  return Number(created.meta.last_row_id);
}

export async function getChatFile(identity: TeamIdentity, id: number) {
  await ensureTeamTables();
  const db = await database();
  const row = await db.prepare("SELECT sender_email AS sender,recipient_email AS recipient,file_key AS key,file_name AS name,file_mime AS mime FROM team_chat WHERE id=? AND file_key!=''").bind(id).first<{ sender: string; recipient: string; key: string; name: string; mime: string }>();
  const me = identity.email.toLowerCase();
  if (!row || !(row.recipient === CHANNEL || row.sender === me || row.recipient === me)) return null;
  return row;
}

// ---------- Daily reports (everyone except Owner; only Owner reviews) ----------
export async function submitStaffReport(identity: TeamIdentity, payload: Record<string, unknown>) {
  if (identity.role === "Owner") throw new Error("The Owner does not submit daily reports.");
  await ensureTeamTables();
  const summary = bounded(payload.summary, "Report", 4000);
  const projectCode = clean(payload.projectCode).slice(0, 60) || "Business / General";
  const db = await database();
  await db.prepare("INSERT INTO eod_reports (person,role,project_code,summary,submitted_at,status,owner_note) VALUES (?,?,?,?,?,'Pending','')")
    .bind(identity.email.toLowerCase(), identity.role, projectCode, summary, new Date().toISOString()).run();
}

export async function listOwnStaffReports(identity: TeamIdentity): Promise<StaffReport[]> {
  await ensureTeamTables();
  const db = await database();
  const rows = await db.prepare("SELECT id,project_code AS projectCode,summary,submitted_at AS submittedAt,status,owner_note AS ownerNote FROM eod_reports WHERE person=? ORDER BY id DESC LIMIT 30").bind(identity.email.toLowerCase()).all<Raw>();
  return rows.results as unknown as StaffReport[];
}

export async function listProjectCodes() {
  await ensureTeamTables();
  const db = await database();
  const rows = await db.prepare("SELECT code,name FROM projects ORDER BY updated_at DESC LIMIT 100").all<{ code: string; name: string }>();
  return rows.results;
}
