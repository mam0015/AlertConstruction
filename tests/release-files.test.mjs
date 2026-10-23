// Guards the go-live path: the deploy workflow, the deploy script, the environment template and the code must agree on
// which secrets exist, so a value the app reads can always be set, and a deploy never silently drops one.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const names = (block) => [...block.matchAll(/"([A-Z][A-Z0-9_]+)"/g)].map((match) => match[1]);

const deployScript = read("scripts/deploy-cloudflare.mjs");
const REQUIRED = names(deployScript.match(/const REQUIRED = \[(.*?)\];/s)[1]);
const SECRETS = names(deployScript.match(/const SECRETS = \[(.*?)\];/s)[1]);
const workflow = read(".github/workflows/deploy.yml");
const passed = [...workflow.matchAll(/^\s+([A-Z][A-Z0-9_]+): \$\{\{ secrets\.([A-Z][A-Z0-9_]+) \}\}\s*$/gm)];

test("deploy workflow: exists, has a visible copy, and runs the tests before it deploys", () => {
  assert.ok(existsSync(new URL("../.github/workflows/deploy.yml", import.meta.url)));
  assert.equal(read("docs/deploy-workflow.yml"), workflow, "the visible copy for people whose upload drops hidden folders must match");
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  const testStep = workflow.indexOf("run: npm test");
  assert.ok(testStep > 0 && testStep < workflow.indexOf("run: node scripts/deploy-cloudflare.mjs"), "tests run first, so a failing build is never deployed");
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.ok(!/\bpull_request_target\b/.test(workflow), "secrets are never exposed to pull requests");
});

test("deploy workflow passes exactly the secrets the deploy script can store", () => {
  assert.ok(passed.every(([, name, secret]) => name === secret), "each variable is filled from the secret of the same name");
  const sent = passed.map(([, name]) => name);
  for (const name of [...REQUIRED, ...SECRETS]) assert.ok(sent.includes(name), `${name} is read by the deploy script but the workflow does not pass it`);
  for (const name of sent) assert.ok([...REQUIRED, ...SECRETS].includes(name), `${name} is passed by the workflow but the deploy script ignores it`);
  assert.equal(new Set(sent).size, sent.length, "no secret is listed twice");
  assert.equal(REQUIRED.length, 6);
});

test("every private setting the code reads can be deployed and is documented", () => {
  const template = read("release-docs/ENVIRONMENT-TEMPLATE.txt");
  const jarvisRead = [...read("jarvis/server.ts").matchAll(/process\.env\.(JARVIS_[A-Z_]+)/g)].map((match) => match[1]);
  assert.ok(jarvisRead.length >= 8);
  for (const name of jarvisRead) {
    assert.ok(SECRETS.includes(name), `${name} is read by Jarvis but deploy-cloudflare.mjs cannot set it`);
    assert.ok(template.includes(`${name}=`), `${name} is missing from release-docs/ENVIRONMENT-TEMPLATE.txt`);
  }
  for (const name of REQUIRED.filter((entry) => !entry.startsWith("CLOUDFLARE_"))) assert.ok(template.includes(`${name}=`), `${name} is missing from the environment template`);
});

test("the guides exist in English and Persian and name the real commands and files", () => {
  for (const file of ["docs/GO-LIVE.md", "docs/GO-LIVE-FA.md"]) {
    const text = read(file);
    for (const needle of ["deploy.yml", "security-setup.mjs", "JARVIS_ANTHROPIC_API_KEY", "wrangler d1 export", "npm run verify"]) assert.ok(text.includes(needle), `${file} should mention ${needle}`);
    for (const name of REQUIRED) assert.ok(text.includes(name), `${file} should list the required secret ${name}`);
  }
  const scripts = JSON.parse(read("package.json")).scripts;
  for (const name of ["verify", "typecheck", "lint", "test", "build", "preview:local", "setup:credentials"]) assert.ok(scripts[name], `npm run ${name} exists`);
});

