"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./estimate-tools.module.css";
import { ALL_ITEMS, TRADES, type Trade, type TradeId } from "./catalogue";
import { aud, calculatorLines, DEFAULT_MARGIN, estimateTotals, GST_PERCENT, scopeText, toQty, toRateCents } from "./calc.mjs";
import { fetchStarterPrices, unfilled } from "./starter-client";
import PlanTools from "./PlanTools";
import RenovationBudget from "./RenovationBudget";
import InvoiceTool from "./InvoiceTool";

export type Mode = "builder" | "customer";
export type CalcLine = { rateCents: number | null; qty: number; name: string; unit: string; key: string };
export type UsePayload = { lines: { group: "Materials" | "Labour" | "Subcontractor" | "Other"; description: string; quantity: string; unit: string; unitPrice: string }[]; margin: number; contingency?: number; mode: Mode; summary: string };
export type Prices = { rates: Record<string, number>; margin: number; updatedAt: string; canEdit: boolean; ai?: boolean };
type TabId = TradeId | "plan" | "quote" | "renovation" | "invoice" | "soon";

const TABS: { id: TabId; label: string; hint?: string }[] = [
  { id: "electrical", label: "Electrical" },
  { id: "plumbing", label: "Plumbing" },
  { id: "cladding", label: "Cladding" },
  { id: "plan", label: "AI plan estimator" },
  { id: "quote", label: "Quote check" },
  { id: "renovation", label: "Renovation budget" },
  { id: "invoice", label: "Invoice" },
  { id: "soon", label: "Tiling · Engineering", hint: "coming next" },
];

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

