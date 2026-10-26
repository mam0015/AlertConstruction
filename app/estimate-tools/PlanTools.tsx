"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./estimate-tools.module.css";
import { TRADES, type TradeId } from "./catalogue";
import { aud, estimateTotals } from "./calc.mjs";
import type { Prices, UsePayload } from "./EstimateTools";

type Confidence = "high" | "medium" | "low";
type PlanItem = { action: "added" | "removed" | "moved"; catalog_index: number; quantity: number; confidence: Confidence; evidence: string };
type Plan = { status: "success" | "missing_trade_plan"; summary: string; legend_findings: { plan: string; symbol_label: string; meaning: string; evidence: string; confidence: Confidence }[]; symbols: { symbol_label: string; description: string; existing_quantity: number; proposed_quantity: number; unchanged_quantity: number; added_quantity: number; removed_quantity: number; moved_quantity: number; confidence: Confidence }[]; items: PlanItem[]; assumptions: string[]; warnings: string[]; unpriced_items: string[]; method?: string };
type QuoteItem = { quoted_name: string; quantity: number; quoted_unit_price_ex_gst: number; quoted_line_total_ex_gst: number; match_confidence: string; item_name: string; company_unit_rate: number; company_line_total_ex_gst: number; difference_ex_gst: number; status: "expensive" | "cheap" | "fair" | "unmatched" | "no_rate"; notes: string; evidence: string };
type Quote = { supplier: string; quote_number: string; summary: string; gst_treatment: string; quote_total_ex_gst: number; quote_total_inc_gst: number; items: QuoteItem[]; warnings: string[]; counts: Record<string, number> };
type Picked = { name: string; type: string; size: number; data: string };

const PLAN_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const QUOTE_TYPES = [...PLAN_TYPES, "text/plain", "text/csv"];
const MAX_PLAN_MB = 7;
const MAX_QUOTE_MB = 12;
const ACTION_WORD = { added: "Added", removed: "Removed", moved: "Moved" } as const;
const STATUS_WORD: Record<QuoteItem["status"], string> = { expensive: "Above your price", cheap: "Below your price", fair: "Fair", unmatched: "No match", no_rate: "No price set" };
const money = (dollars: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(dollars);

function typeOf(file: File) {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", txt: "text/plain", csv: "text/csv" } as Record<string, string>)[extension] ?? "";
}
function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result ?? ""); resolve(text.slice(text.indexOf(",") + 1)); };
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

function FilePick({ label, hint, types, maxMb, picked, onPick, disabled }: { label: string; hint: string; types: string[]; maxMb: number; picked: Picked | null; onPick: (file: Picked | null, problem?: string) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  async function choose(file?: File) {
    if (!file) return;
    const type = typeOf(file);
    if (!types.includes(type)) { onPick(null, `${label}: choose ${types.includes("text/plain") ? "a PDF, image, TXT or CSV file (save Word files as PDF first)" : "a PDF, PNG, JPG or WEBP file"}.`); return; }
    if (file.size > maxMb * 1048576) { onPick(null, `${label}: the file is larger than ${maxMb} MB. Export a smaller PDF and try again.`); return; }
    try { onPick({ name: file.name, type, size: file.size, data: await readBase64(file) }); } catch { onPick(null, `${label}: the file could not be read.`); }
  }
  return <div className={styles.field}>
    <span>{label}</span>
    <div className={styles.row}>
      <input ref={input} type="file" accept={types.join(",")} disabled={disabled} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} aria-label={label} />
    </div>
    <small>{picked ? `${picked.name} · ${(picked.size / 1048576).toFixed(2)} MB` : hint}</small>
    {picked && <button type="button" disabled={disabled} onClick={() => onPick(null)} style={{ alignSelf: "flex-start" }}>Remove</button>}
  </div>;
}

