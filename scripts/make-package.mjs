// Builds one complete, clean ZIP of the project: everything that is committed in git, minus files that are not your code
// (copies of npm packages, generated build output — the same list `scripts/clean-repo-root.mjs` shows), and never any
// private settings. Nothing in the repository is changed or deleted; this only reads.
//
//   node scripts/make-package.mjs [output.zip]
//
// The ZIP unzips into one folder. Inside it:  npm ci  →  npm run verify  →  see docs/GO-LIVE.md.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FOLDER = "Alert-Tradie-Pro";
const output = resolve(process.argv[2] ?? join(root, `${FOLDER}-FINAL-${new Date().toISOString().slice(0, 10)}.zip`));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  return result.stdout;
}

if (run("git", ["status", "--porcelain", "--untracked-files=no"]).trim()) {
  console.error("There are uncommitted changes. The ZIP is built from what is committed, so commit first (git status shows them).");
  process.exit(1);
}

const tracked = run("git", ["ls-files", "-z"]).split("\0").filter(Boolean);
const skip = new Set(run("node", ["scripts/clean-repo-root.mjs", "--print"]).split("\0").filter(Boolean));
const PRIVATE = /(^|\/)(\.env(\..*)?|\.dev\.vars(\..*)?|.*\.pem|id_rsa.*|.*\.p12)$/i;
const files = tracked.filter((path) => !skip.has(path) && !PRIVATE.test(path) && !path.startsWith("dist/") && !path.startsWith("node_modules/") && !/^Alert-Tradie-Pro-.*\.zip$/.test(path));

// Last line of defence: refuse to ship anything that looks like a real key or token.
const SECRET_LIKE = /(sk-ant-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ya29\.[A-Za-z0-9_-]{20,}|1\/\/0[A-Za-z0-9_-]{40,})/;
const hits = [];
for (let index = 0; index < files.length; index += 200) {
  const batch = files.slice(index, index + 200).filter((path) => existsSync(join(root, path)) && lstatSync(join(root, path)).isFile() && statSync(join(root, path)).size < 5_000_000);
  const result = spawnSync("grep", ["-lIE", SECRET_LIKE.source, "--", ...batch], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.status === 0) hits.push(...result.stdout.split("\n").filter(Boolean));
}
if (hits.length) {
  console.error(`Refusing to package: these files look like they contain a real secret:\n  ${hits.join("\n  ")}`);
  process.exit(1);
}

const stage = mkdtempSync(join(tmpdir(), "atp-package-"));
try {
  let copied = 0;
  for (const path of files) {
    const from = join(root, path);
    if (!existsSync(from) || !lstatSync(from).isFile()) continue;
    const to = join(stage, FOLDER, path);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    copied += 1;
  }
  mkdirSync(dirname(output), { recursive: true });
  rmSync(output, { force: true });
  run("zip", ["-qr", output, FOLDER], { cwd: stage });

  // Check the finished ZIP rather than trusting the list above.
  const entries = run("unzip", ["-Z1", output]).split("\n").filter(Boolean);
  const has = (path) => entries.includes(`${FOLDER}/${path}`);
  const required = ["package.json", "package-lock.json", "README.md", "app/layout.tsx", "db/runtime.ts", "jarvis/jarvis.mjs", "jarvis/README.md", "scripts/deploy-cloudflare.mjs", "scripts/build-verified.sh",
    ".github/workflows/deploy.yml", "docs/GO-LIVE.md", "docs/GO-LIVE-FA.md", "release-docs/ENVIRONMENT-TEMPLATE.txt", "tests/jarvis.test.mjs", "tsconfig.check.json", "vite.config.ts"];
  const missing = required.filter((path) => !has(path));
  const leaked = entries.filter((entry) => /\/(node_modules|dist|\.wrangler|\.sites-runtime)\//.test(entry) || PRIVATE.test(basename(entry)) || skip.has(entry.slice(FOLDER.length + 1)));
  if (missing.length || leaked.length) {
    console.error(`The ZIP failed its own check.\n  missing: ${missing.join(", ") || "none"}\n  should not be there: ${leaked.slice(0, 10).join(", ") || "none"}`);
    rmSync(output, { force: true });
    process.exit(1);
  }
  console.log(`Created ${output}\n  ${copied} files, ${(statSync(output).size / 1_048_576).toFixed(1)} MB, one top-level folder: ${FOLDER}/`);
  console.log(`  left out: ${skip.size} generated or third-party files (see  node scripts/clean-repo-root.mjs ), node_modules, private settings.`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
