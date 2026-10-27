// Deploys the built app (dist/) to Cloudflare Workers with a D1 database and a private R2 bucket.
// Used by .github/workflows/deploy.yml, but can also be run by hand:
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... OWNER_EMAIL=... (etc.) npm run build && node scripts/deploy-cloudflare.mjs
// Safe to re-run: the database and bucket are created only once.
//
// Where the data lives is written in cloudflare.resources.json (account id, D1 database id, R2 bucket). When that file names an existing D1
// database, the deploy USES it and never creates another; if it cannot be found the deploy stops and says why. Environment variables of the
// same purpose win over the file. Nothing is ever written into the database here: the app creates its own empty tables the first time it runs,
// and the company's own people are the only ones who add data (ATP_DEMO_SEED is switched off below).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pickWorkingToken, tokenCandidates } from "./cloudflare-token.mjs";
import { ensureWorkersSubdomain } from "./workers-subdomain.mjs";

// Found next to this script's folder, wherever the deploy is started from (a missing file would silently turn into "create new resources").
const RESOURCES_FILE = fileURLToPath(new URL("../cloudflare.resources.json", import.meta.url));
const resources = existsSync(RESOURCES_FILE) ? JSON.parse(readFileSync(RESOURCES_FILE, "utf8")) : {};
if (!existsSync(RESOURCES_FILE)) console.log("cloudflare.resources.json was not found: a database and a bucket with the default names will be used or created.");
const WORKER = process.env.WORKER_NAME || "alert-tradie-pro";
const DB_NAME = process.env.D1_NAME || "alert-tradie-pro-db";
const DB_ID = process.env.D1_DATABASE_ID?.trim() || resources.d1DatabaseId || "";
const NAMED_BUCKET = process.env.R2_BUCKET_NAME?.trim() || resources.r2Bucket || "";
const BUCKET = NAMED_BUCKET || "alert-tradie-pro-files";
// The account id is an identifier, not a secret. The account named in the file is the one the database and bucket belong to, so it is the one
// used; a secret naming another account would only make the database "not found".
if (resources.accountId) {
  const given = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (given && given !== resources.accountId) console.log("Note: the CLOUDFLARE_ACCOUNT_ID secret differs from cloudflare.resources.json. The account in the file is used.");
  process.env.CLOUDFLARE_ACCOUNT_ID = resources.accountId;
}
if (resources.filesLimitGb && !process.env.FILES_LIMIT_GB?.trim()) process.env.FILES_LIMIT_GB = String(resources.filesLimitGb);
// A pasted token can arrive with a trailing newline, extra lines or the account id next to it (Cloudflare's token page also shows a test command
// under the token), and wrangler then refuses it. Here only the first plausible piece is kept; once the other secrets are known to be present, each
// piece is tried against Cloudflare below and the one it accepts is used.
const RAW_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
{
  const token = tokenCandidates(RAW_TOKEN, process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "")[0] ?? RAW_TOKEN.trim().split(/\s+/)[0] ?? "";
  if (RAW_TOKEN.trim() !== token) console.log("Note: the CLOUDFLARE_API_TOKEN secret contains more than the token (extra lines or spaces). Only the token itself is used. Please save the secret again with just the token.");
  process.env.CLOUDFLARE_API_TOKEN = token;
}
const CONFIG = "dist/server/wrangler.json";
const REQUIRED = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "OWNER_EMAIL", "OWNER_PASSWORD_HASH", "OWNER_SESSION_SECRET", "CUSTOMER_CONTACT_HASH_SECRET"];
const SECRETS = ["OWNER_EMAIL", "OWNER_PASSWORD_HASH", "OWNER_DISPLAY_NAME", "OWNER_SESSION_SECRET", "TEAM_SESSION_SECRET", "TEAM_CODE", "TEAM_CODE_HASH", "CUSTOMER_CONTACT_HASH_SECRET", "RESEND_API_KEY", "TEAM_NOTIFICATION_EMAIL_FROM", "JARVIS_GMAIL_CLIENT_ID", "JARVIS_GMAIL_CLIENT_SECRET", "JARVIS_GMAIL_ACCOUNTS", "JARVIS_ANTHROPIC_API_KEY", "JARVIS_AI_MODEL", "JARVIS_AI", "JARVIS_AI_FALLBACKS", "JARVIS_COMPANY_NAME", "JARVIS_OPENJARVIS_URL", "JARVIS_OPENJARVIS_API_KEY", "JARVIS_OPENJARVIS_MODEL", "JARVIS_OPENJARVIS_ACCESS_ID", "JARVIS_OPENJARVIS_ACCESS_SECRET", "JARVIS_OPENAI_API_KEY", "JARVIS_OPENAI_VOICE", "JARVIS_PERSIAN_VOICE"];

