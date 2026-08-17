import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "dist/index.html");
const routes = [
  "owner/index.html",
  "admin/index.html",
  "site-supervisor/index.html",
  "track/index.html",
  "customer/index.html",
  "team/pending/index.html",
];
for (const route of routes) {
  const target = resolve(root, "dist", route);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
console.log(`ATP V69 route shells created: ${routes.length}`);
