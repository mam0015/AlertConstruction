// The work itself: requests and projects (where each one stands and what changed), inspections and change proposals.
// Customer phone numbers and emails are not selected; Jarvis needs the name, the place and what the job is.

import { makeItem } from "../briefing.mjs";
import { runQueries, sinceAndLimit } from "./run.mjs";

const SOURCE = "work";
const label = (value) => String(value ?? "").replaceAll("_", " ");

const queries = [
  {
    name: "new_requests",
    sql: `SELECT id, request_code AS requestCode, project_code AS projectCode, customer_name AS customerName, service, suburb, description, timeframe, budget,
        stage, assigned_supervisor_name AS supervisor, created_at AS at
      FROM workflow_cases WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `case:${row.id}`, source: SOURCE, kind: "new_request", at: row.at,
      title: `New request ${row.requestCode} — ${row.customerName}`, who: row.customerName, project: row.projectCode || row.requestCode,
      body: `${row.service} in ${row.suburb || "an unknown suburb"}. ${row.description} Timeframe: ${row.timeframe || "not given"}. Budget: ${row.budget || "not given"}. Stage: ${label(row.stage)}.${row.supervisor ? ` Supervisor: ${row.supervisor}.` : ""}`,
    }),
  },
  {
    name: "case_events",
    sql: `SELECT e.id AS id, e.actor_role AS actorRole, e.actor_email AS actorEmail, e.event_type AS eventType, e.title AS title, e.detail AS detail,
        e.created_at AS at, c.project_code AS projectCode, c.request_code AS requestCode, c.customer_name AS customerName
      FROM workflow_events e LEFT JOIN workflow_cases c ON c.id = e.case_id
      WHERE e.created_at >= ? ORDER BY e.created_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `event:${row.id}`, source: SOURCE, kind: "case_event", at: row.at,
      title: `${row.title}${row.customerName ? ` — ${row.customerName}` : ""}`, who: row.actorEmail || row.actorRole, project: row.projectCode || row.requestCode,
      body: `${row.actorRole}: ${label(row.eventType)}. ${row.detail}`,
    }),
  },
  {
    name: "project_changes",
    sql: `SELECT id, code, name, service, stage, progress, customer_name AS customerName, suburb, notes, updated_at AS at
      FROM projects WHERE updated_at >= ? ORDER BY updated_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `project:${row.id}`, source: SOURCE, kind: "project", at: row.at,
      title: `Project ${row.code} — ${row.name}`, who: row.customerName, project: row.code,
      body: `${row.service} in ${row.suburb || "an unknown suburb"}. Stage: ${row.stage}. ${row.progress}% complete. ${row.notes}`,
    }),
  },
  {
    name: "change_proposals",
    sql: `SELECT p.id AS id, p.title AS title, p.detail AS detail, p.status AS status, p.customer_reply AS reply, p.created_at AS at,
        c.project_code AS projectCode, c.customer_name AS customerName
      FROM change_proposals p LEFT JOIN workflow_cases c ON c.id = p.case_id
      WHERE p.created_at >= ? ORDER BY p.created_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `change:${row.id}`, source: SOURCE, kind: "change_proposal", at: row.at,
      title: `Change proposal (${row.status}) — ${row.title}`, who: row.customerName, project: row.projectCode,
      body: `${row.detail}${row.reply ? ` Customer replied: ${row.reply}` : ""}`,
    }),
  },
  {
    name: "inspections",
    sql: `SELECT q.id AS id, q.supervisor_email AS supervisorEmail, q.summary AS summary, q.defects AS defects, q.status AS status,
        q.submitted_at AS at, c.project_code AS projectCode, c.customer_name AS customerName
      FROM quality_inspections q LEFT JOIN workflow_cases c ON c.id = q.case_id
      WHERE q.submitted_at >= ? ORDER BY q.submitted_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `inspection:${row.id}`, source: SOURCE, kind: "inspection", at: row.at,
      title: `Quality inspection (${row.status}) — ${row.customerName || row.projectCode}`, who: row.supervisorEmail, project: row.projectCode,
      body: `${row.summary}${row.defects ? ` Defects: ${row.defects}` : ""}`,
      extraFlags: row.defects ? ["defect"] : [],
    }),
  },
];

export const readWork = (reader, window) => runQueries(reader, queries, window);
