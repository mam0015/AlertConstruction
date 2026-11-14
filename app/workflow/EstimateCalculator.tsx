"use client";

import { useEffect, useMemo, useState } from "react";
import { onEstimateLines, takeEstimateLines } from "../estimate-tools/bridge";
import type { UsePayload } from "../estimate-tools/EstimateTools";

type Line = { id: number; group: "Materials" | "Labour" | "Subcontractor" | "Other"; description: string; quantity: string; unit: string; unitPrice: string };

const groups: Line["group"][] = ["Materials", "Labour", "Subcontractor", "Other"];
const templates = [
  { group: "Labour" as const, description: "Labour — licensed tradesperson", unit: "hours" },
  { group: "Labour" as const, description: "Labour — general labourer", unit: "hours" },
  { group: "Materials" as const, description: "Materials supplied", unit: "lot" },
  { group: "Subcontractor" as const, description: "Specialist subcontractor", unit: "lot" },
  { group: "Other" as const, description: "Permits, bins and site costs", unit: "lot" },
];

const aud = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
const amount = (value: string) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; };

// Lines sent from the Estimate tools (price-list based). A blank first line is replaced; the margin and contingency follow the tool's choice.
const fromTools = (payload: UsePayload, startId: number): Line[] => payload.lines.map((line, index) => ({ id: startId + index, ...line }));
const isBlank = (line: Line) => !line.description.trim() && !line.unitPrice.trim();

