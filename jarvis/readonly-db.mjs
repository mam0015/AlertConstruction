// Read-only database access for Jarvis.
//
// Every query Jarvis runs passes through assertReadOnlySql(): one SELECT statement, no write/DDL keywords,
// explicit column lists (no SELECT *), and only tables on the allow-list below. Even if a future change tried to
// point Jarvis at finance, owner accounts or staff passwords, this guard would refuse the query.

import { JarvisAccessError } from "./policy.mjs";

// Tables Jarvis may read. workflow_cases is only joined to label a report with its request/project code.
export const READABLE_TABLES = Object.freeze([
  "eod_reports",
  "worker_reports",
  "project_updates",
  "site_visit_reports",
  "site_issue_reports",
  "customer_messages",
  "team_messages", // only the customer rows (sender 'Customer · <code>'); the query itself filters on that
  "workflow_cases",
]);

const WRITE_WORDS = /\b(insert|update|delete|drop|alter|create|replace|truncate|pragma|attach|detach|vacuum|reindex|grant|revoke)\b/i;

function withoutLiterals(sql) {
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}

export function assertReadOnlySql(sql) {
  const text = withoutLiterals(String(sql).replace(/\s+/g, " ").trim());
  if (!/^select\b/i.test(text)) throw new JarvisAccessError("Jarvis can only read data.", 500);
  if (text.includes(";")) throw new JarvisAccessError("Jarvis runs one statement at a time.", 500);
  if (text.includes("--") || text.includes("/*")) throw new JarvisAccessError("Comments are not allowed in Jarvis queries.", 500);
  if (WRITE_WORDS.test(text)) throw new JarvisAccessError("Jarvis can only read data.", 500);
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
