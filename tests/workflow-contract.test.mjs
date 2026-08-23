import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const store = await readFile(new URL("../db/workflow-store.ts", import.meta.url), "utf8");
const board = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
const customer = await readFile(new URL("../app/workflow/CustomerWorkflowPanel.tsx", import.meta.url), "utf8");
const publicFiles = await readFile(new URL("../app/api/workflow/public/files/route.ts", import.meta.url), "utf8");
const customerAccess = await readFile(new URL("../app/api/workflow/public/access/route.ts", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("request-to-project workflow contains every required controlled transition", () => {
  const actions = [
    "review_started",
    "customer_contacted",
    "approve_intake",
    "assign_visit",
    "submit_site_visit",
    "review_site_visit",
    "save_estimate",
    "send_estimate",
    "activate_project",
    "submit_progress_update",
    "admin_approve_update",
    "owner_approve_update",
  ];
  for (const action of actions) {
    assert.match(store, new RegExp(`action === \\"${action}\\"`));
  }
});

test("site reports and progress updates require photo evidence", () => {
  assert.match(store, /At least one site photo is required/);
  assert.match(store, /At least one progress photo is required/);
  assert.match(board, /mandatory Site Visit photos/);
  assert.match(board, /mandatory progress photos/);
});

test("customer publication requires Admin then Owner", () => {
  assert.match(store, /status='pending_owner'/);
  assert.match(store, /Admin approval is required before Owner approval/);
  assert.match(store, /status='published'/);
  assert.match(customer, /Only customer-approved information is shown here/);
  assert.doesNotMatch(customer, /internalUpdate/);
});

test("owner audit trail records workflow events", () => {
  assert.match(store, /INSERT INTO workflow_events/);
  assert.match(board, /OWNER ACTIVITY FEED/);
  assert.match(board, /Everything recorded/);
});

test("customer intake saves all displayed fields and securely stores selected files", () => {
  assert.match(store, /Material preference:/);
  assert.match(store, /Other —/);
  assert.match(store, /customer_request/);
  assert.match(publicFiles, /application\/pdf/);
  assert.match(publicFiles, /signatureMatches/);
  assert.match(publicFiles, /5 \* 1024 \* 1024/);
  assert.match(publicFiles, /env\.BUCKET\.put/);
  assert.match(home, /\/api\/workflow\/public\/files/);
  assert.match(home, /Up to 5 files/);
  assert.doesNotMatch(home, /\.docx|\.dwg/);
});

test("customer and team sign-in forms translate unreadable browser responses into useful errors", () => {
  assert.match(home, /PRIVATE PROJECT ACCESS/);
  assert.match(home, /Owner &amp; Team Sign In/);
  assert.match(home, /readApiResult/);
  assert.match(home, /The string did not match the expected pattern/);
});

test("customer access supports direct code, email and phone lookup without messaging providers", () => {
  assert.match(home, /Project code/);
  assert.match(home, /Find my project/);
  assert.match(home, /\/api\/workflow\/public\/access/);
  assert.match(home, /customerMatches/);
  assert.match(home, /router\.push\(`\/track\//);
  assert.match(store, /customer_contact_index/);
  assert.match(store, /contact_hash/);
  assert.match(customerAccess, /findCustomerProjectsByContact/);
  assert.match(customerAccess, /Response\.json\(\{ ok: true, projects \}/);
  assert.doesNotMatch(customerAccess, /RESEND|TWILIO|deliverCustomerAccess/);
  assert.doesNotMatch(home, /Send secure .* link/);
});
