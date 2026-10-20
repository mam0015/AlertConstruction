// Money: recent income/expense entries and what each project is worth and still owes. Read-only.

import { makeItem } from "../briefing.mjs";
import { runQueries, sinceAndLimit } from "./run.mjs";

const SOURCE = "finance";
const money = (value) => `$${Number(value ?? 0).toLocaleString("en-AU")}`;

const queries = [
  {
    name: "finance_entries",
    sql: `SELECT id, type, category, project_code AS projectCode, amount, entry_date AS entryDate, note, created_at AS at
      FROM finance_entries WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `fin:${row.id}`, source: SOURCE, kind: "finance_entry", at: row.at,
      title: `${row.type} ${money(row.amount)} — ${row.category}`, project: row.projectCode, body: `${row.entryDate}. ${row.note}`,
    }),
  },
  {
    // Balances are a snapshot, not an event; they are dated by the project's last change so they appear in the same window.
    name: "project_balances",
    sql: `SELECT id, code, name, contract_value AS contractValue, balance, updated_at AS at
      FROM projects WHERE updated_at >= ? AND (contract_value > 0 OR balance > 0) ORDER BY updated_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `bal:${row.id}`, source: SOURCE, kind: "project_balance", at: row.at,
      title: `Project ${row.code} money — ${row.name}`, project: row.code,
      body: `Contract value ${money(row.contractValue)}. Balance still to collect ${money(row.balance)}.`,
      extraFlags: Number(row.balance) > 0 ? ["balance_owing"] : [],
    }),
  },
];

export const readFinance = (reader, window) => runQueries(reader, queries, window);
