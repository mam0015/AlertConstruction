// The estimate tools: the three trade calculators (Electrical, Plumbing, Cladding), the company price list behind them, the renovation budget,
// the invoice, and the AI plan estimator / quote check (with a pretend AI). Prices are the company's own: nothing is priced from a hidden default.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { TRADES } from "../app/estimate-tools/catalogue.data.mjs";
import { aud, calculatorLines, estimateTotals, lineCents, scopeText, toQty, toRateCents } from "../app/estimate-tools/calc.mjs";
import { analyseQuote, catalogueText, comparePlans, normalisePlanComparison, parsePlanInput, parseQuoteInput, planPrompt, reviewQuote, tradeOf } from "../app/estimate-tools/ai.mjs";
import { calculateInvoice, formatAUD } from "../app/estimate-tools/invoice-math.mjs";
import { ALLOWANCE_KEYS, QUESTIONS } from "../app/estimate-tools/renovation-data.mjs";
import { buildLines, recommendations, totalsFor } from "../app/estimate-tools/renovation-lines.mjs";
import { startWorker } from "./helpers/worker-harness.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const PDF = Buffer.from("%PDF-1.4\n%fake plan\n").toString("base64");

test("catalogue: every item of the three older calculators is here, in the same order as the old item list, and no price is stored with it", () => {
  assert.deepEqual(TRADES.map((trade) => [trade.id, trade.sections.reduce((sum, section) => sum + section.items.length, 0)]), [["electrical", 23], ["plumbing", 25], ["cladding", 11]]);
  const defaults = read("shared/catalogue-defaults.js");
  for (const trade of TRADES) {
    const items = trade.sections.flatMap((section) => section.items);
    items.forEach((item, index) => {
      assert.equal(item.key, `${trade.id}:${index}`);
      assert.ok(defaults.includes(item.name.replace(/'/g, "\\'")), `${item.name} is in the original item list`);
    });
    assert.equal(new Set(items.map((item) => item.key)).size, items.length);
  }
  assert.ok(!/"(?:rate|price|cost)/i.test(read("app/estimate-tools/catalogue.data.mjs")), "the item list carries no prices");
  assert.equal(TRADES.find((trade) => trade.id === "cladding").decimal, true, "cladding is measured in metres and areas");
});

test("calculator: Builder quote adds the margin then 10% GST, Customer direct only GST, in whole cents", () => {
  const lines = [{ rateCents: 6500, qty: 4 }, { rateCents: 3500, qty: 2 }, { rateCents: null, qty: 3 }, { rateCents: 9900, qty: 0 }];
  const builder = estimateTotals(lines, { mode: "builder", marginPercent: 20 });
  assert.deepEqual({ subtotal: builder.subtotal, margin: builder.margin, base: builder.base, gst: builder.gst, total: builder.total }, { subtotal: 33000, margin: 6600, base: 39600, gst: 3960, total: 43560 });
  assert.equal(builder.selected, 3);
  assert.equal(builder.unpriced, 1, "a selected item with no price is counted and flagged, not priced from a guess");
  const customer = estimateTotals(lines, { mode: "customer", marginPercent: 20 });
  assert.deepEqual({ margin: customer.margin, base: customer.base, gst: customer.gst, total: customer.total }, { margin: 0, base: 33000, gst: 3300, total: 36300 });
  assert.equal(estimateTotals([], { mode: "builder" }).total, 0, "nothing selected, nothing charged");
  assert.equal(estimateTotals([{ rateCents: 1, qty: 3 }], { mode: "builder", marginPercent: 50 }).total, 6, "3c + 2c margin = 5c, GST rounds half up to 1c");
  assert.equal(lineCents(1999, 2.5), 4998);
});

test("calculator: typed quantities and rates are read safely", () => {
  assert.equal(toQty("3"), 3); assert.equal(toQty("3.9"), 3); assert.equal(toQty("3.456", true), 3.46); assert.equal(toQty("-2"), 0); assert.equal(toQty("abc"), 0); assert.equal(toQty(""), 0);
  assert.equal(toRateCents("$1,234.50"), 123450); assert.equal(toRateCents("65"), 6500); assert.equal(toRateCents(""), null); assert.equal(toRateCents("-5"), null); assert.equal(toRateCents("x"), null);
});

test("calculator: text for a quote, and lines for the Estimator's calculator, use only items that have a price", () => {
  const lines = [{ rateCents: 10000, qty: 2, name: "LED Downlight", unit: "each", key: "electrical:0" }, { rateCents: null, qty: 1, name: "No price", unit: "each", key: "electrical:1" }];
  const text = scopeText(lines, { mode: "builder", marginPercent: 20, title: "Electrical estimate", project: "Kew", customer: "Sam" });
  assert.match(text, /LED Downlight — 2 each × \$120\.00 = \$240\.00/, "builder text shows the price with the margin inside it");
  assert.ok(!text.includes("No price"), "an unpriced item is left out");
  assert.match(text, /Total \$264\.00/);
  assert.ok(!scopeText(lines, { mode: "customer" }).includes("120.00"));
  assert.deepEqual(calculatorLines(lines, () => "Subcontractor"), [{ group: "Subcontractor", description: "LED Downlight", quantity: "2", unit: "each", unitPrice: "100.00" }]);
  assert.equal(aud(123456), "$1,234.56");
});

test("invoice: cost + profit, discount shared over taxable lines, GST, payments (the older Invoice Generator's maths, unchanged)", () => {
  const result = calculateInvoice({ default_profit_type: "percent", default_profit_value: 20, gst_enabled: true, discount_amount: 10, amount_paid: 50 }, [{ quantity: 2, base_cost: 100 }, { quantity: 1, base_cost: 50, gst_applicable: false }]);
  assert.equal(result.subtotal, 300); assert.equal(result.profit_amount, 50); assert.equal(result.gst_amount, 23.2); assert.equal(result.total_amount, 313.2); assert.equal(result.balance_due, 263.2);
  assert.equal(calculateInvoice({ gst_enabled: false }, [{ quantity: 1, base_cost: 100, profit_type: "fixed", profit_value: 15 }]).total_amount, 115);
  assert.equal(formatAUD(1234.5), "$1,234.50");
});

test("renovation budget: nothing is priced without a company price; with prices the old rules give lines, totals and a do-now / do-later split", () => {
  const answers = {};
  for (const group of Object.values(QUESTIONS)) for (const question of group) answers[question.id] = String(question.default ?? "");
  const state = { scopes: ["bathroom", "kitchen"], priorities: {}, answers, project: { quality: "standard" } };

  const none = buildLines(state, () => null);
  assert.equal(none.lines.length, 0, "no prices, no lines");
  assert.ok(none.missing.length >= 20, "the missing prices are listed so they can be set");
  assert.ok(none.missing.every((item) => item.key && item.name));

  const priced = buildLines(state, () => 100);
  assert.ok(priced.lines.length >= 25);
  assert.equal(priced.missing.length, 0);
  const totals = totalsFor(priced.lines, { budget: 50000, contingency: 15, marginPercent: 20 });
  const expectedBuilder = priced.lines.reduce((sum, line) => sum + line.builder, 0);
  assert.equal(Math.round(totals.builderEx), Math.round(expectedBuilder));
  assert.equal(Math.round(totals.grand * 100), Math.round(expectedBuilder * 1.2 * 1.1 * 1.15 * 100));
  const picks = recommendations(priced.lines, totals, { contingency: 15, marginPercent: 20 });
  assert.equal(picks.now.length + picks.later.length + picks.optional.length, priced.lines.length, "every line is in exactly one list");

  const finish = (quality) => totalsFor(buildLines({ ...state, project: { quality } }, () => 100).lines, { budget: 0 }).grand;
  assert.ok(finish("essential") < finish("standard") && finish("standard") < finish("premium") && finish("premium") < finish("luxury"), "finish quality scales the allowances");
  assert.ok(ALLOWANCE_KEYS.length === 52 && ALLOWANCE_KEYS.every((key) => /^renovation:[a-z]+:[A-Za-z0-9]+$/.test(key)));
});

test("AI plan estimator: what the browser may send is checked, and the AI's counts are re-derived so they always add up", () => {
  const good = { trade: "electrical", scanMode: "smart", existing: { name: "before.pdf", type: "application/pdf", data: PDF }, proposed: { name: "after.pdf", type: "application/pdf", data: PDF } };
  assert.equal(parsePlanInput(good).scanMode, "smart");
  for (const [bad, pattern] of [
    [{ ...good, trade: "roofing" }, /Electrical, Plumbing or Cladding/],
    [{ ...good, existing: { ...good.existing, type: "application/msword" } }, /PDF, PNG, JPG or WEBP/],
    [{ ...good, proposed: { ...good.proposed, data: "" } }, /Upload the Proposed/],
    [{ ...good, existing: { ...good.existing, data: "not base64 !!" } }, /could not be read/],
    [{ ...good, existing: { ...good.existing, data: "A".repeat(11 * 1024 * 1024) } }, /too large/],
    [null, /JSON/],
  ]) assert.throws(() => parsePlanInput(bad), pattern);
  assert.throws(() => parseQuoteInput({ trade: "plumbing", file: { name: "q.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data: PDF } }), /save them as PDF/);

  const trade = tradeOf("electrical");
  const result = normalisePlanComparison({
    status: "success", summary: "ok", legend_findings: [], assumptions: [], warnings: [], unpriced_items: [],
    symbols: [
      // 5 before, 7 after, 1 moved: the AI's own added/removed numbers are wrong on purpose.
      { symbol_label: "Downlight", description: "LED downlight", added_catalog_index: 0, removed_catalog_index: 6, moved_catalog_index: 6, existing_quantity: 5, proposed_quantity: 7, unchanged_quantity: 99, added_quantity: 99, removed_quantity: 99, moved_quantity: 1, confidence: "high", existing_evidence: "p1", proposed_evidence: "p1" },
      // a removal mapped to a NEW-supply item is not allowed; it becomes unpriced
      { symbol_label: "Power point", description: "GPO", added_catalog_index: 5, removed_catalog_index: 5, moved_catalog_index: -1, existing_quantity: 4, proposed_quantity: 2, unchanged_quantity: 2, added_quantity: 0, removed_quantity: 2, moved_quantity: 0, confidence: "medium", existing_evidence: "p2", proposed_evidence: "p2" },
    ],
  }, trade);
  const down = result.symbols[0];
  assert.deepEqual([down.unchanged_quantity, down.added_quantity, down.removed_quantity, down.moved_quantity], [4, 2, 0, 1]);
  assert.equal(down.existing_quantity, down.unchanged_quantity + down.removed_quantity + down.moved_quantity);
  assert.equal(down.proposed_quantity, down.unchanged_quantity + down.added_quantity + down.moved_quantity);
  assert.ok(result.items.some((item) => item.action === "added" && item.catalog_index === 0 && item.quantity === 2));
  assert.ok(result.items.some((item) => item.action === "moved" && item.catalog_index === 6 && item.quantity === 1), "a move may use the allowed relocation item");
  assert.ok(!result.items.some((item) => item.action === "removed" && item.catalog_index === 5), "a removal cannot be priced with a new-supply item");
  assert.ok(result.unpriced_items.some((line) => /removed/.test(line)), "the refused removal is shown as not priced");
  assert.equal(normalisePlanComparison({ status: "missing_trade_plan", summary: "no electrical sheet" }, trade).items.length, 0);
});

function fakeClaude(reply) {
  const calls = [];
  return { calls, beta: { messages: { create: async (params) => { calls.push(params); return { stop_reason: "end_turn", model: "fake", usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: "text", text: JSON.stringify(typeof reply === "function" ? reply(params) : reply) }] }; } } } };
}
const PLAN_REPLY = { status: "success", summary: "Two downlights added.", legend_findings: [], assumptions: ["Ground floor only"], warnings: [], unpriced_items: [], symbols: [
  { symbol_label: "Downlight", description: "LED downlight", added_catalog_index: 0, removed_catalog_index: -1, moved_catalog_index: -1, existing_quantity: 4, proposed_quantity: 6, unchanged_quantity: 4, added_quantity: 2, removed_quantity: 0, moved_quantity: 0, confidence: "high", existing_evidence: "page 1 kitchen", proposed_evidence: "page 1 kitchen" }] };

test("AI plan estimator: the AI is shown the files and the numbered item names, never a price, and files are treated as untrusted", async () => {
  const client = fakeClaude(PLAN_REPLY);
  const input = parsePlanInput({ trade: "electrical", existing: { name: "before.pdf", type: "application/pdf", data: PDF }, proposed: { name: "after.png", type: "image/png", data: PDF } });
  const { analysis } = await comparePlans({ client, model: "m", input, useFallbacks: false });
  assert.equal(analysis.status, "success");
  assert.equal(analysis.items[0].quantity, 2);
  const [call] = client.calls;
  const content = call.messages[0].content;
  assert.equal(content[1].type, "document"); assert.equal(content[1].source.media_type, "application/pdf");
  assert.equal(content[3].type, "image"); assert.equal(content[3].source.media_type, "image/png");
  const prompt = content.at(-1).text;
  assert.match(prompt, /0 \| LED Downlight - Supply, wiring & install/);
  assert.ok(!/\d\.\d\d ex GST|\$\s?\d/.test(prompt), "no price in the prompt");
  assert.match(call.system, /untrusted/i);
  assert.equal(call.output_config.format.type, "json_schema");
  assert.ok(!JSON.stringify(call.output_config.format.schema).includes("minimum"), "the schema uses only keywords the structured-output API accepts");
  assert.ok(catalogueText(tradeOf("cladding")).includes("10 | Order Confirmation Package"));
  assert.match(planPrompt(tradeOf("plumbing"), "fast", ""), /Plumbing/);
});

test("quote check: each line is compared with the company's own price; more than $100 away is flagged; no price set is said, not guessed", async () => {
  const trade = tradeOf("electrical");
  const client = fakeClaude({ supplier: "Bright Sparks", quote_number: "Q-77", summary: "Electrical quote", gst_treatment: "ex_gst", quote_total_ex_gst: 1500, quote_total_inc_gst: 1650, warnings: [], items: [
    { quoted_name: "Downlights x10", description: "", quantity: 10, quoted_unit_price_ex_gst: 100, quoted_line_total_ex_gst: 1000, catalog_index: 0, match_confidence: "high", evidence: "p1", notes: "" },
    { quoted_name: "Power points x5", description: "", quantity: 5, quoted_unit_price_ex_gst: 60, quoted_line_total_ex_gst: 300, catalog_index: 5, match_confidence: "medium", evidence: "p1", notes: "" },
    { quoted_name: "Switchboard", description: "", quantity: 1, quoted_unit_price_ex_gst: 200, quoted_line_total_ex_gst: 200, catalog_index: -1, match_confidence: "none", evidence: "p2", notes: "" }] });
  const { analysis } = await analyseQuote({ client, model: "m", input: parseQuoteInput({ trade: "electrical", file: { name: "quote.csv", type: "text/csv", data: Buffer.from("item,price\nx,1").toString("base64") } }), useFallbacks: false });
  assert.equal(client.calls[0].messages[0].content[0].type, "text", "a CSV is read as text");
  const rates = { 0: 65, 5: null };
  const reviewed = reviewQuote(analysis, trade, (index) => rates[index] ?? null);
  assert.deepEqual(reviewed.items.map((item) => item.status), ["expensive", "no_rate", "unmatched"]);
  assert.equal(reviewed.items[0].company_line_total_ex_gst, 650);
  assert.equal(reviewed.items[0].difference_ex_gst, 350);
  assert.deepEqual(reviewed.counts, { expensive: 1, cheap: 0, fair: 0, unmatched: 1, no_rate: 1 });
  assert.equal(reviewQuote(analysis, trade, () => 95).items[0].status, "fair", "within $100 of the company price is fair");
});

test("API: the price list is internal; only Owner/Admin can change it; keys and amounts are checked; the previous prices are server-only", async () => {
  const app = await startWorker("estimate");
  const owner = await app.ownerCookie();
  const admin = await app.staffCookie("est.admin@alert.test", "Admin");
  const estimator = await app.staffCookie("est.estimator@alert.test", "Estimator");
  const manager = await app.staffCookie("est.manager@alert.test", "Manager");
  const worker = await app.staffCookie("est.worker@alert.test", "Worker");
  const get = (cookie, path = "/api/estimate/rates") => app.request(path, { headers: cookie ? { cookie } : {} });
  const put = (cookie, body, init = {}) => app.request("/api/estimate/rates", { ...app.json(cookie, body, "PUT"), ...init });

  for (const cookie of [null, worker]) assert.equal((await get(cookie)).status, 401, "customers, workers and the public cannot see the price list");
  const first = await (await get(owner)).json();
  assert.deepEqual([first.rates, first.margin, first.canEdit, first.ai], [{}, 20, true, false]);
  assert.equal((await (await get(estimator)).json()).canEdit, false);
  assert.equal((await (await get(manager)).json()).canEdit, false);

  const saved = await put(owner, { rates: { "electrical:0": 65, "plumbing:3": "800.5", "renovation:demolition:bathroom": 2800 }, margin: 25 });
  assert.equal(saved.status, 200, await saved.clone().text());
  const body = await saved.json();
  assert.deepEqual([body.rates["electrical:0"], body.rates["plumbing:3"], body.rates["renovation:demolition:bathroom"], body.margin], [6500, 80050, 280000, 25]);
  assert.deepEqual((await (await get(estimator)).json()).rates, body.rates, "the Estimator reads the same price list");
  assert.equal((await put(admin, { rates: { "electrical:1": 45 } })).status, 200, "Admin can edit");
  assert.equal((await put(estimator, { rates: { "electrical:2": 1 } })).status, 403, "the Estimator can use prices but not change them");
  assert.equal((await put(manager, { rates: { "electrical:2": 1 } })).status, 403);
  assert.equal((await put(null, { rates: { "electrical:2": 1 } })).status, 401);
  assert.equal((await put(owner, { rates: { "electrical:2": 1 } }, { origin: false })).status, 403, "other websites cannot change prices");

  for (const bad of [{ rates: { "hacker:1": 5 } }, { rates: { "electrical:99": 5 } }, { rates: { "electrical:0": -1 } }, { rates: { "electrical:0": "abc" } }, { rates: { "electrical:0": 2000000 } }, { rates: [] }, { rates: {} }, { margin: 500 }, { margin: "x" }, {}]) {
    assert.equal((await put(owner, bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await put(owner, { rates: { "electrical:0": null } })).status, 200);
  assert.equal("electrical:0" in (await (await get(owner)).json()).rates, false, "a price can be removed");
  for (const method of ["POST", "PATCH", "DELETE"]) assert.equal((await app.request("/api/estimate/rates", { method, headers: { cookie: owner } })).status, 405, method);

  // The earlier tools' prices: offered to the Owner/Admin only, as a starting point.
  assert.equal((await get(null, "/api/estimate/starter")).status, 401);
  assert.equal((await get(estimator, "/api/estimate/starter")).status, 403);
  const starter = await (await get(owner, "/api/estimate/starter")).json();
  assert.equal(starter.prices["electrical:5"], 65);
  assert.equal(Object.keys(starter.prices).length, 23 + 25 + 11 + 52);
  assert.equal((await get(admin, "/api/estimate/starter")).status, 200);
});

test("API: the previous prices never reach a browser — they are not in any downloadable script", () => {
  const found = [];
  const scan = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) scan(full);
      else if (/\.(js|mjs|css|html)$/.test(name)) {
        const text = readFileSync(full, "utf8");
        if (/renovation:demolition:bathroom["']?\s*:\s*2800|"electrical:5"\s*:\s*65\b|STARTER_PRICES/.test(text)) found.push(full);
      }
    }
  };
  scan(new URL("../dist/client", import.meta.url).pathname);
  assert.deepEqual(found, [], "price numbers are only in the server bundle");
  for (const file of ["EstimateTools.tsx", "PlanTools.tsx", "RenovationBudget.tsx", "InvoiceTool.tsx", "starter-client.ts"]) assert.ok(!/estimate-starter/.test(read(`app/estimate-tools/${file}`)), `${file} does not import the server-only prices`);
});

test("API: AI plan estimator and quote check — Owner/Admin/Manager/Estimator only, need the Claude key, validate the files, and price from the company list", async () => {
  const app = await startWorker("estimateai");
  const owner = await app.ownerCookie();
  const estimator = await app.staffCookie("ai.estimator@alert.test", "Estimator");
  const worker = await app.staffCookie("ai.worker@alert.test", "Worker");
  const plan = (cookie, body, init = {}) => app.request("/api/estimate/plan", { ...app.json(cookie, body), ...init });
  const good = { trade: "electrical", scanMode: "fast", existing: { name: "before.pdf", type: "application/pdf", data: PDF }, proposed: { name: "after.pdf", type: "application/pdf", data: PDF } };

  assert.equal((await plan(null, good)).status, 401);
  assert.equal((await plan(worker, good)).status, 401);
  assert.equal((await plan(owner, good, { origin: false })).status, 403);
  const off = await plan(owner, good);
  assert.equal(off.status, 503, "without the Claude key the screen is told the AI is not connected");
  assert.equal((await off.json()).code, "not_connected");

  const claude = fakeClaude(PLAN_REPLY);
  globalThis.__JARVIS_TEST_HOOKS__ = { aiClient: claude };
  try {
    assert.equal((await (await app.request("/api/estimate/rates", { headers: { cookie: owner } })).json()).ai, true);
    const done = await plan(estimator, good);
    assert.equal(done.status, 200, await done.clone().text());
    const analysis = (await done.json()).analysis;
    assert.equal(analysis.items[0].quantity, 2);
    assert.equal(claude.calls.length, 1);
    assert.equal((await plan(estimator, { ...good, trade: "roofing" })).status, 400);
    assert.equal((await plan(estimator, { ...good, existing: { ...good.existing, type: "text/html" } })).status, 400);
    assert.equal((await plan(estimator, "nope")).status, 400);
    assert.equal(claude.calls.length, 1, "refused requests never reach the AI");

    // quote check prices against the saved company rates
    await app.request("/api/estimate/rates", app.json(owner, { rates: { "electrical:0": 65 } }, "PUT"));
    globalThis.__JARVIS_TEST_HOOKS__ = { aiClient: fakeClaude({ supplier: "X", quote_number: "1", summary: "s", gst_treatment: "ex_gst", quote_total_ex_gst: 1000, quote_total_inc_gst: 1100, warnings: [], items: [{ quoted_name: "Downlights", description: "", quantity: 10, quoted_unit_price_ex_gst: 100, quoted_line_total_ex_gst: 1000, catalog_index: 0, match_confidence: "high", evidence: "", notes: "" }] }) };
    const quote = await app.request("/api/estimate/quote", app.json(estimator, { trade: "electrical", file: { name: "q.pdf", type: "application/pdf", data: PDF } }));
    assert.equal(quote.status, 200, await quote.clone().text());
    const reviewed = (await quote.json()).analysis;
    assert.equal(reviewed.items[0].status, "expensive");
    assert.equal(reviewed.items[0].company_line_total_ex_gst, 650);
  } finally {
    delete globalThis.__JARVIS_TEST_HOOKS__;
  }
  for (const method of ["GET", "PUT", "PATCH", "DELETE"]) assert.equal((await app.request("/api/estimate/plan", { method, headers: { cookie: owner } })).status, 405, method);
});

test("screens: Estimate tools is in the Owner and Admin left menus and the Estimator workspace, and lines reach the Estimator's quote calculator", () => {
  assert.match(read("app/owner/OwnerDashboard.tsx"), /id:"estimate",label:"Estimate tools"/);
  assert.match(read("app/owner/OwnerDashboard.tsx"), /view==="estimate"&&<EstimateTools role="owner"\/>/);
  assert.match(read("app/admin/AdminDashboard.tsx"), /id: "estimate", label: "Estimate tools"/);
  assert.match(read("app/admin/AdminDashboard.tsx"), /view === "estimate" && <EstimateTools role="admin" \/>/);
  assert.match(read("app/estimator/page.tsx"), /<EstimatorTools /);
  const tools = read("app/estimate-tools/EstimateTools.tsx");
  for (const tab of ["Electrical", "Plumbing", "Cladding", "AI plan estimator", "Quote check", "Renovation budget", "Invoice", "Tiling · Engineering"]) assert.ok(tools.includes(`label: "${tab}"`), tab);
  assert.match(read("app/workflow/EstimateCalculator.tsx"), /onEstimateLines/);
  assert.match(read("app/estimate-tools/bridge.ts"), /window\.dispatchEvent/);
});
