import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "GITHUB-PAGES-UPLOAD");
const checks = [];
const requirePath = (relative) => {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) throw new Error(`Missing required path: ${relative}`);
  checks.push(relative);
};

[
  "index.html", ".nojekyll", "sw.js", "manifest.webmanifest", "force-update.html",
  "owner/index.html", "admin/index.html", "site-supervisor/index.html",
  "track/index.html", "customer/index.html", "team/pending/index.html",
  "electrical/index.html", "plumbing/index.html", "cladding/index.html",
  "renovation-budget/index.html", "quote-analysis/index.html", "plan-ai/index.html",
  "checklist/index.html", "permit-checklist/index.html", "projects/index.html",
  "invoice/index.html", "catalogue/index.html", "builder/index.html",
].forEach(requirePath);

const htmlFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith(".html")) htmlFiles.push(target);
  }
}
walk(root);

for (const file of htmlFiles.filter((item) => /(?:^|\/)(?:index\.html|owner\/index\.html|admin\/index\.html|site-supervisor\/index\.html|track\/index\.html|customer\/index\.html|pending\/index\.html)$/.test(item))) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:src|href)="\/AlertConstruction\/([^"?#]+)[^\"]*"/g)) requirePath(match[1]);
}

const assetDirectory = path.join(root, "assets");
const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appScript = homepage.match(/assets\/(main-[^"']+\.js)/)?.[1];
const appStyle = homepage.match(/assets\/(main-[^"']+\.css)/)?.[1];
if (!appScript || !appStyle) throw new Error("Compiled V65 application assets are missing.");

const script = fs.readFileSync(path.join(assetDirectory, appScript), "utf8");
for (const phrase of ["Request, Track", "Executive overview", "Project workflow", "Site Visit workflow", "pending_owner"]) {
  if (!script.includes(phrase)) throw new Error(`Compiled app is missing expected content: ${phrase}`);
}

const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
if (!serviceWorker.includes("alert-tradie-pro-v65-project-workflow")) throw new Error("V65 cache-busting service worker is missing.");

console.log(JSON.stringify({ status: "passed", requiredPaths: checks.length, htmlFiles: htmlFiles.length, appScript, appStyle }, null, 2));
