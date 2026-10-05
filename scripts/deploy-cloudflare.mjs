// Deploys the built app (dist/) to Cloudflare Workers with a D1 database and a private R2 bucket.
// Used by .github/workflows/deploy.yml, but can also be run by hand:
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... OWNER_EMAIL=... (etc.) npm run build && node scripts/deploy-cloudflare.mjs
// Safe to re-run: the database and bucket are created only once.
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WORKER = process.env.WORKER_NAME || "alert-tradie-pro";
const DB_NAME = process.env.D1_NAME || "alert-tradie-pro-db";
const BUCKET = process.env.R2_BUCKET_NAME || "alert-tradie-pro-files";
const CONFIG = "dist/server/wrangler.json";
const REQUIRED = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "OWNER_EMAIL", "OWNER_PASSWORD_HASH", "OWNER_SESSION_SECRET", "CUSTOMER_CONTACT_HASH_SECRET"];
const SECRETS = ["OWNER_EMAIL", "OWNER_PASSWORD_HASH", "OWNER_DISPLAY_NAME", "OWNER_SESSION_SECRET", "TEAM_SESSION_SECRET", "TEAM_CODE", "TEAM_CODE_HASH", "CUSTOMER_CONTACT_HASH_SECRET", "RESEND_API_KEY", "TEAM_NOTIFICATION_EMAIL_FROM"];

const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing GitHub secrets / environment values: ${missing.join(", ")}\nSee release-docs/DEPLOY-GITHUB-TO-CLOUDFLARE-FA.md.`);
  process.exit(1);
}

function wrangler(args, { allowFail = false } = {}) {
  const result = spawnSync("npx", ["--no-install", "wrangler", ...args], { encoding: "utf8", env: process.env });
  if (result.status !== 0 && !allowFail) {
    console.error(result.stdout, result.stderr);
    throw new Error(`wrangler ${args.slice(0, 2).join(" ")} failed`);
  }
  return result;
}

// 1. D1 database (created once, then looked up by name).
function findDatabase() {
  const list = wrangler(["d1", "list", "--json"]);
  return JSON.parse(list.stdout).find((db) => db.name === DB_NAME);
}
let database = findDatabase();
if (!database) {
  console.log(`Creating D1 database ${DB_NAME}…`);
  wrangler(["d1", "create", DB_NAME]);
  database = findDatabase();
}
if (!database?.uuid) throw new Error("The D1 database could not be found or created.");

// 2. Private R2 bucket (already-exists is fine).
const bucket = wrangler(["r2", "bucket", "create", BUCKET], { allowFail: true });
if (bucket.status !== 0 && !/already exists/i.test(bucket.stdout + bucket.stderr)) {
  console.error(bucket.stdout, bucket.stderr);
  throw new Error("The R2 bucket could not be created. R2 must be enabled once in the Cloudflare dashboard (R2 > Get started).");
}

// 3. Point the generated Worker config at the real resources.
const config = JSON.parse(await readFile(CONFIG, "utf8"));
config.name = WORKER;
config.d1_databases = [{ binding: "DB", database_name: DB_NAME, database_id: database.uuid }];
config.r2_buckets = [{ binding: "BUCKET", bucket_name: BUCKET }];
config.images = { binding: "IMAGES" };
await writeFile(CONFIG, JSON.stringify(config, null, 2));

// 4. Deploy, then store the private values as Worker secrets.
console.log(`Deploying ${WORKER}…`);
const deployed = wrangler(["deploy", "--config", CONFIG]);
console.log(deployed.stdout);

const dir = await mkdtemp(join(tmpdir(), "atp-secrets-"));
try {
  const values = Object.fromEntries(SECRETS.filter((name) => process.env[name]?.trim()).map((name) => [name, process.env[name].trim()]));
  values.ATP_DEMO_SEED = "false";
  const file = join(dir, "secrets.json");
  await writeFile(file, JSON.stringify(values));
  wrangler(["secret", "bulk", file, "--config", CONFIG]);
  console.log(`Stored ${Object.keys(values).length} secrets.`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
const url = /https:\/\/\S+\.workers\.dev/.exec(deployed.stdout)?.[0];
console.log(url ? `\nLive at ${url}` : "\nDeployed. Open Cloudflare dashboard > Workers & Pages to see the address.");
