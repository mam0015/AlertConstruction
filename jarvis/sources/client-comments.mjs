// Client comments: messages customers send about their request or project. Read-only.
// Customer email/phone numbers are not selected — Jarvis only needs the name, the project and what they said.

import { makeItem } from "../briefing.mjs";
import { isMissingTable } from "../readonly-db.mjs";

const SOURCE = "client_comments";

const queries = [
  {
    name: "project_message",
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

export async function readClientComments(reader, { sinceISO, limit }) {
  const settled = await Promise.allSettled(queries.map(async (query) => (await reader.all(query.sql, sinceISO, limit)).map(query.item)));
  const items = [];
  let failed = 0;
  let missing = 0;
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") items.push(...result.value);
    else if (isMissingTable(result.reason)) missing += 1;
    else {
      failed += 1;
      console.error(`Jarvis could not read ${queries[index].name}:`, result.reason instanceof Error ? result.reason.message : result.reason);
    }
  });
  const status = failed === settled.length ? "error" : failed > 0 ? "partial" : missing === settled.length ? "empty" : "ok";
  return { status, items };
}