const missing = REQUIRED.filter((name) => !process.env[name]?.trim() && !(name === "CLOUDFLARE_ACCOUNT_ID" && resources.accountId));
if (missing.length) {
  console.error(`Missing GitHub secrets / environment values: ${missing.join(", ")}\nSee release-docs/DEPLOY-GITHUB-TO-CLOUDFLARE-FA.md.`);
  process.exit(1);
}

// Ask Cloudflare whether the token works, before anything is deployed, so a wrong token is explained plainly instead of through wrangler's errors.
{
  const picked = await pickWorkingToken(RAW_TOKEN, process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "");
  if (picked.verified === true) process.env.CLOUDFLARE_API_TOKEN = picked.token;
  else if (picked.verified === false) {
    const shapes = RAW_TOKEN.split(/\s+/).filter(Boolean).map((part) => `${part.length} characters${/^[0-9a-f]{32}$/i.test(part) ? " (looks like an account id, not a token)" : ""}`);
    console.error(`Cloudflare did not accept the CLOUDFLARE_API_TOKEN secret. The secret holds ${shapes.length} piece(s): ${shapes.join("; ") || "nothing"}.
A real token is 40 or more letters and digits without spaces. Create a new token in Cloudflare (My Profile > API Tokens > Create Token), copy it with the Copy button, and save it as the secret CLOUDFLARE_API_TOKEN with nothing else in it.`);
    process.exit(1);
  } else console.log("Could not reach Cloudflare to check the token beforehand. Continuing with it as it is.");
}

function wrangler(args, { allowFail = false } = {}) {
  const result = spawnSync("npx", ["--no-install", "wrangler", ...args], { encoding: "utf8", env: process.env });
  if (result.status !== 0 && !allowFail) {
    console.error(result.stdout, result.stderr);
    if (/workers\.dev subdomain/i.test(`${result.stdout}${result.stderr}`)) {
      throw new Error("This Cloudflare account has no workers.dev name yet. Put the name you want in cloudflare.resources.json as \"workersSubdomain\" (lowercase letters, digits and \"-\") and run the deploy again, or register one in the Cloudflare dashboard under Workers & Pages.");
    }
    throw new Error(`wrangler ${args.slice(0, 2).join(" ")} failed`);
  }
  return result;
}

// 1. D1 database: the one named by id in cloudflare.resources.json (never replaced by a new one), otherwise created once by name.
function findDatabase() {
  const list = wrangler(["d1", "list", "--json"]);
  return JSON.parse(list.stdout).find((db) => (DB_ID ? db.uuid === DB_ID : db.name === DB_NAME));
}
let database = findDatabase();
if (!database && DB_ID) {
  throw new Error(`The D1 database ${DB_ID} was not found in Cloudflare account ${process.env.CLOUDFLARE_ACCOUNT_ID}. Check cloudflare.resources.json, and that the API token has "D1 · Edit" permission on this account.`);
}
if (!database) {
  console.log(`Creating D1 database ${DB_NAME}…`);
  wrangler(["d1", "create", DB_NAME]);
  database = findDatabase();
}
if (!database?.uuid) throw new Error("The D1 database could not be found or created.");
console.log(`Using D1 database ${database.name} (${database.uuid}) and R2 bucket ${BUCKET}.`);