// A printable page in its own window, so the dashboard around the estimate is never printed with it.
function printEstimate(trade: Trade, lines: CalcLine[], opts: { mode: Mode; marginPercent: number; project: string; customer: string }) {
  const totals = estimateTotals(lines, opts.mode === "builder" ? { mode: "builder", marginPercent: opts.marginPercent } : { mode: "customer" });
  const builder = opts.mode === "builder";
  const rows = lines.filter((line) => line.qty > 0).map((line) => `<tr><td>${esc(line.name)}</td><td class="n">${esc(Number.isInteger(line.qty) ? line.qty : line.qty.toFixed(2))} ${esc(line.unit)}</td>${builder ? `<td class="n">${line.rateCents === null ? "rate not set" : aud(line.rateCents)}</td><td class="n">${line.rateCents === null ? "—" : aud(Math.round(line.rateCents * line.qty))}</td>` : ""}</tr>`).join("");
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(trade.label)} estimate</title><style>
body{font:14px/1.45 Arial,sans-serif;color:#111;margin:32px}h1{margin:0 0 4px;font-size:22px}.sub{color:#555;margin:0 0 18px}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{padding:7px 8px;border-bottom:1px solid #ddd;text-align:left}th{font-size:12px;text-transform:uppercase;color:#555}.n{text-align:right;white-space:nowrap}.tot{margin-left:auto;width:320px}.tot div{display:flex;justify-content:space-between;padding:4px 0}.tot .g{border-top:2px solid #111;font-size:18px;font-weight:700;margin-top:6px;padding-top:8px}small{color:#666}
</style></head><body><h1>${esc(trade.label)} estimate</h1><p class="sub">${esc(opts.project) || "Project not named"}${opts.customer ? ` · Prepared for ${esc(opts.customer)}` : ""} · ${new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(new Date())}</p>
<table><thead><tr><th>Item</th><th class="n">Quantity</th>${builder ? '<th class="n">Rate</th><th class="n">Line total</th>' : ""}</tr></thead><tbody>${rows || '<tr><td colspan="4">No items selected.</td></tr>'}</tbody></table>
<div class="tot">${builder ? `<div><span>Subtotal</span><span>${aud(totals.subtotal)}</span></div><div><span>Builder margin (${esc(opts.marginPercent)}%)</span><span>${aud(totals.margin)}</span></div>` : `<div><span>Subtotal</span><span>${aud(totals.base)}</span></div>`}<div><span>GST (${GST_PERCENT}%)</span><span>${aud(totals.gst)}</span></div><div class="g"><span>Total inc GST</span><span>${aud(totals.total)}</span></div></div>
${totals.unpriced ? `<p><small>${totals.unpriced} selected item(s) have no rate yet and are not included in the total.</small></p>` : ""}
<script>addEventListener("load",function(){setTimeout(function(){print()},250)})</script></body></html>`);
  win.document.close();
  return true;
}

const groupFor = (trade: TradeId) => (trade === "cladding" ? "Materials" : "Subcontractor") as "Materials" | "Subcontractor";

export default function EstimateTools({ role, onUseLines }: { role: "owner" | "admin" | "estimator" | "manager"; onUseLines?: (payload: UsePayload) => void }) {
  const [prices, setPrices] = useState<Prices | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<TabId>("electrical");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<Mode>("builder");
  const [marginText, setMarginText] = useState(String(DEFAULT_MARGIN));
  const marginTouched = useRef(false);
  const [project, setProject] = useState("");
  const [customer, setCustomer] = useState("");
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState<Record<string, CalcLine[]>>({});
  const [customForm, setCustomForm] = useState({ name: "", rate: "", qty: "1" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [undo, setUndo] = useState<Record<string, string> | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    fetch("/api/estimate/rates", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as Partial<Prices> & { error?: string };
        if (!response.ok) throw new Error(response.status === 401 ? "Your sign-in has ended. Please sign in again." : body.error ?? "The price list could not be opened.");
        return body;
      })
      .then((body) => {
        if (!live) return;
        setPrices({ rates: body.rates ?? {}, margin: body.margin ?? DEFAULT_MARGIN, updatedAt: body.updatedAt ?? "", canEdit: body.canEdit === true, ai: body.ai === true });
        setMarginText((current) => (marginTouched.current ? current : String(body.margin ?? DEFAULT_MARGIN)));
        setLoadError("");
      })
      .catch((error) => { if (live) setLoadError(error instanceof Error ? error.message : "The price list could not be opened."); });
    return () => { live = false; };
  }, [reload]);
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const trade = TRADES.find((entry) => entry.id === tab) ?? null;
  const canEdit = prices?.canEdit === true;
  const marginPercent = Math.max(0, Number(marginText) || 0);
  const editing = canEdit && mode === "builder";

  const rateFor = useCallback((key: string): number | null => {
    if (key in draft) return toRateCents(draft[key]);
    const saved = prices?.rates[key];
    return typeof saved === "number" ? saved : null;
  }, [draft, prices]);

  const lines: CalcLine[] = useMemo(() => {
    if (!trade) return [];
    const base = trade.sections.flatMap((section) => section.items).map((item) => ({ key: item.key, name: item.name, unit: item.unit, qty: toQty(qty[item.key] ?? "0", trade.decimal), rateCents: rateFor(item.key) }));
    return [...base, ...(custom[trade.id] ?? [])];
  }, [trade, qty, custom, rateFor]);
  const totals = useMemo(() => estimateTotals(lines, { mode, marginPercent }), [lines, mode, marginPercent]);

  const pricedCount = trade ? trade.sections.flatMap((section) => section.items).filter((item) => rateFor(item.key) !== null).length : 0;
  const totalCount = trade ? trade.sections.reduce((sum, section) => sum + section.items.length, 0) : 0;
  const dirtyKeys = Object.keys(draft).filter((key) => {
    const saved = prices?.rates[key];
    return toRateCents(draft[key]) !== (typeof saved === "number" ? saved : null);
  });
  const marginDirty = canEdit && prices !== null && Math.abs(marginPercent - prices.margin) > 0.0001;

  function setQuantity(key: string, value: string) { setQty((current) => ({ ...current, [key]: value })); }
  function step(key: string, direction: 1 | -1, decimal: boolean) {
    const now = toQty(qty[key] ?? "0", decimal);
    const next = Math.max(0, Math.round((now + direction * (decimal ? 0.5 : 1)) * 100) / 100);
    setQuantity(key, String(next));
  }

  function clearQuantities() {
    if (!trade) return;
    const keys = trade.sections.flatMap((section) => section.items.map((item) => item.key));
    const snapshot = Object.fromEntries(keys.filter((key) => toQty(qty[key] ?? "0", trade.decimal) > 0).map((key) => [key, qty[key]]));
    const customCount = (custom[trade.id] ?? []).length;
    if (!Object.keys(snapshot).length && !customCount) return;
    if (!window.confirm("Clear every quantity on this page? You will have 7 seconds to undo it.")) return;
    setQty((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !keys.includes(key))));
    setUndo(snapshot);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  }
  function undoClear() {
    if (!undo) return;
    setQty((current) => ({ ...current, ...undo }));
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  async function savePrices() {
    if (!canEdit || saving || (!dirtyKeys.length && !marginDirty)) return;
    setSaving(true);
    setProblem("");
    setNotice("");
    try {
      const rates = Object.fromEntries(dirtyKeys.map((key) => {
        const cents = toRateCents(draft[key]);
        return [key, cents === null ? null : cents / 100];
      }));
      const response = await fetch("/api/estimate/rates", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(dirtyKeys.length ? { rates } : {}), ...(marginDirty ? { margin: marginPercent } : {}) }),
      });
      const body = await response.json().catch(() => ({})) as Partial<Prices> & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The prices could not be saved.");
      setPrices((current) => ({ rates: body.rates ?? {}, margin: body.margin ?? DEFAULT_MARGIN, updatedAt: body.updatedAt ?? "", canEdit: true, ai: current?.ai }));
      setDraft({});
      marginTouched.current = false;
      setNotice("Prices saved. Every calculator now uses them.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The prices could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function loadPrevious() {
    if (!trade || !canEdit) return;
    setProblem("");
    try {
      const filled = unfilled(await fetchStarterPrices(), prices?.rates ?? {}, draft, (key) => key.startsWith(`${trade.id}:`));
      if (!Object.keys(filled).length) { setNotice("Every item on this page already has a price."); return; }
      setDraft((current) => ({ ...current, ...filled }));
      setNotice(`${Object.keys(filled).length} prices were filled in from the earlier version of this tool. Check them against your real costs, change what is wrong, then press Save prices.`);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The previous prices could not be loaded.");
    }
  }

  function addCustom() {
    if (!trade) return;
    const name = customForm.name.trim();
    const rateCents = toRateCents(customForm.rate);
    const quantity = toQty(customForm.qty, true);
    if (!name || rateCents === null || !quantity) { setProblem("A custom item needs a name, a rate and a quantity above zero."); return; }
    setProblem("");
    setCustom((current) => ({ ...current, [trade.id]: [...(current[trade.id] ?? []), { key: `custom:${Date.now()}`, name, unit: "each", qty: quantity, rateCents }] }));
    setCustomForm({ name: "", rate: "", qty: "1" });
  }

  function send() {
    if (!trade || !onUseLines) return;
    const chosen = calculatorLines(lines, () => groupFor(trade.id));
    if (!chosen.length) { setProblem("Choose at least one item that has a rate first."); return; }
    setProblem("");
    onUseLines({ lines: chosen, margin: marginPercent, mode, summary: `${trade.label} work${project ? ` — ${project}` : ""}` });
    setNotice(`${chosen.length} line${chosen.length === 1 ? "" : "s"} sent to the estimate calculator. If no job is open for pricing yet, they wait there and appear when you open one.`);
  }

  async function copy() {
    if (!trade) return;
    const text = scopeText(lines, { mode, marginPercent, title: `${trade.label} estimate`, project, customer });
    try { await navigator.clipboard.writeText(text); setNotice("Copied. Paste it into a quote or message."); } catch { setProblem("Your browser did not allow copying. Use Print instead."); }
  }

  const needle = search.trim().toLowerCase();
  const show = (text: string) => !needle || text.toLowerCase().includes(needle);

  return <section className={styles.tools} aria-label="Estimate tools" data-role={role}>
    <header className={styles.head}>
      <div><span>ESTIMATE TOOLS</span><h2>Price the work from the company price list</h2>
        <p>Pick the trade, enter quantities and the total builds itself. {canEdit ? "You set the prices once; everyone who estimates uses them." : "The prices are set by the Owner or Admin."}</p></div>
    </header>

    <nav className={styles.tabs} aria-label="Estimate tools">
      {TABS.map((entry) => <button key={entry.id} type="button" aria-pressed={tab === entry.id} className={tab === entry.id ? styles.tabOn : ""} onClick={() => { setTab(entry.id); setProblem(""); setNotice(""); }}>{entry.label}{entry.hint ? <small>{entry.hint}</small> : null}</button>)}
    </nav>

    {loadError && <p className={styles.warn} role="alert">{loadError} <button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></p>}
    {problem && <p className={styles.warn} role="alert">{problem}</p>}
    {notice && <p className={styles.ok} role="status">{notice}</p>}

    {trade && prices && <>
      <section className={styles.setup}>
        <label><span>Project / address</span><input value={project} onChange={(event) => setProject(event.target.value)} placeholder="e.g. Point Cook renovation" autoComplete="off" /></label>
        <label><span>Prepared for</span><input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Customer name" autoComplete="off" /></label>
        <label><span>Price mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="builder">Builder quote (+{marginPercent}% margin)</option>
            <option value="customer">Customer direct (no margin)</option>
          </select></label>
        {mode === "builder" && <label><span>Builder margin %</span><input type="number" min="0" max="200" step="1" inputMode="decimal" value={marginText} onChange={(event) => { setMarginText(event.target.value); marginTouched.current = true; }} /></label>}
      </section>

      <section className={styles.summary} aria-live="polite">
        <div className={styles.totalBox}>
          <span>{mode === "builder" ? "Builder quote total inc GST" : "Customer direct total inc GST"}</span>
          <strong>{aud(totals.total)}</strong>
          <small>Ex GST {aud(totals.base)} · GST {aud(totals.gst)}{mode === "builder" && totals.margin ? ` · includes margin ${aud(totals.margin)}` : ""}</small>
        </div>
        <div className={styles.stats}><div><b>{totals.selected}</b><span>Selected items</span></div><div><b>{totals.quantity}</b><span>Total quantity</span></div><div><b>{pricedCount}/{totalCount}</b><span>Rates set</span></div></div>
        <div className={styles.actions}>
          {onUseLines && <button type="button" className={styles.primary} onClick={send}>Send to the estimate calculator ↓</button>}
          <button type="button" className={onUseLines ? "" : styles.primary} onClick={() => { if (!printEstimate(trade, lines, { mode, marginPercent, project, customer })) setProblem("Your browser blocked the print window. Allow pop-ups for this site and try again."); }}>Print / save PDF</button>
          <button type="button" onClick={() => void copy()}>Copy as text</button>
          <button type="button" onClick={clearQuantities}>Clear quantities</button>
          {undo && <button type="button" className={styles.undo} onClick={undoClear}>Undo clear</button>}
        </div>
      </section>

      {totals.unpriced > 0 && <p className={styles.warn}>{totals.unpriced} selected item{totals.unpriced === 1 ? " has" : "s have"} no rate yet, so {totals.unpriced === 1 ? "it is" : "they are"} not in the total. {canEdit ? "Type the rate on the item, then press Save prices." : "Ask the Owner or Admin to set the rate."}</p>}
      {pricedCount === 0 && <p className={styles.info}>{canEdit ? "No prices are set yet. This is your own price list: type what each item costs you (ex GST) in the Rate box of each item, then press Save prices. Nothing is pre-filled, so no wrong price can slip into a quote." : "No prices have been set yet. The Owner or Admin sets them once, then the totals work here."}</p>}

      <section className={styles.filters}>
        <label><span>Search items</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${trade.label.toLowerCase()} items…`} /></label>
        {canEdit && <div className={styles.saveBar}>
          <span>{dirtyKeys.length || marginDirty ? `${dirtyKeys.length} price change${dirtyKeys.length === 1 ? "" : "s"}${marginDirty ? " + margin" : ""} not saved` : "Prices are saved"}</span>
          {pricedCount < totalCount && <button type="button" onClick={() => void loadPrevious()}>Fill in previous prices</button>}
          <button type="button" className={styles.primary} disabled={saving || (!dirtyKeys.length && !marginDirty)} onClick={() => void savePrices()}>{saving ? "Saving…" : "Save prices"}</button>
        </div>}
      </section>

      <div className={styles.sections}>
        {trade.sections.map((section) => {
          const items = section.items.filter((item) => show(`${item.name} ${item.detail} ${section.title}`));
          if (!items.length) return null;
          return <details className={styles.section} key={section.title} open>
            <summary><div><h3>{section.title}</h3>{section.blurb && <p>{section.blurb}</p>}</div><i aria-hidden="true">›</i></summary>
            {items.map((item) => {
              const rate = rateFor(item.key);
              const quantity = toQty(qty[item.key] ?? "0", trade.decimal);
              return <div className={`${styles.item} ${quantity > 0 ? styles.itemOn : ""}`} key={item.key}>
                <div className={styles.itemName}><strong>{item.shown || item.name}</strong><em>{item.unit}</em>{item.detail && <p>{item.detail}</p>}</div>
                {mode === "builder" && <div className={styles.rate}>
                  {editing
                    ? <label><span>Rate ex GST</span><input inputMode="decimal" placeholder="0.00" value={item.key in draft ? draft[item.key] : rate === null ? "" : (rate / 100).toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, [item.key]: event.target.value }))} aria-label={`Rate for ${item.name}, dollars ex GST`} /></label>
                    : <span>{rate === null ? "Rate not set" : `${aud(rate)} / ${item.unit}`}</span>}
                </div>}
                <div className={styles.qty}>
                  <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => step(item.key, -1, trade.decimal)}>−</button>
                  <input type="number" min="0" step={trade.decimal ? "0.01" : "1"} inputMode={trade.decimal ? "decimal" : "numeric"} value={qty[item.key] ?? "0"} onChange={(event) => setQuantity(item.key, event.target.value)} aria-label={`Quantity of ${item.name}`} />
                  <button type="button" aria-label={`Increase ${item.name}`} onClick={() => step(item.key, 1, trade.decimal)}>+</button>
                </div>
                {mode === "builder" && <div className={styles.lineTotal}>{rate === null ? "—" : aud(Math.round(rate * quantity))}</div>}
              </div>;
            })}
          </details>;
        })}
      </div>

      <section className={styles.customCard}>
        <h3>Custom item</h3>
        <div className={styles.customGrid}>
          <label><span>Item name</span><input value={customForm.name} onChange={(event) => setCustomForm((form) => ({ ...form, name: event.target.value }))} placeholder="e.g. Custom flashing" /></label>
          <label><span>Rate ex GST</span><input inputMode="decimal" value={customForm.rate} onChange={(event) => setCustomForm((form) => ({ ...form, rate: event.target.value }))} placeholder="250" /></label>
          <label><span>Quantity</span><input inputMode="decimal" value={customForm.qty} onChange={(event) => setCustomForm((form) => ({ ...form, qty: event.target.value }))} /></label>
          <button type="button" onClick={addCustom}>Add item</button>
        </div>
        {(custom[trade.id] ?? []).map((line) => <div className={styles.customRow} key={line.key}><span>{line.name} — {line.qty} × {line.rateCents === null ? "—" : aud(line.rateCents)}</span>
          <button type="button" onClick={() => setCustom((current) => ({ ...current, [trade.id]: (current[trade.id] ?? []).filter((entry) => entry.key !== line.key) }))} aria-label={`Remove ${line.name}`}>Remove</button></div>)}
        <p className={styles.fine}>Custom items are only part of this estimate; they are not added to the price list.</p>
      </section>
    </>}

    {(tab === "plan" || tab === "quote") && prices && <PlanTools kind={tab} prices={prices} onUseLines={onUseLines} />}
    {tab === "renovation" && <RenovationBudget prices={prices} onPricesChange={setPrices} onUseLines={onUseLines} />}
    {tab === "invoice" && <InvoiceTool />}
    {tab === "soon" && <section className={styles.soon}>
      <article><h3>Tiling</h3><p>A tiling estimator with the same price list and the same Builder / Customer modes. It is the next trade to be added.</p><span>Coming next</span></article>
      <article><h3>Engineering with several AIs</h3><p>Ask more than one AI the same engineering question and compare the answers side by side. It needs the AI services you choose to connect, so it is added after the first three trades and the plan estimator are in daily use.</p><span>Coming later</span></article>
    </section>}
    <p className={styles.fine}>Data in this price list: {ALL_ITEMS.length} items across Electrical, Plumbing and Cladding. Prices are internal to the company and are never shown to customers.</p>
  </section>;
}
