import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const store = await readFile(new URL("../db/task-store.ts", import.meta.url), "utf8");
const managementApi = await readFile(new URL("../app/api/tasks/manage/route.ts", import.meta.url), "utf8");
const personalApi = await readFile(new URL("../app/api/tasks/route.ts", import.meta.url), "utf8");
const owner = await readFile(new URL("../app/owner/OwnerDashboard.tsx", import.meta.url), "utf8");
const admin = await readFile(new URL("../app/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const supervisor = await readFile(new URL("../app/site-supervisor/SiteSupervisor.tsx", import.meta.url), "utf8");
const worker = await readFile(new URL("../app/worker/WorkerDashboard.tsx", import.meta.url), "utf8");
const manager = await readFile(new URL("../app/team/workspace/page.tsx", import.meta.url), "utf8");

test("Owner has separate operational and management task controls", () => {
  assert.match(owner, /Team task centre/);
  assert.match(owner, /Admin & Manager tasks/);
  assert.match(owner, /scope="operations"/);
  assert.match(owner, /scope="management"/);
});

test("Admin can assign operational tasks but has no management task section", () => {
  assert.match(admin, /Team task centre/);
  assert.match(admin, /scope="operations"/);
  assert.doesNotMatch(admin, /scope="management"/);
  assert.match(store, /Admin can assign tasks only to Site Supervisors and trade Workers/);
  assert.match(store, /Only Owner can control Admin and Manager tasks/);
});

test("task assignees see only their own records and can update only their own status", () => {
  assert.match(store, /WHERE LOWER\(task\.assignee_email\)=\?/);
  assert.match(store, /WHERE id=\? AND LOWER\(assignee_email\)=\?/);
  assert.match(personalApi, /setPersonalTaskStatus\(identity\.email/);
  assert.match(personalApi, /requestIsSameOrigin/);
});

test("Site Supervisor, Worker, Admin and Manager workspaces expose assigned tasks", () => {
  assert.match(supervisor, /TaskInbox role="Site Supervisor"/);
  assert.match(worker, /TaskInbox role="Worker"/);
  assert.match(admin, /TaskInbox role="Admin"/);
  assert.match(manager, /TaskInbox role=\{session\.role\}/);
});

test("task management is restricted to Owner and Admin sessions", () => {
  assert.match(managementApi, /ownerSessionFromRequest/);
  assert.match(managementApi, /staff\?\.role === "Admin"/);
  assert.match(managementApi, /Owner or Admin sign-in required/);
});
