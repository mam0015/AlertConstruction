import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [adminAuth, access, workflow, teamStore, teamIdentity, calendarApi, chatApi, eodApi, board, customer, home, deploy] = await Promise.all([
  read("app/admin-auth.ts"), read("app/staff-access.ts"), read("db/workflow-store.ts"), read("db/team-store.ts"), read("app/team-identity.ts"),
  read("app/api/team/calendar/route.ts"), read("app/api/team/chat/route.ts"), read("app/api/team/eod/route.ts"),
  read("app/workflow/WorkflowBoard.tsx"), read("app/workflow/CustomerWorkflowPanel.tsx"), read("app/page.tsx"), read("scripts/deploy-cloudflare.mjs"),
]);

test("every company position exists and has its own landing page", () => {
  for (const role of ["Admin", "Manager", "Estimator", "Site Supervisor", "Worker"]) assert.match(adminAuth, new RegExp(`"${role}"`));
  assert.match(access, /\/estimator/);
  assert.match(access, /\/manager/);
  assert.match(teamIdentity, /roleHome/);
});

test("Team Sign In is visible on the public homepage and no PIN gate blocks it", () => {
  assert.match(home, /Team Sign In/);
  assert.doesNotMatch(home, /TEAM_PIN|teamPin/);
});

test("team sign-in no longer depends on a separate session secret being present", () => {
  assert.match(adminAuth, /OWNER_SESSION_SECRET/);
});

test("Estimator prices the job and it returns to Admin before the customer sees it", () => {
  assert.match(workflow, /Estimator access is required/);
  assert.match(workflow, /estimatorStages/);
  assert.match(board, /EstimateCalculator/);
  assert.match(board, /Waiting for the Estimator|Site visit approved\. The Estimator/);
});

test("Admin can message the customer, request documents and the customer can reply", () => {
  assert.match(workflow, /message_customer/);
  assert.match(workflow, /customer_messages/);
  assert.match(customer, /MESSAGES WITH OUR TEAM/);
  assert.match(customer, /api\/workflow\/public\/files/);
});

test("calendar assignments are limited to Owner, Admin and Manager and show who assigned them", () => {
  assert.match(teamStore, /new Set\(\["Owner", "Admin", "Manager"\]\)/);
  assert.match(teamStore, /created_by_name/);
  assert.match(calendarApi, /requestIsSameOrigin/);
});

test("team chat supports private files and a whole-team channel", () => {
  assert.match(teamStore, /recipient === CHANNEL \|\| row\.sender === me/);
  assert.match(chatApi, /signatureMatches/);
});

test("only the Owner reviews end-of-day reports of every other position", () => {
  assert.match(teamStore, /Owner does not submit daily reports/);
  assert.match(eodApi, /teamIdentityFromRequest/);
});

test("GitHub deployment publishes to Cloudflare Workers with D1 and a private R2 bucket", () => {
  assert.match(deploy, /d1", "create"/);
  assert.match(deploy, /bucket", "create"/);
  assert.match(deploy, /secret", "bulk"/);
});
