"use client";

import { useMemo, useState } from "react";
import styles from "./estimate-tools.module.css";
import { calculateInvoice, formatAUD } from "./invoice-math.mjs";

type Item = { id: number; description: string; quantity: string; baseCost: string; profitType: "" | "percent" | "fixed"; profitValue: string; gst: boolean };

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
const plusDays = (days: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date(Date.now() + days * 86_400_000));
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
type Priced = { description: string; quantity: number; selling_unit_price: number; line_subtotal: number; gst_applicable: boolean };
const blank = (id: number): Item => ({ id, description: "", quantity: "1", baseCost: "", profitType: "", profitValue: "", gst: true });

// The Invoice Generator of the older site, kept as a calculator you can print: items with a cost and a profit, a discount, GST, a payment.
// Invoices are not saved in the app by this screen. Print or save the PDF, or copy the text.
export default function InvoiceTool() {
  const [business, setBusiness] = useState("");
  const [abn, setAbn] = useState("");
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState(`INV-${today().replaceAll("-", "")}-001`);
  const [issued, setIssued] = useState(today());
  const [due, setDue] = useState(plusDays(14));
  const [items, setItems] = useState<Item[]>([blank(1)]);
  const [defaultType, setDefaultType] = useState<"percent" | "fixed">("percent");
  const [defaultProfit, setDefaultProfit] = useState("20");
  const [discount, setDiscount] = useState("");
  const [gstOn, setGstOn] = useState(true);
  const [paid, setPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const result = useMemo(() => calculateInvoice(
    { default_profit_type: defaultType, default_profit_value: defaultProfit, discount_amount: discount, gst_enabled: gstOn, gst_rate: 10, amount_paid: paid },
    items.map((item) => ({ description: item.description, quantity: item.quantity, base_cost: item.baseCost, profit_type: item.profitType || undefined, profit_value: item.profitValue, gst_applicable: item.gst })),
  ), [items, defaultType, defaultProfit, discount, gstOn, paid]);

  const update = (id: number, patch: Partial<Item>) => setItems((all) => all.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const priced = result.items as unknown as Priced[];
  const filled = priced.filter((item) => (item.description ?? "").trim() && item.quantity > 0);

  function print() {
    const win = window.open("", "_blank");
    if (!win) { setMessage("Your browser blocked the print window. Allow pop-ups for this site and try again."); return; }
    const rows = filled.map((item) => `<tr><td>${esc(item.description)}</td><td class="n">${esc(item.quantity)}</td><td class="n">${formatAUD(item.selling_unit_price)}</td><td class="n">${formatAUD(item.line_subtotal)}${item.gst_applicable || !gstOn ? "" : " (no GST)"}</td></tr>`).join("");
    win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Tax invoice ${esc(number)}</title><style>
body{font:14px/1.45 Arial,sans-serif;color:#111;margin:32px}h1{margin:0;font-size:26px}.top{display:flex;justify-content:space-between;gap:24px;margin-bottom:22px}.sub{color:#555;margin:2px 0}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{font-size:12px;text-transform:uppercase;color:#555}.n{text-align:right;white-space:nowrap}.tot{margin-left:auto;width:320px}.tot div{display:flex;justify-content:space-between;padding:4px 0}.tot .g{border-top:2px solid #111;font-size:18px;font-weight:700;margin-top:6px;padding-top:8px}.notes{white-space:pre-wrap;margin-top:18px;color:#333}
</style></head><body><div class="top"><div><h1>${gstOn ? "Tax invoice" : "Invoice"}</h1><p class="sub">Invoice ${esc(number)}</p><p class="sub">Issued ${esc(issued)} · Due ${esc(due)}</p></div><div style="text-align:right"><strong>${esc(business) || "Your business"}</strong>${abn ? `<p class="sub">ABN ${esc(abn)}</p>` : ""}</div></div>
<p><strong>Bill to</strong><br>${esc(customer) || "Customer"}${address ? `<br>${esc(address)}` : ""}</p>
<table><thead><tr><th>Description</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No items.</td></tr>'}</tbody></table>
<div class="tot"><div><span>Subtotal</span><span>${formatAUD(result.subtotal)}</span></div>${result.discount_amount ? `<div><span>Discount</span><span>−${formatAUD(result.discount_amount)}</span></div>` : ""}${gstOn ? `<div><span>GST (${result.gst_rate}%)</span><span>${formatAUD(result.gst_amount)}</span></div>` : ""}<div class="g"><span>Total${gstOn ? " inc GST" : ""}</span><span>${formatAUD(result.total_amount)}</span></div>${result.amount_paid ? `<div><span>Paid</span><span>−${formatAUD(result.amount_paid)}</span></div><div class="g"><span>Balance due</span><span>${formatAUD(result.balance_due)}</span></div>` : ""}</div>
${notes ? `<p class="notes">${esc(notes)}</p>` : ""}
<script>addEventListener("load",function(){setTimeout(function(){print()},250)})</script></body></html>`);
    win.document.close();
  }

  async function copy() {
    const text = [`Invoice ${number}`, `Bill to: ${customer || "Customer"}`, ...filled.map((item) => `• ${item.description} — ${item.quantity} × ${formatAUD(item.selling_unit_price)} = ${formatAUD(item.line_subtotal)}`),
      `Subtotal ${formatAUD(result.subtotal)}${result.discount_amount ? ` · Discount −${formatAUD(result.discount_amount)}` : ""}${gstOn ? ` · GST ${formatAUD(result.gst_amount)}` : ""} · Total ${formatAUD(result.total_amount)}${result.amount_paid ? ` · Balance due ${formatAUD(result.balance_due)}` : ""}`].join("\n");
    try { await navigator.clipboard.writeText(text); setMessage("Copied."); } catch { setMessage("Your browser did not allow copying. Use Print instead."); }
  }

  return <section className={styles.panel} aria-label="Invoice">
    <h3>Invoice</h3>
    <p>Add what was done, what it cost you and your profit; the customer only sees the selling price. Print or save it as a PDF. This screen does not store invoices.</p>
    {message && <p className={styles.ok} role="status">{message}</p>}
    <div className={styles.grid2}>
      <label className={styles.field}><span>Your business name</span><input value={business} onChange={(event) => setBusiness(event.target.value)} /></label>
      <label className={styles.field}><span>ABN</span><input value={abn} onChange={(event) => setAbn(event.target.value)} inputMode="numeric" /></label>
      <label className={styles.field}><span>Customer</span><input value={customer} onChange={(event) => setCustomer(event.target.value)} /></label>
      <label className={styles.field}><span>Customer address</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <label className={styles.field}><span>Invoice number</span><input value={number} onChange={(event) => setNumber(event.target.value)} /></label>
      <label className={styles.field}><span>Issued</span><input type="date" value={issued} onChange={(event) => setIssued(event.target.value)} /></label>
      <label className={styles.field}><span>Due</span><input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
      <label className={styles.field}><span>Default profit</span>
        <span className={styles.row}><select value={defaultType} onChange={(event) => setDefaultType(event.target.value as "percent" | "fixed")} style={{ width: "auto" }}><option value="percent">% of cost</option><option value="fixed">$ per unit</option></select>
          <input value={defaultProfit} onChange={(event) => setDefaultProfit(event.target.value)} inputMode="decimal" style={{ width: 100 }} aria-label="Default profit value" /></span></label>
    </div>

    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead><tr><th>Description</th><th>Qty</th><th>Your cost / unit</th><th>Profit</th><th>GST</th><th className="n" style={{ textAlign: "right" }}>Selling price</th><th /></tr></thead>
        <tbody>{items.map((item, index) => {
          const done = priced[index];
          return <tr key={item.id}>
            <td><input value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} placeholder="What was done" aria-label="Description" /></td>
            <td><input style={{ width: 76 }} inputMode="decimal" value={item.quantity} onChange={(event) => update(item.id, { quantity: event.target.value })} aria-label="Quantity" /></td>
            <td><input style={{ width: 110 }} inputMode="decimal" value={item.baseCost} onChange={(event) => update(item.id, { baseCost: event.target.value })} placeholder="0.00" aria-label="Cost per unit" /></td>
            <td><span className={styles.row} style={{ flexWrap: "nowrap" }}><select value={item.profitType} onChange={(event) => update(item.id, { profitType: event.target.value as Item["profitType"] })} style={{ width: 100 }} aria-label="Profit type"><option value="">default</option><option value="percent">%</option><option value="fixed">$</option></select>
              <input style={{ width: 80 }} inputMode="decimal" value={item.profitValue} onChange={(event) => update(item.id, { profitValue: event.target.value })} aria-label="Profit value" /></span></td>
            <td><input type="checkbox" checked={item.gst} onChange={(event) => update(item.id, { gst: event.target.checked })} aria-label="GST applies" style={{ width: 22, minHeight: 22 }} /></td>
            <td className="n" style={{ textAlign: "right" }}>{formatAUD(done?.line_subtotal ?? 0)}</td>
            <td><button type="button" aria-label="Remove line" onClick={() => setItems((all) => (all.length > 1 ? all.filter((entry) => entry.id !== item.id) : all))}>×</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <div className={styles.row}><button type="button" onClick={() => setItems((all) => [...all, blank(Math.max(0, ...all.map((item) => item.id)) + 1)])}>＋ Add line</button></div>

    <div className={styles.grid2}>
      <label className={styles.field}><span>Discount ($)</span><input inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} /></label>
      <label className={styles.field}><span>Amount already paid ($)</span><input inputMode="decimal" value={paid} onChange={(event) => setPaid(event.target.value)} /></label>
      <label className={styles.field}><span>GST</span><select value={gstOn ? "yes" : "no"} onChange={(event) => setGstOn(event.target.value === "yes")}><option value="yes">Charge 10% GST</option><option value="no">No GST</option></select></label>
    </div>
    <label className={styles.field}><span>Notes / payment details (shown on the invoice)</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Bank details, payment terms…" /></label>

    <div className={styles.summary}>
      <div className={styles.totalBox}><span>{result.amount_paid ? "Balance due" : gstOn ? "Total inc GST" : "Total"}</span><strong>{formatAUD(result.amount_paid ? result.balance_due : result.total_amount)}</strong>
        <small>Subtotal {formatAUD(result.subtotal)}{result.discount_amount ? ` · discount −${formatAUD(result.discount_amount)}` : ""}{gstOn ? ` · GST ${formatAUD(result.gst_amount)}` : ""} · your profit {formatAUD(result.profit_amount)} (internal)</small></div>
      <div className={styles.actions}><button type="button" className={styles.primary} onClick={print}>Print / save PDF</button><button type="button" onClick={() => void copy()}>Copy as text</button></div>
    </div>
  </section>;
}
