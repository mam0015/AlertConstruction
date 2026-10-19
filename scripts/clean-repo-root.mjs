// Tidies the repository root. Safe by design:
//   node scripts/clean-repo-root.mjs            → DRY RUN: only prints what would be removed, and why
//   node scripts/clean-repo-root.mjs --apply    → runs `git rm` on exactly that list (git history keeps everything)
//
// It only ever removes four kinds of file, and every one is provably not your code:
//   A. copies of npm packages that were uploaded into the repo (byte-for-byte identical to a file inside
//      node_modules/@babel or node_modules/@alloc — so run `npm ci` first)
//   B. generated build output: client/, server/ (old duplicates) and dist/ (kept on disk, just no longer tracked)
//   C. old hashed GitHub Pages bundles (assets/main-*.js|css) that no page, service worker or other bundle refers to
//   D. generated *.tsbuildinfo files
// First-party folders (app, db, jarvis, tests, scripts, worker, build, public, drizzle, docs, supabase, …) and the
// root LICENSE are never touched. After applying, run `npm test`.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");

const PROTECTED_PREFIXES = ["app/", "db/", "jarvis/", "tests/", "scripts/", "worker/", "build/", "public/", "drizzle/", "release/", "release-docs/", "github-pages-spa/", "supabase/", "docs/", ".openai/", ".github/"];
const PROTECTED_FILES = new Set(["LICENSE", "sw.js", "package.json", "package-lock.json", "CLAUDE.md", "MASTER_PROMPT.md", "README.md"]);
const isProtected = (path) => PROTECTED_FILES.has(path) || PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

function git(args, input) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", input, maxBuffer: 1 << 28 });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

const sha = (buffer) => createHash("sha1").update(buffer).digest("hex");
const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);

// ---- A. identical to an installed npm package file -------------------------------------------------------------------
const packageRoots = ["node_modules/@babel", "node_modules/@alloc"].map((dir) => join(root, dir)).filter((dir) => existsSync(dir));
if (packageRoots.length === 0) {
  console.error("node_modules/@babel was not found. Run  npm ci  first so copies can be proven identical to the real packages.");
  process.exit(1);
}
const known = new Set();
for (const dir of packageRoots) {
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) known.add(sha(readFileSync(join(entry.parentPath ?? entry.path, entry.name))));
  }
}
const copies = tracked.filter((path) => {
  if (isProtected(path)) return false;
  const full = join(root, path);
  return existsSync(full) && lstatSync(full).isFile() && known.has(sha(readFileSync(full)));
});

// ---- B. generated output ----------------------------------------------------------------------------------------------
const generated = tracked.filter((path) => path.startsWith("client/") || path.startsWith("server/"));
const distTracked = tracked.filter((path) => path.startsWith("dist/"));

// ---- C. unreferenced hashed Pages bundles -----------------------------------------------------------------------------
const bundles = tracked.filter((path) => /^assets\/main-[\w-]+\.(js|css)$/.test(path));
const readers = tracked.filter((path) => /\.(html|webmanifest)$/.test(path) && !/^(dist|client|server)\//.test(path)).concat(tracked.filter((path) => path === "sw.js"));
let referencedText = readers.map((path) => readFileSync(join(root, path), "utf8")).join("\n");
const referenced = new Set();
for (let grew = true; grew;) {
  grew = false;
  for (const bundle of bundles) {
    if (!referenced.has(bundle) && referencedText.includes(basename(bundle))) {
      referenced.add(bundle);
      referencedText += `\n${readFileSync(join(root, bundle), "utf8")}`;
      grew = true;
    }
  }
}
const staleBundles = bundles.filter((path) => !referenced.has(path));

// ---- D. build info ----------------------------------------------------------------------------------------------------
const buildInfo = tracked.filter((path) => path.endsWith(".tsbuildinfo"));

const groups = [
  ["A. copies of npm packages (identical to node_modules/@babel, @alloc)", copies, "remove"],
  ["B. generated output: client/ and server/ duplicates", generated, "remove"],
  ["B. generated output: dist/ (stays on disk, just stops being tracked)", distTracked, "untrack"],
  ["C. old hashed Pages bundles nothing refers to", staleBundles, "remove"],
  ["D. generated build info", buildInfo, "remove"],
];

console.log(apply ? "APPLYING cleanup\n" : "DRY RUN — nothing is changed. Add --apply to do it.\n");
for (const [title, files, action] of groups) {
  console.log(`${title}: ${files.length} file${files.length === 1 ? "" : "s"} (${action})`);
  const shown = new Map();
  for (const file of files) shown.set(file.includes("/") ? `${file.split("/")[0]}/` : "(repo root)", (shown.get(file.includes("/") ? `${file.split("/")[0]}/` : "(repo root)") ?? 0) + 1);
  for (const [where, count] of [...shown].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${String(count).padStart(4)}  ${where}`);
}
if (tracked.includes("LICENSE") && known.has(sha(readFileSync(join(root, "LICENSE"))))) {
  console.log("\nNote: the root LICENSE file is Babel's licence text (Sebastian McKenzie), not yours. It was left in place; decide whether to replace it with your own.");
}

const removable = [...copies, ...generated, ...staleBundles, ...buildInfo];
if (!apply) {
  console.log(`\nWould remove ${removable.length} tracked files and untrack ${distTracked.length} under dist/. Everything stays in git history.`);
  process.exit(0);
}

if (removable.length) git(["rm", "-q", "-f", "--pathspec-from-file=-", "--pathspec-file-nul"], removable.join("\0"));
if (distTracked.length) git(["rm", "-r", "-q", "--cached", "dist"]);
console.log(`\nDone: removed ${removable.length} files and untracked ${distTracked.length} under dist/. Review with  git status , then run  npm test  and commit.`);
