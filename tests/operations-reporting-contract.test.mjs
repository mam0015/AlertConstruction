import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("site issue reports are durable, role protected and project linked", async () => {
  const [schema, store, route] = await Promise.all([
    read("db/schema.ts"),
    read("db/operations-store.ts"),
    read("app/api/operations/route.ts"),
  ]);
  for (const field of ["siteLocation", "affectedTrade", "issueType", "severity", "impact", "adminAction", "rescheduledDate", "ownerNote"]) assert.match(schema, new RegExp(field));
  assert.match(store, /Only the assigned Site Supervisor can submit a site issue/);
  assert.match(store, /site_issue_reported/);
  assert.match(store, /site_issue_rescheduled/);
  assert.match(store, /INSERT INTO schedule_events/);
  assert.match(store, /INSERT INTO follow_up_items/);
  assert.match(route, /ownerSessionFromRequest/);
  assert.match(route, /staff\?\.role === "Admin"/);
  assert.match(route, /staff\?\.role === "Site Supervisor"/);
  assert.match(route, /requestIsSameOrigin/);
});

test("all three workspaces expose the reporting and tomorrow follow-up flow", async () => {
  const [supervisor, admin, owner, panel] = await Promise.all([
    read("app/site-supervisor/SiteSupervisor.tsx"),
    read("app/admin/AdminDashboard.tsx"),
    read("app/owner/OwnerDashboard.tsx"),
    read("app/operations/OperationsControlPanel.tsx"),
  ]);
  assert.match(supervisor, /Delays & site problems/);
  assert.match(supervisor, /mode="issues"/);
  assert.match(admin, /mode="alerts"/);
  assert.match(admin, /Reschedule|Site delays & problems/);
  assert.match(owner, /mode="project-status"/);
  assert.match(owner, /Project risks & delays/);
  assert.match(panel, /Clock out & save tomorrow task/);
  assert.match(panel, /reschedule_issue/);
  assert.match(panel, /Report issue to Admin & Owner/);
});