export default function PlanTools({ kind, prices, onUseLines }: { kind: "plan" | "quote"; prices: Prices; onUseLines?: (payload: UsePayload) => void }) {
  const [trade, setTrade] = useState<TradeId>("electrical");
  const [existing, setExisting] = useState<Picked | null>(null);
  const [proposed, setProposed] = useState<Picked | null>(null);
  const [quoteFile, setQuoteFile] = useState<Picked | null>(null);
  const [scanMode, setScanMode] = useState<"fast" | "smart">("fast");
  const [question, setQuestion] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<"builder" | "customer">("builder");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const info = TRADES.find((entry) => entry.id === trade)!;
  const items = useMemo(() => info.sections.flatMap((section) => section.items), [info]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const connected = prices.ai === true;
  const rateFor = (index: number) => { const cents = prices.rates[items[index]?.key]; return typeof cents === "number" ? cents : null; };

  function reset() { setPlan(null); setQuote(null); setEdited({}); setProblem(""); setNotice(""); }
  function pick(setter: (value: Picked | null) => void) { return (file: Picked | null, message?: string) => { setter(file); reset(); if (message) setProblem(message); }; }

  async function send(path: string, body: unknown) {
    setBusy(true); setSeconds(0); setProblem(""); setNotice("");
    timer.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { analysis?: Plan & Quote; error?: string };
      if (!response.ok || !result.analysis) throw new Error(response.status === 401 ? "Your sign-in has ended. Please sign in again." : result.error ?? "The AI could not read these files.");
      return result.analysis;
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
    }
  }

  async function compare() {
    if (busy) return;
    if (!existing || !proposed) { setProblem("Upload both the Existing / Before plan and the Proposed / Future plan."); return; }
    reset();
    try {
      const analysis = await send("/api/estimate/plan", { trade, scanMode, question, existing, proposed }) as Plan;
      setPlan({ ...analysis });
    } catch (error) { setProblem(error instanceof Error ? error.message : "The AI could not read these files."); }
  }
  async function review() {
    if (busy) return;
    if (!quoteFile) { setProblem("Upload the quote first."); return; }
    reset();
    try {
      setQuote(await send("/api/estimate/quote", { trade, file: quoteFile }) as unknown as Quote);
    } catch (error) { setProblem(error instanceof Error ? error.message : "The AI could not read this quote."); }
  }

  // ---- the priced plan --------------------------------------------------------------------------------------------------------------------
  const lines = (plan?.items ?? []).map((item, index) => {
    const typed = edited[index];
    const quantity = typed === undefined ? item.quantity : Math.max(0, Number(typed) || 0);
    return { ...item, index, quantity, rateCents: rateFor(item.catalog_index), name: items[item.catalog_index]?.name ?? "Item", unit: items[item.catalog_index]?.unit ?? "each" };
  });
  const totals = estimateTotals(lines.map((line) => ({ rateCents: line.rateCents, qty: line.quantity })), { mode, marginPercent: prices.margin });

  function sendToEstimate() {
    if (!onUseLines) return;
    const chosen = lines.filter((line) => line.quantity > 0 && line.rateCents !== null);
    if (!chosen.length) { setProblem("There is nothing with a price to add yet."); return; }
    onUseLines({
      lines: chosen.map((line) => ({ group: trade === "cladding" ? "Materials" : "Subcontractor", description: `${ACTION_WORD[line.action]}: ${line.name}`, quantity: String(line.quantity), unit: line.unit, unitPrice: ((line.rateCents ?? 0) / 100).toFixed(2) })),
      margin: prices.margin, mode, summary: `${info.label} plan comparison${existing && proposed ? ` (${existing.name} → ${proposed.name})` : ""}`,
    });
    setNotice("The priced lines were sent to the estimate calculator. If no job is open for pricing yet, they wait there and appear when you open one.");
  }

  const tradePick = <label className={styles.field} style={{ maxWidth: 260 }}><span>Trade</span>
    <select value={trade} disabled={busy} onChange={(event) => { setTrade(event.target.value as TradeId); reset(); }}>{TRADES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>;

  const consent = <label className={styles.row} style={{ gap: 8, alignItems: "flex-start" }}>
    <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} style={{ width: 22, minHeight: 22, marginTop: 2 }} />
    <span style={{ fontSize: 13, color: "#c2c0bd" }}>I understand the files I upload are sent to Anthropic&apos;s Claude AI to be read. Nothing is stored in this app. The AI never sees any price.</span>
  </label>;

  const notConnected = !connected && <p className={styles.info}>The AI is not connected yet. It uses the same Claude key as Jarvis 1: create an Anthropic key, save it as the <code>JARVIS_ANTHROPIC_API_KEY</code> secret in GitHub, then run the deploy again. Until then this screen cannot read files.</p>;

  if (kind === "plan") {
    return <section className={styles.panel} aria-label="AI plan estimator">
      <h3>AI plan estimator</h3>
      <p>Upload the Existing (before) and the Proposed (after) drawings of one trade. The AI counts the symbols on each, finds what was added, removed or moved, and the app prices those quantities from your price list. You check and correct every line before using it.</p>
      {notConnected}
      {problem && <p className={styles.warn} role="alert">{problem}</p>}
      {notice && <p className={styles.ok} role="status">{notice}</p>}
      <div className={styles.grid2}>
        {tradePick}
        <label className={styles.field}><span>Method</span>
          <select value={scanMode} disabled={busy} onChange={(event) => { setScanMode(event.target.value as "fast" | "smart"); reset(); }}>
            <option value="fast">Fast Vision — one pass, check every count</option><option value="smart">Smart Review — deeper and slower</option></select></label>
        <FilePick label="Existing / Before plan" hint={`PDF, PNG, JPG or WEBP, up to ${MAX_PLAN_MB} MB`} types={PLAN_TYPES} maxMb={MAX_PLAN_MB} picked={existing} onPick={pick(setExisting)} disabled={busy} />
        <FilePick label="Proposed / Future plan" hint={`PDF, PNG, JPG or WEBP, up to ${MAX_PLAN_MB} MB`} types={PLAN_TYPES} maxMb={MAX_PLAN_MB} picked={proposed} onPick={pick(setProposed)} disabled={busy} />
      </div>
      <label className={styles.field}><span>Anything the AI should know (optional)</span><input value={question} maxLength={1500} onChange={(event) => setQuestion(event.target.value)} placeholder={`e.g. Only the ground floor ${info.label.toLowerCase()} work`} /></label>
      {consent}
      <div className={styles.row}>
        <button type="button" className={styles.primary} disabled={busy || !connected || !agree || !existing || !proposed} onClick={() => void compare()}>{busy ? `Reading the plans… ${seconds}s` : "Compare the plans"}</button>
        {busy && <small className={styles.fine}>Smart Review can take a few minutes. Keep this page open.</small>}
      </div>

      {plan?.status === "missing_trade_plan" && <p className={styles.warn}>The AI could not compare these files: {plan.summary || "they do not show matching trade drawings."} Upload matching Existing and Proposed {info.label.toLowerCase()} sheets, including their legends. No price was produced.</p>}

      {plan?.status === "success" && <>
        <p className={styles.info}>{plan.summary} <strong>{plan.method === "smart" ? "Smart Review" : "Fast Vision"}:</strong> {plan.method === "smart" ? "higher confidence, still needs a trade review." : "medium confidence, check every count."}</p>
        {plan.symbols.length > 0 && <div className={styles.scroll}><table className={styles.table}>
          <thead><tr><th>Symbol</th><th className="n" style={{ textAlign: "right" }}>Before</th><th className="n" style={{ textAlign: "right" }}>After</th><th className="n" style={{ textAlign: "right" }}>Same</th><th className="n" style={{ textAlign: "right" }}>Added</th><th className="n" style={{ textAlign: "right" }}>Removed</th><th className="n" style={{ textAlign: "right" }}>Moved</th><th>Confidence</th></tr></thead>
          <tbody>{plan.symbols.map((symbol, index) => <tr key={`${symbol.symbol_label}-${index}`}><td><strong>{symbol.symbol_label}</strong><br /><small style={{ color: "#a6a4a0" }}>{symbol.description}</small></td>
            <td className="n">{symbol.existing_quantity}</td><td className="n">{symbol.proposed_quantity}</td><td className="n">{symbol.unchanged_quantity}</td><td className="n">{symbol.added_quantity}</td><td className="n">{symbol.removed_quantity}</td><td className="n">{symbol.moved_quantity}</td>
            <td><span className={`${styles.tag} ${symbol.confidence === "high" ? styles.tagHigh : symbol.confidence === "medium" ? styles.tagMedium : styles.tagLow}`}>{symbol.confidence}</span></td></tr>)}</tbody>
        </table></div>}

        <h3 style={{ fontSize: 16 }}>Priced work from the comparison</h3>
        {lines.length === 0 ? <p className={styles.fine}>Nothing could be matched to an item in your price list.</p> : <>
          <div className={styles.scroll}><table className={styles.table}>
            <thead><tr><th>Work</th><th className="n" style={{ textAlign: "right" }}>Quantity (edit if wrong)</th><th className="n" style={{ textAlign: "right" }}>Your rate</th><th className="n" style={{ textAlign: "right" }}>Line</th><th>Confidence</th></tr></thead>
            <tbody>{lines.map((line) => <tr key={line.index}>
              <td><span className={styles.tag}>{ACTION_WORD[line.action]}</span> <strong>{line.name}</strong><br /><small style={{ color: "#a6a4a0" }}>{line.evidence}</small></td>
              <td className="n"><input type="number" min="0" step={info.decimal ? "0.01" : "1"} style={{ width: 90 }} value={edited[line.index] ?? String(line.quantity)} onChange={(event) => setEdited((current) => ({ ...current, [line.index]: event.target.value }))} aria-label={`Quantity of ${line.name}`} /></td>
              <td className="n">{line.rateCents === null ? "no price set" : aud(line.rateCents)}</td>
              <td className="n">{line.rateCents === null ? "—" : aud(Math.round(line.rateCents * line.quantity))}</td>
              <td><span className={`${styles.tag} ${line.confidence === "high" ? styles.tagHigh : line.confidence === "medium" ? styles.tagMedium : styles.tagLow}`}>{line.confidence}</span></td></tr>)}</tbody>
          </table></div>
          {totals.unpriced > 0 && <p className={styles.warn}>{totals.unpriced} line{totals.unpriced === 1 ? " has" : "s have"} no price in your price list yet and {totals.unpriced === 1 ? "is" : "are"} not in the total. Set the price in the {info.label} tab.</p>}
          <div className={styles.summary}>
            <div className={styles.totalBox}><span>{mode === "builder" ? `Builder quote inc GST (+${prices.margin}% margin)` : "Customer direct inc GST"}</span><strong>{aud(totals.total)}</strong><small>Ex GST {aud(totals.base)} · GST {aud(totals.gst)}</small></div>
            <label className={styles.field}><span>Price mode</span><select value={mode} onChange={(event) => setMode(event.target.value as "builder" | "customer")}><option value="builder">Builder quote (+{prices.margin}%)</option><option value="customer">Customer direct (no margin)</option></select></label>
          </div>
          {onUseLines && <div className={styles.row}><button type="button" className={styles.primary} onClick={sendToEstimate}>Send to the estimate calculator ↓</button></div>}
        </>}
        {plan.unpriced_items.length > 0 && <div className={styles.info}><strong>Not priced</strong><ul>{plan.unpriced_items.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>}
        {plan.warnings.length > 0 && <div className={styles.warn}><strong>Check these</strong><ul>{plan.warnings.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>}
        {plan.assumptions.length > 0 && <details><summary>Assumptions the AI made</summary><ul>{plan.assumptions.map((entry) => <li key={entry}>{entry}</li>)}</ul></details>}
        {plan.legend_findings.length > 0 && <details><summary>Legends the AI read</summary><ul>{plan.legend_findings.map((entry, index) => <li key={index}><strong>{entry.plan === "existing" ? "Before" : "After"}:</strong> {entry.symbol_label} = {entry.meaning} <small>({entry.confidence})</small></li>)}</ul></details>}
      </>}
    </section>;
  }

  return <section className={styles.panel} aria-label="Quote price check">
    <h3>Quote price check</h3>
    <p>Upload a tradie&apos;s quote. The AI reads every priced line and matches it to your price list; the app then flags the lines that are more than $100 above or below your own price for the same quantity.</p>
    {notConnected}
    {problem && <p className={styles.warn} role="alert">{problem}</p>}
    <div className={styles.grid2}>
      {tradePick}
      <FilePick label="Quote" hint={`PDF, image, TXT or CSV, up to ${MAX_QUOTE_MB} MB`} types={QUOTE_TYPES} maxMb={MAX_QUOTE_MB} picked={quoteFile} onPick={pick(setQuoteFile)} disabled={busy} />
    </div>
    {consent}
    <div className={styles.row}><button type="button" className={styles.primary} disabled={busy || !connected || !agree || !quoteFile} onClick={() => void review()}>{busy ? `Reading the quote… ${seconds}s` : "Check the quote"}</button></div>

    {quote && <>
      <p className={styles.info}>{quote.supplier ? <strong>{quote.supplier}</strong> : "Quote"}{quote.quote_number ? ` · ${quote.quote_number}` : ""} — {quote.summary || "reviewed"}. Quoted total {money(quote.quote_total_ex_gst)} ex GST ({money(quote.quote_total_inc_gst)} inc GST).</p>
      <div className={styles.row}>{(["expensive", "cheap", "fair", "unmatched", "no_rate"] as const).map((status) => <span key={status} className={`${styles.tag} ${status === "expensive" ? styles.tagLow : status === "fair" ? styles.tagHigh : styles.tagMedium}`}>{STATUS_WORD[status]}: {quote.counts[status] ?? 0}</span>)}</div>
      <div className={styles.scroll}><table className={styles.table}>
        <thead><tr><th>Quoted line</th><th className="n" style={{ textAlign: "right" }}>Qty</th><th className="n" style={{ textAlign: "right" }}>Quoted (ex GST)</th><th>Matched to your item</th><th className="n" style={{ textAlign: "right" }}>Your price</th><th className="n" style={{ textAlign: "right" }}>Difference</th><th>Result</th></tr></thead>
        <tbody>{quote.items.map((item, index) => <tr key={index}>
          <td><strong>{item.quoted_name}</strong>{item.notes && <><br /><small style={{ color: "#a6a4a0" }}>{item.notes}</small></>}</td>
          <td className="n">{item.quantity}</td><td className="n">{money(item.quoted_line_total_ex_gst)}</td>
          <td>{item.item_name || "—"}{item.item_name && <><br /><small style={{ color: "#a6a4a0" }}>match: {item.match_confidence}</small></>}</td>
          <td className="n">{item.status === "fair" || item.status === "expensive" || item.status === "cheap" ? money(item.company_line_total_ex_gst) : "—"}</td>
          <td className="n">{item.status === "fair" || item.status === "expensive" || item.status === "cheap" ? `${item.difference_ex_gst >= 0 ? "+" : "−"}${money(Math.abs(item.difference_ex_gst))}` : "—"}</td>
          <td><span className={`${styles.tag} ${item.status === "expensive" ? styles.tagLow : item.status === "fair" ? styles.tagHigh : styles.tagMedium}`}>{STATUS_WORD[item.status]}</span></td></tr>)}</tbody>
      </table></div>
      {quote.warnings.length > 0 && <div className={styles.warn}><strong>Check these</strong><ul>{quote.warnings.map((entry) => <li key={entry}>{entry}</li>)}</ul></div>}
      <p className={styles.fine}>The AI reads the quote; the comparison is arithmetic on your saved prices. Check every match before relying on it.</p>
    </>}
  </section>;
}
