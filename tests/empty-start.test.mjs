// A new company must start with nothing in it: no demo projects, no sample people, no leftover records.
// The only rows allowed are the app's own settings (the Owner login from the private settings, the Team Code, sign-in throttling, bookkeeping).
import assert from "node:assert/strict";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

delete process.env.ATP_DEMO_SEED;
const app = await startWorker("empty");

const SETTINGS_TABLES = new Set(["app_migrations", "owner_accounts", "owner_env_seed", "rate_limits", "team_access_settings"]);

function rowCounts() {
  const tables = app.d1.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return Object.fromEntries(tables.map(({ name }) => [name, app.d1.sqlite.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n]));
}

test("every Owner screen is empty on a brand new database and nothing demo-like is written", async () => {
  const owner = await app.ownerCookie();
  const read = async (path) => {
    const response = await app.request(path, { headers: { cookie: owner } });
    assert.equal(response.status, 200, path);
    const body = await response.json();
    return body.data ?? body;
  };

  const company = await read("/api/owner/data");
  for (const key of ["projects", "financeEntries", "scheduleEvents", "eodReports", "messages", "staffRequests"]) assert.deepEqual(company[key], [], `owner ${key}`);
  const workflow = await read("/api/workflow");
  for (const key of ["cases", "events", "supervisors"]) assert.deepEqual(workflow[key], [], `workflow ${key}`);
  const admin = await read("/api/admin/data");
  for (const key of ["projects", "requests", "scheduleEvents", "messages"]) assert.deepEqual(admin[key], [], `admin ${key}`);
  await read("/api/owner/settings");

  const counts = rowCounts();
  const unexpected = Object.entries(counts).filter(([table, n]) => n > 0 && !SETTINGS_TABLES.has(table));
  assert.deepEqual(unexpected, [], "no business records may exist before the company adds them");
  assert.equal(counts.owner_accounts, 1, "only the Owner from the private settings");
});

test("the deploy never writes records, and demo data is off in production", async () => {
  const { readFileSync } = await import("node:fs");
  const deploy = readFileSync(new URL("../scripts/deploy-cloudflare.mjs", import.meta.url), "utf8");
  // wrangler is only ever asked to create the bucket/database or read table names, never to insert, update or delete rows.
  const sql = [...deploy.matchAll(/"--command",\s*\n?\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(sql.length >= 1);
  for (const statement of sql) assert.match(statement, /^SELECT /i);
  assert.ok(!/\b(INSERT|UPDATE|DELETE|DROP)\b/i.test(sql.join(" ")));
  assert.ok(!/d1["'],\s*["']execute["'][^)]*--file/.test(deploy), "no SQL file is loaded into the database");
  assert.match(deploy, /values\.ATP_DEMO_SEED = "false"/);
});
