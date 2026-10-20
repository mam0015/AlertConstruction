// Tasks and follow-ups: who was asked to do what, and what is still open.

import { makeItem } from "../briefing.mjs";
import { runQueries, sinceAndLimit } from "./run.mjs";

const SOURCE = "tasks";

const queries = [
  {
    name: "team_tasks",
    sql: `SELECT t.id AS id, t.assignee_email AS assignee, t.assignee_title AS assigneeTitle, t.title AS title, t.instructions AS instructions, t.priority AS priority,
        t.status AS status, t.created_by_role AS createdBy, t.updated_at AS at, c.project_code AS projectCode
      FROM team_tasks t LEFT JOIN workflow_cases c ON c.id = t.case_id
      WHERE t.updated_at >= ? ORDER BY t.updated_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `task:${row.id}`, source: SOURCE, kind: "task", at: row.at,
      title: `Task (${String(row.status).replaceAll("_", " ")}) — ${row.title}`, who: row.assignee, project: row.projectCode,
      body: `${row.assigneeTitle}, priority ${row.priority}. ${row.instructions} Given by ${row.createdBy}.`,
      extraFlags: row.priority === "Urgent" && row.status !== "completed" ? ["urgent"] : [],
    }),
  },
  {
    name: "worker_tasks",
    sql: `SELECT t.id AS id, t.worker_email AS worker, t.title AS title, t.instructions AS instructions, t.status AS status, t.updated_at AS at, c.project_code AS projectCode
      FROM worker_tasks t LEFT JOIN workflow_cases c ON c.id = t.case_id
      WHERE t.updated_at >= ? ORDER BY t.updated_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `wtask:${row.id}`, source: SOURCE, kind: "worker_task", at: row.at,
      title: `Worker task (${String(row.status).replaceAll("_", " ")}) — ${row.title}`, who: row.worker, project: row.projectCode, body: row.instructions,
    }),
  },
  {
    name: "follow_ups",
    sql: `SELECT id, person_name AS personName, person_email AS personEmail, project_code AS projectCode, title, details, target_date AS targetDate, status, updated_at AS at
      FROM follow_up_items WHERE updated_at >= ? ORDER BY updated_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `follow:${row.id}`, source: SOURCE, kind: "follow_up", at: row.at,
      title: `Follow-up (${row.status}) — ${row.title}`, who: row.personName || row.personEmail, project: row.projectCode,
      body: `${row.details} Target date: ${row.targetDate}.`,
    }),
  },
];

export const readTasks = (reader, window) => runQueries(reader, queries, window);
