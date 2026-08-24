import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public and application source contains no embedded personal credential", async () => {
  const sources = await Promise.all([
    "app/page.tsx",
    "app/owner/OwnerDashboard.tsx",
    "app/operations/OperationsControlPanel.tsx",
    "db/owner-store.ts",
  ].map(read));
  const joined = sources.join("\n");
  assert.doesNotMatch(joined, /gmail\.com|outlook\.com|yahoo\.com|Ali Mobini|Morning Ali/i);
  assert.doesNotMatch(joined, /(?:localStorage|sessionStorage).*?(?:auth|session|token|password)/i);
});

test("one sign-in form handles Owner and Team without MFA or a separate Owner link", async () => {
  const [home, auth, teamRoute, ownerPage] = await Promise.all([
    read("app/page.tsx"),
    read("app/owner-auth.ts"),
    read("app/api/team/login/route.ts"),
    read("app/owner/page.tsx"),
  ]);
  assert.match(home, /Email \/ username/);
  assert.match(home, /Password/);
  assert.match(home, /Team Code/);
  assert.match(home, /There is no separate Owner button/);
  assert.doesNotMatch(home, /Open separate Owner sign in/);
  assert.match(teamRoute, /verifyOwnerPassword/);
  assert.match(teamRoute, /redirect: "\/owner"/);
  assert.match(ownerPage, /redirect\("\/#team-sign-in"\)/);
  assert.match(auth, /HttpOnly; SameSite=Strict/);
  assert.doesNotMatch(`${home}\n${auth}\n${teamRoute}`, /MFA|TOTP|Authenticator|one-time-code|6-digit/i);
});

test("new Team accounts need Team Code once and approved roles remain database authoritative", async () => {
  const [auth, staffAccess, settings, notification] = await Promise.all([
    read("app/admin-auth.ts"),
    read("app/staff-access.ts"),
    read("db/access-settings-store.ts"),
    read("app/team-access-notification.ts"),
  ]);
  assert.match(staffAccess, /if \(!existing\)/);
  assert.match(staffAccess, /verifyCompanyTeamCode\(teamCode\)/);
  assert.match(staffAccess, /existing\.role/);
  assert.match(auth, /current\.status !== "Approved"/);
  assert.match(settings, /team_access_settings/);
  assert.match(settings, /rotateTeamCode/);
  assert.match(staffAccess, /notifyOwnerOfStaffRequest/);
  assert.match(notification, /OWNER_EMAIL/);
  assert.match(notification, /Owner → Access requests/);
});

test("password hashing stays inside the Cloudflare Workers PBKDF2 limit and migrates legacy records", async () => {
  const [secrets, settings, setup] = await Promise.all([
    read("app/secret-utils.ts"),
    read("db/access-settings-store.ts"),
    read("scripts/security-setup.mjs"),
  ]);
  assert.match(secrets, /PBKDF2_ITERATIONS = 100_000/);
  assert.doesNotMatch(`${secrets}\n${setup}`, /600_000|600000/);
  assert.match(settings, /pbkdf2Iterations\(storedOwner\.passwordHash\)/);
  assert.match(settings, /hashPbkdf2\(existing\.teamCode\)/);
});

test("Owner settings provide real Team Code, email and password management", async () => {
  const [panel, route] = await Promise.all([
    read("app/owner/OwnerSettingsPanel.tsx"),
    read("app/api/owner/settings/route.ts"),
  ]);
  assert.match(panel, /Reset Team Code/);
  assert.match(panel, /Owner email/);
  assert.match(panel, /Reset password/);
  assert.match(panel, /Manage employees/);
  assert.match(route, /updateOwnerProfile/);
  assert.match(route, /updateOwnerPassword/);
  assert.match(route, /rotateTeamCode/);
  assert.match(route, /ownerSessionFromRequest/);
});

test("legacy demonstration records are removed once and no seed routine remains", async () => {
  const ownerStore = await read("db/owner-store.ts");
  assert.match(ownerStore, /remove_seed_records_v72/);
  assert.match(ownerStore, /DELETE FROM projects/);
  assert.doesNotMatch(ownerStore, /seedOwnerDatabase/);
});

test("production task clients never substitute static demonstration records", async () => {
  const [management, inbox] = await Promise.all([
    read("app/tasks/TaskManagementPanel.tsx"),
    read("app/tasks/TaskInbox.tsx"),
  ]);
  assert.doesNotMatch(`${management}\n${inbox}`, /staticGithubPage|demoSnapshot|demoInbox|@alerttradiepro\.demo/);
  assert.match(management, /Task centre could not be loaded/);
  assert.match(inbox, /Your tasks could not be loaded/);
});

test("customer references are high entropy and tracking cannot enumerate public project codes", async () => {
  const store = await read("db/workflow-store.ts");
  assert.match(store, /crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
  assert.match(store, /request_consents/);
  assert.doesNotMatch(store, /WHERE UPPER\(wc\.request_code\)=\? OR UPPER\(wc\.project_code\)=\?/);
  assert.doesNotMatch(store, /WHERE UPPER\(request_code\)=\? OR UPPER\(project_code\)=\?/);
});

test("uploads reject active content and verify image signatures", async () => {
  const route = await read("app/api/workflow/files/route.ts");
  assert.match(route, /safeImageTypes/);
  assert.match(route, /imageSignatureMatches/);
  assert.doesNotMatch(route, /image\/svg\+xml/);
  assert.match(route, /\["site_visit", "progress", "quality", "document"\]/);
  assert.match(route, /category === "document" && !\["admin", "owner"\]\.includes\(identity\.role\)/);
});

test("security headers and controlled quality-to-completion lifecycle are present", async () => {
  const worker = await read("worker/index.ts");
  const workflow = await read("db/workflow-store.ts");
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /Strict-Transport-Security/);
  assert.match(worker, /X-Frame-Options/);
  for (const action of ["submit_quality_inspection", "review_quality_inspection", "complete_project"]) assert.match(workflow, new RegExp(action));
  assert.match(workflow, /stage='complete'/);
  assert.match(workflow, /progress=100/);
});
