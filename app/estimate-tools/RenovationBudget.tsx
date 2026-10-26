"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./estimate-tools.module.css";
import { aud, toRateCents } from "./calc.mjs";
import { ALLOWANCES, ALLOWANCE_GROUP_LABELS, CATEGORIES, QUALITY_LABELS, QUESTIONS, SCOPE_INFO } from "./renovation-data.mjs";
import { fetchStarterPrices, unfilled } from "./starter-client";
import { buildLines, defaultPriority, recommendations, totalsFor } from "./renovation-lines.mjs";
import type { Prices, UsePayload } from "./EstimateTools";

type Question = { id: string; label: string; type: "number" | "choice"; default?: number | string; min?: number; max?: number; step?: number; help?: string; options?: { value: string; label: string }[] };
type Line = { id: string; scope: string; trade: string; key: string; name: string; qty: number; unit: string; rate: number; builder: number; priority: "must" | "important" | "optional"; critical: boolean };
type Item = { key: string; name: string; unit: string };
type Project = { name: string; client: string; budget: string; propertyType: string; quality: string; contingency: string; goal: string };

const DRAFT_KEY = "atp.renovation.draft";
const scopeNames = SCOPE_INFO as Record<string, { name: string; description: string }>;
const questions = QUESTIONS as Record<string, Question[]>;
const money0 = (dollars: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(dollars);
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
const emptyProject: Project = { name: "", client: "", budget: "", propertyType: "House", quality: "standard", contingency: "15", goal: "Improve comfort and appearance" };
const defaultsFor = (scopes: string[]) => Object.fromEntries(scopes.flatMap((scope) => (questions[scope] ?? []).map((question) => [question.id, String(question.default ?? "")])));
const groupFor = (trade: string): "Materials" | "Labour" | "Subcontractor" | "Other" => (["Plumbing", "Electrical"].includes(trade) ? "Subcontractor" : trade === "Cladding" ? "Materials" : "Other");

export default function RenovationBudget({ prices, onPricesChange, onUseLines }: { prices: Prices | null; onPricesChange: (prices: Prices) => void; onUseLines?: (payload: UsePayload) => void }) {
  // The unfinished plan is remembered on this device only. This screen opens after a click, never during the server's first render,
  // so it can read what was remembered before its first paint.
  const [saved] = useState(() => {
    try {
      const value = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as { project?: Project; category?: string; scopes?: string[]; priorities?: Record<string, "must" | "important" | "optional">; answers?: Record<string, string> } | null;
      return value?.project ? value : null;
    } catch { return null; }
  });
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [project, setProject] = useState<Project>({ ...emptyProject, ...(saved?.project ?? {}) });
  const [category, setCategory] = useState(saved?.category ?? "");
  const [scopes, setScopes] = useState<string[]>(saved?.scopes ?? []);
  const [priorities, setPriorities] = useState<Record<string, "must" | "important" | "optional">>(saved?.priorities ?? {});
  const [answers, setAnswers] = useState<Record<string, string>>({ ...defaultsFor(saved?.scopes ?? []), ...(saved?.answers ?? {}) });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [showPrices, setShowPrices] = useState(false);

  useEffect(() => {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ project, category, scopes, priorities, answers })); } catch { /* not remembered */ }
  }, [project, category, scopes, priorities, answers]);

  const canEdit = prices?.canEdit === true;
  const marginPercent = prices?.margin ?? 20;
  const rateOf = (key: string): number | null => {
    if (key in draft) { const cents = toRateCents(draft[key]); return cents === null ? null : cents / 100; }
    const saved = prices?.rates[key];
    return typeof saved === "number" ? saved / 100 : null;
  };

  const built = useMemo(() => {
    if (step !== 4) return null;
    const state = { scopes, priorities, answers, project: { quality: project.quality } };
    return buildLines(state, rateOf) as { lines: Line[]; missing: Item[] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, scopes, priorities, answers, project.quality, prices, draft]);
  const budget = Number(project.budget) || 0;
  const contingency = Number(project.contingency) || 0;
  const totals = built && !built.missing.length ? totalsFor(built.lines, { budget, contingency, marginPercent }) : null;
  const picks = built && totals ? recommendations(built.lines, totals, { contingency, marginPercent }) as { now: (Line & { customerCost: number })[]; later: (Line & { customerCost: number })[]; optional: (Line & { customerCost: number })[] } : null;
  const dirty = Object.keys(draft).filter((key) => toRateCents(draft[key]) !== (typeof prices?.rates[key] === "number" ? prices.rates[key] : null));

  function chooseCategory(id: string) {
    const entry = CATEGORIES.find((item: { id: string }) => item.id === id);
    if (!entry) return;
    setCategory(id);
    if (id !== "custom") { setScopes([...entry.scopes]); setAnswers((current) => ({ ...defaultsFor(entry.scopes), ...current })); }
  }
  function toggleScope(scope: string) {
    setScopes((current) => {
      const next = current.includes(scope) ? current.filter((entry) => entry !== scope) : [...current, scope];
      setAnswers((answered) => ({ ...defaultsFor(next), ...answered }));
      return next;
    });
  }

  function next() {
    setProblem("");
    if (step === 1) {
      if (!project.name.trim()) { setProblem("Enter the project name or address."); return; }
      if (budget < 1000) { setProblem("Enter the available renovation budget."); return; }
    }
    if (step === 2) {
      if (!category) { setProblem("Select a renovation category."); return; }
      if (!scopes.length) { setProblem("Choose at least one renovation area."); return; }
    }
    setStep((current) => Math.min(4, current + 1) as 1 | 2 | 3 | 4);
  }

  async function savePrices() {
    if (!canEdit || saving || !dirty.length) return;
    setSaving(true);
    setProblem("");
    try {
      const rates = Object.fromEntries(dirty.map((key) => { const cents = toRateCents(draft[key]); return [key, cents === null ? null : cents / 100]; }));
      const response = await fetch("/api/estimate/rates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rates }) });
      const body = await response.json().catch(() => ({})) as Partial<Prices> & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The prices could not be saved.");
      onPricesChange({ rates: body.rates ?? {}, margin: body.margin ?? 20, updatedAt: body.updatedAt ?? "", canEdit: true, ai: prices?.ai });
      setDraft({});
      setMessage("Prices saved. The plan below uses them.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The prices could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function loadSuggestions() {
    setProblem("");
    try {
      const filled = unfilled(await fetchStarterPrices(), prices?.rates ?? {}, draft, (key) => key.startsWith("renovation:"));
      if (!Object.keys(filled).length) { setMessage("Every planning allowance already has a price."); return; }
      setDraft((current) => ({ ...current, ...filled }));
      setMessage(`${Object.keys(filled).length} planning allowances were filled in from the earlier version of this tool. They are only a starting point: check each against your real costs, change what is wrong, then press Save prices.`);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The previous prices could not be loaded.");
    }
  }

  function send() {
    if (!onUseLines || !built || !totals) return;
    onUseLines({
      lines: built.lines.map((line) => ({ group: groupFor(line.trade), description: `${line.name} (${scopeNames[line.scope]?.name ?? line.scope})`, quantity: String(Math.round(line.qty * 100) / 100), unit: line.unit, unitPrice: line.rate.toFixed(2) })),
      margin: marginPercent, mode: "builder", contingency, summary: `Renovation — ${project.name}`,
    });
    setMessage("The renovation lines were sent to the estimate calculator. If no job is open for pricing yet, they wait there and appear when you open one.");
  }

  function print() {
    if (!built || !totals) return;
    const win = window.open("", "_blank");
    if (!win) { setProblem("Your browser blocked the print window. Allow pop-ups for this site and try again."); return; }
    const groups = new Map<string, Line[]>();
    built.lines.forEach((line) => groups.set(line.trade, [...(groups.get(line.trade) ?? []), line]));
    const factor = (1 + marginPercent / 100) * 1.1;
    const rows = [...groups].map(([trade, items]) => `<tr class="g"><td colspan="3">${esc(trade)}</td><td class="n">${money0(items.reduce((sum, line) => sum + line.builder * factor, 0))}</td></tr>${items.map((line) => `<tr><td>${esc(line.name)}<br><small>${esc(scopeNames[line.scope]?.name ?? line.scope)}</small></td><td class="n">${esc(Math.round(line.qty * 100) / 100)} ${esc(line.unit)}</td><td class="n">${money0(line.rate * (1 + marginPercent / 100) * 1.1)}</td><td class="n">${money0(line.builder * factor)}</td></tr>`).join("")}`).join("");
    win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Renovation budget</title><style>
body{font:14px/1.45 Arial,sans-serif;color:#111;margin:32px}h1{margin:0 0 4px;font-size:24px}.sub{color:#555;margin:0 0 16px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:7px 8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{font-size:12px;text-transform:uppercase;color:#555}.n{text-align:right;white-space:nowrap}.g td{background:#f3f1ea;font-weight:700}small{color:#666}.tot{margin-left:auto;width:340px}.tot div{display:flex;justify-content:space-between;padding:4px 0}.tot .t{border-top:2px solid #111;font-size:18px;font-weight:700;margin-top:6px;padding-top:8px}
</style></head><body><h1>Renovation budget plan</h1><p class="sub">${esc(project.name)}${project.client ? ` · ${esc(project.client)}` : ""} · ${esc(QUALITY_LABELS[project.quality as keyof typeof QUALITY_LABELS] ?? project.quality)} finish · budget ${money0(budget)}</p>
<table><thead><tr><th>Item</th><th class="n">Quantity</th><th class="n">Rate</th><th class="n">Amount inc margin + GST</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot"><div><span>Pricing subtotal ex GST</span><span>${money0(totals.builderEx)}</span></div><div><span>Builder margin (${esc(marginPercent)}%)</span><span>${money0(totals.margin)}</span></div><div><span>GST (10%)</span><span>${money0(totals.gst)}</span></div><div><span>Contingency (${esc(contingency)}%)</span><span>${money0(totals.contingency)}</span></div><div class="t"><span>Estimated total</span><span>${money0(totals.grand)}</span></div></div>
<p><small>Planning allowances are not a fixed-price quote. Quantities come from the answers given; confirm every figure before quoting.</small></p>
<script>addEventListener("load",function(){setTimeout(function(){print()},250)})</script></body></html>`);
    win.document.close();
  }

  const allowanceItems: { group: string; items: Item[] }[] = Object.entries(ALLOWANCES as Record<string, Record<string, Item>>).map(([group, items]) => ({ group, items: Object.values(items) }));
  const priceInput = (item: Item) => canEdit
    ? <input inputMode="decimal" placeholder="0.00" style={{ width: 120 }} value={item.key in draft ? draft[item.key] : typeof prices?.rates[item.key] === "number" ? (prices.rates[item.key] / 100).toFixed(2) : ""} onChange={(event) => setDraft((current) => ({ ...current, [item.key]: event.target.value }))} aria-label={`Price for ${item.name}, dollars ex GST`} />
    : <span>{typeof prices?.rates[item.key] === "number" ? aud(prices.rates[item.key]) : "not set"}</span>;

  return <section className={styles.panel} aria-label="Renovation budget">
    <h3>Renovation budget</h3>
    <p>Answer a few questions about the job and the budget; the planner prices the work from your price list and shows what fits now, what waits and what is optional.</p>
    {problem && <p className={styles.warn} role="alert">{problem}</p>}
    {message && <p className={styles.ok} role="status">{message}</p>}
    <div className={styles.row} aria-label="Steps">
      {["Project", "Category", "Questions", "Results"].map((label, index) => <span key={label} className={`${styles.tag} ${step === index + 1 ? styles.tagMedium : ""}`}>{index + 1}. {label}</span>)}
    </div>

    {step === 1 && <div className={styles.grid2}>
      <label className={styles.field}><span>Project name or address</span><input value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value })} /></label>
      <label className={styles.field}><span>Client</span><input value={project.client} onChange={(event) => setProject({ ...project, client: event.target.value })} /></label>
      <label className={styles.field}><span>Available budget (inc GST)</span><input inputMode="decimal" value={project.budget} onChange={(event) => setProject({ ...project, budget: event.target.value })} placeholder="e.g. 60000" /></label>
      <label className={styles.field}><span>Property type</span><select value={project.propertyType} onChange={(event) => setProject({ ...project, propertyType: event.target.value })}>{["House", "Townhouse", "Unit / apartment", "Other"].map((option) => <option key={option}>{option}</option>)}</select></label>
      <label className={styles.field}><span>Finish quality</span><select value={project.quality} onChange={(event) => setProject({ ...project, quality: event.target.value })}>{Object.entries(QUALITY_LABELS as Record<string, string>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className={styles.field}><span>Contingency %</span><input inputMode="decimal" value={project.contingency} onChange={(event) => setProject({ ...project, contingency: event.target.value })} /></label>
      <label className={styles.field}><span>Goal</span><select value={project.goal} onChange={(event) => setProject({ ...project, goal: event.target.value })}>{["Improve comfort and appearance", "Prepare to sell", "Fix problems", "Add space", "Rental upgrade"].map((option) => <option key={option}>{option}</option>)}</select></label>
    </div>}

    {step === 2 && <>
      <div className={styles.grid2}>{CATEGORIES.map((entry: { id: string; name: string; description: string }) => <button type="button" key={entry.id} aria-pressed={category === entry.id} onClick={() => chooseCategory(entry.id)} style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start", borderColor: category === entry.id ? "#f7cf64" : undefined }}>
        <strong>{entry.name}</strong><span style={{ fontWeight: 400, fontSize: 13, color: "#bebcb9" }}>{entry.description}</span></button>)}</div>
      {category === "custom" && <div className={styles.row}>{Object.entries(scopeNames).map(([id, info]) => <label key={id} className={styles.row} style={{ gap: 6 }}><input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={scopes.includes(id)} onChange={() => toggleScope(id)} />{info.name}</label>)}</div>}
    </>}

    {step === 3 && scopes.map((scope) => <fieldset key={scope} style={{ border: "1px solid rgba(255,255,255,.1)", padding: 14, margin: 0 }}>
      <legend style={{ padding: "0 8px", fontWeight: 800 }}>{scopeNames[scope]?.name}</legend>
      <p className={styles.fine}>{scopeNames[scope]?.description}</p>
      <label className={styles.field} style={{ maxWidth: 260, marginBottom: 10 }}><span>Priority</span>
        <select value={priorities[scope] ?? defaultPriority(scope)} onChange={(event) => setPriorities((current) => ({ ...current, [scope]: event.target.value as "must" | "important" | "optional" }))}><option value="must">Must have</option><option value="important">Important</option><option value="optional">Optional</option></select></label>
      <div className={styles.grid2}>{(questions[scope] ?? []).map((question) => <label key={question.id} className={styles.field}><span>{question.label}</span>
        {question.type === "choice"
          ? <select value={answers[question.id] ?? String(question.default ?? "")} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}>{question.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          : <input type="number" inputMode="decimal" min={question.min ?? 0} max={question.max} step={question.step ?? 1} value={answers[question.id] ?? String(question.default ?? "")} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} />}
        {question.help && <small>{question.help}</small>}</label>)}</div>
    </fieldset>)}

    {step === 4 && built && <>
      {built.missing.length > 0 && <div className={styles.info}>
        <strong>{built.missing.length} price{built.missing.length === 1 ? " is" : "s are"} needed before a total can be shown.</strong>
        <p>Nothing is guessed: a plan is only calculated from prices the company has set. {canEdit ? "Type the prices below (ex GST, per unit), then press Save prices." : "Ask the Owner or Admin to set these prices."}</p>
        <div className={styles.scroll}><table className={styles.table}><tbody>{built.missing.map((item) => <tr key={item.key}><td>{item.name}</td><td>per {item.unit}</td><td className="n">{priceInput(item)}</td></tr>)}</tbody></table></div>
        {canEdit && built.missing.some((item) => item.key.startsWith("renovation:")) && <div className={styles.row}><button type="button" onClick={() => void loadSuggestions()}>Fill in previous allowances</button></div>}
        {canEdit && <div className={styles.row}><button type="button" className={styles.primary} disabled={saving || !dirty.length} onClick={() => void savePrices()}>{saving ? "Saving…" : "Save prices"}</button></div>}
      </div>}

      {totals && picks && built && <>
        <div className={styles.summary}>
          <div className={styles.totalBox}><span>Estimated renovation total inc GST and contingency</span><strong>{money0(totals.grand)}</strong>
            <small>{QUALITY_LABELS[project.quality as keyof typeof QUALITY_LABELS]} finish · {contingency}% contingency · {built.lines.length} priced items</small></div>
          <div className={styles.stats}><div><b>{money0(budget)}</b><span>Available budget</span></div><div><b>{totals.remaining >= 0 ? money0(totals.remaining) : `−${money0(totals.over)}`}</b><span>{totals.remaining >= 0 ? "Left over" : "Over budget"}</span></div><div><b>{built.lines.length}</b><span>Items priced</span></div></div>
        </div>
        <p className={totals.remaining >= 0 ? styles.ok : styles.warn}>{totals.remaining >= 0 ? "The selected renovation fits within the entered budget." : `The selected renovation is over budget by about ${money0(totals.over)}. Move lower-priority work to a later stage, or choose a more economical finish.`}</p>
        <div className={styles.grid2}>
          {([["Do now", picks.now], ["Do later", picks.later], ["Optional upgrades", picks.optional]] as const).map(([title, list]) => <div key={title} className={styles.panel} style={{ padding: 12 }}>
            <h3 style={{ fontSize: 15 }}>{title}</h3>
            {list.length ? list.map((line) => <div key={line.id} className={styles.row} style={{ justifyContent: "space-between", fontSize: 13 }}><span>{line.name}</span><strong>{money0(line.customerCost)}</strong></div>) : <p className={styles.fine}>Nothing here.</p>}
          </div>)}
        </div>
        <div className={styles.scroll}><table className={styles.table}>
          <thead><tr><th>Item</th><th className="n" style={{ textAlign: "right" }}>Qty</th><th className="n" style={{ textAlign: "right" }}>Rate</th><th className="n" style={{ textAlign: "right" }}>Amount inc margin + GST</th></tr></thead>
          <tbody>{built.lines.map((line) => <tr key={line.id}><td><strong>{line.name}</strong><br /><small style={{ color: "#a6a4a0" }}>{line.trade} · {scopeNames[line.scope]?.name} · {line.priority === "must" ? "Must have" : line.priority === "important" ? "Important" : "Optional"}</small></td>
            <td className="n">{Math.round(line.qty * 100) / 100} {line.unit}</td><td className="n">{money0(line.rate)}</td><td className="n">{money0(line.builder * (1 + marginPercent / 100) * 1.1)}</td></tr>)}</tbody>
        </table></div>
        <div className={styles.row}>
          {onUseLines && <button type="button" className={styles.primary} onClick={send}>Send to the estimate calculator ↓</button>}
          <button type="button" className={onUseLines ? "" : styles.primary} onClick={print}>Print / save PDF</button>
        </div>
        <p className={styles.fine}>Pricing subtotal {money0(totals.builderEx)} + builder margin {money0(totals.margin)} + GST {money0(totals.gst)} + contingency {money0(totals.contingency)}. This is a planning estimate, not a fixed-price quote.</p>
      </>}
    </>}

    <div className={styles.row}>
      {step > 1 && <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3 | 4)}>← Back</button>}
      {step < 4 && <button type="button" className={styles.primary} onClick={next}>{step === 3 ? "Calculate" : "Next →"}</button>}
      <button type="button" onClick={() => { if (window.confirm("Start a new renovation plan? The answers on this screen are cleared.")) { setProject(emptyProject); setCategory(""); setScopes([]); setPriorities({}); setAnswers({}); setStep(1); setMessage(""); } }}>New plan</button>
      <button type="button" onClick={() => setShowPrices((value) => !value)} aria-expanded={showPrices}>{showPrices ? "Hide" : "Show"} planning allowance prices</button>
    </div>

    {showPrices && <div className={styles.panel} style={{ padding: 14 }}>
      <h3 style={{ fontSize: 16 }}>Planning allowance prices (ex GST)</h3>
      <p>These cover the work that is not in the Electrical, Plumbing or Cladding lists (demolition, tiling, cabinetry, painting and so on). {canEdit ? "Set your own, or fill in the suggested starting numbers and correct them." : "The Owner or Admin sets them."}</p>
      {canEdit && <div className={styles.row}><button type="button" onClick={() => void loadSuggestions()}>Fill in previous allowances</button><button type="button" className={styles.primary} disabled={saving || !dirty.length} onClick={() => void savePrices()}>{saving ? "Saving…" : `Save prices${dirty.length ? ` (${dirty.length})` : ""}`}</button></div>}
      {allowanceItems.map(({ group, items }) => <div key={group}>
        <h3 style={{ fontSize: 14, margin: "8px 0 4px" }}>{(ALLOWANCE_GROUP_LABELS as Record<string, string>)[group] ?? group}</h3>
        <div className={styles.scroll}><table className={styles.table}><tbody>{items.map((item) => <tr key={item.key}><td>{item.name}</td><td>per {item.unit}</td><td className="n">{priceInput(item)}</td></tr>)}</tbody></table></div>
      </div>)}
    </div>}
  </section>;
}
