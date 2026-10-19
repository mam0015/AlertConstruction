// Runs the real Alert Tradie Pro app on your own computer, the way Cloudflare runs it: the built Worker with a
// local database and file store. Nothing is uploaded anywhere.
//
//   1. npm run setup:credentials              → copy the printed NAME=value lines into a file called .dev.vars (repo root)
//   2. npm run preview:local                  → builds, then serves http://localhost:8787
//
// Why not `npm run dev`? In the dev server, any *.html file that sits in the repo root (the GitHub Pages copy of the
// site: index.html, owner/index.html …) is served before the app's own pages, so /owner, /admin … show the wrong thing.

import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vars = join(root, ".dev.vars");
const required = ["OWNER_EMAIL", "OWNER_PASSWORD_HASH", "OWNER_SESSION_SECRET"];

if (!existsSync(vars)) {
  console.error(`
There is no .dev.vars file yet. It holds your private settings for this computer only (it is never uploaded).

  1. Run:  npm run setup:credentials      (press Enter for "all", then answer the questions)
  2. Copy only the NAME=value lines it prints (OWNER_EMAIL=…, OWNER_PASSWORD_HASH=…, OWNER_SESSION_SECRET=… and the others)
     into a new file named .dev.vars in this folder, then run  npm run preview:local  again.
`);
  process.exit(1);
}

const defined = new Set(readFileSync(vars, "utf8").split(/\r?\n/).map((line) => line.split("=")[0].trim()));
const missing = required.filter((name) => !defined.has(name));
if (missing.length) {
  console.error(`.dev.vars is missing: ${missing.join(", ")}. Run  node scripts/security-setup.mjs  and add those lines.`);
  process.exit(1);
}

const built = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

// Wrangler reads private settings from beside the Worker config, and every build recreates dist/ — so copy them in each time.
copyFileSync(vars, join(root, "dist", "server", ".dev.vars"));

console.log("\nStarting the app on your computer — open the address shown below (usually http://localhost:8787).\n");
const wrangler = spawn(process.execPath, [join(root, "node_modules", "wrangler", "bin", "wrangler.js"), "dev", "-c", "dist/server/wrangler.json", "--local", "--persist-to", ".wrangler/state", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
wrangler.on("exit", (code) => process.exit(code ?? 0));
