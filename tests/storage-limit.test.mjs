import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { startWorker } from "./helpers/worker-harness.mjs";

const GB = 1024 ** 3;
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

// A tiny valid-looking PDF of an exact size (the chat route checks the file signature).
const pdf = (name, size) => new File([`%PDF-1.4\n${"x".repeat(size - 10)}\n`], name, { type: "application/pdf" });
const limitFor = (bytes) => String(bytes / GB);

const app = await startWorker("store");
// A failing test must not leave a tiny limit behind for the tests after it.
test.afterEach(() => { delete process.env.FILES_LIMIT_GB; });
const owner = await app.ownerCookie();
const tiler = await app.staffCookie("tiler.store@alert.test", "Worker");

async function sendFile(file) {
  const form = new FormData();
  form.set("to", app.ownerEmail);
  form.set("body", "photo");
  form.set("file", file);
  return app.request("/api/team/chat", { method: "POST", headers: { cookie: tiler }, body: form });
}
async function storage() {
  const response = await app.request("/api/owner/settings", { headers: { cookie: owner } });
  assert.equal(response.status, 200);
  return (await response.json()).data.storage;
}

test("a fresh, empty company starts at zero with the 8 GB limit", async () => {
  delete process.env.FILES_LIMIT_GB;
  const meter = await storage();
  assert.equal(meter.usedBytes, 0);
  assert.equal(meter.limitBytes, 8 * GB);
  assert.equal(meter.state, "ok");
  assert.equal(meter.percent, 0);
});

test("a nonsense limit falls back to 8 GB instead of switching the limit off", async () => {
  for (const bad of ["abc", "-4", "0", "", "NaN"]) {
    process.env.FILES_LIMIT_GB = bad;
    assert.equal((await storage()).limitBytes, 8 * GB, `value ${JSON.stringify(bad)}`);
  }
  process.env.FILES_LIMIT_GB = "2";
  assert.equal((await storage()).limitBytes, 2 * GB);
  delete process.env.FILES_LIMIT_GB;
});

test("uploads are counted, the meter warns at 80% and refuses what does not fit", async () => {
  delete process.env.FILES_LIMIT_GB;
  const stored = app.env.BUCKET.objects.size;
  assert.equal((await sendFile(pdf("one.pdf", 2000))).status, 201);
  assert.equal(app.env.BUCKET.objects.size, stored + 1);
  assert.equal((await storage()).usedBytes, 2000);

  // 2000 of 2200 used = 90.9%: still accepted up to the limit, but flagged.
  process.env.FILES_LIMIT_GB = limitFor(2200);
  const warn = await storage();
  assert.equal(warn.state, "warn");
  assert.equal(warn.freeBytes, 200);

  const refused = await sendFile(pdf("two.pdf", 500));
  assert.equal(refused.status, 400);
  assert.match((await refused.json()).error, /storage is full/i);
  assert.equal(app.env.BUCKET.objects.size, stored + 1, "a refused file must not reach the bucket");
  assert.equal((await storage()).usedBytes, 2000, "a refused file must not be recorded");

  // Exactly filling the limit is allowed; one byte more is not.
  assert.equal((await sendFile(pdf("fits.pdf", 200))).status, 201);
  const full = await storage();
  assert.equal(full.state, "full");
  assert.equal(full.freeBytes, 0);
  assert.equal((await sendFile(pdf("late.pdf", 10))).status, 400);

  // Plain messages (no file) still work when storage is full.
  const form = new FormData();
  form.set("to", app.ownerEmail);
  form.set("body", "Text only");
  assert.equal((await app.request("/api/team/chat", { method: "POST", headers: { cookie: tiler }, body: form })).status, 201);

  // Raising the limit lets uploads continue.
  delete process.env.FILES_LIMIT_GB;
  assert.equal((await sendFile(pdf("after.pdf", 800))).status, 201);
  assert.equal((await storage()).state, "ok");
});

test("a customer request with attachments is refused politely, saves nothing, and never shows storage numbers", async () => {
  // 1000-byte limit and an attachment of 900 bytes: over the customers' 80% share (800) even when nothing else is stored.
  for (const table of ["team_chat", "request_files", "workflow_files"]) {
    try { app.d1.sqlite.exec(`DELETE FROM ${table}`); } catch { /* table not created yet: nothing stored */ }
  }
  process.env.FILES_LIMIT_GB = limitFor(1000);
  const before = app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM job_requests").get().n;
  const form = new FormData();
  for (const [key, value] of Object.entries({
    service: "Kitchen Renovations", name: "Full Store", phone: "0400 111 222", email: "full.store@example.com", location: "Kew",
    timeframe: "Within 1–3 months", budget: "$25,000–$75,000", material: "Premium", details: "Checking that a full file store is handled politely for customers.",
  })) form.set(key, value);
  form.append("files", new File([`%PDF-1.4\n${"x".repeat(890)}\n`], "plan.pdf", { type: "application/pdf" }));
  const objectsBefore = app.env.BUCKET.objects.size;
  const response = await app.request("/api/requests", { method: "POST", body: form, headers: { "x-forwarded-for": "198.51.100.77" } });
  assert.equal(response.status, 507);
  const text = JSON.stringify(await response.json());
  assert.doesNotMatch(text, /\bGB\b|\bMB\b|\bKB\b|bytes|\d+ B\b/i);
  assert.match(text, /without attachments|contact the company/i);
  assert.equal(app.env.BUCKET.objects.size, objectsBefore);
  const after = app.d1.sqlite.prepare("SELECT COUNT(*) AS n FROM job_requests").get().n;
  assert.equal(after, before, "no request row may be left behind");

  // The same request without a file still goes through.
  const plain = new FormData();
  for (const [key, value] of form.entries()) if (key !== "files") plain.set(key, value);
  assert.equal((await app.request("/api/requests", { method: "POST", body: plain, headers: { "x-forwarded-for": "198.51.100.77" } })).status, 201);
  delete process.env.FILES_LIMIT_GB;
});

test("every route that writes to the bucket checks the limit first, and the public ones hide the numbers", () => {
  const routes = [
    "app/api/team/chat/route.ts", "app/api/workflow/files/route.ts", "app/api/workflow/public/files/route.ts", "db/worker-store.ts", "db/request-store.ts",
  ];
  for (const file of routes) {
    const source = read(file);
    const put = source.indexOf("BUCKET.put(");
    assert.ok(put > 0, `${file} stores a file`);
    const check = source.indexOf("assertStorageRoom(");
    assert.ok(check > 0 && check < put, `${file} must check the limit before BUCKET.put`);
  }
  assert.match(read("app/api/workflow/public/files/route.ts"), /isStorageFull\(error\)/);
  assert.match(read("app/api/requests/route.ts"), /isStorageFull\(error\)/);
  // No other code may write into the bucket without going through one of these.
  const writers = ["app", "db", "jarvis"].flatMap((dir) => walk(dir)).filter((file) => /BUCKET\??\.put\(/.test(read(file))).sort();
  assert.deepEqual(writers, [...routes].sort());
});

function walk(dir) {
  const out = [];
  for (const name of readdirSync(new URL(`../${dir}`, import.meta.url))) {
    const path = `${dir}/${name}`;
    if (statSync(new URL(`../${path}`, import.meta.url)).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx|mjs)$/.test(name)) out.push(path);
  }
  return out;
}
