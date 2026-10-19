// Employee updates: the reports staff submit. Read-only, explicit columns, owner-visible fields only.
// Private team chat and direct messages are deliberately NOT included.

import { hasRealIssue, makeItem } from "../briefing.mjs";
import { isMissingTable } from "../readonly-db.mjs";

const SOURCE = "employee_updates";

const queries = [
  {
    name: "end_of_day",
    sql: `SELECT id, person, role, project_code AS projectCode, summary, submitted_at AS at, status
      FROM eod_reports WHERE submitted_at >= ? ORDER BY submitted_at DESC LIMIT ?`,
    item: (row) => makeItem({
      id: `eod:${row.id}`, source: SOURCE, kind: "end_of_day", at: row.at,
      title: `End-of-day report — ${row.person}`, who: row.person, project: row.projectCode, body: row.summary,
    }),
  },
  {
    name: "worker_report",
    sql: `SELECT r.id AS id, r.worker_email AS workerEmail, r.completed_work AS completedWork, r.next_step AS nextStep,
        r.issues_delays AS issuesDelays, r.submitted_at AS at, c.request_code AS requestCode, c.project_code AS projectCode
      FROM worker_reports r LEFT JOIN workflow_cases c ON c.id = r.case_id
      WHERE r.submitted_at >= ? ORDER BY r.submitted_at DESC LIMIT ?`,
    item: (row) => makeItem({
      id: `worker:${row.id}`, source: SOURCE, kind: "worker_report", at: row.at,
      title: `Worker report — ${row.workerEmail}`, who: row.workerEmail, project: row.projectCode || row.requestCode,
      body: `Done: ${row.completedWork} Next: ${row.nextStep}${hasRealIssue(row.issuesDelays) ? ` Issues: ${row.issuesDelays}` : ""}`,
      extraFlags: hasRealIssue(row.issuesDelays) ? ["issue_reported"] : [],
    }),
  },
  {
    name: "supervisor_update",
    sql: `SELECT u.id AS id, u.supervisor_email AS supervisorEmail, u.internal_update AS internalUpdate, u.created_at AS at,
        c.request_code AS requestCode, c.project_code AS projectCode
      FROM project_updates u LEFT JOIN workflow_cases c ON c.id = u.case_id
      WHERE u.created_at >= ? ORDER BY u.created_at DESC LIMIT ?`,
    item: (row) => makeItem({
      id: `update:${row.id}`, source: SOURCE, kind: "supervisor_update", at: row.at,
      title: `Supervisor update — ${row.supervisorEmail}`, who: row.supervisorEmail, project: row.projectCode || row.requestCode, body: row.internalUpdate,
    }),
  },
  {
    name: "site_visit",
    sql: `SELECT s.id AS id, s.supervisor_email AS supervisorEmail, s.summary AS summary, s.findings AS findings,
        s.recommendations AS recommendations, s.submitted_at AS at, c.request_code AS requestCode, c.project_code AS projectCode
      FROM site_visit_reports s LEFT JOIN workflow_cases c ON c.id = s.case_id
      WHERE s.submitted_at >= ? ORDER BY s.submitted_at DESC LIMIT ?`,
    item: (row) => makeItem({
      id: `visit:${row.id}`, source: SOURCE, kind: "site_visit", at: row.at,
      title: `Site visit — ${row.supervisorEmail}`, who: row.supervisorEmail, project: row.projectCode || row.requestCode,
      body: `${row.summary} Findings: ${row.findings} Recommendations: ${row.recommendations}`,
    }),
  },
  {
    name: "site_issue",
    sql: `SELECT id, project_code AS projectCode, site_location AS siteLocation, issue_type AS issueType, severity, summary, details,
        impact, reporter_name AS reporterName, status, reported_at AS at
      FROM site_issue_reports WHERE reported_at >= ? ORDER BY reported_at DESC LIMIT ?`,
    item: (row) => makeItem({
      id: `issue:${row.id}`, source: SOURCE, kind: "site_issue", at: row.at,
      title: `Site issue (${row.severity}) — ${row.issueType}`, who: row.reporterName, project: row.projectCode,
      body: `${row.summary} ${row.details} ${row.impact ? `Impact: ${row.impact}` : ""} Location: ${row.siteLocation}`,
      extraFlags: String(row.status).toLowerCase() === "resolved" ? [] : ["open_site_issue"],
    }),
  },
];

export async function readEmployeeUpdates(reader, { sinceISO, limit }) {
  const settled = await Promise.allSettled(queries.map(async (query) => (await reader.all(query.sql, sinceISO, limit)).map(query.item)));
  const items = [];
  let failed = 0;
  let missing = 0;
  for (const result of settled) {
    if (result.status === "fulfilled") items.push(...result.value);
    else if (isMissingTable(result.reason)) missing += 1;
    else failed += 1;
  }
  const status = failed === settled.length ? "error" : failed > 0 ? "partial" : missing === settled.length ? "empty" : "ok";
  return { status, items };
}
