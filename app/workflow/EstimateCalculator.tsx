"use client";

import { useMemo, useState } from "react";

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

export default function EstimateCalculator({ initialTerms, busy, onSubmit }: {
  initialTerms: string;
  busy: boolean;
  onSubmit: (payload: { amount: string; scope: string; terms: string }) => void;
}) {
  const [lines, setLines] = useState<Line[]>([{ id: 1, group: "Materials", description: "", quantity: "1", unit: "lot", unitPrice: "" }]);
  const [markup, setMarkup] = useState("0");
  const [contingency, setContingency] = useState("0");
  const [gst, setGst] = useState(true);
  const [terms, setTerms] = useState(initialTerms);
  const [summary, setSummary] = useState("");

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + amount(line.quantity) * amount(line.unitPrice), 0);
    const markupValue = subtotal * (amount(markup) / 100);
    const contingencyValue = subtotal * (amount(contingency) / 100);
    const beforeGst = subtotal + markupValue + contingencyValue;
    const gstValue = gst ? beforeGst * 0.1 : 0;
    return { subtotal, markupValue, contingencyValue, beforeGst, gstValue, total: beforeGst + gstValue };
  }, [lines, markup, contingency, gst]);

  const byGroup = groups.map((group) => ({ group, total: lines.filter((line) => line.group === group).reduce((sum, line) => sum + amount(line.quantity) * amount(line.unitPrice), 0) }));

  function update(id: number, patch: Partial<Line>) { setLines((all) => all.map((line) => line.id === id ? { ...line, ...patch } : line)); }
  function add(template?: typeof templates[number]) {
    setLines((all) => [...all, { id: Math.max(0, ...all.map((line) => line.id)) + 1, group: template?.group ?? "Materials", description: template?.description ?? "", quantity: "1", unit: template?.unit ?? "lot", unitPrice: "" }]);
  }

  function buildScope() {
    const rows = lines.filter((line) => line.description.trim() && amount(line.quantity) * amount(line.unitPrice) > 0);
    const text = rows.map((line) => `• ${line.group}: ${line.description.trim()} — ${amount(line.quantity)} ${line.unit} × ${aud(amount(line.unitPrice))} = ${aud(amount(line.quantity) * amount(line.unitPrice))}`);
    const tail = [`Subtotal ${aud(totals.subtotal)}`];
    if (totals.markupValue) tail.push(`Margin ${aud(totals.markupValue)}`);
    if (totals.contingencyValue) tail.push(`Contingency ${aud(totals.contingencyValue)}`);
    tail.push(gst ? `GST (10%) ${aud(totals.gstValue)}` : "GST not included");
    return [summary.trim(), ...text, tail.join(" · ")].filter(Boolean).join("\n");
  }

  const ready = totals.total > 0 && lines.some((line) => line.description.trim() && amount(line.quantity) * amount(line.unitPrice) > 0);

  return <form onSubmit={(event) => { event.preventDefault(); onSubmit({ amount: totals.total.toFixed(2), scope: buildScope(), terms }); }}>
    <label><span>Scope summary (what the customer is getting)</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="e.g. Supply and install … as discussed on site." /></label>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", opacity: .7 }}><th>Type</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Line total</th><th /></tr></thead>
        <tbody>{lines.map((line) => <tr key={line.id}>
          <td><select value={line.group} onChange={(event) => update(line.id, { group: event.target.value as Line["group"] })}>{groups.map((group) => <option key={group}>{group}</option>)}</select></td>
          <td><input value={line.description} onChange={(event) => update(line.id, { description: event.target.value })} placeholder="Item or task" /></td>
          <td><input style={{ width: 70 }} type="number" min="0" step="any" value={line.quantity} onChange={(event) => update(line.id, { quantity: event.target.value })} /></td>
          <td><input style={{ width: 70 }} value={line.unit} onChange={(event) => update(line.id, { unit: event.target.value })} /></td>
          <td><input style={{ width: 100 }} type="number" min="0" step="any" value={line.unitPrice} onChange={(event) => update(line.id, { unitPrice: event.target.value })} placeholder="0.00" /></td>
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
    <button disabled={busy || !ready}>Approve estimate &amp; send to Admin</button>
  </form>;
}
