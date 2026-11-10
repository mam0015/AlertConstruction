import type { StaffRole } from "../app/admin-auth";
import { memoizePerDatabase, runtimeBindings } from "./runtime";

export type StaffAccessStatus = "Pending" | "Approved" | "Rejected";

export type StaffAccessRequest = {
  id: number;
  email: string;
  passwordHash: string;
  status: StaffAccessStatus;
  role: StaffRole | "Unassigned";
  tradeTitle: string;
  requestedAt: string;
  reviewedAt: string;
  lastSeenAt: string;
};

async function database() {
  const env = await runtimeBindings();
  if (!env.DB) throw new Error("The staff access database is unavailable.");
  return env.DB;
}

async function ensureStaffAccessTableOnce() {
  const db = await database();
  await db.prepare(`CREATE TABLE IF NOT EXISTS staff_access_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    role TEXT NOT NULL DEFAULT 'Unassigned',
    trade_title TEXT NOT NULL DEFAULT '',
    requested_at TEXT NOT NULL,
    reviewed_at TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL
  )`).run();
}

export async function getStaffAccessRequest(email: string) {
  await ensureStaffAccessTable();
  const db = await database();
  return db.prepare(`SELECT id,email,password_hash AS passwordHash,status,role,trade_title AS tradeTitle,
    requested_at AS requestedAt,reviewed_at AS reviewedAt,last_seen_at AS lastSeenAt
    FROM staff_access_requests WHERE email=? LIMIT 1`).bind(email.toLowerCase()).first<StaffAccessRequest>();
}

export async function listStaffAccessRequests() {
  await ensureStaffAccessTable();
  const db = await database();
  const result = await db.prepare(`SELECT id,email,status,role,trade_title AS tradeTitle,
    requested_at AS requestedAt,reviewed_at AS reviewedAt,last_seen_at AS lastSeenAt
    FROM staff_access_requests
    ORDER BY CASE status WHEN 'Pending' THEN 0 WHEN 'Approved' THEN 1 ELSE 2 END, requested_at DESC`).all<Omit<StaffAccessRequest, "passwordHash">>();
  return result.results;
}

// True only if this call created the request. Two people joining with one e-mail at the same moment must not replace each other's
// password, and an account that already exists is never changed from here.
export async function createStaffAccessRequest(email: string, passwordHash: string) {
  await ensureStaffAccessTable();
  const db = await database();
  const now = new Date().toISOString();
  const created = await db.prepare(`INSERT INTO staff_access_requests
    (email,password_hash,status,role,trade_title,requested_at,reviewed_at,last_seen_at)
    VALUES (?,?,'Pending','Unassigned','',?,'',?)
    ON CONFLICT(email) DO NOTHING`).bind(email.toLowerCase(), passwordHash, now, now).run();
  return Number(created.meta.changes) === 1;
}

export async function touchStaffAccessRequest(email: string) {
  await ensureStaffAccessTable();
  const db = await database();
  await db.prepare("UPDATE staff_access_requests SET last_seen_at=? WHERE email=?")
    .bind(new Date().toISOString(), email.toLowerCase()).run();
}

export async function reviewStaffAccessRequest(id: number, status: StaffAccessStatus, role: StaffRole | "Unassigned", tradeTitle: string) {
  await ensureStaffAccessTable();
  const db = await database();
  const reviewedAt = status === "Pending" ? "" : new Date().toISOString();
  await db.prepare("UPDATE staff_access_requests SET status=?,role=?,trade_title=?,reviewed_at=? WHERE id=?")
    .bind(status, role, tradeTitle.trim(), reviewedAt, id).run();
}

export const ensureStaffAccessTable = memoizePerDatabase(ensureStaffAccessTableOnce);
