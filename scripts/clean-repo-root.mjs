// Tidies the repository root. Safe by design, in two tiers:
//   node scripts/clean-repo-root.mjs                          → DRY RUN: only prints what would be removed, and why
//   node scripts/clean-repo-root.mjs --apply                  → removes only PROVABLE DUPLICATES (byte-for-byte copies of a file that
//                                                               stays), with `git rm` — git history keeps everything
//   node scripts/clean-repo-root.mjs --apply --include-generated
//                                                             → also removes old generated build leftovers that are not copies of
//                                                               anything (needs the owner's OK) and stops tracking dist/
//   node scripts/clean-repo-root.mjs --print                  → prints every candidate (NUL-separated, nothing else) for scripts/make-package.mjs
//
// It only ever removes four kinds of file, and every one is provably not your code (A is always tier 1; B, C, D are tier 1 when a
// byte-identical copy stays, otherwise tier 2):
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
const includeGenerated = process.argv.includes("--include-generated");

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

// ---- tiers: a candidate is a provable duplicate when a byte-identical file stays (an npm package file or another tracked file) --
const candidates = [...new Set([...copies, ...generated, ...staleBundles, ...buildInfo])];
const candidateSet = new Set(candidates);
const stays = new Set();
for (const path of tracked) {
  if (candidateSet.has(path) || path.startsWith("dist/")) continue;
  const full = join(root, path);
  if (existsSync(full) && lstatSync(full).isFile()) stays.add(sha(readFileSync(full)));
}
const copySet = new Set(copies);
const duplicates = candidates.filter((path) => copySet.has(path) || stays.has(sha(readFileSync(join(root, path)))));
const duplicateSet = new Set(duplicates);
const leftovers = candidates.filter((path) => !duplicateSet.has(path));
const pick = (list, files) => list.filter((path) => files.includes(path));

const groups = [
  ["TIER 1 (removed by --apply) — copies of npm packages (identical to node_modules/@babel, @alloc)", pick(duplicates, copies), "remove"],
  ["TIER 1 (removed by --apply) — generated copies identical to a file that stays", duplicates.filter((path) => !copySet.has(path)), "remove"],
  ["TIER 2 (needs --include-generated) — old build output not identical to anything: client/ server/", pick(leftovers, generated), "remove"],
  ["TIER 2 (needs --include-generated) — old hashed Pages bundles nothing refers to", pick(leftovers, staleBundles), "remove"],
  ["TIER 2 (needs --include-generated) — generated build info", pick(leftovers, buildInfo), "remove"],
  ["TIER 2 (needs --include-generated) — dist/ (stays on disk, just stops being tracked)", distTracked, "untrack"],
];

const everything = [...candidates, ...distTracked];
if (process.argv.includes("--print")) {
  process.stdout.write(everything.join("\0"));
  process.exit(0);
}

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

const removable = includeGenerated ? candidates : duplicates;
if (!apply) {
  console.log(`\nTier 1 would remove ${duplicates.length} provable duplicates. Tier 2 would remove ${leftovers.length} more and untrack ${distTracked.length} under dist/. Everything stays in git history.`);
  process.exit(0);
}

if (removable.length) git(["rm", "-q", "-f", "--pathspec-from-file=-", "--pathspec-file-nul"], removable.join("\0"));
if (includeGenerated && distTracked.length) git(["rm", "-r", "-q", "--cached", "dist"]);
console.log(`\nDone: removed ${removable.length} files${includeGenerated ? ` and untracked ${distTracked.length} under dist/` : ""}. Review with  git status , then run  npm test  and commit.`);
