// Client comments: messages customers send about their request or project. Read-only.
// Customer email/phone numbers are not selected — Jarvis only needs the name, the project and what they said.

import { makeItem } from "../briefing.mjs";
import { runQueries, sinceAndLimit } from "./run.mjs";

const SOURCE = "client_comments";

const queries = [
  {
    name: "project_message",
    params: sinceAndLimit,
    sql: `SELECT m.id AS id, m.sender_label AS customerName, m.body AS body, m.created_at AS at,
        c.project_code AS projectCode
      FROM customer_messages m LEFT JOIN workflow_cases c ON c.id = m.case_id
      WHERE m.sender = 'Customer' AND m.created_at >= ? ORDER BY m.created_at DESC LIMIT ?`,
    item: (row) => makeItem({
      id: `comment:${row.id}`, source: SOURCE, kind: "customer_message", at: row.at,
      title: `Comment from ${row.customerName || "a customer"}`, who: row.customerName || "Customer", project: row.projectCode, body: row.body,
    }),
  },
  {
    // Messages sent from the public tracking page are stored in team_messages as "Customer · <code>".
    name: "tracking_page_message",
    params: sinceAndLimit,
    sql: `SELECT id, sender, body, sent_at AS at FROM team_messages
      WHERE sender LIKE 'Customer · %' AND sent_at >= ? ORDER BY sent_at DESC LIMIT ?`,
    item: (row) => {
      const [subject = "", ...rest] = String(row.body ?? "").split("\n");
      return makeItem({
        id: `tracking:${row.id}`, source: SOURCE, kind: "tracking_message", at: row.at,
        title: `Comment: ${subject}`, who: "Customer", project: String(row.sender).replace(/^Customer · /, ""), body: rest.join(" ") || subject,
      });
    },
  },
];

export const readClientComments = (reader, window) => runQueries(reader, queries, window);
