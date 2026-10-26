// The arithmetic of the estimate tools, in whole cents so totals never drift by a cent. Same rules as the older calculators:
//   Builder Quote  = catalogue subtotal + the builder margin (20% unless the company sets another), then 10% GST.
//   Customer Direct = catalogue subtotal + 10% GST, no margin.
export const GST_PERCENT = 10;
export const DEFAULT_MARGIN = 20;

// A typed quantity: whole numbers for counted items, two decimals for metres and areas; anything negative or unreadable is zero.
export function toQty(value, decimal = false) {
  const parsed = decimal ? Number.parseFloat(String(value)) : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return decimal ? Math.round(parsed * 100) / 100 : parsed;
}

// A typed rate in dollars to whole cents; empty or unreadable means "no rate yet" (null).
export function toRateCents(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const dollars = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : null;
}

export const lineCents = (rateCents, qty) => (rateCents === null || rateCents === undefined ? 0 : Math.round(rateCents * qty));

// lines: [{ rateCents: number|null, qty: number }]. Lines without a rate add nothing (and are counted in `unpriced`).
export function estimateTotals(lines, { mode = "builder", marginPercent = DEFAULT_MARGIN } = {}) {
  const chosen = lines.filter((line) => line.qty > 0);
  const subtotal = chosen.reduce((sum, line) => sum + lineCents(line.rateCents, line.qty), 0);
  const margin = mode === "builder" && subtotal > 0 ? Math.round(subtotal * Math.max(0, marginPercent) / 100) : 0;
  const base = subtotal + margin;
  const gst = Math.round(base * GST_PERCENT / 100);
  return {
    subtotal, margin, base, gst, total: base + gst,
    selected: chosen.length,
    quantity: Math.round(chosen.reduce((sum, line) => sum + line.qty, 0) * 100) / 100,
    unpriced: chosen.filter((line) => line.rateCents === null || line.rateCents === undefined).length,
  };
}

export const aud = (cents) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format((cents ?? 0) / 100);

const qtyText = (qty) => (Number.isInteger(qty) ? String(qty) : qty.toFixed(2));

// Plain text for a customer or for pasting into a quote. Customer Direct never shows the builder margin; Builder mode shows the total with
// the margin already inside the prices, because the customer sees one price per line either way.
export function scopeText(lines, { mode = "builder", marginPercent = DEFAULT_MARGIN, title = "", project = "", customer = "" } = {}) {
  const chosen = lines.filter((line) => line.qty > 0 && line.rateCents !== null && line.rateCents !== undefined);
  const factor = mode === "builder" ? 1 + Math.max(0, marginPercent) / 100 : 1;
  const rows = chosen.map((line) => {
    const unit = Math.round(line.rateCents * factor);
    return `• ${line.name} — ${qtyText(line.qty)} ${line.unit} × ${aud(unit)} = ${aud(Math.round(unit * line.qty))}`;
  });
  const totals = estimateTotals(lines, { mode, marginPercent });
  const head = [title, project && `Project: ${project}`, customer && `Prepared for: ${customer}`].filter(Boolean);
  return [...head, ...rows, `Subtotal ${aud(totals.base)} · GST (${GST_PERCENT}%) ${aud(totals.gst)} · Total ${aud(totals.total)}`].join("\n");
}

// Lines for the Estimator's quote calculator: the cost rate per unit (the calculator adds its own margin), grouped for its totals.
export function calculatorLines(lines, groupFor) {
  return lines.filter((line) => line.qty > 0 && line.rateCents !== null && line.rateCents !== undefined)
    .map((line) => ({ group: groupFor(line), description: line.name, quantity: qtyText(line.qty), unit: line.unit, unitPrice: (line.rateCents / 100).toFixed(2) }));
}
