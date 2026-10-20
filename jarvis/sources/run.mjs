// Shared by every database source: runs a list of independent queries, turns the rows into items, and reports
// honestly when some or all of them could not be read ("ok", "partial", "error", or "empty" when the tables do not exist yet).

import { isMissingTable } from "../readonly-db.mjs";

export async function runQueries(reader, queries, args) {
  const settled = await Promise.allSettled(queries.map(async (query) => (await reader.all(query.sql, ...query.params(args))).map((row) => query.item(row, args))));
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

// Parameter helpers: most queries take (sinceISO, limit); schedule queries take a date range.
export const sinceAndLimit = ({ sinceISO, limit }) => [sinceISO, limit];
