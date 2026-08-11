import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("loads the internal Operation Hub skin without targeting public homepage classes", async () => {
  const [layout, skin] = await Promise.all([
    read("app/layout.tsx"),
    read("app/operation-hub.css"),
  ]);

  assert.match(layout, /import "\.\/operation-hub\.css"/);
  assert.match(skin, /ownerShell/);
  assert.match(skin, /adminShell/);
  assert.match(skin, /#f5b900/i);
  assert.doesNotMatch(skin, /\.site-header|\.hero-|\.desktop-nav|\.service-card/);
});

test("keeps development dashboard preview access out of production", async () => {
  const [ownerPage, adminPage, ownerData, adminData] = await Promise.all([
    read("app/owner/page.tsx"),
    read("app/admin/page.tsx"),
    read("app/api/owner/data/route.ts"),
    read("app/api/admin/data/route.ts"),
  ]);

  for (const source of [ownerPage, adminPage, ownerData, adminData]) {
    assert.match(source, /process\.env\.NODE_ENV\s*===?\s*["']development["']/);
    assert.match(source, /preview=operation-hub|preview\s*===?\s*["']operation-hub["']/);
  }
});

test("Admin navigation remains operational and excludes Owner-only areas", async () => {
  const adminDashboard = await read("app/admin/AdminDashboard.tsx");
  const navBlock = adminDashboard.match(/const nav[\s\S]*?;\n/)?.[0] ?? "";

  assert.match(navBlock, /Projects/);
  assert.match(navBlock, /New requests/);
  assert.match(navBlock, /Schedule/);
  assert.match(navBlock, /Team messages/);
  assert.doesNotMatch(navBlock, /Finance|Team Management|Authority controls/);
});
