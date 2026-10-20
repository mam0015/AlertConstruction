// The team: people who asked for access and what the Owner decided. The password column is never selected (and the guard refuses it).

import { makeItem } from "../briefing.mjs";
import { runQueries, sinceAndLimit } from "./run.mjs";

const SOURCE = "people";

const queries = [
  {
    name: "access_requests",
    sql: `SELECT id, email, status, role, trade_title AS tradeTitle, requested_at AS at
      FROM staff_access_requests WHERE requested_at >= ? ORDER BY requested_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `access:${row.id}`, source: SOURCE, kind: "access_request", at: row.at,
      title: `${row.status === "Pending" ? "Access request waiting" : `Access ${String(row.status).toLowerCase()}`} — ${row.email}`, who: row.email,
      body: `Role: ${row.role}. ${row.tradeTitle ? `Trade: ${row.tradeTitle}.` : ""}`,
      extraFlags: row.status === "Pending" ? ["needs_decision"] : [],
    }),
  },
];

export const readPeople = (reader, window) => runQueries(reader, queries, window);
