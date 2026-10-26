"use client";

import EstimateTools from "./EstimateTools";
import { publishEstimateLines } from "./bridge";

// The Estimate tools as they appear in the Estimator workspace: a folded section above the jobs, whose "Add to this estimate" button sends the
// priced lines into the quote calculator of the job being priced.
export default function EstimatorTools({ role }: { role: "owner" | "estimator" }) {
  return <details style={{ marginBottom: 18 }}>
    <summary style={{ cursor: "pointer", padding: "14px 18px", border: "1px solid rgba(255,255,255,.14)", background: "#141313", color: "#f7cf64", fontWeight: 800, letterSpacing: ".04em" }}>
      ESTIMATE TOOLS — electrical, plumbing, cladding, AI plan estimator, quote check, renovation budget, invoice
    </summary>
    <div style={{ paddingTop: 14 }}><EstimateTools role={role} onUseLines={publishEstimateLines} /></div>
  </details>;
}