export default function EstimateCalculator({ initialTerms, busy, revision, onSubmit }: {
  initialTerms: string;
  busy: boolean;
  // The estimate saved for this job right now (its createdAt, "" when there is none).
  revision: string;
  // Resolves to the saved estimate's createdAt (as returned by the server), or false when nothing was saved.
  onSubmit: (payload: { amount: string; scope: string; terms: string; breakdown: string; replacing: string }) => Promise<{ revision?: string } | false>;
}) {
  // The estimate this calculator was opened on. Saving names it, so an estimate someone else saved in the meantime is never replaced
  // silently. After this calculator's own save, the estimate the server just saved becomes the one it is working on (never a newer one
  // that a background refresh brings in).
  const [opened, setOpened] = useState(revision);
  const [saving, setSaving] = useState(false);
  const newerSaved = !saving && revision !== opened;
  // Lines that were sent while no job was open for pricing are waiting; they appear as soon as the calculator opens.
  const [waiting] = useState(() => takeEstimateLines());
  const [lines, setLines] = useState<Line[]>(() => (waiting ? fromTools(waiting, 1) : [{ id: 1, group: "Materials", description: "", quantity: "1", unit: "lot", unitPrice: "" }]));
  const [markup, setMarkup] = useState(() => (waiting?.mode === "builder" ? String(waiting.margin) : "0"));
  const [contingency, setContingency] = useState(() => String(waiting?.contingency ?? 0));
  const [gst, setGst] = useState(true);
  const [terms, setTerms] = useState(initialTerms);
  const [summary, setSummary] = useState(() => waiting?.summary ?? "");
  const [received, setReceived] = useState(waiting?.lines.length ?? 0);

  useEffect(() => onEstimateLines((payload) => {
    setLines((all) => {
      const kept = all.filter((line) => !isBlank(line));
      return [...kept, ...fromTools(payload, Math.max(0, ...all.map((line) => line.id)) + 1)];
    });
    setMarkup(payload.mode === "builder" ? String(payload.margin) : "0");
    if (payload.contingency !== undefined) setContingency(String(payload.contingency));
    setSummary((current) => current || payload.summary);
    setReceived((count) => count + payload.lines.length);
  }), []);

  const totals = useMemo(() => {
    // Only lines with a description count: the total is always exactly what the scope and the priced working list.
    const subtotal = lines.filter((line) => line.description.trim()).reduce((sum, line) => sum + amount(line.quantity) * amount(line.unitPrice), 0);
    const markupValue = subtotal * (amount(markup) / 100);
    const contingencyValue = subtotal * (amount(contingency) / 100);
    const beforeGst = subtotal + markupValue + contingencyValue;
    const gstValue = gst ? beforeGst * 0.1 : 0;
    return { subtotal, markupValue, contingencyValue, beforeGst, gstValue, total: beforeGst + gstValue };
  }, [lines, markup, contingency, gst]);

  const byGroup = groups.map((group) => ({ group, total: lines.filter((line) => line.group === group && line.description.trim()).reduce((sum, line) => sum + amount(line.quantity) * amount(line.unitPrice), 0) }));

  function update(id: number, patch: Partial<Line>) { setLines((all) => all.map((line) => line.id === id ? { ...line, ...patch } : line)); }
  function add(template?: typeof templates[number]) {
    setLines((all) => [...all, { id: Math.max(0, ...all.map((line) => line.id)) + 1, group: template?.group ?? "Materials", description: template?.description ?? "", quantity: "1", unit: template?.unit ?? "lot", unitPrice: "" }]);
  }

  const priced = () => lines.filter((line) => line.description.trim() && amount(line.quantity) * amount(line.unitPrice) > 0);
  // What the CUSTOMER reads: the scope and the items with their quantities, and the GST — never the company's unit prices, cost groups,
  // margin or contingency (a builder's costs and markup stay inside the company).
  function buildScope() {
    const text = priced().map((line) => `• ${line.description.trim()} — ${amount(line.quantity)} ${line.unit}`);
    return [summary.trim(), ...text, gst ? `Total includes GST (10%) of ${aud(totals.gstValue)}.` : "Prices exclude GST."].filter(Boolean).join("\n");
  }
  // The priced working, kept for the Owner and Admin only (recorded with the estimate, never sent to the customer).
  function buildBreakdown() {
    const text = priced().map((line) => `• ${line.group}: ${line.description.trim()} — ${amount(line.quantity)} ${line.unit} × ${aud(amount(line.unitPrice))} = ${aud(amount(line.quantity) * amount(line.unitPrice))}`);
    const tail = [`Subtotal ${aud(totals.subtotal)}`];
    if (totals.markupValue) tail.push(`Margin ${aud(totals.markupValue)}`);
    if (totals.contingencyValue) tail.push(`Contingency ${aud(totals.contingencyValue)}`);
    tail.push(gst ? `GST (10%) ${aud(totals.gstValue)}` : "GST not included");
    tail.push(`Total ${aud(totals.total)}`);
    return [...text, tail.join(" · ")].join("\n");
  }

  // A priced line without a description would be charged without the customer seeing what for: it must be named (or removed) first.
  const unnamedPriced = lines.some((line) => !line.description.trim() && amount(line.quantity) * amount(line.unitPrice) > 0);
  const ready = totals.total > 0 && !unnamedPriced && lines.some((line) => line.description.trim() && amount(line.quantity) * amount(line.unitPrice) > 0);

  async function save() {
    setSaving(true);
    const saved = await onSubmit({ amount: totals.total.toFixed(2), scope: buildScope(), terms, breakdown: buildBreakdown(), replacing: opened });
    if (saved && saved.revision) setOpened(saved.revision);
    setSaving(false);
  }

  return <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
    {newerSaved && <div role="alert" style={{ margin: "0 0 10px", padding: "9px 12px", border: "1px solid rgba(255,120,90,.6)", background: "rgba(255,120,90,.08)", fontSize: 13 }}>
      Someone saved a newer estimate for this job after you opened this calculator. Your lines below are kept. Check the newer estimate first; saving now is refused unless you choose to replace it.
      <button type="button" style={{ marginLeft: 10 }} onClick={() => setOpened(revision)}>Replace it with my lines</button>
    </div>}
    {received > 0 && <p role="status" style={{ margin: "0 0 10px", padding: "9px 12px", border: "1px solid rgba(247,207,100,.5)", background: "rgba(247,207,100,.08)", fontSize: 13 }}>{received} line{received === 1 ? "" : "s"} came from the Estimate tools (priced from the company price list). Check the quantities and the margin, then approve.</p>}
    <label><span>Scope summary (what the customer is getting)</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="e.g. Supply and install … as discussed on site." /></label>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", opacity: .7 }}><th>Type</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Line total</th><th /></tr></thead>
        <tbody>{lines.map((line, row) => <tr key={line.id}>
          <td><select aria-label={`Line ${row + 1} type`} value={line.group} onChange={(event) => update(line.id, { group: event.target.value as Line["group"] })}>{groups.map((group) => <option key={group}>{group}</option>)}</select></td>
          <td><input aria-label={`Line ${row + 1} description`} value={line.description} onChange={(event) => update(line.id, { description: event.target.value })} placeholder="Item or task" /></td>
          <td><input aria-label={`Line ${row + 1} quantity`} style={{ width: 70 }} type="number" min="0" step="any" value={line.quantity} onChange={(event) => update(line.id, { quantity: event.target.value })} /></td>
          <td><input aria-label={`Line ${row + 1} unit`} style={{ width: 70 }} value={line.unit} onChange={(event) => update(line.id, { unit: event.target.value })} /></td>
          <td><input aria-label={`Line ${row + 1} unit price`} style={{ width: 100 }} type="number" min="0" step="any" value={line.unitPrice} onChange={(event) => update(line.id, { unitPrice: event.target.value })} placeholder="0.00" /></td>
          <td>{aud(amount(line.quantity) * amount(line.unitPrice))}</td>
          <td><button type="button" onClick={() => setLines((all) => all.length > 1 ? all.filter((item) => item.id !== line.id) : all)} aria-label="Remove line">×</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0" }}>
      <button type="button" onClick={() => add()}>＋ Add line</button>
      {templates.map((template) => <button type="button" key={template.description} onClick={() => add(template)}>＋ {template.description}</button>)}
    </div>
    <div className="estimate-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
      <label><span>Margin %</span><input type="number" min="0" step="any" value={markup} onChange={(event) => setMarkup(event.target.value)} /></label>
      <label><span>Contingency %</span><input type="number" min="0" step="any" value={contingency} onChange={(event) => setContingency(event.target.value)} /></label>
      <label><span>Add GST (10%)</span><select value={gst ? "yes" : "no"} onChange={(event) => setGst(event.target.value === "yes")}><option value="yes">Yes — add 10% GST</option><option value="no">No — price excludes GST</option></select></label>
    </div>
    <div style={{ margin: "14px 0", padding: 14, border: "1px solid currentColor", borderRadius: 8 }}>
      {byGroup.filter((row) => row.total > 0).map((row) => <div key={row.group} style={{ display: "flex", justifyContent: "space-between" }}><span>{row.group}</span><span>{aud(row.total)}</span></div>)}
      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{aud(totals.subtotal)}</span></div>
      {totals.markupValue > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Margin</span><span>{aud(totals.markupValue)}</span></div>}
      {totals.contingencyValue > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contingency</span><span>{aud(totals.contingencyValue)}</span></div>}
      {gst && <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST</span><span>{aud(totals.gstValue)}</span></div>}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800, marginTop: 6 }}><span>Estimate total</span><span>{aud(totals.total)}</span></div>
    </div>
    <label><span>Terms</span><input value={terms} onChange={(event) => setTerms(event.target.value)} /></label>
    {unnamedPriced && <p role="alert" style={{ margin: "8px 0", fontSize: 12, color: "#ffb4a8" }}>A line has a price but no description. Describe it (the customer sees the description) or remove it before approving.</p>}
    <p style={{ margin: "8px 0", fontSize: 12, opacity: 0.8 }}>The customer will see the scope, the items with their quantities and the total. Unit prices, cost groups, margin and contingency stay inside the company.</p>
    <button disabled={busy || !ready}>Approve estimate &amp; send to Admin</button>
  </form>;
}
