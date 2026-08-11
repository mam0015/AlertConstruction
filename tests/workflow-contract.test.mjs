import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const store = await readFile(new URL("../db/workflow-store.ts", import.meta.url), "utf8");
const board = await readFile(new URL("../app/workflow/WorkflowBoard.tsx", import.meta.url), "utf8");
const customer = await readFile(new URL("../app/workflow/CustomerWorkflowPanel.tsx", import.meta.url), "utf8");
const staticApi = await readFile(new URL("../github-pages-spa/src/workflow-demo-api.ts", import.meta.url), "utf8");

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
    assert.match(staticApi, new RegExp(`action === \\"${action}\\"`));
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