// Says plainly whether the database already holds records, so nobody is surprised by old data. Read-only; never blocks the deploy.
{
  const peek = wrangler(["d1", "execute", database.name, "--remote", "--json", "--command",
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name"], { allowFail: true });
  try {
    const rows = peek.status === 0 ? JSON.parse(peek.stdout)?.[0]?.results : null;
    if (!Array.isArray(rows)) throw new Error("no table list");
    const tables = rows.map((row) => row.name);
    console.log(tables.length
      ? `Note: this database already has ${tables.length} table(s) (${tables.slice(0, 6).join(", ")}${tables.length > 6 ? ", …" : ""}). Whatever records are in them will show in the app. The deploy changes none of them.`
      : "This database is empty: the app will create its own empty tables the first time it runs.");
  } catch {
    console.log("Could not look inside the database before deploying (this does not stop the deploy).");
  }
}

// 2. Private R2 bucket. A bucket named in cloudflare.resources.json already exists and is only bound, never created (a typo in the name
// stops the deploy below instead of quietly making a second bucket). Without a named bucket, the default one is created once.
if (!NAMED_BUCKET) {
  const bucket = wrangler(["r2", "bucket", "create", BUCKET], { allowFail: true });
  if (bucket.status !== 0 && !/already exists/i.test(bucket.stdout + bucket.stderr)) {
    console.error(bucket.stdout, bucket.stderr);
    throw new Error("The R2 bucket could not be created. R2 must be enabled once in the Cloudflare dashboard (R2 > Get started).");
  }
} else {
  // Look for the named bucket before anything is deployed. (wrangler's own deploy can quietly create a bucket that does not exist; that is switched off below too.)
  const listed = wrangler(["r2", "bucket", "list"], { allowFail: true });
  const mention = new RegExp(`(^|[^A-Za-z0-9_.-])${BUCKET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z0-9_.-])`, "m");
  if (listed.status === 0 && !mention.test(listed.stdout)) {
    throw new Error(`The R2 bucket "${BUCKET}" was not found in Cloudflare account ${process.env.CLOUDFLARE_ACCOUNT_ID}. Check r2Bucket in cloudflare.resources.json. Nothing was created or deployed.`);
  }
  if (listed.status !== 0) console.log(`Could not list the R2 buckets to check that "${BUCKET}" exists (the API token may lack R2 read access). Continuing without creating anything.`);
}

// 3. Point the generated Worker config at the real resources.
const config = JSON.parse(await readFile(CONFIG, "utf8"));
config.name = WORKER;
config.d1_databases = [{ binding: "DB", database_name: database.name, database_id: database.uuid }];
config.r2_buckets = [{ binding: "BUCKET", bucket_name: BUCKET }];
config.images = { binding: "IMAGES" };
// Jarvis's natural voice is made by Cloudflare Workers AI. If Cloudflare refuses the binding, the deploy below is repeated without it.
config.ai = { binding: "AI" };
await writeFile(CONFIG, JSON.stringify(config, null, 2));

// 3b. A new account has no workers.dev name. Register the one named in cloudflare.resources.json (WORKERS_SUBDOMAIN wins); an existing name is never changed.
await ensureWorkersSubdomain({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  token: process.env.CLOUDFLARE_API_TOKEN,
  name: process.env.WORKERS_SUBDOMAIN?.trim() || resources.workersSubdomain || "",
});

// 4. Deploy, then store the private values as Worker secrets.
console.log(`Deploying ${WORKER}…`);
// Automatic provisioning is off: wrangler may only attach the database and bucket named above, never create one.
const deployArgs = ["deploy", "--config", CONFIG, "--experimental-provision=false", "--experimental-auto-create=false"];
let deployed = wrangler(deployArgs, { allowFail: true });
if (deployed.status !== 0) {
  console.error(deployed.stdout, deployed.stderr);
  // The natural voice is a bonus: if the account cannot use Workers AI (or the token may not attach it), the app is still deployed without it,
  // and Jarvis reads aloud with the voice on the device.
  if (!config.ai || /workers\.dev subdomain/i.test(`${deployed.stdout}${deployed.stderr}`)) {
    if (/workers\.dev subdomain/i.test(`${deployed.stdout}${deployed.stderr}`)) throw new Error("This Cloudflare account has no workers.dev name yet. Put the name you want in cloudflare.resources.json as \"workersSubdomain\" (lowercase letters, digits and \"-\") and run the deploy again, or register one in the Cloudflare dashboard under Workers & Pages.");
    throw new Error("wrangler deploy failed");
  }
  console.log("Note: the deploy did not work with the AI binding (Jarvis's natural voice). Trying once more without it; Jarvis will read aloud with the voice on the device.");
  delete config.ai;
  await writeFile(CONFIG, JSON.stringify(config, null, 2));
  deployed = wrangler(deployArgs);
}
console.log(deployed.stdout);

const dir = await mkdtemp(join(tmpdir(), "atp-secrets-"));
try {
  const values = Object.fromEntries(SECRETS.filter((name) => process.env[name]?.trim()).map((name) => [name, process.env[name].trim()]));
  values.ATP_DEMO_SEED = "false";
  if (process.env.FILES_LIMIT_GB?.trim()) values.FILES_LIMIT_GB = process.env.FILES_LIMIT_GB.trim();
  const file = join(dir, "secrets.json");
  await writeFile(file, JSON.stringify(values));
  wrangler(["secret", "bulk", file, "--config", CONFIG]);
  console.log(`Stored ${Object.keys(values).length} secrets.`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
const url = /https:\/\/\S+\.workers\.dev/.exec(deployed.stdout)?.[0];
console.log(url ? `\nLive at ${url}` : "\nDeployed. Open Cloudflare dashboard > Workers & Pages to see the address.");
