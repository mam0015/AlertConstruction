// Read-only database access for Jarvis.
//
// Every query Jarvis runs passes through assertReadOnlySql(): one SELECT statement, no write/DDL keywords,
// explicit column lists (no SELECT *), and only tables on the allow-list below. Jarvis may read the whole working app,
// but never a secret: a query that mentions a password, hash, token, session, PIN or key is refused outright, and the
// tables that hold them (owner accounts, access settings, sessions, rate limits ...) are not on the list.

import { JarvisAccessError } from "./policy.mjs";

// Tables Jarvis may read. Staff, customer and Owner secrets live in tables that are deliberately absent.
export const READABLE_TABLES = Object.freeze([
  "eod_reports",
  "worker_reports",
  "project_updates",
  "site_visit_reports",
  "site_issue_reports",
  "customer_messages",
  "team_messages", // the Owner's dashboard messages and the tracking-page customer rows
  "team_chat", // staff direct messages and the team channel (attached file contents are never read)
  "workflow_cases",
  "workflow_events",
  "change_proposals",
  "quality_inspections",
  "projects",
  "team_tasks",
  "worker_tasks",
  "follow_up_items",
  "schedule_events",
  "calendar_entries",
  "finance_entries",
  "staff_access_requests", // roster only: the password column is refused by SECRET_WORDS below
]);

// Any word that points at a credential. It is checked against the whole statement, so selecting, filtering or aliasing
// one is impossible even on an allowed table.
const SECRET_WORDS = /\b(?:password\w*|passwd|\w*_hash|hash\w*|salt|secret\w*|token\w*|session\w*|pin|pin_\w*|\w*_pin|api_?key|private_?key|credential\w*|otp|team_code\w*|owner_accounts|owner_env_seed|team_access_settings|login_attempts|rate_limits|customer_contact_index)\b/i;

const WRITE_WORDS = /\b(insert|update|delete|drop|alter|create|replace|truncate|pragma|attach|detach|vacuum|reindex|grant|revoke)\b/i;
const RISKY_FUNCTIONS = /\b(load_extension|readfile|writefile|zeroblob|randomblob)\s*\(/i;
// "FROM a, b" is a join the table check below would not see, so it is refused (always write an explicit JOIN).
const COMMA_JOIN = /\bfrom\s+[a-z_][a-z0-9_]*(?:\s+(?:as\s+)?[a-z_][a-z0-9_]*)?\s*,/i;

function withoutLiterals(sql) {
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}

export function assertReadOnlySql(sql) {
  const text = withoutLiterals(String(sql).replace(/\s+/g, " ").trim());
  if (!/^select\b/i.test(text)) throw new JarvisAccessError("Jarvis can only read data.", 500);
  if (text.includes(";")) throw new JarvisAccessError("Jarvis runs one statement at a time.", 500);
  if (text.includes("--") || text.includes("/*")) throw new JarvisAccessError("Comments are not allowed in Jarvis queries.", 500);
  if (WRITE_WORDS.test(text)) throw new JarvisAccessError("Jarvis can only read data.", 500);
  if (SECRET_WORDS.test(text)) throw new JarvisAccessError("Jarvis may not read passwords, keys or sign-in data.", 500);
  if (RISKY_FUNCTIONS.test(text)) throw new JarvisAccessError("That function is not allowed in Jarvis queries.", 500);
  // Quoted or bracketed names could hide a table from the check below.
  if (/["`\[\]]/.test(text)) throw new JarvisAccessError("Quoted names are not allowed in Jarvis queries.", 500);
  if (COMMA_JOIN.test(text)) throw new JarvisAccessError("Use an explicit JOIN in Jarvis queries.", 500);
  if (/\bselect\s+(distinct\s+)?\*/i.test(text) || /\.\*/.test(text)) throw new JarvisAccessError("Jarvis queries must name their columns.", 500);
  const tables = [...text.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((match) => match[1].toLowerCase());
  if (tables.length === 0) throw new JarvisAccessError("Jarvis query has no table.", 500);
  for (const table of tables) {
    if (!READABLE_TABLES.includes(table)) throw new JarvisAccessError(`Jarvis may not read "${table}".`, 500);
  }
  return true;
}

// d1 is a Cloudflare D1 binding (or any object with prepare().bind().all()). The returned reader exposes
// no way to run anything except a guarded SELECT.
export function createReader(d1) {
  if (!d1 || typeof d1.prepare !== "function") throw new JarvisAccessError("The company database is unavailable.", 503);
  return Object.freeze({
    async all(sql, ...params) {
      assertReadOnlySql(sql);
      const result = await d1.prepare(sql).bind(...params).all();
      return result?.results ?? [];
    },
  });
}

export function isMissingTable(error) {
  return /no such table/i.test(error instanceof Error ? error.message : String(error));
}