test("the company's own Cloudflare database and bucket are named in one file, and a deploy never creates a second one", () => {
  const resources = JSON.parse(read("cloudflare.resources.json"));
  assert.match(resources.accountId, /^[0-9a-f]{32}$/, "Cloudflare account id");
  assert.match(resources.d1DatabaseId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "D1 database id");
  assert.match(resources.r2Bucket, /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, "R2 bucket name");
  // The documented way to make room is to raise this number, so the test only checks that it is a sensible positive number (8 to start with).
  assert.ok(Number.isFinite(resources.filesLimitGb) && resources.filesLimitGb > 0 && resources.filesLimitGb <= 100_000);
  // Only identifiers live in this file: no keys, passwords or tokens.
  assert.ok(!/token|secret|password|key["']?\s*:/i.test(Object.keys(resources).filter((key) => !key.startsWith("_")).join(" ")));
  assert.ok(!/[A-Za-z0-9_-]{40,}/.test(JSON.stringify(Object.entries(resources).filter(([key]) => !key.startsWith("_")))), "no long secret-looking value");
  // The account id is filled in from the file, so the GitHub secret of that name is optional.
  assert.match(deployScript, /resources\.accountId/);
  assert.match(deployScript, /resources\.d1DatabaseId/);
  assert.match(deployScript, /resources\.r2Bucket/);
  assert.match(deployScript, /db\.uuid === DB_ID/, "an existing database is matched by its id");
  assert.match(deployScript, /was not found in Cloudflare account/, "a missing database stops the deploy instead of creating another");
  assert.ok(deployScript.indexOf("was not found in Cloudflare account") < deployScript.indexOf('"d1", "create"'));
  // A new company starts empty: demo data stays off in production.
  assert.match(deployScript, /values\.ATP_DEMO_SEED = "false"/);
  assert.match(deployScript, /FILES_LIMIT_GB/);
});

test("a Cloudflare token pasted with extra lines or spaces is cleaned instead of breaking the deploy", () => {
  const token = "abcDEF1234567890abcDEF1234567890abcDEF12";
  const run = (value) => spawnSync(process.execPath, ["scripts/deploy-cloudflare.mjs"], {
    cwd: new URL("..", import.meta.url), encoding: "utf8",
    env: { PATH: process.env.PATH, CLOUDFLARE_API_TOKEN: value }, // nothing else is set, so it stops at the "missing secrets" check, before any network call
  });
  for (const pasted of [`${token}\n`, `  ${token}  `, `${token}\ncurl -X GET https://api.cloudflare.com/client/v4/user/tokens/verify`, `\n${token}\n\n`]) {
    const out = run(pasted);
    assert.ok(!/Missing GitHub secrets[^\n]*CLOUDFLARE_API_TOKEN/.test(out.stdout + out.stderr), `the token counts as present: ${JSON.stringify(pasted)}`);
    assert.match(out.stdout + out.stderr, /Missing GitHub secrets/, "it still stops before any network call");
    if (pasted !== token) assert.ok(!/abcDEF1234567890abcDEF1234567890abcDEF12/.test(out.stdout + out.stderr), "the token is never printed");
  }
  assert.match(run(`${token}\nextra line`).stdout, /contains more than the token/);
  assert.match(run("").stderr + run("").stdout, /Missing GitHub secrets[^\n]*CLOUDFLARE_API_TOKEN/, "an empty token is still reported as missing");
});

test("the Cloudflare token is picked out of a messy secret by asking Cloudflare which piece works", async () => {
  const { tokenCandidates, pickWorkingToken } = await import("../scripts/cloudflare-token.mjs");
  const account = "0543287a79f9b297abe68d1d353c0a2d";
  const token = "abcDEF1234567890abcDEF1234567890abcDEF12";
  const modern = "cfut_abcDEF1234567890abcDEF1234567890abcDEF1234567890abcDEF123";
  // The account id is never a token, even when it comes first; new-style tokens are tried before the old 40-character form.
  assert.deepEqual(tokenCandidates(`${account}\n${token}`, account), [token]);
  assert.deepEqual(tokenCandidates(`${account}\n${token}`, ""), [token], "a 32-character hex string is not a token");
  assert.deepEqual(tokenCandidates(`curl "https://api.cloudflare.com/client/v4/user/tokens/verify" \\\n -H "Authorization: Bearer ${token}"`, account), [token]);
  assert.deepEqual(tokenCandidates(`${token}\n${modern}`, account), [modern, token]);
  assert.deepEqual(tokenCandidates("", account), []);

  const asked = [];
  const fake = (good) => async (url, init) => {
    const sent = init.headers.Authorization.replace("Bearer ", "");
    asked.push(sent);
    const ok = sent === good;
    return { ok, status: ok ? 200 : 401, json: async () => ({ success: ok }) };
  };
  const picked = await pickWorkingToken(`${token}\n${modern}`, account, fake(token));
  assert.equal(picked.token, token);
  assert.equal(picked.verified, true);
  assert.ok(asked.includes(modern) && asked.includes(token), "every piece was tried");

  const refused = await pickWorkingToken(`${token}\n`, account, fake("something else"));
  assert.equal(refused.verified, false, "Cloudflare refused every piece");

  const offline = await pickWorkingToken(`${token}\n`, account, async () => { throw new Error("no network"); });
  assert.equal(offline.verified, null, "no answer from Cloudflare is not treated as a refusal");
  assert.equal(offline.token, token);

  const down = await pickWorkingToken(token, account, async () => ({ ok: false, status: 503, json: async () => ({}) }));
  assert.equal(down.verified, null, "a Cloudflare outage (5xx) is not treated as a refusal either");
});

test("the workers.dev name is registered only when the account has none, and an existing name is never changed", async () => {
  const { ensureWorkersSubdomain } = await import("../scripts/workers-subdomain.mjs");
  const calls = [];
  const logs = [];
  const run = (name, answers) => ensureWorkersSubdomain({
    accountId: "acc", token: "secret-token-value", name, log: (line) => logs.push(line),
    fetchFn: async (url, init = {}) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body, auth: init.headers?.Authorization });
      const answer = answers[calls.filter((call) => call.url === url).length - 1] ?? answers.at(-1);
      return { ok: answer.status < 300, status: answer.status, json: async () => answer.body };
    },
  });
  const none = { status: 200, body: { success: true, result: { subdomain: null } } };
  const done = { status: 200, body: { success: true, result: { subdomain: "alerttradie" } } };

  assert.equal(await run("other", [done]), "exists");
  assert.deepEqual(calls.map((call) => call.method), ["GET"], "an existing name is not touched");

  calls.length = 0;
  assert.equal(await run("AlertTradie ", [none, done]), "registered");
  assert.deepEqual(calls.map((call) => call.method), ["GET", "PUT"]);
  assert.equal(JSON.parse(calls[1].body).subdomain, "alerttradie");
  assert.match(calls[1].url, /\/accounts\/acc\/workers\/subdomain$/);

  calls.length = 0;
  assert.equal(await run("", [{ status: 404, body: { success: false } }]), "no-name");
  assert.equal(await run("-bad-", [none]), "invalid-name");
  assert.equal(await run("bad name!", [none]), "invalid-name");
  assert.ok(!calls.some((call) => call.method === "PUT"), "nothing is registered without a valid name");

  calls.length = 0;
  const taken = { status: 409, body: { success: false, errors: [{ message: "subdomain already taken" }] } };
  assert.equal(await run("alerttradie", [none, taken]), "refused");
  assert.ok(logs.some((line) => /subdomain already taken/.test(line)));

  calls.length = 0;
  assert.equal(await run("alerttradie", [{ status: 403, body: { success: false } }]), "unknown", "an unclear answer registers nothing");
  assert.ok(!calls.some((call) => call.method === "PUT"));
  assert.equal(await ensureWorkersSubdomain({ accountId: "acc", token: "t", name: "x", log: () => {}, fetchFn: async () => { throw new Error("offline"); } }), "unknown");
  assert.ok(!logs.join("\n").includes("secret-token-value"), "the token is never printed");

  const resources = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../cloudflare.resources.json", import.meta.url), "utf8"));
  assert.match(resources.workersSubdomain, /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, "the name in the file is allowed");
});
